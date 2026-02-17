const logger = require('../utils/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode, errorCode = null, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND_ERROR');
    }
}

class DuplicateError extends AppError {
    constructor(resource = 'Resource', field = 'field') {
        super(`${resource} with this ${field} already exists`, 409, 'DUPLICATE_ERROR');
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500, 'DATABASE_ERROR');
    }
}

class FileUploadError extends AppError {
    constructor(message = 'File upload failed') {
        super(message, 400, 'FILE_UPLOAD_ERROR');
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}

// Error type handlers
const handleDatabaseError = (err) => {
    logger.error('Database Error:', {
        message: err.message,
        code: err.code,
        stack: err.stack
    });

    // Handle specific database errors
    if (err.code === 'ER_DUP_ENTRY') {
        const match = err.message.match(/Duplicate entry '(.*)' for key '(.*)'/);
        if (match) {
            return new DuplicateError('Record', match[2]);
        }
        return new DuplicateError();
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return new ValidationError('Referenced record does not exist');
    }

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return new ValidationError('Cannot delete record - it is referenced by other records');
    }

    if (err.code === 'ECONNREFUSED') {
        return new DatabaseError('Database connection refused');
    }

    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        return new DatabaseError('Database access denied');
    }

    return new DatabaseError(err.message);
};

const handleValidationError = (err) => {
    const errors = [];
    
    if (err.details) {
        // Joi validation error
        err.details.forEach(detail => {
            errors.push({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            });
        });
    }

    return new ValidationError('Validation failed', errors);
};

const handleJWTError = (err) => {
    if (err.name === 'JsonWebTokenError') {
        return new AuthenticationError('Invalid token');
    }
    if (err.name === 'TokenExpiredError') {
        return new AuthenticationError('Token expired');
    }
    return new AuthenticationError('Token verification failed');
};

const handleMulterError = (err) => {
    if (err.code === 'LIMIT_FILE_SIZE') {
        return new FileUploadError('File too large');
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
        return new FileUploadError('Too many files');
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return new FileUploadError('Unexpected file field');
    }
    return new FileUploadError(err.message);
};

// Main error handler middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log the original error
    logger.apiError(req, err, err.statusCode || 500);

    // Handle different error types
    if (err.name === 'ValidationError' || err.isJoi) {
        error = handleValidationError(err);
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        error = handleJWTError(err);
    } else if (err.name === 'MulterError') {
        error = handleMulterError(err);
    } else if (err.code && err.code.startsWith('ER_')) {
        error = handleDatabaseError(err);
    } else if (err.errno || err.code === 'ECONNREFUSED') {
        error = handleDatabaseError(err);
    } else if (!err.isOperational) {
        // Programming or unknown errors
        logger.error('Unknown Error:', {
            message: err.message,
            stack: err.stack,
            request: {
                method: req.method,
                url: req.url,
                headers: req.headers,
                body: req.body,
                user: req.user?.id
            }
        });

        // Don't leak error details in production
        if (process.env.NODE_ENV === 'production') {
            error = new AppError('Something went wrong', 500, 'INTERNAL_SERVER_ERROR');
        }
    }

    // Prepare error response
    const response = {
        success: false,
        message: error.message || 'Internal server error',
        errorCode: error.errorCode || 'UNKNOWN_ERROR',
        ...(error.errors && { errors: error.errors }),
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            originalError: err.message
        })
    };

    // Add request context for debugging
    if (process.env.NODE_ENV === 'development') {
        response.requestInfo = {
            method: req.method,
            url: req.originalUrl,
            timestamp: new Date().toISOString(),
            userAgent: req.get('User-Agent')
        };
    }

    // Send error response
    res.status(error.statusCode || 500).json(response);
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.originalUrl}`);
    next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Global uncaught exception handler
const handleUncaughtException = () => {
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught Exception:', {
            message: err.message,
            stack: err.stack
        });
        
        // Graceful shutdown
        process.exit(1);
    });
};

// Global unhandled rejection handler
const handleUnhandledRejection = () => {
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Promise Rejection:', {
            reason: reason,
            promise: promise
        });
        
        // Graceful shutdown
        process.exit(1);
    });
};

// Rate limiting error handler
const handleRateLimit = (req, res, next, options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100, // requests per window
        message = 'Too many requests, please try again later'
    } = options;

    // Simple in-memory rate limiting (use Redis in production)
    const ip = req.ip;
    const now = Date.now();
    
    if (!global.rateLimitStore) {
        global.rateLimitStore = new Map();
    }

    const userRequests = global.rateLimitStore.get(ip) || [];
    const validRequests = userRequests.filter(time => now - time < windowMs);

    if (validRequests.length >= max) {
        const error = new RateLimitError(message);
        return next(error);
    }

    validRequests.push(now);
    global.rateLimitStore.set(ip, validRequests);
    
    next();
};

// Initialize global error handlers
const initializeGlobalHandlers = () => {
    handleUncaughtException();
    handleUnhandledRejection();
};

module.exports = {
    // Error classes
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    DuplicateError,
    DatabaseError,
    FileUploadError,
    RateLimitError,
    
    // Middleware
    errorHandler,
    notFoundHandler,
    asyncHandler,
    handleRateLimit,
    
    // Initialization
    initializeGlobalHandlers
};
