const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const { calculateLetterGrade, updateGradeAnalytics } = require('../config/grades-schema');
const { createParentNotificationForStudent } = require('../services/notificationsService');

let assessmentsSchemaCache = { kind: null, fields: null, checkedAt: 0 };
const ASSESSMENTS_SCHEMA_CACHE_MS = 5 * 60 * 1000;

const getAssessmentsSchemaMeta = async () => {
    const now = Date.now();
    if (assessmentsSchemaCache.kind && assessmentsSchemaCache.fields && now - assessmentsSchemaCache.checkedAt < ASSESSMENTS_SCHEMA_CACHE_MS) {
        return assessmentsSchemaCache;
    }

    const [cols] = await pool.execute('SHOW COLUMNS FROM assessments');
    const fields = new Set((cols || []).map((col) => col.Field));
    const kind = fields.has('assessment_name') || fields.has('exam_type') ? 'legacy' : 'grades_module';
    assessmentsSchemaCache = { kind, fields, checkedAt: now };
    return assessmentsSchemaCache;
};

const normalizeAssessmentRecord = (assessment, schemaMeta) => ({
    ...assessment,
    title: assessment.title || assessment.assessment_name,
    assessment_type: assessment.assessment_type || assessment.exam_type,
    total_marks: assessment.total_marks || assessment.max_marks,
    is_published: schemaMeta.fields.has('is_published')
        ? Boolean(assessment.is_published)
        : ['published', 'closed'].includes(String(assessment.status || '').toLowerCase()),
});

// ==================== ASSESSMENTS ENDPOINTS ====================

// Create new assessment
router.post('/assessments', 
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const {
                title, description, subject_id, class_id, assessment_type, 
                total_marks, passing_marks, weight_percentage, due_date, 
                assessment_date, instructions, term
            } = req.body;
            
            const teacher_id = req.user.id;
            const academic_year = req.query.academic_year || '2024-2025';
            
            // Verify teacher has access to this subject and class
            const [accessCheck] = await pool.execute(`
                SELECT id FROM teacher_subject_assignments 
                WHERE teacher_id = ? AND subject_id = ? AND class_id = ? AND academic_year = ?
            `, [teacher_id, subject_id, class_id, academic_year]);
            
            // Verify class exists
            const [classCheck] = await pool.execute(
                'SELECT id FROM classes WHERE id = ?',
                [class_id]
            );
            
            if (classCheck.length === 0) {
                throw new AuthorizationError('Class not found');
            }
            
            if (accessCheck.length === 0 && req.user.role !== 'admin') {
                throw new AuthorizationError('You are not assigned to teach this subject for this class');
            }
            
            // Get default grading scale
            const [gradingScale] = await pool.execute(
                'SELECT id FROM grading_scales WHERE is_default = TRUE LIMIT 1'
            );
            
            const [result] = await pool.execute(`
                INSERT INTO assessments (
                    title, description, subject_id, class_id, teacher_id, assessment_type, 
                    total_marks, passing_marks, weight_percentage, due_date, assessment_date,
                    grading_scale_id, instructions, term, academic_year
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                title, description || null, subject_id, class_id, teacher_id, assessment_type,
                total_marks, passing_marks || total_marks * 0.5, weight_percentage || 100.00,
                due_date || null, assessment_date || null, gradingScale[0]?.id || null,
                instructions || null, term || 'term1', academic_year
            ]);
            
            res.status(201).json({
                success: true,
                message: 'Assessment created successfully',
                data: {
                    id: result.insertId,
                    title,
                    subject_id,
                    class_id,
                    assessment_type,
                    total_marks
                }
            });
            
        } catch (error) {
            console.error('Error creating assessment:', error);
            throw error;
        }
    })
);

// Get teacher's assessments
router.get('/assessments/my-assessments',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const academic_year = req.query.academic_year || '2024-2025';
            const subject_id = req.query.subject_id;
            const class_id = req.query.class_id;
            const publishedOnly = String(req.query.published_only || '').toLowerCase() === 'true';
            const unpublishedOnly = String(req.query.unpublished_only || '').toLowerCase() === 'true';
            const schemaMeta = await getAssessmentsSchemaMeta();
            
            let query = `
                SELECT a.*, s.name as subject_name, s.code as subject_code,
                       c.name as class_name, c.level as class_level,
                       COUNT(am.id) as grades_count,
                       COUNT(CASE WHEN am.marks_obtained IS NOT NULL OR am.is_present = FALSE THEN 1 END) as graded_count,
                       (SELECT COUNT(*) FROM students st WHERE st.class_id = a.class_id AND st.status = 'active') as total_students
                FROM assessments a
                INNER JOIN subjects s ON a.subject_id = s.id
                INNER JOIN classes c ON a.class_id = c.id
                LEFT JOIN assessment_marks am ON a.id = am.assessment_id
                WHERE a.academic_year = ?
            `;
            
            const params = [academic_year];

            if (req.user.role !== 'admin') {
                query += ' AND a.teacher_id = ?';
                params.push(teacher_id);
            }
            
            if (subject_id) {
                query += ' AND a.subject_id = ?';
                params.push(subject_id);
            }
            
            if (class_id) {
                query += ' AND a.class_id = ?';
                params.push(class_id);
            }

            if (publishedOnly) {
                query += schemaMeta.fields.has('is_published')
                    ? ' AND a.is_published = TRUE'
                    : ` AND LOWER(COALESCE(a.status, '')) IN ('published', 'closed')`;
            }

            if (unpublishedOnly) {
                query += schemaMeta.fields.has('is_published')
                    ? ' AND (a.is_published = FALSE OR a.is_published IS NULL)'
                    : ` AND LOWER(COALESCE(a.status, '')) NOT IN ('published', 'closed')`;
            }
            
            
            query += `
                GROUP BY a.id
                ORDER BY a.assessment_date DESC, a.created_at DESC
            `;
            
            const [assessments] = await pool.execute(query, params);
            
            res.json({
                success: true,
                data: assessments.map((assessment) => {
                    const normalized = normalizeAssessmentRecord(assessment, schemaMeta);
                    return {
                    ...normalized,
                    grading_progress: {
                        total_students: normalized.total_students,
                        graded_count: normalized.graded_count,
                        pending_count: normalized.total_students - normalized.graded_count,
                        completion_percentage: normalized.total_students > 0 
                            ? Math.round((normalized.graded_count / normalized.total_students) * 100)
                            : 0
                    }
                };
                })
            });
            
        } catch (error) {
            console.error('Error fetching assessments:', error);
            throw error;
        }
    })
);

// Get specific assessment with students for grading (called from GradesMenu)
router.get('/assessments/:id',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const assessment_id = req.params.id;
            const teacher_id = req.user.id;
            
            // Get assessment details
            const [assessments] = await pool.execute(`
                SELECT a.*, s.name as subject_name, s.code as subject_code,
                       c.name as class_name, c.level as class_level,
                       gs.name as grading_scale_name
                FROM assessments a
                INNER JOIN subjects s ON a.subject_id = s.id
                INNER JOIN classes c ON a.class_id = c.id
                LEFT JOIN grading_scales gs ON a.grading_scale_id = gs.id
                WHERE a.id = ? AND (a.teacher_id = ? OR ? = 'admin')
            `, [assessment_id, teacher_id, req.user.role]);
            
            if (assessments.length === 0) {
                throw new NotFoundError('Assessment not found or access denied');
            }
            
            const schemaMeta = await getAssessmentsSchemaMeta();
            const assessment = normalizeAssessmentRecord(assessments[0], schemaMeta);
            
            // Get students and their grades
            const [studentGrades] = await pool.execute(`
                SELECT s.id as student_id, u.first_name, u.last_name, s.student_id as student_number,
                       sg.id as grade_id, sg.marks_obtained, sg.percentage, sg.letter_grade,
                       sg.grade_points, sg.remarks, sg.is_absent, sg.is_excused, sg.submission_status,
                       sg.graded_at
                FROM students s
                INNER JOIN users u ON s.user_id = u.id
                LEFT JOIN student_grades sg ON s.id = sg.student_id AND sg.assessment_id = ?
                WHERE s.class_id = ? AND s.status = 'active'
                ORDER BY u.last_name, u.first_name
            `, [assessment_id, assessment.class_id]);
            
            res.json({
                success: true,
                data: {
                    assessment,
                    students: studentGrades
                }
            });
            
        } catch (error) {
            console.error('Error fetching assessment details:', error);
            throw error;
        }
    })
);

// ==================== GRADES ENDPOINTS ====================

// Record/Update student grades
router.post('/grades/record',
    Auth.authenticateToken,
    
    asyncHandler(async (req, res) => {
        try {
            const { assessment_id, grades } = req.body;
            const graded_by = req.user.id;
            
            // Verify teacher has access to this assessment
            const [assessments] = await pool.execute(`
                SELECT a.*, s.name as subject_name, c.name as class_name
                FROM assessments a
                INNER JOIN subjects s ON a.subject_id = s.id
                INNER JOIN classes c ON a.class_id = c.id
                WHERE a.id = ? AND (a.teacher_id = ? OR ? = 'admin')
            `, [assessment_id, graded_by, req.user.role]);
            
            if (assessments.length === 0) {
                throw new NotFoundError('Assessment not found or access denied');
            }
            
            const assessment = assessments[0];

            if (Number(assessment.total_marks) > 100) {
                throw new AuthorizationError('This assessment has an invalid total marks value greater than 100');
            }
            
            // Process each grade
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                for (const gradeData of grades) {
                    const { 
                        student_id, marks_obtained, remarks, is_absent, 
                        is_excused, submission_status 
                    } = gradeData;
                    
                    let percentage = null;
                    let letterGrade = null;
                    let gradePoints = null;

                    if (marks_obtained !== null && marks_obtained !== undefined && Number(marks_obtained) > 100) {
                        throw new AuthorizationError('Marks obtained cannot be greater than 100');
                    }

                    if (marks_obtained !== null && marks_obtained !== undefined && Number(marks_obtained) < 0) {
                        throw new AuthorizationError('Marks obtained cannot be less than 0');
                    }
                    
                    if (!is_absent && !is_excused && marks_obtained !== null) {
                        percentage = (marks_obtained / assessment.total_marks) * 100;
                        const gradeResult = await calculateLetterGrade(percentage, assessment.grading_scale_id);
                        letterGrade = gradeResult.letter_grade;
                        gradePoints = gradeResult.grade_points;
                    }
                    
                    await connection.execute(`
                        INSERT INTO student_grades (
                            assessment_id, student_id, marks_obtained, percentage, 
                            letter_grade, grade_points, remarks, is_absent, is_excused,
                            submission_status, graded_by, graded_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                        ON DUPLICATE KEY UPDATE
                        marks_obtained = VALUES(marks_obtained),
                        percentage = VALUES(percentage),
                        letter_grade = VALUES(letter_grade),
                        grade_points = VALUES(grade_points),
                        remarks = VALUES(remarks),
                        is_absent = VALUES(is_absent),
                        is_excused = VALUES(is_excused),
                        submission_status = VALUES(submission_status),
                        graded_by = VALUES(graded_by),
                        graded_at = VALUES(graded_at),
                        updated_at = CURRENT_TIMESTAMP
                    `, [
                        assessment_id, student_id, marks_obtained, percentage,
                        letterGrade, gradePoints, remarks || null, is_absent || false,
                        is_excused || false, submission_status || 'submitted', graded_by
                    ]);
                }
                
                await connection.commit();
                connection.release();

                if (schemaMeta.fields.has('is_published') && schemaMeta.fields.has('is_final')) {
                    await pool.execute(
                        'UPDATE assessments SET is_published = FALSE, is_final = FALSE WHERE id = ?',
                        [assessment_id]
                    );
                } else if (schemaMeta.fields.has('status')) {
                    await pool.execute(
                        "UPDATE assessments SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        [assessment_id]
                    );
                }
                
                // Update analytics
                await updateGradeAnalytics(
                    assessment_id, assessment.subject_id, assessment.class_id,
                    assessment.teacher_id, assessment.term, assessment.academic_year
                );

                // Best-effort parent notifications (SMS/email/in-app via notifications service)
                setImmediate(async () => {
                    try {
                        const uniqueStudentIds = [...new Set(
                            (grades || [])
                                .map((g) => Number(g.student_id))
                                .filter((id) => Number.isFinite(id))
                        )];

                        for (const studentId of uniqueStudentIds) {
                            const studentGrade = grades.find((g) => Number(g.student_id) === studentId) || {};
                            const marksText =
                                studentGrade.is_absent || studentGrade.is_excused || studentGrade.marks_obtained === null || studentGrade.marks_obtained === undefined
                                    ? 'status updated'
                                    : `marks ${studentGrade.marks_obtained}/${assessment.total_marks}`;

                            await createParentNotificationForStudent({
                                studentId,
                                type: 'results',
                                priority: 'medium',
                                title: 'Assessment Results Updated',
                                message: `${assessment.subject_name} - ${assessment.title}: ${marksText}.`,
                                data: {
                                    assessment_id,
                                    subject_id: assessment.subject_id,
                                    class_id: assessment.class_id,
                                    subject_name: assessment.subject_name,
                                    assessment_title: assessment.title,
                                    term: assessment.term,
                                    academic_year: assessment.academic_year,
                                },
                            });
                        }
                    } catch (_notifyErr) {
                        // Never block grades response on background notifications
                    }
                });
                
                res.json({
                    success: true,
                    message: `Grades submitted for admin approval for ${grades.length} student(s)`,
                    data: {
                        assessment_id,
                        grades_processed: grades.length,
                        approval_status: 'pending'
                    }
                });
                
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
            
        } catch (error) {
            console.error('Error recording grades:', error);
            throw error;
        }
    })
);

router.get('/assessments/pending-approval',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        if (req.user.role !== 'admin') {
            throw new AuthorizationError('Only admins can review pending assessment approvals');
        }

        const academic_year = req.query.academic_year || '2024-2025';
        const schemaMeta = await getAssessmentsSchemaMeta();
        const titleColumn = schemaMeta.fields.has('title') ? 'a.title' : 'a.assessment_name';
        const typeColumn = schemaMeta.fields.has('assessment_type') ? 'a.assessment_type' : 'a.exam_type';
        const pendingFilter = schemaMeta.fields.has('is_published')
            ? '(a.is_published = FALSE OR a.is_published IS NULL)'
            : "LOWER(COALESCE(a.status, '')) NOT IN ('published', 'closed')";

        const [assessments] = await pool.execute(`
            SELECT a.*, ${titleColumn} as display_title, ${typeColumn} as display_type,
                   s.name as subject_name, s.code as subject_code,
                   c.name as class_name,
                   u.first_name as teacher_first_name,
                   u.last_name as teacher_last_name,
                   COUNT(am.id) as total_students,
                   COUNT(CASE WHEN am.marks_obtained IS NOT NULL OR am.is_present = FALSE THEN 1 END) as graded_count
            FROM assessments a
            INNER JOIN subjects s ON a.subject_id = s.id
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN users u ON a.teacher_id = u.id
            LEFT JOIN assessment_marks am ON a.id = am.assessment_id
            WHERE a.academic_year = ?
              AND ${pendingFilter}
            GROUP BY a.id
            ORDER BY a.updated_at DESC, a.created_at DESC
        `, [academic_year]);

        res.json({
            success: true,
            data: assessments.map((assessment) => ({
                ...normalizeAssessmentRecord({
                    ...assessment,
                    title: assessment.display_title,
                    assessment_type: assessment.display_type,
                }, schemaMeta),
            })),
        });
    })
);

router.post('/assessments/:id/approve',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        if (req.user.role !== 'admin') {
            throw new AuthorizationError('Only admins can approve assessment results');
        }

        const { id } = req.params;
        const schemaMeta = await getAssessmentsSchemaMeta();

        const [assessments] = await pool.execute('SELECT * FROM assessments WHERE id = ? LIMIT 1', [id]);

        if (assessments.length === 0) {
            throw new NotFoundError('Assessment not found');
        }

        if (schemaMeta.fields.has('is_published') && schemaMeta.fields.has('is_final')) {
            await pool.execute(
                'UPDATE assessments SET is_published = TRUE, is_final = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [id]
            );
        } else if (schemaMeta.fields.has('status')) {
            await pool.execute(
                "UPDATE assessments SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [id]
            );
        }

        res.json({
            success: true,
            message: 'Assessment results approved successfully',
            data: {
                assessment_id: Number(id),
                approval_status: 'approved',
            },
        });
    })
);

// Get student grades for a specific assessment
router.get('/grades/assessment/:assessment_id',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const assessment_id = req.params.assessment_id;
            const teacher_id = req.user.id;
            
            // Verify access
            const [assessments] = await pool.execute(`
                SELECT * FROM assessments 
                WHERE id = ? AND (teacher_id = ? OR ? = 'admin')
            `, [assessment_id, teacher_id, req.user.role]);
            
            if (assessments.length === 0) {
                throw new NotFoundError('Assessment not found or access denied');
            }
            
            const [grades] = await pool.execute(`
                SELECT sg.*, s.student_id as student_number, u.first_name, u.last_name,
                       a.title as assessment_title, a.total_marks, a.assessment_type
                FROM student_grades sg
                INNER JOIN students s ON sg.student_id = s.id
                INNER JOIN users u ON s.user_id = u.id
                INNER JOIN assessments a ON sg.assessment_id = a.id
                WHERE sg.assessment_id = ?
                ORDER BY u.last_name, u.first_name
            `, [assessment_id]);
            
            res.json({
                success: true,
                data: grades
            });
            
        } catch (error) {
            console.error('Error fetching grades:', error);
            throw error;
        }
    })
);

// Get student's grades across all assessments
router.get('/grades/student/:student_id',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const student_id = req.params.student_id;
            const academic_year = req.query.academic_year || '2024-2025';
            const subject_id = req.query.subject_id;
            const term = req.query.term;
            
            let query = `
                SELECT sg.*, a.title as assessment_title, a.assessment_type, a.total_marks,
                       a.assessment_date, a.term, s.name as subject_name, s.code as subject_code,
                       c.name as class_name
                FROM student_grades sg
                INNER JOIN assessments a ON sg.assessment_id = a.id
                INNER JOIN subjects s ON a.subject_id = s.id
                INNER JOIN classes c ON a.class_id = c.id
                WHERE sg.student_id = ? AND a.academic_year = ?
            `;
            
            const params = [student_id, academic_year];
            
            if (subject_id) {
                query += ' AND a.subject_id = ?';
                params.push(subject_id);
            }
            
            if (term) {
                query += ' AND a.term = ?';
                params.push(term);
            }
            
            query += ' ORDER BY a.assessment_date DESC, a.created_at DESC';
            
            const [grades] = await pool.execute(query, params);
            
            // Calculate summary statistics
            const summary = {
                total_assessments: grades.length,
                graded_assessments: grades.filter(g => g.marks_obtained !== null && !g.is_absent).length,
                average_percentage: 0,
                overall_grade: 'N/A',
                grade_points_average: 0
            };
            
            if (summary.graded_assessments > 0) {
                const validGrades = grades.filter(g => g.percentage !== null && !g.is_absent);
                const totalPercentage = validGrades.reduce((sum, g) => sum + parseFloat(g.percentage), 0);
                const totalGradePoints = validGrades.reduce((sum, g) => sum + parseFloat(g.grade_points || 0), 0);
                
                summary.average_percentage = Math.round(totalPercentage / validGrades.length * 100) / 100;
                summary.grade_points_average = Math.round(totalGradePoints / validGrades.length * 100) / 100;
                
                const overallGrade = await calculateLetterGrade(summary.average_percentage);
                summary.overall_grade = overallGrade.letter_grade;
            }
            
            res.json({
                success: true,
                data: {
                    grades,
                    summary
                }
            });
            
        } catch (error) {
            console.error('Error fetching student grades:', error);
            throw error;
        }
    })
);

// ==================== ANALYTICS ENDPOINTS ====================

// Get student grade analysis for analytics tab
router.get('/analytics/student-grade-analysis',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const { class_id, term, academic_year = '2024-2025' } = req.query;
            
            if (!class_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Class ID is required'
                });
            }
            
            // First, get all students in the class
            const [students] = await pool.execute(`
                SELECT s.id as student_id, u.first_name, u.last_name, s.student_id as student_number
                FROM students s
                INNER JOIN users u ON s.user_id = u.id
                WHERE s.class_id = ? AND s.status = 'active'
                ORDER BY u.last_name, u.first_name
            `, [class_id]);
            
            if (students.length === 0) {
                return res.json({
                    success: true,
                    data: []
                });
            }
            
            // Get all subjects taught in this class
            const [subjects] = await pool.execute(`
                SELECT DISTINCT s.id, s.name, s.code
                FROM subjects s
                INNER JOIN assessments a ON s.id = a.subject_id
                WHERE a.class_id = ? AND a.academic_year = ?
                ${term ? 'AND a.term = ?' : ''}
                AND s.is_active = TRUE
                ORDER BY s.name
            `, [
                class_id, academic_year,
                ...(term ? [term] : [])
            ]);
            
            // Get all grade data for the class
            const [gradeData] = await pool.execute(`
                SELECT 
                    sg.student_id,
                    a.subject_id,
                    s.name as subject_name,
                    s.code as subject_code,
                    AVG(sg.percentage) as average_percentage,
                    AVG(sg.grade_points) as average_grade_points,
                    COUNT(sg.id) as total_assessments,
                    COUNT(CASE WHEN sg.marks_obtained IS NOT NULL AND sg.is_absent = FALSE THEN 1 END) as graded_assessments
                FROM student_grades sg
                INNER JOIN assessments a ON sg.assessment_id = a.id
                INNER JOIN subjects s ON a.subject_id = s.id
                WHERE a.class_id = ? AND a.academic_year = ?
                ${term ? 'AND a.term = ?' : ''}
                GROUP BY sg.student_id, a.subject_id
            `, [
                class_id, academic_year,
                ...(term ? [term] : [])
            ]);
            
            // Organize data by student
            const studentGradeMap = {};
            gradeData.forEach(grade => {
                if (!studentGradeMap[grade.student_id]) {
                    studentGradeMap[grade.student_id] = {};
                }
                studentGradeMap[grade.student_id][grade.subject_id] = {
                    subject_name: grade.subject_name,
                    subject_code: grade.subject_code,
                    average_percentage: Math.round(grade.average_percentage * 100) / 100,
                    average_grade_points: Math.round(grade.average_grade_points * 100) / 100,
                    total_assessments: grade.total_assessments,
                    graded_assessments: grade.graded_assessments
                };
            });
            
            // Build final result
            const result = [];
            
            for (const student of students) {
                const studentGrades = studentGradeMap[student.student_id] || {};
                const subjectGrades = {};
                let totalMarks = 0;
                let totalGradePoints = 0;
                let subjectCount = 0;
                
                // Process each subject
                subjects.forEach(subject => {
                    const gradeInfo = studentGrades[subject.id];
                    if (gradeInfo) {
                        subjectGrades[subject.code] = {
                            percentage: gradeInfo.average_percentage,
                            grade_points: gradeInfo.average_grade_points,
                            assessments_count: gradeInfo.graded_assessments
                        };
                        totalMarks += gradeInfo.average_percentage;
                        totalGradePoints += gradeInfo.average_grade_points;
                        subjectCount++;
                    } else {
                        subjectGrades[subject.code] = {
                            percentage: null,
                            grade_points: null,
                            assessments_count: 0
                        };
                    }
                });
                
                // Calculate overall average and grade
                const overallAverage = subjectCount > 0 ? Math.round(totalMarks / subjectCount * 100) / 100 : 0;
                const overallGradePoints = subjectCount > 0 ? Math.round(totalGradePoints / subjectCount * 100) / 100 : 0;
                
                let overallGrade = 'N/A';
                if (overallAverage > 0) {
                    const gradeResult = await calculateLetterGrade(overallAverage);
                    overallGrade = gradeResult.letter_grade;
                }
                
                result.push({
                    student_id: student.student_id,
                    student_name: `${student.first_name} ${student.last_name}`,
                    student_number: student.student_number,
                    subject_grades: subjectGrades,
                    total_marks: Math.round(totalMarks * 100) / 100,
                    overall_average: overallAverage,
                    overall_grade: overallGrade,
                    overall_grade_points: overallGradePoints
                });
            }
            
            res.json({
                success: true,
                data: {
                    students: result,
                    subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })),
                    class_id: parseInt(class_id),
                    term: term || null,
                    academic_year
                }
            });
            
        } catch (error) {
            console.error('Error fetching student grade analysis:', error);
            throw error;
        }
    })
);

// Get class performance analytics
router.get('/analytics/class-performance',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const teacher_id = req.user.id;
            const { subject_id, class_id, term, academic_year = '2024-2025' } = req.query;
            
            if (!subject_id || !class_id) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject ID and Class ID are required'
                });
            }
            
            // Get analytics data
            const [analytics] = await pool.execute(`
                SELECT ga.*, s.name as subject_name, c.name as class_name
                FROM grade_analytics ga
                INNER JOIN subjects s ON ga.subject_id = s.id
                INNER JOIN classes c ON ga.class_id = c.id
                WHERE ga.subject_id = ? AND ga.class_id = ? 
                AND ga.academic_year = ?
                ${term ? 'AND ga.term = ?' : ''}
                ${req.user.role !== 'admin' ? 'AND ga.teacher_id = ?' : ''}
                ORDER BY ga.last_calculated DESC
            `, [
                subject_id, class_id, academic_year,
                ...(term ? [term] : []),
                ...(req.user.role !== 'admin' ? [teacher_id] : [])
            ]);
            
            // Get recent assessments
            const [assessments] = await pool.execute(`
                SELECT a.id, a.title, a.assessment_type, a.assessment_date,
                       AVG(sg.percentage) as class_average,
                       COUNT(sg.id) as total_graded,
                       MAX(sg.percentage) as highest_score,
                       MIN(sg.percentage) as lowest_score
                FROM assessments a
                LEFT JOIN student_grades sg ON a.id = sg.assessment_id AND sg.is_absent = FALSE
                WHERE a.subject_id = ? AND a.class_id = ? AND a.academic_year = ?
                ${term ? 'AND a.term = ?' : ''}
                ${req.user.role !== 'admin' ? 'AND a.teacher_id = ?' : ''}
                GROUP BY a.id
                ORDER BY a.assessment_date DESC
                LIMIT 10
            `, [
                subject_id, class_id, academic_year,
                ...(term ? [term] : []),
                ...(req.user.role !== 'admin' ? [teacher_id] : [])
            ]);
            
            res.json({
                success: true,
                data: {
                    analytics: analytics[0] || null,
                    recent_assessments: assessments
                }
            });
            
        } catch (error) {
            console.error('Error fetching class performance analytics:', error);
            throw error;
        }
    })
);

// Get grade distribution data
router.get('/analytics/grade-distribution',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const { assessment_id, subject_id, class_id, academic_year = '2024-2025' } = req.query;
            
            let query, params;
            
            if (assessment_id) {
                // Distribution for specific assessment
                query = `
                    SELECT sg.letter_grade, COUNT(*) as count,
                           ROUND(AVG(sg.percentage), 2) as average_percentage
                    FROM student_grades sg
                    WHERE sg.assessment_id = ? AND sg.is_absent = FALSE
                    GROUP BY sg.letter_grade
                    ORDER BY sg.letter_grade
                `;
                params = [assessment_id];
            } else if (subject_id && class_id) {
                // Distribution across all assessments for subject-class combination
                query = `
                    SELECT sg.letter_grade, COUNT(*) as count,
                           ROUND(AVG(sg.percentage), 2) as average_percentage
                    FROM student_grades sg
                    INNER JOIN assessments a ON sg.assessment_id = a.id
                    WHERE a.subject_id = ? AND a.class_id = ? AND a.academic_year = ?
                    AND sg.is_absent = FALSE
                    GROUP BY sg.letter_grade
                    ORDER BY sg.letter_grade
                `;
                params = [subject_id, class_id, academic_year];
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Either assessment_id or (subject_id and class_id) are required'
                });
            }
            
            const [distribution] = await pool.execute(query, params);
            
            // Get grade scale colors for visualization
            const [gradeColors] = await pool.execute(`
                SELECT gsl.letter_grade, gsl.color_code, gsl.description
                FROM grading_scale_levels gsl
                INNER JOIN grading_scales gs ON gsl.grading_scale_id = gs.id
                WHERE gs.is_default = TRUE
                ORDER BY gsl.min_percentage DESC
            `);
            
            const colorMap = {};
            gradeColors.forEach(gc => {
                colorMap[gc.letter_grade] = {
                    color: gc.color_code,
                    description: gc.description
                };
            });
            
            res.json({
                success: true,
                data: {
                    distribution: distribution.map(d => ({
                        ...d,
                        color: colorMap[d.letter_grade]?.color || '#666666',
                        description: colorMap[d.letter_grade]?.description || d.letter_grade
                    })),
                    total_students: distribution.reduce((sum, d) => sum + d.count, 0)
                }
            });
            
        } catch (error) {
            console.error('Error fetching grade distribution:', error);
            throw error;
        }
    })
);

// ==================== REPORTS ENDPOINTS ====================

// Generate grade report for a student
router.post('/reports/generate',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const { student_id, subject_id, term, academic_year = '2024-2025' } = req.body;
            const teacher_id = req.user.id;
            
            // Get student and class info
            const [students] = await pool.execute(`
                SELECT s.id, s.student_id as student_number, u.first_name, u.last_name,
                       c.id as class_id, c.name as class_name
                FROM students s
                INNER JOIN users u ON s.user_id = u.id
                INNER JOIN classes c ON s.class_id = c.id
                WHERE s.id = ?
            `, [student_id]);
            
            if (students.length === 0) {
                throw new NotFoundError('Student not found');
            }
            
            const student = students[0];
            
            // Get all grades for the term
            const [grades] = await pool.execute(`
                SELECT sg.*, a.title, a.assessment_type, a.total_marks, a.assessment_date
                FROM student_grades sg
                INNER JOIN assessments a ON sg.assessment_id = a.id
                WHERE sg.student_id = ? AND a.subject_id = ? AND a.term = ? 
                AND a.academic_year = ? AND sg.is_absent = FALSE
                ORDER BY a.assessment_date
            `, [student_id, subject_id, term, academic_year]);
            
            // Calculate statistics
            const totalAssessments = grades.length;
            let totalMarks = 0;
            let totalPossible = 0;
            let gradePointsSum = 0;
            
            grades.forEach(grade => {
                if (grade.marks_obtained !== null) {
                    totalMarks += parseFloat(grade.marks_obtained);
                    gradePointsSum += parseFloat(grade.grade_points || 0);
                }
                totalPossible += parseFloat(grade.total_marks || 0);
            });
            
            const averagePercentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0;
            const averageGradePoints = totalAssessments > 0 ? gradePointsSum / totalAssessments : 0;
            const overallGrade = await calculateLetterGrade(averagePercentage);
            
            // Get class ranking
            const [classStats] = await pool.execute(`
                SELECT student_id, AVG(percentage) as avg_percentage
                FROM student_grades sg
                INNER JOIN assessments a ON sg.assessment_id = a.id
                WHERE a.subject_id = ? AND a.class_id = ? AND a.term = ? 
                AND a.academic_year = ? AND sg.is_absent = FALSE
                GROUP BY sg.student_id
                ORDER BY avg_percentage DESC
            `, [subject_id, student.class_id, term, academic_year]);
            
            const studentRank = classStats.findIndex(cs => cs.student_id === student_id) + 1;
            
            // Generate or update report
            const connection = await pool.getConnection();
            await connection.beginTransaction();
            
            try {
                await connection.execute(`
                    INSERT INTO grade_reports (
                        student_id, subject_id, class_id, teacher_id, term, academic_year,
                        total_assessments, completed_assessments, average_marks, average_percentage,
                        overall_grade, grade_points, class_rank, total_students
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    completed_assessments = VALUES(completed_assessments),
                    average_marks = VALUES(average_marks),
                    average_percentage = VALUES(average_percentage),
                    overall_grade = VALUES(overall_grade),
                    grade_points = VALUES(grade_points),
                    class_rank = VALUES(class_rank),
                    total_students = VALUES(total_students),
                    updated_at = CURRENT_TIMESTAMP
                `, [
                    student_id, subject_id, student.class_id, teacher_id, term, academic_year,
                    totalAssessments, totalAssessments, totalMarks, averagePercentage,
                    overallGrade.letter_grade, averageGradePoints, studentRank, classStats.length
                ]);
                
                await connection.commit();
                connection.release();
                
                res.json({
                    success: true,
                    message: 'Grade report generated successfully',
                    data: {
                        student,
                        grades,
                        statistics: {
                            total_assessments: totalAssessments,
                            average_percentage: Math.round(averagePercentage * 100) / 100,
                            overall_grade: overallGrade.letter_grade,
                            average_grade_points: Math.round(averageGradePoints * 100) / 100,
                            class_rank: studentRank,
                            total_students: classStats.length
                        }
                    }
                });
                
            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }
            
        } catch (error) {
            console.error('Error generating grade report:', error);
            throw error;
        }
    })
);

// Get comment suggestions
router.get('/comments/suggestions',
    Auth.authenticateToken,
    asyncHandler(async (req, res) => {
        try {
            const { category, subject_id } = req.query;
            
            let query = `
                SELECT id, comment_text, category, usage_count
                FROM grade_comments_bank
                WHERE is_active = TRUE
            `;
            
            const params = [];
            
            if (category) {
                query += ' AND category = ?';
                params.push(category);
            }
            
            if (subject_id) {
                query += ' AND (subject_id = ? OR subject_specific = FALSE)';
                params.push(subject_id);
            } else {
                query += ' AND subject_specific = FALSE';
            }
            
            query += ' ORDER BY usage_count DESC, comment_text';
            
            const [comments] = await pool.execute(query, params);
            
            res.json({
                success: true,
                data: comments
            });
            
        } catch (error) {
            console.error('Error fetching comment suggestions:', error);
            throw error;
        }
    })
);

module.exports = router;
