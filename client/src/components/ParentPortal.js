import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import {
  Card,
  PageContainer,
  PageHeader,
  Section,
  SectionTitle,
  StatsGrid,
  StatCard,
  QuickActionsGrid,
  ActionCard,
  LoadingSpinner,
  ErrorMessage,
  borderRadius,
  colors,
} from './shared/StyledComponents';
import { clearParentToken, getParentToken } from '../utils/parentAuth';
import ParentNavigation from './ParentNavigation';
import ParentAttendance from './ParentAttendance';
import ParentGrades from './ParentGrades';
import ParentPayments from './ParentPayments';
import ParentAnnouncements from './ParentAnnouncements';
import ParentNotifications from './ParentNotifications';
import ParentAnnouncementToasts from './ParentAnnouncementToasts';
import { mediaQuery } from '../hooks/useDevice';
import { ParentNotificationsProvider } from '../contexts/ParentNotificationsContext';
import {
  FaBirthdayCake,
  FaBell,
  FaBullhorn,
  FaCalendarAlt,
  FaChartBar,
  FaChalkboardTeacher,
  FaComments,
  FaIdBadge,
  FaInfoCircle,
  FaMoneyBillWave,
  FaUserGraduate,
  FaVenusMars,
} from 'react-icons/fa';
import ParentProfile from './ParentProfile';
import { getParentMustChangePassword } from '../utils/parentAuth';

const Container = styled(PageContainer)`
  padding: 0;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

const Content = styled.div`
  padding: 20px;
  width: 100%;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 14px;
  }
`;

const Placeholder = styled(Section)`
  color: ${colors.textSecondary};
  font-weight: 600;
  line-height: 1.6;
`;

const OverviewHeader = styled(PageHeader)`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;

  .left {
    flex: 1;
    min-width: 260px;
  }

  .right {
    width: 360px;
    max-width: 100%;
  }

  ${mediaQuery('tablet')} {
    .right {
      width: 100%;
    }
  }
`;

const StudentSummary = styled.div`
  border-radius: 16px;
  border: 1px solid rgba(129, 140, 248, 0.38);
  background: rgba(255, 255, 255, 0.75);
  padding: 16px;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 12px;

  .title {
    font-weight: 900;
    color: ${colors.textPrimary};
    font-size: 1.1rem;
    letter-spacing: -0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .k {
    font-size: 12px;
    font-weight: 900;
    color: ${colors.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .v {
    font-weight: 900;
    color: ${colors.textPrimary};
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 240px;
  }
`;

const Showcase = styled.div`
  margin-top: 6px;
`;

const ShowcaseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;

  ${mediaQuery('laptop')} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const ShowcaseTile = styled(Card)`
  padding: 16px;
  border-radius: ${borderRadius.large};
  overflow: hidden;
  position: relative;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 0%, rgba(99, 102, 241, 0.16), rgba(99, 102, 241, 0));
    pointer-events: none;
  }

  .tile-inner {
    position: relative;
    display: grid;
    gap: 8px;
  }

  .tile-illus {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .tile-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.18);
    color: ${colors.primaryBlue};
    font-size: 1.2rem;
    flex: 0 0 auto;
  }

  .tile-doodle {
    height: 46px;
    flex: 1;
    border-radius: 16px;
    background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.12));
    border: 1px dashed rgba(99, 102, 241, 0.28);
    position: relative;
    overflow: hidden;
  }

  .tile-doodle::after {
    content: '';
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 999px;
    right: -60px;
    top: -60px;
    background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.35), rgba(99, 102, 241, 0));
  }

  .tile-title {
    font-weight: 950;
    color: ${colors.textPrimary};
    letter-spacing: 0.1px;
  }

  .tile-desc {
    color: ${colors.textSecondary};
    font-size: 0.95rem;
    line-height: 1.55;
    margin: 0;
  }
`;

const ParentPortal = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => getParentToken(), []);
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [activeMenu, setActiveMenu] = useState('overview');
  const lastPaymentNoticeRef = useRef('');

  useEffect(() => {
    if (!token) {
      navigate('/parent/login');
      return;
    }
    if (getParentMustChangePassword()) {
      navigate('/parent/change-password');
      return;
    }

    const load = async () => {
      try {
        setLoadError('');
        setLoading(true);
        const res = await axios.get('/api/parent/student', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.success) setStudent(res.data.data);
        else setLoadError(res.data?.message || 'Failed to load student');
      } catch (e) {
        const msg = e.response?.data?.message || 'Failed to load student';
        toast.error(msg);
        setLoadError(msg);
        clearParentToken();
        navigate('/parent/login');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const menu = (params.get('menu') || '').trim().toLowerCase();
    const payment = (params.get('payment') || '').trim().toLowerCase();
    const ref = (params.get('ref') || '').trim();
    const tracking = (params.get('tracking') || '').trim();

    if (menu && ['overview', 'attendance', 'grades', 'payments', 'announcements', 'notifications', 'profile', 'feedback'].includes(menu)) {
      setActiveMenu(menu);
    }

    if (payment) {
      setActiveMenu('payments');
      const noticeKey = `${payment}:${ref}:${tracking}`;
      if (noticeKey !== lastPaymentNoticeRef.current) {
        lastPaymentNoticeRef.current = noticeKey;
        if (payment === 'paid') toast.success('Payment confirmed. Thank you!');
        else if (payment === 'failed') toast.error('Payment failed. Please try again.');
        else if (payment === 'cancelled') toast.info('Payment cancelled.');
        else toast.info('Payment status is pending. If you completed payment, it will update shortly.');
      }
    }
  }, [location.search]);

  const logout = () => {
    clearParentToken();
    navigate('/parent/login');
  };

  const studentName = useMemo(() => {
    if (!student) return 'your student';
    return `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'your student';
  }, [student]);

  const notReady = (label) => toast.info(`${label} is coming soon for parents.`);

  return (
    <ParentNotificationsProvider>
      <Container>
        <ParentAnnouncementToasts onOpenAnnouncements={() => setActiveMenu('announcements')} />
        <ParentNavigation
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          studentName={studentName}
          onLogout={logout}
        />

        <Content>
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
              <p>Loading student information…</p>
            </div>
          </LoadingSpinner>
        ) : !student ? (
          <Section>
            <div style={{ color: colors.textSecondary, fontWeight: 600 }}>No student loaded.</div>
          </Section>
        ) : activeMenu === 'overview' ? (
          <>
            <OverviewHeader>
              <div className="left">
                <h1>
                  <FaUserGraduate />
                  Welcome, Parent/Guardian
                </h1>
                <h2>School in the palm of your hand</h2>
                <p>
                  Welcome, Parent/Guardian, to a system that connects you directly with the teacher and the student—so you can
                  clearly understand everything, accurately track the student’s progress, and prevent misinformation or dishonesty.
                  With this system, the school is now in the palm of your hand.
                </p>
                <p style={{ marginBottom: 0 }}>
                  You’re viewing information for <strong>{studentName}</strong>.
                </p>
              </div>

              <div className="right">
                <StudentSummary>
                  <div className="title">{studentName}</div>
                  <div className="row">
                    <div className="k">Class</div>
                    <div className="v">{student.class_name || '—'}</div>
                  </div>
                  <div className="row">
                    <div className="k">Admission</div>
                    <div className="v">{student.admission_number || '—'}</div>
                  </div>
                  <div className="row">
                    <div className="k">Status</div>
                    <div className="v">{student.status || '—'}</div>
                  </div>
                </StudentSummary>
              </div>
            </OverviewHeader>

            <Section>
              <SectionTitle>
                <i className="fas fa-chart-bar" />
                Student Snapshot
              </SectionTitle>

              <StatsGrid>
                <StatCard>
                  <div className="stat-icon">
                    <FaChalkboardTeacher />
                  </div>
                  <div className="stat-meta">
                    <div className="stat-number">{student.class_name || '—'}</div>
                    <div className="stat-label">Class</div>
                    <div className="stat-sublabel">Current class</div>
                  </div>
                </StatCard>

                <StatCard>
                  <div className="stat-icon">
                    <FaInfoCircle />
                  </div>
                  <div className="stat-meta">
                    <div className="stat-number">{student.status || '—'}</div>
                    <div className="stat-label">Status</div>
                    <div className="stat-sublabel">Enrollment status</div>
                  </div>
                </StatCard>

                <StatCard>
                  <div className="stat-icon">
                    <FaIdBadge />
                  </div>
                  <div className="stat-meta">
                    <div className="stat-number">{student.admission_number || '—'}</div>
                    <div className="stat-label">Admission Number</div>
                    <div className="stat-sublabel">Used for parent login</div>
                  </div>
                </StatCard>

                <StatCard>
                  <div className="stat-icon">
                    <FaUserGraduate />
                  </div>
                  <div className="stat-meta">
                    <div className="stat-number">{student.student_id || '—'}</div>
                    <div className="stat-label">Student Number</div>
                    <div className="stat-sublabel">Internal ID</div>
                  </div>
                </StatCard>

                <StatCard>
                  <div className="stat-icon">
                    <FaVenusMars />
                  </div>
                  <div className="stat-meta">
                    <div className="stat-number">{student.gender || '—'}</div>
                    <div className="stat-label">Gender</div>
                    <div className="stat-sublabel">Recorded</div>
                  </div>
                </StatCard>

                <StatCard>
                  <div className="stat-icon">
                    <FaBirthdayCake />
                  </div>
                  <div className="stat-meta">
                    <div className="stat-number">
                      {student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : '—'}
                    </div>
                    <div className="stat-label">Date of Birth</div>
                    <div className="stat-sublabel">Recorded</div>
                  </div>
                </StatCard>
              </StatsGrid>
            </Section>

            <Section>
              <SectionTitle>
                <i className="fas fa-bolt" />
                Quick Actions
              </SectionTitle>

              <QuickActionsGrid>
                <ActionCard onClick={() => setActiveMenu('grades')}>
                  <i>
                    <FaChartBar />
                  </i>
                  <span>View Grades</span>
                </ActionCard>

                <ActionCard onClick={() => setActiveMenu('attendance')}>
                  <i>
                    <FaCalendarAlt />
                  </i>
                  <span>View Attendance</span>
                </ActionCard>

                <ActionCard onClick={() => setActiveMenu('payments')}>
                  <i>
                    <FaMoneyBillWave />
                  </i>
                  <span>Payments</span>
                </ActionCard>

                <ActionCard onClick={() => setActiveMenu('announcements')}>
                  <i>
                    <FaBullhorn />
                  </i>
                  <span>Announcements</span>
                </ActionCard>

                <ActionCard onClick={() => setActiveMenu('notifications')}>
                  <i>
                    <FaBell />
                  </i>
                  <span>Notifications</span>
                </ActionCard>

                <ActionCard onClick={() => setActiveMenu('feedback')}>
                  <i>
                    <FaComments />
                  </i>
                  <span>Parent Feedback</span>
                </ActionCard>
              </QuickActionsGrid>
            </Section>

            <Section>
              <SectionTitle>
                <i className="fas fa-compass" />
                What you can do in the Parent Dashboard
              </SectionTitle>

              <div style={{ color: colors.textSecondary, fontWeight: 650, lineHeight: 1.7, marginBottom: 14 }}>
                This dashboard helps you stay connected to the school and follow <strong>{studentName}</strong> without
                confusion. Use the sections below anytime—everything is private to your student.
              </div>

              <Showcase>
                <ShowcaseGrid>
                  <ShowcaseTile>
                    <div className="tile-inner">
                      <div className="tile-illus">
                        <div className="tile-icon">
                          <FaCalendarAlt />
                        </div>
                        <div className="tile-doodle" aria-hidden="true" />
                      </div>
                      <div className="tile-title">Attendance</div>
                      <p className="tile-desc">See daily attendance status and weekly/monthly summaries.</p>
                    </div>
                  </ShowcaseTile>

                  <ShowcaseTile>
                    <div className="tile-inner">
                      <div className="tile-illus">
                        <div className="tile-icon">
                          <FaChartBar />
                        </div>
                        <div className="tile-doodle" aria-hidden="true" />
                      </div>
                      <div className="tile-title">Grades</div>
                      <p className="tile-desc">Follow assessments, results, and performance trends.</p>
                    </div>
                  </ShowcaseTile>

                  <ShowcaseTile>
                    <div className="tile-inner">
                      <div className="tile-illus">
                        <div className="tile-icon">
                          <FaMoneyBillWave />
                        </div>
                        <div className="tile-doodle" aria-hidden="true" />
                      </div>
                      <div className="tile-title">Payments</div>
                      <p className="tile-desc">View fee status, deadlines, and payment history.</p>
                    </div>
                  </ShowcaseTile>

                  <ShowcaseTile>
                    <div className="tile-inner">
                      <div className="tile-illus">
                        <div className="tile-icon">
                          <FaBullhorn />
                        </div>
                        <div className="tile-doodle" aria-hidden="true" />
                      </div>
                      <div className="tile-title">Announcements</div>
                      <p className="tile-desc">Read school notices and important updates in one place.</p>
                    </div>
                  </ShowcaseTile>

                  <ShowcaseTile>
                    <div className="tile-inner">
                      <div className="tile-illus">
                        <div className="tile-icon">
                          <FaBell />
                        </div>
                        <div className="tile-doodle" aria-hidden="true" />
                      </div>
                      <div className="tile-title">Notifications</div>
                      <p className="tile-desc">Get private alerts for attendance, discipline and finance updates.</p>
                    </div>
                  </ShowcaseTile>

                  <ShowcaseTile>
                    <div className="tile-inner">
                      <div className="tile-illus">
                        <div className="tile-icon">
                          <FaComments />
                        </div>
                        <div className="tile-doodle" aria-hidden="true" />
                      </div>
                      <div className="tile-title">Parent Feedback</div>
                      <p className="tile-desc">Send requests, concerns, or suggestions to the school.</p>
                    </div>
                  </ShowcaseTile>
                </ShowcaseGrid>
              </Showcase>
            </Section>

            <Section>
              <SectionTitle>
                <i className="fas fa-user" />
                Student Profile
              </SectionTitle>

              <div style={{ color: colors.textPrimary, fontWeight: 600, lineHeight: 1.6 }}>
                <div>
                  <strong>Full Name:</strong> {student.first_name} {student.last_name}
                </div>
                <div>
                  <strong>Admission Number:</strong> {student.admission_number || '—'}
                </div>
                <div>
                  <strong>Class:</strong> {student.class_name || '—'}
                </div>
                <div>
                  <strong>Status:</strong> {student.status || '—'}
                </div>
                <div>
                  <strong>Gender:</strong> {student.gender || '—'}
                </div>
                <div>
                  <strong>Date of Birth:</strong> {student.date_of_birth ? String(student.date_of_birth).slice(0, 10) : '—'}
                </div>
              </div>
            </Section>
          </>
        ) : activeMenu === 'attendance' ? (
          <ParentAttendance token={token} studentName={studentName} />
        ) : activeMenu === 'grades' ? (
          <ParentGrades token={token} studentName={studentName} />
        ) : activeMenu === 'payments' ? (
          <ParentPayments />
        ) : activeMenu === 'announcements' ? (
          <ParentAnnouncements />
        ) : activeMenu === 'notifications' ? (
          <ParentNotifications studentName={studentName} />
        ) : activeMenu === 'profile' ? (
          <ParentProfile />
        ) : (
          <Placeholder>
            <SectionTitle>Parent Feedback</SectionTitle>
            <div>Send feedback to the school here (suggestions, concerns, requests).</div>
            <div style={{ marginTop: 8 }}>This section is being implemented.</div>
          </Placeholder>
        )}
        </Content>
      </Container>
    </ParentNotificationsProvider>
  );
};

export default ParentPortal;
