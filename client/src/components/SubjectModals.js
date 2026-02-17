import React, { useState, useEffect, useCallback } from 'react';
import { FaTimes, FaPlus, FaUpload, FaDownload, FaTrash, FaCheck, FaCheckCircle, FaExclamationTriangle, FaClock, FaBook, FaVideo, FaFileImage, FaFileAudio, FaFilePdf, FaFileWord, FaFile, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background: rgba(30, 41, 59, 0.95);
  border-radius: 16px;
  padding: 30px;
  max-width: ${props => props.wide ? '900px' : '600px'};
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(59, 130, 246, 0.3);
  backdrop-filter: blur(15px);
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    
    h3 {
      color: #fff;
      margin: 0;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .close-button {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 5px;
      border-radius: 50%;
      transition: all 0.3s ease;
      
      &:hover {
        color: #fff;
        background: rgba(239, 68, 68, 0.2);
      }
    }
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  label {
    display: block;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.9rem;
    margin-bottom: 5px;
    font-weight: 500;
  }
  
  input, textarea, select {
    width: 100%;
    padding: 12px;
    border: 1px solid rgba(59, 130, 246, 0.3);
    background: rgba(30, 41, 59, 0.8);
    color: white;
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
      background: rgba(30, 41, 59, 0.9);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    &::placeholder {
      color: rgba(255, 255, 255, 0.5);
    }
  }
  
  textarea {
    min-height: 80px;
    resize: vertical;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 25px;
  
  button {
    padding: 10px 20px;
    border: 1px solid;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    
    &.primary {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border-color: rgba(59, 130, 246, 0.3);
      
      &:hover {
        background: rgba(59, 130, 246, 0.3);
      }
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
    
    &.secondary {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
      border-color: rgba(107, 114, 128, 0.3);
      
      &:hover {
        background: rgba(107, 114, 128, 0.3);
      }
    }
    
    &.danger {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      border-color: rgba(239, 68, 68, 0.3);
      
      &:hover {
        background: rgba(239, 68, 68, 0.3);
      }
    }
    
    &.success {
      background: rgba(34, 197, 94, 0.2);
      color: #22c55e;
      border-color: rgba(34, 197, 94, 0.3);
      
      &:hover {
        background: rgba(34, 197, 94, 0.3);
      }
    }
  }
`;

const TopicsList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  
  .topic-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    .topic-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      
      .topic-title {
        color: #60a5fa;
        font-weight: 500;
        font-size: 1rem;
      }
      
      .topic-actions {
        display: flex;
        gap: 5px;
        
        button {
          background: none;
          border: none;
          padding: 5px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s ease;
          
          &.edit {
            color: #60a5fa;
            &:hover { background: rgba(96, 165, 250, 0.2); }
          }
          
          &.delete {
            color: #ef4444;
            &:hover { background: rgba(239, 68, 68, 0.2); }
          }
        }
      }
    }
    
    .topic-description {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.85rem;
      margin-bottom: 8px;
    }
    
    .topic-details {
      display: flex;
      gap: 15px;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
      
      span {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }
  
  .empty-state {
    text-align: center;
    padding: 40px;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
  }
`;

const MaterialsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  
  .material-item {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    padding: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    
    .material-info {
      margin-bottom: 10px;
      
      .material-icon {
        font-size: 2rem;
        margin-bottom: 8px;
        color: #60a5fa;
        text-align: center;
        display: block;
      }
      
      .material-name {
        color: #fff;
        font-weight: 500;
        margin-bottom: 5px;
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .material-details {
        color: rgba(255, 255, 255, 0.7);
        font-size: 0.8rem;
      }
    }
    
    .material-actions {
      display: flex;
      gap: 5px;
      justify-content: center;
      
      button {
        padding: 6px 10px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.3s ease;
        
        &.view {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          &:hover { background: rgba(34, 197, 94, 0.3); }
        }
        
        &.download {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
          &:hover { background: rgba(59, 130, 246, 0.3); }
        }
        
        &.delete {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
          &:hover { background: rgba(239, 68, 68, 0.3); }
        }
      }
    }
  }
  
  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 40px;
    color: rgba(255, 255, 255, 0.6);
    font-style: italic;
  }
`;

const FileUploadArea = styled.div`
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover, &.dragover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.05);
  }
  
  .upload-icon {
    font-size: 3rem;
    color: rgba(59, 130, 246, 0.7);
    margin-bottom: 15px;
  }
  
  .upload-text {
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 5px;
    font-weight: 500;
  }
  
  .upload-hint {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
  }
  
  input[type="file"] {
    display: none;
  }
`;

const ProgressTracker = styled.div`
  .progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    .progress-summary {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.9rem;
    }
    
    .progress-bar {
      width: 200px;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #22c55e, #16a34a);
        transition: width 0.3s ease;
      }
    }
  }
  
  .topics-checklist {
    max-height: 400px;
    overflow-y: auto;
    
    .topic-check-item {
      display: flex;
      align-items: center;
      padding: 12px;
      margin-bottom: 8px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      
      &:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      
      .topic-checkbox {
        margin-right: 15px;
        width: 20px;
        height: 20px;
        accent-color: #22c55e;
        cursor: pointer;
      }
      
      .topic-info {
        flex: 1;
        
        .topic-title {
          color: #fff;
          font-weight: 500;
          margin-bottom: 5px;
        }
        
        .topic-details {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.8rem;
          display: flex;
          gap: 15px;
          align-items: center;
        }
      }
      
      .topic-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        
        &.completed {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }
        
        &.in-progress {
          background: rgba(245, 158, 11, 0.2);
          color: #f59e0b;
        }
        
        &.pending {
          background: rgba(107, 114, 128, 0.2);
          color: #9ca3af;
        }
      }
    }
  }
`;

// Topic Management Modal
export const TopicManageModal = ({ isOpen, onClose, subject, topics, onAddTopic, onUpdateTopic, onDeleteTopic }) => {
  const { api } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [newTopic, setNewTopic] = useState({
    topic_title: '',
    topic_description: '',
    estimated_hours: 1,
    difficulty_level: 'intermediate',
    learning_objectives: '',
    resources_needed: '',
    assessment_methods: '',
    is_mandatory: true,
    class_id: ''
  });

  const fetchAvailableClasses = useCallback(async () => {
    if (!subject) return;
    
    setLoadingClasses(true);
    try {
      const response = await api.get(`/api/subjects/${subject.id}/classes`);
      setAvailableClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setAvailableClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [api, subject]);

  // Fetch available classes when subject changes
  useEffect(() => {
    if (subject && isOpen) {
      fetchAvailableClasses();
    }
  }, [subject, isOpen, fetchAvailableClasses]);

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopic.topic_title.trim()) {
      toast.error('Topic title is required');
      return;
    }
    
    // If there are multiple classes, ensure one is selected
    if (availableClasses.length > 1 && !newTopic.class_id) {
      toast.error('Please select a class for this topic');
      return;
    }
    
    // If there's only one class, use that class ID
    const topicData = {
      ...newTopic,
      class_id: availableClasses.length === 1 ? availableClasses[0].id : newTopic.class_id
    };
    
    await onAddTopic(topicData);
    setNewTopic({
      topic_title: '',
      topic_description: '',
      estimated_hours: 1,
      difficulty_level: 'intermediate',
      learning_objectives: '',
      resources_needed: '',
      assessment_methods: '',
      is_mandatory: true,
      class_id: ''
    });
    setShowAddForm(false);
  };

  // Note: getFileIcon function removed as it was not being used

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent wide>
        <div className="modal-header">
          <h3><FaBook /> Manage Topics - {subject?.name}</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <TopicsList>
          {topics.length > 0 ? (
            topics.map(topic => (
              <div key={topic.id} className="topic-item">
                <div className="topic-header">
                  <div className="topic-title">{topic.title}</div>
                  <div className="topic-actions">
                    <button className="edit" title="Edit Topic">
                      <FaEdit />
                    </button>
                    <button className="delete" title="Delete Topic" onClick={() => onDeleteTopic(topic.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
                {topic.description && (
                  <div className="topic-description">{topic.description}</div>
                )}
                <div className="topic-details">
                  <span><FaClock /> {topic.estimatedHours}h</span>
                  <span>Difficulty: {topic.difficultyLevel}</span>
                  {topic.status && (
                    <span className={`status ${topic.status}`}>
                      {topic.status === 'completed' && <FaCheckCircle />}
                      {topic.status === 'in-progress' && <FaExclamationTriangle />}
                      {topic.status.charAt(0).toUpperCase() + topic.status.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No topics added yet. Click "Add New Topic" to get started.</div>
          )}
        </TopicsList>

        {showAddForm && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>Add New Topic</h4>
            <form onSubmit={handleAddTopic}>
              <FormGroup>
                <label>Topic Title *</label>
                <input
                  type="text"
                  value={newTopic.topic_title}
                  onChange={(e) => setNewTopic(prev => ({ ...prev, topic_title: e.target.value }))}
                  placeholder="Enter topic title"
                  required
                />
              </FormGroup>
              
              <FormGroup>
                <label>Class {availableClasses.length > 1 ? '*' : ''}</label>
                {loadingClasses ? (
                  <select disabled>
                    <option>Loading classes...</option>
                  </select>
                ) : availableClasses.length > 1 ? (
                  <select
                    value={newTopic.class_id}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, class_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a class</option>
                    {availableClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentCount} students)
                      </option>
                    ))}
                  </select>
                ) : availableClasses.length === 1 ? (
                  <>
                    <input
                      type="text"
                      value={availableClasses[0].name}
                      disabled
                      style={{ background: 'rgba(107, 114, 128, 0.3)', color: 'rgba(255, 255, 255, 0.7)' }}
                    />
                    <input type="hidden" value={availableClasses[0].id} />
                  </>
                ) : (
                  <select disabled>
                    <option>No classes assigned</option>
                  </select>
                )}
                {availableClasses.length > 1 && (
                  <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>
                    Select which class this topic is for
                  </small>
                )}
              </FormGroup>
              
              <FormGroup>
                <label>Description</label>
                <textarea
                  value={newTopic.topic_description}
                  onChange={(e) => setNewTopic(prev => ({ ...prev, topic_description: e.target.value }))}
                  placeholder="Brief description of the topic"
                />
              </FormGroup>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormGroup>
                  <label>Estimated Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={newTopic.estimated_hours}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) }))}
                  />
                </FormGroup>
                
                <FormGroup>
                  <label>Difficulty Level</label>
                  <select
                    value={newTopic.difficulty_level}
                    onChange={(e) => setNewTopic(prev => ({ ...prev, difficulty_level: e.target.value }))}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </FormGroup>
              </div>
              
              <FormGroup>
                <label>Learning Objectives</label>
                <textarea
                  value={newTopic.learning_objectives}
                  onChange={(e) => setNewTopic(prev => ({ ...prev, learning_objectives: e.target.value }))}
                  placeholder="What students should learn from this topic"
                />
              </FormGroup>
              
              <FormGroup>
                <label>Resources Needed</label>
                <input
                  type="text"
                  value={newTopic.resources_needed}
                  onChange={(e) => setNewTopic(prev => ({ ...prev, resources_needed: e.target.value }))}
                  placeholder="Materials, equipment, etc."
                />
              </FormGroup>
              
              <FormGroup>
                <label>Assessment Methods</label>
                <input
                  type="text"
                  value={newTopic.assessment_methods}
                  onChange={(e) => setNewTopic(prev => ({ ...prev, assessment_methods: e.target.value }))}
                  placeholder="Quiz, assignment, practical, etc."
                />
              </FormGroup>
              
              <ButtonGroup>
                <button type="button" className="secondary" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  <FaPlus /> Add Topic
                </button>
              </ButtonGroup>
            </form>
          </div>
        )}

        <ButtonGroup>
          {!showAddForm && (
            <button className="primary" onClick={() => setShowAddForm(true)}>
              <FaPlus /> Add New Topic
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

// Materials Management Modal
export const MaterialsModal = ({ isOpen, onClose, subject, materials, onUploadMaterial, onDeleteMaterial }) => {
  const { api } = useAuth();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [uploadMetadata, setUploadMetadata] = useState({
    category: 'teaching_material',
    is_public: false,
    tags: '',
    class_id: ''
  });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);

  const fetchAvailableClasses = useCallback(async () => {
    if (!subject) return;
    
    setLoadingClasses(true);
    try {
      const response = await api.get(`/api/subjects/${subject.id}/classes`);
      setAvailableClasses(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setAvailableClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [api, subject]);

  // Fetch available classes when subject changes
  useEffect(() => {
    if (subject && isOpen) {
      fetchAvailableClasses();
    }
  }, [subject, isOpen, fetchAvailableClasses]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // CRITICAL DEBUGGING: Log everything about the file selection
    console.log('\n🚨 CRITICAL FILE INPUT ANALYSIS:');
    console.log('🔍 Input event details:', {
      eventType: e.type,
      filesCount: files.length,
      inputMultiple: e.target.multiple,
      inputValue: e.target.value,
      timestamp: new Date().toISOString()
    });
    
    console.log('📁 Raw FileList object:', e.target.files);
    console.log('📁 Array.from(files) details:');
    files.forEach((file, index) => {
      console.log(`File ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        fileReference: file
      });
    });
    
    // Check if we somehow have duplicate file objects
    const fileSignatures = files.map(f => `${f.name}_${f.size}_${f.lastModified}`);
    const uniqueSignatures = [...new Set(fileSignatures)];
    
    if (fileSignatures.length !== uniqueSignatures.length) {
      console.error('❌ DUPLICATE FILES DETECTED IN FILE INPUT!');
      console.log('File signatures:', fileSignatures);
      console.log('Unique signatures:', uniqueSignatures);
    }
    
    // STRICT: Only allow single file since multiple=false
    if (files.length > 1) {
      console.warn('⚠️ Multiple files detected despite multiple=false, taking only the first file');
      setSelectedFiles([files[0]]);
    } else {
      setSelectedFiles(files);
    }
    
    // Clear the input value to prevent sticky selections
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    console.log('Files dropped in modal:', files.map(f => f.name));
    // Limit to single file since we're in single file mode
    setSelectedFiles(files.slice(0, 1));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    const now = Date.now();
    const timeSinceLastSubmission = now - lastSubmissionTime;
    
    console.log('\n🚨 MODAL UPLOAD TRIGGERED:', {
      eventType: e.type,
      timestamp: new Date().toISOString(),
      currentUploading: uploading,
      selectedFilesCount: selectedFiles.length,
      timeSinceLastSubmission: timeSinceLastSubmission + 'ms',
      formTarget: e.target,
      nativeEvent: e.nativeEvent
    });
    
    // Prevent rapid multiple submissions (debounce for 1 second)
    if (timeSinceLastSubmission < 1000) {
      console.log('❌ Rapid submission detected, ignoring (debounced)');
      return;
    }
    
    // Prevent duplicate submissions
    if (uploading) {
      console.log('❌ Upload already in progress, ignoring duplicate submission');
      return;
    }
    
    setLastSubmissionTime(now);
    
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }
    
    // Log file selection details
    console.log('Files selected for upload in modal:', selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    console.log('Upload metadata (initial):', uploadMetadata);
    
    // If there are multiple classes, ensure one is selected
    if (availableClasses.length > 1 && !uploadMetadata.class_id) {
      toast.error('Please select a class for these materials');
      return;
    }
    
    // If there's only one class, use that class ID
    const metadata = {
      ...uploadMetadata,
      class_id: availableClasses.length === 1 ? availableClasses[0].id : uploadMetadata.class_id
    };
    
    console.log('Final upload metadata:', metadata);

    setUploading(true);
    try {
      console.log('Starting upload with metadata:', metadata);
      await onUploadMaterial(selectedFiles, metadata);
      
      // Only clear form if upload was successful
      setSelectedFiles([]);
      setUploadMetadata({
        category: 'teaching_material',
        is_public: false,
        tags: '',
        class_id: ''
      });
      setShowUploadForm(false);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (!fileType) return <FaFile />;
    
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return <FaFilePdf />;
    if (type.includes('doc') || type.includes('docx')) return <FaFileWord />;
    if (type.includes('video') || type.includes('mp4') || type.includes('avi')) return <FaVideo />;
    if (type.includes('image') || type.includes('jpg') || type.includes('png')) return <FaFileImage />;
    if (type.includes('audio') || type.includes('mp3') || type.includes('wav')) return <FaFileAudio />;
    return <FaFile />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent wide>
        <div className="modal-header">
          <h3><FaUpload /> Materials - {subject?.name}</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <MaterialsGrid>
          {materials.length > 0 ? (
            materials.reduce((acc, material, index) => {
              // Deduplicate materials to prevent React key conflicts
              if (!acc.find(m => m.id === material.id)) {
                acc.push(material);
              }
              return acc;
            }, []).map((material, index) => (
              <div key={`modal-material-${material.id}-${index}`} className="material-item">
                <div className="material-info">
                  <div className="material-icon">
                    {getFileIcon(material.fileType)}
                  </div>
                  <div className="material-name" title={material.fileName}>
                    {material.fileName || material.title}
                  </div>
                  <div className="material-details">
                    {material.fileType && material.fileType.toUpperCase()} • {formatFileSize(material.fileSize)}
                    <br />
                    {material.category?.replace('_', ' ')}
                  </div>
                </div>
                <div className="material-actions">
                  <button className="download" title="Download">
                    <FaDownload />
                  </button>
                  <button className="delete" title="Delete" onClick={() => onDeleteMaterial(material.id)}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No materials uploaded yet. Click "Upload Materials" to add some.</div>
          )}
        </MaterialsGrid>

        {showUploadForm && (
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h4 style={{ color: '#fff', marginBottom: '15px' }}>Upload Materials</h4>
            <form onSubmit={handleUpload}>
              <FileUploadArea
                className={dragOver ? 'dragover' : ''}
                onClick={() => document.getElementById(`file-input-modal-${subject?.id || 'unknown'}`).click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="upload-icon">
                  <FaUpload />
                </div>
                <div className="upload-text">
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length === 1 ? '1 file' : selectedFiles.length + ' files'} selected` 
                    : 'Click to select a file or drag and drop'
                  }
                </div>
                <div className="upload-hint">
                  Supported formats: PDF, DOC, PPT, Images, Videos, Audio
                </div>
                <input
                  id={`file-input-modal-${subject?.id || 'unknown'}`}
                  type="file"
                  multiple={false}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov,.mp3,.wav"
                  onChange={handleFileSelect}
                  key={`file-input-${subject?.id}-${showUploadForm}`}
                />
              </FileUploadArea>

              {selectedFiles.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <strong style={{ color: '#fff' }}>Selected file{selectedFiles.length > 1 ? 's' : ''}:</strong>
                  {selectedFiles.map((file, index) => (
                    <div key={index} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '5px' }}>
                      {file.name} ({formatFileSize(file.size)})
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <FormGroup>
                  <label>Category</label>
                  <select
                    value={uploadMetadata.category}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="teaching_material">Teaching Material</option>
                    <option value="lesson_plan">Lesson Plan</option>
                    <option value="syllabus">Syllabus</option>
                    <option value="assignment">Assignment</option>
                    <option value="assessment">Assessment</option>
                  </select>
                </FormGroup>

                <FormGroup>
                  <label>
                    <input
                      type="checkbox"
                      checked={uploadMetadata.is_public}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, is_public: e.target.checked }))}
                      style={{ marginRight: '8px' }}
                    />
                    Make public (visible to other teachers)
                  </label>
                </FormGroup>
              </div>

              <FormGroup>
                <label>Class {availableClasses.length > 1 ? '*' : ''}</label>
                {loadingClasses ? (
                  <select disabled>
                    <option>Loading classes...</option>
                  </select>
                ) : availableClasses.length > 1 ? (
                  <select
                    value={uploadMetadata.class_id}
                    onChange={(e) => setUploadMetadata(prev => ({ ...prev, class_id: e.target.value }))}
                    required
                  >
                    <option value="">Select a class</option>
                    {availableClasses.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.studentCount} students)
                      </option>
                    ))}
                  </select>
                ) : availableClasses.length === 1 ? (
                  <input
                    type="text"
                    value={availableClasses[0].name}
                    disabled
                    style={{ background: 'rgba(107, 114, 128, 0.3)', color: 'rgba(255, 255, 255, 0.7)' }}
                  />
                ) : (
                  <select disabled>
                    <option>No classes assigned</option>
                  </select>
                )}
                {availableClasses.length > 1 && (
                  <small style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem', marginTop: '5px', display: 'block' }}>
                    Select which class these materials are for
                  </small>
                )}
              </FormGroup>

              <FormGroup>
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  value={uploadMetadata.tags}
                  onChange={(e) => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., worksheet, homework, practice"
                />
              </FormGroup>

              <ButtonGroup>
                <button type="button" className="secondary" onClick={() => setShowUploadForm(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="success" 
                  disabled={selectedFiles.length === 0 || uploading}
                >
                  {uploading ? (
                    <>
                      <div style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid transparent', 
                        borderTop: '2px solid currentColor', 
                        borderRadius: '50%', 
                        animation: 'spin 1s linear infinite' 
                      }} /> Uploading...
                    </>
                  ) : (
                    <><FaUpload /> Upload Materials</>
                  )}
                </button>
              </ButtonGroup>
            </form>
          </div>
        )}

        <ButtonGroup>
          {!showUploadForm && (
            <button className="success" onClick={() => setShowUploadForm(true)}>
              <FaUpload /> Upload Materials
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};

// Progress Tracking Modal
export const ProgressModal = ({ isOpen, onClose, subject, topics, onTopicStatusChange }) => {
  const { api } = useAuth();
  const completedTopics = topics.filter(topic => topic.status === 'completed').length;
  const totalTopics = topics.length;
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const handleTopicAction = async (topicId, action) => {
    try {
      const response = await api.put(`/api/curriculum/topics/${topicId}/progress`, { action });

      if (response.status >= 200 && response.status < 300) {
        // Call parent callback to refresh topics
        if (onTopicStatusChange) {
          onTopicStatusChange();
        }
      } else {
        toast.error(response.data?.message || `Failed to ${action} topic`);
      }
    } catch (error) {
      console.error(`Error ${action}ing topic:`, error);
      toast.error(`Failed to ${action} topic`);
    }
  };

  const calculateElapsedTime = (startDate, endDate) => {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <ModalContent wide>
        <div className="modal-header">
          <h3><FaCheck /> Curriculum Progress - {subject?.name}</h3>
          <button className="close-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <ProgressTracker>
          <div className="progress-header">
            <div className="progress-summary">
              {completedTopics} of {totalTopics} topics completed ({progressPercentage}%)
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          <div className="topics-checklist">
            {topics.length > 0 ? (
              topics.map(topic => {
                const elapsedTime = calculateElapsedTime(topic.startDate, topic.completionDate);
                const isInProgress = topic.status === 'in_progress' || topic.status === 'in-progress';
                const isCompleted = topic.status === 'completed';
                const isPending = !topic.status || topic.status === 'pending';
                
                return (
                  <div key={topic.id} className="topic-check-item">
                    <div className="topic-actions" style={{ marginRight: '15px', display: 'flex', gap: '8px' }}>
                      {isPending && (
                        <button
                          onClick={() => handleTopicAction(topic.id, 'start')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            background: 'rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.background = 'rgba(34, 197, 94, 0.3)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(34, 197, 94, 0.2)'}
                        >
                          ▶️ Start
                        </button>
                      )}
                      {isInProgress && (
                        <button
                          onClick={() => handleTopicAction(topic.id, 'finish')}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.3)'}
                          onMouseOut={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
                        >
                          ✅ Finish
                        </button>
                      )}
                      {isCompleted && (
                        <span style={{
                          padding: '6px 12px',
                          fontSize: '11px',
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#22c55e',
                          borderRadius: '4px'
                        }}>
                          ✓ Completed
                        </span>
                      )}
                    </div>
                    <div className="topic-info" style={{ flex: 1 }}>
                      <div className="topic-title">{topic.title}</div>
                      <div className="topic-details">
                        <span><FaClock /> {topic.estimatedHours}h estimated</span>
                        <span>Difficulty: {topic.difficultyLevel}</span>
                        {topic.actualHours && (
                          <span>Actual: {topic.actualHours}h</span>
                        )}
                        {isInProgress && elapsedTime && (
                          <span style={{ color: '#f59e0b' }}>⏱️ {elapsedTime} in progress</span>
                        )}
                        {isCompleted && topic.completionDate && (
                          <span>✅ Completed: {new Date(topic.completionDate).toLocaleDateString()}</span>
                        )}
                        {isCompleted && elapsedTime && (
                          <span style={{ color: '#22c55e' }}>⌛ Took {elapsedTime}</span>
                        )}
                      </div>
                    </div>
                    <div className={`topic-status ${topic.status || 'pending'}`}>
                      {topic.status === 'completed' && <FaCheckCircle />}
                      {isInProgress && <FaExclamationTriangle />}
                      {(topic.status || 'pending').charAt(0).toUpperCase() + (topic.status || 'pending').slice(1).replace('-', ' ')}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
                No topics added yet. Add topics in the "Manage" section to track progress.
              </div>
            )}
          </div>
        </ProgressTracker>

        <ButtonGroup>
          <button className="secondary" onClick={onClose}>
            Close
          </button>
        </ButtonGroup>
      </ModalContent>
    </ModalOverlay>
  );
};
