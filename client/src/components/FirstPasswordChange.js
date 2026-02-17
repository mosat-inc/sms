import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

// Styled Components (matching Login component style)
const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  text-align: center;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const Header = styled.div`
  margin-bottom: 30px;

  h1 {
    color: #333;
    font-size: 2.2rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    color: #666;
    font-size: 1rem;
    line-height: 1.5;
    margin-bottom: 0;
  }
`;

const InfoBox = styled.div`
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  text-align: left;

  .info-title {
    color: #667eea;
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .info-text {
    color: #555;
    font-size: 0.9rem;
    line-height: 1.4;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 20px;
  text-align: left;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.95rem;
`;

const InputWrapper = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  padding: 15px;
  padding-right: 45px;
  border: 2px solid ${props => props.error ? '#ef4444' : '#e1e5e9'};
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.error ? '#ef4444' : '#667eea'};
    box-shadow: 0 0 0 3px ${props => props.error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(102, 126, 234, 0.1)'};
  }

  &::placeholder {
    color: #999;
  }
`;

const TogglePasswordButton = styled.button`
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 5px;
  
  &:hover {
    color: #333;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.85rem;
  margin-top: 8px;
`;

const PasswordStrengthIndicator = styled.div`
  margin-top: 10px;
  
  .strength-label {
    font-size: 0.85rem;
    margin-bottom: 6px;
    color: #555;
    font-weight: 500;
  }
  
  .strength-bar {
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
  }
  
  .strength-fill {
    height: 100%;
    transition: all 0.3s ease;
    border-radius: 3px;
    
    &.weak {
      width: 25%;
      background: #ef4444;
    }
    
    &.fair {
      width: 50%;
      background: #f97316;
    }
    
    &.good {
      width: 75%;
      background: #eab308;
    }
    
    &.strong {
      width: 100%;
      background: #22c55e;
    }
  }
`;

const Button = styled.button`
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  display: ${props => props.$show ? 'inline-flex' : 'none'};
  align-items: center;
  gap: 8px;

  .spinner {
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FirstPasswordChange = () => {
  const { firstPasswordChange } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false
  });
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  // Get user info from location state (passed from login)
  const tempToken = location.state?.tempToken;
  const user = location.state?.user;
  
  // Debug logging
  console.log('📝 FirstPasswordChange component loaded with:', {
    has_location_state: !!location.state,
    has_tempToken: !!tempToken,
    has_user: !!user,
    user_id: user?.id,
    username: user?.username,
    location_state: location.state
  });

  // Redirect if no temp token (shouldn't happen)
  useEffect(() => {
    if (!tempToken) {
      toast.error('Invalid access. Please login again.');
      navigate('/login');
    }
  }, [tempToken, navigate]);
  
  // Cleanup temp token on component unmount
  useEffect(() => {
    return () => {
      // Clean up temp token if component unmounts
      if (tempToken) {
        localStorage.removeItem('sms_token');
      }
    };
  }, [tempToken]);

  const getPasswordStrength = (password) => {
    if (password.length < 6) return 'weak';
    if (password.length < 8) return 'fair';
    
    let strength = 0;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    if (strength < 2) return 'fair';
    if (strength < 3) return 'good';
    return 'strong';
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters long';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter, lowercase letter, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // Temporarily store the token for API calls
      if (tempToken) {
        localStorage.setItem('sms_token', tempToken);
      }
      
      // Use the first-time password change API
      const passwordData = {
        new_password: formData.newPassword,
        confirm_password: formData.confirmPassword
      };
      
      const result = await firstPasswordChange(passwordData);
      
      if (result.success) {
        toast.success(result.message || 'Password set successfully!');
        toast.info('Please login with your new password');
        
        // Clear form data
        setFormData({
          newPassword: '',
          confirmPassword: ''
        });
        
        // Clear the temporary token
        localStorage.removeItem('sms_token');
        
        // Redirect to login page after short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(result.message || 'Failed to set password');
        // Clear the temporary token on failure too
        localStorage.removeItem('sms_token');
      }
    } catch (error) {
      console.error('First password change error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to set password';
      toast.error(errorMessage);
      // Clear the temporary token on error
      localStorage.removeItem('sms_token');
    } finally {
      setLoading(false);
    }
  };

  if (!tempToken) {
    return null; // Will redirect in useEffect
  }

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <PageContainer>
      <Card>
        <Header>
          <h1>🔐 Set Your Password</h1>
          <p>Welcome{user?.name ? `, ${user.name}` : ''}! Please create a secure password to complete your account setup.</p>
        </Header>

        <InfoBox>
          <div className="info-title">
            <i className="fas fa-info-circle"></i>
            First Time Login
          </div>
          <div className="info-text">
            You're logging in with a temporary password. For security, you must set a new permanent password before accessing the system.
          </div>
        </InfoBox>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>New Password</Label>
            <InputWrapper>
              <Input
                type={showPasswords.new ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Create a strong password"
                error={errors.newPassword}
              />
              <TogglePasswordButton
                type="button"
                onClick={() => togglePasswordVisibility('new')}
              >
                <i className={`fas ${showPasswords.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </TogglePasswordButton>
            </InputWrapper>
            {formData.newPassword && (
              <PasswordStrengthIndicator>
                <div className="strength-label">
                  Password strength: <span style={{ textTransform: 'capitalize', color: passwordStrength === 'strong' ? '#22c55e' : passwordStrength === 'good' ? '#eab308' : passwordStrength === 'fair' ? '#f97316' : '#ef4444' }}>{passwordStrength}</span>
                </div>
                <div className="strength-bar">
                  <div className={`strength-fill ${passwordStrength}`}></div>
                </div>
              </PasswordStrengthIndicator>
            )}
            {errors.newPassword && (
              <ErrorMessage>{errors.newPassword}</ErrorMessage>
            )}
          </FormGroup>

          <FormGroup>
            <Label>Confirm Password</Label>
            <InputWrapper>
              <Input
                type={showPasswords.confirm ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your new password"
                error={errors.confirmPassword}
              />
              <TogglePasswordButton
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
              >
                <i className={`fas ${showPasswords.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </TogglePasswordButton>
            </InputWrapper>
            {errors.confirmPassword && (
              <ErrorMessage>{errors.confirmPassword}</ErrorMessage>
            )}
          </FormGroup>

          <Button type="submit" disabled={loading}>
            <LoadingSpinner $show={loading}>
              <div className="spinner"></div>
              Setting password...
            </LoadingSpinner>
            {!loading && (
              <>
                <i className="fas fa-lock" style={{ marginRight: '8px' }}></i>
                Set Password
              </>
            )}
          </Button>
        </Form>
      </Card>
    </PageContainer>
  );
};

export default FirstPasswordChange;
