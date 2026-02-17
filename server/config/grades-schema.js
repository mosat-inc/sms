const mysql = require('mysql2/promise');
const { pool } = require('./database');

// Initialize grades-related database tables
const initializeGradesSchema = async () => {
    try {
        const connection = await pool.getConnection();
        
        // Create grading_scales table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS grading_scales (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                min_grade DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                max_grade DECIMAL(5,2) NOT NULL DEFAULT 100.00,
                passing_grade DECIMAL(5,2) NOT NULL DEFAULT 50.00,
                is_percentage BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE,
                academic_year VARCHAR(9) NOT NULL,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_academic_year (academic_year),
                INDEX idx_is_default (is_default)
            )
        `);
        
        // Create grading_scale_levels table (A, B, C, D, F grades)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS grading_scale_levels (
                id INT PRIMARY KEY AUTO_INCREMENT,
                grading_scale_id INT NOT NULL,
                letter_grade VARCHAR(5) NOT NULL,
                min_percentage DECIMAL(5,2) NOT NULL,
                max_percentage DECIMAL(5,2) NOT NULL,
                grade_points DECIMAL(3,2) DEFAULT NULL,
                description VARCHAR(100),
                color_code VARCHAR(7) DEFAULT '#666666',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id) ON DELETE CASCADE,
                INDEX idx_scale_percentage (grading_scale_id, min_percentage, max_percentage)
            )
        `);
        
        // Create assessments table (tests, assignments, projects, etc.)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS assessments (
                id INT PRIMARY KEY AUTO_INCREMENT,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                subject_id INT NOT NULL,
                class_id INT NOT NULL,
                teacher_id INT NOT NULL,
                assessment_type ENUM('test', 'exam', 'assignment', 'project', 'quiz', 'practical', 'other') NOT NULL,
                total_marks DECIMAL(6,2) NOT NULL,
                passing_marks DECIMAL(6,2),
                weight_percentage DECIMAL(5,2) DEFAULT 100.00,
                due_date DATE,
                assessment_date DATE,
                grading_scale_id INT,
                instructions TEXT,
                is_published BOOLEAN DEFAULT FALSE,
                is_final BOOLEAN DEFAULT FALSE,
                term ENUM('term1', 'term2', 'term3', 'annual') DEFAULT 'term1',
                academic_year VARCHAR(9) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id) ON DELETE SET NULL,
                INDEX idx_subject_class (subject_id, class_id),
                INDEX idx_teacher_year (teacher_id, academic_year),
                INDEX idx_assessment_date (assessment_date),
                INDEX idx_published (is_published)
            )
        `);
        
        // Create student_grades table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS student_grades (
                id INT PRIMARY KEY AUTO_INCREMENT,
                assessment_id INT NOT NULL,
                student_id INT NOT NULL,
                marks_obtained DECIMAL(6,2),
                percentage DECIMAL(5,2),
                letter_grade VARCHAR(5),
                grade_points DECIMAL(3,2),
                remarks TEXT,
                is_absent BOOLEAN DEFAULT FALSE,
                is_excused BOOLEAN DEFAULT FALSE,
                submission_status ENUM('submitted', 'late', 'missing', 'excused') DEFAULT 'submitted',
                graded_by INT,
                graded_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
                UNIQUE KEY unique_student_assessment (assessment_id, student_id),
                INDEX idx_student_grades (student_id, assessment_id),
                INDEX idx_assessment_performance (assessment_id, percentage),
                INDEX idx_student_performance (student_id, percentage)
            )
        `);
        
        // Create grade_reports table (consolidated reports)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS grade_reports (
                id INT PRIMARY KEY AUTO_INCREMENT,
                student_id INT NOT NULL,
                subject_id INT NOT NULL,
                class_id INT NOT NULL,
                teacher_id INT NOT NULL,
                term ENUM('term1', 'term2', 'term3', 'annual') NOT NULL,
                academic_year VARCHAR(9) NOT NULL,
                total_assessments INT DEFAULT 0,
                completed_assessments INT DEFAULT 0,
                average_marks DECIMAL(6,2),
                average_percentage DECIMAL(5,2),
                overall_grade VARCHAR(5),
                grade_points DECIMAL(3,2),
                class_rank INT,
                total_students INT,
                attendance_percentage DECIMAL(5,2),
                teacher_comments TEXT,
                strengths TEXT,
                areas_for_improvement TEXT,
                recommendations TEXT,
                parent_signature_required BOOLEAN DEFAULT TRUE,
                is_published BOOLEAN DEFAULT FALSE,
                published_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_report (student_id, subject_id, term, academic_year),
                INDEX idx_class_term (class_id, term, academic_year),
                INDEX idx_student_year (student_id, academic_year),
                INDEX idx_subject_performance (subject_id, average_percentage),
                INDEX idx_published (is_published)
            )
        `);
        
        // Create grade_analytics table (for performance tracking)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS grade_analytics (
                id INT PRIMARY KEY AUTO_INCREMENT,
                subject_id INT NOT NULL,
                class_id INT NOT NULL,
                teacher_id INT NOT NULL,
                assessment_id INT,
                term ENUM('term1', 'term2', 'term3', 'annual') NOT NULL,
                academic_year VARCHAR(9) NOT NULL,
                total_students INT DEFAULT 0,
                students_graded INT DEFAULT 0,
                highest_marks DECIMAL(6,2),
                lowest_marks DECIMAL(6,2),
                average_marks DECIMAL(6,2),
                median_marks DECIMAL(6,2),
                class_average_percentage DECIMAL(5,2),
                pass_rate DECIMAL(5,2),
                grade_distribution JSON,
                performance_trends JSON,
                last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
                FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
                UNIQUE KEY unique_analytics (subject_id, class_id, assessment_id, term, academic_year),
                INDEX idx_class_performance (class_id, term, academic_year),
                INDEX idx_subject_trends (subject_id, academic_year)
            )
        `);
        
        // Create grade_comments_bank table (predefined comments)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS grade_comments_bank (
                id INT PRIMARY KEY AUTO_INCREMENT,
                category ENUM('excellent', 'good', 'satisfactory', 'needs_improvement', 'poor', 'general') NOT NULL,
                comment_text TEXT NOT NULL,
                subject_specific BOOLEAN DEFAULT FALSE,
                subject_id INT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                usage_count INT DEFAULT 0,
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_category_subject (category, subject_id),
                INDEX idx_active_usage (is_active, usage_count)
            )
        `);
        
        connection.release();
        
        // Insert default grading scale
        await insertDefaultGradingScale();
        
        // Insert default comment bank
        await insertDefaultComments();
        
        console.log('✅ Grades management schema created successfully');
        
    } catch (error) {
        console.error('❌ Failed to create grades schema:', error);
        throw error;
    }
};

// Insert default grading scale
const insertDefaultGradingScale = async () => {
    try {
        const [existingScale] = await pool.execute('SELECT id FROM grading_scales WHERE is_default = TRUE LIMIT 1');
        
        if (existingScale.length === 0) {
            const [scaleResult] = await pool.execute(`
                INSERT INTO grading_scales (name, description, min_grade, max_grade, passing_grade, is_percentage, is_default, academic_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'Standard Percentage Scale',
                'Default grading scale using percentages (0-100%)',
                0.00,
                100.00,
                50.00,
                true,
                true,
                '2024-2025'
            ]);
            
            const scaleId = scaleResult.insertId;
            
            // Insert grade levels
            const gradeLevels = [
                ['A+', 95.00, 100.00, 4.00, 'Excellent', '#28a745'],
                ['A', 90.00, 94.99, 4.00, 'Very Good', '#198754'],
                ['A-', 85.00, 89.99, 3.67, 'Good', '#20c997'],
                ['B+', 80.00, 84.99, 3.33, 'Above Average', '#17a2b8'],
                ['B', 75.00, 79.99, 3.00, 'Average', '#6c757d'],
                ['B-', 70.00, 74.99, 2.67, 'Below Average', '#fd7e14'],
                ['C+', 65.00, 69.99, 2.33, 'Fair', '#ffc107'],
                ['C', 60.00, 64.99, 2.00, 'Satisfactory', '#e0a800'],
                ['C-', 55.00, 59.99, 1.67, 'Needs Improvement', '#f39c12'],
                ['D', 50.00, 54.99, 1.00, 'Poor', '#dc3545'],
                ['F', 0.00, 49.99, 0.00, 'Fail', '#721c24']
            ];
            
            for (const [letter, min, max, points, desc, color] of gradeLevels) {
                await pool.execute(`
                    INSERT INTO grading_scale_levels (grading_scale_id, letter_grade, min_percentage, max_percentage, grade_points, description, color_code)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [scaleId, letter, min, max, points, desc, color]);
            }
            
            console.log('✅ Default grading scale created');
        }
    } catch (error) {
        console.error('❌ Failed to create default grading scale:', error);
    }
};

// Insert default comments
const insertDefaultComments = async () => {
    try {
        const [existingComments] = await pool.execute('SELECT COUNT(*) as count FROM grade_comments_bank');
        
        if (existingComments[0].count === 0) {
            const comments = [
                ['excellent', 'Outstanding performance! Demonstrates exceptional understanding and mastery of the subject.'],
                ['excellent', 'Excellent work with creative problem-solving approaches. Shows deep analytical thinking.'],
                ['excellent', 'Consistently produces high-quality work that exceeds expectations.'],
                ['good', 'Good understanding of the concepts with minor areas for improvement.'],
                ['good', 'Shows solid grasp of the material and applies knowledge effectively.'],
                ['good', 'Well-prepared and participates actively in class discussions.'],
                ['satisfactory', 'Satisfactory performance with adequate understanding of basic concepts.'],
                ['satisfactory', 'Meets minimum requirements but could benefit from additional practice.'],
                ['satisfactory', 'Shows improvement over time with consistent effort.'],
                ['needs_improvement', 'Needs to focus more on understanding fundamental concepts.'],
                ['needs_improvement', 'Would benefit from additional support and extra practice.'],
                ['needs_improvement', 'Shows potential but requires more consistent effort and study habits.'],
                ['poor', 'Significant improvement needed in understanding basic concepts.'],
                ['poor', 'Missing assignments and poor test performance indicate need for intervention.'],
                ['poor', 'Requires immediate attention and additional support to catch up.'],
                ['general', 'Please continue practicing regularly to maintain progress.'],
                ['general', 'Consider seeking extra help during office hours.'],
                ['general', 'Parent conference recommended to discuss academic progress.']
            ];
            
            for (const [category, text] of comments) {
                await pool.execute(`
                    INSERT INTO grade_comments_bank (category, comment_text, subject_specific, is_active)
                    VALUES (?, ?, ?, ?)
                `, [category, text, false, true]);
            }
            
            console.log('✅ Default comment bank created');
        }
    } catch (error) {
        console.error('❌ Failed to create comment bank:', error);
    }
};

// Function to calculate letter grade from percentage
const calculateLetterGrade = async (percentage, gradingScaleId = null) => {
    try {
        let scaleId = gradingScaleId;
        
        if (!scaleId) {
            const [defaultScale] = await pool.execute('SELECT id FROM grading_scales WHERE is_default = TRUE LIMIT 1');
            scaleId = defaultScale[0]?.id;
        }
        
        if (!scaleId) return { letter_grade: 'N/A', grade_points: 0.00 };
        
        const [levels] = await pool.execute(`
            SELECT letter_grade, grade_points 
            FROM grading_scale_levels 
            WHERE grading_scale_id = ? AND ? >= min_percentage AND ? <= max_percentage
            ORDER BY min_percentage DESC
            LIMIT 1
        `, [scaleId, percentage, percentage]);
        
        return levels[0] || { letter_grade: 'N/A', grade_points: 0.00 };
        
    } catch (error) {
        console.error('Error calculating letter grade:', error);
        return { letter_grade: 'N/A', grade_points: 0.00 };
    }
};

// Function to update grade analytics
const updateGradeAnalytics = async (assessmentId, subjectId, classId, teacherId, term, academicYear) => {
    try {
        // Get all grades for this assessment
        const [grades] = await pool.execute(`
            SELECT sg.marks_obtained, sg.percentage, a.total_marks, a.passing_marks
            FROM student_grades sg
            INNER JOIN assessments a ON sg.assessment_id = a.id
            WHERE sg.assessment_id = ? AND sg.is_absent = FALSE
            ORDER BY sg.percentage DESC
        `, [assessmentId]);
        
        if (grades.length === 0) return;
        
        const totalStudents = grades.length;
        const studentMarks = grades.map(g => parseFloat(g.marks_obtained || 0));
        const studentPercentages = grades.map(g => parseFloat(g.percentage || 0));
        
        const highestMarks = Math.max(...studentMarks);
        const lowestMarks = Math.min(...studentMarks);
        const averageMarks = studentMarks.reduce((sum, mark) => sum + mark, 0) / totalStudents;
        
        // Calculate median
        const sortedPercentages = [...studentPercentages].sort((a, b) => a - b);
        const median = totalStudents % 2 === 0 
            ? (sortedPercentages[totalStudents/2 - 1] + sortedPercentages[totalStudents/2]) / 2
            : sortedPercentages[Math.floor(totalStudents/2)];
        
        const averagePercentage = studentPercentages.reduce((sum, pct) => sum + pct, 0) / totalStudents;
        
        // Calculate pass rate
        const passingGrades = grades.filter(g => g.percentage >= (g.passing_marks || 50));
        const passRate = (passingGrades.length / totalStudents) * 100;
        
        // Calculate grade distribution
        const gradeDistribution = {};
        for (const grade of grades) {
            const letterGrade = await calculateLetterGrade(grade.percentage);
            gradeDistribution[letterGrade.letter_grade] = (gradeDistribution[letterGrade.letter_grade] || 0) + 1;
        }
        
        // Update analytics
        await pool.execute(`
            INSERT INTO grade_analytics 
            (subject_id, class_id, teacher_id, assessment_id, term, academic_year, total_students, students_graded,
             highest_marks, lowest_marks, average_marks, median_marks, class_average_percentage, pass_rate, grade_distribution)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            students_graded = VALUES(students_graded),
            highest_marks = VALUES(highest_marks),
            lowest_marks = VALUES(lowest_marks),
            average_marks = VALUES(average_marks),
            median_marks = VALUES(median_marks),
            class_average_percentage = VALUES(class_average_percentage),
            pass_rate = VALUES(pass_rate),
            grade_distribution = VALUES(grade_distribution),
            last_calculated = CURRENT_TIMESTAMP
        `, [
            subjectId, classId, teacherId, assessmentId, term, academicYear,
            totalStudents, totalStudents, highestMarks, lowestMarks, averageMarks,
            median, averagePercentage, passRate, JSON.stringify(gradeDistribution)
        ]);
        
        console.log(`✅ Grade analytics updated for assessment ${assessmentId}`);
        
    } catch (error) {
        console.error('Error updating grade analytics:', error);
    }
};

module.exports = {
    initializeGradesSchema,
    calculateLetterGrade,
    updateGradeAnalytics
};
