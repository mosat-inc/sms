const { pool } = require('./config/database');

async function checkGradesData() {
    try {
        const connection = await pool.getConnection();
        
        console.log('🔍 Checking assessment marks and student grades...\n');
        
        // Check assessment marks table
        const [assessmentMarks] = await connection.execute(`
            SELECT 
                am.id, am.assessment_id, am.student_id, am.marks_obtained, 
                am.is_present, am.grade,
                a.assessment_name, sub.name as subject_name, c.name as class_name,
                u.first_name, u.last_name
            FROM assessment_marks am
            INNER JOIN assessments a ON am.assessment_id = a.id
            INNER JOIN subjects sub ON a.subject_id = sub.id  
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN students st ON am.student_id = st.id
            INNER JOIN users u ON st.user_id = u.id
            WHERE c.name = '1A' AND (sub.name = 'Biology' OR sub.name LIKE '%Book%')
            ORDER BY a.assessment_name, u.first_name, u.last_name
        `);
        
        console.log(`📊 Found ${assessmentMarks.length} assessment marks for Biology/BK in class 1A:`);
        
        if (assessmentMarks.length > 0) {
            const byAssessment = {};
            assessmentMarks.forEach(mark => {
                const key = `${mark.assessment_name} (${mark.subject_name})`;
                if (!byAssessment[key]) {
                    byAssessment[key] = [];
                }
                byAssessment[key].push(mark);
            });
            
            Object.entries(byAssessment).forEach(([assessment, marks]) => {
                console.log(`\n📝 ${assessment}:`);
                marks.forEach(mark => {
                    console.log(`   ${mark.first_name} ${mark.last_name}: ${mark.marks_obtained || 'No mark'}${mark.marks_obtained ? '/' + (mark.grade ? ` (${mark.grade})` : '') : ''} ${mark.is_present ? '✓' : '✗'}`);
                });
            });
        } else {
            console.log('   No assessment marks found');
        }
        
        // Check student_grades table
        const [studentGrades] = await connection.execute(`
            SELECT 
                sg.id, sg.assessment_id, sg.student_id, sg.marks_obtained, 
                sg.percentage, sg.letter_grade, sg.is_absent,
                a.title as assessment_title, s.name as subject_name, c.name as class_name,
                u.first_name, u.last_name
            FROM student_grades sg
            INNER JOIN assessments a ON sg.assessment_id = a.id
            INNER JOIN subjects s ON a.subject_id = s.id  
            INNER JOIN classes c ON a.class_id = c.id
            INNER JOIN students st ON sg.student_id = st.id
            INNER JOIN users u ON st.user_id = u.id
            WHERE c.name = '1A' AND (s.name = 'Biology' OR s.name LIKE '%Book%')
            ORDER BY a.title, u.first_name, u.last_name
        `);
        
        console.log(`\n📊 Found ${studentGrades.length} student grades for Biology/BK in class 1A:`);
        
        if (studentGrades.length > 0) {
            const byAssessment = {};
            studentGrades.forEach(grade => {
                const key = `${grade.assessment_title} (${grade.subject_name})`;
                if (!byAssessment[key]) {
                    byAssessment[key] = [];
                }
                byAssessment[key].push(grade);
            });
            
            Object.entries(byAssessment).forEach(([assessment, grades]) => {
                console.log(`\n📝 ${assessment}:`);
                grades.forEach(grade => {
                    console.log(`   ${grade.first_name} ${grade.last_name}: ${grade.marks_obtained || 'No mark'}${grade.marks_obtained ? `/${grade.percentage}% (${grade.letter_grade})` : ''} ${grade.is_absent ? '(Absent)' : ''}`);
                });
            });
        } else {
            console.log('   No student grades found');
        }
        
        // Check classes and their IDs
        const [classes] = await connection.execute(`
            SELECT id, name, level FROM classes WHERE name LIKE '%1%' OR level LIKE '%1%'
        `);
        
        console.log(`\n🏫 Found ${classes.length} classes related to '1':`);
        classes.forEach(cls => {
            console.log(`   Class ID ${cls.id}: ${cls.name} (Level: ${cls.level})`);
        });
        
        // Check if there's an 'A1' class instead of '1A'
        const [allClasses] = await connection.execute(`
            SELECT id, name, level FROM classes ORDER BY name
        `);
        
        console.log(`\n🏫 All classes in database:`);
        allClasses.forEach(cls => {
            console.log(`   Class ID ${cls.id}: ${cls.name} (Level: ${cls.level})`);
        });
        
        connection.release();
        
    } catch (error) {
        console.error('❌ Error checking grades data:', error);
    } finally {
        process.exit(0);
    }
}

checkGradesData();
