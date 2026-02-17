/**
 * Automatic Student Promotion Service
 * 
 * This service automatically promotes students to the next class level
 * at the end of each academic year.
 * 
 * Promotion Flow:
 * Form 1 → Form 2 → Form 3 → Form 4 → Form 5 → Form 6 → Graduated
 */

const cron = require('node-cron');
const { pool } = require('../config/database');

/**
 * Promote all eligible students to the next class level
 * Called automatically at the end of academic year
 */
async function promoteStudents() {
    const connection = await pool.getConnection();
    
    try {
        console.log('🎓 Starting automatic student promotion process...');
        
        await connection.beginTransaction();
        
        // Get current academic year that has ended
        const [currentYear] = await connection.execute(`
            SELECT id, year_name, end_date 
            FROM academic_years 
            WHERE is_current = TRUE 
            AND end_date <= CURDATE()
            LIMIT 1
        `);
        
        if (currentYear.length === 0) {
            console.log('ℹ️  No academic year has ended yet. Skipping promotion.');
            connection.release();
            return { success: true, message: 'No promotion needed', promoted: 0 };
        }
        
        console.log(`📅 Academic year ${currentYear[0].year_name} has ended. Processing promotions...`);
        
        // Get next academic year
        const [nextYear] = await connection.execute(`
            SELECT id, year_name 
            FROM academic_years 
            WHERE start_date > ? 
            ORDER BY start_date ASC 
            LIMIT 1
        `, [currentYear[0].end_date]);
        
        if (nextYear.length === 0) {
            console.log('⚠️  No next academic year found. Please create one before promoting students.');
            connection.release();
            return { success: false, message: 'No next academic year found', promoted: 0 };
        }
        
        console.log(`📅 Next academic year: ${nextYear[0].year_name}`);
        
        // Get all active students grouped by their current level
        const [students] = await connection.execute(`
            SELECT 
                s.id as student_id,
                s.class_id as current_class_id,
                c.level as current_level,
                c.name as current_class_name
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.status = 'active'
            ORDER BY c.level, s.id
        `);
        
        if (students.length === 0) {
            console.log('ℹ️  No active students to promote.');
            await connection.commit();
            connection.release();
            return { success: true, message: 'No students to promote', promoted: 0 };
        }
        
        console.log(`👥 Found ${students.length} active students to process`);
        
        let promotedCount = 0;
        let graduatedCount = 0;
        
        // Process each student
        for (const student of students) {
            const currentLevel = student.current_level;
            const nextLevel = currentLevel + 1;
            
            // Form 6 students graduate
            if (currentLevel === 6) {
                await connection.execute(`
                    UPDATE students 
                    SET status = 'graduated', 
                        updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [student.student_id]);
                graduatedCount++;
                console.log(`🎓 Student ID ${student.student_id} graduated from Form 6`);
                continue;
            }
            
            // Find a class in the next level with available space
            const [nextClasses] = await connection.execute(`
                SELECT 
                    c.id,
                    c.name,
                    c.capacity,
                    COUNT(s.id) as current_students
                FROM classes c
                LEFT JOIN students s ON c.id = s.class_id AND s.status = 'active'
                WHERE c.level = ? 
                AND c.is_active = TRUE
                AND c.academic_year = ?
                GROUP BY c.id, c.name, c.capacity
                HAVING current_students < c.capacity
                ORDER BY current_students ASC
                LIMIT 1
            `, [nextLevel, nextYear[0].year_name]);
            
            if (nextClasses.length === 0) {
                console.log(`⚠️  No available class found for Form ${nextLevel}. Student ${student.student_id} not promoted.`);
                continue;
            }
            
            const nextClass = nextClasses[0];
            
            // Promote student to next class
            await connection.execute(`
                UPDATE students 
                SET class_id = ?,
                    year_of_study = year_of_study + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [nextClass.id, student.student_id]);
            
            promotedCount++;
            console.log(`✅ Student ID ${student.student_id}: ${student.current_class_name} (Form ${currentLevel}) → ${nextClass.name} (Form ${nextLevel})`);
        }
        
        // Mark current academic year as not current
        await connection.execute(`
            UPDATE academic_years 
            SET is_current = FALSE 
            WHERE id = ?
        `, [currentYear[0].id]);
        
        // Mark next academic year as current
        await connection.execute(`
            UPDATE academic_years 
            SET is_current = TRUE 
            WHERE id = ?
        `, [nextYear[0].id]);
        
        await connection.commit();
        connection.release();
        
        console.log(`✅ Promotion complete! Promoted: ${promotedCount}, Graduated: ${graduatedCount}`);
        
        return {
            success: true,
            message: 'Student promotion completed successfully',
            promoted: promotedCount,
            graduated: graduatedCount
        };
        
    } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('❌ Error during student promotion:', error);
        throw error;
    }
}

/**
 * Manually trigger promotion (for testing or admin override)
 */
async function manualPromote(req, res) {
    try {
        const result = await promoteStudents();
        return res.json(result);
    } catch (error) {
        console.error('Manual promotion error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to promote students',
            error: error.message
        });
    }
}

/**
 * Initialize the automatic promotion cron job
 * Runs daily at 2:00 AM to check if academic year has ended
 */
function initializePromotionScheduler() {
    // Run every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        console.log('⏰ Running scheduled student promotion check...');
        try {
            await promoteStudents();
        } catch (error) {
            console.error('Scheduled promotion error:', error);
        }
    }, {
        scheduled: true,
        timezone: "Africa/Dar_es_Salaam" // Tanzania timezone
    });
    
    console.log('✅ Automatic student promotion scheduler initialized (runs daily at 2:00 AM)');
}

module.exports = {
    promoteStudents,
    manualPromote,
    initializePromotionScheduler
};
