/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    UserCheck,
    UserX,
    BarChart3,
    Download,
    RefreshCcw,
    Activity,
    Calendar
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

import StudentTable from '../../components/StudentTable';
import AttendancePieChart from '../../components/AttendancePieChart';
import SearchFilter from '../../components/SearchFilter';
import { exportToCSV } from '../../utils/csvExport';
import { simulateRealtime } from '../../utils/mockRealtime';
import { cn } from '../../lib/utils';

const StatCard = ({ title, value, icon: IconComp, color, trend }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{value}</h3>
                    {trend && (
                        <div className={cn(
                            "mt-2 text-xs font-semibold flex items-center gap-1",
                            trend > 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last session
                        </div>
                    )}
                </div>
                <div className={cn("p-3 rounded-xl", color)}>
                    <IconComp size={24} className="text-white" />
                </div>
            </div>
        </motion.div>
    );
};

const TeacherDashboard = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.get('/api/students');
            setStudents(res.data);
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setTimeout(() => setIsRefreshing(false), 600);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (students.length > 0) {
                simulateRealtime(students, setStudents, selectedDate);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [students, selectedDate]);

    const filteredStudents = students.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    const handleExport = () => {
        exportToCSV(filteredStudents, selectedDate);
    };

    // Analytics
    const totalStudents = students.length;
    const presentCount = students.filter(s => s.attendance?.some(a => a.date === selectedDate && a.status === 'Present')).length;
    const absentCount = totalStudents - presentCount;
    const avgEngagement = students.length > 0
        ? Math.round(students.reduce((acc, s) => acc + (s.engagement?.find(e => e.date === selectedDate)?.level || 0), 0) / students.length)
        : 0;

    const pieData = [
        { name: 'Present', value: presentCount },
        { name: 'Absent', value: absentCount }
    ];

    const barData = [
        { name: 'Active', students: students.filter(s => (s.engagement?.find(e => e.date === selectedDate)?.level || 0) > 70).length },
        {
            name: 'Passive', students: students.filter(s => {
                const lvl = s.engagement?.find(e => e.date === selectedDate)?.level || 0;
                return lvl >= 40 && lvl <= 70;
            }).length
        },
        { name: 'Distracted', students: students.filter(s => (s.engagement?.find(e => e.date === selectedDate)?.level || 0) < 40).length },
    ];

    return (
        <div className="space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Class Monitoring
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <Calendar size={14} /> {format(new Date(), 'EEEE, MMMM do yyyy')}
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[10px] font-bold uppercase tracking-wider ml-2 ring-1 ring-teal-500/20 animate-pulse">
                            <Activity size={10} /> Live Monitoring Active
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStudents}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400"
                    >
                        <RefreshCcw size={20} className={cn(isRefreshing && "animate-spin text-teal-500")} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
                    >
                        <Download size={18} /> Export Data
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Roster"
                    value={totalStudents}
                    iconComp={Users}
                    color="bg-blue-600"
                />
                <StatCard
                    title="Present Now"
                    value={presentCount}
                    iconComp={UserCheck}
                    color="bg-emerald-600"
                    trend={+2}
                />
                <StatCard
                    title="Absent"
                    value={absentCount}
                    iconComp={UserX}
                    color="bg-rose-600"
                    trend={-5}
                />
                <StatCard
                    title="Avg Engagement"
                    value={`${avgEngagement}%`}
                    iconComp={Activity}
                    color="bg-teal-600"
                    trend={+12}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Pie Chart Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                    <AttendancePieChart data={pieData} />
                </motion.div>

                {/* Bar Chart Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart3 size={20} className="text-teal-600" />
                            Engagement Distribution
                        </h3>
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                            Updated 10s ago
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 12 }}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar
                                    dataKey="students"
                                    fill="#0d9488"
                                    radius={[6, 6, 0, 0]}
                                    barSize={40}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* Students Table Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users size={22} className="text-teal-600" />
                        Live Feed
                    </h3>
                    <div className="w-full sm:w-72">
                        <SearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                    </div>
                </div>
                <StudentTable
                    students={filteredStudents}
                    onOverride={handleOverride}
                    selectedDate={selectedDate}
                />
            </motion.div>
        </div>
    );
};

export default TeacherDashboard;
