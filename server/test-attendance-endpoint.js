const { pool } = require('./config/database');

// Simulate the attendance route logic
async function testAttendanceEndpoint() {
    try {
        console.log('🧪 Testing attendance endpoint logic with corrected date...\n');

        const classId = 1;
        const date = '2025-08-20'; // This should be the correct date based on timezone conversion
        
        console.log('🔍 Fetching attendance for classId:', classId, 'date:', date);
        
        // First let's check what dates we have in the database
        const [allDates] = await pool.execute('SELECT DISTINCT date FROM attendance WHERE class_id = ?', [classId]);
        console.log('🔍 Available raw dates for class:', allDates.map(d => d.date));
        
        // Try the three strategies from the attendance route
        let attendanceRecords = [];
        let foundStrategy = null;
        
        // Strategy 1: DATE_FORMAT match (updated approach)
        console.log('🔍 Trying Strategy 1: DATE_FORMAT match');
        try {
            const [records1] = await pool.execute(`
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
            `, [classId, date]);
            
            console.log('🔍 Strategy 1 (DATE_FORMAT) found:', records1.length, 'records');
            if (records1.length > 0) {
                attendanceRecords = records1;
                foundStrategy = 'exact_date_match';
            }
        } catch (error) {
            console.log('❌ Strategy 1 error:', error.message);
        }
        
        // Strategy 2: Extended date match (if Strategy 1 failed)
        if (attendanceRecords.length === 0) {
            console.log('🔍 Trying Strategy 2: Extended date match');
            try {
                const extendedDate = date.replace(/-/g, '');
                const [records2] = await pool.execute(`
                    SELECT 
                        a.*,
                        u.first_name,
                        u.last_name,
                        s.student_id as roll_number
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    JOIN users u ON s.user_id = u.id
                    WHERE a.class_id = ? AND (DATE_FORMAT(a.date, '%Y%m%d') = ? OR a.date LIKE ?)
                    ORDER BY s.student_id
                `, [classId, extendedDate, date + '%']);
                
                console.log('🔍 Strategy 2 found:', records2.length, 'records');
                if (records2.length > 0) {
                    attendanceRecords = records2;
                    foundStrategy = 'like_match';
                }
            } catch (error) {
                console.log('❌ Strategy 2 error:', error.message);
            }
        }
        
        // Strategy 3: Enhanced range (if both above failed)
        if (attendanceRecords.length === 0) {
            console.log('🔍 Trying Strategy 3: Enhanced date range');
            try {
                const startDate = date + 'T00:00:00.000Z';
                const dateParts = date.split('-');
                const nextDay = new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2])+1);
                const nextDayStr = nextDay.toISOString().split('T')[0];
                const endDate = nextDayStr + 'T23:59:59.999Z';
                
                console.log('🔍 Enhanced Range:', startDate, 'to', endDate);
                
                const [records3] = await pool.execute(`
                    SELECT 
                        a.*,
                        u.first_name,
                        u.last_name,
                        s.student_id as roll_number
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    JOIN users u ON s.user_id = u.id
                    WHERE a.class_id = ? AND a.date >= ? AND a.date <= ?
                    ORDER BY s.student_id
                `, [classId, startDate, endDate]);
                
                console.log('🔍 Strategy 3 found:', records3.length, 'records');
                if (records3.length > 0) {
                    attendanceRecords = records3;
                    foundStrategy = 'range_match';
                }
            } catch (error) {
                console.log('❌ Strategy 3 error:', error.message);
            }
        }
        
        console.log('🔍 Final result:', attendanceRecords.length, 'attendance records using strategy:', foundStrategy);
        if (attendanceRecords.length > 0) {
            console.log('🔍 Sample record:', {
                name: attendanceRecords[0].first_name + ' ' + attendanceRecords[0].last_name,
                status: attendanceRecords[0].status,
                date: attendanceRecords[0].date,
                roll_number: attendanceRecords[0].roll_number
            });
        }

        // Test attendance statistics with the working strategy
        let attendanceStats = {};
        
        if (foundStrategy === 'exact_date_match') {
            const [stats] = await pool.execute(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM attendance
                WHERE class_id = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?
                GROUP BY status
            `, [classId, date]);
            
            stats.forEach(stat => {
                attendanceStats[stat.status] = stat.count;
                console.log('🔍 Stat (DATE_FORMAT):', stat.status, '=', stat.count);
            });
        }

        const response = {
            attendance: attendanceRecords,
            stats: attendanceStats,
            strategy_used: foundStrategy
        };
        
        console.log('\n📊 Final response summary:');
        console.log('   - Attendance records:', attendanceRecords.length);
        console.log('   - Stats entries:', Object.keys(attendanceStats).length);
        console.log('   - Strategy used:', foundStrategy);
        console.log('   - Students found:', attendanceRecords.map(r => r.first_name + ' ' + r.last_name));

        console.log('\n✅ Attendance endpoint test completed successfully!');
        
        return response;
    } catch (error) {
        console.error('❌ Attendance endpoint test error:', error);
        throw error;
    } finally {
        process.exit(0);
    }
}

testAttendanceEndpoint();
