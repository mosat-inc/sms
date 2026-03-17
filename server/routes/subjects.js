const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../utils/auth');
const { validate, schemas } = require('../middleware/validation');
const { asyncHandler, NotFoundError, AuthorizationError } = require('../middleware/errorHandler');
const { 
    uploadMaterials, 
    handleUploadError, 
    scanUploadedFile,
    deleteFile 
} = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

const getCurrentAcademicYearName = async () => {
    try {
        const [currentRows] = await pool.execute(
            `SELECT year_name
             FROM academic_years
             WHERE is_current = TRUE AND is_active = TRUE
             ORDER BY id DESC
             LIMIT 1`
        );

        if (currentRows?.[0]?.year_name) {
            return currentRows[0].year_name;
        }

        const [activeRows] = await pool.execute(
            `SELECT year_name
             FROM academic_years
             WHERE is_active = TRUE
             ORDER BY is_current DESC, id DESC
             LIMIT 1`
        );

        if (activeRows?.[0]?.year_name) {
            return activeRows[0].year_name;
        }

        const [anyRows] = await pool.execute(
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

// Get classes for a specific subject that the teacher teaches
router.get('/:subject_id/classes', 
    authenticateToken,
    asyncHandler(async (req, res) => {
    try {
        const teacherId = req.user.id;
        const subjectId = req.params.subject_id;
        const academicYear = req.query.academic_year || await getCurrentAcademicYearName();
        
        console.log(`🔍 Fetching classes for teacher ID: ${teacherId}, subject: ${subjectId}`);
        
        const query = `
            SELECT DISTINCT
                c.id,
                c.name,
                c.level,
                c.capacity,
                COUNT(DISTINCT s.id) as student_count,
                tsa.is_primary_teacher,
                tsa.academic_year
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
            WHERE tsa.teacher_id = ? 
                AND tsa.subject_id = ? 
                AND tsa.academic_year = ?
                AND c.is_active = TRUE
            GROUP BY c.id, c.name, c.level, c.capacity, tsa.is_primary_teacher
            ORDER BY c.level, c.name
        `;
        
        let [classes] = await pool.query(query, [teacherId, Number(subjectId), academicYear]);

        if (classes.length === 0) {
            console.log(`⚠️ No subject classes found for teacher ${teacherId} in ${academicYear}, falling back to any academic year`);
            const fallbackQuery = `
                SELECT DISTINCT
                    c.id,
                    c.name,
                    c.level,
                    c.capacity,
                    COUNT(DISTINCT s.id) as student_count,
                    tsa.is_primary_teacher,
                    tsa.academic_year
                FROM teacher_subject_assignments tsa
                INNER JOIN classes c ON tsa.class_id = c.id
                LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
                WHERE tsa.teacher_id = ?
                    AND tsa.subject_id = ?
                    AND c.is_active = TRUE
                GROUP BY c.id, c.name, c.level, c.capacity, tsa.is_primary_teacher, tsa.academic_year
                ORDER BY tsa.academic_year DESC, c.level, c.name
            `;
            [classes] = await pool.query(fallbackQuery, [teacherId, Number(subjectId)]);
        }
        
        console.log(`✅ Found ${classes.length} classes for subject`);
        
        const transformedClasses = classes.map(classItem => ({
            id: classItem.id,
            name: classItem.name,
            level: classItem.level,
            capacity: classItem.capacity,
            studentCount: classItem.student_count || 0,
            isPrimaryTeacher: classItem.is_primary_teacher,
            academicYear: classItem.academic_year
        }));
        
        res.json({
            success: true,
            data: transformedClasses
        });
        
    } catch (error) {
        console.error('❌ Error fetching subject classes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch classes for subject',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}));

// Get teacher's assigned subjects
router.get('/my-subjects',
    authenticateToken,
    asyncHandler(async (req, res) => {
    try {
        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || await getCurrentAcademicYearName();
        
        console.log(`🔍 Fetching subjects for teacher ID: ${teacherId}, academic year: ${academicYear}`);
        console.log('User info:', { id: req.user.id, username: req.user.username, role: req.user.role });
        
        // First check if teacher has any assignments
        let [assignmentCheck] = await pool.execute(
            'SELECT tsa.*, s.name as subject_name, c.name as class_name FROM teacher_subject_assignments tsa LEFT JOIN subjects s ON tsa.subject_id = s.id LEFT JOIN classes c ON tsa.class_id = c.id WHERE tsa.teacher_id = ? AND tsa.academic_year = ?',
            [teacherId, academicYear]
        );

        console.log(`📝 Found ${assignmentCheck.length} assignments for teacher:`, assignmentCheck);
        
        const query = `
            SELECT DISTINCT
                s.id,
                s.name,
                s.code,
                s.description,
                s.department,
                COUNT(DISTINCT tsa.class_id) as class_count,
                COUNT(DISTINCT st.id) as total_students,
                COALESCE(ss.total_materials, 0) as materials_count,
                COALESCE(ss.total_topics, 0) as total_topics,
                COALESCE(ss.completed_topics, 0) as completed_topics,
                COALESCE(ss.pending_topics, 0) as pending_topics,
                COALESCE(ss.total_hours_planned, 0) as hours_planned,
                COALESCE(ss.total_hours_completed, 0) as hours_completed,
                COALESCE(ss.average_completion_rate, 0) as progress_percentage,
                GROUP_CONCAT(DISTINCT c.name) as class_names
            FROM subjects s
            INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
            LEFT JOIN classes c ON tsa.class_id = c.id
            LEFT JOIN students st ON c.id = st.class_id AND st.status = 'active'
            LEFT JOIN subject_statistics ss ON s.id = ss.subject_id 
                AND ss.teacher_id = tsa.teacher_id 
                AND ss.academic_year = tsa.academic_year
            WHERE tsa.teacher_id = ? 
                AND tsa.academic_year = ?
                AND s.is_active = TRUE
            GROUP BY s.id, s.name, s.code, s.description, s.department,
                ss.total_materials, ss.total_topics, ss.completed_topics, 
                ss.pending_topics, ss.total_hours_planned, ss.total_hours_completed,
                ss.average_completion_rate
            ORDER BY s.name
        `;
        
        let [subjects] = await pool.execute(query, [teacherId, academicYear]);

        if (subjects.length === 0) {
            console.log(`⚠️ No subjects found for teacher ${teacherId} in ${academicYear}, falling back to all academic years`);

            [assignmentCheck] = await pool.execute(
                'SELECT tsa.*, s.name as subject_name, c.name as class_name FROM teacher_subject_assignments tsa LEFT JOIN subjects s ON tsa.subject_id = s.id LEFT JOIN classes c ON tsa.class_id = c.id WHERE tsa.teacher_id = ? ORDER BY tsa.academic_year DESC',
                [teacherId]
            );

            const fallbackQuery = `
                SELECT DISTINCT
                    s.id,
                    s.name,
                    s.code,
                    s.description,
                    s.department,
                    COUNT(DISTINCT tsa.class_id) as class_count,
                    COUNT(DISTINCT st.id) as total_students,
                    COALESCE(ss.total_materials, 0) as materials_count,
                    COALESCE(ss.total_topics, 0) as total_topics,
                    COALESCE(ss.completed_topics, 0) as completed_topics,
                    COALESCE(ss.pending_topics, 0) as pending_topics,
                    COALESCE(ss.total_hours_planned, 0) as hours_planned,
                    COALESCE(ss.total_hours_completed, 0) as hours_completed,
                    COALESCE(ss.average_completion_rate, 0) as progress_percentage,
                    GROUP_CONCAT(DISTINCT c.name) as class_names,
                    MAX(tsa.academic_year) as assignment_academic_year
                FROM subjects s
                INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
                LEFT JOIN classes c ON tsa.class_id = c.id
                LEFT JOIN students st ON c.id = st.class_id AND st.status = 'active'
                LEFT JOIN subject_statistics ss ON s.id = ss.subject_id 
                    AND ss.teacher_id = tsa.teacher_id 
                    AND ss.academic_year = tsa.academic_year
                WHERE tsa.teacher_id = ?
                    AND s.is_active = TRUE
                GROUP BY s.id, s.name, s.code, s.description, s.department,
                    ss.total_materials, ss.total_topics, ss.completed_topics, 
                    ss.pending_topics, ss.total_hours_planned, ss.total_hours_completed,
                    ss.average_completion_rate
                ORDER BY MAX(tsa.academic_year) DESC, s.name
            `;

            [subjects] = await pool.execute(fallbackQuery, [teacherId]);
        }
        
        console.log(`✅ Query returned ${subjects.length} subjects:`, subjects.map(s => ({ id: s.id, name: s.name, classes: s.class_names })));
        
        // Transform data for frontend
        const transformedSubjects = subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            code: subject.code,
            description: subject.description,
            department: subject.department,
            classes: subject.class_names ? subject.class_names.split(',') : [],
            students: subject.total_students || 0,
            progress: Math.round(subject.progress_percentage || 0),
            materialsCount: subject.materials_count || 0,
            lessonsPlanned: subject.total_topics || 0,
            lessonsCompleted: subject.completed_topics || 0,
            hoursPlanned: parseFloat(subject.hours_planned || 0),
            hoursCompleted: parseFloat(subject.hours_completed || 0),
            academicYear: subject.assignment_academic_year || academicYear
        }));
        
        console.log('📤 Sending response with', transformedSubjects.length, 'subjects');
        
        res.json({
            success: true,
            data: transformedSubjects,
            academic_year: academicYear,
            debug_info: {
                teacher_id: teacherId,
                assignments_found: assignmentCheck.length,
                subjects_returned: subjects.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching teacher subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subjects',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}));

// Get all subjects (simple list for assignment purposes)
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            throw new AuthorizationError('Access denied');
        }
        
        const [subjects] = await pool.execute(`
            SELECT 
                s.id,
                s.name,
                s.code,
                s.description,
                s.department,
                s.is_active
            FROM subjects s
            WHERE s.is_active = TRUE
            ORDER BY s.name
        `);
        
        res.json({
            success: true,
            data: subjects
        });
        
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subjects',
            error: error.message
        });
    }
});

// Get all subjects (for admin/management)
router.get('/all',
    authenticateToken,
    validate(schemas.subject.getSubjects, 'query'),
    asyncHandler(async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            throw new AuthorizationError('Access denied');
        }
        
        const search = req.query.search || '';
        const department = req.query.department || '';
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        let query = `
            SELECT s.*, 
                COUNT(DISTINCT tsa.teacher_id) as teacher_count,
                COUNT(DISTINCT tsa.class_id) as class_count
            FROM subjects s
            LEFT JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
            WHERE s.is_active = TRUE
        `;
        
        const params = [];
        
        if (search) {
            query += ` AND (s.name LIKE ? OR s.code LIKE ? OR s.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (department) {
            query += ` AND s.department = ?`;
            params.push(department);
        }
        
        query += ` GROUP BY s.id ORDER BY s.name LIMIT ? OFFSET ?`;
        params.push(limit, offset);
        
        const [subjects] = await pool.execute(query, params);
        
        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM subjects s WHERE s.is_active = TRUE`;
        const countParams = [];
        
        if (search) {
            countQuery += ` AND (s.name LIKE ? OR s.code LIKE ? OR s.description LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (department) {
            countQuery += ` AND s.department = ?`;
            countParams.push(department);
        }
        
        const [countResult] = await pool.execute(countQuery, countParams);
        
        res.json({
            success: true,
            data: subjects,
            pagination: {
                total: countResult[0].total,
                limit,
                offset,
                hasMore: countResult[0].total > offset + limit
            }
        });
        
    } catch (error) {
        console.error('Error fetching all subjects:', error);
        throw error;
    }
}));

// Get subject details with statistics
router.get('/:id/details', 
    authenticateToken,
    validate(schemas.common.id, 'params'),
    asyncHandler(async (req, res) => {
    try {
        const subjectId = req.params.id;
        const teacherId = req.user.id;
        const academicYear = req.query.academic_year || '2024-2025';
        
        // Get subject basic info
        const [subjectResult] = await pool.execute(
            'SELECT * FROM subjects WHERE id = ? AND is_active = TRUE',
            [subjectId]
        );
        
        if (subjectResult.length === 0) {
            throw new NotFoundError('Subject');
        }
        
        const subject = subjectResult[0];
        
        // Check if teacher is assigned to this subject
        const [assignmentCheck] = await pool.execute(
            'SELECT id FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ? AND academic_year = ?',
            [teacherId, subjectId, academicYear]
        );
        
        if (assignmentCheck.length === 0 && req.user.role !== 'admin') {
            throw new AuthorizationError('Access denied. You are not assigned to this subject.');
        }
        
        // Get assigned classes
        const [classes] = await pool.execute(`
            SELECT DISTINCT c.id, c.name, c.level,
                COUNT(DISTINCT st.id) as student_count
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            LEFT JOIN students st ON c.id = st.class_id AND st.status = 'active'
            WHERE tsa.teacher_id = ? AND tsa.subject_id = ? AND tsa.academic_year = ?
            GROUP BY c.id, c.name, c.level
            ORDER BY c.name
        `, [teacherId, subjectId, academicYear]);
        
        // Get curriculum topics
        const [topics] = await pool.execute(`
            SELECT ct.*, tp.status as progress_status, tp.completion_date,
                tp.actual_hours, tp.notes as progress_notes
            FROM curriculum_topics ct
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id 
                AND tp.teacher_id = ? 
                AND (tp.class_id IS NULL OR tp.class_id IN (
                    SELECT class_id FROM teacher_subject_assignments 
                    WHERE teacher_id = ? AND subject_id = ? AND academic_year = ?
                ))
            WHERE ct.subject_id = ? AND ct.teacher_id = ? AND ct.academic_year = ?
            ORDER BY ct.order_index, ct.topic_title
        `, [teacherId, teacherId, subjectId, academicYear, subjectId, teacherId, academicYear]);
        
        // Get materials count
        const [materialsCount] = await pool.execute(
            'SELECT COUNT(*) as count FROM teaching_materials WHERE teacher_id = ? AND subject_id = ?',
            [teacherId, subjectId]
        );
        
        // Get statistics
        const [statsResult] = await pool.execute(`
            SELECT * FROM subject_statistics 
            WHERE teacher_id = ? AND subject_id = ? AND academic_year = ?
        `, [teacherId, subjectId, academicYear]);
        
        const stats = statsResult[0] || {
            total_topics: topics.length,
            completed_topics: topics.filter(t => t.progress_status === 'completed').length,
            pending_topics: topics.filter(t => t.progress_status === 'pending' || !t.progress_status).length,
            total_materials: materialsCount[0].count,
            total_hours_planned: topics.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0),
            total_hours_completed: topics.reduce((sum, t) => sum + parseFloat(t.actual_hours || 0), 0),
            average_completion_rate: 0
        };
        
        // Calculate completion rate
        if (stats.total_topics > 0) {
            stats.average_completion_rate = (stats.completed_topics / stats.total_topics) * 100;
        }
        
        res.json({
            success: true,
            data: {
                subject,
                classes,
                topics,
                statistics: stats
            }
        });
        
    } catch (error) {
        console.error('Error fetching subject details:', error);
        throw error;
    }
}));

// Create new subject (admin only)
router.post('/create', 
    authenticateToken,
    validate(schemas.subject.createSubject),
    asyncHandler(async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            throw new AuthorizationError('Access denied. Admin privileges required.');
        }
        
        const { name, code, description, department } = req.body;
        
        // Validation is now handled by middleware
        
        // Check if subject with same name or code exists
        const [existingSubject] = await pool.execute(
            'SELECT id FROM subjects WHERE name = ? OR code = ?',
            [name, code]
        );
        
        if (existingSubject.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Subject with this name or code already exists'
            });
        }
        
        const [result] = await pool.execute(
            'INSERT INTO subjects (name, code, description, department) VALUES (?, ?, ?, ?)',
            [name, code, description || null, department || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Subject created successfully',
            data: {
                id: result.insertId,
                name,
                code,
                description,
                department
            }
        });
        
    } catch (error) {
        console.error('Error creating subject:', error);
        throw error;
    }
}));

// Update subject (admin only)
router.put('/:id/update', 
    authenticateToken, 
    validate(schemas.common.id, 'params'),
    validate(schemas.subject.updateSubject),
    asyncHandler(async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            throw new AuthorizationError('Access denied. Admin privileges required.');
        }
        
        const subjectId = req.params.id;
        const { name, code, description, department, is_active } = req.body;
        
        // Check if subject exists
        const [existingSubject] = await pool.execute(
            'SELECT id FROM subjects WHERE id = ?',
            [subjectId]
        );
        
        if (existingSubject.length === 0) {
            throw new NotFoundError('Subject');
        }
        
        // Check if name or code conflicts with other subjects
        if (name || code) {
            const [conflictCheck] = await pool.execute(
                'SELECT id FROM subjects WHERE (name = ? OR code = ?) AND id != ?',
                [name || '', code || '', subjectId]
            );
            
            if (conflictCheck.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject with this name or code already exists'
                });
            }
        }
        
        // Build update query dynamically
        const updates = [];
        const params = [];
        
        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (code) {
            updates.push('code = ?');
            params.push(code);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (department !== undefined) {
            updates.push('department = ?');
            params.push(department);
        }
        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        params.push(subjectId);
        
        await pool.execute(
            `UPDATE subjects SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );
        
        res.json({
            success: true,
            message: 'Subject updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating subject:', error);
        throw error;
    }
}));

// Assign teacher to subject
router.post('/:id/assign-teacher', 
    authenticateToken,
    validate(schemas.common.id, 'params'),
    validate(schemas.subject.assignTeacher),
    asyncHandler(async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            throw new AuthorizationError('Access denied. Admin privileges required.');
        }
        
        const subjectId = req.params.id;
        const { teacher_id, class_ids, academic_year, is_primary_teacher } = req.body;
        
        // Verify teacher exists and has teacher role
        const [teacher] = await pool.execute(
            "SELECT id FROM users WHERE id = ? AND role = 'teacher' AND is_active = TRUE",
            [teacher_id]
        );
        
        if (teacher.length === 0) {
            throw new NotFoundError('Teacher not found or inactive');
        }
        
        // Verify subject exists
        const [subject] = await pool.execute(
            'SELECT id FROM subjects WHERE id = ? AND is_active = TRUE',
            [subjectId]
        );
        
        if (subject.length === 0) {
            throw new NotFoundError('Subject');
        }
        
        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();
        
        try {
            // Remove existing assignments for this teacher-subject-year combination
            await connection.execute(
                'DELETE FROM teacher_subject_assignments WHERE teacher_id = ? AND subject_id = ? AND academic_year = ?',
                [teacher_id, subjectId, academic_year]
            );
            
            // Insert new assignments
            for (const classId of class_ids) {
                await connection.execute(
                    'INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year, is_primary_teacher) VALUES (?, ?, ?, ?, ?)',
                    [teacher_id, subjectId, classId, academic_year, is_primary_teacher || false]
                );
            }
            
            await connection.commit();
            connection.release();
            
            res.json({
                success: true,
                message: 'Teacher assigned to subject successfully'
            });
            
        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }
        
    } catch (error) {
        console.error('Error assigning teacher to subject:', error);
        throw error;
    }
}));

// Update subject statistics (internal function, called after topic updates)
const updateSubjectStatistics = async (teacherId, subjectId, classId, academicYear) => {
    try {
        // Get current statistics
        const [topics] = await pool.execute(`
            SELECT ct.*, tp.status as progress_status, tp.actual_hours
            FROM curriculum_topics ct
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id 
                AND tp.teacher_id = ? AND tp.class_id = ?
            WHERE ct.subject_id = ? AND ct.teacher_id = ? AND ct.academic_year = ?
                AND (ct.class_id IS NULL OR ct.class_id = ?)
        `, [teacherId, classId, subjectId, teacherId, academicYear, classId]);
        
        const [materials] = await pool.execute(
            'SELECT COUNT(*) as count FROM teaching_materials WHERE teacher_id = ? AND subject_id = ?',
            [teacherId, subjectId]
        );
        
        const totalTopics = topics.length;
        const completedTopics = topics.filter(t => t.progress_status === 'completed').length;
        const pendingTopics = topics.filter(t => t.progress_status === 'pending' || !t.progress_status).length;
        const totalMaterials = materials[0].count;
        const totalHoursPlanned = topics.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0);
        const totalHoursCompleted = topics.reduce((sum, t) => sum + parseFloat(t.actual_hours || 0), 0);
        const averageCompletionRate = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;
        
        // Upsert statistics
        await pool.execute(`
            INSERT INTO subject_statistics 
            (teacher_id, subject_id, class_id, academic_year, total_topics, completed_topics, 
             pending_topics, total_materials, total_hours_planned, total_hours_completed, 
             average_completion_rate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            total_topics = VALUES(total_topics),
            completed_topics = VALUES(completed_topics),
            pending_topics = VALUES(pending_topics),
            total_materials = VALUES(total_materials),
            total_hours_planned = VALUES(total_hours_planned),
            total_hours_completed = VALUES(total_hours_completed),
            average_completion_rate = VALUES(average_completion_rate)
        `, [teacherId, subjectId, classId, academicYear, totalTopics, completedTopics, 
            pendingTopics, totalMaterials, totalHoursPlanned, totalHoursCompleted, 
            averageCompletionRate]);
            
    } catch (error) {
        console.error('Error updating subject statistics:', error);
    }
};

// Export the statistics update function for use in other routes
router.updateSubjectStatistics = updateSubjectStatistics;

module.exports = router;
