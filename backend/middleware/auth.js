// ============================================================
// middleware/auth.js — JWT verification middleware.
//
// How middleware works in Express:
//   A middleware function receives (req, res, next).
//   - req  : the incoming request object
//   - res  : the outgoing response object
//   - next : a function that passes control to the next handler
//
// If the token is valid we attach the decoded payload to req.user
// and call next() so the protected route handler can run.
// If invalid we respond immediately with 401 and never call next().
// ============================================================

// Named import — jsonwebtoken exports a single default object; we import it as 'jwt'.
// In ES modules: "import jwt from 'pkg'" replaces "const jwt = require('pkg')".
import jwt from 'jsonwebtoken';

// Secret key used to sign and verify JWTs.
// In production this must be a long random string stored in an environment variable,
// never hard-coded. Example: process.env.JWT_SECRET
const JWT_SECRET = 'foundation_secret_key_change_in_production';

// ---------------------------------------------------------------------------
// verifyToken — protects any route it is applied to.
// Usage: router.get('/secure', verifyToken, handler)
// ---------------------------------------------------------------------------
function verifyToken(req, res, next) {
  // Tokens are sent in the Authorization header using the Bearer scheme:
  // Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  // If the header is missing, reject immediately
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Split "Bearer <token>" and take the second part (index 1)
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Malformed authorization header' });
  }

  // jwt.verify decodes and validates the token signature + expiry.
  // If valid, 'decoded' contains the payload we stored when we signed the token.
  // If invalid or expired, it throws an error caught by the callback.
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token is expired, tampered, or signed with a different secret
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Attach the decoded payload (e.g. { id, username, role }) to the request
    // so downstream route handlers can access user information via req.user
    req.user = decoded;

    // Pass control to the next middleware or route handler
    next();
  });
}

// ---------------------------------------------------------------------------
// ES module named exports — replaces CommonJS "module.exports = { ... }".
// "export" makes a binding available to any file that imports this module.
// "export { verifyToken, JWT_SECRET }" exports two named bindings.
// Consumers import them as: import { verifyToken, JWT_SECRET } from './middleware/auth.js'
// ---------------------------------------------------------------------------
export { verifyToken, JWT_SECRET };
