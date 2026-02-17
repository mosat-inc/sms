import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';
import styled from 'styled-components';

const NotificationBell = styled.div`
  position: fixed;
  top: 20px;
  right: 80px;
  z-index: 1001;
  cursor: pointer;
`;

const BellIcon = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isLoading'
})`
  background: ${props => props.isLoading ? 'rgba(59, 130, 246, 0.9)' : 'rgba(16, 185, 129, 0.9)'};
  color: white;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  box-shadow: 0 4px 12px ${props => props.isLoading ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
  transition: all 0.3s ease;
  position: relative;
  
  ${props => props.isLoading && `
    animation: pulse 1.5s ease-in-out infinite;
    
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
  `}

  &:hover {
    background: ${props => props.isLoading ? 'rgba(59, 130, 246, 1)' : 'rgba(16, 185, 129, 1)'};
    transform: scale(1.05);
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #dc2626;
  color: white;
  border-radius: 50%;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const NotificationDropdown = styled.div`
  position: absolute;
  top: 55px;
  right: 0;
  width: 350px;
  max-height: 500px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  overflow: hidden;
  transform: ${props => (props.$show ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)')};
  opacity: ${props => (props.$show ? '1' : '0')};
  visibility: ${props => (props.$show ? 'visible' : 'hidden')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const NotificationHeader = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(16, 185, 129, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NotificationTitle = styled.h4`
  color: #fff;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
`;

const MarkAllRead = styled.button`
  background: none;
  border: none;
  color: #10b981;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(16, 185, 129, 0.1);
  }
`;

const NotificationList = styled.div`
  max-height: 400px;
  overflow-y: auto;
`;

const NotificationItem = styled.div`
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.2s ease;
  background: ${props => props.unread ? 'rgba(16, 185, 129, 0.05)' : 'transparent'};

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 10px;
`;

const NotificationItemTitle = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  flex: 1;
  line-height: 1.3;
`;

const PriorityIndicator = styled.span`
  background: ${props => {
    switch(props.priority?.toLowerCase()) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#2563eb';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }};
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
`;

const NotificationItemContent = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const NotificationItemMeta = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  display: flex;
  justify-content: space-between;
`;

const EmptyNotifications = styled.div`
  padding: 30px 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
`;

const AnnouncementNotifications = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    resetLoadingState
  } = useRealtimeNotifications();

  // Expose refresh function globally so Communication component can call it
  useEffect(() => {
    window.refreshNotifications = refresh;
    return () => {
      delete window.refreshNotifications;
    };
  }, [refresh]);

  const handleNotificationClick = async (notification) => {
    try {
      console.log('Marking notification as read:', notification.id, notification.title);
      await markAsRead(notification.id);
      console.log('Notification marked as read successfully');
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Still close dropdown even if marking as read failed
      setShowDropdown(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPriorityText = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'urgent': return '🚨 Urgent';
      case 'high': return '⚠️ High';
      case 'medium': return '📢 Medium';
      case 'low': return '📝 Low';
      default: return '📢';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <NotificationBell className="notification-container">
      <BellIcon 
        isLoading={loading} 
        onClick={() => setShowDropdown(!showDropdown)}
        onDoubleClick={() => {
          if (loading) {
            console.log('Double-click detected on loading bell, resetting...');
            resetLoadingState && resetLoadingState();
          }
        }}
        title={loading ? "Double-click to reset if stuck loading" : "Click to view notifications"}
      >
        <i className={loading ? "fas fa-sync fa-spin" : "fas fa-bell"}></i>
        {unreadCount > 0 && (
          <NotificationBadge>
            {unreadCount > 99 ? '99+' : unreadCount}
          </NotificationBadge>
        )}
      </BellIcon>

      <NotificationDropdown $show={showDropdown}>
        <NotificationHeader>
          <NotificationTitle>
            Announcements {unreadCount > 0 && `(${unreadCount})`}
          </NotificationTitle>
          {unreadCount > 0 && (
            <MarkAllRead onClick={markAllAsRead}>
              Mark all read
            </MarkAllRead>
          )}
        </NotificationHeader>

        <NotificationList>
          {loading ? (
            <EmptyNotifications>Loading...</EmptyNotifications>
          ) : notifications.length > 0 ? (
            notifications.slice(0, 10).map((notification) => {
              const isUnread = !notification.is_read;
              
              return (
                <NotificationItem
                  key={notification.id}
                  unread={isUnread}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationItemHeader>
                    <NotificationItemTitle>
                      {notification.title}
                    </NotificationItemTitle>
                    <PriorityIndicator priority={notification.priority} />
                  </NotificationItemHeader>
                  
                  <NotificationItemContent>
                    {notification.content.substring(0, 100)}
                    {notification.content.length > 100 && '...'}
                  </NotificationItemContent>
                  
                  <NotificationItemMeta>
                    <span>{getPriorityText(notification.priority)}</span>
                    <span>{formatTimeAgo(notification.created_at)}</span>
                  </NotificationItemMeta>
                </NotificationItem>
              );
            })
          ) : (
            <EmptyNotifications>
              <i className="fas fa-bell-slash" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }}></i>
              No announcements
            </EmptyNotifications>
          )}
        </NotificationList>
      </NotificationDropdown>
    </NotificationBell>
  );
};

export default AnnouncementNotifications;
