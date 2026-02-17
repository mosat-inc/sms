-- UBUNIFU SEC School Management System Sample Data
-- This script inserts sample data matching the existing project structure

USE `sms_database`;

-- Insert default admin user
INSERT IGNORE INTO `users` (
    `username`, `email`, `password`, `role`, `first_name`, `last_name`, 
    `firstName`, `lastName`, `phone`, `is_active`
) VALUES (
    'admin', 
    'admin@ubunifusec.com', 
    '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', -- admin123
    'admin', 
    'System', 
    'Administrator', 
    'System', 
    'Administrator', 
    '+255123456789', 
    TRUE
);

-- Insert sample classes
INSERT IGNORE INTO `classes` (`name`, `level`, `academic_year`) VALUES
-- Form 1 classes
('Form 1A', 1, '2024-2025'),
('Form 1B', 1, '2024-2025'),
('Form 1C', 1, '2024-2025'),
('Form 1D', 1, '2024-2025'),

-- Form 2 classes  
('Form 2A', 2, '2024-2025'),
('Form 2B', 2, '2024-2025'),
('Form 2C', 2, '2024-2025'),
('Form 2D', 2, '2024-2025'),

-- Form 3 classes
('Form 3A', 3, '2024-2025'),
('Form 3B', 3, '2024-2025'),
('Form 3C', 3, '2024-2025'),
('Form 3D', 3, '2024-2025'),

-- Form 4 classes
('Form 4A', 4, '2024-2025'),
('Form 4B', 4, '2024-2025'),
('Form 4C', 4, '2024-2025'),
('Form 4D', 4, '2024-2025');

-- Insert sample subjects
INSERT IGNORE INTO `subjects` (`name`, `code`, `description`, `department`) VALUES
('Mathematics', 'MATH', 'Mathematics and Statistics', 'Science Department'),
('Physics', 'PHYS', 'Physics and Applied Mathematics', 'Science Department'),
('Chemistry', 'CHEM', 'Chemistry and Laboratory Sciences', 'Science Department'),
('Biology', 'BIO', 'Biology and Life Sciences', 'Science Department'),
('English', 'ENG', 'English Language and Literature', 'Arts Department'),
('Kiswahili', 'KIS', 'Kiswahili Language and Literature', 'Arts Department'),
('History', 'HIST', 'History and Government', 'Arts Department'),
('Geography', 'GEO', 'Geography and Environmental Studies', 'Arts Department'),
('Computer Science', 'CS', 'Computer Studies and ICT', 'Technical Department'),
('Business Studies', 'BUS', 'Business Studies and Entrepreneurship', 'Commercial Department'),
('Book Keeping', 'BK', 'Book Keeping and Accounting', 'Commercial Department'),
('Physical Education', 'PE', 'Physical Education and Sports', 'General Department');

-- Insert sample academic years
INSERT IGNORE INTO `academic_years` (`year_name`, `start_date`, `end_date`, `is_current`, `is_active`) VALUES
('2023-2024', '2023-09-01', '2024-06-30', FALSE, TRUE),
('2024-2025', '2024-09-01', '2025-06-30', TRUE, TRUE),
('2025-2026', '2025-09-01', '2026-06-30', FALSE, TRUE);

-- Insert sample teacher (Mohamed from your existing data)
INSERT IGNORE INTO `users` (
    `username`, `email`, `password`, `role`, `first_name`, `last_name`, 
    `firstName`, `lastName`, `phone`, `department`, `is_active`
) VALUES (
    'mohamedi.shango', 
    'mohamed@ubunifusec.com', 
    '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', -- teacher123
    'teacher', 
    'mohamedi', 
    'shango', 
    'mohamedi', 
    'shango', 
    '+255123456780', 
    'Science Department', 
    TRUE
);

-- Get the teacher ID for assignments
SET @teacher_id = (SELECT id FROM users WHERE username = 'mohamedi.shango' LIMIT 1);

-- Insert teacher subject assignments (matching your existing data)
INSERT IGNORE INTO `teacher_subject_assignments` (`teacher_id`, `subject_id`, `class_id`, `academic_year`, `is_primary_teacher`) VALUES
(@teacher_id, 1, 1, '2024-2025', TRUE),  -- Mathematics to Form 1A
(@teacher_id, 2, 1, '2024-2025', FALSE), -- Physics to Form 1A  
(@teacher_id, 3, 1, '2024-2025', FALSE), -- Chemistry to Form 1A
(@teacher_id, 1, 6, '2024-2025', FALSE), -- Mathematics to Form 2B
(@teacher_id, 2, 6, '2024-2025', FALSE), -- Physics to Form 2B
(@teacher_id, 3, 6, '2024-2025', FALSE), -- Chemistry to Form 2B
(@teacher_id, 1, 9, '2024-2025', TRUE),  -- Mathematics to Form 3A
(@teacher_id, 2, 9, '2024-2025', FALSE), -- Physics to Form 3A
(@teacher_id, 3, 9, '2024-2025', FALSE); -- Chemistry to Form 3A

-- Insert sample students (matching your existing data structure)
INSERT IGNORE INTO `users` (
    `username`, `email`, `password`, `role`, `first_name`, `last_name`, 
    `firstName`, `lastName`, `phone`, `is_active`
) VALUES
('student001', 'john.doe@student.com', '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', 'student', 'John', 'Doe', 'John', 'Doe', '+255787654321', TRUE),
('student002', 'jane.smith@student.com', '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', 'student', 'Jane', 'Smith', 'Jane', 'Smith', '+255787654322', TRUE),
('student003', 'peter.jones@student.com', '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', 'student', 'Peter', 'Jones', 'Peter', 'Jones', '+255787654323', TRUE),
('student004', 'mary.wilson@student.com', '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', 'student', 'Mary', 'Wilson', 'Mary', 'Wilson', '+255787654324', TRUE),
('student005', 'david.brown@student.com', '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', 'student', 'David', 'Brown', 'David', 'Brown', '+255787654325', TRUE),
('student006', 'sarah.davis@student.com', '$2b$12$LQv3c1yqBwWUQdsOvWzMde.dclEKjwEvbvHGMKbXZ8XNJw1E7PUpG', 'student', 'Sarah', 'Davis', 'Sarah', 'Davis', '+255787654326', TRUE);

-- Insert student records
INSERT IGNORE INTO `students` (
    `user_id`, `student_id`, `class_id`, `admission_number`, `date_of_birth`, 
    `gender`, `nationality`, `admission_date`, `status`
) VALUES
((SELECT id FROM users WHERE username = 'student001'), 'STD0001', 1, 'ADM2024001', '2008-05-15', 'Male', 'Tanzanian', '2024-01-15', 'active'),
((SELECT id FROM users WHERE username = 'student002'), 'STD0002', 1, 'ADM2024002', '2008-03-22', 'Female', 'Tanzanian', '2024-01-15', 'active'),
((SELECT id FROM users WHERE username = 'student003'), 'STD0003', 1, 'ADM2024003', '2008-07-10', 'Male', 'Tanzanian', '2024-01-15', 'active'),
((SELECT id FROM users WHERE username = 'student004'), 'STD0004', 1, 'ADM2024004', '2008-11-05', 'Female', 'Tanzanian', '2024-01-15', 'active'),
((SELECT id FROM users WHERE username = 'student005'), 'STD0005', 1, 'ADM2024005', '2008-09-18', 'Male', 'Tanzanian', '2024-01-15', 'active'),
((SELECT id FROM users WHERE username = 'student006'), 'STD0006', 9, 'ADM2024006', '2006-04-12', 'Female', 'Tanzanian', '2022-01-15', 'active');

-- Insert sample attendance data (matching your existing data showing 87.5% for Form 1A)
INSERT IGNORE INTO `attendance` (`student_id`, `class_id`, `date`, `session`, `status`, `marked_by`, `notes`) VALUES
-- Form 1A attendance (5 students, 2 days, 2 sessions each = 20 total records)
-- Day 1 - Morning session  
(1, 1, '2024-12-08', 'morning', 'present', @teacher_id, NULL),
(2, 1, '2024-12-08', 'morning', 'present', @teacher_id, NULL), 
(3, 1, '2024-12-08', 'morning', 'late', @teacher_id, 'Arrived 15 minutes late'),
(4, 1, '2024-12-08', 'morning', 'present', @teacher_id, NULL),
(5, 1, '2024-12-08', 'morning', 'present', @teacher_id, NULL),

-- Day 1 - Afternoon session
(1, 1, '2024-12-08', 'afternoon', 'present', @teacher_id, NULL),
(2, 1, '2024-12-08', 'afternoon', 'absent', @teacher_id, 'Sick leave'),
(3, 1, '2024-12-08', 'afternoon', 'present', @teacher_id, NULL),
(4, 1, '2024-12-08', 'afternoon', 'present', @teacher_id, NULL),
(5, 1, '2024-12-08', 'afternoon', 'present', @teacher_id, NULL),

-- Day 2 - Morning session
(1, 1, '2024-12-09', 'morning', 'present', @teacher_id, NULL),
(2, 1, '2024-12-09', 'morning', 'present', @teacher_id, NULL),
(3, 1, '2024-12-09', 'morning', 'present', @teacher_id, NULL),
(4, 1, '2024-12-09', 'morning', 'late', @teacher_id, 'Traffic delay'),
(5, 1, '2024-12-09', 'morning', 'absent', @teacher_id, 'Family emergency'),

-- Day 2 - Afternoon session  
(1, 1, '2024-12-09', 'afternoon', 'present', @teacher_id, NULL),
(2, 1, '2024-12-09', 'afternoon', 'present', @teacher_id, NULL),
(3, 1, '2024-12-09', 'afternoon', 'present', @teacher_id, NULL),
(4, 1, '2024-12-09', 'afternoon', 'present', @teacher_id, NULL),
(5, 1, '2024-12-09', 'afternoon', 'present', @teacher_id, NULL);

-- Insert sample curriculum topics
INSERT IGNORE INTO `curriculum_topics` (
    `subject_id`, `teacher_id`, `class_id`, `topic_title`, `topic_description`, 
    `estimated_hours`, `difficulty_level`, `learning_objectives`, `resources_needed`, 
    `assessment_methods`, `order_index`, `is_mandatory`, `academic_year`
) VALUES
(1, @teacher_id, 1, 'Introduction to Algebra', 'Basic algebraic concepts and operations', 3.0, 'beginner', 'Understand basic algebraic expressions and equations', 'Textbook, calculator', 'Quiz and homework', 1, TRUE, '2024-2025'),
(1, @teacher_id, 1, 'Linear Equations', 'Solving linear equations in one and two variables', 4.0, 'intermediate', 'Solve linear equations and systems', 'Textbook, graphing paper', 'Test and assignments', 2, TRUE, '2024-2025'),
(1, @teacher_id, 1, 'Quadratic Equations', 'Quadratic equations and their solutions', 5.0, 'intermediate', 'Solve quadratic equations using various methods', 'Textbook, calculator', 'Exam and projects', 3, TRUE, '2024-2025'),
(2, @teacher_id, 9, 'Mechanics Fundamentals', 'Basic concepts of motion and forces', 4.0, 'beginner', 'Understand Newton''s laws of motion', 'Lab equipment, textbook', 'Lab reports and tests', 1, TRUE, '2024-2025'),
(2, @teacher_id, 9, 'Energy and Work', 'Concepts of kinetic and potential energy', 3.5, 'intermediate', 'Calculate work and energy in physical systems', 'Lab equipment, calculator', 'Lab work and quiz', 2, TRUE, '2024-2025');

-- Insert sample announcements
INSERT IGNORE INTO `announcements` (
    `title`, `content`, `priority`, `target_audience`, `class_id`, `created_by`, `expires_at`
) VALUES
('Welcome to New Academic Year', 'Welcome to the 2024-2025 academic year. We look forward to an excellent year of learning and growth.', 'high', 'all', NULL, 1, '2025-01-31 23:59:59'),
('Mathematics Competition', 'Annual mathematics competition will be held next month. Interested students should register with their class teachers.', 'medium', 'students', NULL, @teacher_id, '2025-02-15 23:59:59'),
('Parent Meeting - Form 1A', 'Parents of Form 1A students are invited to a meeting to discuss academic progress.', 'medium', 'parents', 1, @teacher_id, '2024-12-31 23:59:59');

-- Create indexes for better performance
CREATE INDEX `idx_users_role` ON `users`(`role`);
CREATE INDEX `idx_users_email` ON `users`(`email`);
CREATE INDEX `idx_users_active` ON `users`(`is_active`);
CREATE INDEX `idx_classes_level` ON `classes`(`level`);
CREATE INDEX `idx_classes_academic_year` ON `classes`(`academic_year`);
CREATE INDEX `idx_students_class_id` ON `students`(`class_id`);
CREATE INDEX `idx_students_status` ON `students`(`status`);
CREATE INDEX `idx_attendance_date` ON `attendance`(`date`);
CREATE INDEX `idx_attendance_status` ON `attendance`(`status`);
CREATE INDEX `idx_subjects_code` ON `subjects`(`code`);
CREATE INDEX `idx_teacher_assignments_teacher` ON `teacher_subject_assignments`(`teacher_id`);
CREATE INDEX `idx_teacher_assignments_class` ON `teacher_subject_assignments`(`class_id`);
CREATE INDEX `idx_teacher_assignments_subject` ON `teacher_subject_assignments`(`subject_id`);
