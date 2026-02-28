import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Box, Typography, Grid, Paper, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel } from '@mui/material';
import StudentTable from '../../components/StudentTable';

const AdminDashboard = () => {
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [selectedClass, setSelectedClass] = useState('All');
    const [cvEnabled, setCvEnabled] = useState(true);
    const [engagementEnabled, setEngagementEnabled] = useState(true);
    const [selectedDate] = useState(format(new Date(), 'yyyy-MM-dd')); // default today

    const classes = ['All', 'Math 101', 'Physics 202', 'History 301'];

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
        // avoid calling setState directly in effect if not needed, we can just use a memo object or similar but since we rely on it for table it's fine. 
        // The previous error was a warning about cascading renders. Let's fix it by setting setting filtered students
        let filtered = students;
        if (selectedClass !== 'All') {
            filtered = students.filter(s => s.class === selectedClass);
        }
        setFilteredStudents(filtered);
    }, [selectedClass, students]);

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

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap">
                <Typography variant="h4" color="secondary">Admin Overview - {format(new Date(), 'MMMM d, yyyy')}</Typography>
                <FormControl sx={{ minWidth: 200, mt: { xs: 2, md: 0 } }}>
                    <InputLabel id="class-select-label">Filter by Class</InputLabel>
                    <Select
                        labelId="class-select-label"
                        value={selectedClass}
                        label="Filter by Class"
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        {classes.map(cls => <MenuItem key={cls} value={cls}>{cls}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h6" gutterBottom color="secondary.main">System Settings</Typography>
                        <FormControlLabel
                            control={<Switch checked={cvEnabled} onChange={(e) => setCvEnabled(e.target.checked)} color="secondary" />}
                            label="CV Face Detection"
                            sx={{ display: 'block', mb: 1 }}
                        />
                        <FormControlLabel
                            control={<Switch checked={engagementEnabled} onChange={(e) => setEngagementEnabled(e.target.checked)} color="secondary" />}
                            label="Engagement Tracking"
                            sx={{ display: 'block', mb: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary">
                            Toggle the computer vision backend processing features.
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <Typography variant="h6" gutterBottom color="secondary.main">Overview Stats</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="h3" color="primary">{students.length}</Typography>
                                <Typography variant="subtitle1">Total Users Managed</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="h3" color="secondary">{students.filter(s => s.attendance?.some(a => a.date === selectedDate && a.status === 'Present')).length}</Typography>
                                <Typography variant="subtitle1">Users Present Today</Typography>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom color="secondary.main">Global Attendance Feed</Typography>
                <StudentTable
                    students={filteredStudents}
                    onOverride={handleOverride}
                    selectedDate={selectedDate}
                />
            </Paper>
        </Box>
    );
};

export default AdminDashboard;
