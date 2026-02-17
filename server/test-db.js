const { pool } = require('./config/database');

async function checkData() {
  try {
    const [assessments] = await pool.execute('SELECT COUNT(*) as count FROM assessments');
    console.log('Total assessments:', assessments[0].count);
    
    const [marks] = await pool.execute('SELECT COUNT(*) as count FROM assessment_marks');
    console.log('Total assessment marks:', marks[0].count);
    
    const [recent] = await pool.execute(`
      SELECT a.id, a.assessment_name, c.name as class_name, 
             COUNT(am.id) as marks_count
      FROM assessments a 
      LEFT JOIN classes c ON a.class_id = c.id 
      LEFT JOIN assessment_marks am ON a.id = am.assessment_id 
      GROUP BY a.id 
      ORDER BY a.created_at DESC 
      LIMIT 3
    `);
    
    console.log('Recent assessments:');
    recent.forEach(r => {
      console.log(`- ${r.assessment_name} (${r.class_name}): ${r.marks_count} marks`);
    });
    
    // Test if we have graded assessments
    const [gradedMarks] = await pool.execute(`
      SELECT COUNT(*) as count 
      FROM assessment_marks 
      WHERE marks_obtained IS NOT NULL AND marks_obtained > 0
    `);
    console.log('Graded marks:', gradedMarks[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
