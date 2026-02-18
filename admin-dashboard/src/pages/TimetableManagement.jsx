import React, { useState, useEffect } from 'react';
import api from '../api';
import TimetableEditor from '../components/TimetableEditor';

const TimetableManagement = () => {
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingRoutine, setEditingRoutine] = useState(null);
    const [formData, setFormData] = useState({
        dept: '', batch: '', semester: '', class: ''
    });

    const fetchRoutines = async () => {
        try {
            const { data } = await api.get('/routines');
            setRoutines(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching routines", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutines();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Create a default empty timetable structure
            const defaultTimetable = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => ({
                day,
                periods: []
            }));

            const payload = { ...formData, timetable: defaultTimetable };
            const { data } = await api.post('/routines', payload);
            setRoutines([...routines, data]);
            setShowModal(false);
            setFormData({ dept: '', batch: '', semester: '', class: '' });
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating routine');
        }
    };

    const handleUpdateRoutine = (updatedRoutine) => {
        setRoutines(routines.map(r => r._id === updatedRoutine._id ? updatedRoutine : r));
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Timetable Management</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Create Class Routine
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded shadow-lg w-96">
                        <h2 className="text-xl font-bold mb-4">New Class Routine</h2>
                        <form onSubmit={handleSubmit}>
                            <input type="text" name="dept" placeholder="Department (e.g., CSE)" value={formData.dept} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                            <input type="text" name="batch" placeholder="Batch (e.g., 2022-2026)" value={formData.batch} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                            <input type="number" name="semester" placeholder="Semester (1-8)" value={formData.semester} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                            <input type="number" name="class" placeholder="Year (1-4)" value={formData.class} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Loading...</p>
                ) : routines.length === 0 ? (
                    <p>No routines found.</p>
                ) : (
                    routines.map(routine => (
                        <div key={routine._id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer">
                            <h3 className="text-xl font-bold">{routine.dept} - {routine.batch}</h3>
                            <p className="text-gray-600">Semester: {routine.semester}</p>
                            <p className="text-gray-600">Year: {routine.class}</p>
                            <button className="mt-4 text-blue-600 hover:text-blue-800 font-semibold" onClick={() => setEditingRoutine(routine)}>Edit Timetable</button>
                        </div>
                    ))
                )}
            </div>

            {editingRoutine && (
                <TimetableEditor
                    routine={editingRoutine}
                    onClose={() => setEditingRoutine(null)}
                    onUpdate={handleUpdateRoutine}
                />
            )}
        </div>
    );
};

export default TimetableManagement;
