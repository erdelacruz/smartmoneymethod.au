// ============================================================
// routes/stats.js — Visitor tracking endpoints.
//
// Endpoints:
//   POST /api/stats/visit     — public, records one page visit
//   GET  /api/stats/visitors  — admin only, returns visit counts
//
// Each visit record stores:
//   timestamp — ISO date string of when the visit occurred
//   os        — operating system name + version (parsed from User-Agent header)
//   browser   — browser name + major version (parsed from User-Agent header)
//   country   — country name resolved from the client's IP via ip-api.com
//
// Unique visitor fingerprint is computed server-side from:
//   browser + major version, IP address, OS + version,
//   accept-language header, and user-agent string.
//   The combination is SHA-256 hashed to produce a stable, anonymous key.
// ============================================================

import express   from 'express';
import UAParser  from 'ua-parser-js';
import crypto    from 'crypto'; // Node built-in — no install needed

import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ---------------------------------------------------------------------------
// In-memory visitor store.
// In production, persist this to a database so counts survive server restarts.
//
// totalVisits   — increments on every page load (same user counts multiple times)
// uniqueVisitors — Set of visitor UUIDs; a Set automatically ignores duplicates
// recentVisits  — last 10 visit objects for the admin dashboard
// ---------------------------------------------------------------------------
let totalVisits      = 0;
const uniqueVisitors = new Set(); // Set only stores each value once
const recentVisits   = [];        // Array of visit objects, capped at 10

// Monthly aggregates — index 0 = Jan … 11 = Dec.
// Persists across all visits regardless of year (same-month visits accumulate).
const monthlyData = Array.from({ length: 12 }, () => ({ total: 0, fingerprints: new Set() }));

// ---------------------------------------------------------------------------
// getClientIp — extracts the real IP address from the request.
//
// Why not just use req.socket.remoteAddress?
//   When Express sits behind a reverse proxy (nginx, AWS ALB, Heroku router),
//   the direct connection comes from the proxy, not the browser.
//   The proxy adds the original client IP to the X-Forwarded-For header.
//   Format: "clientIp, proxy1Ip, proxy2Ip" — we only want the first (leftmost) IP.
// ---------------------------------------------------------------------------
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']; // Set by proxies
  if (forwarded) {
    return forwarded.split(',')[0].trim(); // Take the first IP in the list
  }
  return req.socket.remoteAddress; // Direct connection (no proxy)
}

// ---------------------------------------------------------------------------
// isLocalIp — returns true for loopback addresses.
//
// When running locally, the "client" and server are the same machine.
// Loopback IPs will never resolve to a real country, so we skip the API call.
//   ::1              — IPv6 localhost
//   127.0.0.1        — IPv4 localhost
//   ::ffff:127.0.0.1 — IPv4-mapped IPv6 address for 127.0.0.1
// ---------------------------------------------------------------------------
function isLocalIp(ip) {
  return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
}

// ---------------------------------------------------------------------------
// getCountry — resolves an IP address to a country name using ip-api.com.
//
// ip-api.com is a free geolocation API (no API key required for non-commercial use).
// Request: GET http://ip-api.com/json/{ip}?fields=status,country
// Response: { status: 'success', country: 'Philippines' }
//           { status: 'fail', ... }  — for private/reserved IPs
//
// fetch() is available globally in Node 18+ — no import needed.
// The function is async because network calls are non-blocking — using await
// lets us write this in a linear style without callback hell.
// ---------------------------------------------------------------------------
async function getCountry(ip) {
  // Short-circuit for local development — no API call needed
  if (isLocalIp(ip)) return 'Local';

  try {
    // fields param limits the response to only what we need, reducing payload size
    const res  = await fetch(`http://ip-api.com/json/${ip}?fields=status,country`);
    const data = await res.json();

    // status === 'success' means a valid public IP was resolved
    return data.status === 'success' ? data.country : 'Unknown';
  } catch {
    // Network error calling the geo API — don't let it break the visit recording
    return 'Unknown';
  }
}

// ---------------------------------------------------------------------------
// buildFingerprint — hashes server-readable signals into a unique visitor key.
//
// Signals used:
//   browser   — browser name + major version  (e.g. "Chrome 120")
//   ip        — client IP address
//   os        — OS name + version             (e.g. "Windows 10")
//   lang      — Accept-Language header        (e.g. "en-US,en;q=0.9")
//   ua        — raw User-Agent string
//
// All signals are joined into one string and SHA-256 hashed so the stored
// value is fixed-length and contains no raw PII.
// ---------------------------------------------------------------------------
function buildFingerprint({ browser, ip, os, lang, ua }) {
  const raw = [browser, ip, os, lang, ua].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ---------------------------------------------------------------------------
// POST /api/stats/visit
// Public endpoint — no authentication required.
// Body: {} (visitorId no longer needed — fingerprint is built server-side)
//
// Made async because getCountry() performs an awaited HTTP request.
// ---------------------------------------------------------------------------
router.post('/visit', async (req, res) => {
  // Increment total visit counter for every page load
  totalVisits++;

  // ── Parse OS and Browser from User-Agent ────────────────────────────────
  // The User-Agent header is a string sent by every browser.
  // Example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  //           (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  // UAParser turns this into structured { name, version } objects.
  const ua     = req.headers['user-agent'] || ''; // Read the raw UA string
  const parser = new UAParser(ua);                // Parse it

  const osInfo      = parser.getOS();      // e.g. { name: 'Windows', version: '10' }
  const browserInfo = parser.getBrowser(); // e.g. { name: 'Chrome', version: '120.0.0.0' }

  // Combine name and version into a readable string; filter(Boolean) removes undefined values
  const os      = [osInfo.name,      osInfo.version].filter(Boolean).join(' ')    || 'Unknown';
  // Use major version only (120 instead of 120.0.0.0) for a cleaner display
  const browser = [browserInfo.name, browserInfo.major].filter(Boolean).join(' ') || 'Unknown';

  // ── Resolve Country from IP ──────────────────────────────────────────────
  const ip      = getClientIp(req);     // Extract the client's IP address
  const country = await getCountry(ip); // Await the async geo API call

  // ── Compute server-side fingerprint ─────────────────────────────────────
  // Accept-Language reflects locale/language preference — adds entropy when
  // two visitors share the same browser, OS, and IP (e.g. on a shared network).
  const lang        = req.headers['accept-language'] || '';
  const fingerprint = buildFingerprint({ browser, ip, os, lang, ua });

  // Set.add() silently ignores a value that already exists, so this only
  // increments the unique count when the fingerprint has not been seen before.
  uniqueVisitors.add(fingerprint);

  // Track per-month totals and unique visitors
  const month = new Date().getMonth();
  monthlyData[month].total++;
  monthlyData[month].fingerprints.add(fingerprint);

  // ── Build and store the visit record ────────────────────────────────────
  const visitRecord = {
    timestamp: new Date().toISOString(), // ISO 8601 format — easy to parse everywhere
    os,      // e.g. "Windows 10" or "macOS 14"
    browser, // e.g. "Chrome 120" or "Safari 17"
    country, // e.g. "Philippines" or "Local" (when running locally)
  };

  recentVisits.unshift(visitRecord); // Add to the front so index 0 = most recent
  if (recentVisits.length > 10) recentVisits.pop(); // Discard the oldest entry

  res.json({ message: 'Visit recorded' });
});

// ---------------------------------------------------------------------------
// GET /api/stats/visitors
// Protected by verifyToken — only an authenticated admin can access this.
// ---------------------------------------------------------------------------
router.get('/visitors', verifyToken, (req, res) => {
  // uniqueVisitors.size returns the count of distinct UUIDs in the Set
  res.json({
    totalVisits,                         // Total page load count
    uniqueVisitors: uniqueVisitors.size, // Number of distinct visitor UUIDs
    recentVisits,                        // Array of enriched visit objects (last 10)
    monthlyStats: monthlyData.map(m => ({ total: m.total, unique: m.fingerprints.size })),
  });
});

// Default export — replaces CommonJS "module.exports = router".
// Consumers import it as: import statsRoutes from './routes/stats.js'
export default router;
