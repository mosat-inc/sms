const mysql = require('mysql2/promise');

async function debugTeacherSubjects() {
    try {
        console.log('🔍 Debugging teacher subjects assignment issue...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Find teacher Mohamed
        console.log('\n👨‍🏫 Looking for teacher Mohamed...');
        const [teachers] = await connection.execute(`
            SELECT id, username, first_name, last_name, role 
            FROM users 
            WHERE role = 'teacher' AND (first_name LIKE '%mohamed%' OR last_name LIKE '%mohamed%' OR username LIKE '%mohamed%')
        `);
        
        console.log('Found teachers:', teachers);
        
        if (teachers.length === 0) {
            console.log('❌ No teacher named Mohamed found. Let me check all teachers:');
            const [allTeachers] = await connection.execute(`
                SELECT id, username, first_name, last_name, role 
                FROM users 
                WHERE role = 'teacher'
            `);
            console.log('All teachers:', allTeachers);
            
            // Let's use the first teacher for debugging
            if (allTeachers.length > 0) {
                teachers.push(allTeachers[0]);
                console.log(`\n🔄 Using teacher "${allTeachers[0].first_name} ${allTeachers[0].last_name}" for debugging`);
            }
        }
        
        if (teachers.length > 0) {
            const teacher = teachers[0];
            console.log(`\n📊 Checking assignments for teacher: ${teacher.first_name} ${teacher.last_name} (ID: ${teacher.id})`);
            
            // Check teacher_subject_assignments table
            const [assignments] = await connection.execute(`
                SELECT 
                    tsa.id,
                    tsa.teacher_id,
                    tsa.subject_id,
                    tsa.class_id,
                    tsa.academic_year,
                    tsa.is_primary_teacher,
                    s.name as subject_name,
                    s.code as subject_code,
                    c.name as class_name,
                    c.level as class_level
                FROM teacher_subject_assignments tsa
                LEFT JOIN subjects s ON tsa.subject_id = s.id
                LEFT JOIN classes c ON tsa.class_id = c.id
                WHERE tsa.teacher_id = ?
                ORDER BY s.name, c.name
            `, [teacher.id]);
            
            console.log(`\n📚 Teacher subject assignments (${assignments.length} total):`);
            assignments.forEach((assignment, index) => {
                console.log(`  ${index + 1}. Subject: ${assignment.subject_name} (${assignment.subject_code})`);
                console.log(`     Class: ${assignment.class_name} (Level ${assignment.class_level})`);
                console.log(`     Academic Year: ${assignment.academic_year}`);
                console.log(`     Primary Teacher: ${assignment.is_primary_teacher ? 'Yes' : 'No'}`);
                console.log(`     Assignment ID: ${assignment.id}`);
                console.log('');
            });
            
            // Check how dashboard query works
            console.log('\n🔍 Testing dashboard query for this teacher...');
            const [dashboardData] = await connection.execute(`
                SELECT DISTINCT
                    s.id as subject_id,
                    s.name as subject_name,
                    s.code as subject_code,
                    COUNT(DISTINCT tsa.class_id) as classes_count
                FROM teacher_subject_assignments tsa
                JOIN subjects s ON tsa.subject_id = s.id
                WHERE tsa.teacher_id = ?
                GROUP BY s.id, s.name, s.code
                ORDER BY s.name
            `, [teacher.id]);
            
            console.log(`Dashboard query results (${dashboardData.length} subjects):`);
            dashboardData.forEach((subject, index) => {
                console.log(`  ${index + 1}. ${subject.subject_name} (${subject.subject_code}) - ${subject.classes_count} classes`);
            });
            
            // Check individual class assignments
            console.log('\n🏫 Checking class-specific view...');
            const [classData] = await connection.execute(`
                SELECT 
                    c.id as class_id,
                    c.name as class_name,
                    c.level as class_level,
                    COUNT(DISTINCT tsa.subject_id) as subjects_count,
                    GROUP_CONCAT(DISTINCT s.name ORDER BY s.name) as subject_names
                FROM classes c
                LEFT JOIN teacher_subject_assignments tsa ON c.id = tsa.class_id AND tsa.teacher_id = ?
                LEFT JOIN subjects s ON tsa.subject_id = s.id
                WHERE tsa.teacher_id IS NOT NULL
                GROUP BY c.id, c.name, c.level
                ORDER BY c.level, c.name
            `, [teacher.id]);
            
            console.log(`Class assignments for this teacher (${classData.length} classes):`);
            classData.forEach((cls, index) => {
                console.log(`  ${index + 1}. ${cls.class_name} (Level ${cls.class_level})`);
                console.log(`     Subjects: ${cls.subject_names}`);
                console.log(`     Subject count: ${cls.subjects_count}`);
                console.log('');
            });
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugTeacherSubjects();
