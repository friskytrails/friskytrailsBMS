import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowPendingOnly = false }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Verifying Session...</p>
      </div>
    );
  }

  // If there is no token, redirect to login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const isEmployee = user.role === 'employee';
  const isVerified = user.isVerified;

  if (isEmployee) {
    if (!isVerified) {
      // Unverified employee trying to access standard pages: Redirect to pending
      if (!allowPendingOnly) {
        return <Navigate to="/pending" replace />;
      }
    } else {
      // Verified employee trying to access the pending page: Redirect to dashboard
      if (allowPendingOnly) {
        return <Navigate to="/dashboard" replace />;
      }
    }
  } else if (user.role === 'admin') {
    // Admin trying to access pending page: Redirect to admin panel
    if (allowPendingOnly) {
      return <Navigate to="/admin" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
