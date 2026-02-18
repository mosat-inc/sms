import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContainer = styled.div`
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 40px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: white;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  
  h2 {
    margin: 0;
    font-size: 1.8rem;
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }
`;

const Form = styled.form`
  display: grid;
  gap: 20px;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$columns || '1fr'};
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Input = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    background: rgba(255, 255, 255, 0.15);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const Select = styled.select`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    background: rgba(255, 255, 255, 0.15);
  }
  
  option {
    background: #1e293b;
    color: white;
  }
`;

const TextArea = styled.textarea`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  color: white;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    background: rgba(255, 255, 255, 0.15);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const CheckboxContainer = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 15px;
  max-height: 200px;
  overflow-y: auto;
  
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    background: rgba(255, 255, 255, 0.15);
  }
`;

const CheckboxGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.9);
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
  
  input {
    margin-right: 10px;
    accent-color: #3b82f6;
    width: 16px;
    height: 16px;
  }
  
  span {
    font-size: 0.9rem;
  }
`;

const SelectedCount = styled.div`
  font-size: 0.8rem;
  color: rgba(59, 130, 246, 0.8);
  margin-top: 8px;
  font-weight: 500;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
`;

const Button = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SaveButton = styled(Button)`
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2563eb, #1e40af);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  }
`;

const CancelButton = styled(Button)`
  background: rgba(107, 114, 128, 0.2);
  color: #d1d5db;
  border: 1px solid rgba(107, 114, 128, 0.3);
  
  &:hover:not(:disabled) {
    background: rgba(107, 114, 128, 0.4);
  }
`;

const EditProfile = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    qualification: user?.qualification || '',
    experience: user?.experience || '',
    department: user?.department || '',
    position: user?.position || '',
    bio: user?.bio || '',
    // Teaching assignment fields
    employee_id: user?.employee_id || '',
    specialization: user?.specialization || '',
    experience_years: user?.experience_years || 0,
    joining_date: user?.joining_date || '',
    subjects_taught: user?.subjects_taught || [],
    classes_assigned: user?.classes_assigned || []
  });

  const availableSubjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'English', 'Kiswahili', 'History', 'Geography',
    'Computer Science', 'Business Studies', 'Book Keeping', 'Physical Education'
  ];

  const availableClasses = [
    '1A', '1B', '2A', '2B', '3A', '3B'
  ];

  // Update form data when user changes or modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        qualification: user?.qualification || '',
        experience: user?.experience || '',
        department: user?.department || '',
        position: user?.position || '',
        bio: user?.bio || '',
        // Teaching assignment fields
        employee_id: user?.employee_id || '',
        specialization: user?.specialization || '',
        experience_years: user?.experience_years || 0,
        joining_date: user?.joining_date || '',
        subjects_taught: user?.subjects_taught || [],
        classes_assigned: user?.classes_assigned || []
      });
    }
  }, [isOpen, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCheckboxChange = (name, value, isChecked) => {
    setFormData(prev => {
      const currentArray = prev[name] || [];
      
      if (isChecked) {
        // Check if the value is already in the array (handle both string and object formats)
        const isAlreadyIncluded = currentArray.some(item => 
          (typeof item === 'string' ? item : item.name) === value
        );
        
        if (!isAlreadyIncluded) {
          // Add as an object with id and name
          const newItem = {
            id: Math.max(0, ...currentArray.map(item => item.id || 0)) + 1, // Simple ID generation
            name: value
          };
          return {
            ...prev,
            [name]: [...currentArray, newItem]
          };
        }
        return prev;
      } else {
        // Remove the value from the array (handle both string and object formats)
        return {
          ...prev,
          [name]: currentArray.filter(item => 
            (typeof item === 'string' ? item : item.name) !== value
          )
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = { ...formData };
      if (isTeacher) {
        delete payload.department;
        delete payload.position;
        delete payload.subjects_taught;
        delete payload.classes_assigned;
      }

      console.log('EditProfile: Form submission with data:', {
        subjects_taught: payload.subjects_taught,
        classes_assigned: payload.classes_assigned,
        full_form_data: payload
      });
      
      // Call the actual updateProfile function
      const result = await updateProfile(payload);
      
      if (result.success) {
        toast.success('Profile updated successfully!');
        onClose();
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>Edit Profile</h2>
          <CloseButton onClick={onClose}>
            <i className="fas fa-times"></i>
          </CloseButton>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormRow $columns="1fr 1fr">
            <FormGroup>
              <Label>First Name</Label>
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
              <Label>Last Name</Label>
              <Input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                placeholder="Enter last name"
                required
              />
            </FormGroup>
          </FormRow>

          <FormRow $columns="1fr 1fr">
            <FormGroup>
              <Label>Email</Label>
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
              <Label>Phone Number</Label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+255 789 123 456"
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <Label>Address</Label>
            <Input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter your address"
            />
          </FormGroup>

          <FormRow $columns="1fr 1fr">
            <FormGroup>
              <Label>Department</Label>
              {isTeacher ? (
                <Input
                  type="text"
                  value={formData.department || 'Not assigned by admin yet'}
                  disabled
                  readOnly
                />
              ) : (
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
                </Select>
              )}
            </FormGroup>
            <FormGroup>
              <Label>Position</Label>
              {isTeacher ? (
                <Input
                  type="text"
                  value={formData.position || 'Not assigned by admin yet'}
                  disabled
                  readOnly
                />
              ) : (
                <Select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                >
                  <option value="">Select Position</option>
                  <option value="Head Teacher">Head Teacher</option>
                  <option value="Senior Teacher">Senior Teacher</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Assistant Teacher">Assistant Teacher</option>
                </Select>
              )}
            </FormGroup>
          </FormRow>

          <FormRow $columns="1fr 1fr">
            <FormGroup>
              <Label>Qualification</Label>
              <Input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleInputChange}
                placeholder="e.g., Bachelor of Science in Mathematics"
              />
            </FormGroup>
            <FormGroup>
              <Label>Experience</Label>
              <Input
                type="text"
                name="experience"
                value={formData.experience}
                onChange={handleInputChange}
                placeholder="e.g., 8 years"
              />
            </FormGroup>
          </FormRow>

          <FormRow $columns="1fr 1fr">
            <FormGroup>
              <Label>Employee ID</Label>
              <Input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleInputChange}
                placeholder="e.g., EMP001"
              />
            </FormGroup>
            <FormGroup>
              <Label>Specialization</Label>
              <Input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleInputChange}
                placeholder="e.g., Secondary Mathematics"
              />
            </FormGroup>
          </FormRow>

          <FormRow $columns="1fr 1fr">
            <FormGroup>
              <Label>Experience Years</Label>
              <Input
                type="number"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleInputChange}
                placeholder="Years of teaching experience"
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
          </FormRow>

          {isTeacher ? (
            <FormGroup>
              <Label>Teaching Assignment</Label>
              <Input
                type="text"
                value="Subjects and classes are assigned by admin only."
                disabled
                readOnly
              />
            </FormGroup>
          ) : (
            <>
              <FormGroup>
                <Label>Subjects Taught</Label>
                <CheckboxContainer>
                  <CheckboxGrid>
                    {availableSubjects.map((subject) => (
                      <CheckboxItem key={subject}>
                        <input
                          type="checkbox"
                          checked={formData.subjects_taught?.some(item => 
                            (typeof item === 'string' ? item : item.name) === subject
                          ) || false}
                          onChange={(e) => handleCheckboxChange('subjects_taught', subject, e.target.checked)}
                        />
                        <span>{subject}</span>
                      </CheckboxItem>
                    ))}
                  </CheckboxGrid>
                  {formData.subjects_taught?.length > 0 && (
                    <SelectedCount>
                      {formData.subjects_taught.length} subject{formData.subjects_taught.length !== 1 ? 's' : ''} selected
                    </SelectedCount>
                  )}
                </CheckboxContainer>
              </FormGroup>

              <FormGroup>
                <Label>Classes Assigned</Label>
                <CheckboxContainer>
                  <CheckboxGrid>
                    {availableClasses.map((className) => (
                      <CheckboxItem key={className}>
                        <input
                          type="checkbox"
                          checked={formData.classes_assigned?.some(item => 
                            (typeof item === 'string' ? item : item.name) === className
                          ) || false}
                          onChange={(e) => handleCheckboxChange('classes_assigned', className, e.target.checked)}
                        />
                        <span>Form {className}</span>
                      </CheckboxItem>
                    ))}
                  </CheckboxGrid>
                  {formData.classes_assigned?.length > 0 && (
                    <SelectedCount>
                      {formData.classes_assigned.length} class{formData.classes_assigned.length !== 1 ? 'es' : ''} assigned
                    </SelectedCount>
                  )}
                </CheckboxContainer>
              </FormGroup>
            </>
          )}

          <FormGroup>
            <Label>Bio</Label>
            <TextArea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself and your teaching philosophy..."
            />
          </FormGroup>

          <ButtonRow>
            <CancelButton type="button" onClick={onClose} disabled={loading}>
              Cancel
            </CancelButton>
            <SaveButton type="submit" disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save" style={{ marginRight: '8px' }}></i>
                  Save Changes
                </>
              )}
            </SaveButton>
          </ButtonRow>
        </Form>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default EditProfile;
