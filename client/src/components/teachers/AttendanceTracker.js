import React, { useState, useEffect } from 'react';
import { FaCheck, FaTimes, FaClock, FaFileAlt, FaCalendar, FaUser, FaSearch, FaDownload } from 'react-icons/fa';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './AttendanceTracker.css';

const AttendanceTracker = () => {
    const { classId } = useParams();
    const { api } = useAuth();
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [classInfo, setClassInfo] = useState(null);
    const [attendanceStats, setAttendanceStats] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState('');

    // Fetch class info and students
    useEffect(() => {
        fetchClassData();
    }, [classId]);

    // Fetch attendance for selected date
    useEffect(() => {
        if (selectedDate && classId) {
            fetchAttendance();
        }
    }, [selectedDate, classId]);

    const fetchClassData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/api/classes/${classId}/details`);
            const data = response.data;
            
            setClassInfo(data.class);
            setStudents(data.students);
        } catch (error) {
            console.error('Error fetching class data:', error);
            setError('Failed to load class data');
        } finally {
            setLoading(false);
        }
    };

    const fetchAttendance = async () => {
        try {
            const response = await api.get(`/api/attendance/${classId}/${selectedDate}`);
            const data = response.data;
            setAttendance(data.attendance);
            setAttendanceStats(data.stats);
        } catch (error) {
            // Initialize empty attendance for the date if none exists yet.
            const emptyAttendance = students.map(student => ({
                student_id: student.id,
                status: 'present',
                notes: ''
            }));
            setAttendance(emptyAttendance);
            setAttendanceStats({});
        }
    };

    const updateAttendanceStatus = (studentId, status) => {
        setAttendance(prev => {
            const existing = prev.find(a => a.student_id === studentId);
            if (existing) {
                return prev.map(a => 
                    a.student_id === studentId ? { ...a, status } : a
                );
            } else {
                return [...prev, { student_id: studentId, status, notes: '' }];
            }
        });
    };

    const updateAttendanceNotes = (studentId, notes) => {
        setAttendance(prev => {
            const existing = prev.find(a => a.student_id === studentId);
            if (existing) {
                return prev.map(a => 
                    a.student_id === studentId ? { ...a, notes } : a
                );
            } else {
                return [...prev, { student_id: studentId, status: 'present', notes }];
            }
        });
    };

    const saveAttendance = async () => {
        try {
            setSaving(true);
            await api.post(`/api/attendance/${classId}/${selectedDate}`, { attendance });
            
            // Refresh attendance stats
            fetchAttendance();
            setError('');
        } catch (error) {
            console.error('Error saving attendance:', error);
            setError('Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const getAttendanceStatus = (studentId) => {
        const record = attendance.find(a => a.student_id === studentId);
        return record ? record.status : 'present';
    };

    const getAttendanceNotes = (studentId) => {
        const record = attendance.find(a => a.student_id === studentId);
        return record ? record.notes : '';
    };

    const filteredStudents = students.filter(student =>
        student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll_number.toString().includes(searchTerm)
    );

    const markAllPresent = () => {
        const allPresent = students.map(student => ({
            student_id: student.id,
            status: 'present',
            notes: getAttendanceNotes(student.id)
        }));
        setAttendance(allPresent);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'present': return <FaCheck className="status-icon present" />;
            case 'absent': return <FaTimes className="status-icon absent" />;
            case 'late': return <FaClock className="status-icon late" />;
            case 'excused': return <FaFileAlt className="status-icon excused" />;
            default: return <FaCheck className="status-icon present" />;
        }
    };

    const getStatusCount = (status) => {
        return attendance.filter(a => a.status === status).length;
    };

    if (loading) {
        return (
            <div className="attendance-loading">
                <div className="spinner"></div>
                <p>Loading attendance...</p>
            </div>
        );
    }

    return (
        <div className="attendance-tracker">
            <div className="attendance-header">
                <div className="header-left">
                    <h2>
                        <FaUser className="header-icon" />
                        Attendance - {classInfo?.class_name}
                    </h2>
                    <p className="class-description">
                        {classInfo?.description} • {students.length} Students
                    </p>
                </div>
                <div className="header-right">
                    <div className="date-selector">
                        <FaCalendar className="date-icon" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target_value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <button
                        className="save-attendance-btn"
                        onClick={saveAttendance}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Attendance'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            <div className="attendance-stats">
                <div className="stat-card present">
                    <FaCheck className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-number">{getStatusCount('present')}</span>
                        <span className="stat-label">Present</span>
                    </div>
                </div>
                <div className="stat-card absent">
                    <FaTimes className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-number">{getStatusCount('absent')}</span>
                        <span className="stat-label">Absent</span>
                    </div>
                </div>
                <div className="stat-card late">
                    <FaClock className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-number">{getStatusCount('late')}</span>
                        <span className="stat-label">Late</span>
                    </div>
                </div>
                <div className="stat-card excused">
                    <FaFileAlt className="stat-icon" />
                    <div className="stat-info">
                        <span className="stat-number">{getStatusCount('excused')}</span>
                        <span className="stat-label">Excused</span>
                    </div>
                </div>
            </div>

            <div className="attendance-controls">
                <div className="search-box">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="control-buttons">
                    <button
                        className="mark-all-btn"
                        onClick={markAllPresent}
                    >
                        Mark All Present
                    </button>
                    <button className="export-btn">
                        <FaDownload /> Export
                    </button>
                </div>
            </div>

            <div className="students-attendance-list">
                {filteredStudents.map(student => {
                    const status = getAttendanceStatus(student.id);
                    const notes = getAttendanceNotes(student.id);
                    
                    return (
                        <div key={student.id} className={`student-attendance-card ${status}`}>
                            <div className="student-info">
                                <div className="student-avatar">
                                    {student.first_name[0]}{student.last_name[0]}
                                </div>
                                <div className="student-details">
                                    <h4>{student.first_name} {student.last_name}</h4>
                                    <span className="roll-number">Roll: {student.roll_number}</span>
                                </div>
                            </div>
                            
                            <div className="attendance-controls">
                                <div className="status-buttons">
                                    <button
                                        className={`status-btn present ${status === 'present' ? 'active' : ''}`}
                                        onClick={() => updateAttendanceStatus(student.id, 'present')}
                                        title="Present"
                                    >
                                        <FaCheck />
                                    </button>
                                    <button
                                        className={`status-btn absent ${status === 'absent' ? 'active' : ''}`}
                                        onClick={() => updateAttendanceStatus(student.id, 'absent')}
                                        title="Absent"
                                    >
                                        <FaTimes />
                                    </button>
                                    <button
                                        className={`status-btn late ${status === 'late' ? 'active' : ''}`}
                                        onClick={() => updateAttendanceStatus(student.id, 'late')}
                                        title="Late"
                                    >
                                        <FaClock />
                                    </button>
                                    <button
                                        className={`status-btn excused ${status === 'excused' ? 'active' : ''}`}
                                        onClick={() => updateAttendanceStatus(student.id, 'excused')}
                                        title="Excused"
                                    >
                                        <FaFileAlt />
                                    </button>
                                </div>
                                
                                <div className="notes-section">
                                    <input
                                        type="text"
                                        className="notes-input"
                                        placeholder="Add notes..."
                                        value={notes}
                                        onChange={(e) => updateAttendanceNotes(student.id, e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="status-indicator">
                                {getStatusIcon(status)}
                                <span className="status-text">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AttendanceTracker;
