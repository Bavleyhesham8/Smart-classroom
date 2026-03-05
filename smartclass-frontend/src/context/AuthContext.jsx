import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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

    // --- MOCK V3 SHARED STATE ---
    const [pendingUsers, setPendingUsers] = useState([
        { id: 'PU001', parentName: 'Sarah Connor', parentEmail: 'sarah.c@example.com', childName: 'John Connor', childGrade: 'Grade 10', date: '2026-03-05', status: 'Pending' }
    ]);
    const [reports, setReports] = useState([]);

    useEffect(() => {
        if (user) {
            axios.get('/api/reports')
                .then(res => setReports(res.data))
                .catch(err => console.error("Failed to fetch reports context", err));
        }
    }, [user]);

    const approveUser = (id) => {
        setPendingUsers(prev => prev.filter(u => u.id !== id));
        toast.success("User approved! Mock email sent with credentials.");
    };

    const rejectUser = (id) => {
        setPendingUsers(prev => prev.filter(u => u.id !== id));
        toast.success("User sign up request rejected.");
    };

    const updateReportStatus = (id, newStatus, logAction) => {
        setReports(prev => prev.map(r => {
            if (r.id === id) {
                const updatedLog = [...(r.auditLog || []), { date: new Date().toISOString(), action: logAction }];
                return { ...r, status: newStatus, auditLog: updatedLog };
            }
            return r;
        }));
    };

    return (
        <AuthContext.Provider value={{
            user, login, logout, loading,
            pendingUsers, approveUser, rejectUser,
            reports, setReports, updateReportStatus
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
