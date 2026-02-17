import styled from 'styled-components';
import { mediaQuery } from '../../hooks/useDevice';

// ============================================
// DESIGN TOKENS
// ============================================
export const colors = {
  background: '#f5f7fb',
  cardBackground: '#ffffff',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  border: 'rgba(15, 23, 42, 0.06)',
  borderLight: 'rgba(15, 23, 42, 0.04)',
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowHover: 'rgba(15, 23, 42, 0.09)',
  primaryBlue: '#3b82f6',
  primaryBlueLight: '#60a5fa',
  primaryPurple: '#6366f1',
  primaryPurpleLight: '#a78bfa',
  accentBlue: '#2563eb',
  accentBlueDark: '#1d4ed8',
  accentPurple: '#8b5cf6',
  success: '#10b981',
  gradientPrimary: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  gradientAccent: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
  gradientLight: 'linear-gradient(135deg, #eef2ff, #eff6ff)',
  iconBg: 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
  iconColor: '#1d4ed8',
};

export const shadows = {
  card: '0 8px 18px rgba(15, 23, 42, 0.08)',
  cardHover: '0 16px 32px rgba(15, 23, 42, 0.09)',
  button: '0 10px 25px rgba(37, 99, 235, 0.4)',
  buttonHover: '0 16px 30px rgba(37, 99, 235, 0.45)',
};

export const borderRadius = {
  large: '16px',
  medium: '14px',
  small: '12px',
  pill: '999px',
};

// ============================================
// PAGE CONTAINERS
// ============================================
export const PageContainer = styled.div`
  font-family: var(--font-primary);
  min-height: 100vh;
  width: 100%;
  background: ${colors.background};
  padding: 0;
  
  ${mediaQuery('tablet')} {
    padding: 0;
  }
  
  ${mediaQuery('mobile')} {
    padding: 0;
  }
`;

// ============================================
// HEADERS
// ============================================
export const PageHeader = styled.div`
  background: ${colors.gradientLight};
  border-radius: ${borderRadius.large};
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(129, 140, 248, 0.4);
  
  ${mediaQuery('tablet')} {
    padding: 20px;
    border-radius: ${borderRadius.small};
  }
  
  ${mediaQuery('mobile')} {
    padding: 15px;
    border-radius: 10px;
  }

  h1 {
    font-size: 1.8rem;
    margin-bottom: 6px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    display: flex;
    align-items: center;
    gap: 12px;
    
    ${mediaQuery('tablet')} {
      font-size: 1.75rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 1.5rem;
    }
  }

  h2 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    background: ${colors.gradientAccent};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-family: var(--font-display);
    
    ${mediaQuery('tablet')} {
      font-size: 1.35rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 1.25rem;
    }
  }

  p {
    font-size: 0.98rem;
    color: #374151;
    margin-bottom: 5px;
    
    ${mediaQuery('mobile')} {
      font-size: 1rem;
    }
  }
`;

export const SectionTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 20px;
  font-weight: 600;
  color: ${colors.textPrimary};
  letter-spacing: 0.5px;
  font-family: var(--font-display);
  
  ${mediaQuery('tablet')} {
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  ${mediaQuery('mobile')} {
    font-size: 18px;
    margin-bottom: 15px;
  }
`;

// ============================================
// CARDS
// ============================================
export const Card = styled.div`
  background: ${colors.cardBackground};
  border-radius: ${borderRadius.large};
  padding: 24px;
  border: 1px solid ${colors.border};
  box-shadow: ${shadows.card};
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  
  ${mediaQuery('tablet')} {
    padding: 20px;
    border-radius: ${borderRadius.small};
  }
  
  ${mediaQuery('mobile')} {
    padding: 15px;
    border-radius: 10px;
  }

  ${props => props.$hover && `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${shadows.cardHover};
      border-color: rgba(37, 99, 235, 0.35);
    }
  `}
`;

export const Section = styled(Card)`
  margin-bottom: 24px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  
  ${mediaQuery('mobile')} {
    margin-bottom: 20px;
  }
`;

export const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.cardHover};
    border-color: rgba(37, 99, 235, 0.35);
  }

  .stat-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: ${borderRadius.pill};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: ${colors.iconBg};
    color: ${colors.iconColor};
  }

  .stat-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 600;
    color: ${colors.textPrimary};
    line-height: 1.1;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-label {
    color: ${colors.textSecondary};
    font-size: 0.9rem;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
    hyphens: auto;
    line-height: 1.25;
  }

  .stat-sublabel {
    color: ${colors.textMuted};
    font-size: 0.82rem;
    max-width: 100%;
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
    hyphens: auto;
    line-height: 1.25;
  }
`;

export const ActionCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 14px 16px;
  
  &:hover {
    background: #f9fafb;
    transform: translateY(-1px);
    box-shadow: ${shadows.cardHover};
    border-color: rgba(37, 99, 235, 0.35);
  }

  i {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: ${borderRadius.pill};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    background: linear-gradient(135deg, #e0f2fe, #eef2ff);
    color: ${colors.accentBlue};
  }

  span {
    text-align: left;
    font-weight: 500;
    color: ${colors.textPrimary};
  }
`;

export const ContentCard = styled(Card)`
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid ${colors.borderLight};

    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: ${colors.textPrimary};
      margin: 0;
      font-family: var(--font-display);
    }
  }

  .card-body {
    color: ${colors.textPrimary};
  }

  .card-footer {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid ${colors.borderLight};
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
`;

// ============================================
// GRIDS
// ============================================
export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  
  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${props => props.$minWidth || '300px'}, 1fr));
  gap: ${props => props.$gap || '20px'};
  
  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
  }
  
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  
  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }
  
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;

// ============================================
// TABS
// ============================================
export const TabContainer = styled.div`
  background: ${colors.cardBackground};
  border-radius: ${borderRadius.large};
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid ${colors.border};
  box-shadow: ${shadows.card};

  ${mediaQuery('tablet')} {
    padding: 15px;
    border-radius: ${borderRadius.small};
  }

  .tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    border-bottom: 2px solid ${colors.borderLight};
    padding-bottom: 10px;
  }
`;

const isTabActive = (props) => Boolean(props.$active ?? props.active);

export const Tab = styled.button.withConfig({
  // Support legacy `active` prop without forwarding it to DOM (styled-components v5 compatible)
  shouldForwardProp: (prop) => prop !== 'active' && prop !== '$active'
})`
  padding: 10px 18px;
  border-radius: ${borderRadius.pill};
  border: 1px solid ${props => isTabActive(props) ? 'transparent' : colors.border};
  background: ${props => isTabActive(props) ? colors.gradientPrimary : colors.cardBackground};
  color: ${props => isTabActive(props) ? '#f9fafb' : colors.textSecondary};
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  position: relative;

  ${props => isTabActive(props) && `
    box-shadow: ${shadows.button};
    
    &::after {
      content: '';
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: -12px;
      height: 3px;
      border-radius: ${borderRadius.pill};
      background: ${colors.primaryBlue};
    }
  `}

  &:hover {
    background: ${props => isTabActive(props) ? colors.gradientPrimary : '#f9fafb'};
    transform: translateY(-1px);
    border-color: ${props => isTabActive(props) ? 'transparent' : colors.primaryBlue};
  }

  i {
    font-size: 0.9rem;
  }
`;

// ============================================
// BUTTONS
// ============================================
export const Button = styled.button`
  min-height: 40px;
  padding: 0.6rem 1.2rem;
  border-radius: ${borderRadius.pill};
  border: 1px solid transparent;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
  font-size: 0.95rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    box-shadow: none;
  }

  i {
    font-size: 1rem;
  }

  ${mediaQuery('mobile')} {
    min-height: 44px;
  }
`;

export const PrimaryButton = styled(Button)`
  background: ${colors.gradientPrimary};
  color: #f9fafb;
  box-shadow: ${shadows.button};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${shadows.buttonHover};
  }
`;

export const SecondaryButton = styled(Button)`
  background: #f3f4f6;
  border-color: rgba(148, 163, 184, 0.7);
  color: ${colors.textPrimary};

  &:hover:not(:disabled) {
    background: #e5e7eb;
    transform: translateY(-1px);
  }
`;

export const DangerButton = styled(Button)`
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  color: #fef2f2;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4);
  }
`;

export const ActionButton = styled(Button)`
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.border};
  padding: 12px 16px;

  &:hover:not(:disabled) {
    background: #f9fafb;
    transform: translateY(-1px);
    box-shadow: ${shadows.cardHover};
    border-color: rgba(37, 99, 235, 0.35);
  }

  i {
    width: 20px;
    text-align: center;
  }
`;

// ============================================
// LOADING & MESSAGES
// ============================================
export const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid ${colors.borderLight};
    border-top: 4px solid ${colors.primaryBlue};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  p {
    margin-top: 20px;
    color: ${colors.textSecondary};
  }
`;

export const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
  padding: 15px 20px;
  border-radius: ${borderRadius.medium};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;

  i {
    font-size: 1.2rem;
  }
`;

export const InfoMessage = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: ${colors.accentBlue};
  padding: 15px 20px;
  border-radius: ${borderRadius.medium};
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;

  i {
    font-size: 1.2rem;
  }
`;

// ============================================
// FILTERS & FORMS
// ============================================
export const FiltersSection = styled(Section)`
  .filter-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    align-items: end;
    
    ${mediaQuery('mobile')} {
      grid-template-columns: 1fr;
    }
  }

  .filter-group {
    display: flex;
    flex-direction: column;
  }

  label {
    color: ${colors.textPrimary};
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 0.9rem;
  }

  input, select, textarea {
    padding: 12px;
    border: 1px solid ${colors.border};
    background: ${colors.cardBackground};
    color: ${colors.textPrimary};
    border-radius: 0.75rem;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: ${colors.primaryBlue};
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.6);
    }
  }
`;

// ============================================
// UTILITY
// ============================================
export const Divider = styled.div`
  height: 1px;
  background: ${colors.borderLight};
  margin: ${props => props.$margin || '20px 0'};
`;

export const FlexRow = styled.div`
  display: flex;
  align-items: ${props => props.$align || 'center'};
  justify-content: ${props => props.$justify || 'flex-start'};
  gap: ${props => props.$gap || '12px'};
  flex-wrap: ${props => props.$wrap ? 'wrap' : 'nowrap'};
  
  ${mediaQuery('mobile')} {
    flex-direction: ${props => props.$mobileColumn ? 'column' : 'row'};
    align-items: ${props => props.$mobileColumn ? 'stretch' : props.$align || 'center'};
  }
`;

export const FlexColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.$gap || '12px'};
`;
