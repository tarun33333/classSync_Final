import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const Dashboard = () => {
    const [userCount, setUserCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data } = await api.get('/admin/users');
                setUserCount(data.length);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching stats", error);
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <h3 className="text-xl font-semibold mb-2">Total Users</h3>
                    <p className="text-3xl font-bold text-gray-700">
                        {loading ? 'Loading...' : userCount}
                    </p>
                </div>
                {/* Add more stats card here later */}
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="flex gap-4">
                    <Link to="/users" className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                        Manage Users
                    </Link>
                    <Link to="/timetable" className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600">
                        View Timetables
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
