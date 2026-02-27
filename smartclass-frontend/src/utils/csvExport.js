export const exportToCSV = (students, selectedDate) => {
    if (!students || students.length === 0) return;

    const headers = ['Student ID', 'Name', 'Class', 'Date', 'Status', 'Time'];

    const rows = students.map(student => {
        const record = student.attendance?.find(a => a.date === selectedDate) || { status: 'Absent', time: '-' };
        return [
            student.id,
            student.name,
            student.class,
            selectedDate,
            record.status,
            record.time
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
