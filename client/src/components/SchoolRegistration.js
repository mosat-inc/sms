import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { colors, borderRadius, shadows } from './shared/StyledComponents';
import { 
  FaSchool, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaLock,
  FaBuilding,
  FaGraduationCap
} from 'react-icons/fa';
import { api } from '../services/http';

const Container = styled.div`
  min-height: 100vh;
  background: ${colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
`;

const Card = styled.div`
  background: white;
  border-radius: 24px;
  box-shadow: ${shadows.card};
  max-width: 700px;
  width: 100%;
  overflow: hidden;
`;

const Header = styled.div`
  background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
  padding: 40px;
  text-align: center;
  color: white;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="white" opacity="0.1"/></svg>');
  }
  
  .icon {
    font-size: 3rem;
    margin-bottom: 15px;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.2));
    position: relative;
  }
  
  h1 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 10px;
    font-family: var(--font-display);
    position: relative;
  }
  
  p {
    opacity: 0.95;
    font-size: 1rem;
    position: relative;
  }
`;

const ProgressBar = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 30px 40px;
  background: linear-gradient(135deg, #eef2ff, #eff6ff);
  border-bottom: 1px solid ${colors.border};
  position: relative;
  
  @media (max-width: 640px) {
    padding: 20px;
  }
`;

const Step = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 20px;
    left: 50%;
    width: 100%;
    height: 3px;
    background: ${props => props.$completed ? colors.primaryBlue : colors.border};
    z-index: 0;
    transition: background 0.3s ease;
  }
  
  .step-circle {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background: ${props => props.$active || props.$completed ? 
      `linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple})` : 
      'white'};
    border: 3px solid ${props => props.$active || props.$completed ? 'transparent' : colors.border};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    color: ${props => props.$active || props.$completed ? 'white' : colors.textSecondary};
    z-index: 1;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: ${props => props.$active ? shadows.card : 'none'};
    
    svg {
      font-size: 1.2rem;
    }
  }
  
  .step-label {
    margin-top: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    color: ${props => props.$active ? colors.primaryBlue : colors.textSecondary};
    text-align: center;
    
    @media (max-width: 640px) {
      font-size: 0.7rem;
    }
  }
`;

const Form = styled.form`
  padding: 40px;
  
  @media (max-width: 640px) {
    padding: 30px 20px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 25px;
  
  label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: ${colors.textPrimary};
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 8px;
    
    svg {
      color: ${colors.primaryBlue};
    }
    
    .required {
      color: #ef4444;
    }
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background: white;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 30px;
  
  @media (max-width: 640px) {
    flex-direction: column-reverse;
  }
`;

const Button = styled.button`
  flex: 1;
  padding: 14px 24px;
  border-radius: ${borderRadius.pill};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
    color: white;
    box-shadow: ${shadows.button};
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: ${shadows.buttonHover};
    }
  ` : `
    background: white;
    color: ${colors.textPrimary};
    border: 2px solid ${colors.border};
    
    &:hover:not(:disabled) {
      background: ${colors.background};
      border-color: ${colors.primaryBlue};
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SuccessScreen = styled.div`
  padding: 60px 40px;
  text-align: center;
  
  .success-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #059669);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 30px;
    color: white;
    font-size: 3rem;
    box-shadow: 0 20px 50px rgba(16, 185, 129, 0.3);
    animation: scaleIn 0.5s ease;
  }
  
  @keyframes scaleIn {
    from { transform: scale(0); }
    to { transform: scale(1); }
  }
  
  h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 15px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
  }
  
  p {
    color: ${colors.textSecondary};
    font-size: 1.05rem;
    margin-bottom: 10px;
    line-height: 1.6;
  }
  
  .school-code {
    display: inline-block;
    background: linear-gradient(135deg, #eef2ff, #eff6ff);
    padding: 15px 30px;
    border-radius: ${borderRadius.medium};
    margin: 20px 0;
    font-size: 1.8rem;
    font-weight: 800;
    color: ${colors.primaryBlue};
    border: 2px solid rgba(59, 130, 246, 0.3);
  }
  
  .info-box {
    background: linear-gradient(135deg, #eff6ff, #f0f9ff);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: ${borderRadius.medium};
    padding: 20px;
    margin: 30px 0;
    text-align: left;
    
    h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 15px;
      color: ${colors.textPrimary};
    }
    
    ul {
      list-style: none;
      padding: 0;
      
      li {
        padding: 8px 0;
        display: flex;
        align-items: center;
        gap: 10px;
        color: ${colors.textSecondary};
        
        svg {
          color: ${colors.success};
          flex-shrink: 0;
        }
      }
    }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
  padding: 12px 16px;
  border-radius: ${borderRadius.medium};
  margin-bottom: 20px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SchoolRegistration = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  
  const [formData, setFormData] = useState({
    // Step 1: School Information
    schoolName: '',
    schoolType: 'PUBLIC',
    address: '',
    city: '',
    region: '',
    phone: '',
    email: '',
    
    // Step 2: Admin Account
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    
    // Step 3: Subscription Plan
    planTier: 'BASIC'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('School address is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.region.trim()) {
      setError('Region is required');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Valid email is required');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.adminFirstName.trim() || !formData.adminLastName.trim()) {
      setError('Admin full name is required');
      return false;
    }
    if (!formData.adminEmail.trim() || !/\S+@\S+\.\S+/.test(formData.adminEmail)) {
      setError('Valid admin email is required');
      return false;
    }
    if (!formData.adminPhone.trim()) {
      setError('Admin phone number is required');
      return false;
    }
    if (!formData.adminPassword || formData.adminPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.adminPassword !== formData.adminPasswordConfirm) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/v1/schools/register', {
        // School info (match backend field names)
        schoolName: formData.schoolName,
        schoolType: formData.schoolType === 'PUBLIC' ? 'GOVERNMENT' : 'PRIVATE',
        address: formData.address,
        location: formData.city || formData.region || null,
        region: formData.region || null,
        district: null,
        contactPhone: formData.phone || null,
        contactEmail: formData.email,
        
        // Admin account
        adminFirstName: formData.adminFirstName,
        adminLastName: formData.adminLastName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        
        // Subscription
        subscriptionTier: formData.planTier
      });

      if (response.data.success) {
        setSchoolCode(response.data.data.school.code);
        setRegistrationComplete(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (registrationComplete) {
    return (
      <Container>
        <Card>
          <Header>
            <FaGraduationCap className="icon" />
            <h1>Registration Complete!</h1>
          </Header>
          
          <SuccessScreen>
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            
            <h2>Welcome to SMS Platform!</h2>
            <p>Your school has been successfully registered.</p>
            
            <div className="school-code">{schoolCode}</div>
            <p style={{ marginTop: '10px' }}>This is your unique school code. Save it for reference.</p>
            
            <div className="info-box">
              <h3>Next Steps:</h3>
              <ul>
                <li><FaCheckCircle /> Check your email for verification link</li>
                <li><FaCheckCircle /> Login with your admin credentials</li>
                <li><FaCheckCircle /> Complete your school profile</li>
                <li><FaCheckCircle /> Start adding students and teachers</li>
              </ul>
            </div>
            
            <Button $primary onClick={() => navigate('/login')} style={{ maxWidth: '300px', margin: '0 auto' }}>
              Go to Login <FaArrowRight />
            </Button>
          </SuccessScreen>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Header>
          <FaSchool className="icon" />
          <h1>Register Your School</h1>
          <p>Join thousands of schools using our platform</p>
        </Header>
        
        <ProgressBar>
          <Step $active={currentStep === 1} $completed={currentStep > 1}>
            <div className="step-circle">
              {currentStep > 1 ? <FaCheckCircle /> : '1'}
            </div>
            <div className="step-label">School Info</div>
          </Step>
          
          <Step $active={currentStep === 2} $completed={currentStep > 2}>
            <div className="step-circle">
              {currentStep > 2 ? <FaCheckCircle /> : '2'}
            </div>
            <div className="step-label">Admin Account</div>
          </Step>
          
          <Step $active={currentStep === 3} $completed={currentStep > 3}>
            <div className="step-circle">3</div>
            <div className="step-label">Plan Selection</div>
          </Step>
        </ProgressBar>
        
        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>⚠️ {error}</ErrorMessage>}
          
          {/* Step 1: School Information */}
          {currentStep === 1 && (
            <>
              <FormGroup>
                <label>
                  <FaBuilding /> School Name <span className="required">*</span>
                </label>
                <Input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="e.g., Dar es Salaam Secondary School"
                />
              </FormGroup>
              
              <FormGroup>
                <label>
                  <FaSchool /> School Type <span className="required">*</span>
                </label>
                <Select name="schoolType" value={formData.schoolType} onChange={handleChange}>
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <label>
                  <FaMapMarkerAlt /> Address <span className="required">*</span>
                </label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </FormGroup>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormGroup>
                  <label>City <span className="required">*</span></label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g., Dar es Salaam"
                  />
                </FormGroup>
                
                <FormGroup>
                  <label>Region <span className="required">*</span></label>
                  <Select name="region" value={formData.region} onChange={handleChange}>
                    <option value="">Select Region</option>
                    <option value="Dar es Salaam">Dar es Salaam</option>
                    <option value="Dodoma">Dodoma</option>
                    <option value="Arusha">Arusha</option>
                    <option value="Mwanza">Mwanza</option>
                    <option value="Mbeya">Mbeya</option>
                    <option value="Morogoro">Morogoro</option>
                    <option value="Tanga">Tanga</option>
                    <option value="Kilimanjaro">Kilimanjaro</option>
                    <option value="Other">Other</option>
                  </Select>
                </FormGroup>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormGroup>
                  <label>
                    <FaPhone /> Phone <span className="required">*</span>
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+255 XXX XXX XXX"
                  />
                </FormGroup>
                
                <FormGroup>
                  <label>
                    <FaEnvelope /> Email <span className="required">*</span>
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="school@example.com"
                  />
                </FormGroup>
              </div>
            </>
          )}
          
          {/* Step 2: Admin Account */}
          {currentStep === 2 && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormGroup>
                  <label>
                    <FaUser /> First Name <span className="required">*</span>
                  </label>
                  <Input
                    type="text"
                    name="adminFirstName"
                    value={formData.adminFirstName}
                    onChange={handleChange}
                    placeholder="First name"
                  />
                </FormGroup>
                
                <FormGroup>
                  <label>Last Name <span className="required">*</span></label>
                  <Input
                    type="text"
                    name="adminLastName"
                    value={formData.adminLastName}
                    onChange={handleChange}
                    placeholder="Last name"
                  />
                </FormGroup>
              </div>
              
              <FormGroup>
                <label>
                  <FaEnvelope /> Email <span className="required">*</span>
                </label>
                <Input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                />
              </FormGroup>
              
              <FormGroup>
                <label>
                  <FaPhone /> Phone Number <span className="required">*</span>
                </label>
                <Input
                  type="tel"
                  name="adminPhone"
                  value={formData.adminPhone}
                  onChange={handleChange}
                  placeholder="+255 XXX XXX XXX"
                />
              </FormGroup>
              
              <FormGroup>
                <label>
                  <FaLock /> Password <span className="required">*</span>
                </label>
                <Input
                  type="password"
                  name="adminPassword"
                  value={formData.adminPassword}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                />
              </FormGroup>
              
              <FormGroup>
                <label>
                  <FaLock /> Confirm Password <span className="required">*</span>
                </label>
                <Input
                  type="password"
                  name="adminPasswordConfirm"
                  value={formData.adminPasswordConfirm}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                />
              </FormGroup>
            </>
          )}
          
          {/* Step 3: Plan Selection */}
          {currentStep === 3 && (
            <>
              <FormGroup>
                <label style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                  Choose Your Plan
                </label>
                
                <div style={{ display: 'grid', gap: '15px' }}>
                  <PlanOption
                    selected={formData.planTier === 'BASIC'}
                    onClick={() => setFormData(prev => ({ ...prev, planTier: 'BASIC' }))}
                  >
                    <div className="plan-header">
                      <div className="plan-icon">🚀</div>
                      <div>
                        <h3>Basic</h3>
                        <p className="price">Free <span>/ 30 days trial</span></p>
                      </div>
                    </div>
                    <ul>
                      <li>✓ Up to 500 students</li>
                      <li>✓ Student & teacher management</li>
                      <li>✓ Basic attendance & results</li>
                    </ul>
                  </PlanOption>
                  
                  <PlanOption
                    selected={formData.planTier === 'STANDARD'}
                    onClick={() => setFormData(prev => ({ ...prev, planTier: 'STANDARD' }))}
                  >
                    <div className="plan-header">
                      <div className="plan-icon">🛡️</div>
                      <div>
                        <h3>Standard</h3>
                        <p className="price">TZS 500K <span>/ year</span></p>
                      </div>
                    </div>
                    <ul>
                      <li>✓ Up to 2,000 students</li>
                      <li>✓ SMS notifications & mobile money</li>
                      <li>✓ Advanced reports & ID cards</li>
                    </ul>
                  </PlanOption>
                  
                  <PlanOption
                    selected={formData.planTier === 'PREMIUM'}
                    onClick={() => setFormData(prev => ({ ...prev, planTier: 'PREMIUM' }))}
                  >
                    <div className="plan-header">
                      <div className="plan-icon">👑</div>
                      <div>
                        <h3>Premium</h3>
                        <p className="price">TZS 1.5M <span>/ year</span></p>
                      </div>
                    </div>
                    <ul>
                      <li>✓ Unlimited students</li>
                      <li>✓ AI tools & auto-promotion</li>
                      <li>✓ Custom branding & priority support</li>
                    </ul>
                  </PlanOption>
                </div>
              </FormGroup>
            </>
          )}
          
          <ButtonGroup>
            {currentStep > 1 && (
              <Button type="button" onClick={handleBack}>
                <FaArrowLeft /> Back
              </Button>
            )}
            
            {currentStep < 3 ? (
              <Button type="button" $primary onClick={handleNext}>
                Next <FaArrowRight />
              </Button>
            ) : (
              <Button type="submit" $primary disabled={loading}>
                {loading ? 'Registering...' : 'Complete Registration'} <FaCheckCircle />
              </Button>
            )}
          </ButtonGroup>
        </Form>
      </Card>
    </Container>
  );
};

const PlanOption = styled.div`
  padding: 20px;
  border: 3px solid ${props => props.selected ? colors.primaryBlue : colors.border};
  border-radius: ${borderRadius.medium};
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => props.selected ? 'rgba(59, 130, 246, 0.05)' : 'white'};
  
  &:hover {
    border-color: ${colors.primaryBlue};
    transform: translateY(-2px);
    box-shadow: ${shadows.card};
  }
  
  .plan-header {
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 15px;
    
    .plan-icon {
      font-size: 2rem;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eef2ff, #eff6ff);
      border-radius: ${borderRadius.medium};
    }
    
    h3 {
      font-size: 1.3rem;
      font-weight: 700;
      margin-bottom: 5px;
      color: ${colors.textPrimary};
    }
    
    .price {
      font-size: 1.1rem;
      font-weight: 700;
      color: ${colors.primaryBlue};
      margin: 0;
      
      span {
        font-size: 0.85rem;
        font-weight: 500;
        color: ${colors.textSecondary};
      }
    }
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    
    li {
      padding: 6px 0;
      color: ${colors.textSecondary};
      font-size: 0.9rem;
    }
  }
`;

export default SchoolRegistration;
