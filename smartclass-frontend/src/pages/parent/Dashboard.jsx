/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion } from 'framer-motion';
import {
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import {
    Calendar as CalendarIcon,
    TrendingUp,
    Bell,
    Award,
    BookOpen,
    Info,
    CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Notification from '../../components/Notification';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const fetchChildData = async () => {
            if (user?.childId) {
                try {
                    const res = await axios.get(`/api/students/${user.childId}`);
                    setStudent(res.data);
                } catch (err) {
                    console.error("Failed to fetch child data", err);
                }
            }
        };
        fetchChildData();
    }, [user]);

    if (!student) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    // Prepare Line Chart Data (Last 7 days of mock data)
    const lineData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const record = student.engagement?.find(e => e.date === dateStr);
        const fallbackLevel = 60 + (d.getDate() % 30);
        return {
            date: format(d, 'MMM dd'),
            level: record ? record.level : fallbackLevel
        };
    });

    const getTileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = format(date, 'yyyy-MM-dd');
            const record = student.attendance?.find(a => a.date === dateStr);
            if (record) {
                return record.status === 'Present' ? 'tile-present' : 'tile-absent';
            }
        }
        return null;
    };

    const notifications = [
        { id: 1, date: format(new Date(), 'yyyy-MM-dd'), message: `New attendance record for ${student.name}.`, severity: 'info' },
        { id: 2, date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), message: `${student.name} achieved 95% engagement in Physics 202 yesterday!`, severity: 'info' },
        { id: 3, date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), message: `Reminder: Math 101 quiz coming up this Friday.`, severity: 'warning' }
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Student Profile Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-teal-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg overflow-hidden relative"
            >
                <div className="absolute top-0 right-0 p-12 opacity-10 scale-150">
                    <Award size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center overflow-hidden">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                            alt={student.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold">{student.name}</h2>
                        <p className="text-teal-50 opacity-90 flex items-center justify-center md:justify-start gap-2 mt-1">
                            <BookOpen size={16} /> Grade 10 | {student.class}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mt-4">
                            <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold backdrop-blur-sm border border-white/20">
                                Student ID: {student.id}
                            </span>
                            <span className="px-3 py-1 bg-emerald-400 text-emerald-900 rounded-full text-xs font-bold">
                                Academic Standing: EXCELLENT
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - History & Notifications */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Attendance History Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CalendarIcon size={20} className="text-teal-600" />
                                Attendance Log
                            </h3>
                            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <span className="text-slate-500">Present</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                    <span className="text-slate-500">Absent</span>
                                </div>
                            </div>
                        </div>

                        <div className="parent-calendar-container">
                            <Calendar
                                onChange={setSelectedDate}
                                value={selectedDate}
                                tileClassName={getTileClassName}
                                className="w-full !border-none !font-sans !bg-transparent"
                            />
                        </div>

                        <style>{`
                            .parent-calendar-container .react-calendar__tile {
                                border-radius: 12px;
                                transition: all 0.2s;
                                font-size: 0.875rem;
                                padding: 12px 0;
                            }
                            .parent-calendar-container .react-calendar__tile:hover {
                                background-color: #f1f5f9;
                            }
                            .parent-calendar-container .tile-present {
                                background-color: #ecfdf5 !important;
                                color: #059669 !important;
                                font-weight: 700;
                            }
                            .parent-calendar-container .tile-absent {
                                background-color: #fff1f2 !important;
                                color: #e11d48 !important;
                                font-weight: 700;
                            }
                            .dark .parent-calendar-container .tile-present {
                                background-color: rgba(16, 185, 129, 0.1) !important;
                                color: #34d399 !important;
                            }
                            .dark .parent-calendar-container .tile-absent {
                                background-color: rgba(244, 63, 94, 0.1) !important;
                                color: #fb7185 !important;
                            }
                            .react-calendar__navigation button:enabled:hover,
                            .react-calendar__navigation button:enabled:focus {
                                background-color: #f1f5f9;
                                border-radius: 8px;
                            }
                            .dark .react-calendar__month-view__days__day--neighboringMonth {
                                opacity: 0.3;
                            }
                            .dark .react-calendar__month-view__days__day {
                                color: #cbd5e1;
                            }
                            .dark .react-calendar__navigation button {
                                color: white;
                            }
                        `}</style>
                    </div>

                    {/* Notifications Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Bell size={20} className="text-teal-600" />
                            Recent Activities
                        </h3>
                        <div className="space-y-1">
                            {notifications.map(n => (
                                <Notification key={n.id} date={n.date} message={n.message} severity={n.severity} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Trends */}
                <div className="lg:col-span-7">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <TrendingUp size={24} className="text-teal-600" />
                                    Focus & Engagement Insights
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Daily attention level metrics analyzed by SmartClass AI.</p>
                            </div>
                            <div className="hidden sm:block">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                                    Weekly Review
                                </span>
                            </div>
                        </div>

                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={lineData}>
                                    <defs>
                                        <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        domain={[0, 100]}
                                        dx={-10}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            padding: '12px'
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="level"
                                        stroke="#0d9488"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorLevel)"
                                        name="Engagement Level"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-4 bg-teal-50 dark:bg-teal-500/10 rounded-2xl border border-teal-100 dark:border-teal-500/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-teal-500 rounded-lg text-white">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <h4 className="font-bold text-teal-900 dark:text-teal-400">Strengths</h4>
                                </div>
                                <p className="text-sm text-teal-800/70 dark:text-teal-300/70 leading-relaxed">
                                    Consistently high focus during morning sessions and interactive STEM classes.
                                </p>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-500 rounded-lg text-white">
                                        <Info size={16} />
                                    </div>
                                    <h4 className="font-bold text-blue-900 dark:text-blue-400">Recommendations</h4>
                                </div>
                                <p className="text-sm text-blue-800/70 dark:text-blue-300/70 leading-relaxed">
                                    Encourage short breaks before History 301 to improve late-afternoon engagement levels.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
