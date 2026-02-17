-- Rollback Multi-School Transformation Migration
-- This script removes all multi-school functionality and converts back to single-school
-- WARNING: This will DELETE all multi-school tables and data. Backup your database first!

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE `sms_database`;

-- ============================================================
-- STEP 1: Remove school_id columns from existing tables
-- ============================================================

-- Users table
ALTER TABLE `users` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `users` DROP INDEX IF EXISTS `idx_users_school`;

-- Modify role enum to remove super_admin
ALTER TABLE `users` MODIFY COLUMN `role` 
    ENUM('admin', 'teacher', 'student', 'parent') NOT NULL DEFAULT 'student';

-- Students table
ALTER TABLE `students` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `students` DROP COLUMN IF EXISTS `registration_number`;
ALTER TABLE `students` DROP INDEX IF EXISTS `idx_students_school`;
ALTER TABLE `students` DROP INDEX IF EXISTS `idx_students_reg_number`;

-- Classes table
ALTER TABLE `classes` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `classes` DROP INDEX IF EXISTS `idx_classes_school`;

-- Subjects table
ALTER TABLE `subjects` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `subjects` DROP INDEX IF EXISTS `idx_subjects_school`;

-- Teacher profiles table
ALTER TABLE `teacher_profiles` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `teacher_profiles` DROP INDEX IF EXISTS `idx_teacher_profiles_school`;

-- Drop other tables that might have school_id
ALTER TABLE `id_card_templates` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `promotion_rules` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `school_settings` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `school_subscriptions` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `shared_materials` DROP COLUMN IF EXISTS `school_id`;
ALTER TABLE `student_history` DROP COLUMN IF EXISTS `school_id`;

-- ============================================================
-- STEP 2: Drop multi-school specific tables
-- ============================================================

DROP TABLE IF EXISTS `id_card_templates`;
DROP TABLE IF EXISTS `shared_materials`;
DROP TABLE IF EXISTS `promotion_rules`;
DROP TABLE IF EXISTS `student_history`;
DROP TABLE IF EXISTS `school_settings`;
DROP TABLE IF EXISTS `school_subscriptions`;
DROP TABLE IF EXISTS `schools`;

-- ============================================================
-- STEP 3: Cleanup
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Multi-school rollback completed successfully!' AS status;
SELECT 'System is now configured for single-school operation' AS info;
