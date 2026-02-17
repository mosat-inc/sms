const { pool } = require('./config/database');

async function testDateMatching() {
    try {
        console.log('🧪 Testing specific date matching queries...\n');

        // Test 1: DATE() function with string comparison
        console.log('1. Testing DATE(date) = "2025-08-19":');
        const [test1] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND DATE(date) = ?', ['2025-08-19']);
        console.log('   Result:', test1[0].count);

        // Test 2: LIKE pattern matching
        console.log('2. Testing date LIKE "2025-08-19%":');
        const [test2] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND date LIKE ?', ['2025-08-19%']);
        console.log('   Result:', test2[0].count);

        // Test 3: Range query
        console.log('3. Testing range query:');
        const [test3] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND date >= ? AND date <= ?', 
            ['2025-08-19T00:00:00.000Z', '2025-08-19T23:59:59.999Z']);
        console.log('   Result:', test3[0].count);

        // Test 4: What DATE() actually returns
        console.log('4. What DATE() function actually returns:');
        const [test4] = await pool.execute('SELECT date, DATE(date) as date_part, DATE(date) = ? as matches FROM attendance WHERE class_id = 1 LIMIT 1', ['2025-08-19']);
        console.log('   Original:', test4[0].date);
        console.log('   DATE():', test4[0].date_part);
        console.log('   Matches "2025-08-19":', test4[0].matches);

        // Test 5: Convert to string format
        console.log('5. Convert DATE() to string format:');
        const [test5] = await pool.execute('SELECT DATE_FORMAT(DATE(date), "%Y-%m-%d") as formatted_date, DATE_FORMAT(DATE(date), "%Y-%m-%d") = ? as matches FROM attendance WHERE class_id = 1 LIMIT 1', ['2025-08-19']);
        console.log('   Formatted DATE():', test5[0].formatted_date);
        console.log('   Matches "2025-08-19":', test5[0].matches);

        // Test 6: Let's see what happens with exact string comparison
        console.log('6. Testing exact datetime comparison:');
        const [test6] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND date = ?', ['2025-08-19T21:00:00.000Z']);
        console.log('   Exact datetime match:', test6[0].count);

        // Test 7: Test the DATE_FORMAT approach
        console.log('7. Testing with DATE_FORMAT:');
        const [test7] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND DATE_FORMAT(date, "%Y-%m-%d") = ?', ['2025-08-19']);
        console.log('   DATE_FORMAT match:', test7[0].count);

        console.log('\n✅ Date matching tests complete!');
    } catch (error) {
        console.error('❌ Test error:', error);
    } finally {
        process.exit(0);
    }
}

testDateMatching();
