const fetch = require('node-fetch');
require('dotenv').config();

const testAPIEndpoint = async () => {
    try {
        console.log('🧪 Testing the actual API endpoints...');
        
        const baseURL = 'http://localhost:5000';
        
        // First, let's test the login to get a token
        console.log('\n🔐 Step 1: Logging in as mosatog...');
        
        const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'mosatog',
                password: 'teacher123' // or whatever the password is
            })
        });
        
        if (!loginResponse.ok) {
            console.log('❌ Login failed, trying different credentials...');
            
            // Try with a simpler password
            const loginResponse2 = await fetch(`${baseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'mosatog',
                    password: 'password' // common default
                })
            });
            
            if (!loginResponse2.ok) {
                console.log('❌ Still failed, skipping token-based tests');
                console.log('⚠️  You may need to check the teacher password or create a test token');
                return;
            }
            
            const loginResult2 = await loginResponse2.json();
            console.log('✅ Login successful with alternative password');
            var token = loginResult2.data.token;
        } else {
            const loginResult = await loginResponse.json();
            console.log('✅ Login successful');
            var token = loginResult.data.token;
        }
        
        console.log('🎫 Token obtained:', token ? 'YES' : 'NO');
        
        // Test the classes endpoint
        console.log('\n📚 Step 2: Testing /api/assessments/teacher/classes...');
        
        const classesResponse = await fetch(`${baseURL}/api/assessments/teacher/classes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (classesResponse.ok) {
            const classesResult = await classesResponse.json();
            console.log('✅ Classes API response:', classesResult);
            
            if (classesResult.data && classesResult.data.length > 0) {
                const firstClassId = classesResult.data[0].id;
                console.log(`🎯 Using class ID ${firstClassId} for subjects test`);
                
                // Test the subjects endpoint
                console.log(`\n📖 Step 3: Testing /api/assessments/teacher/subjects/${firstClassId}...`);
                
                const subjectsResponse = await fetch(`${baseURL}/api/assessments/teacher/subjects/${firstClassId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (subjectsResponse.ok) {
                    const subjectsResult = await subjectsResponse.json();
                    console.log('✅ Subjects API response:', subjectsResult);
                    
                    if (subjectsResult.data && subjectsResult.data.length > 0) {
                        console.log(`📋 Found ${subjectsResult.data.length} subjects:`);
                        subjectsResult.data.forEach(subject => {
                            console.log(`   - ${subject.name} (${subject.code})`);
                        });
                        console.log('🎉 SUCCESS: The API is working correctly!');
                    } else {
                        console.log('❌ No subjects returned in API response');
                        console.log('🔍 This suggests the issue is in the database query or response formatting');
                    }
                } else {
                    const errorText = await subjectsResponse.text();
                    console.log(`❌ Subjects API failed with status ${subjectsResponse.status}`);
                    console.log('Error response:', errorText);
                }
            } else {
                console.log('❌ No classes returned in API response');
            }
        } else {
            const errorText = await classesResponse.text();
            console.log(`❌ Classes API failed with status ${classesResponse.status}`);
            console.log('Error response:', errorText);
        }
        
    } catch (error) {
        console.error('💥 Error testing API endpoints:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('🚨 Server is not running! Please start the server with: npm run dev');
        }
    }
};

// Run the test
testAPIEndpoint()
    .then(() => {
        console.log('\n🏁 API endpoint test completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });
