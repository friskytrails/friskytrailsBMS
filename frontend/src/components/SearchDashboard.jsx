import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import {
  Search,
  Filter,
  MapPin,
  Mail,
  Phone,
  Eye,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  CalendarDays,
  X,
  FileText
} from 'lucide-react';

const SearchDashboard = () => {
  const { token, user } = useAuth();

  // Search parameters state
  const [filters, setFilters] = useState({
    bookingId: '',
    paymentId: '',
    travellerName: '',
    travellerPhone: '',
    transactionId: '',
    bookingDate: '',
    startDate: '',
    endDate: '',
    location: '',
  });

  // UI state
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [fetchingScreenshotId, setFetchingScreenshotId] = useState(null);

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

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset handler
  const handleReset = () => {
    setFilters({
      bookingId: '',
      paymentId: '',
      travellerName: '',
      travellerPhone: '',
      transactionId: '',
      bookingDate: '',
      startDate: '',
      endDate: '',
      location: '',
    });
    setBookings([]);
    setSearched(false);
    setError('');
  };

  // Search submit handler
  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    setLoading(true);
    setError('');

    try {
      // Build query string
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const res = await fetch(`${API_BASE}/api/bookings/search?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setBookings(data.data);
        setSearched(true);
      } else {
        setError(data.message || 'Failed to search bookings');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Connection to server failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8">

      {/* Search Filter Panel */}
      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-100">Find Bookings</h2>
          <span className="text-xs text-slate-500">(Fill any filter to search)</span>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Booking ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Booking ID</label>
            <div className="relative">
              <input
                type="text"
                name="bookingId"
                placeholder="FTXXXXXX"
                value={filters.bookingId}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Payment ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payment ID</label>
            <div className="relative">
              <input
                type="text"
                name="paymentId"
                placeholder="123456"
                value={filters.paymentId}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Traveller Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Traveller Name</label>
            <div className="relative">
              <input
                type="text"
                name="travellerName"
                placeholder="Traveller Name (Partial)"
                value={filters.travellerName}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
            <div className="relative">
              <input
                type="text"
                name="travellerPhone"
                placeholder="xxx-xxx-xxxx"
                value={filters.travellerPhone}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Booking Date (createdAt) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Booking Date</label>
            <div className="relative">
              <input
                type="date"
                name="bookingDate"
                value={filters.bookingDate}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Location / Destination */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location / Destination</label>
            <div className="relative">
              <input
                type="text"
                name="location"
                placeholder="Destination name (dropdown or search)"
                value={filters.location}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Transaction ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction ID</label>
            <div className="relative">
              <input
                type="text"
                name="transactionId"
                placeholder="Exact TXN ID"
                value={filters.transactionId}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Service Start Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Start Date</label>
            <div className="relative">
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Service End Date */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service End Date</label>
            <div className="relative">
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleInputChange}
                className="w-full pl-3 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-rose-500 hover:text-rose-455 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center space-x-2 py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-600/10 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Get Data</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error View */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results or Empty States */}
      {!searched && !loading && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center shadow-inner flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-300">Start Your Search</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Enter a Booking ID or Traveller Name to begin searching.
          </p>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Scanning Records database...</p>
        </div>
      )}

      {searched && !loading && bookings.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-100">No Bookings Found</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            We couldn't find any bookings matching your filter parameters. Double check details and try again.
          </p>
        </div>
      )}

      {searched && !loading && bookings.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Booking ID</th>
                  <th className="px-6 py-4">Booking Date</th>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4 text-center">Total Amount</th>
                  <th className="px-6 py-4 text-center">Paid Amount</th>
                  <th className="px-6 py-4 text-center">Due Amount</th>
                  <th className="px-6 py-4">Start Date</th>
                  <th className="px-6 py-4">End Date</th>
                  <th className="px-6 py-4">Trip Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                {bookings.map((booking) => (
                  <tr key={booking._id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/booking/${booking.bookingId}`} className="font-bold text-indigo-600 font-mono hover:text-indigo-500 hover:underline">
                        {booking.bookingId}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                        {formatDate(booking.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-100">
                      {booking.travellerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center font-mono font-bold text-orange-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg shadow-sm">
                        ₹{booking.totalAmount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shadow-sm">
                        ₹{booking.paidAmount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center justify-center font-mono font-bold px-3 py-1.5 rounded-lg border shadow-sm ${
                        booking.dueAmount > 0 
                          ? 'text-rose-500 bg-rose-500/10 border-rose-500/20' 
                          : 'text-slate-400 bg-slate-800/40 border border-slate-700/30'
                      }`}>
                        ₹{booking.dueAmount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-indigo-400 font-mono">
                      {formatDate(booking.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-indigo-400 font-mono">
                      {formatDate(booking.endDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border ${
                        booking.status === 'Booked' || booking.status === 'Confirmed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : booking.status === 'Cancelled'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : booking.status === 'On Hold'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : booking.status === 'Partial Payment'
                          ? 'bg-[rgba(243,156,18,0.1)] text-[#F39C12] border-[rgba(243,156,18,0.2)]'
                          : booking.status === 'Payment Done'
                          ? 'bg-[#00A89E] text-[#00A89E] border-[#00A89E]/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {booking.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Payment Screenshot Verification</h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1 rounded-lg bg-slate-850 text-slate-500 hover:text-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex justify-center bg-slate-955 max-h-[70vh] overflow-y-auto">
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
                <img
                  src={selectedScreenshot && (selectedScreenshot.startsWith('data:') || selectedScreenshot.startsWith('http')) ? selectedScreenshot : `${API_BASE}/${selectedScreenshot}`}
                  alt="Payment Transaction Receipt"
                  className="max-h-[50vh] object-contain border border-slate-800 rounded-lg shadow-inner"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchDashboard;
