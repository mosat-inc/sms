const express = require('express');
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const { requireOnPremises } = require('../middleware/premisesMiddleware');
const { createParentNotificationForStudent } = require('../services/notificationsService');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(Auth.authenticateToken);

// GET /api/classes - Get all classes (for admin/teacher assignment purposes)
router.get('/', async (req, res) => {
    try {
        // Check if user has appropriate permissions
        if (req.user?.role !== 'admin' && req.user?.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const [classes] = await pool.execute(`
            SELECT 
                c.id,
                c.name,
                c.level,
                c.capacity,
                c.academic_year,
                c.is_active,
                (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'active') as student_count
            FROM classes c
            WHERE c.is_active = TRUE
            ORDER BY c.level, c.name
        `);
        
        res.json({
            success: true,
            message: 'Classes retrieved successfully',
            data: classes
        });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve classes'
        });
    }
});

// GET /api/classes/my-classes - Get teacher's assigned classes
router.get('/my-classes', async (req, res) => {
    try {
        const teacherId = req.user?.id;
        
        console.log('Fetching classes for teacher ID:', teacherId);
        
        // Get teacher's actual assigned classes from teacher_subject_assignments table
        const [classes] = await pool.execute(`
            SELECT DISTINCT
                c.id,
                c.name as class_name,
                c.level,
                c.academic_year,
                (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'active') as student_count,
                (
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 FROM attendance a
                            JOIN students s2 ON a.student_id = s2.id
                            WHERE s2.class_id = c.id 
                              AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                        ) THEN (
                            SELECT ROUND(AVG(CASE 
                                WHEN a.status = 'present' THEN 100
                                WHEN a.status = 'late' THEN 75
                                ELSE 0
                            END), 1)
                            FROM attendance a
                            JOIN students s ON a.student_id = s.id
                            WHERE s.class_id = c.id
                              AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                        )
                        WHEN EXISTS (
                            SELECT 1 FROM attendance a
                            JOIN students s3 ON a.student_id = s3.id
                            WHERE s3.class_id = c.id
                              AND a.date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
                        ) THEN (
                            SELECT ROUND(AVG(CASE 
                                WHEN a.status = 'present' THEN 100
                                WHEN a.status = 'late' THEN 75
                                ELSE 0
                            END), 1)
                            FROM attendance a
                            JOIN students s ON a.student_id = s.id
                            WHERE s.class_id = c.id
                              AND a.date >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
                        )
                        ELSE NULL
                    END
                ) as avg_attendance,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') as subjects,
                (
                    SELECT s.name 
                    FROM teacher_subject_assignments tsa2 
                    INNER JOIN subjects s ON tsa2.subject_id = s.id 
                    WHERE tsa2.teacher_id = ? AND tsa2.class_id = c.id 
                    LIMIT 1
                ) as subject_name
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            INNER JOIN subjects s ON tsa.subject_id = s.id
            WHERE tsa.teacher_id = ? 
                AND c.is_active = TRUE 
                AND s.is_active = TRUE
            GROUP BY c.id, c.name, c.level, c.academic_year
            ORDER BY c.level, c.name
        `, [teacherId, teacherId]);
        
        console.log('Classes found for teacher:', classes.length);
        console.log('Classes data:', classes.map(c => ({ id: c.id, name: c.class_name, subjects: c.subjects })));

        res.json({
            success: true,
            message: 'Classes retrieved successfully',
            data: classes
        });
    } catch (error) {
        console.error('Get my classes error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve classes'
        });
    }
});

// GET /api/classes/:classId - Get specific class details
router.get('/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const [classData] = await pool.execute(`
            SELECT 
                c.*,
                'Mathematics' as subject_name,
                u.first_name as teacher_first_name,
                u.last_name as teacher_last_name
            FROM classes c
            LEFT JOIN users u ON c.class_teacher_id = u.id
            WHERE c.id = ? AND c.is_active = TRUE
        `, [classId]);

        if (classData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        res.json({
            success: true,
            message: 'Class data retrieved successfully',
            data: classData[0]
        });
    } catch (error) {
        console.error('Get class error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve class data'
        });
    }
});

// GET /api/classes/:classId/stats - Get class statistics
router.get('/:classId/stats', async (req, res) => {
    try {
        const { classId } = req.params;
        
        // Get total students
        const [studentCount] = await pool.execute(`
            SELECT COUNT(*) as count FROM students 
            WHERE class_id = ? AND status = 'active'
        `, [classId]);

        // Sample stats - in real implementation, calculate from attendance table
        const stats = {
            totalStudents: studentCount[0].count,
            presentToday: Math.floor(studentCount[0].count * 0.85),
            pendingAssignments: 3,
            avgGrade: 78
        };

        res.json({
            success: true,
            message: 'Class stats retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Get class stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve class stats'
        });
    }
});

// GET /api/classes/:classId/students - Get students in a class
router.get('/:classId/students', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const [students] = await pool.execute(`
            SELECT 
                s.id, s.student_id, s.admission_number, s.date_of_birth,
                s.gender, s.blood_group, s.nationality, s.religion, 
                s.admission_date, s.status, s.medical_conditions,
                u.first_name, u.last_name, u.email, u.phone, u.address,
                c.name as class_name, c.level as class_level,
                TIMESTAMPDIFF(YEAR, s.date_of_birth, CURDATE()) as age
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.class_id = ? AND s.status = 'active'
            ORDER BY u.first_name, u.last_name
        `, [classId]);

        res.json({
            success: true,
            message: 'Students retrieved successfully',
            data: students
        });
    } catch (error) {
        console.error('Get class students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve students'
        });
    }
});

// GET /api/classes/:classId/recent-activity - Get recent class activity
router.get('/:classId/recent-activity', async (req, res) => {
    try {
        // Return sample activity data
        // In real implementation, query various tables for recent activities
        const activities = [
            {
                icon: 'fas fa-clipboard-check',
                text: 'Attendance marked for today',
                time: '2 hours ago'
            },
            {
                icon: 'fas fa-tasks',
                text: 'New assignment: Chapter 5 exercises',
                time: '1 day ago'
            },
            {
                icon: 'fas fa-graduation-cap',
                text: 'Math quiz results published',
                time: '2 days ago'
            },
            {
                icon: 'fas fa-bullhorn',
                text: 'Announcement: Parent meeting next week',
                time: '3 days ago'
            }
        ];

        res.json({
            success: true,
            message: 'Recent activity retrieved successfully',
            data: activities
        });
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve recent activity'
        });
    }
});

// POST /api/classes/:classId/attendance - Mark attendance
router.post('/:classId/attendance', requireOnPremises({ allowAdminBypass: true }), async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { classId } = req.params;
        const { date, session, attendance_records } = req.body;
        const teacherId = req.user?.id;

        // Get the current date for validating if edit is allowed
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

        // Prevent taking afternoon attendance before afternoon for today's date (teachers only)
        if (session === 'afternoon' && date === today && req.user?.role !== 'admin') {
            const hour = new Date().getHours();
            const afternoonStartHour = Number(process.env.ATTENDANCE_AFTERNOON_START_HOUR || 12);
            if (hour < afternoonStartHour) {
                return res.status(403).json({
                    success: false,
                    message: `Afternoon attendance is only available after ${String(afternoonStartHour).padStart(2, '0')}:00 for today.`
                });
            }
        }
        
        // Only allow editing attendance for today and yesterday unless admin
        const isEditable = date === today || date === yesterday || req.user?.role === 'admin';
        if (!isEditable) {
            return res.status(403).json({
                success: false,
                message: 'You can only modify attendance for today and yesterday. Older records require admin approval.'
            });
        }

        await connection.beginTransaction();

        // Delete existing attendance for this date, session, and class
        await connection.execute(
            'DELETE FROM attendance WHERE class_id = ? AND date = ? AND session = ?',
            [classId, date, session]
        );

        // Get current timestamp for record keeping
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Insert new attendance records
        for (const record of attendance_records) {
            await connection.execute(`
                INSERT INTO attendance (
                    student_id, class_id, date, session, status, notes, marked_by, 
                    marked_at, is_editable, admin_locked
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                record.student_id,
                classId,
                date,
                session,
                record.status,
                record.notes || null,
                teacherId,
                timestamp,
                true,  // Initially editable
                false  // Not admin locked by default
            ]);
        }

        await connection.commit();

        // Create parent notifications for absences and lateness (targeted to the student in parent portal)
        // NOTE: Parent portal authentication is per-student; we attach notifications to student_id.
        try {
          const notable = (attendance_records || []).filter((r) => r?.status === 'absent' || r?.status === 'late' || r?.status === 'excused');
          const sessionLabel = session === 'afternoon' ? 'Afternoon' : 'Morning';
          for (const r of notable) {
            const statusLabel =
              r.status === 'absent' ? 'Absent' : r.status === 'late' ? 'Late' : r.status === 'excused' ? 'Excused' : 'Update';
            await createParentNotificationForStudent({
              studentId: r.student_id,
              type: 'attendance',
              priority: r.status === 'absent' ? 'high' : 'medium',
              title: `Attendance ${statusLabel} (${sessionLabel})`,
              message: `Attendance status for ${sessionLabel.toLowerCase()} session on ${date}: ${statusLabel}.`,
              data: { class_id: Number(classId), date, session, status: r.status, notes: r.notes || null },
            });
          }
        } catch (notifyErr) {
          console.warn('Attendance notifications skipped:', notifyErr.message);
        }

        res.json({
            success: true,
            message: 'Attendance marked successfully'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Mark attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance'
        });
    } finally {
        connection.release();
    }
});

// POST /api/classes/:classId/subject-attendance - Mark per-subject (period) attendance
router.post('/:classId/subject-attendance', requireOnPremises({ allowAdminBypass: true }), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { classId } = req.params;
    const { date, subject_id, period_label, start_time, end_time, attendance_records } = req.body || {};

    if (!date || !subject_id || !period_label || !Array.isArray(attendance_records)) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Teacher scoping: must be assigned to this class+subject unless admin.
    if (req.user?.role === 'teacher') {
      const [ok] = await connection.execute(
        `SELECT 1 FROM teacher_subject_assignments WHERE teacher_id = ? AND class_id = ? AND subject_id = ? LIMIT 1`,
        [req.user.id, Number(classId), Number(subject_id)]
      );
      if (!ok.length) {
        return res.status(403).json({ success: false, message: 'Access denied: not assigned to this subject for the class.' });
      }
    } else if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await connection.beginTransaction();

    await connection.execute(
      `DELETE FROM subject_attendance WHERE class_id = ? AND subject_id = ? AND date = ? AND period_label = ?`,
      [Number(classId), Number(subject_id), date, String(period_label)]
    );

    for (const r of attendance_records) {
      await connection.execute(
        `
        INSERT INTO subject_attendance
          (student_id, class_id, subject_id, date, period_label, start_time, end_time, status, notes, marked_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          Number(r.student_id),
          Number(classId),
          Number(subject_id),
          date,
          String(period_label),
          start_time || null,
          end_time || null,
          r.status || 'present',
          r.notes || null,
          req.user.id,
        ]
      );
    }

    await connection.commit();
    return res.json({ success: true, message: 'Subject attendance saved' });
  } catch (error) {
    await connection.rollback();
    console.error('Subject attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save subject attendance' });
  } finally {
    connection.release();
  }
});

// GET /api/classes/:classId/subject-attendance - Read subject attendance by date/subject/period
router.get('/:classId/subject-attendance', async (req, res) => {
  try {
    const { classId } = req.params;
    const { date, subject_id, period_label, start_date, end_date } = req.query || {};

    const where = ['sa.class_id = ?'];
    const params = [Number(classId)];

    if (date) {
      where.push('sa.date = ?');
      params.push(date);
    } else if (start_date && end_date) {
      where.push('sa.date BETWEEN ? AND ?');
      params.push(start_date, end_date);
    }

    if (subject_id) {
      where.push('sa.subject_id = ?');
      params.push(Number(subject_id));
    }
    if (period_label) {
      where.push('sa.period_label = ?');
      params.push(String(period_label));
    }

    // Teacher scoping: assigned classes only
    if (req.user?.role === 'teacher') {
      where.push(`sa.class_id IN (
        SELECT DISTINCT tsa.class_id
        FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = ?
      )`);
      params.push(req.user.id);
    } else if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [rows] = await pool.execute(
      `
      SELECT
        sa.*,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        st.admission_number,
        sub.name as subject_name,
        CONCAT(m.first_name, ' ', m.last_name) as marked_by_name
      FROM subject_attendance sa
      JOIN students st ON st.id = sa.student_id
      JOIN users u ON u.id = st.user_id
      JOIN subjects sub ON sub.id = sa.subject_id
      LEFT JOIN users m ON m.id = sa.marked_by
      WHERE ${where.join(' AND ')}
      ORDER BY sa.date DESC, sa.period_label, u.first_name, u.last_name
      `,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get subject attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subject attendance' });
  }
});

// GET /api/classes/:classId/attendance - Get attendance records
router.get('/:classId/attendance', async (req, res) => {
    try {
        const { classId } = req.params;
        const { date, session, start_date, end_date } = req.query;

        let sql = `
            SELECT 
                a.*,
                s.student_id,
                u.first_name,
                u.last_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.class_id = ?
        `;
        
        const params = [classId];

        if (date) {
            sql += ` AND a.date = ?`;
            params.push(date);
        } else if (start_date && end_date) {
            sql += ` AND a.date BETWEEN ? AND ?`;
            params.push(start_date, end_date);
        }

        if (session) {
            sql += ` AND a.session = ?`;
            params.push(session);
        }

        sql += ` ORDER BY a.date DESC, a.session, u.first_name, u.last_name`;

        const [attendance] = await pool.execute(sql, params);

        res.json({
            success: true,
            message: 'Attendance records retrieved successfully',
            data: attendance
        });
    } catch (error) {
        console.error('Get attendance error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance records',
            error: error.message
        });
    }
});

// POST /api/classes/:classId/assignments - Create new assignment
router.post('/:classId/assignments', async (req, res) => {
    try {
        const { classId } = req.params;
        const { title, description, due_date, max_points, assignment_type } = req.body;
        const teacherId = req.user?.id;

        const [result] = await pool.execute(`
            INSERT INTO assignments (class_id, teacher_id, title, description, due_date, max_points, assignment_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'published')
        `, [classId, teacherId, title, description, due_date, max_points || 100, assignment_type || 'homework']);

        res.status(201).json({
            success: true,
            message: 'Assignment created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create assignment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create assignment'
        });
    }
});

// GET /api/classes/:classId/assignments - Get class assignments
router.get('/:classId/assignments', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const [assignments] = await pool.execute(`
            SELECT 
                a.*,
                u.first_name as teacher_first_name,
                u.last_name as teacher_last_name,
                (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count
            FROM assignments a
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE a.class_id = ?
            ORDER BY a.due_date DESC
        `, [classId]);

        res.json({
            success: true,
            message: 'Assignments retrieved successfully',
            data: assignments
        });
    } catch (error) {
        console.error('Get assignments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve assignments'
        });
    }
});

// POST /api/classes/:classId/announcements - Create announcement
router.post('/:classId/announcements', async (req, res) => {
    try {
        const { classId } = req.params;
        const { title, content, priority, expires_at } = req.body;
        const teacherId = req.user?.id;

        const [result] = await pool.execute(`
            INSERT INTO announcements (class_id, teacher_id, title, content, priority, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [classId, teacherId, title, content, priority || 'medium', expires_at || null]);

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create announcement'
        });
    }
});

// GET /api/classes/:classId/announcements - Get class announcements
router.get('/:classId/announcements', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const [announcements] = await pool.execute(`
            SELECT 
                a.*,
                u.first_name as teacher_first_name,
                u.last_name as teacher_last_name
            FROM announcements a
            LEFT JOIN users u ON a.teacher_id = u.id
            WHERE a.class_id = ? AND a.is_active = TRUE
            AND (a.expires_at IS NULL OR a.expires_at > NOW())
            ORDER BY a.created_at DESC
        `, [classId]);

        res.json({
            success: true,
            message: 'Announcements retrieved successfully',
            data: announcements
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve announcements'
        });
    }
});

// GET /api/classes/:classId/attendance/dashboard - Get attendance dashboard data
router.get('/:classId/attendance/dashboard', async (req, res) => {
    try {
        const { classId } = req.params;
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's attendance summary for both sessions
        const [todaySummary] = await pool.execute(`
            SELECT 
                session,
                status,
                COUNT(*) as count
            FROM attendance a
            WHERE a.class_id = ? AND a.date = ?
            GROUP BY session, status
        `, [classId, today]);

        // Get this week's attendance trend
        const [weekTrend] = await pool.execute(`
            SELECT 
                date,
                session,
                status,
                COUNT(*) as count
            FROM attendance a
            WHERE a.class_id = ? 
            AND a.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY date, session, status
            ORDER BY date DESC
        `, [classId]);

        res.json({
            success: true,
            message: 'Attendance dashboard data retrieved successfully',
            data: {
                todaySummary,
                weekTrend
            }
        });
    } catch (error) {
        console.error('Get attendance dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance dashboard data'
        });
    }
});

// GET /api/classes/:classId/attendance/alerts - Get attendance alerts
router.get('/:classId/attendance/alerts', async (req, res) => {
    try {
        const { classId } = req.params;
        
        const [alerts] = await pool.execute(`
            SELECT 
                aa.*,
                s.student_id,
                u.first_name,
                u.last_name
            FROM attendance_alerts aa
            JOIN students s ON aa.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE s.class_id = ? AND aa.is_resolved = FALSE
            ORDER BY aa.created_at DESC
        `, [classId]);

        res.json({
            success: true,
            message: 'Attendance alerts retrieved successfully',
            data: alerts
        });
    } catch (error) {
        console.error('Get attendance alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve attendance alerts'
        });
    }
});

// POST /api/classes/:classId/attendance/alerts/:alertId/resolve - Resolve attendance alert
router.post('/:classId/attendance/alerts/:alertId/resolve', async (req, res) => {
    try {
        const { alertId } = req.params;
        const { resolution_notes } = req.body;
        const teacherId = req.user?.id;

        await pool.execute(`
            UPDATE attendance_alerts 
            SET is_resolved = TRUE, 
                resolved_by = ?,
                resolved_at = NOW(),
                resolution_notes = ?
            WHERE id = ?
        `, [teacherId, resolution_notes || null, alertId]);

        res.json({
            success: true,
            message: 'Alert resolved successfully'
        });
    } catch (error) {
        console.error('Resolve attendance alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve alert'
        });
    }
});

module.exports = router;
