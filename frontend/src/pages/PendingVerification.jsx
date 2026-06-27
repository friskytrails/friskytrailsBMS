import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

const PendingVerification = () => {
  const { user, checkAuthStatus, logout } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info'); // info, success, warning

  const handleCheckStatus = async () => {
    setChecking(true);
    setStatusMessage('');
    
    const result = await checkAuthStatus();
    
    // Artificial slight delay for premium feel
    setTimeout(() => {
      setChecking(false);
      if (result.success && result.user.isVerified) {
        setStatusType('success');
        setStatusMessage('Your account has been verified! Redirecting...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setStatusType('warning');
        setStatusMessage('Your account is still pending verification. Please check back later.');
      }
    }, 1000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl z-10 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 mb-6">
          <ShieldAlert className="h-8 w-8 animate-pulse" />
        </div>

        <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Pending Verification
        </h2>
        <p className="mt-3 text-slate-100 font-medium">
          Hello, {user?.name}!
        </p>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Your account is successfully registered under the employee role. However, it requires admin verification before you can access the booking dashboard and forms.
        </p>

        {statusMessage && (
          <div className={`mt-6 p-4 rounded-xl border text-sm flex items-start space-x-2 text-left animate-slideDown ${
            statusType === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-600'
          }`}>
            {statusType === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-950 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Refresh Verification Status'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-slate-800 rounded-xl shadow-sm text-sm font-semibold text-slate-550 bg-slate-900 hover:bg-slate-855 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-950 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;
