import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  User,
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
  X
} from 'lucide-react';
import { API_BASE } from '../config';

const BookingDetails = () => {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin Assignment state
  const [employees, setEmployees] = useState([]);
  const [assigning, setAssigning] = useState(false);

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
                
                {/* Booking Status Badge */}
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border capitalize ${
                  booking.status === 'confirmed'
                    ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/20'
                    : booking.status === 'rejected'
                    ? 'bg-rose-500/10 text-rose-455 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {booking.status || 'pending'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Payment Reference TXN</p>
                  <p className="text-sm font-bold text-indigo-650 font-mono mt-1">{booking.transactionId}</p>
                </div>
                {booking.createdBy && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Registered Agent</p>
                    <p className="text-sm font-semibold text-slate-100 mt-1">
                      {booking.createdBy.name} <span className="text-xs text-slate-505 font-normal">({booking.createdBy.email})</span>
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

            {/* Verification Screenshot Receipt */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <FileImage className="w-5 h-5 text-indigo-600" />
                <span>Verification File</span>
              </h2>
              
              <div className="flex-grow flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden relative min-h-[300px]">
                <img
                  src={`${API_BASE}/${booking.screenshot}`}
                  alt="Transaction verification screenshot"
                  className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-inner"
                />
              </div>

              <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start space-x-2 text-xs">
                <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <p className="text-slate-500 leading-normal">
                  This transaction screenshot was securely uploaded at submission time and populates the audit ledger for financial clearance review.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BookingDetails;
