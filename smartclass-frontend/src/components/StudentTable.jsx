import React from 'react';
import { cn } from '../lib/utils';
import { User, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

const StudentTable = ({ students, onOverride, selectedDate }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="px-6 py-4 font-semibold tracking-wider">Student Name</th>
                        <th className="px-6 py-4 font-semibold tracking-wider text-center">Class</th>
                        <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                        <th className="px-6 py-4 font-semibold tracking-wider text-center">Time</th>
                        {onOverride && <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {students.map((student) => {
                        const todayRecord = student.attendance?.find(a => a.date === selectedDate) || { status: 'Absent', time: '-' };
                        const isPresent = todayRecord.status === 'Present';

                        return (
                            <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                            <User size={16} />
                                        </div>
                                        <div className="font-medium text-slate-900 dark:text-white">
                                            {student.name}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-slate-600 dark:text-slate-400">
                                    {student.class}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={cn(
                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border gap-1.5",
                                        isPresent
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                            : "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                    )}>
                                        {isPresent ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                        {todayRecord.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-slate-500 dark:text-slate-400 font-mono">
                                    {todayRecord.time}
                                </td>
                                {onOverride && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => onOverride(student.id, isPresent ? 'Absent' : 'Present')}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                                isPresent
                                                    ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                                                    : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                                            )}
                                        >
                                            Mark {isPresent ? 'Absent' : 'Present'}
                                        </button>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    {students.length === 0 && (
                        <tr>
                            <td colSpan={onOverride ? 5 : 4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic">
                                No students found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default StudentTable;
