const { pool } = require('./config/database');

(async () => {
    try {
        const [rows] = await pool.execute('SELECT DISTINCT DATE_FORMAT(date, "%Y-%m-%d") as local_date FROM attendance WHERE class_id = 1');
        console.log('📅 CORRECT DATE for frontend to use:', rows[0].local_date);
        console.log('');
        console.log('🔗 Frontend should make requests to:');
        console.log(`   http://localhost:5000/api/attendance/1/${rows[0].local_date}`);
        console.log('');
        console.log('🎯 This will now return the data correctly!');
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
})();
