import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../userContext';
import './AddEquipment.css';

function AddEquipment() {
    const { currentUser } = useContext(UserContext);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        status: '',
        description: '',
        price: '',
        image: null,
        details: {}
    });
    const [formFields, setFormFields] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await fetch('http://localhost:5100/api/equipment-types');
                if (!response.ok) throw new Error('Failed to fetch equipment types');
                const data = await response.json();
                setCategories(data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // utility: parse "1/5000" or numeric string to seconds (number)
    const parseFraction = (str) => {
        if (typeof str !== 'string') return null;
        const parts = str.split('/').map(s => s.trim());
        if (parts.length === 2) {
            const num = Number(parts[0]);
            const den = Number(parts[1]);
            if (!isNaN(num) && !isNaN(den) && den !== 0) {
                return num / den;
            }
        }
        // fallback: try parse float
        const f = parseFloat(str);
        return isNaN(f) ? null : f;
    };

    const handleCategoryChange = (e) => {
        const category = e.target.value;
        setSelectedCategory(category);
        const selectedType = categories.find(type => type.id === category);
        if (selectedType) {
            setFormFields(selectedType.properties);
            setFormData({
                name: '',
                brand: '',
                status: '',
                description: '',
                price: '',
                image: null,
                details: {}
            });
            setShowForm(true);
        } else {
            setShowForm(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        setFormData(prev => ({ ...prev, image: e.target.files[0] }));
    };

    const beautifyLabel = (text, unit = null) =>
        `${text.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}${unit ? ` (${unit})` : ''}`;

    const handleDetailChange = (e, path = []) => {
        const { name, value, type, checked } = e.target;
        const isShutter = (name === 'minShutterSpeed' || name === 'maxShutterSpeed');

        setFormData(prev => {
            const newDetails = { ...prev.details };
            let obj = newDetails;
            for (let i = 0; i < path.length; i++) {
                if (!obj[path[i]]) obj[path[i]] = {};
                obj = obj[path[i]];
            }

            if (isShutter && type === 'text') {
                const seconds = parseFraction(value);
                obj[name] = seconds;
            } else if (type === 'number') {
                obj[name] = value === '' ? '' : parseFloat(value);
            } else if (type === 'checkbox') {
                obj[name] = checked;
            } else {
                obj[name] = value;
            }

            return { ...prev, details: newDetails };
        });
    };


    const renderInputField = (field, path = []) => {
        const { name: fieldName, type: fieldType, options, fields } = field;
        const fullPath = [...path, fieldName];
        const getValue = (data, path) => path.reduce((acc, key) => acc?.[key] ?? '', data);
        const getChecked = (data, path) => !!path.reduce((acc, key) => acc?.[key], data);

        if (fieldType === 'map') {
            return (
                <div className="map-group">
                    <h4>{beautifyLabel(fieldName)}</h4>
                    {fields?.map(subField => (
                        <div key={subField.name}>
                            <label>{beautifyLabel(subField.name, subField.unit)}</label>
                            {renderInputField(subField, fullPath)}
                        </div>
                    ))}
                </div>
            );
        }

        if (fieldType === 'array' && fields && fields[0]?.type === 'map') {
            const items = getValue(formData.details, fullPath) || [];

            const addItem = () => {
                setFormData(prev => {
                    const newItem = fieldName === 'videoResolutions'
                        ? { width: '', height: '', fps: [] }
                        : { width: '', height: '' };
                    const updated = [...items, newItem];
                    const newDetails = { ...prev.details };
                    let target = newDetails;
                    for (let i = 0; i < fullPath.length - 1; i++) {
                        if (!target[fullPath[i]]) target[fullPath[i]] = {};
                        target = target[fullPath[i]];
                    }
                    target[fullPath[fullPath.length - 1]] = updated;
                    return { ...prev, details: newDetails };
                });
            };

            const updateResolutionField = (index, key, value, isFps = false) => {
                setFormData(prev => {
                    const newDetails = { ...prev.details };
                    let target = newDetails;
                    for (let i = 0; i < fullPath.length - 1; i++) {
                        if (!target[fullPath[i]]) target[fullPath[i]] = {};
                        target = target[fullPath[i]];
                    }

                    const list = target[fullPath[fullPath.length - 1]] || [];
                    const item = { ...(list[index] || {}) };

                    if (isFps) {
                        const currentFps = Array.isArray(item.fps) ? item.fps : [];
                        item.fps = currentFps.includes(value)
                            ? currentFps.filter(f => f !== value)
                            : [...currentFps, value];
                    } else {
                        item[key] = value;
                    }

                    const updatedList = [...list];
                    updatedList[index] = item;
                    target[fullPath[fullPath.length - 1]] = updatedList;

                    return { ...prev, details: newDetails };
                });
            };

            return (
                <div className="array-map-group">
                    <button type="button" onClick={addItem}>Add {beautifyLabel(fieldName)}</button>
                    {items.map((item, idx) => (
                        <fieldset key={idx} className="array-map-item">
                            <legend>{beautifyLabel(fieldName)} #{idx + 1}</legend>
                            <label>{beautifyLabel('width', 'px')}:
                                <input
                                    type="number"
                                    value={item.width || ''}
                                    onChange={e => updateResolutionField(idx, 'width', e.target.value)}
                                />
                            </label>
                            <label>{beautifyLabel('height', 'px')}:
                                <input
                                    type="number"
                                    value={item.height || ''}
                                    onChange={e => updateResolutionField(idx, 'height', e.target.value)}
                                />
                            </label>

                            {fieldName === 'videoResolutions' && (
                                <div>
                                    <strong>FPS:</strong>
                                    {[24, 25, 30, 50, 60, 100, 120, 150, 175, 200, 250, 300].map(fps => (
                                        <label key={fps}>
                                            <input
                                                type="checkbox"
                                                checked={Array.isArray(item.fps) && item.fps.includes(fps)}
                                                onChange={() => updateResolutionField(idx, 'fps', fps, true)}
                                            />
                                            {fps} fps
                                        </label>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                    ))}
                </div>
            );
        }

        if (fieldType === 'array' && options) {
            const isSingle = ['mountType', 'sensorType', 'bodyMaterial'].includes(fieldName);

            return (
                <div>
                    {options.map(option => (
                        <label key={option}>
                            <input
                                type={isSingle ? 'radio' : 'checkbox'}
                                name={fieldName}
                                value={option}
                                checked={isSingle
                                    ? formData.details[fieldName] === option
                                    : (formData.details[fieldName] || []).includes(option)}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setFormData(prev => ({
                                        ...prev,
                                        details: {
                                            ...prev.details,
                                            [fieldName]: isSingle
                                                ? option
                                                : checked
                                                    ? [...(prev.details[fieldName] || []), option]
                                                    : (prev.details[fieldName] || []).filter(v => v !== option)
                                        }
                                    }));
                                }}
                            />
                            {option}
                        </label>
                    ))}
                </div>
            );
        }

        switch (fieldType) {
            case 'string':
                return (
                    <input
                        type="text"
                        name={fieldName}
                        value={getValue(formData.details, fullPath) || ''}
                        onChange={(e) => handleDetailChange(e, path)}
                    />
                );
            case 'number':
                if (fieldName === 'minShutterSpeed' || fieldName === 'maxShutterSpeed') {
                    const rawInput = formData.details.__rawShutterInput || {};
                    return (
                        <input
                            type="text"
                            name={fieldName}
                            placeholder="1/5000"
                            value={rawInput[fieldName] ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData(prev => {
                                    const updatedRaw = {
                                        ...(prev.details.__rawShutterInput || {}),
                                        [fieldName]: val
                                    };
                                    return {
                                        ...prev,
                                        details: {
                                            ...prev.details,
                                            __rawShutterInput: updatedRaw
                                        }
                                    };
                                });
                                handleDetailChange(e, path);
                            }}
                        />
                    );
                }

                return (
                    <input
                        type="number"
                        name={fieldName}
                        value={getValue(formData.details, fullPath) || ''}
                        onChange={(e) => handleDetailChange(e, path)}
                    />
                );
            case 'boolean':
                return (
                    <input
                        type="checkbox"
                        name={fieldName}
                        checked={getChecked(formData.details, fullPath)}
                        onChange={(e) => handleDetailChange(e, path)}
                    />
                );
            case 'select':
                return (
                    <select
                        name={fieldName}
                        value={getValue(formData.details, fullPath)}
                        onChange={(e) => handleDetailChange(e, path)}
                    >
                        <option value="">Select {fieldName}</option>
                        {options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );
            default:
                return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedType = categories.find(type => type.id === selectedCategory);
        const categoryName = selectedType?.category || '';

        // ensure boolean defaults
        const enrichedDetails = { ...formData.details };
        formFields.forEach(field => {
            if (field.type === 'boolean' && !(field.name in enrichedDetails)) {
                enrichedDetails[field.name] = false;
            }
        });

        const payload = new FormData();
        payload.append('category', selectedCategory);
        payload.append('categoryName', categoryName);
        payload.append('name', formData.name);
        payload.append('brand', formData.brand);
        payload.append('status', formData.status);
        payload.append('description', formData.description);
        payload.append('price', formData.price);
        payload.append('uid', currentUser?.uid || '');
        payload.append('details', JSON.stringify(enrichedDetails));
        if (formData.image) payload.append('image', formData.image);

        try {
            const response = await fetch('http://localhost:5100/api/equipment', {
                method: 'POST',
                body: payload
            });
            if (!response.ok) throw new Error('Upload failed');
            alert('Equipment added successfully!');
            setFormData({
                name: '',
                brand: '',
                status: '',
                description: '',
                price: '',
                image: null,
                details: {}
            });
            setSelectedCategory('');
            setShowForm(false);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <div className="form-container">
            <h1>Add Equipment</h1>
            <form className="form" onSubmit={handleSubmit}>
                <div>
                    <label>Category:</label>
                    <select value={selectedCategory} onChange={handleCategoryChange}>
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {showForm && (
                    <>
                        <div>
                            <label>Name:</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label>Brand:</label>
                            <input type="text" name="brand" value={formData.brand} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label>Status:</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} required>
                                <option value="">Select status</option>
                                <option value="available">Available</option>
                                <option value="under maintenance">Under Maintenance</option>
                            </select>
                        </div>
                        <div>
                            <label>Description:</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label>Price:</label>
                            <input type="number" name="price" value={formData.price} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label>Image:</label>
                            <input type="file" accept="image/*" onChange={handleImageChange} />
                        </div>

                        {formFields.map(field => (
                            ['name', 'brand', 'status', 'description', 'price'].includes(field.name) ? null : (
                                <div key={field.name} className="form-field">
                                    <label>{beautifyLabel(field.name, field.unit)}:</label>
                                    {renderInputField(field)}
                                </div>
                            )
                        ))}

                        <button type="submit">Add Equipment</button>
                    </>
                )}
            </form>
        </div>
    );
}

export default AddEquipment;
