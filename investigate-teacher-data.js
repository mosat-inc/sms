const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sms_database'
};

const investigateTeacherData = async () => {
    let connection;
    try {
        console.log('🔍 Investigating teacher data discrepancy...');
        
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check teacher 15's user record
        const [userRecord] = await connection.execute(`
            SELECT 
                id, username, first_name, last_name, role,
                subjects_taught, classes_assigned, department
            FROM users 
            WHERE id = ?
        `, [15]);

        if (userRecord.length > 0) {
            const teacher = userRecord[0];
            console.log('👤 Teacher 15 User Record:');
            console.log(`   Name: ${teacher.first_name} ${teacher.last_name}`);
            console.log(`   Username: ${teacher.username}`);
            console.log(`   Role: ${teacher.role}`);
            console.log(`   Department: ${teacher.department}`);
            console.log(`   Subjects Taught (JSON): ${teacher.subjects_taught}`);
            console.log(`   Classes Assigned (JSON): ${teacher.classes_assigned}`);
        } else {
            console.log('❌ Teacher 15 not found in users table');
        }

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
                c.name as class_name
            FROM teacher_subject_assignments tsa
            INNER JOIN subjects s ON tsa.subject_id = s.id
            INNER JOIN classes c ON tsa.class_id = c.id
            WHERE tsa.teacher_id = ?
            ORDER BY c.name, s.name
        `, [15]);

        console.log(`\n📚 Teacher_Subject_Assignments for Teacher 15: ${assignments.length} records`);
        if (assignments.length > 0) {
            assignments.forEach(assignment => {
                console.log(`   - ${assignment.subject_name} (${assignment.subject_code}) to ${assignment.class_name} [${assignment.academic_year}] ${assignment.is_primary_teacher ? '(Primary)' : ''}`);
            });
        }

        // Check if there's a teacher_profiles table with assignments
        try {
            const [profileRecord] = await connection.execute(`
                SELECT * FROM teacher_profiles WHERE user_id = ?
            `, [15]);

            if (profileRecord.length > 0) {
                console.log('\n👔 Teacher Profile Record:');
                console.log(`   Employee ID: ${profileRecord[0].employee_id}`);
                console.log(`   Department: ${profileRecord[0].department}`);
                console.log(`   Position: ${profileRecord[0].position}`);
                console.log(`   Qualification: ${profileRecord[0].qualification}`);
            } else {
                console.log('\n⚠️  No teacher profile record found');
            }
        } catch (error) {
            console.log('\n⚠️  Teacher profiles table might not exist or has different structure');
        }

        // Check all classes and subjects to see what's available
        const [allClasses] = await connection.execute(`
            SELECT id, name, level, academic_year FROM classes WHERE is_active = TRUE ORDER BY name
        `);

        const [allSubjects] = await connection.execute(`
            SELECT id, name, code, department FROM subjects WHERE is_active = TRUE ORDER BY name
        `);

        console.log(`\n🏫 Total Active Classes: ${allClasses.length}`);
        allClasses.slice(0, 5).forEach(cls => {
            console.log(`   - ${cls.name} (Level ${cls.level}) - ${cls.academic_year}`);
        });

        console.log(`\n📖 Total Active Subjects: ${allSubjects.length}`);
        allSubjects.slice(0, 5).forEach(subject => {
            console.log(`   - ${subject.name} (${subject.code}) - ${subject.department}`);
        });

    } catch (error) {
        console.error('❌ Error investigating teacher data:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('📡 Database connection closed');
        }
    }
};

// Run the investigation
investigateTeacherData()
    .then(() => {
        console.log('\n🏁 Investigation completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Investigation failed:', error);
        process.exit(1);
    });
