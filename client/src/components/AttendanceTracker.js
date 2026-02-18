import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  borderRadius,
  colors,
  InfoMessage,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  SectionTitle,
  StatCard,
  StatsGrid,
  Tab,
  TabContainer,
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

const Header = styled(PageHeader)`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;

  ${mediaQuery('mobile')} {
    flex-direction: column;
    align-items: stretch;
  }

  .header-info {
    flex: 1;
    min-width: 0;
  }

  .class-details {
    color: ${colors.textSecondary};
    font-size: 0.95rem;
    display: grid;
    gap: 4px;
  }
`;

const ControlsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: end;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;

  label {
    color: ${colors.textPrimary};
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 0.9rem;
  }
`;

const DateInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  font-size: 1rem;
  outline: none;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;

  &:focus {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
  }
`;

const SessionTabs = styled(TabContainer)`
  margin-bottom: 0;

  .tabs {
    margin-bottom: 0;
  }
`;

const SessionTitleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  ${mediaQuery('tablet')} {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const BulkActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const StudentList = styled.div`
  display: grid;
  gap: 12px;
`;

const StudentRow = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(260px, 1.2fr) minmax(240px, 1fr);
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.large};
  background: ${colors.cardBackground};
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .student-details {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .student-avatar {
    width: 44px;
    height: 44px;
    border-radius: ${borderRadius.pill};
    background: ${colors.gradientPrimary};
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-family: var(--font-display);
    flex-shrink: 0;
  }

  .student-name {
    font-weight: 700;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .student-id {
    color: ${colors.textSecondary};
    font-size: 0.9rem;
  }
`;

const StatusButtons = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  ${mediaQuery('mobile')} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const StatusButton = styled.button`
  padding: 10px 10px;
  border-radius: ${borderRadius.pill};
  border: 1px solid ${(p) => (p.$active ? 'transparent' : p.$borderColor)};
  background: ${(p) => (p.$active ? p.$bgColor : 'transparent')};
  color: ${(p) => (p.$active ? '#ffffff' : colors.textSecondary)};
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease, border-color 0.12s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const NotesInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border-radius: ${borderRadius.medium};
  border: 1px solid ${colors.border};
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  outline: none;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:focus {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const WarningMessage = styled(InfoMessage)`
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #b45309;

  i {
    color: #f59e0b;
  }
`;

const SessionTab = styled(Tab)`
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    background: ${colors.cardBackground};
    border-color: ${colors.border};
    color: ${colors.textMuted};
    box-shadow: none;
  }

  &:hover:disabled {
    background: ${colors.cardBackground};
    transform: none;
    border-color: ${colors.border};
  }
`;

const AttendanceTracker = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classData, setClassData] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeSession, setActiveSession] = useState('morning');
  const [attendanceData, setAttendanceData] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});

  const isToday = useMemo(() => selectedDate === new Date().toISOString().split('T')[0], [selectedDate]);
  const isAfternoonNow = useMemo(() => new Date().getHours() >= 12, []);
  const canTakeAfternoon = useMemo(() => !isToday || isAfternoonNow, [isAfternoonNow, isToday]);

  const statusConfig = useMemo(
    () => ({
      present: { color: colors.success, bgColor: 'rgba(16, 185, 129, 0.9)', label: 'Present' },
      absent: { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.9)', label: 'Absent' },
      late: { color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.92)', label: 'Late' },
      excused: { color: colors.accentPurple, bgColor: 'rgba(139, 92, 246, 0.9)', label: 'Excused' },
    }),
    []
  );

  const fetchAttendanceContext = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/classes/${classId}/attendance-context`);
      if (response.data?.success) {
        const payload = response.data.data || {};
        const list = payload.students || [];
        const availableSubjects = payload.subjects || [];

        setClassData(payload.class || null);
        setStudents(list);
        setSubjects(availableSubjects);
        if (availableSubjects.length > 0) {
          setSelectedSubjectId((prev) => prev || String(availableSubjects[0].id));
        }

        const initial = {};
        list.forEach((student) => {
          initial[student.id] = { status: 'present', notes: '' };
        });
        setAttendanceData(initial);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching attendance context:', error);
      toast.error(error.response?.data?.message || 'Error loading attendance context');
      setStudents([]);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [api, classId]);

  const fetchExistingAttendance = useCallback(async () => {
    try {
      if (!selectedSubjectId) {
        setExistingAttendance({});
        return;
      }

      const response = await api.get(`/api/classes/${classId}/subject-attendance`, {
        params: { date: selectedDate, subject_id: Number(selectedSubjectId), period_label: activeSession },
      });
      const data = response.data?.data || [];

      const existing = {};
      data.forEach((record) => {
        existing[record.student_id] = {
          status: record.status,
          notes: record.notes || '',
          isEditable: true,
        };
      });
      setExistingAttendance(existing);

      setAttendanceData((prev) => {
        const merged = { ...prev };
        Object.keys(existing).forEach((studentId) => {
          merged[studentId] = { status: existing[studentId].status, notes: existing[studentId].notes };
        });
        return merged;
      });
    } catch (error) {
      // No attendance yet; ignore.
    }
  }, [api, classId, selectedDate, selectedSubjectId, activeSession]);

  useEffect(() => {
    fetchAttendanceContext();
  }, [fetchAttendanceContext]);

  useEffect(() => {
    if (students.length > 0 && selectedSubjectId) fetchExistingAttendance();
  }, [activeSession, fetchExistingAttendance, students.length, selectedSubjectId]);

  useEffect(() => {
    if (activeSession === 'afternoon' && !canTakeAfternoon) {
      setActiveSession('morning');
      toast.info('Afternoon attendance is only available in the afternoon for today.');
    }
  }, [activeSession, canTakeAfternoon]);

  const handleStatusChange = (studentId, status) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNotesChange = (studentId, notes) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes,
      },
    }));
  };

  const handleBulkAction = (status) => {
    setAttendanceData((prev) => {
      const next = { ...prev };
      students.forEach((student) => {
        next[student.id] = { ...next[student.id], status };
      });
      return next;
    });
  };

  const saveAttendance = async () => {
    try {
      if (activeSession === 'afternoon' && !canTakeAfternoon) {
        toast.error('You cannot take afternoon attendance before the afternoon session.');
        return;
      }

      setSaving(true);

      const attendanceRecords = students.map((student) => ({
        student_id: student.id,
        status: attendanceData[student.id]?.status || 'present',
        notes: attendanceData[student.id]?.notes || '',
      }));

      if (!selectedSubjectId) {
        toast.error('Please select a subject first.');
        return;
      }

      const response = await api.post(`/api/classes/${classId}/subject-attendance`, {
        date: selectedDate,
        subject_id: Number(selectedSubjectId),
        period_label: activeSession,
        attendance_records: attendanceRecords,
      });

      if (response.status >= 200 && response.status < 300) {
        toast.success(`${activeSession} session attendance saved successfully!`);
        fetchExistingAttendance();
      } else {
        toast.error('Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error(error.response?.data?.message || 'Error saving attendance');
    } finally {
      setSaving(false);
    }
  };

  const getSessionStats = useCallback(() => {
    const stats = { present: 0, absent: 0, late: 0, excused: 0 };
    students.forEach((student) => {
      const status = attendanceData[student.id]?.status || 'present';
      stats[status] += 1;
    });
    return stats;
  }, [attendanceData, students]);

  const getInitials = (firstName, lastName) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const isDateEditable = (date) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    return date === today || date === yesterday;
  };

  const stats = getSessionStats();

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

      <Header>
        <div className="header-info">
          <h1>📝 Attendance Tracker</h1>
          <div className="class-details">
            <div>
              <strong>Class:</strong> {classData?.class_name || '—'}
            </div>
            <div>
              <strong>Subject:</strong>{' '}
              {subjects.find((s) => String(s.id) === String(selectedSubjectId))?.name || '—'}
            </div>
            <div>
              <strong>Date:</strong>{' '}
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        <SecondaryButton onClick={() => navigate('/dashboard')}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </SecondaryButton>
      </Header>

      <Section>
        <ControlsGrid>
          <FormGroup>
            <label>Select Date</label>
            <DateInput
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </FormGroup>

          <FormGroup>
            <label>Subject</label>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
              <option value="">Select subject…</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup>
            <label>Session</label>
            <SessionTabs>
              <div className="tabs">
                <SessionTab $active={activeSession === 'morning'} onClick={() => setActiveSession('morning')} type="button">
                  🌅 Morning
                </SessionTab>
                <SessionTab
                  $active={activeSession === 'afternoon'}
                  onClick={() => setActiveSession('afternoon')}
                  type="button"
                  disabled={!canTakeAfternoon}
                  title={!canTakeAfternoon ? 'Afternoon attendance is only available in the afternoon for today.' : ''}
                >
                  🌞 Afternoon
                </SessionTab>
              </div>
            </SessionTabs>
          </FormGroup>
        </ControlsGrid>
        {!subjects.length && (
          <WarningMessage>
            <i className="fas fa-exclamation-triangle"></i>
            <div>No subject assignment found for this class. Ask admin to assign subject and class.</div>
          </WarningMessage>
        )}
      </Section>

      <Section>
        <SectionTitle>Summary</SectionTitle>
        <StatsGrid>
          <StatCard>
            <div className="stat-icon">✅</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.present}</div>
              <div className="stat-label">Present</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">❌</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.absent}</div>
              <div className="stat-label">Absent</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">⏰</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.late}</div>
              <div className="stat-label">Late</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">🗒️</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.excused}</div>
              <div className="stat-label">Excused</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">👥</div>
            <div className="stat-meta">
              <div className="stat-number">{students.length}</div>
              <div className="stat-label">Total</div>
            </div>
          </StatCard>
        </StatsGrid>
      </Section>

      <Section>
        <SessionTitleRow>
          <SectionTitle>
            {activeSession === 'morning' ? '🌅' : '🌞'} {activeSession.charAt(0).toUpperCase() + activeSession.slice(1)}{' '}
            Session
          </SectionTitle>
          <BulkActions>
            <SecondaryButton onClick={() => handleBulkAction('present')}>
              Mark All Present
            </SecondaryButton>
            <SecondaryButton onClick={() => handleBulkAction('absent')}>
              Mark All Absent
            </SecondaryButton>
          </BulkActions>
        </SessionTitleRow>

        {!isDateEditable(selectedDate) && (
          <WarningMessage>
            <i className="fas fa-exclamation-triangle"></i>
            <div>
              Note: You can only edit attendance for today and yesterday. Older records require administrator approval.
            </div>
          </WarningMessage>
        )}

        <StudentList>
          {students.map((student, index) => {
            const isEditable =
              isDateEditable(selectedDate) && (!existingAttendance[student.id] || existingAttendance[student.id].isEditable);
            const roll = (index + 1).toString().padStart(2, '0');

            return (
              <StudentRow key={student.id}>
                <div className="student-details">
                  <div className="student-avatar">{getInitials(student.first_name, student.last_name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="student-name">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="student-id">
                      Roll #{roll} • ID: {student.student_id}
                    </div>
                  </div>
                </div>

                <StatusButtons>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <StatusButton
                      key={status}
                      type="button"
                      $active={attendanceData[student.id]?.status === status}
                      $borderColor={config.color}
                      $bgColor={config.bgColor}
                      onClick={() => isEditable && handleStatusChange(student.id, status)}
                      disabled={!isEditable}
                    >
                      {config.label}
                    </StatusButton>
                  ))}
                </StatusButtons>

                <NotesInput
                  placeholder="Add notes (optional)…"
                  value={attendanceData[student.id]?.notes || ''}
                  onChange={(e) => isEditable && handleNotesChange(student.id, e.target.value)}
                  disabled={!isEditable}
                />
              </StudentRow>
            );
          })}
        </StudentList>

        {isDateEditable(selectedDate) && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <PrimaryButton onClick={saveAttendance} disabled={saving}>
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  Save {activeSession.charAt(0).toUpperCase() + activeSession.slice(1)} Attendance
                </>
              )}
            </PrimaryButton>
          </div>
        )}
      </Section>
    </Container>
  );
};

export default AttendanceTracker;
