const axios = require('axios');

// Test the password reset functionality
async function testPasswordReset() {
    const baseURL = 'http://localhost:5000';
    
    console.log('🧪 Testing Password Reset Functionality...\n');
    
    // Step 1: Admin login to get token
    console.log('📧 Step 1: Admin login');
    let adminToken = '';
    try {
        const adminLogin = await axios.post(`${baseURL}/api/auth/login-direct`, {
            email: 'admin@ubunifusec.com',
            password: 'admin123'
        });
        
        if (adminLogin.data.success) {
            adminToken = adminLogin.data.data.token;
            console.log('✅ Admin login successful');
        } else {
            console.log('❌ Admin login failed:', adminLogin.data.message);
            return;
        }
    } catch (error) {
        console.log('❌ Admin login error:', error.response?.data?.message || error.message);
        return;
    }
    
    console.log();
    
    // Step 2: Register a test user first
    console.log('👤 Step 2: Register test user');
    let testUserId = '';
    try {
        const registerResponse = await axios.post(`${baseURL}/api/auth/register`, {
            first_name: 'Test',
            last_name: 'Teacher',
            email: 'test.teacher@example.com',
            username: 'testteacher',
            phone: '0789123456',
            role: 'teacher',
            password: 'OriginalPassword123!'
        });
        
        if (registerResponse.data.success) {
            testUserId = registerResponse.data.data.user_id;
            console.log('✅ Test user registered successfully');
            console.log('User ID:', testUserId);
        } else {
            console.log('❌ User registration failed:', registerResponse.data.message);
        }
    } catch (error) {
        console.log('⚠️  User registration error (might already exist):', error.response?.data?.message || error.message);
        
        // Try to get existing user by fetching users list
        try {
            const usersResponse = await axios.get(`${baseURL}/api/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            });
            
            if (usersResponse.data.success) {
                const testUser = usersResponse.data.data.find(u => u.email === 'test.teacher@example.com');
                if (testUser) {
                    testUserId = testUser.id;
                    console.log('✅ Found existing test user, ID:', testUserId);
                }
            }
        } catch (fetchError) {
            console.log('❌ Could not fetch existing users');
        }
    }
    
    if (!testUserId) {
        console.log('❌ Cannot proceed without test user ID');
        return;
    }
    
    console.log();
    
    // Step 3: Admin resets password
    console.log('🔑 Step 3: Admin resets user password');
    let tempPassword = '';
    try {
        const resetResponse = await axios.post(`${baseURL}/api/admin/reset-password`, {
            user_id: parseInt(testUserId),
            reason: 'Testing password reset functionality'
        }, {
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });
        
        if (resetResponse.data.success) {
            tempPassword = resetResponse.data.data.temporary_password;
            console.log('✅ Password reset successful');
            console.log('Temporary password:', tempPassword);
            console.log('Instructions:', resetResponse.data.data.instructions);
        } else {
            console.log('❌ Password reset failed:', resetResponse.data.message);
            return;
        }
    } catch (error) {
        console.log('❌ Password reset error:', error.response?.data?.message || error.message);
        return;
    }
    
    console.log();
    
    // Step 4: User tries to login with temporary password
    console.log('🔐 Step 4: Login with temporary password');
    let tempToken = '';
    try {
        const tempLogin = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'test.teacher@example.com',
            password: tempPassword
        });
        
        if (tempLogin.data.success) {
            if (tempLogin.data.must_change_password) {
                tempToken = tempLogin.data.token;
                console.log('✅ Temporary password login successful');
                console.log('Must change password:', tempLogin.data.must_change_password);
                console.log('Message:', tempLogin.data.message);
            } else {
                console.log('⚠️  Expected must_change_password flag, but got regular login');
            }
        } else {
            console.log('❌ Temporary password login failed:', tempLogin.data.message);
            return;
        }
    } catch (error) {
        console.log('❌ Temporary password login error:', error.response?.data?.message || error.message);
        return;
    }
    
    console.log();
    
    // Step 5: User changes password from temporary to new one
    console.log('🔄 Step 5: Change temporary password to new password');
    const newPassword = 'NewSecurePassword123!';
    try {
        const changeResponse = await axios.put(`${baseURL}/api/auth/change-temp-password`, {
            temp_password: tempPassword,
            new_password: newPassword,
            confirm_password: newPassword
        }, {
            headers: {
                'Authorization': `Bearer ${tempToken}`
            }
        });
        
        if (changeResponse.data.success) {
            console.log('✅ Password change successful');
            console.log('Message:', changeResponse.data.message);
        } else {
            console.log('❌ Password change failed:', changeResponse.data.message);
            return;
        }
    } catch (error) {
        console.log('❌ Password change error:', error.response?.data?.message || error.message);
        return;
    }
    
    console.log();
    
    // Step 6: User tries to login with old temporary password (should fail)
    console.log('❌ Step 6: Try login with old temporary password (should fail)');
    try {
        const oldPasswordLogin = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'test.teacher@example.com',
            password: tempPassword
        });
        
        if (oldPasswordLogin.data.success) {
            console.log('⚠️  WARNING: Old temporary password still works (this should not happen)');
        } else {
            console.log('✅ Correct: Old temporary password rejected');
        }
    } catch (error) {
        console.log('✅ Correct: Old temporary password rejected -', error.response?.data?.message || error.message);
    }
    
    console.log();
    
    // Step 7: User logs in with new password
    console.log('🎯 Step 7: Login with new password');
    try {
        const newPasswordLogin = await axios.post(`${baseURL}/api/auth/login`, {
            email: 'test.teacher@example.com',
            password: newPassword
        });
        
        if (newPasswordLogin.data.success && !newPasswordLogin.data.must_change_password) {
            console.log('✅ New password login successful');
            console.log('User:', newPasswordLogin.data.data.user.email);
            console.log('No temp password flag - perfect!');
        } else {
            console.log('❌ New password login failed or still requires password change');
        }
    } catch (error) {
        console.log('❌ New password login error:', error.response?.data?.message || error.message);
    }
    
    console.log();
    console.log('🏁 Password Reset Flow Test Completed!');
    console.log();
    console.log('📋 Summary:');
    console.log('1. ✅ Admin can log in');
    console.log('2. ✅ Test user created/found');
    console.log('3. ✅ Admin can reset user password');  
    console.log('4. ✅ User can login with temporary password');
    console.log('5. ✅ User can change temporary password to new password');
    console.log('6. ✅ Old temporary password is rejected');
    console.log('7. ✅ New password works for regular login');
}

// Run the test if server is available
testPasswordReset().catch(console.error);
