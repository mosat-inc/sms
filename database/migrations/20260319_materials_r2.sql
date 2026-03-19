ALTER TABLE teaching_materials
    ADD COLUMN school_id INT NULL,
    ADD COLUMN uploaded_by INT NULL,
    ADD COLUMN class_id INT NULL,
    MODIFY COLUMN file_path VARCHAR(500) NULL,
    ADD COLUMN object_key VARCHAR(700) NULL,
    ADD COLUMN file_url VARCHAR(1024) NULL,
    ADD COLUMN size_bytes BIGINT NULL,
    ADD COLUMN visibility_scope ENUM('private', 'school', 'public') DEFAULT 'private',
    ADD COLUMN access_role VARCHAR(50) DEFAULT 'teacher',
    ADD COLUMN upload_status ENUM('pending', 'ready', 'failed') DEFAULT 'ready',
    ADD COLUMN storage_provider ENUM('local', 'r2') DEFAULT 'local';

ALTER TABLE teaching_materials
    ADD CONSTRAINT fk_teaching_materials_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE teaching_materials
    ADD CONSTRAINT fk_teaching_materials_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE teaching_materials
    ADD CONSTRAINT fk_teaching_materials_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

CREATE INDEX idx_materials_school_visibility ON teaching_materials(school_id, visibility_scope);
CREATE INDEX idx_materials_object_key ON teaching_materials(object_key(255));

UPDATE teaching_materials
SET uploaded_by = COALESCE(uploaded_by, teacher_id),
    size_bytes = COALESCE(size_bytes, file_size),
    visibility_scope = COALESCE(visibility_scope, CASE WHEN is_public = 1 THEN 'public' ELSE 'private' END),
    storage_provider = CASE WHEN object_key IS NOT NULL AND object_key <> '' THEN 'r2' ELSE COALESCE(storage_provider, 'local') END,
    upload_status = CASE
        WHEN object_key IS NOT NULL AND object_key <> '' THEN 'ready'
        WHEN file_path IS NOT NULL AND file_path <> '' THEN COALESCE(upload_status, 'ready')
        ELSE COALESCE(upload_status, 'pending')
    END;
