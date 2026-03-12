/**
 * SmartClass AI — Computer Vision Integration Service
 * 
 * Connects the web dashboard to the Attendance Pipeline (FastAPI backend).
 * The CV system runs on the classroom laptop with OpenCV + MediaPipe + ArcFace.
 * 
 * Configuration:
 *   Set CV_API_BASE to the IP/port of the classroom laptop running the FastAPI server.
 *   Default: http://localhost:8000
 */

const CV_API_BASE = import.meta.env.VITE_CV_API_BASE || '';

// ── Pipeline Control ──

export const startPipeline = async () => {
    const res = await fetch(`${CV_API_BASE}/api/pipeline/start`, { method: 'POST' });
    return res.json();
};

export const stopPipeline = async () => {
    const res = await fetch(`${CV_API_BASE}/api/pipeline/stop`, { method: 'POST' });
    return res.json();
};

export const getPipelineStatus = async () => {
    const res = await fetch(`${CV_API_BASE}/api/pipeline/status`);
    return res.json();
};

// ── Students ──

export const getStudents = async () => {
    const res = await fetch(`${CV_API_BASE}/api/students`);
    return res.json();
};

export const getStudent = async (id) => {
    const res = await fetch(`${CV_API_BASE}/api/students/${id}`);
    return res.json();
};

export const deleteStudent = async (id) => {
    const res = await fetch(`${CV_API_BASE}/api/students/${id}`, { method: 'DELETE' });
    return res.json();
};

// ── Enrollment ──

export const startEnrollment = async (name) => {
    const res = await fetch(`${CV_API_BASE}/api/enroll/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    return res.json();
};

export const getEnrollmentStatus = async () => {
    const res = await fetch(`${CV_API_BASE}/api/enroll/status`);
    return res.json();
};

// ── Attendance ──

export const getAttendanceToday = async () => {
    const res = await fetch(`${CV_API_BASE}/api/attendance/today`);
    return res.json();
};

export const getAttendanceByDate = async (date) => {
    const res = await fetch(`${CV_API_BASE}/api/attendance/${date}`);
    return res.json();
};

export const getAttendanceRange = async (from, to) => {
    const res = await fetch(`${CV_API_BASE}/api/attendance/range/${from}/${to}`);
    return res.json();
};

export const getStudentAttendance = async (id) => {
    const res = await fetch(`${CV_API_BASE}/api/attendance/student/${id}`);
    return res.json();
};

export const exportAttendanceCSV = async (date) => {
    const res = await fetch(`${CV_API_BASE}/api/attendance/export/${date}`);
    return res.blob();
};

// ── Strangers / Visitors ──

export const getStrangers = async (status) => {
    const url = status
        ? `${CV_API_BASE}/api/strangers?status=${status}`
        : `${CV_API_BASE}/api/strangers`;
    const res = await fetch(url);
    return res.json();
};

export const getStranger = async (id) => {
    const res = await fetch(`${CV_API_BASE}/api/strangers/${id}`);
    return res.json();
};

export const enrollStranger = async (id, name) => {
    const res = await fetch(`${CV_API_BASE}/api/strangers/${id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
    return res.json();
};

export const markStrangerSafe = async (id, notes) => {
    const res = await fetch(`${CV_API_BASE}/api/strangers/${id}/safe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
    });
    return res.json();
};

export const deleteStranger = async (id) => {
    const res = await fetch(`${CV_API_BASE}/api/strangers/${id}`, { method: 'DELETE' });
    return res.json();
};

// ── Events (Polling) ──

export const getPendingEvents = async () => {
    const res = await fetch(`${CV_API_BASE}/api/events/pending`);
    return res.json();
};

export const consumeEvents = async (ids) => {
    const res = await fetch(`${CV_API_BASE}/api/events/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    return res.json();
};

// ── WebSocket Events ──

export const connectWebSocket = (onEvent) => {
    const wsUrl = CV_API_BASE.replace(/^http/, 'ws') + '/ws/events';
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onEvent(data);
        } catch (e) {
            console.error('WebSocket parse error:', e);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected. Reconnecting in 3s...');
        setTimeout(() => connectWebSocket(onEvent), 3000);
    };

    return ws;
};

// ── Live Feed URL ──

export const getLiveStreamUrl = () => `${CV_API_BASE}/stream`;

// ── Static Files (stranger images) ──

export const getStrangerImageUrl = (filename) => `${CV_API_BASE}/static/strangers/images/${filename}`;
