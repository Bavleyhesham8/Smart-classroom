import React from 'react';
import { TextField, InputAdornment, Box } from '@mui/material';
import SearchIcon from '@mui/material/Icon/Icon';

const SearchFilter = ({ searchTerm, onSearchChange, placeholder = "Search..." }) => {
    return (
        <Box sx={{ mb: 3 }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <span className="material-icons">search</span>
                        </InputAdornment>
                    ),
                    'aria-label': 'Search Input'
                }}
            />
        </Box>
    );
};

export default SearchFilter;
