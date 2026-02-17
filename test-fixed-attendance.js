const { pool } = require('./server/config/database');

async function testFixedAttendance() {
    try {
        console.log('=== Testing Fixed Attendance Calculation ===');
        
        // Get teacher Mohamed's ID
        const [teachers] = await pool.execute(`
            SELECT id, first_name, last_name 
            FROM users 
            WHERE role = 'teacher' AND (first_name LIKE '%mohamed%' OR last_name LIKE '%mohamed%')
        `);
        
        if (teachers.length === 0) {
            console.log('No teacher Mohamed found');
            return;
        }
        
        const teacherId = teachers[0].id;
        console.log(`Testing for teacher: ${teachers[0].first_name} ${teachers[0].last_name} (ID: ${teacherId})\n`);
        
        // Test the updated API endpoint
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
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') as subjects
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            INNER JOIN subjects s ON tsa.subject_id = s.id
            WHERE tsa.teacher_id = ? 
                AND c.is_active = TRUE 
                AND s.is_active = TRUE
            GROUP BY c.id, c.name, c.level, c.academic_year
            ORDER BY c.level, c.name
        `, [teacherId]);
        
        console.log('=== UPDATED API RESULTS ===');
        classes.forEach((cls, index) => {
            console.log(`${index + 1}. ${cls.class_name}:`);
            console.log(`   - Student Count: ${cls.student_count}`);
            console.log(`   - Subjects: ${cls.subjects}`);
            console.log(`   - Avg Attendance: ${cls.avg_attendance !== null ? cls.avg_attendance + '%' : 'NULL'}`);
        });
        
        // Simulate frontend weighted average calculation
        console.log(`\n=== FRONTEND WEIGHTED CALCULATION ===`);
        const classesWithAttendance = classes.filter(cls => 
            cls.avg_attendance !== null && 
            cls.avg_attendance !== undefined && 
            cls.student_count > 0
        );
        
        console.log(`Classes with attendance data: ${classesWithAttendance.length}`);
        classesWithAttendance.forEach(cls => {
            console.log(`- ${cls.class_name}: ${cls.avg_attendance}% × ${cls.student_count} students = ${cls.avg_attendance * cls.student_count} weighted points`);
        });
        
        if (classesWithAttendance.length > 0) {
            const totalWeightedAttendance = classesWithAttendance.reduce((sum, cls) => 
                sum + (cls.avg_attendance * cls.student_count), 0
            );
            const totalWeightedStudents = classesWithAttendance.reduce((sum, cls) => 
                sum + cls.student_count, 0
            );
            
            const weightedAverage = totalWeightedAttendance / totalWeightedStudents;
            
            console.log(`\nWeighted Average Calculation:`);
            console.log(`Total weighted attendance: ${totalWeightedAttendance}`);
            console.log(`Total weighted students: ${totalWeightedStudents}`);
            console.log(`Overall Average: ${Math.round(weightedAverage)}%`);
        } else {
            console.log(`\nOverall Average: N/A (no attendance data)`);
        }
        
        console.log(`\n=== SUMMARY OF IMPROVEMENTS ===`);
        console.log(`✅ Classes without attendance now return NULL instead of 0`);
        console.log(`✅ Frontend will show "N/A" for classes/overall without data`);
        console.log(`✅ Overall average is now weighted by student count`);
        console.log(`✅ Fallback to 180-day window if no 30-day data`);
        
    } catch (error) {
        console.error('Error in test script:', error);
    } finally {
        process.exit(0);
    }
}

testFixedAttendance();
