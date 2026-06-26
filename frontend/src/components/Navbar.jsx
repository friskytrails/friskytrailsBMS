import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarCheck, LogOut, User, LayoutDashboard, FileSpreadsheet, ShieldAlert } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive(path)
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors">
          <CalendarCheck className="w-8 h-8 text-indigo-500" />
          <span className="font-bold text-xl tracking-tight text-white">
            FriskyTrails <span className="text-indigo-500">BMS</span>
          </span>
        </Link>

        {/* Navigation Links */}
        {user && (
          <div className="flex items-center space-x-6">
            
            {/* Conditional Links based on user verification and role */}
            {user.isVerified || user.role === 'admin' ? (
              <div className="hidden md:flex items-center space-x-2">
                {user.role === 'admin' && (
                  <Link to="/admin" className={navLinkClass('/admin')}>
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Panel</span>
                  </Link>
                )}
                
                <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>

                {(user.role === 'employee' || user.role === 'admin') && (
                  <Link to="/create-booking" className={navLinkClass('/create-booking')}>
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>New Booking</span>
                  </Link>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
                Pending Verification
              </div>
            )}

            {/* Profile & Logout Action */}
            <div className="flex items-center space-x-4 border-l border-slate-800 pl-6">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-200">{user.name}</span>
                <span className="text-xs text-slate-400 capitalize">{user.role}</span>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold uppercase">
                {user.name.charAt(0)}
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center justify-center p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all duration-200"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </nav>
  );
};

export default Navbar;
