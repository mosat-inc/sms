const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Helper function to calculate median
const calculateMedian = (numbers) => {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
        (sorted[mid - 1] + sorted[mid]) / 2 : 
        sorted[mid];
};

// Helper function to calculate grade distribution
const calculateGradeDistribution = (results, maxMarks, passMarks) => {
    const distribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    const validResults = results.filter(r => r.is_present && r.marks_obtained !== null);
    
    validResults.forEach(result => {
        const percentage = (result.marks_obtained / maxMarks) * 100;
        if (percentage >= 81) distribution.A++;
        else if (percentage >= 61) distribution.B++;
        else if (percentage >= 45) distribution.C++;
        else if (percentage >= 30) distribution.D++;
        else distribution.F++;
    });
    
    return distribution;
};

// GET /api/analytics/teacher/comprehensive - Get comprehensive teacher analytics with filters
router.get('/teacher/comprehensive', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const { class_id, subject_id, exam_type, start_date, end_date } = req.query;
        const academicYear = req.query.academic_year || '2024-2025';
        
        console.log('🔍 DEBUG: Fetching comprehensive analytics with filters:', {
            teacherId, class_id, subject_id, exam_type, start_date, end_date, academicYear
        });
        
        const connection = await pool.getConnection();

        // Build dynamic query for assessments with filters
        let assessmentQuery = `
            SELECT 
                a.id,
                a.assessment_name,
                a.exam_type,
                a.assessment_date,
                a.max_marks,
                a.pass_marks,
                a.status,
                c.id as class_id,
                c.name as class_name,
                c.level as class_level,
                s.id as subject_id,
                s.name as subject_name,
                s.code as subject_code,
                s.department,
                COUNT(am.id) as student_count,
                COUNT(CASE WHEN am.marks_obtained IS NOT NULL OR am.is_present = FALSE THEN 1 END) as graded_count,
                COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL THEN 1 END) as present_graded,
                AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN (am.marks_obtained / a.max_marks) * 100 END) as average_percentage,
                COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    AND (am.marks_obtained / a.max_marks) * 100 >= (a.pass_marks / a.max_marks) * 100 THEN 1 END) as pass_count,
                MAX(CASE WHEN am.is_present = TRUE THEN am.marks_obtained END) as highest_marks,
                MIN(CASE WHEN am.is_present = TRUE THEN am.marks_obtained END) as lowest_marks
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN assessment_marks am ON a.id = am.assessment_id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
        `;
        
        const params = [teacherId, academicYear];
        
        if (class_id && class_id.trim() !== '') {
            assessmentQuery += ' AND a.class_id = ?';
            params.push(class_id);
        }
        
        if (subject_id && subject_id.trim() !== '') {
            assessmentQuery += ' AND a.subject_id = ?';
            params.push(subject_id);
        }
        
        if (exam_type && exam_type.trim() !== '') {
            assessmentQuery += ' AND a.exam_type = ?';
            params.push(exam_type);
        }
        
        if (start_date && start_date.trim() !== '') {
            assessmentQuery += ' AND a.assessment_date >= ?';
            params.push(start_date);
        }
        
        if (end_date && end_date.trim() !== '') {
            assessmentQuery += ' AND a.assessment_date <= ?';
            params.push(end_date);
        }
        
        assessmentQuery += `
            GROUP BY a.id
            ORDER BY a.assessment_date DESC, a.created_at DESC
        `;
        
        console.log('🔍 DEBUG: Executing assessment query with params:', params);
        const [assessments] = await connection.execute(assessmentQuery, params);
        console.log('🔍 DEBUG: Found assessments:', assessments.length);

        // Calculate summary statistics
        const totalAssessments = assessments.length;
        const gradedAssessments = assessments.filter(a => a.graded_count > 0).length;
        const totalStudents = assessments.reduce((sum, a) => Math.max(sum, a.student_count || 0), 0);
        
        // Calculate overall average across all assessments
        const validAssessments = assessments.filter(a => a.average_percentage !== null);
        const overallAverage = validAssessments.length > 0 ? 
            Math.round((validAssessments.reduce((sum, a) => sum + parseFloat(a.average_percentage || 0), 0) / validAssessments.length) * 100) / 100 : 0;

        // Calculate overall pass rate
        const totalPassCount = assessments.reduce((sum, a) => sum + (a.pass_count || 0), 0);
        const totalPresentGraded = assessments.reduce((sum, a) => sum + (a.present_graded || 0), 0);
        const overallPassRate = totalPresentGraded > 0 ? Math.round((totalPassCount / totalPresentGraded) * 100) : 0;

        // Get detailed grade distribution across all filtered assessments
        let gradeDistQuery = `
            SELECT 
                am.grade,
                COUNT(*) as count
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
            AND am.is_present = TRUE AND am.marks_obtained IS NOT NULL
            AND am.grade IS NOT NULL
        `;
        
        const gradeDistParams = [teacherId, academicYear];
        
        if (class_id && class_id.trim() !== '') {
            gradeDistQuery += ' AND a.class_id = ?';
            gradeDistParams.push(class_id);
        }
        
        if (subject_id && subject_id.trim() !== '') {
            gradeDistQuery += ' AND a.subject_id = ?';
            gradeDistParams.push(subject_id);
        }
        
        if (exam_type && exam_type.trim() !== '') {
            gradeDistQuery += ' AND a.exam_type = ?';
            gradeDistParams.push(exam_type);
        }
        
        if (start_date && start_date.trim() !== '') {
            gradeDistQuery += ' AND a.assessment_date >= ?';
            gradeDistParams.push(start_date);
        }
        
        if (end_date && end_date.trim() !== '') {
            gradeDistQuery += ' AND a.assessment_date <= ?';
            gradeDistParams.push(end_date);
        }
        
        gradeDistQuery += ' GROUP BY am.grade ORDER BY am.grade';
        
        const [gradeDistribution] = await connection.execute(gradeDistQuery, gradeDistParams);
        
        // Convert to object format expected by frontend
        const gradeDistObj = {};
        gradeDistribution.forEach(gd => {
            if (gd.grade) {
                gradeDistObj[gd.grade] = gd.count;
            }
        });

        // Get detailed student performance by subject (using correct assessment_marks table)
        let studentSubjectQuery = `
            SELECT 
                u.first_name,
                u.last_name,
                s.student_id as student_number,
                s.id as student_id,
                c.name as class_name,
                sub.name as subject_name,
                sub.code as subject_code,
                COUNT(CASE WHEN am.marks_obtained IS NOT NULL AND am.is_present = TRUE THEN 1 END) as assessment_count,
                ROUND(SUM(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN am.marks_obtained ELSE 0 END), 2) as total_marks_obtained,
                ROUND(SUM(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN a.max_marks ELSE 0 END), 2) as total_possible_marks,
                ROUND(AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN (am.marks_obtained / a.max_marks) * 100 END), 2) as average_percentage,
                ROUND(MAX(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN (am.marks_obtained / a.max_marks) * 100 END), 2) as highest_percentage,
                ROUND(MIN(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN (am.marks_obtained / a.max_marks) * 100 END), 2) as lowest_percentage,
                GROUP_CONCAT(
                    CASE WHEN am.marks_obtained IS NOT NULL OR am.is_present = FALSE THEN
                        CONCAT(a.assessment_name, ':', 
                               COALESCE(am.marks_obtained, 'N/A'), '/', 
                               a.max_marks, ':', 
                               COALESCE(am.grade, 'N/A'))
                    END
                    ORDER BY a.assessment_date
                    SEPARATOR '|'
                ) as assessment_details
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            INNER JOIN students s ON am.student_id = s.id
            INNER JOIN users u ON s.user_id = u.id
            INNER JOIN classes c ON s.class_id = c.id
            INNER JOIN subjects sub ON a.subject_id = sub.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
        `;
        
        const studentSubjectParams = [teacherId, academicYear];
        
        if (class_id && class_id.trim() !== '') {
            studentSubjectQuery += ' AND a.class_id = ?';
            studentSubjectParams.push(class_id);
        }
        
        if (subject_id && subject_id.trim() !== '') {
            studentSubjectQuery += ' AND a.subject_id = ?';
            studentSubjectParams.push(subject_id);
        }
        
        if (exam_type && exam_type.trim() !== '') {
            studentSubjectQuery += ' AND a.exam_type = ?';
            studentSubjectParams.push(exam_type);
        }
        
        if (start_date && start_date.trim() !== '') {
            studentSubjectQuery += ' AND a.assessment_date >= ?';
            studentSubjectParams.push(start_date);
        }
        
        if (end_date && end_date.trim() !== '') {
            studentSubjectQuery += ' AND a.assessment_date <= ?';
            studentSubjectParams.push(end_date);
        }
        
        studentSubjectQuery += `
            GROUP BY s.id, sub.id
            HAVING assessment_count > 0
            ORDER BY sub.name, average_percentage DESC
        `;
        
        console.log('🔍 DEBUG: Executing student-subject query with params:', studentSubjectParams);
        const [studentSubjectData] = await connection.execute(studentSubjectQuery, studentSubjectParams);
        console.log('🔍 DEBUG: Found student-subject records:', studentSubjectData.length);

        // Get top performing students across filtered assessments (simplified query)
        let topStudentsQuery = `
            SELECT 
                u.first_name,
                u.last_name,
                s.student_id as student_number,
                c.name as class_name,
                AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN (am.marks_obtained / a.max_marks) * 100 END) as average_percentage,
                COUNT(CASE WHEN am.marks_obtained IS NOT NULL THEN 1 END) as assessment_count
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            INNER JOIN students s ON am.student_id = s.id
            INNER JOIN users u ON s.user_id = u.id
            INNER JOIN classes c ON s.class_id = c.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
            AND am.is_present = TRUE AND am.marks_obtained IS NOT NULL
        `;
        
        const topStudentsParams = [teacherId, academicYear];
        
        if (class_id && class_id.trim() !== '') {
            topStudentsQuery += ' AND a.class_id = ?';
            topStudentsParams.push(class_id);
        }
        
        if (subject_id && subject_id.trim() !== '') {
            topStudentsQuery += ' AND a.subject_id = ?';
            topStudentsParams.push(subject_id);
        }
        
        if (exam_type && exam_type.trim() !== '') {
            topStudentsQuery += ' AND a.exam_type = ?';
            topStudentsParams.push(exam_type);
        }
        
        if (start_date && start_date.trim() !== '') {
            topStudentsQuery += ' AND a.assessment_date >= ?';
            topStudentsParams.push(start_date);
        }
        
        if (end_date && end_date.trim() !== '') {
            topStudentsQuery += ' AND a.assessment_date <= ?';
            topStudentsParams.push(end_date);
        }
        
        topStudentsQuery += `
            GROUP BY s.id
            HAVING assessment_count > 0
            ORDER BY average_percentage DESC
            LIMIT 50
        `;
        
        const [performanceTrends] = await connection.execute(topStudentsQuery, topStudentsParams);
        
        // Format performance trends data
        const formattedPerformanceTrends = performanceTrends.map((student, index) => ({
            student_id: student.student_id,
            student_name: `${student.first_name} ${student.last_name}`,
            class_name: student.class_name,
            average_percentage: Math.round(parseFloat(student.average_percentage || 0) * 100) / 100,
            assessment_count: student.assessment_count,
            overall_grade: calculateGradeFromPercentage(student.average_percentage || 0),
            rank: index + 1
        }));

        // Generate class performance data for charts
        const classPerformanceMap = {};
        assessments.forEach(assessment => {
            const classKey = `${assessment.class_id}-${assessment.class_name}`;
            if (!classPerformanceMap[classKey]) {
                classPerformanceMap[classKey] = {
                    class_id: assessment.class_id,
                    class_name: assessment.class_name,
                    total_assessments: 0,
                    total_average: 0,
                    total_pass_count: 0,
                    total_graded: 0
                };
            }
            
            classPerformanceMap[classKey].total_assessments++;
            if (assessment.average_percentage) {
                classPerformanceMap[classKey].total_average += parseFloat(assessment.average_percentage);
            }
            classPerformanceMap[classKey].total_pass_count += assessment.pass_count || 0;
            classPerformanceMap[classKey].total_graded += assessment.present_graded || 0;
        });
        
        const classPerformanceData = Object.values(classPerformanceMap).map(cls => ({
            class_name: cls.class_name,
            average_score: cls.total_assessments > 0 ? 
                Math.round((cls.total_average / cls.total_assessments) * 100) / 100 : 0,
            pass_rate: cls.total_graded > 0 ? 
                Math.round((cls.total_pass_count / cls.total_graded) * 100) : 0
        }));
        
        // Generate subject performance data for charts
        const subjectPerformanceMap = {};
        assessments.forEach(assessment => {
            const subjectKey = `${assessment.subject_id}-${assessment.subject_name}`;
            if (!subjectPerformanceMap[subjectKey]) {
                subjectPerformanceMap[subjectKey] = {
                    subject_id: assessment.subject_id,
                    subject_name: assessment.subject_name,
                    total_assessments: 0,
                    total_average: 0,
                    total_pass_count: 0,
                    total_graded: 0
                };
            }
            
            subjectPerformanceMap[subjectKey].total_assessments++;
            if (assessment.average_percentage) {
                subjectPerformanceMap[subjectKey].total_average += parseFloat(assessment.average_percentage);
            }
            subjectPerformanceMap[subjectKey].total_pass_count += assessment.pass_count || 0;
            subjectPerformanceMap[subjectKey].total_graded += assessment.present_graded || 0;
        });
        
        const subjectPerformanceData = Object.values(subjectPerformanceMap).map(subj => ({
            subject_name: subj.subject_name,
            average_score: subj.total_assessments > 0 ? 
                Math.round((subj.total_average / subj.total_assessments) * 100) / 100 : 0,
            pass_rate: subj.total_graded > 0 ? 
                Math.round((subj.total_pass_count / subj.total_graded) * 100) : 0
        }));
        
        // Prepare chart data for frontend
        const chartData = {
            assessmentTrends: assessments.map(a => ({
                name: a.assessment_name,
                date: a.assessment_date,
                average: parseFloat(a.average_percentage || 0),
                subject: a.subject_name,
                class: a.class_name,
                type: a.exam_type
            })),
            gradeDistribution: Object.entries(gradeDistObj).map(([grade, count]) => ({
                grade,
                count,
                percentage: assessments.length > 0 ? Math.round((count / assessments.reduce((sum, a) => sum + (a.present_graded || 0), 0)) * 100) : 0
            })),
            subjectPerformance: subjectPerformanceData,
            classPerformance: classPerformanceData
        };

        connection.release();

        // Format detailed student-subject performance for PDF
        const detailedStudentPerformance = studentSubjectData.map(record => {
            const assessmentDetails = [];
            if (record.assessment_details) {
                const details = record.assessment_details.split('|');
                details.forEach(detail => {
                    const parts = detail.split(':');
                    if (parts.length >= 4) {
                        assessmentDetails.push({
                            name: parts[0],
                            marks: parts[1],
                            total_marks: parts[2],
                            grade: parts[3]
                        });
                    }
                });
            }
            
            return {
                student_id: record.student_id,
                first_name: record.first_name,
                last_name: record.last_name,
                student_name: `${record.first_name} ${record.last_name}`,
                student_number: record.student_number,
                class_name: record.class_name,
                subject_name: record.subject_name,
                subject_code: record.subject_code,
                assessment_count: record.assessment_count,
                total_marks_obtained: Math.round(parseFloat(record.total_marks_obtained || 0) * 100) / 100,
                total_possible_marks: Math.round(parseFloat(record.total_possible_marks || 0) * 100) / 100,
                average_percentage: Math.round(parseFloat(record.average_percentage || 0) * 100) / 100,
                highest_percentage: Math.round(parseFloat(record.highest_percentage || 0) * 100) / 100,
                lowest_percentage: Math.round(parseFloat(record.lowest_percentage || 0) * 100) / 100,
                overall_grade: calculateGradeFromPercentage(record.average_percentage || 0),
                assessment_details: assessmentDetails
            };
        });

        const responseData = {
            teacher_info: {
                teacher_id: teacherId,
                name: req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : 'Teacher',
                academic_year: academicYear,
                generated_at: new Date().toISOString()
            },
            summary: {
                total_assessments: totalAssessments,
                graded_assessments: gradedAssessments,
                total_students: totalStudents,
                average_score: overallAverage,
                overall_average: overallAverage,
                pass_rate: overallPassRate,
                filters: {
                    class_id: class_id || null,
                    subject_id: subject_id || null,
                    exam_type: exam_type || null,
                    start_date: start_date || null,
                    end_date: end_date || null
                }
            },
            assessments: assessments.map(a => ({
                id: a.id,
                assessment_name: a.assessment_name,
                exam_type: a.exam_type,
                assessment_date: a.assessment_date,
                class_name: a.class_name,
                subject_name: a.subject_name,
                student_count: a.student_count,
                graded_count: a.graded_count,
                average_percentage: Math.round(parseFloat(a.average_percentage || 0) * 100) / 100,
                pass_rate: a.present_graded > 0 ? Math.round((a.pass_count / a.present_graded) * 100) : 0
            })),
            grade_distribution: gradeDistObj,
            class_performance: classPerformanceData,
            subject_performance: subjectPerformanceData,
            performance_trends: formattedPerformanceTrends,
            performance: detailedStudentPerformance, // Detailed student-subject performance for PDF
            charts: chartData
        };
        
        console.log('🔍 DEBUG: Sending comprehensive analytics response:', {
            summaryStats: responseData.summary,
            assessmentCount: responseData.assessments.length,
            topStudents: responseData.performance_trends.slice(0, 5).map(s => s.student_name)
        });

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching comprehensive teacher analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comprehensive analytics data'
        });
    }
});

// GET /api/analytics/teacher/overview - Get comprehensive analytics for all teacher's assessments
router.get('/teacher/overview', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        const connection = await pool.getConnection();

        // Get teacher's assigned classes and subjects
        const [assignments] = await connection.execute(`
            SELECT DISTINCT 
                tsa.class_id,
                tsa.subject_id,
                c.name as class_name,
                c.level as class_level,
                s.name as subject_name,
                s.code as subject_code,
                s.department
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            INNER JOIN subjects s ON tsa.subject_id = s.id
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
            ORDER BY c.level, c.name, s.name
        `, [teacherId, academicYear]);

        // Get all assessments created by this teacher
        const [assessments] = await connection.execute(`
            SELECT 
                a.*,
                c.name as class_name,
                c.level as class_level,
                s.name as subject_name,
                s.code as subject_code,
                COUNT(am.id) as total_students,
                COUNT(CASE WHEN am.marks_obtained IS NOT NULL OR am.is_present = FALSE THEN 1 END) as graded_count,
                COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL THEN 1 END) as present_graded,
                AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    THEN (am.marks_obtained / a.max_marks) * 100 END) as class_average,
                MAX(CASE WHEN am.is_present = TRUE THEN am.marks_obtained END) as highest_marks,
                MIN(CASE WHEN am.is_present = TRUE THEN am.marks_obtained END) as lowest_marks
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN assessment_marks am ON a.id = am.assessment_id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
            GROUP BY a.id
            ORDER BY a.assessment_date DESC, a.created_at DESC
        `, [teacherId, academicYear]);

        // Calculate overall statistics
        const totalAssessments = assessments.length;
        const completedAssessments = assessments.filter(a => a.graded_count > 0).length;
        const totalStudentsEvaluated = assessments.reduce((sum, a) => sum + (a.graded_count || 0), 0);
        
        // Calculate subject-wise performance
        const subjectPerformance = {};
        const classPerformance = {};

        assessments.forEach(assessment => {
            const subjectKey = `${assessment.subject_id}-${assessment.subject_name}`;
            const classKey = `${assessment.class_id}-${assessment.class_name}`;
            
            if (!subjectPerformance[subjectKey]) {
                subjectPerformance[subjectKey] = {
                    subject_id: assessment.subject_id,
                    subject_name: assessment.subject_name,
                    subject_code: assessment.subject_code,
                    department: assessment.department,
                    assessments: [],
                    total_assessments: 0,
                    completed_assessments: 0,
                    average_performance: 0,
                    total_students: 0
                };
            }
            
            if (!classPerformance[classKey]) {
                classPerformance[classKey] = {
                    class_id: assessment.class_id,
                    class_name: assessment.class_name,
                    class_level: assessment.class_level,
                    assessments: [],
                    total_assessments: 0,
                    completed_assessments: 0,
                    average_performance: 0,
                    total_students: 0
                };
            }
            
            subjectPerformance[subjectKey].assessments.push(assessment);
            subjectPerformance[subjectKey].total_assessments++;
            if (assessment.graded_count > 0) {
                subjectPerformance[subjectKey].completed_assessments++;
                if (assessment.class_average) {
                    subjectPerformance[subjectKey].average_performance += parseFloat(assessment.class_average);
                }
            }
            subjectPerformance[subjectKey].total_students += assessment.total_students || 0;
            
            classPerformance[classKey].assessments.push(assessment);
            classPerformance[classKey].total_assessments++;
            if (assessment.graded_count > 0) {
                classPerformance[classKey].completed_assessments++;
                if (assessment.class_average) {
                    classPerformance[classKey].average_performance += parseFloat(assessment.class_average);
                }
            }
            classPerformance[classKey].total_students += assessment.total_students || 0;
        });

        // Calculate averages for subject performance
        Object.values(subjectPerformance).forEach(subject => {
            if (subject.completed_assessments > 0) {
                subject.average_performance = Math.round((subject.average_performance / subject.completed_assessments) * 100) / 100;
            }
        });

        // Calculate averages for class performance  
        Object.values(classPerformance).forEach(classData => {
            if (classData.completed_assessments > 0) {
                classData.average_performance = Math.round((classData.average_performance / classData.completed_assessments) * 100) / 100;
            }
        });

        // Get recent performance trends (last 10 assessments)
        const recentAssessments = assessments
            .filter(a => a.class_average !== null)
            .slice(0, 10)
            .map(a => ({
                id: a.id,
                title: a.assessment_name,
                subject: a.subject_name,
                class: a.class_name,
                date: a.assessment_date,
                average: parseFloat(a.class_average) || 0,
                exam_type: a.exam_type
            }));

        connection.release();

        res.json({
            success: true,
            data: {
                teacher_info: {
                    teacher_id: teacherId,
                    academic_year: academicYear
                },
                summary: {
                    total_assessments: totalAssessments,
                    completed_assessments: completedAssessments,
                    pending_assessments: totalAssessments - completedAssessments,
                    total_students_evaluated: totalStudentsEvaluated,
                    completion_rate: totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0
                },
                assignments: assignments,
                assessments: assessments,
                subject_performance: Object.values(subjectPerformance),
                class_performance: Object.values(classPerformance),
                recent_trends: recentAssessments
            }
        });

    } catch (error) {
        console.error('Error fetching teacher analytics overview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics data'
        });
    }
});

// GET /api/analytics/detailed-report - Get detailed analytics for PDF generation
router.get('/detailed-report', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        const subjectId = req.query.subject_id;
        const classId = req.query.class_id;
        
        const connection = await pool.getConnection();

        // Build dynamic query based on filters
        let assessmentQuery = `
            SELECT 
                a.*,
                c.name as class_name,
                c.level as class_level,
                s.name as subject_name,
                s.code as subject_code,
                s.department
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
        `;
        
        const params = [teacherId, academicYear];
        
        if (subjectId) {
            assessmentQuery += ' AND a.subject_id = ?';
            params.push(subjectId);
        }
        
        if (classId) {
            assessmentQuery += ' AND a.class_id = ?';
            params.push(classId);
        }
        
        assessmentQuery += ' ORDER BY a.assessment_date DESC';
        
        const [assessments] = await connection.execute(assessmentQuery, params);

        // For each assessment, get detailed results
        const detailedAssessments = [];
        
        for (const assessment of assessments) {
            const [results] = await connection.execute(`
                SELECT 
                    am.*,
                    s.student_id as student_number,
                    s.admission_number,
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
                ORDER BY u.first_name, u.last_name
            `, [assessment.max_marks, assessment.id]);

            const gradedResults = results.filter(r => r.is_present && r.marks_obtained !== null);
            
            // Calculate detailed statistics for this assessment
            const stats = {
                total_students: results.length,
                graded_students: gradedResults.length,
                attendance_rate: Math.round((results.filter(r => r.is_present).length / results.length) * 100),
                pass_rate: gradedResults.length > 0 ? 
                    Math.round((gradedResults.filter(r => r.percentage >= ((assessment.pass_marks / assessment.max_marks) * 100)).length / gradedResults.length) * 100) : 0,
                average_score: gradedResults.length > 0 ? 
                    Math.round((gradedResults.reduce((sum, r) => sum + r.percentage, 0) / gradedResults.length) * 100) / 100 : 0,
                median_score: gradedResults.length > 0 ? 
                    calculateMedian(gradedResults.map(r => r.percentage)) : 0,
                highest_score: gradedResults.length > 0 ? Math.max(...gradedResults.map(r => r.percentage)) : 0,
                lowest_score: gradedResults.length > 0 ? Math.min(...gradedResults.map(r => r.percentage)) : 0,
                grade_distribution: calculateGradeDistribution(results, assessment.max_marks, assessment.pass_marks),
                performance_trends: gradedResults
                    .sort((a, b) => b.percentage - a.percentage)
                    .map(r => ({
                        student: `${r.first_name} ${r.last_name}`,
                        student_number: r.student_number,
                        percentage: r.percentage,
                        marks: r.marks_obtained,
                        grade: r.grade || calculateGradeFromPercentage(r.percentage)
                    }))
            };

            detailedAssessments.push({
                ...assessment,
                results: results,
                statistics: stats
            });
        }

        // Calculate overall teacher performance metrics
        const allGradedResults = detailedAssessments.flatMap(a => 
            a.results.filter(r => r.is_present && r.marks_obtained !== null)
        );

        const overallStats = {
            total_assessments: assessments.length,
            completed_assessments: detailedAssessments.filter(a => a.statistics.graded_students > 0).length,
            total_students_across_assessments: detailedAssessments.reduce((sum, a) => sum + a.statistics.total_students, 0),
            total_graded: allGradedResults.length,
            overall_average: allGradedResults.length > 0 ? 
                Math.round((allGradedResults.reduce((sum, r) => sum + ((r.marks_obtained / detailedAssessments.find(a => a.id === r.assessment_id)?.max_marks || 1) * 100), 0) / allGradedResults.length) * 100) / 100 : 0,
            overall_attendance_rate: detailedAssessments.length > 0 ? 
                Math.round(detailedAssessments.reduce((sum, a) => sum + a.statistics.attendance_rate, 0) / detailedAssessments.length) : 0,
            overall_pass_rate: detailedAssessments.length > 0 ? 
                Math.round(detailedAssessments.reduce((sum, a) => sum + a.statistics.pass_rate, 0) / detailedAssessments.length) : 0
        };

        // Get subject-wise summary
        const subjectSummary = {};
        detailedAssessments.forEach(assessment => {
            const key = assessment.subject_id;
            if (!subjectSummary[key]) {
                subjectSummary[key] = {
                    subject_id: assessment.subject_id,
                    subject_name: assessment.subject_name,
                    subject_code: assessment.subject_code,
                    department: assessment.department,
                    assessments_count: 0,
                    total_students: 0,
                    average_performance: 0,
                    performances: []
                };
            }
            
            subjectSummary[key].assessments_count++;
            subjectSummary[key].total_students += assessment.statistics.total_students;
            if (assessment.statistics.average_score > 0) {
                subjectSummary[key].performances.push(assessment.statistics.average_score);
            }
        });

        // Calculate averages for subjects
        Object.values(subjectSummary).forEach(subject => {
            if (subject.performances.length > 0) {
                subject.average_performance = Math.round((subject.performances.reduce((sum, p) => sum + p, 0) / subject.performances.length) * 100) / 100;
            }
        });

        // Get class-wise summary
        const classSummary = {};
        detailedAssessments.forEach(assessment => {
            const key = assessment.class_id;
            if (!classSummary[key]) {
                classSummary[key] = {
                    class_id: assessment.class_id,
                    class_name: assessment.class_name,
                    class_level: assessment.class_level,
                    assessments_count: 0,
                    subjects_taught: new Set(),
                    total_students: 0,
                    average_performance: 0,
                    performances: []
                };
            }
            
            classSummary[key].assessments_count++;
            classSummary[key].subjects_taught.add(assessment.subject_name);
            classSummary[key].total_students = Math.max(classSummary[key].total_students, assessment.statistics.total_students);
            if (assessment.statistics.average_score > 0) {
                classSummary[key].performances.push(assessment.statistics.average_score);
            }
        });

        // Calculate averages for classes and convert Set to Array
        Object.values(classSummary).forEach(classData => {
            if (classData.performances.length > 0) {
                classData.average_performance = Math.round((classData.performances.reduce((sum, p) => sum + p, 0) / classData.performances.length) * 100) / 100;
            }
            classData.subjects_taught = Array.from(classData.subjects_taught);
        });

        connection.release();

        res.json({
            success: true,
            data: {
                teacher_info: {
                    teacher_id: teacherId,
                    academic_year: academicYear,
                    generated_at: new Date().toISOString()
                },
                overall_statistics: overallStats,
                assignments: assignments,
                detailed_assessments: detailedAssessments,
                subject_summary: Object.values(subjectSummary),
                class_summary: Object.values(classSummary),
                assessment_types_breakdown: getAssessmentTypesBreakdown(assessments)
            }
        });

    } catch (error) {
        console.error('Error fetching detailed analytics report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch detailed analytics'
        });
    }
});

// Helper function to get assessment types breakdown
const getAssessmentTypesBreakdown = (assessments) => {
    const breakdown = {};
    
    assessments.forEach(assessment => {
        const type = assessment.exam_type;
        if (!breakdown[type]) {
            breakdown[type] = {
                count: 0,
                total_students: 0,
                graded_students: 0,
                average_performance: 0,
                performances: []
            };
        }
        
        breakdown[type].count++;
        breakdown[type].total_students += assessment.total_students || 0;
        breakdown[type].graded_students += assessment.graded_count || 0;
        if (assessment.class_average) {
            breakdown[type].performances.push(parseFloat(assessment.class_average));
        }
    });

    // Calculate averages
    Object.values(breakdown).forEach(type => {
        if (type.performances.length > 0) {
            type.average_performance = Math.round((type.performances.reduce((sum, p) => sum + p, 0) / type.performances.length) * 100) / 100;
        }
    });

    return breakdown;
};

// Helper function to calculate grade from percentage
const calculateGradeFromPercentage = (percentage) => {
    if (percentage >= 81) return 'A';
    if (percentage >= 61) return 'B';
    if (percentage >= 45) return 'C';
    if (percentage >= 30) return 'D';
    return 'F';
};

// GET /api/analytics/student-grade-analysis - Get student grade analysis by teacher's assigned subjects
router.get('/student-grade-analysis', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const { class_id, subject_id, exam_type } = req.query;
        const academicYear = req.query.academic_year || '2024-2025';
        
        console.log('🔍 DEBUG: Fetching student grade analysis:', {
            teacherId, class_id, subject_id, exam_type, academicYear
        });
        
        const connection = await pool.getConnection();

        // Get teacher's assigned subjects for the specified class (or all classes if not specified)
        let subjectsQuery = `
            SELECT DISTINCT 
                s.id as subject_id,
                s.name as subject_name,
                s.code as subject_code,
                s.department,
                c.id as class_id,
                c.name as class_name
            FROM teacher_subject_assignments tsa
            INNER JOIN subjects s ON tsa.subject_id = s.id
            INNER JOIN classes c ON tsa.class_id = c.id
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ? AND s.is_active = TRUE
        `;
        
        const subjectsParams = [teacherId, academicYear];
        
        if (class_id && class_id.trim() !== '') {
            subjectsQuery += ' AND tsa.class_id = ?';
            subjectsParams.push(class_id);
        }
        
        subjectsQuery += ' ORDER BY c.name, s.name';
        
        const [teacherSubjects] = await connection.execute(subjectsQuery, subjectsParams);
        console.log('🔍 DEBUG: Found teacher subjects:', teacherSubjects.length);

        if (teacherSubjects.length === 0) {
            connection.release();
            return res.json({
                success: true,
                data: {
                    students: [],
                    subjects: [],
                    message: 'No subject assignments found for the specified criteria.'
                }
            });
        }

        // Get all students in the relevant classes
        const classIds = [...new Set(teacherSubjects.map(ts => ts.class_id))];
        const placeholders = classIds.map(() => '?').join(',');
        
        const [students] = await connection.execute(`
            SELECT DISTINCT 
                s.id as student_id,
                s.student_id as student_number,
                s.admission_number,
                u.first_name,
                u.last_name,
                s.year_of_study,
                c.id as class_id,
                c.name as class_name,
                c.level as class_level,
                s.tutor_group
            FROM students s
            INNER JOIN users u ON s.user_id = u.id
            INNER JOIN classes c ON s.class_id = c.id
            WHERE s.class_id IN (${placeholders}) AND s.status = 'active'
            ORDER BY c.name, u.last_name, u.first_name
        `, classIds);
        
        console.log('🔍 DEBUG: Found students:', students.length);

        // Get all assessment grades for these students in teacher's subjects
        const subjectIds = [...new Set(teacherSubjects.map(ts => ts.subject_id))];
        const subjectPlaceholders = subjectIds.map(() => '?').join(',');
        const studentIds = students.map(s => s.student_id);
        const studentPlaceholders = studentIds.map(() => '?').join(',');
        
        let gradesQuery = `
            SELECT 
                am.student_id,
                am.assessment_id,
                am.marks_obtained,
                ROUND((am.marks_obtained / a.max_marks) * 100, 2) as percentage,
                am.grade as letter_grade,
                NOT am.is_present as is_absent,
                FALSE as is_excused,
                a.subject_id,
                a.max_marks as total_marks,
                'exam' as assessment_type,
                a.exam_type,
                s.name as subject_name,
                s.code as subject_code
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            INNER JOIN subjects s ON a.subject_id = s.id
            WHERE a.teacher_id = ? AND a.academic_year = ? 
            AND a.subject_id IN (${subjectPlaceholders})
            AND am.student_id IN (${studentPlaceholders})
        `;
        
        const gradesParams = [teacherId, academicYear, ...subjectIds, ...studentIds];
        
        if (subject_id && subject_id.trim() !== '') {
            gradesQuery += ' AND a.subject_id = ?';
            gradesParams.push(subject_id);
        }
        
        if (exam_type && exam_type.trim() !== '') {
            gradesQuery += ' AND a.exam_type = ?';
            gradesParams.push(exam_type);
        }
        
        gradesQuery += ' ORDER BY am.student_id, a.subject_id';
        
        const [grades] = await connection.execute(gradesQuery, gradesParams);
        console.log('🔍 DEBUG: Found grades:', grades.length);

        // Process data to create the analysis table structure
        const studentAnalysis = students.map(student => {
            const studentGrades = grades.filter(g => g.student_id === student.student_id);
            
            // Group grades by subject
            const subjectPerformance = {};
            let totalMarksObtained = 0;
            let totalPossibleMarks = 0;
            let subjectsWithGrades = 0;
            
            teacherSubjects.forEach(subject => {
                const subjectGrades = studentGrades.filter(g => g.subject_id === subject.subject_id);
                
                if (subjectGrades.length > 0) {
                    const validGrades = subjectGrades.filter(g => !g.is_absent && !g.is_excused && g.marks_obtained !== null);
                    
                    if (validGrades.length > 0) {
                        const avgMarks = validGrades.reduce((sum, g) => sum + parseFloat(g.marks_obtained), 0) / validGrades.length;
                        const avgPercentage = validGrades.reduce((sum, g) => sum + parseFloat(g.percentage), 0) / validGrades.length;
                        const currentGrade = calculateGradeFromPercentage(avgPercentage);
                        
                        // Simple predicted grade (could be enhanced with ML)
                        const predictedGrade = currentGrade; // For now, same as current
                        const variance = 0; // Calculate based on trend if needed
                        
                        subjectPerformance[subject.subject_code] = {
                            subject_name: subject.subject_name,
                            subject_code: subject.subject_code,
                            percentage: Math.round(avgPercentage),
                            grade: currentGrade,
                            predicted_grade: predictedGrade,
                            variance: variance,
                            total_marks_obtained: validGrades.reduce((sum, g) => sum + parseFloat(g.marks_obtained), 0),
                            total_possible_marks: validGrades.reduce((sum, g) => sum + parseFloat(g.total_marks || 100), 0),
                            assessments_count: validGrades.length,
                            grade_points: null // Can be calculated if needed
                        };
                        
                        totalMarksObtained += subjectPerformance[subject.subject_code].total_marks_obtained;
                        totalPossibleMarks += subjectPerformance[subject.subject_code].total_possible_marks;
                        subjectsWithGrades++;
                    }
                }
                
                // If no grades found for this subject, set default values
                if (!subjectPerformance[subject.subject_code]) {
                    subjectPerformance[subject.subject_code] = {
                        subject_name: subject.subject_name,
                        subject_code: subject.subject_code,
                        percentage: null,
                        grade: null,
                        predicted_grade: null,
                        variance: null,
                        total_marks_obtained: 0,
                        total_possible_marks: 0,
                        assessments_count: 0,
                        grade_points: null
                    };
                }
            });
            
            // Calculate overall averages
            const overallAverage = totalPossibleMarks > 0 ? Math.round((totalMarksObtained / totalPossibleMarks) * 100) : 0;
            
            return {
                student_id: student.student_id,
                student_number: student.student_number,
                admission_number: student.admission_number,
                first_name: student.first_name,
                last_name: student.last_name,
                full_name: `${student.last_name}, ${student.first_name}`,
                gender: student.gender,
                year_of_study: student.year_of_study,
                class_name: student.class_name,
                tutor_group: student.tutor_group,
                subject_grades: subjectPerformance,
                total_marks_obtained: totalMarksObtained,
                total_possible_marks: totalPossibleMarks,
                overall_average: overallAverage,
                overall_grade: calculateGradeFromPercentage(overallAverage),
                subjects_with_grades: subjectsWithGrades
            };
        });

        // Get unique subjects for table headers
        const uniqueSubjects = teacherSubjects.reduce((acc, ts) => {
            const key = ts.subject_id;
            if (!acc[key]) {
                acc[key] = {
                    id: ts.subject_id,
                    subject_id: ts.subject_id,
                    name: ts.subject_name,
                    subject_name: ts.subject_name,
                    code: ts.subject_code,
                    subject_code: ts.subject_code,
                    department: ts.department,
                    classes: []
                };
            }
            if (!acc[key].classes.find(c => c.class_id === ts.class_id)) {
                acc[key].classes.push({
                    class_id: ts.class_id,
                    class_name: ts.class_name
                });
            }
            return acc;
        }, {});

        connection.release();

        res.json({
            success: true,
            data: {
                students: studentAnalysis,
                subjects: Object.values(uniqueSubjects),
                filters: {
                    class_id: class_id || null,
                    subject_id: subject_id || null,
                    exam_type: exam_type || null,
                    academic_year: academicYear
                },
                summary: {
                    total_students: students.length,
                    total_subjects: Object.keys(uniqueSubjects).length,
                    students_with_grades: studentAnalysis.filter(s => s.subjects_with_grades > 0).length
                }
            }
        });

    } catch (error) {
        console.error('Error fetching student grade analysis:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student grade analysis data'
        });
    }
});

// POST /api/analytics/export-pdf - Generate and download PDF report
router.post('/export-pdf', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can generate reports.'
            });
        }

        const { reportData, reportType = 'comprehensive' } = req.body;
        
        if (!reportData) {
            return res.status(400).json({
                success: false,
                message: 'Report data is required'
            });
        }

        // Create PDF document
        const doc = new PDFDocument();
        const filename = `Teacher_Analytics_Report_${Date.now()}.pdf`;
        const filePath = path.join(__dirname, '../uploads', filename);

        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Pipe PDF to file
        doc.pipe(fs.createWriteStream(filePath));

        // Generate PDF content
        await generatePDFReport(doc, reportData, reportType);
        
        // Finalize PDF
        doc.end();

        // Wait for file to be written
        await new Promise((resolve) => {
            doc.on('end', resolve);
        });

        // Send file as download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        // Clean up file after sending
        fileStream.on('end', () => {
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error cleaning up PDF file:', err);
                });
            }, 5000);
        });

    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate PDF report'
        });
    }
});

// Function to generate PDF report content
const generatePDFReport = async (doc, reportData, reportType) => {
    const margin = 50;
    let yPosition = margin;

    // Official Tanzania Header - Centered and Bold
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#000000')
       .text('THE UNITED REPUBLIC OF TANZANIA', { align: 'center' });
    yPosition += 15;
    
    doc.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', { align: 'center' });
    yPosition += 20;
    
    // School Header - Stylized
    doc.fontSize(16).fillColor('#003366')
       .text('UBUNIFU SECONDARY SCHOOL', { align: 'center' });
    yPosition += 15;
    
    // Tagline
    doc.fontSize(11).font('Helvetica-Oblique')
       .fillColor('#333333')
       .text('Excellence in Education • Nurturing Future Leaders', { align: 'center' });
    yPosition += 18;
    
    // Contact Information
    doc.fontSize(9).font('Helvetica')
       .fillColor('#555555')
       .text('P.O. Box 123, Singida, Tanzania', { align: 'center' });
    yPosition += 8;
    doc.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', { align: 'center' });
    yPosition += 18;
    
    // Decorative line
    doc.moveTo(margin, yPosition).lineTo(doc.page.width - margin, yPosition)
       .strokeColor('#003366').lineWidth(0.5).stroke();
    yPosition += 20;
    
    // Report Title
    doc.fontSize(16).font('Helvetica-Bold')
       .fillColor('#003366')
       .text('Assessment Analytics Report', { align: 'center' });
    yPosition += 25;

    // Teacher and period info
    doc.fontSize(12).font('Helvetica')
       .text(`Academic Year: ${reportData.teacher_info.academic_year}`, margin, yPosition)
       .text(`Generated: ${new Date().toLocaleDateString('en-US', { 
           weekday: 'long', 
           year: 'numeric', 
           month: 'long', 
           day: 'numeric' 
       })}`, margin + 200, yPosition);
    yPosition += 30;

    // Overall Summary Section
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Overall Performance Summary', margin, yPosition);
    yPosition += 20;

    const summary = reportData.overall_statistics;
    doc.fontSize(11).font('Helvetica')
       .text(`Total Assessments: ${summary.total_assessments}`, margin, yPosition)
       .text(`Completed: ${summary.completed_assessments}`, margin + 150, yPosition)
       .text(`Completion Rate: ${summary.completion_rate}%`, margin + 300, yPosition);
    yPosition += 15;

    doc.text(`Students Evaluated: ${summary.total_students_evaluated}`, margin, yPosition)
       .text(`Overall Average: ${summary.overall_average}%`, margin + 200, yPosition);
    yPosition += 30;

    // Subject Performance Section
    if (reportData.subject_summary.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold')
           .text('Subject Performance Analysis', margin, yPosition);
        yPosition += 20;

        reportData.subject_summary.forEach((subject, index) => {
            doc.fontSize(12).font('Helvetica-Bold')
               .text(`${subject.subject_name} (${subject.subject_code})`, margin, yPosition);
            yPosition += 15;

            doc.fontSize(10).font('Helvetica')
               .text(`• Assessments: ${subject.total_assessments}`, margin + 20, yPosition)
               .text(`• Completed: ${subject.completed_assessments}`, margin + 150, yPosition)
               .text(`• Avg Performance: ${subject.average_performance}%`, margin + 280, yPosition);
            yPosition += 15;

            if (yPosition > doc.page.height - margin) {
                doc.addPage();
                yPosition = margin;
            }
        });
        yPosition += 20;
    }

    // Class Performance Section
    if (reportData.class_summary.length > 0) {
        if (yPosition > doc.page.height - margin - 150) {
            doc.addPage();
            yPosition = margin;
        }

        doc.fontSize(16).font('Helvetica-Bold')
           .text('Class Performance Analysis', margin, yPosition);
        yPosition += 20;

        reportData.class_summary.forEach((classData, index) => {
            doc.fontSize(12).font('Helvetica-Bold')
               .text(`${classData.class_name} (Level ${classData.class_level})`, margin, yPosition);
            yPosition += 15;

            doc.fontSize(10).font('Helvetica')
               .text(`• Assessments: ${classData.total_assessments}`, margin + 20, yPosition)
               .text(`• Students: ${classData.total_students}`, margin + 150, yPosition)
               .text(`• Avg Performance: ${classData.average_performance}%`, margin + 280, yPosition);
            yPosition += 12;

            doc.text(`• Subjects: ${classData.subjects_taught.join(', ')}`, margin + 20, yPosition);
            yPosition += 20;

            if (yPosition > doc.page.height - margin) {
                doc.addPage();
                yPosition = margin;
            }
        });
    }

    // Recent Trends Section
    if (reportData.recent_trends.length > 0) {
        if (yPosition > doc.page.height - margin - 200) {
            doc.addPage();
            yPosition = margin;
        }

        doc.fontSize(16).font('Helvetica-Bold')
           .text('Recent Performance Trends', margin, yPosition);
        yPosition += 20;

        reportData.recent_trends.slice(0, 10).forEach((trend, index) => {
            doc.fontSize(10).font('Helvetica')
               .text(`${index + 1}. ${trend.title}`, margin, yPosition)
               .text(`${trend.subject} - ${trend.class}`, margin + 200, yPosition)
               .text(`${trend.average}%`, margin + 350, yPosition)
               .text(`${new Date(trend.date).toLocaleDateString()}`, margin + 400, yPosition);
            yPosition += 12;

            if (yPosition > doc.page.height - margin) {
                doc.addPage();
                yPosition = margin;
            }
        });
    }

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica')
           .text(`Page ${i + 1} of ${pageCount} | Generated by UBUNIFU SEC SMS`, 
                  margin, doc.page.height - margin, 
                  { align: 'center', width: doc.page.width - 2 * margin });
    }
};

// GET /api/analytics/teacher/initial-data - Get teacher's classes and subjects for filters
router.get('/teacher/initial-data', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        const connection = await pool.getConnection();

        // Get teacher's assigned classes (FIXED: Use subquery to count distinct students)
        const [classes] = await connection.execute(`
            SELECT DISTINCT 
                c.id,
                c.name,
                c.level,
                c.capacity,
                (SELECT COUNT(DISTINCT s2.id) 
                 FROM students s2 
                 WHERE s2.class_id = c.id AND s2.status = 'active') as student_count
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
            GROUP BY c.id, c.name, c.level, c.capacity
            ORDER BY c.level, c.name
        `, [teacherId, academicYear]);

        // Get teacher's assigned subjects
        const [subjects] = await connection.execute(`
            SELECT DISTINCT 
                s.id,
                s.name,
                s.code,
                s.department
            FROM teacher_subject_assignments tsa
            INNER JOIN subjects s ON tsa.subject_id = s.id
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ? AND s.is_active = TRUE
            ORDER BY s.name
        `, [teacherId, academicYear]);

        connection.release();

        res.json({
            success: true,
            data: {
                classes: classes,
                subjects: subjects
            }
        });

    } catch (error) {
        console.error('Error fetching teacher initial data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch initial data'
        });
    }
});

// GET /api/analytics/student-statistics - Get student registration statistics
router.get('/student-statistics', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        const connection = await pool.getConnection();

        // Get total students in the system
        const [totalStudents] = await connection.execute(`
            SELECT COUNT(*) as count FROM students WHERE status = 'active'
        `);

        // Get active students
        const [activeStudents] = await connection.execute(`
            SELECT COUNT(*) as count FROM students WHERE status = 'active'
        `);

        // Get students in teacher's classes
        const [myStudents] = await connection.execute(`
            SELECT COUNT(DISTINCT s.id) as count
            FROM students s
            INNER JOIN teacher_subject_assignments tsa ON s.class_id = tsa.class_id
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ? AND s.status = 'active'
        `, [teacherId, academicYear]);

        // Get monthly registrations (current month)
        const [monthlyRegistrations] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM students 
            WHERE status = 'active' 
            AND MONTH(created_at) = MONTH(CURDATE()) 
            AND YEAR(created_at) = YEAR(CURDATE())
        `);

        // Calculate average class size
        const [avgClassSize] = await connection.execute(`
            SELECT AVG(student_count) as avg_size
            FROM (
                SELECT COUNT(s.id) as student_count
                FROM classes c
                LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
                GROUP BY c.id
            ) as class_sizes
        `);

        connection.release();

        res.json({
            success: true,
            data: {
                total_students: totalStudents[0].count,
                active_students: activeStudents[0].count,
                my_students: myStudents[0].count,
                monthly_registrations: monthlyRegistrations[0].count,
                average_class_size: Math.round(avgClassSize[0].avg_size || 0)
            }
        });

    } catch (error) {
        console.error('Error fetching student statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student statistics'
        });
    }
});

// GET /api/analytics/academic-overview - Get academic overview statistics
router.get('/academic-overview', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        const connection = await pool.getConnection();

        // Get classes count
        const [classesCount] = await connection.execute(`
            SELECT COUNT(DISTINCT tsa.class_id) as count
            FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
        `, [teacherId, academicYear]);

        // Get subjects count
        const [subjectsCount] = await connection.execute(`
            SELECT COUNT(DISTINCT tsa.subject_id) as count
            FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
        `, [teacherId, academicYear]);

        // Get total assessments created
        const [totalAssessments] = await connection.execute(`
            SELECT COUNT(*) as count
            FROM assessments
            WHERE teacher_id = ? AND academic_year = ? AND is_active = TRUE
        `, [teacherId, academicYear]);

        // Get students assessed
        const [studentsAssessed] = await connection.execute(`
            SELECT COUNT(DISTINCT am.student_id) as count
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
        `, [teacherId, academicYear]);

        // Get overall average performance
        const [overallAverage] = await connection.execute(`
            SELECT AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                THEN (am.marks_obtained / a.max_marks) * 100 END) as average
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
        `, [teacherId, academicYear]);

        // Get pass rate
        const [passRate] = await connection.execute(`
            SELECT 
                COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                    AND (am.marks_obtained / a.max_marks) * 100 >= (a.pass_marks / a.max_marks) * 100 THEN 1 END) as passed,
                COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL THEN 1 END) as total
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
        `, [teacherId, academicYear]);

        // Get latest assessment
        const [latestAssessment] = await connection.execute(`
            SELECT assessment_name, assessment_date
            FROM assessments
            WHERE teacher_id = ? AND academic_year = ? AND is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
        `, [teacherId, academicYear]);

        // Get active classes count
        const [activeClasses] = await connection.execute(`
            SELECT COUNT(DISTINCT a.class_id) as count
            FROM assessments a
            WHERE a.teacher_id = ? AND a.academic_year = ? AND a.is_active = TRUE
            AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        `, [teacherId, academicYear]);

        connection.release();

        const passRatePercentage = passRate[0].total > 0 ? Math.round((passRate[0].passed / passRate[0].total) * 100) : 0;

        res.json({
            success: true,
            data: {
                classes_count: classesCount[0].count,
                subjects_count: subjectsCount[0].count,
                total_assessments: totalAssessments[0].count,
                students_assessed: studentsAssessed[0].count,
                overall_average: Math.round((overallAverage[0].average || 0) * 100) / 100,
                pass_rate: passRatePercentage,
                latest_assessment: latestAssessment[0]?.assessment_name || 'No recent assessments',
                active_classes: activeClasses[0].count
            }
        });

    } catch (error) {
        console.error('Error fetching academic overview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch academic overview'
        });
    }
});

// GET /api/analytics/teacher-assessments - Get teacher assessments with filters (for frontend compatibility)
router.get('/teacher-assessments', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const teacherId = req.user.id;
        const { class_id, subject_id, exam_type, start_date, end_date } = req.query;
        const academicYear = req.query.academic_year || '2024-2025';
        
        // Redirect to comprehensive endpoint with same parameters
        const params = new URLSearchParams(req.query);
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/analytics/teacher/comprehensive?${params}`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });
        
        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Error fetching teacher assessments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch teacher assessments'
        });
    }
});

// GET /api/analytics/report-data - Get report data for PDF generation
router.get('/report-data', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        // Redirect to detailed-report endpoint with same parameters
        const params = new URLSearchParams(req.query);
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/analytics/detailed-report?${params}`, {
            headers: {
                'Authorization': req.headers.authorization
            }
        });
        
        const data = await response.json();
        
        // Format data for PDF generation
        if (data.success && data.data) {
            const formattedData = {
                teacher_name: req.user.first_name + ' ' + req.user.last_name,
                assessments: data.data.detailed_assessments || [],
                summary: data.data.overall_statistics || {}
            };
            
            res.json({
                success: true,
                data: formattedData
            });
        } else {
            res.json(data);
        }

    } catch (error) {
        console.error('Error fetching report data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report data'
        });
    }
});

module.exports = router;
