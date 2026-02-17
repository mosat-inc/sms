import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dashboardService } from '../services/dashboardService';

const DashboardContent = styled.div`
  color: #111827;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 0;
`;

const WelcomeCard = styled.div`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 30px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  
  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 15px;
    border-radius: 10px;
  }

  h1 {
    font-size: 2rem;
    margin-bottom: 10px;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    
    @media (max-width: 768px) {
      font-size: 1.75rem;
    }
    
    @media (max-width: 480px) {
      font-size: 1.5rem;
    }
  }

  p {
    font-size: 1.1rem;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 5px;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const StatCard = styled.div`
  background: #ffffff;
  border-radius: 14px;
  padding: 18px 18px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.09);
    border-color: rgba(37, 99, 235, 0.35);
  }

  .stat-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    background: linear-gradient(135deg, #dbeafe, #e0f2fe);
    color: #1d4ed8;
  }

  .stat-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .stat-number {
    font-size: 1.5rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.1;
  }

  .stat-label {
    color: #6b7280;
    font-size: 0.9rem;
  }
`;

const Section = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(15, 23, 42, 0.06);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 20px;
  }
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  margin-bottom: 20px;
  font-weight: 600;
  color: #0f172a;
  letter-spacing: 0.5px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
  
  @media (max-width: 768px) {
    font-size: 20px;
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    font-size: 18px;
    margin-bottom: 15px;
  }
`;

const ClassCard = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 480px) {
    padding: 15px;
  }

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: translateX(5px);
    
    @media (max-width: 768px) {
      transform: none;
    }
  }

  .class-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    @media (max-width: 480px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }
  }

  .class-name {
    font-size: 1.3rem;
    font-weight: bold;
    color: #60a5fa;
    
    @media (max-width: 480px) {
      font-size: 1.1rem;
    }
  }

  .student-count {
    font-size: 1.1rem;
    color: #a78bfa;
    
    @media (max-width: 480px) {
      font-size: 1rem;
    }
  }

  .class-details {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.95rem;
    overflow-wrap: break-word;
    word-wrap: break-word;
    
    @media (max-width: 480px) {
      font-size: 0.85rem;
    }
  }
`;

const TeacherCard = styled.div`
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
  }

  .teacher-info {
    flex: 1;
    
    @media (max-width: 768px) {
      width: 100%;
    }
  }

  .teacher-name {
    font-size: 1.1rem;
    font-weight: bold;
    color: #a78bfa;
    margin-bottom: 5px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .teacher-details {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .teacher-stats {
    text-align: right;
    color: #60a5fa;
    font-size: 0.9rem;
    
    @media (max-width: 768px) {
      text-align: left;
      width: 100%;
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.3);
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
`;

const RefreshButton = styled.button`
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(59, 130, 246, 0.3);
  margin-bottom: 20px;
  white-space: nowrap;
  
  @media (max-width: 480px) {
    width: 100%;
    text-align: center;
  }

  &:hover {
    background: rgba(59, 130, 246, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    margin-right: 8px;
  }
`;

const AdmissionItem = styled.div`
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 5px;
  }
  
  .admission-info {
    flex: 1;
    word-wrap: break-word;
    overflow-wrap: break-word;
    
    strong {
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
  }
  
  .admission-date {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.6);
    white-space: nowrap;
    
    @media (max-width: 768px) {
      white-space: normal;
    }
  }
`;

const FinancialSummaryCard = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.8);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  
  @media (max-width: 480px) {
    padding: 12px;
  }
  
  h3 {
    color: #86efac;
    margin-bottom: 10px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  
  .financial-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    width: 100%;
    
    @media (max-width: 480px) {
      grid-template-columns: 1fr;
      gap: 8px;
    }
    
    > div {
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-size: 0.9rem;
      
      @media (max-width: 480px) {
        font-size: 0.85rem;
      }
    }
  }
`;

const CreateSampleDataButton = styled.button`
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(34, 197, 94, 0.3);
  margin-left: 10px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
    text-align: center;
  }

  &:hover {
    background: rgba(34, 197, 94, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  i {
    margin-right: 8px;
  }
`;

const UserManagementButton = styled.button`
  background: rgba(139, 92, 246, 0.2);
  color: #c4b5fd;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(139, 92, 246, 0.3);
  margin-left: 10px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  
  @media (max-width: 768px) {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
    text-align: center;
    justify-content: center;
  }
  
  @media (max-width: 480px) {
    padding: 12px 16px;
    font-size: 0.9rem;
  }

  &:hover {
    background: rgba(139, 92, 246, 0.4);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  i {
    font-size: 1rem;
    
    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
  }
`;

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creatingData, setCreatingData] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dashboardService.getAdminStats();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError(error.message || 'Failed to load dashboard data');
      toast.error(error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleData = async () => {
    try {
      setCreatingData(true);
      const response = await dashboardService.createSampleData();
      toast.success(response.message || 'Sample data created successfully!');
      // Refresh dashboard data
      await fetchDashboardData();
    } catch (error) {
      console.error('Create sample data error:', error);
      toast.error(error.message || 'Failed to create sample data');
    } finally {
      setCreatingData(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <DashboardContent>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </DashboardContent>
    );
  }

  if (error) {
    return (
      <DashboardContent>
        <ErrorMessage>
          <strong>Error:</strong> {error}
        </ErrorMessage>
        <RefreshButton onClick={fetchDashboardData}>
          <i className="fas fa-refresh"></i>
          Try Again
        </RefreshButton>
        <CreateSampleDataButton onClick={handleCreateSampleData} disabled={creatingData}>
          <i className="fas fa-plus"></i>
          {creatingData ? 'Creating...' : 'Create Sample Data'}
        </CreateSampleDataButton>
        <UserManagementButton onClick={() => navigate('/admin/users')}>
          <i className="fas fa-users"></i>
          User Management
        </UserManagementButton>
      </DashboardContent>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardContent>
        <ErrorMessage>
          No dashboard data available. Please try refreshing the page.
        </ErrorMessage>
      </DashboardContent>
    );
  }

  const { overview, students_by_class, recent_admissions, financial_summary, teachers, summary } = dashboardData;

  // Create stats array from real data
  const adminStats = [
    { 
      icon: '👨‍🎓', 
      number: summary?.total_students || 0, 
      label: 'Total Students' 
    },
    { 
      icon: '👩‍🏫', 
      number: summary?.total_teachers || 0, 
      label: 'Total Teachers' 
    },
    { 
      icon: '🏫', 
      number: summary?.total_classes || 0, 
      label: 'Total Classes' 
    },
    { 
      icon: '💰', 
      number: summary?.collection_rate || '0%', 
      label: 'Fee Collection Rate' 
    }
  ];

  return (
    <DashboardContent>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
        width: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}>
        <RefreshButton onClick={fetchDashboardData} disabled={loading}>
          <i className="fas fa-refresh"></i>
          Refresh Data
        </RefreshButton>
        <CreateSampleDataButton onClick={handleCreateSampleData} disabled={creatingData}>
          <i className="fas fa-plus"></i>
          {creatingData ? 'Creating...' : 'Create Sample Data'}
        </CreateSampleDataButton>
        <UserManagementButton onClick={() => navigate('/admin/users')}>
          <i className="fas fa-users"></i>
          User Management
        </UserManagementButton>
      </div>

      <WelcomeCard>
        <h1>Welcome, {user?.first_name || 'Administrator'}! 👋</h1>
        <p><strong>Role:</strong> School Administrator</p>
        <p><strong>System:</strong> UBUNIFU SEC SMS</p>
        <p><strong>Today:</strong> {new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </WelcomeCard>

      <StatsGrid>
        {adminStats.map((stat, index) => (
          <StatCard key={index}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-meta">
              <div className="stat-number">{stat.number}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </StatCard>
        ))}
      </StatsGrid>

      <Section>
        <SectionTitle>School Overview</SectionTitle>
        <div style={{ 
          color: '#374151',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <p>• Active Students: {overview?.total_students || 0}</p>
          <p>• Active Teachers: {overview?.total_teachers || 0}</p>
          <p>• Active Classes: {overview?.total_classes || 0}</p>
          <p>• Academic Years: {overview?.total_academic_years || 0}</p>
          <p>• Total Fees Collected: {overview?.total_fees_collected ? `TSh ${Number(overview.total_fees_collected).toLocaleString()}` : 'TSh 0'}</p>
          <p>• Outstanding Fees: {overview?.total_outstanding_fees ? `TSh ${Number(overview.total_outstanding_fees).toLocaleString()}` : 'TSh 0'}</p>
        </div>
      </Section>

      {students_by_class && students_by_class.length > 0 && (
        <Section>
          <SectionTitle>Students by Class ({students_by_class.length} classes)</SectionTitle>
          {students_by_class.map((classInfo, index) => (
            <ClassCard key={index}>
              <div className="class-header">
                <div className="class-name">{classInfo.name}</div>
                <div className="student-count">{classInfo.student_count} students</div>
              </div>
              <div className="class-details">
                Level: {classInfo.level} | Capacity: {classInfo.capacity} | 
                Available: {classInfo.available_spots} spots
              </div>
            </ClassCard>
          ))}
        </Section>
      )}

      {teachers && teachers.length > 0 && (
        <Section>
          <SectionTitle>Teachers ({teachers.length})</SectionTitle>
          {teachers.map((teacher, index) => (
            <TeacherCard key={index}>
              <div className="teacher-info">
                <div className="teacher-name">{teacher.name}</div>
                <div className="teacher-details">
                  {teacher.email} • {teacher.department || 'No department'}
                </div>
              </div>
              <div className="teacher-stats">
                <div>{teacher.classes_assigned} Classes</div>
                <div>{teacher.subjects_taught} Subjects</div>
              </div>
            </TeacherCard>
          ))}
        </Section>
      )}

      {recent_admissions && recent_admissions.length > 0 && (
        <Section>
          <SectionTitle>Recent Admissions (Last 30 Days)</SectionTitle>
          {recent_admissions.slice(0, 10).map((admission, index) => (
            <AdmissionItem key={index}>
              <div className="admission-info">
                <strong>{admission.first_name} {admission.last_name}</strong> - {admission.class_name}
              </div>
              <div className="admission-date">
                {new Date(admission.admission_date).toLocaleDateString()}
              </div>
            </AdmissionItem>
          ))}
        </Section>
      )}

      {financial_summary && financial_summary.length > 0 && (
        <Section>
          <SectionTitle>Financial Summary by Academic Year</SectionTitle>
          {financial_summary.map((summary, index) => (
            <FinancialSummaryCard key={index}>
              <h3>
                Academic Year: {summary.academic_year}
              </h3>
              <div className="financial-grid">
                <div>Students: {summary.students_count}</div>
                <div>Required: TSh {Number(summary.total_required || 0).toLocaleString()}</div>
                <div>Collected: TSh {Number(summary.total_paid || 0).toLocaleString()}</div>
                <div>Outstanding: TSh {Number(summary.total_outstanding || 0).toLocaleString()}</div>
              </div>
            </FinancialSummaryCard>
          ))}
        </Section>
      )}

      {(!recent_admissions || recent_admissions.length === 0) && (
        <Section>
        <SectionTitle>Recent Admissions</SectionTitle>
          <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
            No recent admissions to display. Students admitted in the last 30 days will appear here.
          </div>
        </Section>
      )}
    </DashboardContent>
  );
};

export default AdminDashboard;
