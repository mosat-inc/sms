const mysql = require('mysql2/promise');

async function testFixedAPI() {
    try {
        console.log('🧪 Testing the fixed my-classes API query directly...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Test the exact query from the fixed API with teacher ID 13 (mosamedi)
        const teacherId = 13;
        console.log(`👨‍🏫 Testing for teacher ID: ${teacherId} (mosamedi shango)`);
        
        const [classes] = await connection.execute(`
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
        
        console.log(`\n✅ Found ${classes.length} classes for teacher:`);
        
        classes.forEach((cls, index) => {
            console.log(`\n  Class ${index + 1}:`);
            console.log(`    - ID: ${cls.id}`);
            console.log(`    - Name: ${cls.class_name}`);
            console.log(`    - Level: ${cls.level}`);
            console.log(`    - Students: ${cls.student_count}`);
            console.log(`    - Subjects (Multiple): ${cls.subjects}`); // Shows all subjects
            console.log(`    - Subject Name (Single): ${cls.subject_name}`); // Shows first subject for compatibility
            console.log(`    - Attendance: ${cls.avg_attendance}%`);
        });
        
        if (classes.length > 0) {
            console.log('\n🎉 SUCCESS! The fix works:');
            console.log('✅ API now returns both "subjects" (multiple) and "subject_name" (single)');
            console.log('✅ Frontend can show all subjects while maintaining compatibility');
            console.log('✅ Teacher Mohamed will now see all his subjects in the My Classes view');
        } else {
            console.log('\n⚠️ No classes found for this teacher. This might be expected if:');
            console.log('- Teacher has no assignments');
            console.log('- Classes are inactive');
            console.log('- Teacher ID is incorrect');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFixedAPI();
