import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Eye, Filter, LoaderCircle, Search, WalletCards, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const emptyLocations = { countries: [], states: [], cities: [] };

const SupplierReconciliation = () => {
  const { token } = useAuth();
  const [locations, setLocations] = useState(emptyLocations);
  const [filters, setFilters] = useState({ country: 'India', state: '', city: '' });
  const [rows, setRows] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [activeSupplierTab, setActiveSupplierTab] = useState('status');
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [error, setError] = useState('');

  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!token) return;
    const loadLocations = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/suppliers/locations`, { headers: authHeaders });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load locations');
        setLocations(result.data || emptyLocations);
        const india = (result.data?.countries || []).find((item) => item.name?.toLowerCase() === 'india');
        setFilters((current) => ({ ...current, country: india?.name || 'India' }));
      } catch (err) {
        setError(err.message);
      } finally {
        setLocationsLoading(false);
      }
    };
    loadLocations();
  }, [token, authHeaders]);

  const selectedCountry = locations.countries.find((item) => item.name === filters.country);
  const states = locations.states.filter((item) => !selectedCountry || item.country === selectedCountry.id);
  const selectedState = states.find((item) => item.name === filters.state);
  const cities = locations.cities.filter((item) => !selectedState || item.state === selectedState.id);

  const loadRows = useCallback(async (nextFilters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ country: nextFilters.country || 'India' });
      if (nextFilters.state) params.set('state', nextFilters.state);
      if (nextFilters.city) params.set('city', nextFilters.city);
      const response = await fetch(`${API_BASE}/api/suppliers/reconciliation?${params}`, { headers: authHeaders });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load supplier reconciliation');
      setRows(result.data || []);
      setHasLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const setFilter = (name, value) => {
    const next = { ...filters, [name]: value };
    if (name === 'country') { next.state = ''; next.city = ''; }
    if (name === 'state') next.city = '';
    setFilters(next);
  };

  const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
  const supplierTabs = [
    { id: 'status', label: 'SERVICE OVERVIEW' },
    { id: 'required', label: 'GENERATED IDS' },
    { id: 'direct', label: 'SUPPLIER PAYMENTS' },
    { id: 'bulk', label: 'SETTLEMENT ACTIONS' },
  ];

  const openSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setActiveSupplierTab('status');
  };

  return (
    <main className="p-6 md:p-8 max-w-[1500px] mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <WalletCards className="w-8 h-8 text-indigo-500" />
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Supplier Reconciliation</h1>
          </div>
          <p className="text-sm text-slate-500 mt-2">Review supplier service value, settlements, and outstanding balances.</p>
        </div>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 mb-5">
          <Filter className="w-5 h-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-100">Filter suppliers</h2>
          <span className="text-xs text-slate-500">India is selected by default</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Country
            <select value={filters.country} onChange={(e) => setFilter('country', e.target.value)} disabled={locationsLoading} className="mt-2 w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 normal-case tracking-normal">
              {locations.countries.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              {!locations.countries.length && <option>India</option>}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">State
            <select value={filters.state} onChange={(e) => setFilter('state', e.target.value)} disabled={locationsLoading || !filters.country} className="mt-2 w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 normal-case tracking-normal">
              <option value="">All states</option>{states.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">City
            <select value={filters.city} onChange={(e) => setFilter('city', e.target.value)} disabled={locationsLoading || !filters.state} className="mt-2 w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 normal-case tracking-normal">
              <option value="">All cities</option>{cities.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <button onClick={() => loadRows(filters)} disabled={loading || locationsLoading} className="h-[42px] flex items-center justify-center gap-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold disabled:opacity-50">
            {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Loading...' : 'GET DATA'}
          </button>
        </div>
      </section>

      {error && <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex gap-2 text-sm"><AlertCircle className="w-5 h-5" />{error}</div>}
      <section className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr><th className="w-[110px] px-2 py-4">Code</th><th className="w-[190px] px-2 py-4">Contact</th><th className="w-[210px] px-2 py-4">Business</th><th className="w-[150px] px-2 py-4">Region</th><th className="w-[90px] px-2 py-4 text-right whitespace-nowrap">Services</th><th className="w-[125px] px-2 py-4 text-right">Committed</th><th className="w-[125px] px-2 py-4 text-right">Settled</th><th className="w-[125px] px-2 py-4 text-right">Balance</th><th className="w-[85px] px-2 py-4 text-center">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? <tr><td colSpan="9" className="py-16 text-center text-slate-500"><LoaderCircle className="w-6 h-6 animate-spin inline mr-2" />Loading supplier records...</td></tr> : !hasLoaded ? <tr><td colSpan="9" className="py-16 text-center text-slate-500">Choose filters and click GET DATA to view supplier records.</td></tr> : rows.length === 0 ? <tr><td colSpan="9" className="py-16 text-center text-slate-500">No supplier records match these filters.</td></tr> : rows.map((row) => <tr key={row._id} className="hover:bg-slate-900/50">
                <td className="px-2 py-4 font-mono font-bold text-indigo-400 whitespace-nowrap">{row.supplierId}</td>
                <td className="px-2 py-4 text-slate-200 break-words">{row.fullName}</td>
                <td className="px-2 py-4 text-slate-300 break-words">{row.businessName}</td>
                <td className="px-2 py-4 text-slate-400 break-words">{[row.city, row.state].filter(Boolean).join(', ') || '—'}</td>
                <td className="px-2 py-4 text-right text-slate-200">{row.serviceCount}</td>
                <td className="px-2 py-4 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-center font-mono font-bold text-orange-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg shadow-sm">{money(row.totalAmount)}</span>
                </td>
                <td className="px-2 py-4 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-center font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg shadow-sm">{money(row.paidAmount)}</span>
                </td>
                <td className="px-2 py-4 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-center font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg shadow-sm">{money(row.dueAmount)}</span>
                </td>
                <td className="px-2 py-4 text-center">
                  <button type="button" onClick={() => openSupplier(row)} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 text-xs font-bold">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>

      {selectedSupplier && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/70 p-4 md:p-10" onClick={() => setSelectedSupplier(null)}>
          <div className="w-full max-w-6xl rounded-2xl bg-slate-100 shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200">
              <div className="text-orange-500 text-lg"><span className="font-extrabold">{selectedSupplier.fullName}</span><span className="font-bold">, {selectedSupplier.businessName}</span></div>
              <button type="button" onClick={() => setSelectedSupplier(null)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close supplier details"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-wrap gap-1 px-4 py-3 bg-amber-50 border-b border-amber-100">
              {supplierTabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveSupplierTab(tab.id)} className={`px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${activeSupplierTab === tab.id ? 'bg-orange-100 text-orange-700 border border-orange-300 shadow-sm' : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="min-h-[220px] bg-white p-6 flex items-center justify-center text-sm text-slate-500">
              {supplierTabs.find((tab) => tab.id === activeSupplierTab)?.label} details will appear here.
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SupplierReconciliation;
