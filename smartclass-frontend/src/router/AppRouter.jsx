import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useStore from '../store/useStore';

// Layouts
import TeacherLayout from '../layouts/TeacherLayout';
import AdminLayout from '../layouts/AdminLayout';
import ParentLayout from '../layouts/ParentLayout';

// Pages
import Login from '../pages/Login';
import TeacherDashboard from '../pages/teacher/Dashboard';
import AdminDashboard from '../pages/admin/Dashboard';
import ParentDashboard from '../pages/parent/Dashboard';
import CompleteProfile from '../pages/CompleteProfile';
import FullRegistration from '../pages/FullRegistration';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const profileCompleted = useStore(s => s.profileCompleted);
    const location = useLocation();

    // The global App.jsx handles the initial "loading" state.
    // We only need to guard against access while loading or if unauthenticated.
    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Force profile completion for parents (includes face capture and full registration)
    if (user.role === 'parent' && !profileCompleted && !['/complete-profile', '/full-registration'].includes(location.pathname)) {
        // Assume they start at complete-profile
        return <Navigate to="/complete-profile" replace />;
    }

    // Role-based access control
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const targetPath = user.role === 'admin' ? '/admin/dashboard' : (user.role === 'teacher' ? '/teacher/dashboard' : '/parent/dashboard');
        return <Navigate to={targetPath} replace />;
    }

    return children;
};

const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />
            <Route path="/full-registration" element={<ProtectedRoute><FullRegistration /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Parent Routes */}
            <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentLayout /></ProtectedRoute>}>
                <Route path="dashboard" element={<ParentDashboard />} />
                <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
};

export default AppRouter;
