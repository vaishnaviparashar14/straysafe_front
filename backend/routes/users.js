const express = require('express');
const db = require('../config/database');
const { validateUUID, validateQuery, querySchemas } = require('../middleware/validation');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', verifyToken, requireRole(['admin']), validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        u.organization,
        u.avatar_url,
        u.is_verified,
        u.is_active,
        u.created_at,
        u.last_login,
        COUNT(r.id) as reports_count
      FROM users u
      LEFT JOIN reports r ON u.id = r.reported_by
      GROUP BY u.id, u.name, u.email, u.role, u.phone, u.organization, u.avatar_url, u.is_verified, u.is_active, u.created_at, u.last_login
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM users';

    const [usersResult, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery)
    ]);

    const users = usersResult.rows;
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by ID
router.get('/:id', verifyToken, validateUUID('id'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user is viewing their own profile or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.phone,
        u.organization,
        u.avatar_url,
        u.is_verified,
        u.is_active,
        u.created_at,
        u.last_login,
        COUNT(r.id) as reports_count,
        COUNT(ru.id) as updates_count
      FROM users u
      LEFT JOIN reports r ON u.id = r.reported_by
      LEFT JOIN report_updates ru ON u.id = ru.author_id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.role, u.phone, u.organization, u.avatar_url, u.is_verified, u.is_active, u.created_at, u.last_login
    `;

    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // If user is NGO, get NGO details
    if (user.role === 'ngo') {
      const ngoQuery = `
        SELECT 
          n.*,
          COUNT(r.id) as assigned_reports_count
        FROM ngos n
        LEFT JOIN reports r ON n.id = r.assigned_ngo
        WHERE n.user_id = $1
        GROUP BY n.id, n.user_id, n.organization_name, n.registration_number, n.website, n.description, n.address, n.city, n.state, n.country, n.postal_code, n.contact_person, n.contact_email, n.contact_phone, n.service_areas, n.specializations, n.is_approved, n.capacity_limit, n.created_at, n.updated_at
      `;

      const ngoResult = await db.query(ngoQuery, [userId]);
      if (ngoResult.rows.length > 0) {
        user.ngo = ngoResult.rows[0];
      }
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's reports
router.get('/:id/reports', verifyToken, validateUUID('id'), validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const userId = req.params.id;
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is viewing their own reports or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const query = `
      SELECT 
        r.*,
        n.organization_name as ngo_name,
        COUNT(*) OVER() as total_count
      FROM reports r
      LEFT JOIN ngos n ON r.assigned_ngo = n.id
      WHERE r.reported_by = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    const reports = result.rows;

    const totalCount = reports.length > 0 ? parseInt(reports[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Clean up total_count from individual reports
    reports.forEach(report => delete report.total_count);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's notifications
router.get('/:id/notifications', verifyToken, validateUUID('id'), validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const userId = req.params.id;
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is viewing their own notifications
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const query = `
      SELECT 
        n.*,
        COUNT(*) OVER() as total_count
      FROM notifications n
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    const notifications = result.rows;

    const totalCount = notifications.length > 0 ? parseInt(notifications[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Clean up total_count from individual notifications
    notifications.forEach(notification => delete notification.total_count);

    res.json({
      notifications,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.patch('/notifications/:notificationId/read', verifyToken, validateUUID('notificationId'), async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user.id;

    // Check if notification belongs to user
    const checkQuery = 'SELECT user_id FROM notifications WHERE id = $1';
    const checkResult = await db.query(checkQuery, [notificationId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Mark as read
    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1',
      [notificationId]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.patch('/:id/notifications/read-all', verifyToken, validateUUID('id'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user is marking their own notifications
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const result = await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ 
      message: 'All notifications marked as read',
      count: result.rowCount
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's activity log
router.get('/:id/activity', verifyToken, validateUUID('id'), validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const userId = req.params.id;
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is viewing their own activity or is admin
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const query = `
      SELECT 
        a.*,
        COUNT(*) OVER() as total_count
      FROM activity_logs a
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [userId, limit, offset]);
    const activities = result.rows;

    const totalCount = activities.length > 0 ? parseInt(activities[0].total_count) : 0;
    const totalPages = Math.ceil(totalCount / limit);

    // Clean up total_count from individual activities
    activities.forEach(activity => delete activity.total_count);

    res.json({
      activities,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deactivate user account (admin only)
router.patch('/:id/deactivate', verifyToken, requireRole(['admin']), validateUUID('id'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const userResult = await db.query('SELECT id, is_active FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(400).json({ error: 'User is already deactivated' });
    }

    // Deactivate user
    await db.query(
      'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Invalidate all user sessions
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Activate user account (admin only)
router.patch('/:id/activate', verifyToken, requireRole(['admin']), validateUUID('id'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const userResult = await db.query('SELECT id, is_active FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    if (user.is_active) {
      return res.status(400).json({ error: 'User is already active' });
    }

    // Activate user
    await db.query(
      'UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user statistics
router.get('/stats/overview', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN role = 'citizen' THEN 1 END) as citizen_count,
        COUNT(CASE WHEN role = 'ngo' THEN 1 END) as ngo_count,
        COUNT(CASE WHEN role = 'volunteer' THEN 1 END) as volunteer_count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_last_30_days,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_last_7_days
      FROM users
    `;

    const result = await db.query(query);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;