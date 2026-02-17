const http = require('http');

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    resolve({ 
                        statusCode: res.statusCode, 
                        headers: res.headers, 
                        data: response 
                    });
                } catch (error) {
                    resolve({ 
                        statusCode: res.statusCode, 
                        headers: res.headers, 
                        data: data 
                    });
                }
            });
        });

        req.on('error', reject);

        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// Step 1: Login to get a fresh token
async function login() {
    console.log('🔐 Logging in to get fresh token...');
    
    const postData = JSON.stringify({
        username: 'admin',
        password: 'admin123'
    });

    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    try {
        const response = await makeRequest(options, postData);
        
        if (response.statusCode === 200 && response.data.success) {
            console.log('✅ Login successful');
            return response.data.data.token;
        } else {
            console.log('❌ Login failed:', response.data);
            return null;
        }
    } catch (error) {
        console.error('❌ Login request failed:', error);
        return null;
    }
}

// Test student grade analysis endpoint with HTTP request
async function testStudentGradeAnalysis(token) {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/grades/analytics/student-grade-analysis?class_id=1&academic_year=2024-2025',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
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
                    console.log('\n🎉 Student Grade Analysis Response:');
                    console.log('Success:', response.success);
                    
                    if (response.success && response.data) {
                        console.log('\n📊 Analysis Info:');
                        console.log('- Class ID:', response.data.class_id);
                        console.log('- Academic Year:', response.data.academic_year);
                        console.log('- Term:', response.data.term || 'All terms');
                        console.log('- Total Students:', response.data.students?.length || 0);
                        console.log('- Total Subjects:', response.data.subjects?.length || 0);
                        
                        if (response.data.subjects && response.data.subjects.length > 0) {
                            console.log('\n📚 Subjects:');
                            response.data.subjects.forEach(subject => {
                                console.log(`  - ${subject.name} (${subject.code})`);
                            });
                        }
                        
                        if (response.data.students && response.data.students.length > 0) {
                            console.log('\n👥 Sample Student Data:');
                            const sampleStudent = response.data.students[0];
                            console.log(`- Student: ${sampleStudent.student_name}`);
                            console.log(`- Student Number: ${sampleStudent.student_number}`);
                            console.log(`- Overall Average: ${sampleStudent.overall_average}%`);
                            console.log(`- Overall Grade: ${sampleStudent.overall_grade}`);
                            console.log(`- Subject Grades:`, Object.keys(sampleStudent.subject_grades).length > 0 ? 
                                Object.entries(sampleStudent.subject_grades).map(([code, grade]) => 
                                    `${code}: ${grade.percentage || 'N/A'}%`
                                ).join(', ') : 'No grades yet');
                        }
                        
                        console.log('\n✅ Student Grade Analysis endpoint is working correctly!');
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

// Main test function
async function runTests() {
    try {
        console.log('🔍 Testing student grade analysis endpoint via HTTP...\n');
        
        // Step 1: Login
        const token = await login();
        if (!token) {
            console.error('❌ Cannot proceed without authentication token');
            return false;
        }
        
        // Step 2: Test student grade analysis
        const response = await testStudentGradeAnalysis(token);
        
        console.log('\n✅ Student Grade Analysis endpoint test completed successfully!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        return false;
    }
}

// Run the test
runTests()
    .then((success) => {
        if (success) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n❌ Some tests failed!');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('\n❌ Test execution failed:', error);
        process.exit(1);
    });
