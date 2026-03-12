import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simple initialization check
        console.log("AuthContext: Initializing session...");
        const storedUser = localStorage.getItem('smartclass_user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                console.log("AuthContext: Session restored for", parsed.email);
            } catch (e) {
                console.error("AuthContext: Sync error", e);
            }
        }

        // Safety timeout to ensure loading always finishes
        const timer = setTimeout(() => {
            setLoading(false);
            console.log("AuthContext: Loading finalized.");
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // Zustand store references (re-exported for convenience)
    const store = useStore();

    // Load reports from backend into Zustand on login
    useEffect(() => {
        if (user && store.reports.length === 0) {
            axios.get('/api/reports')
                .then(res => store.setReports(res.data))
                .catch(err => console.error("Failed to fetch reports", err));
        }
    }, [user]);

    // Initialize theme from Zustand
    useEffect(() => {
        store.initTheme();
    }, []);

    const login = async (email, password) => {
        // --- Added Check: See if this is a newly approved user in Zustand (local persistence) ---
        const approvedUser = store.approvedUsers?.find(u => u.email === email && password === 'Smart@2026');

        if (approvedUser) {
            const userData = {
                name: approvedUser.parentName,
                role: 'parent',
                email: approvedUser.email,
                childId: 'S001', // Link to a default mock student for testing
                isNewUser: true
            };
            const token = "mock-token-for-newly-approved-user";

            // CRITICAL FIX: Reset the global Zustand state for this new user so they don't inherit a previous user's completed profile status on the same machine.
            store.setProfileCompleted(false);
            store.setFaceCaptures([]);
            store.setProfilePhoto(null);

            localStorage.setItem('smartclass_token', token);
            localStorage.setItem('smartclass_user', JSON.stringify(userData));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(userData);

            // Return an explicit flag so Login.jsx knows to route them to the setup page immediately
            return { success: true, role: 'parent', needsProfileCompletion: true };
        }

        try {
            const response = await axios.post('/api/auth/login', { email, password });
            const { token, user: userData } = response.data;

            localStorage.setItem('smartclass_token', token);
            localStorage.setItem('smartclass_user', JSON.stringify(userData));

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(userData);
            
            // Sync theme preference from DB
            if (userData.theme_preference) {
                store.initTheme(userData.theme_preference);
            }
            
            return { success: true, role: userData.role };
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

        // Wipe local session states so the next user logging in on this machine doesn't inherit them
        store.setProfileCompleted(false);
        store.setFaceCaptures([]);
        store.setProfilePhoto(null);
    };

    return (
        <AuthContext.Provider value={{
            user, setUser, login, logout, loading,
            // Bridge to Zustand for backward compatibility
            pendingUsers: store.pendingUsers,
            approveUser: (id) => { store.approveUser(id); toast.success("User approved! Temp password: Smart@2026"); },
            rejectUser: (id) => { store.rejectUser(id); toast.success("Signup request denied."); },
            reports: store.reports,
            setReports: store.setReports,
            addReport: store.addReport,
            updateReportStatus: (id, s, l) => { store.updateReportStatus(id, s, l); },
            approveReport: (id) => { store.approveReport(id); toast.success("Report approved & pushed to Parent!"); },
            refuseReport: (id, reason) => { store.refuseReport(id, reason); toast.success("Report refused."); },
        }}>
            {children}
        </AuthContext.Provider>
    );
};
