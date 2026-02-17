const { pool } = require('./config/database');

async function checkTable() {
    try {
        const [rows] = await pool.execute('DESCRIBE attendance');
        console.log('Current attendance table structure:');
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type} ${row.Null} ${row.Key} ${row.Default}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

checkTable();
