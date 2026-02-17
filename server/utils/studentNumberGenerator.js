/**
 * Student Registration Number Generator
 * Generates unique student numbers in format: STU####
 * Simple sequential numbering for single school
 */

const { pool } = require('../config/database');

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Generate student registration number
 * @returns {Promise<string>} - Generated registration number (e.g., STU0001)
 */
async function generateStudentNumber() {
  try {
    // Get the last student ID to generate next sequential number
    const existingStudents = await query(
      `SELECT student_id FROM students 
       WHERE student_id LIKE 'STU%'
       ORDER BY id DESC
       LIMIT 1`
    );

    let nextNumber = 1;

    if (existingStudents && existingStudents.length > 0) {
      // Extract the sequential number from last student_id
      const lastStudentId = existingStudents[0].student_id;
      const numPart = lastStudentId.replace('STU', '');
      const lastSeq = parseInt(numPart, 10);
      if (!isNaN(lastSeq)) {
        nextNumber = lastSeq + 1;
      }
    }

    // Format the sequential number with leading zeros (4 digits)
    const sequentialPart = String(nextNumber).padStart(4, '0');

    // Generate final student number
    const studentNumber = `STU${sequentialPart}`;

    return studentNumber;

  } catch (error) {
    console.error('Generate student number error:', error);
    throw new Error('Failed to generate student number');
  }
}

/**
 * Batch generate student numbers for multiple students
 * Sorts students A-Z before assigning numbers
 * @param {Array} students - Array of student objects with at least {id, first_name, last_name}
 * @returns {Promise<Array>} - Array of {studentId, studentNumber}
 */
async function batchGenerateStudentNumbers(students) {
  try {
    // Sort students alphabetically by full name (A-Z)
    const sortedStudents = students.sort((a, b) => {
      const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
      const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Get the last student ID
    const existingStudents = await query(
      `SELECT student_id FROM students 
       WHERE student_id LIKE 'STU%'
       ORDER BY id DESC
       LIMIT 1`
    );

    let startNumber = 1;

    if (existingStudents && existingStudents.length > 0) {
      const lastStudentId = existingStudents[0].student_id;
      const numPart = lastStudentId.replace('STU', '');
      const lastSeq = parseInt(numPart, 10);
      if (!isNaN(lastSeq)) {
        startNumber = lastSeq + 1;
      }
    }

    // Generate student numbers for all students
    const assignments = sortedStudents.map((student, index) => {
      const sequentialNumber = startNumber + index;
      const sequentialPart = String(sequentialNumber).padStart(4, '0');
      const studentNumber = `STU${sequentialPart}`;

      return {
        studentId: student.id,
        studentName: `${student.first_name} ${student.last_name}`,
        studentNumber
      };
    });

    return assignments;

  } catch (error) {
    console.error('Batch generate student numbers error:', error);
    throw new Error('Failed to batch generate student numbers');
  }
}

/**
 * Update student with student number
 * @param {number} studentId - Student database ID
 * @param {string} studentNumber - Generated student number
 * @returns {Promise<boolean>} - Success status
 */
async function assignStudentNumber(studentId, studentNumber) {
  try {
    await query(
      'UPDATE students SET student_id = ? WHERE id = ?',
      [studentNumber, studentId]
    );

    return true;
  } catch (error) {
    console.error('Assign student number error:', error);
    throw new Error('Failed to assign student number');
  }
}

/**
 * Batch update students with student numbers
 * @param {Array} assignments - Array of {studentId, studentNumber}
 * @returns {Promise<boolean>} - Success status
 */
async function batchAssignStudentNumbers(assignments) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    for (const assignment of assignments) {
      await connection.execute(
        'UPDATE students SET student_id = ? WHERE id = ?',
        [assignment.studentNumber, assignment.studentId]
      );
    }

    await connection.commit();
    connection.release();

    return true;
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Batch assign student numbers error:', error);
    throw new Error('Failed to batch assign student numbers');
  }
}

/**
 * Validate student number format
 * @param {string} studentNumber - Student number to validate
 * @returns {boolean} - Valid or not
 */
function validateStudentNumber(studentNumber) {
  // Format: STU####
  const regex = /^STU\d{4}$/;
  return regex.test(studentNumber);
}

/**
 * Check if student number exists
 * @param {string} studentNumber - Student number to check
 * @returns {Promise<boolean>} - Exists or not
 */
async function studentNumberExists(studentNumber) {
  try {
    const results = await query(
      'SELECT id FROM students WHERE student_id = ?',
      [studentNumber]
    );

    return results && results.length > 0;
  } catch (error) {
    console.error('Check student number error:', error);
    return false;
  }
}

module.exports = {
  generateStudentNumber,
  batchGenerateStudentNumbers,
  assignStudentNumber,
  batchAssignStudentNumbers,
  validateStudentNumber,
  studentNumberExists,
  // Backward compatibility aliases
  validateRegistrationNumber: validateStudentNumber,
  registrationNumberExists: studentNumberExists
};
