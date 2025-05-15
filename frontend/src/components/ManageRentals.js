import React, { useEffect, useState } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import './ManageRentals.css';

function ManageRentals() {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(true);

    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        const fetchRentals = async () => {
            try {
                const res = await fetch('http://localhost:5100/api/admin/rentals');
                const data = await res.json();
                setRentals(data);
            } catch (error) {
                console.error('Error fetching rentals:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRentals();
    }, []);

    const formatDate = (dateObj) => {
        if (!dateObj) return '';
        try {
            const date = toDate(dateObj);
            return formatInTimeZone(date, 'Europe/Budapest', 'yyyy.MM.dd');
        } catch (error) {
            console.error('Date formatting error:', error, dateObj);
            return '';
        }
    };

    const toDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (typeof d === 'string') return new Date(d);
        if (typeof d === 'object' && d._seconds !== undefined) return new Date(d._seconds * 1000);
        return new Date(d);
    };

    const isOverlapping = (s1, e1, s2, e2) => s1 <= e2 && e1 >= s2;

    const filteredRentals = rentals.filter(rental => {
        if (statusFilter && rental.status?.toLowerCase().trim() !== statusFilter) return false;

        if (dateFrom || dateTo) {
            const from = dateFrom ? new Date(dateFrom) : null;
            const to = dateTo ? new Date(dateTo) : null;

            const hasOverlap = rental.items.some(item => {
                const start = toDate(item.startDate);
                const end = toDate(item.endDate);
                return isOverlapping(start, end, from || start, to || end);
            });

            if (!hasOverlap) return false;
        }

        return true;
    });

    const handleRentalStatusChange = async (rentalId, newStatus) => {
        try {
            await fetch(`http://localhost:5100/api/admin/rentals/${rentalId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            setRentals(prev =>
                prev.map(r => (r.id === rentalId ? { ...r, status: newStatus } : r))
            );
        } catch (error) {
            console.error('Error updating rental status:', error);
        }
    };

    const handleDeleteRental = async (rentalId) => {
        const confirmDelete = window.confirm('Biztosan törölni szeretnéd ezt a bérlést?');
        if (!confirmDelete) return;

        try {
            await fetch(`http://localhost:5100/api/admin/rentals/${rentalId}`, {
                method: 'DELETE'
            });
            setRentals(prev => prev.filter(r => r.id !== rentalId));
        } catch (error) {
            console.error('Error deleting rental:', error);
            alert('Hiba történt a bérlés törlésekor.');
        }
    };

    const handleItemStatusChange = async (rentalId, itemIndex, newStatus) => {
        try {
            await fetch(
                `http://localhost:5100/api/admin/rentals/${rentalId}/items/${itemIndex}/status`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                }
            );
            setRentals(prev =>
                prev.map(r => {
                    if (r.id !== rentalId) return r;
                    const updatedItems = r.items.map((item, idx) =>
                        idx === itemIndex ? { ...item, status: newStatus } : item
                    );
                    return { ...r, items: updatedItems };
                })
            );
        } catch (error) {
            console.error('Error updating item status:', error);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="manage-rentals-container">
            <h2>Manage Rentals</h2>

            <div className="rental-filters">
                <label>
                    Status:
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Összes</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </label>

                <label>
                    From:
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </label>

                <label>
                    To:
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </label>
            </div>

            {filteredRentals.map(rental => (
                <div key={rental.id} className="rental-card-admin">
                    <p><strong>Rental ID:</strong> {rental.id}</p>
                    <p><strong>User:</strong> {rental.userEmail}</p>
                    <p><strong>Total:</strong> {rental.totalAmount?.toLocaleString('hu-HU')} Ft</p>
                    <p><strong>Rental Status:</strong>
                        <select
                            value={rental.status}
                            onChange={e => handleRentalStatusChange(rental.id, e.target.value)}
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                        </select>
                    </p>
                    <div>
                        <strong>Items:</strong>
                        <ul>
                            {rental.items.map((item, index) => (
                                <li key={index} className="rental-item">
                                    <span>
                                        {item.name} ({formatDate(item.startDate)} - {formatDate(item.endDate)})
                                    </span>
                                    <select
                                        className="item-status-select"
                                        value={item.status || rental.status}
                                        onChange={e => handleItemStatusChange(rental.id, index, e.target.value)}
                                    >
                                        <option value="upcoming">Upcoming</option>
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p><strong>Created At:</strong> {formatDate(rental.createdAt)}</p>

                    <button onClick={() => handleDeleteRental(rental.id)} className="delete-rental-button">
                        Törlés
                    </button>
                </div>
            ))}
        </div>
    );
}

export default ManageRentals;
