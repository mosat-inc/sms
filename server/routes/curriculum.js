const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../utils/auth');
const { updateSubjectStatistics } = require('./subjects');

// Helper function to validate query parameters
const isValidParam = (param) => {
    return param !== null && param !== undefined && param !== 'undefined' && param !== '';
};

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

const resolveTeacherSubjectAcademicYear = async (teacherId, subjectId, classId, requestedAcademicYear) => {
    const currentYearQuery = `
        SELECT academic_year
        FROM teacher_subject_assignments
        WHERE teacher_id = ? AND subject_id = ?
        ${isValidParam(classId) ? 'AND class_id = ?' : ''}
          AND academic_year = ?
        ORDER BY academic_year DESC
        LIMIT 1
    `;
    const currentYearParams = isValidParam(classId)
        ? [teacherId, Number(subjectId), Number(classId), requestedAcademicYear]
        : [teacherId, Number(subjectId), requestedAcademicYear];
    const [currentYearRows] = await pool.query(currentYearQuery, currentYearParams);

    if (currentYearRows.length > 0) {
        return currentYearRows[0].academic_year;
    }

    const fallbackQuery = `
        SELECT academic_year
        FROM teacher_subject_assignments
        WHERE teacher_id = ? AND subject_id = ?
        ${isValidParam(classId) ? 'AND class_id = ?' : ''}
        ORDER BY academic_year DESC
        LIMIT 1
    `;
    const fallbackParams = isValidParam(classId)
        ? [teacherId, Number(subjectId), Number(classId)]
        : [teacherId, Number(subjectId)];
    const [fallbackRows] = await pool.query(fallbackQuery, fallbackParams);

    return fallbackRows[0]?.academic_year || null;
};

// Get curriculum topics for a subject
router.get('/topics', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            subject_id,
            class_id,
            academic_year,
            status,
            search = '',
            limit = 50,
            offset = 0
        } = req.query;

        if (!subject_id) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID is required'
            });
        }

        const requestedAcademicYear = academic_year || await getCurrentAcademicYearName();
        const effectiveAcademicYear = await resolveTeacherSubjectAcademicYear(
            teacherId,
            subject_id,
            class_id,
            requestedAcademicYear
        );

        if (!effectiveAcademicYear && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not assigned to this subject.'
            });
        }

        let query = `
            SELECT ct.*, 
                s.name as subject_name,
                s.code as subject_code,
                c.name as class_name,
                tp.status as progress_status,
                tp.start_date,
                tp.completion_date,
                tp.actual_hours,
                tp.notes as progress_notes,
                tp.student_feedback,
                tp.assessment_score,
                tp.challenges_faced,
                tp.improvements_needed
            FROM curriculum_topics ct
            LEFT JOIN subjects s ON ct.subject_id = s.id
            LEFT JOIN classes c ON ct.class_id = c.id
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id 
                AND tp.teacher_id = ? 
                AND (tp.class_id = ct.class_id OR (tp.class_id IS NULL AND ct.class_id IS NULL))
            WHERE ct.teacher_id = ? AND ct.subject_id = ? AND ct.academic_year = ?
        `;

        const params = [teacherId, teacherId, Number(subject_id), effectiveAcademicYear || requestedAcademicYear];

        if (isValidParam(class_id)) {
            query += ` AND (ct.class_id = ? OR ct.class_id IS NULL)`;
            params.push(Number(class_id));
        }

        if (isValidParam(status)) {
            query += ` AND tp.status = ?`;
            params.push(status);
        }

        if (isValidParam(search)) {
            query += ` AND (ct.topic_title LIKE ? OR ct.topic_description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY ct.order_index ASC, ct.topic_title ASC LIMIT ? OFFSET ?`;
        
        // Ensure numeric parameters are properly formatted
        const limitNum = Number(limit) || 50;
        const offsetNum = Number(offset) || 0;
        params.push(limitNum, offsetNum);
        

        const [topics] = await pool.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM curriculum_topics ct
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id 
                AND tp.teacher_id = ? 
                AND (tp.class_id = ct.class_id OR (tp.class_id IS NULL AND ct.class_id IS NULL))
            WHERE ct.teacher_id = ? AND ct.subject_id = ? AND ct.academic_year = ?
        `;
        const countParams = [teacherId, teacherId, Number(subject_id), effectiveAcademicYear || requestedAcademicYear];

        if (isValidParam(class_id)) {
            countQuery += ` AND (ct.class_id = ? OR ct.class_id IS NULL)`;
            countParams.push(Number(class_id));
        }

        if (isValidParam(status)) {
            countQuery += ` AND tp.status = ?`;
            countParams.push(status);
        }

        if (isValidParam(search)) {
            countQuery += ` AND (ct.topic_title LIKE ? OR ct.topic_description LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [countResult] = await pool.query(countQuery, countParams);

        // Transform data for frontend
        const transformedTopics = topics.map(topic => ({
            id: topic.id,
            title: topic.topic_title,
            description: topic.topic_description,
            subject: topic.subject_name,
            subjectCode: topic.subject_code,
            className: topic.class_name,
            estimatedHours: parseFloat(topic.estimated_hours || 0),
            actualHours: parseFloat(topic.actual_hours || 0),
            difficultyLevel: topic.difficulty_level,
            prerequisites: topic.prerequisites ? JSON.parse(topic.prerequisites) : [],
            learningObjectives: topic.learning_objectives,
            resourcesNeeded: topic.resources_needed,
            assessmentMethods: topic.assessment_methods,
            orderIndex: topic.order_index,
            isMandatory: topic.is_mandatory,
            status: topic.progress_status || 'pending',
            startDate: topic.start_date,
            completionDate: topic.completion_date,
            notes: topic.progress_notes,
            studentFeedback: topic.student_feedback,
            assessmentScore: parseFloat(topic.assessment_score || 0),
            challengesFaced: topic.challenges_faced,
            improvementsNeeded: topic.improvements_needed,
            createdAt: topic.created_at,
            updatedAt: topic.updated_at
        }));

        res.json({
            success: true,
            data: transformedTopics,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: countResult[0].total > parseInt(offset) + parseInt(limit)
            },
            academic_year: effectiveAcademicYear || requestedAcademicYear
        });

    } catch (error) {
        console.error('Error fetching curriculum topics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch curriculum topics',
            error: error.message
        });
    }
});

// Create new curriculum topic
router.post('/topics/create', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            subject_id,
            class_id,
            topic_title,
            topic_description,
            estimated_hours = 1.0,
            difficulty_level = 'intermediate',
            prerequisites,
            learning_objectives,
            resources_needed,
            assessment_methods,
            order_index = 0,
            is_mandatory = true,
            academic_year
        } = req.body;

        if (!subject_id || !topic_title) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID and topic title are required'
            });
        }

        const requestedAcademicYear = academic_year || await getCurrentAcademicYearName();
        const effectiveAcademicYear = await resolveTeacherSubjectAcademicYear(
            teacherId,
            subject_id,
            class_id,
            requestedAcademicYear
        );

        if (!effectiveAcademicYear) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not assigned to this subject.'
            });
        }

        const [result] = await pool.execute(`
            INSERT INTO curriculum_topics 
            (subject_id, teacher_id, class_id, topic_title, topic_description, 
             estimated_hours, difficulty_level, prerequisites, learning_objectives, 
             resources_needed, assessment_methods, order_index, is_mandatory, academic_year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            subject_id,
            teacherId,
            class_id || null,
            topic_title,
            topic_description || null,
            parseFloat(estimated_hours),
            difficulty_level,
            prerequisites ? JSON.stringify(prerequisites) : null,
            learning_objectives || null,
            resources_needed || null,
            assessment_methods || null,
            parseInt(order_index),
            is_mandatory,
            effectiveAcademicYear
        ]);

        // Update subject statistics
        if (class_id) {
            await updateSubjectStatistics(teacherId, subject_id, class_id, effectiveAcademicYear);
        }

        res.status(201).json({
            success: true,
            message: 'Curriculum topic created successfully',
            data: {
                id: result.insertId,
                topic_title,
                subject_id,
                class_id,
                academic_year: effectiveAcademicYear
            }
        });

    } catch (error) {
        console.error('Error creating curriculum topic:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create curriculum topic',
            error: error.message
        });
    }
});

// Update curriculum topic
router.put('/topics/:id/update', authenticateToken, async (req, res) => {
    try {
        const topicId = req.params.id;
        const teacherId = req.user.id;
        const {
            topic_title,
            topic_description,
            estimated_hours,
            difficulty_level,
            prerequisites,
            learning_objectives,
            resources_needed,
            assessment_methods,
            order_index,
            is_mandatory
        } = req.body;

        // Check if topic exists and user has permission
        const [topics] = await pool.execute(
            'SELECT teacher_id, subject_id, class_id, academic_year FROM curriculum_topics WHERE id = ?',
            [topicId]
        );

        if (topics.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curriculum topic not found'
            });
        }

        const topic = topics[0];

        if (topic.teacher_id !== teacherId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own curriculum topics.'
            });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (topic_title !== undefined) {
            updates.push('topic_title = ?');
            params.push(topic_title);
        }
        if (topic_description !== undefined) {
            updates.push('topic_description = ?');
            params.push(topic_description);
        }
        if (estimated_hours !== undefined) {
            updates.push('estimated_hours = ?');
            params.push(parseFloat(estimated_hours));
        }
        if (difficulty_level !== undefined) {
            updates.push('difficulty_level = ?');
            params.push(difficulty_level);
        }
        if (prerequisites !== undefined) {
            updates.push('prerequisites = ?');
            params.push(Array.isArray(prerequisites) ? JSON.stringify(prerequisites) : prerequisites);
        }
        if (learning_objectives !== undefined) {
            updates.push('learning_objectives = ?');
            params.push(learning_objectives);
        }
        if (resources_needed !== undefined) {
            updates.push('resources_needed = ?');
            params.push(resources_needed);
        }
        if (assessment_methods !== undefined) {
            updates.push('assessment_methods = ?');
            params.push(assessment_methods);
        }
        if (order_index !== undefined) {
            updates.push('order_index = ?');
            params.push(parseInt(order_index));
        }
        if (is_mandatory !== undefined) {
            updates.push('is_mandatory = ?');
            params.push(is_mandatory);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(topicId);

        await pool.execute(
            `UPDATE curriculum_topics SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        // Update subject statistics
        if (topic.class_id) {
            await updateSubjectStatistics(topic.teacher_id, topic.subject_id, topic.class_id, topic.academic_year);
        }

        res.json({
            success: true,
            message: 'Curriculum topic updated successfully'
        });

    } catch (error) {
        console.error('Error updating curriculum topic:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update curriculum topic',
            error: error.message
        });
    }
});

// Update topic progress status with action-based approach
router.put('/topics/:id/progress', authenticateToken, async (req, res) => {
    try {
        const topicId = req.params.id;
        const teacherId = req.user.id;
        const {
            action, // 'start', 'finish', or 'update'
            status,
            start_date,
            completion_date,
            actual_hours,
            notes,
            student_feedback,
            assessment_score,
            challenges_faced,
            improvements_needed,
            class_id
        } = req.body;

        // Validate action or status
        if (!action && !status) {
            return res.status(400).json({
                success: false,
                message: 'Action (start/finish/update) or status is required'
            });
        }

        // Verify topic exists and user has access
        const [topics] = await pool.execute(
            'SELECT teacher_id, subject_id, class_id, academic_year FROM curriculum_topics WHERE id = ?',
            [topicId]
        );

        if (topics.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curriculum topic not found'
            });
        }

        const topic = topics[0];
        const targetClassId = class_id || topic.class_id;

        if (topic.teacher_id !== teacherId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get current progress state if exists
        const [currentProgress] = await pool.execute(
            'SELECT * FROM topic_progress WHERE topic_id = ? AND teacher_id = ? AND class_id = ?',
            [topicId, teacherId, targetClassId]
        );
        
        const currentState = currentProgress.length > 0 ? currentProgress[0] : null;
        
        // Handle action-based updates
        let updateData = {
            status: status || (currentState ? currentState.status : 'pending'),
            start_date: start_date || (currentState ? currentState.start_date : null),
            completion_date: completion_date || (currentState ? currentState.completion_date : null),
            actual_hours: actual_hours ? parseFloat(actual_hours) : (currentState ? currentState.actual_hours : null),
            notes: notes || (currentState ? currentState.notes : null),
            student_feedback: student_feedback || (currentState ? currentState.student_feedback : null),
            assessment_score: assessment_score ? parseFloat(assessment_score) : (currentState ? currentState.assessment_score : null),
            challenges_faced: challenges_faced || (currentState ? currentState.challenges_faced : null),
            improvements_needed: improvements_needed || (currentState ? currentState.improvements_needed : null)
        };
        
        // Handle specific actions
        if (action === 'start') {
            updateData.status = 'in_progress';
            updateData.start_date = new Date().toISOString().split('T')[0];
            updateData.completion_date = null; // Reset completion date if restarting
        } else if (action === 'finish') {
            if (!currentState || currentState.status !== 'in_progress') {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot finish a topic that has not been started'
                });
            }
            updateData.status = 'completed';
            updateData.completion_date = new Date().toISOString().split('T')[0];
            
            // Calculate actual hours if start date exists
            if (updateData.start_date && updateData.completion_date) {
                const startTime = new Date(updateData.start_date);
                const endTime = new Date(updateData.completion_date);
                const hoursDiff = Math.abs(endTime - startTime) / (1000 * 60 * 60 * 24) * 8; // Assuming 8 hours per teaching day
                updateData.actual_hours = Math.max(updateData.actual_hours || 0, hoursDiff);
            }
        }
        
        // Validate status transitions
        const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
        if (!validStatuses.includes(updateData.status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        // Upsert topic progress
        await pool.execute(`
            INSERT INTO topic_progress 
            (topic_id, teacher_id, class_id, status, start_date, completion_date, 
             actual_hours, notes, student_feedback, assessment_score, 
             challenges_faced, improvements_needed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            start_date = VALUES(start_date),
            completion_date = VALUES(completion_date),
            actual_hours = VALUES(actual_hours),
            notes = VALUES(notes),
            student_feedback = VALUES(student_feedback),
            assessment_score = VALUES(assessment_score),
            challenges_faced = VALUES(challenges_faced),
            improvements_needed = VALUES(improvements_needed),
            updated_at = CURRENT_TIMESTAMP
        `, [
            topicId,
            teacherId,
            targetClassId,
            updateData.status,
            updateData.start_date,
            updateData.completion_date,
            updateData.actual_hours,
            updateData.notes,
            updateData.student_feedback,
            updateData.assessment_score,
            updateData.challenges_faced,
            updateData.improvements_needed
        ]);

        // Update subject statistics
        if (targetClassId) {
            await updateSubjectStatistics(teacherId, topic.subject_id, targetClassId, topic.academic_year);
        }

        // Create appropriate response message
        let message;
        if (action === 'start') {
            message = 'Topic teaching started successfully';
        } else if (action === 'finish') {
            message = 'Topic teaching completed successfully';
        } else {
            message = `Topic progress updated to ${updateData.status}`;
        }
        
        res.json({
            success: true,
            message: message,
            data: {
                ...updateData,
                action: action
            }
        });

    } catch (error) {
        console.error('Error updating topic progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update topic progress',
            error: error.message
        });
    }
});

// Bulk update topic progress (for multiple topics)
router.put('/topics/bulk-progress', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { updates } = req.body; // Array of {topicId, status, ...otherFields}

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Updates array is required and must not be empty'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const results = [];
            
            for (const update of updates) {
                const {
                    topicId,
                    status,
                    class_id,
                    actual_hours,
                    notes,
                    completion_date
                } = update;

                if (!topicId || !status) {
                    continue; // Skip invalid updates
                }

                // Verify topic access
                const [topics] = await connection.execute(
                    'SELECT teacher_id, subject_id, class_id, academic_year FROM curriculum_topics WHERE id = ?',
                    [topicId]
                );

                if (topics.length === 0 || (topics[0].teacher_id !== teacherId && req.user.role !== 'admin')) {
                    continue; // Skip unauthorized topics
                }

                const topic = topics[0];
                const targetClassId = class_id || topic.class_id;

                // Auto-set completion date for completed status
                let finalCompletionDate = completion_date;
                if (status === 'completed' && !completion_date) {
                    finalCompletionDate = new Date().toISOString().split('T')[0];
                } else if (status !== 'completed') {
                    finalCompletionDate = null;
                }

                // Upsert progress
                await connection.execute(`
                    INSERT INTO topic_progress 
                    (topic_id, teacher_id, class_id, status, completion_date, actual_hours, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    status = VALUES(status),
                    completion_date = VALUES(completion_date),
                    actual_hours = VALUES(actual_hours),
                    notes = VALUES(notes),
                    updated_at = CURRENT_TIMESTAMP
                `, [
                    topicId,
                    teacherId,
                    targetClassId,
                    status,
                    finalCompletionDate,
                    actual_hours ? parseFloat(actual_hours) : null,
                    notes || null
                ]);

                results.push({ topicId, status, success: true });

                // Update subject statistics
                if (targetClassId) {
                    await updateSubjectStatistics(teacherId, topic.subject_id, targetClassId, topic.academic_year);
                }
            }

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: `${results.length} topic(s) updated successfully`,
                data: results
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error bulk updating topic progress:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update topic progress',
            error: error.message
        });
    }
});

// Delete curriculum topic
router.delete('/topics/:id/delete', authenticateToken, async (req, res) => {
    try {
        const topicId = req.params.id;
        const teacherId = req.user.id;

        // Get topic details
        const [topics] = await pool.execute(
            'SELECT teacher_id, subject_id, class_id, academic_year, topic_title FROM curriculum_topics WHERE id = ?',
            [topicId]
        );

        if (topics.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Curriculum topic not found'
            });
        }

        const topic = topics[0];

        if (topic.teacher_id !== teacherId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own curriculum topics.'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Delete topic progress records
            await connection.execute(
                'DELETE FROM topic_progress WHERE topic_id = ?',
                [topicId]
            );

            // Delete curriculum topic
            await connection.execute(
                'DELETE FROM curriculum_topics WHERE id = ?',
                [topicId]
            );

            await connection.commit();
            connection.release();

            // Update subject statistics
            if (topic.class_id) {
                await updateSubjectStatistics(topic.teacher_id, topic.subject_id, topic.class_id, topic.academic_year);
            }

            res.json({
                success: true,
                message: `Topic "${topic.topic_title}" deleted successfully`
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error deleting curriculum topic:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete curriculum topic',
            error: error.message
        });
    }
});

// Get curriculum progress summary
router.get('/progress/summary', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            subject_id,
            class_id,
            academic_year = '2024-2025'
        } = req.query;

        let query = `
            SELECT 
                s.id as subject_id,
                s.name as subject_name,
                s.code as subject_code,
                c.id as class_id,
                c.name as class_name,
                COUNT(ct.id) as total_topics,
                COUNT(CASE WHEN tp.status = 'completed' THEN 1 END) as completed_topics,
                COUNT(CASE WHEN tp.status = 'in_progress' THEN 1 END) as in_progress_topics,
                COUNT(CASE WHEN tp.status = 'pending' OR tp.status IS NULL THEN 1 END) as pending_topics,
                SUM(ct.estimated_hours) as total_hours_planned,
                SUM(tp.actual_hours) as total_hours_completed,
                AVG(tp.assessment_score) as average_assessment_score
            FROM curriculum_topics ct
            INNER JOIN subjects s ON ct.subject_id = s.id
            LEFT JOIN classes c ON ct.class_id = c.id
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id AND tp.teacher_id = ct.teacher_id
            WHERE ct.teacher_id = ? AND ct.academic_year = ?
        `;

        const params = [teacherId, academic_year];

        if (subject_id) {
            query += ` AND ct.subject_id = ?`;
            params.push(subject_id);
        }

        if (class_id) {
            query += ` AND ct.class_id = ?`;
            params.push(class_id);
        }

        query += ` GROUP BY s.id, s.name, s.code, c.id, c.name ORDER BY s.name, c.name`;

        const [summary] = await pool.execute(query, params);

        // Transform data for frontend
        const transformedSummary = summary.map(item => ({
            subjectId: item.subject_id,
            subjectName: item.subject_name,
            subjectCode: item.subject_code,
            classId: item.class_id,
            className: item.class_name || 'All Classes',
            totalTopics: item.total_topics,
            completedTopics: item.completed_topics || 0,
            inProgressTopics: item.in_progress_topics || 0,
            pendingTopics: item.pending_topics || 0,
            completionPercentage: item.total_topics > 0 
                ? Math.round((item.completed_topics || 0) / item.total_topics * 100) 
                : 0,
            totalHoursPlanned: parseFloat(item.total_hours_planned || 0),
            totalHoursCompleted: parseFloat(item.total_hours_completed || 0),
            averageAssessmentScore: parseFloat(item.average_assessment_score || 0)
        }));

        res.json({
            success: true,
            data: transformedSummary,
            academic_year
        });

    } catch (error) {
        console.error('Error fetching curriculum progress summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch curriculum progress summary',
            error: error.message
        });
    }
});

// Get detailed topic progress report
router.get('/progress/report', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            subject_id,
            class_id,
            academic_year = '2024-2025',
            format = 'json'
        } = req.query;

        if (!subject_id) {
            return res.status(400).json({
                success: false,
                message: 'Subject ID is required'
            });
        }

        const query = `
            SELECT 
                ct.*,
                s.name as subject_name,
                s.code as subject_code,
                c.name as class_name,
                tp.status,
                tp.start_date,
                tp.completion_date,
                tp.actual_hours,
                tp.notes,
                tp.student_feedback,
                tp.assessment_score,
                tp.challenges_faced,
                tp.improvements_needed,
                CASE 
                    WHEN tp.status = 'completed' AND tp.completion_date IS NOT NULL 
                    THEN DATEDIFF(tp.completion_date, tp.start_date)
                    ELSE NULL 
                END as days_to_complete
            FROM curriculum_topics ct
            INNER JOIN subjects s ON ct.subject_id = s.id
            LEFT JOIN classes c ON ct.class_id = c.id
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id AND tp.teacher_id = ct.teacher_id
            WHERE ct.teacher_id = ? AND ct.subject_id = ? AND ct.academic_year = ?
            ${class_id ? 'AND ct.class_id = ?' : ''}
            ORDER BY ct.order_index, ct.topic_title
        `;

        const params = class_id 
            ? [teacherId, subject_id, academic_year, class_id]
            : [teacherId, subject_id, academic_year];

        const [topics] = await pool.execute(query, params);

        const reportData = {
            subject: topics.length > 0 ? {
                id: subject_id,
                name: topics[0].subject_name,
                code: topics[0].subject_code
            } : null,
            class: topics.length > 0 && topics[0].class_name ? {
                id: class_id,
                name: topics[0].class_name
            } : null,
            academic_year,
            generated_at: new Date().toISOString(),
            summary: {
                total_topics: topics.length,
                completed: topics.filter(t => t.status === 'completed').length,
                in_progress: topics.filter(t => t.status === 'in_progress').length,
                pending: topics.filter(t => !t.status || t.status === 'pending').length,
                skipped: topics.filter(t => t.status === 'skipped').length,
                total_hours_planned: topics.reduce((sum, t) => sum + parseFloat(t.estimated_hours || 0), 0),
                total_hours_completed: topics.reduce((sum, t) => sum + parseFloat(t.actual_hours || 0), 0),
                average_assessment_score: topics.length > 0 
                    ? topics.reduce((sum, t) => sum + parseFloat(t.assessment_score || 0), 0) / topics.length 
                    : 0,
                completion_rate: topics.length > 0 
                    ? (topics.filter(t => t.status === 'completed').length / topics.length) * 100 
                    : 0
            },
            topics: topics.map(topic => ({
                id: topic.id,
                title: topic.topic_title,
                description: topic.topic_description,
                estimatedHours: parseFloat(topic.estimated_hours || 0),
                actualHours: parseFloat(topic.actual_hours || 0),
                difficultyLevel: topic.difficulty_level,
                status: topic.status || 'pending',
                startDate: topic.start_date,
                completionDate: topic.completion_date,
                daysToComplete: topic.days_to_complete,
                assessmentScore: parseFloat(topic.assessment_score || 0),
                notes: topic.notes,
                studentFeedback: topic.student_feedback,
                challengesFaced: topic.challenges_faced,
                improvementsNeeded: topic.improvements_needed,
                orderIndex: topic.order_index,
                isMandatory: topic.is_mandatory
            }))
        };

        res.json({
            success: true,
            data: reportData
        });

    } catch (error) {
        console.error('Error generating curriculum progress report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate curriculum progress report',
            error: error.message
        });
    }
});

// Get curriculum progress analytics for teacher
router.get('/analytics/progress', authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            academic_year = '2024-2025',
            subject_id,
            class_id
        } = req.query;
        
        console.log(`🔍 Fetching curriculum analytics for teacher ID: ${teacherId}`);
        
        // Base query for curriculum topics with progress
        let query = `
            SELECT 
                ct.id,
                ct.topic_title,
                ct.estimated_hours,
                ct.academic_year,
                s.name as subject_name,
                s.code as subject_code,
                c.name as class_name,
                tp.status,
                tp.start_date,
                tp.completion_date,
                tp.actual_hours,
                CASE 
                    WHEN tp.status = 'completed' AND tp.start_date IS NOT NULL AND tp.completion_date IS NOT NULL
                    THEN DATEDIFF(tp.completion_date, tp.start_date) + 1
                    ELSE NULL
                END as days_to_complete
            FROM curriculum_topics ct
            LEFT JOIN subjects s ON ct.subject_id = s.id
            LEFT JOIN classes c ON ct.class_id = c.id
            LEFT JOIN topic_progress tp ON ct.id = tp.topic_id AND tp.teacher_id = ct.teacher_id
            WHERE ct.teacher_id = ? AND ct.academic_year = ?
        `;
        
        const params = [teacherId, academic_year];
        
        if (subject_id) {
            query += ` AND ct.subject_id = ?`;
            params.push(Number(subject_id));
        }
        
        if (class_id) {
            query += ` AND ct.class_id = ?`;
            params.push(Number(class_id));
        }
        
        query += ` ORDER BY s.name, c.name, ct.order_index`;
        
        const [topics] = await pool.query(query, params);
        
        // Calculate summary statistics
        const totalTopics = topics.length;
        const completedTopics = topics.filter(topic => topic.status === 'completed').length;
        const inProgressTopics = topics.filter(topic => topic.status === 'in_progress').length;
        const pendingTopics = topics.filter(topic => !topic.status || topic.status === 'pending').length;
        
        const totalEstimatedHours = topics.reduce((sum, topic) => sum + parseFloat(topic.estimated_hours || 0), 0);
        const totalActualHours = topics.reduce((sum, topic) => sum + parseFloat(topic.actual_hours || 0), 0);
        
        const completedTopicsWithTime = topics.filter(topic => 
            topic.status === 'completed' && topic.days_to_complete !== null
        );
        
        const averageDaysToComplete = completedTopicsWithTime.length > 0 
            ? Math.round(completedTopicsWithTime.reduce((sum, topic) => sum + topic.days_to_complete, 0) / completedTopicsWithTime.length)
            : 0;
        
        // Group by subject for subject-specific analytics
        const subjectStats = {};
        topics.forEach(topic => {
            const subjectKey = topic.subject_name;
            if (!subjectStats[subjectKey]) {
                subjectStats[subjectKey] = {
                    subject_name: topic.subject_name,
                    subject_code: topic.subject_code,
                    total_topics: 0,
                    completed_topics: 0,
                    in_progress_topics: 0,
                    pending_topics: 0,
                    estimated_hours: 0,
                    actual_hours: 0,
                    completion_rate: 0,
                    average_days: 0,
                    topics: []
                };
            }
            
            const stats = subjectStats[subjectKey];
            stats.total_topics++;
            stats.estimated_hours += parseFloat(topic.estimated_hours || 0);
            stats.actual_hours += parseFloat(topic.actual_hours || 0);
            
            if (topic.status === 'completed') stats.completed_topics++;
            else if (topic.status === 'in_progress') stats.in_progress_topics++;
            else stats.pending_topics++;
            
            stats.topics.push({
                id: topic.id,
                title: topic.topic_title,
                class_name: topic.class_name,
                status: topic.status || 'pending',
                estimated_hours: parseFloat(topic.estimated_hours || 0),
                actual_hours: parseFloat(topic.actual_hours || 0),
                days_to_complete: topic.days_to_complete,
                start_date: topic.start_date,
                completion_date: topic.completion_date
            });
        });
        
        // Calculate completion rates and averages
        Object.keys(subjectStats).forEach(subjectKey => {
            const stats = subjectStats[subjectKey];
            stats.completion_rate = stats.total_topics > 0 
                ? Math.round((stats.completed_topics / stats.total_topics) * 100) 
                : 0;
            
            const completedWithTime = stats.topics.filter(topic => 
                topic.status === 'completed' && topic.days_to_complete !== null
            );
            
            stats.average_days = completedWithTime.length > 0
                ? Math.round(completedWithTime.reduce((sum, topic) => sum + topic.days_to_complete, 0) / completedWithTime.length)
                : 0;
        });
        
        const response = {
            success: true,
            data: {
                summary: {
                    total_topics: totalTopics,
                    completed_topics: completedTopics,
                    in_progress_topics: inProgressTopics,
                    pending_topics: pendingTopics,
                    completion_rate: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
                    total_estimated_hours: Math.round(totalEstimatedHours * 100) / 100,
                    total_actual_hours: Math.round(totalActualHours * 100) / 100,
                    efficiency_rate: totalEstimatedHours > 0 ? Math.round((totalActualHours / totalEstimatedHours) * 100) : 0,
                    average_days_to_complete: averageDaysToComplete
                },
                by_subject: Object.values(subjectStats),
                academic_year: academic_year,
                filters_applied: {
                    subject_id: subject_id || null,
                    class_id: class_id || null
                }
            }
        };
        
        console.log(`✅ Curriculum analytics: ${totalTopics} topics, ${completedTopics} completed`);
        res.json(response);
        
    } catch (error) {
        console.error('❌ Error fetching curriculum analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch curriculum analytics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
