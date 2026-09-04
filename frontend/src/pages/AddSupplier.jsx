import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, MapPin, Building2, Upload, AlertCircle, FileText, Landmark, X, CheckCircle2, Truck } from 'lucide-react';
import { API_BASE } from '../config';

const SUPPLIER_CATEGORIES = ['Hotels', 'Transport', 'Adventure', 'Guides', 'Outsourced'];

// Defined outside AddSupplier so React keeps a stable component identity across re-renders
const ErrMsg = ({ touched, errors, name }) => touched[name] && errors[name] ? (
  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /><span>{errors[name]}</span></p>
) : null;

const Field = ({ label, name, icon: Icon, type = 'text', placeholder, required = false, value, onChange, onBlur, className }) => (
  <div>
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    <div className="relative rounded-md shadow-sm">
      {Icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon className="h-4.5 w-4.5 text-slate-500" /></div>}
      <input type={type} name={name} value={value} onChange={onChange} onBlur={onBlur} className={className} placeholder={placeholder} />
    </div>
  </div>
);

const AddSupplier = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    country: '', state: '', city: '',
    fullName: '', businessName: '', contactNumber: '', alternateNumber: '', email: '',
    gstin: '', msme: '', accountNumber: '', ifscCode: '', accountHolderName: '', bankName: '', upiId: '', upiNumber: '',
    supplierFor: [],
  });

  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [touched, setTouched] = useState({});
  const [locations, setLocations] = useState({ countries: [], states: [], cities: [] });
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/suppliers/locations`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to load locations");
        setLocations(data.data);
      } catch (err) {
        console.error("Error fetching locations:", err);
        setError("Unable to load website locations. Please try again.");
      } finally {
        setLocationsLoading(false);
      }
    };
    fetchLocations();
  }, [token]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  const validate = () => {
    const e = {};
    if (!formData.country.trim()) e.country = 'Country is required';
    if (!formData.state.trim()) e.state = 'State is required';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.fullName.trim()) e.fullName = 'Full name is required';
    if (!formData.businessName.trim()) e.businessName = 'Business name is required';
    if (!formData.contactNumber) e.contactNumber = 'Contact number is required';
    else if (!/^[6-9]\d{9}$/.test(formData.contactNumber)) e.contactNumber = '10 digits starting with 6-9';
    if (formData.alternateNumber && !/^[6-9]\d{9}$/.test(formData.alternateNumber)) e.alternateNumber = 'Invalid number';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) e.email = 'Invalid email';
    if (formData.supplierFor.length === 0) e.supplierFor = 'Select at least one category';
    return e;
  };

  const errors = validate();
  const isValid = Object.keys(errors).length === 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'contactNumber' || name === 'alternateNumber') {
      setFormData(p => ({ ...p, [name]: value.replace(/\D/g, '').slice(0, 10) }));
    } else {
      setFormData(p => ({ ...p, [name]: value }));
    }
    setTouched(p => ({ ...p, [name]: true }));
    if (error) setError('');
  };
  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value, ...(name === "country" ? { state: "", city: "" } : {}), ...(name === "state" ? { city: "" } : {}) }));
    setTouched(p => ({ ...p, [name]: true }));
    if (error) setError("");
  };

  const handleBlur = (name) => setTouched(p => ({ ...p, [name]: true }));

  const toggleCategory = (cat) => {
    setFormData(p => ({
      ...p,
      supplierFor: p.supplierFor.includes(cat)
        ? p.supplierFor.filter(c => c !== cat)
        : [...p.supplierFor, cat],
    }));
    setTouched(p => ({ ...p, supplierFor: true }));
  };

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(p => [...p, ...files]);
    e.target.value = '';
  };

  const removeDoc = (idx) => setDocuments(p => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccessMsg('');
    const allTouched = {};
    Object.keys(formData).forEach(k => allTouched[k] = true);
    setTouched(allTouched);
    if (!isValid) { setError('Please resolve all validation errors.'); return; }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === 'supplierFor') fd.append(k, JSON.stringify(v));
        else fd.append(k, v);
      });
      documents.forEach(f => fd.append('documents', f));

      const res = await fetch(`${API_BASE}/api/suppliers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      setIsSubmitting(false);
      if (data.success) {
        setSuccessMsg(`Supplier added! ID: ${data.data.supplierId}`);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError(data.message || 'Failed to add supplier');
      }
    } catch {
      setError('Server connection failed');
      setIsSubmitting(false);
    }
  };

  const getInputCls = (name, hasIcon = true) => {
    const base = `bg-slate-950/60 block w-full ${hasIcon ? 'pl-10' : 'px-3'} pr-3 py-2 border rounded-xl text-slate-200 focus:outline-none focus:ring-2 sm:text-sm transition-all duration-200`;
    if (touched[name] && errors[name]) return `${base} border-rose-500/80 focus:ring-rose-500/50 focus:border-rose-500`;
    return `${base} border-slate-800 focus:ring-[#00A89E]/50 focus:border-[#00A89E]`;
  };

  // Helper to render a Field with all bindings
  const renderField = (label, name, icon, placeholder, required = false, type = 'text') => (
    <>
      <Field
        label={label} name={name} icon={icon} type={type} placeholder={placeholder} required={required}
        value={formData[name]} onChange={handleChange} onBlur={() => handleBlur(name)} className={getInputCls(name, !!icon)}
      />
      <ErrMsg touched={touched} errors={errors} name={name} />
    </>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto font-sans">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-100">Add New Supplier</h1>
          <p className="text-sm text-slate-500 mt-1">Register a new supplier with contact, banking, and category details.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" /><span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center space-x-2 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" /><span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <MapPin className="w-5 h-5 text-[#00A89E]" /><span>Location Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Country <span className="text-rose-400">*</span></label>
                <select name="country" value={formData.country} onChange={handleLocationChange} onBlur={() => handleBlur("country")} disabled={locationsLoading} className={getInputCls("country", false)}>
                  <option value="">{locationsLoading ? "Loading countries..." : "Select country"}</option>
                  {locations.countries.map(country => <option key={country.id} value={country.name}>{country.name}</option>)}
                </select>
                <ErrMsg touched={touched} errors={errors} name="country" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">State <span className="text-rose-400">*</span></label>
                <select name="state" value={formData.state} onChange={handleLocationChange} onBlur={() => handleBlur("state")} disabled={locationsLoading || !formData.country} className={getInputCls("state", false)}>
                  <option value="">Select state</option>
                  {locations.states.filter(state => state.country === locations.countries.find(country => country.name === formData.country)?.id).map(state => <option key={state.id} value={state.name}>{state.name}</option>)}
                </select>
                <ErrMsg touched={touched} errors={errors} name="state" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">City <span className="text-rose-400">*</span></label>
                <select name="city" value={formData.city} onChange={handleLocationChange} onBlur={() => handleBlur("city")} disabled={locationsLoading || !formData.state} className={getInputCls("city", false)}>
                  <option value="">Select city</option>
                  {locations.cities.filter(city => city.state === locations.states.find(state => state.name === formData.state && state.country === locations.countries.find(country => country.name === formData.country)?.id)?.id).map(city => <option key={city.id} value={city.name}>{city.name}</option>)}
                </select>
                <ErrMsg touched={touched} errors={errors} name="city" />
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <User className="w-5 h-5 text-[#00A89E]" /><span>Contact Information</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>{renderField('Full Name', 'fullName', User, 'Rajesh Kumar', true)}</div>
              <div>{renderField('Business Name', 'businessName', Building2, 'Kumar Travels Pvt. Ltd.', true)}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>{renderField('Contact Number', 'contactNumber', Phone, '9876543210', true, 'tel')}</div>
              <div>{renderField('Alternate Number', 'alternateNumber', Phone, '9876543211', false, 'tel')}</div>
              <div>{renderField('Email ID', 'email', Mail, 'supplier@example.com', true, 'email')}</div>
            </div>
          </div>

          {/* Banking Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Landmark className="w-5 h-5 text-[#00A89E]" /><span>Financial & Banking Details</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>{renderField('GSTIN', 'gstin', FileText, '22AAAAA0000A1Z5')}</div>
              <div>{renderField('MSME', 'msme', FileText, 'UDYAM-XX-00-0000000')}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-800">
              <div>{renderField('A/c Number', 'accountNumber', Landmark, '1234567890')}</div>
              <div>{renderField('IFSC Code', 'ifscCode', Landmark, 'SBIN0001234')}</div>
              <div>{renderField('A/c Holder Name', 'accountHolderName', User, 'Rajesh Kumar')}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>{renderField('Bank Name', 'bankName', Landmark, 'State Bank of India')}</div>
              <div>{renderField('UPI ID', 'upiId', Landmark, 'supplier@upi')}</div>
              <div>{renderField('UPI Number', 'upiNumber', Phone, '9876543210')}</div>
            </div>
          </div>

          {/* Supplier For Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Truck className="w-5 h-5 text-[#00A89E]" /><span>Supplier For</span>
              <span className="text-rose-400 text-xs ml-1">*</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {SUPPLIER_CATEGORIES.map(cat => {
                const selected = formData.supplierFor.includes(cat);
                return (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      selected
                        ? 'bg-[#00A89E]/15 border-[#00A89E] text-[#00A89E] shadow-md shadow-teal-600/10'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-4 h-4" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
            <ErrMsg touched={touched} errors={errors} name="supplierFor" />
          </div>

          {/* Documents Upload Section */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-5 h-5 text-[#00A89E]" /><span>Documents Upload</span>
            </h2>
            <div className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors bg-slate-950/20 border-slate-800 hover:border-[#00A89E]/50`}>
              <Upload className="w-8 h-8 text-slate-500 mb-2" />
              <p className="text-sm text-slate-400 mb-3">Drag & drop or click to upload documents</p>
              <label className="cursor-pointer py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                <span>Browse Files</span>
                <input type="file" multiple accept="image/*,.pdf" onChange={handleFileAdd} className="hidden" />
              </label>
              <p className="text-[11px] text-slate-500 mt-2">PNG, JPG, PDF — Max 5 MB each</p>
            </div>
            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#00A89E] flex-shrink-0" />
                      <span className="text-sm text-slate-300 truncate">{doc.name}</span>
                      <span className="text-[11px] text-slate-500 flex-shrink-0">({(doc.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button type="button" onClick={() => removeDoc(idx)} className="ml-2 p-1 rounded-lg hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate('/dashboard')}
              className="py-2.5 px-5 rounded-xl border border-slate-800 text-sm font-semibold text-slate-500 bg-slate-900 hover:bg-slate-850 hover:text-slate-100 transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !isValid}
              className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-white font-semibold text-sm transition-all duration-200 ${
                isValid && !isSubmitting
                  ? 'bg-[#00A89E] hover:bg-[#008f86] shadow-lg shadow-teal-600/10 cursor-pointer'
                  : 'bg-slate-800/80 text-slate-500 cursor-not-allowed opacity-50'
              }`}>
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Upload className="w-4 h-4" /><span>Add Supplier</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSupplier;
