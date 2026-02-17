const { pool } = require('../config/database');

/**
 * Script to remove unwanted admin accounts, keeping only admin1 and admin2
 */

async function cleanAdminAccounts() {
    try {
        console.log('🧹 Cleaning admin accounts...');
        
        const connection = await pool.getConnection();
        
        try {
            // Get all admin accounts
            const [admins] = await connection.execute(
                'SELECT id, username, email, first_name, last_name FROM users WHERE role = "admin" ORDER BY id'
            );
            
            console.log(`📋 Found ${admins.length} admin account(s):`);
            admins.forEach(admin => {
                console.log(`   ${admin.id}: ${admin.username} (${admin.email})`);
            });
            
            // Remove accounts that are NOT admin1 or admin2
            const allowedUsernames = ['admin1', 'admin2'];
            const accountsToRemove = admins.filter(admin => !allowedUsernames.includes(admin.username));
            
            if (accountsToRemove.length === 0) {
                console.log('✅ No unwanted admin accounts found. Only admin1 and admin2 exist.');
                return;
            }
            
            console.log(`\\n🗑️  Removing ${accountsToRemove.length} unwanted admin account(s):`);
            
            for (const admin of accountsToRemove) {
                console.log(`   Removing: ${admin.username} (${admin.email})...`);
                
                const [result] = await connection.execute(
                    'DELETE FROM users WHERE id = ?',
                    [admin.id]
                );
                
                if (result.affectedRows > 0) {
                    console.log(`   ✅ Successfully removed: ${admin.username}`);
                } else {
                    console.log(`   ❌ Failed to remove: ${admin.username}`);
                }
            }
            
            // Verify final state
            const [finalAdmins] = await connection.execute(
                'SELECT id, username, email, employee_id FROM users WHERE role = "admin" ORDER BY id'
            );
            
            console.log('\\n🎉 Final admin accounts:');
            if (finalAdmins.length === 0) {
                console.log('   ⚠️  No admin accounts remain!');
            } else {
                finalAdmins.forEach(admin => {
                    console.log(`   ${admin.id}: ${admin.username} (${admin.email}) - Employee ID: ${admin.employee_id || 'Not set'}`);
                });
            }
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error cleaning admin accounts:', error);
    }
}

// Run the script
if (require.main === module) {
    cleanAdminAccounts().then(() => {
        console.log('\\n🏁 Admin cleanup completed');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = { cleanAdminAccounts };
