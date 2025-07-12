const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const sessionResult = await db.query(
      'SELECT * FROM user_sessions WHERE token_hash = $1 AND is_active = true AND expires_at > NOW()',
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Token is invalid or expired.' });
    }

    // Get user details
    const userResult = await db.query(
      'SELECT id, name, email, role, avatar_url, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const user = userResult.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'User account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted
    const sessionResult = await db.query(
      'SELECT * FROM user_sessions WHERE token_hash = $1 AND is_active = true AND expires_at > NOW()',
      [token]
    );
    
    if (sessionResult.rows.length === 0) {
      req.user = null;
      return next();
    }

    // Get user details
    const userResult = await db.query(
      'SELECT id, name, email, role, avatar_url, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      req.user = null;
      return next();
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Role-based access control
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }

    next();
  };
};

// Check if user is NGO
const requireNGO = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role !== 'ngo') {
      return res.status(403).json({ error: 'NGO access required.' });
    }

    // Get NGO details
    const ngoResult = await db.query(
      'SELECT * FROM ngos WHERE user_id = $1 AND is_approved = true',
      [req.user.id]
    );

    if (ngoResult.rows.length === 0) {
      return res.status(403).json({ error: 'NGO not found or not approved.' });
    }

    req.ngo = ngoResult.rows[0];
    next();
  } catch (error) {
    console.error('NGO middleware error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Check if user owns resource or is admin
const requireOwnership = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      const resourceUserId = await getResourceUserId(req);
      
      if (resourceUserId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. You can only access your own resources.' });
      }

      next();
    } catch (error) {
      console.error('Ownership middleware error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requireNGO,
  requireOwnership
};