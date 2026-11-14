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
  const [serviceStatusFilter, setServiceStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGeneratedIds, setSelectedGeneratedIds] = useState([]);
  const [bulkSettlements, setBulkSettlements] = useState([]);
  const [selectedBulkId, setSelectedBulkId] = useState('');
  const [selectedSupplierPayments, setSelectedSupplierPayments] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

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
  const date = (value) => value ? new Date(value).toLocaleDateString('en-GB') : '—';
  const serviceDescription = (service) => [
    service.productName,
    service.packageName,
    service.roomType,
    service.transportType,
    service.outsourceName,
  ].filter(Boolean).join(' · ') || service.supplierType || 'Service';
  const serviceStatusOptions = [
    { value: 'ALL', label: 'ALL' },
    { value: 'Postponed', label: 'POSTPONE' },
    { value: 'Booked', label: 'BOOKED' },
    { value: 'Completed', label: 'COMPLETED' },
    { value: 'Pending', label: 'PENDING' },
    { value: 'Blocked', label: 'BLOCKED' },
    { value: 'Cancelled No Charges', label: 'CANCELLED - NO BOOKING CHARGES' },
    { value: 'Cancelled Booking Charges', label: 'CANCELLED - BOOKING CHARGES' },
  ];
  const supplierTabs = [
    { id: 'status', label: 'SERVICE OVERVIEW' },
    { id: 'required', label: 'GENERATED IDS' },
    { id: 'direct', label: 'SUPPLIER PAYMENTS' },
    { id: 'bulk', label: 'SETTLEMENT ACTIONS' },
  ];

  const loadBulkSettlements = useCallback(async (supplierId) => {
    if (!supplierId) return;
    try {
      const response = await fetch(`${API_BASE}/api/suppliers/bulk-settlements?supplierId=${encodeURIComponent(supplierId)}`, { headers: authHeaders });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load bulk settlements');
      setBulkSettlements(result.data || []);
    } catch (err) { setError(err.message); }
  }, [authHeaders]);

  const openSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setActiveSupplierTab('status');
    setServiceStatusFilter('ALL');
    setSelectedGeneratedIds([]);
    setSelectedSupplierPayments([]);
    setSelectedBulkId('');
    loadBulkSettlements(supplier._id);
  };

  const selectedSupplierServices = selectedSupplier?.services || [];
  const visibleServices = selectedSupplierServices.filter((service) => serviceStatusFilter === 'ALL' || service.serviceStatus === serviceStatusFilter);
  const generatedIds = selectedSupplierServices.flatMap((service) => (service.generatedPayments || [])
    .filter((payment) => payment.status === 'VERIFICATION-REQUIRED')
    .map((payment) => ({
    ...payment,
    bookingId: service.bookingId,
    travellerName: service.travellerName,
    serviceId: service.serviceId,
    supplierType: service.supplierType,
    tripStartDate: service.bookingStartDate,
    tripEndDate: service.bookingEndDate,
    serviceStartDate: service.startDate,
    serviceEndDate: service.endDate,
    serviceCost: Number(service.b2bCost || 0),
    servicePaidAmount: Number(service.settledAmount ?? service.paidAmount ?? 0),
    })));
  const supplierPayments = selectedSupplier?.supplierPayments || [];
  const selectedGeneratedTotal = selectedGeneratedIds.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
  const selectedBulk = bulkSettlements.find((item) => item.bulkSettlementId === selectedBulkId);
  const availableSupplierPayments = supplierPayments;
  const selectedPaymentTotal = selectedSupplierPayments.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);

  const createBulkSettlement = async () => {
    if (!selectedSupplier || !selectedGeneratedIds.length) return;
    setActionLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/suppliers/bulk-settlements`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ supplierId: selectedSupplier._id, generatedItems: selectedGeneratedIds.map(item => ({ bookingId: item.bookingId, serviceId: item.serviceId, paymentSubdocumentId: item._id, paymentId: item.paymentId })) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to create bulk settlement');
      await loadBulkSettlements(selectedSupplier._id);
      setSelectedGeneratedIds([]); setSelectedBulkId(result.data.bulkSettlementId); setActiveSupplierTab('bulk');
    } catch (err) { setError(err.message); } finally { setActionLoading(false); }
  };

  const applySupplierPayments = async () => {
    if (!selectedBulkId || !selectedSupplierPayments.length) return;
    setActionLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/suppliers/bulk-settlements/${encodeURIComponent(selectedBulkId)}/payments`, { method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ paymentItems: selectedSupplierPayments.map(item => ({ bookingId: item.bookingId, paymentSubdocumentId: item.paymentSubdocumentId, paymentId: item.paymentId })) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to apply supplier payments');
      await loadBulkSettlements(selectedSupplier._id); setSelectedSupplierPayments([]);
    } catch (err) { setError(err.message); } finally { setActionLoading(false); }
  };

  const removeGeneratedFromBulk = async (paymentSubdocumentId) => {
    if (!selectedBulkId || !window.confirm('Remove this generated ID from the bulk settlement?')) return;
    setActionLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/suppliers/bulk-settlements/${encodeURIComponent(selectedBulkId)}/generated-items/${encodeURIComponent(paymentSubdocumentId)}`, { method: 'DELETE', headers: authHeaders });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to remove generated ID');
      await loadBulkSettlements(selectedSupplier._id);
      setSelectedGeneratedIds((current) => current.filter((item) => String(item._id) !== String(paymentSubdocumentId)));
    } catch (err) { setError(err.message); } finally { setActionLoading(false); }
  };

  const removeSupplierPaymentFromBulk = async (paymentSubdocumentId) => {
    if (!selectedBulkId || !window.confirm('Remove this supplier payment from the bulk settlement?')) return;
    setActionLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE}/api/suppliers/bulk-settlements/${encodeURIComponent(selectedBulkId)}/supplier-payments/${encodeURIComponent(paymentSubdocumentId)}`, { method: 'DELETE', headers: authHeaders });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to remove supplier payment');
      await loadBulkSettlements(selectedSupplier._id);
      setSelectedSupplierPayments((current) => current.filter((item) => String(item.paymentSubdocumentId) !== String(paymentSubdocumentId)));
    } catch (err) { setError(err.message); } finally { setActionLoading(false); }
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
            {activeSupplierTab === 'status' ? (
              <div className="bg-white p-5 md:p-6">
                <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200 pb-3">
                  {serviceStatusOptions.map((option) => {
                    const count = selectedSupplierServices.filter((service) => option.value === 'ALL' || service.serviceStatus === option.value).length;
                    return <button key={option.value} type="button" onClick={() => setServiceStatusFilter(option.value)} className={`px-3 py-2 rounded-md border text-[11px] font-bold transition-colors ${serviceStatusFilter === option.value ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50'}`}>{option.label} - {count}</button>;
                  })}
                </div>
                {visibleServices.length ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[980px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Booking / Traveller</th>
                          <th className="px-3 py-3">Service</th>
                          <th className="px-3 py-3">Service date</th>
                          <th className="px-3 py-3">Service Type / Total Pax</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right">Total Cost</th>
                          <th className="px-3 py-3 text-right">Settled Amount</th>
                          <th className="px-3 py-3 text-right">Due Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {visibleServices.map((service, index) => {
                          const settledAmount = Number(service.settledAmount ?? (Number(service.b2bCost || 0) - Number(service.totalDue || 0)));
                          const balance = Number(service.b2bCost || 0) - settledAmount;
                          return (
                            <tr key={`${service.bookingId}-${service.serviceId}-${index}`} className="text-slate-700">
                              <td className="px-3 py-3"><a href={service.bookingId ? `/booking/${encodeURIComponent(service.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-indigo-600 hover:underline">{service.bookingId || '—'}</a><span className="block mt-1 text-slate-500">{service.travellerName || '—'}</span></td>
                              <td className="px-3 py-3"><a href={service.bookingId ? `/booking/${encodeURIComponent(service.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:underline">{service.serviceId || '—'}</a><span className="block mt-1 text-slate-500">{serviceDescription(service)}</span></td>
                              <td className="px-3 py-3 whitespace-nowrap font-semibold text-orange-600">{date(service.startDate)}{service.endDate && ` → ${date(service.endDate)}`}</td>
                              <td className="px-3 py-3 whitespace-nowrap"><span className="font-semibold text-blue-700">{service.supplierType || '—'}</span><span className="block mt-1 font-bold text-blue-700">{Number(service.adults || 0)} + {Number(service.children || 0)}</span></td>
                              <td className="px-3 py-3"><span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-semibold">{service.serviceStatus || '—'}</span></td>
                              <td className="px-3 py-3 text-right font-mono font-bold text-blue-700">{money(service.b2bCost)}</td>
                              <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600">{money(settledAmount)}</td>
                              <td className="px-3 py-3 text-right font-mono font-semibold text-rose-600">{money(balance)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="min-h-[160px] flex items-center justify-center text-sm text-slate-500">No services match the selected date and status filters.</div>}
              </div>
            ) : activeSupplierTab === 'required' ? (
              <div className="bg-white p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Generated Payment IDs: {generatedIds.length}</h3>
                    <p className="text-xs text-slate-500 mt-1">Generated payment IDs awaiting verification for this supplier.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-700">Selected total: {money(selectedGeneratedTotal)}</span>
                    <button type="button" onClick={createBulkSettlement} disabled={!selectedGeneratedIds.length || actionLoading} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{actionLoading ? 'Creating...' : 'CREATE BULK SETTLEMENT'}</button>
                  </div>
                </div>
                {generatedIds.length ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[1100px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-3">Select</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">Trip / Traveller</th><th className="px-3 py-3">Trip Date</th><th className="px-3 py-3">Service</th><th className="px-3 py-3">Supplier</th><th className="px-3 py-3">Service Date</th><th className="px-3 py-3 text-right">Service Cost</th><th className="px-3 py-3 text-right">Required</th><th className="px-3 py-3 text-right">Due</th><th className="px-3 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {generatedIds.map((payment, index) => {
                          const due = Math.max(payment.serviceCost - payment.servicePaidAmount, 0);
                          const inBulk = bulkSettlements.find((bulk) => bulk.generatedItems?.some((item) => String(item.paymentSubdocumentId) === String(payment._id)));
                          const checked = selectedGeneratedIds.some((item) => String(item._id) === String(payment._id));
                          return <tr key={`${payment.paymentId}-${index}`} className="text-slate-700 hover:bg-blue-50/40">
                            <td className="px-3 py-3"><input type="checkbox" checked={checked} disabled={Boolean(inBulk)} onChange={() => setSelectedGeneratedIds((current) => checked ? current.filter((item) => String(item._id) !== String(payment._id)) : [...current, payment])} /></td>
                            <td className="px-3 py-3 font-mono font-extrabold text-blue-700"><a href={payment.bookingId ? `/booking/${encodeURIComponent(payment.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="hover:underline">{payment.paymentId || '—'}</a>{inBulk && <span className="block mt-1 text-[10px] text-emerald-700">{inBulk.bulkSettlementId}</span>}</td>
                            <td className="px-3 py-3 bg-white"><a href={payment.bookingId ? `/booking/${encodeURIComponent(payment.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="font-semibold text-black hover:underline">{payment.bookingId || '—'}</a><span className="block mt-1 font-bold text-black">{payment.travellerName || '—'}</span></td>
                            <td className="px-3 py-3 whitespace-nowrap font-semibold text-blue-700">{date(payment.tripStartDate)}{payment.tripEndDate && ` → ${date(payment.tripEndDate)}`}</td>
                            <td className="px-3 py-3 font-semibold text-purple-700"><a href={payment.bookingId ? `/booking/${encodeURIComponent(payment.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="hover:underline">{payment.serviceId || '—'}</a></td>
                            <td className="px-3 py-3 font-semibold text-emerald-700">{payment.supplierType || '—'}</td>
                            <td className="px-3 py-3 whitespace-nowrap font-semibold text-orange-600">{date(payment.serviceStartDate)}{payment.serviceEndDate && ` → ${date(payment.serviceEndDate)}`}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-blue-700">{money(payment.serviceCost)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-rose-600">{money(payment.paidAmount)}</td>
                            <td className="px-3 py-3 text-right font-mono font-bold text-rose-600">{money(due)}</td>
                            <td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">{payment.status || '—'}</span></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="min-h-[160px] flex items-center justify-center text-sm text-slate-500">No generated payment IDs found for this supplier.</div>}
              </div>
            ) : activeSupplierTab === 'direct' ? (
              <div className="bg-white p-5 md:p-6">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div><h3 className="text-lg font-extrabold text-slate-800">Supplier Payments: {supplierPayments.length}</h3><p className="text-xs text-slate-500 mt-1">Search a bulk settlement ID, then select supplier payments to reduce its balance.</p></div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Bulk settlement ID
                    <input value={selectedBulkId} onChange={(event) => { setSelectedBulkId(event.target.value); setSelectedSupplierPayments([]); }} list="bulk-settlement-options" placeholder="Search BULK-..." className="mt-1 block w-[270px] rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono normal-case tracking-normal text-slate-800" />
                    <datalist id="bulk-settlement-options">{bulkSettlements.map((bulk) => <option key={bulk.bulkSettlementId} value={bulk.bulkSettlementId}>{bulk.status} — remaining {money(bulk.remainingAmount)}</option>)}</datalist>
                  </label>
                </div>
                {selectedBulk && <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-mono font-extrabold text-indigo-700">{selectedBulk.bulkSettlementId}</div><div className="mt-1 text-xs text-slate-600">Generated total: {money(selectedBulk.generatedTotal)} · Already applied: {money(selectedBulk.supplierPaymentTotal)}</div></div><div className="text-sm font-extrabold text-rose-600">Remaining: {money(selectedBulk.remainingAmount)}</div></div>{selectedBulk.status !== 'SETTLED' && <><div className="mt-4 flex justify-end"><span className="text-sm font-bold text-slate-700">Selected: {money(selectedPaymentTotal)}</span></div><div className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="px-3 py-2">Select</th><th className="px-3 py-2">Payment ID</th><th className="px-3 py-2">Booking / Traveller</th><th className="px-3 py-2 text-right">Amount</th></tr></thead><tbody>{availableSupplierPayments.map((payment) => { const alreadyLinked = selectedBulk.supplierPaymentItems?.some(item => String(item.paymentSubdocumentId) === String(payment.paymentSubdocumentId)); const checked = selectedSupplierPayments.some(item => String(item.paymentSubdocumentId) === String(payment.paymentSubdocumentId)); return <tr key={payment.paymentSubdocumentId} className="border-t border-slate-100"><td className="px-3 py-2"><input type="checkbox" disabled={alreadyLinked} checked={checked || alreadyLinked} onChange={() => setSelectedSupplierPayments(current => checked ? current.filter(item => String(item.paymentSubdocumentId) !== String(payment.paymentSubdocumentId)) : [...current, payment])} /></td><td className="px-3 py-2 font-mono font-bold text-purple-700">{payment.paymentId}</td><td className="px-3 py-2">{payment.bookingId} / {payment.travellerName || '—'}</td><td className="px-3 py-2 text-right font-mono font-bold">{money(payment.paidAmount)}</td></tr>; })}</tbody></table></div><button type="button" onClick={applySupplierPayments} disabled={!selectedSupplierPayments.length || actionLoading} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{actionLoading ? 'Applying...' : 'SUBTRACT SELECTED PAYMENTS'}</button></>}</div>}
                {supplierPayments.length ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[900px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <tr><th className="px-3 py-3 text-black">Payment ID</th><th className="px-3 py-3 text-black">Booking / Traveller</th><th className="px-3 py-3 text-black">Payment Date</th><th className="px-3 py-3 text-right text-black">Amount</th><th className="px-3 py-3 text-black">Bank Account</th><th className="px-3 py-3 text-black">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supplierPayments.map((payment, index) => <tr key={`${payment.paymentId}-${index}`} className="text-slate-700 hover:bg-emerald-50/40">
                          <td className="px-3 py-3 font-mono font-extrabold text-purple-700"><a href={payment.bookingId ? `/booking/${encodeURIComponent(payment.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="hover:underline">{payment.paymentId || '—'}</a></td>
                          <td className="px-3 py-3"><a href={payment.bookingId ? `/booking/${encodeURIComponent(payment.bookingId)}` : undefined} target="_blank" rel="noopener noreferrer" className="font-semibold text-black hover:underline">{payment.bookingId || '—'}</a><span className="block mt-1 font-bold text-black">{payment.travellerName || '—'}</span></td>
                          <td className="px-3 py-3 whitespace-nowrap font-semibold text-orange-700">{date(payment.paymentDate)}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-blue-700">{money(payment.paidAmount)}</td>
                          <td className="px-3 py-3 font-semibold text-indigo-700">{payment.paymentMode || '—'}</td>
                          <td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">{payment.status || '—'}</span></td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                ) : <div className="min-h-[160px] flex items-center justify-center text-sm text-slate-500">No matching supplier-bank manual payments found for this supplier.</div>}
              </div>
            ) : activeSupplierTab === 'bulk' ? (
              <div className="bg-white p-5 md:p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-lg font-extrabold text-slate-800">Settlement Actions: {bulkSettlements.length}</h3><p className="text-xs text-slate-500 mt-1">Each bulk settlement keeps the original generated IDs and subtracts selected supplier payments.</p></div>
                  {selectedBulk && <div className="text-right text-xs"><div className="font-mono font-bold text-indigo-700">{selectedBulk.bulkSettlementId}</div><div className="font-bold text-rose-600">Remaining: {money(selectedBulk.remainingAmount)}</div></div>}
                </div>
                {bulkSettlements.length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Bulk Settlement ID</th><th className="px-3 py-3 text-right">Generated Total</th><th className="px-3 py-3 text-right">Supplier Payments</th><th className="px-3 py-3 text-right">Remaining</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Details</th></tr></thead><tbody className="divide-y divide-slate-100">{bulkSettlements.map((bulk) => <tr key={bulk.bulkSettlementId} className="text-slate-700"><td className="px-3 py-3 font-mono font-bold text-indigo-700">{bulk.bulkSettlementId}<span className="block mt-1 text-slate-500">{bulk.generatedItems?.length || 0} generated IDs</span></td><td className="px-3 py-3 text-right font-mono font-bold">{money(bulk.generatedTotal)}</td><td className="px-3 py-3 text-right font-mono font-bold text-emerald-700">{money(bulk.supplierPaymentTotal)}</td><td className="px-3 py-3 text-right font-mono font-bold text-rose-600">{money(bulk.remainingAmount)}</td><td className="px-3 py-3"><span className="rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">{bulk.status}</span></td><td className="px-3 py-3"><button type="button" onClick={() => { setSelectedBulkId(bulk.bulkSettlementId); setActiveSupplierTab('bulk'); }} className="rounded-lg bg-indigo-50 px-3 py-2 font-bold text-indigo-700 hover:bg-indigo-100">VIEW DETAILS</button></td></tr>)}</tbody></table></div> : <div className="min-h-[120px] flex items-center justify-center text-sm text-slate-500">No bulk settlements created yet. Select generated IDs first.</div>}

                {selectedBulk && <div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><h4 className="mb-2 font-extrabold text-slate-800">Generated IDs in this bulk</h4>{selectedBulk.generatedItems?.map(item => <div key={item.paymentSubdocumentId} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 text-xs"><div><span className="font-mono font-bold text-blue-700">{item.paymentId}</span><span className="ml-3 text-slate-600">{money(item.amount)}</span></div><button type="button" onClick={() => removeGeneratedFromBulk(item.paymentSubdocumentId)} disabled={actionLoading || selectedBulk.generatedItems.length <= 1} className="rounded-md px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">REMOVE</button></div>)}</div><div className="rounded-xl border border-slate-200 p-4"><h4 className="mb-2 font-extrabold text-slate-800">Supplier payments applied</h4>{selectedBulk.supplierPaymentItems?.length ? selectedBulk.supplierPaymentItems.map(item => <div key={item.paymentSubdocumentId} className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 text-xs"><div><span className="font-mono font-bold text-purple-700">{item.paymentId}</span><span className="ml-3 text-slate-600">{money(item.amount)}</span></div><button type="button" onClick={() => removeSupplierPaymentFromBulk(item.paymentSubdocumentId)} disabled={actionLoading} className="rounded-md px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">REMOVE</button></div>) : <p className="text-xs text-slate-500">No supplier payments applied yet.</p>}</div></div>}
              </div>
            ) : (
              <div className="min-h-[220px] bg-white p-6 flex items-center justify-center text-sm text-slate-500">{supplierTabs.find((tab) => tab.id === activeSupplierTab)?.label} details will appear here.</div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default SupplierReconciliation;
