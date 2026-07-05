import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import PendingVerification from './pages/PendingVerification';
import Dashboard from './pages/Dashboard';
import CreateBooking from './pages/CreateBooking';
import AdminDashboard from './pages/AdminDashboard';
import BookingDetails from './pages/BookingDetails';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 flex flex-col">
          <Navbar />
          <div className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Pending Verification Route */}
              <Route
                path="/pending"
                element={
                  <ProtectedRoute allowPendingOnly={true}>
                    <PendingVerification />
                  </ProtectedRoute>
                }
              />

              {/* Verified Employee / Admin Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-booking"
                element={
                  <ProtectedRoute>
                    <CreateBooking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking/:bookingId/edit"
                element={
                  <ProtectedRoute>
                    <CreateBooking isEdit={true} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking/:bookingId"
                element={
                  <ProtectedRoute>
                    <BookingDetails />
                  </ProtectedRoute>
                }
              />

              {/* Admin-Only Routes */}
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />

              {/* Default Redirect */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
