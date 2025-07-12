const express = require('express');
const db = require('../config/database');
const { validate, validateQuery, validateUUID, reportSchemas, querySchemas } = require('../middleware/validation');
const { verifyToken, optionalAuth, requireNGO } = require('../middleware/auth');

const router = express.Router();

// Helper function to build WHERE clause for filtering
const buildWhereClause = (filters) => {
  const conditions = [];
  const values = [];
  let paramCount = 1;

  if (filters.status) {
    conditions.push(`r.status = $${paramCount++}`);
    values.push(filters.status);
  }

  if (filters.urgency) {
    conditions.push(`r.urgency = $${paramCount++}`);
    values.push(filters.urgency);
  }

  if (filters.animal_type) {
    conditions.push(`r.animal_type ILIKE $${paramCount++}`);
    values.push(`%${filters.animal_type}%`);
  }

  if (filters.tags) {
    const tags = filters.tags.split(',').map(tag => tag.trim());
    conditions.push(`r.tags && $${paramCount++}`);
    values.push(tags);
  }

  if (filters.reported_by) {
    conditions.push(`r.reported_by = $${paramCount++}`);
    values.push(filters.reported_by);
  }

  if (filters.assigned_ngo) {
    conditions.push(`r.assigned_ngo = $${paramCount++}`);
    values.push(filters.assigned_ngo);
  }

  if (filters.near_lat && filters.near_lng) {
    conditions.push(`calculate_distance(r.location_lat, r.location_lng, $${paramCount++}, $${paramCount++}) <= $${paramCount++}`);
    values.push(filters.near_lat, filters.near_lng, filters.radius || 10);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
    paramCount
  };
};

// Get all reports with filtering, sorting, and pagination
router.get('/', optionalAuth, validateQuery(querySchemas.reportsFilter), async (req, res) => {
  try {
    const { page, limit, sort, order, ...filters } = req.query;
    const offset = (page - 1) * limit;

    const { whereClause, values, paramCount } = buildWhereClause(filters);

    // Add visibility filter
    let visibilityClause = 'r.is_public = true';
    if (req.user) {
      visibilityClause = `(r.is_public = true OR r.reported_by = $${paramCount})`;
      values.push(req.user.id);
    }

    const finalWhereClause = whereClause 
      ? `${whereClause} AND ${visibilityClause}`
      : `WHERE ${visibilityClause}`;

    // Build ORDER BY clause
    let orderByClause = 'ORDER BY r.created_at DESC';
    if (sort === 'updated_at') {
      orderByClause = `ORDER BY r.updated_at ${order}`;
    } else if (sort === 'urgency') {
      orderByClause = `ORDER BY 
        CASE r.urgency 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END ${order}`;
    } else if (sort === 'status') {
      orderByClause = `ORDER BY r.status ${order}`;
    } else if (sort === 'created_at') {
      orderByClause = `ORDER BY r.created_at ${order}`;
    }

    const query = `
      SELECT 
        r.*,
        u.name as reporter_name,
        u.email as reporter_email,
        n.organization_name as ngo_name,
        COUNT(*) OVER() as total_count
      FROM reports r
      LEFT JOIN users u ON r.reported_by = u.id
      LEFT JOIN ngos n ON r.assigned_ngo = n.id
      ${finalWhereClause}
      ${orderByClause}
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `;

    const result = await db.query(query, [...values, limit, offset]);
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
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby reports
router.get('/nearby', optionalAuth, validateQuery(querySchemas.nearbyReports), async (req, res) => {
  try {
    const { lat, lng, radius = 10, status, urgency } = req.query;

    let whereClause = 'WHERE r.is_public = true';
    const values = [lat, lng, radius];

    if (status) {
      whereClause += ' AND r.status = $4';
      values.push(status);
    }

    if (urgency) {
      whereClause += status ? ' AND r.urgency = $5' : ' AND r.urgency = $4';
      values.push(urgency);
    }

    const query = `
      SELECT 
        r.*,
        u.name as reporter_name,
        calculate_distance(r.location_lat, r.location_lng, $1, $2) as distance
      FROM reports r
      LEFT JOIN users u ON r.reported_by = u.id
      ${whereClause}
      AND calculate_distance(r.location_lat, r.location_lng, $1, $2) <= $3
      ORDER BY distance ASC
      LIMIT 50
    `;

    const result = await db.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Get nearby reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single report by ID
router.get('/:id', optionalAuth, validateUUID('id'), async (req, res) => {
  try {
    const reportId = req.params.id;

    const query = `
      SELECT 
        r.*,
        u.name as reporter_name,
        u.email as reporter_email,
        u.phone as reporter_phone,
        n.organization_name as ngo_name,
        n.contact_email as ngo_email,
        n.contact_phone as ngo_phone,
        v.name as volunteer_name,
        v.email as volunteer_email
      FROM reports r
      LEFT JOIN users u ON r.reported_by = u.id
      LEFT JOIN ngos n ON r.assigned_ngo = n.id
      LEFT JOIN users v ON r.assigned_volunteer = v.id
      WHERE r.id = $1
    `;

    const result = await db.query(query, [reportId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = result.rows[0];

    // Check visibility
    if (!report.is_public && (!req.user || req.user.id !== report.reported_by)) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Get updates
    const updatesQuery = `
      SELECT 
        ru.*,
        u.name as author_name,
        u.role as author_role
      FROM report_updates ru
      LEFT JOIN users u ON ru.author_id = u.id
      WHERE ru.report_id = $1
      ORDER BY ru.created_at ASC
    `;

    const updatesResult = await db.query(updatesQuery, [reportId]);
    report.updates = updatesResult.rows;

    // Increment view count
    await db.query(
      'UPDATE reports SET view_count = view_count + 1 WHERE id = $1',
      [reportId]
    );

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new report
router.post('/', verifyToken, validate(reportSchemas.create), async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      photos = [],
      urgency = 'medium',
      tags = [],
      animal_type,
      animal_breed,
      animal_age_estimate,
      animal_gender,
      animal_size,
      animal_color,
      animal_condition,
      is_injured = false,
      is_aggressive = false
    } = req.body;

    const query = `
      INSERT INTO reports (
        title, description, location_lat, location_lng, location_address,
        photos, urgency, tags, animal_type, animal_breed, animal_age_estimate,
        animal_gender, animal_size, animal_color, animal_condition,
        is_injured, is_aggressive, reported_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    const values = [
      title,
      description,
      location.lat,
      location.lng,
      location.address || null,
      photos,
      urgency,
      tags,
      animal_type || null,
      animal_breed || null,
      animal_age_estimate || null,
      animal_gender || null,
      animal_size || null,
      animal_color || null,
      animal_condition || null,
      is_injured,
      is_aggressive,
      req.user.id
    ];

    const result = await db.query(query, values);
    const newReport = result.rows[0];

    // Add reporter as follower
    await db.query(
      'INSERT INTO report_followers (report_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [newReport.id, req.user.id]
    );

    // Emit real-time notification
    req.io.emit('new-report', {
      id: newReport.id,
      title: newReport.title,
      location: {
        lat: newReport.location_lat,
        lng: newReport.location_lng,
        address: newReport.location_address
      },
      urgency: newReport.urgency,
      reporter_name: req.user.name
    });

    res.status(201).json({
      message: 'Report created successfully',
      report: newReport
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update report
router.put('/:id', verifyToken, validateUUID('id'), validate(reportSchemas.update), async (req, res) => {
  try {
    const reportId = req.params.id;
    const updates = req.body;

    // Check if report exists and user has permission
    const reportResult = await db.query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    // Check permissions
    const canEdit = 
      req.user.id === report.reported_by ||
      req.user.role === 'admin' ||
      (req.user.role === 'ngo' && report.assigned_ngo);

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

    values.push(reportId);

    const query = `
      UPDATE reports 
      SET ${updateFields.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, values);
    const updatedReport = result.rows[0];

    // Emit real-time update
    req.io.to(`report-${reportId}`).emit('report-updated', {
      reportId,
      updates,
      updatedBy: req.user.name
    });

    res.json({
      message: 'Report updated successfully',
      report: updatedReport
    });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add update to report
router.post('/:id/updates', verifyToken, validateUUID('id'), validate(reportSchemas.addUpdate), async (req, res) => {
  try {
    const reportId = req.params.id;
    const { message, photos = [], is_public = true } = req.body;

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
    const canUpdate = 
      req.user.id === report.reported_by ||
      req.user.role === 'admin' ||
      req.user.role === 'ngo' ||
      req.user.role === 'volunteer';

    if (!canUpdate) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Add update
    const query = `
      INSERT INTO report_updates (report_id, message, photos, author_id, is_public)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [reportId, message, photos, req.user.id, is_public]);
    const newUpdate = result.rows[0];

    // Update report's updated_at timestamp
    await db.query(
      'UPDATE reports SET updated_at = NOW() WHERE id = $1',
      [reportId]
    );

    // Emit real-time update
    req.io.to(`report-${reportId}`).emit('report-update-added', {
      reportId,
      update: {
        ...newUpdate,
        author_name: req.user.name,
        author_role: req.user.role
      }
    });

    res.status(201).json({
      message: 'Update added successfully',
      update: newUpdate
    });
  } catch (error) {
    console.error('Add update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Follow/unfollow report
router.post('/:id/follow', verifyToken, validateUUID('id'), async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user.id;

    // Check if report exists
    const reportResult = await db.query(
      'SELECT id FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if already following
    const followResult = await db.query(
      'SELECT id FROM report_followers WHERE report_id = $1 AND user_id = $2',
      [reportId, userId]
    );

    if (followResult.rows.length > 0) {
      // Unfollow
      await db.query(
        'DELETE FROM report_followers WHERE report_id = $1 AND user_id = $2',
        [reportId, userId]
      );
      res.json({ message: 'Unfollowed report', following: false });
    } else {
      // Follow
      await db.query(
        'INSERT INTO report_followers (report_id, user_id) VALUES ($1, $2)',
        [reportId, userId]
      );
      res.json({ message: 'Following report', following: true });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete report (soft delete)
router.delete('/:id', verifyToken, validateUUID('id'), async (req, res) => {
  try {
    const reportId = req.params.id;

    // Check if report exists and user has permission
    const reportResult = await db.query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = reportResult.rows[0];

    // Check permissions
    const canDelete = 
      req.user.id === report.reported_by ||
      req.user.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Soft delete by setting is_public to false
    await db.query(
      'UPDATE reports SET is_public = false, updated_at = NOW() WHERE id = $1',
      [reportId]
    );

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get report statistics
router.get('/stats/overview', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'reported' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_reports,
        COUNT(CASE WHEN status = 'rescued' THEN 1 END) as rescued_reports,
        COUNT(CASE WHEN status = 'adopted' THEN 1 END) as adopted_reports,
        COUNT(CASE WHEN urgency = 'critical' THEN 1 END) as critical_reports,
        COUNT(CASE WHEN urgency = 'high' THEN 1 END) as high_priority_reports
      FROM reports
      WHERE is_public = true
    `;

    const result = await db.query(query);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;