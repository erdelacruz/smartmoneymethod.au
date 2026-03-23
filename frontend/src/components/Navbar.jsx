// ============================================================
// components/Navbar.jsx — Top navigation bar.
//
// Renders different links based on authentication state:
//   Logged out: Home | Login
//   Logged in:  Home | Admin Dashboard | Logout (username)
// ============================================================

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  // user: the logged-in user object or null
  // logout: function from AuthContext that clears auth state
  const { user, logout } = useAuth();

  // useNavigate returns a function that navigates programmatically.
  // Used here to redirect to /login after logging out.
  const navigate = useNavigate();

  // Handle logout button click
  const handleLogout = () => {
    logout();           // Clear state and localStorage token
    navigate('/login'); // Redirect to login page
  };

  return (
    <nav className="navbar">
      {/* App brand / home link */}
      <Link to="/" className="nav-brand">
        {/* Icon: dark rounded square with stock-chart line */}
        <svg width="36" height="36" viewBox="0 0 56 56" aria-hidden="true" style={{flexShrink:0}}>
          <rect width="56" height="56" rx="12" fill="#1A2235"/>
          <polyline points="10,40 20,24 30,30 46,12" fill="none" stroke="#378ADD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="46" cy="12" r="3.5" fill="#378ADD"/>
          <line x1="10" y1="46" x2="46" y2="46" stroke="#378ADD" strokeWidth="1" opacity="0.3"/>
        </svg>
        {/* Wordmark + tagline */}
        <div className="nav-brand-text">
          <span className="nav-brand-name">Trade<span className="nav-brand-asx">ASX</span></span>
          <span className="nav-brand-sub">Australian Stock Exchange</span>
        </div>
      </Link>

      {/* Navigation links — rendered conditionally based on login state */}
      <div className="nav-links">
        {/* Home is always visible */}
        <Link to="/">Home</Link>

        {user ? (
          // === Logged-in state ===
          <>
            {/* Link to the admin dashboard — only shown when authenticated */}
            <Link to="/admin">Admin Dashboard</Link>

            {/* Logout button — displays the username so the user knows who is logged in */}
            <button className="btn-logout" onClick={handleLogout}>
              Logout ({user.username})
            </button>
          </>
        ) : (
          // === Logged-out state ===
          // Link component from react-router-dom renders an <a> tag that
          // navigates without a full page reload
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}
