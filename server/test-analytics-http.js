const http = require('http');
const path = require('path');

// Test analytics endpoint with HTTP request
async function testAnalyticsHTTP() {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/assessments/8/analytics',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AdWJ1bmlmdXNlYy5jb20iLCJyb2xlIjoiYWRtaW4iLCJmaXJzdF9uYW1lIjoiU3lzdGVtIiwibGFzdF9uYW1lIjoiQWRtaW5pc3RyYXRvciIsImlhdCI6MTc1NTc2NzE3MiwiZXhwIjoxNzU1ODUzNTcyfQ.g-FBFB3i7jgs9hgqyQ8oTFLIRsZus0EHniYzN75BcHY',
            'Content-Type': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';

            console.log(`✅ Response Status: ${res.statusCode}`);
            console.log(`✅ Response Headers:`, res.headers);

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('\n🎉 Analytics Response:');
                    console.log('Success:', response.success);
                    
                    if (response.success && response.data) {
                        console.log('\n📊 Assessment Info:');
                        console.log('- Name:', response.data.assessment.assessment_name);
                        console.log('- Subject:', response.data.assessment.subject_name);
                        console.log('- Class:', response.data.assessment.class_name);
                        console.log('- Max Marks:', response.data.assessment.max_marks);
                        
                        console.log('\n📈 Analytics Data:');
                        const analytics = response.data.analytics;
                        console.log('- Total Students:', analytics.total_students);
                        console.log('- Graded Students:', analytics.graded_students);
                        console.log('- Attendance Rate:', analytics.attendance_rate + '%');
                        console.log('- Pass Rate:', analytics.pass_rate + '%');
                        console.log('- Average Score:', analytics.average_score + '%');
                        console.log('- Highest Score:', analytics.highest_score + '%');
                        console.log('- Lowest Score:', analytics.lowest_score + '%');
                        console.log('- Grade Distribution:', JSON.stringify(analytics.grade_distribution, null, 2));
                        
                        console.log('\n✅ Analytics endpoint is working correctly!');
                    } else {
                        console.log('❌ Response:', response);
                    }
                    
                    resolve(response);
                } catch (error) {
                    console.error('❌ Failed to parse response:', error);
                    console.log('Raw response:', data);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request failed:', error);
            reject(error);
        });

        req.end();
    });
}

// Run the test
console.log('🔍 Testing analytics endpoint via HTTP...\n');
testAnalyticsHTTP()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
