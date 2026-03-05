/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    LineChart,
    Line,
    Legend
} from 'recharts';
import {
    Calendar as CalendarIcon,
    TrendingUp,
    Bell,
    Award,
    BookOpen,
    Info,
    CheckCircle2,
    HandIcon,
    FileText,
    BrainCircuit,
    Star,
    AlertCircle,
    ArrowRight,
    Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Notification from '../../components/Notification';
import { cn } from '../../lib/utils';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [reports, setReports] = useState([]);
    const [teacherData, setTeacherData] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchChildData();
        fetchReports();
        fetchTeacherData();
    }, [user]);

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

    const fetchReports = async () => {
        try {
            const res = await axios.get('/api/reports');
            setReports(res.data);
        } catch (err) {
            console.error("Failed to fetch reports", err);
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

    if (!student) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    <p className="text-slate-500 font-medium font-sans">Loading child profile...</p>
                </div>
            </div>
        );
    }

    // Radar Chart Data
    const performanceData = [
        { subject: 'Math', score: 95, fullMark: 100 },
        { subject: 'Science', score: 88, fullMark: 100 },
        { subject: 'History', score: 75, fullMark: 100 },
        { subject: 'Physics', score: 82, fullMark: 100 },
        { subject: 'Arts', score: 90, fullMark: 100 },
        { subject: 'English', score: 70, fullMark: 100 },
    ];

    // Engagement Trend (Last 7 days)
    const lineData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        return {
            date: format(d, 'MMM dd'),
            engagement: 60 + (i * 5) + (Math.random() * 10),
            performance: 70 + (i * 3) + (Math.random() * 15)
        };
    });

    const handRaisesPercentage = (student.performance?.handRaises || 0) / 20 * 100;
    const handRaisesColor = handRaisesPercentage > 75 ? "text-emerald-500" : handRaisesPercentage > 50 ? "text-blue-500" : "text-amber-500";

    return (
        <div className="space-y-8 pb-12 overflow-x-hidden pt-4">
            {/* Student Profile Premium Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 text-white shadow-2xl overflow-hidden relative"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-[100px] -mr-20 -mt-20 rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] -ml-20 -mb-20 rounded-full" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                            <div className="relative w-32 h-32 rounded-3xl bg-slate-800 p-2 border border-white/10 shadow-2xl overflow-hidden">
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                                    alt={student.name}
                                    className="w-full h-full object-cover rounded-2xl bg-slate-900"
                                />
                            </div>
                        </div>
                        <div className="text-center md:text-left space-y-2">
                            <h2 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                {student.name}
                            </h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs font-bold border border-white/10 text-teal-400 uppercase tracking-widest">
                                    <BookOpen size={14} /> Grade 10
                                </span>
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs font-bold border border-white/10 text-blue-400 uppercase tracking-widest">
                                    ID: {student.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full lg:w-auto">
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Attendance</p>
                            <p className="text-2xl font-black text-emerald-400">98%</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Avg Score</p>
                            <p className="text-2xl font-black text-blue-400">92%</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-center col-span-2 sm:col-span-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Rank</p>
                            <p className="text-2xl font-black text-amber-400">#4</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Section: Performance & Hand Raises (L: 7) */}
                <div className="lg:col-span-7 space-y-8">

                    {/* Charts Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp size={24} className="text-teal-600" />
                                Growth Analysis
                            </h3>
                            <select className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 outline-none">
                                <option>Last 30 Days</option>
                                <option>This Term</option>
                            </select>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                {/* Hand Raise Ring */}
                                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl relative">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Class Participation</h4>
                                    <div className="relative w-40 h-40">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                                            <circle
                                                cx="80" cy="80" r="70"
                                                stroke="currentColor" strokeWidth="12" fill="transparent"
                                                strokeDasharray={440}
                                                strokeDashoffset={440 - (440 * handRaisesPercentage / 100)}
                                                className={cn("transition-all duration-1000 ease-out", handRaisesColor)}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <HandIcon className={cn("mb-1", handRaisesColor)} size={28} />
                                            <span className="text-2xl font-black text-slate-900 dark:text-white">{student.performance?.handRaises}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Raises</span>
                                        </div>
                                    </div>
                                    <p className="mt-6 text-xs text-center font-medium text-slate-500">
                                        Active engagement verified by <span className="text-teal-600 font-bold">SmartClass AI</span>
                                    </p>
                                </div>

                                {/* Radar Chart */}
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={performanceData}>
                                            <PolarGrid stroke="#e2e8f0" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                                            <Radar
                                                name={student.name}
                                                dataKey="score"
                                                stroke="#0d9488"
                                                fill="#0d9488"
                                                fillOpacity={0.6}
                                            />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Detailed Performance Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BookOpen size={24} className="text-blue-600" />
                                Detailed Assessment
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase tracking-widest text-[10px]">Subject</th>
                                        <th className="px-6 py-4 text-left font-black text-slate-400 uppercase tracking-widest text-[10px]">Assessment</th>
                                        <th className="px-6 py-4 text-center font-black text-slate-400 uppercase tracking-widest text-[10px]">Score</th>
                                        <th className="px-6 py-4 text-center font-black text-slate-400 uppercase tracking-widest text-[10px]">Date</th>
                                        <th className="px-6 py-4 text-right font-black text-slate-400 uppercase tracking-widest text-[10px]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {student.performance?.quizzes.map((q, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{q.subject}</td>
                                            <td className="px-6 py-4 text-slate-500">Quiz Assessment</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-black text-teal-600">{q.score}%</span>
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-400 text-xs font-mono">{q.date}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="p-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle2 size={16} className="inline" /></span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* AI Insights Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] text-white shadow-xl relative overflow-hidden group"
                        >
                            <BrainCircuit className="absolute top-0 right-0 -mr-4 -mt-4 opacity-10 group-hover:scale-110 transition-transform duration-500" size={120} />
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2 italic">
                                AI Strengths
                            </h4>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Star size={16} className="text-amber-400 shrink-0 mt-1" />
                                    <p className="text-sm text-blue-100">Highly proficient in logical reasoning and abstract mathematics.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Star size={16} className="text-amber-400 shrink-0 mt-1" />
                                    <p className="text-sm text-blue-100">Exhibits strong concentration during independent lab sessions.</p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm relative overflow-hidden group"
                        >
                            <AlertCircle className="absolute top-0 right-0 -mr-4 -mt-4 opacity-5 text-rose-600 group-hover:scale-110 transition-transform duration-500" size={120} />
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                Focus Areas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-500/20">English Literature</span>
                                <span className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-500/20">Public Speaking</span>
                                <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-500/20">Modern History</span>
                            </div>
                            <p className="mt-6 text-sm text-slate-500 leading-relaxed">
                                Our AI recommends focusing on active verbal participation and reading comprehension this month.
                            </p>
                        </motion.div>
                    </div>
                </div>

                {/* Right Section: Schedule, Reports & Inbox (L: 5) */}
                <div className="lg:col-span-5 space-y-8">

                    {/* Schedule Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CalendarIcon size={24} className="text-blue-600" />
                                Today's Schedule
                            </h3>
                            <span className="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-500/10 px-3 py-1 rounded-full">LIVE</span>
                        </div>
                        <div className="space-y-6">
                            {teacherData?.schedule.map((slot, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className="w-1.5 h-full bg-slate-100 dark:bg-slate-800 rounded-full relative">
                                            {i === 0 && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full ring-4 ring-blue-100 dark:ring-blue-900/50" />}
                                        </div>
                                    </div>
                                    <div className="flex-1 pb-6 border-b border-slate-100 dark:border-slate-800 group-last:border-none">
                                        <p className="text-xs font-bold text-slate-400 mb-1">{slot.time}</p>
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{slot.monday}</h4>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">RM 402</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 flex items-center justify-center gap-2 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group">
                            View Full Calendar <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Reports Received */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-2">
                            <FileText size={24} className="text-rose-600" />
                            Official Inbox
                        </h3>
                        <div className="space-y-4">
                            {reports.map((report, i) => (
                                <motion.div
                                    key={report.id}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{report.subject} Report</h4>
                                            <p className="text-xs text-slate-400 mt-0.5">By {report.teacherName} • {report.date}</p>
                                        </div>
                                        <span className="p-2 bg-white dark:bg-slate-900 rounded-lg text-blue-600 shadow-sm border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform">
                                            <FileText size={16} />
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed italic">
                                        "{report.content}"
                                    </p>
                                </motion.div>
                            ))}
                            {reports.length === 0 && (
                                <div className="text-center py-10">
                                    <p className="text-sm text-slate-400 italic">No official reports received yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Deadlines */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <Clock size={24} className="text-amber-600" />
                            Next 48 Hours
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-white dark:from-amber-500/5 dark:to-transparent border-l-4 border-amber-500">
                                <span className="font-black text-amber-600 text-xs">FRI</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Algera II Group Quiz</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">09:00 AM START</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-white dark:from-blue-500/5 dark:to-transparent border-l-4 border-blue-500 opacity-60">
                                <span className="font-black text-blue-600 text-xs text-center min-w-[24px]">MON</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">Chemistry Lab Project</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">DUE BY 11:59PM</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
