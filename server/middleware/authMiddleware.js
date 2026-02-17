/**
 * Authentication Middleware
 * Validates JWT tokens and attaches user context to requests
 */

const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { promisify } = require('util');
const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Authenticate user from JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

    // Get user from database
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.first_name,
        u.last_name,
        u.is_active
      FROM users u
      WHERE u.id = ? AND u.is_active = 1
    `;

    const users = await query(userQuery, [decoded.id]);

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    const user = users[0];

    // Attach user info to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication
 * Doesn't fail if no token, but extracts user if present
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user context
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const userQuery = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.role,
          u.first_name,
          u.last_name
        FROM users u
        WHERE u.id = ? AND u.is_active = 1
      `;

      const users = await query(userQuery, [decoded.id]);

      if (users && users.length > 0) {
        const user = users[0];
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name
        };
      }
    } catch (error) {
      // Token invalid or expired, continue without user context
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next();
  }
};

/**
 * Require specific role
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required_role: allowedRoles,
        current_role: req.user.role
      });
    }

    next();
  };
};

/**
 * Require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin,
  // Backward compatibility aliases
  requireSchoolAdmin: (req, res, next) => requireAdmin(req, res, next)
};
