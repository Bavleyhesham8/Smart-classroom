import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const CameraModal = ({ isOpen, onClose, onCapture, title = "Capture Photo" }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [isStarting, setIsStarting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
    }, [isOpen]);

    const startCamera = async () => {
        setIsStarting(true);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            toast.error("Could not access camera. Please check permissions.");
            onClose();
        } finally {
            setIsStarting(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        // Mirror the image for the capture as well
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onCapture(dataUrl);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <Camera size={24} className="text-blue-600" />
                                {title}
                            </h3>
                            <button 
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="relative aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-inner border-4 border-slate-200 dark:border-slate-800">
                                {isStarting && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
                                        <RefreshCw size={32} className="animate-spin text-blue-500" />
                                        <p className="text-sm font-bold opacity-50 uppercase tracking-widest">Waking up lens...</p>
                                    </div>
                                )}
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    muted 
                                    className="w-full h-full object-cover transform -scale-x-100"
                                />
                                <div className="absolute inset-x-0 h-0.5 bg-blue-500/30 top-1/2 -translate-y-1/2 blur-[1px] pointer-events-none" />
                                <div className="absolute inset-y-0 w-0.5 bg-blue-500/30 left-1/2 -translate-x-1/2 blur-[1px] pointer-events-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={onClose}
                                    className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCapture}
                                    disabled={isStarting || !stream}
                                    className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/25 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    <Check size={18} />
                                    Capture & Sync
                                </button>
                            </div>
                        </div>

                        <canvas ref={canvasRef} className="hidden" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CameraModal;
