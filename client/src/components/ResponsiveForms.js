import React from 'react';
import styled from 'styled-components';
import useDevice, { mediaQuery, touchSizes } from '../hooks/useDevice';

// Form Container
export const FormContainer = styled.form`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  
  ${mediaQuery('tablet')} {
    padding: 15px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

// Form Grid Layout
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(280px, 1fr))'};
  gap: 20px;
  margin-bottom: 25px;
  
  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }
`;

// Form Group
export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${props => props.compact ? '15px' : '20px'};
  
  ${mediaQuery('tablet')} {
    margin-bottom: 15px;
  }
`;

// Form Labels
export const FormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: ${props => props.theme?.textColor || '#374151'};
  font-size: 0.95rem;
  line-height: 1.4;
  
  ${props => props.required && `
    &::after {
      content: ' *';
      color: #ef4444;
    }
  `}
  
  ${mediaQuery('tablet')} {
    font-size: 1rem;
    margin-bottom: 10px;
  }
`;

// Base Input Styles
const baseInputStyles = `
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  line-height: 1.5;
  transition: all 0.3s ease;
  background-color: white;
  box-sizing: border-box;
  min-height: ${touchSizes.minTouchTarget};

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    background-color: #fafbfc;
  }

  &:disabled {
    background-color: #f3f4f6;
    border-color: #d1d5db;
    cursor: not-allowed;
    opacity: 0.6;
  }

  &.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
  }

  &.success {
    border-color: #10b981;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
  }

  ${mediaQuery('tablet')} {
    padding: 14px 16px;
    font-size: 1.1rem;
    min-height: ${touchSizes.preferredTouchTarget};
  }

  &::placeholder {
    color: #9ca3af;
    opacity: 1;
  }
`;

// Form Input
export const FormInput = styled.input`
  ${baseInputStyles}
`;

// Form Textarea
export const FormTextarea = styled.textarea`
  ${baseInputStyles}
  min-height: 100px;
  resize: vertical;
  font-family: inherit;
  
  ${mediaQuery('tablet')} {
    min-height: 120px;
  }
`;

// Form Select
export const FormSelect = styled.select`
  ${baseInputStyles}
  cursor: pointer;
  
  option {
    padding: 10px;
  }
`;

// Form Checkbox/Radio Container
export const FormCheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  ${mediaQuery('tablet')} {
    gap: 15px;
  }
`;

export const FormCheckboxItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 8px;
  transition: background-color 0.3s ease;
  cursor: pointer;
  min-height: ${touchSizes.minTouchTarget};
  
  &:hover {
    background-color: rgba(59, 130, 246, 0.05);
  }
  
  input[type="checkbox"],
  input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    
    ${mediaQuery('tablet')} {
      width: 20px;
      height: 20px;
    }
  }
  
  label {
    cursor: pointer;
    flex: 1;
    margin: 0;
    font-weight: 500;
    line-height: 1.4;
  }
`;

// Error Message
export const FormError = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '⚠️';
    font-size: 0.8rem;
  }
  
  ${mediaQuery('tablet')} {
    font-size: 0.9rem;
    margin-top: 8px;
  }
`;

// Success Message
export const FormSuccess = styled.div`
  color: #10b981;
  font-size: 0.875rem;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '✅';
    font-size: 0.8rem;
  }
  
  ${mediaQuery('tablet')} {
    font-size: 0.9rem;
    margin-top: 8px;
  }
`;

// Help Text
export const FormHelp = styled.div`
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 6px;
  line-height: 1.4;
  
  ${mediaQuery('tablet')} {
    font-size: 0.9rem;
    margin-top: 8px;
  }
`;

// Button Group
export const FormButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: ${props => props.align || 'flex-start'};
  margin-top: 30px;
  flex-wrap: wrap;
  
  ${mediaQuery('tablet')} {
    flex-direction: ${props => props.stack ? 'column' : 'row'};
    gap: 12px;
    margin-top: 25px;
  }
  
  ${mediaQuery('mobile')} {
    flex-direction: column;
    align-items: stretch;
  }
`;

// Form Button
export const FormButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;
  min-height: ${touchSizes.minTouchTarget};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          color: white;
          
          &:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          }
        `;
      case 'secondary':
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          
          &:hover:not(:disabled) {
            background: #e5e7eb;
            transform: translateY(-1px);
          }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          
          &:hover:not(:disabled) {
            background: #dc2626;
            transform: translateY(-1px);
          }
        `;
      case 'success':
        return `
          background: #10b981;
          color: white;
          
          &:hover:not(:disabled) {
            background: #059669;
            transform: translateY(-1px);
          }
        `;
      default:
        return `
          background: #6b7280;
          color: white;
          
          &:hover:not(:disabled) {
            background: #4b5563;
            transform: translateY(-1px);
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
  }
  
  ${mediaQuery('tablet')} {
    padding: 14px 24px;
    font-size: 1.1rem;
    min-height: ${touchSizes.preferredTouchTarget};
    min-width: unset;
  }
  
  ${mediaQuery('mobile')} {
    width: 100%;
    justify-content: center;
  }
`;

// File Input Wrapper
export const FormFileInput = styled.div`
  position: relative;
  
  input[type="file"] {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
  
  .file-input-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 16px;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    background: #f9fafb;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: ${touchSizes.minTouchTarget};
    
    &:hover {
      border-color: #3b82f6;
      background: #eff6ff;
      color: #3b82f6;
    }
    
    &.has-file {
      border-color: #10b981;
      background: #f0fdf4;
      color: #059669;
    }
    
    ${mediaQuery('tablet')} {
      padding: 14px 16px;
      min-height: ${touchSizes.preferredTouchTarget};
    }
  }
`;

// Form Section
export const FormSection = styled.div`
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: ${props => props.divider ? '1px solid #e5e7eb' : 'none'};
  
  ${mediaQuery('tablet')} {
    margin-bottom: 25px;
    padding-bottom: 15px;
  }
`;

export const FormSectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  
  ${mediaQuery('tablet')} {
    font-size: 1.3rem;
    margin-bottom: 18px;
  }
`;

// Loading Overlay for Forms
export const FormLoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #f3f4f6;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Responsive Modal Wrapper
export const ResponsiveModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  
  ${mediaQuery('tablet')} {
    padding: 10px;
    align-items: flex-start;
    padding-top: 20px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 0;
    align-items: stretch;
  }
`;

export const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: ${props => props.maxWidth || '600px'};
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  position: relative;
  
  ${mediaQuery('tablet')} {
    max-height: 85vh;
    border-radius: 8px;
  }
  
  ${mediaQuery('mobile')} {
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    display: flex;
    flex-direction: column;
  }
`;

export const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }
  
  ${mediaQuery('tablet')} {
    padding: 15px 20px;
    
    h2 {
      font-size: 1.3rem;
    }
  }
  
  ${mediaQuery('mobile')} {
    flex-shrink: 0;
  }
`;

export const ModalBody = styled.div`
  padding: 20px;
  
  ${mediaQuery('tablet')} {
    padding: 15px 20px;
  }
  
  ${mediaQuery('mobile')} {
    flex: 1;
    overflow-y: auto;
  }
`;

export const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  
  ${mediaQuery('tablet')} {
    padding: 15px 20px;
    flex-direction: row-reverse;
  }
  
  ${mediaQuery('mobile')} {
    flex-shrink: 0;
    flex-direction: column;
    gap: 10px;
  }
`;

export const ModalCloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
  min-width: ${touchSizes.minTouchTarget};
  min-height: ${touchSizes.minTouchTarget};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: #374151;
    background: #f3f4f6;
  }
  
  ${mediaQuery('tablet')} {
    font-size: 1.6rem;
  }
`;

export default {
  FormContainer,
  FormGrid,
  FormGroup,
  FormLabel,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckboxGroup,
  FormCheckboxItem,
  FormError,
  FormSuccess,
  FormHelp,
  FormButtonGroup,
  FormButton,
  FormFileInput,
  FormSection,
  FormSectionTitle,
  FormLoadingOverlay,
  ResponsiveModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton
};
