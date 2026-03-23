// ============================================================
// routes/auth.js — Authentication endpoints.
//
// Endpoints:
//   POST /api/auth/login  — validate credentials, return a JWT
//   GET  /api/auth/me     — verify a token, return the user payload
// ============================================================

// Default imports — each package exports one main object as its default export.
// "import X from 'pkg'" binds that default export to the name X.
import express from 'express';
import bcrypt  from 'bcryptjs';
import jwt     from 'jsonwebtoken';

// Named imports from our own module — curly braces destructure specific exports.
// The .js extension is required for local file imports in ES modules.
import { verifyToken, JWT_SECRET } from '../middleware/auth.js';

// express.Router() creates a mini-application that handles a subset of routes.
// It is mounted onto the main app in server.js under '/api/auth'.
const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory user store — in a real app this would be a database table.
// Passwords are stored as bcrypt hashes, NEVER as plain text.
//
// How to generate a hash manually (Node REPL):
//   import bcrypt from 'bcryptjs'
//   bcrypt.hashSync('admin123', 10)  // 10 = cost factor (work rounds)
// ---------------------------------------------------------------------------
const USERS = [
  {
    id: 1,
    username: 'admin',
    // bcrypt hash of "admin123"
    passwordHash: bcrypt.hashSync('P@ssw0rd', 10),
    role: 'admin',  // Used by the frontend to decide which pages to show
  },
];

// ---------------------------------------------------------------------------
// POST /api/auth/login
// Body: { username: string, password: string }
// Returns: { token: string, user: { id, username, role } }
// ---------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Basic input validation — both fields are required
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Find the user in our store by username
  const user = USERS.find(u => u.username === username);

  // If user doesn't exist, reject with a generic message to avoid
  // timing attacks that could reveal valid usernames
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // bcrypt.compare hashes the plain-text password and compares it to the stored hash.
  // Returns true only if they match — we never need to store or see the plain password.
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Build the JWT payload — keep it small; only include what the client needs.
  // Never put sensitive info (full PII, passwords) in the payload — JWTs are base64
  // encoded (not encrypted) and can be decoded by anyone who has the token.
  const payload = { id: user.id, username: user.username, role: user.role };

  // Sign the token with the secret key. expiresIn: '8h' means the token
  // automatically becomes invalid after 8 hours, limiting exposure if stolen.
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

  // Return the token and safe user info to the client.
  // The client stores the token (e.g. in localStorage) and sends it with future requests.
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// Protected by verifyToken middleware — requires a valid JWT in the header.
// Used by the frontend on startup to check if a stored token is still valid
// and to restore the logged-in session without requiring the user to log in again.
// ---------------------------------------------------------------------------
router.get('/me', verifyToken, (req, res) => {
  // req.user was attached by the verifyToken middleware after decoding the JWT
  res.json({ user: req.user });
});

// ---------------------------------------------------------------------------
// Default export — replaces CommonJS "module.exports = router".
// "export default" marks this as the main thing this file provides.
// Consumers import it as: import authRoutes from './routes/auth.js'
// ---------------------------------------------------------------------------
export default router;
