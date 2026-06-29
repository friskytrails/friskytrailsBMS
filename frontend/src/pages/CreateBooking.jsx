import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, User, Mail, Phone, MapPin, IndianRupee, Upload, AlertCircle, FileImage } from 'lucide-react';
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

  // Validation touch tracker to prevent premature warning borders
  const [touched, setTouched] = useState({
    travellerName: false,
    travellerEmail: false,
    travellerPhone: false,
    startDate: false,
    endDate: false,
    packageName: false,
    location: false,
    totalAmount: false,
    paidAmount: false,
    transactionId: false,
    screenshot: false,
  });

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

  // Validation function
  const validateForm = (data, file) => {
    const tempErrors = {};
    
    // Name validation
    if (!data.travellerName || !data.travellerName.trim()) {
      tempErrors.travellerName = 'Name is required';
    }
    
    // Email validation
    if (!data.travellerEmail || !data.travellerEmail.trim()) {
      tempErrors.travellerEmail = 'Email is required';
    } else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(data.travellerEmail)) {
      tempErrors.travellerEmail = 'Provide a valid email address';
    }
    
    // Phone validation
    if (!data.travellerPhone) {
      tempErrors.travellerPhone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(data.travellerPhone)) {
      tempErrors.travellerPhone = 'Must be exactly 10 digits starting with 6, 7, 8 or 9';
    }
    
    // Start Date validation
    if (!data.startDate) {
      tempErrors.startDate = 'Start date is required';
    }
    
    // End Date validation
    if (!data.endDate) {
      tempErrors.endDate = 'End date is required';
    } else if (data.startDate && new Date(data.endDate) < new Date(data.startDate)) {
      tempErrors.endDate = 'End date cannot be before start date';
    }
    
    // Package validation
    if (!data.packageName || !data.packageName.trim()) {
      tempErrors.packageName = 'Package name is required';
    }
    
    // Location validation
    if (!data.location || !data.location.trim()) {
      tempErrors.location = 'Location is required';
    }
    
    // Total Amount validation
    if (data.totalAmount === '' || data.totalAmount === null) {
      tempErrors.totalAmount = 'Total amount is required';
    } else if (parseFloat(data.totalAmount) < 0) {
      tempErrors.totalAmount = 'Total amount cannot be negative';
    }
    
    // Paid Amount validation
    if (data.paidAmount === '' || data.paidAmount === null) {
      tempErrors.paidAmount = 'Paid amount is required';
    } else if (parseFloat(data.paidAmount) < 0) {
      tempErrors.paidAmount = 'Paid amount cannot be negative';
    } else if (parseFloat(data.paidAmount) > parseFloat(data.totalAmount || 0)) {
      tempErrors.paidAmount = 'Paid amount cannot exceed total amount';
    }
    
    // Transaction ID validation
    if (!data.transactionId || !data.transactionId.trim()) {
      tempErrors.transactionId = 'Transaction ID is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(data.transactionId.trim())) {
      tempErrors.transactionId = 'Must be alphanumeric';
    }
    
    // Screenshot validation
    if (!file) {
      tempErrors.screenshot = 'Screenshot is required';
    }
    
    return tempErrors;
  };

  const validationErrors = validateForm(formData, screenshot);
  const isValid = Object.keys(validationErrors).length === 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'travellerPhone') {
      // Limit to exactly 10 digits starting with 6-9
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: cleaned,
      }));
      setTouched((prev) => ({ ...prev, [name]: true }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (error) setError('');
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      setScreenshotName(file.name);
      setTouched((prev) => ({ ...prev, screenshot: true }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Force validation of all fields upon submission
    const allTouched = Object.keys(touched).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (!isValid) {
      setError('Please resolve all validation errors before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
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
      data.append('screenshot', screenshot);

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  // Get dynamic borders based on error/success/focus state
  const getInputClass = (fieldName, hasIcon = true) => {
    const base = `bg-slate-950/60 block w-full ${hasIcon ? 'pl-10' : 'px-3'} pr-3 py-2 border rounded-xl text-slate-200 focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200`;
    const isError = touched[fieldName] && validationErrors[fieldName];
    if (isError) {
      return `${base} border-rose-500/80 focus:ring-rose-500/50 focus:border-rose-500`;
    }
    // Success/Focus border matches Frisky Teal (#00A89E)
    return `${base} border-slate-800 focus:ring-[#00A89E]/50 focus:border-[#00A89E]`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto font-sans">
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
              <User className="w-5 h-5 text-[#00A89E]" />
              <span>Traveller Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Full Name */}
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
                    onBlur={() => handleBlur('travellerName')}
                    className={getInputClass('travellerName')}
                    placeholder="Jane Doe"
                  />
                </div>
                {touched.travellerName && validationErrors.travellerName && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.travellerName}</span>
                  </p>
                )}
              </div>

              {/* Email ID */}
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
                    onBlur={() => handleBlur('travellerEmail')}
                    className={getInputClass('travellerEmail')}
                    placeholder="jane@example.com"
                  />
                </div>
                {touched.travellerEmail && validationErrors.travellerEmail && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.travellerEmail}</span>
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phone Number <span className="text-rose-455">*</span>
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
                    onBlur={() => handleBlur('travellerPhone')}
                    className={getInputClass('travellerPhone')}
                    placeholder="9876543210"
                  />
                </div>
                {touched.travellerPhone && validationErrors.travellerPhone && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.travellerPhone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Trip Details Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <MapPin className="w-5 h-5 text-[#00A89E]" />
              <span>Trip & Package Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Package Name */}
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
                    onBlur={() => handleBlur('packageName')}
                    className={getInputClass('packageName')}
                    placeholder="Classic Bali Adventure"
                  />
                </div>
                {touched.packageName && validationErrors.packageName && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.packageName}</span>
                  </p>
                )}
              </div>

              {/* Destination Location */}
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
                    onBlur={() => handleBlur('location')}
                    className={getInputClass('location')}
                    placeholder="Ubud, Bali, Indonesia"
                  />
                </div>
                {touched.location && validationErrors.location && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.location}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date */}
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
                    onBlur={() => handleBlur('startDate')}
                    className={getInputClass('startDate')}
                  />
                </div>
                {touched.startDate && validationErrors.startDate && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.startDate}</span>
                  </p>
                )}
              </div>

              {/* End Date */}
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
                    min={formData.startDate}
                    value={formData.endDate}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('endDate')}
                    className={getInputClass('endDate')}
                  />
                </div>
                {touched.endDate && validationErrors.endDate && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.endDate}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Financials & Transaction Verification Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <IndianRupee className="w-5 h-5 text-[#00A89E]" />
              <span>Billing & Transaction Verification</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Total Amount */}
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
                    onBlur={() => handleBlur('totalAmount')}
                    className={getInputClass('totalAmount')}
                    placeholder="12000"
                  />
                </div>
                {touched.totalAmount && validationErrors.totalAmount && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.totalAmount}</span>
                  </p>
                )}
              </div>

              {/* Paid Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Paid Amount (₹) <span className="text-rose-450">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <input
                    type="number"
                    name="paidAmount"
                    min="0"
                    required
                    value={formData.paidAmount}
                    onChange={handleInputChange}
                    onBlur={() => handleBlur('paidAmount')}
                    className={getInputClass('paidAmount')}
                    placeholder="4000"
                  />
                </div>
                {touched.paidAmount && validationErrors.paidAmount && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.paidAmount}</span>
                  </p>
                )}
              </div>

              {/* Due Amount (Read-only) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Due Amount (₹) <span className="text-slate-500">(Read-Only)</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IndianRupee className="h-4.5 w-4.5 text-slate-600" />
                  </div>
                  <input
                    type="number"
                    name="dueAmount"
                    readOnly
                    value={formData.dueAmount}
                    className="bg-slate-950/30 block w-full pl-10 pr-3 py-2 border border-slate-800/80 rounded-xl text-[#00A89E] font-bold sm:text-sm font-mono cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transaction ID */}
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
                  onBlur={() => handleBlur('transactionId')}
                  className={getInputClass('transactionId', false)}
                  placeholder="TXN874291857"
                />
                {touched.transactionId && validationErrors.transactionId && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.transactionId}</span>
                  </p>
                )}
              </div>

              {/* Screenshot File Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Screenshot PNG/JPG <span className="text-rose-450">*</span>
                </label>
                <div className={`relative border-2 border-dashed rounded-xl p-2.5 flex items-center justify-between transition-colors bg-slate-950/20 ${
                  touched.screenshot && validationErrors.screenshot
                    ? 'border-rose-500/80'
                    : 'border-slate-800 hover:border-[#00A89E]/50'
                }`}>
                  <div className="flex items-center space-x-2">
                    <FileImage className="w-5 h-5 text-slate-500" />
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
                {touched.screenshot && validationErrors.screenshot && (
                  <p className="mt-1 text-[11px] text-rose-455 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{validationErrors.screenshot}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="py-2.5 px-5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-500 bg-slate-900 hover:bg-slate-850 hover:text-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-white font-semibold text-sm transition-all duration-200 ${
                isValid && !isSubmitting
                  ? 'bg-[#00A89E] hover:bg-[#008f86] shadow-lg shadow-teal-600/10 cursor-pointer'
                  : 'bg-slate-800/80 text-slate-500 cursor-not-allowed opacity-50'
              }`}
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
