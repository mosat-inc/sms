const { pool } = require('./config/database');

async function testCorrectDate() {
    try {
        console.log('🧪 Testing the correct date based on stored data...\n');

        // First, let's see what date we should be looking for
        const [test1] = await pool.execute('SELECT date, DATE_FORMAT(date, "%Y-%m-%d") as formatted_date FROM attendance WHERE class_id = 1 LIMIT 1');
        console.log('1. Actual stored date formatting:');
        console.log('   Original:', test1[0].date);
        console.log('   Formatted (server timezone):', test1[0].formatted_date);

        // Now test our fix with the correct date (2025-08-20)
        console.log('\n2. Testing with DATE_FORMAT approach on 2025-08-20:');
        const [test2] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND DATE_FORMAT(date, "%Y-%m-%d") = ?', ['2025-08-20']);
        console.log('   DATE_FORMAT match for 2025-08-20:', test2[0].count);

        // Test our attendance route query structure with correct date
        console.log('\n3. Testing full attendance query with correct date:');
        const [test3] = await pool.execute(`
            SELECT 
                a.*,
                u.first_name,
                u.last_name,
                s.student_id as roll_number
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.class_id = ? AND DATE_FORMAT(a.date, '%Y-%m-%d') = ?
            ORDER BY s.student_id
        `, [1, '2025-08-20']);
        console.log('   Full query results:', test3.length, 'records');

        if (test3.length > 0) {
            console.log('   Sample result:', {
                name: test3[0].first_name + ' ' + test3[0].last_name,
                status: test3[0].status,
                date: test3[0].date
            });
        }

        // Test statistics query too
        console.log('\n4. Testing stats query:');
        const [test4] = await pool.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM attendance
            WHERE class_id = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?
            GROUP BY status
        `, [1, '2025-08-20']);
        
        console.log('   Stats results:');
        test4.forEach(stat => {
            console.log(`   ${stat.status}: ${stat.count}`);
        });

        console.log('\n✅ Correct date tests complete!');
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        process.exit(0);
    }
}

testCorrectDate();
