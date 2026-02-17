import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { mediaQuery } from '../hooks/useDevice';
import {
  Card,
  CardGrid,
  colors,
  InfoMessage,
  LoadingSpinner,
  PageContainer,
  PageHeader,
  Section,
  SectionTitle,
  StatCard,
  StatsGrid,
  Tab,
  SecondaryButton,
  borderRadius,
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

  h1 {
    margin-bottom: 10px;
  }

  .class-details {
    color: ${colors.textSecondary};
    font-size: 0.95rem;
    display: grid;
    gap: 4px;
  }
`;

const Controls = styled(Section)`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: start;

  ${mediaQuery('tablet')} {
    grid-template-columns: 1fr;
  }
`;

const SearchBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  label {
    font-weight: 500;
    color: ${colors.textPrimary};
    font-size: 0.9rem;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.medium};
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  font-size: 1rem;
  outline: none;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:focus {
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2);
  }
`;

const ToggleRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;

  ${mediaQuery('tablet')} {
    justify-content: flex-start;
  }
`;

const StudentsGrid = styled(CardGrid)`
  grid-template-columns: ${(props) =>
    props.$viewMode === 'grid' ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr'};
`;

const StudentCard = styled(Card)`
  display: ${(props) => (props.$viewMode === 'list' ? 'flex' : 'block')};
  align-items: ${(props) => (props.$viewMode === 'list' ? 'center' : 'initial')};
  gap: ${(props) => (props.$viewMode === 'list' ? '16px' : '0')};
  cursor: pointer;

  .student-photo {
    width: ${(props) => (props.$viewMode === 'list' ? '56px' : '80px')};
    height: ${(props) => (props.$viewMode === 'list' ? '56px' : '80px')};
    border-radius: ${borderRadius.pill};
    background: ${colors.gradientPrimary};
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-family: var(--font-display);
    font-size: ${(props) => (props.$viewMode === 'list' ? '1.1rem' : '1.35rem')};
    margin: ${(props) => (props.$viewMode === 'list' ? '0' : '0 auto 14px')};
    flex-shrink: 0;
  }

  .student-info {
    flex: 1;
    min-width: 0;
    text-align: ${(props) => (props.$viewMode === 'list' ? 'left' : 'center')};
  }

  .roll-number {
    color: ${colors.textSecondary};
    font-weight: 600;
    font-size: 0.9rem;
    margin-bottom: 6px;
  }

  .student-name {
    font-size: 1.1rem;
    font-weight: 700;
    color: ${colors.textPrimary};
    margin-bottom: 8px;
    font-family: var(--font-display);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .student-details {
    color: ${colors.textSecondary};
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .student-meta {
    display: flex;
    justify-content: ${(props) => (props.$viewMode === 'list' ? 'flex-start' : 'center')};
    gap: 12px;
    margin-top: 10px;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: ${colors.textMuted};

    i {
      color: ${colors.accentBlue};
    }
  }

  .student-status {
    margin-left: auto;
    padding: 6px 12px;
    border-radius: ${borderRadius.pill};
    font-size: 0.85rem;
    font-weight: 600;
    color: #fff;
    background: ${(props) =>
      props.$status === 'active'
        ? colors.success
        : props.$status === 'graduated'
          ? colors.primaryPurple
          : '#f59e0b'};
    text-transform: capitalize;
  }
`;

const StudentRoster = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user, api } = useAuth();

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [classData, setClassData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const fetchClassData = useCallback(async () => {
    try {
      const response = await api.get(`/api/classes/${classId}`);
      if (response.data?.success) {
        setClassData(response.data.data);
      } else {
        toast.error(response.data?.message || 'Failed to fetch class data');
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      toast.error(error.response?.data?.message || 'Error loading class data');
    }
  }, [api, classId]);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/classes/${classId}/students`);
      if (response.data?.success) {
        setStudents(response.data.data || []);
      } else {
        toast.error(response.data?.message || 'Failed to fetch students');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error(error.response?.data?.message || 'Error loading students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [api, classId]);

  useEffect(() => {
    fetchClassData();
    fetchStudents();
  }, [fetchClassData, fetchStudents]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const q = searchTerm.toLowerCase();
    return students.filter((student) => {
      return (
        student.first_name?.toLowerCase().includes(q) ||
        student.last_name?.toLowerCase().includes(q) ||
        student.student_id?.toLowerCase().includes(q) ||
        String(student.roll_number ?? '').includes(searchTerm)
      );
    });
  }, [students, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const active = students.filter((s) => s.status === 'active').length;
    const male = students.filter((s) => s.gender === 'Male').length;
    const female = students.filter((s) => s.gender === 'Female').length;
    return { total, active, male, female };
  }, [filteredStudents.length, students]);

  const generateRollNumber = (index) => (index + 1).toString().padStart(2, '0');

  const getInitials = (firstName, lastName) =>
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  const handleStudentClick = (student) => {
    navigate(`/students/profile/${student.id}`);
  };

  return (
    <Container>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

      <Header>
        <div className="header-info">
          <h1>👥 Student Roster</h1>
          <div className="class-details">
            <div>
              <strong>Class:</strong> {classData?.class_name || '—'}
            </div>
            <div>
              <strong>Subject:</strong> {classData?.subject_name || '—'}
            </div>
            <div>
              <strong>Teacher:</strong> {user?.first_name} {user?.last_name}
            </div>
          </div>
        </div>

        <SecondaryButton onClick={() => navigate(`/classes/${classId}/dashboard`)}>
          <i className="fas fa-arrow-left"></i>
          Back to Dashboard
        </SecondaryButton>
      </Header>

      <Controls>
        <SearchBox>
          <label htmlFor="student-search">Search</label>
          <SearchInput
            id="student-search"
            type="text"
            placeholder="Search by name, ID, or roll number…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchBox>

        <ToggleRow>
          <Tab $active={viewMode === 'grid'} onClick={() => setViewMode('grid')}>
            <i className="fas fa-th"></i>
            Grid
          </Tab>
          <Tab $active={viewMode === 'list'} onClick={() => setViewMode('list')}>
            <i className="fas fa-list"></i>
            List
          </Tab>
        </ToggleRow>
      </Controls>

      <Section>
        <SectionTitle>Summary</SectionTitle>
        <StatsGrid>
          <StatCard>
            <div className="stat-icon">👥</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Students</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">✅</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.active}</div>
              <div className="stat-label">Active</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">👦</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.male}</div>
              <div className="stat-label">Male</div>
            </div>
          </StatCard>
          <StatCard>
            <div className="stat-icon">👧</div>
            <div className="stat-meta">
              <div className="stat-number">{stats.female}</div>
              <div className="stat-label">Female</div>
            </div>
          </StatCard>
        </StatsGrid>
      </Section>

      <Section>
        <SectionTitle>Students</SectionTitle>

        {loading ? (
          <LoadingSpinner>
            <div className="spinner"></div>
          </LoadingSpinner>
        ) : filteredStudents.length > 0 ? (
          <StudentsGrid $viewMode={viewMode} $minWidth="280px">
            {filteredStudents.map((student, index) => (
              <StudentCard
                key={student.id}
                $hover
                $viewMode={viewMode}
                $status={student.status}
                onClick={() => handleStudentClick(student)}
              >
                <div className="student-photo">{getInitials(student.first_name, student.last_name)}</div>

                <div className="student-info">
                  <div className="roll-number">Roll #{generateRollNumber(index)}</div>
                  <div className="student-name">
                    {student.first_name} {student.last_name}
                  </div>
                  <div className="student-details">
                    <div>ID: {student.student_id}</div>
                    <div>Admission: {student.admission_number}</div>
                    <div>Gender: {student.gender}</div>
                    {student.date_of_birth && (
                      <div>DOB: {new Date(student.date_of_birth).toLocaleDateString()}</div>
                    )}
                  </div>

                  <div className="student-meta">
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>Age: {student.age || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-phone"></i>
                      <span>{student.phone || 'No Phone'}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-envelope"></i>
                      <span>{student.email || 'No Email'}</span>
                    </div>
                  </div>
                </div>

                {viewMode === 'list' && <div className="student-status">{student.status}</div>}
              </StudentCard>
            ))}
          </StudentsGrid>
        ) : (
          <InfoMessage>
            <i className="fas fa-info-circle"></i>
            <div>
              {searchTerm
                ? `No students match your search for "${searchTerm}".`
                : 'No students are enrolled in this class yet.'}
            </div>
          </InfoMessage>
        )}
      </Section>
    </Container>
  );
};

export default StudentRoster;

