const { pool } = require('../config/database');

/**
 * Script to check for and remove demo admin account from database
 */

async function removeDemoAdmin() {
    try {
        console.log('🔍 Checking for demo admin account...');
        
        const connection = await pool.getConnection();
        
        try {
            // Check if demo admin exists
            const [demoAdmins] = await connection.execute(
                'SELECT id, username, email, role FROM users WHERE username = ? OR email = ?',
                ['admin', 'admin@ubunifusec.com']
            );
            
            if (demoAdmins.length === 0) {
                console.log('✅ No demo admin accounts found in database');
                return;
            }
            
            console.log('📋 Found demo admin accounts:');
            demoAdmins.forEach(admin => {
                console.log(`   ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}, Role: ${admin.role}`);
            });
            
            // Remove demo admin accounts
            for (const admin of demoAdmins) {
                console.log(`🗑️  Removing demo admin: ${admin.username}...`);
                
                const [result] = await connection.execute(
                    'DELETE FROM users WHERE id = ?',
                    [admin.id]
                );
                
                if (result.affectedRows > 0) {
                    console.log(`✅ Successfully removed demo admin: ${admin.username} (ID: ${admin.id})`);
                } else {
                    console.log(`❌ Failed to remove demo admin: ${admin.username}`);
                }
            }
            
            // Verify removal
            const [remainingDemo] = await connection.execute(
                'SELECT id, username FROM users WHERE username = ? OR email = ?',
                ['admin', 'admin@ubunifusec.com']
            );
            
            if (remainingDemo.length === 0) {
                console.log('🎉 All demo admin accounts successfully removed!');
                
                // Show current admin accounts
                const [currentAdmins] = await connection.execute(
                    'SELECT id, username, email, employee_id FROM users WHERE role = "admin" ORDER BY id'
                );
                
                console.log('\\n📋 Current admin accounts:');
                if (currentAdmins.length > 0) {
                    currentAdmins.forEach(admin => {
                        console.log(`   ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}, Employee ID: ${admin.employee_id}`);
                    });
                } else {
                    console.log('   ⚠️  No admin accounts found!');
                }
            } else {
                console.log('❌ Some demo accounts still remain');
            }
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error removing demo admin:', error);
    }
}

// Run the script
if (require.main === module) {
    removeDemoAdmin().then(() => {
        console.log('\\n🏁 Demo admin removal process completed');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = { removeDemoAdmin };
