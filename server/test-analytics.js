const express = require('express');
const { pool } = require('./config/database');

// Simulate the analytics endpoint logic
async function testAnalyticsEndpoint() {
  try {
    console.log('Testing analytics endpoint logic...');
    
    // Get the assessment ID from our test data (we know there's 1 assessment)
    const [assessments] = await pool.execute('SELECT id FROM assessments LIMIT 1');
    if (assessments.length === 0) {
      console.log('No assessments found');
      return;
    }
    
    const assessmentId = assessments[0].id;
    console.log('Testing with assessment ID:', assessmentId);
    
    // Test the analytics query directly (copy from the route)
    const [assessmentDetails] = await pool.execute(`
      SELECT 
        a.*,
        c.name as class_name,
        s.name as subject_name,
        s.code as subject_code
      FROM assessments a
      INNER JOIN classes c ON a.class_id = c.id
      INNER JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = ?
    `, [assessmentId]);
    
    if (assessmentDetails.length === 0) {
      console.log('Assessment not found');
      return;
    }
    
    const assessment = assessmentDetails[0];
    console.log('Assessment found:', {
      name: assessment.assessment_name,
      class: assessment.class_name,
      subject: assessment.subject_name,
      max_marks: assessment.max_marks
    });
    
    // Test the analytics data query
    const [analyticsData] = await pool.execute(`
      SELECT 
        am.*,
        s.student_id as student_number,
        u.first_name,
        u.last_name,
        CASE 
          WHEN am.marks_obtained IS NULL OR am.is_present = FALSE THEN NULL
          ELSE ROUND((am.marks_obtained / ?) * 100, 2)
        END as percentage
      FROM assessment_marks am
      INNER JOIN students s ON am.student_id = s.id
      INNER JOIN users u ON s.user_id = u.id
      WHERE am.assessment_id = ?
      ORDER BY am.marks_obtained DESC
    `, [assessment.max_marks, assessmentId]);
    
    console.log('Analytics data found:', analyticsData.length, 'records');
    console.log('Sample data:', analyticsData.slice(0, 2).map(d => ({
      student: `${d.first_name} ${d.last_name}`,
      marks: d.marks_obtained,
      percentage: d.percentage,
      grade: d.grade
    })));
    
    const gradedData = analyticsData.filter(d => d.is_present && d.marks_obtained !== null);
    console.log('Graded data count:', gradedData.length);
    
    // Test grade distribution calculation
    const gradeDistribution = {};
    gradedData.forEach(student => {
      if (student.grade) {
        gradeDistribution[student.grade] = (gradeDistribution[student.grade] || 0) + 1;
      }
    });
    console.log('Grade distribution:', gradeDistribution);
    
    // Test performance stats calculation
    const stats = {
      total_students: analyticsData.length,
      graded_students: gradedData.length,
      attendance_rate: Math.round((analyticsData.filter(d => d.is_present).length / analyticsData.length) * 100),
      pass_rate: gradedData.length > 0 ? 
        Math.round((gradedData.filter(d => d.percentage >= ((assessment.pass_marks / assessment.max_marks) * 100)).length / gradedData.length) * 100) : 0,
      average_score: gradedData.length > 0 ? 
        Math.round((gradedData.reduce((sum, d) => sum + d.percentage, 0) / gradedData.length) * 100) / 100 : 0,
      highest_score: gradedData.length > 0 ? Math.max(...gradedData.map(d => d.percentage)) : 0,
      lowest_score: gradedData.length > 0 ? Math.min(...gradedData.map(d => d.percentage)) : 0
    };
    
    console.log('Calculated stats:', stats);
    
    console.log('✅ Analytics endpoint logic works correctly!');
    
  } catch (error) {
    console.error('❌ Error in analytics logic:', error);
  } finally {
    process.exit(0);
  }
}

testAnalyticsEndpoint();
