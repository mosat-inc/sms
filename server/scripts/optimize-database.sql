-- Database Optimization Script for Production
-- UBUNIFU SEC - School Management System
-- Run this script before production deployment

-- Create essential indexes for performance optimization
-- These indexes will significantly improve query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);

-- Students table indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON students(admission_number);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- Teacher profiles indexes
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_user_id ON teacher_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_employee_id ON teacher_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_teacher_profiles_department ON teacher_profiles(department);

-- Teacher subject assignments indexes
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject ON teacher_subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_class ON teacher_subject_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_composite ON teacher_subject_assignments(teacher_id, subject_id, class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_year ON teacher_subject_assignments(academic_year);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_primary ON teacher_subject_assignments(is_primary_teacher);

-- Classes table indexes
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);
CREATE INDEX IF NOT EXISTS idx_classes_active ON classes(is_active);

-- Subjects table indexes
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
CREATE INDEX IF NOT EXISTS idx_subjects_department ON subjects(department);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);

-- Attendance table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session);
CREATE INDEX IF NOT EXISTS idx_attendance_composite ON attendance(student_id, date, session);

-- Assessments table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_assessments_teacher_id ON assessments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class_id ON assessments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject_id ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessments_year ON assessments(academic_year);
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(exam_type);

-- Assessment marks indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_assessment_marks_assessment_id ON assessment_marks(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_marks_student_id ON assessment_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_marks_composite ON assessment_marks(assessment_id, student_id);

-- OTP codes table indexes
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_codes_type ON otp_codes(type);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON otp_codes(used);

-- Academic years indexes
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(is_current);
CREATE INDEX IF NOT EXISTS idx_academic_years_active ON academic_years(is_active);

-- Fee payments indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_year ON fee_payments(academic_year);

-- Announcements indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_announcements_target ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON announcements(expires_at);

-- Teaching materials indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_teaching_materials_teacher_id ON teaching_materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teaching_materials_subject_id ON teaching_materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_teaching_materials_category ON teaching_materials(category);
CREATE INDEX IF NOT EXISTS idx_teaching_materials_level ON teaching_materials(class_level);

-- Optimize table statistics
ANALYZE TABLE users;
ANALYZE TABLE students;
ANALYZE TABLE teacher_profiles;
ANALYZE TABLE teacher_subject_assignments;
ANALYZE TABLE classes;
ANALYZE TABLE subjects;
ANALYZE TABLE otp_codes;

-- Clean up old data (optional - be careful in production)
-- Remove expired OTP codes older than 1 day
DELETE FROM otp_codes WHERE expires_at < DATE_SUB(NOW(), INTERVAL 1 DAY);

-- Show index status
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    CARDINALITY
FROM 
    information_schema.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN (
        'users', 'students', 'teacher_profiles', 'teacher_subject_assignments', 
        'classes', 'subjects', 'attendance', 'assessments', 'assessment_marks'
    )
ORDER BY 
    TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
