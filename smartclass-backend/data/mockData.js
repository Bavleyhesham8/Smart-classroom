// Mock Data for SmartClass AI Dashboard
const mockStudents = [
  {
    id: 'S001',
    name: 'Alice Johnson',
    face_id: 'f_alice_01',
    class: 'Math 101',
    attendance: [
      { date: '2026-03-05', status: 'Present', time: '09:00 AM' },
      { date: '2026-03-04', status: 'Present', time: '08:55 AM' },
    ],
    engagement: [
      { date: '2026-03-05', level: 85, notes: 'Highly attentive' },
      { date: '2026-03-04', level: 90, notes: 'Active participation' },
    ],
    performance: {
      quizzes: [
        { subject: 'Math', score: 95, date: '2026-03-01' },
        { subject: 'Science', score: 88, date: '2026-02-25' }
      ],
      homework: [
        { subject: 'History', score: 100, date: '2026-03-03', status: 'Submitted' },
        { subject: 'Math', score: 92, date: '2026-03-02', status: 'Submitted' }
      ],
      handRaises: 15,
      engagement_avg: 88
    },
    images: [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&h=200",
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&h=200",
      "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=200&h=200"
    ]
  },
  {
    id: 'S002',
    name: 'Bob Smith',
    face_id: 'f_bob_02',
    class: 'Math 101',
    attendance: [
      { date: '2026-03-05', status: 'Absent', time: '-' },
      { date: '2026-03-04', status: 'Present', time: '09:05 AM' },
    ],
    engagement: [
      { date: '2026-03-05', level: 0, notes: 'Absent' },
      { date: '2026-03-04', level: 60, notes: 'Distracted frequently' },
    ],
    performance: {
      quizzes: [{ subject: 'Math', score: 45, date: '2026-03-01' }],
      homework: [{ subject: 'Math', score: 55, date: '2026-03-02', status: 'Late' }],
      handRaises: 2,
      engagement_avg: 45
    },
    images: [
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&h=200",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&h=200",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&h=200"
    ]
  },
  {
    id: 'S003',
    name: 'Charlie Davis',
    face_id: 'f_charlie_03',
    class: 'Physics 202',
    attendance: [{ date: '2026-03-05', status: 'Present', time: '10:00 AM' }],
    engagement: [{ date: '2026-03-05', level: 75, notes: 'Good attention' }],
    performance: {
      quizzes: [{ subject: 'Physics', score: 82, date: '2026-03-02' }],
      homework: [{ subject: 'Physics', score: 80, date: '2026-03-04', status: 'Submitted' }],
      handRaises: 8,
      engagement_avg: 76
    },
    images: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&h=200",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&h=200",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&h=200"
    ]
  }
];

const mockUsers = [
  { email: 'teacher@example.com', password: 'pass', role: 'teacher', name: 'Mr. Teacher', subject: 'Mathematics', classTarget: 'Grade 10 - Section A' },
  { email: 'parent@example.com', password: 'pass', role: 'parent', name: 'Mrs. Parent', childId: 'S001' },
  { email: 'admin@example.com', password: 'pass', role: 'admin', name: 'Admin User' }
];

const mockTeacherData = {
  schedule: [
    { time: '08:00 AM', monday: 'Math 101', tuesday: 'Office Hours', wednesday: 'Math 101', thursday: 'Prep Time', friday: 'Math 101' },
    { time: '10:00 AM', monday: 'Algebra II', tuesday: 'Math 101', wednesday: 'Algebra II', thursday: 'Math 101', friday: 'Algebra II' },
    { time: '01:00 PM', monday: 'Calculus', tuesday: 'Calculus', wednesday: 'Calculus', thursday: 'Calculus', friday: 'Calculus' }
  ],
  todo: [
    { task: 'Prepare Calculus quiz', priority: 'High', deadline: 'Today' },
    { task: 'Grade Math 101 homework', priority: 'Medium', deadline: 'Tomorrow' },
    { task: 'Send weekly reports', priority: 'Low', deadline: 'Friday' }
  ],
  lessonPlans: [
    { session: 'Integrals', duration: '45 mins', goal: 'Cover fundamental theorem of calculus' },
    { session: 'Derivatives', duration: '45 mins', goal: 'Review chain rule and product rule' }
  ]
};

const mockReports = [
  { id: 'R001', studentName: 'Alice Johnson', teacherName: 'Mr. Teacher', subject: 'Math', date: '2026-03-01', content: 'Alice is showing great progress in Algebra.', status: 'Sent' },
  { id: 'R002', studentName: 'Bob Smith', teacherName: 'Mr. Teacher', subject: 'Math', date: '2026-03-02', content: 'Bob needs to focus on his late submissions.', status: 'Pending Approval' }
];

module.exports = {
  mockStudents,
  mockUsers,
  mockTeacherData,
  mockReports
};
