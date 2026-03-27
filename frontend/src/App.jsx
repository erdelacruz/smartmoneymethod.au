// ============================================================
// App.jsx — Root component: sets up routing and auth context.
// ============================================================

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { AuthProvider }  from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar          from './components/Navbar';
import Footer          from './components/Footer';
import ProtectedRoute  from './components/ProtectedRoute';
import AdBanner        from './components/AdBanner';

// ── Eager: critical first-render pages ───────────────────────
import PublicPage from './pages/PublicPage';
import LoginPage  from './pages/LoginPage';

// ── Lazy: split into separate JS chunks per tool page ────────
const AdminPage                 = lazy(() => import('./pages/AdminPage'));
const ProfitLossPage            = lazy(() => import('./pages/ProfitLossPage'));
const PayCalculatorPage         = lazy(() => import('./pages/PayCalculatorPage'));
const CompoundingCalculatorPage = lazy(() => import('./pages/CompoundingCalculatorPage'));
const BudgetToolPage            = lazy(() => import('./pages/BudgetToolPage'));
const DCACalculatorPage         = lazy(() => import('./pages/DCACalculatorPage'));
const ChartsPage                = lazy(() => import('./pages/ChartsPage'));
const TradingGroundsPage        = lazy(() => import('./pages/TradingGroundsPage'));
const BacktestingPage           = lazy(() => import('./pages/BacktestingPage'));
const BlogListPage              = lazy(() => import('./pages/BlogListPage'));
const BlogPostPage              = lazy(() => import('./pages/BlogPostPage'));
const BlogEditorPage            = lazy(() => import('./pages/BlogEditorPage'));

// ── Minimal loading fallback (shown while chunk downloads) ───
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: 'var(--text-muted)', fontSize: '.9rem',
    }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" style={{ marginRight: 10, animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading…
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner app — needs useLocation so must live inside BrowserRouter
// ---------------------------------------------------------------------------
function AppInner() {
  const location = useLocation();
  const isCharts = location.pathname === '/charts';
  const hideAds  = location.pathname === '/login'
    || location.pathname === '/admin'
    || location.pathname.startsWith('/admin/');

  return (
    <>
      <Navbar />

      {/* ChartsPage is always mounted (never unmounted) so the TradingView
          screener iframe stays alive and preserves filter state across
          navigation. CSS display controls visibility. */}
      <Suspense fallback={null}>
        <div style={{ display: isCharts ? 'block' : 'none' }}>
          <ChartsPage isVisible={isCharts} />
        </div>
      </Suspense>

      <main
        className="main-content"
        style={{ position: 'relative', zIndex: 1, display: isCharts ? 'none' : 'block' }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/"       element={<PublicPage />} />
            <Route path="/login"  element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route path="/calculator"             element={<ProfitLossPage />} />
            <Route path="/pay-calculator"         element={<PayCalculatorPage />} />
            <Route path="/compounding-calculator" element={<CompoundingCalculatorPage />} />
            <Route path="/budget"                 element={<BudgetToolPage />} />
            <Route path="/dca-calculator"         element={<DCACalculatorPage />} />
            <Route path="/trading-grounds"        element={<TradingGroundsPage />} />
            <Route path="/backtesting"            element={<BacktestingPage />} />
            <Route path="/learn"                        element={<Navigate to="/learn/blog" replace />} />
            <Route path="/learn/trading-strategy"   element={<BlogListPage type="Trading Strategy" />} />
            <Route path="/learn/investing-strategy"  element={<BlogListPage type="Investing Strategy" />} />
            <Route path="/learn/blog"               element={<BlogListPage type="Blog" />} />
            <Route path="/learn/:slug"              element={<BlogPostPage />} />
            <Route
              path="/admin/blog/new"
              element={
                <ProtectedRoute>
                  <BlogEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/blog/edit/:id"
              element={
                <ProtectedRoute>
                  <BlogEditorPage />
                </ProtectedRoute>
              }
            />
            {/* Charts route: handled by always-mounted ChartsPage above */}
            <Route path="/charts"    element={null} />
            {/* Legacy redirects */}
            <Route path="/asx-chart" element={<Navigate to="/charts" replace />} />
            <Route path="/screener"  element={<Navigate to="/charts" replace />} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {!hideAds && (
        <AdBanner
          adSlot="1823951895"
          adFormat="horizontal"
        />
      )}

      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
