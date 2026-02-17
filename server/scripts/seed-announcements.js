const { pool } = require('../config/database');

async function seedAnnouncements() {
  const connection = await pool.getConnection();
  
  try {
    // Demo announcements
    const announcements = [
      {
        title: 'Welcome to New Academic Year',
        content: 'We are excited to welcome all students and staff to the new academic year. Please ensure all registration forms are submitted by the end of this week.',
        priority: 'high',
        target_audience: 'all',
        is_active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      {
        title: 'Mid-term Examinations Schedule',
        content: 'Mid-term examinations will commence on Monday next week. Please refer to your timetables and prepare accordingly. All students must report to their examination halls 15 minutes before the scheduled time.',
        priority: 'urgent',
        target_audience: 'students',
        is_active: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      {
        title: 'Parent-Teacher Conference',
        content: 'We cordially invite all parents to attend the quarterly parent-teacher conference scheduled for this Saturday. Please confirm your attendance with your child\'s class teacher.',
        priority: 'medium',
        target_audience: 'all',
        is_active: true,
        expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      },
      {
        title: 'Library Hours Extended',
        content: 'The school library hours have been extended until 8:00 PM on weekdays to support students with their studies. Weekend hours remain the same.',
        priority: 'low',
        target_audience: 'students',
        is_active: true,
        expires_at: null // No expiry
      },
      {
        title: 'Staff Meeting - Important',
        content: 'All teaching and administrative staff are required to attend the mandatory staff meeting tomorrow at 4:00 PM in the main conference room. Agenda will cover new academic policies.',
        priority: 'urgent',
        target_audience: 'teachers',
        is_active: true,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      }
    ];

    // Get admin user (assuming user ID 1 is admin)
    const [adminUsers] = await connection.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    const adminId = adminUsers[0]?.id || 1;

    // Insert announcements
    for (const announcement of announcements) {
      await connection.execute(
        `INSERT INTO announcements (
          title, content, priority, target_audience, class_id, 
          expires_at, is_active, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          announcement.title,
          announcement.content,
          announcement.priority,
          announcement.target_audience,
          null, // class_id
          announcement.expires_at,
          announcement.is_active,
          adminId
        ]
      );
    }

    console.log('Demo announcements seeded successfully!');
  } catch (error) {
    console.error('Error seeding announcements:', error);
  } finally {
    connection.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedAnnouncements().then(() => {
    process.exit(0);
  });
}

module.exports = seedAnnouncements;
