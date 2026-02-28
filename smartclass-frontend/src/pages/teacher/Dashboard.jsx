import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StudentTable from '../../components/StudentTable';
import AttendancePieChart from '../../components/AttendancePieChart';
import SearchFilter from '../../components/SearchFilter';
import { exportToCSV } from '../../utils/csvExport';
import { simulateRealtime } from '../../utils/mockRealtime';

const TeacherDashboard = () => {
    const [students, setStudents] = useState([]);
    // const [filteredStudents, setFilteredStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd')); // default today

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await axios.get('/api/students');
                setStudents(res.data);
            } catch (err) {
                console.error("Failed to fetch students", err);
            }
        };
        fetchStudents();
    }, []);

    useEffect(() => {
        // Realtime simulation every 10 seconds
        const interval = setInterval(() => {
            if (students.length > 0) {
                simulateRealtime(students, setStudents, selectedDate);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [students, selectedDate]);

    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredStudents = students.filter(item =>
        item.name.toLowerCase().includes(lowercasedFilter)
    );

    const handleOverride = async (studentId, status) => {
        try {
            const res = await axios.post('/api/attendance/override', { studentId, date: selectedDate, status });
            if (res.data.success) {
                const updatedStudents = students.map(s =>
                    s.id === studentId ? res.data.student : s
                );
                setStudents(updatedStudents);
            }
        } catch (err) {
            console.error("Override failed", err);
        }
    };

    const handleExport = () => {
        exportToCSV(filteredStudents, selectedDate);
    };

    // Prepare Chart Data
    const presentCount = students.filter(s => s.attendance?.some(a => a.date === selectedDate && a.status === 'Present')).length;
    const absentCount = students.length - presentCount;
    const pieData = [
        { name: 'Present', value: presentCount },
        { name: 'Absent', value: absentCount }
    ];

    const barData = [
        { name: 'High (>80)', students: students.filter(s => s.engagement?.some(e => e.date === selectedDate && e.level > 80)).length },
        { name: 'Medium (40-80)', students: students.filter(s => s.engagement?.some(e => e.date === selectedDate && e.level >= 40 && e.level <= 80)).length },
        { name: 'Low (<40)', students: students.filter(s => s.engagement?.some(e => e.date === selectedDate && e.level < 40)).length },
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" color="primary">Class Overview - {format(new Date(), 'MMMM d, yyyy')}</Typography>
                <Button variant="contained" color="secondary" onClick={handleExport}>
                    Export CSV
                </Button>
            </Box>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <AttendancePieChart data={pieData} />
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom align="center">Real-time Engagement Levels</Typography>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="students" fill="#1565C0" name="Number of Students" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Live Attendance Feed</Typography>
                <SearchFilter searchTerm={searchTerm} onSearchChange={setSearchTerm} placeholder="Search students by name..." />
                <StudentTable
                    students={filteredStudents}
                    onOverride={handleOverride}
                    selectedDate={selectedDate}
                />
            </Paper>
        </Box>
    );
};

export default TeacherDashboard;
