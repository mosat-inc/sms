const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../utils/auth');
const logger = require('../utils/logger');
const {
    validateMaterialUploadRequest,
    normalizeMaterialRecord,
    generateMaterialObjectKey,
    buildPublicFileUrl,
    createPresignedUpload,
    createPresignedDownload,
    ensureObjectExists,
    deleteObjectIfExists,
    uploadLegacyFileStream,
    normalizeTags
} = require('../services/materialStorageService');

const router = express.Router();

const isValidParam = (param) => param !== null && param !== undefined && param !== '' && param !== 'undefined';

const parseBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

let cachedMaterialSchemaMeta = null;

const getMaterialSchemaMeta = async () => {
    if (cachedMaterialSchemaMeta) {
        return cachedMaterialSchemaMeta;
    }

    const [rows] = await pool.execute(`
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'teaching_materials'
    `);

    const columns = new Set(rows.map(row => row.COLUMN_NAME));
    cachedMaterialSchemaMeta = {
        hasSchoolId: columns.has('school_id'),
        hasUploadedBy: columns.has('uploaded_by'),
        hasClassId: columns.has('class_id'),
        hasObjectKey: columns.has('object_key'),
        hasFileUrl: columns.has('file_url'),
        hasSizeBytes: columns.has('size_bytes'),
        hasVisibilityScope: columns.has('visibility_scope'),
        hasAccessRole: columns.has('access_role'),
        hasUploadStatus: columns.has('upload_status'),
        hasStorageProvider: columns.has('storage_provider')
    };

    return cachedMaterialSchemaMeta;
};

const buildMaterialSelect = (meta, alias = 'tm') => {
    const uploadedByExpr = meta.hasUploadedBy ? `COALESCE(${alias}.uploaded_by, ${alias}.teacher_id)` : `${alias}.teacher_id`;
    const schoolIdExpr = meta.hasSchoolId ? `${alias}.school_id` : 'NULL';
    const classIdExpr = meta.hasClassId ? `${alias}.class_id` : 'NULL';
    const objectKeyExpr = meta.hasObjectKey ? `${alias}.object_key` : 'NULL';
    const fileUrlExpr = meta.hasFileUrl ? `${alias}.file_url` : 'NULL';
    const sizeBytesExpr = meta.hasSizeBytes ? `COALESCE(${alias}.size_bytes, ${alias}.file_size)` : `${alias}.file_size`;
    const visibilityExpr = meta.hasVisibilityScope
        ? `COALESCE(${alias}.visibility_scope, CASE WHEN ${alias}.is_public = 1 THEN 'public' ELSE 'private' END)`
        : `CASE WHEN ${alias}.is_public = 1 THEN 'public' ELSE 'private' END`;
    const accessRoleExpr = meta.hasAccessRole ? `COALESCE(${alias}.access_role, 'teacher')` : `'teacher'`;
    const uploadStatusExpr = meta.hasUploadStatus
        ? `COALESCE(${alias}.upload_status, CASE WHEN ${alias}.file_path IS NOT NULL AND ${alias}.file_path <> '' THEN 'ready' ELSE 'pending' END)`
        : `CASE WHEN ${alias}.file_path IS NOT NULL AND ${alias}.file_path <> '' THEN 'ready' ELSE 'pending' END`;
    const storageProviderExpr = meta.hasStorageProvider ? `COALESCE(${alias}.storage_provider, 'local')` : `'local'`;

    return `
        ${alias}.*,
        ${schoolIdExpr} AS schema_school_id,
        ${uploadedByExpr} AS schema_uploaded_by,
        ${classIdExpr} AS schema_class_id,
        ${objectKeyExpr} AS schema_object_key,
        ${fileUrlExpr} AS schema_file_url,
        ${sizeBytesExpr} AS schema_size_bytes,
        ${visibilityExpr} AS schema_visibility_scope,
        ${accessRoleExpr} AS schema_access_role,
        ${uploadStatusExpr} AS schema_upload_status,
        ${storageProviderExpr} AS schema_storage_provider
    `;
};

const getUploadedBySql = (meta, alias = 'tm') => meta.hasUploadedBy ? `COALESCE(${alias}.uploaded_by, ${alias}.teacher_id)` : `${alias}.teacher_id`;
const getSchoolIdSql = (meta, alias = 'tm') => meta.hasSchoolId ? `${alias}.school_id` : 'NULL';
const getVisibilitySql = (meta, alias = 'tm') => meta.hasVisibilityScope
    ? `COALESCE(${alias}.visibility_scope, CASE WHEN ${alias}.is_public = 1 THEN 'public' ELSE 'private' END)`
    : `CASE WHEN ${alias}.is_public = 1 THEN 'public' ELSE 'private' END`;

const getRequesterSchoolId = async (req) => {
    if (req.user?.schoolId) {
        return Number(req.user.schoolId);
    }

    const [rows] = await pool.execute('SELECT school_id FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    return Number(rows?.[0]?.school_id || 0) || null;
};

const resolveClassLevel = async (classId, fallbackClassLevel) => {
    if (fallbackClassLevel) {
        return Number(fallbackClassLevel);
    }

    if (!classId) {
        return null;
    }

    const [rows] = await pool.execute('SELECT level FROM classes WHERE id = ? LIMIT 1', [classId]);
    return rows.length > 0 ? Number(rows[0].level) : null;
};

const canAccessMaterial = (record, req) => {
    if (req.user.role === 'admin') {
        return true;
    }

    if (Number(record.schema_uploaded_by || record.uploaded_by || record.teacher_id) === Number(req.user.id)) {
        return true;
    }

    const visibility = record.schema_visibility_scope || record.visibility_scope;
    if (visibility === 'public') {
        return true;
    }

    if (visibility === 'school') {
        const schoolId = Number(record.schema_school_id || record.school_id || 0);
        return schoolId > 0 && schoolId === Number(req.user.schoolId || 0);
    }

    return false;
};

const buildListWhereClause = async (req, queryParams, { ownOnly = false, publicOnly = false } = {}) => {
    const params = [];
    const conditions = [];
    const schoolId = await getRequesterSchoolId(req);
    const meta = await getMaterialSchemaMeta();
    const uploadedBySql = getUploadedBySql(meta);
    const visibilitySql = getVisibilitySql(meta);
    const schoolIdSql = getSchoolIdSql(meta);

    if (ownOnly) {
        conditions.push(`${uploadedBySql} = ?`);
        params.push(req.user.id);
    } else if (publicOnly) {
        if (meta.hasUploadStatus) {
            conditions.push(`tm.upload_status = 'ready'`);
        }
        conditions.push(`(${visibilitySql} = 'public' OR (${visibilitySql} = 'school' AND ${schoolIdSql} = ?))`);
        params.push(schoolId || 0);
    } else if (req.user.role !== 'admin') {
        conditions.push(`(
            ${uploadedBySql} = ?
            OR ${visibilitySql} = 'public'
            OR (${visibilitySql} = 'school' AND ${schoolIdSql} = ?)
        )`);
        params.push(req.user.id, schoolId || 0);
    }

    if (isValidParam(queryParams.subject_id)) {
        conditions.push('tm.subject_id = ?');
        params.push(Number(queryParams.subject_id));
    }

    if (isValidParam(queryParams.category)) {
        conditions.push('tm.category = ?');
        params.push(String(queryParams.category));
    }

    if (isValidParam(queryParams.class_id)) {
        conditions.push('tm.class_id = ?');
        params.push(Number(queryParams.class_id));
    } else if (isValidParam(queryParams.class_level)) {
        conditions.push('tm.class_level = ?');
        params.push(Number(queryParams.class_level));
    }

    if (isValidParam(queryParams.search)) {
        const searchTerm = `%${String(queryParams.search).trim()}%`;
        conditions.push('(tm.title LIKE ? OR tm.original_name LIKE ? OR tm.description LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm);
    }

    return {
        whereSql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params,
        meta
    };
};

const getMaterialById = async (materialId) => {
    const meta = await getMaterialSchemaMeta();
    const materialSelect = buildMaterialSelect(meta);
    const uploadedBySql = getUploadedBySql(meta);
    const [rows] = await pool.execute(`
        SELECT ${materialSelect},
               s.name AS subject_name,
               s.code AS subject_code,
               u.first_name,
               u.last_name
        FROM teaching_materials tm
        LEFT JOIN subjects s ON tm.subject_id = s.id
        LEFT JOIN users u ON ${uploadedBySql} = u.id
        WHERE tm.id = ?
        LIMIT 1
    `, [materialId]);

    return rows[0] || null;
};

const logMaterialAccess = async ({ materialId, userId, accessType, req }) => {
    try {
        await pool.execute(`
            INSERT INTO material_access_logs (material_id, accessed_by, access_type, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)
        `, [
            materialId,
            userId,
            accessType,
            req.ip || req.connection?.remoteAddress || '',
            req.get('User-Agent') || 'Unknown'
        ]);

        if (accessType === 'download') {
            await pool.execute('UPDATE teaching_materials SET download_count = download_count + 1 WHERE id = ?', [materialId]);
        }
    } catch (error) {
        logger.warn('Material access log failed', {
            materialId,
            userId,
            accessType,
            error: error.message
        });
    }
};

const sendMaterialPayload = async (res, material, options = {}) => {
    const normalized = await normalizeMaterialRecord(material, options);
    res.json({
        success: true,
        data: normalized
    });
};

router.get('/my-materials', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 50), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const { whereSql, params, meta } = await buildListWhereClause(req, req.query, { ownOnly: true });
        const materialSelect = buildMaterialSelect(meta);

        const [rows] = await pool.execute(`
            SELECT ${materialSelect}, s.name AS subject_name, s.code AS subject_code
            FROM teaching_materials tm
            LEFT JOIN subjects s ON tm.subject_id = s.id
            ${whereSql}
            ORDER BY tm.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const [countRows] = await pool.execute(`
            SELECT COUNT(*) AS total
            FROM teaching_materials tm
            ${whereSql}
        `, params);

        const data = await Promise.all(rows.map(row => normalizeMaterialRecord(row, { includeAccessUrls: false })));

        res.json({
            success: true,
            data,
            pagination: {
                total: Number(countRows[0]?.total || 0),
                limit,
                offset,
                hasMore: Number(countRows[0]?.total || 0) > offset + limit
            }
        });
    } catch (error) {
        logger.apiError(req, error, 500);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch materials'
        });
    }
});

router.get('/public', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 20), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const { whereSql, params, meta } = await buildListWhereClause(req, req.query, { publicOnly: true });
        const materialSelect = buildMaterialSelect(meta);
        const uploadedBySql = getUploadedBySql(meta);

        const [rows] = await pool.execute(`
            SELECT ${materialSelect}, s.name AS subject_name, s.code AS subject_code, u.first_name, u.last_name
            FROM teaching_materials tm
            LEFT JOIN subjects s ON tm.subject_id = s.id
            LEFT JOIN users u ON ${uploadedBySql} = u.id
            ${whereSql}
            ORDER BY tm.download_count DESC, tm.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const [countRows] = await pool.execute(`
            SELECT COUNT(*) AS total
            FROM teaching_materials tm
            ${whereSql}
        `, params);

        const data = await Promise.all(rows.map(row => normalizeMaterialRecord(row, { includeAccessUrls: false })));
        res.json({
            success: true,
            data,
            pagination: {
                total: Number(countRows[0]?.total || 0),
                limit,
                offset,
                hasMore: Number(countRows[0]?.total || 0) > offset + limit
            }
        });
    } catch (error) {
        logger.apiError(req, error, 500);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public materials'
        });
    }
});

// New direct-to-R2 upload init endpoint. Returns presigned PUT URL and creates metadata row.
router.post('/upload', authenticateToken, async (req, res) => {
    try {
        const schoolId = await getRequesterSchoolId(req);
        const validated = validateMaterialUploadRequest(req.body);
        const classLevel = await resolveClassLevel(validated.classId, validated.classLevel);
        const objectKey = generateMaterialObjectKey({
            schoolId,
            teacherId: req.user.id,
            subjectId: validated.subjectId,
            classId: validated.classId,
            originalName: validated.originalName
        });
        const fileUrl = buildPublicFileUrl(objectKey);
        const uploadPlan = await createPresignedUpload({
            objectKey,
            mimeType: validated.mimeType,
            cacheControl: validated.rule.cacheControl,
            fileName: validated.originalName,
            sizeBytes: validated.sizeBytes
        });

        const [insertResult] = await pool.execute(`
            INSERT INTO teaching_materials (
                school_id, teacher_id, uploaded_by, subject_id, class_id, class_level,
                title, description, original_name, object_key, file_url, mime_type, size_bytes,
                category, visibility_scope, access_role, upload_status, storage_provider,
                file_type, file_size, file_name, is_public, tags
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'r2', ?, ?, ?, ?, ?)
        `, [
            schoolId,
            req.user.id,
            req.user.id,
            validated.subjectId,
            validated.classId,
            classLevel,
            validated.title,
            validated.description,
            validated.originalName,
            objectKey,
            fileUrl,
            validated.mimeType,
            validated.sizeBytes,
            validated.category,
            validated.visibility,
            validated.accessRole,
            path.extname(validated.originalName).replace('.', '').toLowerCase(),
            validated.sizeBytes,
            validated.originalName,
            validated.visibility === 'public',
            JSON.stringify(validated.tags)
        ]);

        const material = await getMaterialById(insertResult.insertId);
        logger.info('Material upload initiated', {
            materialId: insertResult.insertId,
            userId: req.user.id,
            objectKey
        });

        res.status(201).json({
            success: true,
            message: 'Upload initialized successfully',
            data: {
                material: await normalizeMaterialRecord(material, { includeAccessUrls: false }),
                upload: uploadPlan
            }
        });
    } catch (error) {
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to initialize upload'
        });
    }
});

router.post('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (Number(material.uploaded_by) !== Number(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!material.object_key) {
            return res.status(400).json({ success: false, message: 'Material has no object key' });
        }

        await ensureObjectExists(material.object_key);
        await pool.execute(`
            UPDATE teaching_materials
            SET upload_status = 'ready',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [material.id]);

        const updatedMaterial = await getMaterialById(material.id);
        logger.info('Material upload completed', { materialId: material.id, userId: req.user.id });
        return sendMaterialPayload(res, updatedMaterial);
    } catch (error) {
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to finalize upload'
        });
    }
});

router.get('/', authenticateToken, async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit || 50), 100);
        const offset = Math.max(Number(req.query.offset || 0), 0);
        const { whereSql, params, meta } = await buildListWhereClause(req, req.query);
        const materialSelect = buildMaterialSelect(meta);

        const [rows] = await pool.execute(`
            SELECT ${materialSelect}, s.name AS subject_name, s.code AS subject_code
            FROM teaching_materials tm
            LEFT JOIN subjects s ON tm.subject_id = s.id
            ${whereSql}
            ORDER BY tm.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const [countRows] = await pool.execute(`
            SELECT COUNT(*) AS total
            FROM teaching_materials tm
            ${whereSql}
        `, params);

        const data = await Promise.all(rows.map(row => normalizeMaterialRecord(row, { includeAccessUrls: false })));
        res.json({
            success: true,
            data,
            pagination: {
                total: Number(countRows[0]?.total || 0),
                limit,
                offset,
                hasMore: Number(countRows[0]?.total || 0) > offset + limit
            }
        });
    } catch (error) {
        logger.apiError(req, error, 500);
        res.status(500).json({ success: false, message: 'Failed to fetch materials' });
    }
});

router.get('/:id/view', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (!canAccessMaterial(material, req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!material.object_key || material.upload_status !== 'ready') {
            return res.status(404).json({ success: false, message: 'Material file is not ready' });
        }

        await logMaterialAccess({ materialId: material.id, userId: req.user.id, accessType: 'view', req });
        const signedUrl = await createPresignedDownload({
            objectKey: material.object_key,
            fileName: material.original_name,
            inline: true
        });

        res.redirect(302, signedUrl);
    } catch (error) {
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to open material' });
    }
});

router.get('/:id/download', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (!canAccessMaterial(material, req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        if (!material.object_key || material.upload_status !== 'ready') {
            return res.status(404).json({ success: false, message: 'Material file is not ready' });
        }

        await logMaterialAccess({ materialId: material.id, userId: req.user.id, accessType: 'download', req });
        const signedUrl = await createPresignedDownload({
            objectKey: material.object_key,
            fileName: material.original_name,
            inline: false
        });

        res.redirect(302, signedUrl);
    } catch (error) {
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to download material' });
    }
});

router.get('/:id/details', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (!canAccessMaterial(material, req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        return sendMaterialPayload(res, material);
    } catch (error) {
        logger.apiError(req, error, 500);
        res.status(500).json({ success: false, message: 'Failed to fetch material details' });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (!canAccessMaterial(material, req)) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        return sendMaterialPayload(res, material);
    } catch (error) {
        logger.apiError(req, error, 500);
        res.status(500).json({ success: false, message: 'Failed to fetch material' });
    }
});

router.put('/:id/update', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (Number(material.uploaded_by) !== Number(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const updates = [];
        const params = [];

        if (req.body.title !== undefined) {
            updates.push('title = ?');
            params.push(String(req.body.title).trim());
        }

        if (req.body.description !== undefined) {
            updates.push('description = ?');
            params.push(req.body.description ? String(req.body.description).trim() : null);
        }

        if (req.body.subject_id !== undefined) {
            updates.push('subject_id = ?');
            params.push(req.body.subject_id ? Number(req.body.subject_id) : null);
        }

        if (req.body.class_id !== undefined) {
            updates.push('class_id = ?');
            params.push(req.body.class_id ? Number(req.body.class_id) : null);
            const classLevel = await resolveClassLevel(req.body.class_id, req.body.class_level);
            updates.push('class_level = ?');
            params.push(classLevel);
        } else if (req.body.class_level !== undefined) {
            updates.push('class_level = ?');
            params.push(req.body.class_level ? Number(req.body.class_level) : null);
        }

        if (req.body.category !== undefined) {
            updates.push('category = ?');
            params.push(String(req.body.category));
        }

        if (req.body.visibility !== undefined) {
            updates.push('visibility_scope = ?');
            params.push(String(req.body.visibility));
            updates.push('is_public = ?');
            params.push(String(req.body.visibility) === 'public');
        }

        if (req.body.access_role !== undefined) {
            updates.push('access_role = ?');
            params.push(String(req.body.access_role));
        }

        if (req.body.tags !== undefined) {
            updates.push('tags = ?');
            params.push(JSON.stringify(normalizeTags(req.body.tags)));
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        params.push(material.id);
        await pool.execute(`
            UPDATE teaching_materials
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, params);

        const updatedMaterial = await getMaterialById(material.id);
        return sendMaterialPayload(res, updatedMaterial);
    } catch (error) {
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to update material' });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    const materialId = Number(req.params.id);
    const connection = await pool.getConnection();
    try {
        const material = await getMaterialById(materialId);
        if (!material) {
            connection.release();
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (Number(material.uploaded_by) !== Number(req.user.id) && req.user.role !== 'admin') {
            connection.release();
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        await connection.beginTransaction();
        await connection.execute('DELETE FROM material_access_logs WHERE material_id = ?', [materialId]);
        await connection.execute('DELETE FROM teaching_materials WHERE id = ?', [materialId]);
        await connection.commit();
        connection.release();

        if (material.object_key) {
            await deleteObjectIfExists(material.object_key);
        }

        logger.info('Material deleted', { materialId, userId: req.user.id, objectKey: material.object_key });
        res.json({
            success: true,
            message: `Material "${material.original_name}" deleted successfully`
        });
    } catch (error) {
        await connection.rollback();
        connection.release();
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Failed to delete material' });
    }
});

router.get('/:id/statistics', authenticateToken, async (req, res) => {
    try {
        const material = await getMaterialById(Number(req.params.id));
        if (!material) {
            return res.status(404).json({ success: false, message: 'Material not found' });
        }

        if (Number(material.uploaded_by) !== Number(req.user.id) && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [dailyStats] = await pool.execute(`
            SELECT access_type, COUNT(*) AS count, DATE(created_at) AS access_date
            FROM material_access_logs
            WHERE material_id = ?
            GROUP BY access_type, DATE(created_at)
            ORDER BY access_date DESC
            LIMIT 30
        `, [material.id]);

        const [userStats] = await pool.execute(`
            SELECT u.first_name, u.last_name, u.email, mal.access_type,
                   COUNT(*) AS access_count, MAX(mal.created_at) AS last_access
            FROM material_access_logs mal
            INNER JOIN users u ON mal.accessed_by = u.id
            WHERE mal.material_id = ?
            GROUP BY u.id, mal.access_type
            ORDER BY last_access DESC
            LIMIT 20
        `, [material.id]);

        res.json({
            success: true,
            data: {
                material: {
                    id: material.id,
                    title: material.title
                },
                dailyStats,
                userAccess: userStats
            }
        });
    } catch (error) {
        logger.apiError(req, error, 500);
        res.status(500).json({ success: false, message: 'Failed to fetch material statistics' });
    }
});

// Legacy migration helper for local disk records. This is kept server-side so old rows can be lifted into R2.
router.post('/admin/migrate-legacy', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const limit = Math.min(Number(req.body.limit || 20), 200);
        const [rows] = await pool.execute(`
            SELECT *
            FROM teaching_materials
            WHERE (object_key IS NULL OR object_key = '')
              AND file_path IS NOT NULL
              AND file_path <> ''
            ORDER BY id ASC
            LIMIT ?
        `, [limit]);

        const migrated = [];
        const skipped = [];

        for (const row of rows) {
            const filePath = path.isAbsolute(row.file_path)
                ? row.file_path
                : path.join(process.cwd(), row.file_path);

            if (!fs.existsSync(filePath)) {
                skipped.push({ id: row.id, reason: 'missing_file', filePath });
                continue;
            }

            const objectKey = generateMaterialObjectKey({
                schoolId: row.school_id,
                teacherId: row.uploaded_by || row.teacher_id,
                subjectId: row.subject_id,
                classId: row.class_id,
                originalName: row.original_name
            });

            await uploadLegacyFileStream({
                objectKey,
                filePath,
                mimeType: row.mime_type,
                cacheControl: 'private, max-age=86400',
                fileName: row.original_name,
                sizeBytes: row.size_bytes || row.file_size
            });

            const fileUrl = buildPublicFileUrl(objectKey);
            await pool.execute(`
                UPDATE teaching_materials
                SET object_key = ?,
                    file_url = ?,
                    storage_provider = 'r2',
                    upload_status = 'ready',
                    size_bytes = COALESCE(size_bytes, file_size),
                    uploaded_by = COALESCE(uploaded_by, teacher_id),
                    visibility_scope = COALESCE(visibility_scope, CASE WHEN is_public = 1 THEN 'public' ELSE 'private' END),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [objectKey, fileUrl, row.id]);

            migrated.push({ id: row.id, objectKey });
        }

        res.json({
            success: true,
            message: `Migrated ${migrated.length} material(s) to R2`,
            data: {
                migrated,
                skipped
            }
        });
    } catch (error) {
        logger.apiError(req, error, error.statusCode || 500);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to migrate legacy materials'
        });
    }
});

module.exports = router;
