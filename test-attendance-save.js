const axios = require('axios');

async function testAttendanceSave() {
    try {
        console.log('🧪 Testing attendance save functionality...');
        
        // Test data - simulating what the frontend would send
        // Using actual student IDs from the debug output
        const testAttendance = [
            {
                student_id: 1, // STD0001 - John Doe
                status: 'present',
                notes: 'Test attendance'
            },
            {
                student_id: 2, // STD0002 - Jane Smith
                status: 'absent',
                notes: 'Test absence'
            },
            {
                student_id: 3, // STD0003 - Peter Jones
                status: 'late',
                notes: 'Arrived 10 minutes late'
            }
        ];
        
        const classId = 1;
        const date = '2025-09-09';
        
        console.log('📝 Sending attendance data:');
        console.log('  - Class ID:', classId);
        console.log('  - Date:', date);
        console.log('  - Records:', testAttendance.length);
        
        const response = await axios.post(`http://localhost:5000/api/attendance/${classId}/${date}`, {
            attendance: testAttendance
        });
        
        if (response.data.success) {
            console.log('✅ Attendance saved successfully!');
            console.log('📊 Response:', response.data);
        } else {
            console.error('❌ Attendance save failed:', response.data.message || response.data.error);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.statusText);
            console.error('📝 Error details:', error.response.data);
            
            // Check if it's a date format issue
            if (error.response.data.details && error.response.data.details.includes('Incorrect date value')) {
                console.error('💀 Date formatting fix did NOT work in attendance route!');
            }
        } else if (error.request) {
            console.error('❌ Network Error: Could not reach server. Is it running?');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

console.log('🔄 Waiting for server to start...');
setTimeout(testAttendanceSave, 3000);
