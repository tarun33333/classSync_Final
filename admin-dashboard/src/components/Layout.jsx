import React, { useContext } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Layout = () => {
    const { logout, admin } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'bg-blue-700' : '';

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-blue-800 text-white flex flex-col">
                <div className="p-4 text-2xl font-bold">Admin Panel</div>
                <div className="p-4 text-sm">Welcome, {admin?.name}</div>
                <nav className="flex-1 px-2 space-y-2">
                    <Link to="/" className={`block px-4 py-2 rounded hover:bg-blue-700 ${isActive('/')}`}>
                        Dashboard
                    </Link>
                    <Link to="/users" className={`block px-4 py-2 rounded hover:bg-blue-700 ${isActive('/users')}`}>
                        User Management
                    </Link>
                    <Link to="/timetable" className={`block px-4 py-2 rounded hover:bg-blue-700 ${isActive('/timetable')}`}>
                        Timetable
                    </Link>
                </nav>
                <div className="p-4">
                    <button onClick={handleLogout} className="w-full px-4 py-2 text-center bg-red-600 rounded hover:bg-red-700">
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
