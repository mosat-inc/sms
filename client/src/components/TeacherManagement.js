import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import TeacherList from './TeacherList';
import TeacherProfile from './TeacherProfile';
import AddTeacherModal from './AddTeacherModal';
import EditTeacherModal from './EditTeacherModal';
import AssignSubjectsModal from './AssignSubjectsModal';

const Container = styled.div`
  color: white;
  padding: 20px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  
  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 20px;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
    margin-bottom: 20px;
  }

  h1 {
    font-size: 2.5rem;
    margin: 0;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    word-wrap: break-word;
    overflow-wrap: break-word;
    
    @media (max-width: 768px) {
      font-size: 2rem;
      text-align: center;
    }
    
    @media (max-width: 480px) {
      font-size: 1.75rem;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
    width: 100%;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'primary' ? 
    'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 
    'rgba(255, 255, 255, 0.1)'};
  color: white;
  border: 1px solid ${props => props.variant === 'primary' ? 'transparent' : 'rgba(255, 255, 255, 0.2)'};
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 10px 20px;
    font-size: 14px;
  }
  
  @media (max-width: 480px) {
    width: 100%;
    justify-content: center;
    padding: 12px;
  }

  &:hover {
    background: ${props => props.variant === 'primary' ? 
      'linear-gradient(135deg, #2563eb, #7c3aed)' : 
      'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  i {
    font-size: 16px;
  }
`;

const StatsCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 25px;
  text-align: center;
  transition: transform 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .stat-icon {
    font-size: 3rem;
    margin-bottom: 15px;
  }

  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: #60a5fa;
    margin-bottom: 5px;
  }

  .stat-label {
    color: rgba(255, 255, 255, 0.8);
    font-size: 1rem;
  }
`;

const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 4px;
  margin-bottom: 20px;
  width: fit-content;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const ViewButton = styled.button`
  background: ${props => props.active ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
  white-space: nowrap;
  
  @media (max-width: 480px) {
    padding: 8px 16px;
    font-size: 14px;
  }

  &:hover {
    background: ${props => props.active ? 
      'linear-gradient(135deg, #2563eb, #7c3aed)' : 
      'rgba(255, 255, 255, 0.1)'};
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

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;

  h3 {
    margin: 0 0 10px 0;
    color: #ef4444;
  }
`;

const TeacherManagement = () => {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'cards'
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    status: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const { api } = useAuth();

  // Fetch teachers
  const fetchTeachers = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      });

      const response = await api.get(`/api/teachers?${params}`);

      if (response.data.success) {
        setTeachers(response.data.data);
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination
        }));
      } else {
        throw new Error(response.data.message || 'Failed to fetch teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setError(error.message || 'Failed to load teachers');
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [api, filters, pagination.limit]);

  // Fetch department statistics
  const fetchDepartmentStats = useCallback(async () => {
    try {
      const response = await api.get('/api/teachers/stats/departments');
      if (response.data.success) {
        setDepartmentStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching department stats:', error);
    }
  }, [api]);

  // Load data on mount
  useEffect(() => {
    fetchTeachers();
    fetchDepartmentStats();
  }, [fetchTeachers, fetchDepartmentStats]);

  // Handle search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchTeachers(1); // Reset to page 1 when filters change
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters]);

  // Handle teacher actions
  const handleAddTeacher = () => {
    setShowAddModal(true);
  };

  const handleEditTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setShowEditModal(true);
  };

  const handleAssignSubjects = (teacher) => {
    setSelectedTeacher(teacher);
    setShowAssignModal(true);
  };

  const handleViewProfile = (teacher) => {
    setSelectedTeacher(teacher);
    setCurrentView('profile');
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/api/teachers/${teacherId}`);
      if (response.data.success) {
        toast.success('Teacher deleted successfully');
        fetchTeachers(pagination.page);
        fetchDepartmentStats();
      } else {
        throw new Error(response.data.message || 'Failed to delete teacher');
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
      toast.error(error.message || 'Failed to delete teacher');
    }
  };

  const handleToggleStatus = async (teacherId) => {
    try {
      const response = await api.patch(`/api/teachers/${teacherId}/toggle-status`);
      if (response.data.success) {
        toast.success('Teacher status updated successfully');
        fetchTeachers(pagination.page);
        fetchDepartmentStats();
      } else {
        throw new Error(response.data.message || 'Failed to update teacher status');
      }
    } catch (error) {
      console.error('Error updating teacher status:', error);
      toast.error(error.message || 'Failed to update teacher status');
    }
  };

  // Handle modal close and refresh
  const handleModalClose = (shouldRefresh = false) => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowAssignModal(false);
    setSelectedTeacher(null);

    if (shouldRefresh) {
      fetchTeachers(pagination.page);
      fetchDepartmentStats();
    }
  };

  // Calculate overview stats
  const overviewStats = [
    {
      icon: '👩‍🏫',
      number: teachers.length,
      label: 'Total Teachers'
    },
    {
      icon: '✅',
      number: teachers.filter(t => t.status === 'active').length,
      label: 'Active Teachers'
    },
    {
      icon: '📚',
      number: teachers.reduce((acc, t) => acc + (t.subjects_taught || 0), 0),
      label: 'Total Subjects'
    },
    {
      icon: '🏫',
      number: departmentStats.length,
      label: 'Departments'
    }
  ];

  if (loading && teachers.length === 0) {
    return (
      <Container>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </Container>
    );
  }

  if (error && teachers.length === 0) {
    return (
      <Container>
        <ErrorMessage>
          <h3>Error Loading Teachers</h3>
          <p>{error}</p>
          <ActionButton variant="primary" onClick={() => fetchTeachers()}>
            <i className="fas fa-refresh"></i>
            Try Again
          </ActionButton>
        </ErrorMessage>
      </Container>
    );
  }

  // Show teacher profile view
  if (currentView === 'profile' && selectedTeacher) {
    return (
      <Container>
        <ActionButton 
          onClick={() => {
            setCurrentView('list');
            setSelectedTeacher(null);
          }}
          style={{ marginBottom: '20px' }}
        >
          <i className="fas fa-arrow-left"></i>
          Back to List
        </ActionButton>
        <TeacherProfile 
          teacher={selectedTeacher}
          onEdit={handleEditTeacher}
          onAssignSubjects={handleAssignSubjects}
          onToggleStatus={handleToggleStatus}
          onRefresh={() => fetchTeachers(pagination.page)}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>
          <i className="fas fa-chalkboard-teacher"></i>
          Teacher Management
        </h1>
        <ActionButtons>
          <ActionButton onClick={() => fetchTeachers(pagination.page)}>
            <i className="fas fa-sync-alt"></i>
            Refresh
          </ActionButton>
          <ActionButton variant="primary" onClick={handleAddTeacher}>
            <i className="fas fa-plus"></i>
            Add New Teacher
          </ActionButton>
        </ActionButtons>
      </Header>

      <StatsCards>
        {overviewStats.map((stat, index) => (
          <StatCard key={index}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-number">{stat.number}</div>
            <div className="stat-label">{stat.label}</div>
          </StatCard>
        ))}
      </StatsCards>

      <ViewToggle>
        <ViewButton 
          active={currentView === 'list'}
          onClick={() => setCurrentView('list')}
        >
          <i className="fas fa-list"></i>
          List View
        </ViewButton>
        <ViewButton 
          active={currentView === 'cards'}
          onClick={() => setCurrentView('cards')}
        >
          <i className="fas fa-th"></i>
          Card View
        </ViewButton>
      </ViewToggle>

      <TeacherList
        teachers={teachers}
        loading={loading}
        viewType={currentView}
        filters={filters}
        onFiltersChange={setFilters}
        pagination={pagination}
        onPageChange={(page) => fetchTeachers(page)}
        onEdit={handleEditTeacher}
        onViewProfile={handleViewProfile}
        onAssignSubjects={handleAssignSubjects}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDeleteTeacher}
      />

      {/* Modals */}
      {showAddModal && (
        <AddTeacherModal
          onClose={() => handleModalClose(false)}
          onSuccess={() => handleModalClose(true)}
        />
      )}

      {showEditModal && selectedTeacher && (
        <EditTeacherModal
          teacher={selectedTeacher}
          onClose={() => handleModalClose(false)}
          onSuccess={() => handleModalClose(true)}
        />
      )}

      {showAssignModal && selectedTeacher && (
        <AssignSubjectsModal
          teacher={selectedTeacher}
          onClose={() => handleModalClose(false)}
          onSuccess={() => handleModalClose(true)}
        />
      )}
    </Container>
  );
};

export default TeacherManagement;
