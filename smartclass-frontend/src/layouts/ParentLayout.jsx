import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, LayoutDashboard } from 'lucide-react';
import { cn } from '../lib/utils';
import ProfileDropdown from '../components/ProfileDropdown';

const ParentLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { name: 'Dashboard', path: '/parent/dashboard' }
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo & Desktop Nav */}
                        <div className="flex items-center gap-8">
                            <div className="flex-shrink-0 flex items-center">
                                <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                                    SmartClass Parent
                                </span>
                            </div>

                            <nav className="hidden md:flex space-x-1">
                                {navItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button
                                            key={item.name}
                                            onClick={() => navigate(item.path)}
                                            className={cn(
                                                "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                                                isActive
                                                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50"
                                            )}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Right side Profile & Mobile Toggle */}
                        <div className="flex items-center gap-4">
                            <ProfileDropdown user={user} logout={logout} />

                            {/* Mobile menu button */}
                            <div className="flex items-center md:hidden">
                                <button
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    className="p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                                >
                                    <Menu size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 absolute w-full shadow-lg">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            {navItems.map((item) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.name}
                                        onClick={() => {
                                            navigate(item.path);
                                            setMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "block w-full text-left px-3 py-4 rounded-md text-base font-medium",
                                            isActive
                                                ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/50"
                                        )}
                                    >
                                        {item.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default ParentLayout;
