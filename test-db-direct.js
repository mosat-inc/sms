const mysql = require('mysql2/promise');

// Database connection
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'allahuma', // Correct password from .env
    database: 'sms_database'
};

async function testProfileUpdate() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database');
        
        // Check column types
        console.log('\n=== Database Schema Info ===');
        const [columns] = await connection.execute('DESCRIBE users');
        const relevantColumns = columns.filter(col => ['subjects_taught', 'classes_assigned'].includes(col.Field));
        console.log('Relevant columns:', relevantColumns);

        // First, let's see what users exist
        console.log('\n=== Current Users ===');
        const [users] = await connection.execute('SELECT id, username, role, first_name, last_name, subjects_taught, classes_assigned FROM users WHERE role = "teacher"');
        console.log('Teachers found:', users.length);
        
        for (const user of users) {
            console.log(`User ${user.id} (${user.username}):`);
            console.log('  - subjects_taught:', user.subjects_taught);
            console.log('  - classes_assigned:', user.classes_assigned);
            
            // Try to parse the JSON to see if it's valid
            try {
                const subjectsParsed = user.subjects_taught ? JSON.parse(user.subjects_taught) : null;
                const classesParsed = user.classes_assigned ? JSON.parse(user.classes_assigned) : null;
                console.log('  - subjects_taught parsed:', subjectsParsed);
                console.log('  - classes_assigned parsed:', classesParsed);
            } catch (parseError) {
                console.log('  - JSON parsing error:', parseError.message);
            }
        }

        // If we have a teacher, let's try updating their profile
        if (users.length > 0) {
            const teacherId = users[0].id;
            console.log(`\n=== Testing update for teacher ID ${teacherId} ===`);
            
            const testSubjects = [
                { id: 1, name: 'Mathematics' },
                { id: 2, name: 'Physics' }
            ];
            
            const testClasses = [
                { id: 1, name: 'Form 1A' },
                { id: 2, name: 'Form 1B' }
            ];

            const subjectsJson = JSON.stringify(testSubjects);
            const classesJson = JSON.stringify(testClasses);

            console.log('Updating with:');
            console.log('  - subjects_taught JSON string:', subjectsJson);
            console.log('  - classes_assigned JSON string:', classesJson);

            // Update the profile
            const [updateResult] = await connection.execute(
                'UPDATE users SET subjects_taught = ?, classes_assigned = ? WHERE id = ?',
                [subjectsJson, classesJson, teacherId]
            );

            console.log('Update result:', updateResult);

            // Fetch the updated data
            console.log('\n=== After Update ===');
            const [updatedUsers] = await connection.execute(
                'SELECT id, subjects_taught, classes_assigned FROM users WHERE id = ?',
                [teacherId]
            );

            const updatedUser = updatedUsers[0];
            console.log('Updated data from DB:');
            console.log('  - subjects_taught (raw):', updatedUser.subjects_taught);
            console.log('  - classes_assigned (raw):', updatedUser.classes_assigned);

            try {
                const subjectsParsed = updatedUser.subjects_taught ? JSON.parse(updatedUser.subjects_taught) : null;
                const classesParsed = updatedUser.classes_assigned ? JSON.parse(updatedUser.classes_assigned) : null;
                console.log('  - subjects_taught parsed:', subjectsParsed);
                console.log('  - classes_assigned parsed:', classesParsed);
            } catch (parseError) {
                console.log('  - JSON parsing error:', parseError.message);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed');
        }
    }
}

testProfileUpdate();
