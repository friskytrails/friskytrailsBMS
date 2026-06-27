import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, User, Mail, Phone, MapPin, IndianRupee, Upload, AlertCircle, CheckCircle, FileImage } from 'lucide-react';
import { API_BASE } from '../config';

const CreateBooking = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    travellerName: '',
    travellerEmail: '',
    travellerPhone: '',
    startDate: '',
    endDate: '',
    packageName: '',
    location: '',
    totalAmount: '',
    paidAmount: '',
    dueAmount: 0,
    transactionId: '',
  });

  const [screenshot, setScreenshot] = useState(null);
  const [screenshotName, setScreenshotName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate Due Amount whenever Total or Paid changes
  useEffect(() => {
    const total = parseFloat(formData.totalAmount) || 0;
    const paid = parseFloat(formData.paidAmount) || 0;
    const due = Math.max(0, total - paid);
    
    setFormData((prev) => ({
      ...prev,
      dueAmount: due,
    }));
  }, [formData.totalAmount, formData.paidAmount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setScreenshotName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (
      !formData.travellerName ||
      !formData.travellerEmail ||
      !formData.travellerPhone ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.packageName ||
      !formData.location ||
      !formData.totalAmount ||
      !formData.transactionId
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (!screenshot) {
      setError('Please upload a transaction screenshot image');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build FormData for multipart/form-data upload
      const data = new FormData();
      data.append('travellerName', formData.travellerName);
      data.append('travellerEmail', formData.travellerEmail);
      data.append('travellerPhone', formData.travellerPhone);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);
      data.append('packageName', formData.packageName);
      data.append('location', formData.location);
      data.append('totalAmount', formData.totalAmount);
      data.append('paidAmount', formData.paidAmount || '0');
      data.append('transactionId', formData.transactionId);
      data.append('screenshot', screenshot); // File attachment

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Let the browser set Content-Type header with multipart boundary
        },
        body: data,
      });

      const responseData = await res.json();
      setIsSubmitting(false);

      if (responseData.success) {
        navigate('/dashboard');
      } else {
        setError(responseData.message || 'Failed to create booking');
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Server connection failed');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-100">Create New Booking</h1>
          <p className="text-sm text-slate-500 mt-1">
            Register a travel packages client, capture transaction keys, and record payment screenshots.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Traveller Information Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <User className="w-5 h-5 text-indigo-600" />
              <span>Traveller Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="travellerName"
                    required
                    value={formData.travellerName}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email ID <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    name="travellerEmail"
                    required
                    value={formData.travellerEmail}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="tel"
                    name="travellerPhone"
                    required
                    value={formData.travellerPhone}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <span>Trip & Package Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Package Name <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="packageName"
                    required
                    value={formData.packageName}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Classic Bali Adventure"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Destination Location <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-202 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Ubud, Bali, Indonesia"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Start Date <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="date"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  End Date <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="date"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Financials & Transaction verification Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <IndianRupee className="w-5 h-5 text-indigo-600" />
              <span>Billing & Transaction Verification</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Total Amount (₹) <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="number"
                    name="totalAmount"
                    min="0"
                    required
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm font-mono"
                    placeholder="12000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Paid Amount (₹)
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="number"
                    name="paidAmount"
                    min="0"
                    value={formData.paidAmount}
                    onChange={handleInputChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-slate-202 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm font-mono"
                    placeholder="4000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Due Amount (₹) <span className="text-slate-500">(Auto)</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="number"
                    name="dueAmount"
                    disabled
                    value={formData.dueAmount}
                    className="bg-slate-950/40 block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl text-indigo-400 font-bold sm:text-sm font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Transaction ID <span className="text-rose-450">*</span>
                </label>
                <input
                  type="text"
                  name="transactionId"
                  required
                  value={formData.transactionId}
                  onChange={handleInputChange}
                  className="bg-slate-950/60 block w-full px-3 py-2 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                  placeholder="TXN-874291857"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Screenshot PNG/JPG <span className="text-rose-450">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 flex items-center justify-between transition-colors bg-slate-950/20">
                  <div className="flex items-center space-x-2">
                    <FileImage className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs text-slate-450 truncate max-w-[200px]">
                      {screenshotName || 'No file selected'}
                    </span>
                  </div>
                  <label className="cursor-pointer py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="py-2.5 px-5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-500 bg-slate-900 hover:bg-slate-850 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/15 disabled:opacity-50 transition-all duration-200"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Submit Booking</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateBooking;
