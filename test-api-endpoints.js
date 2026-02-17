const axios = require('axios');

async function testProfileEndpoints() {
    try {
        console.log('Testing profile API endpoints...\n');
        
        // First login to get a token
        console.log('=== Step 1: Login ===');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login-direct', {
            username: 'mosatog',  // Use the second teacher from our DB test
            password: 'teacher123'  // Default password from the schema
        });
        
        if (!loginResponse.data.success) {
            console.error('Login failed:', loginResponse.data);
            return;
        }
        
        console.log('Login successful');
        const token = loginResponse.data.data.token;
        const user = loginResponse.data.data.user;
        console.log('Logged in user:', user);
        
        // Test GET profile endpoint
        console.log('\n=== Step 2: GET Profile ===');
        const getProfileResponse = await axios.get('http://localhost:5000/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('GET Profile Response:');
        console.log('- Success:', getProfileResponse.data.success);
        console.log('- User data:', getProfileResponse.data.data.user);
        console.log('- subjects_taught:', getProfileResponse.data.data.user.subjects_taught);
        console.log('- classes_assigned:', getProfileResponse.data.data.user.classes_assigned);
        
        // Test PUT profile endpoint to update subjects and classes
        console.log('\n=== Step 3: PUT Profile Update ===');
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
            bio: 'Updated bio via API test'
        };
        
        console.log('Sending update with data:', updateData);
        
        const updateResponse = await axios.put('http://localhost:5000/api/auth/profile', updateData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('PUT Profile Response:');
        console.log('- Success:', updateResponse.data.success);
        console.log('- Message:', updateResponse.data.message);
        console.log('- Updated user data:', updateResponse.data.data.user);
        console.log('- Updated subjects_taught:', updateResponse.data.data.user.subjects_taught);
        console.log('- Updated classes_assigned:', updateResponse.data.data.user.classes_assigned);
        
        // Test GET profile again to confirm the update
        console.log('\n=== Step 4: GET Profile After Update ===');
        const getProfileAfterResponse = await axios.get('http://localhost:5000/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('GET Profile After Update Response:');
        console.log('- Success:', getProfileAfterResponse.data.success);
        console.log('- subjects_taught:', getProfileAfterResponse.data.data.user.subjects_taught);
        console.log('- classes_assigned:', getProfileAfterResponse.data.data.user.classes_assigned);
        console.log('- bio:', getProfileAfterResponse.data.data.user.bio);
        
    } catch (error) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('Network Error:', error.message);
            console.error('Is the server running on http://localhost:5000?');
        } else {
            console.error('Error:', error.message);
        }
    }
}

testProfileEndpoints();
