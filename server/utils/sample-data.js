const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

async function insertSampleData() {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        // Create sample teacher
        const hashedPassword = await bcrypt.hash('teacher123', 12);
        
        // Check if teacher already exists
        const [existingTeacher] = await connection.execute(
            'SELECT id FROM users WHERE username = ?',
            ['teacher_john']
        );
        
        let teacherId;
        if (existingTeacher.length === 0) {
            const [teacherResult] = await connection.execute(`
                INSERT INTO users (
                    username, email, password, role, first_name, last_name, phone, address,
                    qualification, experience, department, position, bio, employee_id,
                    specialization, experience_years, joining_date, subjects_taught, classes_assigned,
                    is_active
                ) VALUES (?, ?, ?, 'teacher', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
            `, [
                'teacher_john',
                'john.smith@ubunifusec.com',
                hashedPassword,
                'John',
                'Smith',
                '+255789123456',
                'Dodoma, Tanzania',
                'Bachelor of Education in Mathematics',
                'Teaching secondary school mathematics for 8 years',
                'Mathematics Department',
                'Senior Mathematics Teacher',
                'Experienced mathematics teacher with focus on secondary education',
                'EMP001',
                'Mathematics and Physics',
                8,
                '2016-02-15',
                JSON.stringify(['Mathematics', 'Physics', 'Statistics']),
                JSON.stringify([1, 2, 3]) // Will assign to classes with IDs 1, 2, 3
            ]);
            
            teacherId = teacherResult.insertId;
            console.log('✅ Sample teacher created with ID:', teacherId);
        } else {
            teacherId = existingTeacher[0].id;
            console.log('ℹ️ Teacher already exists with ID:', teacherId);
            
            // Update classes_assigned and subjects_taught for existing teacher
            await connection.execute(`
                UPDATE users SET 
                    subjects_taught = ?,
                    classes_assigned = ?
                WHERE id = ?
            `, [
                JSON.stringify(['Mathematics', 'Physics', 'Statistics']),
                JSON.stringify([1, 2, 3]),
                teacherId
            ]);
            console.log('✅ Updated teacher assignments');
        }
        
        // Ensure we have sample classes
        const classes = [
            { name: 'Form 1A', level: 'Form 1', capacity: 40, academic_year: '2024-2025' },
            { name: 'Form 2B', level: 'Form 2', capacity: 35, academic_year: '2024-2025' },
            { name: 'Form 3A', level: 'Form 3', capacity: 30, academic_year: '2024-2025' }
        ];
        
        for (let i = 0; i < classes.length; i++) {
            const classData = classes[i];
            const classId = i + 1;
            
            const [existingClass] = await connection.execute(
                'SELECT id FROM classes WHERE id = ?',
                [classId]
            );
            
            if (existingClass.length === 0) {
                await connection.execute(`
                    INSERT INTO classes (id, name, level, capacity, academic_year, description, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, TRUE)
                `, [
                    classId,
                    classData.name,
                    classData.level,
                    classData.capacity,
                    classData.academic_year,
                    `${classData.level} class with focus on core subjects`
                ]);
                console.log(`✅ Created class: ${classData.name}`);
            } else {
                console.log(`ℹ️ Class ${classData.name} already exists`);
            }
        }
        
        // Ensure we have a current academic year
        const [existingAcademicYear] = await connection.execute(
            'SELECT id FROM academic_years WHERE year_name = ? AND is_current = TRUE',
            ['2024-2025']
        );
        
        if (existingAcademicYear.length === 0) {
            await connection.execute(`
                INSERT INTO academic_years (year_name, start_date, end_date, is_current, is_active)
                VALUES (?, ?, ?, TRUE, TRUE)
            `, [
                '2024-2025',
                '2024-01-15',
                '2024-12-20'
            ]);
            console.log('✅ Created current academic year: 2024-2025');
        }
        
        await connection.commit();
        console.log('🎉 Sample data insertion completed successfully!');
        
        return {
            success: true,
            teacherId: teacherId,
            message: 'Sample data created successfully'
        };
        
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error inserting sample data:', error);
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = { insertSampleData };
