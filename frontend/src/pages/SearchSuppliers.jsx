import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import {
  Search, Filter, MapPin, Mail, Phone, RefreshCw, FolderOpen, AlertCircle, FileText, CheckCircle, Store, Eye, EyeOff
} from 'lucide-react';

const SearchSuppliers = () => {
  const { token, user } = useAuth();

  const [filters, setFilters] = useState({
    supplierId: '',
    fullName: '',
    businessName: '',
    contactNumber: '',
    city: '',
    supplierFor: '',
  });

  const [showAllFilters, setShowAllFilters] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  
  // Modal State for Viewing Documents
  const [selectedDocs, setSelectedDocs] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFilters({
      supplierId: '',
      fullName: '',
      businessName: '',
      contactNumber: '',
      city: '',
      supplierFor: '',
    });
    setSuppliers([]);
    setSearched(false);
    setError('');
    setShowAllFilters(false);
  };

  const handleSearch = async (e, resetOverride = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      
      // If we are resetting, we pass empty params, otherwise use state filters
      if (!resetOverride) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value.trim()) params.append(key, value.trim());
        });
      }

      const res = await fetch(`${API_BASE}/api/suppliers/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
        setSearched(true);
      } else {
        setError(data.message || 'Failed to search suppliers');
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
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Supplier Directory</h1>
        <p className="text-sm text-slate-500 mt-2">Search, filter, and view all registered travel suppliers.</p>
      </div>

      <form onSubmit={handleSearch} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-100">Find Suppliers</h2>
          <span className="text-xs text-slate-500">(Fill any filter to search)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Supplier ID */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Supplier ID</label>
            <input
              type="text"
              name="supplierId"
              placeholder="SUP-XXXXXX"
              value={filters.supplierId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 font-mono focus:outline-none transition-colors"
            />
          </div>

          {/* Business Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Business Name</label>
            <input
              type="text"
              name="businessName"
              placeholder="Business Name"
              value={filters.businessName}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 focus:outline-none transition-colors"
            />
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">City / Location</label>
            <input
              type="text"
              name="city"
              placeholder="City"
              value={filters.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 focus:outline-none transition-colors"
            />
          </div>

          {showAllFilters && (
            <>
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Name</label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Contact Person Name"
                  value={filters.fullName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 focus:outline-none transition-colors"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  name="contactNumber"
                  placeholder="10-digit number"
                  value={filters.contactNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 font-mono focus:outline-none transition-colors"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Category</label>
                <select
                  name="supplierFor"
                  value={filters.supplierFor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl text-sm text-slate-100 focus:outline-none transition-colors"
                >
                  <option value="">All Categories</option>
                  <option value="Hotels">Hotels</option>
                  <option value="Transport">Transport</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Guides">Guides</option>
                  <option value="Outsourced">Outsourced</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button type="button" onClick={handleReset} className="text-xs font-semibold text-rose-500 hover:text-rose-400 transition-colors">
            Reset Filters
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowAllFilters(!showAllFilters)}
              className="flex items-center justify-center space-x-2 py-2.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm transition-all shadow-lg border border-slate-700"
            >
              {showAllFilters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showAllFilters ? 'Hide Filters' : 'More Filters'}</span>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center space-x-2 py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm shadow-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {!searched && !loading && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center shadow-inner flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Store className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-300">Supplier Database</h3>
          <p className="text-sm text-slate-500 max-w-sm">Use the filters above to find specific suppliers or view all active partners.</p>
        </div>
      )}

      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium">Scanning suppliers...</p>
        </div>
      )}

      {searched && !loading && suppliers.length === 0 && (
        <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-16 text-center flex flex-col items-center justify-center space-y-3">
          <FolderOpen className="w-10 h-10 text-slate-500" />
          <h3 className="text-lg font-semibold text-slate-100">No Suppliers Found</h3>
          <p className="text-sm text-slate-500 max-w-sm">No suppliers matched your search criteria. Try different filters.</p>
        </div>
      )}

      {searched && !loading && suppliers.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-800 text-left text-sm table-auto">
              <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-4">Supplier ID</th>
                  <th className="px-4 py-4">Business / Name</th>
                  <th className="px-4 py-4">Location</th>
                  <th className="px-4 py-4">Contact</th>
                  <th className="px-4 py-4">Services</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-center">Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                {suppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-slate-900/25 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link to={`/supplier/${supplier.supplierId}`} className="font-bold text-indigo-400 font-mono hover:underline hover:text-indigo-300">
                        {supplier.supplierId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-100">{supplier.businessName}</div>
                      <div className="text-xs text-slate-500">{supplier.fullName}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        {supplier.city}, {supplier.state}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-300 flex items-center gap-1 text-xs">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {supplier.contactNumber}
                      </div>
                      <div className="text-slate-500 flex items-center gap-1 text-[10px]">
                        <Mail className="w-3 h-3" />
                        {supplier.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {supplier.supplierFor.map(cat => (
                          <span key={cat} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700">{cat}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full border ${
                        supplier.status === 'Active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button 
                        onClick={() => setSelectedDocs(supplier)}
                        disabled={!supplier.documents || supplier.documents.length === 0}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-300"
                        title="View Documents"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {selectedDocs && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">
                Documents: {selectedDocs.businessName || selectedDocs.fullName}
              </h3>
              <button
                onClick={() => setSelectedDocs(null)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <AlertCircle className="w-5 h-5 rotate-45" style={{ transform: 'rotate(45deg)' }} /> {/* Simulated X using AlertCircle without ! or simply replace with an X, I'll just change to close button */}
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedDocs.documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm font-bold text-slate-200 truncate">{doc.name}</p>
                      <p className="text-xs text-slate-500">Uploaded: {formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
              <button 
                onClick={() => setSelectedDocs(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SearchSuppliers;
