const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const axios = require('axios');

const { testConnection, initializeDatabase } = require('./config/database');
const { addFaceAttendanceTables } = require('./migrations/add_face_attendance_tables');
const { errorHandler, notFoundHandler, initializeGlobalHandlers } = require('./middleware/errorHandler');
const { rateLimitHandler, addRetryHeaders, gracefulDegradation } = require('./middleware/rateLimitHandler');
const logger = require('./utils/logger');
const { initializePromotionScheduler } = require('./services/promotionService');
const { initializeFeeReminderScheduler } = require('./services/feeReminderService');
const { initializeParentDailyAttendanceEmailScheduler } = require('./services/parentDailyAttendanceEmailService');
const { isEmailEnabled, hasBrevoConfig } = require('./services/emailService');

// Initialize global error handlers
initializeGlobalHandlers();
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const studentProfilesRoutes = require('./routes/student-profiles');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const classesRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const attendanceFaceRoutes = require('./routes/attendance-face');
const subjectsRoutes = require('./routes/subjects');
const materialsRoutes = require('./routes/materials');
const curriculumRoutes = require('./routes/curriculum');
const gradesRoutes = require('./routes/grades');
const assessmentsRoutes = require('./routes/assessments');
const analyticsRoutes = require('./routes/analytics');
const financeRoutes = require('./routes/finance');
const communicationRoutes = require('./routes/communication');
const teachersRoutes = require('./routes/teachers');
const timetablesRoutes = require('./routes/timetables');
const parentRoutes = require('./routes/parent');
const healthRoutes = require('./routes/health');
const staffAttendanceRoutes = require('./routes/staff-attendance');
const disciplineRoutes = require('./routes/discipline');
const notificationsRoutes = require('./routes/notifications');
const smsRoutes = require('./routes/sms');

const app = express();
const port = process.env.PORT || 5000;
const toOrigin = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
        return new URL(raw).origin;
    } catch (_error) {
        return null;
    }
};

const buildCspConnectSrc = () => {
    const sources = new Set([
        "'self'",
        'http://localhost:5000',
        'http://localhost:3000'
    ]);

    const envOrigins = [
        process.env.FRONTEND_URL,
        process.env.REACT_APP_API_URL,
        process.env.REACT_APP_API_BASE_URL,
        process.env.R2_PUBLIC_BASE_URL
    ];

    envOrigins
        .map(toOrigin)
        .filter(Boolean)
        .forEach((origin) => sources.add(origin));

    const r2AccountId = String(process.env.R2_ACCOUNT_ID || '').trim();
    const r2BucketName = String(process.env.R2_BUCKET_NAME || '').trim();
    if (r2AccountId) {
        sources.add(`https://${r2AccountId}.r2.cloudflarestorage.com`);
        if (r2BucketName) {
            sources.add(`https://${r2BucketName}.${r2AccountId}.r2.cloudflarestorage.com`);
        }
    }

    const r2PublicOrigin = toOrigin(process.env.R2_PUBLIC_BASE_URL);
    if (r2PublicOrigin) {
        sources.add(r2PublicOrigin);
    }

    return Array.from(sources);
};

const cspConnectSrc = buildCspConnectSrc();
const hostedFaceModelsDir = path.join(__dirname, '../client/public/models');
const hostedFaceModelFiles = new Set([
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
]);
const hostedFaceModelsBaseUrl =
    process.env.FACE_MODELS_SOURCE_URL ||
    'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/0.22.2/weights';
const hostedFaceModelFetches = new Map();
const hostedFaceModelExpectedSizes = {
    'tiny_face_detector_model-weights_manifest.json': 2953,
    'tiny_face_detector_model-shard1': 193321,
    'face_landmark_68_model-weights_manifest.json': 7889,
    'face_landmark_68_model-shard1': 356840,
    'face_recognition_model-weights_manifest.json': 18303,
    'face_recognition_model-shard1': 4194304,
    'face_recognition_model-shard2': 2249728
};

const hasValidHostedFaceModelFile = (filePath, fileName) => {
    try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) return false;
        const expectedSize = hostedFaceModelExpectedSizes[fileName];
        if (!expectedSize) return stats.size > 0;
        return stats.size === expectedSize;
    } catch (_error) {
        return false;
    }
};

const ensureHostedFaceModelFile = async (fileName) => {
    const localPath = path.join(hostedFaceModelsDir, fileName);
    if (hasValidHostedFaceModelFile(localPath, fileName)) {
        return localPath;
    }

    if (hostedFaceModelFetches.has(fileName)) {
        return hostedFaceModelFetches.get(fileName);
    }

    const fetchPromise = (async () => {
        fs.mkdirSync(hostedFaceModelsDir, { recursive: true });
        if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
        }

        const remoteUrl = `${hostedFaceModelsBaseUrl.replace(/\/$/, '')}/${fileName}`;
        const response = await axios.get(remoteUrl, {
            responseType: 'arraybuffer',
            timeout: 300000,
            validateStatus: (status) => status >= 200 && status < 300,
        });

        const buffer = Buffer.from(response.data);
        const expectedSize = hostedFaceModelExpectedSizes[fileName];
        if (expectedSize && buffer.length !== expectedSize) {
            throw new Error(`Fetched model file has unexpected size for ${fileName}: expected ${expectedSize}, got ${buffer.length}`);
        }

        const tempPath = `${localPath}.tmp`;
        fs.writeFileSync(tempPath, buffer);
        fs.renameSync(tempPath, localPath);
        return localPath;
    })();

    hostedFaceModelFetches.set(fileName, fetchPromise);

    try {
        return await fetchPromise;
    } finally {
        hostedFaceModelFetches.delete(fileName);
    }
};

const warmHostedFaceModelFiles = async () => {
    for (const fileName of hostedFaceModelFiles) {
        try {
            await ensureHostedFaceModelFile(fileName);
            logger.info(`Hosted face model ready: ${fileName}`);
        } catch (error) {
            logger.warn(`Hosted face model warmup failed for ${fileName}: ${error.message}`);
        }
    }
};

// Trust proxy for proper client IP detection
app.set('trust proxy', 1); // if behind a proxy or for proper IPs in dev

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "https:", "data:"],
            connectSrc: cspConnectSrc,
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"]
        }
    }
}));

// CORS middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 500, // Increased to 500 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// More lenient rate limiting for communication endpoints (real-time notifications)
const communicationLimiter = rateLimit({
    windowMs: (process.env.COMMUNICATION_RATE_LIMIT_WINDOW || 5) * 60 * 1000, // 5 minutes default
    max: process.env.COMMUNICATION_RATE_LIMIT_MAX_REQUESTS || 200, // 200 requests per 5 minutes
    message: {
        success: false,
        message: 'Too many notification requests, please slow down.',
        error: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => {
        // Skip rate limiting for cached responses
        if (res.locals.cacheHit) {
            return true;
        }
        
        // Skip rate limiting for authenticated users (they have per-user limits)
        const path = req.path;
        
        // Always allow unread count checks as they're heavily cached
        if (path.includes('/unread-count')) {
            return true;
        }
        
        return false;
    },
    keyGenerator: (req) => {
        // Use user ID for authenticated requests to allow per-user rate limiting
        return req.user?.id ? `user_${req.user.id}` : req.ip;
    },
    // Add more lenient limits for authenticated users
    skipSuccessfulRequests: false,
    skipFailedRequests: true // Don't count failed requests against the limit
});

// Apply general rate limiting to all API routes except communication
app.use('/api/', (req, res, next) => {
    // Skip rate limiting for communication endpoints - they have their own
    if (req.path.startsWith('/communication/')) {
        return next();
    }
    return generalLimiter(req, res, next);
});

// Add retry-friendly headers and graceful degradation
app.use(addRetryHeaders);
app.use(gracefulDegradation);

// Body parsing middleware - increased limits for video uploads
app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ extended: true, limit: '250mb' }));

// Increase server timeout for file uploads
app.use((req, res, next) => {
    // Set timeout to 10 minutes for file uploads
    if (req.url.includes('/upload')) {
        req.setTimeout(600000); // 10 minutes
        res.setTimeout(600000); // 10 minutes
    }
    next();
});


// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const hostedFaceModelsHandler = async (req, res, next) => {
    const fileName = path.basename(req.path || '').trim();
    if (!hostedFaceModelFiles.has(fileName)) {
        return res.status(404).json({ success: false, message: 'Model file not found' });
    }

    try {
        const localPath = await ensureHostedFaceModelFile(fileName);
        return res.sendFile(localPath);
    } catch (error) {
        logger.error('Failed to fetch hosted face model', {
            fileName,
            message: error.message,
        });
        return res.status(502).json({
            success: false,
            message: 'Failed to fetch face model file',
            file: fileName,
        });
    }
};

app.use('/models', hostedFaceModelsHandler);
app.use('/models-v2', hostedFaceModelsHandler);

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    // Log the request
    logger.apiRequest(req);
    
    // Capture response data when the request finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.apiRequest(req, res, duration);
    });
    
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/student-profiles', studentProfilesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/attendance/face', attendanceFaceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectsRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/communication', communicationLimiter, communicationRoutes);
app.use('/api/teachers', teachersRoutes);
app.use('/api/timetables', timetablesRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/staff-attendance', staffAttendanceRoutes);
app.use('/api/discipline', disciplineRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/sms', smsRoutes);
app.use('/health', healthRoutes);

// Serve static React build files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    
    // Handle React routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        if (!req.url.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../client/build/index.html'));
        }
    });
} else {
    // Development mode - just show a message
    app.get('/', (req, res) => {
            res.json(Object.assign({}, {
            message: 'SMS Backend API is running!',
            frontend: 'Start React frontend with: npm run client',
            endpoints: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register',
                profile: 'GET /api/auth/profile',
                verifyOtp: 'POST /api/auth/verify-otp'
            }
        }));
    });
}

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Handle 404 for all other routes
app.use('*', (req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SMS - Page Not Found</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
                .error { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #e53e3e; margin-bottom: 20px; }
                .available-files { margin-top: 20px; }
                .available-files a { display: block; margin: 5px 0; color: #3182ce; text-decoration: none; }
                .available-files a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <div class="error">
                <h1>404 - Page Not Found</h1>
                <p>The requested page <code>${req.url}</code> was not found.</p>
                <div class="available-files">
                    <h3>Available Pages:</h3>
                    <a href="/">🏠 Home / Dashboard</a>
                    <a href="/Dashboard.Html">📊 Dashboard</a>
                    <a href="/OTP VERIFICATION.Html">🔐 OTP Verification</a>
                </div>
                <div class="available-files">
                    <h3>API Endpoints:</h3>
                    <a href="/api/auth/profile">👤 User Profile (requires auth)</a>
                    <strong>POST endpoints:</strong>
                    <ul style="margin-top: 10px;">
                        <li>/api/auth/login - User login</li>
                        <li>/api/auth/register - User registration</li>
                        <li>/api/auth/verify-otp - OTP verification</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
    `);
});


// Start server function
const startServer = async () => {
    try {
        // Test database connection
        logger.info('🔌 Testing database connection...');
        const dbConnected = await testConnection();
        
        if (dbConnected) {
            // Initialize database schema
            logger.info('📊 Initializing database schema...');
            await initializeDatabase();

            logger.info('🧠 Ensuring face attendance tables exist...');
            await addFaceAttendanceTables();
            
            // Initialize automatic student promotion scheduler
            logger.info('🎓 Initializing student promotion scheduler...');
            initializePromotionScheduler();

            // Initialize fee reminder scheduler (parent targeted notifications)
            logger.info('💳 Initializing fee reminder scheduler...');
            initializeFeeReminderScheduler();

            // Initialize daily attendance email scheduler (parent email digest)
            logger.info('📧 Initializing parent daily attendance email scheduler...');
            initializeParentDailyAttendanceEmailScheduler();
        } else {
            logger.warn('⚠️  Database not available. Some features may not work.');
            logger.warn('   Make sure MySQL is installed and running.');
        }

        // Email delivery diagnostics
        if (!isEmailEnabled()) {
            logger.warn('📧 Email notifications are DISABLED (EMAIL_NOTIFICATIONS_ENABLED=false).');
        } else if (!hasBrevoConfig()) {
            logger.warn('📧 Email notifications enabled but Brevo config is missing.');
            logger.warn('   Set BREVO_API_KEY and BREVO_SENDER_EMAIL in environment variables.');
        } else {
            logger.info('📧 Email notifications enabled (Brevo config detected).');
        }
        
        // Start the server
        const MAX_PORT_ATTEMPTS = 10; // Try up to 10 ports if original is in use
        // On Render/containers we must bind to all interfaces so the platform can detect the open port.
        const host = process.env.HOST || '0.0.0.0';

        const attemptListen = (portToTry) => {
            const server = app.listen(portToTry, host, () => {
                logger.info('\n🚀 UBUNIFU SEC SMS - Node.js Server Started!');
                logger.info('═══════════════════════════════════════════════');
                logger.info(`📍 Server: http://${host}:${portToTry}`);
                logger.info(`📊 Dashboard: http://${host}:${portToTry}/`);
                logger.info(`🔐 OTP Page: http://${host}:${portToTry}/OTP%20VERIFICATION.Html`);
                logger.info('\n🔗 API Endpoints:');
                logger.info(`   POST http://${host}:${portToTry}/api/auth/login`);
                logger.info(`   POST http://${host}:${portToTry}/api/auth/register`);
                logger.info(`   POST http://${host}:${portToTry}/api/auth/verify-otp`);
                logger.info(`   GET  http://${host}:${portToTry}/api/auth/profile`);
                logger.info('\n🌟 Features:');
                logger.info('   ✅ User Authentication with JWT');
                logger.info('   ✅ OTP Two-Factor Authentication');
                logger.info('   ✅ User Registration');
                logger.info('   ✅ Role-based Access Control');
                logger.info('   ✅ Input Validation & Security');
                if (dbConnected) {
                    logger.info('   ✅ Database Integration');
                } else {
                    logger.warn('   ⚠️  Database Offline');
                }
                logger.info('\n💡 Tips:');
                logger.info('   • Use POST requests for API calls');
                logger.info('   • Include "Bearer <token>" in Authorization header for protected routes');
                logger.info('   • OTP codes are displayed in console for development');
                logger.info('\nPress Ctrl+C to stop the server');
                logger.info('═══════════════════════════════════════════════\n');

                // Warm the hosted face model files after startup so users do not
                // wait on the largest shard during the first attendance attempt.
                setImmediate(() => {
                    warmHostedFaceModelFiles().catch((error) => {
                        logger.warn(`Hosted face model warmup task failed: ${error.message}`);
                    });
                });
            });

            server.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    if (portToTry - port < MAX_PORT_ATTEMPTS) {
                        logger.warn(`Port ${portToTry} is already in use. Trying next port...`);
                        attemptListen(portToTry + 1); // Try the next port
                    } else {
                        logger.error(`❌ Failed to start server: All ports from ${port} to ${portToTry} are in use.`);
                        process.exit(1);
                    }
                } else {
                    logger.error('❌ Failed to start server:', err);
                    process.exit(1);
                }
            });

            // Graceful shutdown handling for the active server instance
            process.once('SIGTERM', () => {
                logger.info('SIGTERM received, shutting down gracefully');
                server.close(() => {
                    logger.info('Server closed');
                    process.exit(0);
                });
            });
        };

        attemptListen(port); // Start attempting to listen
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Error handling middleware (must be AFTER all other routes)
app.use(rateLimitHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    logger.info('\n👋 Server shutting down...');
    process.exit(0);
});

// Start the server
startServer();
