const axios = require('axios');

async function testTeacherUpdate() {
    try {
        // First login as admin to get token
        console.log('🔑 Logging in as admin...');
        
        const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.message);
            return;
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Admin login successful');

        // Try to update a teacher's profile with a joining_date in ISO format
        console.log('\n📝 Attempting to create a test teacher with joining_date...');
        
        const createResponse = await axios.post('http://localhost:3001/api/teachers', {
            username: 'test_teacher_' + Date.now(),
            email: 'testteacher@example.com',
            password: 'password123',
            first_name: 'Test',
            last_name: 'Teacher',
            phone: '0789123456',
            address: '123 Test Street',
            department: 'Mathematics',
            employee_id: 'EMP' + Date.now(),
            position: 'Senior Teacher',
            qualification: 'Bachelor of Education',
            specialization: 'Mathematics',
            experience_years: 5,
            joining_date: '2025-09-06T07:00:00.000Z', // This is the problematic format that was causing the error
            salary: 1500000,
            bio: 'Test teacher for date formatting fix'
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (createResponse.data.success) {
            console.log('✅ Teacher created successfully with formatted joining_date!');
            console.log('Teacher ID:', createResponse.data.data.id);
            
            // Now try to update the teacher's joining_date
            const teacherId = createResponse.data.data.id;
            console.log(`\n📝 Updating teacher ${teacherId} with new joining_date...`);
            
            const updateResponse = await axios.put(`http://localhost:3001/api/teachers/${teacherId}`, {
                joining_date: '2023-01-15T08:00:00.000Z' // Another ISO date format
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (updateResponse.data.success) {
                console.log('✅ Teacher updated successfully with formatted joining_date!');
                console.log('🎉 Date formatting fix is working correctly!');
            } else {
                console.error('❌ Teacher update failed:', updateResponse.data.message);
            }
        } else {
            console.error('❌ Teacher creation failed:', createResponse.data.message);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.data.message || error.response.data);
            if (error.response.data.error && error.response.data.error.includes('Incorrect date value')) {
                console.error('💀 The date formatting fix did NOT work - still getting date format error!');
            }
        } else if (error.request) {
            console.error('❌ Network Error: Could not reach server. Is it running on port 3001?');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testTeacherUpdate();
