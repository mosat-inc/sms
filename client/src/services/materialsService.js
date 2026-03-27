import api from './http';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('sms_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const initiateMaterialUpload = async ({
  file,
  title,
  description,
  subjectId,
  classId,
  category = 'teaching_material',
  tags = '',
  visibility = 'private',
}) => {
  const payload = {
    title: title || file.name.replace(/\.[^.]+$/, ''),
    description: description || '',
    original_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    subject_id: subjectId || undefined,
    class_id: classId || undefined,
    category,
    visibility,
    tags,
  };

  const response = await api.post('/api/materials/upload', payload);
  return response.data?.data;
};

export const uploadFileToSignedUrl = async (uploadPlan, file) => {
  const response = await fetch(uploadPlan.url, {
    method: uploadPlan.method || 'PUT',
    headers: uploadPlan.headers || {},
    body: file,
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed with status ${response.status}`);
  }
};

export const completeMaterialUpload = async (materialId) => {
  const response = await api.post(`/api/materials/${materialId}/complete`);
  return response.data?.data;
};

export const fetchMaterialAccessInfo = async (materialId) => {
  const response = await api.get(`/api/materials/${materialId}`);
  return response.data?.data;
};

export const openMaterialUrl = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const downloadMaterialUrl = (url, fileName) => {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  if (fileName) {
    link.download = fileName;
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const fetchMaterialHead = async (url) => {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: getAuthHeaders(),
  });

  return response.ok;
};
