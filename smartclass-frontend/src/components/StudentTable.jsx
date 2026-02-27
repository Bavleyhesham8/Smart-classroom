import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button } from '@mui/material';

const StudentTable = ({ students, onOverride, selectedDate }) => {
    return (
        <TableContainer component={Paper} elevation={3}>
            <Table aria-label="student attendance table">
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                    <TableRow>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Student Name</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Class</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Time</TableCell>
                        {onOverride && <TableCell sx={{ color: 'white', fontWeight: 'bold', textAlign: 'right' }}>Actions</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {students.map((student) => {
                        const todayRecord = student.attendance?.find(a => a.date === selectedDate) || { status: 'Absent', time: '-' };
                        return (
                            <TableRow key={student.id} hover>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.class}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={todayRecord.status}
                                        color={todayRecord.status === 'Present' ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{todayRecord.time}</TableCell>
                                {onOverride && (
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color={todayRecord.status === 'Present' ? 'error' : 'success'}
                                            onClick={() => onOverride(student.id, todayRecord.status === 'Present' ? 'Absent' : 'Present')}
                                        >
                                            Mark {todayRecord.status === 'Present' ? 'Absent' : 'Present'}
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                    {students.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No students found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default StudentTable;
