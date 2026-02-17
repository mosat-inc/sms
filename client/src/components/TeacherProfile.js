import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const Container = styled.div`
  color: white;
`;

const ProfileHeader = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ProfileTop = styled.div`
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 30px;
  flex-wrap: wrap;
`;

const Avatar = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 3rem;
`;

const ProfileInfo = styled.div`
  flex: 1;

  h1 {
    margin: 0 0 10px 0;
    font-size: 2.5rem;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .role {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    display: inline-block;
    font-weight: 600;
    margin-bottom: 15px;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: rgba(255, 255, 255, 0.8);

    .contact-item {
      display: flex;
      align-items: center;
      gap: 10px;

      i {
        width: 20px;
        color: #60a5fa;
      }
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'primary' ? 
    'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 
    props.variant === 'danger' ? '#ef4444' :
    'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: 1px solid ${props => props.variant === 'primary' ? 'transparent' : 
    props.variant === 'danger' ? '#ef4444' :
    'rgba(255, 255, 255, 0.2)'};
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => props.variant === 'primary' ? 
      'linear-gradient(135deg, #2563eb, #7c3aed)' : 
      props.variant === 'danger' ? '#dc2626' :
      'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
`;

const StatusBadge = styled.div`
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.status === 'active' ? '#10b981' : '#ef4444'};
  color: white;
  margin-bottom: 15px;

  i {
    font-size: 14px;
  }
`;

const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
`;

const DetailCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 25px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    margin: 0 0 20px 0;
    color: #60a5fa;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .label {
    color: rgba(255, 255, 255, 0.6);
    font-weight: 500;
  }

  .value {
    color: white;
    font-weight: 600;
    text-align: right;
    flex: 1;
    margin-left: 20px;
  }
`;

const AssignmentsList = styled.div`
  .assignment-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 12px;
    border-left: 4px solid #3b82f6;

    .assignment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .subject {
        font-weight: 600;
        color: #60a5fa;
      }

      .class {
        background: rgba(139, 92, 246, 0.2);
        color: #c4b5fd;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }
    }

    .assignment-details {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);

      .year {
        margin-right: 15px;
      }

      .primary {
        color: #10b981;
        font-weight: 600;
      }
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
`;

const StatItem = styled.div`
  text-align: center;

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #60a5fa;
    margin-bottom: 5px;
  }

  .stat-label {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  
  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid rgba(59, 130, 246, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const TeacherProfile = ({ teacher, onEdit, onAssignSubjects, onToggleStatus, onRefresh }) => {
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const { api } = useAuth();

  useEffect(() => {
    if (teacher?.id) {
      fetchTeacherDetails();
    }
  }, [teacher]);

  const fetchTeacherDetails = async () => {
    try {
      setLoading(true);
      setStatsLoading(true);
      const response = await api.get(`/api/teachers/${teacher.id}`);
      if (response.data.success) {
        setTeacherDetails(response.data.data);
        console.log('Teacher statistics loaded:', response.data.data.statistics);
      } else {
        console.error('Failed to fetch teacher details:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching teacher details:', error);
      // If there's an error, at least show the basic teacher data
      if (!teacherDetails) {
        setTeacherDetails(teacher);
      }
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </Container>
    );
  }

  const details = teacherDetails || teacher;
  const assignments = details.assignments || [];
  const stats = details.statistics || {
    total_classes: 0,
    total_subjects: 0,
    total_students: 0,
    total_school_students: 0,
    primary_classes: 0,
    total_assessments: 0,
    teaching_materials: 0,
    curriculum_topics: 0
  };

  return (
    <Container>
      <ProfileHeader>
        <ProfileTop>
          <Avatar>
            {getInitials(details.first_name, details.last_name)}
          </Avatar>
          <ProfileInfo>
            <h1>{details.first_name} {details.last_name}</h1>
            <div className="role">Teacher</div>
            <StatusBadge status={details.status}>
              <i className={`fas fa-${details.status === 'active' ? 'check-circle' : 'times-circle'}`}></i>
              {details.status === 'active' ? 'Active' : 'Inactive'}
            </StatusBadge>
            <div className="contact-info">
              <div className="contact-item">
                <i className="fas fa-envelope"></i>
                <span>{details.email}</span>
              </div>
              {details.phone && (
                <div className="contact-item">
                  <i className="fas fa-phone"></i>
                  <span>{details.phone}</span>
                </div>
              )}
              {details.employee_id && (
                <div className="contact-item">
                  <i className="fas fa-id-card"></i>
                  <span>ID: {details.employee_id}</span>
                </div>
              )}
            </div>
          </ProfileInfo>
          <ActionButtons>
            <ActionButton variant="primary" onClick={() => onEdit(details)}>
              <i className="fas fa-edit"></i>
              Edit Profile
            </ActionButton>
            <ActionButton onClick={() => onAssignSubjects(details)}>
              <i className="fas fa-tasks"></i>
              Manage Assignments
            </ActionButton>
            <ActionButton 
              variant={details.status === 'active' ? 'danger' : 'primary'}
              onClick={() => onToggleStatus(details.id)}
            >
              <i className={`fas fa-${details.status === 'active' ? 'pause' : 'play'}`}></i>
              {details.status === 'active' ? 'Deactivate' : 'Activate'}
            </ActionButton>
          </ActionButtons>
        </ProfileTop>
      </ProfileHeader>

      <DetailsGrid>
        <DetailCard>
          <h3>
            <i className="fas fa-user-circle"></i>
            Personal Information
          </h3>
          <DetailRow>
            <span className="label">Full Name</span>
            <span className="value">{details.first_name} {details.last_name}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Username</span>
            <span className="value">{details.username}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Email</span>
            <span className="value">{details.email}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Phone</span>
            <span className="value">{details.phone || 'Not provided'}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Address</span>
            <span className="value">{details.address || 'Not provided'}</span>
          </DetailRow>
        </DetailCard>

        <DetailCard>
          <h3>
            <i className="fas fa-briefcase"></i>
            Professional Information
          </h3>
          <DetailRow>
            <span className="label">Employee ID</span>
            <span className="value">{details.employee_id || 'Not assigned'}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Department</span>
            <span className="value">{details.department || details.profile_department || 'Not assigned'}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Position</span>
            <span className="value">{details.position || 'Not specified'}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Experience</span>
            <span className="value">{details.experience_years ? `${details.experience_years} years` : 'Not specified'}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Joining Date</span>
            <span className="value">{formatDate(details.joining_date)}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Qualification</span>
            <span className="value">{details.qualification || 'Not specified'}</span>
          </DetailRow>
          <DetailRow>
            <span className="label">Specialization</span>
            <span className="value">{details.specialization || 'Not specified'}</span>
          </DetailRow>
        </DetailCard>

        <DetailCard>
          <h3 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>
              <i className="fas fa-chart-bar"></i>
              Statistics
              {statsLoading && <i className="fas fa-spinner fa-spin" style={{marginLeft: '10px', fontSize: '0.9rem', color: '#60a5fa'}}></i>}
            </span>
            <button 
              onClick={fetchTeacherDetails}
              disabled={statsLoading}
              style={{
                background: 'rgba(96, 165, 250, 0.2)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                color: '#60a5fa',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: statsLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s ease',
                opacity: statsLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => !statsLoading && (e.target.style.background = 'rgba(96, 165, 250, 0.3)')}
              onMouseLeave={(e) => !statsLoading && (e.target.style.background = 'rgba(96, 165, 250, 0.2)')}
            >
              <i className="fas fa-sync-alt" style={{marginRight: '5px'}}></i>
              Refresh
            </button>
          </h3>
          <StatsGrid>
            <StatItem>
              <div className="stat-number">{stats.total_classes || 0}</div>
              <div className="stat-label">Classes Assigned</div>
            </StatItem>
            <StatItem>
              <div className="stat-number">{stats.total_subjects || 0}</div>
              <div className="stat-label">Subjects Teaching</div>
            </StatItem>
            <StatItem>
              <div className="stat-number">{stats.total_students || 0}</div>
              <div className="stat-label">Students in Classes</div>
            </StatItem>
            <StatItem>
              <div className="stat-number">{stats.total_school_students || 0}</div>
              <div className="stat-label">Total School Students</div>
            </StatItem>
            <StatItem>
              <div className="stat-number">{stats.primary_classes || 0}</div>
              <div className="stat-label">Primary Classes</div>
            </StatItem>
            <StatItem>
              <div className="stat-number">{stats.total_assessments || 0}</div>
              <div className="stat-label">Assessments Created</div>
            </StatItem>
            <StatItem>
              <div className="stat-number">{stats.teaching_materials || 0}</div>
              <div className="stat-label">Teaching Materials</div>
            </StatItem>
          </StatsGrid>
        </DetailCard>

        <DetailCard>
          <h3>
            <i className="fas fa-tasks"></i>
            Subject Assignments ({assignments.length})
          </h3>
          {assignments.length > 0 ? (
            <AssignmentsList>
              {assignments.map((assignment, index) => (
                <div key={index} className="assignment-item">
                  <div className="assignment-header">
                    <span className="subject">{assignment.subject_name}</span>
                    <span className="class">{assignment.class_name}</span>
                  </div>
                  <div className="assignment-details">
                    <span className="year">Year: {assignment.academic_year}</span>
                    {assignment.is_primary_teacher && (
                      <span className="primary">Primary Teacher</span>
                    )}
                  </div>
                </div>
              ))}
            </AssignmentsList>
          ) : (
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              No subject assignments yet
            </div>
          )}
        </DetailCard>
      </DetailsGrid>

      {details.bio && (
        <DetailCard style={{ marginTop: '30px' }}>
          <h3>
            <i className="fas fa-quote-left"></i>
            Biography
          </h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6', margin: 0 }}>
            {details.bio}
          </p>
        </DetailCard>
      )}
    </Container>
  );
};

export default TeacherProfile;
