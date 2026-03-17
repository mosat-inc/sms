import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    FaGraduationCap, FaPlus, FaEdit, FaEye, FaChartBar, FaDownload, 
    FaCalendarAlt, FaFilter, FaSearch, FaUsers, FaTasks, FaCheckCircle,
    FaExclamationTriangle, FaFileAlt, FaCog, FaSort, FaSave, FaTrash,
    FaFilePdf,
    FaInfoCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '../contexts/AuthContext';
import { AnalyticsChartsGrid } from './charts/AnalyticsCharts';
import { exportToPDF, generateAssessmentReportPDF } from '../utils/pdfExport';
import {
  PageContainer,
  PageHeader,
  TabContainer,
  Tab,
  Section,
  FiltersSection as SharedFiltersSection,
  InfoMessage,
  ErrorMessage,
  LoadingSpinner as SharedLoadingSpinner,
  SectionTitle,
  StatsGrid,
  StatCard,
  ActionButton,
  PrimaryButton,
  SecondaryButton,
  colors,
  shadows,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const GradesMenuContainer = styled(PageContainer)`
  padding: 20px;
  --grades-surface: linear-gradient(145deg, #f7f9ff 0%, #e8eefc 100%);
  --grades-shadow-raised: -10px -10px 22px rgba(255, 255, 255, 0.95), 10px 10px 24px rgba(148, 163, 184, 0.26);
  --grades-shadow-inset: inset -4px -4px 10px rgba(255, 255, 255, 0.88), inset 4px 4px 10px rgba(148, 163, 184, 0.16);
  
  ${mediaQuery('tablet')} {
    padding: 15px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const Header = styled(PageHeader)`
  background: var(--grades-surface);
  border-radius: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: var(--grades-shadow-raised);

  h1 {
    display: flex;
    align-items: center;
    gap: 15px;

    &::before {
      content: '📊';
      font-size: 2rem;
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
      transform: translateY(-1px);
      border-color: ${colors.primaryBlue};
    }

    &:hover:not(.active) {
      background: ${colors.gradientLight};
      color: ${colors.textPrimary};
    }

    &.active:hover {
      background: ${colors.gradientPrimary};
      color: #f9fafb;
      border-color: transparent;
    }
  }
`;

const ContentSection = styled(Section)`
  background: var(--grades-surface);
  border-radius: 0;
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: var(--grades-shadow-raised);

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

const FilterSection = styled(SharedFiltersSection)`
  background: var(--grades-surface);
  border-radius: 0;
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: var(--grades-shadow-raised);

  .action-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-left: auto;
  }
`;

const NeumoStatCard = styled(StatCard)`
  border-radius: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--grades-surface);
  box-shadow: var(--grades-shadow-raised);
`;

const AssessmentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const AssessmentCard = styled.div`
  background: var(--grades-surface);
  border-radius: 0;
  padding: 20px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  transition: all 0.3s ease;
  box-shadow: var(--grades-shadow-raised);

  &:hover {
    transform: translateY(-2px);
    box-shadow: -12px -12px 28px rgba(255, 255, 255, 0.98), 12px 12px 28px rgba(148, 163, 184, 0.28);
    border-color: rgba(37, 99, 235, 0.35);
  }

  .assessment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h4 {
      color: ${colors.textPrimary};
      margin: 0;
      font-size: 1.2rem;
      font-weight: 600;
      font-family: var(--font-display);
    }

    .assessment-type {
      background: rgba(99, 102, 241, 0.12);
      color: ${colors.primaryPurple};
      border: 1px solid rgba(99, 102, 241, 0.18);
      padding: 4px 8px;
      border-radius: 0;
      font-size: 0.8rem;
      text-transform: capitalize;
    }
  }

  .assessment-info {
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

  .grading-progress {
    margin: 15px 0;

      .progress-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: ${colors.textPrimary};
        margin-bottom: 5px;
        font-size: 0.9rem;
      }

    .progress-bar {
      height: 6px;
      background: rgba(15, 23, 42, 0.08);
      border-radius: 0;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }
    }
  }

  .assessment-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;

    button {
      padding: 8px 12px;
      border: none;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;

      &.grade {
        background: rgba(34, 197, 94, 0.12);
        color: #047857;
        border: 1px solid rgba(34, 197, 94, 0.2);
        
        &:hover {
          background: rgba(34, 197, 94, 0.18);
        }
      }

      &.view {
        background: rgba(59, 130, 246, 0.12);
        color: ${colors.accentBlue};
        border: 1px solid rgba(59, 130, 246, 0.2);
        
        &:hover {
          background: rgba(59, 130, 246, 0.18);
        }
      }

      &.analytics {
        background: rgba(99, 102, 241, 0.12);
        color: ${colors.primaryPurple};
        border: 1px solid rgba(99, 102, 241, 0.2);
        
        &:hover {
          background: rgba(99, 102, 241, 0.18);
        }
      }
    }
  }
`;

const GradingTable = styled(Section)`
  padding: 0;
  overflow: hidden;
  border-radius: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--grades-surface);
  box-shadow: var(--grades-shadow-raised);

  .table-header {
    background: var(--grades-surface);
    padding: 16px 20px;
    border-bottom: 1px solid ${colors.borderLight};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h4 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: ${colors.textPrimary};
      font-family: var(--font-display);
    }

    .save-button {
      background: rgba(34, 197, 94, 0.12);
      color: #047857;
      border: 1px solid rgba(34, 197, 94, 0.25);
      padding: 8px 16px;
      border-radius: 0;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      
      &:hover {
        background: rgba(34, 197, 94, 0.18);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .grades-table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid ${colors.borderLight};
    }

    th {
      background: #f9fafb;
      color: ${colors.textSecondary};
      font-weight: 700;
      position: sticky;
      top: 0;
    }

    td {
      color: ${colors.textPrimary};
    }

    .student-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .student-name {
        font-weight: 600;
        color: ${colors.textPrimary};
      }
      
      .student-id {
        font-size: 0.8rem;
        color: ${colors.textSecondary};
      }
    }

    .grade-input {
      width: 80px;
      padding: 10px 12px;
      border: 1px solid ${colors.border};
      background: var(--grades-surface);
      color: ${colors.textPrimary};
      border-radius: 0;
      text-align: center;
      font-weight: 500;
      box-shadow: var(--grades-shadow-inset);

      &:focus {
        outline: none;
        border-color: ${colors.primaryBlue};
        box-shadow: var(--grades-shadow-inset), 0 0 0 1px rgba(59, 130, 246, 0.4);
      }
    }

    .remarks-input {
      width: 200px;
      padding: 10px 12px;
      border: 1px solid ${colors.border};
      background: var(--grades-surface);
      color: ${colors.textPrimary};
      border-radius: 0;
      box-shadow: var(--grades-shadow-inset);

      &:focus {
        outline: none;
        border-color: ${colors.primaryBlue};
        box-shadow: var(--grades-shadow-inset), 0 0 0 1px rgba(59, 130, 246, 0.4);
      }
    }

    .grade-display {
      display: flex;
      align-items: center;
      gap: 8px;

      .percentage {
        font-weight: 600;
        color: ${colors.success};
      }

      .letter-grade {
        background: rgba(99, 102, 241, 0.12);
        color: ${colors.accentBlueDark};
        border: 1px solid rgba(99, 102, 241, 0.18);
        padding: 2px 6px;
        border-radius: 0;
        font-size: 0.8rem;
        font-weight: 600;
      }
    }

    .status-indicators {
      display: flex;
      gap: 5px;

      .indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        
        &.absent {
          background: #ef4444;
        }
        
        &.excused {
          background: #f59e0b;
        }
        
        &.graded {
          background: #22c55e;
        }
        
        &.pending {
          background: #6b7280;
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

const MarksEntrySection = styled(Section)`
  padding: 0;
  overflow: hidden;
  border-radius: 0;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--grades-surface);
  box-shadow: var(--grades-shadow-raised);

  .table-header {
    padding: 16px 20px;
    border-bottom: 1px solid ${colors.borderLight};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    background: var(--grades-surface);

    h4 {
      margin: 0;
      color: ${colors.textPrimary};
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-display);
      font-weight: 700;
    }

    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }

  .selection-bar {
    padding: 14px 20px;
    background: rgba(59, 130, 246, 0.06);
    border-bottom: 1px solid ${colors.borderLight};
    color: ${colors.textSecondary};
    font-size: 0.92rem;
  }

  .grades-table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid ${colors.borderLight};
    vertical-align: middle;
  }

  th {
    background: #f9fafb;
    color: ${colors.textSecondary};
    font-weight: 700;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  td {
    color: ${colors.textPrimary};
  }

  .student-info {
    display: flex;
    align-items: center;
    gap: 10px;

    .student-name {
      font-weight: 700;
      color: ${colors.textPrimary};
    }

    .student-id {
      font-size: 0.85rem;
      color: ${colors.textSecondary};
    }
  }

  .grade-input {
    width: 92px;
    padding: 10px 12px;
    border: 1px solid ${colors.border};
    background: var(--grades-surface);
    color: ${colors.textPrimary};
    border-radius: 0;
    font-size: 14px;
    text-align: center;
    font-weight: 600;
    box-shadow: var(--grades-shadow-inset);

    &:focus {
      outline: none;
      border-color: ${colors.primaryBlue};
      box-shadow: var(--grades-shadow-inset), 0 0 0 1px rgba(59, 130, 246, 0.4);
    }

    &:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      background: #f3f4f6;
    }
  }

  .remarks-input {
    width: 220px;
    padding: 10px 12px;
    border: 1px solid ${colors.border};
    background: var(--grades-surface);
    color: ${colors.textPrimary};
    border-radius: 0;
    font-size: 14px;
    box-shadow: var(--grades-shadow-inset);

    &:focus {
      outline: none;
      border-color: ${colors.primaryBlue};
      box-shadow: var(--grades-shadow-inset), 0 0 0 1px rgba(59, 130, 246, 0.4);
    }
  }

  .letter-grade {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 34px;
    height: 28px;
    border-radius: 0;
    padding: 0 10px;
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.18);
    color: ${colors.accentBlueDark};
    font-weight: 800;
  }
`;

const GradesMenu = ({ mode = 'grades' }) => {
  const { api, user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedClassId = searchParams.get('class_id') || '';
  const isResultsMode = mode === 'results';
  const isGradesMode = !isResultsMode;
  const [activeTab, setActiveTab] = useState(isResultsMode ? 'assessments' : 'assessments');
  const [assessments, setAssessments] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCreatingAssessment, setIsCreatingAssessment] = useState(false);
  const [newAssessmentData, setNewAssessmentData] = useState({
    title: '',
    assessment_date: '',
    total_marks: 100,
    description: ''
  });
  const [newStudentMarks, setNewStudentMarks] = useState({});
  
  // State for View Results and Analytics
  const [viewingResults, setViewingResults] = useState(false);
  const [viewingAnalytics, setViewingAnalytics] = useState(false);
  const [resultsData, setResultsData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedAssessmentForView, setSelectedAssessmentForView] = useState(null);
  
  // State for comprehensive teacher analytics
  const [teacherAnalyticsData, setTeacherAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [analyticsFilters, setAnalyticsFilters] = useState({
    class_id: requestedClassId,
    subject_id: '',
    exam_type: '',
    assessment_type: '',
    start_date: '',
    end_date: ''
  });
  
  // State for student grade analysis table
  const [studentGradeAnalysis, setStudentGradeAnalysis] = useState(null);
  const [gradeAnalysisLoading, setGradeAnalysisLoading] = useState(false);
  const [gradeAnalysisError, setGradeAnalysisError] = useState(null);
  
  const examTypes = ['mid-term exams', 'terminal exams', 'annual exams', 'mock exams'];

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const isAdmin = user?.role === 'admin';
  const MAX_ALLOWED_MARKS = 100;

  // Helper function to calculate letter grade based on percentage
  const calculateLetterGrade = (percentage) => {
    if (!percentage || percentage < 0) return null;
    
    if (percentage >= 81) return 'A';
    if (percentage >= 61) return 'B';
    if (percentage >= 45) return 'C';
    if (percentage >= 30) return 'D';
    return 'F';
  };

  // Helper function to get automatic remark based on letter grade
  const getAutomaticRemark = (letterGrade) => {
    switch (letterGrade) {
      case 'A': return 'Excellent!';
      case 'B': return 'Good';
      case 'C': return 'Average';
      case 'D': return 'Poor';
      case 'F': return 'Bad';
      default: return '';
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    setActiveTab('assessments');
    setViewingResults(false);
    setViewingAnalytics(false);
    setSelectedAssessment(null);
  }, [mode]);

  useEffect(() => {
    if (!requestedClassId) return;
    setAnalyticsFilters((prev) => {
      if (String(prev.class_id || '') === String(requestedClassId)) return prev;
      return {
        ...prev,
        class_id: String(requestedClassId),
        subject_id: '',
      };
    });
    setActiveTab('assessments');
  }, [requestedClassId]);
  
  // Fetch subjects when class is selected
  useEffect(() => {
    if (analyticsFilters.class_id) {
      fetchSubjectsForClass(analyticsFilters.class_id);
    } else {
      setSubjects([]);
    }
  }, [analyticsFilters.class_id]);

  useEffect(() => {
    if (activeTab === 'assessments') {
      fetchAssessments();
    }
  }, [activeTab, analyticsFilters]);

  useEffect(() => {
    if (isGradesMode && isAdmin && activeTab === 'pending-approvals') {
      fetchPendingApprovals();
    }
  }, [activeTab, isGradesMode, isAdmin]);

  // Load analytics data when the analytics tab is accessed
  useEffect(() => {
    if (activeTab === 'analytics' && !teacherAnalyticsData && !analyticsLoading) {
      fetchTeacherAnalytics();
    }
  }, [activeTab]);

  // Fetch all subjects for analytics filters when classes are loaded
  useEffect(() => {
    if (classes.length > 0 && activeTab === 'analytics') {
      // Load subjects for all classes for the analytics filters
      const fetchAllSubjects = async () => {
        try {
          await api.get('/api/assessments/teacher/all-subjects');
        } catch (error) {
          console.error('Error fetching all subjects for analytics:', error);
        }
      };
      
      if (!subjects.length) {
        fetchAllSubjects();
      }
    }
  }, [classes, activeTab]);

  const fetchSubjects = async () => {
    // We'll fetch subjects when a class is selected
    // For now, just initialize empty array
    setSubjects([]);
  };

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/assessments/teacher/classes');
      setClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };
  
  const fetchSubjectsForClass = async (classId) => {
    if (!classId) {
      setSubjects([]);
      return;
    }
    
    try {
      const response = await api.get(`/api/assessments/teacher/subjects/${classId}`);
      const subjectsData = response.data?.data || [];
      setSubjects(subjectsData);

      if (subjectsData.length === 0) toast.info('No subjects found for this class');
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(analyticsFilters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      if (isResultsMode) {
        queryParams.set('published_only', 'true');
      }

      console.log('Fetching assessments with filters:', analyticsFilters);
      
      const response = await api.get(`/api/grades/assessments/my-assessments?${queryParams}`);
      const result = response.data;

      if (result?.success) {
        setAssessments(result.data || []);
        if ((result.data || []).length === 0 && !isCreatingAssessment) {
          toast.info(
            isResultsMode
              ? 'No approved results are available yet.'
              : 'No assessments found. Create your first assessment to get started!'
          );
        }
      } else {
        toast.error(result?.message || 'Failed to fetch assessments');
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/grades/assessments/pending-approval?academic_year=2024-2025');
      const result = response.data;
      if (result?.success) {
        setPendingApprovals(result.data || []);
      } else {
        toast.error(result?.message || 'Failed to fetch pending approvals');
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const approveAssessment = async (assessmentId) => {
    try {
      const response = await api.post(`/api/grades/assessments/${assessmentId}/approve`);
      const result = response.data;
      if (result?.success) {
        toast.success(result?.message || 'Assessment approved successfully');
        setPendingApprovals((prev) => prev.filter((item) => Number(item.id) !== Number(assessmentId)));
        fetchAssessments();
      } else {
        toast.error(result?.message || 'Failed to approve assessment');
      }
    } catch (error) {
      console.error('Error approving assessment:', error);
      toast.error(error.response?.data?.message || 'Failed to approve assessment');
    }
  };

  const fetchAssessmentDetails = async (assessmentId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/grades/assessments/${assessmentId}`);
      const result = response.data;

      if (result?.success) {
        setSelectedAssessment(result.data.assessment);
        setStudents(result.data.students);
        
        // Initialize grades state
        const gradesData = {};
        (result.data.students || []).forEach(student => {
          gradesData[student.student_id] = {
            marks_obtained: student.marks_obtained || '',
            remarks: student.remarks || '',
            is_absent: student.is_absent || false,
            is_excused: student.is_excused || false,
            percentage: student.percentage,
            letter_grade: student.letter_grade
          };
        });
        setGrades(gradesData);
        setActiveTab('grading');
      } else {
        toast.error(result?.message || 'Failed to fetch assessment details');
      }
    } catch (error) {
      console.error('Error fetching assessment details:', error);
      toast.error('Failed to fetch assessment details');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, field, value) => {
    if (field === 'marks_obtained' && value !== '') {
      const numericValue = Number(value);
      if (Number.isNaN(numericValue)) return;
      if (numericValue < 0 || numericValue > MAX_ALLOWED_MARKS) {
        toast.error('Marks must be between 0 and 100');
        return;
      }
    }

    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
        // Calculate percentage when marks change
        ...(field === 'marks_obtained' && selectedAssessment ? {
          percentage: value ? ((parseFloat(value) / Math.min(parseFloat(selectedAssessment.total_marks || selectedAssessment.max_marks || MAX_ALLOWED_MARKS), MAX_ALLOWED_MARKS)) * 100).toFixed(2) : null
        } : {})
      }
    }));
  };

  const saveGrades = async () => {
    if (!selectedAssessment) return;

    setSaving(true);
    try {
      const gradesArray = Object.entries(grades).map(([studentId, gradeData]) => ({
        student_id: parseInt(studentId),
        marks_obtained: gradeData.marks_obtained ? parseFloat(gradeData.marks_obtained) : null,
        remarks: gradeData.remarks,
        is_absent: gradeData.is_absent,
        is_excused: gradeData.is_excused,
        submission_status: gradeData.is_absent ? 'missing' : 'submitted'
      }));

      const response = await api.post('/api/grades/grades/record', {
        assessment_id: selectedAssessment.id,
        grades: gradesArray
      });

      if (response.data?.success !== false) {
        toast.success(response.data?.message || 'Grades submitted for admin approval');
        // Refresh the assessment details to show updated grades
        fetchAssessmentDetails(selectedAssessment.id);
        // Refresh the assessments list to update grading progress
        fetchAssessments();
      } else {
        toast.error(response.data?.message || 'Failed to save grades');
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  // Function to fetch assessment results
  const fetchAssessmentResults = async (assessmentId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/assessments/${assessmentId}/results`);
      const result = response.data;
      if (result?.success) {
        setResultsData(result.data);
        setSelectedAssessmentForView(result.data.assessment);
        setViewingResults(true);
        setActiveTab('view-results');
      } else {
        toast.error(result?.message || 'Failed to fetch results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch assessment results');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch assessment analytics
  const fetchAssessmentAnalytics = async (assessmentId) => {
    setLoading(true);
    try {
      const response = await api.get(`/api/assessments/${assessmentId}/analytics`);
      const result = response.data;
      if (result?.success) {
        setAnalyticsData(result.data);
        setSelectedAssessmentForView(result.data.assessment);
        setViewingAnalytics(true);
        setActiveTab('view-analytics');
      } else {
        toast.error(result?.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch assessment analytics');
    } finally {
      setLoading(false);
    }
  };

  // Function to export assessment results as PDF
  const exportResultsPDF = () => {
    if (!resultsData || !selectedAssessmentForView) {
      toast.error('No results data available to export');
      return;
    }

    const { assessment, results, summary } = resultsData;
    const doc = new jsPDF();
    
    // Set up document properties
    doc.setProperties({
      title: `Assessment Results - ${assessment.assessment_name}`,
      subject: 'Assessment Results Report',
      creator: 'School Management System'
    });

    // Official Tanzania Header - Centered and Bold
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black color
    
    // THE UNITED REPUBLIC OF TANZANIA
    doc.text('THE UNITED REPUBLIC OF TANZANIA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY
    doc.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // School Header - Stylized
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102); // Dark blue color
    doc.text('UBUNIFU SECONDARY SCHOOL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Tagline
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51); // Dark gray
    doc.text('Excellence in Education • Nurturing Future Leaders', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Contact Information
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85); // Medium gray
    doc.text('P.O. Box 123, Singida, Tanzania', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Decorative line
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 51, 102);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 15;
    
    // Report Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text('Assessment Results Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    
    // Assessment Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    doc.text(`Assessment: ${assessment.assessment_name}`, 20, yPos);
    yPos += 10;
    doc.text(`Subject: ${assessment.subject_name}`, 20, yPos);
    yPos += 10;
    doc.text(`Class: ${assessment.class_name}`, 20, yPos);
    yPos += 10;
    doc.text(`Date: ${new Date(assessment.assessment_date).toLocaleDateString()}`, 20, yPos);
    yPos += 10;
    doc.text(`Total Marks: ${assessment.max_marks}`, 20, yPos);
    yPos += 10;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 20;

    // Summary Statistics
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary Statistics', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.text(`Total Students: ${summary.total_students}`, 20, yPos);
    doc.text(`Graded Students: ${summary.graded_students}`, 70, yPos);
    doc.text(`Class Average: ${summary.average_percentage}%`, 130, yPos);
    yPos += 10;
    doc.text(`Students Passed: ${summary.pass_count}`, 20, yPos);
    doc.text(`Students Failed: ${summary.fail_count}`, 70, yPos);
    doc.text(`Pass Rate: ${((summary.pass_count / summary.graded_students) * 100).toFixed(1)}%`, 130, yPos);
    yPos += 20;

    // Student Results Table
    const tableData = results.map(result => [
      `${result.first_name} ${result.last_name}`,
      result.admission_number,
      result.marks_obtained !== null ? `${result.marks_obtained}/${assessment.max_marks}` : '-',
      result.percentage ? `${result.percentage}%` : '-',
      result.grade || '-',
      result.remarks || '-',
      !result.is_present ? 'Absent' : 'Present'
    ]);

    autoTable(doc, {
      head: [['Student Name', 'Admission No.', 'Marks', 'Percentage', 'Grade', 'Remarks', 'Status']],
      body: tableData,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
    });

    // Save the PDF
    const filename = `${assessment.assessment_name.replace(/[^a-zA-Z0-9]/g, '_')}_Results_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    toast.success('Results PDF exported successfully!');
  };

  // Function to export assessment analytics as PDF
  const exportAnalyticsPDF = () => {
    if (!analyticsData || !selectedAssessmentForView) {
      toast.error('No analytics data available to export');
      return;
    }

    const { assessment, analytics } = analyticsData;
    const doc = new jsPDF();
    
    // Set up document properties
    doc.setProperties({
      title: `Assessment Analytics - ${assessment.assessment_name}`,
      subject: 'Assessment Analytics Report',
      creator: 'School Management System'
    });

    // Official Tanzania Header - Centered and Bold
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0); // Black color
    
    // THE UNITED REPUBLIC OF TANZANIA
    doc.text('THE UNITED REPUBLIC OF TANZANIA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY
    doc.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // School Header - Stylized
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102); // Dark blue color
    doc.text('UBUNIFU SECONDARY SCHOOL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Tagline
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51); // Dark gray
    doc.text('Excellence in Education • Nurturing Future Leaders', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Contact Information
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(85, 85, 85); // Medium gray
    doc.text('P.O. Box 123, Singida, Tanzania', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Decorative line
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 51, 102);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 15;
    
    // Report Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.text('Assessment Analytics Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 20;
    
    // Assessment Details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    doc.text(`Assessment: ${assessment.assessment_name}`, 20, yPos);
    yPos += 10;
    doc.text(`Subject: ${assessment.subject_name}`, 20, yPos);
    yPos += 10;
    doc.text(`Class: ${assessment.class_name}`, 20, yPos);
    yPos += 10;
    doc.text(`Date: ${new Date(assessment.assessment_date).toLocaleDateString()}`, 20, yPos);
    yPos += 10;
    doc.text(`Total Marks: ${assessment.max_marks}`, 20, yPos);
    yPos += 10;
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    yPos += 20;

    // Performance Overview
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Performance Overview', 20, yPos);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.text(`Average Score: ${analytics.average_score}%`, 20, yPos);
    doc.text(`Median Score: ${analytics.median_score}%`, 70, yPos);
    doc.text(`Attendance Rate: ${analytics.attendance_rate}%`, 130, yPos);
    yPos += 10;
    doc.text(`Highest Score: ${analytics.highest_score}%`, 20, yPos);
    doc.text(`Lowest Score: ${analytics.lowest_score}%`, 70, yPos);
    doc.text(`Pass Rate: ${analytics.pass_rate}%`, 130, yPos);
    yPos += 20;

    // Grade Distribution
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Grade Distribution', 20, yPos);
    yPos += 15;
    
    const gradeTableData = Object.entries(analytics.grade_distribution).map(([grade, count]) => [
      `Grade ${grade}`,
      count.toString(),
      `${((count / analytics.performance_trends.length) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      head: [['Grade', 'Count', 'Percentage']],
      body: gradeTableData,
      startY: yPos,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [168, 85, 247], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
    });

    // Performance Ranking
    yPos = (doc.previousAutoTable && doc.previousAutoTable.finalY) ? doc.previousAutoTable.finalY + 20 : yPos + 80;
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Performance Ranking', 20, yPos);
    yPos += 15;

    const rankingTableData = analytics.performance_trends.map((student, index) => [
      (index + 1).toString(),
      student.student,
      `${student.percentage}%`,
      student.grade
    ]);

    autoTable(doc, {
      head: [['Rank', 'Student Name', 'Percentage', 'Grade']],
      body: rankingTableData,
      startY: yPos,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
    });

    // Save the PDF
    const filename = `${assessment.assessment_name.replace(/[^a-zA-Z0-9]/g, '_')}_Analytics_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    
    toast.success('Analytics PDF exported successfully!');
  };

  const createNewAssessment = async () => {
    // Validate that class, subject, and assessment type are selected
    if (!analyticsFilters.class_id || !analyticsFilters.subject_id || !analyticsFilters.assessment_type) {
      toast.error('Please select Class, Subject, and Assessment Type first');
      return;
    }
    
	    try {
	      setLoading(true);
	      // Fetch students for the selected class
	      const response = await api.get(`/api/assessments/class/${analyticsFilters.class_id}/students`);
	      const result = response.data;
	      
	      if (result?.success) {
	        setStudents(result.data);
	          
	          // Initialize marks for all students
	          const initialMarks = {};
	          result.data.forEach(student => {
	            initialMarks[student.id] = {
	              student_id: student.id,
	              marks_obtained: '',
	              is_absent: false,
	              is_excused: false,
	              remarks: ''
	            };
	          });
	          setNewStudentMarks(initialMarks);
          
          // Set default assessment data
          const today = new Date();
          setNewAssessmentData({
            title: `${analyticsFilters.assessment_type.charAt(0).toUpperCase() + analyticsFilters.assessment_type.slice(1)} - ${subjects.find(s => s.id == analyticsFilters.subject_id)?.name || 'Assessment'}`,
            assessment_date: today.toISOString().split('T')[0],
            total_marks: 100,
            description: ''
          });
          
	          setIsCreatingAssessment(true);
	          setActiveTab('create-assessment');
	      } else {
	        toast.error(result?.message || 'Failed to load students');
	      }
	    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNewMarkChange = (studentId, field, value) => {
    if (field === 'marks_obtained' && value !== '') {
      const numericValue = Number(value);
      if (Number.isNaN(numericValue)) return;
      if (numericValue < 0 || numericValue > MAX_ALLOWED_MARKS) {
        toast.error('Marks must be between 0 and 100');
        return;
      }
    }

    setNewStudentMarks(prev => {
      const updatedMarks = {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [field]: value
        }
      };
      
      // If marks_obtained changed, automatically calculate and set remarks
      if (field === 'marks_obtained' && value) {
        const percentage = ((parseFloat(value) / Math.min(newAssessmentData.total_marks, MAX_ALLOWED_MARKS)) * 100);
        const letterGrade = calculateLetterGrade(percentage);
        const automaticRemark = getAutomaticRemark(letterGrade);
        
        // Only set automatic remark if current remark is empty or was previously auto-generated
        const currentRemark = prev[studentId]?.remarks || '';
        const isAutoRemark = ['Excellent!', 'Good', 'Average', 'Poor', 'Bad'].includes(currentRemark);
        
        if (!currentRemark || isAutoRemark) {
          updatedMarks[studentId].remarks = automaticRemark;
        }
      }
      
      return updatedMarks;
    });
  };
  
  const saveNewAssessment = async () => {
    if (!newAssessmentData.title.trim()) {
      toast.error('Please enter assessment title');
      return;
    }

    if (newAssessmentData.total_marks < 1 || newAssessmentData.total_marks > MAX_ALLOWED_MARKS) {
      toast.error('Total marks must be between 1 and 100');
      return;
    }
    
    if (!newAssessmentData.assessment_date) {
      toast.error('Please select assessment date');
      return;
    }
    
    try {
      setSaving(true);
      
      // Create the assessment
      const assessmentPayload = {
        class_id: parseInt(analyticsFilters.class_id),
        subject_id: parseInt(analyticsFilters.subject_id),
        assessment_name: newAssessmentData.title,
        exam_type: analyticsFilters.assessment_type,
        assessment_date: newAssessmentData.assessment_date,
        max_marks: newAssessmentData.total_marks,
        pass_marks: Math.round(newAssessmentData.total_marks * 0.4), // 40% pass mark
        duration_minutes: 120,
        description: newAssessmentData.description
      };
      
      const createResponse = await api.post('/api/assessments', assessmentPayload);
      const createResult = createResponse.data;
      
      if (createResult?.success) {
        const assessmentId = createResult.data.id;
          
          // Save marks for all students using assessments API for consistency
          const marksArray = Object.values(newStudentMarks).map(mark => {
            const marksObtained = mark.marks_obtained ? parseFloat(mark.marks_obtained) : 0;
            const percentage = ((marksObtained / newAssessmentData.total_marks) * 100);
            const letterGrade = calculateLetterGrade(percentage);
            const finalRemarks = mark.remarks || getAutomaticRemark(letterGrade);
            
            return {
              student_id: mark.student_id,
              marks_obtained: marksObtained,
              is_present: !mark.is_absent, // Convert is_absent to is_present
              remarks: finalRemarks,
              grade: letterGrade
            };
          });
          
          console.log('🔍 DEBUG: Saving marks using assessments API:', marksArray);
          
          const marksResponse = await api.put(`/api/assessments/${assessmentId}/marks`, { 
            student_marks: marksArray 
          });
          
          if (marksResponse.status >= 200 && marksResponse.status < 300) {
            console.log('🔍 DEBUG: Assessment and marks saved successfully');
            setIsCreatingAssessment(false);
            
            // Reset form first
            setNewAssessmentData({ title: '', assessment_date: '', total_marks: 100, description: '' });
            setNewStudentMarks({});
            setStudents([]);
            
            // Switch to assessments tab and refresh immediately
            setActiveTab('assessments');
            
            // Use a more reliable approach: immediately fetch with current filters
            // and add the new assessment to the state optimistically
            const newAssessmentForDisplay = {
              id: assessmentId,
              title: newAssessmentData.title,
              assessment_type: analyticsFilters.assessment_type,
              subject_name: subjects.find(s => s.id == analyticsFilters.subject_id)?.name || 'Unknown Subject',
              class_name: classes.find(c => c.id == analyticsFilters.class_id)?.name || 'Unknown Class',
              total_marks: newAssessmentData.total_marks,
              assessment_date: newAssessmentData.assessment_date,
              is_published: false,
              grading_progress: {
                completion_percentage: 0, // Will be updated by fetchAssessments
                graded_count: 0,
                total_students: students.length
              }
            };
            
            // Optimistically update the UI first
            setAssessments(prev => [newAssessmentForDisplay, ...prev]);
            
            // Then fetch the real data to ensure consistency
            setTimeout(() => {
              console.log('🔍 DEBUG: Fetching assessments after save...');
              fetchAssessments(); // This will replace the optimistic data with real data
            }, 300);
            
            toast.success(marksResponse.data?.message || 'Assessment created and marks submitted for admin approval');
          } else {
            toast.error('Assessment created but failed to save marks');
          }
      } else {
        toast.error(createResult?.message || 'Failed to create assessment');
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
    } finally {
      setSaving(false);
    }
  };

  // Function to fetch comprehensive teacher analytics
  const fetchTeacherAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    
    try {
      const token = localStorage.getItem('sms_token');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      // Build query parameters from filters
      const queryParams = new URLSearchParams();
      Object.entries(analyticsFilters).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          queryParams.append(key, value);
        }
      });

      console.log('Fetching teacher analytics with filters:', analyticsFilters);
      
      const response = await api.get(`/api/analytics/teacher/comprehensive?${queryParams}`);
      const result = response.data;

      if (result?.success) {
        setTeacherAnalyticsData(result.data);
        console.log('Teacher analytics data loaded:', result.data);
      } else {
        const errorMessage = result?.message || 'Failed to load analytics data';
        setAnalyticsError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching teacher analytics:', error);
      const errorMessage = 'Network error. Please check your connection and try again.';
      setAnalyticsError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Function to export comprehensive teacher analytics as PDF
  const exportTeacherAnalyticsPDF = () => {
    if (!teacherAnalyticsData) {
      toast.error('No analytics data available to export');
      return;
    }

    setExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // Set up document properties
      doc.setProperties({
        title: 'Comprehensive Teacher Analytics Report',
        subject: 'Teacher Performance Analytics',
        creator: 'School Management System'
      });

      // Official Tanzania Header - Centered and Bold
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 15;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black color
      
      // THE UNITED REPUBLIC OF TANZANIA
      doc.text('THE UNITED REPUBLIC OF TANZANIA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      // MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY
      doc.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // School Header - Stylized
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102); // Dark blue color
      doc.text('UBUNIFU SECONDARY SCHOOL', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      // Tagline
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51); // Dark gray
      doc.text('Excellence in Education • Nurturing Future Leaders', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      // Contact Information
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(85, 85, 85); // Medium gray
      doc.text('P.O. Box 123, Singida, Tanzania', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Decorative line
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 51, 102);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 15;
      
      // Report Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.text('Comprehensive Teacher Analytics Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Report Generation Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 10;
      
      // Filters Applied
      if (analyticsFilters.class_id || analyticsFilters.subject_id || analyticsFilters.exam_type) {
        doc.text('Filters Applied:', 20, yPos);
        yPos += 6;
        
        if (analyticsFilters.class_id) {
          const className = classes.find(c => c.id == analyticsFilters.class_id)?.name;
          doc.text(`• Class: ${className}`, 25, yPos);
          yPos += 6;
        }
        if (analyticsFilters.subject_id) {
          const subjectName = subjects.find(s => s.id == analyticsFilters.subject_id)?.name;
          doc.text(`• Subject: ${subjectName}`, 25, yPos);
          yPos += 6;
        }
        if (analyticsFilters.exam_type) {
          doc.text(`• Exam Type: ${analyticsFilters.exam_type}`, 25, yPos);
          yPos += 6;
        }
      }
      yPos += 10;
      
      // Summary Statistics Section
      doc.setFontSize(16);
      doc.setTextColor(40, 40, 40);
      doc.text('Summary Overview', 20, yPos);
      yPos += 15;
      
      const summaryData = teacherAnalyticsData.summary || {};
      const summaryTableData = [
        ['Total Assessments', summaryData.total_assessments || 0],
        ['Total Students', summaryData.total_students || 0],
        ['Overall Average', `${summaryData.overall_average || 0}%`],
        ['Graded Assessments', summaryData.graded_assessments || 0]
      ];

      autoTable(doc, {
        body: summaryTableData,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 11, cellPadding: 6 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [240, 248, 255] },
          1: { halign: 'center', fontStyle: 'bold', textColor: [34, 197, 94] }
        },
        margin: { left: 20, right: 20 }
      });

      yPos = (doc.previousAutoTable && doc.previousAutoTable.finalY) ? doc.previousAutoTable.finalY + 20 : yPos + 100;
      
      // Grade Distribution Section
      if (teacherAnalyticsData.grade_distribution && Object.keys(teacherAnalyticsData.grade_distribution).length > 0) {
        doc.setFontSize(16);
        doc.text('Grade Distribution', 20, yPos);
        yPos += 10;
        
        const gradeData = Object.entries(teacherAnalyticsData.grade_distribution).map(([grade, count]) => {
          const total = Object.values(teacherAnalyticsData.grade_distribution).reduce((sum, val) => sum + val, 0);
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
          return [`Grade ${grade}`, count, `${percentage}%`];
        });

        autoTable(doc, {
          head: [['Grade', 'Count', 'Percentage']],
          body: gradeData,
          startY: yPos + 5,
          theme: 'striped',
          styles: { fontSize: 10, cellPadding: 5 },
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 20, right: 20 }
        });

        yPos = (doc.previousAutoTable && doc.previousAutoTable.finalY) ? doc.previousAutoTable.finalY + 20 : yPos + 80;
      }
      
      // Top Performers Section
      if (teacherAnalyticsData.performance_trends && teacherAnalyticsData.performance_trends.length > 0) {
        // Add new page if needed
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(16);
        doc.text('Top Performing Students (Top 15)', 20, yPos);
        yPos += 10;
        
        const performanceData = teacherAnalyticsData.performance_trends.slice(0, 15).map((student, index) => [
          `#${index + 1}`,
          student.student_name || 'Unknown',
          student.class_name || 'N/A',
          `${student.average_percentage || 0}%`,
          student.overall_grade || 'N/A',
          student.assessment_count || 0
        ]);

        autoTable(doc, {
          head: [['Rank', 'Student Name', 'Class', 'Average', 'Grade', 'Assessments']],
          body: performanceData,
          startY: yPos + 5,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 4 },
          headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { halign: 'center', fontStyle: 'bold' },
            3: { halign: 'center', fontStyle: 'bold', textColor: [34, 197, 94] },
            4: { halign: 'center', fontStyle: 'bold' },
            5: { halign: 'center' }
          },
          margin: { left: 20, right: 20 }
        });
      }
      
      // Generate filename based on filters
      let filename = 'Comprehensive_Teacher_Analytics';
      if (analyticsFilters.class_id) {
        const className = classes.find(c => c.id == analyticsFilters.class_id)?.name;
        if (className) filename += `_${className.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      if (analyticsFilters.subject_id) {
        const subjectName = subjects.find(s => s.id == analyticsFilters.subject_id)?.name;
        if (subjectName) filename += `_${subjectName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      toast.success('📊 Comprehensive analytics report exported successfully!');
    } catch (error) {
      console.error('Error exporting comprehensive analytics PDF:', error);
      toast.error('Failed to export comprehensive analytics report');
    } finally {
      setExporting(false);
    }
  };

  // Function to export student grade analysis as PDF
  const exportStudentGradeAnalysisPDF = () => {
    if (!studentGradeAnalysis || !studentGradeAnalysis.students || !studentGradeAnalysis.subjects) {
      toast.error('No student grade analysis data available to export');
      return;
    }

    setExporting(true);
    
    try {
      const doc = new jsPDF('landscape'); // Use landscape for better table formatting
      
      // Set up document properties
      doc.setProperties({
        title: 'Student Grade Analysis Report',
        subject: 'Student Performance by Subject',
        creator: 'School Management System'
      });

      // Official Tanzania Header - Centered and Bold (landscape mode)
      const pageWidth = doc.internal.pageSize.getWidth(); // Landscape width
      let yPos = 15;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0); // Black color
      
      // THE UNITED REPUBLIC OF TANZANIA
      doc.text('THE UNITED REPUBLIC OF TANZANIA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      // MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY
      doc.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // School Header - Stylized
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102); // Dark blue color
      doc.text('UBUNIFU SECONDARY SCHOOL', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      
      // Tagline
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(51, 51, 51); // Dark gray
      doc.text('Excellence in Education • Nurturing Future Leaders', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      // Contact Information
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(85, 85, 85); // Medium gray
      doc.text('P.O. Box 123, Singida, Tanzania', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      // Decorative line
      doc.setLineWidth(0.5);
      doc.setDrawColor(0, 51, 102);
      doc.line(20, yPos, pageWidth - 20, yPos);
      yPos += 15;
      
      // Report Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.text('Student Grade Analysis Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      // Report Generation Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 8;
      
      // Analysis Summary
      doc.text(`Students Analyzed: ${studentGradeAnalysis.students.length} | Subjects: ${studentGradeAnalysis.subjects.length}`, 20, yPos);
      yPos += 6;
      
      // Selected Class
      if (analyticsFilters.class_id) {
        const className = classes.find(c => c.id == analyticsFilters.class_id)?.name;
        doc.text(`Class: ${className}`, 20, yPos);
        yPos += 6;
      }
      
      yPos += 10;
      
      // Prepare table data
      const tableHeaders = [
        'Student Name',
        'Student ID',
        ...studentGradeAnalysis.subjects.map(subject => `${subject.code}`),
        'Total',
        'Average',
        'Grade'
      ];
      
      const tableData = studentGradeAnalysis.students.map(student => {
        const row = [
          student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown',
          student.student_number || student.admission_number || 'N/A'
        ];
        
        // Add subject grades
        studentGradeAnalysis.subjects.forEach(subject => {
          const gradeInfo = student.subject_grades ? 
            (student.subject_grades[subject.code] || student.subject_grades[subject.id]) : null;
          
          if (gradeInfo && gradeInfo.percentage !== null && gradeInfo.percentage !== undefined) {
            row.push(`${gradeInfo.percentage}%`);
          } else {
            row.push('No Grade');
          }
        });
        
        // Add totals
        row.push(`${student.total_marks_obtained || 0}/${student.total_possible_marks || 0}`);
        row.push(`${student.overall_average || 0}%`);
        row.push(student.overall_grade || '-');
        
        return row;
      });
      
      // Create the main table
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: yPos,
        theme: 'striped',
        styles: { 
          fontSize: 8, 
          cellPadding: 3,
          valign: 'middle',
          halign: 'center'
        },
        headStyles: { 
          fillColor: [59, 130, 246], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 9
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'left', cellWidth: 25 }, // Student name
          1: { halign: 'center', cellWidth: 20 }, // Student ID
          // Subject columns will auto-size
          [studentGradeAnalysis.subjects.length + 2]: { fontStyle: 'bold' }, // Total
          [studentGradeAnalysis.subjects.length + 3]: { fontStyle: 'bold', textColor: [34, 197, 94] }, // Average
          [studentGradeAnalysis.subjects.length + 4]: { fontStyle: 'bold' } // Grade
        },
        margin: { left: 15, right: 15 },
        tableWidth: 'auto'
      });
      
      yPos = (doc.previousAutoTable && doc.previousAutoTable.finalY) ? doc.previousAutoTable.finalY + 15 : yPos + 100;
      
      // Add Grade Legend
      if (yPos > 180) {
        doc.addPage('landscape');
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text('Grade Legend', 20, yPos);
      yPos += 10;
      
      const legendData = [
        ['Grade A', 'Excellent', '81-100%', 'Excellent'],
        ['Grade B', 'Good', '61-80%', 'Good'],
        ['Grade C', 'Average', '45-60%', 'Average'],
        ['Grade D', 'Poor', '30-44%', 'Poor'],
        ['Grade F', 'Fail', 'Below 30%', 'Fail']
      ];
      
      autoTable(doc, {
        head: [['Grade', 'Description', 'Percentage Range', 'Status']],
        body: legendData,
        startY: yPos,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [168, 85, 247], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'center' },
          1: { halign: 'left' },
          2: { halign: 'center', fontStyle: 'bold' },
          3: { halign: 'center', fontSize: 10, fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 }
      });
      
      // Generate filename
      let filename = 'Student_Grade_Analysis';
      if (analyticsFilters.class_id) {
        const className = classes.find(c => c.id == analyticsFilters.class_id)?.name;
        if (className) filename += `_${className.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      toast.success('👥 Student grade analysis report exported successfully!');
    } catch (error) {
      console.error('Error exporting student grade analysis PDF:', error);
      toast.error('Failed to export student grade analysis report');
    } finally {
      setExporting(false);
    }
  };

  // Function to reset analytics filters
  const resetAnalyticsFilters = () => {
    setAnalyticsFilters({
      class_id: '',
      subject_id: '',
      exam_type: '',
      assessment_type: '',
      start_date: '',
      end_date: ''
    });
    setTeacherAnalyticsData(null);
    setAnalyticsError(null);
  };

  // Function to fetch student grade analysis
  const fetchStudentGradeAnalysis = async () => {
    // Validate required parameters
    if (!analyticsFilters.class_id) {
      toast.error('Please select a class first to load student grade analysis.');
      return;
    }

    setGradeAnalysisLoading(true);
    setGradeAnalysisError(null);
    
    try {
      const token = localStorage.getItem('sms_token');
      if (!token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      // Build query parameters from analytics filters
      const queryParams = new URLSearchParams();
      
      // Use the correct parameters that match the backend API
      const gradeAnalysisParams = {
        class_id: analyticsFilters.class_id,
        subject_id: analyticsFilters.subject_id || '', // Optional subject filter
        exam_type: analyticsFilters.exam_type || '', // Optional exam type filter
        academic_year: '2024-2025' // Backend expects academic_year
      };
      
      Object.entries(gradeAnalysisParams).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          queryParams.append(key, value);
        }
      });

      console.log('Fetching student grade analysis with filters:', gradeAnalysisParams);
      
      const response = await api.get(`/api/analytics/student-grade-analysis?${queryParams}`);
      const result = response.data;

      if (result?.success) {
        setStudentGradeAnalysis(result.data);
        console.log('Student grade analysis data loaded:', result.data);
          
          // Debug: Log the structure to understand the API response
          console.log('🔍 DEBUG - API Response Structure:');
          console.log('Subjects:', result.data.subjects);
          console.log('Students sample (first student):', result.data.students?.[0]);
          
          if (result.data.students?.[0]) {
            const firstStudent = result.data.students[0];
            console.log('First student structure:');
            console.log('- Student ID:', firstStudent.student_id);
            console.log('- Student name:', firstStudent.student_name);
            console.log('- Student number:', firstStudent.student_number);
            console.log('- Subject grades object:', firstStudent.subject_grades);
            console.log('- All student fields:', Object.keys(firstStudent));
            
            // Check each subject's grade data
            if (firstStudent.subject_grades) {
              console.log('🔍 Subject grades breakdown:');
              result.data.subjects?.forEach(subject => {
                console.log(`- Subject ${subject.code} (${subject.name}):`, firstStudent.subject_grades[subject.code]);
                console.log(`- Subject ${subject.id} (by ID):`, firstStudent.subject_grades[subject.id]);
              });
            }
            
            // Check for alternative structures
            if (firstStudent.subjects) {
              console.log('🔍 Alternative subjects structure found:', firstStudent.subjects);
            }
          }
      } else {
        const errorMessage = result?.message || 'Failed to load student grade analysis data';
        setGradeAnalysisError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Error fetching student grade analysis:', error);
      const errorMessage = 'Network error. Please check your connection and try again.';
      setGradeAnalysisError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGradeAnalysisLoading(false);
    }
  };

  // Function to reset grade analysis (same as analytics filters reset)
  const resetGradeAnalysisFilters = () => {
    resetAnalyticsFilters();
    setStudentGradeAnalysis(null);
    setGradeAnalysisError(null);
  };

  const renderAssessmentsTab = () => (
    <>
      <FilterSection>
        <div className="filter-group">
          <label>Class</label>
          <select
            value={analyticsFilters.class_id}
            onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, class_id: e.target.value }))}
          >
            <option value="">Select Class First</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label>Subject {subjects.length > 0 && <span style={{color: '#22c55e', fontSize: '12px'}}>({subjects.length} available)</span>}</label>
          <select
            value={analyticsFilters.subject_id}
            onChange={(e) => {
              setAnalyticsFilters(prev => ({ ...prev, subject_id: e.target.value }));
            }}
            disabled={!analyticsFilters.class_id}
          >
            <option value="">{!analyticsFilters.class_id ? "Select Class First" : "Select Subject"}</option>
            {subjects.length === 0 && analyticsFilters.class_id && (
              <option disabled>Loading subjects...</option>
            )}
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {subject.name} ({subject.code})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Assessment Type</label>
          <select
            value={analyticsFilters.assessment_type}
            onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, assessment_type: e.target.value }))}
          >
            <option value="">All Types</option>
            {examTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {isGradesMode && (
          <div className="action-buttons">
            <PrimaryButton type="button" onClick={createNewAssessment}>
              <FaPlus /> Create Assessment
            </PrimaryButton>
          </div>
        )}
      </FilterSection>

      {loading ? (
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      ) : (
        <AssessmentsGrid>
          {assessments.map(assessment => (
            <AssessmentCard key={assessment.id}>
              <div className="assessment-header">
                <h4>{assessment.title || assessment.assessment_name}</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="assessment-type">{assessment.assessment_type || assessment.exam_type}</div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 10px',
                      borderRadius: borderRadius.pill,
                      background: assessment.is_published ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.14)',
                      color: assessment.is_published ? '#166534' : '#9a3412',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    {assessment.is_published ? 'Approved' : 'Pending Approval'}
                  </div>
                </div>
              </div>
              
              <div className="assessment-info">
                <p><FaUsers /> {assessment.subject_name} - {assessment.class_name}</p>
                <p><FaTasks /> {assessment.total_marks} marks total</p>
                <p><FaCalendarAlt /> {assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString() : 'No date set'}</p>
              </div>

              <div className="grading-progress">
                <div className="progress-label">
                  <span>Grading Progress</span>
                  <span>{assessment.grading_progress?.completion_percentage || 0}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${assessment.grading_progress?.completion_percentage || 0}%` }}
                  ></div>
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: colors.textSecondary,
                  marginTop: '5px',
                }}>
                  {assessment.grading_progress?.graded_count || 0} of {assessment.grading_progress?.total_students || 0} students graded
                </div>
              </div>

              <div className="assessment-actions">
                {isGradesMode ? (
                  <button
                    className="view"
                    onClick={() => fetchAssessmentDetails(assessment.id)}
                  >
                    <FaEdit /> Enter Marks
                  </button>
                ) : (
                  <>
                    <button 
                      className="view"
                      onClick={() => fetchAssessmentResults(assessment.id)}
                    >
                      <FaEye /> View Results
                    </button>
                    <button 
                      className="analytics"
                      onClick={() => fetchAssessmentAnalytics(assessment.id)}
                    >
                      <FaChartBar /> Analytics
                    </button>
                  </>
                )}
              </div>
            </AssessmentCard>
          ))}
        </AssessmentsGrid>
      )}
    </>
  );

  const renderPendingApprovalsTab = () => (
    <>
      <InfoMessage>
        <span style={{ display: 'inline-flex', fontSize: '1.1rem' }}>
          <FaInfoCircle />
        </span>
        <span>Assessments listed here have submitted marks and are waiting for admin approval before they appear under Results.</span>
      </InfoMessage>

      {loading ? (
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      ) : pendingApprovals.length === 0 ? (
        <Section style={{ textAlign: 'center' }}>
          <FaCheckCircle size={48} style={{ marginBottom: '16px', color: colors.success }} />
          <h3 style={{ marginBottom: 8, color: colors.textPrimary }}>No Pending Approvals</h3>
          <p style={{ margin: 0, color: colors.textSecondary }}>All submitted assessments have already been reviewed.</p>
        </Section>
      ) : (
        <AssessmentsGrid>
          {pendingApprovals.map((assessment) => (
            <AssessmentCard key={assessment.id}>
              <div className="assessment-header">
                <h4>{assessment.title || assessment.assessment_name}</h4>
                <div className="assessment-type">Pending Approval</div>
              </div>

              <div className="assessment-info">
                <p><FaUsers /> {assessment.subject_name} - {assessment.class_name}</p>
                <p><FaTasks /> {assessment.graded_count || 0} of {assessment.total_students || 0} students graded</p>
                <p><FaCalendarAlt /> Teacher: {assessment.teacher_first_name} {assessment.teacher_last_name}</p>
              </div>

              <div className="assessment-actions">
                <button className="view" onClick={() => approveAssessment(assessment.id)}>
                  <FaCheckCircle /> Approve Results
                </button>
              </div>
            </AssessmentCard>
          ))}
        </AssessmentsGrid>
      )}
    </>
  );

  const renderGradingTab = () => {
    if (!selectedAssessment) {
      return (
        <Section style={{ textAlign: 'center' }}>
          <FaGraduationCap size={48} style={{ marginBottom: '16px', color: colors.textMuted }} />
          <h3 style={{ marginBottom: 8, color: colors.textPrimary }}>Select an Assessment to Grade</h3>
          <p style={{ margin: 0, color: colors.textSecondary }}>
            Choose an assessment from the Assessments tab to start grading students.
          </p>
        </Section>
      );
    }

    return (
      <GradingTable>
        <div className="table-header">
          <h4>
            <FaEdit />
            Grading: {selectedAssessment.title || selectedAssessment.assessment_name} ({selectedAssessment.total_marks || selectedAssessment.max_marks} marks)
          </h4>
          <button 
            className="save-button" 
            onClick={saveGrades} 
            disabled={saving}
          >
            <FaSave /> {saving ? 'Saving...' : 'Save Grades'}
          </button>
        </div>

        <table className="grades-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Marks Obtained</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Remarks</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.student_id}>
                <td>
                  <div className="student-info">
                    <div>
                      <div className="student-name">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="student-id">{student.student_number}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    className="grade-input"
                    min="0"
                    max={Math.min(Number(selectedAssessment.total_marks || selectedAssessment.max_marks || MAX_ALLOWED_MARKS), MAX_ALLOWED_MARKS)}
                    step="0.5"
                    value={grades[student.student_id]?.marks_obtained || ''}
                    onChange={(e) => handleGradeChange(student.student_id, 'marks_obtained', e.target.value)}
                    disabled={grades[student.student_id]?.is_absent || grades[student.student_id]?.is_excused}
                  />
                </td>
                <td>
                  <div className="grade-display">
                    <span className="percentage">
                      {grades[student.student_id]?.percentage ? 
                        `${parseFloat(grades[student.student_id].percentage).toFixed(1)}%` : 
                        '-'
                      }
                    </span>
                  </div>
                </td>
                <td>
                  {grades[student.student_id]?.letter_grade && (
                    <span className="letter-grade">
                      {grades[student.student_id].letter_grade}
                    </span>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    className="remarks-input"
                    placeholder="Add remarks..."
                    value={grades[student.student_id]?.remarks || ''}
                    onChange={(e) => handleGradeChange(student.student_id, 'remarks', e.target.value)}
                  />
                </td>
                <td>
                  <div className="status-indicators">
                    {grades[student.student_id]?.is_absent && (
                      <div className="indicator absent" title="Absent"></div>
                    )}
                    {grades[student.student_id]?.is_excused && (
                      <div className="indicator excused" title="Excused"></div>
                    )}
                    {grades[student.student_id]?.marks_obtained && !grades[student.student_id]?.is_absent && (
                      <div className="indicator graded" title="Graded"></div>
                    )}
                    {!grades[student.student_id]?.marks_obtained && !grades[student.student_id]?.is_absent && (
                      <div className="indicator pending" title="Pending"></div>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <label style={{ fontSize: '0.85rem', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={grades[student.student_id]?.is_absent || false}
                        onChange={(e) => handleGradeChange(student.student_id, 'is_absent', e.target.checked)}
                      />
                      Absent
                    </label>
                    <label style={{ fontSize: '0.85rem', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={grades[student.student_id]?.is_excused || false}
                        onChange={(e) => handleGradeChange(student.student_id, 'is_excused', e.target.checked)}
                      />
                      Excused
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GradingTable>
    );
  };

  const renderCreateAssessmentTab = () => (
    <>
      <SharedFiltersSection>
        <h3 style={{ margin: 0, marginBottom: 18, color: colors.textPrimary, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaPlus /> Create New Assessment
        </h3>

        <div className="filter-grid" style={{ alignItems: 'start' }}>
          <div className="filter-group">
            <label>Assessment Title *</label>
            <input
              type="text"
              value={newAssessmentData.title}
              onChange={(e) => setNewAssessmentData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Mathematics Mid-Term Exam"
            />
          </div>

          <div className="filter-group">
            <label>Assessment Date *</label>
            <input
              type="date"
              value={newAssessmentData.assessment_date}
              onChange={(e) => setNewAssessmentData((prev) => ({ ...prev, assessment_date: e.target.value }))}
            />
          </div>

          <div className="filter-group">
            <label>Total Marks</label>
            <input
              type="number"
              value={newAssessmentData.total_marks}
              onChange={(e) =>
                setNewAssessmentData((prev) => ({
                  ...prev,
                  total_marks: Math.min(MAX_ALLOWED_MARKS, Math.max(1, parseInt(e.target.value, 10) || 100)),
                }))
              }
              min="1"
              max="100"
            />
          </div>
        </div>

        <div className="filter-group" style={{ marginTop: 14 }}>
          <label>Description (Optional)</label>
          <textarea
            value={newAssessmentData.description}
            onChange={(e) => setNewAssessmentData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Additional information about this assessment..."
            rows={4}
          />
        </div>
      </SharedFiltersSection>

      <InfoMessage>
        <span style={{ display: 'inline-flex', fontSize: '1.2rem' }}>
          <FaInfoCircle />
        </span>
        <span>
          <strong>Selected:</strong>{' '}
          {classes.find((c) => c.id == analyticsFilters.class_id)?.name || 'Class'} |{' '}
          {subjects.find((s) => s.id == analyticsFilters.subject_id)?.name || 'Subject'} |{' '}
          {analyticsFilters.assessment_type
            ? analyticsFilters.assessment_type.charAt(0).toUpperCase() + analyticsFilters.assessment_type.slice(1)
            : 'Assessment Type'}{' '}
          | <strong>Total Marks:</strong> {newAssessmentData.total_marks}
        </span>
      </InfoMessage>

      <MarksEntrySection>
        <div className="table-header">
          <h4>
            <FaEdit />
            Enter Marks: {newAssessmentData.title || 'New Assessment'}
          </h4>
          <div className="actions">
            <SecondaryButton
              type="button"
              onClick={() => {
                setIsCreatingAssessment(false);
                setActiveTab('assessments');
              }}
            >
              <FaTrash /> Cancel
            </SecondaryButton>
            <PrimaryButton type="button" onClick={saveNewAssessment} disabled={saving}>
              <FaSave /> {saving ? 'Saving...' : 'Save Assessment & Marks'}
            </PrimaryButton>
          </div>
        </div>

        <table className="grades-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Marks Obtained</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => {
              const marks = newStudentMarks[student.id] || {};
              const percentage = marks.marks_obtained ? 
                ((parseFloat(marks.marks_obtained) / newAssessmentData.total_marks) * 100).toFixed(1) : null;
              const letterGrade = percentage ? calculateLetterGrade(parseFloat(percentage)) : null;
              
              return (
                <tr key={student.id}>
                  <td>
                    <div className="student-info">
                      <div>
                        <div className="student-name">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="student-id">{student.admission_number}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="grade-input"
                      min="0"
                      max={Math.min(newAssessmentData.total_marks, MAX_ALLOWED_MARKS)}
                      step="0.5"
                      value={marks.marks_obtained || ''}
                      onChange={(e) => handleNewMarkChange(student.id, 'marks_obtained', e.target.value)}
                      disabled={marks.is_absent || marks.is_excused}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <div className="grade-display">
                      <span className="percentage">
                        {percentage ? `${percentage}%` : '-'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {letterGrade && (
                      <span className="letter-grade">
                        {letterGrade}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.85rem', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={marks.is_absent || false}
                          onChange={(e) => handleNewMarkChange(student.id, 'is_absent', e.target.checked)}
                        />
                        Absent
                      </label>
                      <label style={{ fontSize: '0.85rem', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="checkbox"
                          checked={marks.is_excused || false}
                          onChange={(e) => handleNewMarkChange(student.id, 'is_excused', e.target.checked)}
                        />
                        Excused
                      </label>
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="remarks-input"
                      placeholder="Add remarks..."
                      value={marks.remarks || ''}
                      onChange={(e) => handleNewMarkChange(student.id, 'remarks', e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </MarksEntrySection>
    </>
  );
  
  const renderAnalyticsTab = () => {
    return (
      <>
        <ContentSection>
          <h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <FaChartBar /> Analytics & Reports
            </span>
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              {teacherAnalyticsData && (
                <ActionButton onClick={exportTeacherAnalyticsPDF} disabled={exporting}>
                  <FaFilePdf /> {exporting ? 'Exporting...' : 'Export PDF'}
                </ActionButton>
              )}
              <SecondaryButton type="button" onClick={resetAnalyticsFilters}>
                <FaFilter /> Reset Filters
              </SecondaryButton>
            </div>
          </h3>
        </ContentSection>

        <SharedFiltersSection>
          <SectionTitle style={{ marginTop: 0 }}>Filters</SectionTitle>
          <div className="filter-grid">
            <div className="filter-group">
              <label>Class</label>
              <select
                value={analyticsFilters.class_id}
                onChange={(e) => setAnalyticsFilters((prev) => ({ ...prev, class_id: e.target.value }))}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Subject</label>
              <select
                value={analyticsFilters.subject_id}
                onChange={(e) => setAnalyticsFilters((prev) => ({ ...prev, subject_id: e.target.value }))}
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Exam Type</label>
              <select
                value={analyticsFilters.exam_type}
                onChange={(e) => setAnalyticsFilters((prev) => ({ ...prev, exam_type: e.target.value }))}
              >
                <option value="">All Types</option>
                {examTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Start Date</label>
              <input
                type="date"
                value={analyticsFilters.start_date}
                onChange={(e) => setAnalyticsFilters((prev) => ({ ...prev, start_date: e.target.value }))}
              />
            </div>

            <div className="filter-group">
              <label>End Date</label>
              <input
                type="date"
                value={analyticsFilters.end_date}
                onChange={(e) => setAnalyticsFilters((prev) => ({ ...prev, end_date: e.target.value }))}
              />
            </div>

            <div className="filter-group">
              <label>&nbsp;</label>
              <PrimaryButton style={{ width: '100%' }} onClick={fetchTeacherAnalytics} disabled={analyticsLoading}>
                <FaSearch /> {analyticsLoading ? 'Loading...' : 'Apply Filters'}
              </PrimaryButton>
            </div>
          </div>
        </SharedFiltersSection>

        {/* Loading State */}
        {analyticsLoading && (
          <SharedLoadingSpinner>
            <div className="spinner"></div>
            <p>Loading analytics data...</p>
          </SharedLoadingSpinner>
        )}

        {/* Error State */}
        {analyticsError && (
          <div style={{ marginBottom: '20px' }}>
            <ErrorMessage>
              <FaExclamationTriangle />
              {analyticsError}
            </ErrorMessage>
            <PrimaryButton type="button" onClick={fetchTeacherAnalytics} disabled={analyticsLoading}>
              Try Again
            </PrimaryButton>
          </div>
        )}

        {/* Analytics Data Display */}
        {teacherAnalyticsData && !analyticsLoading && !analyticsError && (
          <>
            {/* Summary Statistics */}
            <Section>
              <SectionTitle style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaTasks /> Summary Overview
              </SectionTitle>
              <StatsGrid>
                <NeumoStatCard>
                  <div className="stat-icon">📝</div>
                  <div className="stat-meta">
                    <div className="stat-number">{teacherAnalyticsData.summary?.total_assessments || 0}</div>
                    <div className="stat-label">Total Assessments</div>
                  </div>
                </NeumoStatCard>
                <NeumoStatCard>
                  <div className="stat-icon">👨‍🎓</div>
                  <div className="stat-meta">
                    <div className="stat-number">{teacherAnalyticsData.summary?.total_students || 0}</div>
                    <div className="stat-label">Total Students</div>
                  </div>
                </NeumoStatCard>
                <NeumoStatCard>
                  <div className="stat-icon">📈</div>
                  <div className="stat-meta">
                    <div className="stat-number">{teacherAnalyticsData.summary?.overall_average || 0}%</div>
                    <div className="stat-label">Overall Average</div>
                  </div>
                </NeumoStatCard>
                <NeumoStatCard>
                  <div className="stat-icon">✅</div>
                  <div className="stat-meta">
                    <div className="stat-number">{teacherAnalyticsData.summary?.graded_assessments || 0}</div>
                    <div className="stat-label">Graded Assessments</div>
                  </div>
                </NeumoStatCard>
              </StatsGrid>
            </Section>

            {/* Interactive Charts Grid */}
            {teacherAnalyticsData.charts && (
              <Section>
                <SectionTitle style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FaChartBar /> Performance Analytics
                </SectionTitle>
                <AnalyticsChartsGrid data={teacherAnalyticsData.charts} />
              </Section>
            )}

            {/* Grade Distribution Summary */}
            {teacherAnalyticsData.grade_distribution && Object.keys(teacherAnalyticsData.grade_distribution).length > 0 && (
              <Section>
                <SectionTitle>Overall Grade Distribution</SectionTitle>
                <StatsGrid>
                  {Object.entries(teacherAnalyticsData.grade_distribution).map(([grade, count]) => {
                    const total = Object.values(teacherAnalyticsData.grade_distribution).reduce((sum, val) => sum + val, 0);
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                    const gradeColor =
                      grade === 'A' ? '#16a34a' : grade === 'F' ? '#dc2626' : grade === 'D' ? '#d97706' : '#2563eb';

                    return (
                      <NeumoStatCard key={grade}>
                        <div className="stat-icon">{grade}</div>
                        <div className="stat-meta">
                          <div className="stat-number" style={{ color: gradeColor }}>
                            {count}
                          </div>
                          <div className="stat-label">Grade {grade}</div>
                          <div style={{ fontSize: '0.82rem', color: colors.textSecondary }}>{percentage}%</div>
                        </div>
                      </NeumoStatCard>
                    );
                  })}
                </StatsGrid>
              </Section>
            )}

            {/* Student Grade Analysis Section */}
            <div style={{ 
              background: '#ffffff',
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: colors.textPrimary, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUsers /> Student Grade Analysis
                <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                  {studentGradeAnalysis && (
                    <ActionButton onClick={exportStudentGradeAnalysisPDF} disabled={exporting}>
                      <FaFilePdf /> {exporting ? 'Exporting...' : 'Export Analysis'}
                    </ActionButton>
                  )}
                  <SecondaryButton type="button" onClick={resetGradeAnalysisFilters}>
                    <FaFilter /> Reset
                  </SecondaryButton>
                </div>
              </h4>
              
              {/* Grade Analysis Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '15px' }}>
                <div>
                  <label style={{ color: colors.textPrimary, display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>Class</label>
                  <select
                    value={analyticsFilters.class_id}
                    onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, class_id: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      background: 'white',
                      color: '#1e293b',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '500',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <option value="" style={{ fontWeight: 'bold', color: '#60a5fa', background: '#f1f5f9' }}>Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id} style={{ padding: '8px', color: '#1e293b' }}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <PrimaryButton style={{ width: '100%' }} onClick={fetchStudentGradeAnalysis} disabled={gradeAnalysisLoading}>
                    <FaSearch /> {gradeAnalysisLoading ? 'Loading...' : 'Load Analysis'}
                  </PrimaryButton>
                </div>
              </div>

              {/* Loading State for Grade Analysis */}
              {gradeAnalysisLoading && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ 
                    width: '30px', 
                    height: '30px', 
                    border: '3px solid rgba(59, 130, 246, 0.3)', 
                    borderTop: '3px solid #3b82f6', 
                    borderRadius: '50%', 
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 10px'
                  }}></div>
                  <p style={{ color: colors.textSecondary, fontSize: '14px' }}>Loading student grade analysis...</p>
                </div>
              )}

              {/* Error State for Grade Analysis */}
              {gradeAnalysisError && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <FaExclamationTriangle size={24} style={{ color: '#ef4444', marginBottom: '10px' }} />
                  <p style={{ color: '#ef4444', fontSize: '14px', margin: '0 0 10px 0' }}>{gradeAnalysisError}</p>
                  <PrimaryButton type="button" onClick={fetchStudentGradeAnalysis} disabled={gradeAnalysisLoading}>
                    Try Again
                  </PrimaryButton>
                </div>
              )}

              {/* Student Grade Analysis Table */}
              {studentGradeAnalysis && !gradeAnalysisLoading && !gradeAnalysisError && (
                <>
                  {/* Analysis Summary */}
                  <div style={{ 
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', fontSize: '13px' }}>
                      <div>
                        <strong style={{ color: '#22c55e' }}>Subjects:</strong> {studentGradeAnalysis.subjects?.length || 0}
                      </div>
                      <div>
                        <strong style={{ color: '#22c55e' }}>Students:</strong> {studentGradeAnalysis.students?.length || 0}
                      </div>
                    </div>
                    
                    {/* Grade Color Legend */}
                    <div style={{ marginTop: '15px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#f1f5f9' }}>Grade Legend:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            background: 'rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>A</span>
                          <span style={{ fontSize: '12px', color: '#f1f5f9' }}>Excellent (81-100%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.3)',
                            color: '#3b82f6',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>B</span>
                          <span style={{ fontSize: '12px', color: '#f1f5f9' }}>Good (61-80%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            background: 'rgba(249, 115, 22, 0.3)',
                            color: '#f97316',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>C</span>
                          <span style={{ fontSize: '12px', color: '#f1f5f9' }}>Average (45-60%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            background: 'rgba(245, 158, 11, 0.3)',
                            color: '#f59e0b',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>D</span>
                          <span style={{ fontSize: '12px', color: '#f1f5f9' }}>Poor (30-44%)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>F</span>
                          <span style={{ fontSize: '12px', color: '#f1f5f9' }}>Fail (Below 30%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Student Grade Analysis Table */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '12px 15px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <h5 style={{ 
                        color: '#60a5fa', 
                        margin: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '1rem'
                      }}>
                        <FaUsers />
                        Student Grades by Subject ({studentGradeAnalysis.students?.length || 0} students)
                      </h5>
                    </div>

                    <div style={{
                      overflowX: 'auto',
                      maxWidth: '100%'
                    }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        minWidth: 'max-content'
                      }}>
                        <thead>
                          <tr>
                            <th style={{ 
                              position: 'sticky', 
                              left: 0, 
                              background: 'rgba(30, 41, 59, 0.9)', 
                              zIndex: 10, 
                              minWidth: '180px',
                              padding: '10px 12px',
                              textAlign: 'left',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              color: 'rgba(255, 255, 255, 0.9)',
                              fontWeight: '600',
                              fontSize: '13px'
                            }}>Student</th>
                            {studentGradeAnalysis.subjects?.map(subject => (
                              <th key={subject.id} style={{ 
                                textAlign: 'center',
                                minWidth: '100px',
                                padding: '10px 8px',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
                                color: '#60a5fa',
                                borderLeft: '1px solid rgba(59, 130, 246, 0.3)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                fontWeight: '600',
                                fontSize: '12px'
                              }}>
                                <div style={{ fontWeight: 'bold' }}>{subject.name}</div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>({subject.code})</div>
                              </th>
                            )) || []}
                            <th style={{ 
                              textAlign: 'center',
                              minWidth: '90px',
                              padding: '10px 8px',
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                              color: '#22c55e',
                              borderLeft: '2px solid rgba(34, 197, 94, 0.4)',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}>Total</th>
                            <th style={{ 
                              textAlign: 'center',
                              minWidth: '80px',
                              padding: '10px 8px',
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                              color: '#22c55e',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}>Average</th>
                            <th style={{ 
                              textAlign: 'center',
                              minWidth: '70px',
                              padding: '10px 8px',
                              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                              color: '#22c55e',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                              fontWeight: '600',
                              fontSize: '12px'
                            }}>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentGradeAnalysis.students?.map(student => (
                            <tr key={student.student_id}>
                              <td style={{ 
                                position: 'sticky', 
                                left: 0, 
                                background: 'rgba(15, 23, 42, 0.95)', 
                                zIndex: 9,
                                borderRight: '1px solid rgba(59, 130, 246, 0.3)',
                                padding: '10px 12px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}>
                                <div>
                                  <div style={{ 
                                    fontWeight: '600', 
                                    color: '#f1f5f9', 
                                    fontSize: '13px'
                                  }}>
                                    {student.student_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown Student'}
                                  </div>
                                  <div style={{ 
                                    fontSize: '11px', 
                                    color: '#94a3b8'
                                  }}>{student.student_number || student.admission_number || 'No ID'}</div>
                                </div>
                              </td>
                              {studentGradeAnalysis.subjects?.map(subject => {
                                // Try different possible data structure paths
                                let gradeInfo = null;
                                let hasGrade = false;
                                
                                // Based on console debug: grades are keyed by subject.code, not subject.id
                                if (student.subject_grades) {
                                  // Try by subject code FIRST (this is what the backend uses)
                                  gradeInfo = student.subject_grades[subject.code];
                                  // Fallback to subject.id if code doesn't work
                                  if (!gradeInfo) {
                                    gradeInfo = student.subject_grades[subject.id];
                                  }
                                } else if (student.subjects) {
                                  // Try subjects array/object (fallback structure)
                                  gradeInfo = student.subjects[subject.code] || student.subjects[subject.id];
                                }
                                
                                // Check if student has a valid grade (percentage is not null)
                                hasGrade = gradeInfo && gradeInfo.percentage !== null && gradeInfo.percentage !== undefined;
                                
                                // Get the actual percentage value
                                const percentage = gradeInfo?.percentage;
                                const assessmentCount = gradeInfo?.assessments_count || 0;
                                const gradePoints = gradeInfo?.grade_points;
                                
                                return (
                                  <td key={subject.id} style={{ 
                                    textAlign: 'center',
                                    padding: '10px 8px',
                                    background: hasGrade ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                                  }}>
                                    {hasGrade ? (
                                      <div>
                                        <div style={{ 
                                          fontSize: '13px', 
                                          fontWeight: 'bold',
                                          color: percentage >= 70 ? '#22c55e' : 
                                                 percentage >= 50 ? '#f59e0b' : '#ef4444'
                                        }}>
                                          {percentage}%
                                        </div>
                                        {assessmentCount > 0 && (
                                          <div style={{ 
                                            fontSize: '10px',
                                            color: 'rgba(255,255,255,0.6)',
                                            marginTop: '1px'
                                          }}>
                                            {assessmentCount} assessment{assessmentCount > 1 ? 's' : ''}
                                          </div>
                                        )}
                                        {gradePoints !== null && gradePoints !== undefined && (
                                          <div style={{ 
                                            fontSize: '10px',
                                            color: '#3b82f6',
                                            fontWeight: 'bold',
                                            marginTop: '2px'
                                          }}>
                                            {gradePoints} pts
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ 
                                        color: 'rgba(255,255,255,0.5)', 
                                        fontSize: '12px'
                                      }}>
                                        {assessmentCount === 0 ? 'No Assessments' : 'No Grade'}
                                      </div>
                                    )}
                                  </td>
                                );
                              }) || []}
                              <td style={{ 
                                textAlign: 'center',
                                padding: '10px 8px',
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                                borderLeft: '2px solid rgba(34, 197, 94, 0.4)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                fontWeight: 'bold'
                              }}>
                                <div style={{ color: '#22c55e', fontSize: '12px' }}>
                                  {student.total_marks_obtained || 0}/{student.total_possible_marks || 0}
                                </div>
                              </td>
                              <td style={{ 
                                textAlign: 'center',
                                padding: '10px 8px',
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                fontWeight: 'bold'
                              }}>
                                <div style={{ 
                                  color: student.overall_average >= 70 ? '#22c55e' : 
                                         student.overall_average >= 50 ? '#f59e0b' : '#ef4444',
                                  fontSize: '13px'
                                }}>
                                  {student.overall_average || 0}%
                                </div>
                              </td>
                              <td style={{ 
                                textAlign: 'center',
                                padding: '10px 8px',
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                              }}>
                                <span style={{
                                  background: student.overall_grade === 'A' ? 'rgba(34, 197, 94, 0.3)' : 
                                             student.overall_grade === 'F' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                                  color: student.overall_grade === 'A' ? '#22c55e' : 
                                        student.overall_grade === 'F' ? '#ef4444' : '#3b82f6',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '600'
                                }}>
                                  {student.overall_grade || '-'}
                                </span>
                              </td>
                            </tr>
                          )) || []}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* Empty State for Grade Analysis */}
              {!studentGradeAnalysis && !gradeAnalysisLoading && !gradeAnalysisError && (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <FaUsers size={48} style={{ color: colors.primaryBlue, marginBottom: '15px' }} />
                  <h4 style={{ color: colors.textPrimary, margin: '0 0 8px 0', fontSize: '1.1rem' }}>Student Grade Analysis</h4>
                  <p style={{ color: colors.textSecondary, margin: '0 0 15px 0', fontSize: '13px' }}>
                    View comprehensive grade analysis for students across all subjects.
                  </p>
                  <PrimaryButton type="button" onClick={fetchStudentGradeAnalysis}>
                    <FaUsers /> Load Student Analysis
                  </PrimaryButton>
                </div>
              )}
            </div>

            {/* Top Performing Students */}
            {teacherAnalyticsData.performance_trends && teacherAnalyticsData.performance_trends.length > 0 && (
              <GradingTable>
                <div className="table-header">
                  <h4>
                    <FaUsers />
                    Top Performing Students
                  </h4>
                </div>

                <table className="grades-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Student</th>
                      <th>Class</th>
                      <th>Average Score</th>
                      <th>Assessments</th>
                      <th>Overall Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherAnalyticsData.performance_trends.slice(0, 20).map((student, index) => (
                      <tr key={student.student_id}>
                        <td>
                          <span style={{ 
                            background: index < 3 ? '#f59e0b' : 'rgba(15, 23, 42, 0.08)',
                            color: index < 3 ? '#111827' : colors.textPrimary,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            #{index + 1}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', color: colors.textPrimary }}>{student.student_name}</td>
                        <td>{student.class_name}</td>
                        <td>
                          <span style={{ 
                            color: student.average_percentage >= 70 ? '#22c55e' : 
                                   student.average_percentage >= 50 ? '#f59e0b' : '#ef4444',
                            fontWeight: 'bold'
                          }}>
                            {student.average_percentage}%
                          </span>
                        </td>
                        <td>{student.assessment_count}</td>
                        <td>
                          <span className="letter-grade">
                            {student.overall_grade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GradingTable>
            )}
          </>
        )}

        {/* Empty State */}
        {!teacherAnalyticsData && !analyticsLoading && !analyticsError && (
          <Section style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>📊</div>
            <SectionTitle style={{ marginBottom: 10 }}>Comprehensive Analytics & Reports</SectionTitle>
            <p style={{ color: colors.textSecondary, marginBottom: 18 }}>
              Generate analytics reports across your assessments, classes, and subjects. Use the filters above to
              customize your analysis.
            </p>
            <PrimaryButton type="button" onClick={fetchTeacherAnalytics} disabled={analyticsLoading}>
              <FaChartBar /> Load Analytics Data
            </PrimaryButton>
          </Section>
        )}
      </>
    );
  };

  const renderViewResultsTab = () => {
    if (!resultsData || !selectedAssessmentForView) {
      return (
        <Section style={{ textAlign: 'center' }}>
          <FaEye size={48} style={{ marginBottom: '20px' }} />
          <h3>No Results Data</h3>
          <p>Unable to load assessment results.</p>
        </Section>
      );
    }

    const { assessment, results, summary } = resultsData;

    return (
      <>
        <ContentSection>
          <h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <FaEye /> Assessment Results: {assessment.assessment_name}
            </span>
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <ActionButton onClick={exportResultsPDF}>
                <FaFilePdf /> Export PDF
              </ActionButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setViewingResults(false);
                  setActiveTab('assessments');
                }}
              >
                ← Back to Assessments
              </SecondaryButton>
            </div>
          </h3>
        </ContentSection>

        <InfoMessage>
          <span style={{ display: 'inline-flex', fontSize: '1.1rem' }}>
            <FaInfoCircle />
          </span>
          <span>
            <strong>Subject:</strong> {assessment.subject_name} &nbsp;|&nbsp; <strong>Class:</strong> {assessment.class_name}{' '}
            &nbsp;|&nbsp; <strong>Date:</strong> {new Date(assessment.assessment_date).toLocaleDateString()} &nbsp;|&nbsp;{' '}
            <strong>Total Marks:</strong> {assessment.max_marks}
          </span>
        </InfoMessage>

        <Section>
          <SectionTitle>Summary Statistics</SectionTitle>
          <StatsGrid>
            <NeumoStatCard>
              <div className="stat-icon">👥</div>
              <div className="stat-meta">
                <div className="stat-number">{summary.total_students}</div>
                <div className="stat-label">Total Students</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">✅</div>
              <div className="stat-meta">
                <div className="stat-number">{summary.graded_students}</div>
                <div className="stat-label">Graded</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">📈</div>
              <div className="stat-meta">
                <div className="stat-number">{summary.average_percentage}%</div>
                <div className="stat-label">Class Average</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">🟢</div>
              <div className="stat-meta">
                <div className="stat-number">{summary.pass_count}</div>
                <div className="stat-label">Passed</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">🔴</div>
              <div className="stat-meta">
                <div className="stat-number">{summary.fail_count}</div>
                <div className="stat-label">Failed</div>
              </div>
            </NeumoStatCard>
          </StatsGrid>
        </Section>
        
        {/* Results Table */}
        <GradingTable>
          <div className="table-header">
            <h4>
              <FaEye />
              Student Results ({summary.graded_students} of {summary.total_students} graded)
            </h4>
          </div>

          <table className="grades-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Marks Obtained</th>
                <th>Percentage</th>
                <th>Grade</th>
                <th>Remarks</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map(result => (
                <tr key={result.student_id}>
                  <td>
                    <div className="student-info">
                      <div>
                        <div className="student-name">
                          {result.first_name} {result.last_name}
                        </div>
                        <div className="student-id">{result.admission_number}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 'bold', color: result.marks_obtained ? '#22c55e' : '#6b7280' }}>
                      {result.marks_obtained !== null ? `${result.marks_obtained}/${assessment.max_marks}` : '-'}
                    </span>
                  </td>
                  <td>
                    <div className="grade-display">
                      <span className="percentage">
                        {result.percentage ? `${result.percentage}%` : '-'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {result.grade && (
                      <span className="letter-grade">
                        {result.grade}
                      </span>
                  )}
                  </td>
                  <td style={{ color: colors.textSecondary }}>
                    {result.remarks || '-'}
                  </td>
                  <td>
                    <div className="status-indicators">
                      {!result.is_present && (
                        <div className="indicator absent" title="Absent"></div>
                      )}
                      {result.marks_obtained !== null && result.is_present && (
                        <div className="indicator graded" title="Graded"></div>
                      )}
                      {result.marks_obtained === null && result.is_present && (
                        <div className="indicator pending" title="Pending"></div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GradingTable>
      </>
    );
  };

  const renderViewAnalyticsTab = () => {
    if (!analyticsData || !selectedAssessmentForView) {
      return (
        <Section style={{ textAlign: 'center' }}>
          <FaChartBar size={48} style={{ marginBottom: '20px' }} />
          <h3>No Analytics Data</h3>
          <p>Unable to load assessment analytics.</p>
        </Section>
      );
    }

    const { assessment, analytics } = analyticsData;

    return (
      <>
        <ContentSection>
          <h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <FaChartBar /> Assessment Analytics: {assessment.assessment_name}
            </span>
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
              <ActionButton onClick={exportAnalyticsPDF}>
                <FaFilePdf /> Export PDF
              </ActionButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setViewingAnalytics(false);
                  setActiveTab('assessments');
                }}
              >
                ← Back to Assessments
              </SecondaryButton>
            </div>
          </h3>
        </ContentSection>

        <Section>
          <SectionTitle>Performance Overview</SectionTitle>
          <StatsGrid>
            <NeumoStatCard>
              <div className="stat-icon">📊</div>
              <div className="stat-meta">
                <div className="stat-number">{analytics.average_score}%</div>
                <div className="stat-label">Average Score</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">📍</div>
              <div className="stat-meta">
                <div className="stat-number">{analytics.median_score}%</div>
                <div className="stat-label">Median Score</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">🏆</div>
              <div className="stat-meta">
                <div className="stat-number">{analytics.highest_score}%</div>
                <div className="stat-label">Highest Score</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">🧯</div>
              <div className="stat-meta">
                <div className="stat-number">{analytics.lowest_score}%</div>
                <div className="stat-label">Lowest Score</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">✅</div>
              <div className="stat-meta">
                <div className="stat-number">{analytics.pass_rate}%</div>
                <div className="stat-label">Pass Rate</div>
              </div>
            </NeumoStatCard>
            <NeumoStatCard>
              <div className="stat-icon">🧑‍🤝‍🧑</div>
              <div className="stat-meta">
                <div className="stat-number">{analytics.attendance_rate}%</div>
                <div className="stat-label">Attendance</div>
              </div>
            </NeumoStatCard>
          </StatsGrid>
        </Section>

        <Section>
          <SectionTitle>Grade Distribution</SectionTitle>
          <StatsGrid>
            {Object.entries(analytics.grade_distribution).map(([grade, count]) => {
              const gradeColor =
                grade === 'A' ? '#16a34a' : grade === 'F' ? '#dc2626' : grade === 'D' ? '#d97706' : '#2563eb';
              return (
                <NeumoStatCard key={grade}>
                  <div className="stat-icon">{grade}</div>
                  <div className="stat-meta">
                    <div className="stat-number" style={{ color: gradeColor }}>
                      {count}
                    </div>
                    <div className="stat-label">Grade {grade}</div>
                  </div>
                </NeumoStatCard>
              );
            })}
          </StatsGrid>
        </Section>
        
        {/* Top Performers */}
        <GradingTable>
          <div className="table-header">
            <h4>
              <FaChartBar />
              Performance Ranking
            </h4>
          </div>

          <table className="grades-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student</th>
                <th>Percentage</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {analytics.performance_trends.map((student, index) => (
                <tr key={student.student_id || `student-${index}`}>
                  <td>
                    <span style={{ 
                      background: index < 3 ? '#f59e0b' : 'rgba(15, 23, 42, 0.08)',
                      color: index < 3 ? '#111827' : '#111827',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      #{index + 1}
                    </span>
                  </td>
                  <td>{student.student}</td>
                  <td>
                    <span className="percentage">
                      {student.percentage}%
                    </span>
                  </td>
                  <td>
                    <span className="letter-grade">
                      {student.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GradingTable>
      </>
    );
  };

  const renderStudentAnalysisTab = () => {
    return (
      <>
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#f1f5f9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaUsers /> Student Grade Analysis
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
              {studentGradeAnalysis && (
                <button 
                  style={{
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onClick={() => {
                    // TODO: Implement PDF export for student grade analysis
                    toast.info('PDF export coming soon!');
                  }}
                >
                  <FaFilePdf /> Export PDF
                </button>
              )}
              <button 
                style={{
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#a855f7',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onClick={resetGradeAnalysisFilters}
              >
                <FaFilter /> Reset Filters
              </button>
            </div>
          </h3>
          
          {/* Student Grade Analysis Filters */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaFilter /> Grade Analysis Filters
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ color: '#f1f5f9', display: 'block', marginBottom: '5px', fontWeight: '500' }}>Class</label>
                <select
                  value={analyticsFilters.class_id}
                  onChange={(e) => setAnalyticsFilters(prev => ({ ...prev, class_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                    color: '#f1f5f9',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              
              
              <div style={{ display: 'flex', alignItems: 'end' }}>
                <button 
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: '500'
                  }}
                  onClick={fetchStudentGradeAnalysis}
                  disabled={gradeAnalysisLoading}
                >
                  <FaSearch /> {gradeAnalysisLoading ? 'Loading...' : 'Load Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {gradeAnalysisLoading && (
          <LoadingSpinner>
            <div className="spinner"></div>
            <p style={{ marginLeft: '15px', color: 'rgba(255,255,255,0.8)' }}>Loading student grade analysis...</p>
          </LoadingSpinner>
        )}

        {/* Error State */}
        {gradeAnalysisError && (
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <FaExclamationTriangle size={32} style={{ color: '#ef4444', marginBottom: '10px' }} />
            <h4 style={{ color: '#ef4444', margin: '0 0 10px 0' }}>Error Loading Student Grade Analysis</h4>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 15px 0' }}>{gradeAnalysisError}</p>
            <button 
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={fetchStudentGradeAnalysis}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Student Grade Analysis Data Display */}
        {studentGradeAnalysis && !gradeAnalysisLoading && !gradeAnalysisError && (
          <>
            {/* Summary Info */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h4 style={{ color: '#22c55e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaTasks /> Analysis Summary
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <strong style={{ color: '#60a5fa' }}>Subjects Analyzed:</strong> {studentGradeAnalysis.subjects?.length || 0}
                </div>
                <div>
                  <strong style={{ color: '#60a5fa' }}>Students Analyzed:</strong> {studentGradeAnalysis.students?.length || 0}
                </div>
              </div>
            </div>

            {/* Dynamic Student Grade Analysis Table */}
            <GradingTable>
              <div className="table-header">
                <h4>
                  <FaUsers />
                  Student Grade Analysis by Subject ({studentGradeAnalysis.students?.length || 0} students)
                </h4>
              </div>

              <div style={{
                overflowX: 'auto',
                maxWidth: '100%'
              }}>
                <table className="grades-table" style={{ minWidth: 'max-content' }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'rgba(30, 41, 59, 0.9)', zIndex: 10, minWidth: '200px' }}>Student</th>
                      {studentGradeAnalysis.subjects?.map(subject => (
                        <th key={subject.id} style={{ 
                          textAlign: 'center',
                          minWidth: '120px',
                          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
                          color: '#60a5fa',
                          borderLeft: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{subject.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>({subject.code})</div>
                        </th>
                      )) || []}
                      <th style={{ 
                        textAlign: 'center',
                        minWidth: '100px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                        color: '#22c55e',
                        borderLeft: '2px solid rgba(34, 197, 94, 0.4)'
                      }}>Total Marks</th>
                      <th style={{ 
                        textAlign: 'center',
                        minWidth: '100px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                        color: '#22c55e'
                      }}>Overall Average</th>
                      <th style={{ 
                        textAlign: 'center',
                        minWidth: '80px',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.15))',
                        color: '#22c55e'
                      }}>Overall Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentGradeAnalysis.students?.map(student => (
                      <tr key={student.student_id}>
                        <td style={{ 
                          position: 'sticky', 
                          left: 0, 
                          background: 'rgba(15, 23, 42, 0.95)', 
                          zIndex: 9,
                          borderRight: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                          <div className="student-info">
                            <div>
                              <div className="student-name">
                                {student.first_name} {student.last_name}
                              </div>
                              <div className="student-id">{student.admission_number}</div>
                            </div>
                          </div>
                        </td>
                        {studentGradeAnalysis.subjects?.map(subject => {
                          const gradeInfo = student.subjects?.[subject.id];
                          const hasGrade = gradeInfo && gradeInfo.current_result !== null;
                          
                          return (
                            <td key={subject.id} style={{ 
                              textAlign: 'center',
                              background: hasGrade ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                              borderLeft: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                              {hasGrade ? (
                                <div>
                                  <div style={{ 
                                    fontSize: '1rem', 
                                    fontWeight: 'bold',
                                    color: gradeInfo.current_result >= 70 ? '#22c55e' : 
                                           gradeInfo.current_result >= 50 ? '#f59e0b' : '#ef4444'
                                  }}>
                                    {gradeInfo.current_result}%
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.8rem',
                                    color: gradeInfo.grade === 'A' ? '#22c55e' : 
                                           gradeInfo.grade === 'F' ? '#ef4444' : '#3b82f6',
                                    fontWeight: 'bold'
                                  }}>
                                    {gradeInfo.grade}
                                  </div>
                                  {gradeInfo.predicted_grade && gradeInfo.predicted_grade !== gradeInfo.grade && (
                                    <div style={{ 
                                      fontSize: '0.7rem',
                                      color: 'rgba(255,255,255,0.6)',
                                      marginTop: '2px'
                                    }}>
                                      Pred: {gradeInfo.predicted_grade}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>No Grade</div>
                              )}
                            </td>
                          );
                        }) || []}
                        <td style={{ 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                          borderLeft: '2px solid rgba(34, 197, 94, 0.4)',
                          fontWeight: 'bold'
                        }}>
                          <div style={{ color: '#22c55e', fontSize: '1rem' }}>
                            {student.total_marks_obtained || 0}/{student.total_possible_marks || 0}
                          </div>
                        </td>
                        <td style={{ 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
                          fontWeight: 'bold'
                        }}>
                          <div style={{ 
                            color: student.overall_average >= 70 ? '#22c55e' : 
                                   student.overall_average >= 50 ? '#f59e0b' : '#ef4444',
                            fontSize: '1rem'
                          }}>
                            {student.overall_average || 0}%
                          </div>
                        </td>
                        <td style={{ 
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))'
                        }}>
                          <span className="letter-grade" style={{
                            background: student.overall_grade === 'A' ? 'rgba(34, 197, 94, 0.3)' : 
                                       student.overall_grade === 'F' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                            color: student.overall_grade === 'A' ? '#22c55e' : 
                                  student.overall_grade === 'F' ? '#ef4444' : '#3b82f6'
                          }}>
                            {student.overall_grade || '-'}
                          </span>
                        </td>
                      </tr>
                    )) || []}
                  </tbody>
                </table>
              </div>
            </GradingTable>
          </>
        )}

        {/* Empty State */}
        {!studentGradeAnalysis && !gradeAnalysisLoading && !gradeAnalysisError && (
          <div style={{ 
            background: colors.gradientLight,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <FaUsers size={64} style={{ color: colors.primaryBlue, marginBottom: '20px' }} />
            <h3 style={{ color: colors.textPrimary, marginBottom: '10px' }}>Student Grade Analysis</h3>
            <p style={{ color: colors.textSecondary, marginBottom: '20px' }}>
              View comprehensive grade analysis for students across all subjects you teach.
              Select filters above to generate the analysis table.
            </p>
            <PrimaryButton type="button" onClick={fetchStudentGradeAnalysis}>
              <FaUsers /> Load Student Analysis
            </PrimaryButton>
          </div>
        )}
      </>
    );
  };

  return (
    <GradesMenuContainer>
      <Header>
        <h1>
          <FaGraduationCap />
          {isResultsMode ? 'Results Center' : 'Grades Management'}
        </h1>
        {isResultsMode ? (
          <>
            <p>View approved subject results, performance summaries, and analysis.</p>
            <p>Only admin-approved assessments appear in this section.</p>
          </>
        ) : (
          <>
            <p>Create assessments, enter marks, and submit them for admin approval.</p>
            <p>Use this section for grading work, not for publishing final results.</p>
          </>
        )}
      </Header>

      <TabsContainer>
        <div className="tabs">
          <div 
            className={`tab ${activeTab === 'assessments' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('assessments');
              setIsCreatingAssessment(false);
              setViewingResults(false);
              setViewingAnalytics(false);
            }}
          >
            <FaTasks /> {isResultsMode ? 'Approved Results' : 'My Assessments'}
          </div>
          {isGradesMode && (
            <div 
              className={`tab ${activeTab === 'create-assessment' ? 'active' : ''}`}
              onClick={() => setActiveTab('create-assessment')}
              style={{ display: isCreatingAssessment ? 'flex' : 'none' }}
            >
              <FaPlus /> Create Assessment
            </div>
          )}
          {isGradesMode && (
            <div 
              className={`tab ${activeTab === 'grading' ? 'active' : ''}`}
              onClick={() => setActiveTab('grading')}
              style={{ display: selectedAssessment ? 'flex' : 'none' }}
            >
              <FaEdit /> Marks Entry
            </div>
          )}
          {viewingResults && (
            <div 
              className={`tab ${activeTab === 'view-results' ? 'active' : ''}`}
              onClick={() => setActiveTab('view-results')}
              style={{ display: viewingResults ? 'flex' : 'none' }}
            >
              <FaEye /> View Results
            </div>
          )}
          {viewingAnalytics && (
            <div 
              className={`tab ${activeTab === 'view-analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('view-analytics')}
              style={{ display: viewingAnalytics ? 'flex' : 'none' }}
            >
              <FaChartBar /> Analytics
            </div>
          )}
          {isResultsMode && (
            <div 
              className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <FaChartBar /> Results Analysis
            </div>
          )}
          {isGradesMode && isAdmin && (
            <div 
              className={`tab ${activeTab === 'pending-approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending-approvals')}
            >
              <FaCheckCircle /> Pending Approval
            </div>
          )}
        </div>
      </TabsContainer>

      <ContentSection>
        {activeTab === 'assessments' && renderAssessmentsTab()}
        {activeTab === 'create-assessment' && renderCreateAssessmentTab()}
        {activeTab === 'grading' && renderGradingTab()}
        {activeTab === 'view-results' && renderViewResultsTab()}
        {activeTab === 'view-analytics' && renderViewAnalyticsTab()}
        {activeTab === 'analytics' && isResultsMode && renderAnalyticsTab()}
        {activeTab === 'pending-approvals' && renderPendingApprovalsTab()}
      </ContentSection>
    </GradesMenuContainer>
  );
};

export default GradesMenu;
