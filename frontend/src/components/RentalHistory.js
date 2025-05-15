import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';
import './rentalHistory.css';

function RentalHistory() {
    const { equipmentId } = useParams();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`http://localhost:5100/api/rental-history/${equipmentId}`);
                const data = await res.json();
                setHistory(data);
            } catch (error) {
                console.error('Hiba a rental history lekérésekor:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [equipmentId]);

    const formatDate = (date) => {
        if (!date) return '-';
        const realDate = new Date(date);
        if (isNaN(realDate)) return '-';
        return formatInTimeZone(realDate, 'Europe/Budapest', 'yyyy.MM.dd');
    };

    if (loading) return <div>Betöltés...</div>;

    return (
        <div className="rental-history-container">
            <h2>Eszköz bérlési előzmények</h2>
            {history.length === 0 ? (
                <p>Nincs bérlési előzmény erre az eszközre.</p>
            ) : (
                <table className="history-table">
                    <thead>
                    <tr>
                        <th>Bérlő (Email)</th>
                        <th>Kezdete</th>
                        <th>Vége</th>
                        <th>Összeg (Ft)</th>
                        <th>Státusz</th>
                    </tr>
                    </thead>

                    <tbody>
                    {history.map((rental, index) => (
                        <tr key={index}>
                            <td>{rental.userEmail}</td>
                            <td>{formatDate(rental.startDate)}</td>
                            <td>{formatDate(rental.endDate)}</td>
                            <td>{rental.totalPrice.toLocaleString('hu-HU')} Ft</td>
                            <td>{rental.status}</td>
                        </tr>
                    ))}
                    </tbody>

                </table>
            )}
        </div>
    );
}

export default RentalHistory;
