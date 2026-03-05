import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, LogOut, Moon, Sun, Settings, User, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileDropdown = ({ user, logout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 focus:outline-none p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
                <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">
                        {user?.name || "User"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user?.role || "Role"}</span>
                </div>
                {user?.photo ? (
                    <img src={user.photo} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95">
                        <span className="font-bold text-lg">{user?.name ? user.name[0] : 'U'}</span>
                    </div>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform origin-top-right"
                    >
                        <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-inner">
                                <span className="font-black text-xl">{user?.name ? user.name[0] : 'U'}</span>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-black text-slate-900 dark:text-white truncate tracking-tight">{user?.name || "User"}</span>
                                <span className="text-xs text-slate-500 truncate font-medium">{user?.email || "user@example.com"}</span>
                            </div>
                        </div>

                        <div className="p-2 space-y-1">
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <User size={18} className="text-slate-400" /> View Profile
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Camera size={18} className="text-slate-400" /> Edit Photo
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Settings size={18} className="text-slate-400" /> Settings
                            </button>
                        </div>

                        <div className="p-2 border-t border-slate-100 dark:border-slate-800 gap-1 flex flex-col">
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                            >
                                <span className="flex items-center gap-3">
                                    {isDark ? <Moon size={18} className="text-slate-400 group-hover:text-blue-500" /> : <Sun size={18} className="text-slate-400 group-hover:text-amber-500" />} Theme
                                </span>
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md font-black text-slate-500 dark:text-slate-400 tracking-wider">
                                    {isDark ? "DARK" : "LIGHT"}
                                </span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-black text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileDropdown;
