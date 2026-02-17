const { pool } = require('../config/database');

/**
 * Migration to add total_marks column to assessments table
 * This fixes the database schema to include the missing column
 */

const addTotalMarksColumn = async () => {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔄 Starting total_marks column migration...');
        
        // Check if total_marks column already exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'assessments' 
            AND COLUMN_NAME = 'total_marks'
        `);
        
        if (columns.length === 0) {
            console.log('📝 Adding total_marks column to assessments table...');
            
            // Add the total_marks column
            await connection.execute(`
                ALTER TABLE assessments 
                ADD COLUMN total_marks INT DEFAULT 100 
                AFTER pass_marks
            `);
            
            console.log('✅ total_marks column added successfully');
            
            // Update existing assessments to set total_marks = max_marks where total_marks is null
            console.log('📝 Updating existing assessments with total_marks values...');
            
            const [updateResult] = await connection.execute(`
                UPDATE assessments 
                SET total_marks = max_marks 
                WHERE total_marks IS NULL
            `);
            
            console.log(`✅ Updated ${updateResult.affectedRows} assessment records with total_marks values`);
        } else {
            console.log('ℹ️ total_marks column already exists');
        }
        
        // Get count of all assessments for verification
        const [assessmentCount] = await connection.execute('SELECT COUNT(*) as count FROM assessments');
        console.log(`ℹ️ Total assessments in database: ${assessmentCount[0].count}`);
        
        // Show current column structure for verification
        const [tableStructure] = await connection.execute('DESCRIBE assessments');
        console.log('📋 Current assessments table structure:');
        tableStructure.forEach(column => {
            if (['max_marks', 'pass_marks', 'total_marks'].includes(column.Field)) {
                console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(nullable)' : '(not null)'} ${column.Default ? `default: ${column.Default}` : ''}`);
            }
        });
        
        console.log('✅ total_marks migration completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Export the migration function
module.exports = {
    addTotalMarksColumn
};

// Run migration if called directly
if (require.main === module) {
    addTotalMarksColumn()
        .then(() => {
            console.log('🎉 Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}
