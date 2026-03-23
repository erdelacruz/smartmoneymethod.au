// ============================================================
// components/ProtectedRoute.jsx — Route guard for admin pages.
//
// How it works:
//   Wrap any <Route> element with <ProtectedRoute>.
//   If the user is authenticated, the children (the real page) render.
//   If not authenticated, they are redirected to /login.
//   While the auth state is still being verified (loading), nothing
//   renders to prevent a flash of the protected content.
// ============================================================

import React from 'react';
import { Navigate } from 'react-router-dom'; // Programmatic redirect component
import { useAuth } from '../context/AuthContext';

// children: the protected page component passed between <ProtectedRoute> tags
export default function ProtectedRoute({ children }) {
  // Read the current auth state from the global context
  const { user, loading } = useAuth();

  // loading is true while the app is verifying a saved token from localStorage.
  // We return null (render nothing) to avoid briefly showing the login redirect
  // to a user who IS authenticated but whose token hasn't been verified yet.
  if (loading) return null;

  // user is null means nobody is logged in.
  // <Navigate> triggers a client-side redirect — no page reload.
  // replace={true} replaces the current history entry instead of pushing a new one,
  // so pressing the browser Back button doesn't loop back to /admin.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated — render the wrapped page component
  return children;
}
