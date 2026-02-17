import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const ProfileContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 20px 30px rgba(15, 23, 42, 0.06);
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
`;

const ProfileAvatar = styled.div`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2.5rem;
  font-weight: bold;
  margin-right: 30px;
  border: 4px solid rgba(59, 130, 246, 0.3);
`;

const ProfileInfo = styled.div`
  flex: 1;
  color: #111827;
  
  h2 {
    font-size: 2rem;
    margin: 0 0 10px 0;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .subtitle {
    font-size: 1.2rem;
    color: #4b5563;
    margin-bottom: 5px;
  }
  
  .email {
    font-size: 1rem;
    color: #6b7280;
  }
`;

const ProfileDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
`;

const DetailSection = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  padding: 25px;
  border: 1px solid #e5e7eb;
  
  h3 {
    color: #111827;
    margin: 0 0 20px 0;
    font-size: 1.3rem;
    display: flex;
    align-items: center;
    
    i {
      margin-right: 10px;
      width: 20px;
    }
  }
`;

const DetailItem = styled.div`
  margin-bottom: 15px;
  
  .label {
    color: #6b7280;
    font-size: 0.9rem;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .value {
    color: #111827;
    font-size: 1rem;
    font-weight: 500;
  }
`;

const SubjectsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const SubjectTag = styled.span`
  background: #eff6ff;
  color: #1d4ed8;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  border: 1px solid #bfdbfe;
`;

const StatusBadge = styled.span`
  background: ${props => props.$status === 'active' ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$status === 'active' ? '#166534' : '#b91c1c'};
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  border: 1px solid ${props => props.$status === 'active' ? '#bbf7d0' : '#fecaca'};
  text-transform: uppercase;
  font-weight: 600;
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
    color: #111827;
    margin-bottom: 5px;
  }

  .stat-label {
    color: #6b7280;
    font-size: 14px;
  }
`;

const UserProfile = () => {
  const { user, getProfile, api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [teacherDetails, setTeacherDetails] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch fresh profile data when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        console.log('UserProfile: Fetching fresh profile data on mount');
        await getProfile();
        console.log('UserProfile: Profile data refreshed successfully');
      } catch (error) {
        console.error('UserProfile: Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []); // Empty dependency array - only run on mount

  // Fetch teacher details with statistics
  const fetchTeacherDetails = async () => {
    if (!user?.id || user?.role !== 'teacher') return;
    
    try {
      setStatsLoading(true);
      const response = await api.get(`/api/teachers/${user.id}`);
      if (response.data.success) {
        setTeacherDetails(response.data.data);
        console.log('UserProfile: Teacher statistics loaded:', response.data.data.statistics);
      } else {
        console.error('Failed to fetch teacher details:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching teacher details:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch teacher details when user data is available
  useEffect(() => {
    if (user?.id && user?.role === 'teacher') {
      fetchTeacherDetails();
    }
  }, [user?.id]);

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <ProfileContainer>
        <div style={{ color: '#374151', textAlign: 'center', padding: '50px' }}>
          Loading profile...
        </div>
      </ProfileContainer>
    );
  }

  // Debug user data
  console.log('UserProfile: Current user data:', user);
  console.log('UserProfile: is_active value:', user?.is_active, 'Type:', typeof user?.is_active);
  console.log('UserProfile: Boolean check of is_active:', !!user?.is_active);
  console.log('UserProfile: Teaching assignments:', {
    subjects_taught: user?.subjects_taught,
    subjects_length: user?.subjects_taught?.length,
    classes_assigned: user?.classes_assigned,
    classes_length: user?.classes_assigned?.length
  });

  // Use actual user data from the context
  const teacherData = {
    ...user,
    phone: user?.phone || 'Not provided',
    address: user?.address || 'Not provided',
    employee_id: user?.employee_id || 'Not assigned',
    department: user?.department || 'Not assigned',
    position: user?.position || 'Not assigned',
    hire_date: user?.joining_date || user?.created_at,
    qualification: user?.qualification || 'Not provided',
    experience: user?.experience || user?.experience_years ? `${user.experience_years} years` : 'Not provided',
    specialization: user?.specialization || 'Not provided',
    bio: user?.bio || 'No bio provided',
    subjects: user?.subjects_taught?.map(subject => 
      typeof subject === 'string' ? subject : subject?.name || subject
    ) || [],
    classes: user?.classes_assigned?.map(cls => 
      typeof cls === 'string' ? `Form ${cls}` : cls?.name || cls
    ) || [],
    status: user?.is_active === 1 || user?.is_active === true ? 'active' : 'inactive'
  };
  
  console.log('UserProfile: Final status determination:', {
    is_active: user?.is_active,
    calculated_status: teacherData.status
  });
  
  console.log('UserProfile: Final teacherData for rendering:', {
    subjects: teacherData.subjects,
    classes: teacherData.classes,
    status: teacherData.status
  });

  // Get statistics from teacherDetails or use defaults
  const stats = teacherDetails?.statistics || {
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
    <ProfileContainer>
      <ProfileHeader>
        <ProfileAvatar>
          {getInitials(teacherData.first_name, teacherData.last_name)}
        </ProfileAvatar>
        <ProfileInfo>
          <h2>{teacherData.first_name} {teacherData.last_name}</h2>
          <div className="subtitle">{teacherData.position} • {teacherData.department}</div>
          <div className="email">{teacherData.email}</div>
          <div style={{ marginTop: '10px' }}>
            <StatusBadge $status={teacherData.status}>
              {teacherData.status}
            </StatusBadge>
          </div>
        </ProfileInfo>
      </ProfileHeader>

      <ProfileDetails>
        <DetailSection>
          <h3>
            <i className="fas fa-user"></i>
            Personal Information
          </h3>
          <DetailItem>
            <div className="label">Employee ID</div>
            <div className="value">{teacherData.employee_id}</div>
          </DetailItem>
          <DetailItem>
            <div className="label">Phone Number</div>
            <div className="value">{teacherData.phone}</div>
          </DetailItem>
          <DetailItem>
            <div className="label">Address</div>
            <div className="value">{teacherData.address}</div>
          </DetailItem>
          <DetailItem>
            <div className="label">Date of Hire</div>
            <div className="value">{new Date(teacherData.hire_date).toLocaleDateString()}</div>
          </DetailItem>
        </DetailSection>

        <DetailSection>
          <h3>
            <i className="fas fa-graduation-cap"></i>
            Professional Details
          </h3>
          <DetailItem>
            <div className="label">Position</div>
            <div className="value">{teacherData.position}</div>
          </DetailItem>
          <DetailItem>
            <div className="label">Department</div>
            <div className="value">{teacherData.department}</div>
          </DetailItem>
          <DetailItem>
            <div className="label">Qualification</div>
            <div className="value">{teacherData.qualification}</div>
          </DetailItem>
          <DetailItem>
            <div className="label">Experience</div>
            <div className="value">{teacherData.experience}</div>
          </DetailItem>
        </DetailSection>

        <DetailSection>
          <h3>
            <i className="fas fa-book"></i>
            Teaching Assignment ({(teacherDetails?.assignments || teacherData.subjects).length || 0} assignments)
          </h3>
          <DetailItem>
            <div className="label">Subjects Teaching</div>
            <div className="value">
              <SubjectsList>
                {(teacherDetails?.assignments || teacherData.subjects || []).map((item, index) => (
                  <SubjectTag key={index}>
                    {typeof item === 'string' ? item : item?.subject_name || item}
                  </SubjectTag>
                ))}
              </SubjectsList>
              {(!teacherDetails?.assignments && !teacherData.subjects?.length) && (
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  No subjects assigned yet
                </div>
              )}
            </div>
          </DetailItem>
          <DetailItem>
            <div className="label">Classes Assigned</div>
            <div className="value">
              <SubjectsList>
                {(teacherDetails?.assignments || teacherData.classes || []).map((item, index) => (
                  <SubjectTag key={index}>
                    {typeof item === 'string' ? item : item?.class_name || item}
                  </SubjectTag>
                ))}
              </SubjectsList>
              {(!teacherDetails?.assignments && !teacherData.classes?.length) && (
                <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
                  No classes assigned yet
                </div>
              )}
            </div>
          </DetailItem>
        </DetailSection>

        <DetailSection>
          <h3 style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>
              <i className="fas fa-chart-bar"></i>
              Statistics
              {statsLoading && <i className="fas fa-spinner fa-spin" style={{marginLeft: '10px', fontSize: '0.9rem', color: '#60a5fa'}}></i>}
            </span>
            {user?.role === 'teacher' && (
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
            )}
          </h3>
          {user?.role === 'teacher' ? (
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
            </StatsGrid>
          ) : (
            <div style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              Statistics not available for this role
            </div>
          )}
        </DetailSection>
      </ProfileDetails>
    </ProfileContainer>
  );
};

export default UserProfile;
