const mysql = require('mysql2/promise');

async function checkAdminAccounts() {
    try {
        console.log('🔍 Checking admin accounts in database...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Check all admin users
        const [admins] = await connection.execute('SELECT id, username, email, role, first_name, last_name FROM users WHERE role = "admin"');
        console.log('👑 Admin users in database:', admins.length);
        
        if (admins.length > 0) {
            admins.forEach(admin => {
                console.log(`  - ID: ${admin.id}, Username: "${admin.username}", Email: "${admin.email}", Role: ${admin.role}, Name: ${admin.first_name} ${admin.last_name}`);
            });
        } else {
            console.log('  - No admin users found!');
        }
        
        // Check for users with usernames admin1 or admin2
        const [specificAdmins] = await connection.execute('SELECT id, username, email, role, first_name, last_name FROM users WHERE username IN ("admin1", "admin2")');
        console.log('\n🎯 Specific admin1/admin2 users:', specificAdmins.length);
        
        if (specificAdmins.length > 0) {
            specificAdmins.forEach(admin => {
                console.log(`  - ID: ${admin.id}, Username: "${admin.username}", Email: "${admin.email || 'NULL'}", Role: ${admin.role}, Name: ${admin.first_name} ${admin.last_name}`);
            });
        } else {
            console.log('  - No admin1 or admin2 users found!');
        }
        
        // Check for users with null or empty emails
        const [emailIssues] = await connection.execute('SELECT id, username, email, role FROM users WHERE email IS NULL OR email = ""');
        console.log('\n❌ Users with email issues:', emailIssues.length);
        
        if (emailIssues.length > 0) {
            emailIssues.forEach(user => {
                console.log(`  - ID: ${user.id}, Username: "${user.username}", Email: "${user.email || 'NULL'}", Role: ${user.role}`);
            });
        }
        
        // Check all users with username containing "admin"
        const [adminLike] = await connection.execute('SELECT id, username, email, role, first_name, last_name FROM users WHERE username LIKE "%admin%"');
        console.log('\n🔍 Users with "admin" in username:', adminLike.length);
        
        if (adminLike.length > 0) {
            adminLike.forEach(user => {
                console.log(`  - ID: ${user.id}, Username: "${user.username}", Email: "${user.email || 'NULL'}", Role: ${user.role}, Name: ${user.first_name} ${user.last_name}`);
            });
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkAdminAccounts();