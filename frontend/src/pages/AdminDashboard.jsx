import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  ShieldAlert,
  Shield,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  AlertCircle,
  Clock,
  Eye,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { API_BASE } from '../config';

const AdminDashboard = () => {
  const { token, user: currentUser } = useAuth();
  
  // State for Users Tab
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [actionUserId, setActionUserId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, userName: '', isVerified: false });

  // State for Bookings Tab
  const [pendingBookings, setPendingBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Active Tab state: 'users' or 'bookings'
  const [activeTab, setActiveTab] = useState('users');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setUsersError(data.message || 'Failed to load system users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsersError('Connection to server failed');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchPendingBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPendingBookings(data.data);
      } else {
        setBookingsError(data.message || 'Failed to load pending bookings');
      }
    } catch (err) {
      console.error('Error fetching pending bookings:', err);
      setBookingsError('Connection to server failed');
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingBookings();
  }, [token]);

  const triggerToggleConfirm = (userItem) => {
    if (userItem._id === currentUser.id) {
      alert('You cannot toggle your own verification status.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      userId: userItem._id,
      userName: userItem.name,
      isVerified: userItem.isVerified,
    });
  };

  const executeToggleVerification = async () => {
    const { userId } = confirmModal;
    setConfirmModal({ isOpen: false, userId: null, userName: '', isVerified: false });
    
    setActionUserId(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success) {
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u._id === userId ? { ...u, isVerified: data.data.isVerified } : u))
        );
      } else {
        alert(data.message || 'Failed to toggle status');
      }
    } catch (err) {
      console.error('Error toggling verification:', err);
      alert('Failed to toggle verification due to server connection issues.');
    } finally {
      setActionUserId(null);
    }
  };

  // Confirm booking action
  const handleConfirmBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/confirm/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));
      } else {
        alert(data.message || 'Failed to confirm booking');
      }
    } catch (err) {
      console.error('Error confirming booking:', err);
      alert('Server connection failed');
    }
  };

  // Reject booking action
  const handleRejectBooking = async (bookingId) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/reject/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));
      } else {
        alert(data.message || 'Failed to reject booking');
      }
    } catch (err) {
      console.error('Error rejecting booking:', err);
      alert('Server connection failed');
    }
  };

  // Stats calculation
  const totalUsers = users.length;
  const totalEmployees = users.filter((u) => u.role === 'employee').length;
  const pendingVerification = users.filter((u) => u.role === 'employee' && !u.isVerified).length;
  const totalPendingBookings = pendingBookings.length;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (usersLoading && bookingsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Loading Administration Panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
              <Shield className="w-8 h-8 text-indigo-600" />
              <span>Admin Management Hub</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Verify employee registers, audit system credentials, and approve pending traveller bookings.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-650">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{totalUsers}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employees</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{totalEmployees}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Verification</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{pendingVerification}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Bookings</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{totalPendingBookings}</p>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation */}
        <div className="flex space-x-2 bg-slate-900 p-1.5 rounded-2xl w-fit mb-6 border border-slate-800">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15'
                : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>User Accounts ({users.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15'
                : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Bookings ({pendingBookings.length})</span>
          </button>
        </div>

        {/* Main Tabbed Content Area */}
        {activeTab === 'users' ? (
          <div>
            {usersError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{usersError}</span>
              </div>
            )}

            {/* User Accounts Management list */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Verification Status</th>
                      <th className="px-6 py-4">Registered Date</th>
                      <th className="px-6 py-4 text-center">Toggle Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                    {users.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-900/25 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-100">{item.name}</span>
                          {item._id === currentUser.id && (
                            <span className="ml-2 text-[10px] uppercase font-bold text-indigo-650 bg-indigo-500/10 border border-indigo-550/20 px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                          {item.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                            item.role === 'admin'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-slate-800 text-slate-300 border border-slate-700/50'
                          }`}>
                            {item.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.role === 'admin' || item.isVerified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                              <Check className="w-4 h-4 text-emerald-500" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                              <X className="w-4 h-4 text-amber-500" />
                              <span>Pending Review</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {item.role === 'admin' ? (
                            <span className="text-xs text-slate-500 italic">Always Approved</span>
                          ) : (
                            <button
                              onClick={() => triggerToggleConfirm(item)}
                              disabled={actionUserId === item._id}
                              className={`inline-flex items-center space-x-1.5 py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                                item.isVerified
                                  ? 'bg-rose-500/10 text-rose-455 border-rose-500/20 hover:bg-rose-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              } disabled:opacity-50`}
                            >
                              {actionUserId === item._id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              ) : item.isVerified ? (
                                <>
                                  <ToggleRight className="w-4 h-4" />
                                  <span>Revoke Access</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4" />
                                  <span>Verify User</span>
                                </>
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {bookingsError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{bookingsError}</span>
              </div>
            )}

            {/* Pending Bookings Listing */}
            {pendingBookings.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center shadow-inner flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-305">All Caught Up!</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  There are no pending traveller bookings awaiting approval.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Booking ID</th>
                        <th className="px-6 py-4">Traveller Details</th>
                        <th className="px-6 py-4">Trip Details</th>
                        <th className="px-6 py-4">Financial Ledger</th>
                        <th className="px-6 py-4">Agent</th>
                        <th className="px-6 py-4 text-center">Receipt</th>
                        <th className="px-6 py-4 text-center">Review Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                      {pendingBookings.map((booking) => (
                        <tr key={booking._id} className="hover:bg-slate-900/25 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-600 font-mono">
                            {booking.bookingId}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-semibold text-slate-100">{booking.travellerName}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-650" /> {booking.travellerEmail}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-650" /> {booking.travellerPhone}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col space-y-0.5">
                              <span className="font-medium text-slate-100 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" /> {booking.packageName}
                              </span>
                              <span className="text-xs text-slate-400">{booking.location}</span>
                              <span className="text-xs text-indigo-400 font-mono">
                                {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            <div className="flex flex-col">
                              <span className="text-slate-400">Total: <strong className="text-slate-200">₹{booking.totalAmount}</strong></span>
                              <span className="text-emerald-405">Paid: <strong>₹{booking.paidAmount}</strong></span>
                              <span className="text-rose-455">Due: <strong>₹{booking.dueAmount}</strong></span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">
                            <div className="flex flex-col">
                              <span className="font-semibold">{booking.createdBy?.name || 'Deleted'}</span>
                              <span className="text-slate-500">{booking.createdBy?.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => setSelectedScreenshot(booking.screenshot)}
                              className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-slate-850 text-slate-650 hover:bg-slate-800 hover:text-slate-100 border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleConfirmBooking(booking._id)}
                                className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold transition-all cursor-pointer"
                                title="Approve Booking"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Confirm</span>
                              </button>
                              
                              <button
                                onClick={() => handleRejectBooking(booking._id)}
                                className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-xl bg-rose-500/10 text-rose-455 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                                title="Reject Booking"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Confirmation Modal Card */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl p-6 animate-scaleUp">
            <div className="flex items-center space-x-3 text-amber-500 mb-4">
              <AlertCircle className="w-8 h-8 flex-shrink-0 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-100">Confirm Security Action</h3>
            </div>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Are you sure you want to {confirmModal.isVerified ? 'revoke access' : 'verify and approve access'} for <strong className="text-slate-100">{confirmModal.userName}</strong>? This will immediately affect their system access permissions.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal({ isOpen: false, userId: null, userName: '', isVerified: false })}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeToggleVerification}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer ${
                  confirmModal.isVerified
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-650/15'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-650/15'
                }`}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Payment Receipt Verification</h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-lg bg-slate-850 text-slate-500 hover:text-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex justify-center bg-slate-955 max-h-[70vh] overflow-y-auto">
              <img
                src={`${API_BASE}/${selectedScreenshot}`}
                alt="Payment Transaction Receipt"
                className="max-h-[50vh] object-contain border border-slate-800 rounded-lg shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
