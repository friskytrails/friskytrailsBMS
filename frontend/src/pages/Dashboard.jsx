import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchDashboard from '../components/SearchDashboard';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto font-sans">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-5 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              {user?.role === 'admin' ? 'Search Bookings' : 'My Bookings Search'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {user?.role === 'admin' 
                ? 'Overview of all employee bookings registered in the system' 
                : 'Monitor your sales, traveler registers, and payment files'
              }
            </p>
          </div>
          {(user?.role === 'employee' || user?.role === 'admin') && (
            <Link
              to="/create-booking"
              className="mt-4 md:mt-0 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-650/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Booking</span>
            </Link>
          )}
        </div>

        {/* Search Dashboard Component */}
        <SearchDashboard />

      </div>
    </div>
  );
};

export default Dashboard;
