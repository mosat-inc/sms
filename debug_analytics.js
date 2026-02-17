const mysql = require('mysql2/promise');

async function debugAnalytics() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'allahuma',
      database: 'sms_database'
    });

    console.log('=== DEBUG: Analytics Data ===\n');

    // Check all teachers
    const [allTeachers] = await connection.execute(
      'SELECT id, username, first_name, last_name FROM users WHERE role = ? ORDER BY id',
      ['teacher']
    );
    
    console.log('All teachers in system:');
    allTeachers.forEach(teacher => {
      console.log(`  - ID: ${teacher.id}, Username: ${teacher.username}, Name: ${teacher.first_name} ${teacher.last_name}`);
    });
    
    console.log('\n=== Assessment Data by Teacher ===');
    
    // Check assessment data for each teacher
    for (const teacher of allTeachers) {
      const [assessments] = await connection.execute(
        'SELECT COUNT(*) as count FROM assessments WHERE teacher_id = ? AND is_active = TRUE',
        [teacher.id]
      );
      
      const [marks] = await connection.execute(`
        SELECT COUNT(*) as count FROM assessment_marks am
        INNER JOIN assessments a ON am.assessment_id = a.id
        WHERE a.teacher_id = ? AND a.is_active = TRUE
      `, [teacher.id]);
      
      if (assessments[0].count > 0) {
        const [avgData] = await connection.execute(`
          SELECT 
            ROUND(AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                THEN (am.marks_obtained / a.max_marks) * 100 END), 2) as avg_performance,
            ROUND((COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
                AND (am.marks_obtained / a.max_marks) * 100 >= (a.pass_marks / a.max_marks) * 100 
                THEN 1 END) * 100.0 / COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL THEN 1 END)), 0) as pass_rate
          FROM assessments a
          INNER JOIN assessment_marks am ON a.id = am.assessment_id
          WHERE a.teacher_id = ? AND a.is_active = TRUE
        `, [teacher.id]);

        console.log(`\n${teacher.first_name} ${teacher.last_name} (${teacher.username}):`);
        console.log(`  - Assessments: ${assessments[0].count}`);
        console.log(`  - Total marks: ${marks[0].count}`);
        console.log(`  - Average performance: ${avgData[0].avg_performance}%`);
        console.log(`  - Pass rate: ${avgData[0].pass_rate}%`);
      } else {
        console.log(`\n${teacher.first_name} ${teacher.last_name} (${teacher.username}): NO ASSESSMENTS`);
      }
    }

    console.log('\n=== Summary ===');
    
    // Check which teacher has the data matching your frontend (68.43% and 86%)
    const [summaryData] = await connection.execute(`
      SELECT 
        u.id, u.username, u.first_name, u.last_name,
        ROUND(AVG(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
            THEN (am.marks_obtained / a.max_marks) * 100 END), 2) as avg_performance,
        ROUND((COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL 
            AND (am.marks_obtained / a.max_marks) * 100 >= (a.pass_marks / a.max_marks) * 100 
            THEN 1 END) * 100.0 / COUNT(CASE WHEN am.is_present = TRUE AND am.marks_obtained IS NOT NULL THEN 1 END)), 0) as pass_rate
      FROM users u
      INNER JOIN assessments a ON u.id = a.teacher_id
      INNER JOIN assessment_marks am ON a.id = am.assessment_id
      WHERE u.role = 'teacher' AND a.is_active = TRUE
      GROUP BY u.id, u.username, u.first_name, u.last_name
      HAVING avg_performance IS NOT NULL
      ORDER BY avg_performance DESC
    `);

    console.log('\nTeacher performance summary:');
    summaryData.forEach(teacher => {
      const isMatch68 = Math.abs(teacher.avg_performance - 68.43) < 0.5;
      const isMatch86 = Math.abs(teacher.pass_rate - 86) < 1;
      const marker = (isMatch68 || isMatch86) ? ' ⭐ LIKELY MATCH' : '';
      
      console.log(`  - ${teacher.first_name} ${teacher.last_name} (ID: ${teacher.id}): Avg ${teacher.avg_performance}%, Pass ${teacher.pass_rate}%${marker}`);
    });

    await connection.end();
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAnalytics();
