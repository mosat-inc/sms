import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { colors, borderRadius, shadows } from './shared/StyledComponents';
import { 
  FaSchool, 
  FaUserGraduate, 
  FaChalkboardTeacher,
  FaCalendarCheck,
  FaChartLine,
  FaCrown,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCog,
  FaCreditCard,
  FaUsers,
  FaBook
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 20px;
  
  .header-left {
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      color: ${colors.textPrimary};
      font-family: var(--font-display);
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 10px;
      
      svg {
        color: ${colors.primaryBlue};
      }
    }
    
    p {
      color: ${colors.textSecondary};
      font-size: 1.1rem;
    }
  }
  
  .header-right {
    display: flex;
    gap: 10px;
  }
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: ${borderRadius.pill};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 10px;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
    color: white;
    box-shadow: ${shadows.button};
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${shadows.buttonHover};
    }
  ` : `
    background: white;
    color: ${colors.textPrimary};
    border: 2px solid ${colors.border};
    
    &:hover {
      background: ${colors.background};
      border-color: ${colors.primaryBlue};
    }
  `}
`;

const SubscriptionBanner = styled.div`
  background: ${props => {
    if (props.$tier === 'PREMIUM') return 'linear-gradient(135deg, #8b5cf6, #6366f1)';
    if (props.$tier === 'STANDARD') return 'linear-gradient(135deg, #3b82f6, #2563eb)';
    return 'linear-gradient(135deg, #64748b, #475569)';
  }};
  border-radius: ${borderRadius.large};
  padding: 30px;
  color: white;
  margin-bottom: 30px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="white" opacity="0.1"/></svg>');
    opacity: 0.5;
  }
  
  .banner-content {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    
    .left {
      flex: 1;
      
      h2 {
        font-size: 1.8rem;
        font-weight: 800;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        
        svg {
          font-size: 2rem;
        }
      }
      
      p {
        opacity: 0.95;
        font-size: 1.05rem;
      }
    }
    
    .right {
      .stat {
        text-align: right;
        margin-bottom: 10px;
        
        .label {
          font-size: 0.85rem;
          opacity: 0.9;
          margin-bottom: 5px;
        }
        
        .value {
          font-size: 2rem;
          font-weight: 800;
        }
      }
    }
  }
`;

const AlertBanner = styled.div`
  background: ${props => props.$warning ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  border: 1px solid ${props => props.$warning ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'};
  color: ${props => props.$warning ? '#dc2626' : colors.primaryBlue};
  border-radius: ${borderRadius.medium};
  padding: 15px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  
  svg {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .content {
    flex: 1;
    
    h4 {
      font-weight: 700;
      margin-bottom: 5px;
    }
    
    p {
      opacity: 0.9;
    }
  }
  
  button {
    padding: 8px 20px;
    border-radius: ${borderRadius.pill};
    background: ${props => props.$warning ? '#ef4444' : colors.primaryBlue};
    color: white;
    border: none;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    
    &:hover {
      opacity: 0.9;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  border-radius: ${borderRadius.large};
  padding: 25px;
  box-shadow: ${shadows.card};
  border: 1px solid ${colors.border};
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${shadows.cardHover};
  }
  
  .icon {
    width: 50px;
    height: 50px;
    border-radius: ${borderRadius.medium};
    background: linear-gradient(135deg, #eef2ff, #eff6ff);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 15px;
    
    svg {
      font-size: 1.5rem;
      color: ${colors.primaryBlue};
    }
  }
  
  .value {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${colors.textPrimary};
    margin-bottom: 5px;
  }
  
  .label {
    color: ${colors.textSecondary};
    font-size: 0.95rem;
  }
  
  .progress {
    margin-top: 10px;
    font-size: 0.85rem;
    color: ${colors.textSecondary};
  }
`;

const Card = styled.div`
  background: white;
  border-radius: ${borderRadius.large};
  padding: 30px;
  box-shadow: ${shadows.card};
  border: 1px solid ${colors.border};
  margin-bottom: 20px;
`;

const CardTitle = styled.h3`
  font-size: 1.3rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  
  svg {
    color: ${colors.primaryBlue};
  }
`;

const QuickActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
`;

const QuickAction = styled.button`
  background: white;
  border: 2px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
  
  &:hover {
    border-color: ${colors.primaryBlue};
    background: rgba(59, 130, 246, 0.05);
    transform: translateY(-2px);
  }
  
  .icon {
    font-size: 1.8rem;
    color: ${colors.primaryBlue};
    margin-bottom: 10px;
  }
  
  .title {
    font-weight: 600;
    color: ${colors.textPrimary};
    margin-bottom: 5px;
  }
  
  .desc {
    font-size: 0.85rem;
    color: ${colors.textSecondary};
  }
`;

const SchoolAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, schoolId, schoolCode, api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    studentLimit: 500,
    totalTeachers: 0,
    totalClasses: 0,
    attendanceRate: 0,
    subscriptionTier: 'BASIC',
    subscriptionStatus: 'ACTIVE',
    daysRemaining: 30
  });

  useEffect(() => {
    fetchDashboardData();
  }, [schoolId]);

  const fetchDashboardData = async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      
      // Fetch school details with subscription info
      const schoolResponse = await api.get(`/api/v1/schools/${schoolId}`);
      
      if (schoolResponse.data.success) {
        const school = schoolResponse.data.data;
        setStats(prev => ({
          ...prev,
          subscriptionTier: school.plan_tier || 'BASIC',
          subscriptionStatus: school.subscription_status || 'ACTIVE',
          studentLimit: school.student_limit || 500,
          totalStudents: school.current_students || 0
        }));
      }
      
      // You can add more API calls here for other stats
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsagePercentage = () => {
    return Math.round((stats.totalStudents / stats.studentLimit) * 100);
  };

  const isNearLimit = () => {
    return getUsagePercentage() >= 80;
  };

  if (loading) {
    return <Container><p>Loading dashboard...</p></Container>;
  }

  return (
    <Container>
      <Header>
        <div className="header-left">
          <h1>
            <FaSchool /> School Dashboard
          </h1>
          <p>Welcome back! Here's what's happening at your school.</p>
        </div>
        <div className="header-right">
          <Button onClick={() => navigate('/school/settings')}>
            <FaCog /> Settings
          </Button>
          <Button $primary onClick={() => navigate('/school/subscription')}>
            <FaCreditCard /> Subscription
          </Button>
        </div>
      </Header>
      
      <SubscriptionBanner $tier={stats.subscriptionTier}>
        <div className="banner-content">
          <div className="left">
            <h2>
              {stats.subscriptionTier === 'PREMIUM' && <FaCrown />}
              {stats.subscriptionTier} Plan
            </h2>
            <p>School Code: {schoolCode} | Status: {stats.subscriptionStatus}</p>
          </div>
          <div className="right">
            <div className="stat">
              <div className="label">Students</div>
              <div className="value">{stats.totalStudents} / {stats.studentLimit}</div>
            </div>
          </div>
        </div>
      </SubscriptionBanner>
      
      {isNearLimit() && (
        <AlertBanner $warning>
          <FaExclamationTriangle />
          <div className="content">
            <h4>Student Limit Warning</h4>
            <p>You're using {getUsagePercentage()}% of your student limit. Consider upgrading your plan.</p>
          </div>
          <button onClick={() => navigate('/school/subscription')}>Upgrade Now</button>
        </AlertBanner>
      )}
      
      <StatsGrid>
        <StatCard>
          <div className="icon">
            <FaUserGraduate />
          </div>
          <div className="value">{stats.totalStudents}</div>
          <div className="label">Total Students</div>
          <div className="progress">{getUsagePercentage()}% of limit used</div>
        </StatCard>
        
        <StatCard>
          <div className="icon">
            <FaChalkboardTeacher />
          </div>
          <div className="value">{stats.totalTeachers}</div>
          <div className="label">Teachers</div>
        </StatCard>
        
        <StatCard>
          <div className="icon">
            <FaBook />
          </div>
          <div className="value">{stats.totalClasses}</div>
          <div className="label">Classes</div>
        </StatCard>
        
        <StatCard>
          <div className="icon">
            <FaCalendarCheck />
          </div>
          <div className="value">{stats.attendanceRate}%</div>
          <div className="label">Attendance Rate</div>
        </StatCard>
      </StatsGrid>
      
      <Card>
        <CardTitle>
          <FaChartLine /> Quick Actions
        </CardTitle>
        <QuickActionGrid>
          <QuickAction onClick={() => navigate('/students/admission')}>
            <div className="icon"><FaUserGraduate /></div>
            <div className="title">Add Student</div>
            <div className="desc">Register new student</div>
          </QuickAction>
          
          <QuickAction onClick={() => navigate('/teachers')}>
            <div className="icon"><FaChalkboardTeacher /></div>
            <div className="title">Manage Teachers</div>
            <div className="desc">View and edit teachers</div>
          </QuickAction>
          
          <QuickAction onClick={() => navigate('/classes')}>
            <div className="icon"><FaBook /></div>
            <div className="title">Manage Classes</div>
            <div className="desc">View all classes</div>
          </QuickAction>
          
          <QuickAction onClick={() => navigate('/school/settings')}>
            <div className="icon"><FaCog /></div>
            <div className="title">School Settings</div>
            <div className="desc">Configure your school</div>
          </QuickAction>
          
          <QuickAction onClick={() => navigate('/students/view')}>
            <div className="icon"><FaUsers /></div>
            <div className="title">View Students</div>
            <div className="desc">All student records</div>
          </QuickAction>
          
          <QuickAction onClick={() => navigate('/school/subscription')}>
            <div className="icon"><FaCreditCard /></div>
            <div className="title">Subscription</div>
            <div className="desc">Manage your plan</div>
          </QuickAction>
        </QuickActionGrid>
      </Card>
    </Container>
  );
};

export default SchoolAdminDashboard;
