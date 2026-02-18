import React, { useState, useEffect } from 'react';
import api from '../api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', email: '', password: '', role: 'student',
        department: '', section: '', rollNumber: '', batch: '',
        isAdvisor: false, advisorBatch: '', advisorDept: ''
    });

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/admin/users');
            setUsers(data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching users", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/admin/users/${id}`);
                setUsers(users.filter(user => user._id !== id));
            } catch (error) {
                alert('Error deleting user');
            }
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post('/admin/users', formData);
            setUsers([...users, data]);
            setShowModal(false);
            setFormData({
                name: '', email: '', password: '', role: 'student',
                department: '', section: '', rollNumber: '', batch: '',
                isAdvisor: false, advisorBatch: '', advisorDept: ''
            });
        } catch (error) {
            alert(error.response?.data?.message || 'Error creating user');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">User Management</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Add User
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded shadow-lg w-96 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">Add New User</h2>
                        <form onSubmit={handleSubmit}>
                            <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                            <select name="role" value={formData.role} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded">
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                            </select>

                            {formData.role === 'student' && (
                                <>
                                    <input type="text" name="rollNumber" placeholder="Roll Number" value={formData.rollNumber} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" />
                                    <input type="text" name="department" placeholder="Department" value={formData.department} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" />
                                    <input type="text" name="section" placeholder="Section" value={formData.section} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" />
                                    <input type="text" name="batch" placeholder="Batch (e.g., 2022-2026)" value={formData.batch} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" />
                                </>
                            )}
                            {formData.role === 'teacher' && (
                                <>
                                    <input type="text" name="department" placeholder="Department" value={formData.department} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />

                                    <div className="flex items-center mb-2">
                                        <input
                                            type="checkbox"
                                            name="isAdvisor"
                                            id="isAdvisor"
                                            checked={formData.isAdvisor}
                                            onChange={(e) => setFormData({ ...formData, isAdvisor: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <label htmlFor="isAdvisor" className="text-sm font-medium text-gray-700">Is Class Advisor?</label>
                                    </div>

                                    {formData.isAdvisor && (
                                        <>
                                            <input type="text" name="advisorBatch" placeholder="Advisor Batch (e.g., 2022-2026)" value={formData.advisorBatch} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                                            <input type="text" name="advisorDept" placeholder="Advisor Department (e.g., CSE)" value={formData.advisorDept} onChange={handleInputChange} className="w-full mb-2 p-2 border rounded" required />
                                        </>
                                    )}
                                </>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center">Loading...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-4 text-center">No users found</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'teacher' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.department || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {/* <button className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button> */}
                                        <button onClick={() => handleDelete(user._id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
