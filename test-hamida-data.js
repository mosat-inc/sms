const axios = require('axios');

async function testHamidaData() {
    try {
        console.log('🔍 Testing Hamida\'s teacher dashboard data...\n');
        
        // First, try to login as Hamida to get a token
        console.log('Step 1: Attempting to login as Hamida...');
        
        // Try different common credentials for Hamida
        const possibleCredentials = [
            { username: 'hamida', password: 'Allahuma@11' },
            { username: 'hamida', password: 'teacher123' },
            { username: 'teacher_hamida', password: 'hamida123' },
            { username: 'teacher_hamida', password: 'teacher123' },
            { email: 'hamida@ubunifusec.com', password: 'hamida123' },
            { email: 'hamida@ubunifusec.com', password: 'teacher123' }
        ];
        
        let loginResponse = null;
        let token = null;
        
        for (const creds of possibleCredentials) {
            try {
                console.log(`Trying credentials:`, Object.keys(creds)[0], '=', Object.values(creds)[0]);
                loginResponse = await axios.post('http://localhost:5000/api/auth/login', creds);
                if (loginResponse.data.success) {
                    token = loginResponse.data.token;
                    console.log('✅ Login successful!');
                    break;
                }
            } catch (err) {
                console.log('❌ Failed with:', Object.keys(creds)[0], '=', Object.values(creds)[0]);
            }
        }
        
        if (token && loginResponse && loginResponse.data.success) {
            console.log('✅ Successfully logged in as:', loginResponse.data.user.first_name);
            
            // Now fetch teacher stats
            console.log('\nStep 2: Fetching teacher dashboard stats...');
            
            const statsResponse = await axios.get('http://localhost:5000/api/dashboard/teacher-stats', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (statsResponse.data.success) {
                console.log('✅ Dashboard data retrieved successfully\n');
                
                const data = statsResponse.data.data;
                console.log('📊 DASHBOARD STATISTICS:');
                console.log('='.repeat(50));
                
                // Profile info
                if (data.teacher_profile) {
                    console.log(`👤 Teacher: ${data.teacher_profile.name}`);
                    console.log(`📧 Email: ${data.teacher_profile.email}`);
                    console.log(`🏢 Department: ${data.teacher_profile.department || 'Not specified'}`);
                }
                
                // Summary stats (this is what shows in the cards)
                if (data.summary) {
                    console.log(`\n📈 MAIN STATISTICS (Cards):`);
                    console.log(`👨‍🎓 Total Students: ${data.summary.total_students}`);
                    console.log(`📚 Subjects Count: ${data.summary.subjects_count}`);
                    console.log(`🏫 Total Classes: ${data.summary.total_classes}`);
                    console.log(`📊 Average Attendance: ${data.summary.average_attendance}`);
                    console.log(`📅 Classes Today: ${data.summary.classes_today}`);
                }
                
                // Attendance breakdown
                if (data.attendance) {
                    console.log(`\n🎯 ATTENDANCE DETAILS:`);
                    console.log(`Present Today: ${data.attendance.present_today}`);
                    console.log(`Absent Today: ${data.attendance.absent_today}`);
                    console.log(`Total Classes Held: ${data.attendance.total_classes_held}`);
                    console.log(`Average Attendance Rate: ${data.attendance.average_attendance_rate}%`);
                }
                
                // Classes breakdown
                if (data.classes_assigned && data.classes_assigned.length > 0) {
                    console.log(`\n📋 CLASS DETAILS:`);
                    data.classes_assigned.forEach((cls, index) => {
                        console.log(`Class ${index + 1}: ${cls.name} (${cls.student_count} students, Level: ${cls.level})`);
                    });
                }
                
                // Subjects
                if (data.subjects_teaching && data.subjects_teaching.length > 0) {
                    console.log(`\n📖 SUBJECTS TEACHING:`);
                    data.subjects_teaching.forEach((subject, index) => {
                        console.log(`${index + 1}. ${subject.name || subject}`);
                    });
                }
                
            } else {
                console.error('❌ Failed to get dashboard stats:', statsResponse.data.message);
            }
            
        } else {
            console.error('❌ All login attempts failed. Unable to authenticate as Hamida.');
            return;
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

// Run the test
testHamidaData();
