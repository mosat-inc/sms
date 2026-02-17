const { pool } = require('./config/database');

async function checkAssessments() {
    try {
        console.log('🔍 Checking available assessments...\n');
        
        // Get all assessments
        const [assessments] = await pool.execute(`
            SELECT 
                a.id,
                a.assessment_name,
                a.teacher_id,
                a.class_id,
                a.subject_id,
                a.status,
                c.name as class_name,
                s.name as subject_name,
                u.username as teacher_username,
                u.first_name as teacher_first_name,
                u.last_name as teacher_last_name
            FROM assessments a
            LEFT JOIN classes c ON a.class_id = c.id
            LEFT JOIN subjects s ON a.subject_id = s.id
            LEFT JOIN users u ON a.teacher_id = u.id
            ORDER BY a.id
        `);
        
        console.log(`Found ${assessments.length} assessments:\n`);
        
        assessments.forEach(assessment => {
            console.log(`📊 Assessment ID: ${assessment.id}`);
            console.log(`   Name: ${assessment.assessment_name}`);
            console.log(`   Teacher: ${assessment.teacher_username} (${assessment.teacher_first_name} ${assessment.teacher_last_name})`);
            console.log(`   Teacher ID: ${assessment.teacher_id}`);
            console.log(`   Class: ${assessment.class_name}`);
            console.log(`   Subject: ${assessment.subject_name}`);
            console.log(`   Status: ${assessment.status}`);
            console.log('   ---');
        });
        
        // Get teacher assignments to understand access
        const [teachers] = await pool.execute(`
            SELECT 
                u.id,
                u.username,
                u.first_name,
                u.last_name,
                u.role
            FROM users u
            WHERE u.role IN ('admin', 'teacher')
            ORDER BY u.role, u.id
        `);
        
        console.log('\n👥 Available teachers/admins:\n');
        teachers.forEach(teacher => {
            console.log(`👤 ${teacher.username} (ID: ${teacher.id}) - ${teacher.role}`);
            console.log(`   Name: ${teacher.first_name} ${teacher.last_name}`);
        });
        
        // Check if admin has any assignments
        const [adminAssignments] = await pool.execute(`
            SELECT 
                tsa.*,
                c.name as class_name,
                s.name as subject_name
            FROM teacher_subject_assignments tsa
            LEFT JOIN classes c ON tsa.class_id = c.id
            LEFT JOIN subjects s ON tsa.subject_id = s.id
            WHERE tsa.teacher_id = 1
        `);
        
        console.log(`\n🔍 Admin (ID: 1) assignments: ${adminAssignments.length}`);
        adminAssignments.forEach(assignment => {
            console.log(`   Class: ${assignment.class_name}, Subject: ${assignment.subject_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error checking assessments:', error);
    } finally {
        process.exit(0);
    }
}

checkAssessments();
