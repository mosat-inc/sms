const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const Auth = require('../utils/auth');
const { authenticateToken } = Auth;
const cache = require('../utils/cache');
const { sendEmail } = require('../services/emailService');

const uniq = (arr) => [...new Set((arr || []).map((v) => String(v || '').trim()).filter(Boolean))];

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < (arr || []).length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const getParentEmailsForAnnouncement = async ({ targetAudience, classId }) => {
  const audience = String(targetAudience || 'all');
  if (audience === 'teachers') return [];

  // Parents can see announcements targeted to: all, parents, students, specific_class (per parent portal logic)
  const eligible = new Set(['all', 'parents', 'students', 'specific_class']);
  if (!eligible.has(audience)) return [];

  const params = [];
  // Use ONLY the primary supervisor email (the one set during student registration/admission)
  // to avoid emailing multiple guardians unless the school explicitly changes the primary link.
  let where = `s.status = 'active' AND ss.is_primary_supervisor = TRUE AND sup.email IS NOT NULL AND TRIM(sup.email) <> ''`;
  if (audience === 'specific_class') {
    where += ' AND s.class_id = ?';
    params.push(classId || null);
  }

  const [rows] = await pool.execute(
    `
      SELECT DISTINCT sup.email
      FROM students s
      INNER JOIN student_supervisors ss ON ss.student_id = s.id
      INNER JOIN supervisors sup ON sup.id = ss.supervisor_id
      WHERE ${where}
    `,
    params
  );

  return uniq((rows || []).map((r) => r.email).filter(isValidEmail));
};

// Helper function to execute queries
const executeQuery = async (query, params = []) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return { rows };
  } finally {
    connection.release();
  }
};

// Get unread announcements count for current user
router.get('/announcements/unread-count', authenticateToken, async (req, res) => {
  try {
    const currentUser = req.user;
    
    // Check cache first
    const cacheKey = cache.createUnreadCountKey(currentUser.id);
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      res.locals.cacheHit = true; // Mark as cache hit to bypass rate limiting
      return res.json(cachedResult);
    }
    
    let whereConditions = [
      'a.is_active = TRUE',
      '(a.expires_at IS NULL OR a.expires_at > NOW())',
      'ar.read_at IS NULL' // Not read yet
    ];
    
    let queryParams = [currentUser.id];
    
    // Role-based visibility
    if (currentUser.role !== 'admin') {
      whereConditions.push(`
        (a.target_audience = 'all' 
         OR a.target_audience = ? 
         OR (a.target_audience = 'specific_class' AND a.class_id = (
           SELECT class_id FROM students WHERE user_id = ?
         )))
      `);
      queryParams.push(currentUser.role === 'teacher' ? 'teachers' : 'students');
      queryParams.push(currentUser.id);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const query = `
      SELECT COUNT(*) as unread_count
      FROM announcements a
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
      ${whereClause}
    `;
    
    const result = await executeQuery(query, queryParams);
    
    const response = {
      success: true,
      unread_count: result.rows[0]?.unread_count || 0
    };
    
    // Cache the response for 20 seconds
    cache.set(cacheKey, response, 20000);
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count',
      error: error.message
    });
  }
});

// Get all announcements with filtering
router.get('/announcements', authenticateToken, async (req, res) => {
  try {
    const { priority, target_audience, status, since } = req.query;
    const currentUser = req.user;
    
    // Check cache first (but not for real-time updates with 'since' parameter that's very recent)
    const shouldUseCache = !since || (since && Date.now() - new Date(since).getTime() > 60000); // Don't cache very recent 'since' queries
    if (shouldUseCache) {
      const cacheKey = cache.createCommunicationKey(currentUser.id, req.query);
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        res.locals.cacheHit = true; // Mark as cache hit to bypass rate limiting
        return res.json(cachedResult);
      }
    }
    
    let whereConditions = [];
    let queryParams = [];
    
    // Filter by timestamp for efficient polling
    if (since) {
      whereConditions.push('(a.created_at >= ? OR a.updated_at >= ?)');
      queryParams.push(since, since);
    }
    
    // Filter by priority
    if (priority) {
      whereConditions.push('a.priority = ?');
      queryParams.push(priority);
    }
    
    // Filter by target audience
    if (target_audience) {
      whereConditions.push('a.target_audience = ?');
      queryParams.push(target_audience);
    }
    
    // Filter by status
    if (status === 'active') {
      whereConditions.push('a.is_active = TRUE');
      whereConditions.push('(a.expires_at IS NULL OR a.expires_at > NOW())');
    } else if (status === 'inactive') {
      whereConditions.push('(a.is_active = FALSE OR a.expires_at <= NOW())');
    }
    
    // Role-based visibility
    if (currentUser.role !== 'admin') {
      // Non-admin users can only see announcements targeted to them
      whereConditions.push(`
        (a.target_audience = 'all' 
         OR a.target_audience = ? 
         OR (a.target_audience = 'specific_class' AND a.class_id = (
           SELECT class_id FROM students WHERE user_id = ?
         )))
      `);
      queryParams.push(currentUser.role === 'teacher' ? 'teachers' : 'students');
      queryParams.push(currentUser.id);
      
      // Only show active announcements to non-admin users
      if (!whereConditions.some(condition => condition.includes('is_active'))) {
        whereConditions.push('a.is_active = TRUE');
        whereConditions.push('(a.expires_at IS NULL OR a.expires_at > NOW())');
      }
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';
    
    const query = `
      SELECT 
        a.*,
u.username as author_name,
        c.name as class_name,
        c.level as class_level,
        ar.read_at IS NOT NULL as is_read
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN classes c ON a.class_id = c.id
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
      ${whereClause}
      ORDER BY 
        CASE a.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        a.created_at DESC
      LIMIT 50
    `;
    
    // Add current user ID for the read status join
    const finalParams = [req.user.id, ...queryParams];
    const result = await executeQuery(query, finalParams);
    
    const response = {
      success: true,
      data: result.rows || []
    };
    
    // Cache the response if it should be cached
    if (shouldUseCache) {
      const cacheKey = cache.createCommunicationKey(currentUser.id, req.query);
      const cacheTTL = since ? 15000 : 30000; // Shorter TTL for filtered queries
      cache.set(cacheKey, response, cacheTTL);
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message
    });
  }
});

// Create new announcement (Admin only)
router.post('/announcements', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create announcements'
      });
    }
    
    const { 
      title, 
      content, 
      priority = 'medium', 
      target_audience = 'all', 
      class_id, 
      expires_at, 
      is_active = true 
    } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    // Validate class_id if target_audience is specific_class
    if (target_audience === 'specific_class' && !class_id) {
      return res.status(400).json({
        success: false,
        message: 'Class must be selected for specific class announcements'
      });
    }
    
    const insertQuery = `
      INSERT INTO announcements (
        title, content, priority, target_audience, class_id, 
        expires_at, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(insertQuery, [
      title,
      content,
      priority,
      target_audience,
      target_audience === 'specific_class' ? class_id : null,
      expires_at || null,
      is_active,
      req.user.id
    ]);

    // Best-effort email notification to parents (async, non-blocking)
    setImmediate(async () => {
      try {
        const schoolName = (process.env.SCHOOL_NAME || 'UBUNIFU SEC').trim();
        const subject = `📢 Announcement — ${title} (${schoolName})`;

        const recipients = await getParentEmailsForAnnouncement({
          targetAudience: target_audience,
          classId: target_audience === 'specific_class' ? class_id : null,
        });
        if (!recipients.length) return;

        const safeTitle = String(title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeContent = String(content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

        const html = `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;line-height:1.45;color:#0f172a">
            <div style="max-width:680px;margin:0 auto;padding:24px;background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">
              <div style="font-size:12px;color:#64748b;margin-bottom:8px">${schoolName} • Announcement</div>
              <div style="font-size:20px;font-weight:900;color:#111827;margin-bottom:10px">${safeTitle}</div>
              <div style="padding:14px 16px;border-radius:12px;background:#f8fafc;border:1px solid #e5e7eb">
                ${safeContent}
              </div>
              <p style="margin:14px 0 0;color:#64748b;font-size:12px">
                You are receiving this email because your contact is linked as a parent/guardian in the School Management System.
              </p>
            </div>
          </div>
        `.trim();

        const text = `Announcement: ${title}\n\n${content}\n\n${schoolName}`;

        // Brevo allows multiple recipients; use small batches to avoid provider limits.
        for (const batch of chunk(recipients, 50)) {
          await sendEmail({ context: 'announcement_to_parents', studentId: null, to: batch, subject, html, text });
        }
      } catch (_e) {
        // Ignore email failures
      }
    });
    
    // Invalidate all communication cache since new announcement affects all users
    cache.invalidateAllCommunicationCache();
    
    res.json({
      success: true,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
});

// Update announcement (Admin only)
router.put('/announcements/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can edit announcements'
      });
    }
    
    const { id } = req.params;
    const { 
      title, 
      content, 
      priority, 
      target_audience, 
      class_id, 
      expires_at, 
      is_active 
    } = req.body;
    
    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }
    
    // Check if announcement exists
    const checkQuery = 'SELECT id FROM announcements WHERE id = ?';
    const checkResult = await executeQuery(checkQuery, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    const updateQuery = `
      UPDATE announcements 
      SET title = ?, content = ?, priority = ?, target_audience = ?, 
          class_id = ?, expires_at = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      title,
      content,
      priority,
      target_audience,
      target_audience === 'specific_class' ? class_id : null,
      expires_at || null,
      is_active,
      id
    ]);
    
    // Invalidate all communication cache since updated announcement affects all users
    cache.invalidateAllCommunicationCache();
    
    res.json({
      success: true,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement',
      error: error.message
    });
  }
});

// Toggle announcement status (Admin only)
router.patch('/announcements/:id/toggle-status', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can toggle announcement status'
      });
    }
    
    const { id } = req.params;
    
    const updateQuery = `
      UPDATE announcements 
      SET is_active = NOT is_active, updated_at = NOW()
      WHERE id = ?
    `;
    
    const result = await executeQuery(updateQuery, [id]);
    
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Announcement status updated successfully'
    });
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement status',
      error: error.message
    });
  }
});

// Delete announcement (Admin only)
router.delete('/announcements/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete announcements'
      });
    }
    
    const { id } = req.params;
    
    const deleteQuery = 'DELETE FROM announcements WHERE id = ?';
    const result = await executeQuery(deleteQuery, [id]);
    
    if (result.rows.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message
    });
  }
});

// Get announcement statistics (Admin only)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can view announcement statistics'
      });
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_announcements,
        COUNT(CASE WHEN is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 END) as active_announcements,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_announcements,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_announcements,
        COUNT(CASE WHEN target_audience = 'all' THEN 1 END) as general_announcements,
        COUNT(CASE WHEN target_audience = 'specific_class' THEN 1 END) as class_specific_announcements
      FROM announcements
    `;
    
    const result = await executeQuery(statsQuery);
    
    res.json({
      success: true,
      data: result.rows[0] || {}
    });
  } catch (error) {
    console.error('Error fetching announcement statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement statistics',
      error: error.message
    });
  }
});

// Mark announcement as read by user
router.post('/announcements/:id/mark-read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if announcement exists and user can see it
    let checkQuery, checkParams;
    
    if (req.user.role === 'admin') {
      // Admins can mark any announcement as read
      checkQuery = `
        SELECT a.*, c.name as class_name
        FROM announcements a
        LEFT JOIN classes c ON a.class_id = c.id
        WHERE a.id = ?
      `;
      checkParams = [id];
    } else {
      // Non-admins can only mark announcements they have access to
      checkQuery = `
        SELECT a.*, c.name as class_name
        FROM announcements a
        LEFT JOIN classes c ON a.class_id = c.id
        WHERE a.id = ? 
          AND a.is_active = TRUE 
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
          AND (a.target_audience = 'all' 
               OR a.target_audience = ? 
               OR (a.target_audience = 'specific_class' AND a.class_id = (
                 SELECT class_id FROM students WHERE user_id = ?
               )))
      `;
      checkParams = [
        id,
        req.user.role === 'teacher' ? 'teachers' : 'students',
        req.user.id
      ];
    }
    
    const checkResult = await executeQuery(checkQuery, checkParams);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found or access denied'
      });
    }
    
    // Insert or update read status
    const readQuery = `
      INSERT INTO announcement_reads (announcement_id, user_id, read_at) 
      VALUES (?, ?, NOW()) 
      ON DUPLICATE KEY UPDATE read_at = NOW()
    `;
    
    await executeQuery(readQuery, [id, req.user.id]);
    
    // Invalidate cache for this specific user since their read status changed
    cache.invalidateUserCache(req.user.id);
    
    res.json({
      success: true,
      message: 'Announcement marked as read'
    });
  } catch (error) {
    console.error('Error marking announcement as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark announcement as read',
      error: error.message
    });
  }
});

module.exports = router;
