import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
  FileText,
  ArrowLeft,
  AlertCircle,
  FileImage,
  ShieldCheck,
  UserPlus,
  X,
  Edit,
  Check
} from 'lucide-react';
import { API_BASE } from '../config';
import CommentSection from '../components/CommentSection';

const getStatusStyles = (status) => {
  switch (status) {
    case 'Fulfillment Done':
    case 'Payment Done':
    case 'Confirmed':
      return 'bg-[#00A89E]/10 text-[#00A89E] border-[#00A89E]/25';
    case 'Trip Completed':
    case 'Booked':
      return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
    case 'Refund Required':
    case 'Cancelled':
      return 'bg-rose-500/10 text-rose-500 border-rose-500/25';
    case 'Refund Done':
      return 'bg-blue-500/10 text-blue-500 border-blue-500/25';
    case 'No Refund':
    case 'On Hold':
      return 'bg-slate-500/10 text-slate-400 border-slate-500/25';
    case 'Partial Payment':
      return 'bg-orange-500/10 text-orange-500 border-orange-500/25';
    case 'Pending':
    default:
      return 'bg-amber-500/10 text-amber-500 border-amber-500/25';
  }
};

const BookingDetails = () => {
  const { bookingId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Customer Feedback local state
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Admin Assignment state
  const [employees, setEmployees] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // --- Inline Editing States ---
  const [isEditingPackage, setIsEditingPackage] = useState(false);
  const [packageFields, setPackageFields] = useState({ packageName: '', location: '' });

  const [isEditingTraveler, setIsEditingTraveler] = useState(false);
  const [travelerFields, setTravelerFields] = useState({
    travellerName: '',
    travellerEmail: '',
    travellerPhone: '',
    adults: 0,
    children: 0,
  });

  const [isEditingServices, setIsEditingServices] = useState(false);
  const [servicesFields, setServicesFields] = useState({ startDate: '', endDate: '' });

  // --- Payments Ledger & Modal States ---
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  
  // Payment Form States
  const [formAmountPaid, setFormAmountPaid] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('upi');
  const [formPaymentDate, setFormPaymentDate] = useState('');
  const [formPaymentFrom, setFormPaymentFrom] = useState('TRAVELER');
  const [formPaymentTo, setFormPaymentTo] = useState('COMPANY');
  const [formDetails, setFormDetails] = useState('');
  const [formAttachment, setFormAttachment] = useState(null);
  const [formAttachmentName, setFormAttachmentName] = useState('');
  const [formStatus, setFormStatus] = useState('VERIFICATION-REQUIRED');
  
  const [formError, setFormError] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Payment Table Source Filter State
  const [paymentSourceFilter, setPaymentSourceFilter] = useState('ALL');

  // Profit Margin State
  const [profitMarginInput, setProfitMarginInput] = useState(0);
  const [togglingTaskId, setTogglingTaskId] = useState(null);

  // --- Full Booking Edit States ---
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [fullEditName, setFullEditName] = useState('');
  const [fullEditEmail, setFullEditEmail] = useState('');
  const [fullEditPhone, setFullEditPhone] = useState('');
  const [fullEditAdults, setFullEditAdults] = useState(1);
  const [fullEditChildren, setFullEditChildren] = useState(0);
  const [fullEditPackageName, setFullEditPackageName] = useState('');
  const [fullEditLocation, setFullEditLocation] = useState('');
  const [fullEditStartDate, setFullEditStartDate] = useState('');
  const [fullEditEndDate, setFullEditEndDate] = useState('');
  const [fullEditTotalAmount, setFullEditTotalAmount] = useState('');


  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setBooking(data.data);
          setProfitMarginInput(data.data.profitMargin || 0);
        } else {
          setError(data.message || 'Booking not found');
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError('Server connection failed');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, token]);

  // Sync feedback states with booking details updates
  useEffect(() => {
    if (booking) {
      setFeedbackRating(booking.feedbackRating?.toString() || '5');
      setFeedbackComment(booking.feedbackComment || '');
    }
  }, [booking]);

  // Fetch verified employees list for Admin assignment dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      if (user?.role !== 'admin') return;
      try {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          const verifiedEmps = data.data.filter(
            (u) => u.role === 'employee' && u.isVerified
          );
          setEmployees(verifiedEmps);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
    };

    fetchEmployees();
  }, [user, token]);

  // Add employee to assignedTo
  const handleAddEmployee = async (e) => {
    const empId = e.target.value;
    if (!empId) return;

    setAssigning(true);
    try {
      const currentIds = booking.assignedTo?.map((u) => u._id || u) || [];
      if (currentIds.includes(empId)) return;

      const updatedIds = [...currentIds, empId];

      const res = await fetch(`${API_BASE}/api/bookings/assign/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeIds: updatedIds }),
      });
      const data = await res.json();

      if (data.success) {
        setBooking((prev) => ({
          ...prev,
          assignedTo: data.data.assignedTo,
        }));
      } else {
        alert(data.message || 'Failed to assign employee');
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign employee');
    } finally {
      setAssigning(false);
      e.target.value = '';
    }
  };

  // Remove employee from assignedTo
  const handleRemoveEmployee = async (empId) => {
    setAssigning(true);
    try {
      const currentIds = booking.assignedTo?.map((u) => u._id || u) || [];
      const updatedIds = currentIds.filter(
        (id) => id.toString() !== empId.toString()
      );

      const res = await fetch(`${API_BASE}/api/bookings/assign/${booking._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ employeeIds: updatedIds }),
      });
      const data = await res.json();

      if (data.success) {
        setBooking((prev) => ({
          ...prev,
          assignedTo: data.data.assignedTo,
        }));
      } else {
        alert(data.message || 'Failed to unassign employee');
      }
    } catch (err) {
      console.error('Unassign error:', err);
      alert('Failed to unassign employee');
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (!newStatus || newStatus === booking.status) return;

    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status due to network error.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // --- Inline Edit Handlers ---
  const handleSaveBookingFields = async (updatedFields, successCallback) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
        if (successCallback) successCallback();
      } else {
        alert(data.message || 'Failed to update booking');
      }
    } catch (err) {
      console.error('Error updating booking fields:', err);
      alert('Failed to save changes due to network connection issues.');
    }
  };

  const startEditingPackage = () => {
    setPackageFields({
      packageName: booking.packageName,
      location: booking.location,
    });
    setIsEditingPackage(true);
  };

  const handleSavePackage = () => {
    handleSaveBookingFields(packageFields, () => setIsEditingPackage(false));
  };

  const startEditingTraveler = () => {
    setTravelerFields({
      travellerName: booking.travellerName,
      travellerEmail: booking.travellerEmail,
      travellerPhone: booking.travellerPhone,
      adults: booking.adults || 0,
      children: booking.children || 0,
    });
    setIsEditingTraveler(true);
  };

  const handleSaveTraveler = () => {
    handleSaveBookingFields(travelerFields, () => setIsEditingTraveler(false));
  };

  const startEditingServices = () => {
    setServicesFields({
      startDate: booking.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '',
      endDate: booking.endDate ? new Date(booking.endDate).toISOString().split('T')[0] : '',
    });
    setIsEditingServices(true);
  };

  const handleSaveServices = () => {
    handleSaveBookingFields(servicesFields, () => setIsEditingServices(false));
  };

  // --- Full Booking Edit Handlers ---
  const openFullEditModal = () => {
    setFullEditName(booking.travellerName || '');
    setFullEditEmail(booking.travellerEmail || '');
    setFullEditPhone(booking.travellerPhone || '');
    setFullEditAdults(booking.adults || 1);
    setFullEditChildren(booking.children || 0);
    setFullEditPackageName(booking.packageName || '');
    setFullEditLocation(booking.location || '');
    setFullEditStartDate(booking.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '');
    setFullEditEndDate(booking.endDate ? new Date(booking.endDate).toISOString().split('T')[0] : '');
    setFullEditTotalAmount(booking.totalAmount || '');
    setFormError('');
    setIsFullEditModalOpen(true);
  };

  const handleFullEditSubmit = async (e) => {
    e.preventDefault();
    setSubmittingPayment(true);
    setFormError('');

    if (
      !fullEditName.trim() ||
      !fullEditEmail.trim() ||
      !fullEditPhone.trim() ||
      !fullEditPackageName.trim() ||
      !fullEditLocation.trim() ||
      !fullEditStartDate ||
      !fullEditEndDate ||
      !fullEditTotalAmount
    ) {
      setFormError('All fields are required.');
      setSubmittingPayment(false);
      return;
    }

    const payload = {
      travellerName: fullEditName.trim(),
      travellerEmail: fullEditEmail.trim(),
      travellerPhone: fullEditPhone.trim(),
      adults: Number(fullEditAdults),
      children: Number(fullEditChildren),
      packageName: fullEditPackageName.trim(),
      location: fullEditLocation.trim(),
      startDate: fullEditStartDate,
      endDate: fullEditEndDate,
      totalAmount: Number(fullEditTotalAmount),
    };

    await handleSaveBookingFields(payload, () => {
      setIsFullEditModalOpen(false);
    });
    setSubmittingPayment(false);
  };


  // --- Payment Form Submit Handlers ---
  const openAddPaymentModal = () => {
    setEditingPayment(null);
    setFormAmountPaid('');
    setFormPaymentMode('upi');
    setFormPaymentDate(new Date().toISOString().split('T')[0]);
    setFormPaymentFrom('TRAVELER');
    setFormPaymentTo('COMPANY');
    setFormDetails('');
    setFormAttachment(null);
    setFormAttachmentName('');
    setFormStatus('VERIFICATION-REQUIRED');
    setFormError('');
    setIsAddPaymentModalOpen(true);
  };

  const openEditPayment = (payment) => {
    setEditingPayment(payment);
    setFormAmountPaid(payment.amountPaid.toString());
    setFormPaymentMode(payment.paymentMode);
    setFormPaymentDate(payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '');
    setFormPaymentFrom(payment.paymentFrom);
    setFormPaymentTo(payment.paymentTo);
    setFormDetails(payment.details || '');
    setFormAttachment(null);
    setFormAttachmentName(payment.attachmentName || '');
    setFormStatus(payment.status || 'VERIFICATION-REQUIRED');
    setFormError('');
    setIsAddPaymentModalOpen(true);
  };

  const handlePaymentFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formAmountPaid) {
      setFormError('Amount Paid is required');
      return;
    }
    const amt = Number(formAmountPaid);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount Paid must be positive');
      return;
    }

    if (!formPaymentDate) {
      setFormError('Payment Date is required');
      return;
    }

    if (!formDetails.trim()) {
      setFormError('Transaction Details are required');
      return;
    }

    setSubmittingPayment(true);

    try {
      const formData = new FormData();
      formData.append('amount', formAmountPaid);
      formData.append('amountPaid', formAmountPaid);
      formData.append('transactionId', formDetails.trim());
      formData.append('details', formDetails.trim());
      formData.append('paymentDate', formPaymentDate);
      formData.append('paymentFrom', formPaymentFrom);
      formData.append('paymentTo', formPaymentTo);
      formData.append('paymentMode', formPaymentMode);
      formData.append('attachmentName', formAttachmentName);
      formData.append('status', formStatus);

      if (formAttachment) {
        formData.append('screenshot', formAttachment);
      }

      let res;
      if (editingPayment) {
        res = await fetch(`${API_BASE}/api/bookings/${booking._id}/edit-payment/${editingPayment.paymentId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });
      } else {
        res = await fetch(`${API_BASE}/api/bookings/${booking._id}/update-payment`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });
      }

      const data = await res.json();
      setSubmittingPayment(false);

      if (data.success) {
        setBooking(data.data);
        setIsAddPaymentModalOpen(false);
      } else {
        setFormError(data.message || 'Failed to submit payment details');
      }
    } catch (err) {
      console.error('Error submitting payment form:', err);
      setFormError('Connection issue.');
      setSubmittingPayment(false);
    }
  };

  const handleSendReceipt = async (paymentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/verify-payment/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'send-receipt' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Receipt successfully queued and emailed!');
        setBooking(data.data);
      } else {
        alert(data.message || 'Failed to send receipt');
      }
    } catch (err) {
      console.error('Send receipt error:', err);
      alert('Network error while sending receipt');
    }
  };

  const handleVerifyPayment = async (paymentId, status) => {
    let reason = '';
    if (status === 'REJECTED') {
      reason = window.prompt('Enter rejection reason:') || 'No reason provided';
    }

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/verify-payment/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        alert(data.message || 'Failed to update payment status');
      }
    } catch (err) {
      console.error('Verify payment error:', err);
      alert('Network error while updating payment status');
    }
  };

  const handleToggleTask = async (taskName) => {
    if (!canEdit) {
      alert('You do not have permission to toggle tasks on this booking.');
      return;
    }

    if (taskName === 'Booking Created' || taskName === 'Initial Payment Submitted') {
      return;
    }

    setTogglingTaskId(taskName);

    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/toggle-task`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ taskName }),
      });

      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      } else {
        alert(data.message || 'Failed to toggle task');
      }
    } catch (err) {
      console.error('Error toggling task:', err);
      alert('Connection error');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          feedbackRating: Number(feedbackRating),
          feedbackComment: feedbackComment
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
        alert('Feedback updated successfully!');
      } else {
        alert(data.message || 'Failed to save feedback');
      }
    } catch (err) {
      console.error('Error saving feedback:', err);
      alert('Connection error while saving feedback');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleProfitMarginSave = async (val) => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${booking._id}/edit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ profitMargin: Number(val) }),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data.data);
      }
    } catch (err) {
      console.error('Error saving profit margin:', err);
    }
  };

  const getFilteredPayments = () => {
    if (!booking || !booking.payments) return [];
    if (paymentSourceFilter === 'ALL') return booking.payments;
    return booking.payments.filter((p) => p.paymentFrom === paymentSourceFilter);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDaysRemaining = (startDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diffTime = start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Construct Activity Logs dynamically
  const getActivityLog = () => {
    if (!booking) return [];
    const logs = [];

    logs.push({
      id: 'created',
      taskName: 'Booking Created',
      updatedBy: booking.createdBy?.name || 'Auto',
      timestamp: booking.createdAt,
      completed: true,
    });

    logs.push({
      id: 'initial-payment',
      taskName: 'Initial Payment Submitted',
      updatedBy: booking.createdBy?.name || 'Auto',
      timestamp: booking.createdAt,
      completed: true,
    });

    const hasMilestones = ['Booked', 'Confirmed', 'Payment Done', 'Partial Payment'].includes(booking.status);
    logs.push({
      id: 'mail-sent',
      taskName: 'Mail Confirmation Sent',
      updatedBy: 'System / Auto',
      timestamp: booking.updatedAt || booking.createdAt,
      completed: hasMilestones,
    });

    logs.push({
      id: 'whatsapp-sent',
      taskName: 'WhatsApp Details Shared',
      updatedBy: 'System / Auto',
      timestamp: booking.updatedAt || booking.createdAt,
      completed: hasMilestones,
    });

    if (booking.comments) {
      booking.comments.forEach((comment) => {
        const isSystem = comment.senderName && comment.senderName.startsWith('System');
        if (isSystem) {
          const parts = comment.senderName.split('/');
          const updatedBy = parts[1] ? parts[1].trim() : 'Auto';
          
          let taskLabel = comment.message;
          if (comment.message.includes('Payment Updated')) {
            taskLabel = 'Payment Updated';
          }
          
          logs.push({
            id: comment._id,
            taskName: taskLabel,
            updatedBy: `System / ${updatedBy}`,
            timestamp: comment.timestamp,
            completed: true,
          });
        }
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium">Loading Booking Details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-100 mb-2">Error Loading Details</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'Booking record could not be loaded.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCreator = booking?.createdBy && (booking.createdBy._id || booking.createdBy) === user?.id;
  const isAssigned = booking?.assignedTo && booking.assignedTo.some(emp => (emp._id || emp) === user?.id);
  const isAdmin = user?.role === 'admin';
  const canEdit = isAdmin || isCreator || isAssigned;

  const assignedIds = booking.assignedTo?.map((u) => (u._id || u).toString()) || [];
  const unassignedEmployees = employees.filter(
    (emp) => !assignedIds.includes(emp._id.toString())
  );

  const totalAmount = booking.totalAmount || 0;
  const paidAmount = booking.paidAmount || 0;
  const dueAmount = booking.dueAmount || 0;
  const paidPercent = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 105) > 100 ? 100 : Math.round((paidAmount / totalAmount) * 100) : 0;
  const duePercent = totalAmount > 0 ? 100 - paidPercent : 0;
  const daysDiff = calculateDaysRemaining(booking.startDate);

  // Tabs structure
  const tabs = [
    { id: 'overview', name: 'BOOKING OVERVIEW' },
    { id: 'traveler', name: 'TRAVELER DETAILS' },
    { id: 'payments', name: 'PAYMENTS & RECEIPTS' },
    { id: 'comments', name: 'COMMENTS & UPDATES' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto animate-fadeIn font-sans space-y-8">
        
        {/* 1. Header & Primary Info Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-100 border border-slate-800 transition-colors cursor-pointer animate-pulse"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Left: Booking ID in a white badge */}
              <span className="bg-slate-900 text-slate-100 px-4 py-2 rounded-lg font-mono font-extrabold text-sm md:text-base shadow-sm border border-slate-800">
                {booking.bookingId}
              </span>
              
              {/* Center: Booking Status Dropdown */}
              {canEdit ? (
                <div className="relative flex items-center">
                  <select
                    value={booking.status || 'Pending'}
                    onChange={(e) => handleStatusChange({ target: { value: e.target.value } })}
                    disabled={updatingStatus}
                    className={`text-xs md:text-sm font-extrabold px-4 py-2 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00A89E]/50 bg-slate-900 transition-all ${
                      getStatusStyles(booking.status)
                    }`}
                  >
                    <option value="Pending" className="bg-slate-900 text-amber-500">Pending</option>
                    <option value="Fulfillment Done" className="bg-slate-900 text-[#00A89E]">Fulfillment Done</option>
                    <option value="Trip Completed" className="bg-slate-900 text-emerald-500">Trip Completed</option>
                    <option value="No Refund" className="bg-slate-900 text-slate-400">No Refund</option>
                    <option value="Refund Required" className="bg-slate-900 text-rose-500">Refund Required</option>
                    <option value="Refund Done" className="bg-slate-900 text-blue-500">Refund Done</option>
                    {!['Pending', 'Fulfillment Done', 'Trip Completed', 'No Refund', 'Refund Required', 'Refund Done'].includes(booking.status) && booking.status && (
                      <option value={booking.status} className="bg-slate-900 text-slate-400">{booking.status} (Legacy)</option>
                    )}
                  </select>
                  {updatingStatus && (
                    <span className="ml-2 w-4 h-4 border-2 border-[#00A89E] border-t-transparent rounded-full animate-spin"></span>
                  )}
                </div>
              ) : (
                <span className={`text-xs md:text-sm font-extrabold px-4 py-2 rounded-full border ${
                  getStatusStyles(booking.status)
                }`}>
                  {booking.status}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap md:justify-end">
            {canEdit && (
              <button
                onClick={openFullEditModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-extrabold uppercase rounded-lg shadow transition-colors cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Booking</span>
              </button>
            )}

            {/* Right: Service Date Badge */}
            <span className="bg-slate-900 text-slate-300 border border-slate-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>{formatDate(booking.startDate)} — {formatDate(booking.endDate)}</span>
            </span>
          </div>

        </div>

        {/* Secondary Info Bar (Horizontal) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Traveller Name</label>
            <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold truncate shadow-inner">
              {booking.travellerName}
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Travellers</label>
            <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold shadow-inner">
              {booking.adults || 0} Adult{booking.adults !== 1 && 's'} + {booking.children || 0} Child{booking.children !== 1 && 'ren'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Package Cost</label>
            <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold shadow-inner">
              ₹{totalAmount.toLocaleString()}
            </div>
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Paid Amount</label>
            <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold shadow-inner">
              ₹{paidAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Tabbed Navigation System */}
        <div className="flex overflow-x-auto border-b border-slate-850 gap-3 scrollbar-none pb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-5 py-4 text-xs md:text-sm font-extrabold tracking-wider border-b-2 transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-[#00A89E] text-[#00A89E]'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-800'
                }`}
              >
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        <div className="mt-6">
          
          {/* TAB 1: BOOKING OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Column 1: Package Details Card */}
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-lg shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">Package Details</h3>
                  
                  {/* Separate Edit Toggle for Package */}
                  <div className="flex items-center gap-2">
                    {isEditingPackage ? (
                      <>
                        <button
                          onClick={handleSavePackage}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingPackage(false)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      canEdit && (
                        <button
                          onClick={startEditingPackage}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-extrabold uppercase transition-colors inline-flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Package Name</label>
                    {isEditingPackage ? (
                      <input
                        type="text"
                        value={packageFields.packageName}
                        onChange={(e) => setPackageFields({ ...packageFields, packageName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm md:text-base focus:outline-none transition-colors"
                      />
                    ) : (
                      <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold shadow-inner">
                        {booking.packageName}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Destination Location</label>
                    {isEditingPackage ? (
                      <input
                        type="text"
                        value={packageFields.location}
                        onChange={(e) => setPackageFields({ ...packageFields, location: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm md:text-base focus:outline-none transition-colors"
                      />
                    ) : (
                      <div className="bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold shadow-inner">
                        {booking.location}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Booked On</label>
                      <div className="text-xs md:text-sm text-slate-300 font-semibold font-mono">
                        {new Date(booking.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Booked Method</label>
                      <div className="text-xs md:text-sm text-indigo-400 font-extrabold">
                        {dueAmount === 0 ? 'Full Payment' : 'Partial Payment'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned To Section */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <label className="text-xs md:text-sm font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Team Members</label>
                  
                  {!booking.assignedTo || booking.assignedTo.length === 0 ? (
                    <p className="text-xs md:text-sm text-slate-500 italic bg-slate-950 border border-slate-800/60 p-3 rounded-lg">
                      No employees assigned to see/manage this booking.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl max-h-[140px] overflow-y-auto">
                      {booking.assignedTo.map((emp) => (
                        <div
                          key={emp._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold"
                        >
                          <span>{emp.name}</span>
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleRemoveEmployee(emp._id)}
                              disabled={assigning}
                              className="p-0.5 rounded hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors cursor-pointer"
                              title="Remove assignment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {user?.role === 'admin' && (
                    <div className="space-y-2">
                      <select
                        onChange={handleAddEmployee}
                        disabled={assigning || unassignedEmployees.length === 0}
                        defaultValue=""
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl text-xs md:text-sm text-slate-300 font-semibold focus:outline-none transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <option value="" disabled>
                          {unassignedEmployees.length === 0
                            ? 'All verified employees assigned'
                            : 'Select employee to assign...'}
                        </option>
                        {unassignedEmployees.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.name} ({emp.email})
                          </option>
                        ))}
                      </select>
                      {assigning && (
                        <span className="text-xs text-indigo-500 animate-pulse block">Saving Assignment...</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Service Date & Feedback Card */}
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-lg shadow-sm space-y-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">Service Date & Schedule</h3>
                    
                    {/* Inline Edit Trigger for Dates */}
                    <div className="flex items-center gap-2">
                      {isEditingServices ? (
                        <>
                          <button
                            onClick={handleSaveServices}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setIsEditingServices(false)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        canEdit && (
                          <button
                            onClick={startEditingServices}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-extrabold uppercase transition-colors inline-flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Service Date Input Box */}
                  {isEditingServices ? (
                    <div className="space-y-4 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                      <div>
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Departure Date</label>
                        <input
                          type="date"
                          value={servicesFields.startDate}
                          onChange={(e) => setServicesFields({ ...servicesFields, startDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Return Date</label>
                        <input
                          type="date"
                          value={servicesFields.endDate}
                          onChange={(e) => setServicesFields({ ...servicesFields, endDate: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-5 rounded-xl flex flex-col gap-2 shadow-inner">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-rose-500" />
                        <span className="font-extrabold text-xs md:text-sm uppercase tracking-wider text-rose-400">Scheduled Service Date</span>
                      </div>
                      <div className="text-sm md:text-base font-extrabold text-slate-100 mt-1">
                        {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
                      </div>
                      
                      {/* Days Remaining Logic */}
                      <div className="text-xl md:text-2xl font-extrabold mt-1 text-rose-500">
                        {daysDiff > 0 ? `-${daysDiff} days remaining` : daysDiff === 0 ? 'Starts today' : `${Math.abs(daysDiff)} days ago`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Feedback rating dropdown & comment box */}
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <label className="text-xs md:text-sm font-extrabold text-slate-400 uppercase tracking-wider block">Customer Feedback</label>
                  
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rating</span>
                    <select
                      value={feedbackRating}
                      onChange={(e) => setFeedbackRating(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl text-xs md:text-sm text-slate-205 font-bold focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5 Stars - Excellent)</option>
                      <option value="4">⭐⭐⭐⭐ (4 Stars - Very Good)</option>
                      <option value="3">⭐⭐⭐ (3 Stars - Good)</option>
                      <option value="2">⭐⭐ (2 Stars - Fair)</option>
                      <option value="1">⭐ (1 Star - Poor)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Detailed Review</span>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Write customer's detailed review here..."
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl text-xs md:text-sm text-slate-300 font-medium focus:outline-none transition-colors resize-none placeholder-slate-600"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={savingFeedback}
                    onClick={handleSaveFeedback}
                    className="w-full py-2.5 px-4 bg-[#00A89E] hover:bg-[#008F87] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {savingFeedback ? 'Saving...' : 'Save Feedback'}
                  </button>
                </div>
              </div>

              {/* Column 3: Financials & Status Table */}
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-lg shadow-sm space-y-6 lg:col-span-1 flex flex-col justify-between">
                <div className="space-y-6 w-full">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-300">Financials & Activity Log</h3>
                  </div>

                  {/* Financial 3-Mini Cards Top Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg flex flex-col justify-between shadow-inner">
                      <span className="text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total</span>
                      <span className="text-xs md:text-sm font-extrabold text-slate-300 mt-1.5 font-mono">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-lg flex flex-col justify-between relative shadow-inner">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Paid</span>
                        <span className="text-[9px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">{paidPercent}%</span>
                      </div>
                      <span className="text-xs md:text-sm font-extrabold text-blue-600 dark:text-blue-300 mt-1.5 font-mono">₹{paidAmount.toLocaleString()}</span>
                    </div>

                    <div className={`p-3.5 rounded-lg border flex flex-col justify-between relative shadow-inner ${dueAmount === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] md:text-xs font-extrabold uppercase tracking-wider ${dueAmount === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Due</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${dueAmount === 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{duePercent}%</span>
                      </div>
                      <span className={`text-xs md:text-sm font-extrabold mt-1.5 font-mono ${dueAmount === 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>₹{dueAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* System Activity Audit Log Card */}
                  <div className="bg-[#FCF8F4] border border-orange-100 rounded-xl overflow-hidden shadow-sm p-5 space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-orange-100/50">
                      <span className="text-sm font-extrabold uppercase tracking-wider text-[#1A1A1A]">SYSTEM ACTIVITY AUDIT LOG</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wide uppercase border border-emerald-100/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        Live Status
                      </span>
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-orange-100/40 text-[10px] md:text-xs uppercase font-extrabold text-[#7D8C93]/80">
                            <th className="py-2.5 px-3 w-12 text-center">OK</th>
                            <th className="py-2.5 px-3">Task Name</th>
                            <th className="py-2.5 px-3 text-right">By</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-100/20">
                          {(booking.tasks || []).map((task) => {
                            const isSystemTask = task.taskName === 'Booking Created' || task.taskName === 'Initial Payment Submitted';
                            const isClickable = canEdit && !isSystemTask;
                            
                            return (
                              <tr key={task._id || task.taskName} className="text-xs text-[#1A1A1A] hover:bg-orange-50/30 transition-colors">
                                <td className="py-3 px-3 text-center">
                                  <button
                                    type="button"
                                    disabled={!isClickable || togglingTaskId === task.taskName}
                                    onClick={() => handleToggleTask(task.taskName)}
                                    className={`inline-flex items-center justify-center p-1 rounded-md transition-all ${
                                      isClickable ? 'cursor-pointer hover:bg-orange-100/40' : 'cursor-not-allowed opacity-85'
                                    }`}
                                    title={isSystemTask ? "System log cannot be changed" : !canEdit ? "No permission to edit" : "Toggle task completion"}
                                  >
                                    {task.isCompleted ? (
                                      <svg className="w-5 h-5 text-[#00A89E] stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-5 h-5 text-rose-500 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3 font-bold text-[#1A1A1A] text-left">
                                  {task.taskName}
                                </td>
                                <td className="py-3 px-3 text-right font-semibold text-[#7D8C93]">
                                  {task.isCompleted ? task.updatedBy || 'System' : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TRAVELER DETAILS */}
          {activeTab === 'traveler' && (
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-lg shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-300">Traveller Information</h3>
                
                {/* Localized Edit Trigger for Traveler Info */}
                <div className="flex items-center gap-2">
                  {isEditingTraveler ? (
                    <>
                      <button
                        onClick={handleSaveTraveler}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingTraveler(false)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold uppercase transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    canEdit && (
                      <button
                        onClick={startEditingTraveler}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-extrabold uppercase transition-colors inline-flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Full Name</label>
                  {isEditingTraveler ? (
                    <input
                      type="text"
                      value={travelerFields.travellerName}
                      onChange={(e) => setTravelerFields({ ...travelerFields, travellerName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm md:text-base focus:outline-none transition-colors"
                    />
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold truncate shadow-inner">
                      {booking.travellerName}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
                  {isEditingTraveler ? (
                    <input
                      type="email"
                      value={travelerFields.travellerEmail}
                      onChange={(e) => setTravelerFields({ ...travelerFields, travellerEmail: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm md:text-base focus:outline-none transition-colors"
                    />
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold flex items-center gap-1.5 font-mono shadow-inner">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>{booking.travellerEmail}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs md:text-sm font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Phone Number</label>
                  {isEditingTraveler ? (
                    <input
                      type="text"
                      value={travelerFields.travellerPhone}
                      onChange={(e) => setTravelerFields({ ...travelerFields, travellerPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-4 py-2.5 text-slate-100 text-sm md:text-base focus:outline-none transition-colors"
                    />
                  ) : (
                    <div className="bg-slate-950 border border-slate-800 text-slate-205 rounded-lg px-4 py-2.5 text-sm md:text-base font-semibold flex items-center gap-1.5 shadow-inner">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{booking.travellerPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Adults & Children Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-850">
                <div className="flex items-center space-x-4 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Adults</p>
                    {isEditingTraveler ? (
                      <input
                        type="number"
                        min="0"
                        value={travelerFields.adults}
                        onChange={(e) => setTravelerFields({ ...travelerFields, adults: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-3 py-1 text-slate-100 text-sm focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm md:text-base font-bold text-slate-100">{booking.adults || 0} Adults</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-inner">
                  <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Children</p>
                    {isEditingTraveler ? (
                      <input
                        type="number"
                        min="0"
                        value={travelerFields.children}
                        onChange={(e) => setTravelerFields({ ...travelerFields, children: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-2 focus:ring-[#00A89E]/50 rounded-xl px-3 py-1 text-slate-100 text-sm focus:outline-none"
                      />
                    ) : (
                      <p className="text-sm md:text-base font-bold text-slate-100">{booking.children || 0} Children</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS & RECEIPTS (Replicating exact layout of Screenshot 2) */}
          {activeTab === 'payments' && (
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-lg shadow-sm space-y-6">
              {/* Header section with add manual payment button & profit margin input */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={openAddPaymentModal}
                    className="px-4 py-2 bg-[#E65F00] hover:bg-[#c25000] text-white text-xs font-bold uppercase rounded shadow transition-colors cursor-pointer"
                  >
                    ADD MANUAL PAYMENT
                  </button>
                </div>

                {/* Profit Margin controls */}
                <div className="flex items-center gap-2 bg-slate-900 p-2 border border-slate-800 rounded-lg">
                  <span className="text-xs font-extrabold text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                    Profit Margin: {booking.profitMargin || 0}
                  </span>
                  <span className="text-slate-400 text-xs font-bold">→</span>
                  <input
                    type="number"
                    value={profitMarginInput}
                    onChange={(e) => setProfitMarginInput(e.target.value)}
                    onBlur={() => handleProfitMarginSave(profitMarginInput)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleProfitMarginSave(profitMarginInput);
                    }}
                    placeholder="Profit Margin"
                    className="w-20 bg-slate-950 border border-slate-800 focus:border-[#00A89E] rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none"
                    title="Press Enter or click outside to save"
                  />
                </div>
              </div>

              {/* Title & Filter pills: ALL, TRAVELER, COMPANY */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-205">Payments related to Traveler</h3>
                  <div className="flex items-center gap-2.5 mt-2">
                    <span className="text-xs font-extrabold text-slate-400 uppercase">From</span>
                    <button
                      onClick={() => setPaymentSourceFilter('ALL')}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                        paymentSourceFilter === 'ALL'
                          ? 'bg-[#E65F00] text-white border-[#E65F00]'
                          : 'border-[#E65F00] text-[#E65F00] hover:bg-[#E65F00]/10'
                      }`}
                    >
                      ALL
                    </button>
                    <button
                      onClick={() => setPaymentSourceFilter('TRAVELER')}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                        paymentSourceFilter === 'TRAVELER'
                          ? 'bg-[#E65F00] text-white border-[#E65F00]'
                          : 'border-[#E65F00] text-[#E65F00] hover:bg-[#E65F00]/10'
                      }`}
                    >
                      TRAVELER
                    </button>
                    <button
                      onClick={() => setPaymentSourceFilter('COMPANY')}
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${
                        paymentSourceFilter === 'COMPANY'
                          ? 'bg-[#E65F00] text-white border-[#E65F00]'
                          : 'border-[#E65F00] text-[#E65F00] hover:bg-[#E65F00]/10'
                      }`}
                    >
                      COMPANY
                    </button>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-850 text-xs uppercase font-extrabold text-slate-500 bg-slate-900">
                        <th className="py-3 px-4">ID</th>
                        <th className="py-3 px-3">Payment Date</th>
                        <th className="py-3 px-3">From/To</th>
                        <th className="py-3 px-3">Amount Paid</th>
                        <th className="py-3 px-3">Mode</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Added By</th>
                        <th className="py-3 px-3">Attachment</th>
                        <th className="py-3 px-3">Details</th>
                        <th className="py-3 px-3 text-center">Verified</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {getFilteredPayments().length === 0 ? (
                        <tr>
                          <td colSpan="11" className="py-8 text-center text-slate-500 italic">
                            No payment records found.
                          </td>
                        </tr>
                      ) : (
                        getFilteredPayments().map((p) => (
                          <tr key={p._id || p.paymentId} className="text-xs text-slate-300 hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-400">{p.paymentId}</td>
                            <td className="py-3.5 px-3 font-semibold">{formatDate(p.paymentDate)}</td>
                            <td className="py-3.5 px-3 font-semibold text-slate-205">{p.paymentFrom} to {p.paymentTo}</td>
                            <td className="py-3.5 px-3 font-extrabold text-slate-100 font-mono">₹{p.amountPaid.toLocaleString()}</td>
                            <td className="py-3.5 px-3 font-semibold text-indigo-500 uppercase">{p.paymentMode}</td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold border ${
                                p.status === 'VERIFIED' || p.status === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                                  : p.status === 'REJECTED' || p.status === 'DISAPPROVED'
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 font-semibold text-slate-400">{p.addedBy}</td>
                            <td className="py-3.5 px-3">
                              {p.attachment ? (
                                <button
                                  onClick={() => setSelectedScreenshot(p.attachment)}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                                >
                                  OPEN
                                </button>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-mono text-[11px] max-w-[150px] truncate" title={p.details}>
                              {p.details}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              {p.verified || p.status === 'VERIFIED' || p.status === 'PAID' ? (
                                <Check className="w-4 h-4 text-emerald-500 mx-auto stroke-[2.5]" />
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex flex-col md:flex-row items-center justify-center gap-1.5">
                                {canEdit && (
                                  <button
                                    onClick={() => openEditPayment(p)}
                                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                  >
                                    EDIT
                                  </button>
                                )}
                                {user?.role === 'admin' && p.status === 'VERIFICATION-REQUIRED' && (
                                  <>
                                    <button
                                      onClick={() => handleVerifyPayment(p.paymentId, 'VERIFIED')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                    >
                                      Verify
                                    </button>
                                    <button
                                      onClick={() => handleVerifyPayment(p.paymentId, 'REJECTED')}
                                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom placeholder: Payments related to Service */}
                <div className="pt-6 border-t border-slate-850">
                  <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">Payments related to Service</h3>
                  <p className="text-xs text-slate-600 italic mt-1">No services payments recorded.</p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: COMMENTS & UPDATES */}
          {activeTab === 'comments' && (
            <div className="h-full min-h-[480px]">
              <CommentSection
                booking={booking}
                token={token}
                onCommentAdded={(updatedBooking) => setBooking(updatedBooking)}
              />
            </div>
          )}

        </div>

      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative bg-slate-900 border border-slate-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 font-sans">Verification Screenshot</h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 bg-slate-950 flex justify-center items-center overflow-auto max-h-[70vh]">
              <img
                src={selectedScreenshot.startsWith('data:') ? selectedScreenshot : `${API_BASE}/${selectedScreenshot}`}
                alt="Verification Receipt"
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
            <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-500 font-sans">
              Uploaded at booking time. Keep for audit clearance record.
            </div>
          </div>
        </div>
      )}

      {/* 2. Manual Payment Entry Modal (Replicating exact layout of Screenshot 1) */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg max-w-md w-full p-6 relative shadow-2xl animate-scaleUp">
            
            {/* Close Button */}
            <button
              onClick={() => setIsAddPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-205 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-lg font-bold text-slate-200 text-center mb-6 border-b border-slate-800 pb-2">
              {editingPayment ? 'Edit Payment Entry' : 'Manual Payment Entry'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handlePaymentFormSubmit} className="space-y-4">
              
              {/* Amount Paid * */}
              <div>
                <input
                  type="number"
                  required
                  disabled={!!editingPayment}
                  placeholder="Amount Paid *"
                  value={formAmountPaid}
                  onChange={(e) => setFormAmountPaid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E65F00] focus:ring-1 focus:ring-[#E65F00] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors disabled:bg-slate-900 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <select
                  value={formPaymentMode}
                  onChange={(e) => setFormPaymentMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E65F00] focus:ring-1 focus:ring-[#E65F00] rounded px-3.5 py-2 text-slate-300 text-sm focus:outline-none transition-colors"
                >
                  <option value="" disabled>Payment Mode</option>
                  <option value="upi">upi</option>
                  <option value="cash">cash</option>
                  <option value="bank transfer">bank transfer</option>
                  <option value="credit card">credit card</option>
                  <option value="wallet">wallet</option>
                </select>
              </div>

              {/* Payment Date * */}
              <div className="relative">
                <label className="absolute -top-2 left-2.5 bg-slate-900 px-1 text-[10px] text-slate-550 font-semibold">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={formPaymentDate}
                  onChange={(e) => setFormPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E65F00] focus:ring-1 focus:ring-[#E65F00] rounded px-3.5 py-2 text-slate-100 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Payment from */}
              <div className="relative">
                <label className="absolute -top-2 left-2.5 bg-slate-900 px-1 text-[10px] text-slate-550 font-semibold">
                  Payment from
                </label>
                <select
                  value={formPaymentFrom}
                  onChange={(e) => setFormPaymentFrom(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E65F00] focus:ring-1 focus:ring-[#E65F00] rounded px-3.5 py-2 text-slate-300 text-sm focus:outline-none transition-colors"
                >
                  <option value="TRAVELER">TRAVELER</option>
                  <option value="COMPANY">COMPANY</option>
                </select>
              </div>

              {/* Payment To */}
              <div className="relative">
                <label className="absolute -top-2 left-2.5 bg-slate-900 px-1 text-[10px] text-slate-550 font-semibold">
                  Payment To
                </label>
                <select
                  value={formPaymentTo}
                  onChange={(e) => setFormPaymentTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E65F00] focus:ring-1 focus:ring-[#E65F00] rounded px-3.5 py-2 text-slate-300 text-sm focus:outline-none transition-colors"
                >
                  <option value="COMPANY">COMPANY</option>
                  <option value="TRAVELER">TRAVELER</option>
                </select>
              </div>

              {/* Transaction Details (with character counter) * */}
              <div>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder={`Transaction Details (${formDetails.length}/200) *`}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-[#E65F00] focus:ring-1 focus:ring-[#E65F00] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* Attachment block */}
              <div className="border border-slate-800 rounded p-3 bg-slate-950/50">
                <span className="text-[10px] text-slate-500 font-semibold block mb-1">Attachment</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setFormAttachment(file);
                    if (file) setFormAttachmentName(file.name);
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-800 file:text-xs file:font-semibold file:bg-slate-900 file:text-slate-300 hover:file:bg-slate-800 file:cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="Enter File name"
                  value={formAttachmentName}
                  onChange={(e) => setFormAttachmentName(e.target.value)}
                  className="w-full mt-2 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-100 text-xs focus:outline-none"
                />
              </div>

              {/* If editing, allow changing transaction status */}
              {editingPayment && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Transaction Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    disabled={user?.role !== 'admin'}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3.5 py-2 text-slate-300 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="VERIFICATION-REQUIRED">VERIFICATION-REQUIRED</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="PAID">PAID</option>
                    <option value="DISAPPROVED">DISAPPROVED</option>
                  </select>
                </div>
              )}

              {/* SUBMIT Button (Solid red) */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="w-full py-3 bg-[#d32f2f] hover:bg-[#b71c1c] text-white font-extrabold uppercase rounded shadow transition-colors text-sm cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </div>

              {/* Bottom option: Payment By Wallet */}
              <div className="pt-2 border-t text-center">
                <button
                  type="button"
                  onClick={() => alert('Mock: Payment by Wallet selected')}
                  className="text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors uppercase cursor-pointer"
                >
                  Payment By Wallet
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* --- Full Booking Edit Modal --- */}
      {isFullEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-lg max-w-2xl w-full p-6 relative shadow-2xl animate-scaleUp">
            
            {/* Close Button */}
            <button
              onClick={() => setIsFullEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-205 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-lg font-bold text-slate-200 text-center mb-6 border-b border-slate-800 pb-2">
              Full Booking Edit
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-red-50/10 border border-red-500/20 text-red-500 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFullEditSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Column 1: Traveler Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-[#00A89E] uppercase tracking-wider border-b border-slate-800 pb-1">
                    Traveler Details
                  </h4>
                  
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Traveller Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Traveller Name"
                      value={fullEditName}
                      onChange={(e) => setFullEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Traveller Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Traveller Email"
                      value={fullEditEmail}
                      onChange={(e) => setFullEditEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Traveller Phone
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Traveller Phone"
                      value={fullEditPhone}
                      onChange={(e) => setFullEditPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Adults
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={fullEditAdults}
                        onChange={(e) => setFullEditAdults(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Children
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={fullEditChildren}
                        onChange={(e) => setFullEditChildren(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 text-sm focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                </div>

                {/* Column 2: Package & Services Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-extrabold text-[#00A89E] uppercase tracking-wider border-b border-slate-800 pb-1">
                    Package & Schedule Details
                  </h4>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Package Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Package Name"
                      value={fullEditPackageName}
                      onChange={(e) => setFullEditPackageName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Destination Location
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Destination Location"
                      value={fullEditLocation}
                      onChange={(e) => setFullEditLocation(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={fullEditStartDate}
                        onChange={(e) => setFullEditStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={fullEditEndDate}
                        onChange={(e) => setFullEditEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Package Cost (Total Amount) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="Package Cost"
                      value={fullEditTotalAmount}
                      onChange={(e) => setFullEditTotalAmount(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00A89E] focus:ring-1 focus:ring-[#00A89E] rounded px-3.5 py-2 text-slate-100 text-sm focus:outline-none transition-colors"
                    />
                  </div>

                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFullEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-205 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 py-2 bg-[#d32f2f] hover:bg-[#b71c1c] text-white font-extrabold uppercase rounded shadow transition-colors text-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};


export default BookingDetails;
