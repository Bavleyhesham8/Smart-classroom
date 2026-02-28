import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, LayoutDashboard, ShieldCheck, UserCircle, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin/dashboard' },
];

const SidebarContent = ({ location, setMobileOpen, handleLogout, navigate }) => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 py-2">
            <span className="text-xl font-bold flex items-center text-white tracking-tight">
                <ShieldCheck className="mr-2 text-teal-500" size={24} />
                Admin
            </span>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
            {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.text}
                        onClick={() => {
                            navigate(item.path);
                            setMobileOpen(false);
                        }}
                        className={cn(
                            "flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200",
                            isActive
                                ? "bg-teal-600/10 text-teal-400"
                                : "hover:bg-slate-800 hover:text-white"
                        )}
                    >
                        <span className="mr-3">{item.icon}</span>
                        {item.text}
                    </button>
                );
            })}
        </nav>
        <div className="p-4 border-t border-slate-800">
            <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
                <LogOut size={20} className="mr-3" />
                Logout
            </button>
        </div>
    </div>
);

const AdminLayout = () => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm lg:hidden"
                    onClick={handleDrawerToggle}
                />
            )}

            {/* Sidebar Desktop & Mobile */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <SidebarContent
                    location={location}
                    setMobileOpen={setMobileOpen}
                    handleLogout={handleLogout}
                    navigate={navigate}
                />
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Navbar */}
                <header className="h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 sticky top-0">
                    <div className="flex items-center">
                        <button
                            onClick={handleDrawerToggle}
                            className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none mr-4"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                            Command Center
                        </h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                            {user?.name || "Administrator"}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                            <UserCircle size={20} />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
