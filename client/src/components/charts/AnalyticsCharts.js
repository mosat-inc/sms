import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line, PolarArea, Radar } from 'react-chartjs-2';
import styled from 'styled-components';
import { colors } from '../shared/StyledComponents';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
  RadialLinearScale
);

const ChartContainer = styled.div`
  background: ${colors.cardBackground};
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  border: 1px solid ${colors.border};
  
  h3 {
    color: ${colors.textPrimary};
    margin-bottom: 20px;
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .chart-wrapper {
    height: 300px;
    position: relative;
  }
`;

const baseTooltip = {
  backgroundColor: 'rgba(17, 24, 39, 0.92)',
  titleColor: '#f9fafb',
  bodyColor: '#f9fafb',
  borderColor: 'rgba(255, 255, 255, 0.12)',
  borderWidth: 1,
};

const baseLegendLabels = {
  color: colors.textSecondary,
  padding: 15,
};

const baseScale = {
  ticks: { color: colors.textSecondary },
  grid: { color: colors.borderLight },
};

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const GradeDistributionChart = ({ data }) => {
  // Debug logging to see actual data structure
  console.log('🔍 Grade Distribution Data received:', data);
  
  // Handle different data formats
  let gradeData = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  
  if (data) {
    // Check if data is in the expected format {A: count, B: count, ...}
    if (typeof data === 'object' && !Array.isArray(data)) {
      gradeData = {
        A: data.A || data.grade_A || 0,
        B: data.B || data.grade_B || 0,
        C: data.C || data.grade_C || 0,
        D: data.D || data.grade_D || 0,
        F: data.F || data.grade_F || 0,
      };
    }
    // Handle array format if grades are returned as array
    else if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.grade && typeof item.count !== 'undefined') {
          gradeData[item.grade] = item.count;
        }
      });
    }
  }
  
  console.log('📊 Processed Grade Data:', gradeData);
  
  const chartData = {
    labels: ['A (Excellent)', 'B (Good)', 'C (Average)', 'D (Poor)', 'F (Bad)'],
    datasets: [
      {
        label: 'Number of Students',
        data: [
          gradeData.A,
          gradeData.B,
          gradeData.C,
          gradeData.D,
          gradeData.F,
        ],
        backgroundColor: [
          '#10B981', // Green for A
          '#3B82F6', // Blue for B
          '#F59E0B', // Yellow for C
          '#EF4444', // Red for D
          '#6B7280', // Gray for F
        ],
        borderWidth: 2,
        borderColor: colors.cardBackground,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          ...baseLegendLabels,
        },
      },
      tooltip: {
        ...baseTooltip,
      },
    },
  };

  return (
    <ChartContainer>
      <h3>📊 Grade Distribution</h3>
      <div className="chart-wrapper">
        <Doughnut data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};

export const ClassPerformanceChart = ({ data }) => {
  // Debug logging
  console.log('🏢 Class Performance Data received:', data);
  
  // Ensure data is an array and handle various data formats
  const processedData = Array.isArray(data) ? data : [];
  
  // Filter out invalid data entries
  const validData = processedData.filter(item => 
    item && 
    (item.class_name || item.name) && 
    (typeof item.average_score === 'number' || typeof item.average_percentage === 'number')
  );
  
  console.log('📊 Processed Class Performance Data:', validData);
  
  const chartData = {
    labels: validData.map(item => item.class_name || item.name || 'Unknown Class'),
    datasets: [
      {
        label: 'Average Score (%)',
        data: validData.map(item => 
          Math.round((item.average_score || item.average_percentage || 0) * 100) / 100
        ),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        label: 'Pass Rate (%)',
        data: validData.map(item => 
          Math.round((item.pass_rate || 0) * 100) / 100
        ),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          ...baseLegendLabels,
        },
      },
      tooltip: {
        ...baseTooltip,
      },
    },
    scales: {
      x: {
        ...baseScale,
      },
      y: {
        ...baseScale,
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <ChartContainer>
      <h3>📈 Class Performance Comparison</h3>
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};

export const SubjectPerformanceChart = ({ data }) => {
  // Debug logging
  console.log('📚 Subject Performance Data received:', data);
  
  // Ensure data is an array and handle various data formats
  const processedData = Array.isArray(data) ? data : [];
  
  // Filter out invalid data entries
  const validData = processedData.filter(item => 
    item && 
    (item.subject_name || item.name) && 
    (typeof item.average_score === 'number' || typeof item.average_percentage === 'number')
  );
  
  console.log('📊 Processed Subject Performance Data:', validData);
  
  const chartData = {
    labels: validData.map(item => item.subject_name || item.name || 'Unknown Subject'),
    datasets: [
      {
        label: 'Average Score (%)',
        data: validData.map(item => 
          Math.round((item.average_score || item.average_percentage || 0) * 100) / 100
        ),
        backgroundColor: 'rgba(139, 92, 246, 0.6)',
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        position: 'top',
        labels: {
          ...baseLegendLabels,
        },
      },
      tooltip: {
        ...baseTooltip,
      },
    },
    scales: {
      x: {
        ...baseScale,
        beginAtZero: true,
        max: 100,
      },
      y: {
        ...baseScale,
      },
    },
  };

  return (
    <ChartContainer>
      <h3>📚 Subject Performance Overview</h3>
      <div className="chart-wrapper">
        <Bar data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};

export const AssessmentTrendsChart = ({ data }) => {
  // Debug logging
  console.log('📈 Assessment Trends Data received:', data);
  
  // Ensure data is an array and handle various data formats
  const processedData = Array.isArray(data) ? data : [];
  
  // Filter out invalid data entries and sort by date
  const validData = processedData
    .filter(item => 
      item && 
      (item.assessment_date || item.date) && 
      (typeof item.average_score === 'number' || typeof item.average === 'number')
    )
    .sort((a, b) => {
      const dateA = new Date(a.assessment_date || a.date);
      const dateB = new Date(b.assessment_date || b.date);
      return dateA - dateB;
    });
  
  console.log('📊 Processed Assessment Trends Data:', validData);
  
  const chartData = {
    labels: validData.map(item => {
      const date = new Date(item.assessment_date || item.date);
      return date.toLocaleDateString();
    }),
    datasets: [
      {
        label: 'Average Score',
        data: validData.map(item => 
          Math.round((item.average_score || item.average || 0) * 100) / 100
        ),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Pass Rate',
        data: validData.map(item => 
          Math.round((item.pass_rate || 0) * 100) / 100
        ),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          ...baseLegendLabels,
        },
      },
      tooltip: {
        ...baseTooltip,
      },
    },
    scales: {
      x: {
        ...baseScale,
      },
      y: {
        ...baseScale,
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <ChartContainer>
      <h3>📈 Assessment Performance Trends</h3>
      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>
    </ChartContainer>
  );
};

// Error Boundary Component
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Chart Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ChartContainer>
          <h3>{this.props.title || '📊 Chart Data'}</h3>
          <div style={{ 
            padding: '20px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: '8px',
            color: colors.textPrimary
          }}>
            <p style={{ margin: 0, fontSize: '14px' }}>
              📈 Chart visualization temporarily unavailable. Data is being processed...
            </p>
            {this.props.fallback && this.props.fallback()}
          </div>
        </ChartContainer>
      );
    }

    return this.props.children;
  }
}

// Fallback components for when charts fail
const GradeDistributionFallback = ({ data }) => {
  if (!data) return (
    <div style={{ padding: '20px', textAlign: 'center', color: colors.textSecondary }}>
      No grade distribution data available
    </div>
  );
  
  // Handle different data formats
  let gradeData = {};
  if (typeof data === 'object' && !Array.isArray(data)) {
    gradeData = {
      A: data.A || data.grade_A || 0,
      B: data.B || data.grade_B || 0,
      C: data.C || data.grade_C || 0,
      D: data.D || data.grade_D || 0,
      F: data.F || data.grade_F || 0,
    };
  }
  
  const grades = [
    { grade: 'A', count: gradeData.A || 0, color: '#10B981' },
    { grade: 'B', count: gradeData.B || 0, color: '#3B82F6' },
    { grade: 'C', count: gradeData.C || 0, color: '#F59E0B' },
    { grade: 'D', count: gradeData.D || 0, color: '#EF4444' },
    { grade: 'F', count: gradeData.F || 0, color: '#6B7280' }
  ];
  
  return (
    <div style={{ marginTop: '15px' }}>
      {grades.map(({ grade, count, color }) => (
        <div key={grade} style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          padding: '8px 12px',
          margin: '5px 0',
          background: `${color}20`,
          border: `1px solid ${color}50`,
          borderRadius: '6px'
        }}>
          <span style={{ fontWeight: 'bold' }}>Grade {grade}:</span>
          <span style={{ color }}>{count} students</span>
        </div>
      ))}
    </div>
  );
};

// Safe Chart Components with Error Boundaries
const SafeGradeDistributionChart = ({ data }) => (
  <ChartErrorBoundary 
    title="📊 Grade Distribution" 
    fallback={() => <GradeDistributionFallback data={data} />}
  >
    <GradeDistributionChart data={data} />
  </ChartErrorBoundary>
);

const SafeClassPerformanceChart = ({ data }) => (
  <ChartErrorBoundary title="📈 Class Performance Comparison">
    <ClassPerformanceChart data={data} />
  </ChartErrorBoundary>
);

const SafeSubjectPerformanceChart = ({ data }) => (
  <ChartErrorBoundary title="📚 Subject Performance Overview">
    <SubjectPerformanceChart data={data} />
  </ChartErrorBoundary>
);

const SafeAssessmentTrendsChart = ({ data }) => (
  <ChartErrorBoundary title="📈 Assessment Performance Trends">
    <AssessmentTrendsChart data={data} />
  </ChartErrorBoundary>
);

export const AnalyticsChartsGrid = ({ 
  gradeDistribution, 
  classPerformance, 
  subjectPerformance, 
  assessmentTrends 
}) => {
  // Debug logging for all chart data
  console.log('🏠 AnalyticsChartsGrid received data:', {
    gradeDistribution,
    classPerformance,
    subjectPerformance,
    assessmentTrends
  });
  
  // Check if we have any data to display
  const hasGradeData = gradeDistribution && (
    (typeof gradeDistribution === 'object' && Object.keys(gradeDistribution).length > 0) ||
    (Array.isArray(gradeDistribution) && gradeDistribution.length > 0)
  );
  
  const hasClassData = Array.isArray(classPerformance) && classPerformance.length > 0;
  const hasSubjectData = Array.isArray(subjectPerformance) && subjectPerformance.length > 0;
  const hasTrendsData = Array.isArray(assessmentTrends) && assessmentTrends.length > 0;
  
  const hasAnyData = hasGradeData || hasClassData || hasSubjectData || hasTrendsData;
  
  if (!hasAnyData) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '12px'
      }}>
        <div style={{ fontSize: '3rem', color: '#f59e0b', marginBottom: '15px' }}>📈</div>
        <h3 style={{ color: colors.textPrimary, marginBottom: '10px' }}>No Chart Data Available</h3>
        <p style={{ color: colors.textSecondary }}>
          Create some assessments and add student grades to see performance charts and analytics.
        </p>
      </div>
    );
  }
  
  return (
    <ChartsGrid>
      {hasGradeData && (
        <SafeGradeDistributionChart data={gradeDistribution} />
      )}
      {hasClassData && (
        <SafeClassPerformanceChart data={classPerformance} />
      )}
      {hasSubjectData && (
        <SafeSubjectPerformanceChart data={subjectPerformance} />
      )}
      {hasTrendsData && (
        <SafeAssessmentTrendsChart data={assessmentTrends} />
      )}
    </ChartsGrid>
  );
};

export default AnalyticsChartsGrid;
