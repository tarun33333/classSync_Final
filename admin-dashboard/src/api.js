import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // Adjust if backend runs on different port
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
