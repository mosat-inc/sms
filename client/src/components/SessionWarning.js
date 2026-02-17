import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const WarningModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: ${props => (props.$show ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const WarningContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
`;

const WarningIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 20px;
  color: #f59e0b;
`;

const WarningTitle = styled.h2`
  color: #1f2937;
  margin-bottom: 15px;
  font-size: 1.5rem;
`;

const WarningMessage = styled.p`
  color: #6b7280;
  margin-bottom: 25px;
  line-height: 1.5;
`;

const CountdownText = styled.div`
  color: #ef4444;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 25px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  
  &.primary {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
  }
  
  &.secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    
    &:hover {
      background: #e5e7eb;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const SessionWarning = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [extending, setExtending] = useState(false);
  const { logout, api } = useAuth();

  useEffect(() => {
    let warningTimer;
    let countdownTimer;
    let logoutTimer;

    const checkTokenExpiry = () => {
      const token = localStorage.getItem('sms_token');
      
      if (!token) return;

      try {
        // Decode JWT token to get expiry
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - currentTime;

        // Show warning 2 minutes before expiry
        if (timeUntilExpiry <= 120 && timeUntilExpiry > 0 && !showWarning) {
          setShowWarning(true);
          setCountdown(Math.floor(timeUntilExpiry));

          // Start countdown
          countdownTimer = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                handleAutoLogout();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Error decoding token for expiry check:', error);
      }
    };

    const handleAutoLogout = async () => {
      setShowWarning(false);
      toast.warning('Your session has expired. You have been logged out.');
      await logout();
    };

    // Check token expiry every 30 seconds
    const checkInterval = setInterval(checkTokenExpiry, 30000);
    
    // Initial check
    checkTokenExpiry();

    return () => {
      clearInterval(checkInterval);
      clearInterval(countdownTimer);
      clearTimeout(logoutTimer);
    };
  }, [showWarning, logout]);

  const handleExtendSession = async () => {
    setExtending(true);
    
    try {
      // Call an endpoint to refresh/extend the token
      const response = await api.post('/api/auth/extend-session');
      
      if (response.data.success) {
        const { token } = response.data.data;
        localStorage.setItem('sms_token', token);
        setShowWarning(false);
        toast.success('Session extended successfully!');
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      toast.error('Failed to extend session. Please login again.');
      await logout();
    } finally {
      setExtending(false);
    }
  };

  const handleLogoutNow = async () => {
    setShowWarning(false);
    await logout();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <WarningModal $show={showWarning}>
      <WarningContent>
        <WarningIcon>⏰</WarningIcon>
        <WarningTitle>Session Expiring Soon</WarningTitle>
        <WarningMessage>
          Your session is about to expire due to inactivity. 
          You will be automatically logged out in:
        </WarningMessage>
        <CountdownText>
          {formatTime(countdown)}
        </CountdownText>
        <ButtonGroup>
          <Button 
            className="primary" 
            onClick={handleExtendSession}
            disabled={extending}
          >
            {extending ? 'Extending...' : 'Extend Session'}
          </Button>
          <Button 
            className="secondary" 
            onClick={handleLogoutNow}
            disabled={extending}
          >
            Logout Now
          </Button>
        </ButtonGroup>
      </WarningContent>
    </WarningModal>
  );
};

export default SessionWarning;
