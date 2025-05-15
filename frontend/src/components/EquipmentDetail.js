import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './EquipmentDetail.css';
import { UserContext } from '../userContext';
import { toZonedTime } from 'date-fns-tz';

function EquipmentDetail() {
    const { id } = useParams();
    const [equipment, setEquipment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [blockedIntervals, setBlockedIntervals] = useState([]);
    const { currentUser } = useContext(UserContext);
    const navigate = useNavigate();

    const [maxEndDate, setMaxEndDate] = useState(null);

    useEffect(() => {
        if (startDate) {
            setMaxEndDate(getMaxEndDate(startDate));
        } else {
            setMaxEndDate(null);
        }
    }, [startDate, blockedIntervals]);



    const formatDateForBackend = (date) => {
        if (!date) return null;
        const zonedDate = toZonedTime(date, 'Europe/Budapest');
        return zonedDate.toISOString();
    };

    const checkDateConflict = (newStart, newEnd) => {
        if (!newStart || !newEnd) return false;

        return blockedIntervals.some(({ start, end }) => {
            return (newStart <= end && newEnd >= start);
        });
    };

    const getMaxEndDate = (start) => {
        if (!start) return null;

        const sorted = [...blockedIntervals].sort((a, b) => a.start - b.start);

        for (const interval of sorted) {
            if (interval.start > start) {
                // az első olyan foglalás, ami a kezdő után kezdődik
                const dayBefore = new Date(interval.start);
                dayBefore.setDate(dayBefore.getDate() - 1);
                return dayBefore;
            }
        }

        return null; // nincs korlát
    };


    const toFractionString = (num) => {
        if (typeof num !== 'number' || num <= 0) return '';
        return num < 1 ? `1/${Math.round(1 / num)}` : `${num} s`;
    };



    useEffect(() => {
        const fetchBlocked = async () => {
            try {
                const res = await fetch(`http://localhost:5100/api/cart-blocks/${id}`);
                const data = await res.json();
                const parsed = data.map(({ start, end }) => ({
                    start: new Date(start),
                    end: new Date(end)
                }));
                setBlockedIntervals(parsed);
            } catch (err) {
                console.error('Failed to fetch blocked dates:', err);
            }
        };
        fetchBlocked();
    }, [id]);

    useEffect(() => {
        const fetchEquipmentDetails = async () => {
            try {
                setLoading(true);
                const equipmentDoc = await getDoc(doc(db, 'EquipmentInstance', id));
                if (equipmentDoc.exists()) {
                    setEquipment(equipmentDoc.data());
                } else {
                    setError('Equipment not found.');
                    navigate('/equipment');
                }
            } catch (error) {
                console.error('Error:', error);
                setError('Failed to load equipment data.');
            } finally {
                setLoading(false);
            }
        };
        fetchEquipmentDetails();
    }, [id, navigate]);

    const handleAddToCart = async () => {
        if (!startDate || !endDate || !equipment || !currentUser) {
            alert('Please sign in and select a date range!');
            return;
        }

        const startStr = startDate.getTime();
        const endStr = endDate.getTime();

        try {
            const response = await fetch(`http://localhost:5100/api/cart/${currentUser.uid}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipmentId: id,
                    startDate: startStr,
                    endDate: endStr,
                    quantity: 1
                })
            });

            if (response.ok) {
                alert('Added to cart!');
                navigate('/equipment');
            } else {
                const data = await response.json();
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            console.error('Error adding to cart:', err);
            alert('Failed to add to cart.');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;
    if (!equipment) return null;

    // Shortcut to details
    const d = equipment.details || {};
    const bool = (val) => val === true ? 'Yes' : val === false ? 'No' : '';

    const renderRow = (label, value) => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'boolean') {
            return <tr><td>{label}</td><td>{bool(value)}</td></tr>;
        }
        return <tr><td>{label}</td><td>{value}</td></tr>;
    };

    const renderSensorSize = () => {
        if (d.sensorSize && typeof d.sensorSize === 'object') {
            const { width, height } = d.sensorSize;
            if (width && height) {
                return renderRow("Sensor size", `${width} x ${height} mm`);
            }
        }
        return null;
    };

    const renderDimensions = () => {
        if (!d.dimensions || typeof d.dimensions !== 'object') return null;

        const { width, height, depth, length, diameter } = d.dimensions;

        if (equipment?.categoryName === 'drone') {
            if (width && height && length) {
                return renderRow("Dimensions", `${width} x ${height} x ${length} mm`);
            }
        } else {
            if (width && height && depth) {
                return renderRow("Dimensions", `${width} x ${height} x ${depth} mm`);
            }
            if (diameter && length) {
                return renderRow("Dimensions", `${diameter} mm diameter, ${length} mm length`);
            }
        }

        return null;
    };


    const renderVideoResolutions = () => {
        const list = d.videoResolutions;
        if (Array.isArray(list) && list.length > 0) {
            return (
                <>
                    {list.map((entry, index) => {
                        const res = entry.resolution || entry;
                        const { width, height, fps } = res;
                        return (
                            <tr key={`vr-${index}`}>
                                {index === 0 && <td rowSpan={list.length}>Video resolutions</td>}
                                <td>{width}x{height}{fps ? ` (${fps.join(', ')} fps)` : ''}</td>
                            </tr>
                        );
                    })}
                </>
            );
        }
        return null;
    };

    // Added missing functions
    const renderIsoRange = () => {
        if (d.isoRange && typeof d.isoRange === 'object') {
            if (d.isoRange.min != null && d.isoRange.max != null) {
                return renderRow("ISO range", `ISO ${d.isoRange.min} - ${d.isoRange.max}`);
            }
            if (Array.isArray(d.isoRange)) {
                return renderRow("ISO range", d.isoRange.join(', '));
            }
        }
        return null;
    };

    const renderPhotoResolutions = () => {
        const list = d.photoResolutions;
        if (Array.isArray(list) && list.length > 0) {
            return (
                <>
                    {list.map((entry, index) => {
                        const res = entry.resolution || entry;
                        const { width, height } = res;
                        return (
                            <tr key={`pr-${index}`}>
                                {index === 0 && <td rowSpan={list.length}>Photo resolutions</td>}
                                <td>{width}x{height}</td>
                            </tr>
                        );
                    })}
                </>
            );
        }
        return null;
    };

    const renderDroneFields = () => (
        <>
            {renderRow("Max flight time", d.maxFlightTime ? `${d.maxFlightTime} min` : null)}
            {renderRow("Max speed", d.maxSpeed ? `${d.maxSpeed} m/s` : null)}
            {renderRow("Max range", d.maxRange ? `${d.maxRange} m` : null)}
            {renderRow("Max altitude", d.maxAltitude ? `${d.maxAltitude} m` : null)}
            {renderRow("GPS", bool(d.gps))}
            {renderRow("Obstacle avoidance", bool(d.obstacleAvoidance))}
            {renderRow("Return to home", bool(d.returnToHome))}
            {renderRow("Follow me mode", bool(d.followMeMode))}
            {renderSensorSize()}
            {renderRow("Megapixels", d.megapixels)}
            {renderVideoResolutions()}
            {renderRow("Gimbal", bool(d.gimbal))}
            {renderDimensions()}
            {renderRow("Weight", d.weight ? `${d.weight} g` : '')}
        </>
    );


    const renderLensFields = () => (
        <>
            {renderRow("Mount type", Array.isArray(d.mountType) ? d.mountType.join(', ') : d.mountType)}
            {renderRow("Compatible sensor size", Array.isArray(d.optimalSensorSize) ? d.optimalSensorSize.join(', ') : d.optimalSensorSize)}
            {d.focalLength && typeof d.focalLength === 'object' &&
                renderRow("Focal length", `${d.focalLength.min} - ${d.focalLength.max} mm`)}
            {d.aperture && typeof d.aperture === 'object' &&
                renderRow("Aperture", `f/${d.aperture.min} - f/${d.aperture.max}`)}
            {renderRow("Lens type", Array.isArray(d.lensType) ? d.lensType.join(', ') : d.lensType)}
            {renderRow("Image stabilization", bool(d.imageStabilization))}
            {renderRow("Autofocus", bool(d.autofocus))}
            {renderRow("Macro", bool(d.isMacro))}
            {renderRow("Filter size", d.filterSize ? `${d.filterSize} mm` : '')}
            {renderDimensions()}
            {renderRow("Weight", d.weight ? `${d.weight} g` : '')}
            {renderRow("Weather sealed", bool(d.weatherSealed))}
            {renderRow("Min focus distance", d.minFocusDistance ? `${d.minFocusDistance} m` : '')}
            {renderRow("Max magnification", d.maxMagnification ? `${d.maxMagnification}×` : '')}
        </>
    );

    const renderCameraFields = () => (
        <>
            {renderRow("Model", d.model)}
            {renderRow(
                "Sensor type",
                Array.isArray(d.sensorType) ? d.sensorType.join(", ") : d.sensorType
            )}
            {renderSensorSize()}
            {renderRow("Megapixels", d.megapixels)}
            {renderIsoRange()}
            {renderPhotoResolutions()}
            {renderVideoResolutions()}
            {renderRow(
                "Mount type",
                Array.isArray(d.mountType) ? d.mountType.join(", ") : d.mountType
            )}
            {renderRow("Screen size", d.screenSize ? `${d.screenSize}”` : "")}
            {renderRow("Flip screen", bool(d.flipScreen))}
            {renderRow(
                "Min. / Max. shutter speed",
                d.minShutterSpeed && d.maxShutterSpeed
                    ? `${toFractionString(d.minShutterSpeed)} – ${toFractionString(d.maxShutterSpeed)}`
                    : ""
            )}
            {renderRow("Burst rate (fps)", d.burstRate)}
            {renderRow("Max video duration (min)", d.maxVideoDuration)}
            {renderRow("Dual SD card slots", bool(d.dualSdCardSlots))}
            {renderRow("Mobile app support", bool(d.mobileAppSupport))}
            {renderRow(
                "HDMI",
                Array.isArray(d.hdmi) ? d.hdmi.join(", ") : d.hdmi
            )}
            {renderRow("Mic input", bool(d.audioJackInput))}
            {renderRow("Headphone output", bool(d.audioJackOutput))}
            {renderRow(
                "Body material",
                Array.isArray(d.bodyMaterial)
                    ? d.bodyMaterial.join(", ")
                    : d.bodyMaterial
            )}
            {renderDimensions()}
            {renderRow("Weight", d.weight ? `${d.weight} g` : "")}
            {renderRow("Battery type", d.batteryType)}
            {renderRow(
                "Battery capacity",
                d.batteryCapacityMah ? `${d.batteryCapacityMah} mAh` : ""
            )}
            {renderRow("Max shots per battery", d.maxShotsPerBattery)}
        </>
    );

    const renderByCategory = () => {
        switch (equipment.categoryName) {
            case 'drone':
                return renderDroneFields();
            case 'lens':
                return renderLensFields();
            case 'camera':
                return renderCameraFields();
            default:
                return null;
        }
    };

    return (
        <div className="equipment-detail">
            <button onClick={() => navigate('/equipment')}>Back to equipment list</button>
            <div className="equipment-detail-container">
                {equipment.imageUrl && (
                    <div className="image-container">
                        <img src={equipment.imageUrl} alt={equipment.name} style={{ maxWidth: '100%', height: 'auto' }} />
                    </div>
                )}

                <h2>{equipment.name}</h2>
                <p><strong>Brand:</strong> {equipment.brand}</p>
                <p><strong>Price:</strong> {equipment.price} Ft</p>
                <p><strong>Description:</strong> {equipment.description}</p>

                <h3>Specifications</h3>
                <table className="equipment-specs">
                    <tbody>
                    {renderByCategory()}
                    {renderRow("Package contents", d.packageContents)}
                    </tbody>
                </table>

                <div style={{ marginTop: '2rem' }}>
                    <h3>Rental duration</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label>Start date:</label>
                        <DatePicker
                            selected={startDate}
                            onChange={date => {
                                setStartDate(date);
                                if (endDate && date > endDate) setEndDate(null);
                            }}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            minDate={startDate || new Date()}
                            excludeDateIntervals={blockedIntervals}
                            placeholderText="Select start date"
                        />
                        <label>End date:</label>
                        <DatePicker
                            selected={endDate}
                            onChange={date => setEndDate(date)}
                            selectsEnd
                            startDate={startDate}
                            endDate={endDate}
                            excludeDateIntervals={blockedIntervals}
                            minDate={startDate || new Date()}
                            maxDate={maxEndDate}
                            placeholderText="Select end date"
                        />
                    </div>
                </div>

                <button onClick={handleAddToCart} disabled={!startDate || !endDate}>
                    Add to Cart
                </button>
            </div>
        </div>
    );
}

export default EquipmentDetail;
