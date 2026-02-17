const mysql = require('mysql2/promise');

// Create connection
const createConnection = async () => {
    return await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'allahuma',
        database: 'sms_database'
    });
};

const createSampleData = async () => {
    let connection;
    
    try {
        connection = await createConnection();
        console.log('🔌 Connected to database');
        
        // First, let's check if we have any users and subjects
        const [users] = await connection.execute('SELECT id, role FROM users WHERE role IN ("teacher", "admin") LIMIT 5');
        const [subjects] = await connection.execute('SELECT id, name FROM subjects LIMIT 5');
        const [classes] = await connection.execute('SELECT id, name FROM classes LIMIT 5');
        
        console.log('📊 Current data:');
        console.log('- Users:', users.length);
        console.log('- Subjects:', subjects.length);
        console.log('- Classes:', classes.length);
        
        if (users.length === 0) {
            console.log('❌ No users found! Creating sample teacher...');
            
            // Create sample teacher
            const [teacherResult] = await connection.execute(`
                INSERT INTO users (username, first_name, last_name, email, password, role, phone, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'teacher1',
                'John', 
                'Teacher', 
                'teacher@example.com', 
                '$2b$10$rHKbYT3sTaP6o8yKvjmqkO6uZZmKmcqmmIQ.b5/lOlcj.9tT/YXnW', // password: 'teacher123'
                'teacher', 
                '+1234567890', 
                true
            ]);
            
            console.log('✅ Sample teacher created with ID:', teacherResult.insertId);
            users.push({ id: teacherResult.insertId, role: 'teacher' });
        }
        
        if (subjects.length === 0) {
            console.log('❌ No subjects found! Creating sample subjects...');
            
            const sampleSubjects = [
                ['Mathematics', 'MATH', 'Core mathematics curriculum'],
                ['Physics', 'PHYS', 'Physics and applied sciences'],
                ['Chemistry', 'CHEM', 'Chemistry and laboratory sciences'],
                ['Biology', 'BIOL', 'Life sciences and biology'],
                ['English', 'ENG', 'English language and literature']
            ];
            
            for (const [name, code, description] of sampleSubjects) {
                const [result] = await connection.execute(`
                    INSERT INTO subjects (name, code, description, is_active)
                    VALUES (?, ?, ?, ?)
                `, [name, code, description, true]);
                
                subjects.push({ id: result.insertId, name });
            }
            
            console.log('✅ Sample subjects created');
        }
        
        if (classes.length === 0) {
            console.log('❌ No classes found! Creating sample classes...');
            
            const sampleClasses = [
                ['Form 1A', 'form1', 30, 'Morning'],
                ['Form 1B', 'form1', 28, 'Morning'],
                ['Form 2A', 'form2', 32, 'Morning'],
                ['Form 2B', 'form2', 29, 'Afternoon'],
                ['Form 3A', 'form3', 25, 'Morning']
            ];
            
            for (const [name, level, capacity, stream] of sampleClasses) {
                const [result] = await connection.execute(`
                    INSERT INTO classes (name, level, capacity, academic_year, is_active)
                    VALUES (?, ?, ?, ?, ?)
                `, [name, parseInt(level.replace('form', '')), capacity, '2024-2025', true]);
                
                classes.push({ id: result.insertId, name });
            }
            
            console.log('✅ Sample classes created');
        }
        
        // Create teacher-subject assignments
        const [existingAssignments] = await connection.execute('SELECT COUNT(*) as count FROM teacher_subject_assignments');
        
        if (existingAssignments[0].count === 0) {
            console.log('📝 Creating teacher-subject assignments...');
            
            const teacherId = users.find(u => u.role === 'teacher')?.id || users[0].id;
            
            // Assign teacher to first 3 subjects and classes
            for (let i = 0; i < Math.min(3, subjects.length, classes.length); i++) {
                try {
                    await connection.execute(`
                        INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
                        VALUES (?, ?, ?, ?)
                    `, [teacherId, subjects[i].id, classes[i].id, '2024-2025']);
                } catch (error) {
                    // Ignore duplicate entries
                    if (error.code !== 'ER_DUP_ENTRY') {
                        console.error('Error creating assignment:', error.message);
                    }
                }
            }
            
            console.log('✅ Teacher-subject assignments created');
        }
        
        // Create some sample students
        const [existingStudents] = await connection.execute('SELECT COUNT(*) as count FROM students');
        
        if (existingStudents[0].count === 0) {
            console.log('👥 Creating sample students...');
            
            const sampleStudents = [
                ['Alice', 'Johnson', 'alice@example.com', 'STU001'],
                ['Bob', 'Smith', 'bob@example.com', 'STU002'],
                ['Carol', 'Williams', 'carol@example.com', 'STU003'],
                ['David', 'Brown', 'david@example.com', 'STU004'],
                ['Emma', 'Davis', 'emma@example.com', 'STU005']
            ];
            
            for (const [firstName, lastName, email, studentId] of sampleStudents) {
                try {
                    // Create user first
                    const [userResult] = await connection.execute(`
                        INSERT INTO users (username, first_name, last_name, email, password, role, phone, is_active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        email.split('@')[0], // Use email prefix as username
                        firstName, 
                        lastName, 
                        email, 
                        '$2b$10$rHKbYT3sTaP6o8yKvjmqkO6uZZmKmcqmmIQ.b5/lOlcj.9tT/YXnW', // password: 'student123'
                        'student', 
                        '+1234567890', 
                        true
                    ]);
                    
                    // Create student record
                    await connection.execute(`
                        INSERT INTO students (user_id, student_id, class_id, date_of_birth, gender, admission_date, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [userResult.insertId, studentId, classes[0]?.id || 1, '2005-01-01', 'Male', '2024-01-15', 'active']);
                    
                } catch (error) {
                    if (error.code !== 'ER_DUP_ENTRY') {
                        console.error('Error creating student:', error.message);
                    }
                }
            }
            
            console.log('✅ Sample students created');
        }
        
        // Create sample assessments
        const [existingAssessments] = await connection.execute('SELECT COUNT(*) as count FROM assessments');
        
        if (existingAssessments[0].count === 0) {
            console.log('📝 Creating sample assessments...');
            
            const teacherId = users.find(u => u.role === 'teacher')?.id || users[0].id;
            
            const sampleAssessments = [
                ['Mathematics Mid-Term Exam', subjects[0]?.id, classes[0]?.id, 'exam', 100, '2024-01-15'],
                ['Physics Quiz 1', subjects[1]?.id, classes[1]?.id, 'quiz', 50, '2024-01-10'],
                ['Chemistry Lab Test', subjects[2]?.id, classes[0]?.id, 'test', 75, '2024-01-20']
            ];
            
            // Get default grading scale
            const [gradingScale] = await connection.execute('SELECT id FROM grading_scales WHERE is_default = TRUE LIMIT 1');
            
            for (const [title, subjectId, classId, type, totalMarks, date] of sampleAssessments) {
                if (subjectId && classId) {
                    try {
                        await connection.execute(`
                            INSERT INTO assessments (
                                title, subject_id, class_id, teacher_id, assessment_type,
                                total_marks, passing_marks, weight_percentage, assessment_date,
                                grading_scale_id, term, academic_year
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            title, subjectId, classId, teacherId, type,
                            totalMarks, totalMarks * 0.5, 100.00, date,
                            gradingScale[0]?.id || null, 'term1', '2024-2025'
                        ]);
                    } catch (error) {
                        console.error('Error creating assessment:', error.message);
                    }
                }
            }
            
            console.log('✅ Sample assessments created');
        }
        
        console.log('\n🎉 Sample data creation completed!');
        console.log('\n📋 Quick summary:');
        
        const [finalUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
        const [finalSubjects] = await connection.execute('SELECT COUNT(*) as count FROM subjects');
        const [finalClasses] = await connection.execute('SELECT COUNT(*) as count FROM classes');
        const [finalAssessments] = await connection.execute('SELECT COUNT(*) as count FROM assessments');
        const [finalStudents] = await connection.execute('SELECT COUNT(*) as count FROM students');
        const [finalAssignments] = await connection.execute('SELECT COUNT(*) as count FROM teacher_subject_assignments');
        
        console.log(`- Users: ${finalUsers[0].count}`);
        console.log(`- Subjects: ${finalSubjects[0].count}`);
        console.log(`- Classes: ${finalClasses[0].count}`);
        console.log(`- Students: ${finalStudents[0].count}`);
        console.log(`- Assessments: ${finalAssessments[0].count}`);
        console.log(`- Teacher Assignments: ${finalAssignments[0].count}`);
        
    } catch (error) {
        console.error('❌ Error creating sample data:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
};

// Run the script
if (require.main === module) {
    createSampleData().catch(console.error);
}

module.exports = { createSampleData };
