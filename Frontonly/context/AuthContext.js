import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [splashLoading, setSplashLoading] = useState(true);

    const login = async (email, password, macAddress) => {
        setIsLoading(true);
        try {
            const res = await client.post('/auth/login', { email, password, macAddress });
            const { token, role, ...user } = res.data;

            setUserToken(token);
            setUserRole(role);
            setUserInfo(user);

            await SecureStore.setItemAsync('userToken', token);
            await SecureStore.setItemAsync('userRole', role);
            await SecureStore.setItemAsync('userInfo', JSON.stringify(user));
        } catch (e) {
            console.log(e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setUserToken(null);
        setUserRole(null);
        setUserInfo(null);
        await SecureStore.deleteItemAsync('userToken');
        await SecureStore.deleteItemAsync('userRole');
        await SecureStore.deleteItemAsync('userInfo');
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            let userToken = await SecureStore.getItemAsync('userToken');
            let userRole = await SecureStore.getItemAsync('userRole');
            let userInfo = await SecureStore.getItemAsync('userInfo');

            if (userToken) {
                try {
                    // VERIFY TOKEN WITH BACKEND
                    const res = await client.get('/auth/verify');

                    // Token is valid, update state with fresh user data
                    // Token is valid, update state with fresh user data
                    setUserToken(userToken);
                    setUserRole(res.data.role);
                    setUserInfo(res.data);

                    // Update stored info
                    await SecureStore.setItemAsync('userInfo', JSON.stringify(res.data));
                    await SecureStore.setItemAsync('userRole', res.data.role);

                } catch (apiError) {
                    console.log('Token verification failed:', apiError);
                    // Only logout if it's an authentication error (401/403)
                    // If it's a network error, we keep the user logged in with cached data
                    if (apiError.response && (apiError.response.status === 401 || apiError.response.status === 403)) {
                        await logout();
                    } else {
                        // Fallback to local data if network fails but token exists
                        console.log('Network error during verify, using cached credentials');
                        setUserToken(userToken);
                        setUserRole(userRole);
                        if (userInfo) {
                            setUserInfo(JSON.parse(userInfo));
                        }
                    }
                }
            }
        } catch (e) {
            console.log(`isLoggedIn error ${e}`);
        } finally {
            // setSplashLoading(false); // Handled by CustomSplashScreen
        }
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ login, logout, isLoading, splashLoading, setSplashLoading, userToken, userRole, userInfo, setUserInfo }}>
            {children}
        </AuthContext.Provider>
    );
};
