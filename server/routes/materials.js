const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../utils/auth');
const { validate, schemas, validateFileUpload } = require('../middleware/validation');
const { asyncHandler, NotFoundError, AuthorizationError, FileUploadError } = require('../middleware/errorHandler');
const { 
    uploadMaterials, 
    handleUploadError, 
    scanUploadedFile,
    deleteFile,
    deleteFileAsync,
    getFileInfo,
    uploadDirs
} = require('../middleware/upload');
const path = require('path');
const fs = require('fs');

// Helper function to validate query parameters
const isValidParam = (param) => {
    return param !== null && param !== undefined && param !== 'undefined' && param !== '';
};

const normalizeMaterialTags = (rawTags) => {
    if (!rawTags) {
        return [];
    }

    if (Array.isArray(rawTags)) {
        return rawTags.map(tag => String(tag).trim()).filter(Boolean);
    }

    if (typeof rawTags === 'object') {
        return Object.values(rawTags).map(tag => String(tag).trim()).filter(Boolean);
    }

    if (typeof rawTags === 'string') {
        try {
            const parsed = JSON.parse(rawTags);
            if (Array.isArray(parsed)) {
                return parsed.map(tag => String(tag).trim()).filter(Boolean);
            }
            if (parsed && typeof parsed === 'object') {
                return Object.values(parsed).map(tag => String(tag).trim()).filter(Boolean);
            }
        } catch (error) {
            return rawTags
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean);
        }
    }

    return [];
};

const getMaterialStorageStatus = (filePath) => {
    const fileInfo = getFileInfo(filePath);
    return {
        exists: fileInfo.exists,
        size: fileInfo.size || 0
    };
};

// Get teacher's materials with filtering and pagination
router.get('/my-materials', 
    authenticateToken,
    validate(schemas.material.getMaterials, 'query'),
    asyncHandler(async (req, res) => {
    try {
        const teacherId = req.user.id;
        const {
            subject_id,
            category,
            class_id,
            search = '',
            limit = 50,
            offset = 0
        } = req.query;
        
        console.log('Fetching materials for teacher:', teacherId);

        let classLevelFilter = null;
        if (isValidParam(class_id)) {
            const [classRows] = await pool.query(
                'SELECT level FROM classes WHERE id = ? LIMIT 1',
                [Number(class_id)]
            );
            classLevelFilter = classRows.length > 0 ? classRows[0].level : null;
        }
        
        // Build query
        let query = `
            SELECT tm.*, s.name as subject_name, s.code as subject_code, c.class_name
            FROM teaching_materials tm
            LEFT JOIN subjects s ON tm.subject_id = s.id
            LEFT JOIN (
                SELECT level, MIN(name) as class_name
                FROM classes
                GROUP BY level
            ) c ON tm.class_level = c.level
            WHERE tm.teacher_id = ?
        `;
        const params = [teacherId];
        
        if (isValidParam(subject_id)) {
            query += ` AND tm.subject_id = ?`;
            params.push(Number(subject_id));
        }
        
        if (isValidParam(category)) {
            query += ` AND tm.category = ?`;
            params.push(category);
        }
        
        if (classLevelFilter !== null) {
            query += ` AND tm.class_level = ?`;
            params.push(classLevelFilter);
        }
        
        if (isValidParam(search)) {
            query += ` AND (tm.title LIKE ? OR tm.original_name LIKE ? OR tm.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        query += ` ORDER BY tm.created_at DESC LIMIT ? OFFSET ?`;
        
        // Ensure numeric parameters are properly formatted
        const limitNum = Number(limit) || 50;
        const offsetNum = Number(offset) || 0;
        params.push(limitNum, offsetNum);
        
        
        // Try using query method instead of execute for compatibility
        const [materials] = await pool.query(query, params);
        
        // Get total count
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM teaching_materials tm
            WHERE tm.teacher_id = ?
        `;
        const countParams = [teacherId];
        
        if (isValidParam(subject_id)) {
            countQuery += ` AND tm.subject_id = ?`;
            countParams.push(Number(subject_id));
        }
        
        if (isValidParam(category)) {
            countQuery += ` AND tm.category = ?`;
            countParams.push(category);
        }
        
        if (classLevelFilter !== null) {
            countQuery += ` AND tm.class_level = ?`;
            countParams.push(classLevelFilter);
        }
        
        if (isValidParam(search)) {
            countQuery += ` AND (tm.title LIKE ? OR tm.original_name LIKE ? OR tm.description LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        
        const [countResult] = await pool.query(countQuery, countParams);
        const total = countResult[0].total;

        // Transform data for frontend
        const transformedMaterials = materials.map(material => {
            const storage = getMaterialStorageStatus(material.file_path);
            return {
            id: material.id,
            title: material.title,
            description: material.description,
            fileName: material.original_name,
            fileType: material.file_type,
            fileSize: material.file_size,
            mimeType: material.mime_type,
            category: material.category,
            classLevel: material.class_level,
            subject: material.subject_name || 'No Subject',
            subjectCode: material.subject_code,
            isPublic: material.is_public,
            downloadCount: material.download_count || material.total_downloads || 0,
            uploadDate: material.created_at,
            tags: normalizeMaterialTags(material.tags),
            fileAvailable: storage.exists
            };
        });

        res.json({
            success: true,
            data: transformedMaterials,
            pagination: {
                total: total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: total > parseInt(offset) + parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching materials:', error);
        throw error;
    }
}));

// Upload new materials
router.post('/upload', authenticateToken, uploadMaterials.array('materials', 10), scanUploadedFile, async (req, res) => {
    console.log('=== MATERIALS UPLOAD REQUEST START ===');
    console.log('Request timestamp:', new Date().toISOString());
    console.log('Teacher ID:', req.user?.id);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body (sanitized):', {
        subject_id: req.body.subject_id,
        category: req.body.category,
        class_level: req.body.class_level,
        class_id: req.body.class_id,
        is_public: req.body.is_public,
        tags: req.body.tags
    });
    console.log('Files received by multer:', req.files?.length || 0);
    
    // Log the raw multer files array
    if (req.files) {
        console.log('📁 RAW MULTER FILES ANALYSIS:');
        console.log('Total files from multer:', req.files.length);
        
        // Check if multer is somehow creating duplicate file objects
        const fileSignatures = req.files.map(f => `${f.originalname}_${f.size}_${f.mimetype}`);
        const uniqueSignatures = [...new Set(fileSignatures)];
        
        if (fileSignatures.length !== uniqueSignatures.length) {
            console.error('❌ MULTER DUPLICATE FILES DETECTED!');
            console.log('File signatures:', fileSignatures);
            console.log('Unique signatures:', uniqueSignatures);
        }
        
        req.files.forEach((file, index) => {
            console.log(`File ${index + 1}:`, {
                originalname: file.originalname,
                filename: file.filename,
                size: file.size,
                mimetype: file.mimetype,
                path: file.path,
                fieldname: file.fieldname,
                encoding: file.encoding,
                fileExists: require('fs').existsSync(file.path)
            });
        });
        
        // Check for potential duplicates based on name, size, and content
        const fileHashes = new Map();
        req.files.forEach((file, index) => {
            const fileKey = `${file.originalname}_${file.size}`;
            if (fileHashes.has(fileKey)) {
                console.warn(`⚠️ Potential duplicate file detected: File ${index + 1} (${file.originalname}) appears similar to a previous file`);
            } else {
                fileHashes.set(fileKey, index + 1);
            }
        });
    }
    console.log('=== END REQUEST DETAILS ===');
    
    try {
        const teacherId = req.user.id;
        const { subject_id, category = 'teaching_material', class_level, class_id, is_public = false, tags } = req.body;

        if (!req.files || req.files.length === 0) {
            console.log('❌ No files in request');
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }

        let class_level_value = class_level;
        
        // If class_id is provided, convert it to class_level
        if (isValidParam(class_id) && !isValidParam(class_level)) {
            try {
                const [classResult] = await pool.query(
                    'SELECT level FROM classes WHERE id = ?',
                    [Number(class_id)]
                );
                if (classResult.length > 0) {
                    class_level_value = classResult[0].level;
                }
            } catch (error) {
                console.error('Error fetching class level:', error);
            }
        }
        
        const uploadedMaterials = [];
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();
            
            const filesToProcess = req.files || [];
            console.log(`📁 Processing ${filesToProcess.length} files for database insertion`);
            
            // Prevent duplicate processing - check for identical files
            const uniqueFiles = [];
            const seenFiles = new Set();
            
            for (const file of filesToProcess) {
                const fileKey = `${file.originalname}_${file.size}_${file.mimetype}`;
                if (!seenFiles.has(fileKey)) {
                    seenFiles.add(fileKey);
                    uniqueFiles.push(file);
                } else {
                    console.warn(`⚠️ Duplicate file detected and skipped: ${file.originalname}`);
                    // Delete the duplicate file from disk
                    deleteFile(file.path);
                }
            }
            
            console.log(`📋 Unique files to process: ${uniqueFiles.length}`);

            for (const [fileIndex, file] of uniqueFiles.entries()) {
                console.log(`\n🔄 Processing file ${fileIndex + 1}/${uniqueFiles.length}:`, file.originalname);
                
                const {
                    originalname,
                    filename,
                    path: filePath,
                    mimetype,
                    size
                } = file;

                // Get file extension
                const fileExtension = path.extname(originalname).toLowerCase();
                console.log('File extension:', fileExtension);
                
                // Create title from filename if not provided
                const title = req.body[`title_${file.fieldname}`] || 
                             path.basename(originalname, fileExtension);
                console.log('Generated title:', title);
                
                const description = req.body[`description_${file.fieldname}`] || null;
                console.log('Description:', description);

                console.log('⚡ Checking for existing file...');
                // Check if this exact file already exists for this teacher
                const [existingFiles] = await connection.execute(`
                    SELECT id, file_path FROM teaching_materials 
                    WHERE teacher_id = ? AND original_name = ? AND file_size = ? AND mime_type = ?
                    ORDER BY id DESC
                `, [teacherId, originalname, size, mimetype]);
                
                if (existingFiles.length > 0) {
                    const existingMaterial = existingFiles[0];
                    const existingStorage = getMaterialStorageStatus(existingMaterial.file_path);

                    if (!existingStorage.exists) {
                        console.warn(`⚠️ Existing material file missing on disk. Replacing stored file for material ${existingMaterial.id}`);

                        await connection.execute(`
                            UPDATE teaching_materials
                            SET subject_id = ?, title = ?, description = ?, file_name = ?, original_name = ?,
                                file_path = ?, file_type = ?, file_size = ?, mime_type = ?, category = ?,
                                class_level = ?, is_public = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                            WHERE id = ?
                        `, [
                            subject_id || null,
                            title,
                            description,
                            filename,
                            originalname,
                            filePath,
                            fileExtension,
                            size,
                            mimetype,
                            category,
                            class_level_value || null,
                            is_public === 'true' || is_public === true,
                            tags ? JSON.stringify(tags.split(',')) : null,
                            existingMaterial.id
                        ]);

                        uploadedMaterials.push({
                            id: existingMaterial.id,
                            title,
                            fileName: originalname,
                            fileSize: size,
                            category
                        });

                        continue;
                    }

                    console.warn(`⚠️ Skipping duplicate file: ${originalname} already exists for teacher ${teacherId}`);
                    deleteFile(filePath);
                    continue;
                }
                
                console.log('⚡ Inserting into database...');
                // Insert into database
                const [result] = await connection.execute(`
                    INSERT INTO teaching_materials 
                    (teacher_id, subject_id, title, description, file_name, original_name, 
                     file_path, file_type, file_size, mime_type, category, class_level, 
                     is_public, tags)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    teacherId,
                    subject_id || null,
                    title,
                    description,
                    filename,
                    originalname,
                    filePath,
                    fileExtension,
                    size,
                    mimetype,
                    category,
                    class_level_value || null,
                    is_public === 'true' || is_public === true,
                    tags ? JSON.stringify(tags.split(',')) : null
                ]);
                
                console.log('✅ Database insert successful! Insert ID:', result.insertId);

                uploadedMaterials.push({
                    id: result.insertId,
                    title,
                    fileName: originalname,
                    fileSize: size,
                    category
                });
                
                console.log(`📝 Added to uploadedMaterials array (total: ${uploadedMaterials.length})`);
            }
            
            console.log('\n📊 Final uploadedMaterials count:', uploadedMaterials.length);
            console.log('📊 Unique files processed:', uniqueFiles.length);
            console.log('📊 Database records created:', uploadedMaterials.length);

            await connection.commit();
            connection.release();
            
            console.log('\n🎆 Transaction committed successfully');
            console.log('Sending response with:', uploadedMaterials.length, 'materials');
            console.log('Response data:', uploadedMaterials.map(m => ({ id: m.id, fileName: m.fileName })));
            console.log('=== MATERIALS UPLOAD REQUEST END ===\n');

            const actualCount = uploadedMaterials.length;
            const skippedCount = uniqueFiles.length - actualCount;
            let message = `${actualCount} material(s) uploaded successfully`;
            if (skippedCount > 0) {
                message += ` (${skippedCount} duplicate(s) skipped)`;
            }
            
            res.status(201).json({
                success: true,
                message: message,
                data: uploadedMaterials,
                stats: {
                    uploaded: actualCount,
                    skipped: skippedCount,
                    total_processed: uniqueFiles.length
                }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();

            // Clean up uploaded files on error
            for (const file of req.files) {
                deleteFile(file.path);
            }

            throw error;
        }

    } catch (error) {
        console.error('Error uploading materials:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload materials',
            error: error.message
        });
    }
}, handleUploadError);

// Download material
router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.id;
        const userId = req.user.id;

        // Get material details
        const [materials] = await pool.execute(`
            SELECT tm.*, u.first_name, u.last_name 
            FROM teaching_materials tm
            INNER JOIN users u ON tm.teacher_id = u.id
            WHERE tm.id = ?
        `, [materialId]);

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        // Check access permissions
        if (material.teacher_id !== userId && !material.is_public && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to download this material.'
            });
        }

        // Check if file exists
        const fileInfo = getFileInfo(material.file_path);
        if (!fileInfo.exists) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Log the download
        try {
            await pool.execute(`
                INSERT INTO material_access_logs 
                (material_id, accessed_by, access_type, ip_address, user_agent)
                VALUES (?, ?, 'download', ?, ?)
            `, [
                materialId,
                userId,
                req.ip || req.connection.remoteAddress,
                req.get('User-Agent') || 'Unknown'
            ]);

            // Update download count
            await pool.execute(
                'UPDATE teaching_materials SET download_count = download_count + 1 WHERE id = ?',
                [materialId]
            );
        } catch (logError) {
            console.error('Error logging download:', logError);
            // Continue with download even if logging fails
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${material.original_name}"`);
        res.setHeader('Content-Type', material.mime_type);
        res.setHeader('Content-Length', material.file_size);

        // Stream the file
        const fileStream = fs.createReadStream(material.file_path);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error reading file'
                });
            }
        });

    } catch (error) {
        console.error('Error downloading material:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download material',
            error: error.message
        });
    }
});

// View/stream material file for in-browser viewing
router.get('/:id/view', authenticateToken, async (req, res) => {
    // Log authentication check
    console.log('Authentication check for viewing material:', {
        userId: req.user?.id,
        materialId: req.params.id,
        userRole: req.user?.role
    });
    try {
        const materialId = req.params.id;
        const userId = req.user.id;

        // Get material details
        const [materials] = await pool.execute(`
            SELECT tm.*, u.first_name, u.last_name 
            FROM teaching_materials tm
            INNER JOIN users u ON tm.teacher_id = u.id
            WHERE tm.id = ?
        `, [materialId]);

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        // Check access permissions
        if (material.teacher_id !== userId && !material.is_public && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You do not have permission to view this material.'
            });
        }

        // Check if file exists
        const fileInfo = getFileInfo(material.file_path);
        if (!fileInfo.exists) {
            return res.status(404).json({
                success: false,
                message: 'File not found on server'
            });
        }

        // Log the view access
        try {
            await pool.execute(`
                INSERT INTO material_access_logs 
                (material_id, accessed_by, access_type, ip_address, user_agent)
                VALUES (?, ?, 'view', ?, ?)
            `, [
                materialId,
                userId,
                req.ip || req.connection.remoteAddress,
                req.get('User-Agent') || 'Unknown'
            ]);
        } catch (logError) {
            console.error('Error logging view access:', logError);
            // Continue with view even if logging fails
        }

        // Set appropriate headers for inline viewing
        res.setHeader('Content-Type', material.mime_type);
        res.setHeader('Content-Length', material.file_size);
        res.setHeader('Content-Disposition', `inline; filename="${material.original_name}"`);
        
        // Add cache headers for better performance
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Last-Modified', material.updated_at);

        // Stream the file
        const fileStream = fs.createReadStream(material.file_path);
        fileStream.pipe(res);

        fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: 'Error reading file'
                });
            }
        });

    } catch (error) {
        console.error('Error viewing material:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to view material',
            error: error.message
        });
    }
});

// View material details
router.get('/:id/details', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.id;
        const userId = req.user.id;

        const [materials] = await pool.execute(`
            SELECT tm.*, 
                s.name as subject_name,
                s.code as subject_code,
                u.first_name,
                u.last_name,
                u.email as teacher_email,
                (SELECT COUNT(*) FROM material_access_logs mal WHERE mal.material_id = tm.id AND mal.access_type = 'download') as download_count,
                (SELECT COUNT(*) FROM material_access_logs mal WHERE mal.material_id = tm.id AND mal.access_type = 'view') as view_count
            FROM teaching_materials tm
            LEFT JOIN subjects s ON tm.subject_id = s.id
            INNER JOIN users u ON tm.teacher_id = u.id
            WHERE tm.id = ?
        `, [materialId]);

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        // Check access permissions
        if (material.teacher_id !== userId && !material.is_public && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Log the view
        try {
            await pool.execute(`
                INSERT INTO material_access_logs 
                (material_id, accessed_by, access_type, ip_address, user_agent)
                VALUES (?, ?, 'view', ?, ?)
            `, [
                materialId,
                userId,
                req.ip || req.connection.remoteAddress,
                req.get('User-Agent') || 'Unknown'
            ]);
        } catch (logError) {
            console.error('Error logging view:', logError);
        }

        // Get file info
        const fileInfo = getFileInfo(material.file_path);

        const responseData = {
            id: material.id,
            title: material.title,
            description: material.description,
            fileName: material.original_name,
            fileType: material.file_type,
            fileSize: material.file_size,
            mimeType: material.mime_type,
            category: material.category,
            classLevel: material.class_level,
            subject: material.subject_name,
            subjectCode: material.subject_code,
            isPublic: material.is_public,
            tags: material.tags ? JSON.parse(material.tags) : [],
            uploadDate: material.created_at,
            updatedDate: material.updated_at,
            downloadCount: material.download_count || 0,
            viewCount: material.view_count || 0,
            teacher: {
                name: `${material.first_name} ${material.last_name}`,
                email: material.teacher_email
            },
            fileExists: fileInfo.exists,
            canDownload: material.teacher_id === userId || material.is_public || req.user.role === 'admin',
            canEdit: material.teacher_id === userId || req.user.role === 'admin',
            canDelete: material.teacher_id === userId || req.user.role === 'admin'
        };

        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error fetching material details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch material details',
            error: error.message
        });
    }
});

// Update material details
router.put('/:id/update', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.id;
        const userId = req.user.id;
        const {
            title,
            description,
            subject_id,
            category,
            class_level,
            is_public,
            tags
        } = req.body;

        // Check if material exists and user has permission
        const [materials] = await pool.execute(
            'SELECT teacher_id FROM teaching_materials WHERE id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        if (material.teacher_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only update your own materials.'
            });
        }

        // Build update query dynamically
        const updates = [];
        const params = [];

        if (title !== undefined) {
            updates.push('title = ?');
            params.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            params.push(description);
        }
        if (subject_id !== undefined) {
            updates.push('subject_id = ?');
            params.push(subject_id || null);
        }
        if (category !== undefined) {
            updates.push('category = ?');
            params.push(category);
        }
        if (class_level !== undefined) {
            updates.push('class_level = ?');
            params.push(class_level || null);
        }
        if (is_public !== undefined) {
            updates.push('is_public = ?');
            params.push(is_public);
        }
        if (tags !== undefined) {
            updates.push('tags = ?');
            params.push(Array.isArray(tags) ? JSON.stringify(tags) : tags);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        params.push(materialId);

        await pool.execute(
            `UPDATE teaching_materials SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            params
        );

        res.json({
            success: true,
            message: 'Material updated successfully'
        });

    } catch (error) {
        console.error('Error updating material:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update material',
            error: error.message
        });
    }
});

// Delete material
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.id;
        const userId = req.user.id;

        // Get material details
        const [materials] = await pool.execute(
            'SELECT teacher_id, file_path, original_name FROM teaching_materials WHERE id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        if (material.teacher_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own materials.'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Delete access logs
            await connection.execute(
                'DELETE FROM material_access_logs WHERE material_id = ?',
                [materialId]
            );

            // Delete material record
            await connection.execute(
                'DELETE FROM teaching_materials WHERE id = ?',
                [materialId]
            );

            await connection.commit();
            connection.release();

            // Attempt to delete physical file asynchronously
            // Don't let file deletion failure affect the database operation
            const fileDeleted = await deleteFileAsync(material.file_path);
            if (!fileDeleted) {
                console.warn(`Warning: Failed to delete physical file for material ID ${materialId}: ${material.file_path}`);
            }

            res.json({
                success: true,
                message: `Material "${material.original_name}" deleted successfully${!fileDeleted ? ' (Note: Physical file could not be removed)' : ''}`
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Error deleting material:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete material',
            error: error.message
        });
    }
});

// Get material access statistics
router.get('/:id/statistics', authenticateToken, async (req, res) => {
    try {
        const materialId = req.params.id;
        const userId = req.user.id;

        // Check if material exists and user has permission
        const [materials] = await pool.execute(
            'SELECT teacher_id, title FROM teaching_materials WHERE id = ?',
            [materialId]
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Material not found'
            });
        }

        const material = materials[0];

        if (material.teacher_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get access statistics
        const [stats] = await pool.execute(`
            SELECT 
                access_type,
                COUNT(*) as count,
                DATE(created_at) as access_date
            FROM material_access_logs 
            WHERE material_id = ?
            GROUP BY access_type, DATE(created_at)
            ORDER BY access_date DESC
            LIMIT 30
        `, [materialId]);

        // Get user access statistics
        const [userStats] = await pool.execute(`
            SELECT 
                u.first_name,
                u.last_name,
                u.email,
                mal.access_type,
                COUNT(*) as access_count,
                MAX(mal.created_at) as last_access
            FROM material_access_logs mal
            INNER JOIN users u ON mal.accessed_by = u.id
            WHERE mal.material_id = ?
            GROUP BY u.id, mal.access_type
            ORDER BY last_access DESC
            LIMIT 20
        `, [materialId]);

        res.json({
            success: true,
            data: {
                material: {
                    id: materialId,
                    title: material.title
                },
                dailyStats: stats,
                userAccess: userStats
            }
        });

    } catch (error) {
        console.error('Error fetching material statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch material statistics',
            error: error.message
        });
    }
});

// Get public materials (for sharing between teachers)
router.get('/public', authenticateToken, async (req, res) => {
    try {
        const {
            search = '',
            subject_id = '',
            category = '',
            class_level = '',
            limit = 20,
            offset = 0
        } = req.query;

        let query = `
            SELECT tm.*, 
                s.name as subject_name,
                s.code as subject_code,
                u.first_name,
                u.last_name,
                (SELECT COUNT(*) FROM material_access_logs mal WHERE mal.material_id = tm.id) as total_downloads
            FROM teaching_materials tm
            LEFT JOIN subjects s ON tm.subject_id = s.id
            INNER JOIN users u ON tm.teacher_id = u.id
            WHERE tm.is_public = TRUE
        `;

        const params = [];

        if (isValidParam(search)) {
            query += ` AND (tm.title LIKE ? OR tm.description LIKE ? OR tm.original_name LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (isValidParam(subject_id)) {
            query += ` AND tm.subject_id = ?`;
            params.push(subject_id);
        }

        if (isValidParam(category)) {
            query += ` AND tm.category = ?`;
            params.push(category);
        }

        if (isValidParam(class_level)) {
            query += ` AND tm.class_level = ?`;
            params.push(class_level);
        }

        query += ` ORDER BY tm.download_count DESC, tm.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const [materials] = await pool.execute(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM teaching_materials tm WHERE tm.is_public = TRUE`;
        const countParams = [];

        if (isValidParam(search)) {
            countQuery += ` AND (tm.title LIKE ? OR tm.description LIKE ? OR tm.original_name LIKE ?)`;
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (isValidParam(subject_id)) {
            countQuery += ` AND tm.subject_id = ?`;
            countParams.push(subject_id);
        }

        if (isValidParam(category)) {
            countQuery += ` AND tm.category = ?`;
            countParams.push(category);
        }

        if (isValidParam(class_level)) {
            countQuery += ` AND tm.class_level = ?`;
            countParams.push(class_level);
        }

        const [countResult] = await pool.execute(countQuery, countParams);

        const transformedMaterials = materials.map(material => ({
            id: material.id,
            title: material.title,
            description: material.description,
            fileName: material.original_name,
            fileType: material.file_type,
            fileSize: material.file_size,
            category: material.category,
            classLevel: material.class_level,
            subject: material.subject_name || 'No Subject',
            subjectCode: material.subject_code,
            downloadCount: material.total_downloads || 0,
            uploadDate: material.created_at,
            teacher: `${material.first_name} ${material.last_name}`,
            tags: material.tags ? JSON.parse(material.tags) : []
        }));

        res.json({
            success: true,
            data: transformedMaterials,
            pagination: {
                total: countResult[0].total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: countResult[0].total > parseInt(offset) + parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching public materials:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public materials',
            error: error.message
        });
    }
});

module.exports = router;
