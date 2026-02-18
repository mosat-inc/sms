import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
`;

const FiltersBar = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  
  @media (max-width: 768px) {
    padding: 15px;
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const FilterInput = styled.input`
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 15px;
  color: #0f172a;
  font-size: 14px;
  min-width: 200px;
  flex: 2;
  max-width: 300px;
  box-sizing: border-box;
  
  @media (max-width: 480px) {
    min-width: unset;
    width: 100%;
    max-width: none;
    flex: none;
  }

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const FilterSelect = styled.select`
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 10px 15px;
  color: #0f172a;
  font-size: 14px;
  min-width: 150px;
  flex: 1;
  max-width: 200px;
  box-sizing: border-box;
  
  @media (max-width: 480px) {
    min-width: unset;
    width: 100%;
    max-width: none;
    flex: none;
  }

  option {
    background: #ffffff;
    color: #0f172a;
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  
  @media (max-width: 768px) {
    margin: 0;
    border-radius: 0;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
  
  @media (max-width: 768px) {
    min-width: 900px;
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    min-width: 800px;
    font-size: 12px;
  }
`;

const TableHeader = styled.thead`
  background: #f8fafc;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e2e8f0;
  transition: background 0.2s ease;

  &:hover {
    background: #f8fafc;
  }
`;

const TableCell = styled.td`
  padding: 15px;
  color: #0f172a;
  font-size: 14px;
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: break-word;
  
  @media (max-width: 768px) {
    padding: 10px 8px;
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    padding: 8px 6px;
    font-size: 12px;
  }
`;

const TableHeaderCell = styled.th`
  padding: 15px;
  color: #334155;
  font-weight: 600;
  text-align: left;
  font-size: 14px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 10px 8px;
    font-size: 13px;
  }
  
  @media (max-width: 480px) {
    padding: 8px 6px;
    font-size: 12px;
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  padding: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    padding: 15px;
    gap: 15px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    padding: 10px;
    gap: 10px;
  }
`;

const TeacherCard = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    border-color: #3b82f6;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
`;

const Avatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
`;

const CardInfo = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 5px 0;
    color: #60a5fa;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #475569;
    font-size: 14px;
  }
`;

const CardDetails = styled.div`
  margin-bottom: 15px;

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;

    .label {
      color: #64748b;
    }

    .value {
      color: #0f172a;
      font-weight: 500;
    }
  }
`;

const StatusBadge = styled.span`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  background: ${props => props.status === 'active' ? '#10b981' : '#ef4444'};
  color: white;
`;

const SubjectTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
`;

const SubjectTag = styled.span`
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 5px;
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  background: ${props => {
    if (props.variant === 'primary') return 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
    if (props.variant === 'success') return '#10b981';
    if (props.variant === 'warning') return '#f59e0b';
    if (props.variant === 'danger') return '#ef4444';
    return '#e2e8f0';
  }};
  color: ${props => (props.variant ? 'white' : '#0f172a')};
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  
  @media (max-width: 768px) {
    padding: 6px 10px;
    font-size: 11px;
    min-width: 40px;
  }

  &:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-top: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 15px;
  
  @media (max-width: 768px) {
    padding: 15px;
    flex-direction: column;
    gap: 10px;
  }
`;

const PaginationInfo = styled.div`
  color: #475569;
  font-size: 14px;
`;

const PaginationControls = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 480px) {
    gap: 5px;
  }
`;

const PaginationButton = styled.button`
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #0f172a;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: #f8fafc;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.active {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    border-color: transparent;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;

  i {
    font-size: 4rem;
    margin-bottom: 20px;
    opacity: 0.5;
  }

  h3 {
    margin: 0 0 10px 0;
    font-size: 1.5rem;
    color: #334155;
  }

  p {
    margin: 0;
    font-size: 1rem;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 16px;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(59, 130, 246, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const TeacherList = ({
  teachers,
  loading,
  viewType,
  filters,
  onFiltersChange,
  pagination,
  onPageChange,
  onEdit,
  onViewProfile,
  onAssignSubjects,
  onToggleStatus,
  onDelete
}) => {
  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatSubjects = (subjectNames) => {
    if (!subjectNames) return [];
    return subjectNames.split(',').filter(Boolean);
  };

  const formatClasses = (classNames) => {
    if (!classNames) return [];
    return classNames.split(',').filter(Boolean);
  };

  const renderPagination = () => {
    if (pagination.pages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let endPage = Math.min(pagination.pages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <Pagination>
        <PaginationInfo>
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} teachers
        </PaginationInfo>
        <PaginationControls>
          <PaginationButton
            disabled={pagination.page === 1}
            onClick={() => onPageChange(pagination.page - 1)}
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </PaginationButton>
          
          {pages.map(page => (
            <PaginationButton
              key={page}
              className={page === pagination.page ? 'active' : ''}
              onClick={() => onPageChange(page)}
            >
              {page}
            </PaginationButton>
          ))}
          
          <PaginationButton
            disabled={pagination.page === pagination.pages}
            onClick={() => onPageChange(pagination.page + 1)}
          >
            Next
            <i className="fas fa-chevron-right"></i>
          </PaginationButton>
        </PaginationControls>
      </Pagination>
    );
  };

  const renderTableView = () => (
    <TableWrapper>
      <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>Teacher</TableHeaderCell>
          <TableHeaderCell>Contact</TableHeaderCell>
          <TableHeaderCell>Department</TableHeaderCell>
          <TableHeaderCell>Experience</TableHeaderCell>
          <TableHeaderCell>Assignments</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <tbody>
        {teachers.map(teacher => (
          <TableRow key={teacher.id}>
            <TableCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar>
                  {getInitials(teacher.first_name, teacher.last_name)}
                </Avatar>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                    {teacher.first_name} {teacher.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {teacher.employee_id || 'No ID'}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div style={{ fontSize: '13px' }}>
                <div style={{ marginBottom: '2px' }}>{teacher.email}</div>
                <div style={{ color: '#64748b' }}>{teacher.phone || 'No phone'}</div>
              </div>
            </TableCell>
            <TableCell>
              <div style={{ fontSize: '13px' }}>
                <div>{teacher.department || teacher.profile_department || 'Unassigned'}</div>
                {teacher.position && (
                  <div style={{ color: '#64748b', fontSize: '12px' }}>
                    {teacher.position}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div style={{ fontSize: '13px' }}>
                {teacher.experience_years ? `${teacher.experience_years} years` : 'Not specified'}
              </div>
            </TableCell>
            <TableCell>
              <div style={{ fontSize: '13px' }}>
                <div>{teacher.classes_assigned || 0} Classes</div>
                <div style={{ color: '#64748b' }}>
                  {teacher.subjects_taught || 0} Subjects
                </div>
              </div>
            </TableCell>
            <TableCell>
              <StatusBadge status={teacher.status}>
                {teacher.status}
              </StatusBadge>
            </TableCell>
            <TableCell>
              <ActionButtons>
                <ActionButton
                  variant="primary"
                  onClick={() => onViewProfile(teacher)}
                  title="View Profile"
                >
                  <i className="fas fa-eye"></i>
                </ActionButton>
                <ActionButton
                  onClick={() => onEdit(teacher)}
                  title="Edit Teacher"
                >
                  <i className="fas fa-edit"></i>
                </ActionButton>
                <ActionButton
                  variant="success"
                  onClick={() => onAssignSubjects(teacher)}
                  title="Assign Subjects"
                >
                  <i className="fas fa-tasks"></i>
                </ActionButton>
                <ActionButton
                  variant={teacher.status === 'active' ? 'warning' : 'success'}
                  onClick={() => onToggleStatus(teacher.id)}
                  title={teacher.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  <i className={`fas fa-${teacher.status === 'active' ? 'pause' : 'play'}`}></i>
                </ActionButton>
              </ActionButtons>
            </TableCell>
          </TableRow>
        ))}
      </tbody>
      </Table>
    </TableWrapper>
  );

  const renderCardView = () => (
    <CardsGrid>
      {teachers.map(teacher => (
        <TeacherCard key={teacher.id}>
          <CardHeader>
            <Avatar>
              {getInitials(teacher.first_name, teacher.last_name)}
            </Avatar>
            <CardInfo>
              <h3>{teacher.first_name} {teacher.last_name}</h3>
              <p>{teacher.email}</p>
            </CardInfo>
            <StatusBadge status={teacher.status}>
              {teacher.status}
            </StatusBadge>
          </CardHeader>

          <CardDetails>
            <div className="detail-row">
              <span className="label">Employee ID:</span>
              <span className="value">{teacher.employee_id || 'Not assigned'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Department:</span>
              <span className="value">{teacher.department || teacher.profile_department || 'Unassigned'}</span>
            </div>
            {teacher.position && (
              <div className="detail-row">
                <span className="label">Position:</span>
                <span className="value">{teacher.position}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="label">Experience:</span>
              <span className="value">
                {teacher.experience_years ? `${teacher.experience_years} years` : 'Not specified'}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Classes:</span>
              <span className="value">{teacher.classes_assigned || 0}</span>
            </div>
            <div className="detail-row">
              <span className="label">Phone:</span>
              <span className="value">{teacher.phone || 'Not provided'}</span>
            </div>
          </CardDetails>

          {teacher.subject_names && (
            <SubjectTags>
              {formatSubjects(teacher.subject_names).slice(0, 3).map((subject, index) => (
                <SubjectTag key={index}>{subject}</SubjectTag>
              ))}
              {formatSubjects(teacher.subject_names).length > 3 && (
                <SubjectTag>+{formatSubjects(teacher.subject_names).length - 3} more</SubjectTag>
              )}
            </SubjectTags>
          )}

          <ActionButtons style={{ marginTop: '15px' }}>
            <ActionButton
              variant="primary"
              onClick={() => onViewProfile(teacher)}
            >
              <i className="fas fa-eye"></i>
              View
            </ActionButton>
            <ActionButton
              onClick={() => onEdit(teacher)}
            >
              <i className="fas fa-edit"></i>
              Edit
            </ActionButton>
            <ActionButton
              variant="success"
              onClick={() => onAssignSubjects(teacher)}
            >
              <i className="fas fa-tasks"></i>
              Assign
            </ActionButton>
            <ActionButton
              variant={teacher.status === 'active' ? 'warning' : 'success'}
              onClick={() => onToggleStatus(teacher.id)}
            >
              <i className={`fas fa-${teacher.status === 'active' ? 'pause' : 'play'}`}></i>
              {teacher.status === 'active' ? 'Deactivate' : 'Activate'}
            </ActionButton>
          </ActionButtons>
        </TeacherCard>
      ))}
    </CardsGrid>
  );

  return (
    <Container style={{ position: 'relative' }}>
      {loading && (
        <LoadingOverlay>
          <div className="spinner"></div>
        </LoadingOverlay>
      )}

      <FiltersBar>
        <FilterInput
          type="text"
          placeholder="Search by name, email, or employee ID..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />
        <FilterSelect
          value={filters.department}
          onChange={(e) => handleFilterChange('department', e.target.value)}
        >
          <option value="">All Departments</option>
          <option value="Science Department">Science Department</option>
          <option value="Arts Department">Arts Department</option>
          <option value="Commercial Department">Commercial Department</option>
          <option value="Technical Department">Technical Department</option>
          <option value="General Department">General Department</option>
        </FilterSelect>
        <FilterSelect
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </FilterSelect>
      </FiltersBar>

      {teachers.length === 0 && !loading ? (
        <EmptyState>
          <i className="fas fa-chalkboard-teacher"></i>
          <h3>No Teachers Found</h3>
          <p>No teachers match your current filters. Try adjusting your search criteria.</p>
        </EmptyState>
      ) : (
        <>
          {viewType === 'list' ? renderTableView() : renderCardView()}
          {renderPagination()}
        </>
      )}
    </Container>
  );
};

export default TeacherList;
