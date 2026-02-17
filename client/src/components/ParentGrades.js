import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import {
  Card,
  colors,
  ErrorMessage,
  LoadingSpinner,
  PageHeader,
  Section,
  SectionTitle,
  StatCard,
  StatsGrid,
  TabContainer,
  Tab,
} from './shared/StyledComponents';
import parentApi from '../services/parentHttp';
import { mediaQuery } from '../hooks/useDevice';
import { FaCheckCircle, FaChartBar, FaFilter, FaInfoCircle, FaListAlt, FaStar } from 'react-icons/fa';

const Header = styled(PageHeader)`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;

  h1 {
    display: block;
    gap: 0;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const NavButton = styled.button`
  border: 1px solid ${colors.border};
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;

  &:hover {
    transform: translateY(-1px);
    background: #f9fafb;
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  }
`;

const FiltersCard = styled(TabContainer)`
  margin-bottom: 18px;

  .tabs {
    margin-bottom: 0;
  }
`;

const FiltersRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  padding: 16px;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr 1fr;
  }

  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
    padding: 14px;
  }
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
  font-weight: 950;
  color: ${colors.textSecondary};
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  select,
  input {
    height: 44px;
    border-radius: 14px;
    border: 1px solid ${colors.border};
    background: rgba(255, 255, 255, 0.92);
    padding: 0 12px;
    font-weight: 850;
    color: ${colors.textPrimary};
    outline: none;
    transition: box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  }

  select:focus,
  input:focus {
    border-color: rgba(59, 130, 246, 0.45);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
`;

const SummaryGrid = styled(StatsGrid)`
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const TableWrap = styled.div`
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid ${colors.border};
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.85));
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 980px;

  ${mediaQuery('mobile')} {
    min-width: 820px;
  }

  th,
  td {
    padding: 12px 14px;
    border-bottom: 1px solid ${colors.borderLight};
    border-right: 1px solid ${colors.borderLight};
    vertical-align: top;
  }

  tr > *:last-child {
    border-right: none;
  }

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    text-align: left;
    color: ${colors.textSecondary};
    font-weight: 950;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    white-space: nowrap;
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(238, 242, 255, 0.98) 100%);
    border-bottom: 1px solid ${colors.border};
    backdrop-filter: blur(10px);
  }

  tbody td {
    color: ${colors.textPrimary};
    font-weight: 650;
    background: rgba(255, 255, 255, 0.6);
    transition: background 0.16s ease;
  }

  tbody tr:nth-child(even) td {
    background: rgba(248, 250, 252, 0.75);
  }

  tbody tr:hover td {
    background: rgba(224, 231, 255, 0.42);
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

const TableCard = styled(Section)`
  padding: 0;
  overflow: hidden;
`;

const TableInner = styled.div`
  padding: 18px;

  ${mediaQuery('mobile')} {
    padding: 14px;
  }
`;

const Pill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 950;
  font-size: 0.92rem;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${(p) => p.$border || 'rgba(148,163,184,0.6)'};
  background: ${(p) => p.$bg || 'rgba(248,250,252,1)'};
  color: ${(p) => p.$color || colors.textPrimary};
  white-space: nowrap;
`;

const Subtle = styled.div`
  color: ${colors.textMuted};
  font-weight: 800;
  font-size: 0.86rem;
  margin-top: 6px;
`;

const formatDate = (s) => {
  if (!s) return '—';
  try {
    const d = new Date(`${String(s).slice(0, 10)}T00:00:00`);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(s).slice(0, 10);
  }
};

const gradeStatusStyle = (g) => {
  if (g?.is_absent) return { icon: '❌', label: 'Absent', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#991b1b' };
  if (g?.is_excused) return { icon: '📝', label: 'Excused', bg: 'rgba(99,102,241,0.14)', border: 'rgba(99,102,241,0.35)', color: '#3730a3' };
  if (g?.marks_obtained === null || g?.marks_obtained === undefined) {
    return { icon: '⏳', label: 'Pending', bg: 'rgba(148,163,184,0.16)', border: 'rgba(148,163,184,0.45)', color: '#334155' };
  }
  return { icon: '✅', label: 'Graded', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#065f46' };
};

const ParentGrades = ({ token, studentName }) => {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('records');

  const [grades, setGrades] = useState([]);
  const [summary, setSummary] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [bestSubject, setBestSubject] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [filters, setFilters] = useState({ academic_year: '2024-2025', term: '', subject_id: '' });

  const query = useMemo(() => {
    const q = {};
    if (filters.academic_year) q.academic_year = filters.academic_year;
    if (filters.term) q.term = filters.term;
    if (filters.subject_id) q.subject_id = filters.subject_id;
    return q;
  }, [filters]);

  const fetchGrades = useCallback(async () => {
    try {
      if (!token) return;
      setLoadError('');
      setLoading(true);
      const res = await parentApi.get('/api/parent/grades', { params: query });
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to load grades');
      }

      const data = res.data?.data || {};
      setGrades(data.grades || []);
      setSummary(data.summary || null);
      setSubjects(data.subjects || []);
      setBestSubject(data.best_subject || null);
      setLastUpdated(new Date());
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to load grades';
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [query, token]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  useEffect(() => {
    const onFocus = () => fetchGrades();
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(fetchGrades, 30_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [fetchGrades]);

  const summaryCards = useMemo(() => {
    const s = summary || {};
    const best = bestSubject?.subject_name ? `${bestSubject.subject_name} (${bestSubject.average_percentage}%)` : '—';
    return [
      { icon: <FaChartBar />, number: s.average_percentage !== undefined ? `${s.average_percentage || 0}%` : '—', label: 'Average Score', sub: 'Across published assessments' },
      { icon: <FaStar />, number: s.overall_grade || '—', label: 'Overall Grade', sub: 'Based on average' },
      { icon: <FaListAlt />, number: `${s.graded_assessments || 0}/${s.total_assessments || 0}`, label: 'Completed', sub: 'Graded assessments' },
      { icon: <FaCheckCircle />, number: best, label: 'Best Subject', sub: 'Highest average subject' },
    ];
  }, [bestSubject, summary]);

  return (
    <>
      <Header>
        <div>
          <h1>
            <FaChartBar /> Grades for {studentName}
          </h1>
          <p style={{ marginBottom: 0 }}>
            A full record of published assessment results for <strong>{studentName}</strong>.
          </p>
          <Subtle>{lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</Subtle>
        </div>
        <HeaderRight>
          <NavButton type="button" onClick={fetchGrades}>
            <FaFilter /> Refresh
          </NavButton>
        </HeaderRight>
      </Header>

      {loadError ? (
        <ErrorMessage>
          <FaInfoCircle />
          <span>{loadError}</span>
        </ErrorMessage>
      ) : null}

      {loading ? (
        <LoadingSpinner>
          <div>
            <div className="spinner" />
            <p>Loading grades…</p>
          </div>
        </LoadingSpinner>
      ) : null}

      <Section>
        <SectionTitle>
          <i className="fas fa-gem" /> Quick Summary
        </SectionTitle>
        <SummaryGrid>
          {summaryCards.map((c, idx) => (
            <StatCard key={idx}>
              <div className="stat-icon">{c.icon}</div>
              <div className="stat-meta">
                <div className="stat-number">{c.number}</div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-sublabel">{c.sub}</div>
              </div>
            </StatCard>
          ))}
        </SummaryGrid>
      </Section>

      <FiltersCard>
        <div className="tabs">
          <Tab $active={tab === 'records'} onClick={() => setTab('records')}>
            Records
          </Tab>
          <Tab $active={tab === 'subjects'} onClick={() => setTab('subjects')}>
            Subjects
          </Tab>
        </div>

        <FiltersRow>
          <Field>
            Academic year
            <input
              value={filters.academic_year}
              onChange={(e) => setFilters((p) => ({ ...p, academic_year: e.target.value }))}
              placeholder="2024-2025"
              inputMode="text"
            />
          </Field>
          <Field>
            Term
            <select value={filters.term} onChange={(e) => setFilters((p) => ({ ...p, term: e.target.value }))}>
              <option value="">All terms</option>
              <option value="term1">Term 1</option>
              <option value="term2">Term 2</option>
              <option value="term3">Term 3</option>
              <option value="annual">Annual</option>
            </select>
          </Field>
          <Field>
            Subject
            <select value={filters.subject_id} onChange={(e) => setFilters((p) => ({ ...p, subject_id: e.target.value }))}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.subject_name}
                </option>
              ))}
            </select>
          </Field>
        </FiltersRow>
      </FiltersCard>

      {tab === 'subjects' ? (
        <TableCard>
          <TableInner>
            <SectionTitle>
              <i className="fas fa-book" /> Subject averages
            </SectionTitle>

            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Assessments</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ color: colors.textSecondary, fontWeight: 700 }}>
                        No published grades yet.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((s) => (
                      <tr key={s.subject_id}>
                        <td>
                          <div style={{ fontWeight: 950 }}>{s.subject_name}</div>
                          <div style={{ color: colors.textMuted, fontWeight: 800, marginTop: 4 }}>{s.subject_code || ''}</div>
                        </td>
                        <td>{s.assessments}</td>
                        <td>
                          <Pill $bg="rgba(59,130,246,0.12)" $border="rgba(59,130,246,0.35)" $color="#1e3a8a">
                            ⭐ {s.average_percentage}%
                          </Pill>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </TableInner>
        </TableCard>
      ) : (
        <TableCard>
          <TableInner>
            <SectionTitle>
              <i className="fas fa-table" /> Full grade record
            </SectionTitle>

            <div style={{ color: colors.textSecondary, fontWeight: 650, lineHeight: 1.7, marginBottom: 12 }}>
              Tip: this page updates automatically—use filters to focus by term or subject.
            </div>

            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subject</th>
                    <th>Assessment</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>%</th>
                    <th>Grade</th>
                    <th>Status</th>
                    <th>Recorded by</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ color: colors.textSecondary, fontWeight: 700 }}>
                        No published grades yet.
                      </td>
                    </tr>
                  ) : (
                    grades.map((g) => {
                      const st = gradeStatusStyle(g);
                      const score =
                        g.marks_obtained !== null && g.marks_obtained !== undefined ? `${g.marks_obtained}/${g.total_marks}` : '—';
                      return (
                        <tr key={g.grade_id || `${g.assessment_id}-${g.subject_id}`}>
                          <td>{formatDate(g.assessment_date)}</td>
                          <td>
                            <div style={{ fontWeight: 950 }}>{g.subject_name}</div>
                            <div style={{ color: colors.textMuted, fontWeight: 800, marginTop: 4 }}>{g.class_name || ''}</div>
                          </td>
                          <td style={{ fontWeight: 900 }}>{g.assessment_title}</td>
                          <td style={{ textTransform: 'capitalize' }}>{String(g.assessment_type || '').replace(/_/g, ' ')}</td>
                          <td>{score}</td>
                          <td>{g.percentage !== null && g.percentage !== undefined ? `${g.percentage}%` : '—'}</td>
                          <td>
                            {g.letter_grade ? (
                              <Pill $bg="rgba(99,102,241,0.14)" $border="rgba(99,102,241,0.35)" $color="#3730a3">
                                {g.letter_grade}
                              </Pill>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            <Pill $bg={st.bg} $border={st.border} $color={st.color}>
                              {st.icon} {st.label}
                            </Pill>
                          </td>
                          <td>{g.graded_by_name || '—'}</td>
                          <td style={{ maxWidth: 240 }}>{g.remarks || '—'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </TableWrap>
          </TableInner>
        </TableCard>
      )}

      {!loading && !loadError && summary?.total_assessments === 0 ? (
        <Card style={{ marginTop: 14, padding: 16, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontSize: 22 }}>💡</div>
            <div style={{ color: colors.textSecondary, fontWeight: 650, lineHeight: 1.7 }}>
              Grades appear here after teachers publish assessments and record results.
            </div>
          </div>
        </Card>
      ) : null}
    </>
  );
};

export default ParentGrades;
