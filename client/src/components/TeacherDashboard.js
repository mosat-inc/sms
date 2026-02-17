import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';

const DashboardContent = styled.div`
  color: #111827;
`;

const WelcomeCard = styled.div`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  border: 1px solid rgba(59, 130, 246, 0.3);

  h1 {
    font-size: 2rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    font-size: 1.1rem;
    color: #374151;
    margin-bottom: 5px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 18px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.09);
    border-color: rgba(37, 99, 235, 0.35);
  }

  .stat-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: linear-gradient(135deg, #dbeafe, #e0f2fe);
    color: #1d4ed8;
  }

  .stat-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.1;
  }

  .stat-label {
    color: #6b7280;
    font-size: 0.9rem;
  }
`;

const Section = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 20px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: 0.5px;
`;

const ClassCard = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateX(5px);
  }

  .class-header {
    display: flex;
    justify-content: between;
    align-items: center;
    margin-bottom: 10px;
  }

  .class-name {
    font-size: 1.3rem;
    font-weight: bold;
    color: #60a5fa;
  }

  .student-count {
    font-size: 1.1rem;
    color: #a78bfa;
  }

  .class-details {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
  }

  .attendance-info {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.3);
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const ActivityItem = styled.div`
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);

  &:last-child {
    border-bottom: none;
  }

  .activity-date {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    float: right;
  }
`;

const RefreshButton = styled.button`
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(59, 130, 246, 0.3);
  margin-bottom: 20px;

  &:hover {
    background: rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    margin-right: 8px;
  }
`;

const TeacherDashboard = ({ onClassClick }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getTeacherStats();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleClassClick = (classInfo) => {
    if (onClassClick) {
      onClassClick(classInfo);
    } else {
      toast.info(`Viewing details for ${classInfo.name}`);
    }
  };

  if (loading) {
    return (
      <DashboardContent>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent>
        <ErrorMessage>
          <strong>Error:</strong> {error}
        </ErrorMessage>
        <RefreshButton onClick={fetchDashboardData}>
          <i className="fas fa-refresh"></i>
          Try Again
        </RefreshButton>
      </DashboardContent>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardContent>
        <ErrorMessage>
          No dashboard data available. Please try refreshing the page.
        </ErrorMessage>
      </DashboardContent>
    );
  }

  const {
    teacher_profile,
    subjects_teaching,
    classes_assigned,
    students,
    attendance,
    recent_activities,
    academic_year,
    summary
  } = dashboardData;

  // Create stats array from real data
  const teacherStats = [
    { 
      icon: '👨‍🎓', 
      number: summary?.total_students || 0, 
      label: 'My Students',
      clickable: true
    },
    { 
      icon: '📚', 
      number: summary?.subjects_count || 0, 
      label: 'Subjects Teaching' 
    },
    { 
      icon: '🏫', 
      number: summary?.total_classes || 0, 
      label: 'Classes Assigned',
      clickable: true
    },
    { 
      icon: '📈', 
      number: summary?.average_attendance || '0%', 
      label: 'Attendance Rate' 
    }
  ];

  return (
    <DashboardContent>
      <RefreshButton onClick={fetchDashboardData} disabled={loading}>
        <i className="fas fa-refresh"></i>
        Refresh Data
      </RefreshButton>

      <WelcomeCard>
        <h1>Welcome back, {teacher_profile?.name || user?.first_name || 'Teacher'}! 👋</h1>
        <p><strong>Role:</strong> {user?.role || 'Teacher'}</p>
        <p><strong>Department:</strong> {teacher_profile?.department || 'Not specified'}</p>
        <p><strong>Position:</strong> {teacher_profile?.position || 'Teacher'}</p>
        <p><strong>Employee ID:</strong> {teacher_profile?.employee_id || 'Not specified'}</p>
        <p><strong>Academic Year:</strong> {academic_year?.year_name || 'Not specified'}</p>
        <p><strong>Today:</strong> {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </WelcomeCard>

      <StatsGrid>
        {teacherStats.map((stat, index) => (
          <StatCard 
            key={index}
            clickable={stat.clickable}
            onClick={stat.clickable ? () => toast.info(`Viewing ${stat.label}`) : undefined}
          >
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-meta">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </StatCard>
        ))}
      </StatsGrid>
        ))}
      </StatsGrid>

      {subjects_teaching && subjects_teaching.length > 0 && (
        <Section>
          <SectionTitle>Subjects Teaching</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {subjects_teaching.map((subject, index) => (
              <div 
                key={index}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  color: '#60a5fa'
                }}
              >
                {subject}
              </div>
            ))}
          </div>
        </Section>
      )}

      {classes_assigned && classes_assigned.length > 0 && (
        <Section>
          <SectionTitle>My Classes ({classes_assigned.length})</SectionTitle>
          {classes_assigned.map((classInfo, index) => (
            <ClassCard key={index} onClick={() => handleClassClick(classInfo)}>
              <div className="class-header">
                <div className="class-name">{classInfo.name}</div>
                <div className="student-count">{classInfo.student_count} students</div>
              </div>
              <div className="class-details">
                Level: {classInfo.level} | Capacity: {classInfo.capacity} | 
                Available: {classInfo.capacity - classInfo.student_count} spots
              </div>
              {attendance?.attendance_by_class && (
                <div className="attendance-info">
                  {(() => {
                    const classAttendance = attendance.attendance_by_class.find(
                      att => att.class_id === classInfo.id
                    );
                    return classAttendance ? (
                      <>
                        <span>Present Today: {classAttendance.present_today}</span>
                        <span>Attendance: {classAttendance.attendance_rate}%</span>
                      </>
                    ) : (
                      <span>Attendance data not available</span>
                    );
                  })()}
                </div>
              )}
            </ClassCard>
          ))}
        </Section>
      )}

      {recent_activities && recent_activities.length > 0 && (
        <Section>
          <SectionTitle>Recent Activities</SectionTitle>
          {recent_activities.map((activity, index) => (
            <ActivityItem key={index}>
              <div className="activity-date">
                {new Date(activity.activity_date).toLocaleDateString()}
              </div>
              <div>{activity.description}</div>
            </ActivityItem>
          ))}
        </Section>
      )}

      {(!recent_activities || recent_activities.length === 0) && (
        <Section>
        <SectionTitle>Recent Activities</SectionTitle>
          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
            No recent activities to display.
          </div>
        </Section>
      )}

      {attendance && (
        <Section>
          <SectionTitle>Attendance Overview</SectionTitle>
          <div style={{ color: '#374151' }}>
            <p>• Total Present Today: {attendance.present_today}</p>
            <p>• Total Absent Today: {attendance.absent_today}</p>
            <p>• Average Attendance Rate: {attendance.average_attendance_rate}%</p>
            <p>• Classes Held This Month: {attendance.total_classes_held}</p>
          </div>
        </Section>
      )}
    </DashboardContent>
  );
};

export default TeacherDashboard;
