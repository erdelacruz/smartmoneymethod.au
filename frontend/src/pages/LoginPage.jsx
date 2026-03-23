// ============================================================
// pages/LoginPage.jsx — Admin login form.
//
// Flow:
//   1. User enters username + password and submits
//   2. We POST to /api/auth/login
//   3. On success: store the JWT via login() and navigate to /admin
//   4. On failure: display the error message from the backend
// ============================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Programmatic navigation hook
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  // Form field state — controlled inputs
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [error,   setError]   = useState('');   // Error message string or empty
  const [loading, setLoading] = useState(false); // True while the fetch is in-flight

  // login: from AuthContext — stores the user + token after successful auth
  const { login } = useAuth();

  // navigate: from React Router — redirects the user after login
  const navigate = useNavigate();

  // ---------------------------------------------------------------------------
  // handleSubmit — fires when the user submits the login form.
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default HTML form submit (page reload)
    setError('');        // Clear any previous error before a new attempt
    setLoading(true);    // Show loading state on the button

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Tell the server we send JSON
        body: JSON.stringify({ username, password }),      // Serialize credentials to JSON
      });

      const data = await res.json(); // Parse the JSON response body

      if (!res.ok) {
        // res.ok is false for 4xx/5xx status codes.
        // data.message contains the reason from the backend (e.g. "Invalid credentials").
        setError(data.message || 'Login failed');
        return; // Stop here — don't call login() or navigate
      }

      // Success — data contains { token, user }
      // Store them in global state and localStorage via the AuthContext helper
      login(data.user, data.token);

      // Redirect to the admin dashboard after a successful login
      navigate('/admin');

    } catch {
      // Network error (e.g., backend is offline)
      setError('Could not connect to the server. Is the backend running?');
    } finally {
      // Always reset the loading flag regardless of success or failure
      setLoading(false);
    }
  };

  return (
    <div className="page login-page">
      <div className="login-box">
        <h1>Admin Login</h1>

        {/* Show the error banner only when there is an error message */}
        {error && <p className="error-banner">{error}</p>}

        {/* onSubmit wires the native form event to our handleSubmit function */}
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Username
            {/* Controlled input: value is driven by state, onChange updates state */}
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus // Automatically focuses this field when the page loads
            />
          </label>

          <label>
            Password
            {/* type="password" masks the characters as the user types */}
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </label>

          {/* disabled during fetch to prevent double submission */}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
