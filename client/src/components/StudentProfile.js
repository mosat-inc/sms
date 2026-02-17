import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    background: #5a6268;
    transform: translateY(-2px);
  }
`;

const StudentHeader = styled.div`
  text-align: center;
  flex: 1;
`;

const StudentName = styled.h1`
  color: #2c3e50;
  font-size: 2.5rem;
  margin-bottom: 5px;
`;

const StudentId = styled.p`
  color: #7f8c8d;
  font-size: 1.2rem;
  margin: 0;
`;

const TabContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 10px;
`;

const Tab = styled.button`
  background: ${props => props.active ? '#3498db' : '#ecf0f1'};
  color: ${props => props.active ? 'white' : '#2c3e50'};
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.active ? '#2980b9' : '#bdc3c7'};
    transform: translateY(-2px);
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(250px, 1fr))'};
  gap: 20px;
  margin-bottom: 15px;
`;

const InfoGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.span`
  font-weight: 600;
  color: #34495e;
  font-size: 0.9rem;
  margin-bottom: 5px;
`;

const Value = styled.span`
  color: #2c3e50;
  font-size: 1rem;
  ${props => props.highlight && `
    background: #e8f5e8;
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
  `}
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  font-weight: 600;
  color: white;
  background: ${props => {
    switch (props.type) {
      case 'active': return '#27ae60';
      case 'promoted': return '#3498db';
      case 'repeated': return '#f39c12';
      case 'enrolled': return '#2ecc71';
      case 'completed': return '#9b59b6';
      case 'verified': return '#27ae60';
      case 'pending': return '#f39c12';
      default: return '#95a5a6';
    }
  }};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #ecf0f1;
  }

  th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #2c3e50;
  }

  tr:hover {
    background-color: #f8f9fa;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
`;

const StatCard = styled.div`
  background: ${props => props.color || '#3498db'};
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  opacity: 0.9;
`;

const Button = styled.button`
  background: ${props => props.variant === 'danger' ? '#e74c3c' : '#3498db'};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    background: ${props => props.variant === 'danger' ? '#c0392b' : '#2980b9'};
    transform: translateY(-2px);
  }

  &:disabled {
    background: #bdc3c7;
    cursor: not-allowed;
    transform: none;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px;
  
  div {
    width: 50px;
    height: 50px;
    border: 5px solid #f3f3f3;
    border-top: 5px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);

  useEffect(() => {
    if (id) {
      fetchStudentProfile();
    }
  }, [id]);

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/student-profiles/${id}`);
      
      if (response.data.success) {
        setStudentData(response.data.data);
      } else {
        toast.error('Failed to load student profile');
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
      toast.error('Failed to load student profile');
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatPercentage = (value) => {
    return `${parseFloat(value || 0).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner><div /></LoadingSpinner>
      </Container>
    );
  }

  if (!studentData) {
    return (
      <Container>
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>Student not found</h2>
            <p>The requested student profile could not be loaded.</p>
            <Button onClick={() => navigate('/students')}>Back to Students</Button>
          </div>
        </Card>
      </Container>
    );
  }

  const { personal_info, supervisors, academic_history, financial_summary, payment_history, documents, statistics } = studentData;

  return (
    <Container>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          ← Back
        </BackButton>
        <StudentHeader>
          <StudentName>{personal_info.first_name} {personal_info.last_name}</StudentName>
          <StudentId>
            Student ID: {personal_info.student_id} | Admission: {personal_info.admission_number}
          </StudentId>
        </StudentHeader>
        <div>
          <Badge type={personal_info.status}>{personal_info.status.toUpperCase()}</Badge>
        </div>
      </Header>

      <TabContainer>
        <Tab active={activeTab === 'personal'} onClick={() => setActiveTab('personal')}>
          Personal Info
        </Tab>
        <Tab active={activeTab === 'academic'} onClick={() => setActiveTab('academic')}>
          Academic History
        </Tab>
        <Tab active={activeTab === 'financial'} onClick={() => setActiveTab('financial')}>
          Financial Records
        </Tab>
        <Tab active={activeTab === 'documents'} onClick={() => setActiveTab('documents')}>
          Documents
        </Tab>
      </TabContainer>

      {activeTab === 'personal' && (
        <>
          <Card>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Personal Information</h3>
            <Row>
              <InfoGroup>
                <Label>Full Name</Label>
                <Value>{personal_info.first_name} {personal_info.last_name}</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Date of Birth</Label>
                <Value>{formatDate(personal_info.date_of_birth)} (Age: {personal_info.age})</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Gender</Label>
                <Value>{personal_info.gender}</Value>
              </InfoGroup>
            </Row>
            <Row>
              <InfoGroup>
                <Label>Blood Group</Label>
                <Value>{personal_info.blood_group || 'Not specified'}</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Nationality</Label>
                <Value>{personal_info.nationality}</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Religion</Label>
                <Value>{personal_info.religion || 'Not specified'}</Value>
              </InfoGroup>
            </Row>
            <Row>
              <InfoGroup>
                <Label>Phone</Label>
                <Value>{personal_info.phone || 'Not provided'}</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Email</Label>
                <Value>{personal_info.email || 'Not provided'}</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Emergency Contact</Label>
                <Value>{personal_info.emergency_contact || 'Not set'}</Value>
              </InfoGroup>
            </Row>
            {personal_info.address && (
              <Row>
                <InfoGroup>
                  <Label>Address</Label>
                  <Value>{personal_info.address}</Value>
                </InfoGroup>
              </Row>
            )}
            {personal_info.medical_conditions && (
              <Row>
                <InfoGroup>
                  <Label>Medical Conditions</Label>
                  <Value>{personal_info.medical_conditions}</Value>
                </InfoGroup>
              </Row>
            )}
          </Card>

          <Card>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Current Academic Status</h3>
            <Row>
              <InfoGroup>
                <Label>Current Class</Label>
                <Value highlight>{personal_info.current_class} (Level {personal_info.current_level})</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Academic Year</Label>
                <Value>{personal_info.current_academic_year}</Value>
              </InfoGroup>
              <InfoGroup>
                <Label>Admission Date</Label>
                <Value>{formatDate(personal_info.admission_date)}</Value>
              </InfoGroup>
            </Row>
          </Card>

          <Card>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Supervisor/Guardian Information</h3>
            {supervisors.map((supervisor, index) => (
              <div key={supervisor.id} style={{ marginBottom: index < supervisors.length - 1 ? '25px' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <h4 style={{ color: '#34495e', margin: 0 }}>
                    {supervisor.first_name} {supervisor.last_name}
                  </h4>
                  {supervisor.is_primary_supervisor && (
                    <Badge type="verified">Primary</Badge>
                  )}
                  {supervisor.emergency_contact && (
                    <Badge type="pending">Emergency Contact</Badge>
                  )}
                </div>
                <Row>
                  <InfoGroup>
                    <Label>Relationship</Label>
                    <Value>{supervisor.relationship}</Value>
                  </InfoGroup>
                  <InfoGroup>
                    <Label>Phone</Label>
                    <Value>{supervisor.phone}</Value>
                  </InfoGroup>
                  <InfoGroup>
                    <Label>Email</Label>
                    <Value>{supervisor.email || 'Not provided'}</Value>
                  </InfoGroup>
                </Row>
                <Row>
                  <InfoGroup>
                    <Label>Occupation</Label>
                    <Value>{supervisor.occupation || 'Not specified'}</Value>
                  </InfoGroup>
                  <InfoGroup>
                    <Label>Workplace</Label>
                    <Value>{supervisor.workplace || 'Not specified'}</Value>
                  </InfoGroup>
                  {supervisor.address && (
                    <InfoGroup>
                      <Label>Address</Label>
                      <Value>{supervisor.address}</Value>
                    </InfoGroup>
                  )}
                </Row>
              </div>
            ))}
          </Card>
        </>
      )}

      {activeTab === 'academic' && (
        <Card>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Academic History</h3>
          <StatsGrid>
            <StatCard color="#27ae60">
              <StatValue>{statistics.years_enrolled}</StatValue>
              <StatLabel>Years Enrolled</StatLabel>
            </StatCard>
            <StatCard color="#3498db">
              <StatValue>{personal_info.current_class}</StatValue>
              <StatLabel>Current Class</StatLabel>
            </StatCard>
            <StatCard color="#9b59b6">
              <StatValue>{statistics.current_status.toUpperCase()}</StatValue>
              <StatLabel>Status</StatLabel>
            </StatCard>
          </StatsGrid>

          <Table>
            <thead>
              <tr>
                <th>Academic Year</th>
                <th>Class</th>
                <th>Previous Class</th>
                <th>Status</th>
                <th>Average Grade</th>
                <th>Position</th>
                <th>Enrollment Date</th>
                <th>Completion Date</th>
              </tr>
            </thead>
            <tbody>
              {academic_history.map((record) => (
                <tr key={record.id}>
                  <td>{record.academic_year}</td>
                  <td>{record.class_name} (Level {record.level})</td>
                  <td>{record.previous_class_name || '-'}</td>
                  <td>
                    <Badge type={record.status}>{record.status.toUpperCase()}</Badge>
                  </td>
                  <td>{record.average_grade ? `${record.average_grade}%` : '-'}</td>
                  <td>
                    {record.position_in_class && record.total_students_in_class
                      ? `${record.position_in_class}/${record.total_students_in_class}`
                      : '-'
                    }
                  </td>
                  <td>{formatDate(record.enrollment_date)}</td>
                  <td>{formatDate(record.completion_date)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {activeTab === 'financial' && (
        <>
          <Card>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Financial Summary</h3>
            <StatsGrid>
              <StatCard color="#27ae60">
                <StatValue>{formatCurrency(financial_summary.total_fees_paid)}</StatValue>
                <StatLabel>Total Paid</StatLabel>
              </StatCard>
              <StatCard color="#e74c3c">
                <StatValue>{formatCurrency(financial_summary.total_outstanding)}</StatValue>
                <StatLabel>Outstanding Balance</StatLabel>
              </StatCard>
              <StatCard color="#3498db">
                <StatValue>{formatPercentage(financial_summary.payment_percentage)}</StatValue>
                <StatLabel>Payment Progress</StatLabel>
              </StatCard>
              <StatCard color="#f39c12">
                <StatValue>{formatCurrency(financial_summary.total_fees_required)}</StatValue>
                <StatLabel>Total Required</StatLabel>
              </StatCard>
            </StatsGrid>

            <h4 style={{ color: '#34495e', marginBottom: '15px' }}>Financial Records by Academic Year</h4>
            <Table>
              <thead>
                <tr>
                  <th>Academic Year</th>
                  <th>Fees Required</th>
                  <th>Fees Paid</th>
                  <th>Outstanding</th>
                  <th>Payment %</th>
                  <th>Last Payment</th>
                  <th>Payment Plan</th>
                </tr>
              </thead>
              <tbody>
                {financial_summary.records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.academic_year}</td>
                    <td>{formatCurrency(record.total_fees_required)}</td>
                    <td>{formatCurrency(record.total_fees_paid)}</td>
                    <td style={{ color: record.outstanding_balance > 0 ? '#e74c3c' : '#27ae60' }}>
                      {formatCurrency(record.outstanding_balance)}
                    </td>
                    <td>{formatPercentage(record.payment_percentage)}</td>
                    <td>{formatDate(record.last_payment_date)}</td>
                    <td>
                      <Badge type={record.payment_plan === 'scholarship' ? 'verified' : 'pending'}>
                        {record.payment_plan.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Recent Payments</h3>
            <Table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>For</th>
                  <th>Reference</th>
                  <th>Receipt</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {payment_history.slice(0, 10).map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td style={{ color: '#27ae60', fontWeight: '600' }}>
                      {formatCurrency(payment.amount)}
                    </td>
                    <td>
                      <Badge type="pending">{payment.payment_method.toUpperCase()}</Badge>
                    </td>
                    <td>{payment.payment_for.replace('_', ' ').toUpperCase()}</td>
                    <td>{payment.reference_number || '-'}</td>
                    <td>{payment.receipt_number}</td>
                    <td>
                      {payment.recorded_by_first_name} {payment.recorded_by_last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </>
      )}

      {activeTab === 'documents' && (
        <Card>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>Student Documents</h3>
          <StatsGrid>
            <StatCard color="#3498db">
              <StatValue>{statistics.documents_count}</StatValue>
              <StatLabel>Total Documents</StatLabel>
            </StatCard>
            <StatCard color="#27ae60">
              <StatValue>{statistics.verified_documents}</StatValue>
              <StatLabel>Verified Documents</StatLabel>
            </StatCard>
            <StatCard color="#f39c12">
              <StatValue>{statistics.documents_count - statistics.verified_documents}</StatValue>
              <StatLabel>Pending Verification</StatLabel>
            </StatCard>
          </StatsGrid>

          <Table>
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Document Name</th>
                <th>Upload Date</th>
                <th>Uploaded By</th>
                <th>Status</th>
                <th>Verified By</th>
                <th>Verification Date</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.document_type.replace('_', ' ').toUpperCase()}</td>
                  <td>{doc.document_name}</td>
                  <td>{formatDate(doc.uploaded_date)}</td>
                  <td>{doc.uploaded_by_first_name} {doc.uploaded_by_last_name}</td>
                  <td>
                    <Badge type={doc.is_verified ? 'verified' : 'pending'}>
                      {doc.is_verified ? 'VERIFIED' : 'PENDING'}
                    </Badge>
                  </td>
                  <td>
                    {doc.is_verified 
                      ? `${doc.verified_by_first_name} ${doc.verified_by_last_name}` 
                      : '-'
                    }
                  </td>
                  <td>{formatDate(doc.verification_date)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          
          {documents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#7f8c8d' }}>
              No documents uploaded yet
            </div>
          )}
        </Card>
      )}
    </Container>
  );
};

export default StudentProfile;
