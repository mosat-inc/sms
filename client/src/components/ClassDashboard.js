import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const ClassDashboardContainer = styled.div`
  font-family: 'Segoe UI', sans-serif;
  height: 100vh;
  display: flex;
  background: #f5f7fb;
`;

const Overlay = styled.div`
  display: flex;
  height: 100vh;
  width: 100%;
  background: transparent;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  color: #111827;
`;

const HeaderSection = styled.div`
  background: linear-gradient(135deg, #eef2ff, #eff6ff);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(129, 140, 248, 0.4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  
  @media (max-width: 768px) {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    text-align: center;
  }
  
  @media (max-width: 480px) {
    padding: 15px;
    border-radius: 12px;
  }

  .header-info {
    flex: 1;
  }

  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    word-wrap: break-word;
    overflow-wrap: break-word;
    
    @media (max-width: 768px) {
      font-size: 2rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1.75rem;
    }
  }

  .class-details {
    font-size: 0.98rem;
    color: #374151;
    margin: 5px 0;
  }

  .back-btn {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.25);
    color: #1d4ed8;
    padding: 12px 20px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      background: rgba(59, 130, 246, 0.15);
      transform: translateY(-2px);
    }

    i {
      font-size: 1rem;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
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
    font-weight: 500;
  }
`;

const ActionsSection = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 25px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: 0.5px;
  font-family: var(--font-display);
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const ActionCard = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'color' && prop !== 'color2'
})`
  background: #ffffff;
  border-radius: 12px;
  padding: 25px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(135deg, ${props => props.color || '#3b82f6'}, ${props => props.color2 || '#8b5cf6'});
  }

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.09);
    border-color: rgba(37, 99, 235, 0.35);
  }

  .action-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
  }

  .action-icon {
    font-size: 2.5rem;
    color: ${props => props.color || '#3b82f6'};
    opacity: 0.8;
  }

  .action-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 8px;
  }

  .action-description {
    font-size: 0.95rem;
    color: #374151;
    line-height: 1.4;
    margin-bottom: 15px;
  }

  .action-stats {
    display: flex;
    justify-content: space-between;
    padding-top: 15px;
    border-top: 1px solid rgba(15, 23, 42, 0.04);
    
    .stat-item {
      text-align: center;
      
      .number {
        font-weight: bold;
        color: #2563eb;
        font-size: 1.1rem;
      }
      
      .label {
        font-size: 0.8rem;
        color: #6b7280;
        margin-top: 2px;
      }
    }
  }
`;

const RecentActivitySection = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);
`;

const ActivityList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: center;
  padding: 15px;
  background: #ffffff;
  border-radius: 8px;
  margin-bottom: 10px;
  border: 1px solid rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
  }

  .activity-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    margin-right: 15px;
    font-size: 1.1rem;
  }

  .activity-content {
    flex: 1;
    
    .activity-text {
      color: #111827;
      margin-bottom: 3px;
    }
    
    .activity-time {
      font-size: 0.8rem;
      color: #6b7280;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(59, 130, 246, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ClassDashboard = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    presentToday: 0,
    pendingAssignments: 0,
    avgGrade: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchClassData();
    fetchClassStats();
    fetchRecentActivity();
  }, [classId]);

  const fetchClassData = async () => {
    try {
      const response = await api.get(`/api/classes/${classId}`);
      if (response.data?.success) {
        setClassData(response.data.data);
      } else {
        toast.error(response.data?.message || 'Failed to fetch class data');
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      toast.error('Error loading class data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassStats = async () => {
    try {
      const response = await api.get(`/api/classes/${classId}/stats`);
      if (response.data?.success) setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching class stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get(`/api/classes/${classId}/recent-activity`);
      if (response.data?.success) setRecentActivity(response.data.data || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleActionClick = (action) => {
    if (action === 'timetable') {
      navigate(`/classes/${classId}/timetable`);
      return;
    }
    navigate(`/classes/${classId}/${action}`);
  };

  const statsData = [
    { icon: '👨‍🎓', number: stats.totalStudents, label: 'Total Students' },
    { icon: '✅', number: stats.presentToday, label: 'Present Today' },
    { icon: '📝', number: stats.pendingAssignments, label: 'Pending Tasks' },
    { icon: '📊', number: `${stats.avgGrade}%`, label: 'Average Grade' }
  ];

  const actionCards = [
    {
      id: 'roster',
      icon: 'fas fa-users',
      title: 'Student Roster',
      description: 'View student list with photos, names, and roll numbers',
      color: '#3b82f6',
      color2: '#1d4ed8',
      stats: [
        { number: stats.totalStudents, label: 'Students' },
        { number: '100%', label: 'Enrolled' }
      ]
    },
    {
      id: 'attendance',
      icon: 'fas fa-clipboard-check',
      title: 'Mark Attendance',
      description: 'Track daily attendance and view attendance reports',
      color: '#10b981',
      color2: '#059669',
      stats: [
        { number: stats.presentToday, label: 'Present' },
        { number: '85%', label: 'This Week' }
      ]
    },
    {
      id: 'timetable',
      icon: 'fas fa-calendar-alt',
      title: 'Class Timetable',
      description: 'View and manage class schedule and periods',
      color: '#f59e0b',
      color2: '#d97706',
      stats: [
        { number: '5', label: 'Periods' },
        { number: '6hrs', label: 'Daily' }
      ]
    },
    {
      id: 'assignments',
      icon: 'fas fa-tasks',
      title: 'Assignments',
      description: 'Create, assign, and grade homework and projects',
      color: '#8b5cf6',
      color2: '#7c3aed',
      stats: [
        { number: stats.pendingAssignments, label: 'Pending' },
        { number: '12', label: 'Total' }
      ]
    },
    {
      id: 'exams',
      icon: 'fas fa-graduation-cap',
      title: 'Exam Results',
      description: 'Record test scores and track academic progress',
      color: '#ef4444',
      color2: '#dc2626',
      stats: [
        { number: `${stats.avgGrade}%`, label: 'Avg Score' },
        { number: '3', label: 'Exams' }
      ]
    },
    {
      id: 'announcements',
      icon: 'fas fa-bullhorn',
      title: 'Announcements',
      description: 'Share important notices and updates with students',
      color: '#06b6d4',
      color2: '#0891b2',
      stats: [
        { number: '5', label: 'Active' },
        { number: '2', label: 'Recent' }
      ]
    }
  ];

  const defaultActivity = [
    { icon: 'fas fa-clipboard-check', text: 'Attendance marked for today', time: '2 hours ago' },
    { icon: 'fas fa-tasks', text: 'New assignment: Chapter 5 exercises', time: '1 day ago' },
    { icon: 'fas fa-graduation-cap', text: 'Math quiz results published', time: '2 days ago' },
    { icon: 'fas fa-bullhorn', text: 'Announcement: Parent meeting next week', time: '3 days ago' }
  ];

  if (loading) {
    return (
      <ClassDashboardContainer>
        <Overlay>
          <MainContent>
            <LoadingSpinner>
              <div className="spinner"></div>
            </LoadingSpinner>
          </MainContent>
        </Overlay>
      </ClassDashboardContainer>
    );
  }

  return (
    <ClassDashboardContainer>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      
      <Overlay>
        <MainContent>
          <HeaderSection>
            <div className="header-info">
              <h1>📚 {classData?.class_name || 'Class Dashboard'}</h1>
              <div className="class-details">
                <div><strong>Subject:</strong> {classData?.subject_name || 'Mathematics'}</div>
                <div><strong>Academic Year:</strong> {classData?.academic_year || '2024-2025'}</div>
                <div><strong>Class Teacher:</strong> {user?.first_name} {user?.last_name}</div>
              </div>
            </div>
            <button 
              className="back-btn"
              onClick={() => navigate('/classes')}
            >
              <i className="fas fa-arrow-left"></i>
              Back to Classes
            </button>
          </HeaderSection>

          <StatsGrid>
            {statsData.map((stat, index) => (
              <StatCard key={index}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-meta">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </StatCard>
            ))}
          </StatsGrid>

          <ActionsSection>
            <SectionTitle>Class Management Tools</SectionTitle>
            <ActionsGrid>
              {actionCards.map((action) => (
                <ActionCard 
                  key={action.id}
                  color={action.color}
                  color2={action.color2}
                  onClick={() => handleActionClick(action.id)}
                >
                  <div className="action-header">
                    <div>
                      <div className="action-title">{action.title}</div>
                      <div className="action-description">{action.description}</div>
                    </div>
                    <div className="action-icon">
                      <i className={action.icon}></i>
                    </div>
                  </div>
                  <div className="action-stats">
                    {action.stats.map((stat, index) => (
                      <div key={index} className="stat-item">
                        <div className="number">{stat.number}</div>
                        <div className="label">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </ActionCard>
              ))}
            </ActionsGrid>
          </ActionsSection>

          <RecentActivitySection>
            <SectionTitle>Recent Activity</SectionTitle>
            <ActivityList>
              {(recentActivity.length > 0 ? recentActivity : defaultActivity).map((activity, index) => (
                <ActivityItem key={index}>
                  <div className="activity-icon">
                    <i className={activity.icon}></i>
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">{activity.text}</div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                </ActivityItem>
              ))}
            </ActivityList>
          </RecentActivitySection>
        </MainContent>
      </Overlay>
    </ClassDashboardContainer>
  );
};

export default ClassDashboard;
