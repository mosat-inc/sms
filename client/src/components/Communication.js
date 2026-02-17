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
  shadows,
  borderRadius
} from './shared/StyledComponents';
import { mediaQuery } from '../hooks/useDevice';

const Container = styled(PageContainer)`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  
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
  
  h1 {
    display: flex;
    align-items: center;
    gap: 15px;
    
    i {
      font-size: 1.8rem;
      color: #10b981;
    }
  }
`;

const Title = styled.h1`
  color: ${colors.textPrimary};
  font-size: 2rem;
  margin: 0;
  display: flex;
  align-items: center;
  font-family: var(--font-display);
  gap: 15px;
  
  i {
    font-size: 1.8rem;
    color: #10b981;
  }
  
  ${mediaQuery('tablet')} {
    font-size: 1.75rem;
  }
  
  ${mediaQuery('mobile')} {
    font-size: 1.5rem;
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
  }
`;

const Tab = styled(SharedTab)``;

const Section = styled(SharedSection)``;

const SectionTitle = styled(SharedSectionTitle)``;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
  
  ${mediaQuery('mobile')} {
    grid-template-columns: 1fr;
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

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid ${colors.border};
  border-radius: ${borderRadius.small};
  font-size: 1rem;
  background: ${colors.cardBackground};
  color: ${colors.textPrimary};
  transition: all 0.3s ease;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;

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
  shouldForwardProp: (prop) => !['secondary', 'danger', 'small'].includes(prop)
})`
  background: ${props => 
    props.danger ? 'linear-gradient(135deg, #ef4444, #b91c1c)' :
    props.secondary ? '#f3f4f6' : 
    'linear-gradient(135deg, #10b981, #059669)'
  };
  color: ${props => props.secondary ? colors.textPrimary : '#fff'};
  border: 1px solid ${props => 
    props.danger ? 'transparent' :
    props.secondary ? 'rgba(148, 163, 184, 0.7)' : 
    'transparent'
  };
  padding: ${props => props.small ? '8px 16px' : '12px 24px'};
  border-radius: ${borderRadius.pill};
  font-size: ${props => props.small ? '0.9rem' : '1rem'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.secondary ? 'none' : shadows.button};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.secondary ? shadows.card : shadows.buttonHover};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const AnnouncementCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
  }
`;

const AnnouncementHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 15px;
  gap: 15px;
`;

const AnnouncementTitle = styled.h3`
  color: #fff;
  font-size: 1.3rem;
  margin: 0;
  font-weight: 600;
  flex: 1;
`;

const PriorityBadge = styled.span`
  background: ${props => {
    switch(props.priority?.toLowerCase()) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#2563eb';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }};
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const AnnouncementMeta = styled.div`
  display: flex;
  gap: 15px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin-bottom: 15px;
`;

const AnnouncementContent = styled.div`
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  margin-bottom: 20px;
  white-space: pre-wrap;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  
  i {
    font-size: 3rem;
    margin-bottom: 20px;
    color: rgba(255, 255, 255, 0.3);
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
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top: 4px solid #10b981;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const FilterRow = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  align-items: end;
`;

const Communication = () => {
  const { user, api } = useAuth();
  const [activeTab, setActiveTab] = useState('view');
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [classes, setClasses] = useState([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'medium',
    target_audience: 'all',
    class_id: '',
    expires_at: '',
    is_active: true
  });

  const [filters, setFilters] = useState({
    priority: '',
    target_audience: '',
    status: 'active'
  });

  const isAdmin = user?.role === 'admin';

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/communication/announcements', {
        params: filters
      });
      if (response.data.success) {
        setAnnouncements(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  const fetchClasses = useCallback(async () => {
    try {
      const response = await api.get('/api/classes');
      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, [api]);

  useEffect(() => {
    fetchAnnouncements();
    fetchClasses();
  }, [fetchAnnouncements, fetchClasses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const data = {
        ...announcementForm,
        expires_at: announcementForm.expires_at || null
      };

      let response;
      if (editingAnnouncement) {
        response = await api.put(`/api/communication/announcements/${editingAnnouncement.id}`, data);
      } else {
        response = await api.post('/api/communication/announcements', data);
      }

      if (response.data.success) {
        toast.success(editingAnnouncement ? 'Announcement updated successfully!' : 'Announcement created successfully!');
        setAnnouncementForm({
          title: '',
          content: '',
          priority: 'medium',
          target_audience: 'all',
          class_id: '',
          expires_at: '',
          is_active: true
        });
        setEditingAnnouncement(null);
        setActiveTab('view');
        fetchAnnouncements();
        
        // Immediately refresh notifications for real-time updates
        if (window.refreshNotifications) {
          window.refreshNotifications();
        }
        
        // Also refresh notification toasts
        if (window.refreshNotificationToasts) {
          window.refreshNotificationToasts();
        }
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error(error.response?.data?.message || 'Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement) => {
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      class_id: announcement.class_id || '',
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().split('T')[0] : '',
      is_active: announcement.is_active
    });
    setEditingAnnouncement(announcement);
    setActiveTab('create');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      setLoading(true);
      const response = await api.delete(`/api/communication/announcements/${id}`);
      if (response.data.success) {
        toast.success('Announcement deleted successfully!');
        fetchAnnouncements();
        
        // Immediately refresh notifications
        if (window.refreshNotifications) {
          window.refreshNotifications();
        }
        
        // Also refresh notification toasts
        if (window.refreshNotificationToasts) {
          window.refreshNotificationToasts();
        }
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const response = await api.patch(`/api/communication/announcements/${id}/toggle-status`);
      if (response.data.success) {
        toast.success(`Announcement ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        fetchAnnouncements();
        
        // Immediately refresh notifications
        if (window.refreshNotifications) {
          window.refreshNotifications();
        }
        
        // Also refresh notification toasts
        if (window.refreshNotificationToasts) {
          window.refreshNotificationToasts();
        }
      }
    } catch (error) {
      console.error('Error toggling announcement status:', error);
      toast.error('Failed to update announcement status');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityIcon = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'urgent': return 'fas fa-exclamation-triangle';
      case 'high': return 'fas fa-exclamation-circle';
      case 'medium': return 'fas fa-info-circle';
      case 'low': return 'fas fa-check-circle';
      default: return 'fas fa-bell';
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <i className="fas fa-bullhorn"></i>
          Communication Center
        </Title>
      </Header>

      <TabContainer>
        <Tab 
          $active={activeTab === 'view'} 
          onClick={() => setActiveTab('view')}
        >
          <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
          View Announcements
        </Tab>
        {isAdmin && (
          <Tab 
            $active={activeTab === 'create'} 
            onClick={() => {
              setActiveTab('create');
              setEditingAnnouncement(null);
              setAnnouncementForm({
                title: '',
                content: '',
                priority: 'medium',
                target_audience: 'all',
                class_id: '',
                expires_at: '',
                is_active: true
              });
            }}
          >
            <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
            Create Announcement
          </Tab>
        )}
      </TabContainer>

      {activeTab === 'view' && (
        <Section>
          <SectionTitle>Announcements</SectionTitle>
          
          <FilterRow>
            <FormGroup>
              <Label>Filter by Priority</Label>
              <Select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label>Filter by Audience</Label>
              <Select
                value={filters.target_audience}
                onChange={(e) => setFilters(prev => ({ ...prev, target_audience: e.target.value }))}
              >
                <option value="">All Audiences</option>
                <option value="all">Everyone</option>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="parents">Parents</option>
                <option value="specific_class">Specific Class</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Label>Status</Label>
              <Select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="all">All</option>
              </Select>
            </FormGroup>
            
            <FormGroup>
              <Button secondary onClick={() => setFilters({ priority: '', target_audience: '', status: 'active' })}>
                <i className="fas fa-times" style={{ marginRight: '8px' }}></i>
                Clear Filters
              </Button>
            </FormGroup>
          </FilterRow>

          {loading ? (
            <LoadingSpinner><div /></LoadingSpinner>
          ) : announcements.length > 0 ? (
            announcements.map((announcement) => (
              <AnnouncementCard key={announcement.id}>
                <AnnouncementHeader>
                  <AnnouncementTitle>
                    <i className={getPriorityIcon(announcement.priority)} style={{ marginRight: '10px', color: '#10b981' }}></i>
                    {announcement.title}
                  </AnnouncementTitle>
                  <PriorityBadge priority={announcement.priority}>
                    {announcement.priority}
                  </PriorityBadge>
                </AnnouncementHeader>
                
                <AnnouncementMeta>
                  <span>
                    <i className="fas fa-users" style={{ marginRight: '5px' }}></i>
                    {announcement.target_audience === 'specific_class' 
                      ? `Class: ${announcement.class_name || 'Unknown'}` 
                      : announcement.target_audience.charAt(0).toUpperCase() + announcement.target_audience.slice(1)
                    }
                  </span>
                  <span>
                    <i className="fas fa-calendar" style={{ marginRight: '5px' }}></i>
                    {formatDate(announcement.created_at)}
                  </span>
                  {announcement.expires_at && (
                    <span>
                      <i className="fas fa-clock" style={{ marginRight: '5px' }}></i>
                      Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <span>
                    <i className="fas fa-user" style={{ marginRight: '5px' }}></i>
                    By: {announcement.author_name}
                  </span>
                </AnnouncementMeta>
                
                <AnnouncementContent>
                  {announcement.content}
                </AnnouncementContent>
                
                {isAdmin && (
                  <ActionButtons>
                    <Button small secondary onClick={() => handleEdit(announcement)}>
                      <i className="fas fa-edit"></i>
                    </Button>
                    <Button 
                      small 
                      secondary 
                      onClick={() => toggleStatus(announcement.id, announcement.is_active)}
                    >
                      <i className={`fas fa-${announcement.is_active ? 'eye-slash' : 'eye'}`}></i>
                      {announcement.is_active ? 'Hide' : 'Show'}
                    </Button>
                    <Button small danger onClick={() => handleDelete(announcement.id)}>
                      <i className="fas fa-trash"></i>
                    </Button>
                  </ActionButtons>
                )}
              </AnnouncementCard>
            ))
          ) : (
            <EmptyState>
              <i className="fas fa-bullhorn"></i>
              <div>No announcements found</div>
              <div style={{ fontSize: '0.9rem', marginTop: '10px' }}>
                {isAdmin ? 'Create your first announcement to get started!' : 'Check back later for updates.'}
              </div>
            </EmptyState>
          )}
        </Section>
      )}

      {activeTab === 'create' && isAdmin && (
        <Section>
          <SectionTitle>
            {editingAnnouncement ? 'Edit Announcement' : 'Create New Announcement'}
          </SectionTitle>
          
          <form onSubmit={handleSubmit}>
            <FormRow>
              <FormGroup>
                <Label>Title *</Label>
                <Input
                  type="text"
                  placeholder="Enter announcement title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Priority</Label>
                <Select
                  value={announcementForm.priority}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </Select>
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <Label>Target Audience</Label>
                <Select
                  value={announcementForm.target_audience}
                  onChange={(e) => setAnnouncementForm(prev => ({ 
                    ...prev, 
                    target_audience: e.target.value,
                    class_id: e.target.value !== 'specific_class' ? '' : prev.class_id
                  }))}
                >
                  <option value="all">Everyone</option>
                  <option value="students">Students Only</option>
                  <option value="teachers">Teachers Only</option>
                  <option value="parents">Parents Only</option>
                  <option value="specific_class">Specific Class</option>
                </Select>
              </FormGroup>
              
              {announcementForm.target_audience === 'specific_class' && (
                <FormGroup>
                  <Label>Select Class</Label>
                  <Select
                    value={announcementForm.class_id}
                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, class_id: e.target.value }))}
                    required={announcementForm.target_audience === 'specific_class'}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              )}
              
              <FormGroup>
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={announcementForm.expires_at}
                  onChange={(e) => setAnnouncementForm(prev => ({ ...prev, expires_at: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </FormGroup>
            </FormRow>
            
            <FormGroup>
              <Label>Content *</Label>
              <TextArea
                placeholder="Enter announcement content..."
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                required
              />
            </FormGroup>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '25px' }}>
              <Button 
                type="button" 
                secondary 
                onClick={() => {
                  setActiveTab('view');
                  setEditingAnnouncement(null);
                  setAnnouncementForm({
                    title: '',
                    content: '',
                    priority: 'medium',
                    target_audience: 'all',
                    class_id: '',
                    expires_at: '',
                    is_active: true
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (editingAnnouncement ? 'Update Announcement' : 'Create Announcement')}
              </Button>
            </div>
          </form>
        </Section>
      )}
    </Container>
  );
};

export default Communication;
