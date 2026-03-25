import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FaBook, FaUpload, FaDownload, FaEye, FaEdit, FaTrash, FaPlus, FaChartLine, FaFileAlt, FaUsers, FaFilter, FaTasks, FaCheckCircle, FaExclamationTriangle, FaPlay, FaFilePdf, FaFileWord, FaFileImage, FaVideo, FaFileAudio, FaFile, FaTimes, FaExpand, FaCompress, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { TopicManageModal, MaterialsModal, ProgressModal } from './SubjectModals';
import { 
  PageContainer, 
  PageHeader, 
  TabContainer, 
  Tab, 
  Section,
  CardGrid,
  Card,
  PrimaryButton,
  SecondaryButton,
  ActionButton,
  FiltersSection,
  SectionTitle,
  LoadingSpinner as SharedLoadingSpinner,
  colors,
  shadows,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';
import { useAuth } from '../contexts/AuthContext';
import {
  initiateMaterialUpload,
  uploadFileToSignedUrl,
  completeMaterialUpload,
  fetchMaterialAccessInfo,
  downloadMaterialUrl
} from '../services/materialsService';

const SubjectsMenuContainer = styled(PageContainer)`
  padding: 20px;
  
  ${mediaQuery('tablet')} {
    padding: 15px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const Header = styled(PageHeader)`
  h1 {
    display: flex;
    align-items: center;
    gap: 15px;
    font-size: 1.8rem;
    margin-bottom: 10px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    
    ${mediaQuery('tablet')} {
      font-size: 1.75rem;
    }
    
    ${mediaQuery('mobile')} {
      font-size: 1.5rem;
    }
  }

  p {
    font-size: 0.98rem;
    color: #374151;
    margin: 5px 0;
    
    ${mediaQuery('mobile')} {
      font-size: 1rem;
    }
  }
`;

const TabsContainer = styled(TabContainer)`
  .tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    border-bottom: 2px solid ${colors.borderLight};
    padding-bottom: 10px;
  }

  .tab {
    padding: 10px 18px;
    border-radius: ${borderRadius.pill};
    border: 1px solid ${props => props.$active ? 'transparent' : colors.border};
    background: ${props => props.$active ? colors.gradientPrimary : colors.cardBackground};
    color: ${props => props.$active ? '#f9fafb' : colors.textSecondary};
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

    &.active {
      background: ${colors.gradientPrimary};
      color: #f9fafb;
      border-color: transparent;
      box-shadow: ${shadows.button};
    }

    &.active::after {
      content: '';
      position: absolute;
      left: 18px;
      right: 18px;
      bottom: -12px;
      height: 3px;
      border-radius: ${borderRadius.pill};
      background: ${colors.primaryBlue};
    }

    &:hover {
      background: ${props => props.$active ? colors.gradientPrimary : '#f9fafb'};
      transform: translateY(-1px);
      border-color: ${props => props.$active ? 'transparent' : colors.primaryBlue};
    }
  }
`;

const ContentSection = styled(Section)`
  h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: ${colors.textPrimary};
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between;
    font-family: var(--font-display);
  }
`;

const SubjectsGrid = styled(CardGrid)`
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  
  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
  
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const SubjectCard = styled(Card)`
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.cardHover};
    border-color: rgba(37, 99, 235, 0.35);
  }

  .subject-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 12px;
    border-bottom: 1px solid ${colors.borderLight};

    h4 {
      color: ${colors.primaryBlueLight};
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .subject-code {
      background: rgba(59, 130, 246, 0.1);
      color: ${colors.primaryBlue};
      padding: 4px 8px;
      border-radius: ${borderRadius.small};
      font-size: 0.8rem;
      font-weight: 500;
    }
  }

  .subject-info {
    color: ${colors.textSecondary};
    font-size: 0.9rem;
    margin-bottom: 15px;

    p {
      margin: 5px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .subject-progress {
    margin: 15px 0;

    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
      font-size: 0.9rem;
      color: ${colors.textPrimary};
      font-weight: 500;
    }

    .progress-bar {
      height: 8px;
      background: ${colors.borderLight};
      border-radius: ${borderRadius.small};
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }
    }
  }

  .subject-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;

    button {
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;

      &.manage {
        background: rgba(59, 130, 246, 0.2);
        color: #3b82f6;
        
        &:hover {
          background: rgba(59, 130, 246, 0.3);
        }
      }

      &.materials {
        background: rgba(168, 85, 247, 0.2);
        color: #a855f7;
        
        &:hover {
          background: rgba(168, 85, 247, 0.3);
        }
      }

      &.progress {
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        
        &:hover {
          background: rgba(34, 197, 94, 0.3);
        }
      }
    }
  }
`;

const FilterSection = styled(FiltersSection)`
  .action-buttons {
    display: flex;
    gap: 10px;
    margin-left: auto;

    button {
      padding: 8px 16px;
      border: 1px solid ${colors.border};
      border-radius: ${borderRadius.pill};
      background: ${colors.cardBackground};
      color: ${colors.textPrimary};
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;

      &.primary {
        background: ${colors.gradientPrimary};
        color: #f9fafb;
        border-color: transparent;
        box-shadow: ${shadows.button};
        
        &:hover {
          transform: translateY(-1px);
          box-shadow: ${shadows.buttonHover};
        }
      }

      &.secondary {
        background: #f3f4f6;
        color: ${colors.textSecondary};
        border-color: rgba(148, 163, 184, 0.7);
        
        &:hover {
          background: #e5e7eb;
          transform: translateY(-1px);
        }
      }
    }
  }
`;

const MaterialsSection = styled.div`
  .materials-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;

    h4 {
      color: ${colors.textPrimary};
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-display);
      font-weight: 600;
    }

    .upload-btn {
      background: ${colors.gradientPrimary};
      color: #f9fafb;
      border: none;
      padding: 12px 18px;
      border-radius: ${borderRadius.pill};
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      box-shadow: ${shadows.button};

      &:hover {
        transform: translateY(-1px);
        box-shadow: ${shadows.buttonHover};
      }
    }
  }

  .materials-stats {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
    flex-wrap: wrap;
    
    .stat-item {
      background: ${colors.cardBackground};
      padding: 12px 16px;
      border-radius: ${borderRadius.medium};
      border: 1px solid ${colors.border};
      box-shadow: ${shadows.card};
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: ${shadows.cardHover};
      }
      
      .stat-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: ${colors.primaryBlueLight};
      }
      
      .stat-label {
        font-size: 0.85rem;
        color: ${colors.textSecondary};
      }
    }
  }

  .materials-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    
    ${mediaQuery('tablet')} {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    
    ${mediaQuery('mobile')} {
      grid-template-columns: 1fr;
    }
  }

  .material-item {
    background: ${colors.cardBackground};
    border-radius: ${borderRadius.medium};
    padding: 20px;
    border: 1px solid ${colors.border};
    box-shadow: ${shadows.card};
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;

    &:hover {
      transform: translateY(-2px);
      box-shadow: ${shadows.cardHover};
      border-color: rgba(37, 99, 235, 0.35);
    }

    .material-preview {
      display: flex;
      align-items: center;
      gap: 15px;
      margin-bottom: 15px;
      
      .file-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: ${borderRadius.medium};
        font-size: 24px;
        
        &.pdf { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
        &.doc { background: rgba(59, 130, 246, 0.1); color: ${colors.primaryBlue}; }
        &.image { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
        &.video { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
        &.audio { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        &.default { background: rgba(107, 114, 128, 0.1); color: ${colors.textMuted}; }
      }
      
      .material-info {
        flex: 1;
        
        .material-name {
          color: ${colors.textPrimary};
          font-weight: 600;
          font-size: 1.1rem;
          margin-bottom: 8px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .material-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
          
          .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }
      }
    }

    .material-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 15px;
      
      .tag {
        background: rgba(59, 130, 246, 0.15);
        color: #93c5fd;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
    }

    .material-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;

      button {
        padding: 8px 12px;
        border: 1px solid;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.3s ease;

        &.view {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3);
          
          &:hover {
            background: rgba(34, 197, 94, 0.3);
            transform: translateY(-1px);
          }
        }

        &.download {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          border-color: rgba(59, 130, 246, 0.3);
          
          &:hover {
            background: rgba(59, 130, 246, 0.3);
            transform: translateY(-1px);
          }
        }

        &.delete {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
          
          &:hover {
            background: rgba(239, 68, 68, 0.3);
            transform: translateY(-1px);
          }
        }
      }
    }
    
    .material-overlay {
      position: absolute;
      top: 0;
      right: 0;
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      padding: 6px 10px;
      border-radius: 0 12px 0 8px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: rgba(255, 255, 255, 0.6);
    
    .empty-icon {
      font-size: 4rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }
    
    h3 {
      margin-bottom: 10px;
      color: rgba(255, 255, 255, 0.8);
    }
    
    p {
      margin-bottom: 20px;
    }
  }
`;


const FileViewerModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(5px);

  .modal-content {
    background: rgba(30, 41, 59, 0.98);
    border-radius: 16px;
    max-width: 90vw;
    max-height: 90vh;
    width: 100%;
    position: relative;
    border: 1px solid rgba(59, 130, 246, 0.3);
    overflow: hidden;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 25px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(59, 130, 246, 0.1);

      .file-info {
        display: flex;
        align-items: center;
        gap: 12px;
        
        .file-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 20px;
        }
        
        .file-details {
          h3 {
            color: #fff;
            margin: 0 0 4px 0;
            font-size: 1.2rem;
          }
          
          .file-meta {
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.9rem;
          }
        }
      }

      .modal-actions {
        display: flex;
        gap: 10px;
        
        button {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.8);
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          
          &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
          }
          
          &.download-btn {
            background: rgba(59, 130, 246, 0.2);
            border-color: rgba(59, 130, 246, 0.3);
            color: #3b82f6;
            
            &:hover {
              background: rgba(59, 130, 246, 0.3);
            }
          }
          
          &.close-btn {
            background: rgba(239, 68, 68, 0.2);
            border-color: rgba(239, 68, 68, 0.3);
            color: #ef4444;
            
            &:hover {
              background: rgba(239, 68, 68, 0.3);
            }
          }
        }
      }
    }

    .modal-body {
      padding: 20px;
      height: calc(90vh - 80px);
      overflow: auto;
      
      .file-preview {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        
        img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }
        
        video {
          max-width: 100%;
          max-height: 100%;
          border-radius: 8px;
        }
        
        audio {
          width: 100%;
          max-width: 500px;
        }
        
        iframe {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 8px;
        }
        
        .unsupported-preview, .error-preview, .loading-preview {
          text-align: center;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 400px;
          
          .preview-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.5;
          }
          
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(59, 130, 246, 0.3);
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          
          h3 {
            margin-bottom: 10px;
            color: rgba(255, 255, 255, 0.9);
          }
          
          p {
            margin-bottom: 20px;
          }
          
          .download-suggestion {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.3);
            padding: 12px 20px;
            border-radius: 8px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            
            &:hover {
              background: rgba(59, 130, 246, 0.3);
            }
          }
        }
        
        .error-preview {
          .preview-icon {
            color: #ef4444;
          }
        }
      }
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.3);
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ProgressTracker = styled.div`
  .progress-summary {
    display: flex;
    gap: 15px;
    margin-bottom: 25px;
    flex-wrap: wrap;
    
    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 15px 20px;
      text-align: center;
      min-width: 120px;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);
      }
      
      .stat-value {
        font-size: 1.8rem;
        font-weight: bold;
        color: #60a5fa;
        margin-bottom: 5px;
      }
      
      .stat-label {
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.8);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
  }
  
  .topics-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    
    .no-topics-message {
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
      padding: 40px 20px;
      
      p {
        margin-bottom: 10px;
        font-size: 1.1rem;
        
        &:first-child {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
      }
    }
    
    .topic-item {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 15px;
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .topic-checkbox {
        width: 20px;
        height: 20px;
        margin-top: 5px;
        cursor: pointer;
        accent-color: #22c55e;
      }
      
      .topic-info {
        flex: 1;
        
        .topic-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 8px;
          line-height: 1.4;
        }
        
        .topic-description {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        
        .topic-details {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.6);
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
      }
      
      .topic-status {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: capitalize;
        white-space: nowrap;
        
        &.completed {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        &.in_progress {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.3);
        }
        
        &.pending {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
          border: 1px solid rgba(107, 114, 128, 0.3);
        }
      }
    }
  }
`;

const SubjectsMenu = () => {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [subjects, setSubjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    class: '',
    status: ''
  });
  const [progressFilters, setProgressFilters] = useState({
    subject: '',
    status: ''
  });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [subjectTopics, setSubjectTopics] = useState([]);
  const [subjectMaterials, setSubjectMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [materialsFilters, setMaterialsFilters] = useState({
    search: '',
    subject: '',
    category: '',
    fileType: ''
  });
  
  // File viewer states
  const [mediaBlob, setMediaBlob] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  
  // Deletion state to prevent concurrent deletions
  const [deletingMaterials, setDeletingMaterials] = useState(new Set());
  
  // Upload request counter to track multiple calls
  const uploadRequestCounter = useRef(0);
  
  // Global upload tracking to prevent duplicates
  const activeUploads = useRef(new Set());
  const previewObjectUrlRef = useRef(null);

  // Helper function to format file size
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const normalizeMaterialForUi = useCallback((material) => ({
    id: material.id,
    name: material.fileName || material.originalName,
    type: (material.fileType || '').toUpperCase(),
    mimeType: material.mimeType,
    size: formatFileSize(material.fileSize || material.sizeBytes || 0),
    subject: material.subject,
    subjectId: material.subjectId || material.subject_id || null,
    uploadDate: new Date(material.uploadDate || material.createdAt || Date.now()).toISOString().split('T')[0],
    category: material.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    tags: material.tags || [],
    fileName: material.fileName || material.originalName,
    fileAvailable: material.fileAvailable !== false,
    viewUrl: material.viewUrl || null,
    downloadUrl: material.downloadUrl || null
  }), [formatFileSize]);

  const fetchMaterials = useCallback(async (forceRefresh = false) => {
    try {
      // Add timestamp to prevent caching if force refresh
      const url = forceRefresh 
        ? `/api/materials/my-materials?limit=10&t=${Date.now()}`
        : '/api/materials/my-materials?limit=10';
        
      const { data: result } = await api.get(url);

      if (result?.success) {
        // Transform API data to match component expectations
        const transformedMaterials = result.data.map(normalizeMaterialForUi);
        
        // Deduplicate at the source to prevent React key conflicts
        const uniqueMaterials = transformedMaterials.reduce((acc, material) => {
          if (!acc.find(m => m.id === material.id)) {
            acc.push(material);
          } else {
            console.warn(`🚨 API returned duplicate material ID: ${material.id} (${material.name})`);
          }
          return acc;
        }, []);
        
        setMaterials(uniqueMaterials);
      } else {
        console.error('Failed to fetch materials:', result?.message || 'Unknown error');
        setMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to fetch materials');
      setMaterials([]);
    }
  }, [api, normalizeMaterialForUi]);

  // Sample data - replace with API calls
  useEffect(() => {
    fetchSubjects();
    fetchMaterials();
  }, [fetchMaterials]);
  
  // Fetch topics after subjects are loaded
  useEffect(() => {
    if (subjects.length > 0) {
      fetchTopics();
    }
  }, [subjects]);
  
  // Helper function to get file icon and type
  const getFileIcon = useCallback((fileName, mimeType) => {
    const extension = fileName?.toLowerCase().split('.').pop() || '';
    const mime = mimeType?.toLowerCase() || '';
    
    // PDF files
    if (extension === 'pdf' || mime.includes('pdf')) {
      return { icon: <FaFilePdf />, type: 'pdf' };
    }
    
    // Document files
    if (['doc', 'docx'].includes(extension) || mime.includes('document') || mime.includes('word')) {
      return { icon: <FaFileWord />, type: 'doc' };
    }
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension) || mime.includes('image')) {
      return { icon: <FaFileImage />, type: 'image' };
    }
    
    // Video files
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'].includes(extension) || mime.includes('video')) {
      return { icon: <FaVideo />, type: 'video' };
    }
    
    // Audio files
    if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(extension) || mime.includes('audio')) {
      return { icon: <FaFileAudio />, type: 'audio' };
    }
    
    // Default
    return { icon: <FaFile />, type: 'default' };
  }, []);

  // Function to handle material viewing
  const handleViewMaterial = useCallback((material) => {
    if (material.fileAvailable === false) {
      toast.error('This file is no longer available on the server. Re-upload it to restore preview and download.');
      return;
    }
    setMediaBlob(null);
    setSelectedMaterial(material);
    setShowFileViewer(true);
  }, []);
  
  // Function to close file viewer and cleanup
  const handleCloseFileViewer = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setMediaBlob(null);
    setViewerError(null);
    setViewerLoading(false);
    setShowFileViewer(false);
    setSelectedMaterial(null);
  }, []);

  const handleStaleMaterial = useCallback((material, message) => {
    if (!material?.id) {
      return;
    }

    setMaterials(prev => prev.filter(item => item.id !== material.id));
    setSubjectMaterials(prev => prev.filter(item => item.id !== material.id));

    if (selectedMaterial?.id === material.id) {
      handleCloseFileViewer();
    }

    fetchMaterials(true);
    toast.error(message || 'This material record is stale. Re-upload the file to restore access.');
  }, [fetchMaterials, handleCloseFileViewer, selectedMaterial]);

  const selectedMaterialId = selectedMaterial?.id || null;

  // File viewer media URL fetching effect. We now open R2 URLs directly instead of pulling blobs through Express.
  useEffect(() => {
    const controller = new AbortController();
    const activeMaterial = selectedMaterial;
    
    const fetchMedia = async () => {
      if (!showFileViewer || !activeMaterial) {
        setMediaBlob(null);
        setViewerLoading(false);
        setViewerError(null);
        return;
      }
      
      setViewerLoading(true);
      setViewerError(null);
      
      try {
        const accessInfo = await fetchMaterialAccessInfo(activeMaterial.id);
        if (controller.signal.aborted) {
          return;
        }
        setSelectedMaterial(prev => {
          if (!prev || prev.id !== activeMaterial.id) {
            return prev;
          }
          return { ...prev, ...normalizeMaterialForUi(accessInfo) };
        });

        const { type } = getFileIcon(activeMaterial.name, activeMaterial.mimeType);
        if (type === 'pdf' && accessInfo?.viewUrl) {
          const response = await fetch(accessInfo.viewUrl, {
            signal: controller.signal
          });
          if (!response.ok) {
            throw new Error(`Failed to load PDF preview (${response.status})`);
          }

          const pdfBlob = await response.blob();
          if (controller.signal.aborted) {
            return;
          }

          if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
          }

          const objectUrl = URL.createObjectURL(pdfBlob);
          previewObjectUrlRef.current = objectUrl;
          setMediaBlob(objectUrl);
        } else {
          setMediaBlob(accessInfo?.viewUrl || null);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('Error loading media:', err);
        if (err.message?.toLowerCase().includes('material not found')) {
          handleStaleMaterial(activeMaterial, 'This material no longer exists on the server. Re-upload it to restore preview.');
          setViewerError('Material not found');
        } else {
          setViewerError(err.message || 'Failed to load preview');
        }
      } finally {
        setViewerLoading(false);
      }
    };

    fetchMedia();
    
    return () => {
      controller.abort();
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, [getFileIcon, handleStaleMaterial, normalizeMaterialForUi, selectedMaterialId, showFileViewer]);

  // Function to handle material download
  const handleDownloadMaterial = useCallback(async (material) => {
    if (material.fileAvailable === false) {
      toast.error('This file is no longer available on the server. Re-upload it to restore downloads.');
      return;
    }

    try {
      const accessInfo = await fetchMaterialAccessInfo(material.id);
      if (!accessInfo?.downloadUrl) {
        throw new Error('Download URL is not available');
      }
      downloadMaterialUrl(accessInfo.downloadUrl, material.fileName || material.name || 'download');
      toast.success('File downloaded successfully!');
    } catch (error) {
      console.error('Error downloading file:', error);
      if (error.message?.toLowerCase().includes('material not found')) {
        handleStaleMaterial(material, 'This material no longer exists on the server. It has been removed from the list.');
      } else {
        toast.error(error.message || 'Failed to download file. Please try again.');
      }
    }
  }, [handleStaleMaterial]);

  // Function to handle material deletion
  const handleDeleteMaterial = useCallback(async (materialId) => {
    // Prevent concurrent deletions of the same material
    if (deletingMaterials.has(materialId)) {
      toast.warning('This material is already being deleted.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return;
    }

    // Track deletion in progress
    setDeletingMaterials(prev => new Set([...prev, materialId]));
    
    // Show loading toast
    const loadingToast = toast.loading('Deleting material...');

    try {
      const response = await api.delete(`/api/materials/${materialId}`);

      if (response.status >= 200 && response.status < 300) {
        const result = response.data;
        toast.dismiss(loadingToast);
        toast.success(result.message || 'Material deleted successfully!');
        
        // Close file viewer if the deleted material was being viewed
        if (selectedMaterial && selectedMaterial.id === materialId) {
          handleCloseFileViewer();
        }
        
        // Refresh materials list
        fetchMaterials();
      } else {
        throw new Error(response.data?.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.dismiss(loadingToast);
      
      // Provide more specific error messages
      if (error.message.includes('Network')) {
        toast.error('Network error. Please check your connection and try again.');
      } else if (error.message.includes('Authorization') || error.message.includes('permission')) {
        toast.error('You do not have permission to delete this material.');
      } else if (error.message.includes('not found')) {
        toast.error('Material not found. It may have already been deleted.');
        fetchMaterials(); // Refresh the list
      } else {
        toast.error(error.message || 'Failed to delete material. Please try again.');
      }
    } finally {
      // Always clean up deletion tracking
      setDeletingMaterials(prev => {
        const newSet = new Set(prev);
        newSet.delete(materialId);
        return newSet;
      });
    }
  }, [api, fetchMaterials, selectedMaterial, handleCloseFileViewer, deletingMaterials]);

  const filteredMaterials = useMemo(() => {
    const uniqueMaterials = materials.reduce((acc, material) => {
      if (!acc.find(m => m.id === material.id)) {
        acc.push(material);
      }
      return acc;
    }, []);

    return uniqueMaterials.filter(material => {
      const matchesSearch = !materialsFilters.search ||
        material.name?.toLowerCase().includes(materialsFilters.search.toLowerCase());

      const matchesSubject = !materialsFilters.subject ||
        material.subject?.toLowerCase().includes(materialsFilters.subject.toLowerCase());

      const matchesCategory = !materialsFilters.category ||
        material.category?.toLowerCase().includes(materialsFilters.category.toLowerCase());

      const matchesFileType = !materialsFilters.fileType ||
        getFileIcon(material.name, material.mimeType).type === materialsFilters.fileType;

      return matchesSearch && matchesSubject && matchesCategory && matchesFileType;
    });
  }, [materials, materialsFilters, getFileIcon]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data: result } = await api.get('/api/subjects/my-subjects');
      console.log('Subjects API Response:', result);

      if (result?.success && result.data) {
        setSubjects(result.data);
        if (result.data.length === 0) {
          toast.info('No subjects assigned to you yet. Contact your administrator.');
        } else {
          console.log(`✅ Successfully loaded ${result.data.length} subjects`);
        }
        return;
      }

      console.error('API returned unsuccessful result:', result);
      toast.error(result?.message || 'Failed to load subjects');
      setSubjects([]);
    } catch (error) {
      console.error('Error fetching subjects:', error);

      const status = error.response?.status;
      if (status === 403) {
        toast.error('Access denied. Contact your administrator.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load subjects');
      }

      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };


  const fetchTopics = async (subjectId = null) => {
    try {
      setLoading(true);
      // If no specific subject provided, fetch all topics for all subjects
      let allTopics = [];
      
      if (subjectId) {
        // Fetch topics for specific subject
        const { data: result } = await api.get('/api/curriculum/topics', {
          params: { subject_id: subjectId, limit: 100 },
        });

        if (result?.success && result.data) {
          allTopics = result.data;
        } else {
          throw new Error(`Failed to fetch topics for subject ${subjectId}`);
        }
      } else {
        // Fetch topics for all subjects
        for (const subject of subjects) {
          try {
            const { data: result } = await api.get('/api/curriculum/topics', {
              params: { subject_id: subject.id, limit: 100 },
            });

            if (result?.success && result.data) {
              allTopics = [...allTopics, ...result.data];
            }
          } catch (error) {
            console.warn(`Failed to fetch topics for subject ${subject.name}:`, error);
          }
        }
      }

      console.log(`✅ Successfully loaded ${allTopics.length} curriculum topics`);
      setTopics(allTopics);
      
      if (allTopics.length === 0) {
        toast.info('No curriculum topics found. Create some topics to track your progress.');
      }

    } catch (error) {
      console.error('Error fetching curriculum topics:', error);
      toast.error('Failed to fetch curriculum topics');
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUploadMaterial = () => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = false; // Only allow single file selection
    input.accept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.m4v,.jpg,.jpeg,.png,.gif,.mp3,.wav,.flac,.aac,.ogg';
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;
      
      console.log('Files selected in simple upload:', files.map(f => f.name));

      // Show loading toast
      const loadingToast = toast.loading('Uploading file...');

      try {
        const file = files[0];
        console.log('Appending single file:', file.name);
        const initResult = await initiateMaterialUpload({
          file,
          category: 'teaching_material',
          visibility: 'private'
        });

        await uploadFileToSignedUrl(initResult.upload, file);
        await completeMaterialUpload(initResult.material.id);

        toast.dismiss(loadingToast);
        toast.success('File uploaded successfully!');
        console.log('🔄 Refreshing materials list after simple upload...');
        setTimeout(() => {
          fetchMaterials(true);
          console.log('🔄 Force materials refresh triggered');
        }, 500);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.dismiss(loadingToast);
        toast.error(error.response?.data?.message || 'Failed to upload file');
      }
    };
    
    input.click();
  };

  const handleTopicStatusChange = async (topicId, completed) => {
    try {
      console.log(`🔄 Updating topic ${topicId} status to ${completed ? 'completed' : 'pending'}`);
      
      const requestBody = {
        action: completed ? 'finish' : 'update',
        status: completed ? 'completed' : 'pending',
        completion_date: completed ? new Date().toISOString().split('T')[0] : null,
        class_id: filters.class || null
      };
      
      // If marking as completed and there's no start date, also set start date
      if (completed) {
        const currentTopic = topics.find(t => t.id === topicId);
        if (currentTopic && !currentTopic.startDate) {
          requestBody.start_date = new Date().toISOString().split('T')[0];
        }
      }
      
      const response = await api.put(`/api/curriculum/topics/${topicId}/progress`, requestBody);

      if (response.status >= 200 && response.status < 300) {
        const result = response.data;
        console.log('✅ Topic status updated successfully:', result);
        
        toast.success(result.message || `Topic marked as ${completed ? 'completed' : 'pending'}`);
        
        // Update local state with the response data
        const updatedData = result.data || {};
        const newStatus = updatedData.status || (completed ? 'completed' : 'pending');
        const newCompletionDate = updatedData.completion_date || (completed ? new Date().toISOString().split('T')[0] : null);
        const newStartDate = updatedData.start_date;
        const newActualHours = updatedData.actual_hours;
        
        setTopics(prev => prev.map(topic => 
          topic.id === topicId 
            ? { 
                ...topic, 
                status: newStatus,
                completionDate: newCompletionDate,
                startDate: newStartDate || topic.startDate,
                actualHours: newActualHours !== undefined ? newActualHours : topic.actualHours
              }
            : topic
        ));
        
        setSubjectTopics(prev => prev.map(topic => 
          topic.id === topicId 
            ? { 
                ...topic, 
                status: newStatus,
                completionDate: newCompletionDate,
                startDate: newStartDate || topic.startDate,
                actualHours: newActualHours !== undefined ? newActualHours : topic.actualHours
              }
            : topic
        ));
        
        // Refresh subjects to update progress statistics
        setTimeout(() => {
          fetchSubjects();
        }, 500);
        
      } else {
        console.error('❌ Failed to update topic status:', response.data);
        toast.error(response.data?.message || 'Failed to update topic status');
      }
    } catch (error) {
      console.error('❌ Network error updating topic status:', error);
      toast.error(error.response?.data?.message || 'Network error. Please check your connection and try again.');
    }
  };

  // Handle manage button click
  const handleManageClick = async (subject) => {
    setSelectedSubject(subject);
    setLoading(true);
    try {
      // Fetch topics for this subject  
      const response = await api.get('/api/curriculum/topics', {
        params: {
          subject_id: subject.id,
          limit: 100,
          ...(filters.class ? { class_id: filters.class } : {}),
        },
      });

      if (response.status >= 200 && response.status < 300) {
        const result = response.data;
        setSubjectTopics(result?.data || []);
        setShowManageModal(true);
      } else {
        toast.error('Failed to load topics for this subject');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error(error.response?.data?.message || 'Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  // Handle materials button click
  const handleMaterialsClick = async (subject) => {
    setSelectedSubject(subject);
    setLoading(true);
    try {
      const params = {
        subject_id: subject.id,
        limit: 100,
        ...(filters.class ? { class_id: filters.class } : {}),
      };

      let response;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          response = await api.get('/api/materials/my-materials', { params });
          break;
        } catch (error) {
          if (attempt === 1 && (error.code === 'ERR_NETWORK' || !error.response)) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          throw error;
        }
      }

      if (response.status >= 200 && response.status < 300) {
        const result = response.data;
        setSubjectMaterials((result?.data || []).map(normalizeMaterialForUi));
        setShowMaterialsModal(true);
      } else {
        toast.error('Failed to load materials for this subject');
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      const fallbackMaterials = materials.filter(material =>
        material.subjectId === subject.id || material.subject === subject.name
      );

      if (fallbackMaterials.length > 0) {
        setSubjectMaterials(fallbackMaterials);
        setShowMaterialsModal(true);
        toast.warning('Using cached materials because the server connection was interrupted.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load materials');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle progress button click
  const handleProgressClick = async (subject) => {
    setSelectedSubject(subject);
    setLoading(true);
    try {
      // Fetch topics with progress for this subject
      const response = await api.get('/api/curriculum/topics', {
        params: {
          subject_id: subject.id,
          limit: 100,
          ...(filters.class ? { class_id: filters.class } : {}),
        },
      });

      if (response.status >= 200 && response.status < 300) {
        const result = response.data;
        setSubjectTopics(result?.data || []);
        setShowProgressModal(true);
      } else {
        toast.error('Failed to load progress for this subject');
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast.error(error.response?.data?.message || 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  };

  // Add new topic
  const handleAddTopic = async (topicData) => {
    try {
      const response = await api.post('/api/curriculum/topics/create', {
        ...topicData,
        subject_id: selectedSubject.id,
      });

      if (response.status >= 200 && response.status < 300) {
        toast.success('Topic added successfully!');
        // Refresh topics
        handleManageClick(selectedSubject);
      } else {
        toast.error(response.data?.message || 'Failed to add topic');
      }
    } catch (error) {
      console.error('Error adding topic:', error);
      toast.error(error.response?.data?.message || 'Failed to add topic');
    }
  };

  // Upload material for modal (with metadata) - debounced to prevent multiple calls
  const handleUploadMaterialForModal = useCallback(async (files, metadata) => {
    console.log('\n🎆 MODAL UPLOAD HANDLER CALLED:', {
      timestamp: new Date().toISOString(),
      filesReceived: files.length,
      fileDetails: files.map(f => ({ name: f.name, size: f.size, type: f.type, lastModified: f.lastModified })),
      metadata,
      selectedSubjectId: selectedSubject?.id,
      activeUploadsCount: activeUploads.current.size,
      activeUploadsList: Array.from(activeUploads.current.keys())
    });
    
    // Create a unique signature for this upload request
    const fileSignature = files.map(f => `${f.name}_${f.size}_${f.lastModified}`).join('|');
    const uploadSignature = `${selectedSubject?.id}_${fileSignature}_${JSON.stringify(metadata)}`;
    console.log('🔑 Generated upload signature:', uploadSignature);
    
    // Check if this exact upload is already in progress
    if (activeUploads.current.has(uploadSignature)) {
      console.warn('⚠️ Duplicate upload attempt detected and blocked:', uploadSignature);
      toast.warning('Upload already in progress for these files');
      return;
    }
    
    // Track this upload
    activeUploads.current.add(uploadSignature);
    
    let uploadCompleted = false;
    
    uploadRequestCounter.current += 1;
    const requestId = uploadRequestCounter.current;
    console.log(`\n🚀 UPLOAD REQUEST #${requestId} STARTED`);
    console.log('handleUploadMaterialForModal called with:', {
      requestId,
      uploadSignature,
      filesCount: files.length,
      fileNames: files.map(f => f.name),
      metadata,
      selectedSubjectId: selectedSubject?.id,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Ensure we're not processing the same files multiple times
      const uniqueFiles = files.reduce((acc, file) => {
        const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
        const existing = acc.find(f => `${f.name}_${f.size}_${f.lastModified}` === fileKey);
        if (!existing) {
          acc.push(file);
        } else {
          console.warn('Duplicate file detected and removed:', file.name);
        }
        return acc;
      }, []);
      
      console.log('Unique files after deduplication:', uniqueFiles.map(f => f.name));
      
      const uploadedIds = [];

      for (const [index, file] of uniqueFiles.entries()) {
        console.log(`✅ Appending file ${index + 1}/${uniqueFiles.length}:`, file.name);
        const initResult = await initiateMaterialUpload({
          file,
          title: file.name.replace(/\.[^.]+$/, ''),
          description: metadata.description,
          subjectId: selectedSubject.id,
          classId: metadata.class_id || undefined,
          category: metadata.category || 'teaching_material',
          tags: metadata.tags || '',
          visibility: metadata.is_public ? 'public' : 'private'
        });

        await uploadFileToSignedUrl(initResult.upload, file);
        await completeMaterialUpload(initResult.material.id);
        uploadedIds.push(initResult.material.id);
      }

      toast.success(`${uploadedIds.length} file(s) uploaded successfully`);
      uploadCompleted = true;
      handleMaterialsClick(selectedSubject);
      console.log('✅ Post-upload refresh enabled - direct R2 upload completed');
    } catch (error) {
      console.error('Error uploading materials:', error);
      toast.error(error.response?.data?.message || 'Failed to upload materials');
    } finally {
      // Clean up tracking (always clean up to allow retries)
      activeUploads.current.delete(uploadSignature);
      console.log(`🚀 UPLOAD REQUEST #${requestId} FINISHED at ${new Date().toISOString()}`);
      console.log('Upload completed successfully:', uploadCompleted);
      console.log('Active uploads remaining:', activeUploads.current.size);
    }
  }, [selectedSubject, handleMaterialsClick]);


  const renderOverviewTab = () => (
    <>
      <FilterSection>
        <div className="filter-group">
          <label>Search Subjects</label>
          <input
            type="text"
            placeholder="Search by name or code..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Class</label>
          <select
            value={filters.class}
            onChange={(e) => handleFilterChange('class', e.target.value)}
          >
            <option value="">All Classes</option>
            {/* Dynamic class options will be added based on available classes */}
            {subjects.length > 0 && subjects.flatMap(subject => 
              subject.classes || []
            ).filter((className, index, self) => 
              self.indexOf(className) === index
            ).map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        </div>
        <div className="action-buttons">
          <button className="secondary" onClick={() => handleFilterChange('search', '')}>
            <FaFilter /> Clear Filters
          </button>
        </div>
      </FilterSection>

      {loading ? (
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      ) : (
        <SubjectsGrid>
          {subjects.map(subject => (
            <SubjectCard key={subject.id}>
              <div className="subject-header">
                <h4>{subject.name}</h4>
                <div className="subject-code">{subject.code}</div>
              </div>
              
              <div className="subject-info">
                <p><FaUsers /> {subject.students} Students</p>
                <p><FaBook /> Classes: {subject.classes.join(', ')}</p>
                <p><FaFileAlt /> {subject.materialsCount} Materials</p>
                <p><FaTasks /> {subject.lessonsCompleted}/{subject.lessonsPlanned} Lessons</p>
              </div>

              <div className="subject-progress">
                <div className="progress-label">
                  <span>Curriculum Progress</span>
                  <span>{subject.progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${subject.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="subject-actions">
                <button className="manage" onClick={() => handleManageClick(subject)}>
                  <FaEdit /> Manage
                </button>
                <button className="materials" onClick={() => handleMaterialsClick(subject)}>
                  <FaUpload /> Materials
                </button>
                <button className="progress" onClick={() => handleProgressClick(subject)}>
                  <FaChartLine /> Progress
                </button>
              </div>
            </SubjectCard>
          ))}
        </SubjectsGrid>
      )}
    </>
  );

  const renderMaterialsTab = () => {
    const materialStats = {
      total: materials.length,
      documents: materials.filter(m => ['pdf', 'doc'].includes(getFileIcon(m.name).type)).length,
      videos: materials.filter(m => getFileIcon(m.name).type === 'video').length,
      images: materials.filter(m => getFileIcon(m.name).type === 'image').length
    };

    return (
      <MaterialsSection>
        <div className="materials-header">
          <h4><FaFileAlt /> Teaching Materials & Resources</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="upload-btn" onClick={handleUploadMaterial}>
              <FaUpload /> Upload Materials
            </button>
            <button 
              className="upload-btn" 
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                fetchMaterials(true);
              }}
              style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="materials-stats">
          <div className="stat-item">
            <div className="stat-value">{materialStats.total}</div>
            <div className="stat-label">Total Files</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{materialStats.documents}</div>
            <div className="stat-label">Documents</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{materialStats.videos}</div>
            <div className="stat-label">Videos</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{materialStats.images}</div>
            <div className="stat-label">Images</div>
          </div>
        </div>

        <FilterSection>
          <div className="filter-group">
            <label>Search Materials</label>
            <input
              type="text"
              placeholder="Search by name or content..."
              value={materialsFilters.search}
              onChange={(e) => setMaterialsFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          <div className="filter-group">
            <label>Subject</label>
            <select
              value={materialsFilters.subject}
              onChange={(e) => setMaterialsFilters(prev => ({ ...prev, subject: e.target.value }))}
            >
              <option value="">All Subjects</option>
              {[...new Set(materials.map(m => m.subject).filter(Boolean))].map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Category</label>
            <select
              value={materialsFilters.category}
              onChange={(e) => setMaterialsFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">All Categories</option>
              {[...new Set(materials.map(m => m.category).filter(Boolean))].map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>File Type</label>
            <select
              value={materialsFilters.fileType}
              onChange={(e) => setMaterialsFilters(prev => ({ ...prev, fileType: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="pdf">PDF Documents</option>
              <option value="doc">Word Documents</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="audio">Audio Files</option>
            </select>
          </div>
          <div className="action-buttons">
            <button 
              className="secondary" 
              onClick={() => setMaterialsFilters({ search: '', subject: '', category: '', fileType: '' })}
            >
              <FaFilter /> Clear Filters
            </button>
          </div>
        </FilterSection>

        {filteredMaterials.length > 0 ? (
          <div className="materials-grid">
            {filteredMaterials.map(material => {
              const { icon, type } = getFileIcon(material.name, material.mimeType);
              const tags = material.tags || [];
              
              return (
                <div key={`material-${material.id}-${material.uploadDate}`} className="material-item">
                  <div className="material-overlay">{type.toUpperCase()}</div>
                  
                  <div className="material-preview">
                    <div className={`file-icon ${type}`}>
                      {icon}
                    </div>
                    
                    <div className="material-info">
                      <div className="material-name" title={material.name}>
                        {material.name}
                      </div>
                      <div className="material-meta">
                        <div className="meta-item">
                          <FaUsers />
                          {material.subject || 'No Subject'}
                        </div>
                        <div className="meta-item">
                          <FaFileAlt />
                          {material.size}
                        </div>
                        <div className="meta-item">
                          📅 {material.uploadDate}
                        </div>
                      </div>
                    </div>
                  </div>

                  {tags.length > 0 && (
                    <div className="material-tags">
                      {tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="tag">{tag}</span>
                      ))}
                      {tags.length > 3 && <span className="tag">+{tags.length - 3} more</span>}
                    </div>
                  )}

                  {material.fileAvailable === false && (
                    <div className="material-tags">
                      <span className="tag" style={{ background: '#fee2e2', color: '#991b1b' }}>
                        File Missing - Re-upload Required
                      </span>
                    </div>
                  )}

                  <div className="material-actions">
                    <button 
                      className="view" 
                      onClick={() => handleViewMaterial(material)}
                      disabled={material.fileAvailable === false}
                      title="Preview file"
                    >
                      <FaEye /> View
                    </button>
                    <button 
                      className="download" 
                      onClick={() => handleDownloadMaterial(material)}
                      disabled={material.fileAvailable === false}
                      title="Download file"
                    >
                      <FaDownload /> Download
                    </button>
                    <button 
                      className="delete" 
                      onClick={() => handleDeleteMaterial(material.id)}
                      disabled={deletingMaterials.has(material.id)}
                      title={deletingMaterials.has(material.id) ? "Deleting..." : "Delete file"}
                    >
                      {deletingMaterials.has(material.id) ? (
                        <>
                          <div className="spinner" style={{ 
                            width: '12px', 
                            height: '12px', 
                            border: '2px solid transparent', 
                            borderTop: '2px solid currentColor', 
                            borderRadius: '50%', 
                            animation: 'spin 1s linear infinite' 
                          }} /> Deleting...
                        </>
                      ) : (
                        <><FaTrash /> Delete</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <FaFileAlt />
            </div>
            <h3>No materials found</h3>
            <p>No materials match your current filters. Try adjusting your search criteria or upload some materials.</p>
            <button className="upload-btn" onClick={handleUploadMaterial}>
              <FaUpload /> Upload Your First Material
            </button>
          </div>
        )}
      </MaterialsSection>
    );
  };

  // File Viewer Modal Component
  const renderFileViewer = () => {
    if (!showFileViewer || !selectedMaterial) return null;

    const { icon, type } = getFileIcon(selectedMaterial.name, selectedMaterial.mimeType);

    const renderPreview = () => {
      if (viewerLoading) {
        return (
          <div className="loading-preview">
            <div className="spinner"></div>
            <p>Loading preview...</p>
          </div>
        );
      }

      if (viewerError) {
        return (
          <div className="error-preview">
            <div className="preview-icon">{icon}</div>
            <h3>Failed to load preview</h3>
            <p>{viewerError}</p>
            <button 
              className="download-suggestion"
              onClick={() => handleDownloadMaterial(selectedMaterial)}
            >
              <FaDownload /> Try downloading instead
            </button>
          </div>
        );
      }

      if (!mediaBlob) {
        return (
          <div className="unsupported-preview">
            <div className="preview-icon">{icon}</div>
            <h3>Preview not available</h3>
            <p>Unable to generate preview for this file.</p>
            <button 
              className="download-suggestion"
              onClick={() => handleDownloadMaterial(selectedMaterial)}
            >
              <FaDownload /> Download to view
            </button>
          </div>
        );
      }

      switch (type) {
        case 'image':
          return (
            <img 
              src={mediaBlob} 
              alt={selectedMaterial.name}
              onError={() => setViewerError('Failed to load image')}
            />
          );
        
        case 'video':
          return (
            <video 
              controls 
              width="100%" 
              height="auto"
              style={{ maxHeight: '70vh' }}
              onError={() => setViewerError('Failed to load video. The video format may not be supported.')}
              preload="metadata"
            >
              <source src={mediaBlob} type={selectedMaterial.mimeType || 'video/mp4'} />
              <source src={mediaBlob} type="video/mp4" />
              <source src={mediaBlob} type="video/webm" />
              <source src={mediaBlob} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          );
        
        case 'audio':
          return (
            <audio 
              controls 
              style={{ width: '100%', maxWidth: '500px' }}
              onError={() => setViewerError('Failed to load audio. The audio format may not be supported.')}
              preload="metadata"
            >
              <source src={mediaBlob} type={selectedMaterial.mimeType || 'audio/mp3'} />
              <source src={mediaBlob} type="audio/mp3" />
              <source src={mediaBlob} type="audio/wav" />
              <source src={mediaBlob} type="audio/ogg" />
              Your browser does not support the audio tag.
            </audio>
          );
        
        case 'pdf':
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <iframe 
                src={`${mediaBlob}#toolbar=1&navpanes=1&scrollbar=1`}
                title={selectedMaterial.name}
                width="100%"
                height="100%"
                style={{ 
                  border: 'none', 
                  minHeight: '600px',
                  borderRadius: '8px'
                }}
                onError={() => {
                  // Fallback: show download option if iframe fails
                  setViewerError('PDF preview not supported in this browser. Please download to view.');
                }}
                onLoad={(e) => {
                  // Check if iframe loaded successfully
                  try {
                    const iframeDoc = e.target.contentDocument || e.target.contentWindow.document;
                    if (!iframeDoc || iframeDoc.body.children.length === 0) {
                      setViewerError('PDF preview not available. Please download to view.');
                    }
                  } catch (err) {
                    // Cross-origin access is expected for signed preview URLs.
                  }
                }}
              />
            </div>
          );
        
        default:
          return (
            <div className="unsupported-preview">
              <div className="preview-icon">{icon}</div>
              <h3>Preview not available</h3>
              <p>This file type cannot be previewed in the browser.</p>
              <button 
                className="download-suggestion"
                onClick={() => handleDownloadMaterial(selectedMaterial)}
              >
                <FaDownload /> Download to view
              </button>
            </div>
          );
      }
    };

    return (
      <FileViewerModal onClick={(e) => e.target === e.currentTarget && handleCloseFileViewer()}>
        <div className="modal-content">
          <div className="modal-header">
            <div className="file-info">
              <div className={`file-icon ${type}`}>
                {icon}
              </div>
              <div className="file-details">
                <h3>{selectedMaterial.name}</h3>
                <div className="file-meta">
                  {selectedMaterial.subject} • {selectedMaterial.size} • {selectedMaterial.uploadDate}
                </div>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="download-btn" 
                onClick={() => handleDownloadMaterial(selectedMaterial)}
                title="Download file"
              >
                <FaDownload /> Download
              </button>
              <button 
                className="close-btn" 
                onClick={handleCloseFileViewer}
                title="Close viewer"
              >
                <FaTimes /> Close
              </button>
            </div>
          </div>
          
          <div className="modal-body">
            <div className="file-preview">
              {renderPreview()}
            </div>
          </div>
        </div>
      </FileViewerModal>
    );
  };

  // Function to get filtered topics for the progress tab
  const getFilteredTopicsForProgress = useCallback(() => {
    return topics.filter(topic => {
      const matchesSubject = !progressFilters.subject || 
        topic.subject?.toLowerCase().includes(progressFilters.subject.toLowerCase());
      const matchesStatus = !progressFilters.status || topic.status === progressFilters.status;
      
      return matchesSubject && matchesStatus;
    });
  }, [topics, progressFilters]);

  const renderProgressTab = () => {
    const filteredTopics = getFilteredTopicsForProgress();
    const uniqueSubjects = [...new Set(topics.map(topic => topic.subject).filter(Boolean))];
    
    // Calculate summary statistics
    const totalTopics = filteredTopics.length;
    const completedTopics = filteredTopics.filter(topic => topic.status === 'completed').length;
    const inProgressTopics = filteredTopics.filter(topic => topic.status === 'in_progress').length;
    const pendingTopics = filteredTopics.filter(topic => !topic.status || topic.status === 'pending').length;
    const completionPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    
    return (
      <ProgressTracker>
        {/* Progress Summary Stats */}
        <div className="progress-summary">
          <div className="stat-card">
            <div className="stat-value">{totalTopics}</div>
            <div className="stat-label">Total Topics</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completedTopics}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{inProgressTopics}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{pendingTopics}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completionPercentage}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        <FilterSection>
          <div className="filter-group">
            <label>Subject</label>
            <select 
              value={progressFilters.subject} 
              onChange={(e) => setProgressFilters(prev => ({ ...prev, subject: e.target.value }))}
            >
              <option value="">All Subjects</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={progressFilters.status} 
              onChange={(e) => setProgressFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div className="action-buttons">
            <button className="secondary" onClick={() => setProgressFilters({ subject: '', status: '' })}>
              <FaFilter /> Clear Filters
            </button>
            <button className="primary" onClick={() => fetchTopics()}>
              <FaPlus /> Refresh Topics
            </button>
          </div>
        </FilterSection>

        {loading ? (
          <LoadingSpinner>
            <div className="spinner"></div>
          </LoadingSpinner>
        ) : (
          <div className="topics-list">
            {filteredTopics.length === 0 ? (
              <div className="no-topics-message">
                <p>No curriculum topics found.</p>
                {totalTopics === 0 ? (
                  <p>Create some curriculum topics to start tracking your progress.</p>
                ) : (
                  <p>Try adjusting your filters to see more topics.</p>
                )}
              </div>
            ) : (
              filteredTopics.map(topic => (
                <div key={topic.id} className="topic-item">
                  <input
                    type="checkbox"
                    className="topic-checkbox"
                    checked={topic.status === 'completed'}
                    onChange={(e) => handleTopicStatusChange(topic.id, e.target.checked)}
                  />
                  <div className="topic-info">
                    <div className="topic-title">{topic.title}</div>
                    <div className="topic-description">{topic.description}</div>
                    <div className="topic-details">
                      {topic.subject} • {topic.estimatedHours}h estimated
                      {topic.actualHours > 0 && ` • ${topic.actualHours}h actual`}
                      {topic.completionDate && ` • Completed on ${new Date(topic.completionDate).toLocaleDateString()}`}
                      {topic.className && ` • Class: ${topic.className}`}
                    </div>
                  </div>
                  <div className={`topic-status ${topic.status || 'pending'}`}>
                    {topic.status === 'completed' && <FaCheckCircle />}
                    {topic.status === 'in_progress' && <FaExclamationTriangle />}
                    {(topic.status || 'pending').charAt(0).toUpperCase() + (topic.status || 'pending').slice(1).replace('_', ' ')}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </ProgressTracker>
    );
  };

  return (
    <SubjectsMenuContainer>
      <Header>
        <h1>
          <FaBook />
          Subjects Management
        </h1>
        <p>Manage your assigned subjects, lesson plans, and teaching materials</p>
        <p>Track curriculum progress and share resources with colleagues</p>
      </Header>

      <TabsContainer>
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <FaBook /> Subject Overview
          </div>
          <div 
            className={`tab ${activeTab === 'materials' ? 'active' : ''}`}
            onClick={() => handleTabChange('materials')}
          >
            <FaUpload /> Materials & Resources
          </div>
          <div 
            className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
            onClick={() => handleTabChange('progress')}
          >
            <FaChartLine /> Curriculum Progress
          </div>
        </div>
      </TabsContainer>

      <ContentSection>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'progress' && renderProgressTab()}
      </ContentSection>

      {/* Modals */}
      <TopicManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        subject={selectedSubject}
        topics={subjectTopics}
        onAddTopic={handleAddTopic}
        onUpdateTopic={() => {}} // TODO: Implement update functionality
        onDeleteTopic={() => {}} // TODO: Implement delete functionality
      />

      <MaterialsModal
        isOpen={showMaterialsModal}
        onClose={() => setShowMaterialsModal(false)}
        subject={selectedSubject}
        materials={subjectMaterials}
        onUploadMaterial={handleUploadMaterialForModal}
        onDeleteMaterial={() => {}} // TODO: Implement delete functionality
      />

      <ProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        subject={selectedSubject}
        topics={subjectTopics}
        onTopicStatusChange={() => {
          // Refresh topics and subjects data
          if (selectedSubject) {
            handleProgressClick(selectedSubject);
          }
          fetchSubjects();
        }}
      />

      {/* File Viewer Modal */}
      {renderFileViewer()}
    </SubjectsMenuContainer>
  );
};

export default SubjectsMenu;
