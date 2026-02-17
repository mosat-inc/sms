const {pool} = require('./server/config/database');

async function debugDates() {
    try {
        console.log('=== Date Format Debugging ===');
        
        // Check what dates exist in database
        const [dates] = await pool.execute(`
            SELECT DISTINCT 
                date, 
                DATE(date) as date_only,
                class_id,
                COUNT(*) as records
            FROM attendance 
            GROUP BY date, class_id 
            ORDER BY date DESC
        `);
        
        console.log('📅 Dates in database:');
        dates.forEach(d => {
            console.log(`  - Full date: ${d.date}`);
            console.log(`  - Date only: ${d.date_only}`);
            console.log(`  - Class ID: ${d.class_id}`);
            console.log(`  - Records: ${d.records}`);
            console.log('---');
        });
        
        // Test query with different date formats
        console.log('\n🔍 Testing different date query formats:');
        
        // Test 1: With full datetime
        const [test1] = await pool.execute(`
            SELECT COUNT(*) as count FROM attendance 
            WHERE class_id = 1 AND date = '2025-08-19T21:00:00.000Z'
        `);
        console.log(`Test 1 (full datetime): ${test1[0].count} records`);
        
        // Test 2: With date only
        const [test2] = await pool.execute(`
            SELECT COUNT(*) as count FROM attendance 
            WHERE class_id = 1 AND DATE(date) = '2025-08-20'
        `);
        console.log(`Test 2 (date only 2025-08-20): ${test2[0].count} records`);
        
        // Test 3: With date only (previous day)
        const [test3] = await pool.execute(`
            SELECT COUNT(*) as count FROM attendance 
            WHERE class_id = 1 AND DATE(date) = '2025-08-19'
        `);
        console.log(`Test 3 (date only 2025-08-19): ${test3[0].count} records`);
        
        await pool.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugDates();
