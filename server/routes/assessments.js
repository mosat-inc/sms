const express = require('express');
const Joi = require('joi');
const Auth = require('../utils/auth');
const { pool } = require('../config/database');
const router = express.Router();

let assessmentsSchemaCache = { kind: null, fields: null, checkedAt: 0 };
const ASSESSMENTS_SCHEMA_CACHE_MS = 5 * 60 * 1000;

const getAssessmentsSchemaMeta = async (connection) => {
    const now = Date.now();
    if (assessmentsSchemaCache.kind && assessmentsSchemaCache.fields && now - assessmentsSchemaCache.checkedAt < ASSESSMENTS_SCHEMA_CACHE_MS) {
        return assessmentsSchemaCache;
    }

    const [cols] = await connection.execute('SHOW COLUMNS FROM assessments');
    const fields = new Set((cols || []).map((col) => col.Field));
    const kind = fields.has('assessment_name') || fields.has('exam_type') ? 'legacy' : 'grades_module';

    assessmentsSchemaCache = {
        kind,
        fields,
        checkedAt: now,
    };

    return assessmentsSchemaCache;
};

const invalidateAssessmentsSchemaCache = () => {
    assessmentsSchemaCache = { kind: null, fields: null, checkedAt: 0 };
};

const isAssessmentPublished = (assessment, schemaMeta) => {
    if (schemaMeta.fields.has('is_published')) {
        return Boolean(assessment.is_published);
    }

    const status = String(assessment.status || '').toLowerCase();
    return status === 'published' || status === 'closed';
};

const getCurrentAcademicYearName = async (connection) => {
    try {
        const [currentRows] = await connection.execute(
            `SELECT year_name
             FROM academic_years
             WHERE is_current = TRUE AND is_active = TRUE
             ORDER BY id DESC
             LIMIT 1`
        );

        if (currentRows?.[0]?.year_name) {
            return currentRows[0].year_name;
        }

        const [activeRows] = await connection.execute(
            `SELECT year_name
             FROM academic_years
             WHERE is_active = TRUE
             ORDER BY is_current DESC, id DESC
             LIMIT 1`
        );

        if (activeRows?.[0]?.year_name) {
            return activeRows[0].year_name;
        }

        const [anyRows] = await connection.execute(
            `SELECT year_name
             FROM academic_years
             ORDER BY is_current DESC, is_active DESC, id DESC
             LIMIT 1`
        );

        return anyRows?.[0]?.year_name || '2024-2025';
    } catch (_error) {
        return '2024-2025';
    }
};

const ensureApprovalWorkflowColumns = async (connection) => {
    const schemaMeta = await getAssessmentsSchemaMeta(connection);
    const alterStatements = [];

    if (!schemaMeta.fields.has('approval_status')) {
        alterStatements.push("ADD COLUMN approval_status VARCHAR(20) NOT NULL DEFAULT 'draft'");
    }

    if (!schemaMeta.fields.has('approval_submitted_at')) {
        alterStatements.push('ADD COLUMN approval_submitted_at DATETIME NULL');
    }

    if (!schemaMeta.fields.has('approval_submitted_by')) {
        alterStatements.push('ADD COLUMN approval_submitted_by INT NULL');
    }

    if (!schemaMeta.fields.has('approved_at')) {
        alterStatements.push('ADD COLUMN approved_at DATETIME NULL');
    }

    if (!schemaMeta.fields.has('approved_by')) {
        alterStatements.push('ADD COLUMN approved_by INT NULL');
    }

    if (alterStatements.length > 0) {
        await connection.execute(`ALTER TABLE assessments ${alterStatements.join(', ')}`);
        invalidateAssessmentsSchemaCache();
    }

    return getAssessmentsSchemaMeta(connection);
};

// Validation schemas
const createAssessmentSchema = Joi.object({
    class_id: Joi.number().integer().positive().required(),
    subject_id: Joi.number().integer().positive().required(),
    assessment_name: Joi.string().min(3).max(255).required(),
    exam_type: Joi.string().valid('mid term test 1', 'mid term test 2', 'terminal exams', 'annual exams', 'mock exams').required(),
    assessment_date: Joi.date().iso().required(),
    max_marks: Joi.number().integer().min(1).max(100).default(100),
    pass_marks: Joi.number().integer().min(1).max(100).default(40),
    description: Joi.string().max(1000).allow(null, '').optional(),
    duration_minutes: Joi.number().integer().min(30).max(480).default(120)
});

const updateMarksSchema = Joi.object({
    student_marks: Joi.array().items(
        Joi.object({
            student_id: Joi.number().integer().positive().required(),
            marks_obtained: Joi.number().min(0).max(100).allow(null),
            is_present: Joi.boolean().default(true),
            is_absent: Joi.boolean().optional(),
            is_excused: Joi.boolean().optional(),
            submission_status: Joi.string().optional(),
            remarks: Joi.string().max(500).allow('').optional(),
            grade: Joi.string().max(2).allow('').optional()
        })
    ).min(1).required()
});

// Helper function to calculate grade (matching frontend logic)
const calculateGrade = (marksObtained, maxMarks) => {
  if (!marksObtained || !maxMarks || maxMarks <= 0) return null;
  
  const percentage = (marksObtained / maxMarks) * 100;
  
  if (percentage >= 81) return 'A';
  if (percentage >= 61) return 'B';
  if (percentage >= 45) return 'C';
  if (percentage >= 30) return 'D';
  return 'F';
};

// GET /api/assessments/teacher/classes - Get teacher's assigned classes
router.get('/teacher/classes', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const connection = await pool.getConnection();
        const schemaMeta = await ensureApprovalWorkflowColumns(connection);
        
        // First try to get assigned classes
        const assignedQuery = `
            SELECT DISTINCT 
                c.id,
                c.name,
                c.level,
                c.capacity,
                c.academic_year
            FROM classes c
            INNER JOIN teacher_subject_assignments tsa ON c.id = tsa.class_id
            WHERE tsa.teacher_id = ? AND c.is_active = TRUE
            ORDER BY c.level, c.name
        `;
        
        let [classes] = await connection.execute(assignedQuery, [req.user.id]);
        
        // If no assigned classes found, return all active classes as fallback
        if (classes.length === 0) {
            console.log(`No assigned classes found for teacher ${req.user.id}, returning all active classes as fallback`);
            const fallbackQuery = `
                SELECT 
                    c.id,
                    c.name,
                    c.level,
                    c.capacity,
                    c.academic_year
                FROM classes c
                WHERE c.is_active = TRUE
                ORDER BY c.level, c.name
                LIMIT 10
            `;
            [classes] = await connection.execute(fallbackQuery);
        }
        
        connection.release();

        res.json({
            success: true,
            data: classes
        });
    } catch (error) {
        console.error('Error fetching teacher classes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classes'
        });
    }
});

// GET /api/assessments/teacher/all-subjects - Get all subjects teacher teaches across all classes
router.get('/teacher/all-subjects', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const connection = await pool.getConnection();
        
        // Get all subjects teacher teaches across all classes
        const assignedQuery = `
            SELECT DISTINCT 
                s.id,
                s.name,
                s.code,
                s.description,
                s.department
            FROM subjects s
            INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
            WHERE tsa.teacher_id = ? AND s.is_active = TRUE
            ORDER BY s.name
        `;
        
        let [subjects] = await connection.execute(assignedQuery, [req.user.id]);
        
        // If no assigned subjects found, return all active subjects as fallback
        if (subjects.length === 0) {
            console.log(`No assigned subjects found for teacher ${req.user.id}, returning all active subjects as fallback`);
            const fallbackQuery = `
                SELECT 
                    s.id,
                    s.name,
                    s.code,
                    s.description,
                    s.department
                FROM subjects s
                WHERE s.is_active = TRUE
                ORDER BY s.name
                LIMIT 15
            `;
            [subjects] = await connection.execute(fallbackQuery);
        }
        
        connection.release();

        res.json({
            success: true,
            data: subjects
        });
    } catch (error) {
        console.error('Error fetching all teacher subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subjects'
        });
    }
});

// GET /api/assessments/teacher/subjects/:classId - Get teacher's subjects for a specific class
router.get('/teacher/subjects/:classId', Auth.authenticateToken, async (req, res) => {
    try {
        console.log('🔍 DEBUG: Fetching subjects endpoint called');
        console.log('🔍 DEBUG: User:', { id: req.user.id, role: req.user.role, username: req.user.username });
        console.log('🔍 DEBUG: Class ID:', req.params.classId);
        
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            console.log('❌ DEBUG: Access denied - not teacher or admin');
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const { classId } = req.params;
        console.log('🔍 DEBUG: Fetching subjects for teacher:', req.user.id, 'class:', classId);
        const connection = await pool.getConnection();
        
        // First try to get assigned subjects for this class
        const assignedQuery = `
            SELECT DISTINCT 
                s.id,
                s.name,
                s.code,
                s.description,
                s.department
            FROM subjects s
            INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
            WHERE tsa.teacher_id = ? AND tsa.class_id = ? AND s.is_active = TRUE
            ORDER BY s.name
        `;
        
        console.log('🔍 DEBUG: Executing assigned subjects query with params:', [req.user.id, classId]);
        let [subjects] = await connection.execute(assignedQuery, [req.user.id, classId]);
        
        console.log('🔍 DEBUG: Assigned subjects query result:', {
            count: subjects.length,
            subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code }))
        });
        
        // If no assigned subjects found, return all active subjects as fallback
        if (subjects.length === 0) {
            console.log(`⚠️ DEBUG: No assigned subjects found for teacher ${req.user.id} in class ${classId}`);
            console.log('🔍 DEBUG: Checking teacher assignments for debugging...');
            
            // Debug: Check what assignments exist
            const [debugAssignments] = await connection.execute(`
                SELECT tsa.*, s.name as subject_name, c.name as class_name
                FROM teacher_subject_assignments tsa
                LEFT JOIN subjects s ON tsa.subject_id = s.id
                LEFT JOIN classes c ON tsa.class_id = c.id
                WHERE tsa.teacher_id = ?
            `, [req.user.id]);
            
            console.log('🔍 DEBUG: All teacher assignments:', debugAssignments.map(a => ({
                id: a.id,
                class_id: a.class_id,
                class_name: a.class_name,
                subject_id: a.subject_id,
                subject_name: a.subject_name
            })));
            
            console.log('🔍 DEBUG: Returning fallback subjects...');
            const fallbackQuery = `
                SELECT 
                    s.id,
                    s.name,
                    s.code,
                    s.description,
                    s.department
                FROM subjects s
                WHERE s.is_active = TRUE
                ORDER BY s.name
                LIMIT 10
            `;
            [subjects] = await connection.execute(fallbackQuery);
            console.log('🔍 DEBUG: Fallback subjects:', subjects.map(s => ({ id: s.id, name: s.name, code: s.code })));
        } else {
            console.log('✅ DEBUG: Found assigned subjects, returning them');
        }
        
        connection.release();

        const response = {
            success: true,
            data: subjects
        };
        
        console.log('🔍 DEBUG: Final API response:', {
            success: response.success,
            dataCount: response.data.length,
            subjects: response.data.map(s => ({ id: s.id, name: s.name, code: s.code }))
        });

        res.json(response);
    } catch (error) {
        console.error('❌ DEBUG: Error fetching teacher subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subjects'
        });
    }
});

// GET /api/assessments/class/:classId/students - Get students in a class
router.get('/class/:classId/students', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const { classId } = req.params;
        const connection = await pool.getConnection();
        
        const query = `
            SELECT 
                s.id,
                s.student_id,
                s.admission_number,
                u.first_name,
                u.last_name,
                u.email,
                s.status
            FROM students s
            INNER JOIN users u ON s.user_id = u.id
            WHERE s.class_id = ? AND s.status = 'active' AND u.is_active = TRUE
            ORDER BY u.first_name, u.last_name
        `;
        
        const [students] = await connection.execute(query, [classId]);
        connection.release();

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error fetching class students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students'
        });
    }
});

// POST /api/assessments - Create a new assessment
router.post('/', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can create assessments.'
            });
        }

        // Validate input
        console.log('🔍 DEBUG: Request body for assessment creation:', JSON.stringify(req.body, null, 2));
        const { error, value } = createAssessmentSchema.validate(req.body);
        if (error) {
            console.log('❌ DEBUG: Validation error:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const {
            class_id,
            subject_id,
            assessment_name,
            exam_type,
            assessment_date,
            max_marks,
            pass_marks,
            description,
            duration_minutes
        } = value;

        if (pass_marks > max_marks) {
            return res.status(400).json({
                success: false,
                message: 'Pass marks cannot be greater than total marks'
            });
        }

        const connection = await pool.getConnection();
        const schemaMeta = await getAssessmentsSchemaMeta(connection);

        // Verify teacher has access to this class and subject
        const [teacherAccess] = await connection.execute(`
            SELECT id FROM teacher_subject_assignments 
            WHERE teacher_id = ? AND class_id = ? AND subject_id = ?
        `, [req.user.id, class_id, subject_id]);

        if (teacherAccess.length === 0) {
            connection.release();
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not assigned to teach this subject in this class.'
            });
        }

        const academicYear = await getCurrentAcademicYearName(connection);

        // Create assessment
        const [result] = await connection.execute(`
            INSERT INTO assessments (
                teacher_id, class_id, subject_id, assessment_name, exam_type, 
                academic_year, assessment_date, max_marks, pass_marks, total_marks, 
                description, duration_minutes, status, approval_status, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, class_id, subject_id, assessment_name, exam_type,
            academicYear, assessment_date, max_marks, pass_marks, max_marks,
            description, duration_minutes, 'draft', 'draft', true
        ]);

        const assessmentId = result.insertId;

        if (schemaMeta.fields.has('is_published') && schemaMeta.fields.has('is_final')) {
            await connection.execute(
                'UPDATE assessments SET is_published = FALSE, is_final = FALSE WHERE id = ?',
                [assessmentId]
            );
        }

        // Get all students in the class and create assessment_marks entries
        const [students] = await connection.execute(`
            SELECT id FROM students 
            WHERE class_id = ? AND status = 'active'
        `, [class_id]);

        // Insert assessment marks records for all students (initially with NULL marks)
        const insertMarksPromises = students.map(student => 
            connection.execute(`
                INSERT INTO assessment_marks (
                    assessment_id, student_id, marks_obtained, is_present, marked_by
                ) VALUES (?, ?, NULL, TRUE, ?)
            `, [assessmentId, student.id, req.user.id])
        );

        await Promise.all(insertMarksPromises);

        // Fetch the created assessment with related data
        const [createdAssessment] = await connection.execute(`
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

        connection.release();

        res.status(201).json({
            success: true,
            message: 'Assessment created successfully',
            data: createdAssessment[0]
        });

    } catch (error) {
        console.error('Error creating assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create assessment'
        });
    }
});

// GET /api/assessments/:id/students - Get assessment with students and their marks
router.get('/:id/students', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const { id } = req.params;
        const connection = await pool.getConnection();

        // Get assessment details
        const [assessments] = await connection.execute(`
            SELECT 
                a.*,
                c.name as class_name,
                s.name as subject_name,
                s.code as subject_code
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            WHERE a.id = ? AND a.teacher_id = ?
        `, [id, req.user.id]);

        if (assessments.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Assessment not found or access denied'
            });
        }

        const assessment = assessments[0];

        // Get students with their marks
        const [studentMarks] = await connection.execute(`
            SELECT 
                sg.id as mark_id,
                sg.marks_obtained,
                sg.letter_grade as grade,
                sg.remarks,
                CASE WHEN sg.is_absent = TRUE THEN FALSE ELSE TRUE END as is_present,
                sg.is_absent,
                sg.is_excused,
                sg.percentage,
                s.id as student_id,
                s.student_id as student_number,
                s.admission_number,
                u.first_name,
                u.last_name,
                u.email
            FROM students s
            INNER JOIN users u ON s.user_id = u.id
            LEFT JOIN student_grades sg ON s.id = sg.student_id AND sg.assessment_id = ?
            WHERE s.class_id = ? AND s.status = 'active'
            ORDER BY u.first_name, u.last_name
        `, [id, assessment.class_id]);

        connection.release();

        res.json({
            success: true,
            data: {
                assessment,
                students: studentMarks
            }
        });

    } catch (error) {
        console.error('Error fetching assessment students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessment data'
        });
    }
});

// PUT /api/assessments/:id/marks - Update student marks for an assessment
router.put('/:id/marks', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can update marks.'
            });
        }

        const { id } = req.params;
        
        // Validate input
        console.log('🔍 DEBUG: Request body for marks update:', JSON.stringify(req.body, null, 2));
        const { error, value } = updateMarksSchema.validate(req.body);
        if (error) {
            console.log('❌ DEBUG: Validation error:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { student_marks } = value;
        const connection = await pool.getConnection();
        const schemaMeta = await ensureApprovalWorkflowColumns(connection);

        // Verify teacher owns this assessment
        const [assessments] = await connection.execute(`
            SELECT max_marks FROM assessments 
            WHERE id = ? AND teacher_id = ?
        `, [id, req.user.id]);

        if (assessments.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Assessment not found or access denied'
            });
        }

        const { max_marks } = assessments[0];

        // Update marks for each student
        const updatePromises = student_marks.map(async (mark) => {
            const { student_id, marks_obtained, is_present, remarks, grade: frontendGrade } = mark;

            if (marks_obtained !== null && marks_obtained !== undefined && Number(marks_obtained) > 100) {
                throw new Error('Marks obtained cannot be greater than 100');
            }

            if (marks_obtained !== null && marks_obtained !== undefined && Number(marks_obtained) < 0) {
                throw new Error('Marks obtained cannot be less than 0');
            }
            
            // Use grade from frontend if provided, otherwise calculate it
            const grade = frontendGrade || calculateGrade(marks_obtained, max_marks);
            
            // Use remarks from frontend, or generate automatic remark if none provided
            let finalRemarks = remarks;
            if (!finalRemarks && grade) {
                switch (grade) {
                    case 'A': finalRemarks = 'Excellent!'; break;
                    case 'B': finalRemarks = 'Good'; break;
                    case 'C': finalRemarks = 'Average'; break;
                    case 'D': finalRemarks = 'Poor'; break;
                    case 'F': finalRemarks = 'Bad'; break;
                    default: finalRemarks = null;
                }
            }
            
            console.log(`🔍 DEBUG: Updating marks for student ${student_id}:`, {
                marks_obtained,
                grade,
                finalRemarks,
                is_present
            });
            
            return connection.execute(`
                UPDATE assessment_marks 
                SET marks_obtained = ?, grade = ?, remarks = ?, is_present = ?, 
                    marked_by = ?, updated_at = CURRENT_TIMESTAMP
                WHERE assessment_id = ? AND student_id = ?
            `, [marks_obtained, grade, finalRemarks, is_present, req.user.id, id, student_id]);
        });

        await Promise.all(updatePromises);

        // Update assessment status to completed if it was draft
        if (schemaMeta.fields.has('is_published') && schemaMeta.fields.has('is_final')) {
            await connection.execute(`
                UPDATE assessments 
                SET status = CASE 
                    WHEN status = 'draft' THEN 'completed' 
                    ELSE status 
                END,
                approval_status = 'pending',
                approval_submitted_at = CURRENT_TIMESTAMP,
                approval_submitted_by = ?,
                is_published = FALSE,
                is_final = FALSE,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [req.user.id, id]);
        } else {
            await connection.execute(`
                UPDATE assessments 
                SET status = CASE 
                    WHEN status = 'draft' THEN 'completed' 
                    WHEN status = 'published' THEN 'completed'
                    ELSE status 
                END,
                approval_status = 'pending',
                approval_submitted_at = CURRENT_TIMESTAMP,
                approval_submitted_by = ?,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [req.user.id, id]);
        }

        connection.release();

        res.json({
            success: true,
            message: 'Marks submitted for admin approval successfully',
            data: {
                assessment_id: parseInt(id, 10),
                students_updated: student_marks.length,
                approval_status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error updating marks:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update marks'
        });
    }
});

// GET /api/assessments/teacher - Get teacher's assessments
router.get('/teacher', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can access this endpoint.'
            });
        }

        const connection = await pool.getConnection();
        
        const [assessments] = await connection.execute(`
            SELECT 
                a.id,
                a.assessment_name,
                a.exam_type,
                a.assessment_date,
                a.max_marks,
                a.pass_marks,
                a.status,
                c.name as class_name,
                s.name as subject_name,
                s.code as subject_code,
                COUNT(am.id) as total_students,
                SUM(CASE WHEN am.marks_obtained IS NOT NULL OR am.is_present = FALSE THEN 1 ELSE 0 END) as marked_students
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN assessment_marks am ON a.id = am.assessment_id
            WHERE a.teacher_id = ? AND a.is_active = TRUE
            GROUP BY a.id
            ORDER BY a.assessment_date DESC, a.created_at DESC
        `, [req.user.id]);

        connection.release();

        res.json({
            success: true,
            data: assessments
        });

    } catch (error) {
        console.error('Error fetching teacher assessments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessments'
        });
    }
});

// GET /api/assessments/:id/results - Get assessment results with all student grades
router.get('/:id/results', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can view results.'
            });
        }

        const { id } = req.params;
        const connection = await pool.getConnection();
        const schemaMeta = await getAssessmentsSchemaMeta(connection);

        // Get assessment details
        const whereCondition = req.user.role === 'admin' ? 'WHERE a.id = ?' : 'WHERE a.id = ? AND a.teacher_id = ?';
        const queryParams = req.user.role === 'admin' ? [id] : [id, req.user.id];
        
        const [assessments] = await connection.execute(`
            SELECT 
                a.*,
                c.name as class_name,
                s.name as subject_name,
                s.code as subject_code
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            ${whereCondition}
        `, queryParams);

        if (assessments.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Assessment not found or access denied'
            });
        }

        const assessment = assessments[0];

        if (req.user.role !== 'admin' && !isAssessmentPublished(assessment, schemaMeta)) {
            connection.release();
            return res.status(403).json({
                success: false,
                message: 'Results are pending admin approval and are not visible yet'
            });
        }

        // Get all student results for this assessment
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
        `, [assessment.max_marks, id]);

        // Calculate summary statistics
        const gradedResults = results.filter(r => r.is_present && r.marks_obtained !== null);
        const summary = {
            total_students: results.length,
            graded_students: gradedResults.length,
            not_graded: results.length - gradedResults.length,
            absent_students: results.filter(r => !r.is_present).length,
            average_marks: gradedResults.length > 0 ? 
                Math.round((gradedResults.reduce((sum, r) => sum + r.marks_obtained, 0) / gradedResults.length) * 100) / 100 : 0,
            average_percentage: gradedResults.length > 0 ? 
                Math.round((gradedResults.reduce((sum, r) => sum + r.percentage, 0) / gradedResults.length) * 100) / 100 : 0,
            highest_marks: gradedResults.length > 0 ? Math.max(...gradedResults.map(r => r.marks_obtained)) : 0,
            lowest_marks: gradedResults.length > 0 ? Math.min(...gradedResults.map(r => r.marks_obtained)) : 0,
            pass_count: gradedResults.filter(r => r.percentage >= ((assessment.pass_marks / assessment.max_marks) * 100)).length,
            fail_count: gradedResults.filter(r => r.percentage < ((assessment.pass_marks / assessment.max_marks) * 100)).length,
            grade_distribution: {}
        };

        // Calculate grade distribution
        const gradeCount = {};
        gradedResults.forEach(result => {
            if (result.grade) {
                gradeCount[result.grade] = (gradeCount[result.grade] || 0) + 1;
            }
        });
        summary.grade_distribution = gradeCount;

        connection.release();

        res.json({
            success: true,
            data: {
                assessment,
                results,
                summary
            }
        });

    } catch (error) {
        console.error('Error fetching assessment results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessment results'
        });
    }
});

// GET /api/assessments/:id/analytics - Get assessment analytics
router.get('/:id/analytics', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can view analytics.'
            });
        }

        const { id } = req.params;
        const connection = await pool.getConnection();

        // Get assessment details
        const whereCondition = req.user.role === 'admin' ? 'WHERE a.id = ?' : 'WHERE a.id = ? AND a.teacher_id = ?';
        const queryParams = req.user.role === 'admin' ? [id] : [id, req.user.id];
        
        const [assessments] = await connection.execute(`
            SELECT 
                a.*,
                c.name as class_name,
                s.name as subject_name,
                s.code as subject_code
            FROM assessments a
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN subjects s ON a.subject_id = s.id
            ${whereCondition}
        `, queryParams);

        if (assessments.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Assessment not found or access denied'
            });
        }

        const assessment = assessments[0];

        // Get detailed analytics data
        const [analyticsData] = await connection.execute(`
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
        `, [assessment.max_marks, id]);

        const gradedData = analyticsData.filter(d => d.is_present && d.marks_obtained !== null);

        // Grade distribution
        const gradeDistribution = {};
        const performanceTrends = [];
        
        gradedData.forEach(student => {
            if (student.grade) {
                gradeDistribution[student.grade] = (gradeDistribution[student.grade] || 0) + 1;
            }
            
            if (student.percentage !== null) {
                performanceTrends.push({
                    student: `${student.first_name} ${student.last_name}`,
                    percentage: student.percentage,
                    grade: student.grade
                });
            }
        });

        // Performance statistics
        const stats = {
            total_students: analyticsData.length,
            graded_students: gradedData.length,
            attendance_rate: Math.round((analyticsData.filter(d => d.is_present).length / analyticsData.length) * 100),
            pass_rate: gradedData.length > 0 ? 
                Math.round((gradedData.filter(d => d.percentage >= ((assessment.pass_marks / assessment.max_marks) * 100)).length / gradedData.length) * 100) : 0,
            average_score: gradedData.length > 0 ? 
                Math.round((gradedData.reduce((sum, d) => sum + d.percentage, 0) / gradedData.length) * 100) / 100 : 0,
            median_score: gradedData.length > 0 ? 
                calculateMedian(gradedData.map(d => d.percentage)) : 0,
            highest_score: gradedData.length > 0 ? Math.max(...gradedData.map(d => d.percentage)) : 0,
            lowest_score: gradedData.length > 0 ? Math.min(...gradedData.map(d => d.percentage)) : 0,
            grade_distribution: gradeDistribution,
            performance_trends: performanceTrends
        };

        connection.release();

        res.json({
            success: true,
            data: {
                assessment,
                analytics: stats
            }
        });

    } catch (error) {
        console.error('Error fetching assessment analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch assessment analytics'
        });
    }
});

// Helper function to calculate median
const calculateMedian = (numbers) => {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
        (sorted[mid - 1] + sorted[mid]) / 2 : 
        sorted[mid];
};

// DELETE /api/assessments/:id - Delete an assessment (only if it's a draft)
router.delete('/:id', Auth.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only teachers can delete assessments.'
            });
        }

        const { id } = req.params;
        const connection = await pool.getConnection();

        // Check if assessment exists and belongs to teacher
        const [assessments] = await connection.execute(`
            SELECT status FROM assessments 
            WHERE id = ? AND teacher_id = ?
        `, [id, req.user.id]);

        if (assessments.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Assessment not found or access denied'
            });
        }

        const { status } = assessments[0];

        // Only allow deletion of draft assessments
        if (status !== 'draft') {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Only draft assessments can be deleted'
            });
        }

        // Delete assessment (marks will be deleted due to cascade)
        await connection.execute('DELETE FROM assessments WHERE id = ?', [id]);
        
        connection.release();

        res.json({
            success: true,
            message: 'Assessment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete assessment'
        });
    }
});

module.exports = router;
