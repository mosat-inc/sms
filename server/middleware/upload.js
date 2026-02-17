const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// Define upload directories
const uploadDirs = {
    materials: 'uploads/materials',
    documents: 'uploads/documents',
    temp: 'uploads/temp'
};

// Create upload directories
Object.values(uploadDirs).forEach(ensureDirectoryExists);

// File type configurations
const fileTypes = {
    materials: {
        allowed: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv', '.m4v'],
        maxSize: 200 * 1024 * 1024, // 200MB for video files
        mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'video/mp4',
            'video/x-msvideo',
            'video/quicktime',
            'video/x-ms-wmv',
            'video/x-flv',
            'video/webm',
            'video/x-matroska',
            'video/x-m4v'
        ]
    },
    documents: {
        allowed: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
        maxSize: 10 * 1024 * 1024, // 10MB
        mimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
    }
};

// Generate unique filename
const generateFileName = (originalname) => {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(6).toString('hex');
    const extension = path.extname(originalname).toLowerCase();
    const baseName = path.basename(originalname, extension)
        .replace(/[^a-zA-Z0-9\-_]/g, '_')
        .substring(0, 50);
    
    return `${timestamp}_${randomString}_${baseName}${extension}`;
};

// Storage configuration for materials
const materialsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), uploadDirs.materials);
        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const fileName = generateFileName(file.originalname);
        cb(null, fileName);
    }
});

// Storage configuration for documents
const documentsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), uploadDirs.documents);
        ensureDirectoryExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const fileName = generateFileName(file.originalname);
        cb(null, fileName);
    }
});

// File filter function
const createFileFilter = (type) => {
    return (req, file, cb) => {
        const config = fileTypes[type];
        const extension = path.extname(file.originalname).toLowerCase();
        
        // Check file extension
        if (!config.allowed.includes(extension)) {
            const error = new Error(`Invalid file type. Allowed types: ${config.allowed.join(', ')}`);
            error.code = 'INVALID_FILE_TYPE';
            return cb(error, false);
        }
        
        // Check MIME type
        if (!config.mimeTypes.includes(file.mimetype)) {
            const error = new Error(`Invalid MIME type. File type not allowed.`);
            error.code = 'INVALID_MIME_TYPE';
            return cb(error, false);
        }
        
        cb(null, true);
    };
};

// Create multer instances
const uploadMaterials = multer({
    storage: materialsStorage,
    fileFilter: createFileFilter('materials'),
    limits: {
        fileSize: fileTypes.materials.maxSize,
        files: 10 // Maximum 10 files per request
    }
});

const uploadDocuments = multer({
    storage: documentsStorage,
    fileFilter: createFileFilter('documents'),
    limits: {
        fileSize: fileTypes.documents.maxSize,
        files: 5 // Maximum 5 files per request
    }
});

// Error handler middleware
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Please choose a smaller file.',
                error: 'FILE_TOO_LARGE'
            });
        }
        
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Please select fewer files.',
                error: 'TOO_MANY_FILES'
            });
        }
        
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected field name for file upload.',
                error: 'UNEXPECTED_FIELD'
            });
        }
    }
    
    if (error.code === 'INVALID_FILE_TYPE' || error.code === 'INVALID_MIME_TYPE') {
        return res.status(400).json({
            success: false,
            message: error.message,
            error: error.code
        });
    }
    
    // Generic upload error
    return res.status(500).json({
        success: false,
        message: 'File upload failed. Please try again.',
        error: 'UPLOAD_FAILED'
    });
};

// Utility function to delete file synchronously (for immediate cleanup)
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
    } catch (error) {
        console.error('Error deleting file:', error);
    }
    return false;
};

// Utility function to delete file asynchronously (safer for large files)
const deleteFileAsync = async (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
            return true;
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
    return false;
};

// Utility function to get file info
const getFileInfo = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
        };
    } catch (error) {
        return { exists: false };
    }
};

// Security middleware to scan uploaded files
const scanUploadedFile = async (req, res, next) => {
    try {
        if (req.file || req.files) {
            const files = req.files || [req.file];
            
            for (const file of files) {
                // Basic security checks
                const filePath = file.path;
                const fileBuffer = fs.readFileSync(filePath);
                
                // Check for malicious patterns (basic implementation)
                const suspiciousPatterns = [
                    /<script/i,
                    /javascript:/i,
                    /vbscript:/i,
                    /on\w+=/i
                ];
                
                const fileContent = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 1024));
                
                for (const pattern of suspiciousPatterns) {
                    if (pattern.test(fileContent)) {
                        // Delete the uploaded file
                        deleteFile(filePath);
                        
                        return res.status(400).json({
                            success: false,
                            message: 'File contains potentially malicious content.',
                            error: 'MALICIOUS_CONTENT'
                        });
                    }
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('File scan error:', error);
        next();
    }
};

// Clean up old temporary files (run periodically)
const cleanupTempFiles = () => {
    const tempDir = path.join(process.cwd(), uploadDirs.temp);
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    try {
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtime.getTime() < oneDayAgo) {
                    deleteFile(filePath);
                }
            });
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

// Run cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

module.exports = {
    uploadMaterials,
    uploadDocuments,
    handleUploadError,
    scanUploadedFile,
    deleteFile,
    deleteFileAsync,
    getFileInfo,
    uploadDirs,
    fileTypes
};
