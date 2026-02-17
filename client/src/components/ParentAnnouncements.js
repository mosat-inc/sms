import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import {
  Card,
  Section,
  SectionTitle,
  StatsGrid,
  StatCard,
  colors,
  borderRadius,
} from './shared/StyledComponents';
import { useParentNotifications } from '../contexts/ParentNotificationsContext';
import { mediaQuery } from '../hooks/useDevice';
import { FaBullhorn, FaCheckCircle, FaExclamationTriangle, FaSearch, FaSyncAlt } from 'react-icons/fa';

const Wrapper = styled.div`
  display: grid;
  gap: 14px;
`;

const Hero = styled(Card)`
  padding: 18px;
  border-radius: ${borderRadius.large};
  border: 1px solid rgba(129, 140, 248, 0.28);
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.12), rgba(99, 102, 241, 0.1), rgba(255, 255, 255, 0.78));
  box-shadow: 0 20px 46px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    width: 260px;
    height: 260px;
    border-radius: 999px;
    right: -140px;
    top: -140px;
    background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.32), rgba(99, 102, 241, 0));
    pointer-events: none;
  }
`;

const HeroTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
`;

const HeroText = styled.div`
  display: grid;
  gap: 6px;
  min-width: 240px;
  flex: 1;

  .title {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 950;
    color: ${colors.textPrimary};
    letter-spacing: -0.02em;
    font-size: 1.25rem;
  }

  .desc {
    color: ${colors.textSecondary};
    font-weight: 800;
    line-height: 1.6;
    max-width: 680px;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
`;

const Actions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const LeftFilters = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const Chip = styled.button`
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: ${(p) => (p.$active ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(56, 189, 248, 0.16))' : 'rgba(255,255,255,0.82)')};
  color: ${colors.textPrimary};
  font-weight: 950;
  border-radius: 999px;
  padding: 9px 12px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 26px rgba(15, 23, 42, 0.12);
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(167, 139, 250, 0.14));
  }
`;

const Select = styled.select`
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.9);
  color: ${colors.textPrimary};
  font-weight: 950;
  border-radius: 999px;
  padding: 10px 12px;
  outline: none;
  cursor: pointer;
`;

const SearchWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 999px;
  padding: 10px 12px;
  min-width: 260px;
  flex: 0 0 360px;
  max-width: 100%;
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.06);

  ${mediaQuery('mobile')} {
    flex: 1;
    min-width: 0;
  }

  svg {
    color: rgba(15, 23, 42, 0.55);
  }

  input {
    border: none;
    background: transparent;
    outline: none;
    width: 100%;
    font-weight: 850;
    color: ${colors.textPrimary};
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
  background: ${(p) => (p.$unread ? 'rgba(99, 102, 241, 0.06)' : 'rgba(255, 255, 255, 0.9)')};
  position: relative;

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
  background: rgba(255, 255, 255, 0.9);
`;

const PriorityDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${(p) => p.$c || '#64748b'};
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);
`;

const UnreadPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  color: #111827;
  background: rgba(250, 204, 21, 0.22);
  border: 1px solid rgba(250, 204, 21, 0.35);
`;

const Content = styled.div`
  margin-top: 10px;
  color: ${colors.textPrimary};
  font-weight: 700;
  line-height: 1.6;
  white-space: pre-wrap;
`;

const ReadMore = styled.button`
  border: none;
  cursor: pointer;
  font-weight: 950;
  color: ${colors.textPrimary};
  background: transparent;
  padding: 0;
  text-decoration: underline;
  text-decoration-color: rgba(99, 102, 241, 0.5);
  text-underline-offset: 3px;
`;

const ItemFooter = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  color: ${colors.textSecondary};
  font-weight: 800;
  font-size: 0.88rem;

  ${mediaQuery('mobile')} {
    font-size: 0.85rem;
  }
`;

const MarkRead = styled.button`
  border: none;
  cursor: pointer;
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 950;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.98), rgba(59, 130, 246, 0.98));
  color: #fff;
  box-shadow: 0 14px 30px rgba(16, 185, 129, 0.18);
  transition: transform 0.18s ease, box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 38px rgba(59, 130, 246, 0.18);
  }
`;

const formatTimeAgo = (dateString) => {
  if (!dateString) return '—';
  const now = new Date();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const priorityLabel = (priority) =>
  (
    {
      urgent: 'Urgent',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    }[String(priority || '').toLowerCase()] || 'Notice'
  );

const priorityColor = (priority) =>
  (
    {
      urgent: '#ef4444',
      high: '#f97316',
      medium: '#3b82f6',
      low: '#10b981',
    }[String(priority || '').toLowerCase()] || '#64748b'
  );

const ParentAnnouncements = () => {
  const { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead } = useParentNotifications();
  const [mode, setMode] = useState('all'); // all | unread
  const [priority, setPriority] = useState('all'); // all | urgent | high | medium | low
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState({});

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = unreadCount;
    return { total, unread };
  }, [notifications.length, unreadCount]);

  const filtered = useMemo(() => {
    const term = String(q || '').trim().toLowerCase();
    return (notifications || []).filter((n) => {
      if (!n) return false;
      if (mode === 'unread' && n.is_read) return false;
      if (priority !== 'all' && String(n.priority || '').toLowerCase() !== priority) return false;
      if (!term) return true;
      const hay = `${n.title || ''} ${n.content || ''} ${n.author_name || ''} ${n.class_name || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [notifications, mode, priority, q]);

  return (
    <Wrapper>
      <Hero>
        <HeroTop>
          <HeroText>
            <div className="title">
              <FaBullhorn /> Announcements
            </div>
            <div className="desc">
              Luxury, clear, and simple. See important school updates, class notices, and urgent messages in one place.
            </div>
          </HeroText>

          <Actions>
            <ActionButton onClick={refresh} disabled={loading}>
              <FaSyncAlt /> Refresh
            </ActionButton>
            <ActionButton
              onClick={async () => {
                try {
                  await markAllAsRead();
                  toast.success('All announcements marked as read');
                } catch (e) {
                  toast.error('Failed to mark all as read');
                }
              }}
              disabled={loading || !stats.total}
            >
              Mark All Read
            </ActionButton>
          </Actions>
        </HeroTop>

        <FilterRow>
          <LeftFilters>
            <Chip type="button" $active={mode === 'all'} onClick={() => setMode('all')}>
              All
            </Chip>
            <Chip type="button" $active={mode === 'unread'} onClick={() => setMode('unread')}>
              Unread
            </Chip>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </LeftFilters>

          <SearchWrap>
            <FaSearch />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search announcements…"
              aria-label="Search announcements"
            />
          </SearchWrap>
        </FilterRow>
      </Hero>

      <StatsGrid>
        <StatCard>
          <div className="stat-icon">
            <FaBullhorn />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Announcements</div>
          </div>
        </StatCard>
        <StatCard>
          <div className="stat-icon">{stats.unread > 0 ? <FaExclamationTriangle /> : <FaCheckCircle />}</div>
          <div className="stat-content">
            <div className="stat-value">{stats.unread}</div>
            <div className="stat-label">Unread</div>
          </div>
        </StatCard>
      </StatsGrid>

      <Section>
        <SectionTitle>Latest Updates</SectionTitle>
        <Feed>
          {filtered.length ? (
            filtered.map((n) => (
              <Item key={n.id} $unread={!n.is_read}>
                <ItemHeader>
                  <Title>
                    {n.title || 'Announcement'} {!n.is_read ? <UnreadPill>Unread</UnreadPill> : null}
                  </Title>
                  <Badge>
                    <PriorityDot $c={priorityColor(n.priority)} />
                    {priorityLabel(n.priority)} • {n.class_name ? `${n.class_name}` : 'General'}
                  </Badge>
                </ItemHeader>
                <Content>
                  {(() => {
                    const text = String(n.content || '');
                    const isLong = text.length > 360;
                    const open = Boolean(expanded[n.id]);
                    const shown = !isLong || open ? text : `${text.slice(0, 360)}…`;
                    return (
                      <>
                        {shown}
                        {isLong ? (
                          <div style={{ marginTop: 10 }}>
                            <ReadMore type="button" onClick={() => setExpanded((p) => ({ ...p, [n.id]: !open }))}>
                              {open ? 'Show less' : 'Read more'}
                            </ReadMore>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </Content>
                <ItemFooter>
                  <Meta>
                    Posted {formatTimeAgo(n.created_at)} {n.author_name ? `• By ${n.author_name}` : ''}
                  </Meta>
                  {!n.is_read ? (
                    <MarkRead
                      onClick={async () => {
                        try {
                          await markAsRead(n.id);
                          toast.success('Marked as read');
                        } catch (e) {
                          toast.error('Failed to mark as read');
                        }
                      }}
                      disabled={loading}
                    >
                      Mark Read
                    </MarkRead>
                  ) : null}
                </ItemFooter>
              </Item>
            ))
          ) : (
            <Card style={{ padding: 16, borderRadius: borderRadius.large, color: colors.textSecondary, fontWeight: 800 }}>
              {loading ? 'Loading announcements…' : 'No announcements match your filters.'}
            </Card>
          )}
        </Feed>
      </Section>
    </Wrapper>
  );
};

export default ParentAnnouncements;
