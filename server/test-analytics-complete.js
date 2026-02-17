const http = require('http');
const querystring = require('querystring');

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

// Step 2: Test analytics endpoint
async function testAnalytics(token) {
    console.log('\n🔍 Testing analytics endpoint...');
    
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/assessments/8/analytics',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await makeRequest(options);
        
        console.log(`✅ Analytics Response Status: ${response.statusCode}`);
        
        if (response.statusCode === 200 && response.data.success) {
            const { assessment, analytics } = response.data.data;
            
            console.log('\n📊 Assessment Info:');
            console.log('- Name:', assessment.assessment_name);
            console.log('- Subject:', assessment.subject_name);
            console.log('- Class:', assessment.class_name);
            console.log('- Max Marks:', assessment.max_marks);
            
            console.log('\n📈 Analytics Data:');
            console.log('- Total Students:', analytics.total_students);
            console.log('- Graded Students:', analytics.graded_students);
            console.log('- Attendance Rate:', analytics.attendance_rate + '%');
            console.log('- Pass Rate:', analytics.pass_rate + '%');
            console.log('- Average Score:', analytics.average_score + '%');
            console.log('- Median Score:', analytics.median_score + '%');
            console.log('- Highest Score:', analytics.highest_score + '%');
            console.log('- Lowest Score:', analytics.lowest_score + '%');
            console.log('- Grade Distribution:', JSON.stringify(analytics.grade_distribution, null, 2));
            console.log('- Performance Trends:', analytics.performance_trends.length + ' students');
            
            console.log('\n✅ Analytics endpoint is working correctly!');
            return true;
        } else {
            console.log('❌ Analytics request failed:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Analytics request failed:', error);
        return false;
    }
}

// Step 3: Test the results endpoint (for comparison)
async function testResults(token) {
    console.log('\n🔍 Testing results endpoint for comparison...');
    
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/assessments/8/results',
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await makeRequest(options);
        
        console.log(`✅ Results Response Status: ${response.statusCode}`);
        
        if (response.statusCode === 200 && response.data.success) {
            const { assessment, results, summary } = response.data.data;
            
            console.log('\n📊 Results Summary:');
            console.log('- Total Students:', summary.total_students);
            console.log('- Graded Students:', summary.graded_students);
            console.log('- Average Marks:', summary.average_marks);
            console.log('- Average Percentage:', summary.average_percentage + '%');
            console.log('- Pass Count:', summary.pass_count);
            console.log('- Fail Count:', summary.fail_count);
            
            console.log('\n✅ Results endpoint is working correctly!');
            return true;
        } else {
            console.log('❌ Results request failed:', response.data);
            return false;
        }
    } catch (error) {
        console.error('❌ Results request failed:', error);
        return false;
    }
}

// Main test function
async function runTests() {
    try {
        console.log('🧪 Starting comprehensive analytics test...\n');
        
        // Step 1: Login
        const token = await login();
        if (!token) {
            console.error('❌ Cannot proceed without authentication token');
            return false;
        }
        
        // Step 2: Test analytics
        const analyticsWorking = await testAnalytics(token);
        
        // Step 3: Test results for comparison
        const resultsWorking = await testResults(token);
        
        // Final summary
        console.log('\n📊 Test Summary:');
        console.log('- Analytics Endpoint:', analyticsWorking ? '✅ Working' : '❌ Not Working');
        console.log('- Results Endpoint:', resultsWorking ? '✅ Working' : '❌ Not Working');
        
        if (analyticsWorking && resultsWorking) {
            console.log('\n🎉 All assessment endpoints are working correctly!');
            return true;
        } else {
            console.log('\n⚠️  Some endpoints are not working properly');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return false;
    }
}

// Run the tests
runTests()
    .then((success) => {
        process.exit(success ? 0 : 1);
    })
    .catch((error) => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
