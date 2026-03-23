import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Persist a visitor UUID in localStorage for backend tracking
// ---------------------------------------------------------------------------
function getOrCreateVisitorId() {
  const key = 'visitorId';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------
const STOCKS = [
  { sym:'BHP', name:'BHP Group',               price:45.20,  chg:1.44,  pct:3.29,  vol:'8.2M',  cap:'$232B', sec:'Materials',  trend:[42,43,42.5,44,43.8,44.9,45.2] },
  { sym:'CBA', name:'Commonwealth Bank',        price:118.50, chg:1.24,  pct:1.06,  vol:'4.2M',  cap:'$198B', sec:'Financials', trend:[115,116,115.5,117,116.8,117.5,118.5] },
  { sym:'CSL', name:'CSL Limited',              price:285.00, chg:-2.10, pct:-0.73, vol:'1.1M',  cap:'$136B', sec:'Healthcare', trend:[290,288,289,287,286,286.5,285] },
  { sym:'NAB', name:'National Australia Bank',  price:35.80,  chg:0.45,  pct:1.27,  vol:'6.8M',  cap:'$112B', sec:'Financials', trend:[34.8,35,34.9,35.2,35.4,35.6,35.8] },
  { sym:'WES', name:'Wesfarmers',               price:72.50,  chg:-0.80, pct:-1.09, vol:'2.4M',  cap:'$82B',  sec:'Consumer',   trend:[74,73.5,73.8,73,72.8,72.6,72.5] },
  { sym:'FMG', name:'Fortescue',                price:22.80,  chg:0.95,  pct:4.35,  vol:'12.1M', cap:'$70B',  sec:'Materials',  trend:[21.2,21.5,21.8,22,22.3,22.6,22.8] },
  { sym:'MQG', name:'Macquarie Group',          price:195.00, chg:2.30,  pct:1.19,  vol:'890K',  cap:'$66B',  sec:'Financials', trend:[190,191,192,193,193.5,194,195] },
  { sym:'XRO', name:'Xero',                     price:142.00, chg:-1.50, pct:-1.05, vol:'560K',  cap:'$21B',  sec:'Technology', trend:[145,144,143.5,143,142.8,142.3,142] },
];

const TICKER_ITEMS = [
  { sym:'XJO', price:'7,842.30', chg:'+0.84%', up:true  },
  { sym:'BHP', price:'$45.20',   chg:'+3.29%', up:true  },
  { sym:'CBA', price:'$118.50',  chg:'+1.06%', up:true  },
  { sym:'CSL', price:'$285.00',  chg:'-0.73%', up:false },
  { sym:'FMG', price:'$22.80',   chg:'+4.35%', up:true  },
  { sym:'NAB', price:'$35.80',   chg:'+1.27%', up:true  },
  { sym:'WES', price:'$72.50',   chg:'-1.09%', up:false },
  { sym:'MQG', price:'$195.00',  chg:'+1.19%', up:true  },
  { sym:'TLS', price:'$4.25',    chg:'+0.24%', up:true  },
  { sym:'RIO', price:'$125.40',  chg:'+2.10%', up:true  },
  { sym:'WOW', price:'$38.90',   chg:'-0.51%', up:false },
  { sym:'QAN', price:'$8.45',    chg:'+1.80%', up:true  },
];

const FEATURES = [
  { icon:'📊', bg:'rgba(55,138,221,0.12)',  title:'TradingView Charts',            tag:'Embedded widget', desc:'Full interactive OHLC candlestick charts powered by TradingView. Access 100+ technical indicators, drawing tools, and multiple timeframes from 1 minute to monthly.' },
  { icon:'⚡', bg:'rgba(0,200,150,0.1)',    title:'Real-Time Quotes',              tag:'ASX live feed',   desc:'Live bid/ask spreads, last traded prices, volume and market depth for every ASX-listed security. Data refreshes every 15 seconds throughout the trading day.' },
  { icon:'🔍', bg:'rgba(239,159,39,0.1)',   title:'Stock Screener',               tag:'200+ filters',    desc:'Filter 2,200+ ASX stocks by sector, market cap, P/E ratio, dividend yield, 52-week performance and dozens of fundamental metrics to find your next opportunity.' },
  { icon:'💼', bg:'rgba(240,78,78,0.1)',    title:'Portfolio Tracker',             tag:'Multi-portfolio', desc:'Track your holdings, cost basis, unrealised gains and dividend income in one place. Import trades from your broker or enter them manually.' },
  { icon:'🔔', bg:'rgba(139,92,246,0.1)',   title:'Price Alerts',                  tag:'Instant notify',  desc:'Set price, volume and news alerts for any ASX stock. Get notified via email or push notification the moment your trigger is hit — even while markets are closed.' },
  { icon:'📰', bg:'rgba(20,200,200,0.1)',   title:'Market News & Announcements',   tag:'ASX feed',        desc:'Stream ASX company announcements, earnings reports and market news in real time. Filtered by your watchlist so you never miss a material disclosure.' },
];

const STEPS = [
  { n:'01', title:'Create your account',  desc:'Sign up free in under 60 seconds — no credit card, no broker required.' },
  { n:'02', title:'Build your watchlist', desc:'Search and add any ASX stock to your personalised watchlist for fast access.' },
  { n:'03', title:'Analyse with charts',  desc:'Open TradingView charts, apply indicators, and draw your own technical analysis.' },
  { n:'04', title:'Track your portfolio', desc:'Log your holdings and monitor performance, dividends and P&L in real time.' },
];

// ---------------------------------------------------------------------------
// Sparkline SVG for the market table
// ---------------------------------------------------------------------------
function Sparkline({ data }) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const W = 60, H = 24;
  const pts = data.map((v, i) =>
    `${i * (W / (data.length - 1))},${H - ((v - min) / range) * (H - 4) + 2}`
  ).join(' ');
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg viewBox="0 0 60 24" style={{ width: 60, height: 24, display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline points={pts} fill="none" stroke={isUp ? '#00C896' : '#F04E4E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PublicPage
// ---------------------------------------------------------------------------
export default function PublicPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab,    setActiveTab]    = useState('1W');

  // Record visit on mount
  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    fetch('/api/stats/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId }),
    }).catch(() => console.warn('Could not record visit — is the backend running?'));
  }, []);

  const filteredStocks = STOCKS.filter(s =>
    activeFilter === 'All' ||
    s.sec === activeFilter ||
    (activeFilter === 'Tech' && s.sec === 'Technology')
  );

  return (
    <div>

      {/* ── TICKER TAPE ─────────────────────────────────────── */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              <span className="ticker-sym">{item.sym}</span>
              <span className="ticker-price">{item.price}</span>
              <span className={`ticker-chg ${item.up ? 'up' : 'down'}`}>{item.chg}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section>
        <div className="hero">
          <div className="hero-left">
            <div className="hero-badge">Australia's #1 money method</div>
            <h1>
              Your money,<br />
              <em>finally clear</em>
            </h1>
            <p className="hero-desc">
              See your complete financial picture — bank accounts, super, property and investments — all in one place. The Smart Money Method, built for Australians.
            </p>
            <div className="hero-ctas">
              <button className="btn-hero">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Start for free
              </button>
              <button className="btn-hero-outline">See how it works</button>
            </div>
            <div className="hero-trust">
              <span>Bank-grade security</span>
              <span className="trust-divider" />
              <span>Australian owned</span>
              <span className="trust-divider" />
              <span>Free to start</span>
            </div>
          </div>

          <div className="hero-visual">
            {/* Floating card — top */}
            <div className="mini-card" style={{ top: '-20px', right: '-10px' }}>
              <div className="mini-card-icon" style={{ background: 'rgba(0,200,150,0.12)' }}>📈</div>
              <div className="mini-card-text">
                <div className="mini-card-title">BHP +3.2%</div>
                <div className="mini-card-sub">Today's top mover</div>
              </div>
            </div>

            {/* Chart card */}
            <div className="hero-chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-stock-name">CBA.AX</div>
                  <div className="chart-stock-sub">Commonwealth Bank of Australia</div>
                </div>
                <div className="chart-price-block">
                  <div className="chart-price">$118.50</div>
                  <div className="chart-change">▲ +1.24 (+1.06%)</div>
                </div>
              </div>

              <div className="chart-tabs">
                {['1D','1W','1M','3M','1Y'].map(tab => (
                  <button
                    key={tab}
                    className={`chart-tab${activeTab === tab ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >{tab}</button>
                ))}
              </div>

              <div className="chart-svg-wrap">
                <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4A017" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,90 C20,85 30,95 50,80 C70,65 80,70 100,55 C120,40 130,50 150,45 C170,40 180,60 200,50 C220,40 230,30 250,25 C270,20 280,35 300,28 C320,21 340,15 360,10 C375,7 390,12 400,8 L400,120 L0,120 Z" fill="url(#areaGrad)" />
                  <path d="M0,90 C20,85 30,95 50,80 C70,65 80,70 100,55 C120,40 130,50 150,45 C170,40 180,60 200,50 C220,40 230,30 250,25 C270,20 280,35 300,28 C320,21 340,15 360,10 C375,7 390,12 400,8" fill="none" stroke="#D4A017" strokeWidth="1.8" />
                  <line x1="0" y1="8" x2="400" y2="8" stroke="rgba(0,200,150,0.2)" strokeWidth="1" strokeDasharray="4,4" />
                  <circle cx="400" cy="8" r="4" fill="#00C896" />
                </svg>
              </div>

              <div className="chart-mini-stats">
                <div className="chart-mini-stat">
                  <div className="chart-mini-stat-label">Open</div>
                  <div className="chart-mini-stat-val">$117.26</div>
                </div>
                <div className="chart-mini-stat">
                  <div className="chart-mini-stat-label">High</div>
                  <div className="chart-mini-stat-val">$119.10</div>
                </div>
                <div className="chart-mini-stat">
                  <div className="chart-mini-stat-label">Volume</div>
                  <div className="chart-mini-stat-val">4.2M</div>
                </div>
              </div>
            </div>

            {/* Floating card — bottom */}
            <div className="mini-card" style={{ bottom: '-16px', left: '-10px' }}>
              <div className="mini-card-icon" style={{ background: 'rgba(239,159,39,0.12)' }}>🏆</div>
              <div className="mini-card-text">
                <div className="mini-card-title">Portfolio up 12.4%</div>
                <div className="mini-card-sub">This month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          <div className="stat-bar-item">
            <div className="stat-bar-num">2,200<span>+</span></div>
            <div className="stat-bar-label">ASX-listed securities tracked</div>
          </div>
          <div className="stat-bar-item">
            <div className="stat-bar-num">$<span>2.4</span>T</div>
            <div className="stat-bar-label">Total market capitalisation</div>
          </div>
          <div className="stat-bar-item">
            <div className="stat-bar-num">48<span>K</span></div>
            <div className="stat-bar-label">Active traders on platform</div>
          </div>
          <div className="stat-bar-item">
            <div className="stat-bar-num">99<span>.9%</span></div>
            <div className="stat-bar-label">Platform uptime this year</div>
          </div>
        </div>
      </div>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="features">
        <div className="section-eyebrow">Why TradeASX</div>
        <h2 className="section-title">Everything you need to trade the ASX</h2>
        <p className="section-sub">From real-time quotes to advanced charting — built specifically for Australian investors.</p>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
              <span className="feature-tag">{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── MARKET TABLE ────────────────────────────────────── */}
      <div className="market-section">
        <div className="market-inner">
          <div className="market-header">
            <div>
              <div className="section-eyebrow">Live market</div>
              <h2 className="market-title">Top ASX movers today</h2>
            </div>
            <div className="market-filters">
              {['All','Financials','Materials','Healthcare','Tech'].map(f => (
                <button
                  key={f}
                  className={`mf-btn${activeFilter === f ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >{f}</button>
              ))}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Symbol</th>
                <th>Price</th>
                <th>Change</th>
                <th>% Change</th>
                <th>Volume</th>
                <th>Mkt Cap</th>
                <th>Sector</th>
                <th>7D Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredStocks.map(s => {
                const up = s.chg >= 0;
                return (
                  <tr key={s.sym}>
                    <td>
                      <div className="td-sym">{s.sym}</div>
                      <div className="td-name">{s.name}</div>
                    </td>
                    <td className="td-price">${s.price.toFixed(2)}</td>
                    <td className={up ? 'td-up' : 'td-down'}>{up ? '▲' : '▼'} {Math.abs(s.chg).toFixed(2)}</td>
                    <td className={up ? 'td-up' : 'td-down'}>{up ? '▲' : '▼'} {Math.abs(s.pct).toFixed(2)}%</td>
                    <td>{s.vol}</td>
                    <td>{s.cap}</td>
                    <td><span className="td-sector">{s.sec}</span></td>
                    <td><Sparkline data={s.trend} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="how">
        <div className="section-eyebrow">Getting started</div>
        <h2 className="section-title">Up and running in minutes</h2>
        <div className="steps">
          {STEPS.map(s => (
            <div key={s.n} className="step">
              <div className="step-num">{s.n}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <div className="cta-section">
        <div className="cta-inner">
          <div className="cta-text">
            <h2>Ready to trade smarter?</h2>
            <p>Join thousands of Australian investors who use TradeASX to research, track and monitor the ASX — completely free to get started.</p>
          </div>
          <div className="cta-actions">
            <button className="btn-hero">Create free account →</button>
            <div className="cta-note">No credit card · Cancel anytime</div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="site-footer">
        <div className="footer-top">
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <svg width="32" height="32" viewBox="0 0 40 40">
                <rect width="40" height="40" rx="10" fill="#1A2838"/>
                <circle cx="20" cy="20" r="13" fill="none" stroke="#D4A017" strokeWidth="1.5"/>
                <circle cx="20" cy="20" r="9" fill="#D4A017" opacity="0.15"/>
                <line x1="20" y1="26" x2="20" y2="15" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M16 19 L20 15 L24 19" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="15.5" y1="22" x2="24.5" y2="22" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
                <line x1="15.5" y1="25" x2="24.5" y2="25" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
              </svg>
              <div className="footer-brand-name">Smart Money <span>Method</span></div>
            </div>
            <div className="footer-brand-desc">Australia's smartest money platform — net worth tracking, budgeting, super management and tax tools built for everyday Australians.</div>
          </div>
          <div>
            <div className="footer-col-title">Platform</div>
            <div className="footer-links">
              <a href="#" className="footer-link">Live Markets</a>
              <a href="#" className="footer-link">Charts</a>
              <a href="#" className="footer-link">Stock Screener</a>
              <a href="#" className="footer-link">Portfolio Tracker</a>
              <a href="#" className="footer-link">Price Alerts</a>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Markets</div>
            <div className="footer-links">
              <a href="#" className="footer-link">ASX 200</a>
              <a href="#" className="footer-link">Financials</a>
              <a href="#" className="footer-link">Resources</a>
              <a href="#" className="footer-link">Healthcare</a>
              <a href="#" className="footer-link">Technology</a>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <div className="footer-links">
              <a href="#" className="footer-link">About</a>
              <a href="#" className="footer-link">Pricing</a>
              <a href="#" className="footer-link">API Docs</a>
              <a href="#" className="footer-link">Contact</a>
              <a href="#" className="footer-link">Careers</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Smart Money Method Australia Pty Ltd. All rights reserved.</span>
          <div className="footer-legal">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Disclaimer</a>
          </div>
          <span>Data provided for informational purposes only.</span>
        </div>
      </footer>

    </div>
  );
}
