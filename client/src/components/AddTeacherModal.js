import React from 'react';
import styled from 'styled-components';

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
  max-width: 500px;
  width: 90%;
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

const PlaceholderText = styled.div`
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;

  i {
    font-size: 3rem;
    margin-bottom: 20px;
    opacity: 0.5;
    display: block;
  }
`;

const AddTeacherModal = ({ onClose, onSuccess }) => {
  return (
    <Modal onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>
            <i className="fas fa-user-plus"></i>
            Add New Teacher
          </h2>
          <CloseButton onClick={onClose}>
            <i className="fas fa-times"></i>
          </CloseButton>
        </ModalHeader>
        
        <PlaceholderText>
          <i className="fas fa-tools"></i>
          <h3>Feature Coming Soon</h3>
          <p>The Add Teacher form will be implemented here.</p>
          <p>This modal will include fields for:</p>
          <ul style={{ textAlign: 'left', display: 'inline-block' }}>
            <li>Basic Information (Name, Email, Phone)</li>
            <li>Professional Details (Department, Position)</li>
            <li>Qualifications & Experience</li>
            <li>Login Credentials</li>
          </ul>
        </PlaceholderText>
      </ModalContent>
    </Modal>
  );
};

export default AddTeacherModal;
