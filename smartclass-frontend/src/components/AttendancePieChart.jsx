import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#f43f5e']; // Emerald-500 for Present, Rose-500 for Absent

const AttendancePieChart = ({ data }) => {
    return (
        <div className="w-full h-[320px] flex flex-col items-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Today's Attendance</h3>
            <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                            itemStyle={{ color: '#fff' }}
                            cursor={{ fill: 'transparent' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            iconType="circle"
                            formatter={(value) => <span className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-1">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-4 text-center pointer-events-none">
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {Math.round((data[0]?.value / (data[0]?.value + data[1]?.value)) * 100) || 0}%
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Present</div>
                </div>
            </div>
        </div>
    );
};

export default AttendancePieChart;
