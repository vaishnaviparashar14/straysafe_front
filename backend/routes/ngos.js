const express = require('express');
const db = require('../config/database');
const { validate, validateUUID, validateQuery, ngoSchemas, querySchemas } = require('../middleware/validation');
const { verifyToken, requireRole, requireNGO } = require('../middleware/auth');

const router = express.Router();

// Get all NGOs
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        n.*,
        u.name as contact_name,
        u.email as user_email,
        u.avatar_url,
        COUNT(r.id) as assigned_reports_count,
        COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as active_reports_count
      FROM ngos n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN reports r ON n.id = r.assigned_ngo
      WHERE n.is_approved = true AND u.is_active = true
      GROUP BY n.id, n.user_id, n.organization_name, n.registration_number, n.website, n.description, n.address, n.city, n.state, n.country, n.postal_code, n.contact_person, n.contact_email, n.contact_phone, n.service_areas, n.specializations, n.is_approved, n.capacity_limit, n.created_at, n.updated_at, u.name, u.email, u.avatar_url
      ORDER BY n.created_at DESC
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get NGOs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get NGO by ID
router.get('/:id', validateUUID('id'), async (req, res) => {
  try {
    const ngoId = req.params.id;

    const query = `
      SELECT 
        n.*,
        u.name as contact_name,
        u.email as user_email,
        u.phone as user_phone,
        u.avatar_url,
        u.created_at as user_created_at,
        COUNT(r.id) as total_reports_count,
        COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as active_reports_count,
        COUNT(CASE WHEN r.status = 'rescued' THEN 1 END) as rescued_reports_count,
        COUNT(CASE WHEN r.status = 'adopted' THEN 1 END) as adopted_reports_count
      FROM ngos n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN reports r ON n.id = r.assigned_ngo
      WHERE n.id = $1
      GROUP BY n.id, n.user_id, n.organization_name, n.registration_number, n.website, n.description, n.address, n.city, n.state, n.country, n.postal_code, n.contact_person, n.contact_email, n.contact_phone, n.service_areas, n.specializations, n.is_approved, n.capacity_limit, n.created_at, n.updated_at, u.name, u.email, u.phone, u.avatar_url, u.created_at
    `;

    const result = await db.query(query, [ngoId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get NGO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new NGO
router.post('/register', verifyToken, validate(ngoSchemas.register), async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has an NGO
    const existingNGO = await db.query(
      'SELECT id FROM ngos WHERE user_id = $1',
      [userId]
    );

    if (existingNGO.rows.length > 0) {
      return res.status(409).json({ error: 'User already has an NGO registration' });
    }

    // Update user role to NGO
    await db.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['ngo', userId]
    );

    const {
      organization_name,
      registration_number,
      website,
      description,
      address,
      city,
      state,
      country,
      postal_code,
      contact_person,
      contact_email,
      contact_phone,
      service_areas = [],
      specializations = [],
      capacity_limit = 50
    } = req.body;

    const query = `
      INSERT INTO ngos (
        user_id, organization_name, registration_number, website, description,
        address, city, state, country, postal_code, contact_person,
        contact_email, contact_phone, service_areas, specializations, capacity_limit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      userId,
      organization_name,
      registration_number || null,
      website || null,
      description || null,
      address || null,
      city || null,
      state || null,
      country || null,
      postal_code || null,
      contact_person || null,
      contact_email || null,
      contact_phone || null,
      service_areas,
      specializations,
      capacity_limit
    ];

    const result = await db.query(query, values);
    const newNGO = result.rows[0];

    res.status(201).json({
      message: 'NGO registered successfully. Pending approval.',
      ngo: newNGO
    });
  } catch (error) {
    console.error('Register NGO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update NGO profile
router.put('/:id', verifyToken, validateUUID('id'), validate(ngoSchemas.update), async (req, res) => {
  try {
    const ngoId = req.params.id;
    const updates = req.body;

    // Check if NGO exists and user has permission
    const ngoResult = await db.query(
      'SELECT * FROM ngos WHERE id = $1',
      [ngoId]
    );

    if (ngoResult.rows.length === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    const ngo = ngoResult.rows[0];

    // Check permissions
    const canEdit = 
      req.user.id === ngo.user_id ||
      req.user.role === 'admin';

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(ngoId);

    const query = `
      UPDATE ngos 
      SET ${updateFields.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    const updatedNGO = result.rows[0];

    res.json({
      message: 'NGO updated successfully',
      ngo: updatedNGO
    });
  } catch (error) {
    console.error('Update NGO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get NGO's assigned reports
router.get('/:id/reports', verifyToken, validateUUID('id'), validateQuery(querySchemas.pagination), async (req, res) => {
  try {
    const ngoId = req.params.id;
    const { page, limit } = req.query;
    const offset = (page - 1) * limit;

    // Check if NGO exists
    const ngoResult = await db.query('SELECT user_id FROM ngos WHERE id = $1', [ngoId]);
    
    if (ngoResult.rows.length === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    // Check permissions
    const canView = 
      req.user.id === ngoResult.rows[0].user_id ||
      req.user.role === 'admin';

    if (!canView) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const query = `
      SELECT 
        r.*,
        u.name as reporter_name,
        u.email as reporter_email,
        u.phone as reporter_phone,
        COUNT(*) OVER() as total_count
      FROM reports r
      JOIN users u ON r.reported_by = u.id
      WHERE r.assigned_ngo = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [ngoId, limit, offset]);
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
    console.error('Get NGO reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign report to NGO
router.post('/:id/assign-report', verifyToken, validateUUID('id'), async (req, res) => {
  try {
    const ngoId = req.params.id;
    const { reportId } = req.body;

    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }

    // Check if NGO exists and is approved
    const ngoResult = await db.query(
      'SELECT * FROM ngos WHERE id = $1 AND is_approved = true',
      [ngoId]
    );

    if (ngoResult.rows.length === 0) {
      return res.status(404).json({ error: 'NGO not found or not approved' });
    }

    const ngo = ngoResult.rows[0];

    // Check if report exists
    const reportResult = await db.query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    // Check permissions
    const canAssign = 
      req.user.id === ngo.user_id ||
      req.user.role === 'admin';

    if (!canAssign) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Check if report is already assigned
    if (report.assigned_ngo) {
      return res.status(400).json({ error: 'Report is already assigned to an NGO' });
    }

    // Assign report to NGO
    await db.query(
      'UPDATE reports SET assigned_ngo = $1, status = $2, updated_at = NOW() WHERE id = $3',
      [ngoId, 'in_progress', reportId]
    );

    // Create notification for reporter
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, related_report_id, related_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        report.reported_by,
        'Report Assigned',
        `Your report "${report.title}" has been assigned to ${ngo.organization_name}`,
        'assignment',
        reportId,
        req.user.id
      ]
    );

    // Emit real-time notification
    req.io.emit('report-assigned', {
      reportId,
      ngoId,
      ngoName: ngo.organization_name,
      reportTitle: report.title
    });

    res.json({ message: 'Report assigned successfully' });
  } catch (error) {
    console.error('Assign report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get pending NGO approvals (admin only)
router.get('/pending/approvals', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const query = `
      SELECT 
        n.*,
        u.name as contact_name,
        u.email as user_email,
        u.created_at as user_created_at
      FROM ngos n
      JOIN users u ON n.user_id = u.id
      WHERE n.is_approved = false
      ORDER BY n.created_at ASC
    `;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve NGO (admin only)
router.patch('/:id/approve', verifyToken, requireRole(['admin']), validateUUID('id'), async (req, res) => {
  try {
    const ngoId = req.params.id;

    // Check if NGO exists
    const ngoResult = await db.query(
      'SELECT n.*, u.name as contact_name FROM ngos n JOIN users u ON n.user_id = u.id WHERE n.id = $1',
      [ngoId]
    );

    if (ngoResult.rows.length === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    const ngo = ngoResult.rows[0];

    if (ngo.is_approved) {
      return res.status(400).json({ error: 'NGO is already approved' });
    }

    // Approve NGO
    await db.query(
      'UPDATE ngos SET is_approved = true, updated_at = NOW() WHERE id = $1',
      [ngoId]
    );

    // Create notification for NGO
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        ngo.user_id,
        'NGO Approved',
        `Congratulations! Your NGO "${ngo.organization_name}" has been approved.`,
        'approval'
      ]
    );

    res.json({ message: 'NGO approved successfully' });
  } catch (error) {
    console.error('Approve NGO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reject NGO (admin only)
router.patch('/:id/reject', verifyToken, requireRole(['admin']), validateUUID('id'), async (req, res) => {
  try {
    const ngoId = req.params.id;
    const { reason } = req.body;

    // Check if NGO exists
    const ngoResult = await db.query(
      'SELECT n.*, u.name as contact_name FROM ngos n JOIN users u ON n.user_id = u.id WHERE n.id = $1',
      [ngoId]
    );

    if (ngoResult.rows.length === 0) {
      return res.status(404).json({ error: 'NGO not found' });
    }

    const ngo = ngoResult.rows[0];

    if (ngo.is_approved) {
      return res.status(400).json({ error: 'Cannot reject an approved NGO' });
    }

    // Delete NGO registration
    await db.query('DELETE FROM ngos WHERE id = $1', [ngoId]);

    // Revert user role back to citizen
    await db.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      ['citizen', ngo.user_id]
    );

    // Create notification for user
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        ngo.user_id,
        'NGO Registration Rejected',
        `Your NGO registration for "${ngo.organization_name}" has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
        'rejection'
      ]
    );

    res.json({ message: 'NGO registration rejected' });
  } catch (error) {
    console.error('Reject NGO error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get NGO statistics
router.get('/stats/overview', verifyToken, requireRole(['admin']), async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_ngos,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_ngos,
        COUNT(CASE WHEN is_approved = false THEN 1 END) as pending_ngos,
        AVG(capacity_limit) as avg_capacity,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_ngos_last_30_days
      FROM ngos
    `;

    const reportStatsQuery = `
      SELECT 
        COUNT(DISTINCT assigned_ngo) as active_ngos,
        COUNT(*) as total_assigned_reports,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_assignments,
        COUNT(CASE WHEN status = 'rescued' THEN 1 END) as successful_rescues,
        COUNT(CASE WHEN status = 'adopted' THEN 1 END) as successful_adoptions
      FROM reports
      WHERE assigned_ngo IS NOT NULL
    `;

    const [ngoStats, reportStats] = await Promise.all([
      db.query(query),
      db.query(reportStatsQuery)
    ]);

    res.json({
      ...ngoStats.rows[0],
      ...reportStats.rows[0]
    });
  } catch (error) {
    console.error('Get NGO stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search NGOs by location and specialization
router.get('/search/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 50, specialization } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    let query = `
      SELECT 
        n.*,
        u.name as contact_name,
        u.email as user_email,
        u.avatar_url,
        COUNT(r.id) as assigned_reports_count
      FROM ngos n
      JOIN users u ON n.user_id = u.id
      LEFT JOIN reports r ON n.id = r.assigned_ngo
      WHERE n.is_approved = true AND u.is_active = true
    `;

    const values = [];

    if (specialization) {
      query += ` AND $${values.length + 1} = ANY(n.specializations)`;
      values.push(specialization);
    }

    query += ` GROUP BY n.id, n.user_id, n.organization_name, n.registration_number, n.website, n.description, n.address, n.city, n.state, n.country, n.postal_code, n.contact_person, n.contact_email, n.contact_phone, n.service_areas, n.specializations, n.is_approved, n.capacity_limit, n.created_at, n.updated_at, u.name, u.email, u.avatar_url`;
    query += ` ORDER BY n.created_at DESC`;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Search NGOs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;