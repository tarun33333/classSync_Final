import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import TimetableManagement from './pages/TimetableManagement';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<PrivateRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/users" element={<UserManagement />} />
                            <Route path="/timetable" element={<TimetableManagement />} />
                        </Route>
                    </Route>
                </Routes>
            </AuthProvider>
        </Router>
    );
}

export default App;
