import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', sans-serif;
  
  .desktop-only {
    display: block;
  }
  
  .mobile-only {
    display: none;
  }
  
  @media (max-width: 1024px) {
    .desktop-only {
      display: none;
    }
    
    .mobile-only {
      display: block;
    }
  }
  
  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const Header = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  text-align: center;

  h1 {
    margin: 0 0 10px 0;
    font-size: 2.5rem;
  }

  p {
    margin: 0;
    opacity: 0.9;
    font-size: 1.1rem;
  }
  
  @media (max-width: 768px) {
    padding: 20px;
    margin-bottom: 20px;
    
    h1 {
      font-size: 2rem;
    }
    
    p {
      font-size: 1rem;
    }
  }
  
  @media (max-width: 480px) {
    padding: 15px;
    border-radius: 8px;
    
    h1 {
      font-size: 1.75rem;
    }
    
    p {
      font-size: 0.9rem;
    }
  }
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  padding: 0 20px;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  margin: 0 10px;

  .step-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-right: 10px;
    background: ${props => props.active ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e2e8f0'};
    color: ${props => props.active ? 'white' : '#64748b'};
    border: 2px solid ${props => props.active ? '#667eea' : '#e2e8f0'};
    transition: all 0.3s ease;
  }

  .step-text {
    font-weight: ${props => props.active ? 'bold' : 'normal'};
    color: ${props => props.active ? '#667eea' : '#64748b'};
    white-space: nowrap;
  }

  &:not(:last-child)::after {
    content: '→';
    margin-left: 15px;
    color: #94a3b8;
    font-size: 1.2rem;
  }

  @media (max-width: 768px) {
    .step-text {
      display: none;
    }
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #374151;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
`;

const Button = styled.button`
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 120px;

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
  }

  &.secondary {
    background: #f3f4f6;
    color: #374151;

    &:hover:not(:disabled) {
      background: #e5e7eb;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const StudentsTable = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-top: 20px;
  
  @media (max-width: 768px) {
    border: none;
    border-radius: 0;
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 100px 80px 100px 1.5fr;
  gap: 15px;
  padding: 15px;
  background: #f8fafc;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;

  @media (max-width: 1024px) {
    grid-template-columns: 2fr 100px 80px 100px;
    gap: 10px;
    
    .desktop-only {
      display: none;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr 80px 60px 80px;
    padding: 12px 8px;
    font-size: 0.75rem;
    gap: 5px;
    min-height: 45px;
    align-items: center;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr 70px 50px 70px;
    padding: 10px 5px;
    font-size: 0.7rem;
    gap: 3px;
  }
`;

const StudentRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 100px 80px 100px 1.5fr;
  gap: 15px;
  padding: 15px;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #f8fafc;
  }

  @media (max-width: 1024px) {
    grid-template-columns: 2fr 100px 80px 100px;
    gap: 10px;
    
    .desktop-only {
      display: none;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr 80px 60px 80px;
    padding: 12px 8px;
    font-size: 0.8rem;
    gap: 5px;
    min-height: 60px;
    
    .mobile-only {
      display: block;
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 2px;
    }
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr 70px 50px 70px;
    padding: 10px 5px;
    font-size: 0.75rem;
    gap: 3px;
    min-height: 50px;
  }
  
  > div {
    overflow-wrap: break-word;
    word-wrap: break-word;
  }
`;

const MarksInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  transition: border-color 0.3s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &.invalid {
    border-color: #ef4444;
    background-color: #fef2f2;
  }

  @media (max-width: 768px) {
    padding: 6px 8px;
    font-size: 12px;
    min-height: 36px;
  }

  @media (max-width: 480px) {
    padding: 5px 6px;
    font-size: 11px;
    min-height: 32px;
  }
`;

const PresenceCheckbox = styled.input`
  width: 20px;
  height: 20px;
  cursor: pointer;
  
  @media (max-width: 768px) {
    width: 18px;
    height: 18px;
  }
  
  @media (max-width: 480px) {
    width: 16px;
    height: 16px;
  }
`;

// Helper function to calculate letter grade
const calculateLetterGrade = (marksObtained, maxMarks) => {
  if (!marksObtained || !maxMarks || maxMarks <= 0) return '';
  
  const percentage = (marksObtained / maxMarks) * 100;
  
  if (percentage >= 81) return 'A';
  if (percentage >= 61) return 'B';
  if (percentage >= 45) return 'C';
  if (percentage >= 30) return 'D';
  return 'F';
};

// Helper function to get automatic remark based on letter grade
const getAutomaticRemark = (letterGrade) => {
  switch (letterGrade) {
    case 'A': return 'Excellent!';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Poor';
    case 'F': return 'Bad';
    default: return '';
  }
};

const CreateAssessment = ({ onClose, onSuccess, restrictedExamTypes }) => {
  const { api, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Basic Information
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessmentData, setAssessmentData] = useState({
    class_id: '',
    subject_id: '',
    assessment_name: '',
    exam_type: '',
    assessment_date: '',
    max_marks: 100,
    pass_marks: 40,
    duration_minutes: 120,
    description: ''
  });

  // Step 2: Students and Marks
  const [students, setStudents] = useState([]);
  const [studentMarks, setStudentMarks] = useState({});
  const [createdAssessment, setCreatedAssessment] = useState(null);

  // Use restricted exam types if provided, otherwise use default
  const examTypes = restrictedExamTypes || [
    'mid-term exams',
    'terminal exams',
    'annual exams',
    'mock exams'
  ];

  const steps = [
    { number: 1, title: 'Assessment Info' },
    { number: 2, title: 'Enter Marks' }
  ];

  // Fetch teacher's classes on component mount
  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  // Fetch subjects when class is selected
  useEffect(() => {
    if (assessmentData.class_id) {
      fetchSubjectsForClass(assessmentData.class_id);
    }
  }, [assessmentData.class_id]);

  const fetchTeacherClasses = async () => {
    try {
      const response = await api.get('/api/assessments/teacher/classes');
      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const fetchSubjectsForClass = async (classId) => {
    try {
      const response = await api.get(`/api/assessments/teacher/subjects/${classId}`);
      if (response.data.success) {
        setSubjects(response.data.data);
        setAssessmentData(prev => ({ ...prev, subject_id: '' }));
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const fetchStudentsForClass = async (classId) => {
    try {
      const response = await api.get(`/api/assessments/class/${classId}/students`);
      if (response.data.success) {
        setStudents(response.data.data);
        
        // Initialize student marks
        const initialMarks = {};
        response.data.data.forEach(student => {
          initialMarks[student.id] = {
            student_id: student.id,
            marks_obtained: '', // Start with empty string
            is_present: true,
            remarks: ''
          };
        });
        setStudentMarks(initialMarks);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const handleInputChange = (field, value) => {
    setAssessmentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMarkChange = (studentId, field, value) => {
    setStudentMarks(prev => {
      const updatedMarks = {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [field]: value
        }
      };
      
      // If marks_obtained changed, automatically calculate and set remarks
      if (field === 'marks_obtained' && value) {
        const letterGrade = calculateLetterGrade(value, assessmentData.max_marks);
        const automaticRemark = getAutomaticRemark(letterGrade);
        
        // Only set automatic remark if current remark is empty or was previously auto-generated
        const currentRemark = prev[studentId]?.remarks || '';
        const isAutoRemark = ['Excellent!', 'Good', 'Average', 'Poor', 'Bad'].includes(currentRemark);
        
        if (!currentRemark || isAutoRemark) {
          updatedMarks[studentId].remarks = automaticRemark;
        }
      }
      
      return updatedMarks;
    });
  };

  const validateStep1 = () => {
    const required = ['class_id', 'subject_id', 'assessment_name', 'exam_type', 'assessment_date'];
    for (let field of required) {
      if (!assessmentData[field]) {
        toast.error(`Please fill in all required fields`);
        return false;
      }
    }
    
    if (assessmentData.max_marks <= 0 || assessmentData.pass_marks <= 0) {
      toast.error('Marks must be greater than 0');
      return false;
    }
    
    if (assessmentData.pass_marks > assessmentData.max_marks) {
      toast.error('Pass marks cannot be greater than maximum marks');
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (!validateStep1()) return;
      
      setLoading(true);
      try {
        // Convert string values to proper types before sending
        const payload = {
          ...assessmentData,
          class_id: parseInt(assessmentData.class_id),
          subject_id: parseInt(assessmentData.subject_id),
          max_marks: parseInt(assessmentData.max_marks),
          pass_marks: parseInt(assessmentData.pass_marks),
          duration_minutes: parseInt(assessmentData.duration_minutes),
          // Ensure date is in ISO format
          assessment_date: new Date(assessmentData.assessment_date).toISOString(),
          // Handle empty description
          description: assessmentData.description.trim() || null
        };
        
        console.log('🔍 DEBUG: Sending assessment payload:', payload);
        
        // Create assessment
        const response = await api.post('/api/assessments', payload);
        if (response.data.success) {
          setCreatedAssessment(response.data.data);
          await fetchStudentsForClass(assessmentData.class_id);
          setCurrentStep(2);
          toast.success('Assessment created! Now enter student marks.');
        }
      } catch (error) {
        console.error('❌ DEBUG: Error creating assessment:', error);
        console.error('❌ DEBUG: Error response:', error.response?.data);
        console.error('❌ DEBUG: Error status:', error.response?.status);
        
        // Show detailed validation errors if available
        if (error.response?.data?.errors) {
          console.error('❌ DEBUG: Validation errors:', error.response.data.errors);
          toast.error(`Validation failed: ${error.response.data.errors.join(', ')}`);
        } else {
          toast.error(error.response?.data?.message || 'Failed to create assessment');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmitMarks = async () => {
    setLoading(true);
    try {
      console.log('🔍 DEBUG: Current studentMarks state:', studentMarks);
      console.log('🔍 DEBUG: Assessment max marks:', assessmentData.max_marks);
      
      // Check if any marks were actually entered
      const hasValidMarks = Object.values(studentMarks).some(mark => 
        mark.marks_obtained && parseFloat(mark.marks_obtained) > 0
      );
      
      if (!hasValidMarks) {
        toast.error('Please enter marks for at least one student before saving.');
        setLoading(false);
        return;
      }
      
      // Prepare marks array with calculated grades and remarks from the form
      const marksArray = Object.values(studentMarks).map(mark => {
        const marksObtained = parseFloat(mark.marks_obtained) || 0;
        const letterGrade = calculateLetterGrade(marksObtained, assessmentData.max_marks);
        const finalRemarks = mark.remarks || getAutomaticRemark(letterGrade);
        
        return {
          student_id: parseInt(mark.student_id),
          marks_obtained: marksObtained,
          is_present: mark.is_present !== false, // Default to true if not explicitly false
          remarks: finalRemarks,
          grade: letterGrade
        };
      });
      
      console.log('🔍 DEBUG: Prepared marks array for saving:', marksArray);
      
      // Validate marks
      const invalidMarks = marksArray.filter(mark => 
        mark.marks_obtained < 0 || mark.marks_obtained > assessmentData.max_marks
      );
      
      if (invalidMarks.length > 0) {
        toast.error(`Marks must be between 0 and ${assessmentData.max_marks}`);
        setLoading(false);
        return;
      }

      console.log('🔍 DEBUG: Sending API request to save marks for assessment ID:', createdAssessment.id);

      const response = await api.put(`/api/assessments/${createdAssessment.id}/marks`, {
        student_marks: marksArray
      });

      console.log('🔍 DEBUG: API response:', response.data);

      if (response.data.success) {
        toast.success('Assessment saved successfully with marks, grades, and remarks!');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }
    } catch (error) {
      console.error('❌ ERROR saving marks:', error);
      console.error('❌ ERROR response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to save assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Container>
      <Header>
        <h1>📝 Create Assessment</h1>
        <p>Create and manage assessments for your students</p>
      </Header>

      <StepIndicator>
        {steps.map(step => (
          <Step key={step.number} active={currentStep === step.number}>
            <div className="step-circle">{step.number}</div>
            <div className="step-text">{step.title}</div>
          </Step>
        ))}
      </StepIndicator>

      {currentStep === 1 && (
        <Card>
          <h3 style={{ marginBottom: '30px', color: '#374151' }}>Assessment Information</h3>
          
          <FormGrid>
            <FormGroup>
              <Label>Class *</Label>
              <Select
                value={assessmentData.class_id}
                onChange={(e) => handleInputChange('class_id', e.target.value)}
                disabled={loading}
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} (Form {cls.level})
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Subject *</Label>
              <Select
                value={assessmentData.subject_id}
                onChange={(e) => handleInputChange('subject_id', e.target.value)}
                disabled={loading || !assessmentData.class_id}
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </Select>
            </FormGroup>
          </FormGrid>

          <FormGrid>
            <FormGroup>
              <Label>Assessment Name *</Label>
              <Input
                type="text"
                value={assessmentData.assessment_name}
                onChange={(e) => handleInputChange('assessment_name', e.target.value)}
                placeholder="e.g., Mathematics Mid-Term Exam"
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <Label>Exam Type *</Label>
              <Select
                value={assessmentData.exam_type}
                onChange={(e) => handleInputChange('exam_type', e.target.value)}
                disabled={loading}
              >
                <option value="">Select Exam Type</option>
                {examTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Select>
            </FormGroup>
          </FormGrid>

          <FormGrid>
            <FormGroup>
              <Label>Assessment Date *</Label>
              <Input
                type="date"
                value={assessmentData.assessment_date}
                onChange={(e) => handleInputChange('assessment_date', e.target.value)}
                min={getTomorrowDate()}
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={assessmentData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value))}
                min="30"
                max="480"
                disabled={loading}
              />
            </FormGroup>
          </FormGrid>

          <FormGrid>
            <FormGroup>
              <Label>Maximum Marks</Label>
              <Input
                type="number"
                value={assessmentData.max_marks}
                onChange={(e) => handleInputChange('max_marks', parseInt(e.target.value))}
                min="1"
                max="1000"
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <Label>Pass Marks</Label>
              <Input
                type="number"
                value={assessmentData.pass_marks}
                onChange={(e) => handleInputChange('pass_marks', parseInt(e.target.value))}
                min="1"
                max={assessmentData.max_marks}
                disabled={loading}
              />
            </FormGroup>
          </FormGrid>

          <FormGroup>
            <Label>Description (Optional)</Label>
            <TextArea
              value={assessmentData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional information about this assessment..."
              disabled={loading}
            />
          </FormGroup>

          <ButtonGroup>
            <Button type="button" className="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className="primary" 
              onClick={handleNext}
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Assessment'}
            </Button>
          </ButtonGroup>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <h3 style={{ marginBottom: '20px', color: '#374151' }}>
            Enter Marks - {createdAssessment?.assessment_name}
          </h3>
          
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
            <strong>Assessment Details:</strong><br />
            Class: {createdAssessment?.class_name} | Subject: {createdAssessment?.subject_name}<br />
            Maximum Marks: {assessmentData.max_marks} | Pass Marks: {assessmentData.pass_marks}
          </div>

          <StudentsTable>
            <TableHeader>
              <div>
                <span className="desktop-only">Student Name</span>
                <span className="mobile-only">Student</span>
              </div>
              <div className="desktop-only">Admission No.</div>
              <div>
                <span className="desktop-only">Marks (/{assessmentData.max_marks})</span>
                <span className="mobile-only">Marks</span>
              </div>
              <div>Grade</div>
              <div>
                <span className="desktop-only">Present</span>
                <span className="mobile-only">P</span>
              </div>
              <div className="desktop-only">Remarks</div>
            </TableHeader>

            {students.map(student => (
              <StudentRow key={student.id}>
                <div>
                  {student.first_name} {student.last_name}
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }} className="mobile-only">
                    {student.admission_number}
                  </div>
                </div>
                <div className="desktop-only">{student.admission_number}</div>
                <div>
                  <MarksInput
                    type="number"
                    min="0"
                    max={assessmentData.max_marks}
                    value={studentMarks[student.id]?.marks_obtained || ''}
                    onChange={(e) => handleMarkChange(student.id, 'marks_obtained', e.target.value)}
                    className={studentMarks[student.id]?.marks_obtained > assessmentData.max_marks ? 'invalid' : ''}
                    disabled={loading}
                    placeholder="Enter marks..."
                  />
                </div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#667eea' }}>
                  {calculateLetterGrade(
                    studentMarks[student.id]?.marks_obtained || 0,
                    assessmentData.max_marks
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <PresenceCheckbox
                    type="checkbox"
                    checked={studentMarks[student.id]?.is_present || false}
                    onChange={(e) => handleMarkChange(student.id, 'is_present', e.target.checked)}
                    disabled={loading}
                  />
                </div>
                <div className="desktop-only">
                  <Input
                    type="text"
                    value={studentMarks[student.id]?.remarks || ''}
                    onChange={(e) => handleMarkChange(student.id, 'remarks', e.target.value)}
                    placeholder="Optional remarks..."
                    style={{ fontSize: '14px', padding: '6px 8px' }}
                    disabled={loading}
                  />
                </div>
              </StudentRow>
            ))}
          </StudentsTable>

          <ButtonGroup>
            <Button type="button" className="secondary" onClick={handleBack}>
              Back
            </Button>
            <Button 
              type="button" 
              className="primary" 
              onClick={handleSubmitMarks}
              disabled={loading}
            >
              {loading ? 'Saving Assessment...' : 'Save Assessment'}
            </Button>
          </ButtonGroup>
        </Card>
      )}
    </Container>
  );
};

export default CreateAssessment;
