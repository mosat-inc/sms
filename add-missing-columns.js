const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMissingColumns() {
    try {
        console.log('🔧 Adding missing columns to users table...\n');
        
        // Use the smart database configuration
        const { pool } = require('./server/config/database');
        const connection = await pool.getConnection();
        
        console.log('📋 Checking current table structure...');
        
        // Check current columns in users table
        const [columns] = await connection.execute('DESCRIBE users');
        const existingColumns = columns.map(col => col.Field);
        
        console.log('Current columns:', existingColumns.join(', '));
        
        // Check if temp_password column exists
        if (!existingColumns.includes('temp_password')) {
            console.log('\n➕ Adding temp_password column...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN temp_password VARCHAR(255) NULL AFTER password
            `);
            console.log('✅ temp_password column added');
        } else {
            console.log('✅ temp_password column already exists');
        }
        
        // Check if must_change_password column exists
        if (!existingColumns.includes('must_change_password')) {
            console.log('\n➕ Adding must_change_password column...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN must_change_password BOOLEAN DEFAULT FALSE AFTER temp_password
            `);
            console.log('✅ must_change_password column added');
        } else {
            console.log('✅ must_change_password column already exists');
        }
        
        // Also add password_reset_at and password_reset_by if they don't exist
        if (!existingColumns.includes('password_reset_at')) {
            console.log('\n➕ Adding password_reset_at column...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN password_reset_at TIMESTAMP NULL AFTER must_change_password
            `);
            console.log('✅ password_reset_at column added');
        } else {
            console.log('✅ password_reset_at column already exists');
        }
        
        if (!existingColumns.includes('password_reset_by')) {
            console.log('\n➕ Adding password_reset_by column...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN password_reset_by INT NULL AFTER password_reset_at,
                ADD FOREIGN KEY (password_reset_by) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log('✅ password_reset_by column added');
        } else {
            console.log('✅ password_reset_by column already exists');
        }
        
        connection.release();
        
        console.log('\n🎉 Database schema update completed!');
        console.log('\n📋 Updated users table now includes:');
        console.log('• temp_password - for temporary passwords');
        console.log('• must_change_password - flag for password reset requirement');
        console.log('• password_reset_at - timestamp of password reset');
        console.log('• password_reset_by - admin who reset the password');
        
        console.log('\n🔐 Now testing admin login...');
        
        // Test the login now that columns exist
        const Auth = require('./server/utils/auth');
        const result = await Auth.login('admin1@ubunifusec.com', 'admin1@system');
        
        if (result.success) {
            console.log('✅ Admin1 login test: SUCCESS!');
            console.log(`   User: ${result.user.first_name} ${result.user.last_name}`);
            console.log(`   Role: ${result.user.role}`);
            console.log(`   Token: ${result.token ? 'Generated' : 'Missing'}`);
        } else {
            console.log('❌ Admin1 login test: FAILED');
            console.log(`   Error: ${result.message}`);
        }
        
    } catch (error) {
        console.error('❌ Error updating database schema:', error.message);
        console.error('Stack:', error.stack);
    }
}

addMissingColumns();