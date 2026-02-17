import api from './http';

export const dashboardService = {
  // Get teacher dashboard statistics
  getTeacherStats: async () => {
    try {
      const response = await api.get('/api/dashboard/teacher-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch teacher statistics' };
    }
  },

  // Get admin dashboard statistics
  getAdminStats: async () => {
    try {
      const response = await api.get('/api/dashboard/admin-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch admin statistics' };
    }
  },

  // Get class details
  getClassDetails: async (classId) => {
    try {
      const response = await api.get(`/api/dashboard/class-details/${classId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch class details' };
    }
  },

  // Create sample data (admin only)
  createSampleData: async () => {
    try {
      const response = await api.post('/api/dashboard/create-sample-data');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create sample data' };
    }
  }
};

export default dashboardService;
