import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  width: 100%;
  box-sizing: border-box;
  background: #f5f7fb;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 20px;
  }

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
`;

const Title = styled.h1`
  color: #111827;
  font-size: 2.25rem;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.75rem;
  }
`;

const Subtitle = styled.p`
  color: #6b7280;
  font-size: 1.05rem;
`;

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 10px;
  
  @media (max-width: 480px) {
    padding: 0 10px;
  }
`;

const Tab = styled.button`
  background: ${props => (props.$active ? '#3498db' : '#ecf0f1')};
  color: ${props => (props.$active ? 'white' : '#2c3e50')};
  border: none;
  padding: 15px 30px;
  margin: 0 5px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  min-height: 44px;
  white-space: nowrap;

  &:hover {
    background: ${props => (props.$active ? '#2980b9' : '#bdc3c7')};
    transform: translateY(-2px);
  }
  
  @media (max-width: 480px) {
    padding: 12px 20px;
    font-size: 0.9rem;
    margin: 0 2px;
  }
`;

const Card = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 20px;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 20px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(250px, 1fr))'};
  gap: 20px;
  width: 100%;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  @media (max-width: 480px) {
    gap: 12px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-weight: 600;
  margin-bottom: 8px;
  color: #374151;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  color: #111827;
  background-color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
  }

  &:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
    color: #9ca3af;
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  background: #ffffff;
  color: #111827;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 100px;
  color: #111827;
  background-color: #ffffff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.12);
  }
`;

const Button = styled.button`
  background: ${props => props.secondary 
    ? '#e5e7eb' 
    : 'linear-gradient(135deg, #2563eb, #1d4ed8)'};
  color: ${props => props.secondary ? '#374151' : '#ffffff'};
  border: none;
  padding: 12px 24px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.secondary 
      ? '#d1d5db' 
      : 'linear-gradient(135deg, #1d4ed8, #1e40af)'};
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
  }

  &:disabled {
    background: #e5e7eb;
    color: #9ca3af;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SearchInput = styled(Input)`
  flex: 1;
  min-width: 200px;
`;

const StudentCard = styled.div`
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: #2563eb;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
    transform: translateY(-2px);
  }

  ${props => props.selected && `
    border-color: #16a34a;
    box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.3);
  `}
`;

const StudentInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`;

const StudentName = styled.h4`
  color: #111827;
  margin: 0 0 5px 0;
`;

const StudentDetails = styled.p`
  color: #6b7280;
  margin: 0;
  font-size: 0.9rem;
`;

const Badge = styled.span`
  background: ${props => {
    switch(props.type) {
      case 'active': return '#27ae60';
      case 'promoted': return '#3498db';
      case 'repeated': return '#f39c12';
      default: return '#95a5a6';
    }
  }};
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  div {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StudentAdmission = () => {
  const { api, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('new');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]); // Form 1 & 5 for new registration
  const [allClasses, setAllClasses] = useState([]); // All classes for promotion
  const [academicYears, setAcademicYears] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // New student form data
  const [newStudentData, setNewStudentData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    class_id: '',
    academic_year: '',
    year_of_study: new Date().getFullYear().toString(),
    blood_group: '',
    nationality: 'Tanzanian',
    religion: '',
    medical_conditions: '',
    supervisor: {
      first_name: '',
      last_name: '',
      relationship: '',
      phone: '',
      email: '',
      address: '',
      occupation: '',
      workplace: ''
    }
  });

  // Promotion form data
  const [promotionData, setPromotionData] = useState({
    new_class_id: '',
    new_academic_year: '',
    status: 'promoted',
    remarks: ''
  });

  // Transfer data
  const [transferData, setTransferData] = useState({
    transfer_type: 'in', // 'in' or 'out'
    from_school: '',
    to_school: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reason: '',
    documents: ''
  });

  useEffect(() => {
    if (!isAdmin) return;
    fetchClasses();
    fetchAllClasses();
    fetchAcademicYears();
  }, [isAdmin]);

  useEffect(() => {
    if (activeTab === 'existing') {
      searchStudents();
    }
  }, [activeTab, searchQuery, filterClass, filterYear]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/students/classes');
      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const fetchAllClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.data.success) {
        setAllClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching all classes:', error);
      toast.error('Failed to load classes for promotion');
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await api.get('/api/students/academic-years');
      if (response.data.success) {
        setAcademicYears(response.data.data);
        // Set current academic year as default
        const currentYear = response.data.data.find(year => year.is_current);
        if (currentYear) {
          setNewStudentData(prev => ({ ...prev, academic_year: currentYear.year_name }));
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      toast.error('Failed to load academic years');
    }
  };

  const searchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (filterClass) params.append('class_id', filterClass);
      if (filterYear) params.append('academic_year', filterYear);
      
      const response = await api.get(`/api/students/search?${params.toString()}`);
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error searching students:', error);
      toast.error('Failed to search students');
    } finally {
      setLoading(false);
    }
  };

	  const handleNewStudentSubmit = async (e) => {
	    e.preventDefault();
	    try {
	      setLoading(true);

	      // Frontend validation (match backend Joi rules) for clearer errors
	      const phoneRegex = /^(\+255|0)[67]\d{8}$/;
	      if (!newStudentData.class_id) {
	        toast.error('Please select a class');
	        return;
	      }
	      if (!newStudentData.academic_year) {
	        toast.error('Please select an academic year');
	        return;
	      }
	      if (!/^\d{4}-\d{4}$/.test(String(newStudentData.academic_year))) {
	        toast.error('Academic year must be in the format YYYY-YYYY (e.g., 2025-2026)');
	        return;
	      }
	      if (!newStudentData.supervisor?.first_name || !newStudentData.supervisor?.last_name) {
	        toast.error('Please fill supervisor/guardian first and last name');
	        return;
	      }
	      if (!newStudentData.supervisor?.relationship) {
	        toast.error('Please select the supervisor/guardian relationship');
	        return;
	      }
	      if (!newStudentData.supervisor?.phone || !phoneRegex.test(String(newStudentData.supervisor.phone).trim())) {
	        toast.error('Supervisor phone must be like 07XXXXXXXX or +2557XXXXXXXX');
	        return;
	      }
	      
	      // Format the data before sending
	      const { phone, email, address, ...dataWithoutContact } = newStudentData;
	      const classId = Number(newStudentData.class_id);
	      const yearOfStudy = Number(newStudentData.year_of_study);
	      const formattedData = {
	        ...dataWithoutContact,
	        class_id: Number.isFinite(classId) ? classId : null, // Convert to number
	        year_of_study: Number.isFinite(yearOfStudy) ? yearOfStudy : null, // Convert to number
	        // Remove empty optional fields to avoid validation issues
	        blood_group: newStudentData.blood_group || undefined,
	        religion: newStudentData.religion || undefined,
	        medical_conditions: newStudentData.medical_conditions || undefined,
        supervisor: {
          ...newStudentData.supervisor,
          email: newStudentData.supervisor.email || undefined,
          address: newStudentData.supervisor.address || undefined,
          occupation: newStudentData.supervisor.occupation || undefined,
          workplace: newStudentData.supervisor.workplace || undefined
        }
      };
      
      console.log('Sending student data:', formattedData); // Debug log
      console.log('API endpoint:', '/api/students/admit');
      const response = await api.post('/api/students/admit', formattedData);
      
      if (response.data.success) {
        toast.success('Student admitted successfully!');
        
        // Show admission details
        const { data } = response.data;
        const admissionNumber = data.admission_number || data.admissionNumber;
        const tempPassword = data.parent_temp_password;

        const copy = async (text, label) => {
          try {
            await navigator.clipboard.writeText(String(text));
            toast.success(`${label} copied`);
          } catch (_e) {
            toast.info(`Copy manually: ${text}`);
          }
        };

        if (admissionNumber && tempPassword) {
          toast.info(
            ({ closeToast }) => (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontWeight: 800 }}>Parent / Guardian Login</div>
                <div style={{ fontSize: 13 }}>
                  Give these to the parent/guardian. Password is shown once.
                </div>
                <div style={{ fontSize: 13 }}>
                  <div>
                    <strong>Admission No:</strong> {admissionNumber}{' '}
                    <button
                      type="button"
                      onClick={() => copy(admissionNumber, 'Admission number')}
                      style={{ marginLeft: 8 }}
                    >
                      Copy
                    </button>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Temporary Password:</strong> {tempPassword}{' '}
                    <button
                      type="button"
                      onClick={() => copy(tempPassword, 'Temporary password')}
                      style={{ marginLeft: 8 }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={closeToast}>
                    Close
                  </button>
                </div>
              </div>
            ),
            { autoClose: false }
          );
        } else {
          toast.info('Student registered. Parent credentials were not returned.', { autoClose: 8000 });
        }

        // Reset form
        setNewStudentData({
          first_name: '',
          last_name: '',
          date_of_birth: '',
          gender: '',
          class_id: '',
          academic_year: academicYears.find(year => year.is_current)?.year_name || '',
          year_of_study: new Date().getFullYear().toString(),
          blood_group: '',
          nationality: 'Tanzanian',
          religion: '',
          medical_conditions: '',
          supervisor: {
            first_name: '',
            last_name: '',
            relationship: '',
            phone: '',
            email: '',
            address: '',
            occupation: '',
            workplace: ''
          }
        });
      }
	    } catch (error) {
	      console.error('Error admitting student:', error);
	      console.error('Error response data:', error.response?.data);
	      console.error('Error response status:', error.response?.status);
	      console.error('Error message:', error.message);
	      
	      // Show detailed validation errors if available
	      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
	        toast.error(
	          <div style={{ maxWidth: 420 }}>
	            <div style={{ fontWeight: 800, marginBottom: 6 }}>Validation failed</div>
	            <ul style={{ margin: 0, paddingLeft: 18 }}>
	              {error.response.data.errors.map((msg, idx) => (
	                <li key={idx} style={{ marginBottom: 4 }}>
	                  {msg}
	                </li>
	              ))}
	            </ul>
	          </div>,
	          { autoClose: 12000 }
	        );
	      } else if (error.response?.data?.message) {
	        toast.error(`Server Error: ${error.response.data.message}`);
	      } else if (error.response?.status === 500) {
	        toast.error('Internal Server Error. Please check the server logs.');
	      } else if (error.code === 'ERR_NETWORK') {
        toast.error('Network Error: Cannot connect to server. Please ensure the server is running.');
      } else {
        toast.error(`Failed to admit student: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePromotionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student to promote');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/students/promote', {
        student_id: selectedStudent.id,
        ...promotionData
      });
      
      if (response.data.success) {
        toast.success(`Student ${promotionData.status} successfully!`);
        
        // Reset form and refresh student list
        setPromotionData({
          new_class_id: '',
          new_academic_year: '',
          status: 'promoted',
          remarks: ''
        });
        setSelectedStudent(null);
        searchStudents();
      }
    } catch (error) {
      console.error('Error promoting student:', error);
      const errorMsg = error.response?.data?.message || 'Failed to promote student';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleNewStudentChange = (field, value) => {
    if (field.includes('supervisor.')) {
      const supervisorField = field.split('.')[1];
      setNewStudentData(prev => ({
        ...prev,
        supervisor: {
          ...prev.supervisor,
          [supervisorField]: value
        }
      }));
    } else {
      setNewStudentData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleTransferIn = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/students/transfer-in', {
        student_id: selectedStudent.id,
        from_school: transferData.from_school,
        transfer_date: transferData.transfer_date,
        reason: transferData.reason,
        documents: transferData.documents,
        class_id: transferData.class_id
      });
      
      if (response.data.success) {
        toast.success('Student transferred in successfully!');
        setTransferData({
          transfer_type: 'in',
          from_school: '',
          to_school: '',
          transfer_date: new Date().toISOString().split('T')[0],
          reason: '',
          documents: '',
          class_id: ''
        });
        setSelectedStudent(null);
        searchStudents();
      }
    } catch (error) {
      console.error('Error transferring student in:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer student in');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferOut = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student to transfer');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/api/students/transfer-out', {
        student_id: selectedStudent.id,
        to_school: transferData.to_school,
        transfer_date: transferData.transfer_date,
        reason: transferData.reason,
        documents: transferData.documents
      });
      
      if (response.data.success) {
        toast.success('Student transferred out successfully!');
        setTransferData({
          transfer_type: 'out',
          from_school: '',
          to_school: '',
          transfer_date: new Date().toISOString().split('T')[0],
          reason: '',
          documents: ''
        });
        setSelectedStudent(null);
        searchStudents();
      }
    } catch (error) {
      console.error('Error transferring student out:', error);
      toast.error(error.response?.data?.message || 'Failed to transfer student out');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Container>
        <Header>
          <Title>Student Admission</Title>
          <Subtitle>Enroll new students and manage academic year transitions</Subtitle>
        </Header>

        <Card>
          <h2 style={{ color: '#111827', marginBottom: '8px' }}>Access denied</h2>
          <div style={{ color: '#6b7280' }}>Student Admission is available to Admin/Registrar only.</div>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Student Admission</Title>
        <Subtitle>Enroll new students and manage academic year transitions</Subtitle>
      </Header>

      <TabContainer>
        <Tab $active={activeTab === 'new'} onClick={() => setActiveTab('new')}>
          New Student Registration
        </Tab>
        <Tab $active={activeTab === 'existing'} onClick={() => setActiveTab('existing')}>
          Existing Student Promotion
        </Tab>
        <Tab $active={activeTab === 'transfer-in'} onClick={() => setActiveTab('transfer-in')}>
          Transfer In
        </Tab>
        <Tab $active={activeTab === 'transfer-out'} onClick={() => setActiveTab('transfer-out')}>
          Transfer Out
        </Tab>
      </TabContainer>

      {activeTab === 'new' && (
        <Card>
          <h2 style={{ color: '#111827', marginBottom: '20px' }}>New Student Registration</h2>
          <Form onSubmit={handleNewStudentSubmit}>
            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Personal Information</h3>
            <Row>
              <FormGroup>
                <Label>First Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.first_name}
                  onChange={(e) => handleNewStudentChange('first_name', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Last Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.last_name}
                  onChange={(e) => handleNewStudentChange('last_name', e.target.value)}
                  required
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={newStudentData.date_of_birth}
                  onChange={(e) => handleNewStudentChange('date_of_birth', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Gender *</Label>
                <Select
                  value={newStudentData.gender}
                  onChange={(e) => handleNewStudentChange('gender', e.target.value)}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Select>
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Blood Group</Label>
                <Select
                  value={newStudentData.blood_group}
                  onChange={(e) => handleNewStudentChange('blood_group', e.target.value)}
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Religion</Label>
                <Input
                  type="text"
                  value={newStudentData.religion}
                  onChange={(e) => handleNewStudentChange('religion', e.target.value)}
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Nationality</Label>
                <Input
                  type="text"
                  value={newStudentData.nationality}
                  onChange={(e) => handleNewStudentChange('nationality', e.target.value)}
                />
              </FormGroup>
            </Row>

            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Academic Information</h3>
            <Row>
              <FormGroup>
                <Label>Class *</Label>
                <Select
                  value={newStudentData.class_id}
                  onChange={(e) => handleNewStudentChange('class_id', e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Level {cls.level}) - {cls.current_students}/{cls.capacity} students
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Academic Year *</Label>
                <Select
                  value={newStudentData.academic_year}
                  onChange={(e) => handleNewStudentChange('academic_year', e.target.value)}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.year_name}>
                      {year.year_name} {year.is_current && '(Current)'}
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Year of Study *</Label>
                <Select
                  value={newStudentData.year_of_study}
                  onChange={(e) => handleNewStudentChange('year_of_study', e.target.value)}
                  required
                >
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const years = [];
                    for (let i = currentYear - 3; i <= currentYear + 3; i++) {
                      years.push(
                        <option key={i} value={i.toString()}>
                          {i} {i === currentYear && '(Current)'}
                        </option>
                      );
                    }
                    return years;
                  })()}
                </Select>
              </FormGroup>
            </Row>


            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Supervisor/Guardian Information</h3>
            <Row>
              <FormGroup>
                <Label>Supervisor First Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.supervisor.first_name}
                  onChange={(e) => handleNewStudentChange('supervisor.first_name', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Supervisor Last Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.supervisor.last_name}
                  onChange={(e) => handleNewStudentChange('supervisor.last_name', e.target.value)}
                  required
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Relationship *</Label>
                <Select
                  value={newStudentData.supervisor.relationship}
                  onChange={(e) => handleNewStudentChange('supervisor.relationship', e.target.value)}
                  required
                >
                  <option value="">Select Relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Supervisor Phone *</Label>
                <Input
                  type="tel"
                  value={newStudentData.supervisor.phone}
                  onChange={(e) => handleNewStudentChange('supervisor.phone', e.target.value)}
                  placeholder="e.g., +255789123456"
                  required
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Supervisor Email</Label>
                <Input
                  type="email"
                  value={newStudentData.supervisor.email}
                  onChange={(e) => handleNewStudentChange('supervisor.email', e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>Occupation</Label>
                <Input
                  type="text"
                  value={newStudentData.supervisor.occupation}
                  onChange={(e) => handleNewStudentChange('supervisor.occupation', e.target.value)}
                />
              </FormGroup>
            </Row>

            <FormGroup>
              <Label>Medical Conditions</Label>
              <TextArea
                value={newStudentData.medical_conditions}
                onChange={(e) => handleNewStudentChange('medical_conditions', e.target.value)}
                placeholder="Any medical conditions or allergies"
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={loading}>
                {loading ? 'Registering...' : 'Register Student'}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {activeTab === 'existing' && (
        <>
          <Card>
            <h2 style={{ color: '#111827', marginBottom: '20px' }}>Search Students for Promotion</h2>
            <SearchContainer>
              <SearchInput
                type="text"
                placeholder="Search by name, student ID, or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {allClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </Select>
              <Select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="">All Academic Years</option>
                {academicYears.map(year => (
                  <option key={year.id} value={year.year_name}>{year.year_name}</option>
                ))}
              </Select>
            </SearchContainer>

            {loading ? (
              <LoadingSpinner><div /></LoadingSpinner>
            ) : (
              <div>
                {students.map(student => (
                  <StudentCard
                    key={student.id}
                    selected={selectedStudent?.id === student.id}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <StudentInfo>
                      <div>
                        <StudentName>{student.first_name} {student.last_name}</StudentName>
                        <StudentDetails>
                          ID: {student.student_id} | Admission: {student.admission_number} | 
                          Class: {student.current_class} | Level: {student.current_level}
                        </StudentDetails>
                      </div>
                      <Badge type={student.status}>{student.status.toUpperCase()}</Badge>
                    </StudentInfo>
                  </StudentCard>
                ))}
                {!loading && students.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No students found matching your criteria
                  </div>
                )}
              </div>
            )}
          </Card>

          {selectedStudent && (
            <Card>
              <h2 style={{ color: '#111827', marginBottom: '20px' }}>
                Promote {selectedStudent.first_name} {selectedStudent.last_name}
              </h2>
              <Form onSubmit={handlePromotionSubmit}>
                <Row>
                  <FormGroup>
                    <Label>New Class *</Label>
                    <Select
                      value={promotionData.new_class_id}
                      onChange={(e) => setPromotionData(prev => ({ ...prev, new_class_id: e.target.value }))}
                      required
                    >
                      <option value="">Select New Class</option>
                      {allClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} (Level {cls.level}) - {cls.student_count}/{cls.capacity} students
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>New Academic Year *</Label>
                    <Select
                      value={promotionData.new_academic_year}
                      onChange={(e) => setPromotionData(prev => ({ ...prev, new_academic_year: e.target.value }))}
                      required
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map(year => (
                        <option key={year.id} value={year.year_name}>
                          {year.year_name} {year.is_current && '(Current)'}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                </Row>

                <FormGroup>
                  <Label>Status</Label>
                  <Select
                    value={promotionData.status}
                    onChange={(e) => setPromotionData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="promoted">Promoted</option>
                    <option value="repeated">Repeated</option>
                    <option value="transferred">Transferred</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Remarks</Label>
                  <TextArea
                    value={promotionData.remarks}
                    onChange={(e) => setPromotionData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Any remarks about this academic transition"
                  />
                </FormGroup>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                  <Button 
                    type="button" 
                    secondary 
                    onClick={() => setSelectedStudent(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : `${promotionData.status} Student`}
                  </Button>
                </div>
              </Form>
            </Card>
          )}
        </>
      )}

      {activeTab === 'transfer-in' && (
        <Card>
          <h2 style={{ color: '#111827', marginBottom: '20px' }}>Transfer In - Register Student from Another School</h2>
          <Form onSubmit={handleNewStudentSubmit}>
            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Student Information</h3>
            <Row>
              <FormGroup>
                <Label>First Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.first_name}
                  onChange={(e) => handleNewStudentChange('first_name', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Last Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.last_name}
                  onChange={(e) => handleNewStudentChange('last_name', e.target.value)}
                  required
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Date of Birth *</Label>
                <Input
                  type="date"
                  value={newStudentData.date_of_birth}
                  onChange={(e) => handleNewStudentChange('date_of_birth', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Gender *</Label>
                <Select
                  value={newStudentData.gender}
                  onChange={(e) => handleNewStudentChange('gender', e.target.value)}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </Select>
              </FormGroup>
            </Row>

            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Transfer Information</h3>
            <Row>
              <FormGroup>
                <Label>Previous School Name *</Label>
                <Input
                  type="text"
                  placeholder="Name of the school student is transferring from"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Transfer Date *</Label>
                <Input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                />
              </FormGroup>
            </Row>

            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Class Assignment</h3>
            <Row>
              <FormGroup>
                <Label>Assign to Class *</Label>
                <Select
                  value={newStudentData.class_id}
                  onChange={(e) => handleNewStudentChange('class_id', e.target.value)}
                  required
                >
                  <option value="">Select Class</option>
                  {allClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} (Level {cls.level}) - {cls.student_count}/{cls.capacity} students
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Academic Year *</Label>
                <Select
                  value={newStudentData.academic_year}
                  onChange={(e) => handleNewStudentChange('academic_year', e.target.value)}
                  required
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.year_name}>
                      {year.year_name} {year.is_current && '(Current)'}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </Row>

            <h3 style={{ color: '#60a5fa', margin: '20px 0 15px 0' }}>Supervisor/Guardian Information</h3>
            <Row>
              <FormGroup>
                <Label>Supervisor First Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.supervisor.first_name}
                  onChange={(e) => handleNewStudentChange('supervisor.first_name', e.target.value)}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Supervisor Last Name *</Label>
                <Input
                  type="text"
                  value={newStudentData.supervisor.last_name}
                  onChange={(e) => handleNewStudentChange('supervisor.last_name', e.target.value)}
                  required
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Relationship *</Label>
                <Select
                  value={newStudentData.supervisor.relationship}
                  onChange={(e) => handleNewStudentChange('supervisor.relationship', e.target.value)}
                  required
                >
                  <option value="">Select Relationship</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                  <option value="Uncle">Uncle</option>
                  <option value="Aunt">Aunt</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Supervisor Phone *</Label>
                <Input
                  type="tel"
                  value={newStudentData.supervisor.phone}
                  onChange={(e) => handleNewStudentChange('supervisor.phone', e.target.value)}
                  placeholder="e.g., +255789123456"
                  required
                />
              </FormGroup>
            </Row>

            <FormGroup>
              <Label>Reason for Transfer</Label>
              <TextArea
                placeholder="Reason for transferring to UBUNIFU SEC"
              />
            </FormGroup>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={loading}>
                {loading ? 'Processing Transfer...' : 'Complete Transfer In'}
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {activeTab === 'transfer-out' && (
        <>
          <Card>
            <h2 style={{ color: '#111827', marginBottom: '20px' }}>Transfer Out - Transfer Student to Another School</h2>
            <SearchContainer>
              <SearchInput
                type="text"
                placeholder="Search by name, student ID, or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {allClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </Select>
            </SearchContainer>

            {loading ? (
              <LoadingSpinner><div /></LoadingSpinner>
            ) : (
              <div>
                {students.map(student => (
                  <StudentCard
                    key={student.id}
                    selected={selectedStudent?.id === student.id}
                    onClick={() => setSelectedStudent(student)}
                  >
                    <StudentInfo>
                      <div>
                        <StudentName>{student.first_name} {student.last_name}</StudentName>
                        <StudentDetails>
                          ID: {student.student_id} | Admission: {student.admission_number} | 
                          Class: {student.current_class} | Level: {student.current_level}
                        </StudentDetails>
                      </div>
                      <Badge type={student.status}>{student.status.toUpperCase()}</Badge>
                    </StudentInfo>
                  </StudentCard>
                ))}
                {!loading && students.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No students found matching your criteria
                  </div>
                )}
              </div>
            )}
          </Card>

          {selectedStudent && (
            <Card>
              <h2 style={{ color: '#111827', marginBottom: '20px' }}>
                Transfer Out: {selectedStudent.first_name} {selectedStudent.last_name}
              </h2>
              <Form onSubmit={handleTransferOut}>
                <FormGroup>
                  <Label>Destination School Name *</Label>
                  <Input
                    type="text"
                    value={transferData.to_school}
                    onChange={(e) => setTransferData(prev => ({ ...prev, to_school: e.target.value }))}
                    placeholder="Name of the school student is transferring to"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Transfer Date *</Label>
                  <Input
                    type="date"
                    value={transferData.transfer_date}
                    onChange={(e) => setTransferData(prev => ({ ...prev, transfer_date: e.target.value }))}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Reason for Transfer *</Label>
                  <TextArea
                    value={transferData.reason}
                    onChange={(e) => setTransferData(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain reason for transfer (e.g., parent relocation, academic reasons, etc.)"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Transfer Documents / Notes</Label>
                  <TextArea
                    value={transferData.documents}
                    onChange={(e) => setTransferData(prev => ({ ...prev, documents: e.target.value }))}
                    placeholder="List any documents issued (transfer letter, academic records, etc.)"
                  />
                </FormGroup>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                  <Button 
                    type="button" 
                    secondary 
                    onClick={() => setSelectedStudent(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Complete Transfer Out'}
                  </Button>
                </div>
              </Form>
            </Card>
          )}
        </>
      )}
    </Container>
  );
};

export default StudentAdmission;
