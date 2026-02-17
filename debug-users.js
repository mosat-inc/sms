const mysql = require('mysql2/promise');

async function debugUsers() {
    try {
        console.log('🔍 Checking users in database...');
        
        // Create connection
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'allahuma',
            database: 'sms_database'
        });
        
        // Check users table
        const [users] = await connection.execute('SELECT id, username, role, first_name, last_name FROM users LIMIT 10');
        console.log('📊 Users in database:', users.length);
        users.forEach(user => {
            console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Name: ${user.first_name} ${user.last_name}`);
        });
        
        // Check students table
        const [students] = await connection.execute('SELECT id, student_id, user_id FROM students LIMIT 10');
        console.log('\n📚 Students in database:', students.length);
        students.forEach(student => {
            console.log(`  - ID: ${student.id}, Student ID: ${student.student_id}, User ID: ${student.user_id}`);
        });
        
        // Check classes table
        const [classes] = await connection.execute('SELECT id, name, level FROM classes LIMIT 10');
        console.log('\n🏫 Classes in database:', classes.length);
        classes.forEach(cls => {
            console.log(`  - ID: ${cls.id}, Name: ${cls.name}, Level: ${cls.level}`);
        });
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugUsers();
