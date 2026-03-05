import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle2, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import useStore from '../store/useStore';

const POSE_LABELS = ['Front Face', 'Right Turn', 'Left Turn'];

const CompleteProfile = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [captures, setCaptures] = useState([]);
    const [stream, setStream] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const setFaceCaptures = useStore(s => s.setFaceCaptures);
    const setProfilePhoto = useStore(s => s.setProfilePhoto);
    const setProfileCompleted = useStore(s => s.setProfileCompleted);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cameraError, setCameraError] = useState(null); // null, 'permission', 'unsupported', 'general'

    const startCamera = async () => {
        setCameraError(null);

        // Basic check for secure context (required for camera API in modern browsers)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraError('unsupported');
            toast.error("Camera API not supported or blocked by non-secure context (Use Localhost/HTTPS)");
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            toast.success("Camera initialized!");
        } catch (err) {
            console.error("Camera error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setCameraError('permission');
            } else {
                setCameraError('general');
            }
            toast.error("Unable to access camera. Please check permissions.");
        }
    };

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = useCallback(() => {
        if (captures.length >= 3 || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const base64Data = canvas.toDataURL('image/jpeg', 0.8);
        setCaptures(prev => [...prev, base64Data]);
        toast.success(`${POSE_LABELS[captures.length]} captured!`);
    }, [captures]);

    const handleRetake = (index) => {
        setCaptures(prev => prev.filter((_, i) => i !== index));
        toast('Photo removed. Please recapture.', { icon: '🔄' });
    };

    const handleSubmit = () => {
        if (captures.length < 3) return toast.error("Please capture all 3 required angles");

        setIsSubmitting(true);
        const toastId = toast.loading("Processing face embeddings...");

        setTimeout(() => {
            // Save to Zustand (persisted to localStorage)
            setFaceCaptures(captures);
            setProfilePhoto(captures[0]); // Use front-face as profile photo
            setProfileCompleted(true);

            toast.success("Profile complete! Face data saved for CV recognition.", { id: toastId, duration: 4000 });

            // Stop camera
            if (stream) stream.getTracks().forEach(track => track.stop());

            // Route based on role
            navigate(`/${user?.role || 'parent'}/dashboard`);
        }, 1500);
    };

    // Safety check to prevent crash if user isn't loaded yet
    if (!user) {
        console.warn("CompleteProfile: User identity missing, showing loading hang protection.");
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-6" />
                <h2 className="text-white text-xl font-bold mb-2">Initialiazing Identity</h2>
                <p className="text-slate-400 text-sm max-w-xs mb-8">If this screen stays for more than 10 seconds, your session may have expired.</p>
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
                    Complete Your Security Profile
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-lg mb-8">
                    SmartClass AI uses spatial recognition for seamless attendance. Please capture <strong>3 clear photos</strong> of your face from slightly different angles.
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                    {/* Camera Section */}
                    <div className="flex flex-col items-center border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-950/50">
                        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                            {!stream && !cameraError && (
                                <div className="flex flex-col items-center gap-3">
                                    <RefreshCw className="w-8 h-8 text-slate-500 animate-spin" />
                                    <p className="text-slate-500 text-sm">Requesting camera access...</p>
                                </div>
                            )}

                            {cameraError && (
                                <div className="flex flex-col items-center gap-4 text-center p-6 bg-slate-900/40 inset-0 absolute backdrop-blur-sm z-10">
                                    <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center shadow-lg">
                                        <Camera className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-white font-bold">Camera Access Error</h4>
                                        <p className="text-slate-300 text-[11px] leading-relaxed max-w-[200px]">
                                            {cameraError === 'unsupported'
                                                ? "Your connection is not 'Secure' (HTTPS). Modern browsers block Camera access on non-secure sites. Please use localhost:5173."
                                                : "Camera permissions were denied. Please check your browser settings and try again."}
                                        </p>
                                    </div>
                                    <button
                                        onClick={startCamera}
                                        className="px-6 py-2 bg-white text-slate-900 rounded-full text-xs font-bold hover:bg-teal-400 transition-colors shadow-xl"
                                    >
                                        Try Camera Again
                                    </button>
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover transform -scale-x-100 ${stream ? 'opacity-100' : 'opacity-20'}`}
                            />
                            {captures.length < 3 && stream && (
                                <>
                                    <div className="absolute inset-0 border-2 border-teal-500/30 border-dashed rounded-xl pointer-events-none m-4 animate-pulse" />
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/10">
                                        Position: {POSE_LABELS[captures.length]}
                                    </div>
                                </>
                            )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />

                        <div className="mt-6 w-full flex justify-center">
                            {stream ? (
                                <button
                                    onClick={handleCapture}
                                    disabled={captures.length >= 3}
                                    className="group relative flex items-center justify-center w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="w-16 h-16 bg-teal-500 group-hover:bg-teal-600 rounded-full flex items-center justify-center text-white shadow-md transition-colors">
                                        <Camera className="w-7 h-7" />
                                    </div>
                                    {captures.length < 3 && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800">{captures.length + 1}</div>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={startCamera}
                                    className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-teal-600 text-slate-900 dark:text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all text-sm border border-slate-200 dark:border-teal-500/50"
                                >
                                    <Camera className="w-5 h-5" /> Activate High-Res Camera
                                </button>
                            )}
                        </div>
                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            Spatial Progress: {captures.length} / 3 Captures
                        </p>
                    </div>

                    {/* Captures Review Section */}
                    <div className="flex flex-col justify-between">
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review Captures</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {[0, 1, 2].map(index => {
                                    const imgData = captures[index];
                                    return (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex items-center justify-center"
                                        >
                                            {imgData ? (
                                                <>
                                                    <img src={imgData} alt={`Face ${index + 1}`} className="w-full h-full object-cover transform -scale-x-100" />
                                                    <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] px-2 py-1 rounded-md font-bold backdrop-blur-md">
                                                        {POSE_LABELS[index]}
                                                    </div>
                                                    <button
                                                        onClick={() => handleRetake(index)}
                                                        className="absolute bottom-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg shadow-md hover:bg-rose-600 transition-colors"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="text-slate-400 dark:text-slate-600 flex flex-col items-center">
                                                    <Camera className="w-6 h-6 mb-2 opacity-50" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">{POSE_LABELS[index]}</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                            <AnimatePresence>
                                {captures.length === 3 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <div className="flex items-center gap-3 text-teal-600 dark:text-teal-400 mb-4 bg-teal-50 dark:bg-teal-900/20 p-3 rounded-xl border border-teal-100 dark:border-teal-900/50">
                                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                                            <span className="text-sm font-medium">All 3 spatial points captured. Ready for AI processing.</span>
                                        </div>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isSubmitting}
                                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-70"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>Complete Verification <ArrowRight className="w-5 h-5 ml-2" /></>
                                            )}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
