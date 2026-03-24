// ============================================================
// routes/auth.js — Authentication endpoints (MongoDB-backed)
//
// Endpoints:
//   POST /api/auth/login  — validate credentials, return a JWT
//   GET  /api/auth/me     — verify a token, return the user payload
// ============================================================

import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';

import { getDB }                    from '../db.js';
import { verifyToken, JWT_SECRET }  from '../middleware/auth.js';

const router     = express.Router();
const COLLECTION = 'users';

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { username: string, password: string }
// Returns: { token: string, user: { id, username, role } }
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const user = await getDB()
      .collection(COLLECTION)
      .findOne({ username: username.trim().toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const payload = { id: user._id.toString(), username: user.username, role: user.role };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: payload });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/auth/me — verify stored token and restore session
// ---------------------------------------------------------------------------
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
