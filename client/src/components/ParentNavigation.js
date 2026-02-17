import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import useDevice, { mediaQuery, touchSizes } from '../hooks/useDevice';
import { useParentNotifications } from '../contexts/ParentNotificationsContext';

const NavContainer = styled.nav`
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  color: white;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
`;

const NavContent = styled.div`
  width: 100%;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 98px;
  box-sizing: border-box;

  ${mediaQuery('tablet')} {
    padding: 0 15px;
    height: 82px;
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  cursor: default;

  .logo-icon {
    font-size: 1.9rem;
  }

  .logo-text {
    ${mediaQuery('mobile')} {
      display: none;
    }
  }
`;

const DesktopNav = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;

  ${mediaQuery('laptop')} {
    display: none;
  }
`;

const NavItems = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const NavItem = styled.button`
  background: ${(p) =>
    p.$active ? 'linear-gradient(135deg, rgba(96,165,250,0.35), rgba(167,139,250,0.28))' : 'transparent'};
  border: none;
  color: white;
  font-size: 0.95rem;
  font-weight: 900;
  cursor: pointer;
  padding: 10px 14px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  position: relative;
  transition: background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
  min-height: ${touchSizes.minTouchTarget};
  outline: none;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 55%);
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: -10px;
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(96, 165, 250, 0), rgba(255, 255, 255, 0.95), rgba(167, 139, 250, 0));
    opacity: ${(p) => (p.$active ? 0.95 : 0)};
    transform: ${(p) => (p.$active ? 'translateY(0)' : 'translateY(-6px)')};
    transition: opacity 0.25s ease, transform 0.25s ease;
    pointer-events: none;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.34), rgba(167, 139, 250, 0.24));
    transform: translateY(-2px);
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.22);
    filter: saturate(1.12) brightness(1.03);

    &::before {
      opacity: 1;
    }

    &::after {
      opacity: 0.9;
      transform: translateY(0);
    }
  }

  &:active {
    transform: translateY(-1px);
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.28), 0 14px 26px rgba(0, 0, 0, 0.18);
  }
`;

const RightSide = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BellWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  ${mediaQuery('tablet')} {
    display: none;
  }
`;

const BellButton = styled.button`
  border: none;
  cursor: pointer;
  border-radius: 999px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 950;
  letter-spacing: 0.02em;
  min-height: ${touchSizes.minTouchTarget};
  min-width: ${touchSizes.minTouchTarget};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.18);
    box-shadow: 0 14px 26px rgba(0, 0, 0, 0.18);
  }
`;

const BellBadge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 950;
  color: #fff;
  background: linear-gradient(135deg, #ef4444, #f97316);
  box-shadow: 0 10px 20px rgba(239, 68, 68, 0.28);
`;

const BellMenu = styled.div`
  position: absolute;
  right: 0;
  top: calc(100% + 10px);
  width: 360px;
  max-width: calc(100vw - 32px);
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  box-shadow: 0 30px 60px rgba(15, 23, 42, 0.2);
  backdrop-filter: blur(12px);
  overflow: hidden;
  z-index: 1100;
`;

const BellHeader = styled.div`
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);

  .title {
    font-weight: 950;
    letter-spacing: -0.01em;
  }
`;

const BellAction = styled.button`
  border: none;
  cursor: pointer;
  border-radius: 999px;
  padding: 8px 10px;
  font-weight: 950;
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.09);
    transform: translateY(-1px);
    box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  }
`;

const BellList = styled.div`
  max-height: 360px;
  overflow: auto;
`;

const BellItem = styled.button`
  width: 100%;
  text-align: left;
  border: none;
  cursor: pointer;
  padding: 12px 14px;
  background: ${(p) => (p.$unread ? 'rgba(99, 102, 241, 0.08)' : 'transparent')};
  color: inherit;
  display: grid;
  gap: 4px;
  transition: background 0.18s ease;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
  }

  .t {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-weight: 950;
    letter-spacing: -0.01em;
  }

  .m {
    font-size: 0.85rem;
    font-weight: 800;
    color: rgba(15, 23, 42, 0.72);
    line-height: 1.45;
  }

  .meta {
    font-size: 0.78rem;
    font-weight: 800;
    color: rgba(15, 23, 42, 0.55);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
`;

const formatTimeAgo = (dateString) => {
  if (!dateString) return '—';
  const now = new Date();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const StudentBadge = styled.div`
  display: grid;
  gap: 2px;
  text-align: right;

  .k {
    opacity: 0.85;
    font-size: 0.78rem;
    font-weight: 800;
  }

  .v {
    font-size: 0.92rem;
    font-weight: 900;
    max-width: 220px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ${mediaQuery('tablet')} {
    display: none;
  }
`;

const LogoutButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 10px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 950;
  letter-spacing: 0.02em;
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  min-height: ${touchSizes.minTouchTarget};

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgba(0, 0, 0, 0.18);
    border-color: rgba(255, 255, 255, 0.32);
  }

  ${mediaQuery('tablet')} {
    display: none;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 14px;
  min-width: ${touchSizes.minTouchTarget};
  min-height: ${touchSizes.minTouchTarget};
  transition: transform 0.25s ease, background 0.25s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-1px);
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
  opacity: ${(p) => (p.$isOpen ? 1 : 0)};
  pointer-events: ${(p) => (p.$isOpen ? 'auto' : 'none')};
  transition: opacity 0.25s ease;
`;

const MobileMenuContent = styled.div`
  background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 100%);
  width: 280px;
  height: 100%;
  padding: 20px;
  transform: ${(p) => (p.$isOpen ? 'translateX(0)' : 'translateX(-100%)')};
  transition: transform 0.25s ease;
  overflow-y: auto;
`;

const MobileMenuHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
`;

const MobileCloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 8px;
  border-radius: 10px;
  min-width: ${touchSizes.minTouchTarget};
  min-height: ${touchSizes.minTouchTarget};

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
`;

const MobileNavItems = styled.div`
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
`;

const MobileNavItem = styled.button`
  width: 100%;
  background: ${(p) => (p.$active ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.1)')};
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: white;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: ${touchSizes.minTouchTarget};
  transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;

  &:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.16);
    box-shadow: 0 14px 26px rgba(0, 0, 0, 0.16);
    border-color: rgba(255, 255, 255, 0.22);
  }
`;

const MobileStudent = styled.div`
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  opacity: 0.92;
  font-weight: 800;
  line-height: 1.45;
`;

const MobileLogout = styled.button`
  width: 100%;
  margin-top: 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: white;
  padding: 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 900;
  min-height: ${touchSizes.minTouchTarget};

  &:hover {
    background: rgba(255, 255, 255, 0.16);
  }
`;

const ParentNavigation = ({ activeMenu, setActiveMenu, studentName, onLogout }) => {
  const device = useDevice();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useParentNotifications();

  const items = useMemo(
    () => [
      { id: 'overview', label: 'Overview', icon: '🏠' },
      { id: 'attendance', label: 'Attendance', icon: '📋' },
      { id: 'grades', label: 'Grades', icon: '📊' },
      { id: 'payments', label: 'Payments', icon: '💳' },
      { id: 'announcements', label: 'Announcements', icon: '📢' },
      { id: 'notifications', label: 'Notifications', icon: '🔔' },
      { id: 'profile', label: 'Profile', icon: '👤' },
      { id: 'feedback', label: 'Parent Feedback', icon: '💬' },
    ],
    []
  );

  useEffect(() => {
    if (!device.isMobile && !device.isTablet) setIsMobileMenuOpen(false);
  }, [device.isMobile, device.isTablet]);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setIsBellOpen(false);
    };
    const onClick = (e) => {
      if (!isBellOpen) return;
      const within = e.target?.closest?.('[data-parent-bell]');
      if (!within) setIsBellOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('click', onClick);
    };
  }, [isBellOpen]);

  const go = (id) => {
    setActiveMenu(id);
    setIsMobileMenuOpen(false);
    setIsBellOpen(false);
  };

  return (
    <>
      <NavContainer>
        <NavContent>
          <Logo>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">UBUNIFU SEC</span>
          </Logo>

          <DesktopNav>
            <NavItems>
              {items.map((item) => (
                <NavItem key={item.id} type="button" $active={activeMenu === item.id} onClick={() => go(item.id)}>
                  {item.label}
                </NavItem>
              ))}
            </NavItems>
          </DesktopNav>

          <RightSide>
            <BellWrap data-parent-bell>
              <BellButton type="button" aria-label="Announcements" onClick={() => setIsBellOpen((v) => !v)}>
                🔔
              </BellButton>
              {unreadCount > 0 ? <BellBadge>{unreadCount > 99 ? '99+' : unreadCount}</BellBadge> : null}

              {isBellOpen ? (
                <BellMenu role="menu" aria-label="Announcements menu">
                  <BellHeader>
                    <div className="title">Announcements</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <BellAction
                        type="button"
                        disabled={loading || unreadCount === 0}
                        onClick={async () => {
                          await markAllAsRead();
                        }}
                      >
                        Mark all read
                      </BellAction>
                      <BellAction type="button" onClick={() => go('announcements')}>
                        View
                      </BellAction>
                    </div>
                  </BellHeader>

                  <BellList>
                    {(notifications || []).slice(0, 6).map((n) => (
                      <BellItem
                        key={n.id}
                        type="button"
                        $unread={!n.is_read}
                        onClick={async () => {
                          if (!n.is_read) await markAsRead(n.id);
                          go('announcements');
                        }}
                      >
                        <div className="t">
                          <span>
                            {!n.is_read ? '● ' : ''}
                            {n.title || 'Announcement'}
                          </span>
                          <span style={{ fontSize: 12, opacity: 0.75 }}>{formatTimeAgo(n.created_at)}</span>
                        </div>
                        <div className="m">
                          {String(n.content || '').slice(0, 90)}
                          {String(n.content || '').length > 90 ? '…' : ''}
                        </div>
                        <div className="meta">
                          <span>{n.class_name ? n.class_name : 'General'}</span>
                          <span>{n.author_name ? `By ${n.author_name}` : ''}</span>
                        </div>
                      </BellItem>
                    ))}

                    {!loading && (!notifications || notifications.length === 0) ? (
                      <div style={{ padding: 14, color: 'rgba(15,23,42,0.65)', fontWeight: 800 }}>No announcements</div>
                    ) : null}
                    {loading && (!notifications || notifications.length === 0) ? (
                      <div style={{ padding: 14, color: 'rgba(15,23,42,0.65)', fontWeight: 800 }}>Loading…</div>
                    ) : null}
                  </BellList>
                </BellMenu>
              ) : null}
            </BellWrap>

            <StudentBadge>
              <div className="k">Viewing</div>
              <div className="v">{studentName || 'Your student'}</div>
            </StudentBadge>

            <LogoutButton type="button" onClick={onLogout}>
              Logout
            </LogoutButton>

            <MobileMenuButton type="button" aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)}>
              ☰
            </MobileMenuButton>
          </RightSide>
        </NavContent>
      </NavContainer>

      <MobileMenu $isOpen={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(false)}>
        <MobileMenuContent $isOpen={isMobileMenuOpen} onClick={(e) => e.stopPropagation()}>
          <MobileMenuHeader>
            <div style={{ fontWeight: 950, letterSpacing: '0.08em' }}>MENU</div>
            <MobileCloseButton type="button" aria-label="Close menu" onClick={() => setIsMobileMenuOpen(false)}>
              ✕
            </MobileCloseButton>
          </MobileMenuHeader>

          <MobileNavItems>
            {items.map((item) => (
              <MobileNavItem key={item.id} type="button" $active={activeMenu === item.id} onClick={() => go(item.id)}>
                <span>
                  <span style={{ marginRight: 10 }}>{item.icon}</span>
                  {item.label}
                </span>
                <span style={{ opacity: 0.85 }}>›</span>
              </MobileNavItem>
            ))}
          </MobileNavItems>

          <MobileStudent>
            <div style={{ opacity: 0.85, fontSize: '0.86rem' }}>You’re viewing</div>
            <div style={{ fontWeight: 950 }}>{studentName || 'Your student'}</div>
          </MobileStudent>

          <MobileLogout type="button" onClick={onLogout}>
            Logout
          </MobileLogout>
        </MobileMenuContent>
      </MobileMenu>
    </>
  );
};

export default ParentNavigation;
