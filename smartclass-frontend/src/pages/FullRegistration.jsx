import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useStore from '../store/useStore';
import { ShieldCheck, HeartPulse, User, Lock, ArrowRight, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import axios from 'axios';

const FullRegistration = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const studentId = location.state?.studentId;

    const setProfileCompleted = useStore(s => s.setProfileCompleted);
    const setProfilePhoto = useStore(s => s.setProfilePhoto);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
        childMedicalInfo: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            return toast.error("Passwords do not match");
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Finalizing your secure profile...");

        try {
            // Mocking the backend update for password and medical info
            // In a real app, you'd call: await axios.post('/api/auth/complete-profile', { ...formData, name: user.name });

            setTimeout(() => {
                setProfileCompleted(true);

                // Update local user object with the newly enrolled childId
                if (user && studentId) {
                    const updatedUser = { ...user, childId: studentId, isNewUser: false };
                    localStorage.setItem('smartclass_user', JSON.stringify(updatedUser));
                    if (setUser) setUser(updatedUser);
                }

                toast.success("Registration complete! Welcome to SmartClass.", { id: toastId });
                navigate(`/parent/dashboard`);
            }, 1500);
        } catch (error) {
            console.error("Registration error:", error);
            toast.error("Failed to save profile details.", { id: toastId });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
            <div className="absolute inset-0 z-0 bg-slate-900/5 dark:bg-slate-900/90" />

            <div className="w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col relative z-10">
                <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform transition-transform hover:scale-105 shrink-0">
                        {profilePhoto ? (
                            <img src={profilePhoto} alt="Profile" className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                            <ShieldCheck className="w-8 h-8 text-white" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Finalize Registration
                        </h1>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Set your permanent password and emergency details.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Security Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Lock size={16} /> Account Security
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">New Password</label>
                                <input
                                    type="password" name="password" required value={formData.password} onChange={handleChange}
                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Confirm Password</label>
                                <input
                                    type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange}
                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Child Details Section */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <HeartPulse size={16} /> Child Health & Emergency
                        </h3>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 ml-1">Medical Conditions / Allergies</label>
                            <textarea
                                name="childMedicalInfo" value={formData.childMedicalInfo} onChange={handleChange}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none resize-none min-h-[80px]"
                                placeholder="e.g. Peanut allergy, Asthma (Leave blank if none)"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Emergency Contact Name</label>
                                <input
                                    type="text" name="emergencyContactName" required value={formData.emergencyContactName} onChange={handleChange}
                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                                    placeholder="e.g. Jane Doe"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">Emergency Contact Phone</label>
                                <input
                                    type="tel" name="emergencyContactPhone" required value={formData.emergencyContactPhone} onChange={handleChange}
                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Sync Indicator */}
                    <div className="pt-4 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/50 w-full justify-center mb-6">
                            <Camera size={16} />
                            <span className="text-xs font-bold">3 Spatial Captures Ready for AI Enrollment</span>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-70 shadow-xl shadow-blue-500/20"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Complete Registration & Sync <ArrowRight className="w-5 h-5 ml-2" /></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FullRegistration;
