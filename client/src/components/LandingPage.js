import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { colors, borderRadius, shadows } from './shared/StyledComponents';
import { 
  FaGraduationCap, 
  FaUserGraduate, 
  FaChartLine, 
  FaCalendarCheck, 
  FaChalkboardTeacher, 
  FaMoneyBillWave, 
  FaMobileAlt,
  FaCheckCircle,
  FaSchool,
  FaStar
} from 'react-icons/fa';

const LandingContainer = styled.div`
  min-height: 100vh;
  background: ${colors.background};
`;

const Header = styled.header`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 20px 0;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
`;

const Nav = styled.nav`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled.div`
  font-size: 1.6rem;
  font-weight: 800;
  font-family: var(--font-display);
  background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: flex;
  align-items: center;
  gap: 12px;
  
  svg {
    font-size: 2rem;
    color: ${colors.primaryBlue};
  }
`;

const NavButtons = styled.div`
  display: flex;
  gap: 15px;
`;

const Button = styled.button`
  padding: 10px 24px;
  border-radius: ${borderRadius.pill};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  font-size: 0.95rem;
  
  ${props => props.$primary ? `
    background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
    color: white;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
    }
  ` : `
    background: transparent;
    color: ${colors.textPrimary};
    border: 2px solid ${colors.border};
    
    &:hover {
      background: ${colors.background};
      border-color: ${colors.primaryBlue};
      color: ${colors.primaryBlue};
    }
  `}
`;

const Hero = styled.section`
  max-width: 1200px;
  margin: 0 auto;
  padding: 80px 20px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 40px 20px;
    gap: 40px;
  }
`;

const HeroContent = styled.div`
  h1 {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 20px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    
    @media (max-width: 768px) {
      font-size: 2.5rem;
    }
  }
  
  .gradient-text {
    background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  p {
    font-size: 1.2rem;
    color: ${colors.textSecondary};
    margin-bottom: 30px;
    line-height: 1.6;
  }
`;

const HeroImage = styled.div`
  background: linear-gradient(135deg, #eef2ff 0%, #eff6ff 50%, #f0f9ff 100%);
  border-radius: 24px;
  padding: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 450px;
  box-shadow: 0 20px 60px rgba(59, 130, 246, 0.15);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    animation: pulse 8s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
  
  svg {
    font-size: 180px;
    color: ${colors.primaryBlue};
    opacity: 0.9;
    filter: drop-shadow(0 10px 30px rgba(59, 130, 246, 0.3));
    position: relative;
    z-index: 1;
    animation: float 6s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const Features = styled.section`
  max-width: 1200px;
  margin: 80px auto;
  padding: 0 20px;
  
  h2 {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 60px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
  }
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
`;

const FeatureCard = styled.div`
  background: white;
  padding: 35px;
  border-radius: 20px;
  box-shadow: ${shadows.card};
  border: 1px solid ${colors.border};
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, ${colors.primaryBlue}, ${colors.accentPurple});
    transform: scaleX(0);
    transition: transform 0.4s ease;
  }
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.3);
    
    &::before {
      transform: scaleX(1);
    }
    
    .icon-wrapper {
      transform: scale(1.1) rotate(5deg);
      background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
      
      svg {
        color: white;
      }
    }
  }
  
  .icon-wrapper {
    width: 70px;
    height: 70px;
    border-radius: 16px;
    background: linear-gradient(135deg, #eef2ff, #eff6ff);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    transition: all 0.4s ease;
    
    svg {
      font-size: 2rem;
      color: ${colors.primaryBlue};
      transition: all 0.4s ease;
    }
  }
  
  h3 {
    font-size: 1.35rem;
    font-weight: 700;
    margin-bottom: 12px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
  }
  
  p {
    color: ${colors.textSecondary};
    line-height: 1.7;
    font-size: 0.95rem;
  }
`;

const Pricing = styled.section`
  max-width: 1200px;
  margin: 80px auto 60px;
  padding: 80px 20px;
  background: linear-gradient(135deg, #eef2ff 0%, #eff6ff 50%, #f0f9ff 100%);
  border-radius: 30px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('data:image/svg+xml,<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="2" cy="2" r="1" fill="%233b82f6" opacity="0.1"/></svg>');
    opacity: 0.5;
  }
  
  h2 {
    text-align: center;
    font-size: 2.8rem;
    font-weight: 800;
    margin-bottom: 20px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    position: relative;
    
    @media (max-width: 768px) {
      font-size: 2.2rem;
    }
  }
  
  .pricing-subtitle {
    text-align: center;
    color: ${colors.textSecondary};
    font-size: 1.1rem;
    margin-bottom: 50px;
    position: relative;
  }
`;

const PricingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30px;
  max-width: 800px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PricingCard = styled.div`
  background: white;
  padding: 45px 35px;
  border-radius: 24px;
  box-shadow: ${shadows.card};
  border: 2px solid ${props => props.$popular ? colors.primaryBlue : colors.border};
  position: relative;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  ${props => props.$popular && `
    transform: scale(1.05);
    box-shadow: 0 20px 60px rgba(59, 130, 246, 0.25);
    border-width: 3px;
  `}
  
  &:hover {
    transform: translateY(-8px) ${props => props.$popular ? 'scale(1.05)' : ''};
    box-shadow: 0 25px 50px rgba(59, 130, 246, 0.3);
    border-color: ${colors.primaryBlue};
  }
  
  .badge {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
    color: white;
    padding: 8px 20px;
    border-radius: 25px;
    font-size: 0.85rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
    
    svg {
      font-size: 0.9rem;
    }
  }
  
  .plan-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #eef2ff, #eff6ff);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    
    svg {
      font-size: 1.8rem;
      color: ${colors.primaryBlue};
    }
  }
  
  h3 {
    font-size: 1.6rem;
    font-weight: 800;
    margin-bottom: 15px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
  }
  
  .price {
    font-size: 2.8rem;
    font-weight: 900;
    background: linear-gradient(135deg, ${colors.primaryBlue}, ${colors.accentPurple});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 10px;
    
    span {
      font-size: 1.1rem;
      color: ${colors.textSecondary};
      font-weight: 500;
      background: none;
      -webkit-text-fill-color: ${colors.textSecondary};
    }
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 35px 0;
    
    li {
      padding: 12px 0;
      color: ${colors.textSecondary};
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 0.95rem;
      line-height: 1.5;
      
      svg {
        color: ${colors.success};
        font-size: 1.1rem;
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }
`;

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <LandingContainer>
      <Header>
        <Nav>
          <Logo>
            <FaGraduationCap /> UBUNIFU SEC SMS
          </Logo>
          <NavButtons>
            <Button onClick={() => navigate('/login')}>Login</Button>
            <Button $primary onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </NavButtons>
        </Nav>
      </Header>

      <Hero>
        <HeroContent>
          <h1>
            Comprehensive School Management for <span className="gradient-text">UBUNIFU SEC</span>
          </h1>
          <p>
            Empowering teachers and parents with real-time access to student information. Track attendance, monitor grades, manage finances, and stay connected—all in one secure platform.
          </p>
          <CTAButtons>
            <Button $primary onClick={() => navigate('/register')}>
              Get Started
            </Button>
          </CTAButtons>
        </HeroContent>
        <HeroImage>
          <FaSchool />
        </HeroImage>
      </Hero>

      <Features>
        <h2>Complete School Management Features</h2>
        <FeatureGrid>
          <FeatureCard>
            <div className="icon-wrapper">
              <FaUserGraduate />
            </div>
            <h3>Student Management</h3>
            <p>Complete student profiles, admission tracking, and automatic student number generation (STU####)</p>
          </FeatureCard>
          
          <FeatureCard>
            <div className="icon-wrapper">
              <FaChartLine />
            </div>
            <h3>Grade & Exam Management</h3>
            <p>Record grades, generate report cards, track academic progress, and analyze performance trends</p>
          </FeatureCard>
          
          <FeatureCard>
            <div className="icon-wrapper">
              <FaCalendarCheck />
            </div>
            <h3>Attendance Tracking</h3>
            <p>Digital attendance for students and teachers with monthly summaries and parent notifications</p>
          </FeatureCard>
          
          <FeatureCard>
            <div className="icon-wrapper">
              <FaChalkboardTeacher />
            </div>
            <h3>Teacher Portal</h3>
            <p>Manage teacher assignments, subjects, classes, and performance evaluations</p>
          </FeatureCard>
          
          <FeatureCard>
            <div className="icon-wrapper">
              <FaMoneyBillWave />
            </div>
            <h3>Finance Management</h3>
            <p>Track fees, payments, expenses with mobile money integration (Pesapal)</p>
          </FeatureCard>
          
          <FeatureCard>
            <div className="icon-wrapper">
              <FaMobileAlt />
            </div>
            <h3>Parent Communication</h3>
            <p>SMS & email notifications to parents about grades, attendance, and fees with real-time updates</p>
          </FeatureCard>
        </FeatureGrid>
      </Features>

      <Pricing>
        <h2>Access Portals</h2>
        <p className="pricing-subtitle">Secure access for teachers and parents</p>
        <PricingGrid>
          <PricingCard>
            <div className="plan-icon">
              <FaUserGraduate />
            </div>
            <h3>Parent Portal</h3>
            <div className="price">
              Monitor
            </div>
            <ul>
              <li><FaCheckCircle />View child's grades</li>
              <li><FaCheckCircle />Check attendance</li>
              <li><FaCheckCircle />Fee payment status</li>
              <li><FaCheckCircle />Download reports</li>
              <li><FaCheckCircle />Receive notifications</li>
              <li><FaCheckCircle />View announcements</li>
            </ul>
          </PricingCard>

          <PricingCard $popular>
            <span className="badge"><FaStar /> Primary Access</span>
            <div className="plan-icon">
              <FaChalkboardTeacher />
            </div>
            <h3>Teacher Portal</h3>
            <div className="price">
              Manage
            </div>
            <ul>
              <li><FaCheckCircle />Record attendance</li>
              <li><FaCheckCircle />Enter grades</li>
              <li><FaCheckCircle />Upload materials</li>
              <li><FaCheckCircle />View class lists</li>
              <li><FaCheckCircle />Track curriculum</li>
              <li><FaCheckCircle />Send announcements</li>
              <li><FaCheckCircle />Generate reports</li>
            </ul>
          </PricingCard>
        </PricingGrid>
      </Pricing>
    </LandingContainer>
  );
};

export default LandingPage;
