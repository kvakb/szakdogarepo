import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './StatsDashboard.css';

function StatsDashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:5100/api/stats');
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error('Failed to fetch stats:', err);
            }
        };
        fetchStats();
    }, []);

    if (!stats) return <div>Loading statistics...</div>;

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE'];

    return (
        <div className="stats-dashboard">
            <h2>Rental Statistics</h2>

            <div className="stat-card">
                <h3>Total Revenue</h3>
                <p>{stats.totalRevenue.toLocaleString()} Ft</p>
            </div>

            <div className="chart-section">
                <h3>Revenue Over Time (Monthly)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.revenueByMonth}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-section">
                <h3>Rental Counts Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.rentalsByDate}>
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="chart-section">
                <h3>Top Rented Equipment</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie data={stats.topEquipment} dataKey="count" nameKey="name" outerRadius={100} label>
                            {stats.topEquipment.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="stat-card">
                <h3>Average Rental Duration</h3>
                <p>{stats.averageRentalDays.toFixed(1)} days</p>
            </div>
        </div>
    );
}

export default StatsDashboard;
