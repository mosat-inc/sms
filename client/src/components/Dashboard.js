import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';
import UserProfile from './UserProfile';
import EditProfile from './EditProfile';
import ChangePassword from './ChangePassword';
import AttendanceMenu from './AttendanceMenu';
import SubjectsMenu from './SubjectsMenu';
import GradesMenu from './GradesMenu';
import CreateAssessment from './CreateAssessment';
import AnalyticsReports from './AnalyticsReports';
import FinancialInformation from './FinancialInformation';
import Communication from './Communication';
import AnnouncementNotifications from './AnnouncementNotifications';
import NotificationToast from './NotificationToast';
import TeacherManagement from './TeacherManagement';
import Settings from './Settings';
import ResponsiveNavigation from './ResponsiveNavigation';
import Timetable from './Timetable';
import StaffAttendance from './StaffAttendance';
import DisciplineMenu from './DisciplineMenu';
import {
  colors,
  PageHeader,
  Section,
  SectionTitle,
  StatsGrid,
  StatCard,
  QuickActionsGrid,
  ActionCard,
  LoadingSpinner,
  ErrorMessage,
  PrimaryButton,
} from './shared/StyledComponents';
import useDevice, { mediaQuery } from '../hooks/useDevice';
import styled from 'styled-components';

const DashboardContainer = styled.div`
  font-family: var(--font-primary);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${colors.background};

  ${mediaQuery('laptop')} {
    background-attachment: scroll;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Overlay = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: transparent;
`;

const MainContent = styled.div`
  display: flex;
  flex: 1;
  
  ${mediaQuery('laptop')} {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  position: fixed;
  top: ${props => (props.$hasNavigation ? '70px' : '0')};
  left: 0;
  height: ${props => (props.$hasNavigation ? 'calc(100vh - 70px)' : '100vh')};
  width: ${props => props.expanded ? '220px' : '72px'};
  background: #ffffff;
  color: #0f172a;
  border-right: 1px solid rgba(15, 23, 42, 0.08);
  transition: all 0.3s ease;
  overflow: hidden;
  z-index: 999;
  
  ${mediaQuery('laptop')} {
    display: ${props => props.isMobileMenuOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    height: 100vh;
    width: 280px;
    z-index: 1002;
  }

  &:hover {
    width: 200px;
    
    ${mediaQuery('laptop')} {
      width: 280px;
    }
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 60px;
  font-size: 1.25em;
  padding: 0 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);

  .logo-text {
    margin-left: 10px;
    display: ${props => props.show ? 'inline' : 'none'};
  }

  ${Sidebar}:hover & .logo-text {
    display: inline;
  }
`;

const Menu = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const MenuItem = styled.li`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  color: ${props => props.$active ? '#2563eb' : '#4b5563'};
  background: ${props => props.$active ? 'rgba(37, 99, 235, 0.08)' : 'transparent'};
  position: relative;

  &:hover {
    background: rgba(15, 23, 42, 0.04);
  }

  i {
    font-size: 1.2em;
    width: 30px;
  }

  .text {
    display: ${props => props.showText ? 'inline' : 'none'};
    margin-left: 10px;
    flex: 1;
  }

  .chevron {
    display: ${props => props.showText ? 'inline' : 'none'};
    margin-left: auto;
    font-size: 0.8em;
    transition: transform 0.3s ease;
    transform: ${props => props.$expanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  }

  ${Sidebar}:hover & .text {
    display: inline;
  }

  ${Sidebar}:hover & .chevron {
    display: inline;
  }
`;

const Submenu = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  background: #f9fafb;
  max-height: ${props => props.$show ? '300px' : '0'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${props => props.$show ? '1' : '0'};
  transform: ${props => props.$show ? 'scaleY(1)' : 'scaleY(0)'};
  transform-origin: top;
  border-left: 3px solid ${props => props.$show ? '#3b82f6' : 'transparent'};
  box-shadow: ${props => props.$show ? 'inset 0 2px 10px rgba(59, 130, 246, 0.1)' : 'none'};
`;

const SubmenuItem = styled.li`
  display: flex;
  align-items: center;
  padding: 12px 20px 12px 60px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #4b5563;
  font-size: 0.9rem;
  position: relative;
  overflow: hidden;
  transform: translateX(${props => props.show ? '0' : '-10px'});
  opacity: ${props => props.show ? '1' : '0.7'};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 3px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    transform: scaleY(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: bottom;
  }
  
  &:hover {
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1));
    color: #60a5fa;
    transform: translateX(5px);
    padding-left: 65px;
    
    &::before {
      transform: scaleY(1);
    }
    
    i {
      transform: scale(1.1);
      color: #3b82f6;
    }
  }

  i {
    font-size: 1em;
    width: 20px;
    margin-right: 10px;
    transition: all 0.3s ease;
    opacity: 0.8;
  }

  .text {
    display: ${props => props.showText ? 'inline' : 'none'};
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  ${Sidebar}:hover & .text {
    display: inline;
  }
`;

const UserProfileDropdown = styled.div`
  position: fixed;
  top: 10px;
  right: 20px;
  display: flex;
  align-items: center;
  z-index: 1000;
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  cursor: pointer;
  border: 2px solid #3b82f6;
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const UserDropdown = styled.div`
  position: absolute;
  top: 50px;
  right: 0;
  background: #ffffff;
  border-radius: 8px;
  padding: 10px 0;
  width: 220px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
  border: 1px solid rgba(15, 23, 42, 0.06);
  display: ${props => props.$show ? 'block' : 'none'};
  z-index: 1001;
  animation: ${props => props.$show ? 'fadeInDown 0.3s ease' : 'none'};

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const DropdownItem = styled.div`
  padding: 10px 15px;
  color: #4b5563;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  &:hover {
    background: #f3f4f6;
    color: #111827;
  }

  i {
    margin-right: 10px;
    width: 20px;
    text-align: center;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  color: #111827;
  margin-left: 60px;
  transition: margin-left 0.3s ease;
  min-height: calc(100vh - 70px);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  min-width: 0;
  
  ${mediaQuery('laptop')} {
    margin-left: 0;
    padding: 15px;
    width: 100%;
  }
  
  ${mediaQuery('tablet')} {
    padding: 10px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 8px;
  }

  ${Sidebar}:hover ~ & {
    margin-left: 200px;
    
    ${mediaQuery('laptop')} {
      margin-left: 0;
    }
  }
`;

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showStudentsSubmenu, setShowStudentsSubmenu] = useState(false);
  const [showAcademySubmenu, setShowAcademySubmenu] = useState(false);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const device = useDevice();

  // Fetch dashboard data based on user role
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (user.role === 'admin') {
        response = await dashboardService.getAdminStats();
      } else if (user.role === 'teacher') {
        response = await dashboardService.getTeacherStats();
      } else {
        // For other roles, we can implement specific endpoints later
        setError('Dashboard not available for your role');
        return;
      }
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user]);
  
  // Load dashboard data on component mount and when user changes
  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const hasStudentAdmissionAccess = user?.role === 'admin' || !!user?.can_student_admission;

  const menuItems = [
    { id: 'dashboard', icon: 'fas fa-home', text: 'Dashboard' },
    { id: 'profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    { 
      id: 'students-management', 
      icon: 'fas fa-users-cog', 
      text: 'Students Management',
      hasSubmenu: true,
      submenuType: 'students',
      submenuItems: [
        ...(hasStudentAdmissionAccess
          ? [{ id: 'student-admission', icon: 'fas fa-user-plus', text: 'Student Admission', action: () => navigate('/students/admission') }]
          : []),
        { id: 'view-students', icon: 'fas fa-users', text: 'View Students', action: () => navigate('/students/view') }
      ]
    },
    ...(user?.role === 'admin' ? [
      {
        id: 'teacher-management',
        icon: 'fas fa-chalkboard-teacher',
        text: 'Teacher Management'
      },
      {
        id: 'user-management',
        icon: 'fas fa-users',
        text: 'User Management',
        action: () => navigate('/admin/users')
      }
    ] : []),
	    {
	      id: 'academy',
	      icon: 'fas fa-university',
	      text: 'Academy',
	      hasSubmenu: true,
	      submenuType: 'academy',
	      submenuItems: [
	        { id: 'my-classes', icon: 'fas fa-door-open', text: 'My Classes', action: () => navigate('/classes') },
	        { id: 'timetable', icon: 'fas fa-calendar-alt', text: 'Timetable', action: () => setActiveMenu('timetable') },
	        { id: 'subjects', icon: 'fas fa-book', text: 'Subjects', action: () => setActiveMenu('subjects') },
	        { id: 'grades', icon: 'fas fa-chart-bar', text: 'Grades', action: () => setActiveMenu('grades') },
	        { id: 'attendance', icon: 'fas fa-clipboard-check', text: 'Attendance', action: () => setActiveMenu('attendance') },
          { id: 'staff-attendance', icon: 'fas fa-user-check', text: 'Staff Attendance', action: () => setActiveMenu('staff-attendance') },
          { id: 'discipline', icon: 'fas fa-gavel', text: 'Discipline', action: () => setActiveMenu('discipline') },
	        { id: 'analytics-reports', icon: 'fas fa-chart-line', text: 'Analytics & Reports', action: () => setActiveMenu('analytics-reports') }
	      ]
	    },
    { id: 'finance', icon: 'fas fa-money-check-alt', text: 'Finance' },
    { id: 'communication', icon: 'fas fa-bullhorn', text: 'Communication' },
    { id: 'settings', icon: 'fas fa-cog', text: 'Settings' }
  ];

  // Generate dynamic stats based on user role and data
  const getDashboardStats = () => {
    if (!dashboardData) return [];
    
    if (user.role === 'teacher') {
      return [
        { 
          icon: '👨‍🎓', 
          number: dashboardData.students?.total_count || '0', 
          label: 'My Students' 
        },
        { 
          icon: '📚', 
          number: dashboardData.subjects_teaching?.length || '0', 
          label: 'Subjects Teaching' 
        },
        { 
          icon: '🏫', 
          number: dashboardData.classes_assigned?.length || '0', 
          label: 'Classes Assigned' 
        },
        { 
          icon: '📈', 
          number: dashboardData.attendance?.average_attendance_rate + '%' || '0%', 
          label: 'Attendance Rate' 
        }
      ];
    } else if (user.role === 'admin') {
      return [
        { 
          icon: '👨‍🎓', 
          number: dashboardData.overview?.total_students || '0', 
          label: 'Total Students' 
        },
        { 
          icon: '👩‍🏫', 
          number: dashboardData.overview?.total_teachers || '0', 
          label: 'Total Teachers' 
        },
        { 
          icon: '🏫', 
          number: dashboardData.overview?.total_classes || '0', 
          label: 'Total Classes' 
        },
        { 
          icon: '💰', 
          number: dashboardData.summary?.collection_rate || '0%', 
          label: 'Fee Collection Rate' 
        }
      ];
    }
    
    return [];
  };

  // Generate dynamic actions based on user role
  const getDashboardActions = () => {
    const baseActions = [
      { icon: 'fas fa-sync-alt', text: 'Refresh Dashboard', onClick: () => fetchDashboardData() }
    ];
    
    if (user?.role === 'teacher') {
      return [
        ...baseActions,
        { icon: 'fas fa-clipboard-list', text: 'Take Attendance', onClick: () => setActiveMenu('attendance') },
        { icon: 'fas fa-plus-circle', text: 'Add Assignment', onClick: () => toast.info('Assignment feature coming soon') },
        { icon: 'fas fa-edit', text: 'Create Assessment', onClick: () => setShowCreateAssessment(true) },
        { icon: 'fas fa-bell', text: 'Send Notice', onClick: () => toast.info('Notice feature coming soon') },
        { icon: 'fas fa-file-alt', text: 'Analytics & Reports', onClick: () => setActiveMenu('analytics-reports') }
      ];
    } else if (user?.role === 'admin') {
      return [
        ...baseActions,
        { icon: 'fas fa-user-plus', text: 'Add Student', onClick: () => navigate('/students/admission') },
        { icon: 'fas fa-users', text: 'View Students', onClick: () => navigate('/students/view') },
        { icon: 'fas fa-users-cog', text: 'User Management', onClick: () => navigate('/admin/users') },
        { icon: 'fas fa-chart-line', text: 'View Reports', onClick: () => setActiveMenu('analytics-reports') },
        { icon: 'fas fa-cog', text: 'System Settings', onClick: () => toast.info('Settings feature coming soon') }
      ];
    }
    
    return baseActions;
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

	  const renderContent = () => {
	    switch (activeMenu) {
	      case 'profile':
	        return <UserProfile />;
	      case 'attendance':
	        return <AttendanceMenu />;
	      case 'subjects':
	        return <SubjectsMenu />;
	      case 'grades':
	        return <GradesMenu />;
	      case 'timetable':
	        return <Timetable />;
	      case 'analytics-reports':
	        return <AnalyticsReports />;
	      case 'finance':
	        return <FinancialInformation />;
	      case 'communication':
        return <Communication />;
      case 'staff-attendance':
        return <StaffAttendance />;
      case 'discipline':
        return <DisciplineMenu />;
      case 'teacher-management':
        return <TeacherManagement />;
      case 'settings':
        return <Settings />;
      case 'dashboard':
      default:
        if (loading) {
          return (
            <Section>
              <LoadingSpinner>
                <div className="spinner"></div>
                <p>Loading dashboard data...</p>
              </LoadingSpinner>
            </Section>
          );
        }
        
        if (error) {
          return (
            <Section>
              <ErrorMessage>
                <i className="fas fa-exclamation-triangle"></i>
                <div>Error: {error}</div>
              </ErrorMessage>
              <PrimaryButton onClick={fetchDashboardData}>
                <i className="fas fa-refresh"></i>
                Retry
              </PrimaryButton>
            </Section>
          );
        }
        
        const stats = getDashboardStats();
        const actions = getDashboardActions();
        const profile = dashboardData?.teacher_profile || {};
        
        return (
          <>
            <PageHeader>
              <h1>Welcome back, {user?.first_name || 'User'}! 👋</h1>
              <p><strong>Role:</strong> {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'User'}</p>
              {profile.department && <p><strong>Department:</strong> {profile.department}</p>}
              {profile.employee_id && <p><strong>Employee ID:</strong> {profile.employee_id}</p>}
              {profile.position && <p><strong>Position:</strong> {profile.position}</p>}
              <p><strong>Today:</strong> {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </PageHeader>

            <StatsGrid>
              {stats.map((stat, index) => (
                <StatCard key={index}>
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-meta">
                    <div className="stat-number">{stat.number}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </StatCard>
              ))}
            </StatsGrid>

            <Section>
              <SectionTitle>Quick Actions</SectionTitle>
              <QuickActionsGrid>
                {actions.map((action, index) => (
                  <ActionCard key={index} onClick={action.onClick} $hover>
                    <i className={action.icon}></i>
                    <span>{action.text}</span>
                  </ActionCard>
                ))}
              </QuickActionsGrid>
            </Section>

            <Section>
              <SectionTitle>Recent Activity</SectionTitle>
              <div style={{ color: '#374151' }}>
                {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
                  dashboardData.recent_activities.map((activity, index) => (
                    <p key={index}>• {activity.description}</p>
                  ))
                ) : (
                  <>
                    <p>• No recent activities found</p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                      Recent activities will appear here as data is added to the system
                    </p>
                  </>
                )}
              </div>
            </Section>

            {user.role === 'teacher' && (
              <Section>
                <SectionTitle>My Classes Overview</SectionTitle>
                <div style={{ color: '#374151' }}>
                  {dashboardData?.classes_assigned && dashboardData.classes_assigned.length > 0 ? (
                    dashboardData.classes_assigned.map((classInfo, index) => (
                      <p key={index}>
                        • <strong>{classInfo.name}</strong> - {classInfo.student_count} students 
                        ({classInfo.capacity - classInfo.student_count} spots available)
                      </p>
                    ))
                  ) : (
                    <p>• No classes assigned yet</p>
                  )}
                </div>
              </Section>
            )}

            {user.role === 'teacher' && (
              <Section>
                <SectionTitle>My Subjects</SectionTitle>
                <div style={{ color: '#374151' }}>
                  {dashboardData?.subjects_teaching && dashboardData.subjects_teaching.length > 0 ? (
                    dashboardData.subjects_teaching.map((subject, index) => (
                      <p key={index}>
                        • <strong>{subject.name}</strong> ({subject.code}) 
                        {subject.is_primary_teacher && ' - Primary Teacher'}
                      </p>
                    ))
                  ) : (
                    <p>• No subjects assigned yet</p>
                  )}
                </div>
              </Section>
            )}

            {user.role === 'admin' && (
              <Section>
                <SectionTitle>Recent Admissions</SectionTitle>
                <div style={{ color: '#374151' }}>
                  {dashboardData?.recent_admissions && dashboardData.recent_admissions.length > 0 ? (
                    dashboardData.recent_admissions.slice(0, 5).map((admission, index) => (
                      <p key={index}>
                        • {admission.first_name} {admission.last_name} admitted to {admission.class_name} 
                        ({new Date(admission.admission_date).toLocaleDateString()})
                      </p>
                    ))
                  ) : (
                    <p>• No recent admissions</p>
                  )}
                </div>
              </Section>
            )}
          </>
        );
    }
  };

  return (
    <DashboardContainer>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      
	      {device.isLaptop || device.isDesktop || device.isLargeDesktop ? (
	        /* Desktop/Laptop Layout with Traditional Sidebar */
	        <Overlay>
	          <MainContent>
	            <Sidebar $hasNavigation={false}>
	              <Logo>
	                <i className="fas fa-graduation-cap"></i>
	                <span className="logo-text">UBUNIFU SEC</span>
	              </Logo>
              
              <Menu>
                {menuItems.map(item => {
                  const isSubmenuOpen = item.submenuType === 'students' ? showStudentsSubmenu : 
                                       item.submenuType === 'academy' ? showAcademySubmenu : false;
                  
                  return (
                    <div key={item.id}>
                      <MenuItem 
                        $active={activeMenu === item.id}
                        $expanded={item.hasSubmenu && isSubmenuOpen}
                        onClick={() => {
                          if (item.hasSubmenu) {
                            if (item.submenuType === 'students') {
                              setShowStudentsSubmenu(!showStudentsSubmenu);
                              setShowAcademySubmenu(false);
                            } else if (item.submenuType === 'academy') {
                              setShowAcademySubmenu(!showAcademySubmenu);
                              setShowStudentsSubmenu(false);
                            }
                          } else if (item.action) {
                            item.action();
                          } else {
                            setActiveMenu(item.id);
                          }
                        }}
                      >
                        <i className={item.icon}></i>
                        <span className="text">{item.text}</span>
                        {item.hasSubmenu && (
                          <i className="chevron fas fa-chevron-right"></i>
                        )}
                      </MenuItem>
                      
                      {item.hasSubmenu && (
                        <Submenu $show={isSubmenuOpen}>
                          {item.submenuItems.map(subItem => (
                            <SubmenuItem 
                              key={subItem.id}
                              onClick={() => {
                                subItem.action();
                                if (item.submenuType === 'students') {
                                  setShowStudentsSubmenu(false);
                                } else if (item.submenuType === 'academy') {
                                  setShowAcademySubmenu(false);
                                }
                              }}
                            >
                              <i className={subItem.icon}></i>
                              <span className="text">{subItem.text}</span>
                            </SubmenuItem>
                          ))}
                        </Submenu>
                      )}
                    </div>
                  );
                })}
              </Menu>
            </Sidebar>

            <UserProfileDropdown ref={dropdownRef}>
              <UserAvatar onClick={() => setShowUserDropdown(!showUserDropdown)}>
                {user ? getInitials(user.first_name, user.last_name) : 'U'}
              </UserAvatar>
              <UserDropdown $show={showUserDropdown}>
                <DropdownItem onClick={() => {
                  setActiveMenu('profile');
                  setShowUserDropdown(false);
                }}>
                  <i className="fas fa-user"></i>
                  View Profile
                </DropdownItem>
                <DropdownItem onClick={() => {
                  setShowEditProfile(true);
                  setShowUserDropdown(false);
                }}>
                  <i className="fas fa-edit"></i>
                  Edit Profile
                </DropdownItem>
                <DropdownItem onClick={() => {
                  setShowChangePassword(true);
                  setShowUserDropdown(false);
                }}>
                  <i className="fas fa-lock"></i>
                  Change Password
                </DropdownItem>
                <DropdownItem onClick={() => {
                  handleLogout();
                  setShowUserDropdown(false);
                }}>
                  <i className="fas fa-sign-out-alt"></i>
                  Logout
                </DropdownItem>
              </UserDropdown>
            </UserProfileDropdown>

            <ContentArea>
              {renderContent()}
            </ContentArea>
          </MainContent>
        </Overlay>
      ) : (
        /* Mobile/Tablet Layout with Responsive Navigation */
        <Overlay>
          <ResponsiveNavigation 
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            user={user}
            onLogout={handleLogout}
            onEditProfile={() => setShowEditProfile(true)}
            onChangePassword={() => setShowChangePassword(true)}
          />
          <MainContent>
            <ContentArea style={{ marginTop: '70px' }}>
              {renderContent()}
            </ContentArea>
          </MainContent>
        </Overlay>
      )}

      <AnnouncementNotifications />
      <NotificationToast />

      {/* Modals */}
      <EditProfile 
        isOpen={showEditProfile} 
        onClose={() => setShowEditProfile(false)} 
      />
      <ChangePassword 
        isOpen={showChangePassword} 
        onClose={() => setShowChangePassword(false)} 
      />
      
      {/* Create Assessment Modal */}
      {showCreateAssessment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflowY: 'auto'
        }}>
          <CreateAssessment 
            onClose={() => setShowCreateAssessment(false)}
            onSuccess={() => {
              setShowCreateAssessment(false);
              toast.success('Assessment created successfully!');
            }}
          />
        </div>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;
