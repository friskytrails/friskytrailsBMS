import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import {
  ArrowLeft, MapPin, Phone, Mail, Store, FileText, AlertCircle,
  Globe, Building2, CreditCard, CheckCircle, X, Eye, User, Calendar, Hash
} from 'lucide-react';

const SupplierDetails = () => {
  const { supplierId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Document viewer
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/suppliers/${supplierId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setSupplier(data.data);
        } else {
          setError(data.message || 'Supplier not found');
        }
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
          <button
            onClick={() => navigate('/search-suppliers')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Return to Suppliers
          </button>
        </div>
      </div>
    );
  }

  const InfoField = ({ icon: Icon, label, value, mono = false }) => (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </label>
      <div className={`bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-inner ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto animate-fadeIn font-sans space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/search-suppliers')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer"
              title="Back to Suppliers"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="bg-slate-900 text-indigo-400 px-4 py-2 rounded-lg font-mono font-extrabold text-sm md:text-base shadow-sm border border-slate-800">
                {supplier.supplierId}
              </span>
              <span className={`text-xs font-extrabold px-4 py-2 rounded-full border ${
                supplier.status === 'Active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {supplier.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-slate-900 text-slate-300 border border-slate-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              Registered: {formatDate(supplier.createdAt)}
            </span>
          </div>
        </div>

        {/* Top Info Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <InfoField icon={Store} label="Business Name" value={supplier.businessName} />
          <InfoField icon={User} label="Contact Person" value={supplier.fullName} />
          <InfoField icon={MapPin} label="Location" value={`${supplier.city}, ${supplier.state}, ${supplier.country}`} />
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
              <Hash className="w-3 h-3" /> Service Categories
            </label>
            <div className="flex flex-wrap gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 shadow-inner min-h-[42px] items-center">
              {supplier.supplierFor.map(cat => (
                <span key={cat} className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold border border-indigo-500/20">{cat}</span>
              ))}
            </div>
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
              <InfoField icon={Phone} label="Primary Contact" value={supplier.contactNumber} mono />
              {supplier.alternateNumber && (
                <InfoField icon={Phone} label="Alternate Number" value={supplier.alternateNumber} mono />
              )}
              <InfoField icon={Mail} label="Email Address" value={supplier.email} />
              <InfoField icon={Globe} label="Country" value={supplier.country} />
              <InfoField icon={MapPin} label="State" value={supplier.state} />
              <InfoField icon={MapPin} label="City" value={supplier.city} />
            </div>
          </div>

          {/* Column 2: Financial & Bank Details */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl shadow-sm space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">Financial Details</h3>
            </div>
            <div className="space-y-4">
              <InfoField icon={FileText} label="GSTIN" value={supplier.gstin} mono />
              <InfoField icon={FileText} label="MSME" value={supplier.msme} mono />
              <InfoField icon={Building2} label="Bank Name" value={supplier.bankName} />
              <InfoField icon={CreditCard} label="Account Number" value={supplier.accountNumber} mono />
              <InfoField icon={Hash} label="IFSC Code" value={supplier.ifscCode} mono />
              <InfoField icon={User} label="Account Holder" value={supplier.accountHolderName} />
            </div>
          </div>

          {/* Column 3: UPI & Documents */}
          <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-xl shadow-sm space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">UPI & Documents</h3>
            </div>
            <div className="space-y-4">
              <InfoField icon={CreditCard} label="UPI ID" value={supplier.upiId} mono />
              <InfoField icon={Phone} label="UPI Number" value={supplier.upiNumber} mono />
            </div>

            {/* Documents */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Uploaded Documents</label>
              {(!supplier.documents || supplier.documents.length === 0) ? (
                <p className="text-xs text-slate-500 italic bg-slate-950 border border-slate-800 p-3 rounded-lg">No documents uploaded.</p>
              ) : (
                <div className="space-y-2">
                  {supplier.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-200 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-500">{formatDate(doc.uploadedAt)}</p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 flex-shrink-0 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View
                      </a>
                    </div>
                  ))}
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
