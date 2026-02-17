import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCalendar, FaFileAlt, FaFilePdf, FaFileWord, FaDownload, FaEye, FaFilter, FaUsers, FaChartBar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import {
  PageContainer,
  PageHeader,
  Section,
  Card,
  PrimaryButton,
  SecondaryButton,
  FiltersSection as SharedFiltersSection,
  SectionTitle,
  colors,
  shadows,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const AttendanceMenuContainer = styled(PageContainer)`
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
  }
`;

const FiltersSection = styled(SharedFiltersSection)`
  h3 {
    color: ${colors.textPrimary};
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-display);
    font-weight: 600;
  }

  button {
    padding: 12px 20px;
    background: ${colors.gradientPrimary};
    color: #f9fafb;
    border: none;
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
`;

const AttendanceRecordsSection = styled(Section)`
  h3 {
    color: ${colors.textPrimary};
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between;
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 1.25rem;
  }

  .export-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .export-btn {
    padding: 10px 16px;
    border: 1px solid;
    border-radius: ${borderRadius.pill};
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;

    &.pdf {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
      
      &:hover {
        background: rgba(239, 68, 68, 0.15);
        transform: translateY(-1px);
      }
    }

    &.word {
      background: rgba(59, 130, 246, 0.1);
      color: ${colors.primaryBlue};
      border-color: rgba(59, 130, 246, 0.3);
      
      &:hover {
        background: rgba(59, 130, 246, 0.15);
        transform: translateY(-1px);
      }
    }
  }
`;

const RecordsList = styled.div`
  .no-records {
    text-align: center;
    padding: 40px;
    color: ${colors.textSecondary};
    
    .icon {
      font-size: 3rem;
      margin-bottom: 15px;
      opacity: 0.5;
      color: ${colors.textMuted};
    }
  }
`;

const RecordCard = styled(Card)`
  margin-bottom: 15px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${shadows.cardHover};
    border-color: rgba(37, 99, 235, 0.35);
  }

  .record-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 12px;
    border-bottom: 1px solid ${colors.borderLight};
  }

  .record-info {
    h4 {
      color: ${colors.primaryBlueLight};
      margin: 0 0 5px 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    p {
      color: ${colors.textSecondary};
      margin: 2px 0;
      font-size: 0.9rem;
    }
  }

  .record-actions {
    display: flex;
    gap: 10px;
    
    button {
      padding: 8px 12px;
      border: none;
      border-radius: ${borderRadius.small};
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;

      &.view {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        
        &:hover {
          background: rgba(34, 197, 94, 0.15);
          transform: translateY(-1px);
        }
      }

      &.export {
        background: rgba(168, 85, 247, 0.2);
        color: #a855f7;
        
        &:hover {
          background: rgba(168, 85, 247, 0.3);
        }
      }
    }
  }

  .record-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 10px;
    margin-top: 15px;
    
    .stat {
      text-align: center;
      padding: 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.05);
      
      .number {
        font-weight: bold;
        font-size: 1.1rem;
      }
      
      .label {
        font-size: 0.8rem;
        opacity: 0.8;
        margin-top: 2px;
      }
      
      &.present .number { color: #22c55e; }
      &.absent .number { color: #ef4444; }
      &.late .number { color: #f59e0b; }
      &.excused .number { color: #8b5cf6; }
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

const AttendanceMenu = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [takeClassId, setTakeClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    classId: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchAttendanceRecords();
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [filters]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes/my-classes');
      setClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch classes');
      setClasses([]);
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);

      const response = await api.get('/api/attendance/records', {
        params: {
          classId: filters.classId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          status: filters.status || undefined,
        }
      });

      setAttendanceRecords(response.data?.records || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to fetch attendance records');
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadBlob = (blob, filename) => {
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      classId: '',
      startDate: '',
      endDate: '',
      status: ''
    });
  };

  const startTakeAttendance = () => {
    const classId = takeClassId || filters.classId || '';
    if (!classId) {
      toast.info('Select a class to take attendance.');
      return;
    }
    navigate(`/classes/${classId}/attendance`);
  };

  const exportToPDF = async (recordId = null) => {
    try {
      const url = recordId ? `/api/attendance/export/pdf/${recordId}` : '/api/attendance/export/pdf';
      const response = await api.get(url, {
        params: recordId
          ? undefined
          : {
              classId: filters.classId || undefined,
              startDate: filters.startDate || undefined,
              endDate: filters.endDate || undefined,
              status: filters.status || undefined,
            },
        responseType: 'blob',
      });

      if (response.status >= 200 && response.status < 300) {
        downloadBlob(response.data, `attendance-report-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF exported successfully');
      } else {
        toast.error('Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  const exportToWord = async (recordId = null) => {
    try {
      const url = recordId ? `/api/attendance/export/word/${recordId}` : '/api/attendance/export/word';
      const response = await api.get(url, {
        params: recordId
          ? undefined
          : {
              classId: filters.classId || undefined,
              startDate: filters.startDate || undefined,
              endDate: filters.endDate || undefined,
              status: filters.status || undefined,
            },
        responseType: 'blob',
      });

      if (response.status >= 200 && response.status < 300) {
        downloadBlob(response.data, `attendance-report-${new Date().toISOString().split('T')[0]}.docx`);
        toast.success('Word document exported successfully');
      } else {
        toast.error('Failed to export Word document');
      }
    } catch (error) {
      console.error('Error exporting Word document:', error);
      toast.error('Failed to export Word document');
    }
  };

  const viewAttendanceRecord = (record) => {
    // Navigate to detailed view with proper URL parameters using React Router
    // Convert the UTC date to the server's local timezone date
    // The backend expects the server's local date (2025-08-20) not the UTC date (2025-08-19)
    const utcDate = new Date(record.date);
    
    // Convert to local server timezone - this handles the timezone conversion automatically
    const localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
    
    // For GMT+3 server, we need to add 3 hours to get the correct local date
    // This converts 2025-08-19T21:00:00.000Z UTC to 2025-08-20 local
    const serverTimezonOffset = 3 * 60; // 3 hours in minutes for GMT+3
    const serverLocalDate = new Date(utcDate.getTime() + (serverTimezonOffset * 60000));
    const formattedDate = serverLocalDate.toISOString().split('T')[0];
    
    console.log('Original UTC date:', record.date);
    console.log('Server local date for URL:', formattedDate);
    
    navigate(`/attendance/detail/${record.class_id}/${formattedDate}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AttendanceMenuContainer>
      <Header>
        <h1>
          <FaChartBar />
          Attendance Records
        </h1>
        <p>View and manage all attendance records with export capabilities</p>
        <p>Export attendance data to PDF or Word format for reporting and analysis</p>
      </Header>

      <Section style={{ marginBottom: 20 }}>
        <SectionTitle>Take Attendance</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontWeight: 700, color: colors.textPrimary }}>Class</label>
            <select value={takeClassId} onChange={(e) => setTakeClassId(e.target.value)}>
              <option value="">Select a class…</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
          <PrimaryButton onClick={startTakeAttendance} style={{ whiteSpace: 'nowrap' }}>
            Take Attendance
          </PrimaryButton>
        </div>
        <div style={{ marginTop: 10, color: colors.textSecondary, fontSize: '0.95rem' }}>
          Attendance is taken per class and date. Choose a class to start.
        </div>
      </Section>

      <FiltersSection>
        <h3>
          <FaFilter />
          Filter Records
        </h3>
        <div className="filter-grid">
          <div className="filter-group">
            <label>Class</label>
            <select
              value={filters.classId}
              onChange={(e) => handleFilterChange('classId', e.target.value)}
            >
              <option value="">All Classes</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
            </select>
          </div>
          
          <div className="filter-group">
            <button onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </FiltersSection>

      <AttendanceRecordsSection>
        <h3>
          <span>
            <FaFileAlt />
            Attendance Records ({attendanceRecords.length})
          </span>
          <div className="export-buttons">
            <button 
              className="export-btn pdf"
              onClick={() => exportToPDF()}
            >
              <FaFilePdf />
              Export PDF
            </button>
            <button 
              className="export-btn word"
              onClick={() => exportToWord()}
            >
              <FaFileWord />
              Export Word
            </button>
          </div>
        </h3>

        <RecordsList>
          {loading ? (
            <LoadingSpinner>
              <div className="spinner"></div>
            </LoadingSpinner>
          ) : attendanceRecords.length === 0 ? (
            <div className="no-records">
              <div className="icon">
                <FaFileAlt />
              </div>
              <p>No attendance records found matching your criteria.</p>
              <p>Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            attendanceRecords.map((record, index) => (
              <RecordCard key={index}>
                <div className="record-header">
                  <div className="record-info">
                    <h4>{record.class_name}</h4>
                    <p><FaCalendar /> {formatDate(record.date)}</p>
                    <p><FaUsers /> {record.total_students} Students</p>
                  </div>
                  <div className="record-actions">
                    <button 
                      className="view"
                      onClick={() => viewAttendanceRecord(record)}
                    >
                      <FaEye />
                      View
                    </button>
                    <button 
                      className="export"
                      onClick={() => exportToPDF(record.id)}
                    >
                      <FaDownload />
                      Export
                    </button>
                  </div>
                </div>
                
                <div className="record-stats">
                  <div className="stat present">
                    <div className="number">{record.present_count || 0}</div>
                    <div className="label">Present</div>
                  </div>
                  <div className="stat absent">
                    <div className="number">{record.absent_count || 0}</div>
                    <div className="label">Absent</div>
                  </div>
                  <div className="stat late">
                    <div className="number">{record.late_count || 0}</div>
                    <div className="label">Late</div>
                  </div>
                  <div className="stat excused">
                    <div className="number">{record.excused_count || 0}</div>
                    <div className="label">Excused</div>
                  </div>
                </div>
              </RecordCard>
            ))
          )}
        </RecordsList>
      </AttendanceRecordsSection>
    </AttendanceMenuContainer>
  );
};

export default AttendanceMenu;
