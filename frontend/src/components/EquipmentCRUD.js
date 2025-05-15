import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import AdminRoute from './AdminRoute';
import './EquipmentCRUD.css';

function EquipmentCRUD() {
    const [equipmentList, setEquipmentList] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchEquipment = async () => {
            const querySnapshot = await getDocs(collection(db, 'EquipmentInstance'));
            const equipmentData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setEquipmentList(equipmentData);
        };

        fetchEquipment();
    }, []);

    const handleDeleteEquipment = async (id) => {
        try {
            const response = await fetch(`http://localhost:5100/api/equipment/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            setEquipmentList(equipmentList.filter(item => item.id !== id));
            alert('Equipment deleted successfully');
        } catch (error) {
            console.error('Error deleting equipment: ', error);
            alert(`Failed to delete equipment: ${error.message}`);
        }
    };

    const handleRentalHistory = (id) => {
        navigate(`/rental-history/${id}`);
    };

    const handleEditEquipment = (id) => {
        navigate(`/edit-equipment/${id}`);
    };

    const handleAddEquipment = () => {
        navigate('/add-equipment');
    };

    return (
        <AdminRoute>
            <div className="equipment-crud-container">
                <h1>Manage Equipment</h1>
                <button onClick={handleAddEquipment} className="add-equipment-button">Add Equipment</button>
                <table className="equipment-table">
                    <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Serial Number</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {equipmentList.map((item) => (
                        <tr key={item.id}>
                            <td><img src={item.imageUrl} alt={item.name} className="equipment-image" /></td>
                            <td>{item.name}</td>
                            <td>{item.id}</td>
                            <td>
                                <div className="action-buttons">
                                    <button onClick={() => handleRentalHistory(item.id)}>Rental History</button>
                                    <button onClick={() => handleEditEquipment(item.id)}>Edit</button>
                                    <button onClick={() => handleDeleteEquipment(item.id)}>Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </AdminRoute>
    );
}

export default EquipmentCRUD;
