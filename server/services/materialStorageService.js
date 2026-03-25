const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const {
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getR2Client, getR2Config } = require('../config/r2');

const MATERIAL_CATEGORY_VALUES = ['lesson_plan', 'teaching_material', 'syllabus', 'worksheet', 'assessment', 'other'];
const MATERIAL_VISIBILITY_VALUES = ['private', 'school', 'public'];

const FILE_RULES = [
    {
        group: 'pdf',
        extensions: ['.pdf'],
        mimeTypes: ['application/pdf'],
        maxSizeBytes: 25 * 1024 * 1024,
        cacheControl: 'public, max-age=31536000, immutable'
    },
    {
        group: 'video',
        extensions: ['.mp4', '.webm'],
        mimeTypes: ['video/mp4', 'video/webm'],
        maxSizeBytes: 250 * 1024 * 1024,
        cacheControl: 'public, max-age=31536000, immutable'
    },
    {
        group: 'image',
        extensions: ['.jpg', '.jpeg', '.png', '.webp'],
        mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        maxSizeBytes: 20 * 1024 * 1024,
        cacheControl: 'public, max-age=31536000, immutable'
    },
    {
        group: 'document',
        extensions: ['.doc', '.docx'],
        mimeTypes: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        maxSizeBytes: 25 * 1024 * 1024,
        cacheControl: 'private, max-age=86400'
    },
    {
        group: 'presentation',
        extensions: ['.ppt', '.pptx'],
        mimeTypes: [
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        maxSizeBytes: 50 * 1024 * 1024,
        cacheControl: 'private, max-age=86400'
    }
];

const DANGEROUS_EXTENSIONS = new Set([
    '.exe', '.dll', '.bat', '.cmd', '.com', '.msi', '.sh', '.bash', '.zsh',
    '.php', '.phtml', '.js', '.mjs', '.cjs', '.jar', '.scr', '.vbs', '.ps1', '.apk'
]);

const getFileRule = (originalName, mimeType) => {
    const extension = path.extname(String(originalName || '')).toLowerCase();
    const normalizedMimeType = String(mimeType || '').toLowerCase();

    if (DANGEROUS_EXTENSIONS.has(extension)) {
        const error = new Error(`Files with extension ${extension} are not allowed`);
        error.statusCode = 400;
        throw error;
    }

    const rule = FILE_RULES.find(candidate =>
        candidate.extensions.includes(extension) && candidate.mimeTypes.includes(normalizedMimeType)
    );

    if (!rule) {
        const error = new Error('Unsupported file type. Allowed: PDF, MP4, WEBM, JPG, JPEG, PNG, WEBP, DOC, DOCX, PPT, PPTX');
        error.statusCode = 400;
        throw error;
    }

    return rule;
};

const normalizeTags = (rawTags) => {
    if (!rawTags) {
        return [];
    }

    if (Array.isArray(rawTags)) {
        return rawTags.map(tag => String(tag).trim()).filter(Boolean);
    }

    return String(rawTags)
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
};

const normalizeBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';

const sanitizeBaseName = (name) =>
    String(name || 'material')
        .normalize('NFKD')
        .replace(/[^\w.\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 120) || 'material';

const generateMaterialObjectKey = ({ schoolId, teacherId, subjectId, classId, originalName }) => {
    const extension = path.extname(originalName).toLowerCase();
    const baseName = sanitizeBaseName(path.basename(originalName, extension));
    const randomToken = crypto.randomBytes(8).toString('hex');
    const dateStamp = new Date().toISOString().slice(0, 10);

    return [
        'schools',
        schoolId || 'global',
        'materials',
        teacherId,
        subjectId || 'no-subject',
        classId || 'no-class',
        dateStamp,
        `${Date.now()}-${randomToken}-${baseName}${extension}`
    ].join('/');
};

const buildPublicFileUrl = (objectKey) => {
    const { publicBaseUrl, bucketName } = getR2Config();
    if (publicBaseUrl) {
        return `${publicBaseUrl}/${objectKey}`;
    }

    return `https://${bucketName}.${getR2Config().accountId}.r2.cloudflarestorage.com/${objectKey}`;
};

const createPresignedUpload = async ({ objectKey, mimeType, cacheControl, fileName, sizeBytes }) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: mimeType,
        CacheControl: cacheControl,
        Metadata: {
            originalname: Buffer.from(String(fileName || ''), 'utf8').toString('base64url').slice(0, 512),
            sizebytes: String(sizeBytes || 0)
        }
    });

    const url = await getSignedUrl(client, command, { expiresIn: 15 * 60 });
    return {
        method: 'PUT',
        url,
        headers: {
            'Content-Type': mimeType,
            'Cache-Control': cacheControl
        }
    };
};

const createPresignedDownload = async ({ objectKey, fileName, inline = true }) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();
    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(fileName)}"`
    });

    return getSignedUrl(client, command, { expiresIn: 10 * 60 });
};

const ensureObjectExists = async (objectKey) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();
    await client.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: objectKey
    }));
};

const deleteObjectIfExists = async (objectKey) => {
    if (!objectKey) {
        return;
    }

    const client = getR2Client();
    const { bucketName } = getR2Config();
    await client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: objectKey
    }));
};

const uploadLegacyFileStream = async ({ objectKey, filePath, mimeType, cacheControl, fileName, sizeBytes }) => {
    const client = getR2Client();
    const { bucketName } = getR2Config();

    await client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fs.createReadStream(filePath),
        ContentType: mimeType,
        CacheControl: cacheControl,
        Metadata: {
            originalname: Buffer.from(String(fileName || ''), 'utf8').toString('base64url').slice(0, 512),
            sizebytes: String(sizeBytes || 0)
        }
    }));
};

const normalizeMaterialRecord = async (record, { includeAccessUrls = true } = {}) => {
    const tags = normalizeTags(record.tags);
    const normalized = {
        id: record.id,
        schoolId: record.schema_school_id || record.school_id || null,
        subjectId: record.subject_id || null,
        classId: record.schema_class_id || record.class_id || null,
        classLevel: record.class_level || null,
        title: record.title,
        description: record.description,
        originalName: record.original_name,
        objectKey: record.schema_object_key || record.object_key,
        fileUrl: record.schema_file_url || record.file_url,
        mimeType: record.mime_type,
        sizeBytes: record.schema_size_bytes || record.size_bytes || record.file_size || 0,
        uploadedBy: record.schema_uploaded_by || record.uploaded_by || record.teacher_id,
        visibility: record.schema_visibility_scope || record.visibility_scope || (record.is_public ? 'public' : 'private'),
        accessRole: record.schema_access_role || record.access_role || 'teacher',
        category: record.category || 'teaching_material',
        createdAt: record.created_at,
        updatedAt: record.updated_at,
        downloadCount: record.download_count || 0,
        tags,
        uploadStatus: record.schema_upload_status || record.upload_status || 'ready',
        storageProvider: record.schema_storage_provider || record.storage_provider || 'local',
        fileAvailable: Boolean(record.schema_object_key || record.object_key) && (record.schema_upload_status || record.upload_status || 'ready') === 'ready',
        subject: record.subject_name || null,
        subjectCode: record.subject_code || null,
        fileName: record.original_name,
        fileType: path.extname(record.original_name || '').replace('.', '').toLowerCase()
    };

    if (includeAccessUrls && normalized.objectKey && normalized.uploadStatus === 'ready') {
        normalized.viewUrl = await createPresignedDownload({
            objectKey: normalized.objectKey,
            fileName: normalized.originalName,
            inline: true
        });
        normalized.downloadUrl = await createPresignedDownload({
            objectKey: normalized.objectKey,
            fileName: normalized.originalName,
            inline: false
        });
    } else {
        normalized.viewUrl = null;
        normalized.downloadUrl = null;
    }

    return normalized;
};

const validateMaterialUploadRequest = (payload) => {
    const originalName = String(payload.original_name || payload.originalName || '').trim();
    const mimeType = String(payload.mime_type || payload.mimeType || '').trim().toLowerCase();
    const sizeBytes = Number(payload.size_bytes || payload.sizeBytes || 0);
    const title = String(payload.title || path.basename(originalName, path.extname(originalName))).trim();
    const category = String(payload.category || 'teaching_material').trim();
    const visibility = String(payload.visibility || (normalizeBoolean(payload.is_public) ? 'public' : 'private')).trim().toLowerCase();

    if (!originalName) {
        const error = new Error('original_name is required');
        error.statusCode = 400;
        throw error;
    }

    if (!mimeType) {
        const error = new Error('mime_type is required');
        error.statusCode = 400;
        throw error;
    }

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        const error = new Error('size_bytes must be a positive number');
        error.statusCode = 400;
        throw error;
    }

    if (!title) {
        const error = new Error('title is required');
        error.statusCode = 400;
        throw error;
    }

    if (!MATERIAL_CATEGORY_VALUES.includes(category)) {
        const error = new Error(`Invalid category. Allowed: ${MATERIAL_CATEGORY_VALUES.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    if (!MATERIAL_VISIBILITY_VALUES.includes(visibility)) {
        const error = new Error(`Invalid visibility. Allowed: ${MATERIAL_VISIBILITY_VALUES.join(', ')}`);
        error.statusCode = 400;
        throw error;
    }

    const rule = getFileRule(originalName, mimeType);
    if (sizeBytes > rule.maxSizeBytes) {
        const error = new Error(`File exceeds maximum size for ${rule.group}. Max allowed is ${Math.round(rule.maxSizeBytes / 1024 / 1024)}MB`);
        error.statusCode = 400;
        throw error;
    }

    return {
        originalName,
        mimeType,
        sizeBytes,
        title,
        category,
        visibility,
        description: payload.description ? String(payload.description).trim() : null,
        subjectId: payload.subject_id ? Number(payload.subject_id) : null,
        classId: payload.class_id ? Number(payload.class_id) : null,
        classLevel: payload.class_level ? Number(payload.class_level) : null,
        accessRole: String(payload.access_role || 'teacher').trim().toLowerCase(),
        tags: normalizeTags(payload.tags),
        rule
    };
};

module.exports = {
    MATERIAL_CATEGORY_VALUES,
    MATERIAL_VISIBILITY_VALUES,
    FILE_RULES,
    normalizeTags,
    normalizeBoolean,
    getFileRule,
    generateMaterialObjectKey,
    buildPublicFileUrl,
    createPresignedUpload,
    createPresignedDownload,
    ensureObjectExists,
    deleteObjectIfExists,
    uploadLegacyFileStream,
    normalizeMaterialRecord,
    validateMaterialUploadRequest
};
