const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testProfileWithCurl() {
    try {
        console.log('Testing profile API with curl...\n');
        
        // Step 1: Login to get token
        console.log('=== Step 1: Login ===');
        const loginCmd = `curl -s -X POST http://localhost:5000/api/auth/login-direct -H "Content-Type: application/json" -d "{\\"username\\": \\"teacher1\\", \\"password\\": \\"teacher123\\"}"`;
        
        const { stdout: loginResult } = await execAsync(loginCmd);
        const loginData = JSON.parse(loginResult);
        
        if (!loginData.success) {
            console.error('Login failed:', loginData);
            return;
        }
        
        console.log('Login successful');
        const token = loginData.data.token;
        console.log('User:', loginData.data.user);
        
        // Step 2: GET profile
        console.log('\\n=== Step 2: GET Profile ===');
        const getProfileCmd = `curl -s -X GET http://localhost:5000/api/auth/profile -H "Authorization: Bearer ${token}"`;
        
        const { stdout: getResult } = await execAsync(getProfileCmd);
        const getProfileData = JSON.parse(getResult);
        
        console.log('GET Profile Response:');
        console.log('- Success:', getProfileData.success);
        console.log('- subjects_taught:', getProfileData.data.user.subjects_taught);
        console.log('- classes_assigned:', getProfileData.data.user.classes_assigned);
        
        // Step 3: Update profile
        console.log('\\n=== Step 3: PUT Profile Update ===');
        const updateData = {
            subjects_taught: [
                { id: 1, name: 'Mathematics' },
                { id: 3, name: 'Chemistry' },
                { id: 4, name: 'Biology' }
            ],
            classes_assigned: [
                { id: 1, name: 'Form 1A' },
                { id: 3, name: 'Form 1C' },
                { id: 5, name: 'Form 2A' }
            ],
            bio: 'Updated bio via curl test'
        };
        
        const updateDataStr = JSON.stringify(updateData).replace(/"/g, '\\"');
        const updateCmd = `curl -s -X PUT http://localhost:5000/api/auth/profile -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d "${updateDataStr}"`;
        
        console.log('Sending update...');
        const { stdout: updateResult } = await execAsync(updateCmd);
        const updateResponseData = JSON.parse(updateResult);
        
        console.log('PUT Profile Response:');
        console.log('- Success:', updateResponseData.success);
        console.log('- Message:', updateResponseData.message);
        console.log('- Updated subjects_taught:', updateResponseData.data.user.subjects_taught);
        console.log('- Updated classes_assigned:', updateResponseData.data.user.classes_assigned);
        
        // Step 4: GET profile again
        console.log('\\n=== Step 4: GET Profile After Update ===');
        const { stdout: getFinalResult } = await execAsync(getProfileCmd);
        const getFinalData = JSON.parse(getFinalResult);
        
        console.log('Final GET Profile Response:');
        console.log('- Success:', getFinalData.success);
        console.log('- subjects_taught:', getFinalData.data.user.subjects_taught);
        console.log('- classes_assigned:', getFinalData.data.user.classes_assigned);
        console.log('- bio:', getFinalData.data.user.bio);
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.stdout) {
            console.log('Stdout:', error.stdout);
        }
        if (error.stderr) {
            console.log('Stderr:', error.stderr);
        }
    }
}

testProfileWithCurl();
