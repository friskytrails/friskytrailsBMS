import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, User, Mail, Phone, MapPin, IndianRupee, FileText, ArrowLeft, AlertCircle, FileImage, ShieldCheck } from 'lucide-react';

const BookingDetails = () => {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
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
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Details</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'Booking record could not be loaded.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto animate-fadeIn">
        
        {/* Header & Back Action */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2.5 py-0.5 rounded-full">
                  Record File
                </span>
                <span className="text-xs text-slate-500 font-mono">ID: {booking._id}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white mt-1">
                Booking Reference <span className="font-mono text-indigo-500">{booking.bookingId}</span>
              </h1>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0">
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
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <User className="w-5 h-5 text-indigo-400" />
                <span>Traveller Details</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Full Name</p>
                  <p className="text-sm font-semibold text-white">{booking.travellerName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Email Address</p>
                  <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <span>{booking.travellerEmail}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Phone Number</p>
                  <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-4 h-4 text-slate-500" />
                    <span>{booking.travellerPhone}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Trip Details Card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <MapPin className="w-5 h-5 text-indigo-400" />
                <span>Trip & Package Info</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Package Selected</p>
                  <p className="text-sm font-semibold text-white flex items-center gap-1.5 mt-0.5">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>{booking.packageName}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Destination Location</p>
                  <p className="text-sm font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>{booking.location}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-850">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Departure Date</p>
                  <p className="text-sm font-medium text-indigo-300 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>{formatDate(booking.startDate)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Return Date</p>
                  <p className="text-sm font-medium text-indigo-300 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>{formatDate(booking.endDate)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Billing Card */}
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <IndianRupee className="w-5 h-5 text-indigo-400" />
                <span>Financial Ledger</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Total Package Value</p>
                  <p className="text-xl font-bold text-white mt-1">₹{booking.totalAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Paid Confirmed</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">₹{booking.paidAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Outstanding Balance</p>
                  <p className={`text-xl font-bold mt-1 ${booking.dueAmount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    ₹{booking.dueAmount?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-850">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Payment Reference TXN</p>
                  <p className="text-sm font-bold text-indigo-300 font-mono mt-1">{booking.transactionId}</p>
                </div>
                {booking.createdBy && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">Registered Agent</p>
                    <p className="text-sm font-semibold text-slate-200 mt-1">
                      {booking.createdBy.name} <span className="text-xs text-slate-500 font-normal">({booking.createdBy.email})</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Screenshot Column */}
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex flex-col h-full">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                <FileImage className="w-5 h-5 text-indigo-400" />
                <span>Verification File</span>
              </h2>
              
              <div className="flex-grow flex items-center justify-center bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 overflow-hidden relative min-h-[300px]">
                <img
                  src={`/${booking.screenshot}`}
                  alt="Transaction verification screenshot"
                  className="max-w-full max-h-[45vh] object-contain rounded-lg shadow-inner"
                />
              </div>

              <div className="mt-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start space-x-2 text-xs">
                <ShieldCheck className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <p className="text-slate-400 leading-normal">
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
