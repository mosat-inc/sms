const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function debugLoginFailure() {
    try {
        console.log('🔍 Debugging actual login failure...\n');
        
        // Test the exact credentials that are failing
        const testEmail = 'admin1@ubunifusec.com';
        const testPassword = 'admin1@system';
        
        console.log(`Testing: ${testEmail} with password: ${testPassword}\n`);
        
        // Create connection with the same config as the app
        let connection;
        try {
            // Try with the .env database configuration
            connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 3306,
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || 'allahuma',
                database: process.env.DB_NAME || 'sms_database'
            });
            console.log('✅ Database connection successful');
        } catch (dbError) {
            console.log('❌ Database connection failed:', dbError.message);
            console.log('Trying with localhost connection...');
            
            connection = await mysql.createConnection({
                host: 'localhost',
                user: 'root',
                password: 'allahuma',
                database: 'sms_database'
            });
            console.log('✅ Localhost database connection successful');
        }
        
        // Step 1: Check if user exists by email
        console.log('\n📧 Step 1: Looking for user by email...');
        const [emailResults] = await connection.execute(
            'SELECT id, username, email, password, role, first_name, last_name, is_active FROM users WHERE email = ?',
            [testEmail]
        );
        
        if (emailResults.length === 0) {
            console.log('❌ No user found with email:', testEmail);
            
            // Check what emails actually exist
            const [allEmails] = await connection.execute('SELECT email FROM users WHERE email LIKE "%admin%"');
            console.log('📋 Available admin emails:');
            allEmails.forEach(row => console.log(`   - ${row.email}`));
            await connection.end();
            return;
        }
        
        const user = emailResults[0];
        console.log('✅ User found:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.is_active}`);
        
        // Step 2: Check if account is active
        console.log('\n🟢 Step 2: Checking if account is active...');
        if (user.is_active !== 1) {
            console.log('❌ Account is not active!');
            console.log(`   is_active value: ${user.is_active}`);
            await connection.end();
            return;
        }
        console.log('✅ Account is active');
        
        // Step 3: Test password
        console.log('\n🔐 Step 3: Testing password...');
        try {
            const isValidPassword = await bcrypt.compare(testPassword, user.password);
            if (isValidPassword) {
                console.log('✅ Password is correct!');
            } else {
                console.log('❌ Password is incorrect!');
                console.log('   This could mean:');
                console.log('   1. The password has been changed');
                console.log('   2. The password was stored with different bcrypt settings');
                console.log('   3. There are extra spaces or characters');
            }
        } catch (bcryptError) {
            console.log('❌ Password comparison failed:', bcryptError.message);
        }
        
        // Step 4: Check the full authentication query that the app uses
        console.log('\n🔍 Step 4: Testing full authentication query...');
        const [authResults] = await connection.execute(
            'SELECT id, username, email, password, role, first_name, last_name, is_active FROM users WHERE email = ? AND is_active = 1',
            [testEmail]
        );
        
        if (authResults.length === 0) {
            console.log('❌ Full authentication query returned no results');
            console.log('   This means either:');
            console.log('   - Email not found');
            console.log('   - Account is not active (is_active != 1)');
        } else {
            console.log('✅ Full authentication query found user');
            const authUser = authResults[0];
            
            // Test password with the exact same method as auth
            const passwordMatch = await bcrypt.compare(testPassword, authUser.password);
            if (passwordMatch) {
                console.log('✅ Complete authentication simulation: SUCCESS');
                console.log('');
                console.log('🎯 The login should work. Possible issues:');
                console.log('   1. Frontend is sending different data');
                console.log('   2. Server environment variables are different');
                console.log('   3. Database connection from server is different');
                console.log('   4. JWT secret or other middleware issues');
            } else {
                console.log('❌ Complete authentication simulation: FAILED');
            }
        }
        
        await connection.end();
        
        // Step 5: Environment check
        console.log('\n🌐 Step 5: Environment check...');
        console.log('Current environment variables:');
        console.log(`   DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
        console.log(`   DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
        console.log(`   DB_USER: ${process.env.DB_USER || 'undefined'}`);
        console.log(`   DB_NAME: ${process.env.DB_NAME || 'undefined'}`);
        console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '[SET]' : 'undefined'}`);
        
    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugLoginFailure();