import React, { useState } from 'react';
import styled from 'styled-components';
import useDevice, { mediaQuery, touchSizes } from '../hooks/useDevice';

const TableContainer = styled.div`
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 20px;
`;

const TableHeader = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0;
  
  ${mediaQuery('tablet')} {
    display: none;
  }
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(150px, 1fr))'};
  gap: 15px;
  padding: 15px 20px;
  font-weight: 600;
  color: #fff;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TableBody = styled.div`
  ${mediaQuery('tablet')} {
    display: block;
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(150px, 1fr))'};
  gap: 15px;
  padding: 15px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.9);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &:last-child {
    border-bottom: none;
  }

  ${mediaQuery('tablet')} {
    display: block;
    padding: 20px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
  }
`;

const TableCell = styled.div`
  display: flex;
  align-items: center;
  min-height: 40px;
  
  ${mediaQuery('tablet')} {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    
    &:last-child {
      border-bottom: none;
      margin-top: 10px;
    }
    
    &::before {
      content: "${props => props.label}";
      font-weight: 600;
      color: #60a5fa;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 120px;
      flex-shrink: 0;
    }
  }
`;

const ActionCell = styled(TableCell)`
  justify-content: flex-end;
  gap: 10px;
  
  ${mediaQuery('tablet')} {
    justify-content: flex-end;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    
    &::before {
      display: none;
    }
  }
`;

const ActionButton = styled.button`
  background: ${props => {
    switch (props.variant) {
      case 'primary': return 'linear-gradient(135deg, #3b82f6, #8b5cf6)';
      case 'secondary': return 'rgba(59, 130, 246, 0.2)';
      case 'danger': return 'rgba(239, 68, 68, 0.2)';
      case 'success': return 'rgba(16, 185, 129, 0.2)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.variant) {
      case 'primary': return 'white';
      case 'secondary': return '#60a5fa';
      case 'danger': return '#fca5a5';
      case 'success': return '#6ee7b7';
      default: return '#fff';
    }
  }};
  border: 1px solid ${props => {
    switch (props.variant) {
      case 'primary': return 'transparent';
      case 'secondary': return 'rgba(59, 130, 246, 0.3)';
      case 'danger': return 'rgba(239, 68, 68, 0.3)';
      case 'success': return 'rgba(16, 185, 129, 0.3)';
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  }};
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
  min-height: ${touchSizes.minTouchTarget};
  min-width: 60px;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  ${mediaQuery('tablet')} {
    padding: 10px 16px;
    min-height: ${touchSizes.preferredTouchTarget};
    font-size: 0.9rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.6);
  
  .empty-icon {
    font-size: 3rem;
    margin-bottom: 15px;
    opacity: 0.5;
  }
  
  .empty-title {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: 8px;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .empty-message {
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.8);
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid rgba(59, 130, 246, 0.3);
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const SearchAndFilter = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  
  ${mediaQuery('tablet')} {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.08);
  }
  
  ${mediaQuery('tablet')} {
    min-width: unset;
    min-height: ${touchSizes.preferredTouchTarget};
  }
`;

const FilterSelect = styled.select`
  padding: 12px 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.9rem;
  min-width: 150px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.08);
  }
  
  option {
    background: #1e293b;
    color: white;
  }
  
  ${mediaQuery('tablet')} {
    min-width: unset;
    width: 100%;
    min-height: ${touchSizes.preferredTouchTarget};
  }
`;

const ResponsiveTable = ({ 
  columns = [], 
  data = [], 
  loading = false, 
  onSearch, 
  onFilter,
  searchPlaceholder = "Search...",
  emptyTitle = "No Data",
  emptyMessage = "No data available to display",
  emptyIcon = "📄",
  renderActions,
  filters = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const device = useDevice();

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleFilter = (value) => {
    setFilterValue(value);
    if (onFilter) {
      onFilter(value);
    }
  };

  const gridColumns = columns.length > 0 ? 
    columns.map(col => col.width || '1fr').join(' ') : 
    'repeat(auto-fit, minmax(150px, 1fr))';

  if (loading) {
    return (
      <TableContainer>
        <LoadingState>
          <div className="spinner"></div>
          <p>Loading data...</p>
        </LoadingState>
      </TableContainer>
    );
  }

  return (
    <>
      {(onSearch || onFilter || filters.length > 0) && (
        <SearchAndFilter>
          {onSearch && (
            <SearchInput
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          )}
          
          {filters.map((filter, index) => (
            <FilterSelect
              key={index}
              value={filterValue}
              onChange={(e) => handleFilter(e.target.value)}
            >
              <option value="">{filter.placeholder || 'All'}</option>
              {filter.options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          ))}
        </SearchAndFilter>
      )}

      <TableContainer>
        {data.length === 0 ? (
          <EmptyState>
            <div className="empty-icon">{emptyIcon}</div>
            <div className="empty-title">{emptyTitle}</div>
            <div className="empty-message">{emptyMessage}</div>
          </EmptyState>
        ) : (
          <>
            <TableHeader>
              <HeaderRow columns={gridColumns}>
                {columns.map((column, index) => (
                  <div key={index}>{column.header}</div>
                ))}
                {renderActions && <div>Actions</div>}
              </HeaderRow>
            </TableHeader>

            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex} columns={gridColumns}>
                  {columns.map((column, colIndex) => (
                    <TableCell key={colIndex} label={column.header}>
                      {column.render ? column.render(row, rowIndex) : row[column.key]}
                    </TableCell>
                  ))}
                  
                  {renderActions && (
                    <ActionCell>
                      {renderActions(row, rowIndex)}
                    </ActionCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </>
        )}
      </TableContainer>
    </>
  );
};

// Helper component for common table actions
export const TableActions = ({ children }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {children}
    </div>
  );
};

export { ActionButton };
export default ResponsiveTable;
