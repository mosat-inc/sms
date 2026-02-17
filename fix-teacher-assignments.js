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

const fixTeacherAssignments = async () => {
    let connection;
    try {
        console.log('🔧 Starting teacher assignment fix...');
        
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check if teacher ID 15 exists
        const [teacherCheck] = await connection.execute(
            'SELECT id, username, first_name, last_name, role FROM users WHERE id = ? AND role = "teacher"',
            [15]
        );

        if (teacherCheck.length === 0) {
            console.log('❌ Teacher with ID 15 not found. Checking available teachers...');
            
            const [teachers] = await connection.execute(
                'SELECT id, username, first_name, last_name, role FROM users WHERE role = "teacher" ORDER BY id'
            );
            
            console.log('📋 Available teachers:');
            teachers.forEach(teacher => {
                console.log(`   ID: ${teacher.id}, Username: ${teacher.username}, Name: ${teacher.first_name} ${teacher.last_name}`);
            });
            
            if (teachers.length === 0) {
                console.log('❌ No teachers found in the system');
                return;
            }
            
            // Use the first available teacher
            const teacherId = teachers[0].id;
            console.log(`🔄 Using teacher ID ${teacherId} (${teachers[0].first_name} ${teachers[0].last_name}) instead`);
            await assignSubjectsToTeacher(connection, teacherId);
        } else {
            console.log(`✅ Teacher found: ${teacherCheck[0].first_name} ${teacherCheck[0].last_name} (${teacherCheck[0].username})`);
            await assignSubjectsToTeacher(connection, 15);
        }

    } catch (error) {
        console.error('❌ Error fixing teacher assignments:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('📡 Database connection closed');
        }
    }
};

const assignSubjectsToTeacher = async (connection, teacherId) => {
    try {
        // Check existing assignments for this teacher
        const [existingAssignments] = await connection.execute(`
            SELECT tsa.id, s.name as subject_name, c.name as class_name, tsa.is_primary_teacher
            FROM teacher_subject_assignments tsa
            INNER JOIN subjects s ON tsa.subject_id = s.id
            INNER JOIN classes c ON tsa.class_id = c.id
            WHERE tsa.teacher_id = ?
            ORDER BY c.name, s.name
        `, [teacherId]);

        console.log(`📊 Current assignments for teacher ${teacherId}: ${existingAssignments.length}`);
        
        if (existingAssignments.length > 0) {
            console.log('📋 Existing assignments:');
            existingAssignments.forEach(assignment => {
                console.log(`   - ${assignment.subject_name} to ${assignment.class_name} ${assignment.is_primary_teacher ? '(Primary)' : ''}`);
            });
        }

        // Get available classes and subjects
        const [classes] = await connection.execute(
            'SELECT id, name FROM classes WHERE is_active = TRUE ORDER BY name LIMIT 5'
        );
        
        const [subjects] = await connection.execute(
            'SELECT id, name FROM subjects WHERE is_active = TRUE ORDER BY name LIMIT 5'
        );

        console.log(`📚 Available classes: ${classes.length}, subjects: ${subjects.length}`);

        if (classes.length === 0 || subjects.length === 0) {
            console.log('❌ No classes or subjects available for assignment');
            return;
        }

        // Create assignments for each class-subject combination (limiting to reasonable amount)
        const currentYear = '2024-2025';
        let assignmentCount = 0;

        for (let i = 0; i < Math.min(classes.length, 3); i++) { // Limit to 3 classes
            for (let j = 0; j < Math.min(subjects.length, 3); j++) { // Limit to 3 subjects per class
                const classId = classes[i].id;
                const subjectId = subjects[j].id;
                
                // Check if assignment already exists
                const [existing] = await connection.execute(`
                    SELECT id FROM teacher_subject_assignments 
                    WHERE teacher_id = ? AND subject_id = ? AND class_id = ? AND academic_year = ?
                `, [teacherId, subjectId, classId, currentYear]);

                if (existing.length === 0) {
                    // Create new assignment
                    await connection.execute(`
                        INSERT INTO teacher_subject_assignments 
                        (teacher_id, subject_id, class_id, academic_year, is_primary_teacher)
                        VALUES (?, ?, ?, ?, ?)
                    `, [teacherId, subjectId, classId, currentYear, j === 0]); // First subject is primary

                    assignmentCount++;
                    console.log(`✅ Assigned ${subjects[j].name} to ${classes[i].name} ${j === 0 ? '(Primary)' : ''}`);
                } else {
                    console.log(`⚠️  Assignment already exists: ${subjects[j].name} to ${classes[i].name}`);
                }
            }
        }

        console.log(`🎉 Successfully created ${assignmentCount} new assignments`);

        // Verify assignments were created
        const [finalAssignments] = await connection.execute(`
            SELECT COUNT(*) as total_assignments
            FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = ?
        `, [teacherId]);

        console.log(`📈 Teacher ${teacherId} now has ${finalAssignments[0].total_assignments} total assignments`);

    } catch (error) {
        console.error('❌ Error assigning subjects to teacher:', error);
        throw error;
    }
};

// Run the fix
fixTeacherAssignments()
    .then(() => {
        console.log('🏁 Teacher assignment fix completed successfully!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Restart your development server');
        console.log('   2. Login as the teacher and try the My Assessment tab');
        console.log('   3. Select a class to see if subjects now appear');
        console.log('');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Fix failed:', error);
        process.exit(1);
    });
