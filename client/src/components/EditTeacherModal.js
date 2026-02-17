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
  max-width: 800px;
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

const Form = styled.form`
  display: grid;
  gap: 20px;
`;

const FormSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 25px;
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

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.full-width {
    grid-column: 1 / -1;
  }
`;

const Label = styled.label`
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  font-weight: 500;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 15px;
  color: white;
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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
`;

const TextArea = styled.textarea`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 15px;
  color: white;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

const EditTeacherModal = ({ teacher, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    address: '',
    department: '',
    status: 'active',
    employee_id: '',
    position: '',
    qualification: '',
    specialization: '',
    experience_years: '',
    joining_date: '',
    salary: '',
    bio: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { api } = useAuth();

  // Load teacher data into form
  useEffect(() => {
    if (teacher) {
      setFormData({
        username: teacher.username || '',
        email: teacher.email || '',
        first_name: teacher.first_name || '',
        last_name: teacher.last_name || '',
        phone: teacher.phone || '',
        address: teacher.address || '',
        department: teacher.department || teacher.profile_department || '',
        status: teacher.status || 'active',
        employee_id: teacher.employee_id || '',
        position: teacher.position || '',
        qualification: teacher.qualification || '',
        specialization: teacher.specialization || '',
        experience_years: teacher.experience_years || '',
        joining_date: teacher.joining_date ? teacher.joining_date.split('T')[0] : '',
        salary: teacher.salary || '',
        bio: teacher.bio || ''
      });
    }
  }, [teacher]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const validateForm = () => {
    if (!formData.first_name.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.last_name.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Process form data to handle empty numeric and date fields
      const processedData = {
        ...formData,
        experience_years: formData.experience_years === '' || formData.experience_years === null ? 0 : formData.experience_years,
        salary: formData.salary === '' || formData.salary === null ? 0 : formData.salary,
        joining_date: formData.joining_date === '' || formData.joining_date === null ? null : formData.joining_date
      };
      
      const response = await api.put(`/api/teachers/${teacher.id}`, processedData);
      
      if (response.data.success) {
        toast.success('Teacher updated successfully!');
        onSuccess();
        onClose();
      } else {
        setError(response.data.message || 'Failed to update teacher');
      }
    } catch (error) {
      console.error('Update teacher error:', error);
      setError(error.response?.data?.message || 'Failed to update teacher');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            <i className="fas fa-user-edit"></i>
            Edit Teacher: {teacher?.first_name} {teacher?.last_name}
          </h2>
          <CloseButton onClick={onClose}>
            <i className="fas fa-times"></i>
          </CloseButton>
        </ModalHeader>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <Form onSubmit={handleSubmit}>
          <FormSection>
            <h3>
              <i className="fas fa-user"></i>
              Personal Information
            </h3>
            <FormGrid>
              <FormGroup>
                <Label>Username *</Label>
                <Input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Enter username"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Email *</Label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>First Name *</Label>
                <Input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Last Name *</Label>
                <Input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Phone</Label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </FormGroup>
              <FormGroup>
                <Label>Status</Label>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </FormGroup>
              <FormGroup className="full-width">
                <Label>Address</Label>
                <Input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                />
              </FormGroup>
            </FormGrid>
          </FormSection>

          <FormSection>
            <h3>
              <i className="fas fa-briefcase"></i>
              Professional Information
            </h3>
            <FormGrid>
              <FormGroup>
                <Label>Employee ID</Label>
                <Input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  placeholder="Enter employee ID"
                />
              </FormGroup>
              <FormGroup>
                <Label>Department</Label>
                <Select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                >
                  <option value="">Select Department</option>
                  <option value="Science Department">Science Department</option>
                  <option value="Arts Department">Arts Department</option>
                  <option value="Commercial Department">Commercial Department</option>
                  <option value="Technical Department">Technical Department</option>
                  <option value="General Department">General Department</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Position</Label>
                <Input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Enter position"
                />
              </FormGroup>
              <FormGroup>
                <Label>Experience (Years)</Label>
                <Input
                  type="number"
                  name="experience_years"
                  value={formData.experience_years}
                  onChange={handleInputChange}
                  placeholder="Years of experience"
                  min="0"
                />
              </FormGroup>
              <FormGroup>
                <Label>Joining Date</Label>
                <Input
                  type="date"
                  name="joining_date"
                  value={formData.joining_date}
                  onChange={handleInputChange}
                />
              </FormGroup>
              <FormGroup>
                <Label>Salary</Label>
                <Input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleInputChange}
                  placeholder="Enter salary"
                  min="0"
                  step="0.01"
                />
              </FormGroup>
              <FormGroup className="full-width">
                <Label>Qualification</Label>
                <Input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  placeholder="Enter qualification"
                />
              </FormGroup>
              <FormGroup className="full-width">
                <Label>Specialization</Label>
                <Input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  placeholder="Enter specialization"
                />
              </FormGroup>
              <FormGroup className="full-width">
                <Label>Biography</Label>
                <TextArea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder="Enter biography or additional information"
                  rows={3}
                />
              </FormGroup>
            </FormGrid>
          </FormSection>

          <ButtonGroup>
            <Button type="button" onClick={onClose}>
              <i className="fas fa-times"></i>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              <i className={`fas fa-${loading ? 'spinner fa-spin' : 'save'}`}></i>
              {loading ? 'Updating...' : 'Update Teacher'}
            </Button>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </Modal>
  );
};

export default EditTeacherModal;
