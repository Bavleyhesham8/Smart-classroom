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
        label: 'Waiting to start...',
        yaw: null,
        pitch: null,
        pose_ok: false,
        face_detected: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const pollingInterval = useRef(null);

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

            toast.success("AI Enrollment Started - Look at the camera!");
            setIsPolling(true);
        } catch (err) {
            console.error(err);
            toast.error("Could not connect to AI Backend (is server.py running?)");
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
        toast.success("AI Enrollment Successful!", { duration: 4000 });
        setProfileCompleted(true);
        navigate('/full-registration');
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-6" />
                <h2 className="text-white text-xl font-bold mb-2">Initializing Identity</h2>
                <button
                    onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                    className="px-6 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors"
                >
                    Emergency Reset & Login
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 bg-slate-900/5 dark:bg-slate-900/90" />

            <div className="w-full max-w-4xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                    <ShieldCheck className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 text-center">
                    AI Face Enrollment
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-lg mb-8">
                    SmartClass AI uses spatial recognition for seamless attendance. Our AI Pose Engine will automatically detect your face and capture 3 required angles.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                    {/* Camera Section */}
                    <div className="flex flex-col items-center border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/50">
                        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-4 border-slate-800">
                            {isPolling ? (
                                <img
                                    src="http://localhost:8000/stream"
                                    alt="Live AI Stream"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-4 text-center p-6 text-white">
                                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-500 mb-2">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                    <h4 className="font-bold">AI Scanner Ready</h4>
                                    <p className="text-slate-400 text-xs max-w-[250px]">
                                        The AI will automatically capture your front, right, and left poses once you start.
                                    </p>
                                    <button
                                        onClick={startEnrollment}
                                        disabled={isSubmitting}
                                        className="mt-4 px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                                    >
                                        Start Automatic Scan
                                    </button>
                                </div>
                            )}

                            {isPolling && (
                                <>
                                    <div className={`absolute inset-0 border-4 ${enrollStatus.pose_ok ? 'border-teal-500/50' : 'border-rose-500/30'} pointer-events-none transition-colors duration-300`} />
                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        <div className="bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${enrollStatus.face_detected ? 'bg-teal-400' : 'bg-rose-500'}`} />
                                            <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                                {enrollStatus.face_detected ? 'Face Locked' : 'Searching Face'}
                                            </span>
                                        </div>
                                    </div>

                                    {enrollStatus.yaw !== undefined && (
                                        <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-white/10 space-y-2 min-w-[100px]">
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Yaw</span>
                                                <span className={`text-[11px] font-black ${Math.abs(enrollStatus.yaw) > 30 ? 'text-amber-400' : 'text-teal-400'}`}>
                                                    {enrollStatus.yaw > 0 ? '+' : ''}{enrollStatus.yaw?.toFixed(1)}°
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Pitch</span>
                                                <span className={`text-[11px] font-black ${Math.abs(enrollStatus.pitch) > 20 ? 'text-amber-400' : 'text-teal-400'}`}>
                                                    {enrollStatus.pitch > 0 ? '+' : ''}{enrollStatus.pitch?.toFixed(1)}°
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] flex flex-col items-center gap-3">
                                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                            <motion.div
                                                className={`h-full ${enrollStatus.pose_ok ? 'bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.5)]' : 'bg-slate-600'}`}
                                                initial={{ width: 0 }}
                                                animate={{ width: `${enrollStatus.progress || 0}%` }}
                                            />
                                        </div>
                                        <div className="bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-bold px-6 py-2 rounded-full border border-teal-500/20 shadow-2xl">
                                            {enrollStatus.label}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="mt-8 grid grid-cols-3 gap-4 w-full px-2">
                            {['front', 'right', 'left'].map((poseKey, i) => {
                                const isDone = enrollStatus.stage === 'done' ||
                                    (enrollStatus.stage !== 'front' && enrollStatus.stage !== 'initializing' && i === 0) ||
                                    (enrollStatus.stage === 'left' && i === 1);
                                const isCurrent = enrollStatus.stage === poseKey;

                                return (
                                    <div key={poseKey} className="flex flex-col items-center gap-2">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${isDone ? 'bg-teal-500/20 border-teal-500 text-teal-400 scale-110' :
                                                isCurrent ? 'bg-indigo-500 text-white border-white animate-pulse shadow-lg' :
                                                    'bg-slate-800 border-slate-700 text-slate-500'
                                            }`}>
                                            {isDone ? <CheckCircle2 className="w-6 h-6" /> : <span className="text-sm font-black">{i + 1}</span>}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${isDone ? 'text-teal-500' : isCurrent ? 'text-indigo-400' : 'text-slate-500'}`}>
                                            {poseKey}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex flex-col justify-center p-6 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                                AI Engine Intelligence
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-500/30">
                                    <h4 className="text-xs font-black text-indigo-500 uppercase mb-1 tracking-tighter">Automatic Pose Detection</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Our FaceEngine calculates your head coordinates in real-time. It will only capture when your yaw and pitch are within professional thresholds.
                                    </p>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:border-teal-500/30">
                                    <h4 className="text-xs font-black text-teal-500 uppercase mb-1 tracking-tighter">Biometric Security</h4>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Each photo is converted into a unique 512-dimensional vector embedding. No raw images are stored.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4">
                                <div className="bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl p-5 border border-indigo-500/20">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                                            <RefreshCw className={`w-5 h-5 text-white ${isPolling ? 'animate-spin' : ''}`} />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-black text-slate-900 dark:text-white uppercase">AI System Status</h5>
                                            <p className="text-[10px] text-slate-500">{isPolling ? 'Scanner Active & Monitoring' : 'Waiting for Initialization'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
