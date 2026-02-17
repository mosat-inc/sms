const { pool } = require('../config/database');

async function migrateAnnouncements() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Starting announcements migration...');

    // Drop existing announcements table if it exists
    await connection.execute('DROP TABLE IF EXISTS announcement_reads');
    await connection.execute('DROP TABLE IF EXISTS announcements');
    console.log('Dropped existing tables (if any)');

    // Create announcements table
    const createAnnouncementsQuery = `
      CREATE TABLE announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        target_audience ENUM('all', 'students', 'teachers', 'specific_class') DEFAULT 'all',
        class_id INT NULL,
        expires_at DATETIME NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
        
        INDEX idx_target_audience (target_audience),
        INDEX idx_is_active (is_active),
        INDEX idx_expires_at (expires_at),
        INDEX idx_priority (priority),
        INDEX idx_created_at (created_at)
      )
    `;
    
    await connection.execute(createAnnouncementsQuery);
    console.log('Created announcements table');

    // Create announcement_reads table to track read status
    const createAnnouncementReadsQuery = `
      CREATE TABLE announcement_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        announcement_id INT NOT NULL,
        user_id INT NOT NULL,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        UNIQUE KEY unique_read (announcement_id, user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_announcement_id (announcement_id)
      )
    `;
    
    await connection.execute(createAnnouncementReadsQuery);
    console.log('Created announcement_reads table');

    console.log('Announcements migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run if called directly
if (require.main === module) {
  migrateAnnouncements().then(() => {
    console.log('Migration finished');
    process.exit(0);
  }).catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = migrateAnnouncements;
