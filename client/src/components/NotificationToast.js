import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const isTransientNetworkError = (error) => {
  return (
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.message === 'Network Error' ||
    (!error?.response && !!error?.request)
  );
};

const ToastContainer = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 2000;
  max-width: 400px;
`;

const Toast = styled.div`
  background: rgba(16, 185, 129, 0.95);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(16, 185, 129, 0.3);
  transform: ${props => (props.$show ? 'translateX(0)' : 'translateX(100%)')};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  
  &:hover {
    transform: translateX(-5px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
  }
`;

const ToastHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  gap: 10px;
`;

const ToastTitle = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  flex: 1;
`;

const ToastClose = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  font-size: 1.2rem;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
  }
`;

const ToastContent = styled.div`
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0.9;
  margin-bottom: 5px;
`;

const ToastMeta = styled.div`
  font-size: 0.7rem;
  opacity: 0.7;
  display: flex;
  justify-content: space-between;
`;

const PriorityBadge = styled.span`
  background: ${props => {
    switch(props.priority?.toLowerCase()) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#2563eb';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }};
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: bold;
  text-transform: uppercase;
`;

const NotificationToast = () => {
  const { api } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [lastChecked, setLastChecked] = useState(new Date());

  const checkForNewAnnouncements = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    try {
      const response = await api.get('/api/communication/announcements', {
        params: { 
          status: 'active',
          since: lastChecked.toISOString()
        }
      });
      
      if (response.data.success && response.data.data.length > 0) {
        const newAnnouncements = response.data.data.filter(announcement => 
          new Date(announcement.created_at) > lastChecked && !announcement.is_read
        );
        
        if (newAnnouncements.length > 0) {
          newAnnouncements.forEach(announcement => {
            showToast(announcement);
          });
          setLastChecked(new Date());
        }
      }
    } catch (error) {
      if (!isTransientNetworkError(error)) {
        console.error('Error checking for new announcements:', error);
      }
    }
  }, [api, lastChecked]);

  const showToast = (announcement) => {
    const toastId = `toast-${announcement.id}-${Date.now()}`;
    
    const toast = {
      id: toastId,
      announcement,
      show: false,
      createdAt: Date.now()
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Trigger show animation
    setTimeout(() => {
      setToasts(prev => prev.map(t => 
        t.id === toastId ? { ...t, show: true } : t
      ));
    }, 100);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      removeToast(toastId);
    }, 8000);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.map(t => 
      t.id === toastId ? { ...t, show: false } : t
    ));
    
    // Remove from array after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    }, 300);
  };

  const handleToastClick = async (toast) => {
    try {
      // Mark as read
      await api.post(`/api/communication/announcements/${toast.announcement.id}/mark-read`);
      removeToast(toast.id);
      
      // Optional: Navigate to communication page or show full announcement
      // This could trigger a modal or navigation
    } catch (error) {
      console.error('Error marking announcement as read:', error);
    }
  };

  useEffect(() => {
    // Check for new announcements every 15 seconds for better real-time experience
    const interval = setInterval(checkForNewAnnouncements, 15 * 1000);
    
    // Expose refresh function globally
    window.refreshNotificationToasts = () => {
      checkForNewAnnouncements();
    };
    
    return () => {
      clearInterval(interval);
      delete window.refreshNotificationToasts;
    };
  }, [checkForNewAnnouncements]);

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <ToastContainer>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          $show={toast.show}
          onClick={() => handleToastClick(toast)}
        >
          <ToastHeader>
            <ToastTitle>
              📢 {toast.announcement.title}
            </ToastTitle>
            <ToastClose onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}>
              ×
            </ToastClose>
          </ToastHeader>
          
          <ToastContent>
            {toast.announcement.content.substring(0, 100)}
            {toast.announcement.content.length > 100 && '...'}
          </ToastContent>
          
          <ToastMeta>
            <PriorityBadge priority={toast.announcement.priority}>
              {toast.announcement.priority}
            </PriorityBadge>
            <span>{formatTimeAgo(toast.announcement.created_at)}</span>
          </ToastMeta>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default NotificationToast;
