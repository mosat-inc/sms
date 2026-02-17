-- UBUNIFU SEC School Management System Database Initialization
-- This script creates the complete database schema matching the existing project structure

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Create database
CREATE DATABASE IF NOT EXISTS `sms_database` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sms_database`;

-- Users table (base table for all system users)
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `username` VARCHAR(50) UNIQUE NOT NULL,
    `email` VARCHAR(100) UNIQUE NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'teacher', 'student', 'parent') NOT NULL DEFAULT 'student',
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `firstName` VARCHAR(255) NOT NULL,
    `lastName` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20),
    `address` TEXT,
    `profile_image` VARCHAR(255),
    `qualification` VARCHAR(255),
    `experience` VARCHAR(100),
    `department` VARCHAR(100),
    `position` VARCHAR(100),
    `bio` TEXT,
    `employee_id` VARCHAR(50),
    `specialization` VARCHAR(100),
    `experience_years` INT DEFAULT 0,
    `joining_date` DATE,
    `subjects_taught` JSON,
    `classes_assigned` JSON,
    `salary` DECIMAL(10,2) DEFAULT 5750000,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_login` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- OTP codes table
CREATE TABLE IF NOT EXISTS `otp_codes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT,
    `code` VARCHAR(6) NOT NULL,
    `type` ENUM('login', 'password_reset', 'registration') NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `used` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Classes table
CREATE TABLE IF NOT EXISTS `classes` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(10) NOT NULL UNIQUE,
    `level` INT NOT NULL,
    `capacity` INT DEFAULT 40,
    `class_teacher_id` INT,
    `academic_year` VARCHAR(9) NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`class_teacher_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Students table
CREATE TABLE IF NOT EXISTS `students` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT UNIQUE,
    `student_id` VARCHAR(20) UNIQUE NOT NULL,
    `class_id` INT,
    `admission_number` VARCHAR(20) UNIQUE,
    `date_of_birth` DATE NOT NULL,
    `gender` ENUM('Male', 'Female') NOT NULL,
    `blood_group` VARCHAR(5),
    `nationality` VARCHAR(50) DEFAULT 'Tanzanian',
    `religion` VARCHAR(50),
    `admission_date` DATE NOT NULL,
    `graduation_date` DATE NULL,
    `year_of_study` INT DEFAULT 2025,
    `status` ENUM('active', 'graduated', 'transferred', 'suspended') DEFAULT 'active',
    `emergency_contact` VARCHAR(20),
    `medical_conditions` TEXT,
    `tutor_group` VARCHAR(20),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Subjects table
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `code` VARCHAR(10) NOT NULL UNIQUE,
    `description` TEXT,
    `department` VARCHAR(50),
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Teacher profiles table for extended teacher information
CREATE TABLE IF NOT EXISTS `teacher_profiles` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `user_id` INT UNIQUE,
    `employee_id` VARCHAR(20) UNIQUE,
    `department` VARCHAR(50),
    `position` VARCHAR(50),
    `qualification` VARCHAR(255),
    `specialization` VARCHAR(100),
    `experience_years` INT DEFAULT 0,
    `joining_date` DATE,
    `salary` DECIMAL(10,2),
    `bio` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Teacher subject assignments
CREATE TABLE IF NOT EXISTS `teacher_subject_assignments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `teacher_id` INT,
    `subject_id` INT,
    `class_id` INT,
    `academic_year` VARCHAR(9) NOT NULL,
    `is_primary_teacher` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_assignment` (`teacher_id`, `subject_id`, `class_id`, `academic_year`)
) ENGINE=InnoDB;

-- Supervisors/guardians table
CREATE TABLE IF NOT EXISTS `supervisors` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `relationship` ENUM('Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandparent', 'Other') NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100),
    `address` TEXT,
    `occupation` VARCHAR(100),
    `workplace` VARCHAR(100),
    `is_primary_contact` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Student supervisors table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `student_supervisors` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `supervisor_id` INT,
    `is_primary_supervisor` BOOLEAN DEFAULT FALSE,
    `emergency_contact` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`supervisor_id`) REFERENCES `supervisors`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_student_supervisor` (`student_id`, `supervisor_id`)
) ENGINE=InnoDB;

-- Academic years table
CREATE TABLE IF NOT EXISTS `academic_years` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `year_name` VARCHAR(9) NOT NULL UNIQUE,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `is_current` BOOLEAN DEFAULT FALSE,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Student academic history table
CREATE TABLE IF NOT EXISTS `student_academic_history` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `academic_year` VARCHAR(9) NOT NULL,
    `class_id` INT,
    `previous_class_id` INT NULL,
    `enrollment_date` DATE NOT NULL,
    `completion_date` DATE NULL,
    `status` ENUM('enrolled', 'promoted', 'repeated', 'transferred', 'dropped') DEFAULT 'enrolled',
    `average_grade` DECIMAL(4,2) NULL,
    `position_in_class` INT NULL,
    `total_students_in_class` INT NULL,
    `remarks` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`previous_class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_student_year` (`student_id`, `academic_year`)
) ENGINE=InnoDB;

-- Student financial records table
CREATE TABLE IF NOT EXISTS `student_financial_records` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `academic_year` VARCHAR(9) NOT NULL,
    `total_fees_required` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `total_fees_paid` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `outstanding_balance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `last_payment_date` DATE NULL,
    `payment_plan` ENUM('full', 'installments', 'scholarship') DEFAULT 'full',
    `scholarship_percentage` DECIMAL(5,2) DEFAULT 0.00,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_student_financial_year` (`student_id`, `academic_year`)
) ENGINE=InnoDB;

-- Fee payments table
CREATE TABLE IF NOT EXISTS `fee_payments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT NOT NULL,
    `amount` DECIMAL(10,2) NOT NULL,
    `payment_date` DATE NOT NULL,
    `term` VARCHAR(20) NOT NULL,
    `status` ENUM('Paid', 'Pending', 'Overdue') DEFAULT 'Paid',
    `payment_method` ENUM('cash', 'bank_transfer', 'mobile_money', 'cheque') DEFAULT 'cash',
    `reference_number` VARCHAR(50) NULL,
    `receipt_number` VARCHAR(50) NULL,
    `academic_year` VARCHAR(9) DEFAULT '2024-2025',
    `payment_for` ENUM('tuition', 'registration', 'examination', 'activities', 'transport', 'uniform', 'other') DEFAULT 'tuition',
    `notes` TEXT NULL,
    `recorded_by` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Student documents table
CREATE TABLE IF NOT EXISTS `student_documents` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `document_type` ENUM('birth_certificate', 'medical_report', 'transfer_letter', 'photo', 'parent_id', 'other') NOT NULL,
    `document_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NULL,
    `uploaded_date` DATE NOT NULL,
    `uploaded_by` INT,
    `file_size` INT NULL,
    `mime_type` VARCHAR(100) NULL,
    `is_verified` BOOLEAN DEFAULT FALSE,
    `verified_by` INT NULL,
    `verification_date` DATE NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Attendance table
CREATE TABLE IF NOT EXISTS `attendance` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `class_id` INT,
    `date` DATE NOT NULL,
    `session` ENUM('morning', 'afternoon') NOT NULL,
    `status` ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
    `notes` TEXT,
    `marked_by` INT,
    `marked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `is_editable` BOOLEAN DEFAULT TRUE,
    `admin_locked` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_student_date_session` (`student_id`, `date`, `session`)
) ENGINE=InnoDB;

-- Attendance alerts table
CREATE TABLE IF NOT EXISTS `attendance_alerts` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `student_id` INT,
    `class_id` INT,
    `alert_type` ENUM('consecutive_absence', 'frequent_lateness', 'pattern_concern') NOT NULL,
    `alert_message` TEXT NOT NULL,
    `alert_data` JSON,
    `is_resolved` BOOLEAN DEFAULT FALSE,
    `resolved_by` INT,
    `resolved_at` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Assignments table
CREATE TABLE IF NOT EXISTS `assignments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `class_id` INT,
    `teacher_id` INT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `due_date` DATE,
    `max_points` INT DEFAULT 100,
    `assignment_type` ENUM('homework', 'project', 'quiz', 'exam', 'other') DEFAULT 'homework',
    `status` ENUM('draft', 'published', 'closed') DEFAULT 'draft',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Assignment submissions table
CREATE TABLE IF NOT EXISTS `assignment_submissions` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `assignment_id` INT,
    `student_id` INT,
    `submission_text` TEXT,
    `file_path` VARCHAR(500),
    `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `points_earned` INT,
    `feedback` TEXT,
    `graded_by` INT,
    `graded_at` TIMESTAMP NULL,
    `status` ENUM('submitted', 'graded', 'late', 'missing') DEFAULT 'submitted',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`assignment_id`) REFERENCES `assignments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`graded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_assignment_student` (`assignment_id`, `student_id`)
) ENGINE=InnoDB;

-- Enhanced announcements table
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    `target_audience` ENUM('all', 'students', 'teachers', 'parents', 'specific_class') DEFAULT 'all',
    `class_id` INT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `expires_at` TIMESTAMP NULL,
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_priority` (`priority`),
    INDEX `idx_target_audience` (`target_audience`),
    INDEX `idx_active_expires` (`is_active`, `expires_at`),
    INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB;

-- Announcement reads table
CREATE TABLE IF NOT EXISTS `announcement_reads` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `announcement_id` INT NOT NULL,
    `user_id` INT NOT NULL,
    `read_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_announcement_user` (`announcement_id`, `user_id`),
    INDEX `idx_user_read` (`user_id`, `read_at`)
) ENGINE=InnoDB;

-- Timetable table
CREATE TABLE IF NOT EXISTS `timetable` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `class_id` INT,
    `subject_id` INT,
    `teacher_id` INT,
    `day_of_week` ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
    `period_number` INT NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `room` VARCHAR(50),
    `academic_year` VARCHAR(9) NOT NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_class_day_period` (`class_id`, `day_of_week`, `period_number`, `academic_year`)
) ENGINE=InnoDB;

-- Teaching materials table
CREATE TABLE IF NOT EXISTS `teaching_materials` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `teacher_id` INT NOT NULL,
    `subject_id` INT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `file_name` VARCHAR(255) NOT NULL,
    `original_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` INT NOT NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `category` ENUM('lesson_plan', 'teaching_material', 'syllabus', 'worksheet', 'assessment', 'other') DEFAULT 'teaching_material',
    `class_level` INT,
    `is_public` BOOLEAN DEFAULT FALSE,
    `download_count` INT DEFAULT 0,
    `tags` JSON,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE SET NULL,
    INDEX `idx_teacher_subject` (`teacher_id`, `subject_id`),
    INDEX `idx_category_level` (`category`, `class_level`)
) ENGINE=InnoDB;

-- Curriculum topics table
CREATE TABLE IF NOT EXISTS `curriculum_topics` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `subject_id` INT NOT NULL,
    `teacher_id` INT NOT NULL,
    `class_id` INT,
    `topic_title` VARCHAR(255) NOT NULL,
    `topic_description` TEXT,
    `estimated_hours` DECIMAL(4,2) DEFAULT 1.0,
    `difficulty_level` ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
    `prerequisites` JSON,
    `learning_objectives` TEXT,
    `resources_needed` TEXT,
    `assessment_methods` TEXT,
    `order_index` INT DEFAULT 0,
    `is_mandatory` BOOLEAN DEFAULT TRUE,
    `academic_year` VARCHAR(9) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
    INDEX `idx_subject_class` (`subject_id`, `class_id`),
    INDEX `idx_teacher_year` (`teacher_id`, `academic_year`)
) ENGINE=InnoDB;

-- Topic progress table
CREATE TABLE IF NOT EXISTS `topic_progress` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `topic_id` INT NOT NULL,
    `teacher_id` INT NOT NULL,
    `class_id` INT,
    `status` ENUM('pending', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
    `start_date` DATE,
    `completion_date` DATE,
    `actual_hours` DECIMAL(4,2),
    `notes` TEXT,
    `student_feedback` TEXT,
    `assessment_score` DECIMAL(5,2),
    `challenges_faced` TEXT,
    `improvements_needed` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`topic_id`) REFERENCES `curriculum_topics`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_topic_teacher_class` (`topic_id`, `teacher_id`, `class_id`),
    INDEX `idx_status_date` (`status`, `completion_date`)
) ENGINE=InnoDB;

-- Subject statistics table
CREATE TABLE IF NOT EXISTS `subject_statistics` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `teacher_id` INT NOT NULL,
    `subject_id` INT NOT NULL,
    `class_id` INT,
    `academic_year` VARCHAR(9) NOT NULL,
    `total_topics` INT DEFAULT 0,
    `completed_topics` INT DEFAULT 0,
    `pending_topics` INT DEFAULT 0,
    `total_materials` INT DEFAULT 0,
    `total_hours_planned` DECIMAL(6,2) DEFAULT 0.0,
    `total_hours_completed` DECIMAL(6,2) DEFAULT 0.0,
    `average_completion_rate` DECIMAL(5,2) DEFAULT 0.0,
    `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE SET NULL,
    UNIQUE KEY `unique_teacher_subject_class_year` (`teacher_id`, `subject_id`, `class_id`, `academic_year`),
    INDEX `idx_teacher_year` (`teacher_id`, `academic_year`)
) ENGINE=InnoDB;

-- Material access logs table
CREATE TABLE IF NOT EXISTS `material_access_logs` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `material_id` INT NOT NULL,
    `accessed_by` INT NOT NULL,
    `access_type` ENUM('view', 'download', 'share') NOT NULL,
    `ip_address` VARCHAR(45),
    `user_agent` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`material_id`) REFERENCES `teaching_materials`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`accessed_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    INDEX `idx_material_date` (`material_id`, `created_at`),
    INDEX `idx_user_date` (`accessed_by`, `created_at`)
) ENGINE=InnoDB;

-- Assessments table
CREATE TABLE IF NOT EXISTS `assessments` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `teacher_id` INT NOT NULL,
    `class_id` INT NOT NULL,
    `subject_id` INT NOT NULL,
    `assessment_name` VARCHAR(255) NOT NULL,
    `exam_type` ENUM('quiz', 'test', 'assignment', 'project', 'homework', 'mid-term exams', 'terminal exams', 'annual exams', 'mock exams', 'practical', 'oral', 'presentation', 'lab_work', 'field_work', 'research', 'other') NOT NULL,
    `academic_year` VARCHAR(9) NOT NULL,
    `assessment_date` DATE NOT NULL,
    `max_marks` INT DEFAULT 100,
    `pass_marks` INT DEFAULT 40,
    `total_marks` INT DEFAULT 100,
    `description` TEXT,
    `duration_minutes` INT DEFAULT 120,
    `status` ENUM('draft', 'published', 'completed', 'closed') DEFAULT 'draft',
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`teacher_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON DELETE CASCADE,
    INDEX `idx_teacher_class_subject` (`teacher_id`, `class_id`, `subject_id`),
    INDEX `idx_academic_year` (`academic_year`),
    INDEX `idx_exam_type` (`exam_type`),
    INDEX `idx_assessment_date` (`assessment_date`)
) ENGINE=InnoDB;

-- Assessment marks table
CREATE TABLE IF NOT EXISTS `assessment_marks` (
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `assessment_id` INT NOT NULL,
    `student_id` INT NOT NULL,
    `marks_obtained` DECIMAL(5,2) DEFAULT 0.00,
    `grade` VARCHAR(2),
    `remarks` TEXT,
    `is_present` BOOLEAN DEFAULT TRUE,
    `marked_by` INT NOT NULL,
    `marked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`marked_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `unique_assessment_student` (`assessment_id`, `student_id`),
    INDEX `idx_assessment_marks` (`assessment_id`),
    INDEX `idx_student_marks` (`student_id`),
    INDEX `idx_grade` (`grade`)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
