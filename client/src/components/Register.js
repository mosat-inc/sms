import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const RegisterCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  text-align: center;
  transition: transform 0.3s ease;
  max-height: 90vh;
  overflow-y: auto;

  &:hover {
    transform: translateY(-2px);
  }
`;

const Logo = styled.div`
  margin-bottom: 30px;

  h1 {
    color: #333;
    font-size: 2.5rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    color: #666;
    font-size: 1.1rem;
  }
`;

const FormContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  text-align: left;
  grid-column: ${(props) => (props.$fullWidth ? 'span 2' : 'span 1')};

  @media (max-width: 600px) {
    grid-column: span 2;
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &.error {
    border-color: #e53e3e;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
  background: white;

  &:focus {
    outline: none;
    border-color: #667eea;
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
  margin-bottom: 15px;

  &.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }

  &.btn-secondary {
    background: #f8f9fa;
    color: #333;
    border: 2px solid #e1e5e9;

    &:hover:not(:disabled) {
      background: #e9ecef;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: ${props => props.$show ? 'block' : 'none'};
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

const Links = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;

  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const PasswordStrength = styled.div`
  margin-top: 5px;
  font-size: 0.8rem;
  
  .strength-bar {
    height: 3px;
    background: #e1e5e9;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 5px;
    
    .strength-fill {
      height: 100%;
      transition: all 0.3s ease;
      
      &.weak { width: 25%; background: #e53e3e; }
      &.fair { width: 50%; background: #f56500; }
      &.good { width: 75%; background: #fbb040; }
      &.strong { width: 100%; background: #38a169; }
    }
  }
  
  .strength-text {
    color: #666;
  }
`;

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('weak');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (password) => {
    if (password.length < 6) return 'weak';
    if (password.length >= 6 && /[A-Z]/.test(password) && /[0-9]/.test(password)) {
      if (password.length >= 8 && /[!@#$%^&*]/.test(password)) return 'strong';
      return 'good';
    }
    return 'fair';
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'password') {
      setPasswordStrength(validatePassword(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.first_name || !formData.last_name || !formData.email || 
        !formData.phone || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    // Phone validation (Tanzanian format)
    const phoneRegex = /^(\+255|0)[67]\d{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error('Please enter a valid Tanzanian phone number (e.g., 0789123456)');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        username: formData.username,
        phone: formData.phone,
        role: 'teacher',
        password: formData.password
      });
      
      if (result.success) {
        toast.success('Registration successful! Welcome to UBUNIFU SEC SMS!');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <RegisterContainer>
      <RegisterCard>
        <Logo>
          <h1>🎓 UBUNIFU SEC</h1>
          <p>Create Your Account</p>
        </Logo>

        <form onSubmit={handleSubmit}>
          <FormContainer>
            <FormGroup>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                disabled={loading}
              />
            </FormGroup>
          </FormContainer>

          <FormGroup $fullWidth>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </FormGroup>
          
          <FormContainer>
            <FormGroup>
              <Label htmlFor="username">Username (Optional)</Label>
              <Input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Leave blank to auto-generate"
                disabled={loading}
              />
            </FormGroup>
            
            <FormGroup>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="0789123456"
                required
                disabled={loading}
              />
            </FormGroup>
          </FormContainer>

          <FormGroup>
            <Label htmlFor="password">Password *</Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
            <PasswordStrength>
              <div className="strength-bar">
                <div className={`strength-fill ${passwordStrength}`}></div>
              </div>
              <div className="strength-text">
                Password strength: {passwordStrength}
                {passwordStrength === 'weak' && ' - Add uppercase, numbers, and symbols'}
              </div>
            </PasswordStrength>
          </FormGroup>
          
          <FormGroup>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              disabled={loading}
            />
          </FormGroup>
          
          <Button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <LoadingSpinner $show={loading}>
          <div className="spinner"></div>
          <p>Creating your account...</p>
        </LoadingSpinner>

        <Links>
          <p>
            Already have an account? 
            <a onClick={handleLoginClick}> Login here</a>
          </p>
        </Links>
      </RegisterCard>
    </RegisterContainer>
  );
};

export default Register;
