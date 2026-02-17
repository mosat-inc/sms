import api from './http';

// Helper function to transform chart data
const transformChartData = (data) => {
  if (!data || !data.data) return data;
  
  const transformed = { ...data };
  
  // Transform assessment trends data if available
  if (data.data.charts?.assessmentTrends) {
    transformed.data.assessment_trends = data.data.charts.assessmentTrends.map(trend => ({
      assessment_date: trend.date,
      average_score: trend.average,
      pass_rate: trend.pass_rate || 0,
      assessment_name: trend.name,
      subject_name: trend.subject,
      class_name: trend.class,
      exam_type: trend.type
    }));
  }
  
  // Ensure assessments array is available for trends
  if (data.data.assessments && !transformed.data.assessment_trends) {
    transformed.data.assessment_trends = data.data.assessments.map(assessment => ({
      assessment_date: assessment.assessment_date,
      average_score: assessment.average_percentage,
      pass_rate: assessment.pass_rate,
      assessment_name: assessment.assessment_name,
      subject_name: assessment.subject_name,
      class_name: assessment.class_name,
      exam_type: assessment.exam_type
    }));
  }
  
  return transformed;
};

export const analyticsService = {
  // Get comprehensive analytics for teacher's assessments
  getTeacherAnalytics: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.exam_type) params.append('exam_type', filters.exam_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      console.log('🔄 Fetching analytics with filters:', filters);
      const response = await api.get(`/api/analytics/teacher/comprehensive?${params}`);
      
      console.log('📊 Raw API Response:', response.data);
      const transformedData = transformChartData(response.data);
      console.log('✨ Transformed Data:', transformedData);
      
      return transformedData;
    } catch (error) {
      console.error('❌ Analytics Service Error:', error);
      throw error.response?.data || { message: 'Failed to fetch teacher analytics' };
    }
  },

  // Get assessment overview statistics
  getAssessmentOverview: async () => {
    try {
      const response = await api.get('/api/analytics/assessment-overview');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch assessment overview' };
    }
  },

  // Get class performance statistics
  getClassPerformance: async (classId) => {
    try {
      const response = await api.get(`/api/analytics/class-performance/${classId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch class performance' };
    }
  },

  // Get subject performance statistics
  getSubjectPerformance: async (subjectId) => {
    try {
      const response = await api.get(`/api/analytics/subject-performance/${subjectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch subject performance' };
    }
  },

  // Get detailed assessment results
  getAssessmentDetails: async (assessmentId) => {
    try {
      const response = await api.get(`/api/analytics/assessment-details/${assessmentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch assessment details' };
    }
  },

  // Get grade distribution data
  getGradeDistribution: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.exam_type) params.append('exam_type', filters.exam_type);
      
      const response = await api.get(`/api/analytics/grade-distribution?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch grade distribution' };
    }
  },

  // Get student performance trends
  getStudentTrends: async (studentId) => {
    try {
      const response = await api.get(`/api/analytics/student-trends/${studentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch student trends' };
    }
  },

  // Export report data for PDF generation
  getReportData: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.class_id) params.append('class_id', filters.class_id);
      if (filters.subject_id) params.append('subject_id', filters.subject_id);
      if (filters.exam_type) params.append('exam_type', filters.exam_type);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      const response = await api.get(`/api/analytics/report-data?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to fetch report data' };
    }
  }
};

export default analyticsService;
