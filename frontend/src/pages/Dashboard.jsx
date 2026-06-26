import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileSpreadsheet, Calendar, IndianRupee, Eye, AlertCircle, Plus, Mail, Phone, MapPin, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Fetch bookings from backend
  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
      } else {
        setError(data.message || 'Failed to load bookings');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  // Aggregate stats
  const totalBookings = bookings.length;
  const totalAmount = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalPaid = bookings.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
  const totalDue = bookings.reduce((sum, b) => sum + (b.dueAmount || 0), 0);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Fetching Bookings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {user?.role === 'admin' ? 'All System Bookings' : 'My Bookings Dashboard'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {user?.role === 'admin' 
                ? 'Overview of all employee bookings registered in the system' 
                : 'Monitor your sales, traveler registers, and payment files'
              }
            </p>
          </div>
          {(user?.role === 'employee' || user?.role === 'admin') && (
            <Link
              to="/create-booking"
              className="mt-4 md:mt-0 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create Booking</span>
            </Link>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</p>
              <p className="text-2xl font-bold text-white mt-1">{totalBookings}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Amount</p>
              <p className="text-2xl font-bold text-white mt-1">₹{totalAmount.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Paid</p>
              <p className="text-2xl font-bold text-white mt-1">₹{totalPaid.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl flex items-center space-x-4">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Due</p>
              <p className="text-2xl font-bold text-white mt-1">₹{totalDue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white">No Bookings Found</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              {user?.role === 'admin' 
                ? 'No employees have registered any bookings in the database yet.' 
                : 'Get started by creating your very first traveler booking records.'
              }
            </p>
            {(user?.role === 'employee' || user?.role === 'admin') && (
              <Link
                to="/create-booking"
                className="inline-flex mt-4 items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Booking</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Booking ID</th>
                    <th className="px-6 py-4">Traveller Details</th>
                    <th className="px-6 py-4">Trip Details</th>
                    <th className="px-6 py-4">Financials</th>
                    <th className="px-6 py-4">Verification Info</th>
                    {user?.role === 'admin' && <th className="px-6 py-4">Agent</th>}
                    <th className="px-6 py-4 text-center">Screenshot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                  {bookings.map((booking) => (
                    <tr key={booking._id} className="hover:bg-slate-900/25 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link to={`/booking/${booking.bookingId}`} className="font-bold text-indigo-400 font-mono hover:text-indigo-300 hover:underline">
                          {booking.bookingId}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-semibold text-white">{booking.travellerName}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-500" /> {booking.travellerEmail}
                          </span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" /> {booking.travellerPhone}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-medium text-slate-200 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {booking.packageName}
                          </span>
                          <span className="text-xs text-slate-400">{booking.location}</span>
                          <span className="text-xs text-indigo-300 font-mono">
                            {formatDate(booking.startDate)} - {formatDate(booking.endDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col text-xs font-mono">
                          <span className="text-slate-350">Total: <strong className="text-slate-200">₹{booking.totalAmount}</strong></span>
                          <span className="text-emerald-400">Paid: <strong>₹{booking.paidAmount}</strong></span>
                          <span className={`${booking.dueAmount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            Due: <strong>₹{booking.dueAmount}</strong>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/50 w-max">
                            TXN: {booking.transactionId}
                          </span>
                          {booking.dueAmount === 0 ? (
                            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-max">
                              Fully Paid
                            </span>
                          ) : booking.paidAmount > 0 ? (
                            <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-max">
                              Partial Pay
                            </span>
                          ) : (
                            <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full w-max">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold">{booking.createdBy?.name || 'Deleted'}</span>
                            <span className="text-slate-500">{booking.createdBy?.email}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelectedScreenshot(booking.screenshot)}
                          className="inline-flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50 text-xs font-semibold transition-all duration-200"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Image Modal for Screenshot Viewing */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-white">Payment Screenshot Verification</h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex justify-center bg-slate-950/40 max-h-[70vh] overflow-y-auto">
              <img
                src={`/${selectedScreenshot}`}
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

export default Dashboard;
