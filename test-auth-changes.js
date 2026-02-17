const axios = require('axios');

// Test the modified authentication endpoints
async function testAuthChanges() {
    const baseURL = 'http://localhost:5000';
    
    console.log('🧪 Testing Authentication Changes...\n');
    
    // Test 1: Login with email (should work)
    console.log('📧 Test 1: Login with email');
    try {
        const loginResponse = await axios.post(`${baseURL}/api/auth/login-direct`, {
            email: 'admin@ubunifusec.com',
            password: 'admin123'
        });
        
        if (loginResponse.data.success) {
            console.log('✅ Email login works!');
            console.log('User:', loginResponse.data.data.user.email);
        } else {
            console.log('❌ Email login failed:', loginResponse.data.message);
        }
    } catch (error) {
        console.log('❌ Email login error:', error.response?.data?.message || error.message);
    }
    
    console.log();
    
    // Test 2: Registration with optional username
    console.log('👤 Test 2: Registration with no username (should auto-generate)');
    try {
        const registerResponse = await axios.post(`${baseURL}/api/auth/register`, {
            first_name: 'Test',
            last_name: 'User',
            email: 'test@example.com',
            // username: '', // Empty username - should auto-generate
            phone: '0789123456',
            role: 'teacher',
            password: 'TestPassword123!'
        });
        
        if (registerResponse.data.success) {
            console.log('✅ Registration with auto-generated username works!');
            console.log('Generated username:', registerResponse.data.data.username);
            console.log('Email:', registerResponse.data.data.email);
        } else {
            console.log('❌ Registration failed:', registerResponse.data.message);
        }
    } catch (error) {
        console.log('❌ Registration error:', error.response?.data?.message || error.message);
        if (error.response?.data?.errors) {
            console.log('Validation errors:', error.response.data.errors);
        }
    }
    
    console.log();
    
    // Test 3: Registration with custom username
    console.log('👤 Test 3: Registration with custom username');
    try {
        const registerResponse = await axios.post(`${baseURL}/api/auth/register`, {
            first_name: 'Test',
            last_name: 'User2',
            email: 'test2@example.com',
            username: 'customuser',
            phone: '0789123457',
            role: 'parent',
            password: 'TestPassword123!'
        });
        
        if (registerResponse.data.success) {
            console.log('✅ Registration with custom username works!');
            console.log('Custom username:', registerResponse.data.data.username);
            console.log('Email:', registerResponse.data.data.email);
        } else {
            console.log('❌ Registration failed:', registerResponse.data.message);
        }
    } catch (error) {
        console.log('❌ Registration error:', error.response?.data?.message || error.message);
        if (error.response?.data?.errors) {
            console.log('Validation errors:', error.response.data.errors);
        }
    }
    
    console.log();
    console.log('🏁 Test completed!');
}

// Run the test if server is available
testAuthChanges().catch(console.error);
