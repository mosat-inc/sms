const express = require('express');
const Joi = require('joi');
const Auth = require('../utils/auth');
const router = express.Router();

// Helper function to format date for MySQL DATE column
const formatDateForMySQL = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
    return null;
  }
  
  try {
    // Handle both string and Date object inputs
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Convert to MySQL DATE format (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date formatting error:', error);
    return null;
  }
};

// Validation schemas
const loginSchema = Joi.object({
    email: Joi.string().min(3).required().messages({
        'string.empty': 'Email or username is required',
        'string.min': 'Email or username is required',
        'any.required': 'Email or username is required'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
    })
});

const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional().allow('').messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 30 characters'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+')).required().messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
    }),
    first_name: Joi.string().min(2).max(50).required().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name must not exceed 50 characters',
        'any.required': 'First name is required'
    }),
    last_name: Joi.string().min(2).max(50).required().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name must not exceed 50 characters',
        'any.required': 'Last name is required'
    }),
    phone: Joi.string().pattern(new RegExp('^(\\+255|0)[67]\\d{8}$')).required().messages({
        'string.pattern.base': 'Please provide a valid Tanzanian phone number (e.g., +255789123456 or 0789123456)',
        'any.required': 'Phone number is required'
    }),
    role: Joi.string().valid('teacher', 'parent').default('teacher').messages({
        'any.only': 'Role must be either teacher or parent'
    })
});

const otpSchema = Joi.object({
    user_id: Joi.number().integer().positive().required().messages({
        'number.base': 'User ID must be a number',
        'number.integer': 'User ID must be an integer',
        'number.positive': 'User ID must be positive',
        'any.required': 'User ID is required'
    }),
    otp: Joi.string().length(6).pattern(/^\\d+$/).required().messages({
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only numbers',
        'any.required': 'OTP is required'
    })
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { email: emailOrUsername, password } = value;

        // Continue with database authentication

        // Try database authentication
        try {
            const result = await Auth.login(emailOrUsername, password);

            if (result.success) {
                // Check if user must change password (temporary password scenario)
                if (result.must_change_password) {
                    return res.json({
                        success: true,
                        must_change_password: true,
                        message: result.message || 'You must change your password to continue.',
                        data: {
                            user: result.user,
                            token: result.token,
                            redirect_to: '/first-time-password-change'
                        }
                    });
                }
                
                // Generate token for regular login
                const token = Auth.generateToken(result.user);
                
                res.json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        user: result.user,
                        token
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (dbError) {
            console.error('Login database error:', dbError.code || dbError.name, dbError.message || dbError);
            // Database error - return generic error (avoid leaking internals to client)
            res.status(401).json({
                success: false,
                message: 'Invalid credentials or database unavailable.'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        // Validate input
        const { error, value } = registerSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        // Register user
        const result = await Auth.register(value);

        if (result.success) {
            res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    user_id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    role: result.user.role,
                    name: `${result.user.first_name} ${result.user.last_name}`,
                    token: result.token
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        // Validate input
        const { error, value } = otpSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { user_id, otp } = value;

        // Continue with database OTP verification

        // Try database OTP verification
        try {
            const result = await Auth.verifyOTP(user_id, otp, 'login');

            if (result.success) {
                // Get user data and generate final token
                const { pool } = require('../config/database');
                const connection = await pool.getConnection();
                
                const [rows] = await connection.execute(
        'SELECT id, username, email, role, first_name, last_name, can_student_admission FROM users WHERE id = ? AND is_active = 1',
                    [user_id]
                );
                
                connection.release();
                
                if (rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }
                
                const user = rows[0];
                const token = Auth.generateToken(user);
                
                res.json({
                    success: true,
                    message: 'Authentication completed successfully',
                    data: {
                        user,
                        token
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (dbError) {
            // Database error - return error
            res.status(400).json({
                success: false,
                message: 'Invalid OTP or database unavailable'
            });
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const result = await Auth.generateOTP(user_id, 'login');
        
        if (result.success) {
            res.json({
                success: true,
                message: 'OTP sent successfully',
                data: {
                    expires_at: result.expires_at,
                    // In development, we show the OTP. In production, send via SMS/email
                    ...(process.env.NODE_ENV === 'development' && { otp: result.otp })
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/auth/profile
router.get('/profile', Auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Fetch data from database for all users
        
        // For real database users, fetch current data from database
        try {
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            console.log('GET profile: Fetching data for userId:', userId);
            
            const [rows] = await connection.execute(
        'SELECT id, username, email, role, first_name, last_name, phone, address, qualification, experience, department, position, bio, employee_id, specialization, experience_years, joining_date, can_student_admission, is_active, created_at, updated_at FROM users WHERE id = ? AND is_active = 1',
                [userId]
            );
            
            console.log('GET profile: Database returned rows count:', rows.length);
            
            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const user = rows[0];
            
            console.log('GET profile: Raw user data from DB:', {
                id: user.id,
                username: user.username,
                is_active: user.is_active,
                is_active_type: typeof user.is_active
            });
            
            // For teachers, get assignments from relational table instead of JSON fields
            if (user.role === 'teacher') {
                // Get subjects taught by this teacher
                const [subjectsData] = await connection.execute(`
                    SELECT DISTINCT 
                        s.id, s.name, s.code, s.department
                    FROM teacher_subject_assignments tsa
                    INNER JOIN subjects s ON tsa.subject_id = s.id
                    WHERE tsa.teacher_id = ? AND s.is_active = TRUE
                    ORDER BY s.name
                `, [userId]);
                
                // Get classes assigned to this teacher
                const [classesData] = await connection.execute(`
                    SELECT DISTINCT 
                        c.id, c.name, c.level, c.academic_year
                    FROM teacher_subject_assignments tsa
                    INNER JOIN classes c ON tsa.class_id = c.id
                    WHERE tsa.teacher_id = ? AND c.is_active = TRUE
                    ORDER BY c.level, c.name
                `, [userId]);
                
                user.subjects_taught = subjectsData;
                user.classes_assigned = classesData;
            } else {
                // For non-teachers, set empty arrays
                user.subjects_taught = [];
                user.classes_assigned = [];
            }
            
            connection.release();
            
            res.json({
                success: true,
                data: {
                    user: user
                }
            });
            
        } catch (dbError) {
            console.error('Database error during profile fetch:', {
                error: dbError,
                message: dbError.message,
                code: dbError.code
            });
            
            // Fallback to token data if database is unavailable
            res.json({
                success: true,
                data: {
                    user: req.user
                },
                warning: 'Using cached profile data due to database unavailability'
            });
        }
        
    } catch (error) {
        console.error('Profile fetch error:', {
            error: error,
            message: error.message,
            stack: error.stack
        });
        
        // Fallback to token data
        res.json({
            success: true,
            data: {
                user: req.user
            },
            warning: 'Using cached profile data due to server error'
        });
    }
});

// POST /api/auth/login-direct (without OTP)
router.post('/login-direct', async (req, res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { email: emailOrUsername, password } = value;

        // Demo mode when database is not available
        if (emailOrUsername === 'admin@ubunifusec.com' && password === 'admin123') {
            const demoUser = {
                id: 1,
                username: 'admin',
                email: 'admin@ubunifusec.com',
                role: 'admin',
                first_name: 'System',
                last_name: 'Administrator'
            };

            // Generate JWT token for demo user
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(demoUser, process.env.JWT_SECRET || 'demo-secret', {
                expiresIn: '24h'
            });
            
            res.json({
                success: true,
                message: 'Login successful (Demo Mode)',
                data: {
                    user: demoUser,
                    token
                }
            });
            return;
        }

        // Try database authentication
        try {
            const result = await Auth.login(emailOrUsername, password);

            if (result.success) {
                // Generate token directly without OTP
                const token = Auth.generateToken(result.user);
                
                res.json({
                    success: true,
                    message: 'Login successful',
                    data: {
                        user: result.user,
                        token
                    }
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (dbError) {
            // Database error - return generic error for non-demo credentials
            res.status(401).json({
                success: false,
                message: 'Invalid credentials or database unavailable. Try demo credentials: admin@ubunifusec.com/admin123'
            });
        }
    } catch (error) {
        console.error('Direct login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', Auth.authenticateToken, (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', Auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const updateData = req.body;
        
        console.log('Profile update request:', {
            userId: userId,
            updateData: updateData,
            userRole: req.user.role,
            subjects_in_request: updateData.subjects_taught,
            classes_in_request: updateData.classes_assigned
        });
        
        // For demo mode (admin user), just return success with updated data
        if (userId === 1) {
            // Simulate successful update for demo user
            const updatedUser = {
                ...req.user,
                ...updateData,
                id: userId // Keep original ID
            };
            
            return res.json({
                success: true,
                message: 'Profile updated successfully (Demo Mode)',
                data: {
                    user: updatedUser
                }
            });
        }
        
        // For real database users, update the profile
        try {
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            // First, check if the user exists and get current data
            const [currentUserRows] = await connection.execute(
                'SELECT * FROM users WHERE id = ?',
                [userId]
            );
            
            if (currentUserRows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            console.log('Current user data:', {
                id: currentUserRows[0].id,
                username: currentUserRows[0].username,
                role: currentUserRows[0].role
            });
            
            // Build dynamic update query - only include fields that exist in the table
            const allowedFields = [
                'firstName', 'lastName', 'email', 'phone', 'address',
                'qualification', 'experience', 'department', 'position', 'bio',
                'employee_id', 'specialization', 'experience_years', 'joining_date'
            ];

            // Teachers cannot self-assign organizational fields in production.
            if (currentUserRows[0].role === 'teacher') {
                delete updateData.department;
                delete updateData.position;
                delete updateData.subjects_taught;
                delete updateData.classes_assigned;
            }
            
            const updateFields = [];
            const updateValues = [];
            
            // Field name mapping from frontend to database
            const fieldMapping = {
                'first_name': 'firstName',
                'last_name': 'lastName'
            };
            
            allowedFields.forEach(field => {
                // Check if the frontend sent this field with a different name
                const frontendField = Object.keys(fieldMapping).find(key => fieldMapping[key] === field) || field;
                const value = updateData[frontendField] || updateData[field];
                
                if (value !== undefined && value !== null) {
                    // Skip empty string values, especially for date fields
                    if (value === '') {
                        return;
                    }
                    updateFields.push(`${field} = ?`);
                    
                    // Special handling for date fields to format them properly for MySQL
                    if (field === 'joining_date') {
                        updateValues.push(formatDateForMySQL(value));
                    } else {
                        updateValues.push(value);
                    }
                }
            });
            
            // Handle teacher assignments using relational tables (admin-managed only)
            let teacherAssignmentsUpdated = false;
            if (currentUserRows[0].role === 'teacher' &&
                req.user?.role === 'admin' &&
                (updateData.subjects_taught !== undefined || updateData.classes_assigned !== undefined)) {
                console.log('Processing teacher assignments for relational tables');
                console.log('Subjects to assign:', updateData.subjects_taught);
                console.log('Classes to assign:', updateData.classes_assigned);
                
                // Clear existing assignments for this teacher
                await connection.execute(
                    'DELETE FROM teacher_subject_assignments WHERE teacher_id = ?',
                    [userId]
                );
                
                // Insert new assignments if subjects and classes are provided
                if (updateData.subjects_taught && updateData.subjects_taught.length > 0 && 
                    updateData.classes_assigned && updateData.classes_assigned.length > 0) {
                    
                    for (const subject of updateData.subjects_taught) {
                        // Get subject ID by name
                        const [subjectRows] = await connection.execute(
                            'SELECT id FROM subjects WHERE name = ? AND is_active = TRUE',
                            [typeof subject === 'string' ? subject : subject.name]
                        );
                        
                        if (subjectRows.length > 0) {
                            const subjectId = subjectRows[0].id;
                            
                            for (const classInfo of updateData.classes_assigned) {
                                // Get class ID by name (handle both "1A" and "Form 1A" formats)
                                const className = typeof classInfo === 'string' ? classInfo : classInfo.name;
                                const fullClassName = className.startsWith('Form ') ? className : `Form ${className}`;
                                
                                const [classRows] = await connection.execute(
                                    'SELECT id FROM classes WHERE name = ? AND is_active = TRUE',
                                    [fullClassName]
                                );
                                
                                if (classRows.length > 0) {
                                    const classId = classRows[0].id;
                                    
                                    // Insert assignment
                                    await connection.execute(
                                        'INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year, is_primary_teacher) VALUES (?, ?, ?, ?, ?)',
                                        [userId, subjectId, classId, '2024-2025', false]
                                    );
                                }
                            }
                        }
                    }
                }
                
                teacherAssignmentsUpdated = true;
                console.log('Teacher assignments updated in relational tables');
            }
            
            if (updateFields.length === 0) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'No valid fields to update'
                });
            }
            
            updateValues.push(userId);
            
            const updateQuery = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            console.log('Update query:', updateQuery);
            console.log('Update values:', updateValues);
            
            const updateResult = await connection.execute(updateQuery, updateValues);
            console.log('Database update result:', {
                affectedRows: updateResult[0].affectedRows,
                changedRows: updateResult[0].changedRows,
                info: updateResult[0].info
            });
            
            // Get updated user data without JSON columns
            const [userRows] = await connection.execute(
        'SELECT id, username, email, role, first_name, last_name, phone, address, qualification, experience, department, position, bio, employee_id, specialization, experience_years, joining_date, can_student_admission, is_active FROM users WHERE id = ?',
                [userId]
            );
            
            if (userRows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found after update'
                });
            }
            
            const updatedUser = userRows[0];
            
            // For teachers, get assignments from relational tables
            if (updatedUser.role === 'teacher') {
                console.log('Fetching teacher assignments from relational tables...');
                
                // Get subjects taught by this teacher
                const [subjectsData] = await connection.execute(`
                    SELECT DISTINCT 
                        s.id, s.name, s.code, s.department
                    FROM teacher_subject_assignments tsa
                    INNER JOIN subjects s ON tsa.subject_id = s.id
                    WHERE tsa.teacher_id = ? AND s.is_active = TRUE
                    ORDER BY s.name
                `, [userId]);
                
                // Get classes assigned to this teacher
                const [classesData] = await connection.execute(`
                    SELECT DISTINCT 
                        c.id, c.name, c.level, c.academic_year
                    FROM teacher_subject_assignments tsa
                    INNER JOIN classes c ON tsa.class_id = c.id
                    WHERE tsa.teacher_id = ? AND c.is_active = TRUE
                    ORDER BY c.level, c.name
                `, [userId]);
                
                updatedUser.subjects_taught = subjectsData;
                updatedUser.classes_assigned = classesData;
                
                console.log('Teacher assignments retrieved:', {
                    subjects_count: subjectsData.length,
                    classes_count: classesData.length,
                    subjects: subjectsData.map(s => s.name),
                    classes: classesData.map(c => c.name)
                });
            } else {
                // For non-teachers, set empty arrays
                updatedUser.subjects_taught = [];
                updatedUser.classes_assigned = [];
            }
            
            connection.release();
            
            console.log('Profile updated successfully for user:', userId);
            console.log('Updated user data being returned:', {
                id: updatedUser.id,
                subjects_taught: updatedUser.subjects_taught,
                classes_assigned: updatedUser.classes_assigned
            });
            
            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: {
                    user: updatedUser
                }
            });
            
        } catch (dbError) {
            console.error('Database error during profile update:', {
                error: dbError,
                message: dbError.message,
                code: dbError.code,
                sqlMessage: dbError.sqlMessage,
                sql: dbError.sql
            });
            
            res.status(500).json({
                success: false,
                message: `Database error occurred: ${dbError.message}`,
                error_code: dbError.code || 'UNKNOWN_DB_ERROR'
            });
        }
        
    } catch (error) {
        console.error('Profile update error:', {
            error: error,
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error_details: error.message
        });
    }
});

// PUT /api/auth/change-password - Change user password (requires current password)
router.put('/change-password', Auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { current_password, new_password, confirm_password } = req.body;
        
        // Validation
        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password, new password, and confirmation are all required'
            });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation do not match'
            });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        if (!passwordRegex.test(new_password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }
        
        // For demo mode (admin user), just return success
        if (userId === 1) {
            return res.json({
                success: true,
                message: 'Password changed successfully (Demo Mode)'
            });
        }
        
        // For real database users, change the password
        try {
            const bcrypt = require('bcryptjs');
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            // Get current user data
            const [rows] = await connection.execute(
                'SELECT password FROM users WHERE id = ?',
                [userId]
            );
            
            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Verify current password
            const isValidPassword = await bcrypt.compare(current_password, rows[0].password);
            if (!isValidPassword) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 12);
            
            // Update password
            await connection.execute(
                'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [hashedNewPassword, userId]
            );
            
            connection.release();
            
            res.json({
                success: true,
                message: 'Password changed successfully'
            });
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred'
            });
        }
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /api/auth/validate-token
router.get('/validate-token', Auth.authenticateToken, async (req, res) => {
    try {
        // If the token is valid and we reach here, return success
        res.json({
            success: true,
            message: 'Token is valid',
            data: {
                user: req.user,
                expires_at: req.tokenExp
            }
        });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
});

// POST /api/auth/extend-session
router.post('/extend-session', Auth.authenticateToken, async (req, res) => {
    try {
        // Generate a new token with extended expiration
        const newToken = Auth.generateToken(req.user);
        
        res.json({
            success: true,
            message: 'Session extended successfully',
            data: {
                token: newToken,
                user: req.user
            }
        });
    } catch (error) {
        console.error('Session extension error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to extend session'
        });
    }
});

// PUT /api/auth/first-password-change - First time password change for users with temporary passwords
router.put('/first-password-change', Auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { new_password, confirm_password } = req.body;
        
        // Validation - no current/temp password required for first-time change
        if (!new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation are required'
            });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation do not match'
            });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        if (!passwordRegex.test(new_password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }
        
        try {
            const bcrypt = require('bcryptjs');
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            // Get current user data to verify they have a temporary password
            const [rows] = await connection.execute(
                'SELECT id, username, must_change_password FROM users WHERE id = ?',
                [userId]
            );
            
            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const user = rows[0];
            
            // Check if user actually needs to change password
            if (!user.must_change_password) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'No password change required for this user'
                });
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 12);
            
            // Update user with new password and clear temp password fields
            await connection.execute(`
                UPDATE users SET 
                    password = ?,
                    temp_password = NULL,
                    must_change_password = FALSE,
                    password_reset_at = NULL,
                    password_reset_by = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [hashedNewPassword, userId]);
            
            connection.release();
            
            console.log(`User ${user.username} successfully set their first permanent password`);
            
            res.json({
                success: true,
                message: 'Password set successfully! You can now login with your new password.'
            });
            
        } catch (dbError) {
            console.error('Database error during first password change:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while setting password'
            });
        }
        
    } catch (error) {
        console.error('First password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/auth/change-temp-password - Change temporary password to permanent one (legacy route)
router.put('/change-temp-password', Auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { temp_password, new_password, confirm_password } = req.body;
        
        // Validation
        if (!temp_password || !new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Temporary password, new password, and confirmation are required'
            });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation do not match'
            });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        if (!passwordRegex.test(new_password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }
        
        // For demo mode (admin user), just return success
        if (userId === 1) {
            return res.json({
                success: true,
                message: 'Password changed successfully (Demo Mode)'
            });
        }
        
        try {
            const bcrypt = require('bcryptjs');
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            // Get current user data including temp password
            const [rows] = await connection.execute(
                'SELECT id, username, temp_password, must_change_password FROM users WHERE id = ?',
                [userId]
            );
            
            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const user = rows[0];
            
            // Check if user actually has a temporary password
            if (!user.must_change_password || !user.temp_password) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'No temporary password found for this user'
                });
            }
            
            // Verify temporary password
            const isValidTempPassword = await bcrypt.compare(temp_password, user.temp_password);
            if (!isValidTempPassword) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid temporary password'
                });
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 12);
            
            // Update user with new password and clear temp password fields
            await connection.execute(`
                UPDATE users SET 
                    password = ?,
                    temp_password = NULL,
                    must_change_password = FALSE,
                    password_reset_at = NULL,
                    password_reset_by = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [hashedNewPassword, userId]);
            
            connection.release();
            
            console.log(`User ${user.username} successfully changed password from temporary password`);
            
            res.json({
                success: true,
                message: 'Password changed successfully! You can now login with your new password.'
            });
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while changing password'
            });
        }
        
    } catch (error) {
        console.error('Temp password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /api/auth/change-temp-password - Change temporary password to permanent one
router.put('/change-temp-password', Auth.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { temp_password, new_password, confirm_password } = req.body;
        
        // Validation
        if (!temp_password || !new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'Temporary password, new password, and confirmation are required'
            });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirmation do not match'
            });
        }
        
        if (new_password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }
        
        // Password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        if (!passwordRegex.test(new_password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            });
        }
        
        try {
            const bcrypt = require('bcryptjs');
            const { pool } = require('../config/database');
            const connection = await pool.getConnection();
            
            // Get current user data including temp password
            const [rows] = await connection.execute(
                'SELECT id, username, temp_password, must_change_password FROM users WHERE id = ?',
                [userId]
            );
            
            if (rows.length === 0) {
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            const user = rows[0];
            
            // Check if user actually has a temporary password
            if (!user.must_change_password || !user.temp_password) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'No temporary password found for this user'
                });
            }
            
            // Verify temporary password
            const isValidTempPassword = await bcrypt.compare(temp_password, user.temp_password);
            if (!isValidTempPassword) {
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid temporary password'
                });
            }
            
            // Hash new password
            const hashedNewPassword = await bcrypt.hash(new_password, 12);
            
            // Update user with new password and clear temp password fields
            await connection.execute(`
                UPDATE users SET 
                    password = ?,
                    temp_password = NULL,
                    must_change_password = FALSE,
                    password_reset_at = NULL,
                    password_reset_by = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [hashedNewPassword, userId]);
            
            connection.release();
            
            console.log(`User ${user.username} successfully changed password from temporary password`);
            
            res.json({
                success: true,
                message: 'Password changed successfully! You can now login with your new password.'
            });
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            res.status(500).json({
                success: false,
                message: 'Database error occurred while changing password'
            });
        }
        
    } catch (error) {
        console.error('Temp password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /api/auth/logout
router.post('/logout', Auth.authenticateToken, async (req, res) => {
    try {
        // In a more sophisticated system, you might:
        // 1. Add the token to a blacklist
        // 2. Update a last_logout timestamp in the database
        // 3. Clear any server-side session data
        
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

module.exports = router;
