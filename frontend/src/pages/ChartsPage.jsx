// ============================================================
// ChartsPage.jsx — Charting & Screener tools (tabbed)
//
// Tabs:
//   - Price Chart  — TradingView Advanced Chart (live symbol search)
//   - Screener     — TradingView Screener (Australian market)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { id: 'chart',    label: 'Price Chart', icon: '📈', color: '#378ADD' },
  { id: 'screener', label: 'Screener',    icon: '🔍', color: '#22c55e' },
];

// ---------------------------------------------------------------------------
// Price Chart tab — TradingView Advanced Chart
// ---------------------------------------------------------------------------
function PriceChartTab() {
  const containerRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: 'ASX:BHP',
      interval: 'D',
      timezone: 'Australia/Sydney',
      theme: theme === 'light' ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      save_image: true,
      hide_side_toolbar: false,
      calendar: false,
      exchange: 'ASX',
      country: 'AU',
      isTransparent: false,
      backgroundColor: theme === 'light' ? 'rgba(255, 255, 255, 1)' : 'rgba(11, 18, 25, 1)',
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [theme]);

  return (
    <div className="charts-tab-body">
      <div className="tv-widget-wrap">
        <div className="tv-widget-header">
          <div className="tv-widget-title-group">
            <span className="tv-widget-label">📈 Live Price Chart</span>
            <span className="tv-widget-sub">Powered by TradingView · Search any symbol using the chart's built-in search box</span>
          </div>
        </div>
        <div ref={containerRef} className="tradingview-widget-container charts-tv-container" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screener tab — TradingView Screener (Australian market)
// ---------------------------------------------------------------------------
function ScreenerTab({ isVisible }) {
  const containerRef = useRef(null);
  const { theme } = useTheme();
  const initialised = useRef(false); // true after first successful init
  const lastTheme   = useRef(theme);

  const initWidget = () => {
    const container = containerRef.current;
    if (!container) return;
    // Guard: don't init while hidden — offsetWidth/Height would be 0
    if (container.offsetWidth === 0) return;

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      width:  container.offsetWidth,
      height: container.offsetHeight || 700,
      autosize: true,
      defaultColumn: 'overview',
      defaultScreen: 'most_capitalized',
      market: 'australia',
      exchange: 'ASX',
      country: 'AU',
      showToolbar: true,
      colorTheme: theme === 'light' ? 'light' : 'dark',
      isTransparent: false,
      locale: 'en',
    });
    container.appendChild(script);
    initialised.current = true;
    lastTheme.current   = theme;
  };

  // Initialise once the widget becomes visible for the first time
  useEffect(() => {
    if (!isVisible) return;
    if (initialised.current && lastTheme.current === theme) return; // already up-to-date

    const timer = setTimeout(initWidget, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, theme]);

  // Re-init on window resize (only when already visible)
  useEffect(() => {
    if (!isVisible) return;
    const onResize = () => {
      initialised.current = false; // force re-measure
      setTimeout(initWidget, 120);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <div className="charts-tab-body">
      <div className="tv-widget-wrap">
        <div className="tv-widget-header">
          <div className="tv-widget-title-group">
            <span className="tv-widget-label">🔍 ASX &amp; Australian ETF Screener</span>
            <span className="tv-widget-sub">Powered by TradingView · Australian market only</span>
          </div>
        </div>
        <div ref={containerRef} className="tv-widget-container charts-tv-container" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ChartsPage({ isVisible = true }) {
  const [activeTab, setActiveTab] = useState('chart');

  return (
    <div className="charts-page">

      {/* ── PAGE HERO ── */}
      <div className="charts-hero page-hero">
        <div className="charts-hero-inner">
          <div className="section-eyebrow">Trading Tools</div>
          <h1 className="charts-hero-title">Chart &amp; Screener</h1>
          <p className="charts-hero-sub">
            Live price charts and stock screener for ASX-listed shares and Australian ETFs,
            powered by TradingView.
          </p>
        </div>
      </div>

      {/* ── TAB NAV + CONTENT (solid background section) ── */}
      <div className="charts-body">
        <div className="indicator-tabs-wrap">
          <div className="indicator-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`indicator-tab${activeTab === t.id ? ' active' : ''}`}
                style={activeTab === t.id ? { '--tab-color': t.color } : {}}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="indicator-tab-icon">{t.icon}</span>
                <span className="indicator-tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Both tabs always mounted — CSS hides inactive tab to preserve widget state */}
        <div className="charts-content">
          <div style={{ display: activeTab === 'chart'    ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <PriceChartTab />
          </div>
          <div style={{ display: activeTab === 'screener' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <ScreenerTab isVisible={isVisible && activeTab === 'screener'} />
          </div>
        </div>
      </div>

    </div>
  );
}
