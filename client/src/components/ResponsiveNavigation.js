import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useDevice, { mediaQuery, touchSizes } from '../hooks/useDevice';

const NavContainer = styled.nav`
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const NavContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 70px;

  ${mediaQuery('tablet')} {
    padding: 0 15px;
    height: 60px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.5rem;
  font-weight: bold;
  cursor: pointer;

  .logo-icon {
    font-size: 2rem;
  }

  .logo-text {
    ${mediaQuery('mobile')} {
      display: none;
    }
  }

  ${mediaQuery('tablet')} {
    font-size: 1.3rem;
    
    .logo-icon {
      font-size: 1.8rem;
    }
  }
`;

const DesktopNav = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;

  ${mediaQuery('laptop')} {
    display: none;
  }
`;

const NavItems = styled.div`
  display: flex;
  align-items: center;
  gap: 25px;
`;

const NavItem = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-1px);
  }

  &.active {
    background: rgba(255, 255, 255, 0.2);
    
    &::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 2px;
      background: white;
      border-radius: 1px;
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const UserInfo = styled.div`
  text-align: right;
  
  .user-name {
    font-weight: 600;
    font-size: 0.95rem;
  }
  
  .user-role {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  ${mediaQuery('tablet')} {
    display: none;
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }

  ${mediaQuery('tablet')} {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }
`;

const LogoutButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  min-height: ${touchSizes.minTouchTarget};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  ${mediaQuery('tablet')} {
    display: none;
  }
`;

// Mobile Menu Components
const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  min-width: ${touchSizes.minTouchTarget};
  min-height: ${touchSizes.minTouchTarget};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  ${mediaQuery('laptop')} {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const MobileMenu = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
  transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease;
  
  ${mediaQuery('laptop')} {
    display: block;
  }
`;

const MobileMenuContent = styled.div`
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  width: 280px;
  height: 100%;
  padding: 20px;
  transform: ${props => props.$isOpen ? 'translateX(0)' : 'translateX(-100%)'};
  transition: transform 0.3s ease;
  overflow-y: auto;
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const MobileCloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  min-width: ${touchSizes.minTouchTarget};
  min-height: ${touchSizes.minTouchTarget};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const MobileNavItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 30px;
`;

const MobileNavItem = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  padding: 15px 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
  text-align: left;
  min-height: ${touchSizes.preferredTouchTarget};
  display: flex;
  align-items: center;
  gap: 15px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: rgba(255, 255, 255, 0.2);
  }

  .nav-icon {
    font-size: 1.2rem;
    width: 24px;
  }
`;

const MobileUserProfile = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MobileUserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  
  .user-details {
    .user-name {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 4px;
    }
    
    .user-role {
      font-size: 0.9rem;
      opacity: 0.8;
    }
  }
`;

const MobileLogoutButton = styled.button`
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  min-height: ${touchSizes.preferredTouchTarget};
  display: flex;
  align-items: center;
  gap: 10px;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
`;

// Profile Dropdown Components (for desktop profile avatar click)
const ProfileDropdownContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const ProfileDropdown = styled.div`
  position: absolute;
  top: 50px;
  right: 0;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(15px);
  border-radius: 8px;
  padding: 10px 0;
  width: 200px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.4);
  border: 1px solid rgba(59, 130, 246, 0.3);
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

const ProfileDropdownItem = styled.div`
  padding: 10px 15px;
  color: #e2e8f0;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }

  i {
    margin-right: 10px;
    width: 20px;
    text-align: center;
  }
`;

// Mobile-specific profile dropdown
const MobileProfileDropdown = styled(ProfileDropdown)`
  position: fixed;
  top: 60px;
  right: 10px;
  left: 10px;
  width: auto;
  max-width: calc(100% - 20px);
  background: rgba(30, 41, 59, 0.98);
  border: 2px solid rgba(59, 130, 246, 0.4);
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  z-index: 1003;
  
  @media (min-width: 481px) {
    position: absolute;
    top: -260px;
    right: -150px;
    left: auto;
    width: 200px;
    max-width: 200px;
  }
`;

const ResponsiveNavigation = ({ 
  activeMenu, 
  setActiveMenu, 
  user, 
  onLogout, 
  onEditProfile, 
  onChangePassword 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showStudentsSubmenu, setShowStudentsSubmenu] = useState(false);
  const [showAcademySubmenu, setShowAcademySubmenu] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDevice();
  const hasStudentAdmissionAccess = user?.role === 'admin' || !!user?.can_student_admission;

  // Navigation items based on user role (matching Dashboard menu structure)
  const getNavigationItems = () => {
    const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠', action: () => setActiveMenu('dashboard') },
      { id: 'profile', label: 'My Profile', icon: '👤', action: () => setActiveMenu('profile') },
      {
        id: 'students-management',
        label: 'Students Management', 
        icon: '👨‍🎓',
        hasSubmenu: true,
        submenuItems: [
          ...(hasStudentAdmissionAccess
            ? [{ id: 'student-admission', label: 'Student Admission', icon: '➕', action: () => navigate('/students/admission') }]
            : []),
          { id: 'view-students', label: 'View Students', icon: '👥', action: () => navigate('/students/view') }
        ]
      },
      ...(user?.role === 'admin' ? [
        {
          id: 'teacher-management',
          label: 'Teacher Management',
          icon: '👨‍🏫',
          action: () => setActiveMenu('teacher-management')
        },
        {
          id: 'user-management',
          label: 'User Management',
          icon: '👥',
          action: () => navigate('/admin/users')
        }
      ] : []),
      {
        id: 'academy',
        label: 'Academy',
        icon: '🏫',
        hasSubmenu: true,
        submenuItems: [
          { id: 'my-classes', label: 'My Classes', icon: '🚪', action: () => navigate('/classes') },
          { id: 'subjects', label: 'Subjects', icon: '📚', action: () => setActiveMenu('subjects') },
          { id: 'grades', label: 'Grades', icon: '📊', action: () => setActiveMenu('grades') },
          { id: 'attendance', label: 'Attendance', icon: '📋', action: () => setActiveMenu('attendance') },
          { id: 'analytics-reports', label: 'Analytics & Reports', icon: '📈', action: () => setActiveMenu('analytics-reports') }
        ]
      },
      { id: 'finance', label: 'Finance', icon: '💰', action: () => setActiveMenu('finance') },
      { id: 'communication', label: 'Communication', icon: '📢', action: () => setActiveMenu('communication') },
      { id: 'settings', label: 'Settings', icon: '⚙️', action: () => setActiveMenu('settings') }
    ];

    return menuItems;
  };

  const navigationItems = getNavigationItems();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu when device changes to desktop
  useEffect(() => {
    if (!device.isMobile && !device.isTablet) {
      setIsMobileMenuOpen(false);
    }
  }, [device.isMobile, device.isTablet]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      }
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isCurrentPath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.username?.substring(0, 2).toUpperCase() || 'U';
  };

  return (
    <>
      <NavContainer>
        <NavContent>
          <Logo onClick={() => navigate('/dashboard')}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">UBUNIFU SEC</span>
          </Logo>

          {/* Desktop Navigation */}
          <DesktopNav>
            <NavItems>
              {navigationItems.map(item => (
                <NavItem
                  key={item.id}
                  onClick={() => item.action && item.action()}
                  className={activeMenu === item.id ? 'active' : ''}
                >
                  {item.label}
                </NavItem>
              ))}
            </NavItems>

            <UserProfile>
              <UserInfo>
                <div className="user-name">{user?.name || user?.username}</div>
                <div className="user-role">{user?.role}</div>
              </UserInfo>
              <ProfileDropdownContainer className="profile-dropdown-container">
                <UserAvatar onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                  {getUserInitials()}
                </UserAvatar>
                <ProfileDropdown $show={showProfileDropdown}>
                  <ProfileDropdownItem onClick={() => {
                    setActiveMenu('profile');
                    setShowProfileDropdown(false);
                  }}>
                    <i className="fas fa-user"></i>
                    View Profile
                  </ProfileDropdownItem>
                  <ProfileDropdownItem onClick={() => {
                    onEditProfile();
                    setShowProfileDropdown(false);
                  }}>
                    <i className="fas fa-edit"></i>
                    Edit Profile
                  </ProfileDropdownItem>
                  <ProfileDropdownItem onClick={() => {
                    onChangePassword();
                    setShowProfileDropdown(false);
                  }}>
                    <i className="fas fa-lock"></i>
                    Change Password
                  </ProfileDropdownItem>
                  <ProfileDropdownItem onClick={() => {
                    handleLogout();
                    setShowProfileDropdown(false);
                  }}>
                    <i className="fas fa-sign-out-alt"></i>
                    Logout
                  </ProfileDropdownItem>
                </ProfileDropdown>
              </ProfileDropdownContainer>
            </UserProfile>
          </DesktopNav>

          {/* Mobile Menu Button */}
          <MobileMenuButton onClick={() => setIsMobileMenuOpen(true)}>
            ☰
          </MobileMenuButton>
        </NavContent>
      </NavContainer>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <MobileMenu $isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)}>
          <MobileMenuContent $isOpen={isMobileMenuOpen} onClick={(e) => e.stopPropagation()}>
            <MobileMenuHeader>
              <Logo>
                <span className="logo-icon">🎓</span>
                <span>UBUNIFU SEC</span>
              </Logo>
              <MobileCloseButton onClick={() => setIsMobileMenuOpen(false)}>
                ✕
              </MobileCloseButton>
            </MobileMenuHeader>

            <MobileNavItems>
              {navigationItems.map(item => (
                <div key={item.id}>
                  <MobileNavItem
                    onClick={() => {
                      if (item.hasSubmenu) {
                        if (item.id === 'students-management') {
                          setShowStudentsSubmenu(!showStudentsSubmenu);
                        } else if (item.id === 'academy') {
                          setShowAcademySubmenu(!showAcademySubmenu);
                        }
                      } else {
                        item.action();
                        setIsMobileMenuOpen(false);
                      }
                    }}
                    className={activeMenu === item.id ? 'active' : ''}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span>{item.label}</span>
                      {item.hasSubmenu && (
                        <span style={{ fontSize: '12px' }}>
                          {(item.id === 'students-management' && showStudentsSubmenu) || 
                           (item.id === 'academy' && showAcademySubmenu) ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </MobileNavItem>
                  
                  {/* Submenu */}
                  {item.hasSubmenu && ((item.id === 'students-management' && showStudentsSubmenu) || 
                                      (item.id === 'academy' && showAcademySubmenu)) && (
                    <div style={{ paddingLeft: '20px', backgroundColor: '#000000' }}>
                      {item.submenuItems.map((subItem) => (
                        <MobileNavItem
                          key={subItem.id}
                          onClick={() => {
                            subItem.action();
                            setIsMobileMenuOpen(false);
                            setShowStudentsSubmenu(false);
                            setShowAcademySubmenu(false);
                          }}
                          style={{ paddingLeft: '10px', fontSize: '14px', backgroundColor: 'transparent', color: '#ffffff' }}
                        >
                          <span className="nav-icon">{subItem.icon}</span>
                          {subItem.label}
                        </MobileNavItem>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </MobileNavItems>

            <MobileUserProfile>
              <MobileUserInfo>
                <ProfileDropdownContainer className="profile-dropdown-container">
                  <UserAvatar onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                    {getUserInitials()}
                  </UserAvatar>
                  <MobileProfileDropdown $show={showProfileDropdown}>
                    <ProfileDropdownItem onClick={() => {
                      setActiveMenu('profile');
                      setShowProfileDropdown(false);
                      setIsMobileMenuOpen(false);
                    }}>
                      <i className="fas fa-user"></i>
                      View Profile
                    </ProfileDropdownItem>
                    <ProfileDropdownItem onClick={() => {
                      onEditProfile();
                      setShowProfileDropdown(false);
                      setIsMobileMenuOpen(false);
                    }}>
                      <i className="fas fa-edit"></i>
                      Edit Profile
                    </ProfileDropdownItem>
                    <ProfileDropdownItem onClick={() => {
                      onChangePassword();
                      setShowProfileDropdown(false);
                      setIsMobileMenuOpen(false);
                    }}>
                      <i className="fas fa-lock"></i>
                      Change Password
                    </ProfileDropdownItem>
                    <ProfileDropdownItem onClick={() => {
                      handleLogout();
                      setShowProfileDropdown(false);
                      setIsMobileMenuOpen(false);
                    }}>
                      <i className="fas fa-sign-out-alt"></i>
                      Logout
                    </ProfileDropdownItem>
                  </MobileProfileDropdown>
                </ProfileDropdownContainer>
                <div className="user-details">
                  <div className="user-name">{user?.name || user?.username}</div>
                  <div className="user-role">{user?.role}</div>
                </div>
              </MobileUserInfo>
            </MobileUserProfile>
          </MobileMenuContent>
        </MobileMenu>
      )}
    </>
  );
};

export default ResponsiveNavigation;
