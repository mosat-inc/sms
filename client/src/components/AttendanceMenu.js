import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  PageContainer,
  PageHeader,
  Section,
  SectionTitle,
  Card,
  PrimaryButton,
  SecondaryButton,
  colors,
  borderRadius,
} from './shared/StyledComponents';

const Layout = styled(PageContainer)`
  padding: 18px;
`;

const Shell = styled.div`
  display: grid;
  grid-template-columns: 290px 1fr;
  gap: 16px;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
  }
`;

const SidePanel = styled(Card)`
  display: grid;
  gap: 14px;
  height: fit-content;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 10px;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr 1fr;
  }

  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const GridTable = styled.div`
  overflow: auto;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.large};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;

  th,
  td {
    border-bottom: 1px solid ${colors.borderLight};
    border-right: 1px solid ${colors.borderLight};
    padding: 10px 12px;
    text-align: center;
  }

  th:first-child,
  td:first-child {
    text-align: left;
    position: sticky;
    left: 0;
    background: #f8fafc;
    z-index: 1;
    min-width: 220px;
  }

  thead th {
    background: #e2e8f0;
    color: ${colors.textPrimary};
    font-weight: 800;
  }

  tbody td {
    background: #ffffff;
    color: ${colors.textPrimary};
    font-weight: 700;
  }
`;

const PerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr 1fr;
  }
`;

const Stat = styled(Card)`
  padding: 12px;

  .label {
    color: ${colors.textSecondary};
    font-weight: 700;
    font-size: 0.86rem;
  }

  .value {
    font-size: 1.45rem;
    font-weight: 900;
    color: ${colors.textPrimary};
  }
`;

const Split = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
  }
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 900;
  border: 1px solid ${colors.border};
`;

const statusShort = {
  present: 'P',
  absent: 'A',
  late: 'L',
  excused: 'E',
};

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const AttendanceMenu = () => {
  const navigate = useNavigate();
  const { api, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    const startObj = new Date(now);
    startObj.setDate(startObj.getDate() - 6);
    return {
      classId: '',
      subjectId: '',
      studentName: '',
      startDate: startObj.toISOString().split('T')[0],
      endDate: end,
    };
  });

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/attendance/subject-dashboard', {
        params: {
          classId: filters.classId || undefined,
          subjectId: filters.subjectId || undefined,
          studentName: filters.studentName || undefined,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });
      setDashboard(response.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch attendance dashboard:', error);
      toast.error(error.response?.data?.message || 'Failed to load attendance dashboard');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const classes = dashboard?.options?.classes || [];
  const subjects = dashboard?.options?.subjects || [];
  const dates = dashboard?.table?.dates || [];
  const students = dashboard?.table?.students || [];
  const performance = dashboard?.performance || {};

  const selectedClassLabel = useMemo(() => {
    const found = classes.find((c) => String(c.id) === String(filters.classId));
    return found?.class_name || 'Select class';
  }, [classes, filters.classId]);

  const onTakeAttendance = () => {
    if (!filters.classId) {
      toast.info('Select a class first.');
      return;
    }
    navigate(`/classes/${filters.classId}/attendance`);
  };

  return (
    <Layout>
      <PageHeader>
        <h1>ATTENDANCE</h1>
        <p>
          Role: {dashboard?.scope?.is_admin ? 'Admin' : user?.role || 'Teacher'}
          {dashboard?.scope?.is_leadership ? ' (Leadership)' : ''}
        </p>
      </PageHeader>

      <Shell>
        <SidePanel>
          <SectionTitle>Academic Year</SectionTitle>
          <select>
            <option>2025-2026</option>
            <option>2024-2025</option>
          </select>

          <SectionTitle>Calendar</SectionTitle>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              {new Date(filters.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ color: colors.textSecondary, fontWeight: 700 }}>
              {filters.startDate} to {filters.endDate}
            </div>
          </div>

          <PrimaryButton onClick={onTakeAttendance}>Take Subject Attendance</PrimaryButton>
          <SecondaryButton onClick={fetchDashboard}>Refresh Dashboard</SecondaryButton>
        </SidePanel>

        <div style={{ display: 'grid', gap: 12 }}>
          <Section>
            <SectionTitle>Filters</SectionTitle>
            <FilterGrid>
              <input
                placeholder="Search by student name"
                value={filters.studentName}
                onChange={(e) => setFilters((prev) => ({ ...prev, studentName: e.target.value }))}
              />
              <select
                value={filters.classId}
                onChange={(e) => setFilters((prev) => ({ ...prev, classId: e.target.value, subjectId: '' }))}
              >
                <option value="">All Classes</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.class_name}
                  </option>
                ))}
              </select>
              <select
                value={filters.subjectId}
                onChange={(e) => setFilters((prev) => ({ ...prev, subjectId: e.target.value }))}
              >
                <option value="">All Subjects</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </FilterGrid>
          </Section>

          <Section>
            <SectionTitle>
              Attendance Table {selectedClassLabel !== 'Select class' ? `- ${selectedClassLabel}` : ''}
            </SectionTitle>
            {loading ? (
              <div>Loading attendance...</div>
            ) : (
              <GridTable>
                <Table>
                  <thead>
                    <tr>
                      <th>Students</th>
                      {dates.map((date) => (
                        <th key={date}>{formatDate(date)}</th>
                      ))}
                      <th>Present</th>
                      <th>Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.student_id}>
                        <td>
                          <div style={{ fontWeight: 800 }}>{student.student_name}</div>
                          <div style={{ color: colors.textSecondary, fontSize: '0.8rem' }}>{student.admission_number}</div>
                        </td>
                        {dates.map((date) => {
                          const entry = student.statuses_by_date?.[date];
                          return <td key={`${student.student_id}-${date}`}>{statusShort[entry?.status] || '-'}</td>;
                        })}
                        <td>{student.summary?.present || 0}</td>
                        <td>{student.summary?.absent || 0}</td>
                      </tr>
                    ))}
                    {!students.length && (
                      <tr>
                        <td colSpan={Math.max(dates.length + 3, 4)}>No attendance records for selected filters.</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </GridTable>
            )}
          </Section>

          <Section>
            <SectionTitle>Tracking / Analytics</SectionTitle>
            <PerformanceGrid>
              <Stat>
                <div className="label">Expected/Marked Records</div>
                <div className="value">{performance.total_marks || 0}</div>
              </Stat>
              <Stat>
                <div className="label">Present</div>
                <div className="value">{performance.present || 0}</div>
              </Stat>
              <Stat>
                <div className="label">Absent (Did Not Attend)</div>
                <div className="value">{performance.not_attended || 0}</div>
              </Stat>
              <Stat>
                <div className="label">Attendance Rate</div>
                <div className="value">{performance.attendance_rate || 0}%</div>
              </Stat>
            </PerformanceGrid>

            <Split style={{ marginTop: 12 }}>
              <Card>
                <SectionTitle>Absences by Class</SectionTitle>
                {(dashboard?.absences_by_class || []).map((item) => (
                  <div key={item.class_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{item.class_name}</span>
                    <Pill>{item.absent_count}</Pill>
                  </div>
                ))}
                {!dashboard?.absences_by_class?.length && <div>No class absences in selected period.</div>}
              </Card>

              <Card>
                <SectionTitle>Absences by Subject</SectionTitle>
                {(dashboard?.absences_by_subject || []).map((item) => (
                  <div key={item.subject_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{item.subject_name}</span>
                    <Pill>{item.absent_count}</Pill>
                  </div>
                ))}
                {!dashboard?.absences_by_subject?.length && <div>No subject absences in selected period.</div>}
              </Card>
            </Split>
          </Section>
        </div>
      </Shell>
    </Layout>
  );
};

export default AttendanceMenu;
