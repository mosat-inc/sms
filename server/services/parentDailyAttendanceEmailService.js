const cron = require('node-cron');
const { pool } = require('../config/database');
const { sendEmail } = require('./emailService');
const { getParentEmailsForStudents } = require('./parentContactService');

const formatDateLong = (date) => {
  try {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: '2-digit' }).format(date);
  } catch (_e) {
    return date.toDateString();
  }
};

const statusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'present') return { label: 'Present', badge: '✅', tone: '#16a34a' };
  if (s === 'absent') return { label: 'Absent', badge: '❌', tone: '#dc2626' };
  if (s === 'late') return { label: 'Late', badge: '⏰', tone: '#f59e0b' };
  if (s === 'excused') return { label: 'Permission', badge: '📝', tone: '#2563eb' };
  return { label: 'Not taken', badge: '⚠️', tone: '#64748b' };
};

const getTodayIso = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const buildAttendanceEmail = ({ schoolName, student, isoDate, morning, afternoon }) => {
  const dateObj = new Date(`${isoDate}T00:00:00`);
  const longDate = formatDateLong(dateObj);

  const m = statusLabel(morning?.status);
  const a = statusLabel(afternoon?.status);

  const subject = `Daily Attendance — ${student.student_name || student.admission_number || 'Student'} (${schoolName})`;

  const row = (sessionName, sessionStatus) => {
    const info = statusLabel(sessionStatus?.status);
    const note = String(sessionStatus?.notes || '').trim();
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">${sessionName}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:700;color:${info.tone}">
          ${info.badge} ${info.label}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#334155">${note ? note.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—'}</td>
      </tr>
    `.trim();
  };

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45;color:#0f172a">
      <div style="max-width:720px;margin:0 auto;padding:24px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px">
          <div>
            <div style="font-size:12px;color:#64748b">${schoolName} • Parent Portal</div>
            <div style="font-size:20px;font-weight:900;color:#111827">Daily Attendance Report</div>
            <div style="color:#334155;margin-top:4px">${longDate}</div>
          </div>
          <div style="text-align:right;font-size:12px;color:#64748b">
            ${student.class_name ? `<div>Class: <strong style="color:#111827">${student.class_name}</strong></div>` : ''}
            ${student.admission_number ? `<div>Admission: <strong style="color:#111827">${student.admission_number}</strong></div>` : ''}
          </div>
        </div>

        <div style="margin-bottom:14px;padding:12px 14px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb">
          <div style="font-weight:800;color:#111827">${student.student_name || 'Student'}</div>
          <div style="color:#64748b;font-size:12px">Morning: <span style="color:${m.tone};font-weight:800">${m.badge} ${m.label}</span> • Afternoon: <span style="color:${a.tone};font-weight:800">${a.badge} ${a.label}</span></div>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
          <thead>
            <tr style="background:#eef2ff">
              <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb">Session</th>
              <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb">Status</th>
              <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #e5e7eb">Note</th>
            </tr>
          </thead>
          <tbody>
            ${row('Morning', morning)}
            ${row('Afternoon', afternoon)}
          </tbody>
        </table>

        <p style="margin:14px 0 0;color:#64748b;font-size:12px">
          If a session shows “Not taken”, it means the teacher has not submitted attendance for that session yet.
        </p>
      </div>
    </div>
  `.trim();

  const text = [
    `Daily Attendance Report - ${schoolName}`,
    longDate,
    '',
    `Student: ${student.student_name || ''}`.trim(),
    student.admission_number ? `Admission: ${student.admission_number}` : null,
    student.class_name ? `Class: ${student.class_name}` : null,
    '',
    `Morning: ${m.label}`,
    `Afternoon: ${a.label}`,
    '',
    `Morning note: ${String(morning?.notes || '').trim() || '-'}`,
    `Afternoon note: ${String(afternoon?.notes || '').trim() || '-'}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, html, text };
};

const runParentDailyAttendanceEmails = async () => {
  const isoDate = getTodayIso();
  const schoolName = (process.env.SCHOOL_NAME || 'UBUNIFU SEC').trim();

  const [students] = await pool.execute(
    `
      SELECT
        s.id as student_id,
        s.admission_number,
        c.name as class_name,
        TRIM(CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,''))) as student_name
      FROM students s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.status = 'active'
    `
  );

  if (!students?.length) return;

  const [attRows] = await pool.execute(
    `
      SELECT student_id, session, status, notes
      FROM attendance
      WHERE date = ?
    `,
    [isoDate]
  );

  const attendanceMap = new Map();
  for (const r of attRows || []) {
    const sid = Number(r.student_id);
    if (!Number.isFinite(sid)) continue;
    if (!attendanceMap.has(sid)) attendanceMap.set(sid, {});
    attendanceMap.get(sid)[r.session] = {
      status: r.status,
      notes: r.notes,
    };
  }

  const emailMap = await getParentEmailsForStudents(students.map((s) => s.student_id));

  for (const s of students) {
    const emails = emailMap.get(Number(s.student_id)) || [];
    if (!emails.length) continue;

    const daily = attendanceMap.get(Number(s.student_id)) || {};
    const morning = daily.morning || { status: 'not_taken', notes: null };
    const afternoon = daily.afternoon || { status: 'not_taken', notes: null };

    const content = buildAttendanceEmail({
      schoolName,
      student: {
        student_name: String(s.student_name || '').trim() || null,
        admission_number: s.admission_number || null,
        class_name: s.class_name || null,
      },
      isoDate,
      morning,
      afternoon,
    });

    await sendEmail({
      context: 'daily_attendance_report',
      studentId: Number(s.student_id),
      to: emails,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  }
};

const initializeParentDailyAttendanceEmailScheduler = () => {
  const cronExpr = (process.env.PARENT_DAILY_ATTENDANCE_EMAIL_CRON || '30 17 * * *').trim(); // default 17:30
  cron.schedule(cronExpr, async () => {
    try {
      await runParentDailyAttendanceEmails();
    } catch (e) {
      // best-effort
      // eslint-disable-next-line no-console
      console.warn('Parent daily attendance emails failed:', e.message);
    }
  });
};

module.exports = {
  initializeParentDailyAttendanceEmailScheduler,
  runParentDailyAttendanceEmails,
};

