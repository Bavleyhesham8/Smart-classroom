import React from 'react';
import { Card, CardContent, Typography, Box, Avatar } from '@mui/material';

const Notification = ({ date, message, severity = 'info' }) => {
    const bgcolor = severity === 'error' ? 'error.main' : severity === 'warning' ? 'warning.main' : 'info.main';
    const icon = severity === 'error' ? 'error_outline' : severity === 'warning' ? 'warning_amber' : 'info';

    return (
        <Card sx={{ mb: 2, display: 'flex', alignItems: 'center', p: 1 }}>
            <Avatar sx={{ bgcolor, mr: 2, ml: 1 }}>
                <span className="material-icons">{icon}</span>
            </Avatar>
            <CardContent sx={{ flex: 1, p: '8px !important' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {date}
                </Typography>
                <Typography variant="body1">
                    {message}
                </Typography>
            </CardContent>
        </Card>
    );
};

export default Notification;
