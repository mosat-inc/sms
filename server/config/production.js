const path = require('path');

// Production configuration settings
const productionConfig = {
    // Database configuration
    database: {
        connectionLimit: 20,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        timezone: '+00:00'
    },

    // Security configurations
    security: {
        // CORS settings
        cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://your-domain.com'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            maxAge: 86400 // 24 hours
        },
        
        // Rate limiting
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false,
            // Skip successful requests in count
            skip: (req, res) => res.statusCode < 400,
            // Enable if behind reverse proxy
            trustProxy: true
        },

        // File upload limits
        upload: {
            maxFileSize: 50 * 1024 * 1024, // 50MB
            maxFiles: 10,
            allowedTypes: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg',
                'image/png',
                'image/gif',
                'text/plain',
                'text/csv'
            ]
        },

        // JWT settings
        jwt: {
            expiresIn: '8h',
            refreshExpiresIn: '7d',
            algorithm: 'HS256'
        },

        // Helmet security headers
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "https:", "data:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }
    },

    // Performance configurations
    performance: {
        compression: {
            level: 6,
            threshold: 1024,
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return true;
            }
        },

        cache: {
            // Static files cache (in seconds)
            staticFiles: 31536000, // 1 year
            // API response cache
            apiCache: {
                duration: 300, // 5 minutes
                exclude: ['/api/auth/', '/api/attendance/']
            }
        }
    },

    // Monitoring and logging
    monitoring: {
        // Log retention in days
        logRetention: 30,
        
        // Performance monitoring
        performanceTracking: true,
        
        // Error reporting
        errorReporting: {
            enabled: true,
            webhook: process.env.ERROR_WEBHOOK_URL,
            rateLimitErrors: true
        },

        // Health check settings
        healthCheck: {
            interval: 30000, // 30 seconds
            timeout: 5000,   // 5 seconds
            checks: ['database', 'filesystem', 'memory']
        }
    },

    // File storage
    storage: {
        uploadDir: path.join(__dirname, '../uploads'),
        tempDir: path.join(__dirname, '../temp'),
        backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../backups'),
        
        // Clean up temp files older than 1 hour
        cleanupInterval: 3600000,
        maxTempAge: 3600000
    },

    // Email configuration (if using email features)
    email: {
        from: process.env.EMAIL_FROM || 'noreply@schoolsystem.com',
        replyTo: process.env.EMAIL_REPLY_TO,
        
        // SMTP settings
        smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        },
        
        // Email templates
        templates: {
            passwordReset: 'password-reset',
            welcome: 'welcome',
            notification: 'notification'
        }
    },

    // Backup configuration
    backup: {
        enabled: process.env.BACKUP_ENABLED === 'true',
        schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
        retention: parseInt(process.env.BACKUP_RETENTION) || 7, // Keep 7 days
        compression: true,
        
        // Database backup
        database: {
            enabled: true,
            excludeTables: ['sessions', 'logs']
        },
        
        // File backup
        files: {
            enabled: true,
            includeUploads: true,
            excludePatterns: ['*.tmp', '*.log', 'node_modules/**']
        }
    }
};

module.exports = productionConfig;
