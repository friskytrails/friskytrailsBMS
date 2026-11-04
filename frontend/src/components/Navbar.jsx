import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CalendarCheck, LogOut, LayoutDashboard, FileSpreadsheet, ShieldAlert, Sun, Moon, Truck, Store, WalletCards, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize theme state from classList or localStorage
  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
  const [supplierMenuOpen, setSupplierMenuOpen] = useState(false);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `flex items-center space-x-2 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all duration-200 ${
      isActive(path)
        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-600/20'
        : 'text-slate-600 hover:bg-slate-850 hover:text-indigo-600'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-3 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center space-x-2 text-indigo-600 hover:text-indigo-500 transition-colors">
          <CalendarCheck className="w-8 h-8 text-indigo-600" />
          <span className="font-bold text-xl tracking-tight text-slate-100">
            FriskyTrails <span className="text-indigo-600 font-extrabold">BMS</span>
          </span>
        </Link>

        {/* Navigation & Action Controls */}
        <div className="flex items-center space-x-3 min-w-0">
          {user && (
            <div className="flex items-center space-x-4 mr-1">
              
              {/* Conditional Links based on user verification and role */}
              {user.isVerified || user.role === 'admin' ? (
                <div className="hidden md:flex items-center space-x-1">
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

                  {(user.role === 'employee' || user.role === 'admin') && (
                    <>
                      <Link to="/add-supplier" className={navLinkClass('/add-supplier')}>
                        <Truck className="w-4 h-4" />
                        <span>Add Supplier</span>
                      </Link>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={() => setSupplierMenuOpen((open) => !open)}
                          className={`${navLinkClass('/search-suppliers')} ${location.pathname === '/supplier/recon' ? 'bg-indigo-650 text-white shadow-md shadow-indigo-600/20' : ''}`}
                          aria-expanded={supplierMenuOpen}
                        >
                          <Store className="w-4 h-4" />
                          <span>Supplier</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${supplierMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {supplierMenuOpen && (
                          <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl z-50">
                            <Link to="/search-suppliers" onClick={() => setSupplierMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white">
                              <Store className="w-4 h-4" /> Search Supplier
                            </Link>
                            <Link to="/supplier/recon" onClick={() => setSupplierMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white">
                              <WalletCards className="w-4 h-4" /> Supplier Recon
                            </Link>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="hidden md:flex items-center px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 text-xs font-semibold">
                  Pending Verification
                </div>
              )}

              {/* Profile Information */}
              <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-slate-100">{user.name}</span>
                  <span className="text-xs text-slate-500 capitalize">{user.role}</span>
                </div>
                
                <div className="w-8 h-8 rounded-full bg-indigo-650/10 border border-indigo-650/20 flex items-center justify-center text-indigo-600 font-bold uppercase">
                  {user.name.charAt(0)}
                </div>
              </div>
            </div>
          )}

          {/* Global Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 rounded-lg bg-slate-850 text-slate-650 hover:text-indigo-600 border border-slate-800 transition-all duration-200 cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-550 animate-pulse" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
          </button>

          {/* Logout Action Button */}
          {user && (
            <button
              onClick={handleLogout}
              className="flex items-center justify-center p-2 rounded-lg bg-slate-850 text-slate-650 hover:bg-rose-500/10 hover:text-rose-600 border border-slate-800 hover:border-rose-500/20 transition-all duration-200 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
