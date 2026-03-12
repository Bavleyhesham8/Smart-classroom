/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Users,
    UserCheck,
    UserX,
    BarChart3,
    Download,
    RefreshCcw,
    Activity,
    Calendar,
    LayoutGrid,
    List,
    Search,
    ChevronDown,
    ChevronUp,
    FileText,
    Send,
    BookOpen,
    Clock,
    CheckCircle2,
    XCircle,
    ShieldAlert
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    Legend,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis
} from 'recharts';

import { useAuth } from '../../context/AuthContext';
import StudentTable from '../../components/StudentTable';
import AttendancePieChart from '../../components/AttendancePieChart';
import SearchFilter from '../../components/SearchFilter';
import { exportToCSV } from '../../utils/csvExport';
import { simulateRealtime } from '../../utils/mockRealtime';
import { cn } from '../../lib/utils';

// --- Sub-components ---

const StatCard = ({ title, value, icon: IconComp, color, trend }) => (
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

const StudentCard = ({ student, selectedDate, onOverride, onReport }) => {
    const todayRecord = student.attendance?.find(a => a.date === selectedDate) || { status: 'Absent', time: '-' };
    const isPresent = todayRecord.status === 'Present';
    const engagement = student.engagement?.find(e => e.date === selectedDate)?.level || 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-teal-500/50 transition-all"
        >
            <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                    <img
                        src={student.images?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                    <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
                        isPresent ? "bg-emerald-500" : "bg-rose-500"
                    )} />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate">{student.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">ID: {student.id}</p>
                </div>
            </div>

            <div className="space-y-3 mb-5">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Engagement</span>
                    <span className="font-bold text-teal-600">{engagement}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${engagement}%` }}
                        className={cn(
                            "h-full rounded-full",
                            engagement > 70 ? "bg-emerald-500" : engagement > 40 ? "bg-amber-500" : "bg-rose-500"
                        )}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
                <button
                    onClick={() => onOverride(student.id, isPresent ? 'Absent' : 'Present')}
                    className={cn(
                        "flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all",
                        isPresent
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                    )}
                >
                    {isPresent ? <UserX size={14} /> : <UserCheck size={14} />}
                    {isPresent ? 'Absent' : 'Present'}
                </button>
                <button
                    onClick={() => onReport(student)}
                    className="flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                    <FileText size={14} /> Report
                </button>
            </div>
        </motion.div>
    );
};

const TeacherDashboard = () => {
    const { user, addReport } = useAuth();
    const [students, setStudents] = useState([]);
    const [teacherData, setTeacherData] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
    const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [selectedStudentForReport, setSelectedStudentForReport] = useState(null);
    const [reportContent, setReportContent] = useState('');
    const [expandedLesson, setExpandedLesson] = useState(0);
    const [activeStrangerAlerts, setActiveStrangerAlerts] = useState([]);

    useEffect(() => {
        // WebSocket for Real-time alerts
        const ws = new WebSocket(`ws://${window.location.host}/ws/events`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'stranger_alert') {
                setActiveStrangerAlerts(prev => [...prev, data.payload]);
                toast.error("SECURITY ALERT: Unknown person detected!", { duration: 6000 });
            }
        };

        return () => ws.close();
    }, []);

    useEffect(() => {
        fetchStudents();
        fetchTeacherData();
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

    const fetchTeacherData = async () => {
        try {
            const res = await axios.get('/api/teacher/data');
            setTeacherData(res.data);
        } catch (err) {
            console.error("Failed to fetch teacher data", err);
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

    const handleOpenReport = (student) => {
        setSelectedStudentForReport(student);
        setIsReportModalOpen(true);
        setReportContent('');
    };

    const handleSendReport = () => {
        if (!reportContent.trim()) {
            toast.error("Please provide observation notes.");
            return;
        }

        const newReport = {
            id: `REP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            studentName: selectedStudentForReport.name,
            teacherName: user?.name || "Teacher",
            subject: teacherData?.subject || "Mathematics", // default value if not loaded
            date: format(new Date(), "MMM dd, yyyy"),
            content: reportContent,
            status: "Pending Approval",
            auditLog: [
                { date: new Date().toISOString(), action: "Report generated by Teacher" }
            ]
        };

        addReport(newReport);
        toast.success("Report generated and sent to Admin for validation!");
        setIsReportModalOpen(false);
        setReportContent('');
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

    const radarData = [
        { subject: 'Engagement', A: 95, fullMark: 100 },
        { subject: 'Clarity', A: 90, fullMark: 100 },
        { subject: 'Feedback Timing', A: 60, fullMark: 100 },
        { subject: 'Empathy', A: 85, fullMark: 100 },
        { subject: 'Pacing', A: 75, fullMark: 100 },
    ];

    return (
        <div className="space-y-8 pb-12 overflow-x-hidden">
            {/* Stranger Alert Banner */}
            <AnimatePresence>
                {activeStrangerAlerts.map((alert, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-rose-600 text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-2xl shadow-rose-500/30 border-2 border-rose-400/50 mb-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 p-2 rounded-xl animate-pulse">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase tracking-widest">Security Alert: Unknown Person</p>
                                <p className="text-xs font-bold opacity-90">An unidentified individual was detected in the scanning zone. Please verify if this is a known visitor.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setActiveStrangerAlerts(prev => prev.filter((_, i) => i !== idx))}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                            >
                                Dismiss
                            </button>
                            <button 
                                onClick={() => toast.success("Feedback sent to admin.")}
                                className="px-4 py-2 bg-white text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                            >
                                It's a Parent
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-center gap-5">
                    <img
                        src={user?.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Teacher'}`}
                        className="w-20 h-20 rounded-2xl border-2 border-white dark:border-slate-800 shadow-lg object-cover bg-white"
                        alt="Profile"
                    />
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold uppercase tracking-widest border border-blue-200 dark:border-blue-500/30 shadow-sm">
                                {user?.subject || 'Mathematics'}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 text-[10px] font-bold uppercase tracking-widest border border-teal-200 dark:border-teal-500/30 shadow-sm">
                                {user?.classTarget || 'Grade 10'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-3">
                            {user?.name || 'Mr. Teacher'}
                            <span className="text-sm font-bold text-slate-400 tracking-normal uppercase">ID: TCH-{new Date().getFullYear()}</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 text-sm font-medium">
                            <Calendar size={14} /> {format(new Date(), 'EEEE, MMMM do yyyy')}
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest ml-2 ring-1 ring-rose-500/20 animate-pulse shadow-sm">
                                <Activity size={10} /> Live Monitoring Active
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStudents}
                        disabled={isRefreshing}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400 shadow-sm"
                    >
                        <RefreshCcw size={20} className={cn(isRefreshing && "animate-spin text-teal-500")} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Roster" value={totalStudents} icon={Users} color="bg-blue-600" />
                <StatCard title="Present Now" value={presentCount} icon={UserCheck} color="bg-emerald-600" trend={+2} />
                <StatCard title="Absent" value={absentCount} icon={UserX} color="bg-rose-600" trend={-5} />
                <StatCard title="Avg Engagement" value={`${avgEngagement}%`} icon={Activity} color="bg-teal-600" trend={+12} />
            </div>

            {/* Middle Section: Schedule & Preparations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Schedule Card */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                >
                    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar size={22} className="text-blue-600" />
                            Weekly Schedule
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Mon</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Tue</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Wed</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Thu</th>
                                    <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Fri</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {teacherData?.schedule.map((slot, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-4 font-bold text-slate-400">{slot.time}</td>
                                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{slot.monday}</td>
                                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{slot.tuesday}</td>
                                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{slot.wednesday}</td>
                                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{slot.thursday}</td>
                                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">{slot.friday}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Preparation Section */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6"
                >
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <BookOpen size={22} className="text-teal-600" />
                        Must Prepare
                    </h3>
                    <div className="space-y-4">
                        {teacherData?.todo.map((item, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group hover:border-teal-500/30 transition-all">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    item.priority === 'High' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.task}</h4>
                                    <p className="text-xs text-slate-500 mt-1">Deadline: {item.deadline}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Upcoming Lesson Plans</h4>
                        <div className="space-y-2">
                            {teacherData?.lessonPlans.map((plan, i) => (
                                <div key={i} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                                    <button
                                        onClick={() => setExpandedLesson(expandedLesson === i ? -1 : i)}
                                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="font-bold text-slate-900 dark:text-white">{plan.session}</span>
                                        {expandedLesson === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                    <AnimatePresence>
                                        {expandedLesson === i && (
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: 'auto' }}
                                                exit={{ height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 text-sm text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                                                    <p className="flex items-center gap-2 mb-2"><Clock size={14} /> Duration: {plan.duration}</p>
                                                    <p className="flex items-start gap-2"><BookOpen size={14} className="mt-0.5" /> Goal: {plan.goal}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                    <AttendancePieChart data={pieData} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BarChart3 size={22} className="text-teal-600" />
                            Active Participation
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.4 }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="students" fill="#0d9488" radius={[8, 8, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* AI Recommendations Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-8 rounded-3xl border border-teal-100 dark:border-teal-900 shadow-2xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110 duration-1000" />
                <div className="flex items-center gap-3 mb-8 relative z-10">
                    <div className="p-3 bg-gradient-to-br from-teal-400 to-blue-500 rounded-xl shadow-lg shadow-teal-500/30">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                            AI Recommendations for Me
                        </h3>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Based on recent student engagement and feedback</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#e2e8f0" strokeOpacity={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} />
                                <Radar name="My Performance" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.3} />
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />
                            <h4 className="text-emerald-800 dark:text-emerald-400 font-black mb-3 text-sm uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={16} /> Strengths
                            </h4>
                            <ul className="space-y-3">
                                {user?.aiRecommendations?.strengths?.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium text-sm">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/50 relative overflow-hidden backdrop-blur-sm">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-2xl" />
                            <h4 className="text-amber-800 dark:text-amber-400 font-black mb-3 text-sm uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} /> Areas for Improvement
                            </h4>
                            <ul className="space-y-3">
                                {user?.aiRecommendations?.weaknesses?.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 font-medium text-sm">
                                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Students List Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
            >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Users size={24} className="text-blue-600" />
                            Student Roster
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setViewMode('table')}
                                className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm" : "text-slate-400")}
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                className={cn("p-2 rounded-lg transition-all", viewMode === 'card' ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm" : "text-slate-400")}
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="p-6">
                    {viewMode === 'table' ? (
                        <StudentTable
                            students={filteredStudents}
                            onOverride={handleOverride}
                            selectedDate={selectedDate}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredStudents.map(student => (
                                <StudentCard
                                    key={student.id}
                                    student={student}
                                    selectedDate={selectedDate}
                                    onOverride={handleOverride}
                                    onReport={handleOpenReport}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Report Modal */}
            <AnimatePresence>
                {isReportModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <FileText className="text-teal-600" />
                                    Generate Report
                                </h3>
                                <button onClick={() => setIsReportModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                    <img
                                        src={selectedStudentForReport?.images?.[0] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudentForReport?.name}`}
                                        className="w-12 h-12 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                                        alt="Student"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedStudentForReport?.name}</p>
                                        <p className="text-xs text-slate-500">{selectedStudentForReport?.class}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Observation Notes</label>
                                    <textarea
                                        value={reportContent}
                                        onChange={(e) => setReportContent(e.target.value)}
                                        placeholder="Describe the student's performance, behavior, and areas for improvement..."
                                        className="w-full h-32 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <button
                                        onClick={() => setIsReportModalOpen(false)}
                                        className="flex-1 py-3 rounded-2xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendReport}
                                        className="flex-1 py-3 rounded-2xl font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Send size={18} /> Send to Admin
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TeacherDashboard;
