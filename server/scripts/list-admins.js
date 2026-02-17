const { pool } = require('../config/database');

/**
 * Script to list all current admin accounts
 */

async function listAdmins() {
    try {
        console.log('🔍 Listing all admin accounts...');
        
        const connection = await pool.getConnection();
        
        try {
            const [admins] = await connection.execute(
                'SELECT id, username, email, first_name, last_name, employee_id, is_active, created_at FROM users WHERE role = "admin" ORDER BY id'
            );
            
            if (admins.length === 0) {
                console.log('⚠️  No admin accounts found in database!');
                return;
            }
            
            console.log(`📋 Found ${admins.length} admin account(s):`);
            console.log('');
            
            admins.forEach((admin, index) => {
                console.log(`${index + 1}. ID: ${admin.id}`);
                console.log(`   Username: ${admin.username}`);
                console.log(`   Email: ${admin.email}`);
                console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
                console.log(`   Employee ID: ${admin.employee_id || 'Not set'}`);
                console.log(`   Status: ${admin.is_active ? 'Active' : 'Inactive'}`);
                console.log(`   Created: ${admin.created_at}`);
                console.log('');
            });
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error listing admin accounts:', error);
    }
}

// Run the script
if (require.main === module) {
    listAdmins().then(() => {
        console.log('🏁 Admin listing completed');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = { listAdmins };
