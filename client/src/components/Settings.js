import React, { useState } from 'react';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'react-toastify';
import {
  PageContainer,
  PageHeader,
  Section,
  SectionTitle as SharedSectionTitle,
  PrimaryButton,
  colors,
  shadows,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const SettingsContainer = styled(PageContainer)`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  
  ${mediaQuery('tablet')} {
    padding: 15px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const SettingsHeader = styled(PageHeader)`
  margin-bottom: 40px;
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    font-family: var(--font-display);
    display: flex;
    align-items: center;
    gap: 12px;
    
    ${mediaQuery('mobile')} {
      font-size: 2rem;
    }
  }
  
  p {
    color: ${colors.textSecondary};
    font-size: 1.1rem;
    
    ${mediaQuery('mobile')} {
      font-size: 1rem;
    }
  }
`;

const SettingsSection = styled(Section)``;

const SectionTitle = styled(SharedSectionTitle)`
  color: ${colors.primaryBlue};
  display: flex;
  align-items: center;
  gap: 10px;
  
  i {
    font-size: 1.2rem;
  }
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid ${colors.borderLight};
  gap: 20px;
  
  &:last-child {
    border-bottom: none;
  }
  
  ${mediaQuery('mobile')} {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
`;

const SettingLabel = styled.div`
  h3 {
    font-size: 1.1rem;
    margin-bottom: 5px;
    color: ${colors.textPrimary};
    font-weight: 600;
  }
  
  p {
    font-size: 0.9rem;
    color: ${colors.textSecondary};
    margin: 0;
  }
`;

const LanguageSelector = styled.select`
  background: ${colors.cardBackground};
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  padding: 12px 16px;
  color: ${colors.textPrimary};
  font-size: 1rem;
  min-width: 200px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
  
  option {
    background: ${colors.cardBackground};
    color: ${colors.textPrimary};
    padding: 10px;
  }
  
  ${mediaQuery('mobile')} {
    width: 100%;
  }
`;

const ToggleSwitch = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'active' && prop !== '$active'
})`
  position: relative;
  width: 60px;
  height: 30px;
  background: ${(props) => (props.$active ?? props.active) ? colors.primaryBlue : colors.borderLight};
  border-radius: 15px;
  cursor: pointer;
  transition: background 0.3s ease;
  flex-shrink: 0;
  
  &::after {
    content: '';
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: ${(props) => (props.$active ?? props.active) ? '32px' : '2px'};
    transition: left 0.3s ease;
    box-shadow: ${shadows.card};
  }
`;

const SaveButton = styled(PrimaryButton)`
  margin-top: 20px;
  
  i {
    margin-right: 8px;
  }
`;

const Settings = () => {
  const { language, changeLanguage, t, availableLanguages } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    changeLanguage(newLanguage);
    toast.success(t('settings.languageChanged'));
  };

  const handleSave = () => {
    // Save other settings to localStorage or API
    localStorage.setItem('sms_notifications', notifications);
    localStorage.setItem('sms_email_notifications', emailNotifications);
    localStorage.setItem('sms_dark_mode', darkMode);
    toast.success(t('success.saved'));
  };

  return (
    <SettingsContainer>
      <SettingsHeader>
        <h1>
          <i className="fas fa-cog"></i>
          {t('settings.settings')}
        </h1>
        <p>Manage your account settings and preferences</p>
      </SettingsHeader>

      {/* Language Settings */}
      <SettingsSection>
        <SectionTitle>
          <i className="fas fa-globe"></i>
          {t('settings.languageSettings')}
        </SectionTitle>
        
        <SettingItem>
          <SettingLabel>
            <h3>{t('settings.selectLanguage')}</h3>
            <p>Choose your preferred language for the interface</p>
          </SettingLabel>
          <LanguageSelector value={language} onChange={handleLanguageChange}>
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName}
              </option>
            ))}
          </LanguageSelector>
        </SettingItem>
      </SettingsSection>

      {/* General Settings */}
      <SettingsSection>
        <SectionTitle>
          <i className="fas fa-sliders-h"></i>
          {t('settings.generalSettings')}
        </SectionTitle>
        
        <SettingItem>
          <SettingLabel>
            <h3>Dark Mode</h3>
            <p>Use dark theme for better viewing experience</p>
          </SettingLabel>
          <ToggleSwitch 
            $active={darkMode} 
            onClick={() => setDarkMode(!darkMode)}
          />
        </SettingItem>
      </SettingsSection>

      {/* Notification Settings */}
      <SettingsSection>
        <SectionTitle>
          <i className="fas fa-bell"></i>
          {t('settings.notificationSettings')}
        </SectionTitle>
        
        <SettingItem>
          <SettingLabel>
            <h3>Push Notifications</h3>
            <p>Receive notifications about important updates</p>
          </SettingLabel>
          <ToggleSwitch 
            $active={notifications} 
            onClick={() => setNotifications(!notifications)}
          />
        </SettingItem>
        
        <SettingItem>
          <SettingLabel>
            <h3>Email Notifications</h3>
            <p>Receive email notifications for important events</p>
          </SettingLabel>
          <ToggleSwitch 
            $active={emailNotifications} 
            onClick={() => setEmailNotifications(!emailNotifications)}
          />
        </SettingItem>
      </SettingsSection>

      {/* Account Settings */}
      <SettingsSection>
        <SectionTitle>
          <i className="fas fa-user-cog"></i>
          {t('settings.accountSettings')}
        </SectionTitle>
        
        <SettingItem>
          <SettingLabel>
            <h3>Account Information</h3>
            <p>Manage your profile and security settings</p>
          </SettingLabel>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {t('profile.editProfile')}
            </button>
            <button 
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {t('profile.changePassword')}
            </button>
          </div>
        </SettingItem>
      </SettingsSection>

      <SaveButton onClick={handleSave}>
        <i className="fas fa-save"></i>
        {t('actions.save')} {t('settings.settings')}
      </SaveButton>
    </SettingsContainer>
  );
};

export default Settings;
