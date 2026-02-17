import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
`;

const ModalContent = styled.div`
  background: #1e293b;
  border-radius: 16px;
  padding: 40px;
  max-width: 1000px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h2 {
    color: #60a5fa;
    margin: 0;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;

  &:hover {
    color: white;
  }
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  h3 {
    color: #60a5fa;
    margin: 0 0 20px 0;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const CurrentAssignments = styled.div`
  margin-bottom: 20px;
`;

const AssignmentCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  .assignment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .subject-info {
    color: white;
    font-weight: 600;
  }
  
  .class-info {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
    margin-bottom: 5px;
  }
  
  .assignment-meta {
    display: flex;
    gap: 15px;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
  }
`;

const PrimaryBadge = styled.span`
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
`;

const RemoveButton = styled.button`
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 15px;
  color: white;
  font-size: 14px;

  option {
    background: #1e293b;
    color: white;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;

const Checkbox = styled.input`
  accent-color: #3b82f6;
  transform: scale(1.2);
`;

const ClassSelection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 15px;
`;

const ClassCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${props => props.selected && `
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
  `}

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
  }

  .class-name {
    color: white;
    font-weight: 600;
    margin-bottom: 5px;
  }

  .class-details {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
`;

const Button = styled.button`
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

  &:hover {
    background: ${props => props.variant === 'primary' ? 
      'linear-gradient(135deg, #2563eb, #7c3aed)' : 
      'rgba(255, 255, 255, 0.2)'};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 40px 20px;
  
  i {
    font-size: 3rem;
    margin-bottom: 15px;
    opacity: 0.5;
    display: block;
  }
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const ConfirmContent = styled.div`
  background: linear-gradient(135deg, #1e293b, #334155);
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  max-width: 400px;
  width: 90%;
  
  h3 {
    color: #fbbf24;
    margin: 0 0 15px 0;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  p {
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 25px 0;
    line-height: 1.5;
  }
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const AssignSubjectsModal = ({ teacher, onClose, onSuccess }) => {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [isPrimary, setIsPrimary] = useState(false);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear());
  
  // Confirmation state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState(null);
  
  const { api } = useAuth();

  // Load data on mount
  useEffect(() => {
    if (teacher) {
      loadData();
    }
  }, [teacher]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [assignmentsRes, subjectsRes, classesRes] = await Promise.all([
        api.get(`/api/teachers/${teacher.id}/assignments`),
        api.get('/api/subjects'),
        api.get('/api/classes')
      ]);

      setAssignments(assignmentsRes.data.data || []);
      setSubjects(subjectsRes.data.data || []);
      setClasses(classesRes.data.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load assignment data');
    } finally {
      setDataLoading(false);
    }
  };

  const handleRemoveAssignment = (assignmentId) => {
    setAssignmentToRemove(assignmentId);
    setShowConfirmDialog(true);
  };
  
  const confirmRemoveAssignment = async () => {
    if (!assignmentToRemove) return;
    
    setShowConfirmDialog(false);
    setLoading(true);
    try {
      await api.delete(`/api/teachers/assignments/${assignmentToRemove}`);
      toast.success('Assignment removed successfully');
      loadData(); // Reload assignments
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('Failed to remove assignment');
    } finally {
      setLoading(false);
      setAssignmentToRemove(null);
    }
  };
  
  const cancelRemoveAssignment = () => {
    setShowConfirmDialog(false);
    setAssignmentToRemove(null);
  };

  const handleClassToggle = (classId) => {
    setSelectedClasses(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  const handleAddAssignment = async () => {
    if (!selectedSubject) {
      setError('Please select a subject');
      return;
    }
    if (selectedClasses.length === 0) {
      setError('Please select at least one class');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const assignmentData = {
        teacher_id: teacher.id,
        subject_id: selectedSubject,
        class_ids: selectedClasses,
        is_primary_teacher: isPrimary,
        academic_year: academicYear
      };

      await api.post('/api/teachers/assignments', assignmentData);
      toast.success('Assignments added successfully');
      
      // Reset form
      setSelectedSubject('');
      setSelectedClasses([]);
      setIsPrimary(false);
      
      // Reload assignments
      loadData();
      
    } catch (error) {
      console.error('Error adding assignments:', error);
      setError(error.response?.data?.message || 'Failed to add assignments');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableClasses = () => {
    if (!selectedSubject) return [];
    
    // Filter out classes that are already assigned for this subject
    const assignedClassIds = assignments
      .filter(assignment => assignment.subject_id === parseInt(selectedSubject))
      .map(assignment => assignment.class_id);
      
    return classes.filter(cls => !assignedClassIds.includes(cls.id));
  };

  if (dataLoading) {
    return (
      <Modal onClick={onClose}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <h2>
              <i className="fas fa-chalkboard-teacher"></i>
              Loading...
            </h2>
            <CloseButton onClick={onClose}>
              <i className="fas fa-times"></i>
            </CloseButton>
          </ModalHeader>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <LoadingSpinner />
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '15px' }}>
              Loading assignment data...
            </p>
          </div>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            <i className="fas fa-chalkboard-teacher"></i>
            Assign Subjects: {teacher?.first_name} {teacher?.last_name}
          </h2>
          <CloseButton onClick={onClose}>
            <i className="fas fa-times"></i>
          </CloseButton>
        </ModalHeader>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Current Assignments */}
        <Section>
          <h3>
            <i className="fas fa-list"></i>
            Current Assignments ({assignments.length})
          </h3>
          
          <CurrentAssignments>
            {assignments.length === 0 ? (
              <EmptyState>
                <i className="fas fa-clipboard-list"></i>
                <p>No subjects assigned yet</p>
              </EmptyState>
            ) : (
              assignments.map((assignment) => (
                <AssignmentCard key={assignment.id}>
                  <div className="assignment-header">
                    <div className="subject-info">
                      {assignment.subject_name} ({assignment.subject_code})
                      {assignment.is_primary_teacher && (
                        <PrimaryBadge style={{ marginLeft: '10px' }}>
                          Primary Teacher
                        </PrimaryBadge>
                      )}
                    </div>
                    <RemoveButton
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      disabled={loading}
                    >
                      {loading ? <LoadingSpinner /> : <i className="fas fa-trash"></i>}
                      Remove
                    </RemoveButton>
                  </div>
                  
                  <div className="class-info">
                    <i className="fas fa-users"></i>
                    Class: {assignment.class_name} (Level: {assignment.class_level})
                  </div>
                  
                  <div className="assignment-meta">
                    <span><i className="fas fa-calendar"></i> Academic Year: {assignment.academic_year}</span>
                    <span><i className="fas fa-clock"></i> Assigned: {new Date(assignment.created_at).toLocaleDateString()}</span>
                  </div>
                </AssignmentCard>
              ))
            )}
          </CurrentAssignments>
        </Section>

        {/* Add New Assignment */}
        <Section>
          <h3>
            <i className="fas fa-plus"></i>
            Add New Assignment
          </h3>

          <FormGrid>
            <FormGroup>
              <Label>Subject *</Label>
              <Select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedClasses([]); // Reset class selection
                }}
                disabled={loading}
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Academic Year</Label>
              <Select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                disabled={loading}
              >
                {Array.from({length: 5}, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </Select>
            </FormGroup>
          </FormGrid>

          {selectedSubject && (
            <>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="isPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  disabled={loading}
                />
                <Label htmlFor="isPrimary">Set as Primary Teacher for this subject</Label>
              </CheckboxGroup>

              <div>
                <Label>Select Classes for {subjects.find(s => s.id === parseInt(selectedSubject))?.name} *</Label>
                <ClassSelection>
                  {getAvailableClasses().map((cls) => (
                    <ClassCard
                      key={cls.id}
                      selected={selectedClasses.includes(cls.id)}
                      onClick={() => handleClassToggle(cls.id)}
                    >
                      <div className="class-name">{cls.name}</div>
                      <div className="class-details">
                        Level: {cls.level} | Capacity: {cls.capacity}
                      </div>
                    </ClassCard>
                  ))}
                </ClassSelection>
                
                {getAvailableClasses().length === 0 && selectedSubject && (
                  <EmptyState style={{ padding: '20px' }}>
                    <i className="fas fa-info-circle"></i>
                    <p>All classes are already assigned for this subject</p>
                  </EmptyState>
                )}
              </div>
            </>
          )}

          <ButtonGroup>
            <Button 
              type="button"
              onClick={handleAddAssignment}
              variant="primary"
              disabled={loading || !selectedSubject || selectedClasses.length === 0}
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-plus"></i>
                  Add Assignment
                </>
              )}
            </Button>
          </ButtonGroup>
        </Section>

        <ButtonGroup>
          <Button type="button" onClick={onClose}>
            <i className="fas fa-times"></i>
            Close
          </Button>
          <Button type="button" variant="primary" onClick={() => {
            onSuccess();
            onClose();
          }}>
            <i className="fas fa-check"></i>
            Done
          </Button>
        </ButtonGroup>
      </ModalContent>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog onClick={cancelRemoveAssignment}>
          <ConfirmContent onClick={(e) => e.stopPropagation()}>
            <h3>
              <i className="fas fa-exclamation-triangle"></i>
              Confirm Removal
            </h3>
            <p>
              Are you sure you want to remove this assignment? This action cannot be undone.
            </p>
            <ConfirmButtons>
              <Button type="button" onClick={cancelRemoveAssignment}>
                <i className="fas fa-times"></i>
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={confirmRemoveAssignment}
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                <i className="fas fa-trash"></i>
                Remove
              </Button>
            </ConfirmButtons>
          </ConfirmContent>
        </ConfirmDialog>
      )}
    </Modal>
  );
};

export default AssignSubjectsModal;
