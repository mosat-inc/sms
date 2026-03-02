const { pool } = require('../config/database');

/**
 * Create face attendance tables:
 * - face_templates
 * - face_sessions
 * - attendance_events
 * - attendance_attempts
 */
const addFaceAttendanceTables = async () => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS face_templates (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        org_id INT NOT NULL,
        descriptor_json LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP NULL,
        INDEX idx_face_templates_org_user (org_id, user_id),
        INDEX idx_face_templates_user (user_id),
        CONSTRAINT fk_face_templates_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_face_templates_org
          FOREIGN KEY (org_id) REFERENCES schools(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS face_sessions (
        id CHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        org_id INT NOT NULL,
        challenge_type VARCHAR(40) NOT NULL,
        challenge_json JSON NULL,
        status ENUM('STARTED','COMPLETED','FAILED') NOT NULL DEFAULT 'STARTED',
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_face_sessions_org_user (org_id, user_id, created_at),
        CONSTRAINT fk_face_sessions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_face_sessions_org
          FOREIGN KEY (org_id) REFERENCES schools(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance_events (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        org_id INT NOT NULL,
        event_type ENUM('IN','OUT') NOT NULL,
        happened_at DATETIME NOT NULL,
        method ENUM('FACE') NOT NULL DEFAULT 'FACE',
        score DECIMAL(8,5) NULL,
        threshold DECIMAL(8,5) NULL,
        device_hash VARCHAR(191) NULL,
        ip VARCHAR(64) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_attendance_events_org_user_time (org_id, user_id, happened_at),
        CONSTRAINT fk_attendance_events_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_attendance_events_org
          FOREIGN KEY (org_id) REFERENCES schools(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS attendance_attempts (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        org_id INT NOT NULL,
        session_id CHAR(36) NOT NULL,
        success TINYINT(1) NOT NULL,
        reason VARCHAR(255) NULL,
        score DECIMAL(8,5) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_attendance_attempts_session_id (session_id),
        INDEX idx_attendance_attempts_org_user_time (org_id, user_id, created_at),
        CONSTRAINT fk_attendance_attempts_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_attendance_attempts_org
          FOREIGN KEY (org_id) REFERENCES schools(id) ON DELETE CASCADE,
        CONSTRAINT fk_attendance_attempts_session
          FOREIGN KEY (session_id) REFERENCES face_sessions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await connection.commit();
    console.log('✅ Face attendance tables migration completed');
  } catch (error) {
    await connection.rollback();
    console.error('❌ Face attendance tables migration failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  addFaceAttendanceTables,
};
