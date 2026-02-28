/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Settings,
    Shield,
    Activity,
    Database,
    Clock,
    Filter,
    CheckCircle2,
    AlertCircle,
    Server,
    Cpu,
    Monitor
} from 'lucide-react';

import StudentTable from '../../components/StudentTable';
import { cn } from '../../lib/utils';

const AdminDashboard = () => {
    const [students, setStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('All');
    const [cvEnabled, setCvEnabled] = useState(true);
    const [engagementEnabled, setEngagementEnabled] = useState(true);
    const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [activeTab, setActiveTab] = useState('overview');

    const classes = ['All', 'Math 101', 'Physics 202', 'History 301'];

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await axios.get('/api/students');
                setStudents(res.data);
            } catch (err) {
                console.error("Failed to fetch students", err);
            }
        };
        fetchStudents();
    }, []);

    const filteredStudents = selectedClass === 'All'
        ? students
        : students.filter(s => s.class === selectedClass);

    const handleOverride = async (studentId, status) => {
        try {
            const res = await axios.post('/api/attendance/override', { studentId, date: selectedDate, status });
            if (res.data.success) {
                const updatedStudents = students.map(s =>
                    s.id === studentId ? res.data.student : s
                );
                setStudents(updatedStudents);
            }
        } catch (err) {
            console.error("Override failed", err);
        }
    };

    const presentCount = students.filter(s => s.attendance?.some(a => a.date === selectedDate && a.status === 'Present')).length;

    const tabs = [
        { id: 'overview', label: 'System Overview', icon: Monitor },
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'settings', label: 'Backend Config', icon: Settings },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Administrator Central
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
                        <Shield size={16} className="text-blue-600" /> System Status: <span className="text-emerald-500 font-bold">OPTIMAL</span>
                    </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                                        <Server size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Main Instance</p>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">SC-PROD-01</h4>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Uptime</span>
                                    <span className="font-mono text-emerald-500 font-bold">99.99%</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[99.99%]"></div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl text-teal-600 dark:text-teal-400">
                                        <Cpu size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">CV Load</p>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">Active Processing</h4>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between text-sm">
                                    <span className="text-slate-500">GPU Utilization</span>
                                    <span className="font-mono text-blue-500 font-bold">42%</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-[42%]"></div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Database</p>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">PostgreSQL Cluster</h4>
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Storage Used</span>
                                    <span className="font-mono text-purple-500 font-bold">12.4 GB</span>
                                </div>
                                <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[15%]"></div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Real-time Metrics</h3>
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total Users</span>
                                            <span className="text-2xl font-black text-slate-900 dark:text-white">{students.length}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Across all 12 registered classrooms</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Active Sessions</span>
                                            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{presentCount}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Verified by facial recognition</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 dark:bg-indigo-950 p-8 rounded-3xl text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                    <Shield size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-xl font-bold mb-4">Security Overview</h3>
                                    <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                                        Encryption keys rotated 4 hours ago. No unauthorized access attempts detected in this cycle.
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold">
                                            <CheckCircle2 size={14} className="text-emerald-400" /> AES-256 Verified
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold">
                                            <CheckCircle2 size={14} className="text-emerald-400" /> RBAC Policy Safe
                                        </div>
                                    </div>
                                    <button className="mt-8 px-6 py-2 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                                        Audit Logs
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'users' && (
                    <motion.div
                        key="users"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registered Users</h3>
                                <p className="text-sm text-slate-500">Manage and override student attendance records manually.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Filter size={14} className="text-slate-400" />
                                    </div>
                                    <select
                                        value={selectedClass}
                                        onChange={(e) => setSelectedClass(e.target.value)}
                                        className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                                    >
                                        {classes.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                        <Clock size={12} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <StudentTable
                            students={filteredStudents}
                            onOverride={handleOverride}
                            selectedDate={selectedDate}
                        />
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div
                        key="settings"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8"
                    >
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Detection Engines</h3>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                                            <Monitor size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Face Recognition (CV)</p>
                                            <p className="text-xs text-slate-500">Real-time student identification</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={cvEnabled} onChange={(e) => setCvEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-600">
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">Engagement AI</p>
                                            <p className="text-xs text-slate-500">Postural and gaze analysis</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={engagementEnabled} onChange={(e) => setEngagementEnabled(e.target.checked)} />
                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-4">
                                <AlertCircle size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">API Maintenance</h4>
                            <p className="text-sm text-slate-500 max-w-xs mt-2">
                                Scheduled maintenance for the data cluster is set for Sunday at 02:00 UTC.
                            </p>
                            <button className="mt-6 px-6 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:opacity-80 transition-opacity">
                                View Schedule
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;
