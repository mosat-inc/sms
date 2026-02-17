const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

/**
 * Script to create two admin accounts as requested
 * admin1 with password admin1@system
 * admin2 with password admin2@system
 */

async function createAdminAccounts() {
    try {
        console.log('🔧 Creating admin accounts...');
        
        const adminAccounts = [
            {
                username: 'admin1',
                email: 'admin1@ubunifusec.com',
                password: 'admin1@system',
                first_name: 'Admin',
                last_name: 'One',
                phone: '+255789000001',
                department: 'Administration',
                position: 'System Administrator',
                employee_id: 'ADM001'
            },
            {
                username: 'admin2',
                email: 'admin2@ubunifusec.com',
                password: 'admin2@system',
                first_name: 'Admin',
                last_name: 'Two',
                phone: '+255789000002',
                department: 'Administration',
                position: 'System Administrator',
                employee_id: 'ADM002'
            }
        ];
        
        const connection = await pool.getConnection();
        
        try {
            for (const admin of adminAccounts) {
                console.log(`\n🔧 Creating admin: ${admin.username}...`);
                
                // Check if username already exists
                const [existingUser] = await connection.execute(
                    'SELECT id FROM users WHERE username = ? OR email = ?',
                    [admin.username, admin.email]
                );
                
                if (existingUser.length > 0) {
                    console.log(`❌ User ${admin.username} already exists, skipping...`);
                    continue;
                }
                
                // Hash the password
                console.log(`🔒 Hashing password for ${admin.username}...`);
                const hashedPassword = await bcrypt.hash(admin.password, 12);
                
                // Insert new admin user
                const [result] = await connection.execute(`
                    INSERT INTO users (
                        username, email, password, role, 
                        first_name, last_name, firstName, lastName,
                        phone, department, position, employee_id, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
                `, [
                    admin.username,
                    admin.email,
                    hashedPassword,
                    'admin',
                    admin.first_name,
                    admin.last_name,
                    admin.first_name,
                    admin.last_name,
                    admin.phone,
                    admin.department,
                    admin.position,
                    admin.employee_id
                ]);
                
                console.log(`✅ Admin ${admin.username} created successfully!`);
                console.log(`   ID: ${result.insertId}`);
                console.log(`   Username: ${admin.username}`);
                console.log(`   Email: ${admin.email}`);
                console.log(`   Employee ID: ${admin.employee_id}`);
                console.log(`   Password: ${admin.password}`);
            }
            
            console.log('\n🎉 All admin accounts created successfully!');
            console.log('\n📋 Login Credentials Summary:');
            console.log('   Username: admin1 | Password: admin1@system');
            console.log('   Username: admin2 | Password: admin2@system');
            console.log('\n⚠️  SECURITY NOTE: Change passwords after first login!');
            
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error creating admin accounts:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            console.log('💡 Some accounts may already exist');
        }
    }
}

// Run the script
if (require.main === module) {
    createAdminAccounts().then(() => {
        console.log('\n🏁 Admin creation process completed');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Script failed:', error);
        process.exit(1);
    });
}

module.exports = { createAdminAccounts };
