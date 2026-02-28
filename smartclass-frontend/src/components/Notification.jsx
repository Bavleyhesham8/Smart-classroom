import React from 'react';
import { AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import { cn } from '../lib/utils';

const Notification = ({ date, message, severity = 'info' }) => {
    const config = {
        error: {
            icon: <AlertCircle className="text-rose-500" size={20} />,
            bg: "bg-rose-50 dark:bg-rose-500/10",
            border: "border-rose-100 dark:border-rose-500/20",
            text: "text-rose-900 dark:text-rose-200"
        },
        warning: {
            icon: <AlertTriangle className="text-amber-500" size={20} />,
            bg: "bg-amber-50 dark:bg-amber-500/10",
            border: "border-amber-100 dark:border-amber-500/20",
            text: "text-amber-900 dark:text-amber-200"
        },
        info: {
            icon: <Info className="text-blue-500" size={20} />,
            bg: "bg-blue-50 dark:bg-blue-500/10",
            border: "border-blue-100 dark:border-blue-500/20",
            text: "text-blue-900 dark:text-blue-200"
        }
    }[severity] || {
        icon: <Bell className="text-slate-500" size={20} />,
        bg: "bg-slate-50 dark:bg-slate-800/50",
        border: "border-slate-100 dark:border-slate-800",
        text: "text-slate-900 dark:text-slate-200"
    };

    return (
        <div className={cn(
            "flex items-start gap-4 p-4 rounded-xl border mb-4 transition-all hover:shadow-md",
            config.bg,
            config.border
        )}>
            <div className="flex-shrink-0 mt-0.5">
                {config.icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {date}
                    </span>
                </div>
                <p className={cn("text-sm leading-relaxed", config.text)}>
                    {message}
                </p>
            </div>
        </div>
    );
};

export default Notification;
