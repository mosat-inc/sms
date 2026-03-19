const path = require('path');
const fs = require('fs');
const { pool, initializeDatabase } = require('../config/database');
const {
    getFileRule,
    generateMaterialObjectKey,
    buildPublicFileUrl,
    uploadLegacyFileStream
} = require('../services/materialStorageService');

const migrateMaterialsToR2 = async () => {
    await initializeDatabase();

    const [rows] = await pool.execute(`
        SELECT *
        FROM teaching_materials
        WHERE (object_key IS NULL OR object_key = '')
          AND file_path IS NOT NULL
          AND file_path <> ''
        ORDER BY id ASC
    `);

    console.log(`Found ${rows.length} legacy material(s) to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const row of rows) {
        const resolvedPath = path.isAbsolute(row.file_path)
            ? row.file_path
            : path.join(process.cwd(), row.file_path);

        if (!fs.existsSync(resolvedPath)) {
            console.warn(`Skipping material ${row.id}: file missing at ${resolvedPath}`);
            skipped += 1;
            continue;
        }

        const rule = getFileRule(row.original_name, row.mime_type);
        const objectKey = generateMaterialObjectKey({
            schoolId: row.school_id,
            teacherId: row.uploaded_by || row.teacher_id,
            subjectId: row.subject_id,
            classId: row.class_id,
            originalName: row.original_name
        });

        await uploadLegacyFileStream({
            objectKey,
            filePath: resolvedPath,
            mimeType: row.mime_type,
            cacheControl: rule.cacheControl,
            fileName: row.original_name,
            sizeBytes: row.size_bytes || row.file_size
        });

        await pool.execute(`
            UPDATE teaching_materials
            SET object_key = ?,
                file_url = ?,
                size_bytes = COALESCE(size_bytes, file_size),
                uploaded_by = COALESCE(uploaded_by, teacher_id),
                visibility_scope = COALESCE(visibility_scope, CASE WHEN is_public = 1 THEN 'public' ELSE 'private' END),
                upload_status = 'ready',
                storage_provider = 'r2',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [objectKey, buildPublicFileUrl(objectKey), row.id]);

        migrated += 1;
        console.log(`Migrated material ${row.id} -> ${objectKey}`);
    }

    console.log(`R2 migration complete. Migrated=${migrated}, skipped=${skipped}`);
    process.exit(0);
};

migrateMaterialsToR2().catch((error) => {
    console.error('R2 material migration failed:', error);
    process.exit(1);
});
