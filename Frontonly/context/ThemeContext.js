import React, { createContext, useContext, useState, useEffect } from 'react';
import { DARK, LIGHT, DARK_GRADIENT, LIGHT_GRADIENT } from '../theme/colors';
import { AuthContext } from './AuthContext';
import client from '../api/client';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const { userInfo, setUserInfo } = useContext(AuthContext);
    const [isDark, setIsDark] = useState(true); // default dark until userInfo loads

    // Sync with userInfo.theme when it arrives (login / verify)
    useEffect(() => {
        if (userInfo?.theme) {
            setIsDark(userInfo.theme !== 'light');
        }
    }, [userInfo?.theme]);

    const colors = isDark ? DARK : LIGHT;
    const gradient = isDark ? DARK_GRADIENT : LIGHT_GRADIENT;

    const toggleTheme = async () => {
        const newTheme = isDark ? 'light' : 'dark';
        setIsDark(!isDark); // optimistic update
        try {
            await client.put('/auth/theme', { theme: newTheme });
            // Update local userInfo so the preference is cached
            if (setUserInfo) {
                setUserInfo(prev => ({ ...prev, theme: newTheme }));
            }
        } catch (e) {
            // Revert if request failed
            setIsDark(isDark);
            console.warn('Theme update failed:', e);
        }
    };

    return (
        <ThemeContext.Provider value={{ isDark, colors, gradient, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Convenience hook
export const useTheme = () => useContext(ThemeContext);
