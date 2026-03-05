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
    Monitor,
    Search,
    UserCircle,
    ChevronRight,
    FileText,
    Send,
    Download,
    XCircle,
    GraduationCap,
    Presentation
} from 'lucide-react';

import StudentTable from '../../components/StudentTable';
import { cn } from '../../lib/utils';
import { exportToCSV } from '../../utils/csvExport';

const AdminDashboard = () => {
    const [students, setStudents] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [reports, setReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedEntity, setSelectedEntity] = useState(null); // For detail view
    const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sRes, rRes] = await Promise.all([
                axios.get('/api/students'),
                axios.get('/api/reports')
            ]);
            setStudents(sRes.data);
            setReports(rRes.data);

            // Mocking teacher list from mockUsers for now
            const mockTeachers = [
                { id: 'T001', name: 'Mr. Teacher', email: 'teacher@example.com', subject: 'Mathematics', class: 'Grade 10-A', experience: '8 Years' },
                { id: 'T002', name: 'Ms. Sarah', email: 'sarah@example.com', subject: 'Physics', class: 'Grade 11-B', experience: '5 Years' }
            ];
            setTeachers(mockTeachers);
        } catch (err) {
            console.error("Failed to fetch admin data", err);
        }
    };

    const handleValidateReport = async (reportId) => {
        try {
            await axios.post('/api/reports/validate', { reportId });
            alert('Report validated and sent to parent!');
            setIsValidateModalOpen(false);
            setReports(reports.filter(r => r.id !== reportId));
        } catch (err) {
            console.error("Validation failed", err);
        }
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Monitor },
        { id: 'teachers', label: 'Teachers', icon: Presentation },
        { id: 'students', label: 'Students', icon: GraduationCap },
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
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{selectedEntity.experience || '88%'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-6">
                                        <h4 className="font-bold text-slate-900 dark:text-white">Recent Log Entries</h4>
                                        <Download size={18} className="text-slate-400 cursor-pointer" />
                                    </div>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Login verified via CV Engine</span>
                                                </div>
                                                <span className="text-xs text-slate-400 font-mono">10:0{i} AM</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
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
                                {reports.length} Pending
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
                                    <div className="flex gap-3 shrink-0">
                                        <button className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl hover:text-rose-600 transition-colors">
                                            <XCircle size={24} />
                                        </button>
                                        <button
                                            onClick={() => { setSelectedReport(report); setIsValidateModalOpen(true); }}
                                            className="px-6 py-3 bg-teal-600 text-white rounded-2xl font-black uppercase tracking-[.15em] text-xs hover:bg-teal-700 shadow-xl shadow-teal-500/20 flex items-center gap-2 transition-all"
                                        >
                                            <CheckCircle2 size={18} /> Validate & Send
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
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
                                        onClick={() => handleValidateReport(selectedReport.id)}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Send size={18} /> Push to Parent
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
