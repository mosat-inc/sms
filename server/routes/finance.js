const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const { authenticateToken } = Auth;
const { createParentNotificationForStudent } = require('../services/notificationsService');

const getCurrentAcademicYear = async () => {
  try {
    const result = await executeQuery(
      'SELECT year_name, start_date, end_date FROM academic_years WHERE is_current = TRUE LIMIT 1',
      []
    );
    return result.rows?.[0] || { year_name: '2024-2025', start_date: null, end_date: null };
  } catch (_err) {
    return { year_name: '2024-2025', start_date: null, end_date: null };
  }
};

const ensureContributionAndPocketTables = async () => {
  // These tables are created in initializeDatabase(), but dev servers may be running
  // without a restart; ensure they exist before querying to avoid 500s.
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS school_contribution_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        category ENUM('food', 'guards', 'emergency', 'graduation', 'sports_trips', 'fare', 'condolence') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        status ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Paid',
        payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque', 'paypal') DEFAULT 'cash',
        reference_number VARCHAR(50) NULL,
        receipt_number VARCHAR(50) NULL,
        academic_year VARCHAR(9) DEFAULT '2024-2025',
        notes TEXT NULL,
        recorded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_contrib_student_year (student_id, academic_year),
        INDEX idx_contrib_category_year (category, academic_year)
      )
    `);
  } catch (err) {
    // ignore (table may exist with slightly different schema in some envs)
    console.warn('ensureContributionAndPocketTables: contributions table check failed:', err.message);
  }

  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS student_pocket_money (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        txn_type ENUM('deposit', 'withdrawal') NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        txn_date DATE NOT NULL,
        payment_method ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque', 'paypal') DEFAULT 'cash',
        reference_number VARCHAR(50) NULL,
        academic_year VARCHAR(9) DEFAULT '2024-2025',
        notes TEXT NULL,
        recorded_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_pocket_student_year (student_id, academic_year),
        INDEX idx_pocket_txn_date (txn_date)
      )
    `);
  } catch (err) {
    console.warn('ensureContributionAndPocketTables: pocket table check failed:', err.message);
  }
};

const isWithinDays = (dateValue, days) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
};

// Helper function to execute queries
const executeQuery = async (query, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return { rows };
  } finally {
    connection.release();
  }
};

// Get all fee payments
router.get('/fee-payments', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const query = `
      SELECT 
        fp.*,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        s.student_id as student_number,
        c.name as class_name
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      ORDER BY fp.payment_date DESC, fp.created_at DESC
      LIMIT 100
    `;
    
    const result = await executeQuery(query, []);
    
    res.json({
      success: true,
      data: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching fee payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee payments',
      error: error.message
    });
  }
});

// Record a fee payment
router.post('/record-payment', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { student_id, amount, term, payment_date, status } = req.body;
    
    // Validate required fields
    if (!student_id || !amount || !term || !payment_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Verify student exists and belongs to school
    const studentCheck = await executeQuery('SELECT id FROM students WHERE id = ?', [student_id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const insertQuery = `
      INSERT INTO fee_payments (student_id, amount, term, payment_date, status, recorded_by, academic_year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(insertQuery, [
      student_id,
      parseFloat(amount),
      term,
      payment_date,
      status || 'Paid',
      req.user.id,
      new Date(payment_date).getFullYear() // Extract academic_year from payment_date
    ]);

    setImmediate(async () => {
      try {
        await createParentNotificationForStudent({
          studentId: student_id,
          type: 'finance',
          priority: 'medium',
          title: 'Fee Payment Recorded',
          message: `Fee payment of TZS ${Number(amount).toLocaleString()} was recorded on ${payment_date} (term: ${term}, status: ${status || 'Paid'}).`,
          data: {
            amount: Number(amount),
            term,
            payment_date,
            status: status || 'Paid',
            source: 'finance.record-payment',
          },
        });
      } catch (_e) {
        // Do not block payment flow
      }
    });
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
});

// Get fee status (paid/unpaid) for current academic year, role-aware
router.get('/fee-status', authenticateToken, async (req, res) => {
  try {
    const { class_id } = req.query;
    const academicYear = await getCurrentAcademicYear();
    const academicYearName = academicYear.year_name || '2024-2025';

    const where = [];
    const params = [academicYearName, academicYearName];

    // Role scoping
    if (req.user.role === 'teacher') {
      where.push(`s.class_id IN (
        SELECT DISTINCT tsa.class_id
        FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
      )`);
      params.push(req.user.id, academicYearName);
    } else if (req.user.role === 'student') {
      where.push('s.user_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'parent') {
      where.push(`s.id IN (
        SELECT ss.student_id
        FROM student_supervisors ss
        JOIN supervisors sup ON sup.id = ss.supervisor_id
        WHERE (sup.phone = ? OR (sup.email IS NOT NULL AND sup.email <> '' AND sup.email = ?))
      )`);
      params.push(req.user.phone || '', req.user.email || '');
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (class_id) {
      where.push('s.class_id = ?');
      params.push(Number(class_id));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        s.id as student_id,
        s.student_id as student_number,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        c.id as class_id,
        c.name as class_name,
        c.level as class_level,
        COALESCE(sfr.total_fees_required, 75000.00) as total_required,
        COALESCE(sfr.total_fees_paid, 0.00) as total_paid,
        COALESCE(sfr.outstanding_balance, COALESCE(sfr.total_fees_required, 75000.00)) as outstanding_balance,
        sfr.last_payment_date,
        ay.start_date as academic_year_start,
        ay.end_date as academic_year_end
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN student_financial_records sfr
        ON sfr.student_id = s.id AND sfr.academic_year = ?
      LEFT JOIN academic_years ay
        ON ay.year_name = ?
      ${whereClause}
      ORDER BY c.level, c.name, u.first_name, u.last_name
    `;

    const result = await executeQuery(query, params);
    const rows = (result.rows || []).map((row) => {
      const required = Number(row.total_required || 0);
      const paid = Number(row.total_paid || 0);
      const balance = Number(row.outstanding_balance || Math.max(0, required - paid));
      const paymentPercentage = required > 0 ? Math.min(100, Math.round((paid / required) * 10000) / 100) : 0;

      let status = 'unpaid';
      if (paid > 0 && balance > 0) status = 'partial';
      if (required > 0 && balance <= 0) status = 'paid';
      if (required === 0) status = 'not_configured';

      return {
        ...row,
        total_required: required,
        total_paid: paid,
        outstanding_balance: balance,
        payment_percentage: paymentPercentage,
        status,
        payment_start_soon: isWithinDays(row.academic_year_start, 14),
        deadline_soon: isWithinDays(row.academic_year_end, 14),
      };
    });

    return res.json({
      success: true,
      data: {
        academic_year: academicYearName,
        rows,
      },
    });
  } catch (error) {
    console.error('Error fetching fee status:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch fee status', error: error.message });
  }
});

// Get contribution status for a specific category (paid/unpaid), role-aware
router.get('/contributions/status', authenticateToken, async (req, res) => {
  try {
    await ensureContributionAndPocketTables();

    const { category, class_id } = req.query;
    const allowedCategories = new Set([
      'food',
      'guards',
      'emergency',
      'graduation',
      'sports_trips',
      'fare',
      'condolence',
    ]);

    if (!category || !allowedCategories.has(String(category))) {
      return res.status(400).json({ success: false, message: 'Invalid or missing category' });
    }

    const academicYear = await getCurrentAcademicYear();
    const academicYearName = academicYear.year_name || '2024-2025';

    const where = [];
    const params = [academicYearName, String(category)];

    if (req.user.role === 'teacher') {
      where.push(`s.class_id IN (
        SELECT DISTINCT tsa.class_id
        FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
      )`);
      params.push(req.user.id, academicYearName);
    } else if (req.user.role === 'student') {
      where.push('s.user_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'parent') {
      where.push(`s.id IN (
        SELECT ss.student_id
        FROM student_supervisors ss
        JOIN supervisors sup ON sup.id = ss.supervisor_id
        WHERE (sup.phone = ? OR (sup.email IS NOT NULL AND sup.email <> '' AND sup.email = ?))
      )`);
      params.push(req.user.phone || '', req.user.email || '');
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (class_id) {
      where.push('s.class_id = ?');
      params.push(Number(class_id));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        s.id as student_id,
        s.student_id as student_number,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        c.id as class_id,
        c.name as class_name,
        c.level as class_level,
        MAX(CASE WHEN scp.status = 'Paid' THEN 1 ELSE 0 END) as is_paid,
        MAX(scp.payment_date) as last_payment_date,
        SUM(CASE WHEN scp.status = 'Paid' THEN scp.amount ELSE 0 END) as total_paid_amount
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN school_contribution_payments scp
        ON scp.student_id = s.id AND scp.academic_year = ? AND scp.category = ?
      ${whereClause}
      GROUP BY s.id, s.student_id, u.first_name, u.last_name, c.id, c.name, c.level
      ORDER BY c.level, c.name, u.first_name, u.last_name
    `;

    const result = await executeQuery(query, params);

    return res.json({
      success: true,
      data: {
        academic_year: academicYearName,
        category,
        rows: (result.rows || []).map((r) => ({
          ...r,
          is_paid: Boolean(r.is_paid),
          total_paid_amount: Number(r.total_paid_amount || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching contribution status:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch contribution status', error: error.message });
  }
});

// Record a contribution payment
router.post('/contributions/record-payment', authenticateToken, async (req, res) => {
  try {
    await ensureContributionAndPocketTables();

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { student_id, category, amount, payment_date, status, payment_method, reference_number, receipt_number, notes } = req.body;

    const allowedCategories = new Set([
      'food',
      'guards',
      'emergency',
      'graduation',
      'sports_trips',
      'fare',
      'condolence',
    ]);

    if (!student_id || !category || !allowedCategories.has(String(category)) || !amount || !payment_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const academicYear = await getCurrentAcademicYear();
    const academicYearName = academicYear.year_name || '2024-2025';

    // Verify student exists
    const studentCheck = await executeQuery('SELECT id FROM students WHERE id = ?', [student_id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await executeQuery(
      `INSERT INTO school_contribution_payments
        (student_id, category, amount, payment_date, status, payment_method, reference_number, receipt_number, academic_year, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        String(category),
        parseFloat(amount),
        payment_date,
        status || 'Paid',
        payment_method || 'cash',
        reference_number || null,
        receipt_number || null,
        academicYearName,
        notes || null,
        req.user.id,
      ]
    );

    setImmediate(async () => {
      try {
        await createParentNotificationForStudent({
          studentId: student_id,
          type: 'finance',
          priority: 'medium',
          title: 'Contribution Payment Recorded',
          message: `Contribution payment (${category}) of TZS ${Number(amount).toLocaleString()} was recorded on ${payment_date}.`,
          data: {
            category: String(category),
            amount: Number(amount),
            payment_date,
            status: status || 'Paid',
            source: 'finance.contributions.record-payment',
          },
        });
      } catch (_e) {
        // Do not block contribution flow
      }
    });

    return res.json({ success: true, message: 'Contribution recorded successfully' });
  } catch (error) {
    console.error('Error recording contribution:', error);
    return res.status(500).json({ success: false, message: 'Failed to record contribution', error: error.message });
  }
});

// Get pocket money balances, role-aware
router.get('/pocket-money/balances', authenticateToken, async (req, res) => {
  try {
    await ensureContributionAndPocketTables();

    const { class_id } = req.query;
    const academicYear = await getCurrentAcademicYear();
    const academicYearName = academicYear.year_name || '2024-2025';

    const where = [];
    const params = [academicYearName];

    if (req.user.role === 'teacher') {
      where.push(`s.class_id IN (
        SELECT DISTINCT tsa.class_id
        FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = ? AND tsa.academic_year = ?
      )`);
      params.push(req.user.id, academicYearName);
    } else if (req.user.role === 'student') {
      where.push('s.user_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'parent') {
      where.push(`s.id IN (
        SELECT ss.student_id
        FROM student_supervisors ss
        JOIN supervisors sup ON sup.id = ss.supervisor_id
        WHERE (sup.phone = ? OR (sup.email IS NOT NULL AND sup.email <> '' AND sup.email = ?))
      )`);
      params.push(req.user.phone || '', req.user.email || '');
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (class_id) {
      where.push('s.class_id = ?');
      params.push(Number(class_id));
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const query = `
      SELECT
        s.id as student_id,
        s.student_id as student_number,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        c.id as class_id,
        c.name as class_name,
        c.level as class_level,
        SUM(CASE WHEN spm.txn_type = 'deposit' THEN spm.amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN spm.txn_type = 'withdrawal' THEN spm.amount ELSE 0 END) as total_withdrawals,
        (
          SUM(CASE WHEN spm.txn_type = 'deposit' THEN spm.amount ELSE 0 END) -
          SUM(CASE WHEN spm.txn_type = 'withdrawal' THEN spm.amount ELSE 0 END)
        ) as balance,
        MAX(spm.txn_date) as last_txn_date
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN student_pocket_money spm
        ON spm.student_id = s.id AND spm.academic_year = ?
      ${whereClause}
      GROUP BY s.id, s.student_id, u.first_name, u.last_name, c.id, c.name, c.level
      ORDER BY c.level, c.name, u.first_name, u.last_name
    `;

    const result = await executeQuery(query, params);

    return res.json({
      success: true,
      data: {
        academic_year: academicYearName,
        rows: (result.rows || []).map((r) => ({
          ...r,
          total_deposits: Number(r.total_deposits || 0),
          total_withdrawals: Number(r.total_withdrawals || 0),
          balance: Number(r.balance || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching pocket money balances:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch pocket money balances', error: error.message });
  }
});

// Record a pocket money transaction (deposit/withdrawal)
router.post('/pocket-money/record', authenticateToken, async (req, res) => {
  try {
    await ensureContributionAndPocketTables();

    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { student_id, txn_type, amount, txn_date, payment_method, reference_number, notes } = req.body;

    if (!student_id || !txn_type || !amount || !txn_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!['deposit', 'withdrawal'].includes(String(txn_type))) {
      return res.status(400).json({ success: false, message: 'Invalid transaction type' });
    }

    const academicYear = await getCurrentAcademicYear();
    const academicYearName = academicYear.year_name || '2024-2025';

    const studentCheck = await executeQuery('SELECT id FROM students WHERE id = ?', [student_id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    await executeQuery(
      `INSERT INTO student_pocket_money
        (student_id, txn_type, amount, txn_date, payment_method, reference_number, academic_year, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student_id,
        String(txn_type),
        parseFloat(amount),
        txn_date,
        payment_method || 'cash',
        reference_number || null,
        academicYearName,
        notes || null,
        req.user.id,
      ]
    );

    setImmediate(async () => {
      try {
        await createParentNotificationForStudent({
          studentId: student_id,
          type: 'finance',
          priority: 'medium',
          title: 'Pocket Money Transaction',
          message: `Pocket money ${String(txn_type)} of TZS ${Number(amount).toLocaleString()} was recorded on ${txn_date}.`,
          data: {
            txn_type: String(txn_type),
            amount: Number(amount),
            txn_date,
            source: 'finance.pocket-money.record',
          },
        });
      } catch (_e) {
        // Do not block pocket money flow
      }
    });

    return res.json({ success: true, message: 'Pocket money transaction recorded successfully' });
  } catch (error) {
    console.error('Error recording pocket money transaction:', error);
    return res.status(500).json({ success: false, message: 'Failed to record pocket money transaction', error: error.message });
  }
});

// Export fee payments as PDF
router.get('/fee-payments/export-pdf', authenticateToken, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { term, status, class_id, start_date, end_date } = req.query;
    
    // Build dynamic WHERE clause
    let whereConditions = [];
    let queryParams = [];
    
    if (term) {
      whereConditions.push('fp.term = ?');
      queryParams.push(term);
    }
    
    if (status) {
      whereConditions.push('fp.status = ?');
      queryParams.push(status);
    }
    
    if (class_id) {
      whereConditions.push('s.class_id = ?');
      queryParams.push(class_id);
    }
    
    if (start_date) {
      whereConditions.push('fp.payment_date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('fp.payment_date <= ?');
      queryParams.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
    // Get filtered fee payments with student and class information
    const query = `
      SELECT 
        fp.*,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        s.student_id as student_number,
        s.admission_number,
        c.name as class_name,
        c.level as class_level,
        s.date_of_birth,
        s.gender,
        u.phone as student_phone,
        u.email as student_email
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      ${whereClause}
      ORDER BY fp.payment_date DESC, fp.created_at DESC
    `;
    
    const result = await executeQuery(query, queryParams);
    const feePayments = result.rows || [];
    
    // Get summary statistics with same filters
    const statsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(fp.amount) as total_amount,
        SUM(CASE WHEN fp.status = 'Paid' THEN fp.amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN fp.status = 'Pending' THEN fp.amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN fp.status = 'Overdue' THEN fp.amount ELSE 0 END) as overdue_amount,
        COUNT(DISTINCT fp.student_id) as unique_students
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      ${whereClause}
    `;
    
    const statsResult = await executeQuery(statsQuery, queryParams);
    const stats = statsResult.rows[0] || {};
    
    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ 
      margin: 40,
      size: 'A4'
    });
    
    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student-fee-payments-${new Date().toISOString().split('T')[0]}.pdf"`);
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Official Tanzania Header - Centered and Bold
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#000000')
       .text('THE UNITED REPUBLIC OF TANZANIA', { align: 'center' })
       .moveDown(0.3)
       .text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', { align: 'center' })
       .moveDown(0.4)
       .fontSize(16)
       .fillColor('#003366')
       .text('UBUNIFU SECONDARY SCHOOL', { align: 'center' })
       .moveDown(0.3)
       .fontSize(11).font('Helvetica-Oblique')
       .fillColor('#333333')
       .text('Excellence in Education • Nurturing Future Leaders', { align: 'center' })
       .moveDown(0.4)
       .fontSize(9).font('Helvetica')
       .fillColor('#555555')
       .text('P.O. Box 123, Singida, Tanzania', { align: 'center' })
       .moveDown(0.2)
       .text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', { align: 'center' })
       .moveDown(0.4);
    
    // Draw header line
    doc.moveTo(40, doc.y)
       .lineTo(555, doc.y)
       .strokeColor('#e2e8f0')
       .lineWidth(2)
       .stroke()
       .moveDown(1);
    
    // Report Title with Filter Information
    doc.fontSize(18).font('Helvetica-Bold')
       .fillColor('#1e293b')
       .text('STUDENT FEE PAYMENTS REPORT', { align: 'center' })
       .fontSize(12).font('Helvetica')
       .fillColor('#64748b')
       .text(`Generated on: ${new Date().toLocaleDateString('en-GB', { 
         weekday: 'long', 
         year: 'numeric', 
         month: 'long', 
         day: 'numeric' 
       })}`, { align: 'center' })
       .moveDown(1);
    
    // Show active filters if any
    const activeFilters = [];
    if (term) activeFilters.push(`Term: ${term}`);
    if (status) activeFilters.push(`Status: ${status}`);
    if (start_date) activeFilters.push(`From: ${new Date(start_date).toLocaleDateString('en-GB')}`);
    if (end_date) activeFilters.push(`To: ${new Date(end_date).toLocaleDateString('en-GB')}`);
    
    if (activeFilters.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('#7c3aed')
         .text('ACTIVE FILTERS: ', { continued: true })
         .font('Helvetica')
         .fillColor('#64748b')
         .text(activeFilters.join(' | '), { align: 'center' });
    }
    
    doc.moveDown(1);
    
    // Summary Statistics Box
    const summaryStartY = doc.y;
    doc.rect(40, summaryStartY, 515, 120)
       .strokeColor('#e2e8f0')
       .fillColor('#f8fafc')
       .fillAndStroke();
    
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text('PAYMENT SUMMARY', 50, summaryStartY + 15);
    
    // First row of statistics
    doc.fontSize(11).font('Helvetica-Bold')
       .fillColor('#374151')
       .text('Total Payments:', 50, summaryStartY + 40)
       .font('Helvetica')
       .text(`${stats.total_payments || 0}`, 150, summaryStartY + 40)
       
       .font('Helvetica-Bold')
       .text('Unique Students:', 300, summaryStartY + 40)
       .font('Helvetica')
       .text(`${stats.unique_students || 0}`, 400, summaryStartY + 40);
    
    // Second row of statistics
    doc.font('Helvetica-Bold')
       .text('Total Amount:', 50, summaryStartY + 60)
       .font('Helvetica')
       .fillColor('#059669')
       .text(`TZS ${Number(stats.total_amount || 0).toLocaleString()}`, 150, summaryStartY + 60)
       
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('Paid Amount:', 300, summaryStartY + 60)
       .font('Helvetica')
       .fillColor('#059669')
       .text(`TZS ${Number(stats.paid_amount || 0).toLocaleString()}`, 400, summaryStartY + 60);
    
    // Third row of statistics
    doc.font('Helvetica-Bold')
       .fillColor('#374151')
       .text('Pending Amount:', 50, summaryStartY + 80)
       .font('Helvetica')
       .fillColor('#d97706')
       .text(`TZS ${Number(stats.pending_amount || 0).toLocaleString()}`, 150, summaryStartY + 80)
       
       .font('Helvetica-Bold')
       .fillColor('#374151')
       .text('Overdue Amount:', 300, summaryStartY + 80)
       .font('Helvetica')
       .fillColor('#dc2626')
       .text(`TZS ${Number(stats.overdue_amount || 0).toLocaleString()}`, 400, summaryStartY + 80);
    
    doc.y = summaryStartY + 130;
    doc.moveDown(1);
    
    // Visual Payment Status Chart
    if (stats.total_payments > 0) {
      doc.fontSize(12).font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('PAYMENT STATUS DISTRIBUTION', { align: 'center' })
         .moveDown(1);
      
      const chartY = doc.y;
      const chartWidth = 400;
      const chartHeight = 20;
      const chartX = (555 - chartWidth) / 2 + 40;
      
      const totalAmount = parseFloat(stats.total_amount) || 1; // Prevent division by zero
      const paidPercent = ((parseFloat(stats.paid_amount) || 0) / totalAmount) * 100;
      const pendingPercent = ((parseFloat(stats.pending_amount) || 0) / totalAmount) * 100;
      const overduePercent = ((parseFloat(stats.overdue_amount) || 0) / totalAmount) * 100;
      
      // Chart background
      doc.rect(chartX, chartY, chartWidth, chartHeight)
         .fillColor('#e5e7eb')
         .fill();
      
      let currentChartX = chartX;
      
      // Paid section (green)
      if (paidPercent > 0) {
        const paidWidth = (paidPercent / 100) * chartWidth;
        doc.rect(currentChartX, chartY, paidWidth, chartHeight)
           .fillColor('#10b981')
           .fill();
        currentChartX += paidWidth;
      }
      
      // Pending section (yellow)
      if (pendingPercent > 0) {
        const pendingWidth = (pendingPercent / 100) * chartWidth;
        doc.rect(currentChartX, chartY, pendingWidth, chartHeight)
           .fillColor('#f59e0b')
           .fill();
        currentChartX += pendingWidth;
      }
      
      // Overdue section (red)
      if (overduePercent > 0) {
        const overdueWidth = (overduePercent / 100) * chartWidth;
        doc.rect(currentChartX, chartY, overdueWidth, chartHeight)
           .fillColor('#ef4444')
           .fill();
      }
      
      // Chart border
      doc.rect(chartX, chartY, chartWidth, chartHeight)
         .strokeColor('#6b7280')
         .lineWidth(1)
         .stroke();
      
      // Chart legend
      doc.y = chartY + chartHeight + 15;
      const legendY = doc.y;
      
      // Paid legend
      doc.rect(chartX, legendY, 12, 12)
         .fillColor('#10b981')
         .fill();
      doc.fontSize(9).font('Helvetica')
         .fillColor('#374151')
         .text(`Paid (${paidPercent.toFixed(1)}%)`, chartX + 18, legendY + 2);
      
      // Pending legend
      doc.rect(chartX + 120, legendY, 12, 12)
         .fillColor('#f59e0b')
         .fill();
      doc.text(`Pending (${pendingPercent.toFixed(1)}%)`, chartX + 138, legendY + 2);
      
      // Overdue legend
      doc.rect(chartX + 260, legendY, 12, 12)
         .fillColor('#ef4444')
         .fill();
      doc.text(`Overdue (${overduePercent.toFixed(1)}%)`, chartX + 278, legendY + 2);
      
      doc.y = legendY + 25;
    }
    
    if (feePayments.length === 0) {
      doc.fontSize(14).font('Helvetica-Bold')
         .fillColor('#64748b')
         .text('No fee payment records found', { align: 'center' })
         .moveDown(2)
         .fontSize(12).font('Helvetica')
         .text('Please record some fee payments first to generate a comprehensive report.', { align: 'center' });
    } else {
      // Payments Table Header
      doc.fontSize(14).font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('DETAILED PAYMENT RECORDS', { underline: true })
         .moveDown(1);
      
      // Table setup
      const tableTop = doc.y;
      const colWidths = [110, 80, 70, 60, 70, 60, 50];
      let currentX = 40;
      
      // Table headers
      doc.rect(40, tableTop, 515, 25)
         .fillColor('#3b82f6')
         .fill();
      
      doc.fontSize(9).font('Helvetica-Bold')
         .fillColor('white');
      
      const headers = ['Student Name', 'Class', 'Amount (TZS)', 'Term', 'Date', 'Status', 'Student ID'];
      
      headers.forEach((header, i) => {
        doc.text(header, currentX + 5, tableTop + 8, { 
          width: colWidths[i] - 10, 
          align: 'center' 
        });
        currentX += colWidths[i];
      });
      
      let currentY = tableTop + 25;
      doc.font('Helvetica').fontSize(8);
      
      // Group payments by status for better organization
      const groupedPayments = {
        'Paid': feePayments.filter(p => p.status === 'Paid'),
        'Pending': feePayments.filter(p => p.status === 'Pending'),
        'Overdue': feePayments.filter(p => p.status === 'Overdue')
      };
      
      Object.entries(groupedPayments).forEach(([status, payments]) => {
        if (payments.length === 0) return;
        
        // Status section header
        doc.rect(40, currentY, 515, 20)
           .fillColor(status === 'Paid' ? '#dcfce7' : status === 'Pending' ? '#fef3c7' : '#fee2e2')
           .fill();
        
        doc.fontSize(10).font('Helvetica-Bold')
           .fillColor('#374151')
           .text(`${status.toUpperCase()} PAYMENTS (${payments.length})`, 45, currentY + 6);
        
        currentY += 20;
        
        payments.forEach((payment, index) => {
          currentX = 40;
          
          // Alternate row background
          if (index % 2 === 0) {
            doc.rect(40, currentY, 515, 18)
               .fillColor('#f9fafb')
               .fill();
          }
          
          const rowData = [
            payment.student_name.substring(0, 18) + (payment.student_name.length > 18 ? '...' : ''),
            payment.class_name,
            Number(payment.amount).toLocaleString(),
            payment.term,
            new Date(payment.payment_date).toLocaleDateString('en-GB'),
            payment.status,
            payment.student_number
          ];
          
          doc.fillColor('#374151');
          rowData.forEach((data, i) => {
            doc.text(data, currentX + 3, currentY + 4, { 
              width: colWidths[i] - 6, 
              align: i === 2 ? 'right' : 'left' 
            });
            currentX += colWidths[i];
          });
          
          currentY += 18;
          
          // Add page if needed
          if (currentY > 720) {
            doc.addPage();
            currentY = 50;
          }
        });
        
        currentY += 10; // Space between status groups
      });
    }
    
    // Footer section
    if (doc.y < 700) {
      doc.y = 700;
    }
    
    // Draw footer line
    doc.moveTo(40, doc.y)
       .lineTo(555, doc.y)
       .strokeColor('#e2e8f0')
       .lineWidth(1)
       .stroke()
       .moveDown(0.5);
    
    // Footer information
    doc.fontSize(8).font('Helvetica')
       .fillColor('#64748b')
       .text(`Report generated by: ${req.user.first_name} ${req.user.last_name}`, 40)
       .text(`Generation timestamp: ${new Date().toLocaleString()}`, 40)
       .text('This is a computer-generated document.', { align: 'center' })
       .text('For inquiries, contact the Finance Department.', { align: 'center' })
       .fontSize(7)
       .text('© 2025 Ubunifu Secondary School. All rights reserved.', { align: 'center' });
    
    // Finalize the PDF
    doc.end();
    
  } catch (error) {
    console.error('Error generating fee payments PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate fee payments report',
      error: error.message
    });
  }
});

// Export individual student fee statement
router.get('/student-fee-statement/:student_id', authenticateToken, async (req, res) => {
  try {
    const { student_id } = req.params;
    
    // Get student information
    const studentQuery = `
      SELECT 
        s.*,
        CONCAT(u.first_name, ' ', u.last_name) as student_name,
        u.email,
        u.phone,
        c.name as class_name,
        c.level as class_level
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = ?
    `;
    
    const studentResult = await executeQuery(studentQuery, [student_id]);
    const student = studentResult.rows[0];
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Get student's fee payments
    const paymentsQuery = `
      SELECT 
        fp.*,
        CONCAT(recorded_user.first_name, ' ', recorded_user.last_name) as recorded_by_name
      FROM fee_payments fp
      LEFT JOIN users recorded_user ON fp.recorded_by = recorded_user.id
      WHERE fp.student_id = ?
      ORDER BY fp.payment_date DESC, fp.created_at DESC
    `;
    
    const paymentsResult = await executeQuery(paymentsQuery, [student_id]);
    const payments = paymentsResult.rows || [];
    
    // Calculate totals
    const totalPaid = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPending = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalOverdue = payments.filter(p => p.status === 'Overdue').reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const grandTotal = totalPaid + totalPending + totalOverdue;
    
    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4'
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fee-statement-${student.student_id}.pdf"`);
    doc.pipe(res);
    
    // Official Tanzania Header - Centered and Bold
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#000000')
       .text('THE UNITED REPUBLIC OF TANZANIA', { align: 'center' })
       .moveDown(0.3)
       .text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', { align: 'center' })
       .moveDown(0.4)
       .fontSize(16)
       .fillColor('#003366')
       .text('UBUNIFU SECONDARY SCHOOL', { align: 'center' })
       .moveDown(0.3)
       .fontSize(11).font('Helvetica-Oblique')
       .fillColor('#333333')
       .text('Excellence in Education • Nurturing Future Leaders', { align: 'center' })
       .moveDown(0.4)
       .fontSize(9).font('Helvetica')
       .fillColor('#555555')
       .text('P.O. Box 123, Singida, Tanzania', { align: 'center' })
       .moveDown(0.2)
       .text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', { align: 'center' })
       .moveDown(0.4);
    
    // Decorative line
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
       .strokeColor('#003366').lineWidth(0.5).stroke();
    doc.moveDown(0.4);
    
    // Report Title
    doc.fontSize(16).font('Helvetica-Bold')
       .fillColor('#003366')
       .text('Student Fee Statement', { align: 'center' })
       .moveDown(2);
    
    // Student Information Card
    const cardY = doc.y;
    doc.rect(50, cardY, 495, 120)
       .fillColor('#f8fafc')
       .strokeColor('#e2e8f0')
       .fillAndStroke();
    
    doc.fontSize(16).font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text('STUDENT INFORMATION', 60, cardY + 15);
    
    doc.fontSize(11).font('Helvetica')
       .fillColor('#374151')
       .text(`Name: ${student.student_name}`, 60, cardY + 40)
       .text(`Student ID: ${student.student_id}`, 300, cardY + 40)
       .text(`Admission Number: ${student.admission_number}`, 60, cardY + 60)
       .text(`Class: ${student.class_name}`, 300, cardY + 60)
       .text(`Phone: ${student.phone}`, 60, cardY + 80)
       .text(`Email: ${student.email}`, 300, cardY + 80);
    
    doc.y = cardY + 130;
    doc.moveDown(1);
    
    // Payment Summary
    doc.fontSize(14).font('Helvetica-Bold')
       .fillColor('#1e40af')
       .text('PAYMENT SUMMARY', { underline: true })
       .moveDown(0.5);
    
    const summaryY = doc.y;
    doc.fontSize(12).font('Helvetica-Bold')
       .fillColor('#10b981')
       .text(`Total Paid: TZS ${totalPaid.toLocaleString()}`, 60, summaryY)
       .fillColor('#f59e0b')
       .text(`Total Pending: TZS ${totalPending.toLocaleString()}`, 200, summaryY)
       .fillColor('#ef4444')
       .text(`Total Overdue: TZS ${totalOverdue.toLocaleString()}`, 350, summaryY)
       .fillColor('#374151')
       .text(`Grand Total: TZS ${grandTotal.toLocaleString()}`, 200, summaryY + 25, { align: 'center' });
    
    doc.moveDown(2);
    
    // Payment History Table
    if (payments.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold')
         .fillColor('#1e40af')
         .text('PAYMENT HISTORY', { underline: true })
         .moveDown(1);
      
      const tableY = doc.y;
      const colWidths = [80, 60, 80, 70, 80, 75, 50];
      
      // Table header
      doc.rect(50, tableY, 495, 25)
         .fillColor('#3b82f6')
         .fill();
      
      let headerX = 50;
      const headers = ['Date', 'Term', 'Amount', 'Status', 'Receipt #', 'Recorded By', 'Method'];
      
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('white');
      
      headers.forEach((header, i) => {
        doc.text(header, headerX + 5, tableY + 8, { 
          width: colWidths[i] - 10, 
          align: 'center' 
        });
        headerX += colWidths[i];
      });
      
      let rowY = tableY + 25;
      doc.font('Helvetica').fontSize(9);
      
      payments.forEach((payment, index) => {
        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(50, rowY, 495, 18)
             .fillColor('#f9fafb')
             .fill();
        }
        
        let cellX = 50;
        const statusColor = payment.status === 'Paid' ? '#10b981' : 
                           payment.status === 'Pending' ? '#f59e0b' : '#ef4444';
        
        const rowData = [
          new Date(payment.payment_date).toLocaleDateString('en-GB'),
          payment.term,
          `TZS ${Number(payment.amount).toLocaleString()}`,
          payment.status,
          payment.receipt_number || '-',
          payment.recorded_by_name || 'System',
          payment.payment_method || 'Cash'
        ];
        
        rowData.forEach((data, i) => {
          doc.fillColor(i === 3 ? statusColor : '#374151')
             .text(data, cellX + 3, rowY + 4, { 
               width: colWidths[i] - 6, 
               align: i === 2 ? 'right' : 'center' 
             });
          cellX += colWidths[i];
        });
        
        rowY += 18;
        
        if (rowY > 720) {
          doc.addPage();
          rowY = 50;
        }
      });
    } else {
      doc.fontSize(12).font('Helvetica')
         .fillColor('#64748b')
         .text('No payment records found for this student.', { align: 'center' });
    }
    
    // Footer
    doc.fontSize(8).font('Helvetica')
       .fillColor('#64748b')
       .text(`Generated on: ${new Date().toLocaleString()}`, 50, doc.page.height - 80)
       .text(`Generated by: ${req.user.first_name} ${req.user.last_name}`, { align: 'center' })
       .text('This is an official document from Ubunifu Secondary School', { align: 'center' });
    
    doc.end();
    
  } catch (error) {
    console.error('Error generating student fee statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student fee statement',
      error: error.message
    });
  }
});

module.exports = router;
