const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `[${timestamp}] ${level}: ${message} ${metaStr}`;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'sms-backend' },
    transports: [
        // Error logs file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Combined logs file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        }),

        // API access logs
        new winston.transports.File({
            filename: path.join(logsDir, 'access.log'),
            level: 'http',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Add console transport for production with limited output
if (process.env.NODE_ENV === 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple()
        ),
        level: 'warn' // Only show warnings and errors in production console
    }));
}

// Custom log levels for different operations
logger.addLevel = (level, priority) => {
    winston.addColors({ [level]: 'magenta' });
    return logger;
};

// Helper methods for common logging scenarios
logger.apiRequest = (req, res = null, duration = null) => {
    const logData = {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    };
    
    if (res && res.statusCode) {
        logData.statusCode = res.statusCode;
    }
    
    if (duration) {
        logData.duration = `${duration}ms`;
    }
    
    logger.http('API Request', logData);
};

logger.apiError = (req, error, statusCode = 500) => {
    logger.error('API Error', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id,
        error: error.message,
        stack: error.stack,
        statusCode,
        timestamp: new Date().toISOString()
    });
};

logger.dbOperation = (operation, table, userId, data = {}) => {
    logger.info('Database Operation', {
        operation,
        table,
        userId,
        data,
        timestamp: new Date().toISOString()
    });
};

logger.fileOperation = (operation, filePath, userId, metadata = {}) => {
    logger.info('File Operation', {
        operation,
        filePath,
        userId,
        metadata,
        timestamp: new Date().toISOString()
    });
};

logger.authEvent = (event, userId, ip, details = {}) => {
    logger.warn('Authentication Event', {
        event,
        userId,
        ip,
        details,
        timestamp: new Date().toISOString()
    });
};

logger.securityAlert = (alert, details, req = {}) => {
    logger.error('Security Alert', {
        alert,
        details,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get?.('User-Agent'),
        userId: req.user?.id,
        timestamp: new Date().toISOString()
    });
};

// Stream for morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    }
};

module.exports = logger;
