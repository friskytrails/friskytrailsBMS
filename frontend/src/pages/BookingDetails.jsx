import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
  FileText,
  ArrowLeft,
  AlertCircle,
  FileImage,
  ShieldCheck,
  UserPlus,
  X,
  Edit
} from 'lucide-react';
import { API_BASE } from '../config';
import CommentSection from '../components/CommentSection';

const BookingDetails = () => {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Payment Update state
  const [isUpdatePaymentOpen, setIsUpdatePaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTxnId, setPaymentTxnId] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Admin Assignment state
  const [employees, setEmployees] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setBooking(data.data);
        } else {
          setError(data.message || 'Booking not found');
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError('Server connection failed');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, token]);

  // Fetch verified employees list for Admin assignment dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      if (user?.role !== 'admin') return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          // Filter only verified employees
          const verifiedEmps = data.data.filter(
            (u) => u.role === 'employee' && u.isVerified
          );
          setEmployees(verifiedEmps);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };

    fetchEmployees();
  }, [user, token]);

  // Add employee to assignedTo
  const handleAddEmployee = async (e) => {
    const empId = e.target.value;
    if (!empId) return;

    setAssigning(true);
    try {
      const currentIds = booking.assignedTo?.map((u) => u._id || u) || [];
      if (currentIds.includes(empId)) return;

      const updatedIds = [...currentIds, empId];

      const res = await fetch(`${API_BASE}/api/bookings/assign/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeIds: updatedIds }),
      });
      const data = await res.json();

      if (data.success) {
        setBooking((prev) => ({
          ...prev,
          assignedTo: data.data.assignedTo,
        }));
      } else {
        alert(data.message || 'Failed to assign employee');
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign employee');
    } finally {
      setAssigning(false);
      // Reset select element index
      e.target.value = '';
    }
  };

  // Remove employee from assignedTo
  const handleRemoveEmployee = async (empId) => {
    setAssigning(true);
    try {
      const currentIds = booking.assignedTo?.map((u) => u._id || u) || [];
      const updatedIds = currentIds.filter(
        (id) => id.toString() !== empId.toString()
      );

      const res = await fetch(`${API_BASE}/api/bookings/assign/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeIds: updatedIds }),
      });
      const data = await res.json();

      if (data.success) {
        setBooking((prev) => ({
          ...prev,
          assignedTo: data.data.assignedTo,
        }));
      } else {
        alert(data.message || 'Failed to unassign employee');
      }
    } catch (err) {
      console.error('Unassign error:', err);
      alert('Failed to unassign employee');
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === booking.status) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status due to network error.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePaymentUpdateSubmit = async (e) => {
    e.preventDefault();
    setPaymentError('');

    if (!paymentAmount) {
      setPaymentError('Payment amount is required');
      return;
    }

    const amtNum = Number(paymentAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setPaymentError('Payment amount must be a positive number');
      return;
    }

    if (amtNum > booking.dueAmount) {
      setPaymentError(`Payment amount cannot exceed the remaining due amount of ₹${booking.dueAmount}`);
      return;
    }

    if (!paymentTxnId.trim()) {
      setPaymentError('Transaction ID is required');
      return;
    }

    setUpdatingPayment(true);

    try {
      const formData = new FormData();
      formData.append('amount', paymentAmount);
      formData.append('transactionId', paymentTxnId.trim());
      if (paymentScreenshot) {
        formData.append('screenshot', paymentScreenshot);
      }

      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/update-payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      setUpdatingPayment(false);

      if (data.success) {
        setBooking(data.data);
        setIsUpdatePaymentOpen(false);
        setPaymentAmount('');
        setPaymentTxnId('');
        setPaymentScreenshot(null);
      } else {
        setPaymentError(data.message || 'Failed to update payment');
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      setPaymentError('Connection error');
      setUpdatingPayment(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Loading Booking Details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Error Loading Details</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'Booking record could not be loaded.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Filter unassigned employees for dropdown selection list
  const assignedIds = booking.assignedTo?.map((u) => (u._id || u).toString()) || [];
  const unassignedEmployees = employees.filter(
    (emp) => !assignedIds.includes(emp._id.toString())
  );

  // Authorization checks
  const isCreator = booking?.createdBy && (booking.createdBy._id || booking.createdBy) === user?.id;
  const isAssigned = booking?.assignedTo && booking.assignedTo.some(emp => (emp._id || emp) === user?.id);
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || isCreator || isAssigned;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto animate-fadeIn font-sans">
        
        {/* Header & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-855 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
                  Record File
                </span>
                <span className="text-xs text-slate-500 font-mono">ID: {booking._id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <h1 className="text-3xl font-extrabold text-slate-100">
                  Booking Reference <span className="font-mono text-indigo-650">{booking.bookingId}</span>
                </h1>
                
                {/* Booking Status Badge / Interactive Dropdown */}
                {canEdit ? (
                  <div className="relative flex items-center">
                    <select
                      value={booking.status || 'Pending'}
                      onChange={handleStatusChange}
                      disabled={updatingStatus}
                      className={`text-xs font-extrabold px-3 py-1.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A89E]/50 bg-slate-955 transition-all ${
                        booking.status === 'Booked' || booking.status === 'Confirmed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 focus:border-emerald-500'
                          : booking.status === 'Cancelled'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 focus:border-rose-500'
                          : booking.status === 'On Hold'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 focus:border-blue-500'
                          : booking.status === 'Partial Payment'
                          ? 'bg-[rgba(243,156,18,0.1)] text-[#F39C12] border-[rgba(243,156,18,0.2)] focus:border-[#F39C12]'
                          : booking.status === 'Payment Done'
                          ? 'bg-[#00A89E] text-white border-[#00A89E] focus:border-[#00A89E]'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20 focus:border-amber-500'
                      }`}
                    >
                      <option value="Pending" className="bg-slate-900 text-amber-400">Pending</option>
                      <option value="Booked" className="bg-slate-900 text-emerald-400">Booked</option>
                      <option value="Confirmed" className="bg-slate-900 text-emerald-400">Confirmed</option>
                      <option value="Partial Payment" className="bg-slate-900 text-[#F39C12]">Partial Payment</option>
                      <option value="Payment Done" className="bg-slate-900 text-[#00A89E]">Payment Done</option>
                      <option value="Cancelled" className="bg-slate-900 text-rose-400">Cancelled</option>
                      <option value="On Hold" className="bg-slate-900 text-blue-400">On Hold</option>
                    </select>
                    {updatingStatus && (
                      <span className="ml-2 w-3.5 h-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                    )}
                  </div>
                ) : (
                  <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                    booking.status === 'Booked' || booking.status === 'Confirmed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : booking.status === 'Cancelled'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : booking.status === 'On Hold'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : booking.status === 'Partial Payment'
                      ? 'bg-[rgba(243,156,18,0.1)] text-[#F39C12] border-[rgba(243,156,18,0.2)]'
                      : booking.status === 'Payment Done'
                      ? 'bg-[#00A89E] text-white border-[#00A89E]'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {booking.status || 'Pending'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/booking/${booking.bookingId}/edit`)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-colors border border-indigo-500/35"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
            {canEdit && booking.dueAmount > 0 && (
              <button
                onClick={() => setIsUpdatePaymentOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase bg-[#00A89E] hover:bg-[#008f86] text-white cursor-pointer transition-colors border border-[#00A89E]/35"
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>Update Payment</span>
              </button>
            )}
            {booking.dueAmount === 0 ? (
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Fully Paid
              </span>
            ) : booking.paidAmount > 0 ? (
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Partial Payment
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold uppercase bg-rose-500/10 border border-rose-500/20 text-rose-400">
                Unpaid
              </span>
            )}
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Details Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Traveller Details Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>Traveller Details</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Full Name</p>
                  <p className="text-sm font-semibold text-slate-100">{booking.travellerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Email Address</p>
                  <p className="text-sm font-medium text-slate-100 flex items-center gap-1.5 mt-0.5 font-mono text-xs">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{booking.travellerEmail}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Phone Number</p>
                  <p className="text-sm font-medium text-slate-100 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{booking.travellerPhone}</span>
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 mt-6 border-t border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Adults</p>
                    <p className="text-sm font-bold text-slate-100">{booking.adults || 0} Adults</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Children</p>
                    <p className="text-sm font-bold text-slate-100">{booking.children || 0} Children</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Details Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                <span>Trip & Package Info</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Package Selected</p>
                  <p className="text-sm font-semibold text-slate-100 flex items-center gap-1.5 mt-0.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>{booking.packageName}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Destination Location</p>
                  <p className="text-sm font-medium text-slate-100 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{booking.location}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Departure Date</p>
                  <p className="text-sm font-medium text-indigo-650 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-slate-550" />
                    <span>{formatDate(booking.startDate)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Return Date</p>
                  <p className="text-sm font-medium text-indigo-650 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-slate-550" />
                    <span>{formatDate(booking.endDate)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Billing Card */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <IndianRupee className="w-5 h-5 text-indigo-600" />
                <span>Financial Ledger</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Total Package Value</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">₹{booking.totalAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Paid Confirmed</p>
                  <p className="text-xl font-bold text-emerald-605 mt-1">₹{booking.paidAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Outstanding Balance</p>
                  <p className={`text-xl font-bold mt-1 ${booking.dueAmount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    ₹{booking.dueAmount?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Payment ID</p>
                  <p className="text-sm font-bold text-indigo-650 font-mono mt-1">{booking.paymentId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Payment Reference TXN</p>
                  <p className="text-sm font-bold text-indigo-650 font-mono mt-1">{booking.transactionId}</p>
                </div>
                {booking.createdBy && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Registered Agent</p>
                    <p className="text-sm font-semibold text-slate-100 mt-1">
                      {booking.createdBy.name} <span className="text-xs text-slate-500 font-normal font-sans">({booking.createdBy.email})</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Screenshot & Admin Allocation */}
          <div className="space-y-6">
            
            {/* Admin Assignment Widget */}
            {user?.role === 'admin' && (
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg space-y-4">
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <span>Assign Employees</span>
                </h2>
                
                {/* Loading state indicator */}
                {assigning && (
                  <div className="flex items-center space-x-2 text-xs text-indigo-600 font-semibold bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-2.5">
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Assignment...</span>
                  </div>
                )}

                {/* Assigned Employees List */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Team Members</label>
                  {!booking.assignedTo || booking.assignedTo.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-950 border border-slate-800 p-3 rounded-xl">
                      No employees assigned to see/manage this booking.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-955 border border-slate-800 rounded-xl max-h-[150px] overflow-y-auto">
                      {booking.assignedTo.map((emp) => (
                        <div
                          key={emp._id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold"
                        >
                          <span>{emp.name}</span>
                          <button
                            onClick={() => handleRemoveEmployee(emp._id)}
                            disabled={assigning}
                            className="p-0.5 rounded-full hover:bg-indigo-550/20 hover:text-indigo-300 transition-colors cursor-pointer"
                            title="Remove assignment"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Select dropdown list */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Add Team Member</label>
                  <select
                    onChange={handleAddEmployee}
                    disabled={assigning || unassignedEmployees.length === 0}
                    defaultValue=""
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-350 focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>
                      {unassignedEmployees.length === 0
                        ? 'All verified employees assigned'
                        : 'Select employee to assign...'}
                    </option>
                    {unassignedEmployees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Verification Screenshot Mini-Widget */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <FileImage className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-sans">Verification File</h3>
                  <p className="text-xs text-slate-500">Secure receipt upload</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScreenshot(booking.screenshot)}
                className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer font-sans"
              >
                View Screenshot
              </button>
            </div>

            {/* Comment Timeline Section */}
            <CommentSection
              booking={booking}
              token={token}
              onCommentAdded={(updatedBooking) => setBooking(updatedBooking)}
            />

          </div>

        </div>

      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 font-sans">Verification Screenshot</h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-slate-950 flex justify-center items-center overflow-auto max-h-[70vh]">
              <img
                src={selectedScreenshot.startsWith('data:') ? selectedScreenshot : `${API_BASE}/${selectedScreenshot}`}
                alt="Verification Receipt"
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 font-sans">
              Uploaded at booking time. Keep for audit clearance record.
            </div>
          </div>
        </div>
      )}

      {/* Update Payment Modal */}
      {isUpdatePaymentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-955/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-scaleUp">
            <button
              onClick={() => {
                setIsUpdatePaymentOpen(false);
                setPaymentError('');
                setPaymentAmount('');
                setPaymentTxnId('');
                setPaymentScreenshot(null);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-[#00A89E]" />
              <span>Update Payment</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Apply a new payment towards this booking. Status will automatically update to Partial Payment or Payment Done.
            </p>

            {paymentError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Current Due
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-300 text-sm font-semibold">
                  ₹{booking.dueAmount}
                </div>
              </div>

              <div>
                <label htmlFor="paymentAmount" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  New Amount Paid (₹) *
                </label>
                <input
                  id="paymentAmount"
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 text-sm focus:outline-none transition-colors"
                />
                {Number(paymentAmount) > 0 && (
                  <p className="mt-1.5 text-xs text-indigo-400 font-medium">
                    Remaining Balance after this update: ₹{Math.max(0, booking.dueAmount - Number(paymentAmount))}
                  </p>
                )}
                {Number(paymentAmount) > booking.dueAmount && (
                  <p className="mt-1 text-xs text-rose-500 font-bold">
                    Warning: Amount exceeds remaining due amount!
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="paymentTxnId" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  New Transaction ID *
                </label>
                <input
                  id="paymentTxnId"
                  type="text"
                  required
                  placeholder="e.g. TXN98765432"
                  value={paymentTxnId}
                  onChange={(e) => setPaymentTxnId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-3.5 py-2 text-slate-100 placeholder-slate-600 text-sm focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Payment Receipt Screenshot (Optional)
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => setPaymentScreenshot(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#00A89E]/10 file:text-[#00A89E] hover:file:bg-[#00A89E]/20 file:cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUpdatePaymentOpen(false);
                    setPaymentError('');
                    setPaymentAmount('');
                    setPaymentTxnId('');
                    setPaymentScreenshot(null);
                  }}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-100 rounded-xl text-xs font-bold uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPayment || !paymentAmount || !paymentTxnId || Number(paymentAmount) <= 0 || Number(paymentAmount) > booking.dueAmount}
                  className="px-4 py-2 bg-[#00A89E] hover:bg-[#008f86] text-white disabled:opacity-55 disabled:cursor-not-allowed rounded-xl text-xs font-bold uppercase transition-colors flex items-center gap-1.5"
                >
                  {updatingPayment ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>Update</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default BookingDetails;
