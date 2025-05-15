import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UserContext } from '../userContext';
import './AddEquipment.css';

function EditEquipment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useContext(UserContext);
    const [categories, setCategories] = useState([]);
    const [formFields, setFormFields] = useState([]);
    const [categoryName, setCategoryName] = useState('');
    const [formData, setFormData] = useState({
        name: '', brand: '', status: '', description: '', price: '', details: {}
    });
    const [imageFile, setImageFile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, eqRes] = await Promise.all([
                    fetch('http://localhost:5100/api/equipment-types'),
                    fetch(`http://localhost:5100/api/equipment/${id}`)
                ]);

                if (!catRes.ok || !eqRes.ok) {
                    throw new Error('Failed to load data');
                }

                const categoriesData = await catRes.json();
                const equipmentData = await eqRes.json();

                setCategories(categoriesData);
                setCategoryName(equipmentData.categoryName);

                const matchedCategory = categoriesData.find(cat => cat.category === equipmentData.categoryName);
                if (!matchedCategory) throw new Error('Category not found');
                setFormFields(matchedCategory.properties);

                setFormData({
                    name: equipmentData.name,
                    brand: equipmentData.brand,
                    status: equipmentData.status,
                    description: equipmentData.description,
                    price: equipmentData.price,
                    details: equipmentData.details
                });
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Failed to load equipment or categories');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDetailChange = (e, path = []) => {
        const { name, value, type, checked } = e.target;
        const fieldPath = [...path, name];
        setFormData(prev => {
            const newDetails = { ...prev.details };
            let obj = newDetails;
            for (let i = 0; i < fieldPath.length - 1; i++) {
                if (!obj[fieldPath[i]]) obj[fieldPath[i]] = {};
                obj = obj[fieldPath[i]];
            }
            obj[fieldPath[fieldPath.length - 1]] = type === 'checkbox' ? checked : value;
            return { ...prev, details: newDetails };
        });
    };

    const getValue = (data, path) => path.reduce((acc, key) => acc?.[key] ?? '', data);
    const getChecked = (data, path) => !!path.reduce((acc, key) => acc?.[key], data);

    const beautifyLabel = (text) =>
        text.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

    const renderInputField = (field, path = []) => {
        const { name: fieldName, type: fieldType, options, fields } = field;
        const fullPath = [...path, fieldName];

        if (fieldType === 'map') {
            return (
                <div className="map-group">
                    <h4>{beautifyLabel(fieldName)}</h4>
                    {fields?.map(subField => (
                        <div key={subField.name}>
                            <label>{beautifyLabel(subField.name)}</label>
                            {renderInputField(subField, fullPath)}
                        </div>
                    ))}
                </div>
            );
        }

        if (fieldType === 'array' && fields && fields[0]?.type === 'map') {
            const items = getValue(formData.details, fullPath) || [];

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
                    {items.map((item, idx) => (
                        <fieldset key={idx} className="array-map-item">
                            <legend>{beautifyLabel(fieldName)} #{idx + 1}</legend>
                            <label>Width:
                                <input
                                    type="number"
                                    value={item.width || ''}
                                    onChange={e => updateResolutionField(idx, 'width', e.target.value)}
                                />
                            </label>
                            <label>Height:
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
            case 'number':
                return (
                    <input
                        type={fieldType === 'number' ? 'number' : 'text'}
                        name={fieldName}
                        value={getValue(formData.details, fullPath)}
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
        try {
            const formPayload = new FormData();
            formPayload.append('name', formData.name);
            formPayload.append('brand', formData.brand);
            formPayload.append('status', formData.status);
            formPayload.append('description', formData.description);
            formPayload.append('price', formData.price);
            formPayload.append('details', JSON.stringify(formData.details));
            if (imageFile) {
                formPayload.append('image', imageFile); // csak ha van új kép
            }

            const response = await fetch(`http://localhost:5100/api/equipment/${id}`, {
                method: 'PUT',
                body: formPayload,
            });

            if (!response.ok) throw new Error('Update failed');
            alert('Equipment updated successfully!');
            navigate('/equipment-crud');
        } catch (err) {
            alert('Error: ' + err.message);
        }
    };


    if (loading) return <div className="form-container"><p>Loading...</p></div>;

    return (
        <div className="form-container">
            <h1>Edit Equipment</h1>
            <form className="form" onSubmit={handleSubmit}>
                <div><label>Category:</label><input type="text" value={beautifyLabel(categoryName)} disabled/></div>
                <div><label>Name:</label><input type="text" name="name" value={formData.name}
                                                onChange={handleInputChange} required/></div>
                <div><label>Brand:</label><input type="text" name="brand" value={formData.brand}
                                                 onChange={handleInputChange} required/></div>
                <div>
                    <label>Status:</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} required>
                        <option value="">Select status</option>
                        <option value="available">Available</option>
                        <option value="rented">Rented</option>
                        <option value="under maintenance">Under Maintenance</option>
                    </select>
                </div>
                <div><label>Description:</label><textarea name="description" value={formData.description}
                                                          onChange={handleInputChange} required/></div>
                <div><label>Price:</label><input type="number" name="price" value={formData.price}
                                                 onChange={handleInputChange} required/></div>
                <div>
                    <label>Új kép feltöltése:</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />
                </div>


                {formFields.map(field => (
                    ['name', 'brand', 'status', 'description', 'price'].includes(field.name) ? null : (
                        <div key={field.name} className="form-field">
                            <label>{beautifyLabel(field.name)}:</label>
                            {renderInputField(field)}
                        </div>
                    )
                ))}

                <button type="submit">Update Equipment</button>
            </form>
        </div>
    );
}

export default EditEquipment;