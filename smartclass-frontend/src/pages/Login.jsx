import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { School, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        const result = await login(email, password);
        if (result.success) {
            navigate(`/${result.role}/dashboard`);
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center">

                <div className="w-14 h-14 bg-teal-600 rounded-full flex items-center justify-center mb-4 shadow-md">
                    <School className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                    SmartClass AI
                </h1>

                {error && (
                    <div className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6 border border-red-200 dark:border-red-800/50">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-teal-500 transition-all"
                            placeholder="teacher@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-50 dark:focus:ring-teal-500 transition-all pl-10"
                                placeholder="••••••••"
                            />
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-900 text-white hover:bg-slate-900/90 h-11 px-8 mt-2 dark:bg-teal-600 dark:hover:bg-teal-700 dark:text-white"
                    >
                        Sign In
                    </button>

                    <div className="flex justify-between items-center pt-2">
                        <a href="#" className="text-sm text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300 font-medium">
                            Forgot password?
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
