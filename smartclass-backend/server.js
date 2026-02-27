const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { mockStudents, mockUsers } = require('./data/mockData');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'smartclass_super_secret_key';

app.use(cors());
app.use(express.json());

// Auth endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = mockUsers.find(u => u.email === email && u.password === password);

    if (user) {
        const token = jwt.sign({ email: user.email, role: user.role, name: user.name, childId: user.childId }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token, user: { name: user.name, role: user.role, email: user.email, childId: user.childId } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Middleware to verify token (basic)
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing token' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get all students (Admin/Teacher)
app.get('/api/students', authenticate, (req, res) => {
    if (req.user.role === 'parent') return res.status(403).json({ error: 'Forbidden' });
    res.json(mockStudents);
});

// Get specific student (Parent)
app.get('/api/students/:id', authenticate, (req, res) => {
    if (req.user.role === 'parent' && req.user.childId !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const student = mockStudents.find(s => s.id === req.params.id);
    res.json(student);
});

// Override attendance
app.post('/api/attendance/override', authenticate, (req, res) => {
    if (req.user.role === 'parent') return res.status(403).json({ error: 'Forbidden' });

    const { studentId, date, status } = req.body;
    const studentIndex = mockStudents.findIndex(s => s.id === studentId);

    if (studentIndex !== -1) {
        const attIndex = mockStudents[studentIndex].attendance.findIndex(a => a.date === date);
        if (attIndex !== -1) {
            mockStudents[studentIndex].attendance[attIndex].status = status;
            mockStudents[studentIndex].attendance[attIndex].time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else {
            mockStudents[studentIndex].attendance.push({ date, status, time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) });
        }
        res.json({ success: true, student: mockStudents[studentIndex] });
    } else {
        res.status(404).json({ error: 'Student not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
