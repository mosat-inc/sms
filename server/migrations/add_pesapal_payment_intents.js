const { pool } = require('../config/database');

/**
 * Adds a table to track parent-initiated online payments (Pesapal).
 * This allows us to create an intent before redirecting to the gateway,
 * then reconcile the gateway callback/IPN to update school records.
 */
const addPesapalPaymentIntents = async () => {
  const connection = await pool.getConnection();

  try {
    console.log('🧾 Adding payment_intents table (Pesapal support)...');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        academic_year VARCHAR(9) DEFAULT '2024-2025',
        purpose ENUM('fee', 'contribution', 'pocket_money_deposit') NOT NULL,
        category VARCHAR(50) NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'TZS',
        status ENUM('initiated', 'pending', 'paid', 'failed', 'cancelled') NOT NULL DEFAULT 'initiated',
        merchant_reference VARCHAR(80) NOT NULL UNIQUE,
        order_tracking_id VARCHAR(120) NULL,
        gateway_status VARCHAR(80) NULL,
        gateway_response LONGTEXT NULL,
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_student_status (student_id, status),
        INDEX idx_tracking (order_tracking_id),
        INDEX idx_year_purpose (academic_year, purpose)
      )
    `);

    console.log('✅ payment_intents table ready');
  } catch (error) {
    console.error('❌ Failed to add payment_intents table:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { addPesapalPaymentIntents };
