import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import {
  PageContainer,
  PageHeader,
  TabContainer as SharedTabContainer,
  Tab as SharedTab,
  Section as SharedSection,
  SectionTitle as SharedSectionTitle,
	  PrimaryButton,
	  SecondaryButton,
	  colors,
	  borderRadius
	} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const Container = styled(PageContainer)`
  padding: 20px;
  box-sizing: border-box;
  
  ${mediaQuery('tablet')} {
    padding: 15px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const Header = styled(PageHeader)`
  display: flex;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 15px;
  
  ${mediaQuery('tablet')} {
    justify-content: center;
    text-align: center;
  }
`;

const Title = styled.h1`
  color: ${colors.textPrimary};
  font-size: 2rem;
  margin: 0;
  display: flex;
  align-items: center;
  font-family: var(--font-display);
  
  ${mediaQuery('tablet')} {
    font-size: 1.75rem;
    justify-content: center;
  }
  
  ${mediaQuery('mobile')} {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 10px;
  }
  
  i {
    margin-right: 15px;
    font-size: 1.8rem;
    color: #f39c12;
    
    ${mediaQuery('mobile')} {
      margin-right: 0;
    }
  }
`;

const TabContainer = styled(SharedTabContainer)`
  .tabs {
    display: flex;
    margin-bottom: 30px;
    gap: 10px;
    flex-wrap: wrap;
    border-bottom: 2px solid ${colors.borderLight};
    padding-bottom: 10px;
    
    ${mediaQuery('tablet')} {
      justify-content: center;
    }
    
    ${mediaQuery('mobile')} {
      flex-direction: column;
      align-items: stretch;
    }
  }
`;

const Tab = styled(SharedTab)`
  white-space: nowrap;
  
  ${mediaQuery('tablet')} {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
  
  ${mediaQuery('mobile')} {
    white-space: normal;
    text-align: center;
  }
`;

const Section = styled(SharedSection)``;

const SectionTitle = styled(SharedSectionTitle)``;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
  
  ${mediaQuery('tablet')} {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 15px;
  }
  
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
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
  color: ${colors.textPrimary};
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 12px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  font-size: 1rem;
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  &::placeholder {
    color: ${colors.textMuted};
  }
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  font-size: 1rem;
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${colors.primaryBlue};
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }

  option {
    background: ${colors.cardBackground};
    color: ${colors.textPrimary};
  }
`;

const Button = styled.button.withConfig({
  shouldForwardProp: (prop) => prop !== 'secondary'
})`
  background: ${props => props.secondary ? 'rgba(148, 163, 184, 0.2)' : 'rgba(59, 130, 246, 0.8)'};
  color: #fff;
  border: 1px solid ${props => props.secondary ? 'rgba(148, 163, 184, 0.3)' : 'rgba(59, 130, 246, 0.8)'};
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: ${props => props.secondary ? 'rgba(148, 163, 184, 0.3)' : 'rgba(59, 130, 246, 0.9)'};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  border-radius: ${borderRadius.medium};
  border: 1px solid ${colors.border};
  background: ${colors.cardBackground};
  
  ${mediaQuery('tablet')} {
    border-radius: ${borderRadius.small};
    margin: 0;
  }
`;

const Table = styled.div`
  background: ${colors.cardBackground};
  min-width: 900px;
  
  ${mediaQuery('tablet')} {
    min-width: 800px;
  }
  
  ${mediaQuery('mobile')} {
    min-width: 700px;
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns};
  gap: 15px;
  padding: 15px 20px;
  background: rgba(59, 130, 246, 0.1);
  font-weight: 600;
  color: ${colors.textPrimary};
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid ${colors.borderLight};
  
  ${mediaQuery('tablet')} {
    padding: 10px 12px;
    font-size: 0.75rem;
    gap: 8px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 8px 10px;
    font-size: 0.7rem;
    gap: 6px;
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns};
  gap: 15px;
  padding: 15px 20px;
  border-bottom: 1px solid ${colors.borderLight};
  color: ${colors.textPrimary};
  transition: background 0.2s ease;
  min-width: 900px;

  &:hover {
    background: #f9fafb;
  }

  &:last-child {
    border-bottom: none;
  }
  
  ${mediaQuery('tablet')} {
    padding: 10px 12px;
    font-size: 0.8rem;
    gap: 8px;
    min-width: 850px;
  }
  
  ${mediaQuery('mobile')} {
    padding: 8px 10px;
    font-size: 0.75rem;
    gap: 6px;
    min-width: 800px;
  }
  
  > div {
    overflow-wrap: break-word;
    word-wrap: break-word;
    hyphens: auto;
    
    &:nth-child(1) { /* Student name */
      min-width: 140px;
      font-weight: 500;
    }
    
    &:nth-child(2) { /* Class */
      min-width: 80px;
    }
    
    &:nth-child(3) { /* Amount */
      min-width: 100px;
      text-align: right;
      font-weight: 600;
    }
    
    &:nth-child(4) { /* Term */
      min-width: 70px;
    }
    
    &:nth-child(5) { /* Date */
      min-width: 90px;
      color: ${colors.textSecondary};
    }
    
    &:nth-child(6) { /* Status */
      min-width: 80px;
    }
    
    &:nth-child(7) { /* Action */
      min-width: 60px;
      text-align: center;
    }
  }
`;

const SimpleTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;

  th,
  td {
    padding: 10px 12px;
    border-bottom: 1px solid ${colors.borderLight};
    vertical-align: top;
    color: ${colors.textPrimary};
  }

  th {
    border-bottom: 1px solid ${colors.border};
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${colors.textSecondary};
    background: ${colors.cardBackground};
  }

  ${mediaQuery('tablet')} {
    min-width: 680px;

    th,
    td {
      padding: 9px 10px;
      font-size: 0.85rem;
    }
  }

  ${mediaQuery('mobile')} {
    min-width: 620px;

    th,
    td {
      padding: 8px 9px;
      font-size: 0.8rem;
    }
  }
`;


const StatusBadge = styled.span`
  background: ${props => {
    switch(props.status?.toLowerCase()) {
      case 'paid': return 'rgba(34, 197, 94, 0.1)';
      case 'pending': return 'rgba(245, 158, 11, 0.1)';
      case 'overdue': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch(props.status?.toLowerCase()) {
      case 'paid': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      default: return '#9ca3af';
    }
  }};
  padding: 4px 12px;
  border-radius: ${borderRadius.pill};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  border: 1px solid ${props => {
    switch(props.status?.toLowerCase()) {
      case 'paid': return 'rgba(34, 197, 94, 0.3)';
      case 'pending': return 'rgba(245, 158, 11, 0.3)';
      case 'overdue': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(107, 114, 128, 0.3)';
    }
  }};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px;
  color: ${colors.textSecondary};
  font-size: 1rem;
`;

const ClassInfoCard = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: ${borderRadius.medium};
  padding: 15px 20px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  
  i {
    color: ${colors.primaryBlue};
    font-size: 1.2rem;
  }
  
  .info {
    color: ${colors.textPrimary};
    
    .class-name {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .details {
      font-size: 0.85rem;
      color: ${colors.textSecondary};
    }
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  div {
    width: 40px;
    height: 40px;
    border: 4px solid ${colors.borderLight};
    border-top: 4px solid ${colors.primaryBlue};
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FinancialInformation = () => {
  const { api, user } = useAuth();
  const [activeTab, setActiveTab] = useState('schoolFees');
  const [loading, setLoading] = useState(false);
  
  // Student Fees State
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [feePayments, setFeePayments] = useState([]);
  const [feeStatus, setFeeStatus] = useState({ academic_year: '', rows: [] });
  const [feeForm, setFeeForm] = useState({
    class_id: '',
    student_id: '',
    amount: '',
    term: '',
    payment_date: new Date().toISOString().split('T')[0],
    status: 'Paid'
  });
  const [exportFilters, setExportFilters] = useState({
    class_id: '',
    term: '',
    status: '',
    start_date: '',
    end_date: ''
  });
  const [showExportFilters, setShowExportFilters] = useState(false);

  // Contributions State
  const [contributionCategory, setContributionCategory] = useState('food');
  const [contributionStatus, setContributionStatus] = useState({ academic_year: '', category: '', rows: [] });
  const [contributionForm, setContributionForm] = useState({
    student_id: '',
    category: 'food',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    status: 'Paid',
    payment_method: 'cash',
    reference_number: '',
    receipt_number: '',
    notes: ''
  });

  // Pocket Money State
  const [pocketBalances, setPocketBalances] = useState({ academic_year: '', rows: [] });
  const [pocketForm, setPocketForm] = useState({
    student_id: '',
    txn_type: 'deposit',
    amount: '',
    txn_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });

  const fetchClasses = useCallback(async () => {
    try {
      if (user?.role === 'teacher') {
        const response = await api.get('/api/classes/my-classes');
        if (response.data.success) {
          setClasses(
            (response.data.data || []).map((c) => ({
              id: c.id,
              name: c.class_name || c.name,
              level: c.level,
              academic_year: c.academic_year,
              student_count: c.student_count
            }))
          );
        }
        return;
      }

      if (user?.role === 'admin') {
        const response = await api.get('/api/classes');
        if (response.data.success) {
          setClasses(response.data.data || []);
        }
        return;
      }

      // parent/student: no class list needed
      setClasses([]);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  }, [api, user?.role]);

  const fetchStudentsByClass = useCallback(async (classId) => {
    if (!classId) {
      setStudents([]);
      return;
    }
    try {
      const response = await api.get(`/api/classes/${classId}/students`);
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students for selected class');
    }
  }, [api]);


  const fetchFeePayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/finance/fee-payments');
      if (response.data.success) {
        setFeePayments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching fee payments:', error);
      toast.error('Failed to load fee payments');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchFeeStatus = useCallback(async (classId) => {
    try {
      setLoading(true);
      const qs = classId ? `?class_id=${encodeURIComponent(classId)}` : '';
      const response = await api.get(`/api/finance/fee-status${qs}`);
      if (response.data.success) {
        setFeeStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching fee status:', error);
      toast.error(error.response?.data?.message || 'Failed to load fee status');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchContributionStatus = useCallback(async (category, classId) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('category', category);
      if (classId) params.set('class_id', classId);
      const response = await api.get(`/api/finance/contributions/status?${params.toString()}`);
      if (response.data.success) {
        setContributionStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching contribution status:', error);
      toast.error(error.response?.data?.message || 'Failed to load contribution status');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchPocketBalances = useCallback(async (classId) => {
    try {
      setLoading(true);
      const qs = classId ? `?class_id=${encodeURIComponent(classId)}` : '';
      const response = await api.get(`/api/finance/pocket-money/balances${qs}`);
      if (response.data.success) {
        setPocketBalances(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pocket money balances:', error);
      toast.error(error.response?.data?.message || 'Failed to load pocket money balances');
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Handle class selection
  const handleClassChange = (classId) => {
    setSelectedClass(classId);
    setFeeForm(prev => ({ 
      ...prev, 
      class_id: classId, 
      student_id: '' // Reset student selection when class changes
    }));
    fetchStudentsByClass(classId);
  };

  useEffect(() => {
    if (activeTab === 'schoolFees') {
      fetchClasses();
      if (user?.role === 'admin') {
        fetchFeePayments();
      }
      fetchFeeStatus(selectedClass);
      if (selectedClass && user?.role === 'admin') {
        fetchStudentsByClass(selectedClass);
      }
      return;
    }

    if (activeTab === 'contributions') {
      fetchClasses();
      fetchContributionStatus(contributionCategory, selectedClass);
      if (selectedClass && user?.role === 'admin') {
        fetchStudentsByClass(selectedClass);
      }
      return;
    }

    if (activeTab === 'pocketMoney') {
      fetchClasses();
      fetchPocketBalances(selectedClass);
      if (selectedClass && user?.role === 'admin') {
        fetchStudentsByClass(selectedClass);
      }
      return;
    }

  }, [
    activeTab,
    contributionCategory,
    fetchClasses,
    fetchContributionStatus,
    fetchFeePayments,
    fetchFeeStatus,
    fetchPocketBalances,
    fetchStudentsByClass,
    selectedClass,
    user?.role
  ]);

  useEffect(() => {
    setContributionForm((prev) => ({ ...prev, category: contributionCategory }));
  }, [contributionCategory]);

  const handleFeeSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/finance/record-payment', feeForm);
      if (response.data.success) {
        toast.success('Payment recorded successfully!');
        setFeeForm({
          class_id: '',
          student_id: '',
          amount: '',
          term: '',
          payment_date: new Date().toISOString().split('T')[0],
          status: 'Paid'
        });
        setSelectedClass('');
        setStudents([]);
        fetchFeePayments();
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const handleContributionSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/finance/contributions/record-payment', contributionForm);
      if (response.data.success) {
        toast.success('Contribution recorded successfully!');
        setContributionForm((prev) => ({
          ...prev,
          student_id: '',
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          status: 'Paid',
          payment_method: 'cash',
          reference_number: '',
          receipt_number: '',
          notes: ''
        }));
        fetchContributionStatus(contributionCategory, selectedClass);
      }
    } catch (error) {
      console.error('Error recording contribution:', error);
      toast.error(error.response?.data?.message || 'Failed to record contribution');
    } finally {
      setLoading(false);
    }
  };

  const handlePocketSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.post('/api/finance/pocket-money/record', pocketForm);
      if (response.data.success) {
        toast.success('Pocket money transaction recorded!');
        setPocketForm((prev) => ({
          ...prev,
          student_id: '',
          amount: '',
          txn_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          notes: ''
        }));
        fetchPocketBalances(selectedClass);
      }
    } catch (error) {
      console.error('Error recording pocket money:', error);
      toast.error(error.response?.data?.message || 'Failed to record pocket money transaction');
    } finally {
      setLoading(false);
    }
  };

  const openPayPalFeePayment = (amount) => {
    const baseUrl = process.env.REACT_APP_PAYPAL_ME_URL;
    const numericAmount = Number(amount);

    if (!baseUrl) {
      toast.info('PayPal link not configured. Add REACT_APP_PAYPAL_ME_URL in client .env.');
      return;
    }

    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Invalid amount for PayPal payment');
      return;
    }

    window.open(`${baseUrl.replace(/\/$/, '')}/${numericAmount}`, '_blank', 'noopener,noreferrer');
  };

  const downloadFeeReport = async (filters = {}) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.term) params.append('term', filters.term);
      if (filters.status) params.append('status', filters.status);
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const queryString = params.toString();
      const url = `/api/finance/fee-payments/export-pdf${queryString ? '?' + queryString : ''}`;
      
      const response = await api.get(url, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Create descriptive filename
      let filename = 'fee-payments-report';
      if (filters.term) filename += `-${filters.term}`;
      if (filters.status) filename += `-${filters.status}`;
      filename += `-${new Date().toISOString().split('T')[0]}.pdf`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Fee payments report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading fee report:', error);
      toast.error(error.response?.data?.message || 'Failed to download fee payments report');
    } finally {
      setLoading(false);
    }
  };

  const downloadStudentStatement = async (studentId, studentName) => {
    try {
      const response = await api.get(`/api/finance/student-fee-statement/${studentId}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fee-statement-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Fee statement for ${studentName} downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading student statement:', error);
      toast.error(error.response?.data?.message || 'Failed to download student fee statement');
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <i className="fas fa-money-check-alt"></i>
          Financial Information
        </Title>
      </Header>

      <TabContainer>
        <Tab 
          $active={activeTab === 'schoolFees'} 
          onClick={() => setActiveTab('schoolFees')}
        >
          School Fee
        </Tab>
        <Tab 
          $active={activeTab === 'contributions'} 
          onClick={() => setActiveTab('contributions')}
        >
          School Contributions
        </Tab>
        <Tab
          $active={activeTab === 'pocketMoney'}
          onClick={() => setActiveTab('pocketMoney')}
        >
          Students Pocket Money
        </Tab>
      </TabContainer>

      {activeTab === 'schoolFees' && (
        <>
          <Section>
            <SectionTitle>School Fee</SectionTitle>

            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <FormRow>
                <FormGroup>
                  <Label>Class</Label>
                  <Select
                    value={selectedClass}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (user?.role === 'admin') {
                        handleClassChange(next);
                      } else {
                        setSelectedClass(next);
                      }
                      fetchFeeStatus(next);
                    }}
                  >
                    <option value="">All My Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Level {cls.level})
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup style={{ alignSelf: 'flex-end' }}>
                  <SecondaryButton type="button" onClick={() => fetchFeeStatus(selectedClass)} disabled={loading}>
                    Refresh Status
                  </SecondaryButton>
                </FormGroup>
              </FormRow>
            )}

            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <SimpleTable>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Student</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Class</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Required</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Paid</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Balance</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                    {(user?.role === 'parent' || user?.role === 'student') && (
                      <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Pay</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(feeStatus.rows || []).map((row) => (
                    <tr key={row.student_id}>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary }}>{row.student_name}</div>
                        <div style={{ fontSize: 12, color: colors.textSecondary }}>{row.student_number}</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{row.class_name || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right' }}>{Number(row.total_required || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right' }}>{Number(row.total_paid || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', fontWeight: 700 }}>{Number(row.outstanding_balance || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: row.status === 'paid'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : row.status === 'partial'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                          color: row.status === 'paid'
                            ? '#059669'
                            : row.status === 'partial'
                              ? '#b45309'
                              : '#b91c1c'
                        }}>
                          {row.status === 'paid' ? 'Paid' : row.status === 'partial' ? 'Partial' : 'Not Paid'}
                        </span>
                        {(row.deadline_soon || row.payment_start_soon) && (
                          <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
                            {row.payment_start_soon ? 'Payment starts soon' : 'Deadline soon'}
                          </div>
                        )}
                      </td>
                      {(user?.role === 'parent' || user?.role === 'student') && (
                        <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                          {row.status !== 'paid' ? (
                            <PrimaryButton type="button" onClick={() => openPayPalFeePayment(row.outstanding_balance || 0)}>
                              Pay with PayPal
                            </PrimaryButton>
                          ) : (
                            <span style={{ color: colors.textSecondary, fontSize: 13 }}>—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {(feeStatus.rows || []).length === 0 && (
                    <tr>
                      <td
                        colSpan={(user?.role === 'parent' || user?.role === 'student') ? 7 : 6}
                        style={{ padding: 14, color: colors.textSecondary }}
                      >
                        No fee status data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SimpleTable>
            </div>

            {user?.role === 'admin' && selectedClass && (
              <ClassInfoCard>
                <i className="fas fa-users"></i>
                <div className="info">
                  <div className="class-name">
                    {classes.find(c => c.id === parseInt(selectedClass))?.name}
                  </div>
                  <div className="details">
                    Level {classes.find(c => c.id === parseInt(selectedClass))?.level} • 
                    {students.length} student{students.length !== 1 ? 's' : ''} available
                  </div>
                </div>
              </ClassInfoCard>
            )}

            {user?.role === 'admin' && (
            <form onSubmit={handleFeeSubmit}>
              <FormRow>
                <FormGroup>
                  <Label>Class *</Label>
                  <Select
                    value={selectedClass}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                  >
                    <option value="">Select Class First</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Level {cls.level})
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Student *</Label>
                  <Select
                    value={feeForm.student_id}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, student_id: e.target.value }))}
                    required
                    disabled={!selectedClass}
                    style={{ 
                      opacity: !selectedClass ? 0.5 : 1,
                      cursor: !selectedClass ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="">{!selectedClass ? 'Select Class First' : 'Select Student'}</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.first_name} {student.last_name} - {student.student_id}
                      </option>
                    ))}
                  </Select>
                  {!selectedClass && (
                    <small style={{ color: colors.textSecondary, fontSize: '0.8rem', marginTop: '4px' }}>
                      Please select a class to see students
                    </small>
                  )}
                </FormGroup>
                <FormGroup>
                  <Label>Amount (TZS)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Term</Label>
                  <Select
                    value={feeForm.term}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, term: e.target.value }))}
                    required
                  >
                    <option value="">Select Term</option>
                    <option value="Full Year">Full Year</option>
                    <option value="Half Year">Half Year</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={feeForm.payment_date}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, payment_date: e.target.value }))}
                    required
                  />
                </FormGroup>
              </FormRow>
              <FormRow>
                <FormGroup>
                  <Label>Payment Status</Label>
                  <Select
                    value={feeForm.status}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </Select>
                </FormGroup>
                <FormGroup style={{ alignSelf: 'flex-end' }}>
                  <Button 
                    type="submit" 
                    disabled={loading || !selectedClass || !feeForm.student_id}
                  >
                    {loading ? 'Recording...' : 'Record Payment'}
                  </Button>
                  {(!selectedClass || !feeForm.student_id) && (
                    <small style={{ color: colors.textSecondary, fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                      {!selectedClass ? 'Select class first' : 'Select student to continue'}
                    </small>
                  )}
                </FormGroup>
              </FormRow>
            </form>
            )}
          </Section>

          {user?.role === 'admin' && (
          <Section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <SectionTitle style={{ margin: 0 }}>Fee Payments</SectionTitle>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button secondary onClick={() => setShowExportFilters(!showExportFilters)}>
                  <i className="fas fa-filter" style={{ marginRight: '8px' }}></i>
                  {showExportFilters ? 'Hide Filters' : 'Show Filters'}
                </Button>
                <Button secondary onClick={() => downloadFeeReport(exportFilters)} disabled={loading}>
                  <i className="fas fa-download" style={{ marginRight: '8px' }}></i>
                  {loading ? 'Generating...' : 'Export PDF Report'}
                </Button>
              </div>
            </div>
            
            {showExportFilters && (
              <div style={{ 
                background: colors.cardBackground, 
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '25px'
              }}>
                <h3 style={{ color: colors.textPrimary, marginBottom: '15px', fontSize: '1rem' }}>Export Filters</h3>
                <FormRow>
                  <FormGroup>
                    <Label>Filter by Class</Label>
                    <Select
                      value={exportFilters.class_id || ''}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, class_id: e.target.value }))}
                    >
                      <option value="">All Classes</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} (Level {cls.level})
                        </option>
                      ))}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Filter by Term</Label>
                    <Select
                      value={exportFilters.term}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, term: e.target.value }))}
                    >
                      <option value="">All Terms</option>
                      <option value="Full Year">Full Year</option>
                      <option value="Half Year">Half Year</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>Filter by Status</Label>
                    <Select
                      value={exportFilters.status}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="">All Statuses</option>
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={exportFilters.start_date}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={exportFilters.end_date}
                      onChange={(e) => setExportFilters(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </FormGroup>
                </FormRow>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '15px' }}>
                  <Button secondary onClick={() => setExportFilters({ class_id: '', term: '', status: '', start_date: '', end_date: '' })}>
                    Clear Filters
                  </Button>
                  <Button onClick={() => downloadFeeReport(exportFilters)} disabled={loading}>
                    <i className="fas fa-file-pdf" style={{ marginRight: '8px' }}></i>
                    Generate Filtered Report
                  </Button>
                </div>
              </div>
            )}
            {loading ? (
              <LoadingSpinner><div /></LoadingSpinner>
            ) : (
              <TableWrapper>
                <Table>
                  <TableHeader columns="2fr 0.8fr 1fr 0.8fr 1fr 0.9fr 0.7fr">
                    <div>Student</div>
                    <div>Class</div>
                    <div>Amount</div>
                    <div>Term</div>
                    <div>Date</div>
                    <div>Status</div>
                    <div>Action</div>
                  </TableHeader>
                  {feePayments.length > 0 ? (
                    feePayments.map((payment, index) => (
                      <TableRow key={index} columns="2fr 0.8fr 1fr 0.8fr 1fr 0.9fr 0.7fr">
                        <div>{payment.student_name}</div>
                        <div>{payment.class_name}</div>
                        <div>TZS {Number(payment.amount).toLocaleString()}</div>
                        <div>{payment.term}</div>
                        <div>{new Date(payment.payment_date).toLocaleDateString()}</div>
                        <div><StatusBadge status={payment.status}>{payment.status}</StatusBadge></div>
                        <div>
                          <Button 
                            secondary 
                            onClick={() => downloadStudentStatement(payment.student_id, payment.student_name)}
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '0.8rem',
                              minWidth: 'auto'
                            }}
                          >
                            <i className="fas fa-download"></i>
                          </Button>
                        </div>
                      </TableRow>
                    ))
                  ) : (
                    <EmptyState>No fee payments recorded yet</EmptyState>
                  )}
                </Table>
              </TableWrapper>
            )}
          </Section>
          )}
        </>
      )}

      {activeTab === 'contributions' && (
        <>
          <Section>
            <SectionTitle>School Contributions</SectionTitle>

            <FormRow>
              <FormGroup>
                <Label>Category</Label>
                <Select
                  value={contributionCategory}
                  onChange={(e) => setContributionCategory(e.target.value)}
                >
                  <option value="food">Food Payments</option>
                  <option value="guards">School Guards</option>
                  <option value="emergency">Emergency</option>
                  <option value="graduation">Graduation</option>
                  <option value="sports_trips">Sports Trips</option>
                  <option value="fare">Fare</option>
                  <option value="condolence">Condolence Money</option>
                </Select>
              </FormGroup>

              {(user?.role === 'admin' || user?.role === 'teacher') && (
                <FormGroup>
                  <Label>Class</Label>
                  <Select
                    value={selectedClass}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedClass(next);
                      if (user?.role === 'admin') {
                        fetchStudentsByClass(next);
                      }
                      fetchContributionStatus(contributionCategory, next);
                    }}
                  >
                    <option value="">All My Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Level {cls.level})
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              )}

              <FormGroup style={{ alignSelf: 'flex-end' }}>
                <SecondaryButton
                  type="button"
                  onClick={() => fetchContributionStatus(contributionCategory, selectedClass)}
                  disabled={loading}
                >
                  Refresh
                </SecondaryButton>
              </FormGroup>
            </FormRow>

            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <SimpleTable>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Student</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Class</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Status</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Paid Amount</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {(contributionStatus.rows || []).map((row) => (
                    <tr key={row.student_id}>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary }}>{row.student_name}</div>
                        <div style={{ fontSize: 12, color: colors.textSecondary }}>{row.student_number}</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{row.class_name || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                        <span style={{
                          display: 'inline-flex',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background: row.is_paid ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: row.is_paid ? '#059669' : '#b91c1c'
                        }}>
                          {row.is_paid ? 'Paid' : 'Not Paid'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right' }}>
                        {Number(row.total_paid_amount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                        {row.last_payment_date ? new Date(row.last_payment_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                  {(contributionStatus.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 14, color: colors.textSecondary }}>
                        No contribution data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SimpleTable>
            </div>

            {user?.role === 'admin' && (
              <div style={{ marginTop: 22 }}>
                <SectionTitle>Record Contribution</SectionTitle>
                <form onSubmit={handleContributionSubmit}>
                  <FormRow>
                    <FormGroup>
                      <Label>Student *</Label>
                      <Select
                        value={contributionForm.student_id}
                        onChange={(e) => setContributionForm((prev) => ({ ...prev, student_id: e.target.value }))}
                        required
                        disabled={!selectedClass}
                      >
                        <option value="">{selectedClass ? 'Select Student' : 'Select Class First'}</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} - {student.student_id}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <Label>Amount (TZS) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={contributionForm.amount}
                        onChange={(e) => setContributionForm((prev) => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>Payment Date *</Label>
                      <Input
                        type="date"
                        value={contributionForm.payment_date}
                        onChange={(e) => setContributionForm((prev) => ({ ...prev, payment_date: e.target.value }))}
                        required
                      />
                    </FormGroup>
                    <FormGroup style={{ alignSelf: 'flex-end' }}>
                      <PrimaryButton type="submit" disabled={loading || !selectedClass || !contributionForm.student_id}>
                        {loading ? 'Recording...' : 'Record'}
                      </PrimaryButton>
                    </FormGroup>
                  </FormRow>
                </form>
              </div>
            )}
          </Section>
          )}
        </>
      )}

      {activeTab === 'pocketMoney' && (
        <>
          <Section>
            <SectionTitle>Students Pocket Money</SectionTitle>

            {(user?.role === 'admin' || user?.role === 'teacher') && (
              <FormRow>
                <FormGroup>
                  <Label>Class</Label>
                  <Select
                    value={selectedClass}
                    onChange={(e) => {
                      const next = e.target.value;
                      setSelectedClass(next);
                      fetchPocketBalances(next);
                    }}
                  >
                    <option value="">All My Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} (Level {cls.level})
                      </option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup style={{ alignSelf: 'flex-end' }}>
                  <SecondaryButton type="button" onClick={() => fetchPocketBalances(selectedClass)} disabled={loading}>
                    Refresh
                  </SecondaryButton>
                </FormGroup>
              </FormRow>
            )}

            <div style={{ overflowX: 'auto', marginTop: 10 }}>
              <SimpleTable>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Student</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Class</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Deposits</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Withdrawals</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Balance</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: `1px solid ${colors.border}` }}>Last Txn</th>
                  </tr>
                </thead>
                <tbody>
                  {(pocketBalances.rows || []).map((row) => (
                    <tr key={row.student_id}>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>
                        <div style={{ fontWeight: 600, color: colors.textPrimary }}>{row.student_name}</div>
                        <div style={{ fontSize: 12, color: colors.textSecondary }}>{row.student_number}</div>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{row.class_name || '—'}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right' }}>{Number(row.total_deposits || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right' }}>{Number(row.total_withdrawals || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}`, textAlign: 'right', fontWeight: 700 }}>{Number(row.balance || 0).toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', borderBottom: `1px solid ${colors.borderLight}` }}>{row.last_txn_date ? new Date(row.last_txn_date).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                  {(pocketBalances.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: 14, color: colors.textSecondary }}>
                        No pocket money data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </SimpleTable>
            </div>

            {user?.role === 'admin' && (
              <div style={{ marginTop: 22 }}>
                <SectionTitle>Record Pocket Money</SectionTitle>
                <form onSubmit={handlePocketSubmit}>
                  <FormRow>
                    <FormGroup>
                      <Label>Student *</Label>
                      <Select
                        value={pocketForm.student_id}
                        onChange={(e) => setPocketForm((prev) => ({ ...prev, student_id: e.target.value }))}
                        required
                        disabled={!selectedClass}
                      >
                        <option value="">{selectedClass ? 'Select Student' : 'Select Class First'}</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} - {student.student_id}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <Label>Type *</Label>
                      <Select
                        value={pocketForm.txn_type}
                        onChange={(e) => setPocketForm((prev) => ({ ...prev, txn_type: e.target.value }))}
                      >
                        <option value="deposit">Deposit</option>
                        <option value="withdrawal">Withdrawal</option>
                      </Select>
                    </FormGroup>
                    <FormGroup>
                      <Label>Amount (TZS) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pocketForm.amount}
                        onChange={(e) => setPocketForm((prev) => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </FormGroup>
                    <FormGroup>
                      <Label>Date *</Label>
                      <Input
                        type="date"
                        value={pocketForm.txn_date}
                        onChange={(e) => setPocketForm((prev) => ({ ...prev, txn_date: e.target.value }))}
                        required
                      />
                    </FormGroup>
                    <FormGroup style={{ alignSelf: 'flex-end' }}>
                      <PrimaryButton type="submit" disabled={loading || !selectedClass || !pocketForm.student_id}>
                        {loading ? 'Recording...' : 'Record'}
                      </PrimaryButton>
                    </FormGroup>
                  </FormRow>
                </form>
              </div>
            )}
          </Section>
          )}
        </>
      )}

    </Container>
  );
};

export default FinancialInformation;
