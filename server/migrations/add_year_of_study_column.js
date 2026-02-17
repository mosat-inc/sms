const { pool } = require('../config/database');

/**
 * Migration to add year_of_study column to students table and update existing records
 * This migration ensures backward compatibility with existing databases
 */

const migrateYearOfStudy = async () => {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔄 Starting year_of_study column migration...');
        
        // Check if year_of_study column already exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'students' 
            AND COLUMN_NAME = 'year_of_study'
        `);
        
        if (columns.length === 0) {
            console.log('📝 Adding year_of_study column to students table...');
            
            // Add the year_of_study column
            await connection.execute(`
                ALTER TABLE students 
                ADD COLUMN year_of_study INT DEFAULT 2025 
                AFTER graduation_date
            `);
            
            console.log('✅ year_of_study column added successfully');
        } else {
            console.log('ℹ️ year_of_study column already exists');
        }
        
        // Check if tutor_group column exists and add it if missing
        const [tutorGroupColumns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'students' 
            AND COLUMN_NAME = 'tutor_group'
        `);
        
        if (tutorGroupColumns.length === 0) {
            console.log('📝 Adding tutor_group column to students table...');
            
            await connection.execute(`
                ALTER TABLE students 
                ADD COLUMN tutor_group VARCHAR(20) DEFAULT NULL 
                AFTER medical_conditions
            `);
            
            console.log('✅ tutor_group column added successfully');
        } else {
            console.log('ℹ️ tutor_group column already exists');
        }
        
        // Update existing students to have year_of_study = 2025 if it's null or not set
        console.log('📝 Updating existing students with default year_of_study...');
        
        const [updateResult] = await connection.execute(`
            UPDATE students 
            SET year_of_study = 2025 
            WHERE year_of_study IS NULL OR year_of_study = 0
        `);
        
        console.log(`✅ Updated ${updateResult.affectedRows} student records with year_of_study = 2025`);
        
        // Get count of all students for verification
        const [studentCount] = await connection.execute('SELECT COUNT(*) as count FROM students');
        console.log(`ℹ️ Total students in database: ${studentCount[0].count}`);
        
        console.log('✅ year_of_study migration completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Export the migration function
module.exports = {
    migrateYearOfStudy
};

// Run migration if called directly
if (require.main === module) {
    migrateYearOfStudy()
        .then(() => {
            console.log('🎉 Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}
