const express = require('express');
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const { insertSampleData } = require('../utils/sample-data');
const router = express.Router();

// POST /api/dashboard/create-sample-data - Create sample data for testing
router.post('/create-sample-data', Auth.authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role;
        
        // Only admin can create sample data
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }
        
        const result = await insertSampleData();
        
        res.json({
            success: true,
            message: 'Sample data created successfully',
            data: result
        });
        
    } catch (error) {
        console.error('Create sample data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create sample data',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/dashboard/teacher-stats - Get comprehensive teacher dashboard statistics
router.get('/teacher-stats', Auth.authenticateToken, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const teacherRole = req.user.role;

        // Verify user is a teacher
        if (teacherRole !== 'teacher' && teacherRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Teacher or admin role required.'
            });
        }

        // Get teacher's profile
        const [teacherProfile] = await pool.execute(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email, u.phone, u.address,
                u.qualification, u.experience, u.department, u.position, u.bio,
                u.employee_id, u.specialization, u.experience_years, u.joining_date
            FROM users u
            WHERE u.id = ? AND u.role IN ('teacher', 'admin')
        `, [teacherId]);

        if (teacherProfile.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Teacher profile not found'
            });
        }

        const teacher = teacherProfile[0];

        // Debug logging
        console.log(`🔍 TEACHER DASHBOARD: Fetching assignments for teacher ID: ${teacherId}`);
        
        // Get subjects taught by this teacher from assignments table
        const [subjectsInfo] = await pool.execute(`
            SELECT DISTINCT 
                s.id, s.name, s.code, s.department,
                tsa.is_primary_teacher
            FROM teacher_subject_assignments tsa
            INNER JOIN subjects s ON tsa.subject_id = s.id
            WHERE tsa.teacher_id = ? AND s.is_active = TRUE
            ORDER BY s.name
        `, [teacherId]);
        
        console.log(`🔍 TEACHER DASHBOARD: Found ${subjectsInfo.length} subjects for teacher ${teacherId}:`, subjectsInfo);
        
        const subjectsTaught = subjectsInfo;

        // Get classes assigned to this teacher from assignments table
        const [classesInfo] = await pool.execute(`
            SELECT DISTINCT 
                c.id, c.name, c.level, c.capacity, c.academic_year
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            WHERE tsa.teacher_id = ? AND c.is_active = TRUE
            ORDER BY c.level, c.name
        `, [teacherId]);
        
        console.log(`🔍 TEACHER DASHBOARD: Found ${classesInfo.length} classes for teacher ${teacherId}:`, classesInfo);
        
        const classesAssigned = classesInfo.map(cls => cls.id);

        // Get detailed information about assigned classes with student counts
        let classDetails = [];
        let totalStudents = 0;
        
        if (classesAssigned.length > 0) {
            const placeholders = classesAssigned.map(() => '?').join(',');
            const [classDetailsInfo] = await pool.execute(`
                SELECT 
                    c.id, c.name, c.level, c.capacity, c.academic_year,
                    COUNT(s.id) as student_count
                FROM classes c
                LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
                WHERE c.id IN (${placeholders}) AND c.is_active = TRUE
                GROUP BY c.id, c.name, c.level, c.capacity, c.academic_year
                ORDER BY c.level, c.name
            `, classesAssigned);

            classDetails = classDetailsInfo;
            totalStudents = classDetailsInfo.reduce((sum, cls) => sum + parseInt(cls.student_count), 0);
        } else {
            // Fallback to classesInfo if no assignments exist
            classDetails = classesInfo.map(cls => ({
                ...cls,
                student_count: 0,
                description: null
            }));
        }

        // Get students in teacher's classes with detailed info
        let students = [];
        if (classesAssigned.length > 0) {
            const placeholders = classesAssigned.map(() => '?').join(',');
            const [studentsInfo] = await pool.execute(`
                SELECT 
                    s.id, s.student_id, s.admission_number,
                    u.first_name, u.last_name, u.email, u.phone,
                    s.date_of_birth, s.gender, s.admission_date, s.status,
                    c.name as class_name, c.level as class_level,
                    TIMESTAMPDIFF(YEAR, s.date_of_birth, CURDATE()) as age
                FROM students s
                JOIN users u ON s.user_id = u.id
                JOIN classes c ON s.class_id = c.id
                WHERE s.class_id IN (${placeholders}) AND s.status = 'active'
                ORDER BY c.level, c.name, u.first_name, u.last_name
            `, classesAssigned);

            students = studentsInfo;
        }

        // Get attendance statistics (mock data for now - you can implement actual attendance system later)
        let attendanceStats = {
            total_classes_held: 0,
            average_attendance_rate: 0,
            present_today: 0,
            absent_today: 0,
            attendance_by_class: []
        };

        // Calculate attendance stats per class
        if (classesAssigned.length > 0) {
            attendanceStats.attendance_by_class = classDetails.map(cls => {
                // Mock attendance calculation - replace with real attendance data
                const presentToday = Math.floor(cls.student_count * 0.85); // 85% average attendance
                const absentToday = cls.student_count - presentToday;
                
                return {
                    class_id: cls.id,
                    class_name: cls.name,
                    total_students: cls.student_count,
                    present_today: presentToday,
                    absent_today: absentToday,
                    attendance_rate: cls.student_count > 0 ? ((presentToday / cls.student_count) * 100).toFixed(1) : '0.0'
                };
            });

            attendanceStats.present_today = attendanceStats.attendance_by_class.reduce((sum, cls) => sum + cls.present_today, 0);
            attendanceStats.absent_today = attendanceStats.attendance_by_class.reduce((sum, cls) => sum + cls.absent_today, 0);
            attendanceStats.total_classes_held = classesAssigned.length * 30; // Estimated classes per month
            attendanceStats.average_attendance_rate = totalStudents > 0 ? 
                ((attendanceStats.present_today / totalStudents) * 100).toFixed(1) : '0.0';
        }

        // Get recent activities/announcements (you can expand this)
        const [recentActivities] = await pool.execute(`
            SELECT 
                'student_admission' as activity_type,
                CONCAT('New student ', u.first_name, ' ', u.last_name, ' admitted to ', c.name) as description,
                s.admission_date as activity_date
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON s.class_id = c.id
            WHERE s.class_id IN (${classesAssigned.length > 0 ? classesAssigned.map(() => '?').join(',') : 'NULL'})
                AND s.admission_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY s.admission_date DESC
            LIMIT 5
        `, classesAssigned.length > 0 ? classesAssigned : []);

        // Academic year information
        const [currentAcademicYear] = await pool.execute(`
            SELECT year_name, start_date, end_date, is_current
            FROM academic_years 
            WHERE is_current = TRUE AND is_active = TRUE
            LIMIT 1
        `);

        const response = {
            success: true,
            message: 'Teacher dashboard statistics retrieved successfully',
            data: {
                teacher_profile: {
                    id: teacher.id,
                    name: `${teacher.first_name} ${teacher.last_name}`,
                    email: teacher.email,
                    phone: teacher.phone,
                    employee_id: teacher.employee_id,
                    department: teacher.department,
                    position: teacher.position,
                    specialization: teacher.specialization,
                    experience_years: teacher.experience_years,
                    joining_date: teacher.joining_date
                },
                subjects_teaching: subjectsTaught,
                classes_assigned: classDetails,
                students: {
                    total_count: totalStudents,
                    list: students,
                    by_class: classDetails.map(cls => ({
                        class_name: cls.name,
                        level: cls.level,
                        student_count: cls.student_count,
                        capacity: cls.capacity
                    }))
                },
                attendance: attendanceStats,
                recent_activities: recentActivities,
                academic_year: currentAcademicYear[0] || null,
                summary: {
                    total_classes: classesAssigned.length,
                    total_students: totalStudents,
                    subjects_count: subjectsTaught.length,
                    average_attendance: attendanceStats.average_attendance_rate + '%',
                    classes_today: classesAssigned.length // You can implement actual schedule
                }
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Teacher dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve dashboard statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/dashboard/admin-stats - Get comprehensive admin dashboard statistics
router.get('/admin-stats', Auth.authenticateToken, async (req, res) => {
    try {
        const userRole = req.user.role;

        // Verify user is an admin
        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required.'
            });
        }

        // Get overall school statistics
        const [schoolStats] = await pool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM students WHERE status = 'active') as total_students,
                (SELECT COUNT(*) FROM users WHERE role = 'teacher' AND is_active = TRUE) as total_teachers,
                (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) as total_classes,
                (SELECT COUNT(*) FROM academic_years WHERE is_active = TRUE) as total_academic_years,
                (SELECT SUM(outstanding_balance) FROM student_financial_records) as total_outstanding_fees,
                (SELECT SUM(total_fees_paid) FROM student_financial_records) as total_fees_collected
        `);

        // Get students by class distribution
        const [studentsByClass] = await pool.execute(`
            SELECT 
                c.id, c.name, c.level, c.capacity,
                COUNT(s.id) as student_count,
                (c.capacity - COUNT(s.id)) as available_spots
            FROM classes c
            LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
            WHERE c.is_active = TRUE
            GROUP BY c.id, c.name, c.level, c.capacity
            ORDER BY c.level, c.name
        `);

        // Get recent admissions
        const [recentAdmissions] = await pool.execute(`
            SELECT 
                s.id, s.student_id, s.admission_number, s.admission_date,
                u.first_name, u.last_name, c.name as class_name
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON s.class_id = c.id
            WHERE s.admission_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY s.admission_date DESC
            LIMIT 10
        `);

        // Get financial summary
        const [financialSummary] = await pool.execute(`
            SELECT 
                academic_year,
                SUM(total_fees_required) as total_required,
                SUM(total_fees_paid) as total_paid,
                SUM(outstanding_balance) as total_outstanding,
                COUNT(*) as students_count
            FROM student_financial_records
            GROUP BY academic_year
            ORDER BY academic_year DESC
        `);

        // Get teachers and their assignments from the relational table
        const [teacherStats] = await pool.execute(`
            SELECT DISTINCT
                u.id, u.first_name, u.last_name, u.email, u.department,
                COUNT(DISTINCT tsa.class_id) as classes_count,
                COUNT(DISTINCT tsa.subject_id) as subjects_count
            FROM users u
            LEFT JOIN teacher_subject_assignments tsa ON u.id = tsa.teacher_id
            WHERE u.role = 'teacher' AND u.is_active = TRUE
            GROUP BY u.id, u.first_name, u.last_name, u.email, u.department
            ORDER BY u.first_name, u.last_name
        `);

        const response = {
            success: true,
            message: 'Admin dashboard statistics retrieved successfully',
            data: {
                overview: schoolStats[0],
                students_by_class: studentsByClass,
                recent_admissions: recentAdmissions,
                financial_summary: financialSummary,
                teachers: teacherStats.map(teacher => ({
                    id: teacher.id,
                    name: `${teacher.first_name} ${teacher.last_name}`,
                    email: teacher.email,
                    department: teacher.department,
                    classes_assigned: teacher.classes_count || 0,
                    subjects_taught: teacher.subjects_count || 0
                })),
                summary: {
                    total_students: schoolStats[0].total_students,
                    total_teachers: schoolStats[0].total_teachers,
                    total_classes: schoolStats[0].total_classes,
                    collection_rate: schoolStats[0].total_fees_collected && schoolStats[0].total_outstanding_fees ? 
                        (schoolStats[0].total_fees_collected / (schoolStats[0].total_fees_collected + schoolStats[0].total_outstanding_fees) * 100).toFixed(1) + '%' : '0%'
                }
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Admin dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve admin dashboard statistics',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// GET /api/dashboard/class-details/:classId - Get detailed information about a specific class
router.get('/class-details/:classId', Auth.authenticateToken, async (req, res) => {
    try {
        const classId = req.params.classId;
        const userRole = req.user.role;
        const userId = req.user.id;

        // For teachers, verify they have access to this class
        if (userRole === 'teacher') {
            const [teacherAccess] = await pool.execute(`
                SELECT COUNT(*) as has_access
                FROM teacher_subject_assignments tsa
                WHERE tsa.teacher_id = ? AND tsa.class_id = ?
            `, [userId, classId]);
            
            if (teacherAccess.length === 0 || teacherAccess[0].has_access === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You are not assigned to this class.'
                });
            }
        }

        // Get class information
        const [classInfo] = await pool.execute(`
            SELECT 
                c.id, c.name, c.level, c.capacity, c.academic_year, c.description,
                COUNT(s.id) as student_count,
                (c.capacity - COUNT(s.id)) as available_spots
            FROM classes c
            LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
            WHERE c.id = ? AND c.is_active = TRUE
            GROUP BY c.id
        `, [classId]);

        if (classInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Class not found'
            });
        }

        // Get students in this class
        const [students] = await pool.execute(`
            SELECT 
                s.id, s.student_id, s.admission_number,
                u.first_name, u.last_name, u.email, u.phone,
                s.date_of_birth, s.gender, s.admission_date, s.status,
                TIMESTAMPDIFF(YEAR, s.date_of_birth, CURDATE()) as age,
                sfr.outstanding_balance
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN student_financial_records sfr ON s.id = sfr.student_id 
                AND sfr.academic_year = (SELECT year_name FROM academic_years WHERE is_current = TRUE LIMIT 1)
            WHERE s.class_id = ? AND s.status = 'active'
            ORDER BY u.first_name, u.last_name
        `, [classId]);

        // Get class financial summary
        const [financialSummary] = await pool.execute(`
            SELECT 
                COUNT(*) as students_with_records,
                SUM(sfr.total_fees_required) as total_required,
                SUM(sfr.total_fees_paid) as total_paid,
                SUM(sfr.outstanding_balance) as total_outstanding
            FROM student_financial_records sfr
            JOIN students s ON sfr.student_id = s.id
            WHERE s.class_id = ? AND s.status = 'active'
                AND sfr.academic_year = (SELECT year_name FROM academic_years WHERE is_current = TRUE LIMIT 1)
        `, [classId]);

        res.json({
            success: true,
            message: 'Class details retrieved successfully',
            data: {
                class_info: classInfo[0],
                students: students,
                financial_summary: financialSummary[0] || {
                    students_with_records: 0,
                    total_required: 0,
                    total_paid: 0,
                    total_outstanding: 0
                },
                statistics: {
                    total_students: students.length,
                    male_students: students.filter(s => s.gender === 'Male').length,
                    female_students: students.filter(s => s.gender === 'Female').length,
                    students_with_fees_owing: students.filter(s => parseFloat(s.outstanding_balance || 0) > 0).length
                }
            }
        });

    } catch (error) {
        console.error('Class details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve class details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
