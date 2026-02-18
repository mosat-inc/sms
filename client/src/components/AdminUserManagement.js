import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import { mediaQuery } from '../hooks/useDevice';
import { FaUsers, FaKey, FaToggleOn, FaToggleOff, FaCopy, FaEye, FaEyeSlash, FaUserShield, FaUserGraduate, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import {
  colors,
  LoadingSpinner as SharedLoadingSpinner,
  PageContainer,
  PageHeader,
  Section,
} from './shared/StyledComponents';

const UserManagementContainer = styled(PageContainer)`
  padding: 20px;

  ${mediaQuery('tablet')} {
    padding: 15px;
  }

  ${mediaQuery('mobile')} {
    padding: 10px;
  }
`;

const UserTable = styled.div`
  background-color: ${colors.cardBackground};
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  border: none;
  
  @media (max-width: 768px) {
    border-radius: 0;
  }
  
  @media (max-width: 480px) {
    border-radius: 0;
  }
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 2.5fr;
  gap: 15px;
  padding: 20px;
  background: #f3f4f6;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${colors.textSecondary};
  
  @media (max-width: 1024px) {
    grid-template-columns: 2fr 1fr 1fr 1fr 2.5fr;
    gap: 12px;
    padding: 15px;
    font-size: 0.8rem;
  }
  
  @media (max-width: 768px) {
    display: none;
  }
  
  @media (max-width: 480px) {
    padding: 12px;
    font-size: 0.7rem;
  }
`;

const UserRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 2.5fr;
  gap: 15px;
  padding: 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  transition: background-color 0.2s ease;
  align-items: center;
  
  &:hover {
    background: #f9fafb;
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  @media (max-width: 1024px) {
    grid-template-columns: 2fr 1fr 1fr 1fr 2.5fr;
    gap: 12px;
    padding: 15px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 20px 15px;
    
    > div {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      &:before {
        content: attr(data-label);
        font-weight: 600;
        color: ${colors.textSecondary};
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 1px;
      }
    }
    
    > div:first-child:before { content: 'User Info'; }
    > div:nth-child(2):before { content: 'Role'; }
    > div:nth-child(3):before { content: 'Status'; }
    > div:nth-child(4):before { content: 'Temp Password'; }
    > div:nth-child(5):before { content: 'Last Login'; }
    > div:nth-child(6):before { content: 'Actions'; }
  }
  
  @media (max-width: 480px) {
    padding: 15px 12px;
    gap: 12px;
  }
`;

const UserInfo = styled.div`
  .name {
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 4px;
    color: ${colors.textPrimary};
  }
  
  .email {
    color: ${colors.textSecondary};
    font-size: 0.85rem;
  }
  
  .username {
    color: ${colors.textMuted};
    font-size: 0.8rem;
    margin-top: 2px;
  }
`;

const RoleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.15);
  
  ${props => props.role === 'teacher' && `
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.3);
  `}
  
  ${props => props.role === 'parent' && `
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.3);
  `}
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => props.active ? `
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  ` : `
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  `}
`;

const TempPasswordBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
`;

const ActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 8px;
  white-space: nowrap;
  background: #eff6ff;
  color: ${colors.accentBlue};
  border: 1px solid rgba(37, 99, 235, 0.18);
  
  @media (max-width: 1024px) {
    padding: 6px 10px;
    font-size: 0.75rem;
    gap: 4px;
  }
  
  @media (max-width: 768px) {
    margin-right: 0;
    margin-bottom: 5px;
    padding: 10px 15px;
    font-size: 0.85rem;
    flex: 1;
    justify-content: center;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 0.8rem;
  }
  
  ${props => props.variant === 'reset' && `
    background: rgba(239, 68, 68, 0.12);
    color: #b91c1c;
    border: 1px solid rgba(239, 68, 68, 0.25);
    
    &:hover {
      background: rgba(239, 68, 68, 0.18);
      transform: translateY(-1px);
    }
  `}
  
  ${props => props.variant === 'delete' && `
    background: rgba(220, 38, 38, 0.12);
    color: #b91c1c;
    border: 1px solid rgba(220, 38, 38, 0.25);
    
    &:hover {
      background: rgba(220, 38, 38, 0.18);
      transform: translateY(-1px);
    }
  `}
  
  ${props => props.variant === 'toggle' && `
    background: rgba(59, 130, 246, 0.12);
    color: ${colors.accentBlue};
    border: 1px solid rgba(59, 130, 246, 0.22);
    
    &:hover {
      background: rgba(59, 130, 246, 0.18);
      transform: translateY(-1px);
    }
  `}
  
  ${props => !props.variant && `
    background: rgba(59, 130, 246, 0.12);
    color: ${colors.accentBlue};
    border: 1px solid rgba(59, 130, 246, 0.22);
    
    &:hover {
      background: rgba(59, 130, 246, 0.18);
      transform: translateY(-1px);
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${colors.cardBackground};
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  color: ${colors.textPrimary};
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(15, 23, 42, 0.08);
  
  @media (max-width: 768px) {
    padding: 20px;
    border-radius: 12px;
  }
  
  @media (max-width: 480px) {
    padding: 15px;
    border-radius: 10px;
    max-width: 95%;
  }
`;

const PasswordDisplay = styled.div`
  background: #f3f4f6;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  
  .password {
    font-family: 'Courier New', monospace;
    font-size: 1.1rem;
    font-weight: 600;
    color: ${colors.accentBlueDark};
    letter-spacing: 2px;
  }
  
  .hidden {
    color: ${colors.textMuted};
  }
`;

const CopyButton = styled.button`
  background: rgba(34, 197, 94, 0.14);
  color: #047857;
  border: 1px solid rgba(34, 197, 94, 0.25);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(34, 197, 94, 0.2);
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    gap: 5px;
  }
`;

const EmptyState = styled.div`
  padding: 40px;
  text-align: center;
  color: ${colors.textSecondary};
`;

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetModal, setResetModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { api, user: currentUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleResetPassword = async (userId) => {
    try {
      const response = await api.post('/api/admin/reset-password', {
        user_id: userId,
        reason: 'Admin password reset'
      });

      if (response.data.success) {
        toast.success('Password reset successfully!');
        setResetModal({
          user: response.data.data.user,
          tempPassword: response.data.data.temporary_password,
          instructions: response.data.data.instructions
        });
        fetchUsers(); // Refresh the user list
      } else {
        toast.error('Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const response = await api.post('/api/admin/toggle-user-status', {
        user_id: userId
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchUsers(); // Refresh the user list
      } else {
        toast.error('Failed to toggle user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast.error(error.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const response = await api.delete('/api/admin/delete-user', {
        data: {
          user_id: userId,
          confirm: true
        }
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setDeleteModal(null);
        fetchUsers(); // Refresh the user list
      } else {
        toast.error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Password copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy password');
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStudentAdmissionAccess = async (targetUser) => {
    try {
      const response = await api.post('/api/admin/student-admission-access', {
        user_id: targetUser.id,
        enabled: !targetUser.can_student_admission
      });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchUsers();
      } else {
        toast.error('Failed to update student admission access');
      }
    } catch (error) {
      console.error('Error updating student admission access:', error);
      toast.error(error.response?.data?.message || 'Failed to update student admission access');
    }
  };

  if (loading) {
    return (
      <UserManagementContainer>
        <PageHeader style={{ textAlign: 'center' }}>
          <h1>
            <FaUsers /> User Management
          </h1>
          <p>Manage user accounts, reset passwords, and control access.</p>
        </PageHeader>

        <Section>
          <SharedLoadingSpinner>
            <div className="spinner" />
            <p>Loading user data…</p>
          </SharedLoadingSpinner>
        </Section>
      </UserManagementContainer>
    );
  }

  return (
    <UserManagementContainer>
      <PageHeader style={{ textAlign: 'center' }}>
        <h1>
          <FaUsers /> User Management
        </h1>
        <p>Manage user accounts, reset passwords, and control access.</p>
      </PageHeader>

      <Section style={{ padding: 0 }}>
        <UserTable>
          <TableHeader>
            <div>User Info</div>
            <div>Role</div>
            <div>Status</div>
            <div>Temp Password</div>
            <div>Last Login</div>
            <div>Actions</div>
          </TableHeader>

        {users.map(user => (
          <UserRow key={user.id}>
            <UserInfo>
              <div className="name">{user.name}</div>
              <div className="email">{user.email}</div>
              <div className="username">@{user.username}</div>
            </UserInfo>

            <div>
              <RoleBadge role={user.role}>
                {user.role === 'teacher' ? <FaUserGraduate /> : <FaUserShield />}
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </RoleBadge>
            </div>

            <div>
              <StatusBadge active={user.is_active}>
                {user.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </div>

            <div>
              {user.has_temp_password ? (
                <TempPasswordBadge>Yes</TempPasswordBadge>
              ) : (
                <span style={{ color: colors.textSecondary }}>No</span>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', color: colors.textSecondary }}>
              {formatDate(user.last_login)}
            </div>

            <ActionsContainer>
              <ActionButton
                variant="reset"
                onClick={() => handleResetPassword(user.id)}
                title="Reset Password"
              >
                <FaKey /> Reset
              </ActionButton>
              <ActionButton
                variant="toggle"
                onClick={() => handleToggleUserStatus(user.id)}
                title={user.is_active ? 'Deactivate User' : 'Activate User'}
              >
                {user.is_active ? <FaToggleOff /> : <FaToggleOn />}
                {user.is_active ? 'Deactivate' : 'Activate'}
              </ActionButton>
              {user.role === 'teacher' && (
                <ActionButton
                  variant="toggle"
                  onClick={() => handleStudentAdmissionAccess(user)}
                  title={user.can_student_admission ? 'Revoke Student Admission Access' : 'Grant Student Admission Access'}
                >
                  {user.can_student_admission ? 'Revoke Admission Access' : 'Grant Admission Access'}
                </ActionButton>
              )}
              <ActionButton
                variant="delete"
                onClick={() => setDeleteModal(user)}
                title="Delete User Permanently"
                disabled={user.id === currentUser?.id}
              >
                <FaTrash /> Delete
              </ActionButton>
            </ActionsContainer>
          </UserRow>
        ))}

        {users.length === 0 && (
          <EmptyState>No users found</EmptyState>
        )}
        </UserTable>
      </Section>

      {/* Password Reset Modal */}
      {resetModal && (
        <Modal onClick={() => setResetModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <h2>Password Reset Successful</h2>
            <p>
              Password has been reset for <strong>{resetModal.user.name}</strong> ({resetModal.user.email})
            </p>
            
            <h3>Temporary Password:</h3>
            <PasswordDisplay>
              <span className={showPassword ? 'password' : 'hidden'}>
                {showPassword ? resetModal.tempPassword : '••••••••••••'}
              </span>
              <div>
                <ActionButton
                  variant="toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ marginRight: '8px' }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </ActionButton>
                <CopyButton onClick={() => copyToClipboard(resetModal.tempPassword)}>
                  <FaCopy /> Copy
                </CopyButton>
              </div>
            </PasswordDisplay>

            <div style={{ 
              background: 'rgba(245, 158, 11, 0.1)', 
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '15px',
              margin: '15px 0',
              color: '#92400e'
            }}>
              <strong>Instructions:</strong><br />
              {resetModal.instructions}
            </div>

            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <ActionButton variant="toggle" onClick={() => setResetModal(null)}>
                Close
              </ActionButton>
            </div>
          </ModalContent>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModal && (
        <Modal onClick={() => setDeleteModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                background: 'rgba(220, 38, 38, 0.2)',
                border: '2px solid rgba(220, 38, 38, 0.4)',
                borderRadius: '50%',
                width: '80px',
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: '#dc2626'
              }}>
                <FaExclamationTriangle size={40} />
              </div>
              
              <h2 style={{ color: '#dc2626', marginBottom: '15px' }}>Delete User</h2>
              
              <p style={{ marginBottom: '20px', fontSize: '1.1rem' }}>
                Are you sure you want to <strong>permanently delete</strong> this user?
              </p>
              
              <div style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                  User to be deleted:
                </div>
                <div><strong>Name:</strong> {deleteModal.name}</div>
                <div><strong>Email:</strong> {deleteModal.email}</div>
                <div><strong>Username:</strong> @{deleteModal.username}</div>
                <div><strong>Role:</strong> {deleteModal.role}</div>
              </div>
              
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '25px',
                color: '#ef4444'
              }}>
                <strong>⚠️ Warning:</strong> This action cannot be undone. All user data, assignments, and related records will be permanently removed from the system.
              </div>
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'flex-end',
              marginTop: '25px'
            }}>
              <ActionButton 
                variant="toggle" 
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </ActionButton>
              <ActionButton 
                variant="delete" 
                onClick={() => handleDeleteUser(deleteModal.id)}
              >
                <FaTrash /> Delete Permanently
              </ActionButton>
            </div>
          </ModalContent>
        </Modal>
      )}
    </UserManagementContainer>
  );
};

export default AdminUserManagement;
