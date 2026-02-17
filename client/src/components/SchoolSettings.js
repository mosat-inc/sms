import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { colors, borderRadius, shadows } from './shared/StyledComponents';
import { 
  FaSchool, 
  FaSave, 
  FaPalette, 
  FaBell, 
  FaGlobe,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaImage
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  margin-bottom: 40px;
  
  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    display: flex;
    align-items: center;
    gap: 15px;
    margin-bottom: 10px;
    
    svg {
      color: ${colors.primaryBlue};
    }
  }
  
  p {
    color: ${colors.textSecondary};
    font-size: 1.1rem;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 2px solid ${colors.border};
  padding-bottom: 0;
  overflow-x: auto;
  
  @media (max-width: 768px) {
    gap: 5px;
  }
`;

const Tab = styled.button`
  padding: 15px 25px;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? colors.primaryBlue : colors.textSecondary};
  font-weight: ${props => props.$active ? '700' : '500'};
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 3px solid ${props => props.$active ? colors.primaryBlue : 'transparent'};
  font-size: 0.95rem;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: ${colors.primaryBlue};
    background: rgba(59, 130, 246, 0.05);
  }
  
  svg {
    font-size: 1.1rem;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: ${borderRadius.large};
  padding: 30px;
  box-shadow: ${shadows.card};
  border: 1px solid ${colors.border};
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  
  svg {
    color: ${colors.primaryBlue};
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    font-weight: 600;
    color: ${colors.textPrimary};
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 6px;
    
    svg {
      color: ${colors.primaryBlue};
      font-size: 0.9rem;
    }
  }
`;

const Input = styled.input`
  padding: 12px 14px;
  border: 2px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  font-size: 0.95rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    background: ${colors.background};
    cursor: not-allowed;
  }
`;

const Textarea = styled.textarea`
  padding: 12px 14px;
  border: 2px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  font-size: 0.95rem;
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  padding: 12px 14px;
  border: 2px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ColorPicker = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  
  input[type="color"] {
    width: 60px;
    height: 40px;
    border: 2px solid ${colors.border};
    border-radius: ${borderRadius.medium};
    cursor: pointer;
  }
  
  span {
    font-family: monospace;
    color: ${colors.textSecondary};
  }
`;

const FileUpload = styled.div`
  border: 2px dashed ${colors.border};
  border-radius: ${borderRadius.medium};
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: ${colors.primaryBlue};
    background: rgba(59, 130, 246, 0.05);
  }
  
  svg {
    font-size: 3rem;
    color: ${colors.primaryBlue};
    margin-bottom: 10px;
  }
  
  p {
    color: ${colors.textSecondary};
    margin: 5px 0;
  }
  
  input {
    display: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  margin-top: 30px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 12px 30px;
  border-radius: ${borderRadius.pill};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
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

const InfoBox = styled.div`
  background: linear-gradient(135deg, #eff6ff, #f0f9ff);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${borderRadius.medium};
  padding: 15px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  
  svg {
    color: ${colors.primaryBlue};
    font-size: 1.3rem;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  div {
    flex: 1;
    
    h4 {
      font-weight: 700;
      color: ${colors.textPrimary};
      margin-bottom: 5px;
    }
    
    p {
      color: ${colors.textSecondary};
      font-size: 0.9rem;
      line-height: 1.5;
    }
  }
`;

const SchoolSettings = () => {
  const navigate = useNavigate();
  const { user, schoolId, schoolCode, api } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    // General
    schoolName: '',
    schoolType: 'PUBLIC',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    website: '',
    motto: '',
    established_year: '',
    
    // Branding
    primary_color: '#3b82f6',
    secondary_color: '#8b5cf6',
    logo_url: '',
    
    // Notifications
    enable_email_notifications: true,
    enable_sms_notifications: false,
    enable_push_notifications: true,
    
    // Academic
    academic_year: '2024-2025',
    current_term: 'term1',
    grading_system: 'A-F'
  });

  useEffect(() => {
    fetchSchoolSettings();
  }, [schoolId]);

  const fetchSchoolSettings = async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/schools/${schoolId}`);
      
      if (response.data.success) {
        const school = response.data.data;
        setSettings(prev => ({
          ...prev,
          schoolName: school.name || '',
          schoolType: school.type || 'PUBLIC',
          email: school.email || '',
          phone: school.phone || '',
          address: school.address || '',
          city: school.city || '',
          region: school.region || '',
          website: school.website || '',
          motto: school.motto || '',
          established_year: school.established_year || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching school settings:', error);
      toast.error('Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await api.patch(`/api/v1/schools/${schoolId}/settings`, settings);
      
      if (response.data.success) {
        toast.success('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralSettings = () => (
    <Card>
      <SectionTitle>
        <FaSchool /> General Information
      </SectionTitle>
      
      <InfoBox>
        <FaCheckCircle />
        <div>
          <h4>School Code: {schoolCode}</h4>
          <p>This is your unique school identifier. It's automatically generated and cannot be changed.</p>
        </div>
      </InfoBox>
      
      <FormGrid>
        <FormGroup>
          <label><FaSchool /> School Name</label>
          <Input
            name="schoolName"
            value={settings.schoolName}
            onChange={handleChange}
            placeholder="e.g., Dar es Salaam Secondary School"
          />
        </FormGroup>
        
        <FormGroup>
          <label>School Type</label>
          <Select name="schoolType" value={settings.schoolType} onChange={handleChange}>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <label><FaEnvelope /> Email</label>
          <Input
            type="email"
            name="email"
            value={settings.email}
            onChange={handleChange}
            placeholder="school@example.com"
          />
        </FormGroup>
        
        <FormGroup>
          <label><FaPhone /> Phone</label>
          <Input
            type="tel"
            name="phone"
            value={settings.phone}
            onChange={handleChange}
            placeholder="+255 XXX XXX XXX"
          />
        </FormGroup>
        
        <FormGroup>
          <label><FaGlobe /> Website</label>
          <Input
            type="url"
            name="website"
            value={settings.website}
            onChange={handleChange}
            placeholder="https://www.school.com"
          />
        </FormGroup>
        
        <FormGroup>
          <label>Established Year</label>
          <Input
            type="number"
            name="established_year"
            value={settings.established_year}
            onChange={handleChange}
            placeholder="2000"
            min="1900"
            max={new Date().getFullYear()}
          />
        </FormGroup>
      </FormGrid>
      
      <FormGroup style={{ marginTop: '20px' }}>
        <label><FaMapMarkerAlt /> Address</label>
        <Input
          name="address"
          value={settings.address}
          onChange={handleChange}
          placeholder="Street address"
        />
      </FormGroup>
      
      <FormGrid style={{ marginTop: '20px' }}>
        <FormGroup>
          <label>City</label>
          <Input
            name="city"
            value={settings.city}
            onChange={handleChange}
            placeholder="Dar es Salaam"
          />
        </FormGroup>
        
        <FormGroup>
          <label>Region</label>
          <Select name="region" value={settings.region} onChange={handleChange}>
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
      </FormGrid>
      
      <FormGroup style={{ marginTop: '20px' }}>
        <label>School Motto</label>
        <Textarea
          name="motto"
          value={settings.motto}
          onChange={handleChange}
          placeholder="Enter your school's motto..."
        />
      </FormGroup>
    </Card>
  );

  const renderBrandingSettings = () => (
    <Card>
      <SectionTitle>
        <FaPalette /> Branding & Appearance
      </SectionTitle>
      
      <InfoBox>
        <FaCheckCircle />
        <div>
          <h4>Premium Feature</h4>
          <p>Custom branding is available for Premium plan subscribers. Upgrade to customize your school's colors and logo.</p>
        </div>
      </InfoBox>
      
      <FormGroup style={{ marginBottom: '20px' }}>
        <label>School Logo</label>
        <FileUpload>
          <FaImage />
          <p><strong>Upload School Logo</strong></p>
          <p>Recommended: 500x500px, PNG or JPG</p>
          <input type="file" accept="image/*" />
        </FileUpload>
      </FormGroup>
      
      <FormGrid>
        <FormGroup>
          <label>Primary Color</label>
          <ColorPicker>
            <input
              type="color"
              name="primary_color"
              value={settings.primary_color}
              onChange={handleChange}
            />
            <span>{settings.primary_color}</span>
          </ColorPicker>
        </FormGroup>
        
        <FormGroup>
          <label>Secondary Color</label>
          <ColorPicker>
            <input
              type="color"
              name="secondary_color"
              value={settings.secondary_color}
              onChange={handleChange}
            />
            <span>{settings.secondary_color}</span>
          </ColorPicker>
        </FormGroup>
      </FormGrid>
    </Card>
  );

  const renderNotificationSettings = () => (
    <Card>
      <SectionTitle>
        <FaBell /> Notification Preferences
      </SectionTitle>
      
      <FormGroup style={{ marginBottom: '15px' }}>
        <label>
          <input
            type="checkbox"
            name="enable_email_notifications"
            checked={settings.enable_email_notifications}
            onChange={handleChange}
            style={{ marginRight: '10px' }}
          />
          Enable Email Notifications
        </label>
        <p style={{ color: colors.textSecondary, fontSize: '0.85rem', marginTop: '5px', marginLeft: '30px' }}>
          Send notifications to parents and staff via email
        </p>
      </FormGroup>
      
      <FormGroup style={{ marginBottom: '15px' }}>
        <label>
          <input
            type="checkbox"
            name="enable_sms_notifications"
            checked={settings.enable_sms_notifications}
            onChange={handleChange}
            style={{ marginRight: '10px' }}
          />
          Enable SMS Notifications (Standard/Premium)
        </label>
        <p style={{ color: colors.textSecondary, fontSize: '0.85rem', marginTop: '5px', marginLeft: '30px' }}>
          Send SMS alerts for important updates
        </p>
      </FormGroup>
      
      <FormGroup>
        <label>
          <input
            type="checkbox"
            name="enable_push_notifications"
            checked={settings.enable_push_notifications}
            onChange={handleChange}
            style={{ marginRight: '10px' }}
          />
          Enable Push Notifications
        </label>
        <p style={{ color: colors.textSecondary, fontSize: '0.85rem', marginTop: '5px', marginLeft: '30px' }}>
          Show browser/app push notifications
        </p>
      </FormGroup>
    </Card>
  );

  const renderAcademicSettings = () => (
    <Card>
      <SectionTitle>
        <FaSchool /> Academic Configuration
      </SectionTitle>
      
      <FormGrid>
        <FormGroup>
          <label>Academic Year</label>
          <Input
            name="academic_year"
            value={settings.academic_year}
            onChange={handleChange}
            placeholder="2024-2025"
          />
        </FormGroup>
        
        <FormGroup>
          <label>Current Term</label>
          <Select name="current_term" value={settings.current_term} onChange={handleChange}>
            <option value="term1">Term 1</option>
            <option value="term2">Term 2</option>
            <option value="term3">Term 3</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <label>Grading System</label>
          <Select name="grading_system" value={settings.grading_system} onChange={handleChange}>
            <option value="A-F">A-F (Letter Grades)</option>
            <option value="1-100">1-100 (Percentage)</option>
            <option value="1-10">1-10 (Scale)</option>
          </Select>
        </FormGroup>
      </FormGrid>
    </Card>
  );

  if (loading) {
    return (
      <Container>
        <p>Loading settings...</p>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>
          <FaSchool /> School Settings
        </h1>
        <p>Manage your school's configuration and preferences</p>
      </Header>
      
      <TabContainer>
        <Tab $active={activeTab === 'general'} onClick={() => setActiveTab('general')}>
          <FaSchool /> General
        </Tab>
        <Tab $active={activeTab === 'branding'} onClick={() => setActiveTab('branding')}>
          <FaPalette /> Branding
        </Tab>
        <Tab $active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')}>
          <FaBell /> Notifications
        </Tab>
        <Tab $active={activeTab === 'academic'} onClick={() => setActiveTab('academic')}>
          <FaSchool /> Academic
        </Tab>
      </TabContainer>
      
      <form onSubmit={handleSave}>
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'branding' && renderBrandingSettings()}
        {activeTab === 'notifications' && renderNotificationSettings()}
        {activeTab === 'academic' && renderAcademicSettings()}
        
        <ButtonGroup>
          <Button type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" $primary disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <FaSave /> Save Changes
              </>
            )}
          </Button>
        </ButtonGroup>
      </form>
    </Container>
  );
};

export default SchoolSettings;
