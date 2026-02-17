import React from 'react';
import styled from 'styled-components';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, shadows } from './shared/StyledComponents';
import logo from '../assets/logo.png';

const FooterContainer = styled.footer`
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  color: ${colors.textPrimary};
  padding: 24px 20px 16px;
  margin-top: auto;
  border-top: 2px solid ${colors.borderLight};
  box-shadow: 0 -2px 10px rgba(15, 23, 42, 0.03);
  position: relative;
  z-index: 10;
  margin-left: 72px;
  transition: margin-left 0.3s ease;
  
  @media (max-width: 1024px) {
    margin-left: 0;
  }
`;

const FooterContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }
`;

const CompanyInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    flex-direction: row;
    gap: 10px;
  }
  
  .logo-img {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    background: #ffffff;
    border: 2px solid ${colors.primaryBlue};
    padding: 2px;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
    transition: all 0.3s ease;
    
    &:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.3);
    }
  }
  
  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    .company-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      font-family: var(--font-display);
    }
    
    .tagline {
      font-size: 0.75rem;
      color: ${colors.textSecondary};
    }
  }
`;

const ContactLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
    gap: 12px;
  }
`;

const ContactItem = styled.a`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${colors.textSecondary};
  text-decoration: none;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  
  &:hover {
    color: ${colors.primaryBlue};
    transform: translateY(-1px);
  }
  
  i {
    font-size: 0.9rem;
    color: ${colors.primaryBlue};
  }
`;

const SocialLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  a {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: ${colors.cardBackground};
    border: 1px solid ${colors.border};
    border-radius: 50%;
    color: ${colors.textSecondary};
    text-decoration: none;
    transition: all 0.2s ease;
    
    &:hover {
      background: ${colors.primaryBlue};
      color: white;
      border-color: ${colors.primaryBlue};
      transform: translateY(-2px);
      box-shadow: ${shadows.card};
    }
    
    i {
      font-size: 0.85rem;
    }
  }
`;

const FooterBottom = styled.div`
  max-width: 1200px;
  margin: 16px auto 0;
  padding-top: 16px;
  border-top: 1px solid ${colors.borderLight};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .copyright {
    color: ${colors.textSecondary};
    font-size: 0.8rem;
    
    .year {
      color: ${colors.primaryBlue};
      font-weight: 600;
    }
  }
  
  .version {
    color: ${colors.textMuted};
    font-size: 0.75rem;
  }
`;

const QuickLinks = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }
  
  a {
    color: ${colors.textSecondary};
    text-decoration: none;
    font-size: 0.8rem;
    transition: color 0.2s ease;
    
    &:hover {
      color: ${colors.primaryBlue};
    }
  }
`;

const Footer = () => {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <FooterContainer>
      <FooterContent>
        <CompanyInfo>
          <img src={logo} alt="Mosat Inc Logo" className="logo-img" />
          <div className="info">
            <div className="company-name">{t('footer.companyName')}</div>
            <div className="tagline">Tanzania Education Technology Solutions</div>
          </div>
        </CompanyInfo>

        <ContactLinks>
          <ContactItem href="tel:+255615082570">
            <i className="fas fa-phone"></i>
            +255 615 082 570
          </ContactItem>
          <ContactItem href="mailto:mosatgentlemedy@gmail.com">
            <i className="fas fa-envelope"></i>
            mosatgentlemedy@gmail.com
          </ContactItem>
        </ContactLinks>

        <SocialLinks>
          <a href="#facebook" aria-label="Facebook">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="#twitter" aria-label="Twitter">
            <i className="fab fa-twitter"></i>
          </a>
          <a href="#linkedin" aria-label="LinkedIn">
            <i className="fab fa-linkedin-in"></i>
          </a>
          <a href="mailto:mosatgentlemedy@gmail.com" aria-label="Email">
            <i className="fas fa-envelope"></i>
          </a>
        </SocialLinks>
      </FooterContent>

      <FooterBottom>
        <div className="copyright">
          © <span className="year">{currentYear}</span> {t('footer.companyName')} - {t('footer.allRightsReserved')}
        </div>
        
        <QuickLinks>
          <a href="#privacy">{t('footer.privacyPolicy')}</a>
          <span style={{ color: '#e5e7eb' }}>•</span>
          <a href="#terms">{t('footer.termsOfService')}</a>
        </QuickLinks>
        
        <div className="version">v1.0.0</div>
      </FooterBottom>
    </FooterContainer>
  );
};

export default Footer;
