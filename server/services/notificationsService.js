const { pool } = require('../config/database');
const { sendEmail } = require('./emailService');
const { getParentEmailsForStudent } = require('./parentContactService');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const statusEmoji = (priority) => {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent') return '🚨';
  if (p === 'high') return '⚠️';
  if (p === 'medium') return 'ℹ️';
  return '✅';
};

const getStudentContext = async (studentId) => {
  const id = Number(studentId);
  if (!Number.isFinite(id)) return null;
  const [rows] = await pool.execute(
    `
      SELECT
        s.id,
        s.admission_number,
        c.name as class_name,
        CONCAT(COALESCE(u.first_name,''), ' ', COALESCE(u.last_name,'')) as student_name
      FROM students s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN classes c ON c.id = s.class_id
      WHERE s.id = ?
      LIMIT 1
    `,
    [id]
  );
  if (!rows?.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    admission_number: r.admission_number || null,
    class_name: r.class_name || null,
    student_name: String(r.student_name || '').trim() || null,
  };
};

const formatDateSw = (isoDate) => {
  const d = new Date(`${String(isoDate || '').trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(isoDate || '').trim();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const swSessionLabel = (session) => {
  const s = String(session || '').toLowerCase();
  if (s === 'morning') return 'asubuhi';
  if (s === 'afternoon' || s === 'evening') return 'jioni';
  return 'siku nzima';
};

const buildAttendanceSwahiliEmail = ({ student, status, date, session }) => {
  const schoolName = (process.env.SCHOOL_NAME || 'UBUNIFU SEC').trim();
  const schoolPhone = (process.env.SCHOOL_PHONE || '').trim();
  const studentName = student?.student_name || 'mwanafunzi';
  const className = student?.class_name || 'darasa';
  const dateFormatted = formatDateSw(date);

  if (status === 'absent') {
    const sessionText = swSessionLabel(session);
    const subject = 'TAARIFA YA KUTOKUHUDHURIA MASOMO';
    const text = [
      `Habari mzazi wa ${studentName},`,
      '',
      `Tunakujulisha kuwa mwanafunzi ${studentName} wa darasa ${className} hakuhudhuria masomo tarehe ${dateFormatted} (${sessionText}).`,
      '',
      'Ikiwa kuna sababu maalum au kama taarifa hii si sahihi, tafadhali wasiliana na ofisi ya shule kwa ufafanuzi zaidi.',
      '',
      'Asante kwa ushirikiano wako.',
      '',
      schoolName,
      schoolPhone ? `Simu: ${schoolPhone}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45;color:#0f172a">
        <div style="max-width:640px;margin:0 auto;padding:24px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">${escapeHtml(schoolName)} • Taarifa kwa Mzazi</div>
          <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:12px">${escapeHtml(subject)}</div>
          <p style="margin:0 0 10px;color:#111827">Habari mzazi wa <strong>${escapeHtml(studentName)}</strong>,</p>
          <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;color:#0f172a">
            Tunakujulisha kuwa mwanafunzi <strong>${escapeHtml(studentName)}</strong> wa darasa <strong>${escapeHtml(className)}</strong>
            hakuhudhuria masomo tarehe <strong>${escapeHtml(dateFormatted)}</strong> (${escapeHtml(sessionText)}).
          </div>
          <p style="margin:12px 0 0;color:#334155">
            Ikiwa kuna sababu maalum au kama taarifa hii si sahihi, tafadhali wasiliana na ofisi ya shule kwa ufafanuzi zaidi.
          </p>
          <p style="margin:12px 0 0;color:#111827;font-weight:700">Asante kwa ushirikiano wako.</p>
          <p style="margin:14px 0 0;color:#64748b;font-size:12px">
            ${escapeHtml(schoolName)}${schoolPhone ? `<br/>Simu: ${escapeHtml(schoolPhone)}` : ''}
          </p>
        </div>
      </div>
    `.trim();

    return { subject, html, text };
  }

  if (status === 'late') {
    const subject = 'TAARIFA YA KUCHELEWA SHULENI';
    const text = [
      `Habari mzazi wa ${studentName},`,
      '',
      `Tunakujulisha kuwa mwanafunzi ${studentName} wa darasa ${className} alichelewa kufika shuleni tarehe ${dateFormatted}.`,
      '',
      'Tunaomba ushirikiano wako kuhakikisha mwanafunzi anafika shuleni kwa wakati ili kuepuka athari kwenye masomo yake.',
      '',
      'Asante kwa ushirikiano wako.',
      '',
      schoolName,
      schoolPhone ? `Simu: ${schoolPhone}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45;color:#0f172a">
        <div style="max-width:640px;margin:0 auto;padding:24px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">${escapeHtml(schoolName)} • Taarifa kwa Mzazi</div>
          <div style="font-size:18px;font-weight:900;color:#111827;margin-bottom:12px">${escapeHtml(subject)}</div>
          <p style="margin:0 0 10px;color:#111827">Habari mzazi wa <strong>${escapeHtml(studentName)}</strong>,</p>
          <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;color:#0f172a">
            Tunakujulisha kuwa mwanafunzi <strong>${escapeHtml(studentName)}</strong> wa darasa <strong>${escapeHtml(className)}</strong>
            alichelewa kufika shuleni tarehe <strong>${escapeHtml(dateFormatted)}</strong>.
          </div>
          <p style="margin:12px 0 0;color:#334155">
            Tunaomba ushirikiano wako kuhakikisha mwanafunzi anafika shuleni kwa wakati ili kuepuka athari kwenye masomo yake.
          </p>
          <p style="margin:12px 0 0;color:#111827;font-weight:700">Asante kwa ushirikiano wako.</p>
          <p style="margin:14px 0 0;color:#64748b;font-size:12px">
            ${escapeHtml(schoolName)}${schoolPhone ? `<br/>Simu: ${escapeHtml(schoolPhone)}` : ''}
          </p>
        </div>
      </div>
    `.trim();

    return { subject, html, text };
  }

  return null;
};

const buildNotificationEmail = ({ student, title, message, priority, type, data }) => {
  const maybeAttendanceSw = (() => {
    if (String(type || '').toLowerCase() !== 'attendance') return null;
    const status = String(data?.status || '').toLowerCase();
    if (status !== 'absent' && status !== 'late') return null;
    const date = data?.date;
    const session = data?.session;
    return buildAttendanceSwahiliEmail({ student, status, date, session });
  })();

  if (maybeAttendanceSw) return maybeAttendanceSw;

  const schoolName = (process.env.SCHOOL_NAME || 'UBUNIFU SEC').trim();
  const emoji = statusEmoji(priority);
  const subject = `${emoji} ${title} — ${schoolName}`;

  const studentLineParts = [];
  if (student?.student_name) studentLineParts.push(`<strong>${student.student_name}</strong>`);
  if (student?.admission_number) studentLineParts.push(`Admission: <strong>${student.admission_number}</strong>`);
  if (student?.class_name) studentLineParts.push(`Class: <strong>${student.class_name}</strong>`);

  const studentLine = studentLineParts.length ? `<p style="margin:0 0 10px;color:#111827">${studentLineParts.join(' • ')}</p>` : '';

  const safeMessage = escapeHtml(message);

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45;color:#0f172a">
      <div style="max-width:640px;margin:0 auto;padding:24px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#4f46e5,#9333ea);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">
            ${schoolName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style="font-size:14px;color:#64748b">${schoolName} • Parent Notification</div>
            <div style="font-size:18px;font-weight:800;color:#111827">${title}</div>
          </div>
        </div>
        ${studentLine}
        <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb;color:#0f172a">
          ${safeMessage.replace(/\n/g, '<br/>')}
        </div>
        <p style="margin:14px 0 0;color:#64748b;font-size:12px">
          This message was sent automatically by the School Management System.
        </p>
      </div>
    </div>
  `.trim();

  const textParts = [];
  if (title) textParts.push(title);
  if (student?.student_name) textParts.push(`Student: ${student.student_name}`);
  if (student?.admission_number) textParts.push(`Admission: ${student.admission_number}`);
  if (student?.class_name) textParts.push(`Class: ${student.class_name}`);
  if (message) textParts.push('', message);
  const text = textParts.join('\n');

  return { subject, html, text };
};

const createUserNotification = async ({
  userId,
  studentId,
  type = 'system',
  title,
  message,
  priority = 'medium',
  data = null,
}) => {
  if ((!userId && !studentId) || !title || !message) return;
  await pool.execute(
    `INSERT INTO user_notifications (user_id, student_id, type, title, message, priority, data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId || null, studentId || null, type, title, message, priority, data ? JSON.stringify(data) : null]
  );
};

const createParentNotificationForStudent = async ({ studentId, ...rest }) => {
  if (!studentId) return;
  await createUserNotification({ studentId, ...rest });

  // Best-effort email: do not block main request/response.
  setImmediate(async () => {
    try {
      const emails = await getParentEmailsForStudent(studentId);
      if (!emails.length) return;

      const student = await getStudentContext(studentId);
      const emailContent = buildNotificationEmail({
        student,
        type: rest.type,
        title: rest.title,
        message: rest.message,
        priority: rest.priority,
        data: rest.data,
      });

      await sendEmail({
        context: `parent_notification:${rest.type || 'system'}`,
        studentId,
        to: emails,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });
    } catch (_e) {
      // Never throw from background email
    }
  });
};

module.exports = {
  createUserNotification,
  createParentNotificationForStudent,
};
