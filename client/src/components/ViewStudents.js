import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const ViewStudentsContainer = styled.div`
  font-family: var(--font-primary);
  min-height: 100vh;
  background: #f5f7fb;
  display: flex;
`;

const Overlay = styled.div`
  display: flex;
  min-height: 100vh;
  width: 100%;
`;

const MainContent = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  color: #111827;
`;

const HeaderSection = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  text-align: center;

  h1 {
    font-size: 2rem;
    margin-bottom: 8px;
    color: #111827;
  }

  p {
    font-size: 1rem;
    color: #6b7280;
    margin: 0;
  }
`;

const ControlsSection = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
`;

const ClassDropdownContainer = styled.div`
  position: relative;
  max-width: 400px;
  margin: 0 auto;
`;

const DropdownButton = styled.button`
  width: 100%;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1d4ed8;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;

  &:hover {
    background: #dbeafe;
    border-color: #60a5fa;
    transform: translateY(-1px);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.18);
  }

  .chevron {
    transition: transform 0.2s ease;
    transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 8px;
  display: ${props => props.$isOpen ? 'block' : 'none'};
  animation: ${props => props.$isOpen ? 'fadeInDown 0.2s ease' : 'none'};

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: 0;

  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }
`;

const FormHeader = styled.div`
  padding: 12px 16px;
  background: #f9fafb;
  color: #374151;
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.3px;
`;

const ClassOption = styled.div`
  padding: 10px 16px 10px 32px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
  border-left: 3px solid transparent;

  &:hover {
    background: #eff6ff;
    border-left-color: #3b82f6;
    color: #1d4ed8;
  }

  &:last-child {
    border-radius: 0 0 12px 12px;
  }
`;

const StudentsSection = styled.div`
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  margin-bottom: 20px;
  font-weight: 600;
  color: #111827;
  letter-spacing: 0.3px;
  text-align: center;
`;

const StudentsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
`;

const StudentCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12);
    border-color: #60a5fa;
  }

  .student-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 1.5rem;
    margin-bottom: 15px;
    margin: 0 auto 15px;
  }

  .student-info {
    text-align: center;
  }

  .student-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #111827;
    margin-bottom: 6px;
  }

  .student-details {
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .student-id {
    color: #1d4ed8;
    font-weight: 500;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.5;
  }

  h3 {
    font-size: 1.5rem;
    margin-bottom: 10px;
    color: #111827;
  }

  p {
    font-size: 1rem;
    line-height: 1.6;
  }
`;

const StatusFilter = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const StatusButton = styled.button`
  background: ${props => props.$active ? '#3b82f6' : '#f3f4f6'};
  color: ${props => props.$active ? '#ffffff' : '#6b7280'};
  border: none;
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#e5e7eb'};
    transform: translateY(-1px);
  }
`;

const ViewStudents = () => {
  const { api } = useAuth();
  const [selectedClass, setSelectedClass] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch available classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await api.get('/api/classes');
      setClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Error loading classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchStudentsByClass = async (classId, className) => {
    try {
      setLoading(true);
      const response = await api.get('/api/students', { params: { class_id: classId } });
      const list = response.data?.data || [];
      setAllStudents(list);
      filterStudentsByStatus(list, statusFilter);

      if (list.length === 0) toast.info(`No students found in ${className}`);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Error loading students');
      setAllStudents([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const filterStudentsByStatus = (studentList, status) => {
    if (status === 'all') {
      setStudents(studentList);
    } else {
      const filtered = studentList.filter(s => s.status === status);
      setStudents(filtered);
    }
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    filterStudentsByStatus(allStudents, status);
  };

  const handleClassSelect = (classItem) => {
    setSelectedClass(classItem);
    setIsDropdownOpen(false);
    fetchStudentsByClass(classItem.id, classItem.name);
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getClassesByForm = () => {
    const grouped = {};
    classes.forEach(cls => {
      // Extract form number from class name (e.g., "Form 1A" -> "Form 1")
      const match = cls.name.match(/^Form (\d+)/);
      if (match) {
        const formKey = `Form ${match[1]}`;
        if (!grouped[formKey]) {
          grouped[formKey] = [];
        }
        grouped[formKey].push(cls);
      } else {
        // Fallback for other naming conventions
        if (!grouped['Other']) {
          grouped['Other'] = [];
        }
        grouped['Other'].push(cls);
      }
    });
    return grouped;
  };

  const groupedClasses = getClassesByForm();

  return (
    <ViewStudentsContainer>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
      
      <Overlay>
        <MainContent>
          <HeaderSection>
            <h1>👨‍🎓 View Students</h1>
            <p>Select a class to view all enrolled students</p>
          </HeaderSection>

          <ControlsSection>
              <ClassDropdownContainer ref={dropdownRef}>
                <DropdownButton 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  $isOpen={isDropdownOpen}
                >
                <span>
                  {selectedClass ? selectedClass.name : 'Select Class'}
                </span>
                <i className="fas fa-chevron-down chevron"></i>
              </DropdownButton>

              <DropdownMenu $isOpen={isDropdownOpen}>
                {loadingClasses ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#4b5563' }}>
                    <i className="fas fa-spinner fa-spin"></i> Loading classes...
                  </div>
                ) : (
                  Object.entries(groupedClasses).map(([formName, formClasses]) => (
                    <FormGroup key={formName}>
                      <FormHeader>{formName}</FormHeader>
                      {formClasses.map((classItem) => (
                        <ClassOption 
                          key={classItem.id}
                          onClick={() => handleClassSelect(classItem)}
                        >
                          <div>
	                            <strong>{classItem.name}</strong>
	                            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '2px' }}>
	                              {classItem.current_students || classItem.student_count || 0} students enrolled
	                            </div>
	                          </div>
	                        </ClassOption>
                      ))}
                    </FormGroup>
                  ))
                )}
              </DropdownMenu>
            </ClassDropdownContainer>

            {selectedClass && (
              <StatusFilter>
                <StatusButton 
                  $active={statusFilter === 'active'}
                  onClick={() => handleStatusFilterChange('active')}
                >
                  ✓ Active
                </StatusButton>
                <StatusButton 
                  $active={statusFilter === 'transferred_out'}
                  onClick={() => handleStatusFilterChange('transferred_out')}
                >
                  ↗ Transferred Out
                </StatusButton>
                <StatusButton 
                  $active={statusFilter === 'graduated'}
                  onClick={() => handleStatusFilterChange('graduated')}
                >
                  🎓 Graduated
                </StatusButton>
                <StatusButton 
                  $active={statusFilter === 'all'}
                  onClick={() => handleStatusFilterChange('all')}
                >
                  📋 All
                </StatusButton>
              </StatusFilter>
            )}
          </ControlsSection>

          {selectedClass && (
            <StudentsSection>
              <SectionTitle>
                Students in {selectedClass.name}
                {!loading && ` (${students.length} ${students.length === 1 ? 'student' : 'students'})`}
              </SectionTitle>

              {loading ? (
                <LoadingSpinner>
                  <div className="spinner"></div>
                </LoadingSpinner>
              ) : students.length > 0 ? (
                <StudentsGrid>
                  {students.map((student) => (
                    <StudentCard key={student.id}>
                      <div className="student-avatar">
                        {getInitials(student.first_name, student.last_name)}
                      </div>
                      <div className="student-info">
                        <div className="student-name">
                          {student.first_name} {student.last_name}
                        </div>
                        <div className="student-details">
                          <div className="student-id">ID: {student.student_id}</div>
                          <div>Admission: {student.admission_number}</div>
                          <div>Gender: {student.gender}</div>
                          <div>Status: <span style={{ color: student.status === 'active' ? '#10b981' : '#f59e0b' }}>
                            {student.status}
                          </span></div>
                          {student.date_of_birth && (
                            <div>DOB: {new Date(student.date_of_birth).toLocaleDateString()}</div>
                          )}
                        </div>
                      </div>
                    </StudentCard>
                  ))}
                </StudentsGrid>
              ) : (
                <EmptyState>
                  <div className="empty-icon">👥</div>
                  <h3>No Students Found</h3>
                  <p>
                    There are no students currently enrolled in {selectedClass.name}.<br />
                    Students may not have been admitted to this class yet.
                  </p>
                </EmptyState>
              )}
            </StudentsSection>
          )}

          {!selectedClass && !loadingClasses && (
            <StudentsSection>
              <EmptyState>
                <div className="empty-icon">🎓</div>
                <h3>Select a Class</h3>
                <p>
                  Please select a class from the dropdown above to view enrolled students.<br />
                  You can choose from Form 1 through Form 4 with their respective sections.
                </p>
              </EmptyState>
            </StudentsSection>
          )}
        </MainContent>
      </Overlay>
    </ViewStudentsContainer>
  );
};

export default ViewStudents;
