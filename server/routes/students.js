/**
 * Students Routes
 * Student registration and management
 */

const express = require('express');
const Joi = require('joi');
const { pool } = require('../config/database');
const router = express.Router();
const bcrypt = require('bcryptjs');
// Import middleware
const { authenticate, requireAdmin, requireRole, requireStudentAdmissionAccess } = require('../middleware/authMiddleware');
const { generateStudentNumber, assignStudentNumber } = require('../utils/studentNumberGenerator');
const { generateAdmissionNumber } = require('../utils/admissionNumberGenerator');
const { generateStrongPassword } = require('../utils/passwordGenerator');

let parentAccessSchemaEnsured = false;
async function ensureParentAccessSchema(connection) {
    if (parentAccessSchemaEnsured) return;

    // 1) Ensure admission_sequences exists (used for concurrency-safe yearly sequence)
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS admission_sequences (
            admission_year INT PRIMARY KEY,
            last_number INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `);

    // 2) Ensure required columns exist on students table
    const [cols] = await connection.execute(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'students'
          AND COLUMN_NAME IN (
            'admission_year',
            'parent_password_hash',
            'parent_last_password_reset_at',
            'parent_password_must_change',
            'parent_password_changed_at'
          )
        `
    );
    const existing = new Set((cols || []).map((r) => r.COLUMN_NAME));

    if (!existing.has('admission_year')) {
        await connection.execute(`ALTER TABLE students ADD COLUMN admission_year INT NULL`);
    }
    if (!existing.has('parent_password_hash')) {
        await connection.execute(`ALTER TABLE students ADD COLUMN parent_password_hash VARCHAR(255) NULL`);
    }
    if (!existing.has('parent_last_password_reset_at')) {
        await connection.execute(`ALTER TABLE students ADD COLUMN parent_last_password_reset_at TIMESTAMP NULL`);
    }
    if (!existing.has('parent_password_must_change')) {
        await connection.execute(`ALTER TABLE students ADD COLUMN parent_password_must_change TINYINT(1) NOT NULL DEFAULT 1`);
    }
    if (!existing.has('parent_password_changed_at')) {
        await connection.execute(`ALTER TABLE students ADD COLUMN parent_password_changed_at TIMESTAMP NULL`);
    }

    parentAccessSchemaEnsured = true;
}

// Validation schemas (unchanged from original)
const newStudentSchema = Joi.object({
    first_name: Joi.string().min(2).max(50).required(),
    last_name: Joi.string().min(2).max(50).required(),
    date_of_birth: Joi.date().max('now').required(),
    gender: Joi.string().valid('Male', 'Female').required(),
    class_id: Joi.number().integer().positive().required(),
    academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
    year_of_study: Joi.number().integer().min(2020).max(2030).required(),
    admission_date: Joi.date().default(new Date()),
    blood_group: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
    nationality: Joi.string().max(50).default('Tanzanian'),
    religion: Joi.string().max(50).optional(),
    address: Joi.string().max(500).optional(),
    phone: Joi.string().pattern(/^(\+255|0)[67]\d{8}$/).optional(),
    email: Joi.string().email().optional(),
    medical_conditions: Joi.string().max(1000).optional(),
    supervisor: Joi.object({
        first_name: Joi.string().min(2).max(50).required(),
        last_name: Joi.string().min(2).max(50).required(),
        relationship: Joi.string().valid('Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Other').required(),
        phone: Joi.string().pattern(/^(\+255|0)[67]\d{8}$/).required(),
        email: Joi.string().email().optional(),
        address: Joi.string().max(500).optional(),
        occupation: Joi.string().max(100).optional(),
        workplace: Joi.string().max(100).optional()
    }).required()
});

const resolveAdmissionYear = (value) => {
    // Chosen rule: use intake/admission_date year (from the form) for accuracy.
    // If missing, fallback to current year.
    try {
        if (value?.admission_year && Number.isInteger(Number(value.admission_year))) {
            return Number(value.admission_year);
        }
        if (value?.admission_date) {
            const d = new Date(value.admission_date);
            if (!Number.isNaN(d.getTime())) return d.getFullYear();
        }
    } catch (_e) {}
    return new Date().getFullYear();
};

const registerStudentCore = async (connection, value) => {
    const {
        first_name, last_name, date_of_birth, gender,
        class_id, academic_year, year_of_study, admission_date,
        blood_group, nationality, religion, address, phone, email,
        medical_conditions, supervisor
    } = value;

    // Verify class exists
    const [classResult] = await connection.execute(
        'SELECT id, name, level FROM classes WHERE id = ? AND is_active = TRUE',
        [class_id]
    );
    if (classResult.length === 0) {
        throw new Error('Selected class not found');
    }

    // Verify academic year exists
    const [yearResult] = await connection.execute(
        'SELECT id FROM academic_years WHERE year_name = ? AND is_active = TRUE',
        [academic_year]
    );
    if (yearResult.length === 0) {
        throw new Error('Selected academic year not found or is inactive');
    }

    const admissionYear = resolveAdmissionYear(value);

    // Generate admission number (transaction + locking inside admission_sequences)
    const admissionGen = await generateAdmissionNumber(connection, admissionYear);

    // Generate parent access password (shown once) and hash it
    const parentTempPassword = generateStrongPassword(12);
    const parentPasswordHash = await bcrypt.hash(parentTempPassword, 12);

    // Generate student number (STU####) and create student user account
    const studentNumber = await generateStudentNumber();
    const username = studentNumber.toLowerCase();

    // Student default password: keep existing behavior (DOB as YYYYMMDD) but do not return it by default.
    const dobDate = typeof date_of_birth === 'string' ? new Date(date_of_birth) : date_of_birth;
    const studentDefaultPassword = dobDate.toISOString().split('T')[0].replace(/-/g, '');
    const hashedPassword = await bcrypt.hash(studentDefaultPassword, 12);

    // Create user account for student
    const [userResult] = await connection.execute(
        `
        INSERT INTO users (
            username, email, password, role, first_name, last_name,
            firstName, lastName, phone, address, is_active
        ) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, TRUE)
        `,
        [
            username,
            email || `${username}@student.school.com`,
            hashedPassword,
            first_name,
            last_name,
            first_name,
            last_name,
            phone || null,
            address || null
        ]
    );

    const userId = userResult.insertId;

    // Create student record
    const [studentResult] = await connection.execute(
        `
        INSERT INTO students (
            user_id, student_id, admission_number, admission_year,
            parent_password_hash, parent_last_password_reset_at, parent_password_must_change, parent_password_changed_at,
            date_of_birth, gender,
            class_id, year_of_study, admission_date,
            blood_group, nationality, religion, emergency_contact,
            medical_conditions, status
        ) VALUES (?, ?, ?, ?, ?, NOW(), 1, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `,
        [
            userId,
            studentNumber,
            admissionGen.admission_number,
            admissionGen.admission_year,
            parentPasswordHash,
            dobDate,
            gender,
            class_id,
            year_of_study,
            admission_date,
            blood_group ?? null,
            nationality ?? 'Tanzanian',
            religion ?? null,
            phone ?? null,
            medical_conditions ?? null,
        ]
    );

    const studentDbId = studentResult.insertId;

    // Create supervisor record
    const [supervisorResult] = await connection.execute(
        `
        INSERT INTO supervisors (
            first_name, last_name, relationship,
            phone, email, address, occupation, workplace
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            supervisor.first_name,
            supervisor.last_name,
            supervisor.relationship,
            supervisor.phone,
            supervisor.email || null,
            supervisor.address || null,
            supervisor.occupation || null,
            supervisor.workplace || null
        ]
    );

    const supervisorId = supervisorResult.insertId;

    // Link supervisor to student
    await connection.execute(
        `
        INSERT INTO student_supervisors (student_id, supervisor_id, is_primary_supervisor)
        VALUES (?, ?, TRUE)
        `,
        [studentDbId, supervisorId]
    );

    return {
        studentDbId,
        studentNumber,
        admissionNumber: admissionGen.admission_number,
        admissionYear: admissionGen.admission_year,
        parentTempPassword,
        username,
        studentDefaultPassword,
        className: classResult[0].name,
    };
};

const handleStudentRegister = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { error, value } = newStudentSchema.validate(req.body);
        if (error) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Ensure schema needed for admission sequence + parent access exists before starting a transaction
        // (DDL in MySQL can cause implicit commits, so we do it before beginTransaction).
        await ensureParentAccessSchema(connection);

        await connection.beginTransaction();
        let created;
        try {
            created = await registerStudentCore(connection, value);
        } catch (e) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({ success: false, message: e.message || 'Registration failed' });
        }

        await connection.commit();
        connection.release();

        return res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            data: {
                id: created.studentDbId,
                student_number: created.studentNumber,
                student_username: created.username,
                admission_number: created.admissionNumber,
                admission_year: created.admissionYear,
                parent_temp_password: created.parentTempPassword, // returned once
                student: {
                    class: created.className
                }
            }
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Student admission error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to register student',
            error: error.message
        });
    }
};

/**
 * POST /api/students/admit - Register new student
 */
router.post('/admit', authenticate, requireStudentAdmissionAccess, handleStudentRegister);

/**
 * POST /api/students/register - alias of admit (no change to frontend required)
 */
router.post('/register', authenticate, requireStudentAdmissionAccess, handleStudentRegister);

/**
 * POST /api/students/:id/reset-parent-password
 * Admin-only: generates a new parent password (returned once) and stores only the hash.
 */
router.post('/:id/reset-parent-password', authenticate, requireAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await ensureParentAccessSchema(connection);

        const studentId = Number(req.params.id);
        if (!studentId) {
            connection.release();
            return res.status(400).json({ success: false, message: 'Invalid student id' });
        }

        const tempPassword = generateStrongPassword(12);
        const passwordHash = await bcrypt.hash(tempPassword, 12);

        await connection.execute(
            `UPDATE students
             SET parent_password_hash = ?,
                 parent_last_password_reset_at = NOW(),
                 parent_password_must_change = 1,
                 parent_password_changed_at = NULL
             WHERE id = ?`,
            [passwordHash, studentId]
        );

        connection.release();
        return res.json({
            success: true,
            message: 'Parent password reset successfully',
            data: {
                student_id: studentId,
                parent_temp_password: tempPassword,
            }
        });
    } catch (error) {
        connection.release();
        console.error('Reset parent password error:', error);
        return res.status(500).json({ success: false, message: 'Failed to reset parent password' });
    }
});

/**
 * GET /api/students - Get all students
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { class_id, status, search } = req.query;

        let query = `
            SELECT 
                s.*,
                u.username,
                u.first_name,
                u.last_name,
                u.email as user_email,
                c.name as class_name,
                c.level as class_level
            FROM students s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (class_id) {
            query += ' AND s.class_id = ?';
            params.push(class_id);
        }

        if (status) {
            query += ' AND s.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (s.student_id LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam);
        }

        query += ' ORDER BY s.id DESC';

        const connection = await pool.getConnection();
        const [students] = await connection.execute(query, params);
        connection.release();

        return res.json({
            success: true,
            data: students,
            count: students.length
        });

    } catch (error) {
        console.error('Get students error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch students'
        });
    }
});

/**
 * GET /api/students/:id - Get student by ID
 */
router.get('/:id(\\d+)', authenticate, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);

        const connection = await pool.getConnection();
        
        const [students] = await connection.execute(`
            SELECT 
                s.*,
                u.username,
                u.first_name,
                u.last_name,
                u.email as user_email,
                c.name as class_name,
                c.level as class_level
            FROM students s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `, [studentId]);
        
        if (students.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        const student = students[0];
        
        // Get supervisors
        const [supervisors] = await connection.execute(`
            SELECT 
                sup.*,
                ss.is_primary_supervisor
            FROM supervisors sup
            INNER JOIN student_supervisors ss ON sup.id = ss.supervisor_id
            WHERE ss.student_id = ?
        `, [studentId]);
        
        connection.release();
        
        student.supervisors = supervisors;

        return res.json({
            success: true,
            data: student
        });

    } catch (error) {
        console.error('Get student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch student details'
        });
    }
});

/**
 * PUT /api/students/:id - Update student
 */
router.put('/:id(\\d+)', authenticate, requireAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const studentId = parseInt(req.params.id);

        // Verify student exists
        const [existing] = await connection.execute(
            'SELECT id FROM students WHERE id = ?',
            [studentId]
        );

        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const updates = [];
        const values = [];
        const allowedFields = [
            'class_id', 'blood_group', 'nationality', 'religion',
            'emergency_contact', 'medical_conditions', 'status'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });

        if (updates.length === 0) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(studentId);

        await connection.execute(
            `UPDATE students SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        connection.release();

        return res.json({
            success: true,
            message: 'Student updated successfully'
        });

    } catch (error) {
        connection.release();
        console.error('Update student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update student'
        });
    }
});

/**
 * DELETE /api/students/:id - Delete student (soft delete)
 */
router.delete('/:id(\\d+)', authenticate, requireAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const studentId = parseInt(req.params.id);

        await connection.beginTransaction();

        // Verify and update student
        const [result] = await connection.execute(
            'UPDATE students SET status = "suspended", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [studentId]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Deactivate user account
        await connection.execute(
            'UPDATE users u JOIN students s ON u.id = s.user_id SET u.is_active = FALSE WHERE s.id = ?',
            [studentId]
        );

        await connection.commit();
        connection.release();

        return res.json({
            success: true,
            message: 'Student deleted successfully'
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Delete student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete student'
        });
    }
});

/**
 * GET /api/students/stats/summary - Get student statistics
 */
router.get('/stats/summary', authenticate, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [stats] = await connection.execute(`
            SELECT
                COUNT(*) as total_students,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_students,
                SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) as male_count,
                SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) as female_count,
                COUNT(DISTINCT class_id) as total_classes
            FROM students
        `);

        connection.release();

        return res.json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

/**
 * GET /api/students/classes - Get classes for student registration
 * Only returns Form 1 (level 1) and Form 5 (level 5) for new student registration
 */
router.get('/classes', authenticate, requireAdmin, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [classes] = await connection.execute(`
            SELECT 
                c.id,
                c.name,
                c.level,
                c.capacity,
                c.academic_year,
                COUNT(s.id) as current_students
            FROM classes c
            LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
            WHERE c.is_active = TRUE AND c.level IN (1, 5)
            GROUP BY c.id, c.name, c.level, c.capacity, c.academic_year
            ORDER BY c.level, c.name
        `);
        
        connection.release();

        return res.json({
            success: true,
            data: classes
        });

    } catch (error) {
        console.error('Get classes error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch classes'
        });
    }
});

/**
 * GET /api/students/academic-years - Get academic years
 */
router.get('/academic-years', authenticate, requireRole('admin', 'teacher'), async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [years] = await connection.execute(`
            SELECT 
                id,
                year_name,
                start_date,
                end_date,
                is_current
            FROM academic_years
            WHERE is_active = TRUE
            ORDER BY start_date DESC
        `);
        
        connection.release();

        return res.json({
            success: true,
            data: years
        });

    } catch (error) {
        console.error('Get academic years error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch academic years'
        });
    }
});

/**
 * GET /api/students/search - Search students for promotion
 */
router.get('/search', authenticate, requireAdmin, async (req, res) => {
    try {
        const { query, class_id, academic_year } = req.query;
        const connection = await pool.getConnection();
        
        let sql = `
            SELECT 
                s.id,
                s.student_id,
                s.admission_number,
                s.status,
                s.year_of_study,
                u.first_name,
                u.last_name,
                c.name as current_class,
                c.level as current_level,
                c.academic_year
            FROM students s
            LEFT JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.status = 'active'
        `;
        
        const params = [];
        
        if (query) {
            sql += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR s.student_id LIKE ? OR s.admission_number LIKE ?)`;
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        if (class_id) {
            sql += ` AND s.class_id = ?`;
            params.push(class_id);
        }
        
        if (academic_year) {
            sql += ` AND c.academic_year = ?`;
            params.push(academic_year);
        }
        
        sql += ` ORDER BY c.level, u.first_name, u.last_name LIMIT 100`;
        
        const [students] = await connection.execute(sql, params);
        connection.release();

        return res.json({
            success: true,
            data: students
        });

    } catch (error) {
        console.error('Search students error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to search students'
        });
    }
});

/**
 * POST /api/students/promote - Promote student to next class
 */
router.post('/promote', authenticate, requireAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { student_id, new_class_id, new_academic_year, status, remarks } = req.body;
        
        if (!student_id || !new_class_id || !new_academic_year) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Student ID, new class, and new academic year are required'
            });
        }
        
        await connection.beginTransaction();
        
        // Verify student exists
        const [student] = await connection.execute(
            'SELECT id, class_id, year_of_study FROM students WHERE id = ?',
            [student_id]
        );
        
        if (student.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        // Verify new class exists
        const [newClass] = await connection.execute(
            'SELECT id, level FROM classes WHERE id = ? AND is_active = TRUE',
            [new_class_id]
        );
        
        if (newClass.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'New class not found'
            });
        }
        
        // Update student record
        await connection.execute(
            `UPDATE students 
             SET class_id = ?, 
                 year_of_study = year_of_study + 1, 
                 status = ?,
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [new_class_id, status || 'active', student_id]
        );
        
        // Log the promotion (if you have a student_history or promotions table)
        // For now, we'll skip this as we removed multi-school tables
        
        await connection.commit();
        connection.release();

        return res.json({
            success: true,
            message: `Student ${status || 'promoted'} successfully`
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Promote student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to promote student'
        });
    }
});

/**
 * POST /api/students/promote-all - Trigger automatic promotion for all students
 * Manual override for admin to promote all students to next academic year
 */
router.post('/promote-all', authenticate, requireAdmin, async (req, res) => {
    const { manualPromote } = require('../services/promotionService');
    return manualPromote(req, res);
});

/**
 * POST /api/students/transfer-out - Transfer student out to another school
 */
router.post('/transfer-out', authenticate, requireAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { student_id, to_school, transfer_date, reason, documents } = req.body;
        
        if (!student_id || !to_school || !transfer_date || !reason) {
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Student ID, destination school, transfer date, and reason are required'
            });
        }
        
        await connection.beginTransaction();
        
        // Verify student exists and is active
        const [student] = await connection.execute(
            'SELECT id, student_id, status FROM students WHERE id = ?',
            [student_id]
        );
        
        if (student.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        if (student[0].status === 'transferred_out') {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
                success: false,
                message: 'Student has already been transferred out'
            });
        }
        
        // Update student status to transferred_out
        await connection.execute(
            `UPDATE students 
             SET status = 'transferred_out',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [student_id]
        );
        
        // Create transfer record (if you have a transfers table)
        // For now, we'll store in a simple JSON or text field
        // You might want to create a dedicated transfers table later
        
        await connection.commit();
        connection.release();

        return res.json({
            success: true,
            message: `Student transferred out to ${to_school} successfully`,
            data: {
                student_id: student[0].student_id,
                to_school,
                transfer_date,
                reason
            }
        });

    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('Transfer out error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to transfer student out'
        });
    }
});

module.exports = router;
