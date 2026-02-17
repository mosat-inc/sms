const { pool } = require('./server/config/database');

async function debugAttendanceCalculation() {
    try {
        console.log('=== Debug Attendance Calculation ===');
        
        // Get teacher Mohamed's ID first
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
        console.log(`Teacher: ${teachers[0].first_name} ${teachers[0].last_name} (ID: ${teacherId})`);
        
        // Get all classes assigned to this teacher with detailed attendance data
        const [classes] = await pool.execute(`
            SELECT DISTINCT
                c.id,
                c.name as class_name,
                c.level,
                c.academic_year,
                (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'active') as student_count,
                (
                    SELECT ROUND(AVG(CASE 
                        WHEN a.status = 'present' THEN 100
                        WHEN a.status = 'late' THEN 75
                        ELSE 0
                    END), 1)
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    WHERE s.class_id = c.id
                    AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ) as avg_attendance_30_days,
                (
                    SELECT ROUND(AVG(CASE 
                        WHEN a.status = 'present' THEN 100
                        WHEN a.status = 'late' THEN 75
                        ELSE 0
                    END), 1)
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    WHERE s.class_id = c.id
                ) as avg_attendance_all_time,
                (
                    SELECT COUNT(DISTINCT a.date)
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    WHERE s.class_id = c.id
                    AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ) as attendance_days_30,
                (
                    SELECT COUNT(*)
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    WHERE s.class_id = c.id
                    AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                ) as total_attendance_records_30,
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
        
        console.log(`\nFound ${classes.length} classes for teacher:`);
        
        let totalAttendanceSum = 0;
        let classesWithData = 0;
        
        classes.forEach((cls, index) => {
            console.log(`\n${index + 1}. Class: ${cls.class_name}`);
            console.log(`   - Student Count: ${cls.student_count}`);
            console.log(`   - Subjects: ${cls.subjects}`);
            console.log(`   - Attendance Days (30d): ${cls.attendance_days_30}`);
            console.log(`   - Total Records (30d): ${cls.total_attendance_records_30}`);
            console.log(`   - Avg Attendance (30d): ${cls.avg_attendance_30_days}%`);
            console.log(`   - Avg Attendance (all time): ${cls.avg_attendance_all_time}%`);
            
            // Use 30-day average if available, otherwise all-time average
            const classAttendance = cls.avg_attendance_30_days || cls.avg_attendance_all_time;
            if (classAttendance !== null && classAttendance !== undefined) {
                totalAttendanceSum += classAttendance;
                classesWithData++;
                console.log(`   -> Using attendance: ${classAttendance}% (added to sum)`);
            } else {
                console.log(`   -> No attendance data available`);
            }
        });
        
        console.log(`\n=== CALCULATION SUMMARY ===`);
        console.log(`Total classes: ${classes.length}`);
        console.log(`Classes with attendance data: ${classesWithData}`);
        console.log(`Sum of all attendance percentages: ${totalAttendanceSum}`);
        
        if (classesWithData > 0) {
            const overallAverage = totalAttendanceSum / classesWithData;
            console.log(`Overall Average Attendance: ${Math.round(overallAverage)}%`);
            console.log(`Calculation: ${totalAttendanceSum} ÷ ${classesWithData} = ${overallAverage}`);
        } else {
            console.log(`Overall Average Attendance: N/A (no data)`);
        }
        
        // Also check what the current API returns
        console.log(`\n=== CURRENT API RESPONSE ===`);
        const [apiResponse] = await pool.execute(`
            SELECT DISTINCT
                c.id,
                c.name as class_name,
                c.level,
                c.academic_year,
                (SELECT COUNT(*) FROM students WHERE class_id = c.id AND status = 'active') as student_count,
                COALESCE(
                    (
                        SELECT ROUND(AVG(CASE 
                            WHEN a.status = 'present' THEN 100
                            WHEN a.status = 'late' THEN 75
                            ELSE 0
                        END), 1)
                        FROM attendance a
                        JOIN students s ON a.student_id = s.id
                        WHERE s.class_id = c.id
                        AND a.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                    ), 0
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
        
        console.log('Current API data structure:');
        let apiSum = 0;
        let apiClassesWithData = 0;
        apiResponse.forEach(cls => {
            console.log(`${cls.class_name}: avg_attendance = ${cls.avg_attendance}`);
            if (cls.avg_attendance > 0) {
                apiSum += cls.avg_attendance;
                apiClassesWithData++;
            }
        });
        
        console.log(`\n=== FRONTEND CALCULATION SIMULATION ===`);
        console.log(`Classes with attendance > 0: ${apiClassesWithData}`);
        console.log(`Sum for frontend calc: ${apiSum}`);
        if (apiClassesWithData > 0) {
            console.log(`Frontend would show: ${Math.round(apiSum / apiClassesWithData)}%`);
        } else {
            console.log(`Frontend would show: 0%`);
        }
        
        console.log(`\n=== PROBLEM ANALYSIS ===`);
        console.log(`The issue is likely:`);
        console.log(`1. COALESCE(..., 0) converts NULL to 0 when no attendance in last 30 days`);
        console.log(`2. Frontend calculation includes classes with 0% (should exclude them)`);
        console.log(`3. Need to fix both backend SQL and frontend calculation logic`);
        
    } catch (error) {
        console.error('Error in debug script:', error);
    } finally {
        process.exit(0);
    }
}

debugAttendanceCalculation();
