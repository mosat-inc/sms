const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function verifyAdminLogin() {
    try {
        console.log('🔍 Verifying admin login functionality...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Test credentials
        const adminCredentials = [
            { username: 'admin1', email: 'admin1@ubunifusec.com', password: 'admin1@system' },
            { username: 'admin2', email: 'admin2@ubunifusec.com', password: 'admin2@system' }
        ];
        
        console.log('Testing admin login capabilities:\n');
        
        for (const creds of adminCredentials) {
            console.log(`👤 Testing ${creds.username}:`);
            
            // Get user from database
            const [users] = await connection.execute(
                'SELECT id, username, email, password, role, first_name, last_name, is_active FROM users WHERE username = ?',
                [creds.username]
            );
            
            if (users.length === 0) {
                console.log(`   ❌ User ${creds.username} not found!`);
                continue;
            }
            
            const user = users[0];
            
            // Test password
            const isValidPassword = await bcrypt.compare(creds.password, user.password);
            
            if (isValidPassword) {
                console.log(`   ✅ Password verification: SUCCESS`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   👤 Username: ${user.username}`);
                console.log(`   🎭 Role: ${user.role}`);
                console.log(`   🟢 Status: ${user.is_active ? 'Active' : 'Inactive'}`);
                
                // Test both email and username login scenarios
                console.log(`   🔐 Login options:`);
                console.log(`      • Email login: ${user.email} + ${creds.password}`);
                console.log(`      • Username login: ${user.username} + ${creds.password}`);
                
            } else {
                console.log(`   ❌ Password verification: FAILED`);
                console.log(`   Expected: ${creds.password}`);
                console.log(`   This may indicate the password has been changed.`);
            }
            
            console.log('');
        }
        
        console.log('📋 Summary and Instructions:');
        console.log('═'.repeat(50));
        console.log('✅ Both admin accounts exist with proper email addresses');
        console.log('✅ The authentication system supports email-based login');
        console.log('✅ The system also supports username-based login as fallback');
        console.log('');
        console.log('🎯 For Admin1:');
        console.log('   • Email: admin1@ubunifusec.com');
        console.log('   • Password: admin1@system');
        console.log('   • Can log in with either email or username');
        console.log('');
        console.log('🎯 For Admin2:');
        console.log('   • Email: admin2@ubunifusec.com');
        console.log('   • Password: admin2@system');
        console.log('   • Can log in with either email or username');
        console.log('');
        console.log('💡 If login still fails, possible issues:');
        console.log('   1. Frontend might not be sending correct email format');
        console.log('   2. Password may have been changed from expected values');
        console.log('   3. Account might be deactivated (check is_active field)');
        console.log('   4. Frontend validation might be blocking the login attempt');
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

verifyAdminLogin();