import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  XCircle,
  RefreshCw,
  FileText,
  CreditCard,
  ZoomIn,
  ZoomOut,
  Copy
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fetchingScreenshotId, setFetchingScreenshotId] = useState(null);

  // State for Payments Tab
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState('');
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  // State for Generated IDs Tab
  const [generatedIds, setGeneratedIds] = useState([]);
  const [generatedIdsLoading, setGeneratedIdsLoading] = useState(true);
  const [generatedIdsError, setGeneratedIdsError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // State for screenshot upload modal during payment verification
  const [screenshotModal, setScreenshotModal] = useState({
    isOpen: false,
    bookingObjectId: null,
    paymentId: null,
    isServicePayment: false,
    serviceId: null,
    file: null,
    loading: false
  });

  const handleViewScreenshot = async (bookingId, bookingObjectId) => {
    setFetchingScreenshotId(bookingObjectId);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/id/${bookingObjectId}/screenshot`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && data.screenshot) {
        setSelectedScreenshot(data.screenshot);
      } else {
        alert(data.message || 'Screenshot not found or failed to load');
      }
    } catch (err) {
      console.error('Error fetching screenshot:', err);
      alert('Connection to server failed while loading screenshot');
    } finally {
      setFetchingScreenshotId(null);
    }
  };

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

  const fetchPendingPayments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/pending-payments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setPendingPayments(data.data);
      } else {
        setPaymentsError(data.message || 'Failed to load pending payments');
      }
    } catch (err) {
      console.error('Error fetching pending payments:', err);
      setPaymentsError('Connection to server failed');
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchGeneratedIds = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/generated-payment-ids`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedIds(data.data);
      } else {
        setGeneratedIdsError(data.message || 'Failed to load generated IDs');
      }
    } catch (err) {
      console.error('Error fetching generated IDs:', err);
      setGeneratedIdsError('Connection to server failed');
    } finally {
      setGeneratedIdsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPendingBookings();
    fetchPendingPayments();
    fetchGeneratedIds();
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
        setSuccessModal({ isOpen: true, message: 'Booking confirmed successfully!' });
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
        setSuccessModal({ isOpen: true, message: 'Booking rejected successfully!' });
      } else {
        alert(data.message || 'Failed to reject booking');
      }
    } catch (err) {
      console.error('Error rejecting booking:', err);
      alert('Server connection failed');
    }
  };

  // Verify payment action
  const handleVerifyPayment = async (bookingObjectId, paymentId, isServicePayment, serviceId) => {
    // Check if a screenshot is required but missing
    const paymentObj = pendingPayments.find(p => p.paymentId === paymentId || p._id === paymentId);
    if (isServicePayment && paymentObj && !paymentObj.attachment) {
      setScreenshotModal({
        isOpen: true,
        bookingObjectId,
        paymentId,
        isServicePayment,
        serviceId,
        file: null,
        loading: false
      });
      return;
    }

    try {
      const url = isServicePayment
        ? `${API_BASE}/api/bookings/${bookingObjectId}/services/${serviceId}/payment/${paymentId}/verify`
        : `${API_BASE}/api/bookings/${bookingObjectId}/verify-payment/${paymentId}`;

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'VERIFIED' })
      });
      const data = await res.json();
      if (data.success) {
        setPendingPayments(prev => prev.filter(p => p.paymentId !== paymentId && p._id !== paymentId));
        // If booking was auto-confirmed (first payment verified on a Pending booking),
        // remove it from pending bookings list as well
        if (!isServicePayment && data.autoConfirmed) {
          setPendingBookings(prev => prev.filter(b => b._id !== bookingObjectId));
          setSuccessModal({ isOpen: true, message: 'Payment verified successfully! Booking has been auto-confirmed and removed from pending bookings.' });
        } else {
          setSuccessModal({ isOpen: true, message: 'Payment verified successfully!' });
        }
      } else {
        alert(data.message || 'Failed to verify payment');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert('Server connection failed');
    }
  };

  const handleUploadAndVerify = async () => {
    if (!screenshotModal.file) {
      alert('Please select a screenshot file first.');
      return;
    }
    
    setScreenshotModal(prev => ({ ...prev, loading: true }));
    
    try {
      const formData = new FormData();
      formData.append('status', 'VERIFIED');
      formData.append('screenshot', screenshotModal.file);
      
      const url = `${API_BASE}/api/bookings/${screenshotModal.bookingObjectId}/services/${screenshotModal.serviceId}/payment/${screenshotModal.paymentId}/verify`;
      
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });
      
      const data = await res.json();
      if (data.success) {
        setPendingPayments(prev => prev.filter(p => p.paymentId !== screenshotModal.paymentId && p._id !== screenshotModal.paymentId));
        setScreenshotModal({ isOpen: false, bookingObjectId: null, paymentId: null, isServicePayment: false, serviceId: null, file: null, loading: false });
        setSuccessModal({ isOpen: true, message: 'Payment uploaded and verified successfully!' });
        fetchPendingPayments();
        fetchGeneratedIds();
      } else {
        alert(data.message || 'Failed to verify payment');
      }
    } catch (err) {
      console.error('Error uploading/verifying payment:', err);
      alert('Server connection failed');
    } finally {
      setScreenshotModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Reject payment action
  const handleRejectPayment = async (bookingObjectId, paymentId, isServicePayment, serviceId) => {
    const reason = prompt('Please enter rejection reason (optional):');
    if (reason === null) return; // User cancelled
    try {
      const url = isServicePayment
        ? `${API_BASE}/api/bookings/${bookingObjectId}/services/${serviceId}/payment/${paymentId}/verify`
        : `${API_BASE}/api/bookings/${bookingObjectId}/verify-payment/${paymentId}`;

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'REJECTED', reason: reason || 'Rejected by Admin' })
      });
      const data = await res.json();
      if (data.success) {
        setPendingPayments(prev => prev.filter(p => p.paymentId !== paymentId && p._id !== paymentId));
        setSuccessModal({ isOpen: true, message: 'Payment rejected successfully!' });
      } else {
        alert(data.message || 'Failed to reject payment');
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
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

  const handleCopyDetails = (p) => {
    const paymentIdVal = p.paymentId;
    if (!paymentIdVal) return;

    const supplierNameVal = (p.supplier && typeof p.supplier === 'object' && p.supplier.businessName) || p.supplierName || 'Unknown Supplier';
    
    const serviceDateVal = (p.startDate && p.endDate)
      ? `${new Date(p.startDate).toLocaleDateString('en-IN')} to ${new Date(p.endDate).toLocaleDateString('en-IN')}`
      : p.startDate
        ? new Date(p.startDate).toLocaleDateString('en-IN')
        : 'N/A';

    const supplier = p.supplier;
    let accountDetailsVal = 'N/A';
    if (supplier && typeof supplier === 'object') {
      const accParts = [];
      if (supplier.accountHolderName) accParts.push(`Holder: ${supplier.accountHolderName}`);
      if (supplier.bankName) accParts.push(`Bank: ${supplier.bankName}`);
      if (supplier.accountNumber) accParts.push(`A/C: ${supplier.accountNumber}`);
      if (supplier.ifscCode) accParts.push(`IFSC: ${supplier.ifscCode}`);
      if (supplier.upiId) accParts.push(`UPI ID: ${supplier.upiId}`);
      if (supplier.upiNumber) accParts.push(`UPI No: ${supplier.upiNumber}`);
      if (accParts.length > 0) accountDetailsVal = accParts.join('\n');
    }

    const amountToPayVal = p.paidAmount ? `₹${p.paidAmount.toLocaleString('en-IN')}` : 'N/A';
    const remarkVal = p.details || 'N/A';

    const copyText = `Payment ID: ${paymentIdVal}
Supplier Name: ${supplierNameVal}
Service Date: ${serviceDateVal}
Account Details:
${accountDetailsVal}
Amount to Pay: ${amountToPayVal}
Remark: ${remarkVal}`;

    navigator.clipboard.writeText(copyText);
    setCopiedId(paymentIdVal);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (usersLoading && bookingsLoading && paymentsLoading) {
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

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15'
                : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Pending Payments ({pendingPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('generatedIds')}
            className={`flex items-center space-x-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'generatedIds'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-650/15'
                : 'text-slate-400 hover:text-slate-205 hover:bg-slate-850/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Generated IDs ({generatedIds.length})</span>
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
        ) : activeTab === 'bookings' ? (
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
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-650 font-mono">
                            <Link to={`/booking/${booking.bookingId}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-600">
                              {booking.bookingId}
                            </Link>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 max-w-[125px]">
                              <span className="inline-flex items-center justify-between font-mono text-[11px] font-bold text-orange-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded shadow-sm">
                                <span className="text-[9px] uppercase font-sans text-slate-500 mr-2">Total</span>
                                <span>₹{booking.totalAmount}</span>
                              </span>
                              <span className="inline-flex items-center justify-between font-mono text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded shadow-sm">
                                <span className="text-[9px] uppercase font-sans text-slate-500 mr-2">Paid</span>
                                <span>₹{booking.paidAmount}</span>
                              </span>
                              <span className={`inline-flex items-center justify-between font-mono text-[11px] font-bold px-2.5 py-1 rounded border shadow-sm ${
                                booking.dueAmount > 0 
                                  ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
                                  : 'text-slate-400 bg-slate-800/40 border border-slate-700/30'
                              }`}>
                                <span className="text-[9px] uppercase font-sans text-slate-500 mr-2">Due</span>
                                <span>₹{booking.dueAmount}</span>
                              </span>
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
                              onClick={() => handleViewScreenshot(booking.bookingId, booking._id)}
                              disabled={fetchingScreenshotId === booking._id}
                              className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-slate-850 text-slate-650 hover:bg-slate-800 hover:text-slate-100 border border-slate-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {fetchingScreenshotId === booking._id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              <span>{fetchingScreenshotId === booking._id ? 'Loading...' : 'View Receipt'}</span>
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
        ) : activeTab === 'payments' ? (
          <div>
            {paymentsError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{paymentsError}</span>
              </div>
            )}

            {/* Pending Payments Listing */}
            {pendingPayments.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center shadow-inner flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-500">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-305">All Verified!</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  There are no manual payments awaiting verification.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                    <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Booking ID</th>
                        <th className="px-6 py-4">Traveller & Trip</th>
                        <th className="px-6 py-4">Amount Paid</th>
                        <th className="px-6 py-4">Mode</th>
                        <th className="px-6 py-4">From & To</th>
                        <th className="px-6 py-4">Added By / Details</th>
                        <th className="px-6 py-4 text-center">Receipt</th>
                        <th className="px-6 py-4 text-center">Review Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                      {pendingPayments.map((p) => {
                        const fileUrl = p.attachment
                          ? (p.attachment.startsWith('data:') || p.attachment.startsWith('http')
                              ? p.attachment
                              : `${API_BASE}/${p.attachment}`)
                          : null;
                        return (
                          <tr key={p.paymentId || p._id} className="hover:bg-slate-900/25 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-bold text-indigo-400 font-mono">
                              <Link to={`/booking/${p.bookingId}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-400">
                                {p.bookingId}
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-100">{p.travellerName}</span>
                                  {p.isServicePayment ? (
                                    <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                                      Supplier Pay
                                    </span>
                                  ) : (
                                    <span className="text-[9px] uppercase font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                                      Traveler Pay
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-indigo-650" /> {p.packageName}
                                </span>
                                <span className="text-[10px] text-slate-450">{p.location}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono font-extrabold text-slate-100 whitespace-nowrap">
                              ₹{p.amountPaid.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-xs font-semibold text-indigo-400 uppercase bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                                {p.paymentMode}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-300">
                              <span className="font-semibold text-slate-400">{p.paymentFrom}</span>
                              <span className="text-slate-650 mx-1.5">→</span>
                              <span className="font-semibold text-slate-400">{p.paymentTo}</span>
                            </td>
                            <td className="px-6 py-4 text-xs">
                              <div className="flex flex-col">
                                <span className="text-slate-300 font-medium">{p.addedBy}</span>
                                <span className="text-slate-500 font-mono text-[10px] mt-0.5 truncate max-w-[120px]" title={p.details}>
                                  {p.details || '—'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {fileUrl ? (
                                <button
                                  onClick={() => setSelectedScreenshot(p.attachment)}
                                  className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold transition-all cursor-pointer"
                                >
                                  {p.attachment.endsWith('.pdf') || p.attachment.startsWith('data:application/pdf') ? (
                                    <FileText className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                  <span>View</span>
                                </button>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => handleVerifyPayment(p.bookingObjectId, p.paymentId, p.isServicePayment, p.serviceId)}
                                  className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs font-bold transition-all cursor-pointer"
                                  title="Approve Payment"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Verify</span>
                                </button>
                                
                                <button
                                  onClick={() => handleRejectPayment(p.bookingObjectId, p.paymentId, p.isServicePayment, p.serviceId)}
                                  className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-xl bg-rose-500/10 text-rose-455 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-bold transition-all cursor-pointer"
                                  title="Reject Payment"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {generatedIdsError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{generatedIdsError}</span>
              </div>
            )}

            {/* Generated Payment IDs Listing */}
            {generatedIdsLoading ? (
              <div className="flex justify-center items-center py-12">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
              </div>
            ) : generatedIds.length === 0 ? (
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center shadow-inner flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-500">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100">No Generated Payment IDs</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-sm">
                    There are no payment IDs generated for any services in bookings yet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">Generated Payment IDs</h3>
                    <p className="text-slate-500 text-sm mt-0.5">List of all generated payment request IDs.</p>
                  </div>
                  <button 
                    onClick={fetchGeneratedIds}
                    className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-xs font-semibold">Refresh</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Payment ID</th>
                        <th className="px-6 py-4">Booking</th>
                        <th className="px-6 py-4">Traveller / Supplier</th>
                        <th className="px-6 py-4 text-right">Amount</th>
                        <th className="px-6 py-4 text-center">Direction</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4">Added By</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
                      {generatedIds.map((p) => {
                        const isCopied = copiedId === p.paymentId;
                        return (
                          <tr key={p.paymentId} className="hover:bg-slate-850/20 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                  {p.paymentId}
                                </span>
                                <button
                                  onClick={() => handleCopyDetails(p)}
                                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
                                  title="Copy to Clipboard"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link 
                                to={`/booking/${p.bookingId}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-indigo-400 hover:text-indigo-350 font-semibold underline"
                              >
                                {p.bookingId}
                              </Link>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-100">{p.travellerName}</span>
                                <span className="text-xs text-slate-500">
                                  {p.supplierType}: {(p.supplier && typeof p.supplier === 'object' && p.supplier.businessName) || p.supplierName || 'Unknown'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-slate-100">
                              ₹{p.paidAmount ? p.paidAmount.toLocaleString() : '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700 font-semibold">
                                {p.paymentFrom} → {p.paymentTo}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                              <span 
                                className={`px-2.5 py-1 rounded-full border font-bold ${
                                  p.status === 'VERIFIED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : p.status === 'REJECTED'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                              {p.addedBy}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <Link 
                                to={`/booking/${p.bookingId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
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
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-1.5 rounded-lg bg-slate-850 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-1.5 rounded-lg bg-slate-850 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setSelectedScreenshot(null); setZoomLevel(1); }}
                  className="p-1.5 ml-2 rounded-lg bg-rose-500/10 text-rose-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 flex justify-center bg-slate-955 max-h-[70vh] overflow-auto">
              {selectedScreenshot && (selectedScreenshot.endsWith('.pdf') || selectedScreenshot.startsWith('data:application/pdf')) ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                  <FileText className="w-16 h-16 text-indigo-400" />
                  <p className="text-sm text-slate-300 font-sans">PDF Document</p>
                  <a
                    href={selectedScreenshot.startsWith('data:') || selectedScreenshot.startsWith('http') ? selectedScreenshot : `${API_BASE}/${selectedScreenshot}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                  >
                    Open PDF in New Tab
                  </a>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[50vh]">
                  <img
                    src={selectedScreenshot && (selectedScreenshot.startsWith('data:') || selectedScreenshot.startsWith('http')) ? selectedScreenshot : `${API_BASE}/${selectedScreenshot}`}
                    alt="Payment Transaction Receipt"
                    style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out', transformOrigin: 'center center' }}
                    className="max-h-[60vh] object-contain border border-slate-800 rounded-lg shadow-inner"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl p-6 animate-scaleUp text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-450 mb-4 animate-bounce">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Action Successful</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              {successModal.message}
            </p>
            <button
              onClick={() => setSuccessModal({ isOpen: false, message: '' })}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-slate-100 font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Verification Screenshot Upload Modal */}
      {screenshotModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl p-6 animate-scaleUp">
            <h3 className="text-lg font-bold text-slate-100 mb-2">Upload Payment Screenshot</h3>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              This payment request requires a screenshot upload to be verified.
            </p>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setScreenshotModal(prev => ({ ...prev, file: e.target.files[0] }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setScreenshotModal({ isOpen: false, bookingObjectId: null, paymentId: null, isServicePayment: false, serviceId: null, file: null, loading: false })}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadAndVerify}
                  disabled={screenshotModal.loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {screenshotModal.loading ? 'Uploading & Verifying...' : 'Verify Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
