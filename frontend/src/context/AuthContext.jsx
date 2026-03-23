// ============================================================
// context/AuthContext.jsx — Global authentication state.
//
// React Context lets you share data across the entire component tree
// without "prop drilling" (passing props through every intermediate component).
//
// What this file exports:
//   AuthProvider  — wraps the app; manages auth state and exposes helpers
//   useAuth       — custom hook any component uses to read/update auth state
//
// State managed here:
//   user          — the logged-in user object, or null when logged out
//   token         — the JWT string, or null
//   loading       — true while we verify a saved token on page load
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';

// createContext() creates the Context object.
// The argument (null) is the default value used when a component reads
// the context but is NOT inside an AuthProvider — useful for catching mistakes.
const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// AuthProvider — the component that owns auth state.
// Wrap your entire app with this so all children can call useAuth().
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  // user: the decoded user object { id, username, role } or null
  const [user, setUser]       = useState(null);
  // token: the raw JWT string used in Authorization headers
  const [token, setToken]     = useState(null);
  // loading: prevents rendering protected routes before we finish the token check
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // On mount — check localStorage for a saved token from a previous session.
  // If found, verify it with the backend (GET /api/auth/me).
  // This restores the session automatically when the user refreshes the page.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const savedToken = localStorage.getItem('token'); // Read the persisted token

    if (savedToken) {
      // Verify the token is still valid by calling the protected /me endpoint
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` }, // Send token in header
      })
        .then(res => (res.ok ? res.json() : Promise.reject())) // Only proceed on 200
        .then(data => {
          setUser(data.user);   // Restore user state
          setToken(savedToken); // Restore token state
        })
        .catch(() => {
          // Token is expired or invalid — clean up so the user sees the login page
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false)); // Always mark loading complete
    } else {
      // No saved token — nothing to verify
      setLoading(false);
    }
  }, []); // Empty array: run only once on mount

  // ---------------------------------------------------------------------------
  // login — called by LoginPage after a successful POST /api/auth/login.
  // Stores the token in localStorage so it survives page refreshes.
  // ---------------------------------------------------------------------------
  const login = (userData, jwtToken) => {
    setUser(userData);    // Update in-memory state
    setToken(jwtToken);   // Update in-memory state
    localStorage.setItem('token', jwtToken); // Persist to browser storage
  };

  // ---------------------------------------------------------------------------
  // logout — clears all auth state and removes the token from storage.
  // Called by the Navbar logout button.
  // ---------------------------------------------------------------------------
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token'); // Remove so the next page load starts fresh
  };

  // The value object is what every useAuth() call receives.
  // We expose state values AND the helper functions.
  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useAuth — custom hook that components call to access auth state.
// Example: const { user, logout } = useAuth();
//
// Wrapping useContext in a custom hook is a best practice because:
//   1. It gives a meaningful name to what the hook provides
//   2. You can add error checking (e.g. throw if used outside AuthProvider)
// ---------------------------------------------------------------------------
export function useAuth() {
  return useContext(AuthContext);
}
