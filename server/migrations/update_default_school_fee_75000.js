const { pool } = require('../config/database');

/**
 * Updates legacy/default fee values from 500000 to 75000.
 *
 * This is intentionally conservative: we only change records that look like
 * they were created with the old default (no payments made and outstanding
 * balance equals required).
 */
const updateDefaultSchoolFeeTo75000 = async () => {
  const connection = await pool.getConnection();
  try {
    const NEW_FEE = 75000.0;
    const OLD_FEE = 500000.0;

    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
        UPDATE student_financial_records
        SET total_fees_required = ?, outstanding_balance = ?
        WHERE total_fees_required = ?
          AND (total_fees_paid IS NULL OR total_fees_paid = 0)
          AND (outstanding_balance IS NULL OR ABS(outstanding_balance - total_fees_required) < 0.01)
      `,
      [NEW_FEE, NEW_FEE, OLD_FEE]
    );

    await connection.commit();

    const changed = Number(result?.affectedRows || 0);
    console.log(`✅ Default school fee updated to ${NEW_FEE} for ${changed} record(s)`);
  } catch (e) {
    await connection.rollback();
    console.error('❌ Failed updating default school fee to 75000:', e.message);
    throw e;
  } finally {
    connection.release();
  }
};

module.exports = {
  updateDefaultSchoolFeeTo75000,
};

