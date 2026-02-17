const cron = require('node-cron');
const { pool } = require('../config/database');
const { createParentNotificationForStudent } = require('./notificationsService');

const daysBetween = (a, b) => Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

const shouldNotify = async ({ studentId, title }) => {
  // Avoid spamming: don't create the same reminder more than once per day.
  const [rows] = await pool.execute(
    `
    SELECT id
    FROM user_notifications
    WHERE student_id = ?
      AND type = 'fee'
      AND title = ?
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    LIMIT 1
    `,
    [studentId, title]
  );
  return rows.length === 0;
};

const runFeeReminderSweep = async () => {
  const [ayRows] = await pool.execute(
    `SELECT year_name, start_date, end_date FROM academic_years WHERE is_current = TRUE LIMIT 1`
  );
  const ay = ayRows?.[0];
  if (!ay?.end_date) return;

  const end = new Date(ay.end_date);
  const now = new Date();
  const d = daysBetween(end, now); // end - now

  let mode = null;
  if (d <= 14 && d >= 0) mode = 'due_soon';
  if (d < 0) mode = 'overdue';
  if (!mode) return;

  const [rows] = await pool.execute(
    `
    SELECT
      s.id as student_id,
      CONCAT(u.first_name, ' ', u.last_name) as student_name,
      s.admission_number,
      c.name as class_name,
      COALESCE(sfr.outstanding_balance, 0.00) as outstanding_balance
    FROM students s
    JOIN users u ON u.id = s.user_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN student_financial_records sfr
      ON sfr.student_id = s.id AND sfr.academic_year = ?
    WHERE s.status = 'active'
      AND COALESCE(sfr.outstanding_balance, 0.00) > 0
    `,
    [ay.year_name]
  );

  for (const r of rows) {
    const title = mode === 'overdue' ? 'Fee Balance Overdue' : 'Fee Payment Reminder';
    const canSend = await shouldNotify({ studentId: r.student_id, title });
    if (!canSend) continue;

    await createParentNotificationForStudent({
      studentId: r.student_id,
      type: 'fee',
      priority: mode === 'overdue' ? 'urgent' : 'high',
      title,
      message:
        mode === 'overdue'
          ? `Outstanding school fee balance is overdue. Please contact the school/accountant if you need assistance.`
          : `School fee payment deadline is approaching. Please review the outstanding balance and pay before the due date.`,
      data: {
        mode,
        academic_year: ay.year_name,
        due_date: ay.end_date,
        outstanding_balance: Number(r.outstanding_balance || 0),
        admission_number: r.admission_number,
        student_name: r.student_name,
        class_name: r.class_name,
      },
    });
  }
};

const initializeFeeReminderScheduler = () => {
  // Daily at 06:30 server time.
  cron.schedule('30 6 * * *', async () => {
    try {
      await runFeeReminderSweep();
    } catch (e) {
      console.warn('Fee reminder sweep failed:', e.message);
    }
  });
};

module.exports = {
  initializeFeeReminderScheduler,
  runFeeReminderSweep,
};

