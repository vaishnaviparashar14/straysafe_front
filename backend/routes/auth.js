const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { validate, userSchemas } = require('../middleware/validation');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Store user session
const storeSession = async (userId, token) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await db.query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
};

// Register new user
router.post('/register', validate(userSchemas.register), async (req, res) => {
  try {
    const { name, email, password, role, phone, organization } = req.body;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await db.query(
      `INSERT INTO users (name, email, password_hash, role, phone, organization) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, role, phone, organization, avatar_url, created_at`,
      [name, email, passwordHash, role, phone, organization]
    );

    const user = userResult.rows[0];

    // Generate token
    const token = generateToken(user.id);

    // Store session
    await storeSession(user.id, token);

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Remove sensitive data
    delete user.password_hash;

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login user
router.post('/login', validate(userSchemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user with password
    const userResult = await db.query(
      'SELECT id, name, email, password_hash, role, phone, organization, avatar_url, is_active FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Store session
    await storeSession(user.id, token);

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Remove sensitive data
    delete user.password_hash;

    res.json({
      message: 'Login successful',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout user
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Deactivate session
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE token_hash = $1',
      [token]
    );

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, name, email, role, phone, organization, avatar_url, is_verified, created_at, last_login FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // If user is NGO, get NGO details
    if (user.role === 'ngo') {
      const ngoResult = await db.query(
        'SELECT * FROM ngos WHERE user_id = $1',
        [user.id]
      );

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

// Update user profile
router.put('/profile', verifyToken, validate(userSchemas.updateProfile), async (req, res) => {
  try {
    const { name, phone, organization, avatar_url } = req.body;
    const userId = req.user.id;

    // Build update query dynamically
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount++}`);
      values.push(phone || null);
    }
    if (organization !== undefined) {
      updateFields.push(`organization = $${paramCount++}`);
      values.push(organization || null);
    }
    if (avatar_url !== undefined) {
      updateFields.push(`avatar_url = $${paramCount++}`);
      values.push(avatar_url || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}, updated_at = NOW() 
      WHERE id = $${paramCount}
      RETURNING id, name, email, role, phone, organization, avatar_url, updated_at
    `;

    const result = await db.query(query, values);
    const updatedUser = result.rows[0];

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/password', verifyToken, validate(userSchemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const userResult = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentPasswordHash = userResult.rows[0].password_hash;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Invalidate all user sessions except current one
    const currentToken = req.header('Authorization')?.replace('Bearer ', '');
    await db.query(
      'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND token_hash != $2',
      [userId, currentToken]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email (placeholder for future implementation)
router.post('/verify-email', verifyToken, async (req, res) => {
  try {
    // This is a placeholder - you would implement email verification logic here
    await db.query(
      'UPDATE users SET is_verified = true WHERE id = $1',
      [req.user.id]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;