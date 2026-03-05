import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { School, Lock, Mail, User, Phone, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';

const Login = () => {
    const [activeTab, setActiveTab] = useState('signin');

    // Sign In State
    const [email, setEmail] = useState('teacher@example.com');
    const [password, setPassword] = useState('pass');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Sign Up State
    const [step, setStep] = useState(1);
    const [signupData, setSignupData] = useState({
        parentName: '', parentEmail: '', parentPhone: '',
        childName: '', childGrade: ''
    });

    // Forgot Password State
    const [forgotEmail, setForgotEmail] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();
    const addPendingUser = useStore(s => s.addPendingUser);
    const profileCompleted = useStore(s => s.profileCompleted);

    const handleSignIn = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast.error('Please enter email and password');

        setIsLoggingIn(true);
        const toastId = toast.loading('Authenticating...');

        setTimeout(async () => {
            const result = await login(email, password);
            setIsLoggingIn(false);
            if (result.success) {
                toast.success('Login successful!', { id: toastId });
                // Check if profile needs completion (new users)
                if (result.needsProfileCompletion || (!profileCompleted && result.role === 'parent')) {
                    navigate('/complete-profile');
                } else {
                    navigate(`/${result.role}/dashboard`);
                }
            } else {
                toast.error(result.message, { id: toastId });
            }
        }, 800);
    };

    const handleSignUpNext = (e) => {
        e.preventDefault();
        if (!signupData.parentName || !signupData.parentEmail) {
            return toast.error("Please fill in parent details");
        }
        setStep(2);
    };

    const handleSignUpSubmit = (e) => {
        e.preventDefault();
        if (!signupData.childName || !signupData.childGrade) {
            return toast.error("Please fill in child details");
        }

        const toastId = toast.loading("Submitting registration...");
        setTimeout(() => {
            const newUser = {
                id: `PU${Date.now().toString().slice(-4)}`,
                parentName: signupData.parentName,
                parentEmail: signupData.parentEmail,
                parentPhone: signupData.parentPhone,
                childName: signupData.childName,
                childGrade: signupData.childGrade,
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
            };
            addPendingUser(newUser);
            toast.success('Registration submitted! An Admin will review your request. You will receive temporary credentials once approved.', { id: toastId, duration: 5000 });
            setActiveTab('signin');
            setStep(1);
            setSignupData({ parentName: '', parentEmail: '', parentPhone: '', childName: '', childGrade: '' });
        }, 1200);
    };

    const handleForgotSubmit = (e) => {
        e.preventDefault();
        if (!forgotEmail) return toast.error("Please enter your email");

        const toastId = toast.loading("Sending reset link...");
        setTimeout(() => {
            toast.success(`Password reset link sent to ${forgotEmail}`, { id: toastId });
            setActiveTab('signin');
            setForgotEmail('');
        }, 800);
    };

    const formVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden font-sans">
            {/* Premium Wallpaper Background */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop")' }}
            />
            {/* 40% dark overlay + vignette */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-slate-900/70" />
            <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

            {/* Main Card */}
            <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 flex flex-col relative z-10">

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-teal-500/30 transform transition-transform hover:scale-105">
                        <School className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
                        SmartClass AI
                    </h1>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        The future of classroom management
                    </p>
                </div>

                {/* Tabs */}
                {activeTab !== 'forgot' && (
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 relative">
                        <button
                            onClick={() => { setActiveTab('signin'); setStep(1); }}
                            className={`flex-1 py-2 text-sm font-bold z-10 transition-colors ${activeTab === 'signin' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setActiveTab('signup')}
                            className={`flex-1 py-2 text-sm font-bold z-10 transition-colors ${activeTab === 'signup' ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Sign Up
                        </button>
                        <motion.div
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-slate-700 rounded-lg shadow-sm"
                            initial={false}
                            animate={{ left: activeTab === 'signin' ? '4px' : 'calc(50%)' }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                    </div>
                )}

                <div className="relative overflow-hidden min-h-[280px]">
                    <AnimatePresence mode="wait">
                        {/* SIGN IN FORM */}
                        {activeTab === 'signin' && (
                            <motion.form
                                key="signin"
                                variants={formVariants} initial="hidden" animate="visible" exit="exit"
                                onSubmit={handleSignIn}
                                className="space-y-4 w-full"
                            >
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative">
                                        <input
                                            type="text" required
                                            value={email} onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                                            placeholder="Enter your email"
                                        />
                                        <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                                    </div>
                                </div>
                                <div className="space-y-1 relative">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative">
                                        <input
                                            type="password" required
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                                            placeholder="••••••••"
                                        />
                                        <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button type="button" onClick={() => setActiveTab('forgot')} className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 transition-colors cursor-pointer">
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Quick login helper */}
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { label: 'Admin', email: 'admin@example.com', pass: 'pass' },
                                        { label: 'Teacher', email: 'teacher@example.com', pass: 'pass' },
                                        { label: 'Parent', email: 'parent@example.com', pass: 'pass' },
                                    ].map(q => (
                                        <button
                                            key={q.label}
                                            type="button"
                                            onClick={() => { setEmail(q.email); setPassword(q.pass); }}
                                            className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                                        >
                                            {q.label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="submit" disabled={isLoggingIn}
                                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl font-bold flex items-center justify-center transition-all disabled:opacity-70 mt-2"
                                >
                                    {isLoggingIn ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : "Sign In"}
                                </button>
                            </motion.form>
                        )}

                        {/* SIGN UP FORM (Parent) */}
                        {activeTab === 'signup' && (
                            <motion.form
                                key="signup"
                                variants={formVariants} initial="hidden" animate="visible" exit="exit"
                                onSubmit={step === 1 ? handleSignUpNext : handleSignUpSubmit}
                                className="space-y-4 w-full"
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                    <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                </div>

                                {step === 1 ? (
                                    <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Parent Name</label>
                                            <div className="relative">
                                                <input type="text" required value={signupData.parentName} onChange={(e) => setSignupData({ ...signupData, parentName: e.target.value })}
                                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-10 text-sm focus:ring-2 focus:ring-teal-500 dark:text-white outline-none" placeholder="John Doe" />
                                                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Parent Email</label>
                                            <div className="relative">
                                                <input type="email" required value={signupData.parentEmail} onChange={(e) => setSignupData({ ...signupData, parentEmail: e.target.value })}
                                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-10 text-sm focus:ring-2 focus:ring-teal-500 dark:text-white outline-none" placeholder="john@example.com" />
                                                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Phone Number</label>
                                            <div className="relative">
                                                <input type="tel" value={signupData.parentPhone} onChange={(e) => setSignupData({ ...signupData, parentPhone: e.target.value })}
                                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-10 text-sm focus:ring-2 focus:ring-teal-500 dark:text-white outline-none" placeholder="+1 (555) 000-0000" />
                                                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl font-bold flex items-center justify-center transition-all mt-4">
                                            Next Step <ArrowRight className="w-4 h-4 ml-2" />
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Child Name</label>
                                            <div className="relative">
                                                <input type="text" required value={signupData.childName} onChange={(e) => setSignupData({ ...signupData, childName: e.target.value })}
                                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-10 text-sm focus:ring-2 focus:ring-teal-500 dark:text-white outline-none" placeholder="Jane Doe" />
                                                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Child Grade</label>
                                            <div className="relative">
                                                <input type="text" required value={signupData.childGrade} onChange={(e) => setSignupData({ ...signupData, childGrade: e.target.value })}
                                                    className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-10 text-sm focus:ring-2 focus:ring-teal-500 dark:text-white outline-none" placeholder="e.g. 10th Grade" />
                                                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                            </div>
                                        </div>
                                        <div className="flex gap-3 mt-6">
                                            <button type="button" onClick={() => setStep(1)} className="h-11 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center transition-all">
                                                <ArrowLeft className="w-4 h-4" />
                                            </button>
                                            <button type="submit" className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl font-bold flex items-center justify-center transition-all">
                                                Submit Request
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.form>
                        )}

                        {/* FORGOT PASSWORD FORM */}
                        {activeTab === 'forgot' && (
                            <motion.form
                                key="forgot"
                                variants={formVariants} initial="hidden" animate="visible" exit="exit"
                                onSubmit={handleForgotSubmit}
                                className="space-y-4 w-full"
                            >
                                <button type="button" onClick={() => setActiveTab('signin')} className="flex items-center text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-4 transition-colors">
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
                                </button>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Reset Password</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Enter your email and we&apos;ll send you a link to reset your password.</p>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider ml-1">Email</label>
                                    <div className="relative">
                                        <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                                            className="w-full h-12 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 pl-11 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all dark:text-white"
                                            placeholder="Enter your email" />
                                        <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                                    </div>
                                </div>
                                <button type="submit"
                                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white rounded-xl font-bold flex items-center justify-center transition-all mt-4">
                                    Send Reset Link
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div className="absolute bottom-6 text-center w-full z-10">
                <p className="text-xs font-medium text-white/50 dark:text-slate-500">
                    &copy; 2026 SmartClass AI Inc. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default Login;
