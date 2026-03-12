import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useStore from '../store/useStore';

const CompleteProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const setProfileCompleted = useStore(s => s.setProfileCompleted);

    const [enrollStatus, setEnrollStatus] = useState({
        stage: 'idle',
        progress: 0,
        label: 'System Initializing...',
        yaw: null,
        pitch: null,
        pose_ok: false,
        face_detected: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const pollingInterval = useRef(null);

    // Dynamic scanner line animation state
    const [scannerLinePos, setScannerLinePos] = useState(0);

    const startEnrollment = async () => {
        if (!user?.name) return toast.error("User identity missing");

        try {
            setIsSubmitting(true);
            const res = await fetch('http://localhost:8000/api/enroll/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: user.name })
            });

            if (!res.ok) throw new Error("Failed to start AI enrollment");

            toast.success("Biometric Scan Initiated", {
                icon: '🛡️',
                style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
            setIsPolling(true);
        } catch (err) {
            console.error(err);
            toast.error("AI Core Offline. Please check backend status.");
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!isPolling) return;

        pollingInterval.current = setInterval(async () => {
            try {
                const res = await fetch('http://localhost:8000/api/enroll/status');
                if (!res.ok) return;
                const data = await res.json();
                setEnrollStatus(data);

                if (data.stage === 'done') {
                    stopPolling();
                    handleComplete();
                } else if (data.stage === 'error') {
                    stopPolling();
                    toast.error(`Enrollment Error: ${data.detail || 'Unknown error'}`);
                    setIsSubmitting(false);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 300);

        return () => stopPolling();
    }, [isPolling]);

    const stopPolling = () => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
        setIsPolling(false);
    };

    const handleComplete = () => {
        toast.success("Face Profile Generated Successfully!", { duration: 4000 });
        setProfileCompleted(true);
        navigate('/full-registration');
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-center font-sans">
                <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
                <h2 className="text-white text-xl font-bold mb-2 tracking-tight">Accessing Neural Database...</h2>
                <div className="text-blue-400/60 text-xs font-mono uppercase tracking-[0.2em]">Synchronization Required</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-5xl bg-white/70 dark:bg-white/5 backdrop-blur-2xl rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] border border-white/50 dark:border-white/10 p-8 md:p-12 flex flex-col items-center relative z-10"
            >
                {/* Header Branding */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] rotate-3">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3 text-center">
                        AI Biometric Onboarding
                    </h1>
                    <div className="flex items-center gap-3">
                        <div className="h-[1px] w-8 bg-slate-300 dark:bg-slate-700" />
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Module 01: Face Registry</span>
                        <div className="h-[1px] w-8 bg-slate-300 dark:bg-slate-700" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 w-full items-start">
                    {/* Left Panel: Scanner View */}
                    <div className="lg:col-span-7 flex flex-col items-center">
                        <div className="relative w-full aspect-[4/3] bg-black rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] border-[6px] border-slate-900/50 group">
                            {isPolling ? (
                                <>
                                    <img
                                        src="http://localhost:8000/stream"
                                        alt="AI Vision Stream"
                                        className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
                                    />
                                    {/* Scanning Beam Animation */}
                                    <motion.div
                                        className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)] z-20 pointer-events-none"
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                    />

                                    {/* HUD Overlays */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className={`absolute inset-0 border-2 transition-all duration-500 ${enrollStatus.pose_ok ? 'border-teal-500/40' : 'border-blue-500/20'}`} />

                                        {/* Corner Brackets */}
                                        <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-white/20 rounded-tl-xl" />
                                        <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-white/20 rounded-tr-xl" />
                                        <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-white/20 rounded-bl-xl" />
                                        <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-white/20 rounded-br-xl" />
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] group-hover:bg-[#030820] transition-colors duration-500">
                                    <div className="relative mb-8">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30"
                                        >
                                            <Camera className="w-10 h-10 text-blue-400" />
                                        </motion.div>
                                        <div className="absolute -inset-4 border border-blue-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                                    </div>

                                    <h4 className="text-xl font-bold text-white mb-2">Neural Vision Ready</h4>
                                    <p className="text-slate-400 text-sm max-w-[280px] text-center mb-8 px-4 opacity-70">
                                        The AI FaceEngine will automate the capture of Front, Left, and Right spatial biometric data.
                                    </p>

                                    <button
                                        onClick={startEnrollment}
                                        disabled={isSubmitting}
                                        className="group relative px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_12px_24px_-12px_rgba(37,99,235,0.8)] disabled:opacity-50"
                                    >
                                        <span className="relative z-10 flex items-center gap-3">
                                            Initialize AI Scanner
                                            <RefreshCw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                        </span>
                                    </button>
                                </div>
                            )}

                            {isPolling && (
                                <>
                                    <div className="absolute top-6 left-6 flex flex-col gap-3">
                                        <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                                            <div className={`w-2.5 h-2.5 rounded-full ${enrollStatus.face_detected ? 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)] animate-pulse' : 'bg-rose-500'}`} />
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                                {enrollStatus.face_detected ? 'Neural Lock Active' : 'Target Acquisition...'}
                                            </span>
                                        </div>
                                    </div>

                                    {enrollStatus.yaw !== undefined && (
                                        <div className="absolute top-6 right-6 flex flex-col gap-2">
                                            <div className="bg-black/40 backdrop-blur-xl p-4 rounded-2xl border border-white/10 space-y-3 min-w-[130px]">
                                                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-2 rounded-lg">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Yaw Angle</span>
                                                    <span className={`text-[12px] font-black font-mono ${Math.abs(enrollStatus.yaw) > 30 ? 'text-amber-400' : 'text-teal-400'}`}>
                                                        {enrollStatus.yaw > 0 ? '+' : ''}{enrollStatus.yaw?.toFixed(1)}°
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center bg-white/5 border border-white/5 p-2 rounded-lg">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Pitch Angle</span>
                                                    <span className={`text-[12px] font-black font-mono ${Math.abs(enrollStatus.pitch) > 20 ? 'text-amber-400' : 'text-teal-400'}`}>
                                                        {enrollStatus.pitch > 0 ? '+' : ''}{enrollStatus.pitch?.toFixed(1)}°
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[85%] flex flex-col items-center gap-4">
                                        <div className="w-full h-2.5 bg-black/40 backdrop-blur-xl rounded-full overflow-hidden border border-white/10 p-[3px]">
                                            <motion.div
                                                className={`h-full rounded-full ${enrollStatus.pose_ok ? 'bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_15px_rgba(45,212,191,0.6)]' : 'bg-blue-500/40'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${enrollStatus.progress || 0}%` }}
                                            />
                                        </div>
                                        <div className="bg-blue-600/90 backdrop-blur-2xl text-white text-[11px] font-black uppercase tracking-[0.1em] px-8 py-2.5 rounded-full border border-blue-400/30 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                                            {enrollStatus.label}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Progression Stepper */}
                        <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-md">
                            {['front', 'right', 'left'].map((poseKey, i) => {
                                const isDone = enrollStatus.stage === 'done' ||
                                    (enrollStatus.stage !== 'front' && enrollStatus.stage !== 'initializing' && i === 0) ||
                                    (enrollStatus.stage === 'left' && i === 1);
                                const isCurrent = enrollStatus.stage === poseKey;

                                return (
                                    <div key={poseKey} className="flex flex-col items-center gap-3">
                                        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-700 border-2 ${isDone ? 'bg-teal-500/10 border-teal-500 text-teal-400' :
                                            isCurrent ? 'bg-blue-500 border-white text-white shadow-[0_0_30px_rgba(37,99,235,0.5)]' :
                                                'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400'
                                            }`}>
                                            {isDone ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-sm font-black italic">{i + 1}</span>}
                                            {isCurrent && <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute -inset-3 border border-blue-500/30 rounded-3xl -z-10" />}
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDone ? 'text-teal-500' : isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>
                                            {poseKey}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Panel: AI Capabilities */}
                    <div className="lg:col-span-5 space-y-8">
                        <div>
                            <h3 className="text-xl font-bold font-sans text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                                Neural Security Protocols
                            </h3>

                            <div className="space-y-4">
                                {[
                                    {
                                        icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
                                        title: "Adaptive Pose Detection",
                                        desc: "Real-time coordinate calculations ensure precision capture within a 512D spatial map."
                                    },
                                    {
                                        icon: <RefreshCw className="w-5 h-5 text-indigo-500" />,
                                        title: "Zero-Knowledge Biometrics",
                                        desc: "Enrolled faces are converted into encrypted vectors. No original physical images are retained."
                                    }
                                ].map((feature, idx) => (
                                    <div key={idx} className="group p-5 bg-white dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/10 hover:border-blue-500/30 transition-all duration-500 hover:translate-x-1">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 dark:border-white/5 group-hover:bg-blue-500/10 transition-colors">
                                                {feature.icon}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{feature.title}</h4>
                                                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                                    {feature.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 dark:from-blue-600/20 dark:to-indigo-600/20 rounded-[2rem] p-8 border border-blue-500/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/20 transition-all" />
                            <div className="relative flex items-center gap-6">
                                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                                    <RefreshCw className={`w-8 h-8 text-white ${isPolling ? 'animate-spin' : ''}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <h5 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">Scanner Engine</h5>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                                        {isPolling ? 'Live & Monitoring Identity' : 'Diagnostic: Awaiting Trigger'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CompleteProfile;
