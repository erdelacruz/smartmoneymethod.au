// ============================================================
// routes/stats.js — Visitor tracking endpoints (MongoDB Atlas)
//
// Storage model: ONE document per unique fingerprint.
//   On first visit  → insertOne
//   On repeat visit → increment visitCount + update lastSeen only
//
// Endpoints:
//   POST /api/stats/visit     — public, upserts a unique visitor record
//   GET  /api/stats/visitors  — admin only, returns aggregated stats
// ============================================================

import express  from 'express';
import UAParser from 'ua-parser-js';
import crypto   from 'crypto';

import { getDB }       from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router     = express.Router();
const COLLECTION = 'visitors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
}

function isLocalIp(ip) {
  return ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
}

async function getCountry(ip) {
  if (isLocalIp(ip)) return 'Local';
  try {
    const res  = await fetch(`http://ip-api.com/json/${ip}?fields=status,country`);
    const data = await res.json();
    return data.status === 'success' ? data.country : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function buildFingerprint({ browser, ip, os, lang, ua }) {
  const raw = [browser, ip, os, lang, ua].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ---------------------------------------------------------------------------
// POST /api/stats/visit
// Upserts a unique visitor document.
//   New visitor     → creates doc with visitCount = 1
//   Returning visit → increments visitCount + updates lastSeen only
// ---------------------------------------------------------------------------
router.post('/visit', async (req, res) => {
  try {
    const ua          = req.headers['user-agent'] || '';
    const parser      = new UAParser(ua);
    const osInfo      = parser.getOS();
    const browserInfo = parser.getBrowser();

    const os      = [osInfo.name,      osInfo.version].filter(Boolean).join(' ')    || 'Unknown';
    const browser = [browserInfo.name, browserInfo.major].filter(Boolean).join(' ') || 'Unknown';

    const ip          = getClientIp(req);
    const country     = await getCountry(ip);
    const lang        = req.headers['accept-language'] || '';
    const fingerprint = buildFingerprint({ browser, ip, os, lang, ua });

    const now = new Date().toISOString();

    await getDB().collection(COLLECTION).updateOne(
      { fingerprint },
      {
        // On first visit: set all fields
        $setOnInsert: { fingerprint, os, browser, country, firstSeen: now },
        // On every visit: update lastSeen
        $set:         { lastSeen: now },
        // On every visit: increment page load counter
        $inc:         { visitCount: 1 },
      },
      { upsert: true }
    );

    res.json({ message: 'Visit recorded' });
  } catch (err) {
    console.error('[stats/visit]', err.message);
    res.status(500).json({ error: 'Failed to record visit.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stats/visitors  (admin only)
// ---------------------------------------------------------------------------
router.get('/visitors', verifyToken, async (req, res) => {
  try {
    const col = getDB().collection(COLLECTION);

    // Unique visitors = total documents
    const uniqueVisitors = await col.countDocuments();

    // Total visits = sum of all visitCount fields
    const totalAgg = await col.aggregate([
      { $group: { _id: null, total: { $sum: '$visitCount' } } },
    ]).toArray();
    const totalVisits = totalAgg[0]?.total ?? 0;

    // All unique visitors, most recently active first
    const recentVisits = await col
      .find({}, { projection: { _id: 0, fingerprint: 0 } })
      .sort({ lastSeen: -1 })
      .toArray();

    // Breakdown aggregates — based on ALL unique visitors
    const breakdown = await col.aggregate([
      {
        $facet: {
          browsers:  [{ $group: { _id: '$browser', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          os:        [{ $group: { _id: '$os',      count: { $sum: 1 } } }, { $sort: { count: -1 } }],
          countries: [{ $group: { _id: '$country', count: { $sum: 1 } } }, { $sort: { count: -1 } }],
        },
      },
    ]).toArray();

    const toMap = arr => Object.fromEntries(arr.map(e => [e._id || 'Unknown', e.count]));
    const browserStats  = toMap(breakdown[0].browsers);
    const osStats       = toMap(breakdown[0].os);
    const countryStats  = toMap(breakdown[0].countries);

    // Monthly unique visitors based on firstSeen
    const currentYear = new Date().getFullYear();
    const monthlyAgg  = await col.aggregate([
      { $match: { firstSeen: { $regex: `^${currentYear}` } } },
      {
        $group: {
          _id:   { $month: { $dateFromString: { dateString: '$firstSeen' } } },
          unique: { $sum: 1 },
          total:  { $sum: '$visitCount' },
        },
      },
    ]).toArray();

    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const entry = monthlyAgg.find(m => m._id === i + 1);
      return entry ? { total: entry.total, unique: entry.unique } : { total: 0, unique: 0 };
    });

    res.json({
      totalVisits,
      uniqueVisitors,
      recentVisits,
      browserStats,
      osStats,
      countryStats,
      monthlyStats,
    });
  } catch (err) {
    console.error('[stats/visitors]', err.message);
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

export default router;
