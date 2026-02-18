const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
require('dotenv').config();

class Auth {
    
    // Generate JWT token with school context
    static generateToken(user) {
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            schoolId: user.school_id || null,
            schoolCode: user.school_code || null,
            can_student_admission: !!user.can_student_admission
        };
        
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });
    }
    
    // Verify JWT token
    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }
    
    // Login user
    static async login(emailOrUsername, password) {
        try {
            const connection = await pool.getConnection();
            
            // Check if input is an email (contains @)
            const isEmail = emailOrUsername.includes('@');
            
            let query, params;
            if (isEmail) {
                // If it's an email, search by email primarily
                query = `SELECT u.id, u.username, u.email, u.password, u.temp_password, u.must_change_password, 
                         u.role, u.first_name, u.last_name, u.is_active, u.school_id, s.school_code, u.can_student_admission
                         FROM users u LEFT JOIN schools s ON u.school_id = s.id 
                         WHERE u.email = ? AND u.is_active = 1`;
                params = [emailOrUsername];
            } else {
                // If it's not an email, search by username or email as fallback
                query = `SELECT u.id, u.username, u.email, u.password, u.temp_password, u.must_change_password, 
                         u.role, u.first_name, u.last_name, u.is_active, u.school_id, s.school_code, u.can_student_admission
                         FROM users u LEFT JOIN schools s ON u.school_id = s.id 
                         WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1`;
                params = [emailOrUsername, emailOrUsername];
            }
            
            const [rows] = await connection.execute(query, params);
            
            connection.release();
            
            if (rows.length === 0) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }
            
            const user = rows[0];
            let isValidPassword = false;
            let isUsingTempPassword = false;

            // Check if user has a temporary password and must change it
            if (user.must_change_password && user.temp_password) {
                // Try temporary password first
                isValidPassword = await bcrypt.compare(password, user.temp_password);
                if (isValidPassword) {
                    isUsingTempPassword = true;
                }
            }

            // If not using temp password or temp password failed, try regular password
            if (!isValidPassword) {
                isValidPassword = await bcrypt.compare(password, user.password);
            }
            
            if (!isValidPassword) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // If using temporary password, return special response
            if (isUsingTempPassword) {
                // Remove sensitive fields
                delete user.password;
                delete user.temp_password;
                
                return {
                    success: true,
                    must_change_password: true,
                    user,
                    message: 'Login successful. You must change your password to continue.',
                    token: this.generateToken(user) // Temporary token for password change
                };
            }
            
            // Update last login for regular password
            await this.updateLastLogin(user.id);
            
            // Remove password fields from user object
            delete user.password;
            delete user.temp_password;
            
            return {
                success: true,
                user,
                token: this.generateToken(user)
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'Login failed: ' + error.message
            };
        }
    }
    
    // Register new user
    static async register(userData) {
        try {
            const connection = await pool.getConnection();
            
            // Check if email already exists
            let existingCheckQuery = 'SELECT id FROM users WHERE email = ?';
            let existingCheckParams = [userData.email];
            
            // If username is provided, also check for username uniqueness
            if (userData.username && userData.username.trim() !== '') {
                existingCheckQuery = 'SELECT id FROM users WHERE username = ? OR email = ?';
                existingCheckParams = [userData.username, userData.email];
            }
            
            const [existing] = await connection.execute(existingCheckQuery, existingCheckParams);
            
            if (existing.length > 0) {
                connection.release();
                const message = userData.username && userData.username.trim() !== '' 
                    ? 'Username or email already exists'
                    : 'Email already exists';
                return {
                    success: false,
                    message
                };
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
            
            // Generate username if not provided (use first part of email)
            let finalUsername = userData.username;
            if (!finalUsername || finalUsername.trim() === '') {
                finalUsername = userData.email.split('@')[0];
                
                // Check if generated username is unique, if not, append a number
                let counter = 1;
                let tempUsername = finalUsername;
                while (true) {
                    const [usernameCheck] = await connection.execute(
                        'SELECT id FROM users WHERE username = ?',
                        [tempUsername]
                    );
                    if (usernameCheck.length === 0) {
                        finalUsername = tempUsername;
                        break;
                    }
                    counter++;
                    tempUsername = `${finalUsername}${counter}`;
                }
            }
            
            // Insert new user
            const [result] = await connection.execute(`
            INSERT INTO users (username, email, password, role, first_name, last_name, firstName, lastName, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            finalUsername,
            userData.email,
            hashedPassword,
            userData.role || 'teacher',
            userData.first_name,
            userData.last_name,
            userData.first_name,
            userData.last_name,
            userData.phone
            ]);
            
            // Get the created user (without password)
            const [newUser] = await connection.execute(
                'SELECT id, username, email, role, first_name, last_name, can_student_admission FROM users WHERE id = ?',
                [result.insertId]
            );
            
            connection.release();
            
            const user = newUser[0];
            
            return {
                success: true,
                user,
                token: this.generateToken(user),
                message: 'User registered successfully'
            };
            
        } catch (error) {
            console.error('Registration error details:', {
                message: error.message,
                code: error.code,
                sqlMessage: error.sqlMessage,
                sql: error.sql
            });
            return {
                success: false,
                message: 'Registration failed: ' + error.message
            };
        }
    }
    
    // Generate OTP
    static async generateOTP(userId, type = 'login') {
        try {
            const connection = await pool.getConnection();
            
            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_TIME) || 300) * 1000);
            
            // Delete any existing unused OTP for this user and type
            await connection.execute(
                'DELETE FROM otp_codes WHERE user_id = ? AND type = ? AND used = 0',
                [userId, type]
            );
            
            // Insert new OTP
            await connection.execute(
                'INSERT INTO otp_codes (user_id, code, type, expires_at) VALUES (?, ?, ?, ?)',
                [userId, otp, type, expiresAt]
            );
            
            connection.release();
            
            return {
                success: true,
                otp,
                expires_at: expiresAt
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'Failed to generate OTP: ' + error.message
            };
        }
    }
    
    // Verify OTP
    static async verifyOTP(userId, otp, type = 'login') {
        try {
            const connection = await pool.getConnection();
            
            const [rows] = await connection.execute(
                'SELECT id FROM otp_codes WHERE user_id = ? AND code = ? AND type = ? AND expires_at > NOW() AND used = 0',
                [userId, otp, type]
            );
            
            if (rows.length === 0) {
                connection.release();
                return {
                    success: false,
                    message: 'Invalid or expired OTP'
                };
            }
            
            // Mark OTP as used
            await connection.execute(
                'UPDATE otp_codes SET used = 1 WHERE id = ?',
                [rows[0].id]
            );
            
            connection.release();
            
            return {
                success: true,
                message: 'OTP verified successfully'
            };
            
        } catch (error) {
            return {
                success: false,
                message: 'OTP verification failed: ' + error.message
            };
        }
    }
    
    // Update last login timestamp
    static async updateLastLogin(userId) {
        try {
            const connection = await pool.getConnection();
            await connection.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [userId]
            );
            connection.release();
        } catch (error) {
            console.error('Failed to update last login:', error.message);
        }
    }
    
    // Middleware to verify JWT token
    static authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }
        
        try {
            const decoded = Auth.verifyToken(token);
            req.user = decoded;
            req.tokenExp = decoded.exp; // Include token expiry
            req.token = token; // Include original token
            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    }
    
    // Middleware to check user role
    static requireRole(roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }
            
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
            }
            
            next();
        };
    }
}

module.exports = Auth;
