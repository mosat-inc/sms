const { pool } = require('../config/database');

/**
 * Migration to add timetable tables (teaching + exam).
 */
const addTimetables = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🔄 Starting timetables migration...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS timetables (
        id INT PRIMARY KEY AUTO_INCREMENT,
        class_id INT NOT NULL,
        type ENUM('teaching','exam') NOT NULL,
        academic_year VARCHAR(9) NOT NULL,
        term VARCHAR(20) NULL,
        start_date DATE NULL,
        end_date DATE NULL,
        generated_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_timetables_class_type_year (class_id, type, academic_year),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS timetable_entries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        timetable_id INT NOT NULL,
        day_of_week TINYINT NULL,
        entry_date DATE NULL,
        slot_key VARCHAR(20) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        kind ENUM('subject','break','free') NOT NULL,
        subject_id INT NULL,
        teacher_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_timetable_day (timetable_id, day_of_week, start_time),
        INDEX idx_timetable_date (timetable_id, entry_date, start_time),
        FOREIGN KEY (timetable_id) REFERENCES timetables(id) ON DELETE CASCADE,
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ Timetable tables created/verified');
  } catch (error) {
    console.error('❌ Timetables migration failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { addTimetables };

if (require.main === module) {
  addTimetables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

