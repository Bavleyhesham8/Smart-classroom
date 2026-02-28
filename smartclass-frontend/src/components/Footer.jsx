import React from 'react';

const Footer = () => {
    return (
        <footer className="py-8 px-4 mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    SmartClass AI &copy; {new Date().getFullYear()} — <span className="text-teal-600 dark:text-teal-400">Next-Gen Educational Analytics</span>
                </p>
                <div className="mt-4 max-w-3xl mx-auto">
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-500 uppercase tracking-widest font-semibold mb-2">
                        Privacy & Ethics Protocol
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 italic">
                        This platform processes biometric metadata (facial telemetry and gaze vectors) exclusively for academic engagement optimization.
                        In compliance with global data protection standards, all PII is encrypted, and raw biometric streams are never persisted.
                        Consent is verified per session.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
