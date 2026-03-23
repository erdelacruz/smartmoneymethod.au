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
      {/* Left side: brand + primary nav links */}
      <div className="nav-left">
        {/* App brand / home link */}
        <Link to="/" className="nav-brand">
          {/* Icon: coin with upward arrow */}
          <svg width="36" height="36" viewBox="0 0 40 40" aria-hidden="true" style={{flexShrink:0}}>
            <rect width="40" height="40" rx="10" fill="#1A2838"/>
            <circle cx="20" cy="20" r="13" fill="none" stroke="#D4A017" strokeWidth="1.5"/>
            <circle cx="20" cy="20" r="9" fill="#D4A017" opacity="0.15"/>
            <line x1="20" y1="26" x2="20" y2="15" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M16 19 L20 15 L24 19" fill="none" stroke="#D4A017" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="15.5" y1="22" x2="24.5" y2="22" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
            <line x1="15.5" y1="25" x2="24.5" y2="25" stroke="#D4A017" strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
          </svg>
          {/* Wordmark + tagline */}
          <div className="nav-brand-text">
            <span className="nav-brand-name">Smart Money <span className="nav-brand-asx">Method</span></span>
            <span className="nav-brand-sub">Australia</span>
          </div>
        </Link>

        {/* Primary links — always visible, grouped left */}
        <div className="nav-links nav-links-left">
          <Link to="/">Home</Link>
          <Link to="/indicators">Indicators</Link>
          <Link to="/calculator">P&amp;L Calculator</Link>
        </div>
      </div>

      {/* Right side: auth-related links */}
      <div className="nav-links">
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
          <Link to="/login" className="nav-user-icon" aria-label="Login">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        )}
      </div>
    </nav>
  );
}
