import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import {
  ActionButton,
  borderRadius,
  Card,
  CardGrid,
  colors,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  Section,
  SectionTitle,
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const Container = styled(PageContainer)`
  padding: 20px;

  ${mediaQuery('tablet')} {
    padding: 15px;
  }

  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const Hero = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 0;
  padding: 26px 26px;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.92) 0%, rgba(88, 28, 135, 0.92) 100%);
  color: #fff;
  box-shadow: 0 22px 55px rgba(15, 23, 42, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.14);

  &::before {
    content: '';
    position: absolute;
    width: 520px;
    height: 520px;
    border-radius: 999px;
    right: -220px;
    top: -250px;
    background: radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.75), rgba(99, 102, 241, 0));
    filter: blur(2px);
  }

  &::after {
    content: '';
    position: absolute;
    width: 520px;
    height: 520px;
    border-radius: 999px;
    left: -260px;
    bottom: -260px;
    background: radial-gradient(circle at 60% 40%, rgba(56, 189, 248, 0.55), rgba(56, 189, 248, 0));
  }

  ${mediaQuery('mobile')} {
    padding: 18px 16px;
  }

  .hero-inner {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
  }

  .hero-text h1 {
    margin: 0 0 6px 0;
    font-size: 1.8rem;
    font-family: var(--font-display);
    letter-spacing: 0.2px;
  }

  .hero-text p {
    margin: 0;
    opacity: 0.92;
    max-width: 560px;
    line-height: 1.6;
    font-size: 1.02rem;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(8px);
    font-weight: 800;
    letter-spacing: 0.2px;
    white-space: nowrap;
  }

  ${mediaQuery('tablet')} {
    .hero-inner {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;

const ClassesGrid = styled(CardGrid)`
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));

  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }

  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const SummaryCard = styled(Card)`
  padding: 16px 16px;
  border-radius: 0;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0));
    pointer-events: none;
  }

  .sum-inner {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .sum-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.18);
    color: ${colors.primaryBlue};
    font-size: 1.25rem;
  }

  .sum-number {
    font-size: 1.35rem;
    font-weight: 900;
    color: ${colors.textPrimary};
    line-height: 1.1;
    font-family: var(--font-display);
  }

  .sum-label {
    color: ${colors.textSecondary};
    font-size: 0.92rem;
    margin-top: 2px;
  }
`;

const Showcase = styled.div`
  margin-top: 14px;
`;

const ShowcaseGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
  }
`;

const ShowcaseTile = styled(Card)`
  padding: 16px;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.06);

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
    font-weight: 900;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
    letter-spacing: 0.15px;
  }

  .tile-desc {
    color: ${colors.textSecondary};
    font-size: 0.95rem;
    line-height: 1.55;
    margin: 0;
  }
`;

const ClassCard = styled(Card)`
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${colors.gradientPrimary};
  }

  cursor: pointer;
  border-radius: 0;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 20% 0%, rgba(56, 189, 248, 0.18), rgba(56, 189, 248, 0));
    opacity: 0;
    transition: opacity 0.22s ease;
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
    border-color: rgba(59, 130, 246, 0.25);

    &::after {
      opacity: 1;
    }
  }

  .class-inner {
    position: relative;
    display: grid;
    gap: 14px;
  }

  .class-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .class-icon {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: rgba(99, 102, 241, 0.12);
    border: 1px solid rgba(99, 102, 241, 0.22);
    color: ${colors.primaryBlue};
    flex: 0 0 auto;
  }

  .class-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: ${colors.textPrimary};
    margin-bottom: 4px;
    font-family: var(--font-display);
  }

  .class-subtitle {
    color: ${colors.textSecondary};
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .class-actions {
    display: flex;
    gap: 10px;
  }
`;

const OpenButton = styled(ActionButton)`
  padding: 10px 14px;
  border-radius: 999px;
  font-weight: 800;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.14), rgba(99, 102, 241, 0.14));
  border: 1px solid rgba(59, 130, 246, 0.25);
  color: ${colors.textPrimary};

  i {
    margin-left: 8px;
    transition: transform 0.22s ease;
  }

  ${ClassCard}:hover & i {
    transform: translateX(2px);
  }

  &:hover {
    transform: translateY(-1px);
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${colors.textSecondary};

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 14px;
    opacity: 0.7;
  }

  h3 {
    font-size: 1.2rem;
    margin-bottom: 8px;
    color: ${colors.textPrimary};
    font-family: var(--font-display);
  }

  p {
    font-size: 0.95rem;
    line-height: 1.6;
    margin: 0;
  }
`;

const MyClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { api } = useAuth();
  const navigate = useNavigate();

  const fetchMyClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/classes/my-classes');
      const classesData = response.data?.data || [];
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error(error.response?.data?.message || 'Error loading classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchMyClasses();
  }, [fetchMyClasses]);

  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0);

    const allSubjects = new Set();
    classes.forEach((cls) => {
      if (cls.subjects) {
        cls.subjects.split(', ').forEach((subject) => {
          if (subject.trim()) allSubjects.add(subject.trim());
        });
      } else if (cls.subject_name) {
        allSubjects.add(cls.subject_name);
      }
    });
    const totalSubjects = allSubjects.size;

    const classesWithAttendance = classes.filter(
      (cls) => cls.avg_attendance !== null && cls.avg_attendance !== undefined && cls.student_count > 0
    );

    let avgAttendance = null;
    if (classesWithAttendance.length > 0) {
      const totalWeightedAttendance = classesWithAttendance.reduce(
        (sum, cls) => sum + cls.avg_attendance * cls.student_count,
        0
      );
      const totalWeightedStudents = classesWithAttendance.reduce((sum, cls) => sum + cls.student_count, 0);
      if (totalWeightedStudents > 0) avgAttendance = totalWeightedAttendance / totalWeightedStudents;
    }

    return {
      totalClasses,
      totalStudents,
      totalSubjects,
      avgAttendance: avgAttendance !== null ? Math.round(avgAttendance) : null,
    };
  }, [classes]);

  const handleClassClick = (classInfo) => {
    navigate(`/classes/${classInfo.id}/dashboard`);
  };

  return (
    <Container>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

      <Hero>
        <div className="hero-inner">
          <div className="hero-text">
            <h1>🏫 My Classes</h1>
            <p>
              Select a class to open the full class dashboard. From there you can manage day-to-day work and track
              progress with confidence.
            </p>
          </div>
          <div className="hero-badge">
            <i className="fas fa-layer-group" /> Premium Class Workspace
          </div>
        </div>
      </Hero>

      <Section>
        <SectionTitle style={{ textAlign: 'center', marginBottom: 14 }}>Summary</SectionTitle>
        <SummaryGrid>
          <SummaryCard>
            <div className="sum-inner">
              <div className="sum-icon">🏫</div>
              <div>
                <div className="sum-number">{stats.totalClasses}</div>
                <div className="sum-label">Classes Assigned</div>
              </div>
            </div>
          </SummaryCard>
          <SummaryCard>
            <div className="sum-inner">
              <div className="sum-icon">👨‍🎓</div>
              <div>
                <div className="sum-number">{stats.totalStudents}</div>
                <div className="sum-label">Students Total</div>
              </div>
            </div>
          </SummaryCard>
          <SummaryCard>
            <div className="sum-inner">
              <div className="sum-icon">📚</div>
              <div>
                <div className="sum-number">{stats.totalSubjects}</div>
                <div className="sum-label">Subjects Teaching</div>
              </div>
            </div>
          </SummaryCard>
          <SummaryCard>
            <div className="sum-inner">
              <div className="sum-icon">📈</div>
              <div>
                <div className="sum-number">{stats.avgAttendance !== null ? `${stats.avgAttendance}%` : 'N/A'}</div>
                <div className="sum-label">Average Attendance</div>
              </div>
            </div>
          </SummaryCard>
        </SummaryGrid>

        <Showcase>
          <SectionTitle style={{ textAlign: 'center', marginBottom: 14 }}>What you can do here</SectionTitle>
          <ShowcaseGrid>
            <ShowcaseTile>
              <div className="tile-inner">
                <div className="tile-illus">
                  <div className="tile-icon">
                    <i className="fas fa-clipboard-check" />
                  </div>
                  <div className="tile-doodle" aria-hidden="true" />
                </div>
                <div className="tile-title">Take Attendance</div>
                <p className="tile-desc">Mark morning and afternoon attendance quickly and accurately.</p>
              </div>
            </ShowcaseTile>
            <ShowcaseTile>
              <div className="tile-inner">
                <div className="tile-illus">
                  <div className="tile-icon">
                    <i className="fas fa-users" />
                  </div>
                  <div className="tile-doodle" aria-hidden="true" />
                </div>
                <div className="tile-title">Student Roster</div>
                <p className="tile-desc">View students in the class, profiles, and key information.</p>
              </div>
            </ShowcaseTile>
            <ShowcaseTile>
              <div className="tile-inner">
                <div className="tile-illus">
                  <div className="tile-icon">
                    <i className="fas fa-chart-line" />
                  </div>
                  <div className="tile-doodle" aria-hidden="true" />
                </div>
                <div className="tile-title">Analytics & Insights</div>
                <p className="tile-desc">Track attendance trends and performance indicators over time.</p>
              </div>
            </ShowcaseTile>
            <ShowcaseTile>
              <div className="tile-inner">
                <div className="tile-illus">
                  <div className="tile-icon">
                    <i className="fas fa-layer-group" />
                  </div>
                  <div className="tile-doodle" aria-hidden="true" />
                </div>
                <div className="tile-title">Full Class Dashboard</div>
                <p className="tile-desc">Open a complete workspace for class tools, stats, and actions.</p>
              </div>
            </ShowcaseTile>
          </ShowcaseGrid>
        </Showcase>
      </Section>

      <Section>
        <SectionTitle>Your Assigned Classes</SectionTitle>

        {loading ? (
          <LoadingSpinner>
            <div className="spinner"></div>
          </LoadingSpinner>
        ) : classes.length > 0 ? (
          <ClassesGrid $minWidth="340px">
            {classes.map((classInfo) => (
              <ClassCard key={classInfo.id} $hover onClick={() => handleClassClick(classInfo)}>
                <div className="class-inner">
                  <div className="class-top">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="class-icon">
                        <i className="fas fa-chalkboard-teacher" />
                      </div>
                      <div>
                        <div className="class-title">{classInfo.class_name}</div>
                        <div className="class-subtitle">Open full dashboard</div>
                      </div>
                    </div>
                    <OpenButton type="button">
                      Open <i className="fas fa-arrow-right" />
                    </OpenButton>
                  </div>
                </div>
              </ClassCard>
            ))}
          </ClassesGrid>
        ) : (
          <EmptyState>
            <div className="empty-icon">📚</div>
            <h3>No Classes Assigned</h3>
            <p>Contact your administrator to get classes assigned to you.</p>
          </EmptyState>
        )}
      </Section>
    </Container>
  );
};

export default MyClasses;
