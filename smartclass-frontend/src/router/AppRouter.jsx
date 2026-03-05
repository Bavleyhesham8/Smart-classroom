import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={`/${user.role}/dashboard`} replace />;
    }

    return children;
};

const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={<ProtectedRoute><CompleteProfile /></ProtectedRoute>} />

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
