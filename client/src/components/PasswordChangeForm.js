import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import { FaKey, FaEye, FaEyeSlash, FaLock, FaCheck, FaTimes } from 'react-icons/fa';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const FormCard = styled.div`
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
    font-size: 2rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  p {
    color: #666;
    font-size: 1rem;
    line-height: 1.5;
  }
`;

const AlertBox = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 25px;
  color: #f59e0b;
  text-align: left;
  
  .title {
    font-weight: 600;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  text-align: left;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.9rem;
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 15px;
  padding-right: 50px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &.error {
    border-color: #e53e3e;
  }

  &.success {
    border-color: #22c55e;
  }
`;

const ToggleButton = styled.button`
  position: absolute;
  right: 15px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  font-size: 1rem;
  
  &:hover {
    color: #333;
  }
`;

const PasswordStrength = styled.div`
  margin-top: 8px;
  font-size: 0.8rem;
  
  .strength-bar {
    height: 4px;
    background: #e1e5e9;
    border-radius: 2px;
    overflow: hidden;
    margin: 8px 0;
    
    .strength-fill {
      height: 100%;
      transition: all 0.3s ease;
      
      &.weak { width: 25%; background: #e53e3e; }
      &.fair { width: 50%; background: #f59e0b; }
      &.good { width: 75%; background: #3b82f6; }
      &.strong { width: 100%; background: #22c55e; }
    }
  }
  
  .requirements {
    list-style: none;
    padding: 0;
    margin: 10px 0;
    
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 0.8rem;
      
      &.valid {
        color: #22c55e;
      }
      
      &.invalid {
        color: #e53e3e;
      }
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
  display: ${props => (props.$show ? 'block' : 'none')};
  margin: 20px 0;

  .spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
    margin: 0 auto;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  p {
    margin-top: 10px;
    color: #666;
  }
`;

const PasswordChangeForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    temp_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    temp_password: false,
    new_password: false,
    confirm_password: false
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('weak');
  const { api } = useAuth();

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };

    const score = Object.values(requirements).filter(Boolean).length;
    
    if (score < 3) return 'weak';
    if (score < 4) return 'fair';
    if (score < 5) return 'good';
    return 'strong';
  };

  const getPasswordRequirements = (password) => [
    { text: 'At least 8 characters', valid: password.length >= 8 },
    { text: 'One uppercase letter', valid: /[A-Z]/.test(password) },
    { text: 'One lowercase letter', valid: /[a-z]/.test(password) },
    { text: 'One number', valid: /\d/.test(password) },
    { text: 'One special character (@$!%*?&)', valid: /[@$!%*?&]/.test(password) }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'new_password') {
      setPasswordStrength(validatePassword(value));
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
    
    // Validation
    if (!formData.temp_password || !formData.new_password || !formData.confirm_password) {
      toast.error('All fields are required');
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast.error('New password and confirmation do not match');
      return;
    }

    if (passwordStrength === 'weak') {
      toast.error('Please choose a stronger password');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/api/auth/change-temp-password', {
        temp_password: formData.temp_password,
        new_password: formData.new_password,
        confirm_password: formData.confirm_password
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Call onSuccess callback to redirect or refresh
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const requirements = getPasswordRequirements(formData.new_password);
  const allRequirementsMet = requirements.every(req => req.valid);

  return (
    <Container>
      <FormCard>
        <Header>
          <h1><FaKey /> Change Password</h1>
          <p>Your account is using a temporary password. Please create a new secure password to continue.</p>
        </Header>

        <AlertBox>
          <div className="title">
            <FaLock /> Security Notice
          </div>
          <div>
            For your security, you must change your temporary password before accessing the system.
            Your new password should be unique and not used elsewhere.
          </div>
        </AlertBox>

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="temp_password">Current Temporary Password *</Label>
            <InputContainer>
              <Input
                type={showPasswords.temp_password ? "text" : "password"}
                id="temp_password"
                name="temp_password"
                value={formData.temp_password}
                onChange={handleInputChange}
                required
                disabled={loading}
                placeholder="Enter the temporary password provided to you"
              />
              <ToggleButton
                type="button"
                onClick={() => togglePasswordVisibility('temp_password')}
              >
                {showPasswords.temp_password ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </InputContainer>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="new_password">New Password *</Label>
            <InputContainer>
              <Input
                type={showPasswords.new_password ? "text" : "password"}
                id="new_password"
                name="new_password"
                value={formData.new_password}
                onChange={handleInputChange}
                required
                disabled={loading}
                className={passwordStrength === 'weak' ? 'error' : passwordStrength === 'strong' ? 'success' : ''}
                placeholder="Create a strong password"
              />
              <ToggleButton
                type="button"
                onClick={() => togglePasswordVisibility('new_password')}
              >
                {showPasswords.new_password ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </InputContainer>
            
            <PasswordStrength>
              <div className="strength-bar">
                <div className={`strength-fill ${passwordStrength}`}></div>
              </div>
              <div style={{ color: '#666', marginBottom: '8px' }}>
                Password strength: <strong style={{ 
                  color: passwordStrength === 'weak' ? '#e53e3e' : 
                         passwordStrength === 'fair' ? '#f59e0b' : 
                         passwordStrength === 'good' ? '#3b82f6' : '#22c55e' 
                }}>{passwordStrength}</strong>
              </div>
              <ul className="requirements">
                {requirements.map((req, index) => (
                  <li key={index} className={req.valid ? 'valid' : 'invalid'}>
                    {req.valid ? <FaCheck /> : <FaTimes />}
                    {req.text}
                  </li>
                ))}
              </ul>
            </PasswordStrength>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="confirm_password">Confirm New Password *</Label>
            <InputContainer>
              <Input
                type={showPasswords.confirm_password ? "text" : "password"}
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                required
                disabled={loading}
                className={
                  formData.confirm_password && formData.new_password ? 
                    (formData.new_password === formData.confirm_password ? 'success' : 'error') : ''
                }
                placeholder="Confirm your new password"
              />
              <ToggleButton
                type="button"
                onClick={() => togglePasswordVisibility('confirm_password')}
              >
                {showPasswords.confirm_password ? <FaEyeSlash /> : <FaEye />}
              </ToggleButton>
            </InputContainer>
            {formData.confirm_password && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '0.8rem',
                color: formData.new_password === formData.confirm_password ? '#22c55e' : '#e53e3e'
              }}>
                {formData.new_password === formData.confirm_password ? (
                  <span><FaCheck /> Passwords match</span>
                ) : (
                  <span><FaTimes /> Passwords do not match</span>
                )}
              </div>
            )}
          </FormGroup>
          
          <Button 
            type="submit" 
            disabled={loading || !allRequirementsMet || formData.new_password !== formData.confirm_password}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>

        <LoadingSpinner $show={loading}>
          <div className="spinner"></div>
          <p>Updating your password...</p>
        </LoadingSpinner>
      </FormCard>
    </Container>
  );
};

export default PasswordChangeForm;
