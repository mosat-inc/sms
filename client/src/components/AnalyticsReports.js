import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService } from '../services/analyticsService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AnalyticsChartsGrid } from './charts/AnalyticsCharts';
import { 
  FaUser, FaGraduationCap, FaChartBar, FaUsers, FaSchool, 
  FaBookOpen, FaCalendarAlt, FaDownload, FaFilePdf, FaEye,
  FaTrophy, FaClock, FaPercentage, FaListAlt, FaChartLine,
  FaUserGraduate, FaChalkboardTeacher, FaAward, FaFileAlt,
  FaFilter, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import {
  PageContainer,
  PageHeader,
  Section,
  StatsGrid,
  StatCard,
  FiltersSection,
  SectionTitle,
  TabContainer,
  LoadingSpinner,
  ErrorMessage,
  colors,
  shadows,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const Container = styled(PageContainer)`
  padding: 20px;
  
  ${mediaQuery('tablet')} {
    padding: 15px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const Header = styled(PageHeader)`
  text-align: center;

  h1 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }
`;

const FiltersContainer = styled(FiltersSection)`
  h3 {
    color: ${colors.textPrimary};
    margin-bottom: 20px;
    font-size: 1.2rem;
    font-weight: 600;
    font-family: var(--font-display);
  }
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
  
  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
  }
`;

const FilterGroup = styled.div`
  margin-bottom: 10px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: ${colors.textPrimary};
  font-size: 0.9rem;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  font-size: 14px;
  
  option {
    background: ${colors.cardBackground};
    color: ${colors.textPrimary};
  }
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
  }
  
  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: ${borderRadius.pill};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &.primary {
    background: ${colors.gradientPrimary};
    color: white;
    box-shadow: ${shadows.button};

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: ${shadows.buttonHover};
    }
  }

  &.secondary {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);

    &:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.15);
      transform: translateY(-1px);
    }
  }

  &.export {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);

    &:hover:not(:disabled) {
      background: rgba(245, 158, 11, 0.15);
      transform: translateY(-1px);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  i {
    font-size: 1rem;
  }
`;

const Table = styled.div`
  border-radius: ${borderRadius.medium};
  overflow: hidden;
  border: 1px solid ${colors.border};
  overflow-x: auto;
  background: ${colors.cardBackground};
  
  ${mediaQuery('tablet')} {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }
`;

const TableHeader = styled.div`
  background: rgba(59, 130, 246, 0.1);
  padding: 15px;
  font-weight: 600;
  color: ${colors.textPrimary};
  display: grid;
  grid-template-columns: ${props => props.columns || '2fr 1fr 1fr 1fr 1fr'};
  gap: 15px;
  border-bottom: 1px solid ${colors.borderLight};
  min-width: 700px;
  
  ${mediaQuery('tablet')} {
    padding: 12px 10px;
    font-size: 0.8rem;
    gap: 8px;
  }
`;

const TableRow = styled.div`
  padding: 15px;
  display: grid;
  grid-template-columns: ${props => props.columns || '2fr 1fr 1fr 1fr 1fr'};
  gap: 15px;
  border-bottom: 1px solid ${colors.borderLight};
  background: ${colors.cardBackground};
  transition: background 0.2s ease;
  min-width: 700px;
  color: ${colors.textPrimary};

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
  
  ${mediaQuery('tablet')} {
    padding: 12px 10px;
    font-size: 0.85rem;
    gap: 8px;
  }
  
  > div {
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  .grade {
    font-weight: bold;
    padding: 4px 8px;
    border-radius: ${borderRadius.small};
    text-align: center;
    
    &.A { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    &.B { background: rgba(59, 130, 246, 0.1); color: ${colors.primaryBlue}; }
    &.C { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    &.D { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
    &.F { background: rgba(107, 114, 128, 0.1); color: ${colors.textMuted}; }
  }
`;

const ProfileCard = styled.div`
  background: ${colors.gradientLight};
  border-radius: ${borderRadius.large};
  padding: 25px;
  margin-bottom: 30px;
  border: 1px solid rgba(129, 140, 248, 0.4);
  box-shadow: ${shadows.card};

  .profile-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: ${colors.gradientPrimary};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: bold;
      color: white;
      border: 3px solid rgba(129, 140, 248, 0.5);
    }

    .user-info {
      flex: 1;

      h2 {
        margin: 0 0 5px 0;
        color: ${colors.primaryBlueLight};
        font-size: 1.8rem;
        font-weight: 600;
      }

      .role {
        color: ${colors.primaryBlue};
        font-size: 1.1rem;
        font-weight: 500;
        margin-bottom: 5px;
      }

      .employee-id {
        color: ${colors.textSecondary};
        font-size: 0.95rem;
      }
    }
  }

  .profile-details {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;

    .detail-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: rgba(59, 130, 246, 0.05);
      border-radius: ${borderRadius.medium};
      border: 1px solid ${colors.borderLight};

      .icon {
        color: ${colors.primaryBlue};
        font-size: 1.1rem;
      }

      .content {
        .label {
          font-size: 0.85rem;
          color: ${colors.textSecondary};
          margin-bottom: 2px;
        }

        .value {
          color: ${colors.textPrimary};
          font-weight: 500;
        }
      }
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

const AnalyticsReports = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    class_id: '',
    subject_id: '',
    exam_type: '',
    start_date: '',
    end_date: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [profileData, setProfileData] = useState(null);
  const [studentStats, setStudentStats] = useState(null);
  const [academicStats, setAcademicStats] = useState(null);
  const [curriculumStats, setCurriculumStats] = useState(null);
  
  const { user, api } = useAuth();

  const examTypes = [
    'mid-term exams',
    'terminal exams',
    'annual exams',
    'mock exams'
  ];

  // Fetch functions
  const fetchInitialData = useCallback(async () => {
    try {
      // Fetch teacher's classes and subjects for filters
      const response = await api.get('/api/analytics/teacher/initial-data');

      if (response.data?.success) {
        setClasses(response.data.data?.classes || []);
        setSubjects(response.data.data?.subjects || []);
      } else {
        console.error('Failed to fetch initial data:', response.data?.message);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      // Don't show error to user for initial data - not critical
    }
  }, [api]);

  const fetchProfileData = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/profile');

      if (response.data?.success) {
        setProfileData(response.data.data?.user || response.data.data || response.data);
      } else {
        console.error('Failed to fetch profile data:', response.data?.message);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  }, [api]);

  const fetchStudentStats = useCallback(async () => {
    try {
      const response = await api.get('/api/analytics/student-statistics');
      if (response.data?.success) {
        setStudentStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching student statistics:', error);
    }
  }, [api]);

  const fetchAcademicStats = useCallback(async () => {
    try {
      const response = await api.get('/api/analytics/academic-overview');
      if (response.data?.success) {
        setAcademicStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching academic statistics:', error);
    }
  }, [api]);

  const fetchCurriculumStats = useCallback(async () => {
    try {
      const response = await api.get('/api/curriculum/analytics/progress', {
        params: {
          subject_id: filters.subject_id || undefined,
          class_id: filters.class_id || undefined
        }
      });

      if (response.data?.success) {
        setCurriculumStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching curriculum statistics:', error);
    }
  }, [api, filters.subject_id, filters.class_id]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await analyticsService.getTeacherAnalytics(filters);
      
      if (response.success) {
        setAnalyticsData(response.data);
      } else {
        setError(response.message || 'Failed to fetch analytics data');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to fetch analytics data');
      toast.error(error.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Effects
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchInitialData(),
          fetchProfileData(),
          fetchStudentStats(),
          fetchAcademicStats(),
          fetchCurriculumStats()
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [fetchInitialData, fetchProfileData, fetchStudentStats, fetchAcademicStats, fetchCurriculumStats]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    } else if (activeTab === 'curriculum') {
      fetchCurriculumStats();
    }
  }, [filters, activeTab, fetchAnalyticsData, fetchCurriculumStats]);

  const handleFilterChange = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      class_id: '',
      subject_id: '',
      exam_type: '',
      start_date: '',
      end_date: ''
    });
  }, []);

  // Standardized PDF Header Function
  const addPDFHeader = useCallback((doc, reportTitle, additionalInfo = null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;
    
    // Official Tanzania Header - Centered and Bold
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
    doc.text(reportTitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Additional Information (Teacher, Date, etc.)
    if (additionalInfo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      
      if (additionalInfo.teacher) {
        doc.text(`Teacher: ${additionalInfo.teacher}`, 20, yPos);
        yPos += 6;
      }
      
      if (additionalInfo.date) {
        doc.text(`Generated on: ${additionalInfo.date}`, 20, yPos);
        yPos += 6;
      }
      
      if (additionalInfo.academicYear) {
        doc.text(`Academic Year: ${additionalInfo.academicYear}`, 20, yPos);
        yPos += 6;
      }
      
      yPos += 10; // Extra spacing after additional info
    }
    
    return yPos;
  }, []);

  const exportToPDF = useCallback(async (elementId, filename) => {
    // Simple fallback PDF generation for analytics data
    const doc = new jsPDF();
    
    // Add standardized header
    let yPos = addPDFHeader(doc, 'Assessment Analytics Report', {
      teacher: `${user?.first_name} ${user?.last_name}`,
      date: new Date().toLocaleString(),
      academicYear: new Date().getFullYear().toString()
    });
    
    if (analyticsData?.summary) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Summary Statistics', 20, yPos);
      yPos += 15;
      
      const summaryData = [
        ['Total Assessments', analyticsData.summary.total_assessments || 0],
        ['Total Students', analyticsData.summary.total_students || 0],
        ['Average Score', `${analyticsData.summary.average_score || 0}%`],
        ['Pass Rate', `${analyticsData.summary.pass_rate || 0}%`]
      ];
      
      autoTable(doc, {
        body: summaryData,
        startY: yPos,
        theme: 'grid',
        styles: { 
          fontSize: 10,
          textColor: [51, 51, 51]
        },
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        }
      });
    }
    
    doc.save(filename);
  }, [analyticsData, user, addPDFHeader]);

  const generateAssessmentReportPDF = useCallback((data) => {
    const doc = new jsPDF();
    
    // Add standardized header
    let yPos = addPDFHeader(doc, 'Assessment Report', {
      teacher: data.teacher_name,
      date: new Date().toLocaleString(),
      academicYear: new Date().getFullYear().toString()
    });
    
    // Add assessment data if available
    if (data.assessments && data.assessments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text('Assessment Details', 20, yPos);
      yPos += 15;
      
      const assessmentData = data.assessments.map(assessment => [
        assessment.assessment_name || 'N/A',
        assessment.class_name || 'N/A',
        assessment.subject_name || 'N/A',
        `${assessment.average_score || 0}%`,
        `${assessment.pass_rate || 0}%`
      ]);
      
      autoTable(doc, {
        head: [['Assessment', 'Class', 'Subject', 'Average', 'Pass Rate']],
        body: assessmentData,
        startY: yPos,
        theme: 'grid',
        styles: { 
          fontSize: 10,
          textColor: [51, 51, 51]
        },
        headStyles: {
          fillColor: [0, 51, 102],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        }
      });
    }
    
    doc.save(`assessment-report-${new Date().toISOString().split('T')[0]}.pdf`);
  }, [addPDFHeader]);

  const exportReport = useCallback(async () => {
    try {
      setExporting(true);
      
      // Try HTML to PDF export first (for charts)
      try {
        await exportToPDF('analytics-report-content', `assessment-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('Report exported successfully!');
      } catch (htmlError) {
        console.warn('HTML export failed, trying data export:', htmlError);
        
        // Fallback to data-based PDF generation
        const reportData = await analyticsService.getReportData(filters);
        if (reportData.success) {
          generateAssessmentReportPDF({
            ...reportData.data,
            teacher_name: user?.first_name + ' ' + user?.last_name,
          });
          toast.success('Report exported successfully!');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [exportToPDF, generateAssessmentReportPDF, filters, user]);

  const exportCurriculumReport = useCallback(async () => {
    if (!user || !curriculumStats) {
      toast.error('Curriculum data not available');
      return;
    }

    setExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // Set up document properties
      doc.setProperties({
        title: 'Curriculum Progress Report',
        subject: 'Teaching Progress and Topic Completion Analysis',
        creator: 'UBUNIFU SEC SMS'
      });

      // Page setup
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      
      // Add standardized header
      let yPos = addPDFHeader(doc, 'Curriculum Progress Report', {
        teacher: `${user.first_name} ${user.last_name}`,
        date: new Date().toLocaleString(),
        academicYear: new Date().getFullYear().toString()
      });
      
      // Summary Statistics
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Curriculum Progress Summary', margin, yPos);
      yPos += 15;
      
      const stats = curriculumStats.summary;
      const summaryData = [
        ['Total Topics', stats.total_topics?.toString() || '0'],
        ['Completed Topics', stats.completed_topics?.toString() || '0'],
        ['In Progress', stats.in_progress_topics?.toString() || '0'],
        ['Pending Topics', stats.pending_topics?.toString() || '0'],
        ['Completion Rate', `${stats.completion_rate || 0}%`],
        ['Estimated Hours (Total)', `${stats.total_estimated_hours || 0}h`],
        ['Actual Hours (Total)', `${stats.total_actual_hours || 0}h`],
        ['Teaching Efficiency', `${stats.efficiency_rate || 0}%`],
        ['Average Days per Topic', `${stats.average_days_to_complete || 0} days`]
      ];

      autoTable(doc, {
        body: summaryData,
        startY: yPos,
        theme: 'striped',
        styles: { 
          fontSize: 11,
          textColor: [51, 51, 51]
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            cellWidth: 80,
            fillColor: [245, 245, 247],
            textColor: [0, 51, 102]
          },
          1: { 
            halign: 'right', 
            fontStyle: 'bold', 
            textColor: [139, 69, 19]
          }
        }
      });
      
      yPos = doc.lastAutoTable.finalY + 25;
      
      // Subject Breakdown
      if (curriculumStats.by_subject?.length > 0) {
        if (yPos > pageHeight - 100) {
          doc.addPage();
          yPos = addPDFHeader(doc, 'Curriculum Progress Report (Continued)', {
            teacher: `${user.first_name} ${user.last_name}`,
            date: new Date().toLocaleString()
          });
        }
        
        doc.setTextColor(0, 51, 102);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Progress by Subject', margin, yPos);
        yPos += 15;
        
        const subjectData = curriculumStats.by_subject.map(subject => [
          `${subject.subject_name} (${subject.subject_code})`,
          subject.total_topics?.toString() || '0',
          subject.completed_topics?.toString() || '0',
          `${subject.completion_rate || 0}%`,
          `${subject.estimated_hours || 0}h`,
          `${subject.average_days || 0} days`
        ]);

        autoTable(doc, {
          head: [['Subject', 'Total', 'Completed', 'Rate', 'Est. Hours', 'Avg Days']],
          body: subjectData,
          startY: yPos,
          theme: 'grid',
          headStyles: { 
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          styles: { 
            fontSize: 10,
            textColor: [51, 51, 51]
          },
          columnStyles: {
            0: { cellWidth: 60 },
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          }
        });
      }
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(85, 85, 85);
        doc.text(
          `UBUNIFU SECONDARY SCHOOL - Excellence in Education`,
          pageWidth/2,
          pageHeight - 20,
          { align: 'center' }
        );
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
          pageWidth/2,
          pageHeight - 15,
          { align: 'center' }
        );
      }
      
      const filename = `Curriculum_Progress_Report_${user.last_name || 'Teacher'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success('Curriculum report exported successfully!');
      
    } catch (error) {
      console.error('Error exporting curriculum report:', error);
      toast.error(`Export failed: ${error.message || 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  }, [user, curriculumStats, addPDFHeader]);

  const exportComprehensiveReport = useCallback(async () => {
    if (!user) {
      toast.error('User data not available');
      return;
    }

    setExporting(true);
    
    try {
      const doc = new jsPDF();
      
      // Set up document properties
      doc.setProperties({
        title: 'Teacher Profile & Analytics Report',
        subject: 'Academic Performance and Profile Information',
        creator: 'UBUNIFU SEC SMS'
      });

      // Page setup
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      
      // Add standardized header
      let yPos = addPDFHeader(doc, 'Teacher Profile & Analytics Report', {
        teacher: `${user.first_name} ${user.last_name}`,
        date: new Date().toLocaleString(),
        academicYear: new Date().getFullYear().toString()
      });
      
      // Teacher Profile Header
      doc.setTextColor(0, 51, 102);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Teacher Profile Information', margin, yPos);
      yPos += 15;
      
      // Profile information in the exact same format as the image
      const profileData_fixed = profileData || {};
      
      // Teacher Profile Table (matching the image layout exactly)
      const profileTableData = [
        ['Full Name', `${user.first_name || ''} ${user.last_name || ''}`],
        ['Role', (user.role || 'Teacher') + ' • Senior Educator'],
        ['Email', user.email || 'mosat@gmail.com'],
        ['Employee ID', user.employee_id || profileData_fixed.employee_id || 'N/A'],
        ['Department', user.department || profileData_fixed.department || 'Science Department'],
        ['Phone', user.phone || profileData_fixed.phone || '0775117825'],
        ['Joined Date', user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 
                       (profileData_fixed.created_at ? new Date(profileData_fixed.created_at).toLocaleDateString() : 
                        new Date().toLocaleDateString())]
      ];

      autoTable(doc, {
        body: profileTableData,
        startY: yPos,
        theme: 'plain',
        styles: { 
          fontSize: 12, 
          cellPadding: { top: 10, bottom: 10, left: 15, right: 15 },
          lineColor: [220, 220, 220],
          lineWidth: 1
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            fillColor: [240, 248, 255],
            textColor: [0, 51, 102],
            cellWidth: 80,
            halign: 'left'
          },
          1: { 
            halign: 'left',
            textColor: [51, 51, 51],
            fontStyle: 'normal',
            fillColor: [255, 255, 255]
          }
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        showHead: false,
        bodyStyles: {
          border: { top: 1, right: 1, bottom: 1, left: 1 },
          borderColor: [200, 200, 200]
        }
      });

      // Use automatic positioning
      yPos = doc.lastAutoTable.finalY + 25;
      
      // Student Registration Statistics Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 51, 102);
      doc.text('Student Registration Statistics', margin, yPos);
      yPos += 15;
      
      // Student Statistics Table (matching the image layout)
      const studentStatsData = [
        ['Total Students Registered', (studentStats?.total_students || 0).toString()],
        ['Active Students', (studentStats?.active_students || 0).toString()],
        ['Students in Your Classes', (studentStats?.my_students || 0).toString()],
        ['New Registrations (This Month)', (studentStats?.monthly_registrations || 0).toString()],
        ['Average Class Size', (studentStats?.average_class_size || 0).toString()]
      ];

      autoTable(doc, {
        body: studentStatsData,
        startY: yPos,
        theme: 'plain',
        styles: { 
          fontSize: 12, 
          cellPadding: { top: 10, bottom: 10, left: 15, right: 15 },
          lineColor: [220, 220, 220],
          lineWidth: 1
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            fillColor: [240, 248, 255],
            textColor: [0, 51, 102],
            cellWidth: 80,
            halign: 'left'
          },
          1: { 
            halign: 'right',
            textColor: [34, 197, 94],
            fontStyle: 'bold',
            fontSize: 12,
            fillColor: [255, 255, 255]
          }
        },
        margin: { left: margin, right: margin },
        showHead: false,
        bodyStyles: {
          border: { top: 1, right: 1, bottom: 1, left: 1 },
          borderColor: [200, 200, 200]
        }
      });

      // Use automatic positioning
      yPos = doc.lastAutoTable.finalY + 25;
      
      // Curriculum Progress Overview (if space allows, otherwise new page)
      if (yPos > pageHeight - 150) {
        doc.addPage();
        yPos = addPDFHeader(doc, 'Teacher Profile & Analytics Report (Continued)', {
          teacher: `${user.first_name} ${user.last_name}`,
          date: new Date().toLocaleString()
        });
      }
      
      if (curriculumStats?.summary) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text('Curriculum Progress Overview', margin, yPos);
        yPos += 15;
        
        const curriculumOverviewData = [
          ['Total Curriculum Topics', (curriculumStats.summary.total_topics || 0).toString()],
          ['Completed Topics', (curriculumStats.summary.completed_topics || 0).toString()],
          ['Topics in Progress', (curriculumStats.summary.in_progress_topics || 0).toString()],
          ['Completion Rate', `${curriculumStats.summary.completion_rate || 0}%`],
          ['Total Estimated Hours', `${curriculumStats.summary.total_estimated_hours || 0}h`],
          ['Average Days to Complete', `${curriculumStats.summary.average_days_to_complete || 0} days`]
        ];

        autoTable(doc, {
          body: curriculumOverviewData,
          startY: yPos,
          theme: 'plain',
          styles: { 
            fontSize: 12, 
            cellPadding: { top: 10, bottom: 10, left: 15, right: 15 },
            lineColor: [220, 220, 220],
            lineWidth: 1
          },
          columnStyles: {
            0: { 
              fontStyle: 'bold', 
              fillColor: [240, 248, 255],
              textColor: [0, 51, 102],
              cellWidth: 80,
              halign: 'left'
            },
            1: { 
              halign: 'right',
              textColor: [139, 69, 19],
              fontStyle: 'bold',
              fontSize: 12,
              fillColor: [255, 255, 255]
            }
          },
          margin: { left: margin, right: margin },
          showHead: false,
          bodyStyles: {
            border: { top: 1, right: 1, bottom: 1, left: 1 },
            borderColor: [200, 200, 200]
          }
        });
        
        // Use automatic positioning
        yPos = doc.lastAutoTable.finalY + 25;
      }
      
      // Academic Performance Overview (if space allows, otherwise new page)
      if (yPos > pageHeight - 150) {
        doc.addPage();
        yPos = addPDFHeader(doc, 'Teacher Profile & Analytics Report (Continued)', {
          teacher: `${user.first_name} ${user.last_name}`,
          date: new Date().toLocaleString()
        });
      }
      
      if (academicStats) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 51, 102);
        doc.text('Academic Performance Overview', margin, yPos);
        yPos += 15;
        
        const academicOverviewData = [
          ['Classes Teaching', (academicStats.classes_count || 0).toString()],
          ['Subjects Teaching', (academicStats.subjects_count || 0).toString()],
          ['Total Assessments Created', (academicStats.total_assessments || 0).toString()],
          ['Students Assessed', (academicStats.students_assessed || 0).toString()],
          ['Overall Average Performance', `${academicStats.overall_average || 0}%`],
          ['Overall Pass Rate', `${academicStats.pass_rate || 0}%`]
        ];

        try {
          autoTable(doc, {
            body: academicOverviewData,
            startY: yPos,
            theme: 'plain',
            styles: { 
              fontSize: 12, 
              cellPadding: { top: 10, bottom: 10, left: 15, right: 15 },
              lineColor: [220, 220, 220],
              lineWidth: 1
            },
            columnStyles: {
              0: { 
                fontStyle: 'bold', 
                fillColor: [240, 248, 255],
                textColor: [0, 51, 102],
                cellWidth: 80,
                halign: 'left'
              },
              1: { 
                halign: 'right',
                textColor: [59, 130, 246],
                fontStyle: 'bold',
                fontSize: 12,
                fillColor: [255, 255, 255]
              }
            },
            margin: { left: margin, right: margin },
            showHead: false,
            bodyStyles: {
              border: { top: 1, right: 1, bottom: 1, left: 1 },
              borderColor: [200, 200, 200]
            }
          });
          
          // Use automatic positioning
          yPos = doc.lastAutoTable.finalY + 25;
          
        } catch (tableError) {
          console.error('Academic table error:', tableError);
          yPos += 100; // Fallback
        }
      }
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(85, 85, 85);
        doc.text(
          `UBUNIFU SECONDARY SCHOOL - Excellence in Education`,
          pageWidth/2,
          pageHeight - 20,
          { align: 'center' }
        );
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} • Page ${i} of ${pageCount}`,
          pageWidth/2,
          pageHeight - 15,
          { align: 'center' }
        );
      }
      
      // Generate filename
      const filename = `Teacher_Profile_Report_${user.last_name || 'Teacher'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      toast.success('Profile report exported successfully!');
    } catch (error) {
      console.error('Error exporting comprehensive report:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('finalY')) {
        toast.error('PDF layout error. Please try again.');
      } else if (error.message?.includes('jsPDF')) {
        toast.error('PDF generation library error. Please refresh and try again.');
      } else {
        toast.error(`Export failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setExporting(false);
    }
  }, [user, profileData, studentStats, curriculumStats, academicStats, addPDFHeader]);

  const getInitials = useCallback((firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }, []);

  const renderOverviewTab = () => {
    const quickStats = [
      {
        icon: <FaUsers />,
        number: studentStats?.total_students || 0,
        label: 'Total Students',
        sublabel: 'Registered in system'
      },
      {
        icon: <FaUserGraduate />,
        number: studentStats?.my_students || 0,
        label: 'My Students',
        sublabel: 'In your classes'
      },
      {
        icon: <FaSchool />,
        number: academicStats?.classes_count || 0,
        label: 'Classes Teaching',
        sublabel: 'Active classes'
      },
      {
        icon: <FaBookOpen />,
        number: academicStats?.subjects_count || 0,
        label: 'Subjects',
        sublabel: 'Teaching subjects'
      },
      {
        icon: <FaChartLine />,
        number: `${academicStats?.overall_average || 0}%`,
        label: 'Performance',
        sublabel: 'Overall average'
      },
      {
        icon: <FaAward />,
        number: `${academicStats?.pass_rate || 0}%`,
        label: 'Pass Rate',
        sublabel: 'Students passing'
      }
    ];

    return (
      <>
        {/* Profile Card */}
        <ProfileCard>
          <div className="profile-header">
            <div className="avatar">
              {getInitials(user?.first_name, user?.last_name)}
            </div>
            <div className="user-info">
              <h2>{user?.first_name} {user?.last_name}</h2>
              <div className="role">{user?.role || 'Teacher'} • Senior Educator</div>
              <div className="employee-id">Employee ID: {profileData?.employee_id || 'EMP001'}</div>
            </div>
          </div>
          <div className="profile-details">
            <div className="detail-item">
              <FaUser className="icon" />
              <div className="content">
                <div className="label">Full Name</div>
                <div className="value">{user?.first_name} {user?.last_name}</div>
              </div>
            </div>
            <div className="detail-item">
              <FaCalendarAlt className="icon" />
              <div className="content">
                <div className="label">Member Since</div>
                <div className="value">{profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
            <div className="detail-item">
              <FaSchool className="icon" />
              <div className="content">
                <div className="label">Department</div>
                <div className="value">{profileData?.department || 'Academic Department'}</div>
              </div>
            </div>
            <div className="detail-item">
              <FaChalkboardTeacher className="icon" />
              <div className="content">
                <div className="label">Teaching Experience</div>
                <div className="value">{profileData?.experience || '5+'} Years</div>
              </div>
            </div>
          </div>
        </ProfileCard>

        {/* Quick Stats */}
        <Section>
          <SectionTitle><FaChartBar style={{marginRight: '10px'}} />Quick Statistics</SectionTitle>
          <StatsGrid>
            {quickStats.map((stat, index) => (
              <StatCard key={index}>
                <div className="stat-icon">{stat.icon}</div>
                <div className="stat-meta">
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-sublabel">{stat.sublabel}</div>
                </div>
              </StatCard>
            ))}
          </StatsGrid>
        </Section>

        {/* Academic Summary */}
        <Section>
          <SectionTitle><FaGraduationCap style={{marginRight: '10px'}} />Academic Summary</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <h3 style={{ color: '#60a5fa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaUsers />Teaching Load
              </h3>
              <p>Classes: <strong>{academicStats?.classes_count || 0}</strong></p>
              <p>Subjects: <strong>{academicStats?.subjects_count || 0}</strong></p>
              <p>Total Students: <strong>{studentStats?.my_students || 0}</strong></p>
            </div>
            
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaTrophy />Performance Metrics
              </h3>
              <p>Overall Average: <strong>{academicStats?.overall_average || 0}%</strong></p>
              <p>Pass Rate: <strong>{academicStats?.pass_rate || 0}%</strong></p>
              <p>Total Assessments: <strong>{academicStats?.total_assessments || 0}</strong></p>
            </div>
          </div>
        </Section>

        {/* Recent Activity */}
        <Section>
          <SectionTitle><FaClock style={{marginRight: '10px'}} />Recent Activity</SectionTitle>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            <p>• Latest assessment created: {academicStats?.latest_assessment || 'No recent assessments'}</p>
            <p>• New students registered this month: <strong>{studentStats?.monthly_registrations || 0}</strong></p>
            <p>• Classes with recent activity: <strong>{academicStats?.active_classes || 0}</strong></p>
            <p>• Last login: {profileData?.last_login ? new Date(profileData.last_login).toLocaleString() : 'N/A'}</p>
          </div>
        </Section>

      </>
    );
  };

  const renderAnalyticsTab = () => {
    if (loading && activeTab === 'analytics') {
      return (
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      );
    }

    if (error && activeTab === 'analytics') {
      return (
        <ErrorMessage>
          <strong>Error:</strong> {error}
          <br />
          <Button 
            className="primary" 
            onClick={fetchAnalyticsData}
            style={{ marginTop: '15px' }}
          >
            <FaEye /> Try Again
          </Button>
        </ErrorMessage>
      );
    }

    const stats = analyticsData?.summary || {};
    const assessmentStats = [
      {
        icon: '📝',
        number: stats.total_assessments || 0,
        label: 'Total Assessments',
        sublabel: 'Created by you'
      },
      {
        icon: '👨‍🎓',
        number: stats.total_students || 0,
        label: 'Students Assessed',
        sublabel: 'Across all classes'
      },
      {
        icon: '📈',
        number: `${stats.average_score || 0}%`,
        label: 'Average Score',
        sublabel: 'Overall performance'
      },
      {
        icon: '✅',
        number: `${stats.pass_rate || 0}%`,
        label: 'Pass Rate',
        sublabel: 'Students passing'
      }
    ];

    return (
      <>
        {/* Filters */}
        <FiltersContainer>
          <h3><FaFilter style={{marginRight: '10px'}} />Filter Options</h3>
          <FiltersGrid>
            <FilterGroup>
              <Label>Class</Label>
              <Select
                value={filters.class_id}
                onChange={(e) => handleFilterChange('class_id', e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
            </FilterGroup>

            <FilterGroup>
              <Label>Subject</Label>
              <Select
                value={filters.subject_id}
                onChange={(e) => handleFilterChange('subject_id', e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </FilterGroup>

            <FilterGroup>
              <Label>Exam Type</Label>
              <Select
                value={filters.exam_type}
                onChange={(e) => handleFilterChange('exam_type', e.target.value)}
              >
                <option value="">All Types</option>
                {examTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Select>
            </FilterGroup>

            <FilterGroup>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </FilterGroup>

            <FilterGroup>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </FilterGroup>
          </FiltersGrid>

          <ButtonGroup>
            <Button className="primary" onClick={fetchAnalyticsData} disabled={loading}>
              <FaEye /> Apply Filters
            </Button>
            <Button className="secondary" onClick={clearFilters}>
              <FaEye /> Clear Filters
            </Button>
            <Button className="export" onClick={exportReport} disabled={exporting || !analyticsData}>
              <FaFilePdf /> {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </ButtonGroup>
        </FiltersContainer>

        {analyticsData && (
          <>
            {/* Summary Statistics */}
            <Section>
              <SectionTitle><FaChartBar style={{marginRight: '10px'}} />Assessment Analytics</SectionTitle>
              <StatsGrid>
                {assessmentStats.map((stat, index) => (
                  <StatCard key={index}>
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-meta">
                      <div className="stat-number">{stat.number}</div>
                      <div className="stat-label">{stat.label}</div>
                      <div className="stat-sublabel">{stat.sublabel}</div>
                    </div>
                  </StatCard>
                ))}
              </StatsGrid>
            </Section>

            {/* Charts */}
            <Section>
              <SectionTitle><FaChartLine style={{marginRight: '10px'}} />Performance Charts</SectionTitle>
              {analyticsData.assessments && analyticsData.assessments.length > 0 ? (
                <AnalyticsChartsGrid
                  gradeDistribution={analyticsData.grade_distribution}
                  classPerformance={analyticsData.class_performance || []}
                  subjectPerformance={analyticsData.subject_performance || []}
                  assessmentTrends={analyticsData.assessment_trends || analyticsData.charts?.assessmentTrends || []}
                />
              ) : (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '12px'
                }}>
                  <FaChartBar style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '15px' }} />
                  <h3 style={{ color: colors.textPrimary, marginBottom: '10px' }}>No Assessment Data Available</h3>
                  <p style={{ color: colors.textSecondary }}>
                    Create some assessments and add student grades to see performance charts and analytics.
                  </p>
                </div>
              )}
            </Section>
          </>
        )}
      </>
    );
  };

  const renderStudentsTab = () => {
    return (
      <>
        {/* Student Registration Statistics */}
        <Section>
          <SectionTitle><FaUsers style={{marginRight: '10px'}} />Student Registration Overview</SectionTitle>
          <StatsGrid>
            <StatCard>
              <div className="stat-icon">👥</div>
              <div className="stat-meta">
                <div className="stat-number">{studentStats?.total_students || 0}</div>
                <div className="stat-label">Total Students</div>
                <div className="stat-sublabel">Registered in system</div>
              </div>
            </StatCard>
            <StatCard>
              <div className="stat-icon">✅</div>
              <div className="stat-meta">
                <div className="stat-number">{studentStats?.active_students || 0}</div>
                <div className="stat-label">Active Students</div>
                <div className="stat-sublabel">Currently enrolled</div>
              </div>
            </StatCard>
            <StatCard>
              <div className="stat-icon">🎓</div>
              <div className="stat-meta">
                <div className="stat-number">{studentStats?.my_students || 0}</div>
                <div className="stat-label">My Students</div>
                <div className="stat-sublabel">In your classes</div>
              </div>
            </StatCard>
            <StatCard>
              <div className="stat-icon">📅</div>
              <div className="stat-meta">
                <div className="stat-number">{studentStats?.monthly_registrations || 0}</div>
                <div className="stat-label">This Month</div>
                <div className="stat-sublabel">New registrations</div>
              </div>
            </StatCard>
          </StatsGrid>
        </Section>

        {/* Class Breakdown */}
        <Section>
          <SectionTitle><FaSchool style={{marginRight: '10px'}} />Class Distribution</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {classes.map(cls => {
              const utilizationRate = cls.capacity > 0 ? Math.round((cls.student_count / cls.capacity) * 100) : 0;
              const isOverCapacity = cls.student_count > cls.capacity;
              
              return (
                <div key={cls.id} style={{ 
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
                  padding: '20px', 
                  borderRadius: '12px', 
                  border: `1px solid ${isOverCapacity ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.3)'}` 
                }}>
                  <h3 style={{ color: '#60a5fa', marginBottom: '10px' }}>
                    {cls.name}
                    {isOverCapacity && <span style={{ color: '#ef4444', fontSize: '0.8em', marginLeft: '8px' }}>⚠️</span>}
                  </h3>
                  <p>Active Students: <strong style={{ color: isOverCapacity ? '#ef4444' : '#22c55e' }}>{cls.student_count || 0}</strong></p>
                  <p>Capacity: <strong>{cls.capacity || 'N/A'}</strong></p>
                  <p>Utilization: <strong>{utilizationRate}%</strong></p>
                  <p>Form Level: <strong>{cls.level || 'N/A'}</strong></p>
                  {isOverCapacity && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '8px' }}>
                      ⚠️ Over capacity by {cls.student_count - cls.capacity} students
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </>
    );
  };

  const renderCurriculumTab = () => {
    if (loading && activeTab === 'curriculum') {
      return (
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      );
    }

    const stats = curriculumStats?.summary || {};
    const curriculumQuickStats = [
      {
        icon: <FaBookOpen />,
        number: stats.total_topics || 0,
        label: 'Total Topics',
        sublabel: 'Curriculum topics'
      },
      {
        icon: <FaCheckCircle />,
        number: stats.completed_topics || 0,
        label: 'Completed',
        sublabel: 'Topics taught'
      },
      {
        icon: <FaExclamationTriangle />,
        number: stats.in_progress_topics || 0,
        label: 'In Progress',
        sublabel: 'Currently teaching'
      },
      {
        icon: <FaClock />,
        number: stats.pending_topics || 0,
        label: 'Pending',
        sublabel: 'Not started yet'
      },
      {
        icon: <FaPercentage />,
        number: `${stats.completion_rate || 0}%`,
        label: 'Completion Rate',
        sublabel: 'Overall progress'
      },
      {
        icon: <FaCalendarAlt />,
        number: stats.average_days_to_complete || 0,
        label: 'Avg Days',
        sublabel: 'To complete topic'
      }
    ];

    return (
      <>
        {/* Filters for Curriculum */}
        <FiltersContainer>
          <h3><FaFilter style={{marginRight: '10px'}} />Curriculum Filters</h3>
          <FiltersGrid>
            <FilterGroup>
              <Label>Subject</Label>
              <Select
                value={filters.subject_id}
                onChange={(e) => handleFilterChange('subject_id', e.target.value)}
              >
                <option value="">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </Select>
            </FilterGroup>

            <FilterGroup>
              <Label>Class</Label>
              <Select
                value={filters.class_id}
                onChange={(e) => handleFilterChange('class_id', e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </Select>
            </FilterGroup>
          </FiltersGrid>

          <ButtonGroup>
            <Button className="primary" onClick={fetchCurriculumStats}>
              <FaEye /> Refresh Data
            </Button>
            <Button className="secondary" onClick={() => {
              setFilters(prev => ({ ...prev, subject_id: '', class_id: '' }));
              fetchCurriculumStats();
            }}>
              <FaFilter /> Clear Filters
            </Button>
          </ButtonGroup>
        </FiltersContainer>

        {curriculumStats && (
          <>
            {/* Summary Statistics */}
            <Section>
              <SectionTitle><FaBookOpen style={{marginRight: '10px'}} />Curriculum Progress Overview</SectionTitle>
              <StatsGrid>
                {curriculumQuickStats.map((stat, index) => (
                  <StatCard key={index}>
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-meta">
                      <div className="stat-number">{stat.number}</div>
                      <div className="stat-label">{stat.label}</div>
                      <div className="stat-sublabel">{stat.sublabel}</div>
                    </div>
                  </StatCard>
                ))}
              </StatsGrid>
            </Section>

            {/* Time Analysis */}
            <Section>
              <SectionTitle><FaClock style={{marginRight: '10px'}} />Time Analysis</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <h3 style={{ color: '#60a5fa', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaClock />Time Estimates vs. Actual
                  </h3>
                  <p>Estimated Hours: <strong>{stats.total_estimated_hours || 0}h</strong></p>
                  <p>Actual Hours: <strong>{stats.total_actual_hours || 0}h</strong></p>
                  <p>Efficiency Rate: <strong>{stats.efficiency_rate || 0}%</strong></p>
                </div>
                
                <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                  <h3 style={{ color: '#22c55e', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaCalendarAlt />Completion Timing
                  </h3>
                  <p>Average Days: <strong>{stats.average_days_to_complete || 0} days</strong></p>
                  <p>Completed Topics: <strong>{stats.completed_topics || 0}</strong></p>
                  <p>Success Rate: <strong>{stats.completion_rate || 0}%</strong></p>
                </div>
              </div>
            </Section>

            {/* Subject Breakdown */}
            {curriculumStats.by_subject && curriculumStats.by_subject.length > 0 && (
              <Section>
                <SectionTitle><FaChartBar style={{marginRight: '10px'}} />Progress by Subject</SectionTitle>
                <Table>
                  <TableHeader columns="2fr 1fr 1fr 1fr 1fr 1fr">
                    <div>Subject</div>
                    <div>Total Topics</div>
                    <div>Completed</div>
                    <div>Completion %</div>
                    <div>Est. Hours</div>
                    <div>Avg. Days</div>
                  </TableHeader>
                  {curriculumStats.by_subject.map((subject, index) => (
                    <TableRow key={index} columns="2fr 1fr 1fr 1fr 1fr 1fr">
                      <div>
                        <strong style={{ color: '#60a5fa' }}>{subject.subject_name}</strong>
                        <br />
                        <small style={{ color: 'rgba(255, 255, 255, 0.6)' }}>({subject.subject_code})</small>
                      </div>
                      <div>{subject.total_topics}</div>
                      <div style={{ color: '#22c55e', fontWeight: 'bold' }}>{subject.completed_topics}</div>
                      <div>
                        <div style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          textAlign: 'center',
                          background: subject.completion_rate >= 80 ? 'rgba(34, 197, 94, 0.2)' : 
                                     subject.completion_rate >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: subject.completion_rate >= 80 ? '#22c55e' : 
                                 subject.completion_rate >= 50 ? '#f59e0b' : '#ef4444'
                        }}>
                          {subject.completion_rate}%
                        </div>
                      </div>
                      <div>{subject.estimated_hours}h</div>
                      <div>{subject.average_days} days</div>
                    </TableRow>
                  ))}
                </Table>
              </Section>
            )}
          </>
        )}
      </>
    );
  };

  const renderReportsTab = () => {
    return (
      <>
        {/* Export Options */}
        <Section>
          <SectionTitle><FaFileAlt style={{marginRight: '10px'}} />Available Reports</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
              padding: '25px', 
              borderRadius: '12px', 
              border: '1px solid rgba(34, 197, 94, 0.3)',
              textAlign: 'center'
            }}>
              <FaUser style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '15px' }} />
              <h3 style={{ color: '#22c55e', marginBottom: '10px' }}>Profile Report</h3>
              <p style={{ marginBottom: '20px' }}>Comprehensive teacher profile and academic information</p>
              <Button 
                className="secondary" 
                onClick={exportComprehensiveReport} 
                disabled={exporting}
              >
                <FaDownload /> {exporting ? 'Exporting...' : 'Export Profile'}
              </Button>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1))',
              padding: '25px', 
              borderRadius: '12px', 
              border: '1px solid rgba(59, 130, 246, 0.3)',
              textAlign: 'center'
            }}>
              <FaChartBar style={{ fontSize: '3rem', color: '#3b82f6', marginBottom: '15px' }} />
              <h3 style={{ color: '#3b82f6', marginBottom: '10px' }}>Analytics Report</h3>
              <p style={{ marginBottom: '20px' }}>Detailed performance analytics and assessment data</p>
              <Button 
                className="primary" 
                onClick={() => setActiveTab('analytics')} 
              >
                <FaEye /> View Analytics
              </Button>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.1), rgba(120, 53, 15, 0.1))',
              padding: '25px', 
              borderRadius: '12px', 
              border: '1px solid rgba(139, 69, 19, 0.3)',
              textAlign: 'center'
            }}>
              <FaBookOpen style={{ fontSize: '3rem', color: '#8b4513', marginBottom: '15px' }} />
              <h3 style={{ color: '#8b4513', marginBottom: '10px' }}>Curriculum Report</h3>
              <p style={{ marginBottom: '20px' }}>Topic completion progress and teaching time analysis</p>
              <Button 
                className="export" 
                onClick={exportCurriculumReport} 
                disabled={exporting || !curriculumStats}
                style={{ marginRight: '10px' }}
              >
                <FaDownload /> {exporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button 
                className="secondary" 
                onClick={() => setActiveTab('curriculum')} 
              >
                <FaBookOpen /> View Details
              </Button>
            </div>
            
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))',
              padding: '25px', 
              borderRadius: '12px', 
              border: '1px solid rgba(245, 158, 11, 0.3)',
              textAlign: 'center'
            }}>
              <FaUsers style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '15px' }} />
              <h3 style={{ color: '#f59e0b', marginBottom: '10px' }}>Student Report</h3>
              <p style={{ marginBottom: '20px' }}>Complete student registration and class statistics</p>
              <Button 
                className="export" 
                onClick={() => setActiveTab('students')} 
              >
                <FaUsers /> View Students
              </Button>
            </div>
          </div>
        </Section>

        {/* Report Summary */}
        <Section>
          <SectionTitle><FaListAlt style={{marginRight: '10px'}} />Report Summary</SectionTitle>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            <h4 style={{ color: '#60a5fa', marginBottom: '15px' }}>What's Included in Your Reports:</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              <div>
                <h5 style={{ color: '#22c55e' }}>Profile Information:</h5>
                <ul>
                  <li>Personal details and contact information</li>
                  <li>Employment history and credentials</li>
                  <li>Teaching assignments and responsibilities</li>
                </ul>
              </div>
              <div>
                <h5 style={{ color: '#3b82f6' }}>Academic Data:</h5>
                <ul>
                  <li>Classes and subjects taught</li>
                  <li>Assessment performance metrics</li>
                  <li>Grade distributions and trends</li>
                </ul>
              </div>
              <div>
                <h5 style={{ color: '#8b4513' }}>Curriculum Progress:</h5>
                <ul>
                  <li>Topic completion rates by subject</li>
                  <li>Teaching time analysis and efficiency</li>
                  <li>Progress trends and completion dates</li>
                </ul>
              </div>
              <div>
                <h5 style={{ color: '#f59e0b' }}>Student Statistics:</h5>
                <ul>
                  <li>Total student registrations</li>
                  <li>Class enrollment numbers</li>
                  <li>Monthly registration trends</li>
                </ul>
              </div>
            </div>
          </div>
        </Section>
      </>
    );
  };

  if (loading && activeTab === 'overview') {
    return (
      <Container>
        <Header>
          <h1><FaChartBar />Academy Analytics & Reports</h1>
          <p>Comprehensive academic performance analysis and reporting</p>
        </Header>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <h1>📊 Analytics & Reports</h1>
          <p>Assessment Performance Analysis</p>
        </Header>
        <ErrorMessage>
          <strong>Error:</strong> {error}
          <br />
          <Button 
            className="primary" 
            onClick={fetchAnalyticsData}
            style={{ marginTop: '15px' }}
          >
            <i className="fas fa-refresh"></i>
            Try Again
          </Button>
        </ErrorMessage>
      </Container>
    );
  }


  const tabs = [
    { id: 'overview', label: 'Overview', icon: <FaEye /> },
    { id: 'students', label: 'Students', icon: <FaUsers /> },
    { id: 'curriculum', label: 'Curriculum', icon: <FaBookOpen /> },
    { id: 'analytics', label: 'Analytics', icon: <FaChartBar /> },
    { id: 'reports', label: 'Reports', icon: <FaFileAlt /> }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'students':
        return renderStudentsTab();
      case 'curriculum':
        return renderCurriculumTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'reports':
        return renderReportsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <Container>
      <Header>
        <h1><FaChartBar />Academy Analytics & Reports</h1>
        <p>Comprehensive academic performance analysis and detailed reporting</p>
        <p>View your profile, student statistics, performance analytics, and generate reports</p>
      </Header>

      {/* Navigation Tabs */}
      <TabsContainer>
        <div className="tabs">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </div>
          ))}
        </div>
      </TabsContainer>

      {/* Tab Content */}
      {renderTabContent()}
    </Container>
  );
};

export default AnalyticsReports;
