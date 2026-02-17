import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const TestContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  color: white;
`;

const TestCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const TestTitle = styled.h2`
  color: #60a5fa;
  margin-bottom: 20px;
`;

const InfoSection = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border-left: 4px solid #3b82f6;
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
`;

const TokenInfo = styled.div`
  font-family: 'Courier New', monospace;
  background: rgba(0, 0, 0, 0.3);
  padding: 15px;
  border-radius: 8px;
  margin: 10px 0;
  word-break: break-all;
  font-size: 0.9rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-top: 20px;
`;

const TestButton = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &.primary {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
  }
  
  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
  
  &.danger {
    background: #ef4444;
    color: white;
    
    &:hover {
      background: #dc2626;
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const StatusIndicator = styled.div`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  
  &.valid {
    background: rgba(16, 185, 129, 0.2);
    color: #6ee7b7;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.expired {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  &.warning {
    background: rgba(245, 158, 11, 0.2);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
`;

const TokenTestPage = () => {
  const { user, api, logout } = useAuth();
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationStatus, setValidationStatus] = useState('unknown');

  useEffect(() => {
    decodeCurrentToken();
  }, []);

  const decodeCurrentToken = () => {
    const token = localStorage.getItem('sms_token');
    
    if (!token) {
      setTokenInfo(null);
      return;
    }

    try {
      // Decode JWT token (basic decode, not verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const timeUntilExpiry = payload.exp - currentTime;
      
      setTokenInfo({
        decoded: payload,
        expiresAt: new Date(payload.exp * 1000),
        currentTime: new Date(currentTime * 1000),
        timeUntilExpiry: Math.floor(timeUntilExpiry),
        isExpired: timeUntilExpiry <= 0,
        isNearExpiry: timeUntilExpiry <= 120 && timeUntilExpiry > 0
      });

      // Set validation status
      if (timeUntilExpiry <= 0) {
        setValidationStatus('expired');
      } else if (timeUntilExpiry <= 120) {
        setValidationStatus('warning');
      } else {
        setValidationStatus('valid');
      }
      
    } catch (error) {
      console.error('Error decoding token:', error);
      setTokenInfo(null);
      setValidationStatus('expired');
    }
  };

  const validateTokenWithServer = async () => {
    setLoading(true);
    
    try {
      const response = await api.get('/api/auth/validate-token');
      
      if (response.data.success) {
        toast.success('Token is valid on server');
        decodeCurrentToken(); // Refresh local token info
      }
    } catch (error) {
      toast.error('Token validation failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const extendSession = async () => {
    setLoading(true);
    
    try {
      const response = await api.post('/api/auth/extend-session');
      
      if (response.data.success) {
        const { token } = response.data.data;
        localStorage.setItem('sms_token', token);
        toast.success('Session extended successfully!');
        decodeCurrentToken(); // Refresh token info
        setValidationStatus('valid');
      }
    } catch (error) {
      toast.error('Failed to extend session: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const simulateExpiredToken = () => {
    // Create a token that expired 5 minutes ago
    const expiredPayload = {
      ...tokenInfo?.decoded,
      exp: Math.floor(Date.now() / 1000) - 300 // 5 minutes ago
    };
    
    const fakeToken = 'fake.' + btoa(JSON.stringify(expiredPayload)) + '.signature';
    localStorage.setItem('sms_token', fakeToken);
    
    toast.warning('Simulated expired token set');
    decodeCurrentToken();
  };

  const simulateNearExpiryToken = () => {
    // Create a token that expires in 1 minute
    const nearExpiryPayload = {
      ...tokenInfo?.decoded,
      exp: Math.floor(Date.now() / 1000) + 60 // 1 minute from now
    };
    
    const fakeToken = 'fake.' + btoa(JSON.stringify(nearExpiryPayload)) + '.signature';
    localStorage.setItem('sms_token', fakeToken);
    
    toast.info('Simulated near-expiry token set (expires in 1 minute)');
    decodeCurrentToken();
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'Expired';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <TestContainer>
      <TestCard>
        <TestTitle>🔐 Token Management Test Page</TestTitle>
        
        <InfoSection>
          <h4>Current Authentication Status</h4>
          <p><strong>User:</strong> {user?.username} ({user?.role})</p>
          <p>
            <strong>Token Status:</strong>{' '}
            <StatusIndicator className={validationStatus}>
              {validationStatus === 'valid' && 'Valid'}
              {validationStatus === 'warning' && 'Expires Soon'}
              {validationStatus === 'expired' && 'Expired'}
              {validationStatus === 'unknown' && 'Unknown'}
            </StatusIndicator>
          </p>
        </InfoSection>

        {tokenInfo && (
          <TestCard>
            <h4>Token Information</h4>
            <p><strong>Expires At:</strong> {tokenInfo.expiresAt.toLocaleString()}</p>
            <p><strong>Current Time:</strong> {tokenInfo.currentTime.toLocaleString()}</p>
            <p>
              <strong>Time Until Expiry:</strong>{' '}
              <span style={{ color: tokenInfo.isExpired ? '#ef4444' : tokenInfo.isNearExpiry ? '#f59e0b' : '#10b981' }}>
                {formatTime(tokenInfo.timeUntilExpiry)}
              </span>
            </p>
            
            <details style={{ marginTop: '15px' }}>
              <summary style={{ cursor: 'pointer', color: '#60a5fa' }}>
                View Token Payload
              </summary>
              <TokenInfo>
                {JSON.stringify(tokenInfo.decoded, null, 2)}
              </TokenInfo>
            </details>
          </TestCard>
        )}

        <ButtonGroup>
          <TestButton 
            className="primary" 
            onClick={decodeCurrentToken}
          >
            🔄 Refresh Token Info
          </TestButton>
          
          <TestButton 
            className="secondary" 
            onClick={validateTokenWithServer}
            disabled={loading}
          >
            ✅ Validate with Server
          </TestButton>
          
          <TestButton 
            className="primary" 
            onClick={extendSession}
            disabled={loading}
          >
            ⏰ Extend Session
          </TestButton>
        </ButtonGroup>

        <TestCard style={{ marginTop: '30px' }}>
          <h4 style={{ color: '#f59e0b' }}>⚠️ Testing Tools (Development Only)</h4>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            These buttons simulate different token states for testing the automatic logout functionality.
          </p>
          
          <ButtonGroup>
            <TestButton 
              className="secondary" 
              onClick={simulateNearExpiryToken}
            >
              🔔 Simulate Near Expiry (1min)
            </TestButton>
            
            <TestButton 
              className="danger" 
              onClick={simulateExpiredToken}
            >
              ❌ Simulate Expired Token
            </TestButton>
            
            <TestButton 
              className="danger" 
              onClick={logout}
            >
              🚪 Manual Logout
            </TestButton>
          </ButtonGroup>
        </TestCard>
      </TestCard>
    </TestContainer>
  );
};

export default TokenTestPage;
