import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { FaBell, FaCheckCircle, FaFilter, FaSyncAlt } from 'react-icons/fa';
import parentApi from '../services/parentHttp';
import {
  Card,
  Section,
  SectionTitle,
  StatsGrid,
  StatCard,
  colors,
  borderRadius,
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const Wrapper = styled.div`
  display: grid;
  gap: 14px;
`;

const Hero = styled(Card)`
  padding: 18px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(56, 189, 248, 0.26);
  background: linear-gradient(135deg, rgba(14, 116, 144, 0.12), rgba(99, 102, 241, 0.08), rgba(255, 255, 255, 0.82));
  box-shadow: 0 20px 46px rgba(15, 23, 42, 0.08);
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const Chip = styled.button`
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: ${(p) => (p.$active ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(99, 102, 241, 0.14))' : 'rgba(255,255,255,0.82)')};
  color: ${colors.textPrimary};
  font-weight: 950;
  border-radius: 999px;
  padding: 9px 12px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgba(15, 23, 42, 0.12);
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(167, 139, 250, 0.12));
  }
`;

const ActionButton = styled.button`
  border: none;
  cursor: pointer;
  border-radius: 999px;
  padding: 10px 14px;
  font-weight: 950;
  letter-spacing: 0.02em;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: ${colors.textPrimary};
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
    background: #fff;
  }
`;

const Feed = styled.div`
  display: grid;
  gap: 12px;
`;

const Item = styled(Card)`
  padding: 16px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.06);
  background: ${(p) => (p.$unread ? 'rgba(56, 189, 248, 0.06)' : 'rgba(255, 255, 255, 0.9)')};
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: 0 22px 48px rgba(15, 23, 42, 0.1);
    transform: translateY(-1px);
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
`;

const ItemHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`;

const Title = styled.div`
  font-weight: 950;
  color: ${colors.textPrimary};
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Meta = styled.div`
  color: ${colors.textSecondary};
  font-weight: 800;
  font-size: 0.88rem;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: ${(p) =>
    p.$p === 'urgent'
      ? 'rgba(239, 68, 68, 0.14)'
      : p.$p === 'high'
        ? 'rgba(250, 204, 21, 0.18)'
        : 'rgba(255, 255, 255, 0.9)'};
`;

const Empty = styled(Card)`
  padding: 18px;
  border-radius: ${borderRadius.large};
  border: 1px dashed rgba(15, 23, 42, 0.18);
  background: rgba(255, 255, 255, 0.86);
  color: ${colors.textSecondary};
  font-weight: 850;
  line-height: 1.7;
`;

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const ParentNotifications = ({ studentName }) => {
  const [feed, setFeed] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('all');

  const fetchNow = useCallback(async () => {
    try {
      setLoading(true);
      const [feedRes, countRes] = await Promise.all([
        parentApi.get('/api/parent/notifications', { params: { limit: 80 } }),
        parentApi.get('/api/parent/notifications/unread-count'),
      ]);
      setFeed(feedRes.data?.data || []);
      setUnread(Number(countRes.data?.unread_count || 0));
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNow();
  }, [fetchNow]);

  const markRead = async (id) => {
    try {
      await parentApi.post(`/api/parent/notifications/${id}/mark-read`);
      await fetchNow();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to mark as read.');
    }
  };

  const markAll = async () => {
    try {
      await parentApi.post('/api/parent/notifications/mark-all-read');
      await fetchNow();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to mark all as read.');
    }
  };

  const filtered = useMemo(() => {
    if (type === 'all') return feed;
    return feed.filter((n) => n.type === type);
  }, [feed, type]);

  const totals = useMemo(() => {
    const total = feed.length;
    const unreadCount = feed.filter((n) => !n.is_read).length;
    const urgent = feed.filter((n) => !n.is_read && (n.priority === 'urgent' || n.priority === 'high')).length;
    return { total, unreadCount, urgent };
  }, [feed]);

  return (
    <Wrapper>
      <Hero>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 6, minWidth: 240, flex: 1 }}>
            <div style={{ fontWeight: 950, color: colors.textPrimary, fontSize: '1.2rem', display: 'inline-flex', gap: 10, alignItems: 'center' }}>
              <FaBell /> Notifications
            </div>
            <div style={{ color: colors.textSecondary, fontWeight: 850, lineHeight: 1.6, maxWidth: 720 }}>
              Important private alerts for <strong>{studentName}</strong> (attendance, discipline updates, fee reminders).
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge $p={totals.urgent ? 'high' : 'medium'}>
              Unread: <strong>{unread}</strong>
            </Badge>
            <ActionButton onClick={fetchNow} disabled={loading}>
              <FaSyncAlt /> Refresh
            </ActionButton>
            <ActionButton onClick={markAll} disabled={loading || unread === 0}>
              <FaCheckCircle /> Mark All Read
            </ActionButton>
          </div>
        </div>

        <Controls>
          <ChipRow>
            <FaFilter style={{ color: 'rgba(15,23,42,0.55)' }} />
            {['all', 'attendance', 'fee', 'discipline', 'exam', 'system'].map((t) => (
              <Chip key={t} $active={type === t} onClick={() => setType(t)}>
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </Chip>
            ))}
          </ChipRow>
        </Controls>
      </Hero>

      <Section>
        <SectionTitle>Summary</SectionTitle>
        <StatsGrid>
          <StatCard>
            <div className="stat-icon">📬</div>
            <div className="stat-meta">
              <div className="stat-number">{totals.total}</div>
              <div className="stat-label">Total</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">🔔</div>
            <div className="stat-meta">
              <div className="stat-number">{totals.unreadCount}</div>
              <div className="stat-label">Unread</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">⚠️</div>
            <div className="stat-meta">
              <div className="stat-number">{totals.urgent}</div>
              <div className="stat-label">Urgent Unread</div>
            </div>
          </StatCard>
        </StatsGrid>
      </Section>

      <Section>
        <SectionTitle>Feed</SectionTitle>
        {filtered.length ? (
          <Feed>
            {filtered.map((n) => (
              <Item key={n.id} $unread={!n.is_read} onClick={() => (!n.is_read ? markRead(n.id) : null)}>
                <ItemHeader>
                  <Title>
                    {!n.is_read ? '🟡' : '⚪'} {n.title}
                  </Title>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge $p={n.priority}>{String(n.priority || 'medium').toUpperCase()}</Badge>
                    <Badge>{String(n.type || 'system').toUpperCase()}</Badge>
                    <Meta>{formatDateTime(n.created_at)}</Meta>
                  </div>
                </ItemHeader>
                <div style={{ marginTop: 10, color: colors.textSecondary, fontWeight: 850, lineHeight: 1.7 }}>
                  {n.message}
                </div>
                <div style={{ marginTop: 10, color: colors.textMuted, fontWeight: 850, fontSize: 12 }}>
                  {n.is_read ? 'Read' : 'Click to mark as read'}
                </div>
              </Item>
            ))}
          </Feed>
        ) : (
          <Empty>
            <div style={{ fontWeight: 950, color: colors.textPrimary, marginBottom: 6 }}>No notifications yet.</div>
            <div>
              When the school records attendance, discipline updates, or important fee reminders, they will appear here.
            </div>
          </Empty>
        )}
      </Section>
    </Wrapper>
  );
};

export default ParentNotifications;

