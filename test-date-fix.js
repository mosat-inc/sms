const {pool} = require('./server/config/database');

async function testDateQueries() {
    try {
        console.log('=== Testing Fixed Date Queries ===\n');
        
        // Test the detail view query (GET /:classId/:date)
        console.log('1. Testing detail view query...');
        const [detailRecords] = await pool.execute(`
            SELECT 
                a.*,
                u.first_name,
                u.last_name,
                s.student_id as roll_number
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.class_id = ? AND DATE(a.date) = ?
            ORDER BY s.student_id
        `, [1, '2025-08-20']);
        
        console.log(`✅ Detail view: Found ${detailRecords.length} records for class 1 on 2025-08-20`);
        
        // Test the stats query
        const [stats] = await pool.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM attendance
            WHERE class_id = ? AND DATE(date) = ?
            GROUP BY status
        `, [1, '2025-08-20']);
        
        console.log('   Stats:', stats.map(s => `${s.status}: ${s.count}`).join(', '));
        
        // Test PDF/Word export query
        console.log('\n2. Testing export query...');
        const [exportData] = await pool.execute(`
            SELECT 
                a.date,
                c.name as class_name,
                u.first_name,
                u.last_name,
                s.student_id as roll_number,
                a.status,
                a.notes
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE a.class_id = ? AND DATE(a.date) = ?
            ORDER BY a.date DESC, c.name, s.student_id
        `, [1, '2025-08-20']);
        
        console.log(`✅ Export query: Found ${exportData.length} records for class 1 on 2025-08-20`);
        
        // Show first few records
        if (exportData.length > 0) {
            console.log('\n📋 Sample records:');
            exportData.slice(0, 3).forEach(record => {
                console.log(`   - ${record.first_name} ${record.last_name} (${record.roll_number}): ${record.status}`);
            });
        }
        
        await pool.end();
        console.log('\n🎉 All date queries are working correctly!');
        console.log('\n📝 Next steps:');
        console.log('   1. Restart your server to apply the route changes');
        console.log('   2. Test the attendance detail view in your frontend');
        console.log('   3. Test PDF and Word exports');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testDateQueries();
