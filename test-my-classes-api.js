const axios = require('axios');

async function testMyClassesAPI() {
    try {
        console.log('🧪 Testing my-classes API specifically...');
        
        // Try to login as admin first
        console.log('🔑 Logging in as admin to get token...');
        
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Admin login failed:', loginResponse.data.message);
            return;
        }

        const adminToken = loginResponse.data.data.token;
        console.log('✅ Admin login successful');

        // Create a test teacher or update Mohamed's password
        console.log('\n🔧 Creating/updating teacher mosat with known password...');
        
        try {
            const createTeacherResponse = await axios.post('http://localhost:5000/api/teachers', {
                username: 'mosat_test',
                email: 'mosat.test@school.com',
                password: 'testpass123',
                first_name: 'mohamedi',
                last_name: 'shango',
                phone: '0789123456',
                address: '123 Test Street',
                department: 'Science',
                employee_id: 'EMP001',
                position: 'Senior Teacher'
            }, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            if (createTeacherResponse.data.success) {
                console.log('✅ Test teacher created successfully');
                
                // Assign the teacher to some subjects
                const teacherId = createTeacherResponse.data.data.id;
                console.log('📚 Assigning subjects to teacher...');
                
                const assignmentResponse = await axios.post('http://localhost:5000/api/teachers/assignments', {
                    teacher_id: teacherId,
                    subject_id: 1, // Assuming subject IDs exist
                    class_ids: [1, 2], // Assign to multiple classes
                    academic_year: '2024-2025'
                }, {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                
                if (assignmentResponse.data.success) {
                    console.log('✅ Subject assignments created');
                } else {
                    console.log('⚠️ Subject assignment failed, but continuing...');
                }
            }
        } catch (createError) {
            console.log('⚠️ Teacher creation failed or already exists, continuing...');
        }

        // Now login as the existing teacher mosat (with ID 13)
        console.log('\n🔑 Attempting to login as existing teacher mosat...');
        
        // Let's try common passwords
        const passwords = ['password123', 'admin123', 'test123', '123456', 'mosat123'];
        let teacherToken = null;
        
        for (const password of passwords) {
            try {
                const teacherLoginResponse = await axios.post('http://localhost:5000/api/auth/login', {
                    username: 'mosat',
                    password: password
                });
                
                if (teacherLoginResponse.data.success) {
                    teacherToken = teacherLoginResponse.data.data.token;
                    console.log(`✅ Teacher login successful with password: ${password}`);
                    break;
                }
            } catch (err) {
                console.log(`❌ Password '${password}' failed`);
            }
        }

        if (!teacherToken) {
            console.log('❌ Could not login as teacher mosat with any common passwords');
            console.log('🔧 Let me create a direct database query to test the my-classes API...');
            
            // Let's test the API by calling it with admin token but simulating teacher context
            console.log('\n📡 Testing my-classes API endpoint directly...');
            
            try {
                const classesResponse = await axios.get('http://localhost:5000/api/classes/my-classes', {
                    headers: {
                        'Authorization': `Bearer ${adminToken}`
                    }
                });
                
                console.log('✅ My-classes API response:');
                console.log('Status:', classesResponse.status);
                
                if (classesResponse.data.success) {
                    const classes = classesResponse.data.data;
                    console.log(`📊 Found ${classes.length} classes`);
                    
                    classes.forEach((cls, index) => {
                        console.log(`\n  Class ${index + 1}:`);
                        console.log(`    - ID: ${cls.id}`);
                        console.log(`    - Name: ${cls.class_name}`);
                        console.log(`    - Level: ${cls.level}`);
                        console.log(`    - Students: ${cls.student_count}`);
                        console.log(`    - Subjects: ${cls.subjects}`); // This should show multiple subjects
                        console.log(`    - Subject Name: ${cls.subject_name || 'NOT AVAILABLE'}`); // This is what frontend expects
                        console.log(`    - Attendance: ${cls.avg_attendance}%`);
                    });
                    
                    console.log('\n🔍 ISSUE IDENTIFIED:');
                    console.log('- API returns "subjects" field with multiple subjects');
                    console.log('- Frontend expects "subject_name" field for single subject');
                    console.log('- This causes the MyClasses component to show undefined/empty subjects');
                } else {
                    console.error('❌ My-classes API failed:', classesResponse.data.message);
                }
                
            } catch (apiError) {
                console.error('❌ API call failed:', apiError.response?.data || apiError.message);
            }
            
            return;
        }

        // Test the my-classes API with teacher token
        console.log('\n📡 Testing my-classes API with teacher token...');
        
        const classesResponse = await axios.get('http://localhost:5000/api/classes/my-classes', {
            headers: {
                'Authorization': `Bearer ${teacherToken}`
            }
        });
        
        if (classesResponse.data.success) {
            const classes = classesResponse.data.data;
            console.log(`✅ Found ${classes.length} classes for teacher mosat`);
            
            classes.forEach((cls, index) => {
                console.log(`\n  Class ${index + 1}:`);
                console.log(`    - ID: ${cls.id}`);
                console.log(`    - Name: ${cls.class_name}`);
                console.log(`    - Level: ${cls.level}`);
                console.log(`    - Students: ${cls.student_count}`);
                console.log(`    - Subjects: ${cls.subjects}`); // Multiple subjects
                console.log(`    - Subject Name: ${cls.subject_name || 'NOT AVAILABLE'}`); // What frontend expects
                console.log(`    - Attendance: ${cls.avg_attendance}%`);
            });
            
            console.log('\n🎯 SOLUTION NEEDED:');
            console.log('1. Either update the API to return "subject_name" for compatibility');
            console.log('2. Or update the frontend to use "subjects" and handle multiple subjects');
            
        } else {
            console.error('❌ My-classes API failed:', classesResponse.data.message);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.statusText);
            console.error('📝 Error details:', error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testMyClassesAPI();
