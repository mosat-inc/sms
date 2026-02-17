import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FaArrowLeft, FaExclamationCircle, FaFilePdf, FaFileWord, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  ActionButton,
  Card,
  CardGrid,
  colors,
  ErrorMessage,
  FlexRow,
  InfoMessage,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  SecondaryButton,
  Section,
  SectionTitle,
  StatCard,
  StatsGrid,
} from './shared/StyledComponents';

const Container = styled(PageContainer)`
  padding: 20px;

  ${mediaQuery('tablet')} {
    padding: 15px;
  }

  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const ExportRow = styled(FlexRow)`
  width: 100%;
`;

const StatusCard = styled(Card)`
  position: relative;
  overflow: hidden;
  padding: 18px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${(props) => props.$accent || colors.gradientPrimary};
  }

  .status-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
    margin-bottom: 12px;
  }

  .status-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${colors.textPrimary};
    margin: 0;
    font-family: var(--font-display);
  }

  .status-count {
    font-weight: 700;
    color: ${(props) => props.$countColor || colors.textPrimary};
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.15);
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.9rem;
    white-space: nowrap;
  }
`;

const StudentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;

  .empty {
    text-align: center;
    padding: 28px 10px;
    color: ${colors.textSecondary};
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(15, 23, 42, 0.06);
    background: rgba(59, 130, 246, 0.04);
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    background: ${colors.gradientPrimary};
    color: #f9fafb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .meta {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .name {
    font-weight: 700;
    color: ${colors.textPrimary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sub {
    font-size: 0.85rem;
    color: ${colors.textSecondary};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notes {
    font-size: 0.85rem;
    color: ${colors.textSecondary};
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    padding: 6px 10px;
    border-radius: 999px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
    flex-shrink: 1;

    ${mediaQuery('mobile')} {
      display: none;
    }
  }
`;

const AttendanceDetailView = () => {
  const { classId, date } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attendanceData, setAttendanceData] = useState(null);
  const [classData, setClassData] = useState(null);

  const fetchClassData = useCallback(async () => {
    try {
      const response = await api.get(`/api/classes/${classId}`);
      if (response.data?.success) setClassData(response.data.data);
    } catch (fetchError) {
      console.error('Error fetching class data:', fetchError);
    }
  }, [api, classId]);

  const fetchAttendanceDetail = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const response = await api.get(`/api/attendance/${classId}/${date}`);
      if (response.data) {
        setAttendanceData(response.data);
      } else {
        setError('Failed to load attendance details.');
        toast.error('Failed to load attendance details');
      }
    } catch (fetchError) {
      console.error('Error fetching attendance details:', fetchError);
      setError(fetchError.response?.data?.message || 'Error loading attendance details.');
      toast.error('Error loading attendance details');
    } finally {
      setLoading(false);
    }
  }, [api, classId, date]);

  useEffect(() => {
    if (!classId || !date) return;
    fetchAttendanceDetail();
    fetchClassData();
  }, [classId, date, fetchAttendanceDetail, fetchClassData]);

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    try {
      const response = await api.get('/api/attendance/export/pdf', {
        params: { classId, date },
        responseType: 'blob'
      });

      if (response.status >= 200 && response.status < 300) {
        downloadBlob(response.data, `attendance-${classData?.class_name || 'class'}-${date}.pdf`);
        toast.success('PDF exported successfully');
      } else {
        toast.error('Failed to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error(error.response?.data?.message || 'Failed to export PDF');
    }
  };

  const exportToWord = async () => {
    try {
      const response = await api.get('/api/attendance/export/word', {
        params: { classId, date },
        responseType: 'blob'
      });

      if (response.status >= 200 && response.status < 300) {
        downloadBlob(response.data, `attendance-${classData?.class_name || 'class'}-${date}.docx`);
        toast.success('Word document exported successfully');
      } else {
        toast.error('Failed to export Word document');
      }
    } catch (error) {
      console.error('Error exporting Word document:', error);
      toast.error(error.response?.data?.message || 'Failed to export Word document');
    }
  };

  const formatDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }, []);

  const getInitials = useCallback((firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  }, []);

  const stats = useMemo(() => attendanceData?.stats || {}, [attendanceData?.stats]);
  const attendance = useMemo(() => attendanceData?.attendance || [], [attendanceData?.attendance]);

  const groupedStudents = useMemo(() => {
    return attendance.reduce((groups, student) => {
      const status = student.status || 'unknown';
      if (!groups[status]) groups[status] = [];
      groups[status].push(student);
      return groups;
    }, {});
  }, [attendance]);

  const total = attendance.length || 0;
  const attendanceRate = total > 0 ? (((stats.present || 0) + (stats.late || 0)) / total) * 100 : 0;

  const statsCards = useMemo(
    () => [
      {
        icon: '✅',
        number: stats.present || 0,
        label: 'Present',
        sub: total ? `${(((stats.present || 0) / total) * 100).toFixed(1)}%` : '0%',
      },
      {
        icon: '❌',
        number: stats.absent || 0,
        label: 'Absent',
        sub: total ? `${(((stats.absent || 0) / total) * 100).toFixed(1)}%` : '0%',
      },
      {
        icon: '⏰',
        number: stats.late || 0,
        label: 'Late',
        sub: total ? `${(((stats.late || 0) / total) * 100).toFixed(1)}%` : '0%',
      },
      {
        icon: '📝',
        number: stats.excused || 0,
        label: 'Excused',
        sub: total ? `${(((stats.excused || 0) / total) * 100).toFixed(1)}%` : '0%',
      },
      { icon: '👥', number: total, label: 'Total Students', sub: 'In roster' },
      {
        icon: '📈',
        number: `${attendanceRate.toFixed(1)}%`,
        label: 'Attendance Rate',
        sub: `${(stats.present || 0) + (stats.late || 0)} present/late`,
      },
    ],
    [
      attendanceRate,
      stats.absent,
      stats.excused,
      stats.late,
      stats.present,
      total,
    ]
  );

  const statusGroups = useMemo(
    () => [
      {
        key: 'present',
        title: 'Present Students',
        count: stats.present || 0,
        accent: 'linear-gradient(135deg, #10b981, #22c55e)',
        countColor: '#047857',
      },
      {
        key: 'absent',
        title: 'Absent Students',
        count: stats.absent || 0,
        accent: 'linear-gradient(135deg, #ef4444, #b91c1c)',
        countColor: '#b91c1c',
      },
      {
        key: 'late',
        title: 'Late Students',
        count: stats.late || 0,
        accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
        countColor: '#b45309',
      },
      {
        key: 'excused',
        title: 'Excused Students',
        count: stats.excused || 0,
        accent: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        countColor: '#5b21b6',
      },
    ],
    [stats.absent, stats.excused, stats.late, stats.present]
  );

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>
          <div className="spinner" />
        </LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader>
        <FlexRow $justify="space-between" $wrap $gap="18px">
          <div>
            <h1>📋 Attendance Details</h1>
            <p>
              <strong>Class:</strong> {classData?.class_name || 'Unknown Class'}
            </p>
            <p>
              <strong>Date:</strong> {formatDate(date)}
            </p>
            <p>
              <strong>Total Students:</strong> {total}
            </p>
          </div>
          <SecondaryButton
            onClick={() => {
              navigate('/attendance', { replace: false });
            }}
          >
            <FaArrowLeft />
            Back to Attendance
          </SecondaryButton>
        </FlexRow>
      </PageHeader>

      {error ? (
        <ErrorMessage>
          <FaExclamationCircle />
          {error}
        </ErrorMessage>
      ) : null}

      <StatsGrid>
        {statsCards.map((card) => (
          <StatCard key={card.label}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-meta">
              <div className="stat-number">{card.number}</div>
              <div className="stat-label">{card.label}</div>
              <div style={{ fontSize: '0.82rem', color: colors.textSecondary }}>{card.sub}</div>
            </div>
          </StatCard>
        ))}
      </StatsGrid>

      <Section>
        <ExportRow $justify="space-between" $wrap $gap="14px">
          <SectionTitle style={{ margin: 0 }}>Export</SectionTitle>
          <FlexRow $gap="10px" $wrap>
            <ActionButton onClick={exportToPDF}>
              <FaFilePdf />
              Export PDF
            </ActionButton>
            <ActionButton onClick={exportToWord}>
              <FaFileWord />
              Export Word
            </ActionButton>
          </FlexRow>
        </ExportRow>
      </Section>

      {total === 0 ? (
        <InfoMessage>
          <FaInfoCircle />
          No attendance records found for this date.
        </InfoMessage>
      ) : (
        <CardGrid $minWidth="340px" $gap="18px">
          {statusGroups.map((group) => {
            const students = groupedStudents[group.key] || [];
            return (
              <StatusCard key={group.key} $accent={group.accent} $countColor={group.countColor}>
                <div className="status-header">
                  <h3 className="status-title">{group.title}</h3>
                  <div className="status-count">{group.count}</div>
                </div>
                <StudentList>
                  {students.length === 0 ? (
                    <div className="empty">No students marked {group.key}.</div>
                  ) : (
                    students.map((student) => (
                      <div key={student.id} className="row">
                        <div className="left">
                          <div className="avatar">{getInitials(student.first_name, student.last_name)}</div>
                          <div className="meta">
                            <div className="name">
                              {student.first_name} {student.last_name}
                            </div>
                            <div className="sub">Roll #{student.roll_number}</div>
                          </div>
                        </div>
                        {student.notes ? (
                          <div className="notes" title={student.notes}>
                            {student.notes}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </StudentList>
              </StatusCard>
            );
          })}
        </CardGrid>
      )}
    </Container>
  );
};

export default AttendanceDetailView;
