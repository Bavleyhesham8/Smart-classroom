import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

/* eslint-disable react-refresh/only-export-components */
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('smartclass_user');
        const token = localStorage.getItem('smartclass_token');
        if (storedUser && token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                return JSON.parse(storedUser);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                return null;
            }
        }
        return null;
    });
    const [loading] = useState(false);

    const login = async (email, password) => {
        try {
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user } = response.data;

            localStorage.setItem('smartclass_token', token);
            localStorage.setItem('smartclass_user', JSON.stringify(user));

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            return { success: true, role: user.role };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.response?.data?.error || 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('smartclass_token');
        localStorage.removeItem('smartclass_user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
