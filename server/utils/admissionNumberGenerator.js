/**
 * Admission Number Generator
 * Format: AD/<YEAR>/<00000>
 *
 * Concurrency-safe: uses a yearly sequence row locked with SELECT ... FOR UPDATE
 * inside the same transaction that creates the student record.
 */

const ADMISSION_PREFIX = 'AD';

function formatAdmissionNumber({ year, number }) {
  const seq = String(number).padStart(5, '0');
  return `${ADMISSION_PREFIX}/${year}/${seq}`;
}

/**
 * Generates the next admission number for a given year.
 * Must be called with an active MySQL transaction connection.
 *
 * @param {import('mysql2/promise').PoolConnection} connection
 * @param {number} year
 * @returns {Promise<{ admission_number: string, admission_year: number, sequence_number: number }>}
 */
async function generateAdmissionNumber(connection, year) {
  if (!connection) throw new Error('DB connection required');
  if (!year || !Number.isInteger(year)) throw new Error('Valid admission year required');

  // Ensure sequence row exists (no lock yet).
  await connection.execute(
    `INSERT INTO admission_sequences (admission_year, last_number) VALUES (?, 0)
     ON DUPLICATE KEY UPDATE last_number = last_number`,
    [year]
  );

  // Lock the row for this year so concurrent registrations cannot clash.
  const [rows] = await connection.execute(
    `SELECT last_number FROM admission_sequences WHERE admission_year = ? FOR UPDATE`,
    [year]
  );
  const last = rows?.[0]?.last_number ?? 0;
  const next = Number(last) + 1;

  await connection.execute(`UPDATE admission_sequences SET last_number = ? WHERE admission_year = ?`, [next, year]);

  return {
    admission_number: formatAdmissionNumber({ year, number: next }),
    admission_year: year,
    sequence_number: next,
  };
}

module.exports = {
  formatAdmissionNumber,
  generateAdmissionNumber,
};

