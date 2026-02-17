const { pool } = require('../config/database');

async function cleanupSampleData() {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        console.log('🧹 Starting sample data cleanup...');
        
        // Remove sample teacher assignments first (foreign key dependencies)
        await connection.execute(`
            DELETE FROM teacher_subject_assignments 
            WHERE teacher_id IN (
                SELECT id FROM users WHERE username = 'teacher_john'
            )
        `);
        console.log('✅ Removed sample teacher subject assignments');
        
        // Remove sample student financial records
        await connection.execute(`
            DELETE FROM student_financial_records 
            WHERE student_id IN (
                SELECT s.id FROM students s 
                JOIN users u ON s.user_id = u.id 
                WHERE u.username LIKE 'sample_student_%'
            )
        `);
        console.log('✅ Removed sample student financial records');
        
        // Remove sample students
        await connection.execute(`
            DELETE s FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE u.username LIKE 'sample_student_%'
        `);
        console.log('✅ Removed sample students');
        
        // Remove sample student users
        await connection.execute(`
            DELETE FROM users WHERE username LIKE 'sample_student_%'
        `);
        console.log('✅ Removed sample student user accounts');
        
        // Remove sample teacher
        await connection.execute(`
            DELETE FROM users WHERE username = 'teacher_john'
        `);
        console.log('✅ Removed sample teacher');
        
        // Remove sample classes (only if they have no real students)
        await connection.execute(`
            DELETE FROM classes 
            WHERE name IN ('Form 1A', 'Form 2B', 'Form 3A') 
            AND id NOT IN (
                SELECT DISTINCT class_id FROM students WHERE class_id IS NOT NULL
            )
        `);
        console.log('✅ Removed empty sample classes');
        
        // Reset academic year to non-current if needed
        await connection.execute(`
            UPDATE academic_years 
            SET is_current = FALSE 
            WHERE year_name = '2024-2025' 
            AND NOT EXISTS (
                SELECT 1 FROM students WHERE admission_date >= '2024-01-01'
            )
        `);
        console.log('✅ Reset sample academic year');
        
        await connection.commit();
        console.log('🎉 Sample data cleanup completed successfully!');
        
        // Show remaining data counts
        const [studentCount] = await connection.execute('SELECT COUNT(*) as count FROM students WHERE status = "active"');
        const [teacherCount] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "teacher" AND is_active = TRUE');
        const [classCount] = await connection.execute('SELECT COUNT(*) as count FROM classes WHERE is_active = TRUE');
        
        console.log('\n📊 Remaining data after cleanup:');
        console.log(`   Students: ${studentCount[0].count}`);
        console.log(`   Teachers: ${teacherCount[0].count}`);  
        console.log(`   Classes: ${classCount[0].count}`);
        
        return {
            success: true,
            message: 'Sample data cleanup completed successfully',
            remaining: {
                students: studentCount[0].count,
                teachers: teacherCount[0].count,
                classes: classCount[0].count
            }
        };
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error during sample data cleanup:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Allow running this script directly
if (require.main === module) {
    cleanupSampleData()
        .then(result => {
            console.log('\n✅ Cleanup completed:', result.message);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Cleanup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { cleanupSampleData };
