import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Box, Typography, Grid, Paper, Avatar } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import Notification from '../../components/Notification';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        const fetchChildData = async () => {
            if (user?.childId) {
                try {
                    const res = await axios.get(`/api/students/${user.childId}`);
                    setStudent(res.data);
                } catch (err) {
                    console.error("Failed to fetch child data", err);
                }
            }
        };
        fetchChildData();
    }, [user]);

    if (!student) return <Typography>Loading child data...</Typography>;

    // Prepare Calendar Data
    const getTileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateStr = format(date, 'yyyy-MM-dd');
            const record = student.attendance?.find(a => a.date === dateStr);
            if (record) {
                return record.status === 'Present' ? 'calendar-present' : 'calendar-absent';
            }
        }
        return null;
    };

    // Prepare Line Chart Data (Last 7 days of mock data)
    const lineData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const record = student.engagement?.find(e => e.date === dateStr);
        return {
            date: format(d, 'MMM dd'),
            level: record ? record.level : Math.floor(Math.random() * 40) + 40 // mock fallback data
        };
    });

    // Mock Notifications
    const notifications = [
        { id: 1, date: format(new Date(), 'yyyy-MM-dd'), message: `New attendance record for ${student.name}.`, severity: 'info' },
        { id: 2, date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), message: `Low engagement alert: ${student.name} seemed distracted during Math 101.`, severity: 'warning' }
    ];

    return (
        <Box>
            <Box display="flex" alignItems="center" mb={4} sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                <Avatar src={`https://i.pravatar.cc/150?u=${student.id}`} sx={{ width: 64, height: 64, mr: 2 }} />
                <Box>
                    <Typography variant="h5" fontWeight="bold">{student.name}</Typography>
                    <Typography variant="subtitle1">Class: {student.class} | ID: {student.id}</Typography>
                </Box>
            </Box>

            <Grid container spacing={4} mb={4}>
                <Grid item xs={12} md={5}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom color="primary.main">Attendance History</Typography>
                        <Box sx={{ '.calendar-present': { bgcolor: '#4caf50', color: 'white' }, '.calendar-absent': { bgcolor: '#f44336', color: 'white' }, '.react-calendar': { width: '100%', border: 'none', fontFamily: 'inherit' } }}>
                            <Calendar
                                onChange={setSelectedDate}
                                value={selectedDate}
                                tileClassName={getTileClassName}
                            />
                        </Box>
                        <Box mt={2} display="flex" justifyContent="space-around">
                            <Typography variant="body2"><Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: '#4caf50', borderRadius: '50%', mr: 1 }} />Present</Typography>
                            <Typography variant="body2"><Box component="span" sx={{ display: 'inline-block', width: 12, height: 12, bgcolor: '#f44336', borderRadius: '50%', mr: 1 }} />Absent</Typography>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={7}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom color="primary.main">Weekly Engagement Trends</Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={lineData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="level" stroke="#1565C0" strokeWidth={3} activeDot={{ r: 8 }} name="Attention Level (%)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="primary.main">Recent Notifications</Typography>
                {notifications.map(n => (
                    <Notification key={n.id} date={n.date} message={n.message} severity={n.severity} />
                ))}
            </Paper>
        </Box>
    );
};

export default ParentDashboard;
