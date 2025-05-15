import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../userContext';
import { formatInTimeZone } from 'date-fns-tz';
import './myrentals.css';

function MyRentals() {
    const { currentUser } = useContext(UserContext);
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRentals = async () => {
            if (!currentUser) return;

            try {
                const res = await fetch(`http://localhost:5100/api/rentals/${currentUser.uid}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setRentals(data);
                } else {
                    setRentals([]);
                }
            } catch (error) {
                console.error('Error fetching rentals:', error);
                setRentals([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRentals();
    }, [currentUser]);

    const formatDate = (dateObj) => {
        if (!dateObj) return '';

        try {
            let date;
            if (typeof dateObj === 'number') {
                date = new Date(dateObj);
            } else if (typeof dateObj === 'object' && dateObj._seconds !== undefined) {
                date = new Date(dateObj._seconds * 1000);
            } else if (typeof dateObj === 'string') {
                date = new Date(dateObj);
            } else {
                console.error('Unknown date type:', dateObj);
                return '';
            }

            if (isNaN(date.getTime())) {
                console.error('Invalid date object:', dateObj);
                return '';
            }

            return formatInTimeZone(date, 'Europe/Budapest', 'yyyy.MM.dd');
        } catch (error) {
            console.error('Date formatting error:', error, dateObj);
            return '';
        }
    };

    if (loading) return <div className="loading">Loading...</div>;

    return (
        <div className="my-rentals-container">
            <h2>My Rentals</h2>
            {rentals.length === 0 ? (
                <p className="no-rentals">You have no rentals yet.</p>
            ) : (
                rentals.map(rental => (
                    <div key={rental.id} className="rental-card">
                        <p className="rental-id"><strong>Rental ID:</strong> {rental.id}</p>
                        <p className="rental-total"><strong>Total Amount:</strong> {rental.totalAmount ? rental.totalAmount.toLocaleString('hu-HU') : 'N/A'} Ft</p>
                        <p className="rental-status"><strong>Status:</strong> {rental.status}</p>
                        <div className="rental-items">
                            <p><strong>Rented Items:</strong></p>
                            <ul>
                                {rental.items.map((item, index) => (
                                    <li key={index}>
                                        <strong>{item.name}</strong><br />
                                        <span>{formatDate(item.startDate)} - {formatDate(item.endDate)}</span><br />
                                        <span>{item.pricePerDay.toLocaleString('hu-HU')} Ft/day</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className="rental-created"><strong>Created At:</strong> {formatDate(rental.createdAt)}</p>
                    </div>
                ))
            )}
        </div>
    );
}

export default MyRentals;
