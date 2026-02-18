const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const { authenticateToken } = Auth;

// Helper function to execute queries
const executeQuery = async (query, params = []) => {
  const connection = await pool.getConnection();
  try {
    let rows;
    if (params.length > 0) {
      [rows] = await connection.execute(query, params);
    } else {
      [rows] = await connection.query(query);
    }
    return { rows };
  } finally {
    connection.release();
  }
};

// Helper function to format date for MySQL DATE column
const formatDateForMySQL = (dateValue) => {
  if (!dateValue || dateValue === '' || dateValue === null || dateValue === undefined) {
    return null;
  }
  
  try {
    // Handle both string and Date object inputs
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Convert to MySQL DATE format (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Date formatting error:', error);
    return null;
  }
};

// Get all teachers with profiles and assignments
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view teacher list'
      });
    }

    const { page = 1, limit = 10, search = '', department = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    let whereConditions = ["u.role = 'teacher'"];
    let queryParams = [];

    // Search filter
    if (search) {
      whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR tp.employee_id LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Department filter
    if (department) {
      whereConditions.push('(u.department = ? OR tp.department = ?)');
      queryParams.push(department, department);
    }

    // Status filter
    if (status) {
      whereConditions.push('u.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Build the complete query string with WHERE clause embedded
    const query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.address,
        u.department,
        u.status,
        u.is_active,
        u.created_at,
        u.updated_at,
        tp.employee_id,
        tp.position,
        tp.qualification,
        tp.experience_years,
        (
          SELECT c1.id
          FROM classes c1
          WHERE c1.class_teacher_id = u.id
          ORDER BY c1.level, c1.name
          LIMIT 1
        ) as class_teacher_for_class_id,
        (
          SELECT c2.name
          FROM classes c2
          WHERE c2.class_teacher_id = u.id
          ORDER BY c2.level, c2.name
          LIMIT 1
        ) as class_teacher_for_class_name,
        0 as classes_assigned,
        0 as subjects_taught,
        NULL as class_names,
        NULL as subject_names
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      ${whereClause}
      ORDER BY u.first_name, u.last_name
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `;

    const result = await executeQuery(query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      ${whereClause}
    `;
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult.rows[0]?.total || 0;

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers',
      error: error.message
    });
  }
});

// Get single teacher by ID with detailed information
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or the teacher themselves
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { id } = req.params;

    // Get teacher basic information
    const teacherQuery = `
      SELECT 
        u.*,
        tp.employee_id,
        tp.department as profile_department,
        tp.position,
        tp.qualification,
        tp.specialization,
        tp.experience_years,
        tp.joining_date,
        tp.salary,
        tp.bio,
        (
          SELECT c.id
          FROM classes c
          WHERE c.class_teacher_id = u.id
          ORDER BY c.level, c.name
          LIMIT 1
        ) as class_teacher_for_class_id,
        (
          SELECT c.name
          FROM classes c
          WHERE c.class_teacher_id = u.id
          ORDER BY c.level, c.name
          LIMIT 1
        ) as class_teacher_for_class_name
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.id = ? AND u.role = 'teacher'
    `;

    const teacherResult = await executeQuery(teacherQuery, [id]);
    
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const teacher = teacherResult.rows[0];

    // Get teacher's subject assignments
    const assignmentsQuery = `
      SELECT 
        tsa.*,
        s.name as subject_name,
        s.code as subject_code,
        c.name as class_name,
        c.level as class_level,
        tsa.is_primary_teacher
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON tsa.subject_id = s.id
      JOIN classes c ON tsa.class_id = c.id
      WHERE tsa.teacher_id = ?
      ORDER BY s.name, c.name
    `;

    const assignmentsResult = await executeQuery(assignmentsQuery, [id]);

    // Get teacher's statistics
    const statsQuery = `
      SELECT 
        COALESCE(assignment_stats.total_classes, 0) as total_classes,
        COALESCE(assignment_stats.total_subjects, 0) as total_subjects,
        COALESCE(assignment_stats.primary_classes, 0) as primary_classes,
        COALESCE(assessment_stats.total_assessments, 0) as total_assessments,
        COALESCE(material_stats.teaching_materials, 0) as teaching_materials,
        COALESCE(curriculum_stats.curriculum_topics, 0) as curriculum_topics,
        COALESCE(student_stats.total_students, 0) as total_students,
        COALESCE(school_stats.total_school_students, 0) as total_school_students
      FROM (
        SELECT 
          COUNT(DISTINCT tsa.class_id) as total_classes,
          COUNT(DISTINCT tsa.subject_id) as total_subjects,
          COUNT(DISTINCT CASE WHEN tsa.is_primary_teacher = TRUE THEN tsa.class_id END) as primary_classes
        FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = ?
      ) as assignment_stats
      LEFT JOIN (
        SELECT COUNT(DISTINCT a.id) as total_assessments
        FROM assessments a
        WHERE a.teacher_id = ?
      ) as assessment_stats ON 1=1
      LEFT JOIN (
        SELECT COUNT(DISTINCT tm.id) as teaching_materials
        FROM teaching_materials tm
        WHERE tm.teacher_id = ?
      ) as material_stats ON 1=1
      LEFT JOIN (
        SELECT COUNT(DISTINCT ct.id) as curriculum_topics
        FROM curriculum_topics ct
        WHERE ct.teacher_id = ?
      ) as curriculum_stats ON 1=1
      LEFT JOIN (
        SELECT COUNT(DISTINCT s.id) as total_students
        FROM students s
        JOIN teacher_subject_assignments tsa ON s.class_id = tsa.class_id
        WHERE tsa.teacher_id = ? AND s.status = 'active'
      ) as student_stats ON 1=1
      LEFT JOIN (
        SELECT COUNT(*) as total_school_students
        FROM students
        WHERE status = 'active'
      ) as school_stats ON 1=1
    `;

    const statsResult = await executeQuery(statsQuery, [id, id, id, id, id]);
    
    console.log(`🔍 TEACHER STATS DEBUG (ID: ${id}):`, {
      queryResult: statsResult.rows[0],
      rawStats: JSON.stringify(statsResult.rows[0], null, 2)
    });

    res.json({
      success: true,
      data: {
        ...teacher,
        assignments: assignmentsResult.rows,
        statistics: statsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher details',
      error: error.message
    });
  }
});

// Create new teacher
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create teachers'
      });
    }

    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone,
      address,
      department,
      employee_id,
      position,
      qualification,
      specialization,
      experience_years,
      joining_date,
      salary,
      bio,
      class_teacher_for_class_id
    } = req.body;

    // Validate required fields
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, first name, and last name are required'
      });
    }

    // Check if username or email already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert user
      const [userResult] = await connection.execute(`
        INSERT INTO users (
          username, email, password, role, first_name, last_name, 
          firstName, lastName, phone, address, department, status, is_active
        ) VALUES (?, ?, ?, 'teacher', ?, ?, ?, ?, ?, ?, ?, 'active', TRUE)
      `, [
        username, email, hashedPassword, first_name, last_name,
        first_name, last_name, phone, address, department
      ]);

      const userId = userResult.insertId;

      // Insert teacher profile if additional data provided
      if (employee_id || position || qualification || specialization || experience_years || joining_date || salary || bio) {
        // Process numeric values to handle empty strings
        const processedExperienceYears = experience_years === '' || experience_years === undefined || experience_years === null ? 0 : parseInt(experience_years) || 0;
        const processedSalary = salary === '' || salary === undefined || salary === null ? 0 : parseFloat(salary) || 0;
        const processedJoiningDate = formatDateForMySQL(joining_date);
        
        await connection.execute(`
          INSERT INTO teacher_profiles (
            user_id, employee_id, department, position, qualification,
            specialization, experience_years, joining_date, salary, bio
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, employee_id, department, position, qualification,
          specialization, processedExperienceYears, processedJoiningDate, processedSalary, bio
        ]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Teacher created successfully',
        data: { id: userId }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher',
      error: error.message
    });
  }
});

// Update teacher
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update teachers'
      });
    }

    const { id } = req.params;
    const {
      username,
      email,
      first_name,
      last_name,
      phone,
      address,
      department,
      status,
      employee_id,
      position,
      qualification,
      specialization,
      experience_years,
      joining_date,
      salary,
      bio
    } = req.body;

    // Check if teacher exists
    const teacherExists = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "teacher"',
      [id]
    );

    if (teacherExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check if username or email already exists for other users
    if (username || email) {
      const existingUser = await executeQuery(
        'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username || '', email || '', id]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update user table
      const userFields = [];
      const userParams = [];

      if (username) { userFields.push('username = ?'); userParams.push(username); }
      if (email) { userFields.push('email = ?'); userParams.push(email); }
      if (first_name) { userFields.push('first_name = ?, firstName = ?'); userParams.push(first_name, first_name); }
      if (last_name) { userFields.push('last_name = ?, lastName = ?'); userParams.push(last_name, last_name); }
      if (phone) { userFields.push('phone = ?'); userParams.push(phone); }
      if (address) { userFields.push('address = ?'); userParams.push(address); }
      if (department) { userFields.push('department = ?'); userParams.push(department); }
      if (status) { userFields.push('status = ?'); userParams.push(status); }

      if (userFields.length > 0) {
        userFields.push('updated_at = CURRENT_TIMESTAMP');
        userParams.push(id);

        await connection.execute(
          `UPDATE users SET ${userFields.join(', ')} WHERE id = ?`,
          userParams
        );
      }

      // Update or insert teacher profile
      const profileFields = [];
      const profileParams = [];

      if (employee_id) { profileFields.push('employee_id = ?'); profileParams.push(employee_id); }
      if (department) { profileFields.push('department = ?'); profileParams.push(department); }
      if (position) { profileFields.push('position = ?'); profileParams.push(position); }
      if (qualification) { profileFields.push('qualification = ?'); profileParams.push(qualification); }
      if (specialization) { profileFields.push('specialization = ?'); profileParams.push(specialization); }
      if (experience_years !== undefined) { 
        profileFields.push('experience_years = ?'); 
        profileParams.push(experience_years === '' || experience_years === null ? 0 : parseInt(experience_years) || 0); 
      }
      if (joining_date && joining_date !== '') { 
        profileFields.push('joining_date = ?'); 
        profileParams.push(formatDateForMySQL(joining_date)); 
      }
      if (salary !== undefined) { 
        profileFields.push('salary = ?'); 
        profileParams.push(salary === '' || salary === null ? 0 : parseFloat(salary) || 0); 
      }
      if (bio) { profileFields.push('bio = ?'); profileParams.push(bio); }

      if (profileFields.length > 0) {
        // Check if teacher profile exists
        const [profileExists] = await connection.execute(
          'SELECT id FROM teacher_profiles WHERE user_id = ?',
          [id]
        );

        if (profileExists.length > 0) {
          // Update existing profile
          profileFields.push('updated_at = CURRENT_TIMESTAMP');
          profileParams.push(id);

          await connection.execute(
            `UPDATE teacher_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`,
            profileParams
          );
        } else {
          // Insert new profile
          // Process numeric values to handle empty strings
          const processedExperienceYears = experience_years === '' || experience_years === undefined || experience_years === null ? 0 : parseInt(experience_years) || 0;
          const processedSalary = salary === '' || salary === undefined || salary === null ? 0 : parseFloat(salary) || 0;
          const processedJoiningDate = formatDateForMySQL(joining_date);
          
          await connection.execute(`
            INSERT INTO teacher_profiles (
              user_id, employee_id, department, position, qualification,
              specialization, experience_years, joining_date, salary, bio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            id, employee_id, department, position, qualification,
            specialization, processedExperienceYears, processedJoiningDate, processedSalary, bio
          ]);
        }
      }

      // Keep class teacher assignment on classes table in sync
      if (Object.prototype.hasOwnProperty.call(req.body, 'class_teacher_for_class_id')) {
        const selectedClassId =
          class_teacher_for_class_id === '' || class_teacher_for_class_id === null
            ? null
            : Number(class_teacher_for_class_id);

        if (selectedClassId !== null && Number.isNaN(selectedClassId)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid class selected for Class Teacher position'
          });
        }

        // Remove this teacher from any previous class teacher slot
        await connection.execute(
          'UPDATE classes SET class_teacher_id = NULL WHERE class_teacher_id = ?',
          [id]
        );

        if (selectedClassId !== null) {
          // Validate class exists
          const [classRows] = await connection.execute(
            'SELECT id FROM classes WHERE id = ? AND is_active = TRUE LIMIT 1',
            [selectedClassId]
          );
          if (!classRows.length) {
            await connection.rollback();
            return res.status(400).json({
              success: false,
              message: 'Selected class does not exist or is inactive'
            });
          }

          // Ensure class has no other teacher assigned as class teacher
          await connection.execute(
            'UPDATE classes SET class_teacher_id = NULL WHERE id = ?',
            [selectedClassId]
          );
          await connection.execute(
            'UPDATE classes SET class_teacher_id = ? WHERE id = ?',
            [id, selectedClassId]
          );
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Teacher updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher',
      error: error.message
    });
  }
});

// Update teacher password
router.patch('/:id/password', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can reset teacher passwords'
      });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if teacher exists
    const teacherExists = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "teacher"',
      [id]
    );

    if (teacherExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password
    await executeQuery(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({
      success: true,
      message: 'Teacher password updated successfully'
    });
  } catch (error) {
    console.error('Error updating teacher password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher password',
      error: error.message
    });
  }
});

// Assign subjects/classes to teacher
router.post('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can manage teacher assignments'
      });
    }

    const { id } = req.params;
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Assignments array is required'
      });
    }

    // Check if teacher exists
    const teacherExists = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "teacher"',
      [id]
    );

    if (teacherExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Insert new assignments
      for (const assignment of assignments) {
        const { subject_id, class_id, academic_year, is_primary_teacher } = assignment;

        await connection.execute(`
          INSERT INTO teacher_subject_assignments (
            teacher_id, subject_id, class_id, academic_year, is_primary_teacher
          ) VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            is_primary_teacher = VALUES(is_primary_teacher),
            updated_at = CURRENT_TIMESTAMP
        `, [id, subject_id, class_id, academic_year, is_primary_teacher || false]);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Teacher assignments updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher assignments',
      error: error.message
    });
  }
});

// Remove assignment
router.delete('/:id/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can manage teacher assignments'
      });
    }

    const { id, assignmentId } = req.params;

    // Remove assignment
    const result = await executeQuery(
      'DELETE FROM teacher_subject_assignments WHERE id = ? AND teacher_id = ?',
      [assignmentId, id]
    );

    if (result.rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'Assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing teacher assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove assignment',
      error: error.message
    });
  }
});

// Toggle teacher status (active/inactive)
router.patch('/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can toggle teacher status'
      });
    }

    const { id } = req.params;

    // Toggle status
    const result = await executeQuery(`
      UPDATE users 
      SET status = CASE WHEN status = 'active' THEN 'inactive' ELSE 'active' END,
          is_active = CASE WHEN is_active = TRUE THEN FALSE ELSE TRUE END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND role = 'teacher'
    `, [id]);

    if (result.rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      message: 'Teacher status updated successfully'
    });
  } catch (error) {
    console.error('Error toggling teacher status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher status',
      error: error.message
    });
  }
});

// Get department statistics
router.get('/stats/departments', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view statistics'
      });
    }

    const query = `
      SELECT 
        COALESCE(u.department, tp.department, 'Unassigned') as department,
        COUNT(*) as teacher_count,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_teachers,
        COUNT(CASE WHEN u.status = 'inactive' THEN 1 END) as inactive_teachers,
        AVG(tp.experience_years) as avg_experience,
        AVG(tp.salary) as avg_salary
      FROM users u
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      WHERE u.role = 'teacher'
      GROUP BY COALESCE(u.department, tp.department, 'Unassigned')
      ORDER BY teacher_count DESC
    `;

    const result = await executeQuery(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching department statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department statistics',
      error: error.message
    });
  }
});

// Get available subjects and classes for assignments
router.get('/assignment-options', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view assignment options'
      });
    }

    // Get subjects
    const subjectsResult = await executeQuery(`
      SELECT id, name, code, department
      FROM subjects
      WHERE is_active = TRUE
      ORDER BY department, name
    `);

    // Get classes
    const classesResult = await executeQuery(`
      SELECT id, name, level, academic_year
      FROM classes
      WHERE is_active = TRUE
      ORDER BY level, name
    `);

    // Get academic years
    const yearsResult = await executeQuery(`
      SELECT year_name
      FROM academic_years
      WHERE is_active = TRUE
      ORDER BY start_date DESC
    `);

    res.json({
      success: true,
      data: {
        subjects: subjectsResult.rows,
        classes: classesResult.rows,
        academic_years: yearsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching assignment options:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment options',
      error: error.message
    });
  }
});

// Get teacher assignments
router.get('/:id/assignments', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin or the teacher themselves
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const { id } = req.params;

    const query = `
      SELECT 
        tsa.*,
        s.name as subject_name,
        s.code as subject_code,
        c.name as class_name,
        c.level as class_level,
        c.capacity as class_capacity
      FROM teacher_subject_assignments tsa
      JOIN subjects s ON tsa.subject_id = s.id
      JOIN classes c ON tsa.class_id = c.id
      WHERE tsa.teacher_id = ?
      ORDER BY s.name, c.name
    `;

    const result = await executeQuery(query, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher assignments',
      error: error.message
    });
  }
});

// Add teacher assignments
router.post('/assignments', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can assign subjects to teachers'
      });
    }

    const {
      teacher_id,
      subject_id,
      class_ids,
      is_primary_teacher,
      academic_year
    } = req.body;

    const normalizeAcademicYear = (value) => {
      if (!value && value !== 0) {
        const y = new Date().getFullYear();
        return `${y}-${y + 1}`;
      }
      const str = String(value).trim();
      if (/^\d{4}-\d{4}$/.test(str)) return str;
      if (/^\d{4}$/.test(str)) {
        const y = Number(str);
        return `${y}-${y + 1}`;
      }
      return null;
    };

    // Validate required fields
    if (!teacher_id || !subject_id || !Array.isArray(class_ids) || class_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID, subject ID, and at least one class ID are required'
      });
    }

    const normalizedTeacherId = Number(teacher_id);
    const normalizedSubjectId = Number(subject_id);
    const normalizedClassIds = [...new Set(class_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    const normalizedAcademicYear = normalizeAcademicYear(academic_year);

    if (!normalizedTeacherId || !normalizedSubjectId || normalizedClassIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher, subject, or class IDs'
      });
    }

    if (!normalizedAcademicYear) {
      return res.status(400).json({
        success: false,
        message: 'Academic year must be in YYYY-YYYY or YYYY format'
      });
    }

    // Verify teacher exists
    const teacherCheck = await executeQuery(
      'SELECT id FROM users WHERE id = ? AND role = "teacher"',
      [normalizedTeacherId]
    );

    if (teacherCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify subject exists
    const subjectCheck = await executeQuery(
      'SELECT id FROM subjects WHERE id = ?',
      [normalizedSubjectId]
    );

    if (subjectCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found'
      });
    }

    // Verify classes exist and are active
    const classCheckPlaceholders = normalizedClassIds.map(() => '?').join(', ');
    const classCheck = await executeQuery(
      `SELECT id FROM classes WHERE is_active = TRUE AND id IN (${classCheckPlaceholders})`,
      normalizedClassIds
    );
    if (classCheck.rows.length !== normalizedClassIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected classes are invalid or inactive'
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Check for existing assignments
      const existingQuery = `
        SELECT class_id FROM teacher_subject_assignments 
        WHERE teacher_id = ? AND subject_id = ? AND academic_year = ? AND class_id IN (${normalizedClassIds.map(() => '?').join(', ')})
      `;
      const existing = await connection.execute(existingQuery, [normalizedTeacherId, normalizedSubjectId, normalizedAcademicYear, ...normalizedClassIds]);
      
      if (existing[0].length > 0) {
        const conflictClasses = existing[0].map(row => row.class_id);
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: `Teacher is already assigned to classes: ${conflictClasses.join(', ')} for this subject in ${normalizedAcademicYear}`
        });
      }

      // Insert new assignments
      const insertPromises = normalizedClassIds.map(class_id => 
        connection.execute(`
          INSERT INTO teacher_subject_assignments (
            teacher_id, subject_id, class_id, is_primary_teacher, academic_year
          ) VALUES (?, ?, ?, ?, ?)
        `, [normalizedTeacherId, normalizedSubjectId, class_id, !!is_primary_teacher, normalizedAcademicYear])
      );

      await Promise.all(insertPromises);
      await connection.commit();

      res.status(201).json({
        success: true,
        message: `Successfully assigned ${normalizedClassIds.length} class(es) to teacher for ${normalizedAcademicYear}`
      });
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Some selected assignments already exist. Refresh and try different class selections.'
        });
      }
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error adding teacher assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add teacher assignments',
      error: error.message
    });
  }
});

// Remove teacher assignment
router.delete('/assignments/:assignmentId', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can remove teacher assignments'
      });
    }

    const { assignmentId } = req.params;

    // Check if assignment exists
    const assignmentCheck = await executeQuery(
      'SELECT id FROM teacher_subject_assignments WHERE id = ?',
      [assignmentId]
    );

    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Remove the assignment
    await executeQuery(
      'DELETE FROM teacher_subject_assignments WHERE id = ?',
      [assignmentId]
    );

    res.json({
      success: true,
      message: 'Assignment removed successfully'
    });
  } catch (error) {
    console.error('Error removing teacher assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove teacher assignment',
      error: error.message
    });
  }
});

module.exports = router;
