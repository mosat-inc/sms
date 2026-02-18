const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

/**
 * Reset (or create) default admin accounts for local/dev usage.
 *
 * - admin1@ubunifusec.com / admin1@system
 * - admin2@ubunifusec.com / admin2@system
 *
 * WARNING: Do not run in production.
 */

async function resetAdminPasswords() {
  const adminAccounts = [
    {
      username: 'admin1',
      email: 'admin1@ubunifusec.com',
      password: 'admin1@system',
      first_name: 'Admin',
      last_name: 'One',
      phone: '+255789000001',
      department: 'Administration',
      position: 'System Administrator',
      employee_id: 'ADM001',
    },
    {
      username: 'admin2',
      email: 'admin2@ubunifusec.com',
      password: 'admin2@system',
      first_name: 'Admin',
      last_name: 'Two',
      phone: '+255789000002',
      department: 'Administration',
      position: 'System Administrator',
      employee_id: 'ADM002',
    },
  ];

  const connection = await pool.getConnection();
  try {
    console.log('🔧 Resetting admin passwords (dev only)...');

    for (const admin of adminAccounts) {
      const hashedPassword = await bcrypt.hash(admin.password, 12);

      const [existing] = await connection.execute(
        'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [admin.username, admin.email]
      );

      if (existing.length === 0) {
        const [result] = await connection.execute(
          `
          INSERT INTO users (
            username, email, password, role,
            first_name, last_name, firstName, lastName,
            phone, department, position, employee_id,
            must_change_password, temp_password, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NULL, TRUE)
        `,
          [
            admin.username,
            admin.email,
            hashedPassword,
            'admin',
            admin.first_name,
            admin.last_name,
            admin.first_name,
            admin.last_name,
            admin.phone,
            admin.department,
            admin.position,
            admin.employee_id,
          ]
        );

        console.log(`✅ Created ${admin.username} (id=${result.insertId})`);
        continue;
      }

      const userId = existing[0].id;
      await connection.execute(
        `
        UPDATE users
        SET
          email = ?,
          password = ?,
          role = 'admin',
          first_name = ?,
          last_name = ?,
          firstName = ?,
          lastName = ?,
          phone = ?,
          department = ?,
          position = ?,
          employee_id = ?,
          must_change_password = FALSE,
          temp_password = NULL,
          is_active = TRUE
        WHERE id = ?
      `,
        [
          admin.email,
          hashedPassword,
          admin.first_name,
          admin.last_name,
          admin.first_name,
          admin.last_name,
          admin.phone,
          admin.department,
          admin.position,
          admin.employee_id,
          userId,
        ]
      );

      console.log(`✅ Reset password for ${admin.username} (id=${userId})`);
    }

    console.log('\n📋 Login credentials:');
    console.log('   admin1@ubunifusec.com / admin1@system');
    console.log('   admin2@ubunifusec.com / admin2@system');
  } finally {
    connection.release();
  }
}

if (require.main === module) {
  resetAdminPasswords()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to reset admin passwords:', err);
      process.exit(1);
    });
}

module.exports = { resetAdminPasswords };

