const axios = require('axios');

async function testTeacherStatsAPI() {
    try {
        console.log('🧪 Testing teacher stats API structure...');
        
        // First login as teacher Mohamed
        console.log('🔑 Logging in as teacher mosat...');
        
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            username: 'mosat',
            password: 'password123'
        });

        if (!loginResponse.data.success) {
            console.error('❌ Login failed:', loginResponse.data.message);
            return;
        }

        const token = loginResponse.data.data.token;
        console.log('✅ Teacher login successful');

        // Test the dashboard stats API
        console.log('\n📊 Fetching teacher dashboard stats...');
        
        const statsResponse = await axios.get('http://localhost:5000/api/dashboard/teacher-stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (statsResponse.data.success) {
            console.log('✅ Teacher stats fetched successfully!');
            
            const data = statsResponse.data.data;
            
            console.log('\n📚 Subjects Teaching:', data.subjects_teaching.length);
            data.subjects_teaching.forEach((subject, index) => {
                console.log(`  ${index + 1}. ${subject.name} (${subject.code})`);
                console.log(`     Department: ${subject.department}`);
                console.log(`     Classes Count: ${subject.classes_count || 'Not available'}`);
                console.log(`     Class Names: ${subject.class_names || 'Not available'}`);
                console.log('');
            });
            
            console.log('\n🏫 Classes Assigned:', data.classes_assigned.length);
            data.classes_assigned.forEach((classItem, index) => {
                console.log(`  ${index + 1}. ${classItem.name} (Level ${classItem.level})`);
                console.log(`     Students: ${classItem.student_count}`);
                console.log(`     Capacity: ${classItem.capacity}`);
                console.log(`     Academic Year: ${classItem.academic_year}`);
                console.log('     Subjects for this class: NOT AVAILABLE IN CURRENT API!');
                console.log('');
            });
            
            console.log('\n🔍 Issue Identified:');
            console.log('- The API returns classes_assigned without subject information per class');
            console.log('- The API returns subjects_teaching as a separate list');
            console.log('- The frontend needs to know which subjects are taught in which classes');
            
        } else {
            console.error('❌ Teacher stats failed:', statsResponse.data.message);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.statusText);
            console.error('📝 Error details:', error.response.data);
        } else if (error.request) {
            console.error('❌ Network Error: Could not reach server. Is it running?');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testTeacherStatsAPI();
