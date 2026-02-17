import React, { useEffect, useMemo, useState } from 'react';
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
  TabContainer,
  Tab,
  StatCard,
  StatsGrid,
} from './shared/StyledComponents';
import parentApi from '../services/parentHttp';
import { mediaQuery } from '../hooks/useDevice';
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaClock, FaInfoCircle } from 'react-icons/fa';

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

const TabsCard = styled(TabContainer)`
  margin-bottom: 18px;

  .tabs {
    margin-bottom: 0;
  }
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

const SummaryGrid = styled(StatsGrid)`
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  font-size: 0.98rem;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${(p) => p.$border || 'rgba(148,163,184,0.6)'};
  background: ${(p) => p.$bg || 'rgba(248,250,252,1)'};
  color: ${(p) => p.$color || colors.textPrimary};
`;

const SubNote = styled.div`
  margin-top: 6px;
  color: ${colors.textMuted};
  font-weight: 800;
  font-size: 0.86rem;
`;

const ProgressWrap = styled.div`
  margin-top: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.25);
  overflow: hidden;
`;

const ProgressBar = styled.div`
  height: 100%;
  width: ${(p) => `${p.$pct || 0}%`};
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.9), rgba(99, 102, 241, 0.9));
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
  min-width: 660px;

  ${mediaQuery('mobile')} {
    min-width: 560px;
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

const WeekHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const WeekLabel = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 950;
  color: ${colors.textPrimary};
`;

const TotalsRow = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${colors.borderLight};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
  color: ${colors.textSecondary};
  font-weight: 800;
`;

const Calendar = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;

  ${mediaQuery('mobile')} {
    gap: 8px;
  }
`;

const CalHead = styled.div`
  font-size: 0.82rem;
  font-weight: 950;
  color: ${colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-left: 2px;
`;

const DayCell = styled.button`
  border: 1px solid ${colors.border};
  background: ${colors.cardBackground};
  border-radius: 16px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  min-height: 92px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
    border-color: rgba(37, 99, 235, 0.35);
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
    transform: none;
    box-shadow: none;
  }
`;

const DayNum = styled.div`
  font-weight: 950;
  color: ${colors.textPrimary};
  margin-bottom: 8px;
`;

const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const TinyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 999px;
  font-weight: 900;
  font-size: 0.82rem;
  background: ${(p) => p.$bg || 'rgba(248,250,252,1)'};
  border: 1px solid ${(p) => p.$border || 'rgba(148,163,184,0.6)'};
  color: ${(p) => p.$color || colors.textPrimary};
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  color: ${colors.textSecondary};
  font-weight: 800;
  font-size: 0.92rem;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid ${colors.border};
  background: ${colors.cardBackground};
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: ${(p) => (p.$open ? 'grid' : 'none')};
  place-items: center;
  z-index: 1100;
  padding: 18px;
`;

const Modal = styled(Card)`
  width: 100%;
  max-width: 860px;
  max-height: 85vh;
  overflow: auto;
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
`;

const CloseBtn = styled.button`
  border: 1px solid ${colors.border};
  background: ${colors.cardBackground};
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    background: #f9fafb;
  }
`;

const SESSION_LABEL = {
  morning: 'Morning',
  afternoon: 'Evening',
};

const STATUS_LABEL = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Permission',
};

const statusStyles = (status) => {
  switch (status) {
    case 'present':
      return { icon: '✅', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', color: '#065f46' };
    case 'absent':
      return { icon: '❌', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', color: '#991b1b' };
    case 'late':
      return { icon: '⏰', bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.38)', color: '#92400e' };
    case 'excused':
      return { icon: '📝', bg: 'rgba(99,102,241,0.14)', border: 'rgba(99,102,241,0.35)', color: '#3730a3' };
    case 'not_taken':
    default:
      return { icon: '⚠️', bg: 'rgba(148,163,184,0.16)', border: 'rgba(148,163,184,0.45)', color: '#334155' };
  }
};

const toISODate = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseISODate = (s) => new Date(`${s}T00:00:00`);

const formatLong = (s) =>
  parseISODate(s).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const formatTime = (dt) => {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const startOfWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - diff);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const clampMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const clampMonthEnd = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const buildKey = (date, session) => `${date}__${session}`;

const computeStats = (records, expectedSessions) => {
  const counts = { present: 0, absent: 0, late: 0, excused: 0, not_taken: 0 };
  for (const r of records) {
    if (r.status && counts[r.status] !== undefined) counts[r.status] += 1;
  }
  const taken = records.length;
  counts.not_taken = Math.max(0, expectedSessions - taken);
  const pct = taken > 0 ? Math.round((counts.present / taken) * 100) : null;
  return { counts, taken, pct };
};

const ParentAttendance = ({ token, studentName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('today'); // today | week | month
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => clampMonthStart(new Date()));

  const [todayRecords, setTodayRecords] = useState([]);
  const [weekRecords, setWeekRecords] = useState([]);
  const [monthRecords, setMonthRecords] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDate, setDetailDate] = useState(null); // ISO date

  const weekStartISO = useMemo(() => toISODate(weekStart), [weekStart]);
  const weekEndISO = useMemo(() => toISODate(addDays(weekStart, 6)), [weekStart]);
  const monthStartISO = useMemo(() => toISODate(clampMonthStart(monthCursor)), [monthCursor]);
  const monthEndISO = useMemo(() => toISODate(clampMonthEnd(monthCursor)), [monthCursor]);

  const fetchRange = async (start, end) => {
    const res = await parentApi.get('/api/parent/attendance/range', { params: { start, end } });
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load attendance');
    return res.data.data?.records || [];
  };

  const refreshAll = useMemo(() => {
    return async ({ silent = false } = {}) => {
      if (!token) return;
      try {
        if (!silent) setLoading(true);
        setError('');
        const [today, week, month] = await Promise.all([
          fetchRange(todayISO, todayISO),
          fetchRange(weekStartISO, weekEndISO),
          fetchRange(monthStartISO, monthEndISO),
        ]);
        setTodayRecords(today);
        setWeekRecords(week);
        setMonthRecords(month);
        setLastUpdatedAt(new Date().toISOString());
      } catch (e) {
        const msg = e?.message || 'Failed to load attendance';
        setError(msg);
        if (!silent) toast.error(msg);
      } finally {
        if (!silent) setLoading(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, todayISO, weekStartISO, weekEndISO, monthStartISO, monthEndISO]);

  useEffect(() => {
    if (!token) return;
    refreshAll();
  }, [refreshAll, token]);

  useEffect(() => {
    if (!token) return;
    const onFocus = () => refreshAll({ silent: true });
    window.addEventListener('focus', onFocus);
    const interval = setInterval(() => refreshAll({ silent: true }), 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [refreshAll, token]);

  const byKeyToday = useMemo(() => {
    const m = new Map();
    for (const r of todayRecords) m.set(buildKey(r.date, r.session), r);
    return m;
  }, [todayRecords]);

  const byDateWeek = useMemo(() => {
    const m = new Map(); // date -> {morning?, afternoon?}
    for (const r of weekRecords) {
      const cur = m.get(r.date) || {};
      cur[r.session] = r;
      m.set(r.date, cur);
    }
    return m;
  }, [weekRecords]);

  const byDateMonth = useMemo(() => {
    const m = new Map();
    for (const r of monthRecords) {
      const cur = m.get(r.date) || {};
      cur[r.session] = r;
      m.set(r.date, cur);
    }
    return m;
  }, [monthRecords]);

  const weekStats = useMemo(() => computeStats(weekRecords, 14), [weekRecords]);
  const monthExpected = useMemo(() => clampMonthEnd(monthCursor).getDate() * 2, [monthCursor]);
  const monthStats = useMemo(() => computeStats(monthRecords, monthExpected), [monthRecords, monthExpected]);

  const todayMorning = byKeyToday.get(buildKey(todayISO, 'morning'));
  const todayEvening = byKeyToday.get(buildKey(todayISO, 'afternoon'));

  const recordedByLabel = (record) => {
    const name = record?.recorded_by_name?.trim();
    if (name) return name;
    if (record?.marked_by) return `User #${record.marked_by}`;
    return '—';
  };

  const renderStatus = (record) => {
    const status = record?.status || 'not_taken';
    const label = STATUS_LABEL[status] || 'Not taken';
    const s = statusStyles(status === 'excused' ? 'excused' : status);
    const icon = s.icon;
    return (
      <StatusPill $bg={s.bg} $border={s.border} $color={s.color}>
        <span>{icon}</span>
        <span>{record ? label : 'Not taken'}</span>
      </StatusPill>
    );
  };

  const openDay = (iso) => {
    setDetailDate(iso);
    setDetailOpen(true);
  };

  const detail = useMemo(() => {
    if (!detailDate) return null;
    const inWeek = byDateWeek.get(detailDate);
    const inMonth = byDateMonth.get(detailDate);
    const rec = inWeek || inMonth || {};
    return {
      date: detailDate,
      morning: rec.morning || null,
      evening: rec.afternoon || null,
    };
  }, [byDateMonth, byDateWeek, detailDate]);

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) days.push(toISODate(addDays(weekStart, i)));
    return days;
  }, [weekStart]);

  const calendarDays = useMemo(() => {
    const first = clampMonthStart(monthCursor);
    const startGrid = startOfWeekMonday(first);
    const last = clampMonthEnd(monthCursor);
    const endGrid = addDays(startOfWeekMonday(last), 6);
    const days = [];
    for (let d = startGrid; d <= endGrid; d = addDays(d, 1)) {
      days.push(toISODate(d));
    }
    return days;
  }, [monthCursor]);

  const monthTitle = useMemo(() => {
    return monthCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [monthCursor]);

  return (
    <>
      <Header>
        <div>
          <h1>Attendance for {studentName}</h1>
          <p>Track attendance clearly for morning and evening sessions.</p>
          {lastUpdatedAt ? (
            <p style={{ marginTop: 8, color: colors.textSecondary, fontWeight: 750 }}>
              Last updated: {new Date(lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          ) : null}
        </div>

        <HeaderRight>
          <NavButton type="button" onClick={() => refreshAll()}>
            Refresh
          </NavButton>
          <NavButton type="button" onClick={() => setWeekStart(startOfWeekMonday(new Date()))}>
            <FaCalendarAlt />
            This Week
          </NavButton>
          <NavButton type="button" onClick={() => setMonthCursor(clampMonthStart(new Date()))}>
            <FaCalendarAlt />
            This Month
          </NavButton>
        </HeaderRight>
      </Header>

      <TabsCard>
        <div className="tabs">
          <Tab $active={view === 'today'} onClick={() => setView('today')} type="button">
            Today
          </Tab>
          <Tab $active={view === 'week'} onClick={() => setView('week')} type="button">
            Weekly
          </Tab>
          <Tab $active={view === 'month'} onClick={() => setView('month')} type="button">
            Monthly
          </Tab>
        </div>
      </TabsCard>

      {error ? (
        <ErrorMessage>
          <FaInfoCircle />
          <span>{error}</span>
        </ErrorMessage>
      ) : null}

      {loading ? (
        <LoadingSpinner>
          <div>
            <div className="spinner" />
            <p>Loading attendance…</p>
          </div>
        </LoadingSpinner>
      ) : (
        <>
          <Section>
            <SectionTitle>Summary</SectionTitle>
            <SummaryGrid>
              <StatCard>
                <div className="stat-icon">🌅</div>
                <div className="stat-meta">
                  <div className="stat-number">{todayMorning ? STATUS_LABEL[todayMorning.status] : 'Not taken'}</div>
                  <div className="stat-label">Today (Morning)</div>
                  <div className="stat-sublabel">{renderStatus(todayMorning)}</div>
                  <SubNote>
                    {todayMorning ? `Time: ${formatTime(todayMorning.marked_at)}` : 'Not taken yet'}
                  </SubNote>
                </div>
              </StatCard>

              <StatCard>
                <div className="stat-icon">🌙</div>
                <div className="stat-meta">
                  <div className="stat-number">{todayEvening ? STATUS_LABEL[todayEvening.status] : 'Not taken'}</div>
                  <div className="stat-label">Today (Evening)</div>
                  <div className="stat-sublabel">{renderStatus(todayEvening)}</div>
                  <SubNote>
                    {todayEvening ? `Time: ${formatTime(todayEvening.marked_at)}` : 'Not taken yet'}
                  </SubNote>
                </div>
              </StatCard>

              <StatCard>
                <div className="stat-icon">📅</div>
                <div className="stat-meta">
                  <div className="stat-number">{weekStats.pct == null ? '—' : `${weekStats.pct}%`}</div>
                  <div className="stat-label">This Week %</div>
                  <div className="stat-sublabel">Computed from submitted sessions</div>
                  <ProgressWrap>
                    <ProgressBar $pct={weekStats.pct || 0} />
                  </ProgressWrap>
                </div>
              </StatCard>

              <StatCard>
                <div className="stat-icon">🗓️</div>
                <div className="stat-meta">
                  <div className="stat-number">{monthStats.pct == null ? '—' : `${monthStats.pct}%`}</div>
                  <div className="stat-label">This Month %</div>
                  <div className="stat-sublabel">Computed from submitted sessions</div>
                  <ProgressWrap>
                    <ProgressBar $pct={monthStats.pct || 0} />
                  </ProgressWrap>
                </div>
              </StatCard>

              <StatCard>
                <div className="stat-icon">
                  <FaClock />
                </div>
                <div className="stat-meta">
                  <div className="stat-number">{monthStats.counts.late}</div>
                  <div className="stat-label">Late count (Month)</div>
                  <div className="stat-sublabel">Status: Late</div>
                </div>
              </StatCard>

              <StatCard>
                <div className="stat-icon">📝</div>
                <div className="stat-meta">
                  <div className="stat-number">{monthStats.counts.excused}</div>
                  <div className="stat-label">Permission count (Month)</div>
                  <div className="stat-sublabel">Status: Permission</div>
                </div>
              </StatCard>
            </SummaryGrid>
          </Section>

          {view === 'today' ? (
            <TableCard>
              <TableInner>
                <SectionTitle style={{ marginBottom: 12 }}>Today Attendance (Morning + Evening)</SectionTitle>
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th style={{ width: 180 }}>Date</th>
                        <th>Session</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Recorded By</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{formatLong(todayISO)}</td>
                        <td>{SESSION_LABEL.morning}</td>
                        <td>{renderStatus(todayMorning)}</td>
                        <td>{todayMorning ? formatTime(todayMorning.marked_at) : '—'}</td>
                        <td>{recordedByLabel(todayMorning)}</td>
                        <td>{todayMorning?.notes || (todayMorning ? '—' : 'Attendance not submitted yet')}</td>
                      </tr>
                      <tr>
                        <td>{formatLong(todayISO)}</td>
                        <td>{SESSION_LABEL.afternoon}</td>
                        <td>{renderStatus(todayEvening)}</td>
                        <td>{todayEvening ? formatTime(todayEvening.marked_at) : '—'}</td>
                        <td>{recordedByLabel(todayEvening)}</td>
                        <td>{todayEvening?.notes || (todayEvening ? '—' : 'Attendance not submitted yet')}</td>
                      </tr>
                    </tbody>
                  </Table>
                </TableWrap>
              </TableInner>
            </TableCard>
          ) : null}

          {view === 'week' ? (
            <TableCard>
              <TableInner>
                <WeekHeader>
                  <SectionTitle style={{ marginBottom: 0 }}>Weekly Attendance (Mon–Sun)</SectionTitle>
                  <HeaderRight>
                    <NavButton type="button" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                      <FaArrowLeft />
                      Prev
                    </NavButton>
                    <WeekLabel>
                      <FaCalendarAlt />
                      {weekStartISO} → {weekEndISO}
                    </WeekLabel>
                    <NavButton type="button" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                      Next
                      <FaArrowRight />
                    </NavButton>
                  </HeaderRight>
                </WeekHeader>

                <TableWrap>
                  <Table style={{ minWidth: 640 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 220 }}>Day</th>
                        <th>Morning</th>
                        <th>Evening</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekDays.map((iso) => {
                        const rec = byDateWeek.get(iso) || {};
                        const m = rec.morning || null;
                        const e = rec.afternoon || null;
                        return (
                          <tr key={iso} style={{ cursor: 'pointer' }} onClick={() => openDay(iso)}>
                            <td>{formatLong(iso)}</td>
                            <td>{renderStatus(m)}</td>
                            <td>{renderStatus(e)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </TableWrap>

                <TotalsRow>
                  <div>Present: {weekStats.counts.present}</div>
                  <div>Absent: {weekStats.counts.absent}</div>
                  <div>Late: {weekStats.counts.late}</div>
                  <div>Permission: {weekStats.counts.excused}</div>
                  <div>Not taken: {weekStats.counts.not_taken}</div>
                  <div>Week attendance %: {weekStats.pct == null ? '—' : `${weekStats.pct}%`}</div>
                </TotalsRow>
              </TableInner>
            </TableCard>
          ) : null}

          {view === 'month' ? (
            <TableCard>
              <TableInner>
                <WeekHeader>
                  <SectionTitle style={{ marginBottom: 0 }}>Monthly Attendance (Calendar)</SectionTitle>
                  <HeaderRight>
                    <NavButton type="button" onClick={() => setMonthCursor(clampMonthStart(addDays(monthCursor, -1)))}>
                      <FaArrowLeft />
                      Prev
                    </NavButton>
                    <WeekLabel>
                      <FaCalendarAlt />
                      {monthTitle}
                    </WeekLabel>
                    <NavButton type="button" onClick={() => setMonthCursor(clampMonthStart(addDays(clampMonthEnd(monthCursor), 1)))}>
                      Next
                      <FaArrowRight />
                    </NavButton>
                  </HeaderRight>
                </WeekHeader>

                <TotalsRow>
                  <div>Attendance %: {monthStats.pct == null ? '—' : `${monthStats.pct}%`}</div>
                  <div>Present: {monthStats.counts.present}</div>
                  <div>Absent: {monthStats.counts.absent}</div>
                  <div>Late: {monthStats.counts.late}</div>
                  <div>Permission: {monthStats.counts.excused}</div>
                  <div>Not taken: {monthStats.counts.not_taken}</div>
                </TotalsRow>

                <div style={{ height: 14 }} />

                <Calendar>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <CalHead key={d}>{d}</CalHead>
                  ))}
                  {calendarDays.map((iso) => {
                    const d = parseISODate(iso);
                    const inMonth = d.getMonth() === monthCursor.getMonth();
                    const rec = byDateMonth.get(iso) || {};
                    const m = rec.morning || null;
                    const e = rec.afternoon || null;
                    const sm = statusStyles(m?.status || 'not_taken');
                    const se = statusStyles(e?.status || 'not_taken');

                    return (
                      <DayCell key={iso} type="button" disabled={!inMonth} onClick={() => openDay(iso)}>
                        <DayNum style={{ opacity: inMonth ? 1 : 0.6 }}>{d.getDate()}</DayNum>
                        <BadgeRow>
                          <TinyBadge $bg={sm.bg} $border={sm.border} $color={sm.color}>
                            <strong>M</strong> {sm.icon}
                          </TinyBadge>
                          <TinyBadge $bg={se.bg} $border={se.border} $color={se.color}>
                            <strong>E</strong> {se.icon}
                          </TinyBadge>
                        </BadgeRow>
                      </DayCell>
                    );
                  })}
                </Calendar>

                <Legend>
                  {(['present', 'absent', 'late', 'excused', 'not_taken']).map((st) => {
                    const s = statusStyles(st);
                    const label = st === 'not_taken' ? 'Not taken' : STATUS_LABEL[st];
                    return (
                      <LegendItem key={st}>
                        <StatusPill $bg={s.bg} $border={s.border} $color={s.color}>
                          {s.icon} {label}
                        </StatusPill>
                      </LegendItem>
                    );
                  })}
                </Legend>
              </TableInner>
            </TableCard>
          ) : null}

          <Section>
            <SectionTitle>Need help?</SectionTitle>
            <div style={{ color: colors.textSecondary, fontWeight: 650, lineHeight: 1.6 }}>
              <div>• ⚠️ Not taken means the teacher has not submitted attendance for that session.</div>
              <div>• 📝 Permission is recorded when the teacher marks an excused absence (with reason if provided).</div>
            </div>
          </Section>
        </>
      )}

      <Overlay $open={detailOpen} onClick={() => setDetailOpen(false)}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <div>
              <div style={{ fontWeight: 950, color: colors.textPrimary, fontSize: '1.1rem' }}>
                Attendance Details
              </div>
              <div style={{ color: colors.textSecondary, fontWeight: 750 }}>{detail?.date ? formatLong(detail.date) : ''}</div>
            </div>
            <CloseBtn type="button" onClick={() => setDetailOpen(false)}>
              Close
            </CloseBtn>
          </ModalHeader>

          {detail ? (
            <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th>Session</th>
                        <th>Status</th>
                        <th>Time</th>
                        <th>Recorded By</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{SESSION_LABEL.morning}</td>
                        <td>{renderStatus(detail.morning)}</td>
                        <td>{detail.morning ? formatTime(detail.morning.marked_at) : '—'}</td>
                        <td>{recordedByLabel(detail.morning)}</td>
                        <td>{detail.morning?.notes || (detail.morning ? '—' : 'Attendance not submitted yet')}</td>
                      </tr>
                      <tr>
                        <td>{SESSION_LABEL.afternoon}</td>
                        <td>{renderStatus(detail.evening)}</td>
                        <td>{detail.evening ? formatTime(detail.evening.marked_at) : '—'}</td>
                        <td>{recordedByLabel(detail.evening)}</td>
                        <td>{detail.evening?.notes || (detail.evening ? '—' : 'Attendance not submitted yet')}</td>
                      </tr>
                    </tbody>
                  </Table>
                </TableWrap>
          ) : null}
        </Modal>
      </Overlay>
    </>
  );
};

export default ParentAttendance;
