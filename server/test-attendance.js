const { pool } = require('./config/database');

async function testAttendanceAPI() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔍 Testing attendance API...');
        
        // Test 1: Check if class exists
        const [classes] = await connection.execute('SELECT * FROM classes WHERE id = ?', [1]);
        console.log('📚 Class 1 data:', classes[0] || 'NOT FOUND');
        
        // Test 2: Check if students exist in class
        const [students] = await connection.execute(`
            SELECT s.id, s.student_id, u.first_name, u.last_name 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.class_id = ? AND s.status = 'active'
        `, [1]);
        console.log('👥 Students in class 1:', students.length);
        students.forEach(s => console.log(`  - ${s.first_name} ${s.last_name} (ID: ${s.id})`));
        
        if (students.length === 0) {
            console.log('❌ No students found in class 1');
            return;
        }
        
        // Test 3: Try to insert attendance manually
        const testDate = new Date().toISOString().split('T')[0];
        const testSession = 'morning';
        const testStudentId = students[0].id;
        const teacherId = 1; // Admin user as teacher
        
        console.log('📝 Testing attendance insert...');
        console.log('Data:', {
            student_id: testStudentId,
            class_id: 1,
            date: testDate,
            session: testSession,
            status: 'present',
            notes: 'Test note',
            marked_by: teacherId,
            marked_at: new Date(),
            is_editable: true,
            admin_locked: false
        });
        
        // Delete existing if any
        await connection.execute(
            'DELETE FROM attendance WHERE class_id = ? AND date = ? AND session = ? AND student_id = ?',
            [1, testDate, testSession, testStudentId]
        );
        
        // Try to insert
        const result = await connection.execute(`
            INSERT INTO attendance (
                student_id, class_id, date, session, status, notes, marked_by, 
                marked_at, is_editable, admin_locked
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            testStudentId,
            1,
            testDate,
            testSession,
            'present',
            'Test note',
            teacherId,
            new Date(),
            true,
            false
        ]);
        
        console.log('✅ Attendance insert successful:', result[0]);
        
        // Test 4: Try to read it back
        const [readBack] = await connection.execute(
            'SELECT * FROM attendance WHERE class_id = ? AND date = ? AND session = ?',
            [1, testDate, testSession]
        );
        console.log('📖 Read back attendance:', readBack.length, 'records');
        
    } catch (error) {
        console.error('❌ Error in test:', error);
        console.error('Error details:', {
            code: error.code,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
    } finally {
        connection.release();
        process.exit(0);
    }
}

testAttendanceAPI().catch(console.error);
