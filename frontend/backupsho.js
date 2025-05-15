import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './EquipmentShop.css';
import { Link } from 'react-router-dom';
import Slider from 'rc-slider';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const beautifyLabel = (str) => {
    const result = str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, s => s.toUpperCase())
        .replace(/([0-9]+)(x)(?=[0-9]+)/gi, '$1x')
        .trim();
    return result;
};

function Equipment() {
    const [rentalsData, setRentalsData] = useState([]);
    const [filteredRentals, setFilteredRentals] = useState([]);
    const [blockedMap, setBlockedMap] = useState({});
    const [filters, setFilters] = useState({
        category: '',
        priceRange: [0, 200000],
        brand: '',
        startDate: null,
        endDate: null,
        details: {
            videoResolutions: [],
            megapixels: {},
            weight: '',
            sensorType: ''
        }
    });
    const [allCategories, setAllCategories] = useState([]);
    const [dynamicFields, setDynamicFields] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const snapshot = await getDocs(collection(db, 'EquipmentInstance'));
                const rentals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRentalsData(rentals);
                setFilteredRentals(rentals);

                const res = await fetch('http://localhost:5100/api/equipment-types');
                const types = await res.json();
                setAllCategories(types);
            } catch (err) {
                console.error(err);
            }
        }
        fetchData();
    }, []);

    useEffect(() => {
        const categoryData = allCategories.find(c => c.id === filters.category);
        setDynamicFields(categoryData?.properties || []);
    }, [filters.category, allCategories]);

    useEffect(() => {
        async function fetchBlockedMap() {
            const blocks = {};
            for (const rental of rentalsData) {
                try {
                    const res = await fetch(`http://localhost:5100/api/cart-blocks/${rental.id}`);
                    const data = await res.json();
                    blocks[rental.id] = data.map(({ start, end }) => ({
                        start: new Date(start),
                        end: new Date(end),
                    }));
                } catch (err) {
                    console.error(`Hiba a foglaltság lekérésénél: ${rental.id}`, err);
                }
            }
            setBlockedMap(blocks);
        }

        if (filters.startDate && filters.endDate) {
            fetchBlockedMap();
        }
    }, [filters.startDate, filters.endDate, rentalsData]);

    useEffect(() => {
        if (!filters.category) {
            setFilteredRentals(rentalsData);
            return;
        }

        const getNestedValue = (obj, path) => {
            const keys = Array.isArray(path) ? path : path.split('.');
            return keys.reduce((val, key) => (val ? val[key] : undefined), obj);
        };

        const isOverlapping = (start1, end1, start2, end2) =>
            start1 <= end2 && end1 >= start2;

        const filtered = rentalsData.filter(rental => {
            const d = rental.details || {};
            const matchesCategory = rental.categoryRef?.id === filters.category;
            const matchesBrand = !filters.brand || rental.brand.toLowerCase().includes(filters.brand.toLowerCase());
            const matchesPrice = rental.price >= filters.priceRange[0] && rental.price <= filters.priceRange[1];
            if (!matchesCategory || !matchesBrand || !matchesPrice) return false;

            if (filters.startDate && filters.endDate) {
                const desiredStart = filters.startDate;
                const desiredEnd = filters.endDate;
                const blocked = blockedMap[rental.id] || [];

                const isBlocked = blocked.some(({ start, end }) =>
                    isOverlapping(new Date(start), new Date(end), desiredStart, desiredEnd)
                );

                if (isBlocked) return false;
            }

            const mpFilter = filters.details.megapixels;
            if (mpFilter.min) {
                if (typeof d.megapixels !== 'number' || d.megapixels < mpFilter.min) return false;
            }

            if (filters.details.weight) {
                if (typeof d.weight !== 'number' || d.weight > Number(filters.details.weight)) return false;
            }

            const selectedRes = filters.details.videoResolutions || [];
            if (selectedRes.length) {
                const resList = (d.videoResolutions || [])
                    .map(item => item.resolution || item)
                    .filter(r => r?.width && r?.height)
                    .map(r => `${r.width}x${r.height}`);
                if (!selectedRes.every(r => resList.includes(r))) return false;
            }

            if (filters.details.sensorType) {
                const types = d.sensorType;
                if (Array.isArray(types)
                    ? !types.includes(filters.details.sensorType)
                    : types !== filters.details.sensorType) {
                    return false;
                }
            }

            for (const field of dynamicFields.filter(f => f.type === 'boolean')) {
                const val = filters.details[field.name];
                if (val) {
                    const detailVal = getNestedValue(d, field.name);
                    if (detailVal !== true) return false;
                }
            }

            for (const field of dynamicFields) {
                const name = field.name;
                if (["sensorType", "videoResolutions", "megapixels", "weight"].includes(name) || field.type === 'boolean') continue;
                const filterVal = filters.details[name];
                if (!filterVal || (typeof filterVal === 'object' && !Object.keys(filterVal).length)) continue;
                const detailVal = getNestedValue(d, field.path || name);
                if (Array.isArray(filterVal)) {
                    if (!filterVal.includes(detailVal)) return false;
                } else if (String(detailVal).toLowerCase() !== String(filterVal).toLowerCase()) {
                    return false;
                }
            }

            return true;
        });

        setFilteredRentals(filtered);
    }, [filters, rentalsData, dynamicFields, blockedMap]);

    const handleCategoryChange = e => {
        const category = e.target.value;
        setFilters({
            category,
            brand: '',
            priceRange: [0, 200000],
            startDate: null,
            endDate: null,
            details: {
                videoResolutions: [],
                megapixels: {},
                weight: '',
                sensorType: ''
            }
        });
    };

    const handleDynamicFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            details: { ...prev.details, [name]: value }
        }));
    };

    const handleCheckboxChange = (name, option) => {
        setFilters(prev => {
            const current = prev.details[name] || [];
            const updated = current.includes(option)
                ? current.filter(o => o !== option)
                : [...current, option];
            return { ...prev, details: { ...prev.details, [name]: updated } };
        });
    };

    const handleBooleanFilterChange = name => {
        setFilters(prev => ({
            ...prev,
            details: { ...prev.details, [name]: !prev.details[name] }
        }));
    };

    return (
        <div className="equipment-shop">
            <aside className="filters">
                <h2>Szűrés</h2>
                <label>
                    {beautifyLabel('category')}:
                    <select name="category" value={filters.category} onChange={handleCategoryChange}>
                        <option value="">{beautifyLabel('selectCategory')}</option>
                        {allCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.category}</option>
                        ))}
                    </select>
                </label>

                {filters.category && (
                    <>
                        <label>
                            {beautifyLabel('brand')}:
                            <input
                                type="text"
                                name="brand"
                                value={filters.brand}
                                onChange={e => handleDynamicFilterChange('brand', e.target.value)}
                                placeholder={beautifyLabel('e.g. Canon')}
                            />
                        </label>

                        <label>
                            {beautifyLabel('priceRange')}: {filters.priceRange[0]} Ft - {filters.priceRange[1]} Ft
                            <Slider
                                range
                                min={0}
                                max={200000}
                                step={1000}
                                value={filters.priceRange}
                                onChange={value => setFilters(prev => ({...prev, priceRange: value}))}
                            />
                        </label>

                        <label className="sensor-type-label">
                            {beautifyLabel('sensorType')}:
                            <select
                                className="sensor-select"
                                value={filters.details.sensorType || ''}
                                onChange={e => handleDynamicFilterChange('sensorType', e.target.value)}
                            >
                                <option value="">{beautifyLabel('all')}</option>
                                {dynamicFields.find(f => f.name === 'sensorType')?.options.map(opt => (
                                    <option key={opt} value={opt}>{beautifyLabel(opt)}</option>
                                ))}
                            </select>
                        </label>

                        <div>
                            <label>{beautifyLabel('videoResolutions')} (ÉS kapcsolat):</label>
                            {['4096x2160', '3840x2160', '1920x1080', '1280x720'].map(res => (
                                <label key={res}>
                                    <input
                                        type="checkbox"
                                        checked={filters.details.videoResolutions.includes(res)}
                                        onChange={() => handleCheckboxChange('videoResolutions', res)}
                                    />
                                    {beautifyLabel(res)}
                                </label>
                            ))}
                        </div>

                        <div>
                            <label>{beautifyLabel('properties')}:</label>
                            {dynamicFields.filter(f => f.type === 'boolean').map(field => (
                                <label key={field.name}>
                                    <input
                                        type="checkbox"
                                        checked={!!filters.details[field.name]}
                                        onChange={() => handleBooleanFilterChange(field.name)}
                                    />
                                    {beautifyLabel(field.name)}
                                </label>
                            ))}
                        </div>

                        <div className="datepicker-wrapper">
                            <label>Bérlés kezdete:</label>
                            <DatePicker
                                selected={filters.startDate}
                                onChange={date => setFilters(prev => ({...prev, startDate: date}))}
                                selectsStart
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                minDate={new Date()}
                                placeholderText="Kezdő dátum"
                            />
                        </div>

                        <div className="datepicker-wrapper">
                            <label>Bérlés vége:</label>
                            <DatePicker
                                selected={filters.endDate}
                                onChange={date => setFilters(prev => ({...prev, endDate: date}))}
                                selectsEnd
                                startDate={filters.startDate}
                                endDate={filters.endDate}
                                minDate={filters.startDate || new Date()}
                                placeholderText="Végdátum"
                            />
                        </div>

                    </>
                )}
            </aside>

            <main className="products">
                <div className="products-grid">
                    {filteredRentals.map(rental => (
                        <div key={rental.id} className="product-card">
                            <Link to={`/equipment/${rental.id}`} className="product-link">
                                <img src={rental.imageUrl} alt={rental.name}/>
                                <h3>{rental.name}</h3>
                                <p>{rental.brand}</p>
                                <p>{rental.price} Ft</p>
                            </Link>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Equipment;
