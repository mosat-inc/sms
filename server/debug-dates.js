const { pool } = require('./config/database');

async function debugDates() {
    try {
        console.log('🔍 COMPREHENSIVE DATE DEBUGGING');
        console.log('==============================');
        
        // 1. Check the raw attendance data
        console.log('\n1. Raw attendance data:');
        const [rawData] = await pool.execute('SELECT id, class_id, date, status FROM attendance WHERE class_id = 1 LIMIT 5');
        rawData.forEach(row => {
            console.log(`ID: ${row.id}, Class: ${row.class_id}, Date: ${row.date}, Status: ${row.status}`);
        });
        
        // 2. Check what DATE() function returns
        console.log('\n2. DATE() function results:');
        const [dateResults] = await pool.execute('SELECT id, date, DATE(date) as date_only, TIME(date) as time_only FROM attendance WHERE class_id = 1 LIMIT 5');
        dateResults.forEach(row => {
            console.log(`ID: ${row.id}, Raw: ${row.date}, DATE(): ${row.date_only}, TIME(): ${row.time_only}`);
        });
        
        // 3. Test exact DATE() comparison
        console.log('\n3. Testing DATE() = "2025-08-19":');
        const [exactMatch] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND DATE(date) = "2025-08-19"');
        console.log(`Match count: ${exactMatch[0].count}`);
        
        // 4. Test LIKE comparison
        console.log('\n4. Testing LIKE "2025-08-19%":');
        const [likeMatch] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND date LIKE "2025-08-19%"');
        console.log(`LIKE match count: ${likeMatch[0].count}`);
        
        // 5. Test range comparison
        console.log('\n5. Testing date range:');
        const [rangeMatch] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND date >= "2025-08-19T00:00:00.000Z" AND date <= "2025-08-19T23:59:59.999Z"');
        console.log(`Range match count: ${rangeMatch[0].count}`);
        
        // 6. Check timezone settings
        console.log('\n6. MySQL timezone settings:');
        const [timezone] = await pool.execute('SELECT @@global.time_zone as global_tz, @@session.time_zone as session_tz');
        console.log(`Global timezone: ${timezone[0].global_tz}, Session timezone: ${timezone[0].session_tz}`);
        
        // 7. Test different date formats
        console.log('\n7. Testing different date formats:');
        const testFormats = [
            '2025-08-19',
            '2025-08-19 00:00:00',
            '2025-08-19T00:00:00',
            '2025-08-19T00:00:00.000Z',
            '2025-08-19T21:00:00.000Z'
        ];
        
        for (const format of testFormats) {
            try {
                const [result] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND DATE(date) = ?', [format]);
                console.log(`Format "${format}": ${result[0].count} matches`);
            } catch (error) {
                console.log(`Format "${format}": ERROR - ${error.message}`);
            }
        }
        
        // 8. Check if there's a JOIN issue
        console.log('\n8. Testing without JOINs:');
        const [noJoinTest] = await pool.execute('SELECT COUNT(*) as count FROM attendance WHERE class_id = 1 AND DATE(date) = ?', ['2025-08-19']);
        console.log(`No JOIN count: ${noJoinTest[0].count}`);
        
        // 9. Test the full JOIN query step by step
        console.log('\n9. Testing JOIN components:');
        
        // Check students exist
        const [studentsCheck] = await pool.execute('SELECT COUNT(*) as count FROM students WHERE id IN (SELECT DISTINCT student_id FROM attendance WHERE class_id = 1)');
        console.log(`Students linked to attendance: ${studentsCheck[0].count}`);
        
        // Check users exist  
        const [usersCheck] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE id IN (SELECT DISTINCT user_id FROM students WHERE id IN (SELECT DISTINCT student_id FROM attendance WHERE class_id = 1))');
        console.log(`Users linked to students: ${usersCheck[0].count}`);
        
        // 10. Full query debug
        console.log('\n10. Full query with DATE condition:');
        const [fullQuery] = await pool.execute(`
            SELECT 
                a.id,
                a.date,
                DATE(a.date) as date_only,
                u.first_name,
                u.last_name,
                s.student_id as roll_number
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.class_id = 1 AND DATE(a.date) = '2025-08-19'
        `);
        console.log(`Full query results: ${fullQuery.length} records`);
        if (fullQuery.length > 0) {
            console.log('Sample result:', fullQuery[0]);
        }
        
        // 11. Try manual date conversion
        console.log('\n11. Manual date conversion test:');
        const [conversionTest] = await pool.execute(`
            SELECT 
                date,
                DATE(date) as mysql_date,
                CONVERT_TZ(date, @@session.time_zone, '+00:00') as utc_date,
                DATE(CONVERT_TZ(date, @@session.time_zone, '+00:00')) as utc_date_only
            FROM attendance 
            WHERE class_id = 1 
            LIMIT 3
        `);
        conversionTest.forEach(row => {
            console.log(`Original: ${row.date}, MySQL DATE(): ${row.mysql_date}, UTC: ${row.utc_date}, UTC DATE(): ${row.utc_date_only}`);
        });
        
        console.log('\n✅ Date debugging complete!');
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    } finally {
        process.exit(0);
    }
}

debugDates();
