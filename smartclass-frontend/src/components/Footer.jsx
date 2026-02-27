import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const Footer = () => {
    return (
        <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: (theme) => theme.palette.grey[200] }}>
            <Container maxWidth="xl" sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    SmartClass AI &copy; {new Date().getFullYear()} — Powered by AI Computer Vision.
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Data Privacy & Ethics Note: This system collects and processes biometric data (facial recognition and gaze estimation) solely for educational purposes. Explicit consent has been obtained from all participants/guardians. Data is securely stored and frequently purged according to institutional policies.
                </Typography>
            </Container>
        </Box>
    );
};

export default Footer;
