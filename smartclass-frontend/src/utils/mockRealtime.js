export const simulateRealtime = (students, setStudents, selectedDate) => {
    // Randomly update 1 student's status or engagement every interval
    const randomIndex = Math.floor(Math.random() * students.length);
    const updatedStudents = [...students];
    const student = { ...updatedStudents[randomIndex] };

    const todayAttIndex = student.attendance.findIndex(a => a.date === selectedDate);
    const todayEngIndex = student.engagement.findIndex(e => e.date === selectedDate);

    // 50% chance to update attendance, 50% chance for engagement
    if (Math.random() > 0.5) {
        if (todayAttIndex !== -1 && student.attendance[todayAttIndex].status === 'Absent') {
            student.attendance[todayAttIndex] = {
                ...student.attendance[todayAttIndex],
                status: 'Present',
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            };
        } else if (todayAttIndex === -1) {
            student.attendance.push({
                date: selectedDate,
                status: 'Present',
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            });
        }
    } else {
        const newLevel = Math.max(0, Math.min(100, Math.floor(Math.random() * 100)));
        let newNotes = 'Average attention';
        if (newLevel > 80) newNotes = 'Highly attentive';
        else if (newLevel < 40) newNotes = 'Distracted frequently';

        if (todayEngIndex !== -1) {
            student.engagement[todayEngIndex] = { ...student.engagement[todayEngIndex], level: newLevel, notes: newNotes };
        } else {
            student.engagement.push({ date: selectedDate, level: newLevel, notes: newNotes });
        }
    }

    updatedStudents[randomIndex] = student;
    setStudents(updatedStudents);
};
