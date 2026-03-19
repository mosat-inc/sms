const { migrateYearOfStudy } = require('../migrations/add_year_of_study_column');
const { expandExamTypeEnum } = require('../migrations/expand_exam_type_enum');
const { addTotalMarksColumn } = require('../migrations/add_total_marks_column');
const { addTimetables } = require('../migrations/add_timetables');
const { addAdmissionSequencesAndParentAccess } = require('../migrations/add_admission_sequences_and_parent_access');
const { addPesapalPaymentIntents } = require('../migrations/add_pesapal_payment_intents');
const { addFaceAttendanceTables } = require('../migrations/add_face_attendance_tables');
const { updateDefaultSchoolFeeTo75000 } = require('../migrations/update_default_school_fee_75000');
const { addR2MaterialStorage } = require('../migrations/add_r2_material_storage');
const { initializeDatabase, testConnection } = require('../config/database');

/**
 * Migration runner script
 * Executes all necessary database migrations in the correct order
 */

const runAllMigrations = async () => {
    console.log('🚀 Starting database migrations...');
    console.log('═══════════════════════════════════════════════');
    
    try {
        console.log('🗄️  0. Ensuring database + base schema exist...');
        await initializeDatabase();

        // Now verify we can connect to the newly-created DB via the normal pool.
        const canConnect = await testConnection();
        if (!canConnect) {
            throw new Error(
                'Database connection failed after initialization. Confirm MySQL is running and credentials in .env / server/.env are correct.'
            );
        }

        // Run migrations in order
        console.log('📝 1. Running year_of_study column migration...');
        await migrateYearOfStudy();
        
        console.log('\n📝 2. Running exam_type enum expansion migration...');
        await expandExamTypeEnum();
        
        console.log('\n📝 3. Running total_marks column migration...');
        await addTotalMarksColumn();

        console.log('\n📝 4. Running timetables tables migration...');
        await addTimetables();

        console.log('\n📝 5. Running admission sequences + parent access migration...');
        await addAdmissionSequencesAndParentAccess();

        console.log('\n📝 6. Running Pesapal payment intents migration...');
        await addPesapalPaymentIntents();

        console.log('\n📝 7. Running face attendance tables migration...');
        await addFaceAttendanceTables();

        console.log('\n📝 8. Updating default school fee to 75,000...');
        await updateDefaultSchoolFeeTo75000();

        console.log('\n📝 9. Adding R2 material storage columns...');
        await addR2MaterialStorage();
        
        console.log('\n═══════════════════════════════════════════════');
        console.log('🎉 All migrations completed successfully!');
        
    } catch (error) {
        console.error('\n═══════════════════════════════════════════════');
        console.error('💥 Migration failed:', error.message);
        console.error('═══════════════════════════════════════════════');
        throw error;
    }
};

// Export the runner function
module.exports = {
    runAllMigrations
};

// Run migrations if called directly
if (require.main === module) {
    runAllMigrations()
        .then(() => {
            console.log('✅ Migration runner completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Migration runner failed:', error);
            process.exit(1);
        });
}
