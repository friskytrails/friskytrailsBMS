import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, UserPlus, KeyRound, AlertCircle } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    adminCode: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.role === 'admin' && !formData.adminCode) {
      setError('Please provide the admin secret code');
      return;
    }

    setIsSubmitting(true);
    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      adminCode: formData.role === 'admin' ? formData.adminCode : undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      if (result.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/pending');
      }
    } else {
      setError(result.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <h2 className="text-center text-4xl font-extrabold text-white tracking-tight">
          Create Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
            Sign In here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-900/40 backdrop-blur-md py-8 px-4 border border-slate-800 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start space-x-2 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="bg-slate-950/60 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email Address
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-slate-950/60 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-300">
                Registration Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="bg-slate-950/60 block w-full mt-1.5 px-3 py-2.5 border border-slate-800 rounded-xl text-slate-350 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
              >
                <option value="employee" className="bg-slate-950 text-slate-300">Employee (Requires Verification)</option>
                <option value="admin" className="bg-slate-950 text-slate-300">Admin (Requires Secret Code)</option>
              </select>
            </div>

            {formData.role === 'admin' && (
              <div className="animate-slideDown">
                <label htmlFor="adminCode" className="block text-sm font-medium text-slate-300">
                  Admin Secret Code
                </label>
                <div className="mt-1.5 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="adminCode"
                    name="adminCode"
                    type="password"
                    required
                    value={formData.adminCode}
                    onChange={handleChange}
                    className="bg-slate-950/60 block w-full pl-10 pr-3 py-2.5 border border-indigo-500/50 rounded-xl text-slate-205 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                    placeholder="Enter admin passcode"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-slate-950/60 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <div className="mt-1.5 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="bg-slate-950/60 block w-full pl-10 pr-3 py-2.5 border border-slate-800 rounded-xl text-slate-202 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-950 disabled:opacity-50 transition-all duration-200"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
