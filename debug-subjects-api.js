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

const debugSubjectsAPI = async () => {
    let connection;
    try {
        console.log('🔍 Debugging subjects API endpoint...');
        
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        const teacherId = 15;
        console.log(`\n🧑‍🏫 Testing for Teacher ID: ${teacherId}`);

        // Test 1: Get all classes this teacher is assigned to
        console.log('\n📚 Step 1: Getting teacher\'s assigned classes...');
        const [teacherClasses] = await connection.execute(`
            SELECT DISTINCT 
                c.id, c.name, c.level, c.capacity, c.academic_year
            FROM teacher_subject_assignments tsa
            INNER JOIN classes c ON tsa.class_id = c.id
            WHERE tsa.teacher_id = ? AND c.is_active = TRUE
            ORDER BY c.level, c.name
        `, [teacherId]);

        console.log(`Found ${teacherClasses.length} classes:`);
        teacherClasses.forEach(cls => {
            console.log(`   - Class ${cls.id}: ${cls.name} (Level ${cls.level})`);
        });

        // Test 2: For each class, test the subjects API call
        for (const classInfo of teacherClasses) {
            const classId = classInfo.id;
            console.log(`\n🎯 Step 2: Testing subjects for Class ${classId} (${classInfo.name})...`);
            
            // This is the exact query from the assessments API
            const [subjects] = await connection.execute(`
                SELECT DISTINCT 
                    s.id,
                    s.name,
                    s.code,
                    s.description,
                    s.department
                FROM subjects s
                INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
                WHERE tsa.teacher_id = ? AND tsa.class_id = ? AND s.is_active = TRUE
                ORDER BY s.name
            `, [teacherId, classId]);
            
            console.log(`   📖 Found ${subjects.length} subjects for class ${classInfo.name}:`);
            if (subjects.length > 0) {
                subjects.forEach(subject => {
                    console.log(`      ✅ ${subject.name} (${subject.code}) - ${subject.department}`);
                });
            } else {
                console.log(`      ❌ No subjects found for class ${classInfo.name}`);
                
                // Debug: Let's see what assignments exist for this teacher and class
                console.log(`      🔍 Checking raw assignments for teacher ${teacherId} and class ${classId}:`);
                const [rawAssignments] = await connection.execute(`
                    SELECT tsa.*, s.name as subject_name, c.name as class_name
                    FROM teacher_subject_assignments tsa
                    LEFT JOIN subjects s ON tsa.subject_id = s.id
                    LEFT JOIN classes c ON tsa.class_id = c.id
                    WHERE tsa.teacher_id = ? AND tsa.class_id = ?
                `, [teacherId, classId]);
                
                rawAssignments.forEach(assignment => {
                    console.log(`         - Assignment ID: ${assignment.id}, Subject: ${assignment.subject_name || 'NULL'}, Class: ${assignment.class_name || 'NULL'}, Active: ${assignment.is_active || 'N/A'}`);
                });
            }
        }

        // Test 3: Check if subjects are active
        console.log('\n🏃‍♂️ Step 3: Checking subject active status...');
        const [allSubjects] = await connection.execute(`
            SELECT id, name, code, is_active 
            FROM subjects 
            WHERE id IN (
                SELECT DISTINCT subject_id 
                FROM teacher_subject_assignments 
                WHERE teacher_id = ?
            )
        `, [teacherId]);

        console.log(`Subject active status:`);
        allSubjects.forEach(subject => {
            console.log(`   - ${subject.name} (${subject.code}): ${subject.is_active ? '✅ Active' : '❌ Inactive'}`);
        });

        // Test 4: Simulate the full API call flow
        console.log('\n🌐 Step 4: Simulating the frontend API call...');
        
        if (teacherClasses.length > 0) {
            const testClassId = teacherClasses[0].id;
            console.log(`Testing with class ID: ${testClassId} (${teacherClasses[0].name})`);
            
            // This simulates exactly what the assessments API does
            const assignedQuery = `
                SELECT DISTINCT 
                    s.id,
                    s.name,
                    s.code,
                    s.description,
                    s.department
                FROM subjects s
                INNER JOIN teacher_subject_assignments tsa ON s.id = tsa.subject_id
                WHERE tsa.teacher_id = ? AND tsa.class_id = ? AND s.is_active = TRUE
                ORDER BY s.name
            `;
            
            const [apiResult] = await connection.execute(assignedQuery, [teacherId, testClassId]);
            
            console.log(`📡 API Result: ${apiResult.length} subjects`);
            if (apiResult.length === 0) {
                console.log('❌ API would return fallback subjects');
                
                // Show what the fallback would return
                const fallbackQuery = `
                    SELECT 
                        s.id,
                        s.name,
                        s.code,
                        s.description,
                        s.department
                    FROM subjects s
                    WHERE s.is_active = TRUE
                    ORDER BY s.name
                    LIMIT 10
                `;
                const [fallbackSubjects] = await connection.execute(fallbackQuery);
                console.log(`📋 Fallback would show ${fallbackSubjects.length} subjects:`);
                fallbackSubjects.forEach(subject => {
                    console.log(`      - ${subject.name} (${subject.code})`);
                });
            } else {
                console.log('✅ API would return assigned subjects:');
                apiResult.forEach(subject => {
                    console.log(`      - ${subject.name} (${subject.code})`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error debugging subjects API:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('📡 Database connection closed');
        }
    }
};

// Run the debug
debugSubjectsAPI()
    .then(() => {
        console.log('\n🏁 Debug completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Debug failed:', error);
        process.exit(1);
    });
