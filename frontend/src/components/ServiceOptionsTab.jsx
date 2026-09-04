import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { API_BASE } from '../config';
import {
  Plus, Check, X, Search, ChevronDown, ChevronUp, FileText, CheckCircle, Clock, Trash2, Edit, CreditCard, Send, DollarSign, Eye, Copy
} from 'lucide-react';

const getSupplierDisplayName = (service) => {
  if (service?.supplier && typeof service.supplier === 'object') {
    return service.supplier.businessName || service.supplier.fullName || service.supplierName || service.outsourceName || 'Unknown Supplier';
  }
  return service?.supplierName || service?.outsourceName || 'Unknown Supplier';
};

const ServiceOptionsTab = ({ booking, token, onServiceUpdated, user }) => {
  const [services, setServices] = useState(booking.services || []);
  const [isAdding, setIsAdding] = useState(false);
  
  // Step 1: Supplier Type
  const [supplierType, setSupplierType] = useState('');
  
  // Step 2: Form Data
  const [formData, setFormData] = useState({
    b2bCost: '',
    collectionBySupplier: '',
    mealPlan: '',
    roomType: '',
    numberOfRooms: '',
    adults: '',
    children: '',
    startDate: '',
    endDate: '',
    transportType: '',
    productName: '',
    packageName: '',
    outsourceName: ''
  });

  // Step 3: Supplier Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Manage UI state for expanded items
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [paymentModals, setPaymentModals] = useState({});

  // Edit service state
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Generate Payment ID state
  const [generatePayIdModals, setGeneratePayIdModals] = useState({});
  const [generatePayIdData, setGeneratePayIdData] = useState({ amount: '', details: '', paymentFrom: 'Company', paymentTo: 'Supplier' });
  const [generatePayIdLoading, setGeneratePayIdLoading] = useState(false);
  const [generatedPaymentIds, setGeneratedPaymentIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  // Verification screenshot modal state
  const [verificationModal, setVerificationModal] = useState({
    isOpen: false,
    serviceId: null,
    paymentId: null,
    file: null,
    loading: false
  });

  // Screenshot viewer
  const [viewingScreenshot, setViewingScreenshot] = useState(null);

  useEffect(() => {
    setServices(booking.services || []);
  }, [booking]);

  const handleSearchSupplier = async () => {
    if (!supplierType) return;
    try {
      const res = await fetch(`${API_BASE}/api/suppliers/search?category=${encodeURIComponent(supplierType)}&q=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error('Error searching suppliers', err);
    }
  };

  useEffect(() => {
    if (supplierType && searchQuery.trim()) {
      handleSearchSupplier();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, supplierType]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddService = async () => {
    if (!supplierType) {
      setError('Please select a supplier type');
      return;
    }
    if (!selectedSupplier && supplierType !== 'Outsourced') {
       setError('Please select a supplier');
       return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const payload = {
        supplierType,
        supplier: selectedSupplier?._id,
        supplierName: selectedSupplier?.businessName || selectedSupplier?.fullName,
        supplierSupplierId: selectedSupplier?.supplierId,
        b2bCost: formData.b2bCost,
        collectionBySupplier: formData.collectionBySupplier,
        startDate: formData.startDate,
        endDate: formData.endDate,
        adults: formData.adults,
        children: formData.children,
        mealPlan: formData.mealPlan,
        roomType: formData.roomType,
        numberOfRooms: formData.numberOfRooms,
        transportType: formData.transportType,
        productName: formData.productName,
        packageName: formData.packageName,
        outsourceName: formData.outsourceName,
      };

      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (data.success) {
        onServiceUpdated(data.data);
        setIsAdding(false);
        resetForm();
      } else {
        setError(data.message || 'Error adding service');
      }
    } catch (err) {
      setError(err.message || 'Error adding service');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSupplierType('');
    setFormData({
      b2bCost: '', collectionBySupplier: '', mealPlan: '', roomType: '', numberOfRooms: '',
      adults: '', children: '', startDate: '', endDate: '', transportType: '', productName: '',
      packageName: '', outsourceName: ''
    });
    setSearchQuery('');
    setSearchResults([]);
    setSelectedSupplier(null);
  };

  const updateServiceStatus = async (serviceId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ serviceStatus: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        onServiceUpdated(data.data);
      }
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

  const handlePaymentSubmit = async (serviceId, paymentData, file) => {
    try {
      const formDataObj = new FormData();
      Object.keys(paymentData).forEach(key => formDataObj.append(key, paymentData[key]));
      if (file) {
        formDataObj.append('screenshot', file);
      }

      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services/${serviceId}/payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataObj
      });
      
      const data = await res.json();
      if (data.success) {
        onServiceUpdated(data.data);
        setPaymentModals({ ...paymentModals, [serviceId]: false });
      } else {
        alert(data.message || 'Error adding payment');
      }
    } catch (err) {
      alert(err.message || 'Error adding payment');
    }
  };

  const handleVerifyPayment = async (serviceId, paymentId, status) => {
    if (user?.role !== 'admin') return alert('Only admins can verify payments');

    // Find the service and payment to check if screenshot exists
    const service = (booking.services || []).find(s => s.serviceId === serviceId);
    const payment = service ? (service.payments || []).find(p => p.paymentId === paymentId) : null;

    if (status === 'VERIFIED' && payment && !payment.screenshot) {
      setVerificationModal({
        isOpen: true,
        serviceId,
        paymentId,
        file: null,
        loading: false
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services/${serviceId}/payment/${paymentId}/verify`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        onServiceUpdated(data.data);
      } else {
        alert(data.message || 'Error verifying payment');
      }
    } catch (err) {
      alert('Error verifying payment');
    }
  };

  const submitVerifyWithScreenshot = async () => {
    if (!verificationModal.file) {
      return alert('Please select a screenshot file first.');
    }
    setVerificationModal(prev => ({ ...prev, loading: true }));
    try {
      const formData = new FormData();
      formData.append('status', 'VERIFIED');
      formData.append('screenshot', verificationModal.file);

      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services/${verificationModal.serviceId}/payment/${verificationModal.paymentId}/verify`, {
        method: 'PATCH',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        onServiceUpdated(data.data);
        setVerificationModal({ isOpen: false, serviceId: null, paymentId: null, file: null, loading: false });
      } else {
        alert(data.message || 'Error verifying payment');
      }
    } catch (err) {
      console.error(err);
      alert('Error verifying payment');
    } finally {
      setVerificationModal(prev => ({ ...prev, loading: false }));
    }
  };

  // --- Edit Service ---
  const startEditService = (service) => {
    setEditingServiceId(service.serviceId);
    setEditFormData({
      b2bCost: service.b2bCost || '',
      collectionBySupplier: service.collectionBySupplier || '',
      mealPlan: service.mealPlan || '',
      roomType: service.roomType || '',
      numberOfRooms: service.numberOfRooms || '',
      adults: service.adults || '',
      children: service.children || '',
      startDate: service.startDate ? new Date(service.startDate).toISOString().split('T')[0] : '',
      endDate: service.endDate ? new Date(service.endDate).toISOString().split('T')[0] : '',
      transportType: service.transportType || '',
      productName: service.productName || '',
      packageName: service.packageName || '',
      outsourceName: service.outsourceName || '',
    });
  };

  const handleEditInputChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleSaveEdit = async (serviceId, supplierTypeVal) => {
    setEditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      const data = await res.json();
      if (data.success) {
        onServiceUpdated(data.data);
        setEditingServiceId(null);
      } else {
        alert(data.message || 'Error updating service');
      }
    } catch (err) {
      alert('Error updating service');
    } finally {
      setEditLoading(false);
    }
  };

  // --- Generate Payment ID (Company → Supplier request) ---
  const handleGeneratePaymentId = async (serviceId) => {
    if (!generatePayIdData.amount || Number(generatePayIdData.amount) <= 0) {
      return alert('Please enter a valid amount');
    }
    setGeneratePayIdLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/services/${serviceId}/generate-payment-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(generatePayIdData)
      });
      const data = await res.json();
      if (data.success) {
        onServiceUpdated(data.data);
        setGeneratedPaymentIds({ ...generatedPaymentIds, [serviceId]: data.paymentId });
        setGeneratePayIdData({ amount: '', details: '', paymentFrom: 'Company', paymentTo: 'Supplier' });
      } else {
        alert(data.message || 'Error generating payment ID');
      }
    } catch (err) {
      alert('Error generating payment ID');
    } finally {
      setGeneratePayIdLoading(false);
    }
  };

  const handleCopyDetails = (service, payment = null) => {
    const paymentIdVal = payment?.paymentId || generatedPaymentIds[service.serviceId];
    if (!paymentIdVal) return;

    const supplierNameVal = getSupplierDisplayName(service);
    
    const serviceDateVal = (service.startDate && service.endDate)
      ? `${new Date(service.startDate).toLocaleDateString('en-IN')} to ${new Date(service.endDate).toLocaleDateString('en-IN')}`
      : service.startDate
        ? new Date(service.startDate).toLocaleDateString('en-IN')
        : 'N/A';

    const supplier = service.supplier;
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

    const paymentObj = (service.payments || []).find(p => p.paymentId === paymentIdVal);
    const amountToPayVal = paymentObj ? `₹${paymentObj.paidAmount.toLocaleString('en-IN')}` : 'N/A';
    const remarkVal = paymentObj ? paymentObj.details : 'N/A';

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

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
        <h2 className="text-xl font-bold text-slate-100">Service Options</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        )}
      </div>

      {/* Add Service Form */}
      {isAdding && (
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-slate-200">Add New Service</h3>
            <button onClick={() => { setIsAdding(false); resetForm(); }} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Step 1: Supplier Type */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Step 1: Select Supplier Type</label>
            <select
              value={supplierType}
              onChange={(e) => {
                setSupplierType(e.target.value);
                setSelectedSupplier(null);
                setSearchResults([]);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Select Type --</option>
              <option value="Hotels">Hotels</option>
              <option value="Transport">Transport</option>
              <option value="Adventure">Adventure</option>
              <option value="Guides">Guides</option>
              <option value="Outsourced">Outsourced</option>
            </select>
          </div>

          {/* Step 2: Form Data based on Type */}
          {supplierType && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="col-span-full">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Step 2: Service Details</label>
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">B2B Cost *</label>
                <input type="number" name="b2bCost" value={formData.b2bCost} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Collection by Supplier</label>
                <input type="number" name="collectionBySupplier" value={formData.collectionBySupplier} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
              </div>
              
              <div>
                <label className="block text-xs text-slate-500 mb-1">Total Due</label>
                <input type="number" disabled value={Math.max(0, (Number(formData.b2bCost) || 0) - (Number(formData.collectionBySupplier) || 0))} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-400 text-sm font-bold" />
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">End Date</label>
                <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
              </div>

              {(supplierType === 'Hotels' || supplierType === 'Transport' || supplierType === 'Adventure' || supplierType === 'Guides' || supplierType === 'Outsourced') && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Adults</label>
                    <input type="number" name="adults" value={formData.adults} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Children</label>
                    <input type="number" name="children" value={formData.children} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                  </div>
                </>
              )}

              {supplierType === 'Hotels' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Meal Plan</label>
                    <select name="mealPlan" value={formData.mealPlan} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500">
                      <option value="">Select Plan</option>
                      <option value="EP">EP</option>
                      <option value="CP">CP</option>
                      <option value="MAP">MAP</option>
                      <option value="AP">AP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Room Type</label>
                    <input type="text" name="roomType" value={formData.roomType} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Number of Rooms</label>
                    <input type="number" name="numberOfRooms" value={formData.numberOfRooms} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                  </div>
                </>
              )}

              {supplierType === 'Transport' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Transport Type</label>
                  <select name="transportType" value={formData.transportType} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500">
                    <option value="">Select Vehicle</option>
                    {['Hatchback', 'Sedan', 'Ertiga', 'Innova', 'Winger', '13 Seater', '17 Seater', '20 Seater', '26 Seater', 'Bus'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              )}

              {supplierType === 'Adventure' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Product Name</label>
                    <input type="text" name="productName" value={formData.productName} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Package Name</label>
                    <input type="text" name="packageName" value={formData.packageName} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                  </div>
                </>
              )}

              {supplierType === 'Guides' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Package Name</label>
                  <input type="text" name="packageName" value={formData.packageName} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                </div>
              )}

              {supplierType === 'Outsourced' && (
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Outsource Name</label>
                  <input type="text" name="outsourceName" value={formData.outsourceName} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:border-indigo-500" />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Search & Select Supplier */}
          {supplierType && (
            <div className="pt-4 border-t border-slate-800 space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase">Step 3: Assign Supplier</label>
              
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={`Search ${supplierType} supplier by name or ID...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {selectedSupplier ? (
                <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg">
                  <div>
                    <span className="block text-sm font-bold text-indigo-400">{selectedSupplier.businessName || selectedSupplier.fullName}</span>
                    <span className="text-xs text-indigo-300/70">{selectedSupplier.supplierId} | {selectedSupplier.city}</span>
                  </div>
                  <button onClick={() => setSelectedSupplier(null)} className="text-indigo-400 hover:text-indigo-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {searchResults.map(s => (
                    <div
                      key={s._id}
                      onClick={() => setSelectedSupplier(s)}
                      className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer hover:border-indigo-500/50 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-200">{s.businessName || s.fullName}</div>
                        <div className="text-xs text-slate-500">{s.supplierId} | {s.city}</div>
                      </div>
                      <Plus className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                  {searchResults.length === 0 && searchQuery && (
                    <div className="text-sm text-slate-500 text-center py-4">No suppliers found</div>
                  )}
                </div>
              )}

              <button
                onClick={handleAddService}
                disabled={loading || (!selectedSupplier && supplierType !== 'Outsourced')}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Confirm & Add Service'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Services List */}
      <div className="space-y-4">
        {services.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-slate-300 font-bold mb-1">No Services Added</h3>
            <p className="text-sm text-slate-500">Add hotels, transport, and other services to manage bookings.</p>
          </div>
        ) : (
          services.map(service => (
            <div key={service.serviceId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              {/* Header */}
              <div 
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpandedServiceId(expandedServiceId === service.serviceId ? null : service.serviceId)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg flex-shrink-0 ${
                    service.serviceStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    service.serviceStatus === 'Booked' ? 'bg-indigo-500/10 text-indigo-400' :
                    service.serviceStatus.includes('Cancel') ? 'bg-rose-500/10 text-rose-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {service.supplierType === 'Hotels' ? <CheckCircle className="w-6 h-6" /> :
                     service.supplierType === 'Transport' ? <Clock className="w-6 h-6" /> :
                     <FileText className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{service.supplierType}</span>
                      <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 bg-slate-950 rounded-full border border-slate-800">
                        {service.serviceId}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{getSupplierDisplayName(service)}</span>
                      {service.supplierSupplierId && (
                        <Link 
                          to={`/supplier/${service.supplierSupplierId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                        >
                          {service.supplierSupplierId}
                        </Link>
                      )}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1 flex gap-4">
                      <span>B2B: ₹{service.b2bCost}</span>
                      <span>Due: ₹{service.totalDue}</span>
                    </div>
                    {(service.payments || []).filter(p => p.isGenerated || (p.paymentId && p.paymentId.startsWith("GPAY-"))).length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] uppercase font-bold text-purple-400">Generated IDs:</span>
                        {(service.payments || []).filter(p => p.isGenerated || (p.paymentId && p.paymentId.startsWith("GPAY-"))).map(p => (
                          <span key={p.paymentId} className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            {p.paymentId}
                            <button onClick={() => handleCopyDetails(service, p)} title="Copy payment details" className="text-purple-300 hover:text-white">
                              {copiedId === p.paymentId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    service.serviceStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    service.serviceStatus === 'Booked' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                    service.serviceStatus.includes('Cancel') ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {service.serviceStatus}
                  </span>
                  {expandedServiceId === service.serviceId ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedServiceId === service.serviceId && (
                <div className="p-4 pt-0 border-t border-slate-800 mt-2 bg-slate-900/50">
                  
                  {/* Status + Edit controls row */}
                  <div className="flex flex-wrap items-center justify-between py-4 border-b border-slate-800 mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-slate-300">Status:</div>
                      <select
                        value={service.serviceStatus}
                        onChange={(e) => updateServiceStatus(service.serviceId, e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Booked">Booked</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled Booking Charges">Cancelled Booking Charges</option>
                        <option value="Cancelled No Charges">Cancelled No Charges</option>
                      </select>
                    </div>
                    {editingServiceId !== service.serviceId && (
                      <button
                        onClick={() => startEditService(service)}
                        className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Service
                      </button>
                    )}
                  </div>

                  {/* Edit Service Form */}
                  {editingServiceId === service.serviceId ? (
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl mb-6 space-y-4">
                      <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Editing Service</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">B2B Cost</label>
                          <input type="number" name="b2bCost" value={editFormData.b2bCost} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Collection by Supplier</label>
                          <input type="number" name="collectionBySupplier" value={editFormData.collectionBySupplier} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Total Due</label>
                          <input type="number" disabled value={Math.max(0, (Number(editFormData.b2bCost) || 0) - (Number(editFormData.collectionBySupplier) || 0))} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-400 font-bold" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Adults</label>
                          <input type="number" name="adults" value={editFormData.adults} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Children</label>
                          <input type="number" name="children" value={editFormData.children} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">Start Date</label>
                          <input type="date" name="startDate" value={editFormData.startDate} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">End Date</label>
                          <input type="date" name="endDate" value={editFormData.endDate} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                        </div>
                        {service.supplierType === 'Hotels' && (
                          <>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Meal Plan</label>
                              <select name="mealPlan" value={editFormData.mealPlan} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200">
                                <option value="">Select</option>
                                <option value="EP">EP</option><option value="CP">CP</option><option value="MAP">MAP</option><option value="AP">AP</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Room Type</label>
                              <input type="text" name="roomType" value={editFormData.roomType} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">No. of Rooms</label>
                              <input type="number" name="numberOfRooms" value={editFormData.numberOfRooms} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                            </div>
                          </>
                        )}
                        {service.supplierType === 'Transport' && (
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Transport Type</label>
                            <select name="transportType" value={editFormData.transportType} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200">
                              <option value="">Select</option>
                              {['Hatchback','Sedan','Ertiga','Innova','Winger','13 Seater','17 Seater','20 Seater','26 Seater','Bus'].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        )}
                        {service.supplierType === 'Adventure' && (
                          <>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Product Name</label>
                              <input type="text" name="productName" value={editFormData.productName} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1">Package Name</label>
                              <input type="text" name="packageName" value={editFormData.packageName} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                            </div>
                          </>
                        )}
                        {service.supplierType === 'Guides' && (
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Package Name</label>
                            <input type="text" name="packageName" value={editFormData.packageName} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                          </div>
                        )}
                        {service.supplierType === 'Outsourced' && (
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Outsource Name</label>
                            <input type="text" name="outsourceName" value={editFormData.outsourceName} onChange={handleEditInputChange} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => handleSaveEdit(service.serviceId, service.supplierType)} disabled={editLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
                          {editLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditingServiceId(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-only detail grid */
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <span className="block text-[10px] uppercase text-slate-500 font-bold">Start Date</span>
                        <span className="text-sm text-slate-300">{service.startDate ? new Date(service.startDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-slate-500 font-bold">End Date</span>
                        <span className="text-sm text-slate-300">{service.endDate ? new Date(service.endDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-slate-500 font-bold">Adults</span>
                        <span className="text-sm text-slate-300">{service.adults || 0}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-slate-500 font-bold">Children</span>
                        <span className="text-sm text-slate-300">{service.children || 0}</span>
                      </div>
                      {service.mealPlan && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 font-bold">Meal Plan</span>
                          <span className="text-sm text-slate-300">{service.mealPlan}</span>
                        </div>
                      )}
                      {service.roomType && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 font-bold">Room</span>
                          <span className="text-sm text-slate-300">{service.numberOfRooms}x {service.roomType}</span>
                        </div>
                      )}
                      {service.transportType && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 font-bold">Vehicle</span>
                          <span className="text-sm text-slate-300">{service.transportType}</span>
                        </div>
                      )}
                      {service.productName && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 font-bold">Product</span>
                          <span className="text-sm text-slate-300">{service.productName}</span>
                        </div>
                      )}
                      {service.packageName && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 font-bold">Package</span>
                          <span className="text-sm text-slate-300">{service.packageName}</span>
                        </div>
                      )}
                      {service.outsourceName && (
                        <div>
                          <span className="block text-[10px] uppercase text-slate-500 font-bold">Outsource</span>
                          <span className="text-sm text-slate-300">{service.outsourceName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payments Section */}
                  <div className="mt-6">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                      <h4 className="text-sm font-bold text-slate-200">Service Payments</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setGeneratePayIdData({ amount: '', details: '' }); setGeneratePayIdModals({ ...generatePayIdModals, [service.serviceId]: true }); }}
                          className="flex items-center gap-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" /> Generate Payment ID
                        </button>
                        <button
                          onClick={() => setPaymentModals({ ...paymentModals, [service.serviceId]: true })}
                          className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-colors font-bold"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Add Payment
                        </button>
                      </div>
                    </div>

                    {/* Generate Payment ID Inline Modal */}
                    {generatePayIdModals[service.serviceId] && (
                      <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-xl mb-4 space-y-3">
                        <h5 className="text-xs font-bold text-purple-400 uppercase">Generate Payment ID</h5>
                        
                        {generatedPaymentIds[service.serviceId] ? (
                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg text-center space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-center space-x-2">
                              <CheckCircle className="w-5 h-5 text-emerald-400" />
                              <span className="text-sm font-bold text-slate-200">Payment ID Generated</span>
                            </div>
                            <div className="flex items-center justify-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800 max-w-sm mx-auto">
                              <span className="font-mono text-lg font-bold text-indigo-400 tracking-wider">
                                {generatedPaymentIds[service.serviceId]}
                              </span>
                              <button
                                onClick={() => handleCopyDetails(service)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                                title="Copy Payment details to Clipboard"
                              >
                                {copiedId === generatedPaymentIds[service.serviceId] ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                setGeneratePayIdModals({ ...generatePayIdModals, [service.serviceId]: false });
                                setGeneratedPaymentIds(prev => {
                                  const newState = { ...prev };
                                  delete newState[service.serviceId];
                                  return newState;
                                });
                              }}
                              className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">From</label>
                                <select value={generatePayIdData.paymentFrom} onChange={(e) => setGeneratePayIdData({ ...generatePayIdData, paymentFrom: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200">
                                  <option value="Company">Company</option>
                                  <option value="Supplier">Supplier</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">To</label>
                                <select value={generatePayIdData.paymentTo} onChange={(e) => setGeneratePayIdData({ ...generatePayIdData, paymentTo: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200">
                                  <option value="Supplier">Supplier</option>
                                  <option value="Company">Company</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Amount (₹) *</label>
                                <input type="number" value={generatePayIdData.amount} onChange={(e) => setGeneratePayIdData({ ...generatePayIdData, amount: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" placeholder="Enter amount" />
                              </div>
                              <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Details/Remarks</label>
                                <input type="text" value={generatePayIdData.details} onChange={(e) => setGeneratePayIdData({ ...generatePayIdData, details: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm text-slate-200" placeholder="Optional remarks" />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleGeneratePaymentId(service.serviceId)} disabled={generatePayIdLoading} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                                {generatePayIdLoading ? 'Generating...' : 'Generate ID'}
                              </button>
                              <button onClick={() => setGeneratePayIdModals({ ...generatePayIdModals, [service.serviceId]: false })} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold">Cancel</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {service.payments.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No payments recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {service.payments.map(p => (
                          <div key={p.paymentId} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{p.paymentId}</span>
                                <div className="text-sm font-bold text-slate-200">₹{p.paidAmount?.toLocaleString()}</div>
                                <div className="text-[10px] text-slate-500">{new Date(p.paymentDate).toLocaleDateString()} via {p.paymentMode}</div>
                                <div className="text-xs px-2 py-0.5 bg-slate-900 rounded border border-slate-700 text-slate-400">
                                  {p.paymentFrom} → {p.paymentTo}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {p.screenshot && (
                                  <button onClick={() => setViewingScreenshot(p.screenshot)} className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">
                                    <Eye className="w-3.5 h-3.5" /> View
                                  </button>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                                  p.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  p.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {p.status}
                                </span>
                                {user?.role === 'admin' && p.status === 'VERIFICATION-REQUIRED' && (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleVerifyPayment(service.serviceId, p.paymentId, 'VERIFIED')} className="p-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded" title="Verify">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleVerifyPayment(service.serviceId, p.paymentId, 'REJECTED')} className="p-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded" title="Reject">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {p.details && <div className="text-[10px] text-slate-500 mt-1.5">Remarks: {p.details}</div>}
                            <div className="text-[10px] text-slate-600 mt-1">Added by: {p.addedBy}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                </div>
              )}
              
              {/* Payment Modal for this service */}
              {paymentModals[service.serviceId] && (
                <PaymentModal 
                  service={service}
                  onClose={() => setPaymentModals({ ...paymentModals, [service.serviceId]: false })}
                  onSubmit={(data, file) => handlePaymentSubmit(service.serviceId, data, file)}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Screenshot Viewer Modal */}
      {viewingScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100">Payment Screenshot</h3>
              <button onClick={() => setViewingScreenshot(null)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-auto bg-slate-950">
              <img src={viewingScreenshot} alt="Payment Screenshot" className="max-w-full max-h-[65vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
      {/* Verification Modal for Generated IDs */}
      {verificationModal.isOpen && (
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
                onChange={(e) => setVerificationModal(prev => ({ ...prev, file: e.target.files[0] }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer"
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setVerificationModal({ isOpen: false, serviceId: null, paymentId: null, file: null, loading: false })}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitVerifyWithScreenshot}
                  disabled={verificationModal.loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50"
                >
                  {verificationModal.loading ? 'Uploading & Verifying...' : 'Verify Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simplified Payment Modal internal component
const PaymentModal = ({ service, onClose, onSubmit }) => {
  const [data, setData] = useState({
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentFrom: 'Company',
    paymentTo: 'Supplier',
    paymentMode: 'Account',
    accountSubMode: '',
    details: ''
  });
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(data, file);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full max-w-md animate-scaleUp">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-100">Add Payment - {service.supplierType}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Amount (₹) *</label>
              <input required type="number" value={data.paidAmount} onChange={e => setData({...data, paidAmount: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"/>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Payment Date *</label>
              <input required type="date" value={data.paymentDate} onChange={e => setData({...data, paymentDate: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">From</label>
              <select value={data.paymentFrom} onChange={e => setData({...data, paymentFrom: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100">
                <option value="Company">Company</option>
                <option value="Traveller">Traveller</option>
                <option value="Supplier">Supplier</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">To</label>
              <select value={data.paymentTo} onChange={e => setData({...data, paymentTo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100">
                <option value="Supplier">Supplier</option>
                <option value="Company">Company</option>
                <option value="Traveller">Traveller</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Payment Mode</label>
            <select value={data.paymentMode} onChange={e => setData({...data, paymentMode: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100">
              <option value="Account">Account</option>
              <option value="Direct Cash">Direct Cash</option>
            </select>
          </div>
          {data.paymentMode === 'Account' && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Screenshot *</label>
              <input required type="file" onChange={e => setFile(e.target.files[0])} className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-slate-800 file:bg-slate-950 file:text-slate-300"/>
            </div>
          )}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Details/Remarks</label>
            <input type="text" value={data.details} onChange={e => setData({...data, details: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-100"/>
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold mt-2 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Payment'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServiceOptionsTab;
