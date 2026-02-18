const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Joi = require('joi');
const Auth = require('../utils/auth');
const router = express.Router();

// Validation schemas
const resetPasswordSchema = Joi.object({
    user_id: Joi.number().integer().positive().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
    }),
    reason: Joi.string().max(255).optional().messages({
        'string.max': 'Reason must not exceed 255 characters'
    })
});

const deleteUserSchema = Joi.object({
    user_id: Joi.number().integer().positive().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
    }),
    confirm: Joi.boolean().valid(true).required().messages({
        'any.only': 'Confirmation is required to delete a user',
        'any.required': 'Confirmation is required'
    })
});

const studentAdmissionAccessSchema = Joi.object({
    user_id: Joi.number().integer().positive().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
    }),
    enabled: Joi.boolean().required().messages({
        'boolean.base': 'Enabled flag must be true or false',
        'any.required': 'Enabled flag is required'
    })
});

// Helper function to generate random password
const generateRandomPassword = (length = 12) => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

// POST /api/admin/reset-password - Reset user password (Admin only)
router.post('/reset-password', Auth.authenticateToken, Auth.requireRole(['admin']), async (req, res) => {
    try {
        // Validate input
        const { error, value } = resetPasswordSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { user_id, reason } = value;
        const adminId = req.user.id;

        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            // Check if user exists and get user details
            const [userRows] = await connection.execute(
                'SELECT id, username, email, first_name, last_name, role FROM users WHERE id = ? AND is_active = 1',
                [user_id]
            );

            if (userRows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found or is inactive'
                });
            }

            const user = userRows[0];

            // Prevent admin from resetting their own password this way
            if (user_id === adminId) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Administrators cannot reset their own password using this method'
                });
            }

            // Generate temporary password
            const tempPassword = generateRandomPassword();
            const hashedTempPassword = await bcrypt.hash(tempPassword, 12);

            // Update user with temporary password
            await connection.execute(`
                UPDATE users SET 
                    temp_password = ?,
                    must_change_password = TRUE,
                    password_reset_at = CURRENT_TIMESTAMP,
                    password_reset_by = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [hashedTempPassword, adminId, user_id]);

            // Log the password reset action
            console.log(`Password reset by admin ${req.user.username} for user ${user.username} (ID: ${user_id})`);

            connection.release();

            res.json({
                success: true,
                message: 'Password reset successfully',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        name: `${user.first_name} ${user.last_name}`,
                        role: user.role
                    },
                    temporary_password: tempPassword,
                    instructions: 'User must login with this temporary password and will be prompted to create a new password'
                }
            });

        } catch (dbError) {
            connection.release();
            console.error('Database error during password reset:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while resetting password'
            });
        }

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/admin/users - Get all users for management (Admin only)
router.get('/users', Auth.authenticateToken, Auth.requireRole(['admin']), async (req, res) => {
    try {
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            const [users] = await connection.execute(`
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.role,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    u.must_change_password,
                    u.can_student_admission,
                    u.password_reset_at,
                    u.last_login,
                    u.created_at,
                    reset_by.username as reset_by_username
                FROM users u
                LEFT JOIN users reset_by ON u.password_reset_by = reset_by.id
                WHERE u.role IN ('teacher', 'parent')
                ORDER BY u.created_at DESC
            `);

            connection.release();

            const formattedUsers = users.map(user => ({
                ...user,
                name: `${user.first_name} ${user.last_name}`,
                has_temp_password: !!user.must_change_password,
                password_reset_info: user.password_reset_at ? {
                    reset_at: user.password_reset_at,
                    reset_by: user.reset_by_username
                } : null
            }));

            res.json({
                success: true,
                data: formattedUsers
            });

        } catch (dbError) {
            connection.release();
            console.error('Database error fetching users:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while fetching users'
            });
        }

    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/admin/student-admission-access - Grant/revoke student admission permission (Admin only)
router.post('/student-admission-access', Auth.authenticateToken, Auth.requireRole(['admin']), async (req, res) => {
    try {
        const { error, value } = studentAdmissionAccessSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { user_id, enabled } = value;
        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            const [rows] = await connection.execute(
                'SELECT id, username, role FROM users WHERE id = ?',
                [user_id]
            );

            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const target = rows[0];
            if (target.role !== 'teacher') {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Student admission permission can only be set for teacher users'
                });
            }

            await connection.execute(
                'UPDATE users SET can_student_admission = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [enabled, user_id]
            );
            connection.release();

            return res.json({
                success: true,
                message: `Student admission access ${enabled ? 'granted' : 'revoked'} successfully`,
                data: {
                    user_id,
                    can_student_admission: enabled
                }
            });
        } catch (dbError) {
            connection.release();
            throw dbError;
        }
    } catch (error) {
        console.error('Student admission access update error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/admin/toggle-user-status - Toggle user active status (Admin only)
router.post('/toggle-user-status', Auth.authenticateToken, Auth.requireRole(['admin']), async (req, res) => {
    try {
        const { user_id } = req.body;

        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            // Get current status
            const [userRows] = await connection.execute(
                'SELECT id, username, is_active, role FROM users WHERE id = ?',
                [user_id]
            );

            if (userRows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = userRows[0];
            const newStatus = !user.is_active;

            // Update user status
            await connection.execute(
                'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStatus, user_id]
            );

            connection.release();

            console.log(`User ${user.username} status changed to ${newStatus ? 'active' : 'inactive'} by admin ${req.user.username}`);

            res.json({
                success: true,
                message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
                data: {
                    user_id: user_id,
                    username: user.username,
                    is_active: newStatus
                }
            });

        } catch (dbError) {
            connection.release();
            console.error('Database error toggling user status:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while updating user status'
            });
        }

    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /api/admin/delete-user - Completely remove user from system (Admin only)
router.delete('/delete-user', Auth.authenticateToken, Auth.requireRole(['admin']), async (req, res) => {
    try {
        // Validate input
        const { error, value } = deleteUserSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { user_id, confirm } = value;
        const adminId = req.user.id;

        // Prevent admin from deleting themselves
        if (user_id === adminId) {
            return res.status(400).json({
                success: false,
                message: 'Administrators cannot delete their own account'
            });
        }

        const { pool } = require('../config/database');
        const connection = await pool.getConnection();

        try {
            // Check if user exists and get user details
            const [userRows] = await connection.execute(
                'SELECT id, username, email, first_name, last_name, role, is_active FROM users WHERE id = ?',
                [user_id]
            );

            if (userRows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = userRows[0];

            // Prevent deletion of other admin users
            if (user.role === 'admin') {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete administrator accounts'
                });
            }

            // Start transaction for safe deletion
            await connection.beginTransaction();

            try {
                // Delete related data first to maintain referential integrity
                
                // Delete teacher subject assignments
                await connection.execute(
                    'DELETE FROM teacher_subject_assignments WHERE teacher_id = ?',
                    [user_id]
                );

                // Delete any OTP codes
                await connection.execute(
                    'DELETE FROM otp_codes WHERE user_id = ?',
                    [user_id]
                );

                // Note: Add more related table deletions as needed:
                // - Student profiles (if user is a parent)
                // - Attendance records (if user is a teacher)
                // - Grades/assessments (if user is a teacher)
                // - Communications/messages
                // - etc.

                // Delete the user record
                const [deleteResult] = await connection.execute(
                    'DELETE FROM users WHERE id = ?',
                    [user_id]
                );

                if (deleteResult.affectedRows === 0) {
                    throw new Error('Failed to delete user record');
                }

                // Commit the transaction
                await connection.commit();
                connection.release();

                // Log the deletion action
                console.log(`User ${user.username} (ID: ${user_id}) completely deleted by admin ${req.user.username}`);

                res.json({
                    success: true,
                    message: 'User deleted successfully',
                    data: {
                        deleted_user: {
                            id: user.id,
                            username: user.username,
                            email: user.email,
                            name: `${user.first_name} ${user.last_name}`,
                            role: user.role
                        },
                        deleted_by: req.user.username,
                        deleted_at: new Date().toISOString()
                    }
                });

            } catch (transactionError) {
                // Rollback transaction on error
                await connection.rollback();
                connection.release();
                throw transactionError;
            }

        } catch (dbError) {
            if (connection) {
                connection.release();
            }
            console.error('Database error during user deletion:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while deleting user'
            });
        }

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
