import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = () => {
    const { admin, loading } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;

    return admin ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
