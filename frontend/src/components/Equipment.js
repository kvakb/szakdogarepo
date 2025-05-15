import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import './EquipmentShop.css';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const beautifyLabel = (str) =>
    str
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim();

const baseFilterConfig = {
    camera: [
        { name: 'maxWeight', type: 'number', label: 'Maximális tömeg (g)' },
        { name: 'brand', type: 'text', label: 'Brand' },
        { name: 'sensorType', type: 'select', label: 'Szenzor típus', options: ['Full Frame', 'APS-C', 'Micro 4/3'] },
        { name: 'megapixels', type: 'number', label: 'Minimum Felbontás (MP)' },
        { name: 'videoResolutions', type: 'checkbox', label: 'Videófelbontás', options: ['4096x2160', '3840x2160', '1920x1080', '1280x720'] },
    ],
    drone: [
        { name: 'maxWeight', type: 'number', label: 'Maximális tömeg (g)' },
        { name: 'brand', type: 'text', label: 'Brand' },
        { name: 'maxFlightTime', type: 'number', label: 'Minimum repülési idő (perc)' },
        { name: 'videoResolutions', type: 'checkbox', label: 'Videófelbontás', options: ['4096x2160', '3840x2160', '1920x1080', '1280x720'] },
    ],
    lens: [
        { name: 'brand', type: 'text', label: 'Brand' },
        { name: 'minAperture', type: 'number', label: 'Minimum rekesz (f/)' },
        { name: 'maxAperture', type: 'number', label: 'Maximum rekesz (f/)' },
    ],
};

const categoryFilterFunctions = {
    camera: (item, filterDetails) => {
        const d = item.details;
        if (filterDetails.brand && !item.brand.toLowerCase().includes(filterDetails.brand.toLowerCase())) return false;
        if (filterDetails.sensorType && !d.sensorType.includes(filterDetails.sensorType)) return false;
        if (filterDetails.megapixels && d.megapixels < parseFloat(filterDetails.megapixels)) return false;

        if (filterDetails.videoResolutions?.length) {
            const availableResolutions = (d.videoResolutions || []).map(v => {
                if (v.resolution) return `${v.resolution.width}x${v.resolution.height}`;
                if (v.width && v.height) return `${v.width}x${v.height}`;
                return '';
            });
            if (!filterDetails.videoResolutions.some(sel => availableResolutions.includes(sel))) return false;
        }

        for (const [key, val] of Object.entries(filterDetails)) {
            if (typeof val === 'boolean') {
                if ((d[key] || false) !== val) return false;
            }
        }

        if (filterDetails.maxWeight && d.weight > parseFloat(filterDetails.maxWeight)) return false;

        return true;
    },
    drone: (item, filterDetails) => {
        const d = item.details;
        if (filterDetails.brand && !item.brand.toLowerCase().includes(filterDetails.brand.toLowerCase())) return false;
        if (filterDetails.maxFlightTime && d.maxFlightTime < parseFloat(filterDetails.maxFlightTime)) return false;

        if (filterDetails.videoResolutions?.length) {
            const availableResolutions = (d.videoResolutions || []).map(v => {
                if (v.resolution) return `${v.resolution.width}x${v.resolution.height}`;
                if (v.width && v.height) return `${v.width}x${v.height}`;
                return '';
            });
            if (!filterDetails.videoResolutions.some(sel => availableResolutions.includes(sel))) return false;
        }

        for (const [key, val] of Object.entries(filterDetails)) {
            if (typeof val === 'boolean') {
                if ((d[key] || false) !== val) return false;
            }
        }

        if (filterDetails.maxWeight && d.weight > parseFloat(filterDetails.maxWeight)) return false;

        return true;
    },
    lens: (item, filterDetails) => {
        const d = item.details;

        if (filterDetails.brand && !item.brand.toLowerCase().includes(filterDetails.brand.toLowerCase())) return false;

        if (filterDetails.minAperture && (!d.aperture || d.aperture.min < parseFloat(filterDetails.minAperture))) return false;

        if (filterDetails.maxAperture && (!d.aperture || d.aperture.max > parseFloat(filterDetails.maxAperture))) return false;

        for (const [key, val] of Object.entries(filterDetails)) {
            if (typeof val === 'boolean') {
                if ((d[key] || false) !== val) return false;
            }
        }
        return true;
    },



};

const isOverlapping = (s1, e1, s2, e2) =>
    s1 <= e2 && e1 >= s2;

function Equipment() {
    const [rentalsData, setRentalsData] = useState([]);
    const [blockedMap, setBlockedMap] = useState({});
    const [filteredRentals, setFilteredRentals] = useState([]);
    const [filters, setFilters] = useState({
        category: '',
        priceRange: [0, 200000],
        brand: '',
        startDate: null,
        endDate: null,
        details: {},
    });
    const [allCategories, setAllCategories] = useState([]);
    const [dynamicBooleanFilters, setDynamicBooleanFilters] = useState([]);

    useEffect(() => {
        async function fetchData() {
            const snap = await getDocs(collection(db, 'EquipmentInstance'));
            const rentals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRentalsData(rentals);
            setFilteredRentals(rentals);

            const res = await fetch('http://localhost:5100/api/equipment-types');
            setAllCategories(await res.json());
        }
        fetchData();
    }, []);

    useEffect(() => {
        if (!filters.category || !rentalsData.length) {
            setDynamicBooleanFilters([]);
            return;
        }

        const seen = new Set();
        const boolFields = [];

        rentalsData.forEach(item => {
            if (item.categoryName !== filters.category) return;

            const details = item.details || {};
            for (const [key, val] of Object.entries(details)) {
                if (typeof val === 'boolean' && !seen.has(key)) {
                    seen.add(key);
                    boolFields.push({ name: key, type: 'boolean', label: beautifyLabel(key) });
                }
            }
        });

        setDynamicBooleanFilters(boolFields);
    }, [filters.category, rentalsData]);

    useEffect(() => {
        if (!rentalsData.length || !filters.startDate || !filters.endDate) return;

        (async () => {
            const entries = await Promise.all(
                rentalsData.map(async r => {
                    const res = await fetch(`http://localhost:5100/api/cart-blocks/${r.id}`);
                    const blocks = await res.json();
                    return [r.id, blocks.map(b => ({
                        start: new Date(b.start),
                        end: new Date(b.end)
                    }))];
                })
            );
            setBlockedMap(Object.fromEntries(entries));
        })();
    }, [rentalsData, filters.startDate, filters.endDate]);

    useEffect(() => {
        let out = rentalsData;

        if (filters.startDate && filters.endDate && Object.keys(blockedMap).length) {
            const from = filters.startDate;
            const to = filters.endDate;
            out = out.filter(r => {
                const blocks = blockedMap[r.id] || [];
                return !blocks.some(b => isOverlapping(b.start, b.end, from, to));
            });
        }

        if (filters.category) {
            out = out.filter(r => r.categoryName === filters.category);
        }

        if (filters.brand) {
            out = out.filter(r => r.brand.toLowerCase().includes(filters.brand.toLowerCase()));
        }

        out = out.filter(r => r.price >= filters.priceRange[0] && r.price <= filters.priceRange[1]);

        const catFilter = categoryFilterFunctions[filters.category];
        if (catFilter) {
            out = out.filter(r => catFilter(r, filters.details));
        }

        setFilteredRentals(out);
    }, [filters, rentalsData, blockedMap]);

    const handleCategoryChange = e =>
        setFilters(f => ({ ...f, category: e.target.value, details: {} }));

    const handleDetailChange = (name, value) => {
        setFilters(f => {
            const updatedDetails = { ...f.details };

            if (typeof value === 'boolean' && value === false) {
                delete updatedDetails[name];
            } else {
                updatedDetails[name] = value;
            }

            return { ...f, details: updatedDetails };
        });
    };

    return (
        <div className="equipment-shop">
            <aside className="filters">
                <h2>Szűrés</h2>

                <label>
                    {beautifyLabel('category')}:
                    <select value={filters.category} onChange={handleCategoryChange}>
                        <option value="">{beautifyLabel('selectCategory')}</option>
                        {allCategories.map(cat => (
                            <option key={cat.id} value={cat.category}>{cat.category}</option>
                        ))}
                    </select>
                </label>
                <div className="date-filters">
                    <label>Bérlés kezdete:</label>
                    <DatePicker
                        selected={filters.startDate}
                        onChange={d => setFilters(f => ({...f, startDate: d}))}
                        selectsStart
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        minDate={new Date()}
                        placeholderText="Kezdő dátum"
                    />
                    <label>Bérlés vége:</label>
                    <DatePicker
                        selected={filters.endDate}
                        onChange={d => setFilters(f => ({...f, endDate: d}))}
                        selectsEnd
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        minDate={filters.startDate || new Date()}
                        placeholderText="Végdátum"
                    />
                </div>

                {filters.category &&
                    [...(baseFilterConfig[filters.category] || []), ...dynamicBooleanFilters].map(f => (
                        <div key={f.name}>
                            {f.type === 'select' && (
                                <select
                                    value={filters.details[f.name] || ''}
                                    onChange={e => handleDetailChange(f.name, e.target.value)}
                                >
                                    <option value="">{f.label}</option>
                                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            )}
                            {f.type === 'number' && (
                                <input
                                    type="number"
                                    placeholder={f.label}
                                    value={filters.details[f.name] || ''}
                                    onChange={e => handleDetailChange(f.name, e.target.value)}
                                />
                            )}
                            {f.type === 'text' && (
                                <input
                                    type="text"
                                    placeholder={f.label}
                                    value={filters.details[f.name] || ''}
                                    onChange={e => handleDetailChange(f.name, e.target.value)}
                                />
                            )}
                            {f.type === 'checkbox' && f.options.map(o => (
                                <label key={o}>
                                    <input
                                        type="checkbox"
                                        checked={(filters.details[f.name] || []).includes(o)}
                                        onChange={e => handleDetailChange(
                                            f.name,
                                            e.target.checked
                                                ? [...(filters.details[f.name] || []), o]
                                                : (filters.details[f.name] || []).filter(x => x !== o)
                                        )}
                                    />
                                    {o}
                                </label>
                            ))}
                            {f.type === 'boolean' && (
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={filters.details[f.name] || false}
                                        onChange={e => handleDetailChange(f.name, e.target.checked)}
                                    />
                                    {f.label}
                                </label>
                            )}
                        </div>
                    ))}

            </aside>

            <main className="products">
                <div className="products-grid">
                    {filteredRentals.map(r => (
                        <div key={r.id} className="product-card">
                            <Link to={`/equipment/${r.id}`} className="product-link">
                                <img src={r.imageUrl} alt={r.name}/>
                                <h3>{r.name}</h3>
                                <p>{r.brand}</p>
                                <p>{r.price} Ft</p>
                            </Link>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default Equipment;
