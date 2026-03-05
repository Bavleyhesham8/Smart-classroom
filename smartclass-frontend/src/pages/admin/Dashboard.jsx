/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
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
    Monitor,
    Search,
    UserCircle,
    ChevronRight,
    FileText,
    Send,
    Download,
    XCircle,
    GraduationCap,
    Presentation,
    Info,
    Check,
    X,
    UserCircle2
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

import StudentTable from '../../components/StudentTable';
import { cn } from '../../lib/utils';
import { exportToCSV } from '../../utils/csvExport';

const AdminDashboard = () => {
    const { pendingUsers, approveUser, rejectUser, reports, approveReport, refuseReport, updateReportStatus } = useAuth();
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
    const [isInvestigateModalOpen, setIsInvestigateModalOpen] = useState(false);
    const [isRefuseModalOpen, setIsRefuseModalOpen] = useState(false);
    const [refuseReason, setRefuseReason] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sRes] = await Promise.all([
                axios.get('/api/students')
            ]);
            setStudents(sRes.data);

            const mockTeachers = [
                {
                    id: 'T001', name: 'Mr. Teacher', email: 'teacher@example.com', subject: 'Mathematics',
                    class: 'Grade 10-A', experience: '8 Years',
                    salaryStatus: { status: 'Paid', nextPayment: '2026-03-31', history: [{ month: 'Feb 2026', amount: 4500, paid: true }, { month: 'Jan 2026', amount: 4500, paid: true }] },
                    schedule: ['Math 101 (8 AM)', 'Algebra II (10 AM)', 'Calculus (1 PM)'],
                    strengths: ['Excellent engagement (4.9/5)', 'Clear explanations'],
                    weaknesses: ['Needs faster assignment feedback']
                },
                {
                    id: 'T002', name: 'Ms. Sarah', email: 'sarah@example.com', subject: 'Physics',
                    class: 'Grade 11-B', experience: '5 Years',
                    salaryStatus: { status: 'Unpaid', nextPayment: '2026-03-15', history: [{ month: 'Feb 2026', amount: 4200, paid: false }] },
                    schedule: ['Physics 101 (9 AM)', 'Lab (11 AM)'],
                    strengths: ['Practical lab orientation', 'Student rapport'],
                    weaknesses: ['Late start to classes']
                }
            ];
            setTeachers(mockTeachers);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        }
    };

    const handleApproveReport = (reportId) => {
        approveReport(reportId);
        setIsValidateModalOpen(false);
        setSelectedReport(null);
    };

    const handleRefuseReport = () => {
        if (!refuseReason.trim()) return toast.error('Please provide a reason.');
        refuseReport(selectedReport.id, refuseReason);
        setIsRefuseModalOpen(false);
        setRefuseReason('');
        setSelectedReport(null);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Monitor },
        { id: 'teachers', label: 'Teachers', icon: Presentation },
        { id: 'students', label: 'Students', icon: GraduationCap },
        { id: 'pending', label: 'Pending Users', icon: UserCircle2 },
        { id: 'reports', label: 'Reports Inbox', icon: FileText },
    ];

    // Warning System Logic
    const lowPerfStudents = students.filter(s => (s.engagement?.find(e => e.date === format(new Date(), 'yyyy-MM-dd'))?.level || 100) < 50);

    return (
        <div className="space-y-8 pb-12">
            {/* Warning Banner */}
            {lowPerfStudents.length > 0 && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-rose-500 text-white px-6 py-3 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-500/20"
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle size={20} className="animate-bounce" />
                        <p className="text-sm font-bold">
                            SYSTEM ALERT: {lowPerfStudents.length} students showing critically low engagement levels. Notifications sent to respective teachers.
                        </p>
                    </div>
                    <button className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-lg border border-white/20 hover:bg-white/30 transition-all">
                        View Details
                    </button>
                </motion.div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Administrator Central
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
                        <Shield size={16} className="text-blue-600" /> System Status: <span className="text-emerald-500 font-bold">OPTIMAL</span>
                    </p>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSelectedEntity(null); }}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-md scale-[1.02]"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-8"
                    >
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: 'Uptime', val: '99.99%', sub: 'Prod Cluster', icon: Server, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { title: 'CV Load', val: '42%', sub: 'Active Inference', icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-50' },
                                { title: 'Storage', val: '12.4 GB', sub: 'Indexed Records', icon: Database, color: 'text-purple-500', bg: 'bg-purple-50' },
                                { title: 'Network', val: '18ms', sub: 'Latency Delay', icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' }
                            ].map((item, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                    <div className={cn("absolute top-0 right-0 p-4 opacity-5 stroke-[3]", item.color)}>
                                        <item.icon size={48} />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.title}</p>
                                    <h4 className="text-2xl font-black text-slate-900 dark:text-white">{item.val}</h4>
                                    <p className="text-xs text-slate-500 mt-2 font-medium">{item.sub}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Platform Health</h3>
                                <div className="space-y-8">
                                    <div className="relative pt-1">
                                        <div className="flex mb-4 items-center justify-between">
                                            <div>
                                                <span className="text-[10px] font-black inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-100 uppercase tracking-widest">
                                                    Real-time AI Accuracy
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black inline-block text-blue-600">
                                                    98.2%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
                                            <motion.div initial={{ width: 0 }} animate={{ width: '98.2%' }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 rounded-full"></motion.div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Students</p>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white">{students.length}</p>
                                        </div>
                                        <div className="p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Teachers</p>
                                            <p className="text-3xl font-black text-slate-900 dark:text-white">{teachers.length}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-5 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                                <Shield className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10 group-hover:rotate-12 transition-transform duration-700" size={200} />
                                <div className="relative z-10 space-y-6">
                                    <h3 className="text-2xl font-black italic tracking-tight">Security & RBAC</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        All endpoints are secured via JWT and monitored by our anomaly detection agent. Last verification: <span className="text-white font-bold">2 minutes ago</span>.
                                    </p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                            <CheckCircle2 size={16} /> Data Encryption AES-256
                                        </div>
                                        <div className="flex items-center gap-3 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                                            <CheckCircle2 size={16} /> Automatic Key Rotation
                                        </div>
                                    </div>
                                    <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-100 transition-all shadow-xl shadow-white/5">
                                        Review Compliance
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {(activeTab === 'teachers' || activeTab === 'students') && !selectedEntity && (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {activeTab === 'teachers' ? 'Faculty Directory' : 'Student Body'}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium">Search and manage performance insights.</p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder={`Search ${activeTab}...`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                                    />
                                </div>
                                <button
                                    onClick={() => exportToCSV(activeTab === 'teachers' ? teachers : students, format(new Date(), 'yyyy-MM-dd'))}
                                    className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all shadow-sm shrink-0"
                                >
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/40">
                                    <tr>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">Name</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">{activeTab === 'teachers' ? 'Subject' : 'Class'}</th>
                                        <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">{activeTab === 'teachers' ? 'Experience' : 'Performance'}</th>
                                        <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {(activeTab === 'teachers' ? teachers : students)
                                        .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map((entity) => (
                                            <tr key={entity.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-blue-600">
                                                            {entity.name[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{entity.name}</p>
                                                            <p className="text-xs text-slate-400">ID: {entity.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-slate-600 dark:text-slate-400 font-medium">
                                                    {entity.subject || entity.class}
                                                </td>
                                                <td className="px-8 py-5 text-center font-black text-blue-600">
                                                    {entity.experience || '88%'}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => setSelectedEntity(entity)}
                                                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        View Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {selectedEntity && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-10 relative"
                    >
                        <button
                            onClick={() => setSelectedEntity(null)}
                            className="absolute top-10 right-10 p-2 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                            <XCircle size={32} />
                        </button>

                        <div className="flex flex-col lg:flex-row gap-12">
                            <div className="lg:w-1/3 space-y-8">
                                <div className="text-center">
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 mx-auto mb-6 flex items-center justify-center text-5xl font-black text-blue-600 shadow-xl border-4 border-white dark:border-slate-800">
                                        {selectedEntity.name[0]}
                                    </div>
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{selectedEntity.name}</h3>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">{activeTab === 'teachers' ? 'Faculty Member' : 'Enrolled Student'}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Biometric Data Source</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="space-y-2">
                                                    <div className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-white dark:border-slate-600 flex items-center justify-center">
                                                        <UserCircle size={24} className="text-slate-400" />
                                                    </div>
                                                    <p className="text-[9px] text-center font-bold text-slate-500">Face {i}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 space-y-10">
                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[.2em] mb-6">Deep Context Analysis</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="p-8 rounded-[2rem] bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                                            <p className="text-xs font-bold text-blue-600 mb-2">Subject/Core Area</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{selectedEntity.subject || selectedEntity.class}</p>
                                        </div>
                                        <div className="p-8 rounded-[2rem] bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20">
                                            <p className="text-xs font-bold text-teal-600 mb-2">Performance Index</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{selectedEntity.experience || `${selectedEntity.performance?.engagement_avg || 88}%`}</p>
                                        </div>

                                        {/* Fee / Salary Status with Progress Bar */}
                                        <div className="sm:col-span-2 p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">{activeTab === 'teachers' ? 'Salary Status' : 'Fee Status'}</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-3 h-3 rounded-full", (selectedEntity.feeStatus?.status || selectedEntity.salaryStatus?.status || 'Paid') === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500')} />
                                                        <p className="text-xl font-black text-slate-900 dark:text-white">
                                                            {selectedEntity.feeStatus?.status || selectedEntity.salaryStatus?.status || 'Paid'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {(selectedEntity.feeStatus?.status === 'Unpaid' || selectedEntity.salaryStatus?.status === 'Unpaid') && (
                                                    <button
                                                        onClick={() => toast.success('Polite reminder sent via email & SMS!')}
                                                        className="px-6 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-bold shadow-sm border border-slate-200 dark:border-slate-600 hover:border-blue-500 transition-colors flex items-center gap-2"
                                                    >
                                                        <Send size={16} className="text-blue-500" /> Send Polite Reminder
                                                    </button>
                                                )}
                                            </div>
                                            {/* Progress bar */}
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${selectedEntity.feeStatus?.progress || 100}%` }} />
                                            </div>
                                            {/* Payment History */}
                                            {(selectedEntity.feeStatus?.history || selectedEntity.salaryStatus?.history) && (
                                                <div className="space-y-2 mt-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment History</p>
                                                    {(selectedEntity.feeStatus?.history || selectedEntity.salaryStatus?.history || []).map((h, i) => (
                                                        <div key={i} className="flex items-center justify-between text-sm p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                            <span className="text-slate-600 dark:text-slate-400 font-medium">{h.date || h.month}</span>
                                                            <span className="font-bold text-slate-900 dark:text-white">${h.amount}</span>
                                                            <span className={cn("text-xs font-bold", (h.status === 'Cleared' || h.paid) ? 'text-emerald-500' : 'text-amber-500')}>
                                                                {h.status || (h.paid ? 'Paid' : 'Pending')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Parent Contact (for students) */}
                                {activeTab === 'students' && selectedEntity.parentContact && (
                                    <div className="p-8 rounded-[2rem] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 space-y-3">
                                        <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Users size={16} /> Linked Parent Details</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedEntity.parentContact.name}</p>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone</p>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedEntity.parentContact.phone}</p>
                                            </div>
                                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</p>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedEntity.parentContact.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Teacher Schedule & Strengths (for teachers) */}
                                {activeTab === 'teachers' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {selectedEntity.schedule && (
                                            <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Daily Schedule</h4>
                                                <div className="space-y-3">
                                                    {selectedEntity.schedule.map((s, i) => (
                                                        <div key={i} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {s}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-6">
                                            {selectedEntity.strengths && (
                                                <div className="p-8 rounded-[2rem] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20">
                                                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Strengths</h4>
                                                    <ul className="space-y-2">{selectedEntity.strengths.map((s, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300">• {s}</li>)}</ul>
                                                </div>
                                            )}
                                            {selectedEntity.weaknesses && (
                                                <div className="p-8 rounded-[2rem] bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                                                    <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3">Areas for Improvement</h4>
                                                    <ul className="space-y-2">{selectedEntity.weaknesses.map((w, i) => <li key={i} className="text-sm text-slate-700 dark:text-slate-300">• {w}</li>)}</ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'pending' && (
                    <motion.div
                        key="pending"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pending User Approvals</h3>
                                <p className="text-sm text-slate-500 font-medium">Review new Parent signup requests.</p>
                            </div>
                            <span className="px-4 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black uppercase tracking-widest ring-1 ring-amber-500/20">
                                {pendingUsers.length} Requests
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {pendingUsers.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-bold">No pending requests.</div>
                            ) : pendingUsers.map((u) => (
                                <div key={u.id} className="p-8 flex items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                    <div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">{u.parentName}</h4>
                                        <p className="text-sm text-slate-500 border-l-2 border-blue-500 pl-3 mt-1 italic">Child: {u.childName} ({u.childGrade})</p>
                                        <p className="text-xs text-slate-400 mt-2 font-mono">{u.parentEmail} • {u.date}</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => rejectUser(u.id)} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all">
                                            Deny
                                        </button>
                                        <button onClick={() => approveUser(u.id)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                                            <Check size={16} /> Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'reports' && (
                    <motion.div
                        key="reports"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Report Validation Center</h3>
                                <p className="text-sm text-slate-500 font-medium">Review teacher submissions before publishing to parents.</p>
                            </div>
                            <span className="px-4 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full text-xs font-black uppercase tracking-widest ring-1 ring-rose-500/20">
                                {reports.filter(r => r.status === 'Pending Approval').length} Pending
                            </span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {reports.map((report) => (
                                <div key={report.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                                    <div className="space-y-2 max-w-2xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-md">
                                                {report.subject}
                                            </span>
                                            <span className={cn("px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md",
                                                report.status === 'Approved' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' :
                                                    report.status === 'Refused' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' :
                                                        'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                            )}>
                                                {report.status}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium">{report.date}</span>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                            Observation for <span className="text-blue-600">{report.studentName}</span>
                                        </h4>
                                        <p className="text-sm text-slate-500 leading-relaxed italic">
                                            "{report.content}"
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Submitted by {report.teacherName}</p>
                                    </div>
                                    {report.status === 'Pending Approval' && (
                                        <div className="flex gap-3 shrink-0">
                                            <button
                                                onClick={() => { setSelectedReport(report); setIsInvestigateModalOpen(true); }}
                                                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-[.15em] text-xs hover:bg-slate-200 transition-all flex items-center gap-2"
                                            >
                                                <Search size={16} /> Investigate
                                            </button>
                                            <button
                                                onClick={() => { setSelectedReport(report); setIsRefuseModalOpen(true); }}
                                                className="px-5 py-3 bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl font-black uppercase tracking-[.15em] text-xs hover:bg-rose-200 transition-all flex items-center gap-2"
                                            >
                                                <X size={16} /> Refuse
                                            </button>
                                            <button
                                                onClick={() => { setSelectedReport(report); setIsValidateModalOpen(true); }}
                                                className="px-5 py-3 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[.15em] text-xs hover:bg-teal-700 shadow-xl shadow-teal-500/20 flex items-center gap-2 transition-all"
                                            >
                                                <CheckCircle2 size={16} /> Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Investigate Modal */}
            <AnimatePresence>
                {isInvestigateModalOpen && selectedReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-10 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                    <Search className="text-blue-600" size={28} />
                                    Investigation: {selectedReport.studentName}
                                </h3>
                                <button onClick={() => setIsInvestigateModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <XCircle size={32} />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="p-6 rounded-[2rem] bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20">
                                    <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <AlertCircle size={16} /> Reported Incident
                                    </h4>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium italic">
                                        "{selectedReport.content}"
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-[.2em] mb-4">Evidence & Context</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Teacher</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{selectedReport.teacherName}</p>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject / Time</p>
                                            <p className="font-bold text-slate-900 dark:text-white">{selectedReport.subject} • {selectedReport.date}</p>
                                        </div>
                                    </div>
                                    <textarea
                                        placeholder="Add administrator notes..."
                                        className="w-full h-32 mt-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none"
                                    />
                                </div>

                                {selectedReport.auditLog && (
                                    <div>
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-[.2em] mb-4">Audit Log</h4>
                                        <div className="space-y-3">
                                            {selectedReport.auditLog?.map((log, i) => (
                                                <div key={i} className="flex items-center gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                                    <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{format(new Date(log.date), 'MMM d, h:mm a')}</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{log.action}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => {
                                            updateReportStatus(selectedReport.id, 'Investigating', 'Admin requested more info');
                                            setIsInvestigateModalOpen(false);
                                        }}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-[.1em] text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-700"
                                    >
                                        Flag for Review
                                    </button>
                                    <button
                                        onClick={() => {
                                            const studentEntity = students.find(s => s.name === selectedReport.studentName);
                                            if (studentEntity) {
                                                setSelectedEntity(studentEntity);
                                                setActiveTab('students');
                                            }
                                            setIsInvestigateModalOpen(false);
                                        }}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-[.1em] text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all"
                                    >
                                        Jump to Profile
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Validation Modal */}
            <AnimatePresence>
                {isValidateModalOpen && selectedReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-10"
                        >
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
                                    <Shield className="text-blue-600" size={28} />
                                    Confirm Broadcast
                                </h3>
                                <button onClick={() => setIsValidateModalOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <XCircle size={32} />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                                        <span>Recipient</span>
                                        <span className="text-blue-600">Parent of {selectedReport.studentName}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic border-l-4 border-teal-500 pl-4">
                                        "{selectedReport.content}"
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-500/5 rounded-2xl border border-blue-100 dark:border-blue-500/10">
                                    <Info size={18} className="text-blue-600 shrink-0" />
                                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                                        This report will be immediately visible on the Parent Dashboard and a notification will be pushed.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setIsValidateModalOpen(false)}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all"
                                    >
                                        Go Back
                                    </button>
                                    <button
                                        onClick={() => handleApproveReport(selectedReport.id)}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Send size={18} /> Approve & Push to Parent
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Refuse Modal */}
            <AnimatePresence>
                {isRefuseModalOpen && selectedReport && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 flex items-center gap-2 tracking-tight">
                                    <XCircle size={28} /> Refuse Report
                                </h3>
                                <button onClick={() => { setIsRefuseModalOpen(false); setRefuseReason(''); }} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <XCircle size={32} />
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20">
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">"{selectedReport.content}"</p>
                                    <p className="text-xs text-slate-400 mt-2">By {selectedReport.teacherName} • {selectedReport.date}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Reason for Refusal *</label>
                                    <textarea
                                        value={refuseReason}
                                        onChange={(e) => setRefuseReason(e.target.value)}
                                        placeholder="Provide a reason for refusing this report..."
                                        className="w-full h-32 mt-2 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all resize-none"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => { setIsRefuseModalOpen(false); setRefuseReason(''); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-all">
                                        Cancel
                                    </button>
                                    <button onClick={handleRefuseReport} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-rose-600 text-white hover:bg-rose-700 shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 transition-all">
                                        <X size={18} /> Confirm Refuse
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

export default AdminDashboard;
