// ============================================================
// routes/asx.js — ASX data routes (mock data)
//
// Endpoints:
//   GET /api/asx/search?q=<ASX_CODE>
//       → Autocomplete search, returns only ASX-listed tickers
//
//   GET /api/asx/prices?ticker=<ASX_CODE>&from=YYYY-MM&to=YYYY-MM
//       → Historical monthly close prices for a given date range
//       → Only BHP is supported in the current mock dataset
// ============================================================

import express   from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOCK_DIR  = join(__dirname, '../mock');

// Load mock datasets once at startup
const { stocks: ASX_STOCKS } = JSON.parse(readFileSync(join(MOCK_DIR, 'asx-search.json'), 'utf8'));
const { prices: BHP_PRICES  } = JSON.parse(readFileSync(join(MOCK_DIR, 'bhp-prices.json'),  'utf8'));

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/asx/search?q=BHP
//
// Searches ASX stocks/ETFs via Yahoo Finance autocomplete (server-side to
// avoid CORS). Falls back to the local mock list if Yahoo is unreachable.
// ---------------------------------------------------------------------------
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q + '.AX')}&quotesCount=8&newsCount=0&listsCount=0`;
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (upstream.ok) {
      const data    = await upstream.json();
      const quotes  = data?.quotes ?? [];
      const results = quotes
        .filter(item => item.symbol?.endsWith('.AX') && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF'))
        .map(item => ({
          ticker: item.symbol.replace('.AX', ''),
          name:   item.longname || item.shortname || item.symbol,
          market: 'ASX',
          type:   item.quoteType === 'ETF' ? 'ETF' : 'Stock',
        }));

      if (results.length) return res.json({ results });
    }
  } catch { /* fall through to mock */ }

  // Fallback: filter the local mock list
  const qUpper  = q.toUpperCase();
  const results = ASX_STOCKS
    .filter(s =>
      s.ticker.toUpperCase().includes(qUpper) ||
      s.companyName.toUpperCase().includes(qUpper)
    )
    .slice(0, 8)
    .map(s => ({ ticker: s.ticker, name: s.companyName, market: s.market, type: s.type }));

  return res.json({ results });
});

// ---------------------------------------------------------------------------
// GET /api/asx/prices?ticker=BHP&from=2020-01&to=2025-12
//
// Returns one data point per month (last trading day close) within [from, to].
// Proxies Yahoo Finance for monthly OHLCV data (interval=1mo).
// Falls back to local BHP mock data if Yahoo is unreachable.
//
// Response shape:
//   { ticker, from, to, prices: [ { year, month, date, close }, ... ] }
// ---------------------------------------------------------------------------
router.get('/prices', async (req, res) => {
  const ticker = (req.query.ticker || '').trim().toUpperCase();
  const from   = (req.query.from   || '').trim(); // "YYYY-MM"
  const to     = (req.query.to     || '').trim(); // "YYYY-MM"

  if (!ticker) return res.status(400).json({ error: 'Query parameter "ticker" is required.' });
  if (!from || !to) return res.status(400).json({ error: 'Query parameters "from" and "to" (YYYY-MM) are required.' });

  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear,   toMonth  ] = to.split('-').map(Number);

  if (!fromYear || !fromMonth || !toYear || !toMonth) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM.' });
  }

  // Convert YYYY-MM bounds to Unix timestamps (start of from-month, end of to-month)
  const period1 = Math.floor(new Date(fromYear, fromMonth - 1, 1).getTime() / 1000);
  const period2 = Math.floor(new Date(toYear,   toMonth,       1).getTime() / 1000); // 1st of next month

  // ── Try Yahoo Finance for real monthly data ────────────────────────────────
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.AX?interval=1mo&period1=${period1}&period2=${period2}`;
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (upstream.ok) {
      const json   = await upstream.json();
      const result = json?.chart?.result?.[0];
      if (result) {
        const { timestamp } = result;
        const { close }     = result.indicators.quote[0];

        const prices = timestamp
          .map((ts, i) => {
            if (close[i] == null || isNaN(close[i])) return null;
            const d = new Date(ts * 1000);
            const y = d.getFullYear();
            const m = d.getMonth() + 1;
            return { year: y, month: m, date: `${y}-${String(m).padStart(2,'0')}-01`, close: +close[i].toFixed(4) };
          })
          .filter(Boolean)
          .filter(p => {
            if (p.year < fromYear || (p.year === fromYear && p.month < fromMonth)) return false;
            if (p.year > toYear   || (p.year === toYear   && p.month > toMonth))   return false;
            return true;
          })
          .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

        if (prices.length) return res.json({ ticker, from, to, prices });
      }
    }
  } catch { /* fall through to mock */ }

  // ── Fallback: BHP mock data ────────────────────────────────────────────────
  if (ticker !== 'BHP') {
    return res.status(404).json({ error: `No price data available for ${ticker}. Try again later.` });
  }

  const monthMap = new Map();
  for (const p of BHP_PRICES) {
    const [y, m] = p.date.split('-').map(Number);
    if (!y || !m) continue;
    if (y < fromYear || (y === fromYear && m < fromMonth)) continue;
    if (y > toYear   || (y === toYear   && m > toMonth))   continue;
    monthMap.set(`${y}-${String(m).padStart(2, '0')}`, {
      year: y, month: m, date: p.date, close: +p.close,
    });
  }

  const prices = Array.from(monthMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  if (!prices.length) {
    return res.status(404).json({ error: `No price data for ${ticker} in the requested range (${from} – ${to}).` });
  }

  return res.json({ ticker, from, to, prices });
});

// ---------------------------------------------------------------------------
// GET /api/asx/history?symbol=BHP&range=2y
//
// Server-side proxy to Yahoo Finance — avoids browser CORS restrictions.
// Returns daily OHLCV candles for ASX stocks (appends .AX suffix).
//
// Response shape:
//   { symbol, range, candles: [ { time, open, high, low, close, volume }, ... ] }
// ---------------------------------------------------------------------------
router.get('/history', async (req, res) => {
  const symbol = (req.query.symbol || '').trim().toUpperCase();
  const range  = (req.query.range  || '2y').trim();

  if (!symbol || !/^[A-Z]{2,10}$/.test(symbol)) {
    return res.status(400).json({ error: 'Invalid symbol. Use 2–10 uppercase letters.' });
  }
  if (!['1y','2y','5y'].includes(range)) {
    return res.status(400).json({ error: 'Invalid range. Use 1y, 2y or 5y.' });
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.AX?interval=1d&range=${range}`;

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Yahoo Finance returned ${upstream.status}` });
    }

    const json   = await upstream.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return res.status(404).json({ error: 'No data returned for this symbol.' });
    }

    const { timestamp } = result;
    const { open, high, low, close, volume } = result.indicators.quote[0];

    const candles = timestamp
      .map((ts, i) => ({ time: ts, open: open[i], high: high[i], low: low[i], close: close[i], volume: volume[i] }))
      .filter(c => c.open != null && c.close != null && !isNaN(c.close));

    return res.json({ symbol, range, candles });
  } catch (err) {
    return res.status(502).json({ error: `Upstream error: ${err.message}` });
  }
});

export default router;
