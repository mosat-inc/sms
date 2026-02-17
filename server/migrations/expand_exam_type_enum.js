const { pool } = require('../config/database');

/**
 * Migration to expand exam_type ENUM values to serve as assessment_type
 * This adds more assessment types while maintaining backward compatibility
 */

const expandExamTypeEnum = async () => {
    const connection = await pool.getConnection();
    
    try {
        console.log('🔄 Starting exam_type ENUM expansion migration...');
        
        // Check current ENUM values
        const [currentEnum] = await connection.execute(`
            SHOW COLUMNS FROM assessments LIKE 'exam_type'
        `);
        
        if (currentEnum.length > 0) {
            console.log('📋 Current exam_type values:', currentEnum[0].Type);
            
            // Expand the ENUM to include more assessment types
            console.log('📝 Expanding exam_type ENUM to include more assessment types...');
            
            await connection.execute(`
                ALTER TABLE assessments 
                MODIFY COLUMN exam_type ENUM(
                    'quiz',
                    'test', 
                    'assignment',
                    'project',
                    'homework',
                    'mid-term exams',
                    'terminal exams', 
                    'annual exams',
                    'mock exams',
                    'practical',
                    'oral',
                    'presentation',
                    'lab_work',
                    'field_work',
                    'research',
                    'other'
                ) NOT NULL
            `);
            
            console.log('✅ exam_type ENUM expanded successfully');
            
            // Show new ENUM values
            const [newEnum] = await connection.execute(`
                SHOW COLUMNS FROM assessments LIKE 'exam_type'
            `);
            
            console.log('📋 New exam_type values:', newEnum[0].Type);
            
            // Get count of all assessments for verification
            const [assessmentCount] = await connection.execute('SELECT COUNT(*) as count FROM assessments');
            console.log(`ℹ️ Total assessments in database: ${assessmentCount[0].count}`);
            
            if (assessmentCount[0].count > 0) {
                // Show distribution of exam types
                const [typeDistribution] = await connection.execute(`
                    SELECT exam_type, COUNT(*) as count 
                    FROM assessments 
                    GROUP BY exam_type 
                    ORDER BY count DESC
                `);
                
                console.log('📊 Current exam type distribution:');
                typeDistribution.forEach(row => {
                    console.log(`   - ${row.exam_type}: ${row.count} assessments`);
                });
            }
            
        } else {
            console.log('❌ exam_type column not found');
        }
        
        console.log('✅ exam_type ENUM expansion completed successfully');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
};

// Export the migration function
module.exports = {
    expandExamTypeEnum
};

// Run migration if called directly
if (require.main === module) {
    expandExamTypeEnum()
        .then(() => {
            console.log('🎉 Migration completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}
