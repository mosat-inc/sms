const { pool } = require('../config/database');

const runSafe = async (sql, ignorableCodes = ['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_FK_DUP_NAME']) => {
    try {
        await pool.execute(sql);
    } catch (error) {
        if (!ignorableCodes.includes(error.code)) {
            throw error;
        }
    }
};

const addR2MaterialStorage = async () => {
    console.log('🔄 Adding R2 material storage columns...');

    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN school_id INT NULL`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN uploaded_by INT NULL`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN class_id INT NULL`);
    await runSafe(`ALTER TABLE teaching_materials MODIFY COLUMN file_path VARCHAR(500) NULL`, []);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN object_key VARCHAR(700) NULL`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN file_url VARCHAR(1024) NULL`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN size_bytes BIGINT NULL`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN visibility_scope ENUM('private', 'school', 'public') DEFAULT 'private'`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN access_role VARCHAR(50) DEFAULT 'teacher'`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN upload_status ENUM('pending', 'ready', 'failed') DEFAULT 'ready'`);
    await runSafe(`ALTER TABLE teaching_materials ADD COLUMN storage_provider ENUM('local', 'r2') DEFAULT 'local'`);

    await runSafe(`
        ALTER TABLE teaching_materials
        ADD CONSTRAINT fk_teaching_materials_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
    `, ['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE']);

    await runSafe(`
        ALTER TABLE teaching_materials
        ADD CONSTRAINT fk_teaching_materials_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    `, ['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE']);

    await runSafe(`
        ALTER TABLE teaching_materials
        ADD CONSTRAINT fk_teaching_materials_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
    `, ['ER_DUP_KEYNAME', 'ER_FK_DUP_NAME', 'ER_CANT_CREATE_TABLE']);

    await runSafe(`CREATE INDEX idx_materials_school_visibility ON teaching_materials(school_id, visibility_scope)`, ['ER_DUP_KEYNAME']);
    await runSafe(`CREATE INDEX idx_materials_object_key ON teaching_materials(object_key(255))`, ['ER_DUP_KEYNAME']);

    await pool.execute(`
        UPDATE teaching_materials
        SET uploaded_by = COALESCE(uploaded_by, teacher_id),
            size_bytes = COALESCE(size_bytes, file_size),
            visibility_scope = COALESCE(visibility_scope, CASE WHEN is_public = 1 THEN 'public' ELSE 'private' END),
            storage_provider = CASE WHEN object_key IS NOT NULL AND object_key <> '' THEN 'r2' ELSE COALESCE(storage_provider, 'local') END,
            upload_status = CASE
                WHEN object_key IS NOT NULL AND object_key <> '' THEN 'ready'
                WHEN file_path IS NOT NULL AND file_path <> '' THEN COALESCE(upload_status, 'ready')
                ELSE COALESCE(upload_status, 'pending')
            END
    `);

    console.log('✅ R2 material storage migration complete');
};

module.exports = {
    addR2MaterialStorage
};
