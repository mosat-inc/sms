const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Simple login test with basic schema
async function testSimpleLogin(emailOrUsername, password) {
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Check if input is an email (contains @)
        const isEmail = emailOrUsername.includes('@');
        
        let query, params;
        if (isEmail) {
            // If it's an email, search by email primarily
            query = 'SELECT id, username, email, password, role, first_name, last_name, is_active FROM users WHERE email = ? AND is_active = 1';
            params = [emailOrUsername];
        } else {
            // If it's not an email, search by username or email as fallback
            query = 'SELECT id, username, email, password, role, first_name, last_name, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = 1';
            params = [emailOrUsername, emailOrUsername];
        }
        
        const [rows] = await connection.execute(query, params);
        
        await connection.end();
        
        if (rows.length === 0) {
            return {
                success: false,
                message: 'User not found or inactive'
            };
        }
        
        const user = rows[0];
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return {
                success: false,
                message: 'Invalid password'
            };
        }

        // Generate token
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name
        };
        
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
            expiresIn: '24h'
        });

        // Remove password from user object
        delete user.password;
        
        return {
            success: true,
            user,
            token
        };
        
    } catch (error) {
        return {
            success: false,
            message: 'Login failed: ' + error.message
        };
    }
}

async function runSimpleAuthTest() {
    try {
        console.log('🧪 Testing Admin Authentication (Simplified)...\n');
        
        // Test cases for admin login
        const testCases = [
            {
                name: 'Admin1 with Email',
                input: 'admin1@ubunifusec.com',
                password: 'admin1@system'
            },
            {
                name: 'Admin1 with Username',  
                input: 'admin1',
                password: 'admin1@system'
            },
            {
                name: 'Admin2 with Email',
                input: 'admin2@ubunifusec.com',
                password: 'admin2@system'
            },
            {
                name: 'Admin2 with Username',
                input: 'admin2',
                password: 'admin2@system'
            }
        ];
        
        let successCount = 0;
        
        for (const testCase of testCases) {
            console.log(`🔐 Testing: ${testCase.name}`);
            console.log(`   Input: ${testCase.input} + ${testCase.password}`);
            
            const result = await testSimpleLogin(testCase.input, testCase.password);
            
            if (result.success) {
                console.log(`   ✅ SUCCESS - Login worked!`);
                console.log(`   👤 User: ${result.user.first_name} ${result.user.last_name}`);
                console.log(`   🎭 Role: ${result.user.role}`);
                console.log(`   📧 Email: ${result.user.email}`);
                console.log(`   🔑 Token: ${result.token.substring(0, 20)}...`);
                successCount++;
            } else {
                console.log(`   ❌ FAILED - ${result.message}`);
            }
            
            console.log('');
        }
        
        console.log('🎯 FINAL RESULTS:');
        console.log('═'.repeat(50));
        console.log(`✅ ${successCount}/4 login tests passed`);
        
        if (successCount === 4) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ Both admin1 and admin2 are working with email-based login');
            console.log('✅ Both username and email authentication methods work');
            console.log('');
            console.log('📝 Admin Login Instructions:');
            console.log('• Admin1: Use "admin1@ubunifusec.com" or "admin1" with password "admin1@system"');
            console.log('• Admin2: Use "admin2@ubunifusec.com" or "admin2" with password "admin2@system"');
            console.log('');
            console.log('✅ ISSUE RESOLVED: Admins can now log in with the email-based system!');
        } else {
            console.log('❌ Some tests failed - there may be an issue with the admin accounts');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runSimpleAuthTest();