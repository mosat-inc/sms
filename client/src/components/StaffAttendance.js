import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaClock, FaDoorOpen, FaDoorClosed, FaSyncAlt, FaUserCheck } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  Card,
  PageContainer,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  Section,
  SectionTitle,
  StatsGrid,
  StatCard,
  colors,
  borderRadius,
  shadows,
} from './shared/StyledComponents';

const Wrapper = styled(PageContainer)`
  padding: 20px;
  ${mediaQuery('tablet')} {
    padding: 16px;
  }
  ${mediaQuery('mobile')} {
    padding: 12px;
  }
`;

const Hero = styled(Card)`
  padding: 18px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(99, 102, 241, 0.22);
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.12), rgba(99, 102, 241, 0.1), rgba(255, 255, 255, 0.88));
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
`;

const ActionsRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 12px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.9);
`;

const StatusPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  font-weight: 950;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: ${(p) =>
    p.$status === 'present'
      ? 'rgba(34, 197, 94, 0.14)'
      : p.$status === 'late'
        ? 'rgba(250, 204, 21, 0.18)'
        : 'rgba(239, 68, 68, 0.14)'};
  color: ${colors.textPrimary};
`;

const SessionCard = styled(Card)`
  padding: 16px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${shadows.card};
  display: grid;
  gap: 10px;
`;

const formatDateLong = (d) =>
  new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const fmtTime = (value) => {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return String(value);
  }
};

const StaffAttendance = () => {
  const { api, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const morningDeadline = process.env.REACT_APP_STAFF_MORNING_DEADLINE || '08:00';
  const afternoonDeadline = process.env.REACT_APP_STAFF_AFTERNOON_DEADLINE || '15:00';

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/staff-attendance/me', { params: { date: today } });
      setRows(res.data?.data || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load staff attendance.');
    } finally {
      setLoading(false);
    }
  }, [api, today]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const checkIn = async (session) => {
    try {
      await api.post('/api/staff-attendance/check-in', { session });
      toast.success(`Check-in recorded (${session}).`);
      await fetchMe();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Check-in failed.');
    }
  };

  const checkOut = async (session) => {
    try {
      await api.post('/api/staff-attendance/check-out', { session });
      toast.success(`Check-out recorded (${session}).`);
      await fetchMe();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Check-out failed.');
    }
  };

  const bySession = useMemo(() => {
    const map = new Map(rows.map((r) => [r.session, r]));
    return {
      morning: map.get('morning') || null,
      afternoon: map.get('afternoon') || null,
    };
  }, [rows]);

  return (
    <Wrapper>
      <PageHeader>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FaUserCheck /> Staff Attendance
        </h1>
        <p style={{ color: colors.textSecondary, fontWeight: 800, lineHeight: 1.6 }}>
          Record your daily presence. School policy deadlines: Morning by <strong>{morningDeadline}</strong>, Afternoon by{' '}
          <strong>{afternoonDeadline}</strong>. (Admins can override when necessary.)
        </p>
      </PageHeader>

      <Hero>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6, minWidth: 240 }}>
            <div style={{ fontWeight: 950, color: colors.textPrimary, fontSize: '1.1rem' }}>
              Today: {formatDateLong(today)}
            </div>
            <div style={{ color: colors.textSecondary, fontWeight: 850 }}>
              Staff: <strong>{user?.first_name || '—'} {user?.last_name || ''}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge>
              <FaClock /> Deadlines: {morningDeadline} / {afternoonDeadline}
            </Badge>
            <SecondaryButton onClick={fetchMe} disabled={loading} style={{ borderRadius: 999 }}>
              <FaSyncAlt /> Refresh
            </SecondaryButton>
          </div>
        </div>

        <ActionsRow>
          <PrimaryButton onClick={() => checkIn('morning')} style={{ borderRadius: 999 }}>
            <FaDoorOpen /> Check In (Morning)
          </PrimaryButton>
          <SecondaryButton onClick={() => checkOut('morning')} style={{ borderRadius: 999 }}>
            <FaDoorClosed /> Check Out (Morning)
          </SecondaryButton>

          <PrimaryButton onClick={() => checkIn('afternoon')} style={{ borderRadius: 999 }}>
            <FaDoorOpen /> Check In (Afternoon)
          </PrimaryButton>
          <SecondaryButton onClick={() => checkOut('afternoon')} style={{ borderRadius: 999 }}>
            <FaDoorClosed /> Check Out (Afternoon)
          </SecondaryButton>
        </ActionsRow>
      </Hero>

      <Section>
        <SectionTitle>Today Overview</SectionTitle>
        <StatsGrid>
          <StatCard>
            <div className="stat-icon">🌅</div>
            <div className="stat-meta">
              <div className="stat-number">
                <StatusPill $status={bySession.morning?.status || 'absent'}>
                  {(bySession.morning?.status || 'not recorded').toUpperCase()}
                </StatusPill>
              </div>
              <div className="stat-label">Morning Status</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">🌇</div>
            <div className="stat-meta">
              <div className="stat-number">
                <StatusPill $status={bySession.afternoon?.status || 'absent'}>
                  {(bySession.afternoon?.status || 'not recorded').toUpperCase()}
                </StatusPill>
              </div>
              <div className="stat-label">Afternoon Status</div>
            </div>
          </StatCard>
        </StatsGrid>
      </Section>

      <Section>
        <SectionTitle>Details</SectionTitle>
        <div style={{ display: 'grid', gap: 12 }}>
          <SessionCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 950 }}>Morning</div>
              <StatusPill $status={bySession.morning?.status || 'absent'}>
                {(bySession.morning?.status || 'not recorded').toUpperCase()}
              </StatusPill>
            </div>
            <div style={{ display: 'grid', gap: 6, color: colors.textSecondary, fontWeight: 850 }}>
              <div>
                <strong>Check-in:</strong> {fmtTime(bySession.morning?.check_in_at)}
              </div>
              <div>
                <strong>Check-out:</strong> {fmtTime(bySession.morning?.check_out_at)}
              </div>
              <div>
                <strong>Notes:</strong> {bySession.morning?.notes || '—'}
              </div>
            </div>
          </SessionCard>

          <SessionCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 950 }}>Afternoon</div>
              <StatusPill $status={bySession.afternoon?.status || 'absent'}>
                {(bySession.afternoon?.status || 'not recorded').toUpperCase()}
              </StatusPill>
            </div>
            <div style={{ display: 'grid', gap: 6, color: colors.textSecondary, fontWeight: 850 }}>
              <div>
                <strong>Check-in:</strong> {fmtTime(bySession.afternoon?.check_in_at)}
              </div>
              <div>
                <strong>Check-out:</strong> {fmtTime(bySession.afternoon?.check_out_at)}
              </div>
              <div>
                <strong>Notes:</strong> {bySession.afternoon?.notes || '—'}
              </div>
            </div>
          </SessionCard>
        </div>
      </Section>
    </Wrapper>
  );
};

export default StaffAttendance;

