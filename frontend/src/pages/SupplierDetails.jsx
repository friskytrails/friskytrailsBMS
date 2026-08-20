import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import {
  ArrowLeft, MapPin, Phone, Mail, Store, FileText, AlertCircle,
  Globe, Building2, CreditCard, CheckCircle, X, Eye, User, Calendar, Hash,
  Pencil, Save, XCircle, Upload, Trash2, CheckCircle2
} from 'lucide-react';

const SUPPLIER_CATEGORIES = ['Hotels', 'Transport', 'Adventure', 'Guides', 'Outsourced'];

const SupplierDetails = () => {
  const { supplierId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [newDocs, setNewDocs] = useState([]);
  const [removeDocIndexes, setRemoveDocIndexes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/suppliers/${supplierId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setSupplier(data.data);
        else setError(data.message || 'Supplier not found');
      } catch (err) {
        console.error('Error fetching supplier:', err);
        setError('Connection to server failed');
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [supplierId, token]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  const startEditing = () => {
    setEditData({
      fullName: supplier.fullName || '',
      businessName: supplier.businessName || '',
      contactNumber: supplier.contactNumber || '',
      alternateNumber: supplier.alternateNumber || '',
      email: supplier.email || '',
      country: supplier.country || '',
      state: supplier.state || '',
      city: supplier.city || '',
      gstin: supplier.gstin || '',
      msme: supplier.msme || '',
      accountNumber: supplier.accountNumber || '',
      ifscCode: supplier.ifscCode || '',
      accountHolderName: supplier.accountHolderName || '',
      bankName: supplier.bankName || '',
      upiId: supplier.upiId || '',
      upiNumber: supplier.upiNumber || '',
      supplierFor: [...(supplier.supplierFor || [])],
      status: supplier.status || 'Active',
    });
    setNewDocs([]);
    setRemoveDocIndexes([]);
    setSaveMsg('');
    setSaveError('');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditData({});
    setNewDocs([]);
    setRemoveDocIndexes([]);
    setSaveError('');
  };

  const handleEditChange = (field, value) => {
    if (field === 'contactNumber' || field === 'alternateNumber') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (cat) => {
    setEditData(prev => ({
      ...prev,
      supplierFor: prev.supplierFor.includes(cat)
        ? prev.supplierFor.filter(c => c !== cat)
        : [...prev.supplierFor, cat],
    }));
  };

  const handleNewDocs = (e) => {
    setNewDocs(prev => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const toggleRemoveDoc = (idx) => {
    setRemoveDocIndexes(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveMsg('');
    try {
      const fd = new FormData();
      Object.entries(editData).forEach(([k, v]) => {
        if (k === 'supplierFor') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      if (removeDocIndexes.length > 0) {
        fd.append('removeDocumentIndexes', JSON.stringify(removeDocIndexes));
      }
      newDocs.forEach(f => fd.append('documents', f));

      const res = await fetch(`${API_BASE}/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setSupplier(data.data);
        setIsEditing(false);
        setSaveMsg('Supplier updated successfully!');
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        setSaveError(data.message || 'Failed to update supplier');
      }
    } catch {
      setSaveError('Server connection failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Loading Supplier Details...</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Error Loading Details</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'Supplier record could not be loaded.'}</p>
          <button onClick={() => navigate('/search-suppliers')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer">
            Return to Suppliers
          </button>
        </div>
      </div>
    );
  }

  // Editable field component
  const EditableField = ({ icon: Icon, label, field, mono = false }) => {
    const value = isEditing ? editData[field] : (supplier[field] || '');
    if (isEditing) {
      return (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
            {Icon && <Icon className="w-3 h-3" />} {label}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => handleEditChange(field, e.target.value)}
            className={`w-full bg-slate-950 border border-indigo-500/40 focus:border-indigo-500 text-slate-100 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${mono ? 'font-mono' : ''}`}
          />
        </div>
      );
    }
    return (
      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
          {Icon && <Icon className="w-3 h-3" />} {label}
        </label>
        <div className={`bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-inner ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto animate-fadeIn font-sans space-y-8">

        {/* Success / Error banners */}
        {saveMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center space-x-2 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" /><span>{saveMsg}</span>
          </div>
        )}
        {saveError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{saveError}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/search-suppliers')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer" title="Back to Suppliers">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-slate-900 text-indigo-400 px-4 py-2 rounded-lg font-mono font-extrabold text-sm md:text-base shadow-sm border border-slate-800">
                {supplier.supplierId}
              </span>
              {isEditing && user?.role === 'admin' ? (
                <select value={editData.status} onChange={(e) => handleEditChange('status', e.target.value)}
                  className="text-xs font-extrabold px-4 py-2 rounded-full border bg-slate-900 text-slate-100 border-indigo-500/40 focus:outline-none cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              ) : (
                <span className={`text-xs font-extrabold px-4 py-2 rounded-full border ${
                  supplier.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>{supplier.status}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-slate-900 text-slate-300 border border-slate-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Registered: {formatDate(supplier.createdAt)}
            </span>
            {/* Edit / Save / Cancel buttons */}
            {isEditing ? (
              <>
                <button onClick={cancelEditing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold border border-slate-700 transition-colors cursor-pointer">
                  <XCircle className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/10 disabled:opacity-50 cursor-pointer">
                  {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={startEditing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/10 cursor-pointer">
                <Pencil className="w-4 h-4" /> Edit Supplier
              </button>
            )}
          </div>
        </div>

        {/* Top Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <EditableField icon={Store} label="Business Name" field="businessName" />
          <EditableField icon={User} label="Contact Person" field="fullName" />
          {isEditing ? (
            <div className="grid grid-cols-3 gap-2 col-span-1">
              <EditableField icon={MapPin} label="City" field="city" />
              <EditableField icon={MapPin} label="State" field="state" />
              <EditableField icon={Globe} label="Country" field="country" />
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-inner">
                {supplier.city}, {supplier.state}, {supplier.country}
              </div>
            </div>
          )}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              <Hash className="w-3 h-3" /> Service Categories
            </label>
            {isEditing ? (
              <div className="flex flex-wrap gap-1.5 bg-slate-950 border border-indigo-500/40 rounded-lg px-3 py-2.5 shadow-inner min-h-[42px] items-center">
                {SUPPLIER_CATEGORIES.map(cat => {
                  const selected = editData.supplierFor.includes(cat);
                  return (
                    <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                        selected
                          ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
                      }`}>{cat}</button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 shadow-inner min-h-[42px] items-center">
                {supplier.supplierFor.map(cat => (
                  <span key={cat} className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold border border-indigo-500/20">{cat}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Column 1: Contact Information */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl shadow-sm space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">Contact Information</h3>
            </div>
            <div className="space-y-4">
              <EditableField icon={Phone} label="Primary Contact" field="contactNumber" mono />
              <EditableField icon={Phone} label="Alternate Number" field="alternateNumber" mono />
              <EditableField icon={Mail} label="Email Address" field="email" />
              {!isEditing && (
                <>
                  <EditableField icon={Globe} label="Country" field="country" />
                  <EditableField icon={MapPin} label="State" field="state" />
                  <EditableField icon={MapPin} label="City" field="city" />
                </>
              )}
            </div>
          </div>

          {/* Column 2: Financial & Bank Details */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl shadow-sm space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">Financial Details</h3>
            </div>
            <div className="space-y-4">
              <EditableField icon={FileText} label="GSTIN" field="gstin" mono />
              <EditableField icon={FileText} label="MSME" field="msme" mono />
              <EditableField icon={Building2} label="Bank Name" field="bankName" />
              <EditableField icon={CreditCard} label="Account Number" field="accountNumber" mono />
              <EditableField icon={Hash} label="IFSC Code" field="ifscCode" mono />
              <EditableField icon={User} label="Account Holder" field="accountHolderName" />
            </div>
          </div>

          {/* Column 3: UPI & Documents */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl shadow-sm space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">UPI & Documents</h3>
            </div>
            <div className="space-y-4">
              <EditableField icon={CreditCard} label="UPI ID" field="upiId" mono />
              <EditableField icon={Phone} label="UPI Number" field="upiNumber" mono />
            </div>

            {/* Documents */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Uploaded Documents</label>
              {(!supplier.documents || supplier.documents.length === 0) && !isEditing ? (
                <p className="text-xs text-slate-500 italic bg-slate-950 border border-slate-800 p-3 rounded-lg">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {(supplier.documents || []).map((doc, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 bg-slate-950 border rounded-lg transition-all ${
                      removeDocIndexes.includes(index) ? 'border-rose-500/40 opacity-50' : 'border-slate-800'
                    }`}>
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-200 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-500">{formatDate(doc.uploadedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors">
                          <Eye className="w-3 h-3" /> View
                        </a>
                        {isEditing && (
                          <button type="button" onClick={() => toggleRemoveDoc(index)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              removeDocIndexes.includes(index)
                                ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                            }`} title={removeDocIndexes.includes(index) ? 'Undo remove' : 'Mark for removal'}>
                            {removeDocIndexes.includes(index) ? <CheckCircle className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new documents in edit mode */}
              {isEditing && (
                <div className="mt-3 space-y-2">
                  {newDocs.length > 0 && (
                    <div className="space-y-1.5">
                      {newDocs.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Upload className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-xs text-emerald-300 truncate">{f.name}</span>
                          </div>
                          <button type="button" onClick={() => setNewDocs(p => p.filter((_, i) => i !== idx))}
                            className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-slate-500" />
                    <span className="text-xs text-slate-400 font-semibold">Add Documents</span>
                    <input type="file" multiple accept="image/*,.pdf" onChange={handleNewDocs} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* Created By */}
            {supplier.createdBy && (
              <div className="pt-4 border-t border-slate-800">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Added By</label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-300 shadow-inner">
                  {supplier.createdBy.name || 'Unknown'} ({supplier.createdBy.email || ''})
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SupplierDetails;
