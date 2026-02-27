// Mock Data for SmartClass AI Dashboard
const mockStudents = [
  {
    id: 'S001',
    name: 'Alice Johnson',
    face_id: 'f_alice_01',
    class: 'Math 101',
    attendance: [
      { date: '2026-02-27', status: 'Present', time: '09:00 AM' },
      { date: '2026-02-26', status: 'Present', time: '08:55 AM' },
    ],
    engagement: [
      { date: '2026-02-27', level: 85, notes: 'Highly attentive' },
      { date: '2026-02-26', level: 90, notes: 'Active participation' },
    ]
  },
  {
    id: 'S002',
    name: 'Bob Smith',
    face_id: 'f_bob_02',
    class: 'Math 101',
    attendance: [
      { date: '2026-02-27', status: 'Absent', time: '-' },
      { date: '2026-02-26', status: 'Present', time: '09:05 AM' },
    ],
    engagement: [
      { date: '2026-02-27', level: 0, notes: 'Absent' },
      { date: '2026-02-26', level: 60, notes: 'Distracted frequently' },
    ]
  },
  {
    id: 'S003',
    name: 'Charlie Davis',
    face_id: 'f_charlie_03',
    class: 'Physics 202',
    attendance: [
      { date: '2026-02-27', status: 'Present', time: '10:00 AM' },
    ],
    engagement: [
      { date: '2026-02-27', level: 75, notes: 'Good attention' },
    ]
  },
  { id: 'S004', name: 'Diana Clark', face_id: 'f_diana_04', class: 'Physics 202', attendance: [{ date: '2026-02-27', status: 'Present', time: '10:02 AM' }], engagement: [{ date: '2026-02-27', level: 95, notes: 'Excellent' }] },
  { id: 'S005', name: 'Evan Wright', face_id: 'f_evan_05', class: 'Math 101', attendance: [{ date: '2026-02-27', status: 'Present', time: '08:58 AM' }], engagement: [{ date: '2026-02-27', level: 40, notes: 'Low focus' }] },
  { id: 'S006', name: 'Fiona Lee', face_id: 'f_fiona_06', class: 'History 301', attendance: [{ date: '2026-02-27', status: 'Absent', time: '-' }], engagement: [{ date: '2026-02-27', level: 0, notes: 'Absent' }] },
  { id: 'S007', name: 'George King', face_id: 'f_george_07', class: 'Math 101', attendance: [{ date: '2026-02-27', status: 'Present', time: '09:01 AM' }], engagement: [{ date: '2026-02-27', level: 88, notes: 'Engaged' }] },
  { id: 'S008', name: 'Hannah Scott', face_id: 'f_hannah_08', class: 'History 301', attendance: [{ date: '2026-02-27', status: 'Present', time: '11:00 AM' }], engagement: [{ date: '2026-02-27', level: 72, notes: 'Average attention' }] },
  { id: 'S009', name: 'Ian White', face_id: 'f_ian_09', class: 'Physics 202', attendance: [{ date: '2026-02-27', status: 'Present', time: '09:55 AM' }], engagement: [{ date: '2026-02-27', level: 50, notes: 'Dozing off' }] },
  { id: 'S010', name: 'Julia Adams', face_id: 'f_julia_10', class: 'History 301', attendance: [{ date: '2026-02-27', status: 'Present', time: '10:58 AM' }], engagement: [{ date: '2026-02-27', level: 92, notes: 'Very attentive' }] }
];

const mockUsers = [
  { email: 'teacher@example.com', password: 'pass', role: 'teacher', name: 'Mr. Teacher' },
  { email: 'parent@example.com', password: 'pass', role: 'parent', name: 'Mrs. Parent', childId: 'S001' },
  { email: 'admin@example.com', password: 'pass', role: 'admin', name: 'Admin User' }
];

module.exports = {
  mockStudents,
  mockUsers
};
