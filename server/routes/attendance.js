const express = require('express');
const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } = require('docx');
const Auth = require('../utils/auth');
const router = express.Router();

const leadershipPositionRegex = /(headmaster|headmistress|head teacher|academic)/i;

const getUserScopeContext = async (userId) => {
    const [rows] = await pool.execute(
        'SELECT id, role, position FROM users WHERE id = ? LIMIT 1',
        [userId]
    );
    const user = rows?.[0];
    if (!user) {
        return { role: null, isAdmin: false, isLeadership: false, canViewAllAttendance: false };
    }

    const isAdmin = user.role === 'admin';
    const isLeadership = user.role === 'teacher' && leadershipPositionRegex.test(user.position || '');
    return {
        role: user.role,
        isAdmin,
        isLeadership,
        canViewAllAttendance: isAdmin || isLeadership
    };
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

// NOTE:
// Attendance writes must be attributed to the authenticated user (teacher/admin).
// Some read/debug routes can remain public for troubleshooting, but mutating routes
// must require auth so `marked_by` is accurate.

// Test endpoint to check database connection
router.get('/test', async (req, res) => {
    try {
        console.log('🧪 Testing database connection...');
        
        // Test basic query
        const [result] = await pool.execute('SELECT 1 as test');
        console.log('✅ Database connection working');
        
        // Check attendance table exists
        const [tables] = await pool.execute('SHOW TABLES LIKE "attendance"');
        console.log('📊 Attendance table exists:', tables.length > 0);
        
        // Count records in attendance table
        const [count] = await pool.execute('SELECT COUNT(*) as total FROM attendance');
        console.log('📝 Total attendance records:', count[0].total);
        
        // Check classes table
        const [classCount] = await pool.execute('SELECT COUNT(*) as total FROM classes');
        console.log('🏫 Total classes:', classCount[0].total);
        
        res.json({
            status: 'OK',
            database_connected: true,
            attendance_table_exists: tables.length > 0,
            total_attendance_records: count[0].total,
            total_classes: classCount[0].total
        });
    } catch (error) {
        console.error('❌ Database test failed:', error);
        res.status(500).json({ error: 'Database test failed', details: error.message });
    }
});

// Database schema inspection endpoint
router.get('/schema', async (req, res) => {
    try {
        console.log('🔍 Inspecting database schema...');
        
        // Get classes table structure
        const [classesColumns] = await pool.execute('DESCRIBE classes');
        console.log('Classes table columns:', classesColumns);
        
        // Get attendance table structure  
        const [attendanceColumns] = await pool.execute('DESCRIBE attendance');
        console.log('Attendance table columns:', attendanceColumns);
        
        // Get students table structure
        const [studentsColumns] = await pool.execute('DESCRIBE students');
        console.log('Students table columns:', studentsColumns);
        
        // Get users table structure
        const [usersColumns] = await pool.execute('DESCRIBE users');
        console.log('Users table columns:', usersColumns);
        
        // Sample data from classes table
        const [classesSample] = await pool.execute('SELECT * FROM classes LIMIT 3');
        console.log('Classes sample data:', classesSample);
        
        // Sample data from students table
        const [studentsSample] = await pool.execute('SELECT * FROM students LIMIT 3');
        console.log('Students sample data:', studentsSample);
        
        // Sample data from users table
        const [usersSample] = await pool.execute('SELECT * FROM users LIMIT 3');
        console.log('Users sample data:', usersSample);
        
        res.json({
            classes_columns: classesColumns,
            attendance_columns: attendanceColumns,
            students_columns: studentsColumns,
            users_columns: usersColumns,
            classes_sample: classesSample,
            students_sample: studentsSample,
            users_sample: usersSample
        });
    } catch (error) {
        console.error('❌ Schema inspection failed:', error);
        res.status(500).json({ error: 'Schema inspection failed', details: error.message });
    }
});

// Simple attendance records endpoint for debugging
router.get('/simple-records', async (req, res) => {
    try {
        console.log('🔍 Fetching simple attendance records...');
        
        // Very simple query without complex JOINs
        const [records] = await pool.execute(`
            SELECT 
                date, 
                class_id, 
                status,
                COUNT(*) as count
            FROM attendance 
            GROUP BY date, class_id, status
            ORDER BY date DESC
        `);
        
        console.log('Found simple records:', records.length);
        
        res.json({ 
            success: true,
            total_records: records.length,
            records: records
        });
    } catch (error) {
        console.error('❌ Error fetching simple records:', error);
        res.status(500).json({ error: 'Failed to fetch simple records', details: error.message });
    }
});

// Debug endpoint to see raw attendance data with student info
router.get('/debug-attendance', async (req, res) => {
    try {
        console.log('🔍 Fetching debug attendance data...');
        
        const [records] = await pool.execute(`
            SELECT 
                a.*,
                u.first_name,
                u.last_name,
                s.student_id as roll_number,
                c.name as class_name,
                DATE(a.date) as date_only
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN classes c ON a.class_id = c.id
            ORDER BY a.date DESC
            LIMIT 10
        `);
        
        console.log('Found debug records:', records.length);
        
        res.json({ 
            success: true,
            total_records: records.length,
            records: records
        });
    } catch (error) {
        console.error('❌ Error fetching debug records:', error);
        res.status(500).json({ error: 'Failed to fetch debug records', details: error.message });
    }
});

// Get all attendance records with filters - MOVED TO TOP to avoid route conflicts
router.get('/records', Auth.authenticateToken, async (req, res) => {
    try {
        console.log('📊 Fetching attendance records...');
        const { classId, startDate, endDate, status, studentName } = req.query;
        const scope = await getUserScopeContext(req.user?.id);
        console.log('Query params:', { classId, startDate, endDate, status, studentName });
        
        let whereConditions = [];
        let queryParams = [];
        
        if (classId) {
            whereConditions.push('a.class_id = ?');
            queryParams.push(classId);
        }
        
        if (startDate) {
            whereConditions.push('a.date >= ?');
            queryParams.push(startDate);
        }
        
        if (endDate) {
            whereConditions.push('a.date <= ?');
            queryParams.push(endDate);
        }
        
        if (status) {
            whereConditions.push('a.status = ?');
            queryParams.push(status);
        }

        if (studentName) {
            whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)');
            const likeTerm = `%${studentName}%`;
            queryParams.push(likeTerm, likeTerm, likeTerm);
        }

        if (!scope.canViewAllAttendance && req.user?.role === 'teacher') {
            whereConditions.push(`
                EXISTS (
                    SELECT 1
                    FROM teacher_subject_assignments tsa
                    WHERE tsa.teacher_id = ? AND tsa.class_id = a.class_id
                )
            `);
            queryParams.push(req.user.id);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        console.log('SQL WHERE clause:', whereClause);
        console.log('SQL parameters:', queryParams);
        
        const sqlQuery = `
            SELECT 
                a.date,
                c.name as class_name,
                c.id as class_id,
                COUNT(a.id) as total_students,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            JOIN students s ON s.id = a.student_id
            JOIN users u ON u.id = s.user_id
            ${whereClause}
            GROUP BY a.date, c.name, c.id
            ORDER BY a.date DESC, c.name
        `;
        console.log('Executing SQL:', sqlQuery);
        
        const [records] = await pool.execute(sqlQuery, queryParams);
        console.log('Found records:', records.length);

        res.json({ records });
    } catch (error) {
        console.error('❌ Error fetching attendance records:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
});

// Subject attendance dashboard data with role-based scope
router.get('/subject-dashboard', Auth.authenticateToken, async (req, res) => {
    try {
        const today = new Date();
        const defaultEnd = today.toISOString().split('T')[0];
        const defaultStartDate = new Date(today);
        defaultStartDate.setDate(defaultStartDate.getDate() - 6);
        const defaultStart = defaultStartDate.toISOString().split('T')[0];

        const classId = req.query.classId ? Number(req.query.classId) : null;
        const subjectId = req.query.subjectId ? Number(req.query.subjectId) : null;
        const startDate = req.query.startDate || defaultStart;
        const endDate = req.query.endDate || defaultEnd;
        const studentName = (req.query.studentName || '').trim();

        const scope = await getUserScopeContext(req.user?.id);
        if (req.user?.role !== 'admin' && req.user?.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const where = ['sa.date BETWEEN ? AND ?'];
        const params = [startDate, endDate];

        if (classId) {
            where.push('sa.class_id = ?');
            params.push(classId);
        }
        if (subjectId) {
            where.push('sa.subject_id = ?');
            params.push(subjectId);
        }
        if (studentName) {
            where.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR CONCAT(u.first_name, " ", u.last_name) LIKE ?)');
            const likeTerm = `%${studentName}%`;
            params.push(likeTerm, likeTerm, likeTerm);
        }

        if (!scope.canViewAllAttendance && req.user?.role === 'teacher') {
            where.push(`
                EXISTS (
                    SELECT 1 FROM teacher_subject_assignments tsa
                    WHERE tsa.teacher_id = ? AND tsa.class_id = sa.class_id AND tsa.subject_id = sa.subject_id
                )
            `);
            params.push(req.user.id);
        }

        const [records] = await pool.execute(
            `
            SELECT
                sa.id,
                sa.date,
                sa.status,
                sa.notes,
                sa.class_id,
                sa.subject_id,
                sa.period_label,
                c.name as class_name,
                sub.name as subject_name,
                st.id as student_id,
                st.admission_number,
                u.first_name,
                u.last_name
            FROM subject_attendance sa
            JOIN students st ON st.id = sa.student_id
            JOIN users u ON u.id = st.user_id
            JOIN classes c ON c.id = sa.class_id
            JOIN subjects sub ON sub.id = sa.subject_id
            WHERE ${where.join(' AND ')}
            ORDER BY sa.date DESC, u.first_name, u.last_name
            `,
            params
        );

        const dateSet = new Set();
        const studentMap = new Map();
        const totals = { present: 0, absent: 0, late: 0, excused: 0 };

        for (const row of records) {
            const dateKey = new Date(row.date).toISOString().split('T')[0];
            dateSet.add(dateKey);
            const key = `${row.student_id}`;
            if (!studentMap.has(key)) {
                studentMap.set(key, {
                    student_id: row.student_id,
                    admission_number: row.admission_number,
                    student_name: `${row.first_name} ${row.last_name}`.trim(),
                    class_id: row.class_id,
                    class_name: row.class_name,
                    statuses_by_date: {},
                    summary: { present: 0, absent: 0, late: 0, excused: 0, total: 0 }
                });
            }

            const student = studentMap.get(key);
            student.statuses_by_date[dateKey] = {
                status: row.status,
                subject_id: row.subject_id,
                subject_name: row.subject_name,
                notes: row.notes,
                period_label: row.period_label
            };
            if (student.summary[row.status] !== undefined) {
                student.summary[row.status] += 1;
                student.summary.total += 1;
            }
            if (totals[row.status] !== undefined) totals[row.status] += 1;
        }

        const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
        const students = Array.from(studentMap.values()).sort((a, b) => a.student_name.localeCompare(b.student_name));
        const absentStudentCount = students.filter((s) => (s.summary.absent || 0) > 0).length;

        const filterScope = [];
        const filterParams = [];
        if (!scope.canViewAllAttendance && req.user?.role === 'teacher') {
            filterScope.push('EXISTS (SELECT 1 FROM teacher_subject_assignments tsa WHERE tsa.teacher_id = ? AND tsa.class_id = c.id)');
            filterParams.push(req.user.id);
        }

        const [classes] = await pool.execute(
            `
            SELECT c.id, c.name as class_name, c.level
            FROM classes c
            WHERE c.is_active = TRUE
            ${filterScope.length ? `AND ${filterScope.join(' AND ')}` : ''}
            ORDER BY c.level, c.name
            `,
            filterParams
        );

        const [subjects] = await pool.execute(
            `
            SELECT DISTINCT sub.id, sub.name
            FROM subjects sub
            JOIN teacher_subject_assignments tsa ON tsa.subject_id = sub.id
            JOIN classes c ON c.id = tsa.class_id
            WHERE sub.is_active = TRUE
            ${filterScope.length ? `AND ${filterScope.join(' AND ')}` : ''}
            ${classId ? 'AND c.id = ?' : ''}
            ORDER BY sub.name
            `,
            classId ? [...filterParams, classId] : filterParams
        );

        const absWhere = [...where];
        const absParams = [...params];
        const [absencesByClass] = await pool.execute(
            `
            SELECT c.id as class_id, c.name as class_name, COUNT(*) as absent_count
            FROM subject_attendance sa
            JOIN classes c ON c.id = sa.class_id
            JOIN students st ON st.id = sa.student_id
            JOIN users u ON u.id = st.user_id
            WHERE ${absWhere.join(' AND ')} AND sa.status = 'absent'
            GROUP BY c.id, c.name
            ORDER BY absent_count DESC, c.name
            LIMIT 10
            `,
            absParams
        );

        const [absencesBySubject] = await pool.execute(
            `
            SELECT sub.id as subject_id, sub.name as subject_name, COUNT(*) as absent_count
            FROM subject_attendance sa
            JOIN subjects sub ON sub.id = sa.subject_id
            JOIN students st ON st.id = sa.student_id
            JOIN users u ON u.id = st.user_id
            WHERE ${absWhere.join(' AND ')} AND sa.status = 'absent'
            GROUP BY sub.id, sub.name
            ORDER BY absent_count DESC, sub.name
            LIMIT 10
            `,
            absParams
        );

        const totalMarks = totals.present + totals.absent + totals.late + totals.excused;
        const attendanceRate = totalMarks > 0 ? ((totals.present + totals.late) / totalMarks) * 100 : 0;

        return res.json({
            success: true,
            data: {
                filters: {
                    classId,
                    subjectId,
                    startDate,
                    endDate,
                    studentName
                },
                scope: {
                    is_admin: scope.isAdmin,
                    is_leadership: scope.isLeadership,
                    can_view_all: scope.canViewAllAttendance
                },
                options: {
                    classes,
                    subjects
                },
                table: {
                    dates,
                    students
                },
                performance: {
                    total_marks: totalMarks,
                    present: totals.present,
                    absent: totals.absent,
                    late: totals.late,
                    excused: totals.excused,
                    absent_students: absentStudentCount,
                    attendance_rate: Number(attendanceRate.toFixed(2)),
                    not_attended: totals.absent
                },
                absences_by_class: absencesByClass,
                absences_by_subject: absencesBySubject
            }
        });
    } catch (error) {
        console.error('Subject dashboard error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load attendance dashboard' });
    }
});

// Export attendance records as PDF - MOVED UP to prevent route conflicts
router.get('/export/pdf/:recordId?', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { classId, date, startDate, endDate, status } = req.query;
        
        console.log('📄 PDF Export request:', { recordId, classId, date, startDate, endDate, status });
        
        // Fetch attendance data based on filters
        let whereConditions = [];
        let queryParams = [];
        
        if (classId) {
            whereConditions.push('a.class_id = ?');
            queryParams.push(classId);
        }
        
        if (date) {
            whereConditions.push('DATE_FORMAT(a.date, "%Y-%m-%d") = ?');
            queryParams.push(date);
        } else {
            if (startDate) {
                whereConditions.push('a.date >= ?');
                queryParams.push(startDate);
            }
            
            if (endDate) {
                whereConditions.push('a.date <= ?');
                queryParams.push(endDate);
            }
        }
        
        if (status) {
            whereConditions.push('a.status = ?');
            queryParams.push(status);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const [attendanceData] = await pool.execute(`
            SELECT 
                a.date,
                c.name as class_name,
                u.first_name,
                u.last_name,
                s.student_id as roll_number,
                a.status,
                a.notes
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            ${whereClause}
            ORDER BY a.date DESC, c.name, s.student_id
        `, queryParams);
        
        console.log('📊 Found attendance data:', attendanceData.length, 'records');
        
        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.pdf"`);
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Official Tanzania Header - Centered and Bold
        doc.fontSize(14).text('THE UNITED REPUBLIC OF TANZANIA', { align: 'center' });
        doc.moveDown(0.3);
        
        doc.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', { align: 'center' });
        doc.moveDown(0.4);
        
        // School Header - Stylized  
        doc.fontSize(16).text('UBUNIFU SECONDARY SCHOOL', { align: 'center' });
        doc.moveDown(0.3);
        
        // Tagline
        doc.fontSize(11).text('Excellence in Education • Nurturing Future Leaders', { align: 'center' });
        doc.moveDown(0.4);
        
        // Contact Information
        doc.fontSize(9).text('P.O. Box 123, Singida, Tanzania', { align: 'center' });
        doc.moveDown(0.2);
        doc.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', { align: 'center' });
        doc.moveDown(0.4);
        
        // Decorative line
        doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown(0.4);
        
        // Report Title
        doc.fontSize(16).text('Attendance Report', { align: 'center' });
        doc.moveDown();
        
        // Add generation date
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'right' });
        doc.moveDown(2);
        
        if (attendanceData.length === 0) {
            doc.text('No attendance records found for the specified criteria.');
        } else {
            // Group data by date and class
            const groupedData = {};
            attendanceData.forEach(record => {
                const key = `${record.date}_${record.class_name}`;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        date: record.date,
                        class_name: record.class_name,
                        students: []
                    };
                }
                groupedData[key].students.push(record);
            });
            
            // Add data to PDF
            Object.values(groupedData).forEach((group, index) => {
                if (index > 0) doc.addPage();
                
                doc.fontSize(16).text(`Class: ${group.class_name}`, { underline: true });
                doc.fontSize(14).text(`Date: ${new Date(group.date).toLocaleDateString()}`);
                doc.moveDown();
                
                // Table headers
                const tableTop = doc.y;
                const colWidths = [60, 120, 120, 80, 150];
                const colPositions = [50, 110, 230, 350, 430];
                
                doc.fontSize(10).text('Roll No.', colPositions[0], tableTop, { width: colWidths[0] });
                doc.text('First Name', colPositions[1], tableTop, { width: colWidths[1] });
                doc.text('Last Name', colPositions[2], tableTop, { width: colWidths[2] });
                doc.text('Status', colPositions[3], tableTop, { width: colWidths[3] });
                doc.text('Notes', colPositions[4], tableTop, { width: colWidths[4] });
                
                doc.moveTo(50, tableTop + 15).lineTo(580, tableTop + 15).stroke();
                
                // Table data
                let currentY = tableTop + 25;
                group.students.forEach(student => {
                    doc.text(student.roll_number.toString(), colPositions[0], currentY, { width: colWidths[0] });
                    doc.text(student.first_name, colPositions[1], currentY, { width: colWidths[1] });
                    doc.text(student.last_name, colPositions[2], currentY, { width: colWidths[2] });
                    doc.text(student.status.toUpperCase(), colPositions[3], currentY, { width: colWidths[3] });
                    doc.text(student.notes || '', colPositions[4], currentY, { width: colWidths[4] });
                    currentY += 20;
                });
                
                // Summary
                doc.moveDown(2);
                const summary = group.students.reduce((acc, student) => {
                    acc[student.status] = (acc[student.status] || 0) + 1;
                    return acc;
                }, {});
                
                doc.fontSize(12).text('Summary:', { underline: true });
                doc.fontSize(10);
                Object.entries(summary).forEach(([status, count]) => {
                    doc.text(`${status.toUpperCase()}: ${count}`);
                });
            });
        }
        
        // Finalize the PDF
        doc.end();
        
    } catch (error) {
        console.error('Error exporting PDF:', error);
        res.status(500).json({ error: 'Failed to export PDF' });
    }
});

// Export attendance records as Word document
router.get('/export/word/:recordId?', async (req, res) => {
    try {
        const { recordId } = req.params;
        const { classId, date, startDate, endDate, status } = req.query;
        
        console.log('📄 Word Export request:', { recordId, classId, date, startDate, endDate, status });
        
        // Fetch attendance data based on filters
        let whereConditions = [];
        let queryParams = [];
        
        if (classId) {
            whereConditions.push('a.class_id = ?');
            queryParams.push(classId);
        }
        
        if (date) {
            whereConditions.push('DATE_FORMAT(a.date, "%Y-%m-%d") = ?');
            queryParams.push(date);
        } else {
            if (startDate) {
                whereConditions.push('a.date >= ?');
                queryParams.push(startDate);
            }
            
            if (endDate) {
                whereConditions.push('a.date <= ?');
                queryParams.push(endDate);
            }
        }
        
        if (status) {
            whereConditions.push('a.status = ?');
            queryParams.push(status);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const [attendanceData] = await pool.execute(`
            SELECT 
                a.date,
                c.name as class_name,
                u.first_name,
                u.last_name,
                s.student_id as roll_number,
                a.status,
                a.notes
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            JOIN students s ON a.student_id = s.id
            JOIN users u ON s.user_id = u.id
            ${whereClause}
            ORDER BY a.date DESC, c.name, s.student_id
        `, queryParams);
        
        console.log('📊 Found attendance data for Word export:', attendanceData.length, 'records');
        
        // Create Word document with proper structure
        let docChildren = [
            new Paragraph({
                text: "Attendance Report",
                heading: "Title"
            }),
            new Paragraph({
                text: `Generated on: ${new Date().toLocaleDateString()}`
            }),
            new Paragraph({ text: "" }) // Empty line
        ];
        
        if (attendanceData.length === 0) {
            docChildren.push(new Paragraph({
                text: "No attendance records found for the specified criteria."
            }));
        } else {
            // Group data by date and class
            const groupedData = {};
            attendanceData.forEach(record => {
                const key = `${record.date}_${record.class_name}`;
                if (!groupedData[key]) {
                    groupedData[key] = {
                        date: record.date,
                        class_name: record.class_name,
                        students: []
                    };
                }
                groupedData[key].students.push(record);
            });
            
            // Add data to document
            Object.values(groupedData).forEach(group => {
                docChildren.push(
                    new Paragraph({
                        text: `Class: ${group.class_name}`,
                        heading: "Heading1"
                    })
                );
                docChildren.push(
                    new Paragraph({
                        text: `Date: ${new Date(group.date).toLocaleDateString()}`
                    })
                );
                docChildren.push(new Paragraph({ text: "" })); // Empty line
                
                // Create table
                const tableRows = [
                    new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: "Roll No." })] }),
                            new TableCell({ children: [new Paragraph({ text: "First Name" })] }),
                            new TableCell({ children: [new Paragraph({ text: "Last Name" })] }),
                            new TableCell({ children: [new Paragraph({ text: "Status" })] }),
                            new TableCell({ children: [new Paragraph({ text: "Notes" })] })
                        ]
                    })
                ];
                
                group.students.forEach(student => {
                    tableRows.push(new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph({ text: student.roll_number.toString() })] }),
                            new TableCell({ children: [new Paragraph({ text: student.first_name })] }),
                            new TableCell({ children: [new Paragraph({ text: student.last_name })] }),
                            new TableCell({ children: [new Paragraph({ text: student.status.toUpperCase() })] }),
                            new TableCell({ children: [new Paragraph({ text: student.notes || '' })] })
                        ]
                    }));
                });
                
                const table = new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: tableRows
                });
                
                docChildren.push(table);
                
                // Summary
                const summary = group.students.reduce((acc, student) => {
                    acc[student.status] = (acc[student.status] || 0) + 1;
                    return acc;
                }, {});
                
                docChildren.push(new Paragraph({ text: "" })); // Empty line
                docChildren.push(new Paragraph({ text: "Summary:", heading: "Heading2" }));
                
                Object.entries(summary).forEach(([status, count]) => {
                    docChildren.push(new Paragraph({ text: `${status.toUpperCase()}: ${count}` }));
                });
                
                docChildren.push(new Paragraph({ text: "" })); // Empty line
            });
        }
        
        // Create the final document
        const doc = new Document({
            sections: [{
                properties: {},
                children: docChildren
            }]
        });
        
        // Generate and send the document
        const buffer = await Packer.toBuffer(doc);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${new Date().toISOString().split('T')[0]}.docx"`);
        
        res.send(buffer);
        
    } catch (error) {
        console.error('Error exporting Word document:', error);
        res.status(500).json({ error: 'Failed to export Word document' });
    }
});

// Get attendance for a specific class and date
router.get('/:classId/:date', async (req, res) => {
    try {
        const { classId, date } = req.params;
        console.log('🔍 Fetching attendance for classId:', classId, 'date:', date);
        
        // First let's check what dates we have in the database
        const [allDates] = await pool.execute('SELECT DISTINCT date FROM attendance WHERE class_id = ?', [classId]);
        console.log('🔍 Available raw dates for class:', allDates.map(d => d.date));
        
        // Try multiple date formats to find the data
        let attendanceRecords = [];
        let foundStrategy = null;
        
        // Strategy 1: Convert between UTC and local timezone using CONVERT_TZ
        console.log('🔍 Trying Strategy 1: UTC conversion match');
        try {
            const [records1] = await pool.execute(`
                SELECT 
                    a.*,
                    u.first_name,
                    u.last_name,
                    s.student_id as roll_number
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                JOIN users u ON s.user_id = u.id
                WHERE a.class_id = ? AND DATE_FORMAT(a.date, '%Y-%m-%d') = ?
                ORDER BY s.student_id
            `, [classId, date]);
            
            console.log('🔍 Strategy 1 found:', records1.length, 'records');
            if (records1.length > 0) {
                attendanceRecords = records1;
                foundStrategy = 'exact_date_match';
            }
        } catch (error) {
            console.log('❌ Strategy 1 error:', error.message);
        }
        
        // Strategy 2: Handle ISO formatted date strings with LIKE
        if (attendanceRecords.length === 0) {
            console.log('🔍 Trying Strategy 2: Extended date match');
            try {
                // Try with additional formats that might be used in the database
                const extendedDate = date.replace(/-/g, '');
                const [records2] = await pool.execute(`
                    SELECT 
                        a.*,
                        u.first_name,
                        u.last_name,
                        s.student_id as roll_number
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    JOIN users u ON s.user_id = u.id
                    WHERE a.class_id = ? AND (DATE_FORMAT(a.date, '%Y%m%d') = ? OR a.date LIKE ?)
                    ORDER BY s.student_id
                `, [classId, extendedDate, date + '%']);
                
                console.log('🔍 Strategy 2 found:', records2.length, 'records');
                if (records2.length > 0) {
                    attendanceRecords = records2;
                    foundStrategy = 'like_match';
                }
            } catch (error) {
                console.log('❌ Strategy 2 error:', error.message);
            }
        }
        
        // Strategy 3: Improved range approach with timezone adjustment
        if (attendanceRecords.length === 0) {
            console.log('🔍 Trying Strategy 3: Enhanced date range with timezone adjustment');
            try {
                // Add one day to the end date to account for timezone differences
                const startDate = date + 'T00:00:00.000Z';
                // Use the next day as the end date to ensure we catch all possibilities 
                // across timezone boundaries
                const dateParts = date.split('-');
                const nextDay = new Date(parseInt(dateParts[0]), parseInt(dateParts[1])-1, parseInt(dateParts[2])+1);
                const nextDayStr = nextDay.toISOString().split('T')[0];
                const endDate = nextDayStr + 'T23:59:59.999Z';
                
                console.log('🔍 Enhanced Range:', startDate, 'to', endDate);
                
                const [records3] = await pool.execute(`
                    SELECT 
                        a.*,
                        u.first_name,
                        u.last_name,
                        s.student_id as roll_number
                    FROM attendance a
                    JOIN students s ON a.student_id = s.id
                    JOIN users u ON s.user_id = u.id
                    WHERE a.class_id = ? AND a.date >= ? AND a.date <= ?
                    ORDER BY s.student_id
                `, [classId, startDate, endDate]);
                
                console.log('🔍 Strategy 3 found:', records3.length, 'records');
                if (records3.length > 0) {
                    attendanceRecords = records3;
                    foundStrategy = 'range_match';
                }
            } catch (error) {
                console.log('❌ Strategy 3 error:', error.message);
            }
        }
        
        console.log('🔍 Final result:', attendanceRecords.length, 'attendance records using strategy:', foundStrategy);
        if (attendanceRecords.length > 0) {
            console.log('🔍 Sample record:', {
                name: attendanceRecords[0].first_name + ' ' + attendanceRecords[0].last_name,
                status: attendanceRecords[0].status,
                date: attendanceRecords[0].date
            });
        }

        // Get attendance statistics - using the same strategy that worked for records
        let attendanceStats = {};
        
        if (foundStrategy === 'exact_date_match' || foundStrategy === null) {
            const [stats] = await pool.execute(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM attendance
                WHERE class_id = ? AND DATE_FORMAT(date, '%Y-%m-%d') = ?
                GROUP BY status
            `, [classId, date]);
            
            stats.forEach(stat => {
                attendanceStats[stat.status] = stat.count;
                console.log('🔍 Stat (DATE):', stat.status, '=', stat.count);
            });
        } else if (foundStrategy === 'like_match') {
            const [stats] = await pool.execute(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM attendance
                WHERE class_id = ? AND date LIKE ?
                GROUP BY status
            `, [classId, date + '%']);
            
            stats.forEach(stat => {
                attendanceStats[stat.status] = stat.count;
                console.log('🔍 Stat (LIKE):', stat.status, '=', stat.count);
            });
        } else if (foundStrategy === 'range_match') {
            const startDate = date + 'T00:00:00.000Z';
            const endDate = date + 'T23:59:59.999Z';
            const [stats] = await pool.execute(`
                SELECT 
                    status,
                    COUNT(*) as count
                FROM attendance
                WHERE class_id = ? AND date >= ? AND date <= ?
                GROUP BY status
            `, [classId, startDate, endDate]);
            
            stats.forEach(stat => {
                attendanceStats[stat.status] = stat.count;
                console.log('🔍 Stat (RANGE):', stat.status, '=', stat.count);
            });
        }

        const response = {
            attendance: attendanceRecords,
            stats: attendanceStats
        };
        
        console.log('🔍 Final response: attendance records =', attendanceRecords.length, ', stats =', Object.keys(attendanceStats).length);
        res.json(response);
    } catch (error) {
        console.error('❌ Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance data' });
    }
});

// Save/Update attendance for a specific class and date
router.post('/:classId/:date', Auth.authenticateToken, async (req, res) => {
    try {
        const { classId, date } = req.params;
        const { attendance } = req.body;
        const teacherId = req.user?.id;

        if (!teacherId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('📝 Saving attendance for class:', classId, 'date:', date);
        console.log('📝 Attendance records count:', attendance?.length);
        console.log('📝 Teacher ID:', teacherId);

        if (!attendance || !Array.isArray(attendance)) {
            console.error('❌ Invalid attendance data format');
            return res.status(400).json({ error: 'Invalid attendance data - expected array' });
        }

        if (attendance.length === 0) {
            console.error('❌ Empty attendance array');
            return res.status(400).json({ error: 'No attendance records provided' });
        }

        // Format the date properly for MySQL
        const formattedDate = formatDateForMySQL(date);
        if (!formattedDate) {
            console.error('❌ Invalid date format:', date);
            return res.status(400).json({ error: 'Invalid date format' });
        }

        console.log('📝 Using formatted date:', formattedDate);

        // Start transaction
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            console.log('📝 Transaction started');

            // Delete existing attendance records for this class and date
            console.log('📝 Deleting existing records...');
            const [deleteResult] = await connection.execute(
                'DELETE FROM attendance WHERE class_id = ? AND DATE(date) = ?',
                [classId, formattedDate]
            );
            console.log('📝 Deleted', deleteResult.affectedRows, 'existing records');

            // Insert new attendance records
            console.log('📝 Inserting', attendance.length, 'new records...');
            let insertedCount = 0;
            
            for (const record of attendance) {
                if (!record.student_id || !record.status) {
                    console.error('❌ Missing required fields in record:', record);
                    throw new Error(`Missing required fields in attendance record: ${JSON.stringify(record)}`);
                }
                
                await connection.execute(`
                    INSERT INTO attendance (student_id, class_id, date, status, notes, marked_by)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    record.student_id,
                    classId,
                    formattedDate,
                    record.status,
                    record.notes || null,
                    teacherId
                ]);
                insertedCount++;
            }

            await connection.commit();
            console.log('✅ Transaction committed. Inserted', insertedCount, 'records');
            
            res.json({ 
                success: true, 
                message: 'Attendance saved successfully',
                recordsProcessed: insertedCount
            });
        } catch (error) {
            console.error('❌ Transaction error:', error);
            await connection.rollback();
            console.log('🔄 Transaction rolled back');
            throw error;
        } finally {
            connection.release();
            console.log('🔌 Database connection released');
        }
    } catch (error) {
        console.error('❌ Error saving attendance:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            stack: error.stack
        });
        
        res.status(500).json({ 
            error: 'Failed to save attendance data',
            details: error.message,
            code: error.code
        });
    }
});

// Get attendance summary for a class over a date range
router.get('/:classId/summary', async (req, res) => {
    try {
        const { classId } = req.params;
        const { startDate, endDate } = req.query;
        
        let dateCondition = '';
        let queryParams = [classId];
        
        if (startDate && endDate) {
            dateCondition = 'AND a.date BETWEEN ? AND ?';
            queryParams.push(startDate, endDate);
        }

        const [summary] = await pool.execute(`
            SELECT 
                s.id,
                s.first_name,
                s.last_name,
                s.roll_number,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
                COUNT(a.id) as total_days,
                ROUND((COUNT(CASE WHEN a.status = 'present' THEN 1 END) / COUNT(a.id)) * 100, 2) as attendance_percentage
            FROM students s
            LEFT JOIN attendance a ON s.id = a.student_id AND a.class_id = ?
            ${dateCondition}
            WHERE s.class_id = ?
            GROUP BY s.id, s.first_name, s.last_name, s.roll_number
            ORDER BY s.roll_number
        `, [...queryParams, classId]);

        res.json({ summary });
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
});

// Get attendance report for a student
router.get('/student/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;
        
        let dateCondition = '';
        let queryParams = [studentId];
        
        if (startDate && endDate) {
            dateCondition = 'WHERE a.date BETWEEN ? AND ?';
            queryParams.push(startDate, endDate);
        }

        const [records] = await pool.execute(`
            SELECT 
                a.*,
                c.name as class_name
            FROM attendance a
            JOIN classes c ON a.class_id = c.id
            WHERE a.student_id = ?
            ${dateCondition}
            ORDER BY a.date DESC
        `, queryParams);

        // Get attendance statistics
        const [stats] = await pool.execute(`
            SELECT 
                status,
                COUNT(*) as count
            FROM attendance a
            WHERE a.student_id = ?
            ${dateCondition.replace('WHERE', 'AND')}
            GROUP BY status
        `, queryParams);

        const attendanceStats = {};
        stats.forEach(stat => {
            attendanceStats[stat.status] = stat.count;
        });

        res.json({
            records,
            stats: attendanceStats
        });
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: 'Failed to fetch student attendance data' });
    }
});

// Get monthly attendance statistics for a class
router.get('/:classId/monthly/:year/:month', async (req, res) => {
    try {
        const { classId, year, month } = req.params;
        
        const [stats] = await pool.execute(`
            SELECT 
                DATE(date) as attendance_date,
                status,
                COUNT(*) as count
            FROM attendance
            WHERE class_id = ? AND YEAR(date) = ? AND MONTH(date) = ?
            GROUP BY DATE_FORMAT(date, '%Y-%m-%d'), status
            ORDER BY attendance_date
        `, [classId, year, month]);

        // Group by date
        const dailyStats = {};
        stats.forEach(stat => {
            if (!dailyStats[stat.attendance_date]) {
                dailyStats[stat.attendance_date] = {};
            }
            dailyStats[stat.attendance_date][stat.status] = stat.count;
        });

        res.json({ dailyStats });
    } catch (error) {
        console.error('Error fetching monthly attendance:', error);
        res.status(500).json({ error: 'Failed to fetch monthly attendance data' });
    }
});


module.exports = router;
