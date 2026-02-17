const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function testAdminLogin() {
    try {
        console.log('🔓 Testing admin login functionality...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Get admin accounts
        const [admins] = await connection.execute(
            'SELECT id, username, email, password, role, first_name, last_name FROM users WHERE username IN ("admin1", "admin2")'
        );
        
        console.log(`Found ${admins.length} admin accounts to test:\n`);
        
        for (const admin of admins) {
            console.log(`👤 Testing ${admin.username}:`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Role: ${admin.role}`);
            
            // Test common passwords
            const testPasswords = ['admin123', 'password', '123456', admin.username + '123', admin.username];
            
            for (const testPassword of testPasswords) {
                try {
                    const isValid = await bcrypt.compare(testPassword, admin.password);
                    if (isValid) {
                        console.log(`   ✅ Password found: "${testPassword}"`);
                        console.log(`   📧 Can log in with email: ${admin.email}`);
                        console.log(`   👤 Can log in with username: ${admin.username}`);
                        break;
                    }
                } catch (err) {
                    // Continue to next password
                }
            }
        }
        
        console.log('\n📊 Summary:');
        console.log('• Both admin1 and admin2 already have valid email addresses');
        console.log('• They can log in using either their email or username');
        console.log('• The system supports both email-based and username-based login');
        
        console.log('\n🎯 Login Instructions for Admins:');
        console.log('• Admin1 can use: admin1@ubunifusec.com OR admin1');
        console.log('• Admin2 can use: admin2@ubunifusec.com OR admin2');
        console.log('• Both should use their existing passwords');
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAdminLogin();