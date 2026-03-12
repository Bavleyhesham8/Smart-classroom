import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserCircle, LogOut, Moon, Sun, Settings, User, Camera, XCircle, Upload, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

const ProfileDropdown = ({ user, logout }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const theme = useStore((s) => s.theme);
    const setTheme = useStore((s) => s.setTheme);
    const profilePhoto = useStore((s) => s.profilePhoto);
    const setProfilePhoto = useStore((s) => s.setProfilePhoto);

    const isEditPhotoOpen = useStore((s) => s.isEditPhotoOpen);
    const setEditPhotoOpen = useStore((s) => s.setEditPhotoOpen);

    const isSettingsOpen = useStore((s) => s.isSettingsOpen);
    const setSettingsOpen = useStore((s) => s.setSettingsOpen);

    const isDark = theme === 'dark';

    // Camera state for the Edit Photo modal
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleTheme = () => {
        setTheme(isDark ? 'light' : 'dark', user?.email);
    };

    // ── Edit Photo Modal Logic ──
    const openCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            setStream(mediaStream);
            setCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = mediaStream;
            }, 100);
        } catch {
            toast.error("Camera access denied.");
        }
    };

    const captureFromCamera = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        setProfilePhoto(base64);
        stopCamera();
        setEditPhotoOpen(false);
        toast.success("Profile photo updated!");
    }, []);

    const stopCamera = () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        setStream(null);
        setCameraActive(false);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePhoto(reader.result);
            setEditPhotoOpen(false);
            toast.success("Profile photo updated!");
        };
        reader.readAsDataURL(file);
    };

    const closeEditPhoto = () => {
        stopCamera();
        setEditPhotoOpen(false);
    };

    const avatarSrc = profilePhoto || (user?.photo);

    return (
        <>
            <div className="relative z-50" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 focus:outline-none p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <div className="hidden sm:flex flex-col items-end mr-1">
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">
                            {user?.name || "User"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user?.role || "Role"}</span>
                    </div>
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white shadow-md border-2 border-white dark:border-slate-900 transition-transform active:scale-95">
                            <span className="font-bold text-lg">{user?.name ? user.name[0] : 'U'}</span>
                        </div>
                    )}
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform origin-top-right"
                        >
                            <div className="px-5 py-4 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                {avatarSrc ? (
                                    <img src={avatarSrc} className="w-12 h-12 rounded-full object-cover shrink-0 border border-white dark:border-slate-700" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white shrink-0 shadow-inner">
                                        <span className="font-black text-xl">{user?.name ? user.name[0] : 'U'}</span>
                                    </div>
                                )}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-black text-slate-900 dark:text-white truncate tracking-tight">{user?.name || "User"}</span>
                                    <span className="text-xs text-slate-500 truncate font-medium">{user?.email || "user@example.com"}</span>
                                </div>
                            </div>

                            <div className="p-2 space-y-1">
                                <button
                                    onClick={() => { setIsOpen(false); toast('Profile view coming soon!', { icon: '👤' }); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <User size={18} className="text-slate-400" /> View Profile
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); setEditPhotoOpen(true); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Camera size={18} className="text-slate-400" /> Edit Photo
                                </button>
                                <button
                                    onClick={() => { setIsOpen(false); setSettingsOpen(true); }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <Settings size={18} className="text-slate-400" /> Settings
                                </button>
                            </div>

                            <div className="p-2 border-t border-slate-100 dark:border-slate-800 gap-1 flex flex-col">
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                >
                                    <span className="flex items-center gap-3">
                                        {isDark ? <Moon size={18} className="text-slate-400 group-hover:text-blue-500" /> : <Sun size={18} className="text-slate-400 group-hover:text-amber-500" />} Theme
                                    </span>
                                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md font-black text-slate-500 dark:text-slate-400 tracking-wider">
                                        {isDark ? "DARK" : "LIGHT"}
                                    </span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-black text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                >
                                    <LogOut size={18} /> Logout
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Edit Photo Modal ── */}
            <AnimatePresence>
                {isEditPhotoOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Camera className="text-blue-600" size={24} /> Edit Profile Photo
                                </h3>
                                <button onClick={closeEditPhoto} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <XCircle size={28} />
                                </button>
                            </div>

                            {cameraActive ? (
                                <div className="space-y-4">
                                    <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
                                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                                        <div className="absolute inset-0 border-2 border-teal-500/30 border-dashed rounded-2xl pointer-events-none m-4" />
                                    </div>
                                    <canvas ref={canvasRef} className="hidden" />
                                    <div className="flex gap-3">
                                        <button onClick={stopCamera} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">Cancel</button>
                                        <button onClick={captureFromCamera} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                            <Camera size={16} /> Capture
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {avatarSrc && (
                                        <div className="flex justify-center mb-4">
                                            <img src={avatarSrc} className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700 shadow-lg" />
                                        </div>
                                    )}
                                    <button
                                        onClick={openCamera}
                                        className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Camera size={18} className="text-blue-500" /> Take Photo with Camera
                                    </button>
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        <Upload size={18} /> Upload from Device
                                    </button>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ── Settings Modal ── */}
            <AnimatePresence>
                {isSettingsOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <Settings className="text-blue-600" size={24} /> Settings
                                </h3>
                                <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                    <XCircle size={28} />
                                </button>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Dark Mode</p>
                                        <p className="text-xs text-slate-500">Toggle between light and dark themes</p>
                                    </div>
                                    <button
                                        onClick={toggleTheme}
                                        className={`w-12 h-7 rounded-full relative transition-colors ${isDark ? 'bg-blue-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Notifications</p>
                                        <p className="text-xs text-slate-500">Email & push notifications</p>
                                    </div>
                                    <div className="w-12 h-7 rounded-full relative bg-blue-600 cursor-default">
                                        <div className="absolute top-0.5 translate-x-5 w-6 h-6 bg-white rounded-full shadow" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">Language</p>
                                        <p className="text-xs text-slate-500">Interface language</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-lg">English</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ProfileDropdown;
