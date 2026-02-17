const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sms_database'
};

const quickTest = async () => {
    let connection;
    try {
        console.log('🚀 Quick API Test for Subject Dropdown...');
        
        // Create connection
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        const teacherId = 15;
        
        // Test 1: Verify teacher exists
        console.log('\n🔍 Step 1: Verifying teacher...');
        const [teacherData] = await connection.execute(
            'SELECT id, username, first_name, last_name, role FROM users WHERE id = ?',
            [teacherId]
        );
        
        if (teacherData.length === 0) {
            console.log('❌ Teacher not found!');
            return;
        }
        
        console.log(`✅ Teacher: ${teacherData[0].first_name} ${teacherData[0].last_name} (${teacherData[0].username})`);
        
        // Test 2: Check classes endpoint
        console.log('\n🔍 Step 2: Simulating /api/assessments/teacher/classes...');
        const [assignedClasses] = await connection.execute(`
            SELECT DISTINCT 
                c.id,
                c.name,
                c.level,
                c.capacity,
                c.academic_year
            FROM classes c
            INNER JOIN teacher_subject_assignments tsa ON c.id = tsa.class_id
            WHERE tsa.teacher_id = ? AND c.is_active = TRUE
            ORDER BY c.level, c.name
        `, [teacherId]);
        
        console.log(`📚 Classes API would return: ${assignedClasses.length} classes`);
        assignedClasses.forEach(cls => {
            console.log(`   - ID: ${cls.id}, Name: ${cls.name}, Level: ${cls.level}`);
        });
        
        // Test 3: For each class, simulate subjects endpoint
        console.log('\n🔍 Step 3: Testing subjects endpoint for each class...');
        
        for (const cls of assignedClasses) {
            console.log(`\n🎯 Testing subjects for Class ${cls.id} (${cls.name})...`);
            
            // This is the exact query from the API
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
            `, [teacherId, cls.id]);
            
            console.log(`   📖 Subjects: ${subjects.length} found`);
            subjects.forEach(subject => {
                console.log(`      - ID: ${subject.id}, Name: ${subject.name}, Code: ${subject.code}`);
            });
            
            // Create the exact API response format
            const apiResponse = {
                success: true,
                data: subjects
            };
            
            console.log(`   📡 API Response Format:`, {
                success: apiResponse.success,
                dataLength: apiResponse.data.length,
                sampleData: apiResponse.data[0] || null
            });
        }
        
        // Test 4: Create a test JWT token for manual testing
        console.log('\n🔍 Step 4: Creating test JWT token...');
        
        const testUser = {
            id: teacherId,
            username: teacherData[0].username,
            role: teacherData[0].role,
            first_name: teacherData[0].first_name,
            last_name: teacherData[0].last_name
        };
        
        const token = jwt.sign(testUser, process.env.JWT_SECRET || 'demo-secret', {
            expiresIn: '24h'
        });
        
        console.log('✅ Test JWT Token created (for manual API testing):', token.substring(0, 50) + '...');
        
        // Test 5: Provide manual test URLs
        console.log('\n🔍 Step 5: Manual testing URLs:');
        const baseURL = 'http://localhost:5000';
        
        console.log(`📚 Classes API: GET ${baseURL}/api/assessments/teacher/classes`);
        console.log(`   Authorization: Bearer ${token}`);
        
        if (assignedClasses.length > 0) {
            const testClassId = assignedClasses[0].id;
            console.log(`📖 Subjects API: GET ${baseURL}/api/assessments/teacher/subjects/${testClassId}`);
            console.log(`   Authorization: Bearer ${token}`);
        }
        
    } catch (error) {
        console.error('❌ Error in quick test:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('📡 Database connection closed');
        }
    }
};

// Run the test
quickTest()
    .then(() => {
        console.log('\n🏁 Quick test completed!');
        console.log('\n📝 Next steps:');
        console.log('1. Check if your server is running (npm run dev)');
        console.log('2. Login as the teacher and try selecting a class');
        console.log('3. Watch the server console for debug logs');
        console.log('4. Check browser Network tab for API calls');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });
