const { pool } = require('../config/database');

/**
 * Migration:
 * - Adds admission number sequence table (yearly, concurrency-safe via SELECT ... FOR UPDATE)
 * - Adds parent access columns to students
 */
const addAdmissionSequencesAndParentAccess = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Starting admission sequences + parent access migration...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admission_sequences (
        admission_year INT PRIMARY KEY,
        last_number INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [admissionYearCol] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'admission_year'
    `);
    if (admissionYearCol.length === 0) {
      await connection.execute(`ALTER TABLE students ADD COLUMN admission_year INT NULL AFTER admission_number`);
      console.log('✅ Added students.admission_year');
    } else {
      console.log('ℹ️ students.admission_year already exists');
    }

    const [parentHashCol] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'parent_password_hash'
    `);
    if (parentHashCol.length === 0) {
      await connection.execute(`ALTER TABLE students ADD COLUMN parent_password_hash VARCHAR(255) NULL AFTER admission_year`);
      console.log('✅ Added students.parent_password_hash');
    } else {
      console.log('ℹ️ students.parent_password_hash already exists');
    }

    const [parentResetCol] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'students'
        AND COLUMN_NAME = 'parent_last_password_reset_at'
    `);
    if (parentResetCol.length === 0) {
      await connection.execute(
        `ALTER TABLE students ADD COLUMN parent_last_password_reset_at TIMESTAMP NULL AFTER parent_password_hash`
      );
      console.log('✅ Added students.parent_last_password_reset_at');
    } else {
      console.log('ℹ️ students.parent_last_password_reset_at already exists');
    }

    console.log('✅ Admission sequences + parent access migration completed');
  } catch (error) {
    console.error('❌ Admission sequences + parent access migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { addAdmissionSequencesAndParentAccess };

if (require.main === module) {
  addAdmissionSequencesAndParentAccess()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

