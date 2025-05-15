// CompareEquipment.js

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './CompareEquipment.css';

function CompareEquipment() {
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [equipments, setEquipments] = useState([]);
    const [firstId, setFirstId] = useState('');
    const [secondId, setSecondId] = useState('');
    const [firstEquipment, setFirstEquipment] = useState(null);
    const [secondEquipment, setSecondEquipment] = useState(null);
    const [summary, setSummary] = useState('');
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            const snapshot = await getDocs(collection(db, 'EquipmentType'));
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchEquipments = async () => {
            if (!selectedCategory) return;
            const snapshot = await getDocs(collection(db, 'EquipmentInstance'));
            const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEquipments(all.filter(e => e.categoryRef?.id === selectedCategory));
        };
        fetchEquipments();
    }, [selectedCategory]);

    useEffect(() => {
        const fetchDetails = async (id, setter) => {
            if (!id) return;
            const snap = await getDoc(doc(db, 'EquipmentInstance', id));
            if (snap.exists()) setter({ id: snap.id, ...snap.data() });
        };
        fetchDetails(firstId, setFirstEquipment);
        fetchDetails(secondId, setSecondEquipment);
    }, [firstId, secondId]);

    const bool = val => (val === true ? 'Yes' : val === false ? 'No' : null);
    const val = (field, unit = '') => e => {
        const v = e?.details?.[field];
        return v != null ? `${v}${unit}` : null;
    };
    const arrayVal = field => e => {
        const v = e?.details?.[field];
        return Array.isArray(v) ? v.join(', ') : v || null;
    };
    const mapVal = (field, keys, format) => e => {
        const m = e?.details?.[field];
        return m ? format(...keys.map(k => m[k])) : null;
    };

    const renderRow = (label, getter) => {
        const a = getter(firstEquipment);
        const b = getter(secondEquipment);
        if (a == null && b == null) return null;
        return (
            <tr>
                <td>{label}</td>
                <td>{a}</td>
                <td>{b}</td>
            </tr>
        );
    };

    const renderVideoRows = () => {
        const d1 = firstEquipment?.details?.videoResolutions || [];
        const d2 = secondEquipment?.details?.videoResolutions || [];
        const maxLen = Math.max(d1.length, d2.length);
        if (maxLen === 0) return null;

        return Array.from({ length: maxLen }).map((_, i) => {
            const r1 = d1[i]?.resolution || d1[i];
            const r2 = d2[i]?.resolution || d2[i];
            const labelCell = i === 0 ? <td rowSpan={maxLen}>Video resolutions</td> : <></>;
            const cell1 = r1 ? `${r1.width}x${r1.height}${r1.fps ? ` (${r1.fps.join(', ')} fps)` : ''}` : '';
            const cell2 = r2 ? `${r2.width}x${r2.height}${r2.fps ? ` (${r2.fps.join(', ')} fps)` : ''}` : '';
            return (
                <tr key={`video-${i}`}>
                    {labelCell}
                    <td>{cell1}</td>
                    <td>{cell2}</td>
                </tr>
            );
        });
    };

    const renderPhotoRows = () => {
        const d1 = firstEquipment?.details?.photoResolutions || [];
        const d2 = secondEquipment?.details?.photoResolutions || [];
        const maxLen = Math.max(d1.length, d2.length);
        if (maxLen === 0) return null;

        return Array.from({ length: maxLen }).map((_, i) => {
            const r1 = d1[i];
            const r2 = d2[i];
            const labelCell = i === 0 ? <td rowSpan={maxLen}>Photo resolutions</td> : <></>;
            const cell1 = r1 ? `${r1.width}x${r1.height}` : '';
            const cell2 = r2 ? `${r2.width}x${r2.height}` : '';
            return (
                <tr key={`photo-${i}`}>
                    {labelCell}
                    <td>{cell1}</td>
                    <td>{cell2}</td>
                </tr>
            );
        });
    };

    const renderByCategory = () => {
        const cat = firstEquipment?.categoryName;
        switch (cat) {
            case 'drone':
                return <>
                    {renderRow('Sensor size', mapVal('sensorSize', ['width', 'height'], (w, h) => `${w} x ${h} mm`))}
                    {renderRow('Megapixels', val('megapixels', ' MP'))}
                    {renderVideoRows()}
                    {renderRow('Max flight time', val('maxFlightTime', ' min'))}
                    {renderRow('Max speed', val('maxSpeed', ' m/s'))}
                    {renderRow('Max range', val('maxRange', ' m'))}
                    {renderRow('Max altitude', val('maxAltitude', ' m'))}
                    {renderRow('GPS', e => bool(e?.details?.gps))}
                    {renderRow('Obstacle avoidance', e => bool(e?.details?.obstacleAvoidance))}
                    {renderRow('Return to home', e => bool(e?.details?.returnToHome))}
                    {renderRow('Follow me mode', e => bool(e?.details?.followMeMode))}
                    {renderRow('Gimbal', e => bool(e?.details?.gimbal))}
                    {renderRow('Dimensions', mapVal('dimensions', ['width', 'height', 'length'], (w,h,d) => `${w} x ${h} x ${d} mm`))}
                    {renderRow('Weight', val('weight', ' g'))}
                </>;

            case 'lens':
                return <>
                    {renderRow('Mount type', arrayVal('mountType'))}
                    {renderRow('Compatible sensor size', arrayVal('optimalSensorSize'))}
                    {renderRow('Focal length', mapVal('focalLength', ['min', 'max'], (min, max) => `${min} - ${max} mm`))}
                    {renderRow('Aperture', mapVal('aperture', ['min', 'max'], (min, max) => `f/${min} - f/${max}`))}
                    {renderRow('Lens type', arrayVal('lensType'))}
                    {renderRow('Image stabilization', e => bool(e?.details?.imageStabilization))}
                    {renderRow('Autofocus', e => bool(e?.details?.autofocus))}
                    {renderRow('Macro', e => bool(e?.details?.isMacro))}
                    {renderRow('Filter size', val('filterSize', ' mm'))}
                    {renderRow('Dimensions', mapVal('dimensions', ['diameter', 'length'], (d, l) => `${d} mm × ${l} mm`))}
                    {renderRow('Weight', val('weight', ' g'))}
                    {renderRow('Weather sealed', e => bool(e?.details?.weatherSealed))}
                    {renderRow('Min focus distance', val('minFocusDistance', ' m'))}
                    {renderRow('Max magnification', val('maxMagnification', '×'))}
                </>;

            case 'camera':
            default:
                return <>
                    {renderRow('Sensor type', arrayVal('sensorType'))}
                    {renderRow('Sensor size', mapVal('sensorSize', ['width', 'height'], (w, h) => `${w} x ${h} mm`))}
                    {renderRow('Megapixels', val('megapixels', ' MP'))}
                    {renderRow('ISO range', mapVal('isoRange', ['min', 'max'], (min, max) => `ISO ${min} - ${max}`))}
                    {renderPhotoRows()}
                    {renderVideoRows()}
                    {renderRow('Mount type', arrayVal('mountType'))}
                    {renderRow('Screen size', val('screenSize', '”'))}
                    {renderRow('Flip screen', e => bool(e?.details?.flipScreen))}
                    {renderRow('Min/Max shutter speed', e => {
                        const d1 = e?.details;
                        return d1?.minShutterSpeed && d1?.maxShutterSpeed
                            ? `${d1.minShutterSpeed} – ${d1.maxShutterSpeed}`
                            : null;
                    })}
                    {renderRow('Burst rate (fps)', val('burstRate'))}
                    {renderRow('Max video duration', val('maxVideoDuration', ' min'))}
                    {renderRow('Dual SD slots', e => bool(e?.details?.dualSdCardSlots))}
                    {renderRow('Mobile app support', e => bool(e?.details?.mobileAppSupport))}
                    {renderRow('HDMI', arrayVal('hdmi'))}
                    {renderRow('Mic input', e => bool(e?.details?.audioJackInput))}
                    {renderRow('Headphone output', e => bool(e?.details?.audioJackOutput))}
                    {renderRow('Body material', arrayVal('bodyMaterial'))}
                    {renderRow('Dimensions', mapVal('dimensions', ['width', 'height', 'depth'], (w,h,d) => `${w} x ${h} x ${d} mm`))}
                    {renderRow('Weight', val('weight', ' g'))}
                    {renderRow('Battery type', val('batteryType'))}
                    {renderRow('Battery capacity', val('batteryCapacityMah', ' mAh'))}
                    {renderRow('Max shots per battery', val('maxShotsPerBattery'))}
                </>;
        }
    };

    const fetchSummary = async () => {
        setLoadingSummary(true);
        setSummary('');
        try {
            const res = await fetch('http://localhost:5100/api/compare-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ first: firstEquipment, second: secondEquipment, category: firstEquipment?.categoryName || 'equipment' })
            });
            const data = await res.json();
            setSummary(data.summary);
        } catch {
            setSummary('Error fetching summary.');
        } finally {
            setLoadingSummary(false);
        }
    };

    return (
        <div className="compare-container">
            <h2>Compare Equipment</h2>
            <div className="compare-selects">
                <label>Category:
                    <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                        <option value="">Select a category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.category}</option>)}
                    </select>
                </label>
                <label>First item:
                    <select value={firstId} onChange={e => setFirstId(e.target.value)}>
                        <option value="">Select</option>
                        {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </label>
                <label>Second item:
                    <select value={secondId} onChange={e => setSecondId(e.target.value)}>
                        <option value="">Select</option>
                        {equipments.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </label>
            </div>

            {firstEquipment && secondEquipment && (
                <>
                    <table className="compare-table">
                        <thead>
                        <tr><th>Attribute</th><th>{firstEquipment.name}</th><th>{secondEquipment.name}</th></tr>
                        </thead>
                        <tbody>
                        {renderRow('Price', e => e?.price + ' Ft')}
                        {renderRow('Brand', e => e?.brand)}
                        {renderRow('Description', e => e?.description)}
                        {renderByCategory()}
                        {renderRow('Package contents', e => e?.details?.packageContents)}
                        </tbody>
                    </table>
                    <button onClick={fetchSummary} disabled={loadingSummary} style={{ marginTop: '1rem' }}>
                        {loadingSummary ? 'Generating AI summary...' : 'Generate AI Summary'}
                    </button>
                    {summary && <div className="ai-summary"><h3>AI Summary</h3><p>{summary}</p></div>}
                </>
            )}
        </div>
    );
}

export default CompareEquipment;
