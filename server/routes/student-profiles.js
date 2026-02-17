const express = require('express');
const Joi = require('joi');
const { pool } = require('../config/database');
const router = express.Router();

// Validation schema for updating student profile
const updateStudentProfileSchema = Joi.object({
    personal_info: Joi.object({
        phone: Joi.string().pattern(/^(\+255|0)[67]\d{8}$/).optional().messages({
            'string.pattern.base': 'Please provide a valid Tanzanian phone number'
        }),
        email: Joi.string().email().optional(),
        address: Joi.string().max(500).optional(),
        blood_group: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
        nationality: Joi.string().max(50).optional(),
        religion: Joi.string().max(50).optional(),
        medical_conditions: Joi.string().max(1000).optional(),
        emergency_contact: Joi.string().pattern(/^(\+255|0)[67]\d{8}$/).optional()
    }).optional(),
    
    supervisor_info: Joi.object({
        supervisor_id: Joi.number().integer().positive().required(),
        first_name: Joi.string().min(2).max(50).optional(),
        last_name: Joi.string().min(2).max(50).optional(),
        phone: Joi.string().pattern(/^(\+255|0)[67]\d{8}$/).optional(),
        email: Joi.string().email().optional(),
        address: Joi.string().max(500).optional(),
        occupation: Joi.string().max(100).optional(),
        workplace: Joi.string().max(100).optional()
    }).optional()
});

// Validation schema for fee payments
const paymentSchema = Joi.object({
    student_id: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().precision(2).required().messages({
        'number.positive': 'Payment amount must be positive',
        'any.required': 'Payment amount is required'
    }),
    payment_method: Joi.string().valid('cash', 'bank_transfer', 'mobile_money', 'cheque').required(),
    payment_for: Joi.string().valid('tuition', 'registration', 'examination', 'activities', 'transport', 'uniform', 'other').required(),
    reference_number: Joi.string().max(50).optional(),
    receipt_number: Joi.string().max(50).optional(),
    academic_year: Joi.string().pattern(/^\d{4}-\d{4}$/).required(),
    notes: Joi.string().max(500).optional()
});

// GET /api/student-profiles/:id - Get comprehensive student profile
router.get('/:id', async (req, res) => {
    try {
        const studentId = req.params.id;

        // Get basic student information
        const [studentInfo] = await pool.execute(`
            SELECT 
                s.id, s.student_id, s.admission_number, s.date_of_birth,
                s.gender, s.blood_group, s.nationality, s.religion,
                s.admission_date, s.graduation_date, s.status,
                s.emergency_contact, s.medical_conditions,
                u.first_name, u.last_name, u.phone, u.email, u.address, u.profile_image,
                c.name as current_class, c.level as current_level, c.academic_year as current_academic_year
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.id = ?
        `, [studentId]);

        if (studentInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const student = studentInfo[0];

        // Get supervisor information
        const [supervisorInfo] = await pool.execute(`
            SELECT 
                sup.id, sup.first_name, sup.last_name, sup.relationship,
                sup.phone, sup.email, sup.address, sup.occupation, sup.workplace,
                ss.is_primary_supervisor, ss.emergency_contact
            FROM supervisors sup
            JOIN student_supervisors ss ON sup.id = ss.supervisor_id
            WHERE ss.student_id = ?
            ORDER BY ss.is_primary_supervisor DESC
        `, [studentId]);

        // Get academic history
        const [academicHistory] = await pool.execute(`
            SELECT 
                sah.id, sah.academic_year, sah.enrollment_date, sah.completion_date,
                sah.status, sah.average_grade, sah.position_in_class, 
                sah.total_students_in_class, sah.remarks,
                c.name as class_name, c.level,
                pc.name as previous_class_name
            FROM student_academic_history sah
            LEFT JOIN classes c ON sah.class_id = c.id
            LEFT JOIN classes pc ON sah.previous_class_id = pc.id
            WHERE sah.student_id = ?
            ORDER BY sah.academic_year DESC
        `, [studentId]);

        // Get financial information
        const [financialRecords] = await pool.execute(`
            SELECT 
                sfr.id, sfr.academic_year, sfr.total_fees_required,
                sfr.total_fees_paid, sfr.outstanding_balance,
                sfr.last_payment_date, sfr.payment_plan, 
                sfr.scholarship_percentage, sfr.notes,
                ROUND(((sfr.total_fees_paid / sfr.total_fees_required) * 100), 2) as payment_percentage
            FROM student_financial_records sfr
            WHERE sfr.student_id = ?
            ORDER BY sfr.academic_year DESC
        `, [studentId]);

        // Get payment history
        const [paymentHistory] = await pool.execute(`
            SELECT 
                fp.id, fp.amount, fp.payment_date, fp.payment_method,
                fp.reference_number, fp.receipt_number, fp.academic_year,
                fp.payment_for, fp.notes,
                u.first_name as recorded_by_first_name, u.last_name as recorded_by_last_name
            FROM fee_payments fp
            LEFT JOIN users u ON fp.recorded_by = u.id
            WHERE fp.student_id = ?
            ORDER BY fp.payment_date DESC
            LIMIT 50
        `, [studentId]);

        // Get student documents
        const [documents] = await pool.execute(`
            SELECT 
                sd.id, sd.document_type, sd.document_name, sd.uploaded_date,
                sd.file_size, sd.mime_type, sd.is_verified, sd.verification_date,
                sd.notes,
                u1.first_name as uploaded_by_first_name, u1.last_name as uploaded_by_last_name,
                u2.first_name as verified_by_first_name, u2.last_name as verified_by_last_name
            FROM student_documents sd
            LEFT JOIN users u1 ON sd.uploaded_by = u1.id
            LEFT JOIN users u2 ON sd.verified_by = u2.id
            WHERE sd.student_id = ?
            ORDER BY sd.uploaded_date DESC
        `, [studentId]);

        // Calculate summary statistics
        const totalFeesOwed = financialRecords.reduce((sum, record) => sum + parseFloat(record.outstanding_balance), 0);
        const totalFeesPaid = financialRecords.reduce((sum, record) => sum + parseFloat(record.total_fees_paid), 0);
        const totalFeesRequired = financialRecords.reduce((sum, record) => sum + parseFloat(record.total_fees_required), 0);

        res.json({
            success: true,
            message: 'Student profile retrieved successfully',
            data: {
                personal_info: {
                    ...student,
                    age: new Date().getFullYear() - new Date(student.date_of_birth).getFullYear()
                },
                supervisors: supervisorInfo,
                academic_history: academicHistory,
                financial_summary: {
                    total_fees_required: totalFeesRequired,
                    total_fees_paid: totalFeesPaid,
                    total_outstanding: totalFeesOwed,
                    payment_percentage: totalFeesRequired > 0 ? ((totalFeesPaid / totalFeesRequired) * 100).toFixed(2) : 0,
                    records: financialRecords
                },
                payment_history: paymentHistory,
                documents: documents,
                statistics: {
                    years_enrolled: academicHistory.length,
                    current_status: student.status,
                    documents_count: documents.length,
                    verified_documents: documents.filter(doc => doc.is_verified).length
                }
            }
        });

    } catch (error) {
        console.error('Get student profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve student profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// PUT /api/student-profiles/:id - Update student profile
router.put('/:id', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const studentId = req.params.id;
        
        // Validate input
        const { error, value } = updateStudentProfileSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { personal_info, supervisor_info } = value;

        await connection.beginTransaction();

        // Verify student exists
        const [studentExists] = await connection.execute(
            'SELECT id, user_id FROM students WHERE id = ?',
            [studentId]
        );

        if (studentExists.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const userId = studentExists[0].user_id;

        // Update personal information
        if (personal_info) {
            const userUpdates = [];
            const userValues = [];
            const studentUpdates = [];
            const studentValues = [];

            if (personal_info.phone !== undefined) {
                userUpdates.push('phone = ?');
                userValues.push(personal_info.phone);
            }
            if (personal_info.email !== undefined) {
                userUpdates.push('email = ?');
                userValues.push(personal_info.email);
            }
            if (personal_info.address !== undefined) {
                userUpdates.push('address = ?');
                userValues.push(personal_info.address);
            }

            if (personal_info.blood_group !== undefined) {
                studentUpdates.push('blood_group = ?');
                studentValues.push(personal_info.blood_group);
            }
            if (personal_info.nationality !== undefined) {
                studentUpdates.push('nationality = ?');
                studentValues.push(personal_info.nationality);
            }
            if (personal_info.religion !== undefined) {
                studentUpdates.push('religion = ?');
                studentValues.push(personal_info.religion);
            }
            if (personal_info.medical_conditions !== undefined) {
                studentUpdates.push('medical_conditions = ?');
                studentValues.push(personal_info.medical_conditions);
            }
            if (personal_info.emergency_contact !== undefined) {
                studentUpdates.push('emergency_contact = ?');
                studentValues.push(personal_info.emergency_contact);
            }

            // Update user table
            if (userUpdates.length > 0) {
                userValues.push(userId);
                await connection.execute(
                    `UPDATE users SET ${userUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    userValues
                );
            }

            // Update student table
            if (studentUpdates.length > 0) {
                studentValues.push(studentId);
                await connection.execute(
                    `UPDATE students SET ${studentUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    studentValues
                );
            }
        }

        // Update supervisor information
        if (supervisor_info) {
            const supervisorUpdates = [];
            const supervisorValues = [];

            if (supervisor_info.first_name !== undefined) {
                supervisorUpdates.push('first_name = ?');
                supervisorValues.push(supervisor_info.first_name);
            }
            if (supervisor_info.last_name !== undefined) {
                supervisorUpdates.push('last_name = ?');
                supervisorValues.push(supervisor_info.last_name);
            }
            if (supervisor_info.phone !== undefined) {
                supervisorUpdates.push('phone = ?');
                supervisorValues.push(supervisor_info.phone);
            }
            if (supervisor_info.email !== undefined) {
                supervisorUpdates.push('email = ?');
                supervisorValues.push(supervisor_info.email);
            }
            if (supervisor_info.address !== undefined) {
                supervisorUpdates.push('address = ?');
                supervisorValues.push(supervisor_info.address);
            }
            if (supervisor_info.occupation !== undefined) {
                supervisorUpdates.push('occupation = ?');
                supervisorValues.push(supervisor_info.occupation);
            }
            if (supervisor_info.workplace !== undefined) {
                supervisorUpdates.push('workplace = ?');
                supervisorValues.push(supervisor_info.workplace);
            }

            if (supervisorUpdates.length > 0) {
                supervisorValues.push(supervisor_info.supervisor_id);
                await connection.execute(
                    `UPDATE supervisors SET ${supervisorUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    supervisorValues
                );
            }
        }

        await connection.commit();

        res.json({
            success: true,
            message: 'Student profile updated successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('Update student profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update student profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    } finally {
        connection.release();
    }
});

// POST /api/student-profiles/:id/payments - Record fee payment
router.post('/:id/payments', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const studentId = req.params.id;
        const { error, value } = paymentSchema.validate(req.body);
        
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const {
            amount, payment_method, payment_for, reference_number,
            receipt_number, academic_year, notes
        } = value;

        await connection.beginTransaction();

        // Verify student exists
        const [studentExists] = await connection.execute(
            'SELECT id FROM students WHERE id = ?',
            [studentId]
        );

        if (studentExists.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        // Get or create financial record for the academic year
        let [financialRecord] = await connection.execute(
            'SELECT id, total_fees_paid, outstanding_balance FROM student_financial_records WHERE student_id = ? AND academic_year = ?',
            [studentId, academic_year]
        );

        let financialRecordId;
        if (financialRecord.length === 0) {
            // Create new financial record
            const [newRecord] = await connection.execute(
                'INSERT INTO student_financial_records (student_id, academic_year, total_fees_required, outstanding_balance) VALUES (?, ?, 75000.00, 75000.00)',
                [studentId, academic_year]
            );
            financialRecordId = newRecord.insertId;
            financialRecord = [{ id: financialRecordId, total_fees_paid: 0, outstanding_balance: 75000 }];
        } else {
            financialRecordId = financialRecord[0].id;
        }

        // Generate receipt number if not provided
        const receiptNum = receipt_number || `RCP${Date.now()}`;

        // Record the payment
        await connection.execute(`
            INSERT INTO fee_payments (
                student_id, financial_record_id, amount, payment_date,
                payment_method, reference_number, receipt_number,
                academic_year, payment_for, notes, recorded_by
            ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)
        `, [
            studentId, financialRecordId, amount, payment_method,
            reference_number, receiptNum, academic_year, payment_for,
            notes, req.user?.id || null
        ]);

        // Update financial record
        const newTotalPaid = parseFloat(financialRecord[0].total_fees_paid) + parseFloat(amount);
        const newOutstandingBalance = parseFloat(financialRecord[0].outstanding_balance) - parseFloat(amount);

        await connection.execute(
            'UPDATE student_financial_records SET total_fees_paid = ?, outstanding_balance = ?, last_payment_date = CURDATE() WHERE id = ?',
            [newTotalPaid, Math.max(0, newOutstandingBalance), financialRecordId]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                receipt_number: receiptNum,
                amount_paid: amount,
                payment_method: payment_method,
                new_balance: Math.max(0, newOutstandingBalance),
                payment_date: new Date().toISOString().split('T')[0]
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Record payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record payment',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    } finally {
        connection.release();
    }
});

// GET /api/student-profiles/:id/financial/:year - Get financial details for specific year
router.get('/:id/financial/:year', async (req, res) => {
    try {
        const { id: studentId, year: academicYear } = req.params;

        // Get financial record
        const [financialRecord] = await pool.execute(`
            SELECT * FROM student_financial_records 
            WHERE student_id = ? AND academic_year = ?
        `, [studentId, academicYear]);

        if (financialRecord.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Financial record not found for this academic year'
            });
        }

        // Get payment history for this year
        const [payments] = await pool.execute(`
            SELECT 
                fp.*, u.first_name as recorded_by_first_name, 
                u.last_name as recorded_by_last_name
            FROM fee_payments fp
            LEFT JOIN users u ON fp.recorded_by = u.id
            WHERE fp.student_id = ? AND fp.academic_year = ?
            ORDER BY fp.payment_date DESC
        `, [studentId, academicYear]);

        res.json({
            success: true,
            message: 'Financial details retrieved successfully',
            data: {
                financial_record: financialRecord[0],
                payments: payments
            }
        });

    } catch (error) {
        console.error('Get financial details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve financial details'
        });
    }
});

// GET /api/student-profiles/search - Search students by various criteria
router.get('/search', async (req, res) => {
    try {
        const { 
            query, 
            class_id, 
            academic_year, 
            status = 'active',
            limit = 50 
        } = req.query;

        let sql = `
            SELECT 
                s.id, s.student_id, s.admission_number,
                u.first_name, u.last_name, u.phone, u.email,
                c.name as current_class, c.level,
                s.status, s.admission_date
            FROM students s
            JOIN users u ON s.user_id = u.id
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE 1=1
        `;
        
        const params = [];

        if (status !== 'all') {
            sql += ` AND s.status = ?`;
            params.push(status);
        }

        if (query) {
            sql += ` AND (
                u.first_name LIKE ? OR u.last_name LIKE ? OR 
                s.student_id LIKE ? OR s.admission_number LIKE ? OR
                u.phone LIKE ? OR u.email LIKE ?
            )`;
            const searchTerm = `%${query}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (class_id) {
            sql += ` AND s.class_id = ?`;
            params.push(class_id);
        }

        sql += ` ORDER BY u.first_name, u.last_name LIMIT ?`;
        params.push(parseInt(limit));

        const [students] = await pool.execute(sql, params);

        res.json({
            success: true,
            message: 'Students retrieved successfully',
            data: students
        });

    } catch (error) {
        console.error('Search students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search students'
        });
    }
});

module.exports = router;
