const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect, verifiedOnly, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/multerConfig');

// Helper: Check if a transaction ID already exists anywhere in the database
// Searches both Booking.transactionId and all Booking.payments[].details fields
async function isTransactionIdDuplicate(txnId, excludeBookingId = null) {
  const trimmedTxn = txnId.trim();
  if (!trimmedTxn) return false;

  const query = {
    $or: [
      { transactionId: trimmedTxn },
      { 'payments.details': trimmedTxn }
    ]
  };

  // Optionally exclude a specific booking (for edits within the same booking)
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existing = await Booking.findOne(query).select('_id bookingId').lean();
  return existing;
}

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private & Verified
router.post('/', protect, verifiedOnly, upload.single('screenshot'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      packageName,
      location,
      totalAmount,
      paidAmount,
      transactionId,
      paymentMode,
      travellerName,
      travellerEmail,
      travellerPhone,
      adults,
      children,
    } = req.body;

    // Validation for adults and children
    if (adults === undefined || adults === '') {
      return res.status(400).json({ success: false, message: 'Number of adults is required' });
    }
    if (children === undefined || children === '') {
      return res.status(400).json({ success: false, message: 'Number of children is required' });
    }

    // Check if screenshot file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a transaction screenshot' });
    }

    // Check for duplicate transaction ID across the entire system
    if (transactionId && transactionId.trim()) {
      const duplicateBooking = await isTransactionIdDuplicate(transactionId);
      if (duplicateBooking) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID "${transactionId.trim()}" already exists in booking ${duplicateBooking.bookingId}. Each transaction ID must be unique.`
        });
      }
    }

    // Cloudinary secure URL is stored in req.file.path
    const screenshotPath = req.file.path;

    // Create booking
    const booking = new Booking({
      startDate,
      endDate,
      packageName,
      location,
      totalAmount: Number(totalAmount),
      // The submitted amount is a payment claim until an admin verifies it.
      // Never expose it as paid at booking creation time.
      paidAmount: 0,
      transactionId,
      screenshot: screenshotPath,
      travellerName,
      travellerEmail,
      travellerPhone,
      createdBy: req.user._id,
      status: 'Pending',
      tripStatus: 'Pending',
      adults: Number(adults),
      children: Number(children),
    });

    // Populate initial payment details with creator agent name
    booking.payments = [{
      paymentId: `${100000 + Math.floor(Math.random() * 900000)}`,
      paymentDate: new Date(),
      paymentFrom: 'TRAVELER',
      paymentTo: 'COMPANY',
      amountPaid: Number(paidAmount),
      paymentMode: paymentMode || 'Kalpana BOI',
      status: 'VERIFICATION-REQUIRED',
      addedBy: req.user.name || 'Agent',
      attachment: screenshotPath,
      attachmentName: req.file.originalname,
      details: transactionId,
      verified: false,
      invoiceNumber: `INV-${booking.bookingId}`
    }];

    await booking.save();

    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private & Verified
router.get('/', protect, verifiedOnly, async (req, res) => {
  try {
    let query = {};

    // Employees can see bookings they created. Assigned employees can only see them if NOT Pending.
    if (req.user.role === 'employee') {
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id, status: { $ne: 'Pending' } }
      ];
    }

    const bookings = await Booking.find(query)
      .select('-screenshot -comments -payments')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Search bookings with filters and visibility logic
// @route   GET /api/bookings/search
// @access  Private & Verified
router.get('/search', protect, verifiedOnly, async (req, res) => {
  try {
    let query = {};
    const { bookingId, paymentId, travellerName, travellerPhone, transactionId, startDate, endDate, location, status, bookingDate } = req.query;

    if (bookingId) {
      query.bookingId = bookingId.trim();
    }
    if (paymentId) {
      query.paymentId = paymentId.trim();
    }
    if (travellerName) {
      query.travellerName = { $regex: travellerName.trim(), $options: 'i' };
    }
    if (travellerPhone) {
      query.travellerPhone = travellerPhone.trim();
    }
    if (transactionId) {
      query.transactionId = transactionId.trim();
    }
    if (location) {
      query.location = { $regex: location.trim(), $options: 'i' };
    }

    // Filter by booking creation date (createdAt)
    if (bookingDate) {
      const dayStart = new Date(bookingDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(bookingDate);
      dayEnd.setUTCHours(23, 59, 59, 999);
      query.createdAt = { $gte: dayStart, $lte: dayEnd };
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setUTCHours(0, 0, 0, 0);
        query.startDate.$gte = start;

        // If only startDate is provided (no endDate), match that specific day
        if (!endDate) {
          const startDayEnd = new Date(startDate);
          startDayEnd.setUTCHours(23, 59, 59, 999);
          query.startDate.$lte = startDayEnd;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.startDate.$lte = end;
      }
    }

    // Visibility Logic
    if (req.user.role === 'employee') {
      // Employees can see bookings they created. Assigned employees can only see them if NOT Pending.
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id, status: { $ne: 'Pending' } }
      ];
    } else if (req.user.role === 'admin' && status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .select('-screenshot -comments -payments')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Search bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all bookings that have payments in 'VERIFICATION-REQUIRED' status (Admin only)
// @route   GET /api/bookings/pending-payments
// @access  Private & Admin
router.get('/pending-payments', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ 'payments.status': 'VERIFICATION-REQUIRED' })
      .select('bookingId travellerName travellerEmail travellerPhone packageName location payments')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Extract all payments that are pending verification
    let pendingPayments = [];
    bookings.forEach(booking => {
      booking.payments.forEach(payment => {
        if (payment.status === 'VERIFICATION-REQUIRED') {
          pendingPayments.push({
            bookingObjectId: booking._id,
            bookingId: booking.bookingId,
            travellerName: booking.travellerName,
            packageName: booking.packageName,
            location: booking.location,
            paymentId: payment.paymentId || payment._id,
            _id: payment._id,
            paymentDate: payment.paymentDate,
            paymentFrom: payment.paymentFrom,
            paymentTo: payment.paymentTo,
            amountPaid: payment.amountPaid,
            paymentMode: payment.paymentMode,
            status: payment.status,
            addedBy: payment.addedBy,
            attachment: payment.attachment,
            attachmentName: payment.attachmentName,
            details: payment.details
          });
        }
      });
    });

    // Sort by payment date descending
    pendingPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

    res.json({
      success: true,
      count: pendingPayments.length,
      data: pendingPayments,
    });
  } catch (error) {
    console.error('Get pending payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all pending bookings (Admin only)
// @route   GET /api/bookings/pending
// @access  Private & Admin
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'Pending' })
      .select('-screenshot -comments -payments')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error('Get pending bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Confirm booking (Admin only)
// @route   PATCH /api/bookings/confirm/:id
// @access  Private & Admin
router.patch('/confirm/:id', protect, adminOnly, async (req, res) => {
  try {
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'Confirmed' },
      { new: true, runValidators: true }
    );

    if (!updatedBooking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Reject booking (Admin only)
// @route   PATCH /api/bookings/reject/:id
// @access  Private & Admin
router.patch('/reject/:id', protect, adminOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking rejected successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Reject booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Assign booking to employees (Admin only)
// @route   PATCH /api/bookings/assign/:id
// @access  Private & Admin
router.patch('/assign/:id', protect, adminOnly, async (req, res) => {
  try {
    const { employeeIds } = req.body;
    if (!employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({ success: false, message: 'employeeIds array is required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.assignedTo = employeeIds;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Booking assignment updated successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Assign booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update booking status only
// @route   PATCH /api/bookings/:id/status
// @access  Private & Verified
router.patch('/:id/status', protect, verifiedOnly, async (req, res) => {
  try {
    const { status, tripStatus, statusComment } = req.body;
    if (!status && !tripStatus) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permission check: Admin, Creator, or Assigned Employee
    const isCreator = booking.createdBy && booking.createdBy.toString() === req.user._id.toString();
    const isAssigned = booking.assignedTo && booking.assignedTo.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to update this booking status.' });
    }

    // Employees cannot change booking status — only admins can
    if (status && req.user.role === 'employee') {
      return res.status(403).json({ success: false, message: 'Access denied: Employees cannot change booking status.' });
    }

    // Once Confirmed, cannot go back to Pending
    if (status === 'Pending' && booking.status === 'Confirmed') {
      return res.status(400).json({ success: false, message: 'Cannot change a Confirmed booking back to Pending.' });
    }

    const bookingStatuses = ['Pending', 'Cancelled', 'On Hold', 'Confirmed', 'Partial Payment', 'Payment Done'];
    const tripStatuses = ['Pending', 'Fulfillment Done', 'Trip Completed', 'Postponed', 'Cash Refund', 'Wallet Refund', 'No Refund', 'Cash Refund Done', 'Wallet Refund Done'];

    if (status && !bookingStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid booking status value' });
    }
    if (tripStatus && !tripStatuses.includes(tripStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid trip status value' });
    }

    if (status) booking.status = status;
    if (tripStatus) booking.tripStatus = tripStatus;

    // Log every trip status change in comments
    if (tripStatus) {
      const commentRequiredStatuses = ['Postponed', 'Cash Refund', 'Wallet Refund', 'No Refund', 'Cash Refund Done', 'Wallet Refund Done'];
      if (commentRequiredStatuses.includes(tripStatus) && statusComment && statusComment.trim()) {
        booking.comments.push({
          senderName: `System / ${req.user.name}`,
          message: `Trip Status changed to "${tripStatus}": ${statusComment.trim()}`,
          timestamp: new Date()
        });
      } else {
        booking.comments.push({
          senderName: `System / ${req.user.name}`,
          message: `Trip Status changed to "${tripStatus}"`,
          timestamp: new Date()
        });
      }
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get booking payment screenshot
// @route   GET /api/bookings/id/:id/screenshot
// @access  Private & Verified
router.get('/id/:id/screenshot', protect, verifiedOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).select('screenshot');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permission check: Admin, Creator, or Assigned Employee
    const isCreator = booking.createdBy && booking.createdBy.toString() === req.user._id.toString();
    const isAssigned = booking.assignedTo && booking.assignedTo.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      screenshot: booking.screenshot,
    });
  } catch (error) {
    console.error('Get screenshot error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get booking by Booking ID slug
// @route   GET /api/bookings/:bookingId
// @access  Private & Verified
router.get('/:bookingId', protect, verifiedOnly, async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Employee access control:
    // - Pending bookings: NO employee can view (not even creator — must wait for payment approval)
    // - Confirmed/other statuses: only creator or assigned employees can view
    if (req.user.role === 'employee') {
      const isCreator = booking.createdBy && booking.createdBy._id.toString() === req.user._id.toString();
      const isAssigned = booking.assignedTo && booking.assignedTo.some(userObj => {
        const id = userObj._id || userObj;
        return id.toString() === req.user._id.toString();
      });
      
      const isPending = booking.status === 'Pending';

      // Pending bookings are not viewable by any employee (creator must wait for admin confirmation)
      if (isPending) {
        return res.status(403).json({ success: false, message: 'Get the Payment Approved & Booking Assigned to you to view the booking.' });
      }

      // Non-pending bookings: only creator or assigned employees can view
      if (!isCreator && !isAssigned) {
        return res.status(403).json({ success: false, message: 'Get the Payment Approved & Booking Assigned to you to view the booking.' });
      }
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Get single booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Add comment to a booking
// @route   PATCH /api/bookings/:id/comment
// @access  Private & Verified
router.patch('/:id/comment', protect, verifiedOnly, upload.single('file'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permission check for access: Admin, Creator, or Assigned Employee
    const isCreator = booking.createdBy && booking.createdBy.toString() === req.user._id.toString();
    const isAssigned = booking.assignedTo && booking.assignedTo.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied: You do not have access to this booking.' });
    }

    const { message } = req.body;
    if ((!message || !message.trim()) && !req.file) {
      return res.status(400).json({ success: false, message: 'Comment message or file attachment is required' });
    }

    let fileUrl = '';
    let fileName = '';
    let fileType = '';

    if (req.file) {
      fileUrl = req.file.path;
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }

    // Push comment
    booking.comments.push({
      sender: req.user._id,
      senderName: req.user.name,
      message: (message || '').trim(),
      fileUrl,
      fileName,
      fileType,
    });

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Edit a booking
// @route   PUT /api/bookings/:id/edit
// @access  Private & Verified
router.put('/:id/edit', protect, verifiedOnly, upload.single('screenshot'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permission check: Admin, Creator, or Assigned Employee
    const isCreator = booking.createdBy && booking.createdBy.toString() === req.user._id.toString();
    const isAssigned = booking.assignedTo && booking.assignedTo.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to edit this booking.' });
    }

    // Update fields
    const {
      startDate,
      endDate,
      packageName,
      location,
      totalAmount,
      paidAmount,
      transactionId,
      paymentMode,
      travellerName,
      travellerEmail,
      travellerPhone,
      adults,
      children,
      status,
      tripStatus,
      profitMargin,
      feedbackRating,
      feedbackComment,
    } = req.body;

    // Validate: startDate must not be later than endDate
    const effectiveStartDate = startDate ? new Date(startDate) : booking.startDate;
    const effectiveEndDate = endDate ? new Date(endDate) : booking.endDate;
    if (effectiveStartDate && effectiveEndDate && effectiveStartDate > effectiveEndDate) {
      return res.status(400).json({ success: false, message: 'Start Date cannot be later than End Date.' });
    }

    // Track service date changes for audit logging
    const oldStartDate = booking.startDate;
    const oldEndDate = booking.endDate;

    // Employees can only edit startDate and endDate (Service Date & Schedule)
    if (req.user.role === 'employee') {
      if (startDate) booking.startDate = startDate;
      if (endDate) booking.endDate = endDate;

      // Block all other field changes for employees
      const restrictedFields = ['packageName', 'location', 'totalAmount', 'paidAmount', 'transactionId',
        'paymentMode', 'travellerName', 'travellerEmail', 'travellerPhone', 'adults', 'children',
        'status', 'tripStatus', 'profitMargin', 'feedbackRating', 'feedbackComment'];
      const attemptedRestricted = restrictedFields.filter(f => req.body[f] !== undefined && req.body[f] !== '');
      if (attemptedRestricted.length > 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Employees can only edit Service Date & Schedule.'
        });
      }
    } else {
      // Admin: full edit access
      if (startDate) booking.startDate = startDate;
      if (endDate) booking.endDate = endDate;
      if (packageName) booking.packageName = packageName;
      if (location) booking.location = location;
      if (totalAmount !== undefined) booking.totalAmount = Number(totalAmount);
      if (paidAmount !== undefined) booking.paidAmount = Number(paidAmount);
      if (transactionId) booking.transactionId = transactionId;
      if (paymentMode && booking.payments?.length) booking.payments[0].paymentMode = paymentMode;
      if (travellerName) booking.travellerName = travellerName;
      if (travellerEmail) booking.travellerEmail = travellerEmail;
      if (travellerPhone) booking.travellerPhone = travellerPhone;
      
      if (adults !== undefined) booking.adults = Number(adults);
      if (children !== undefined) booking.children = Number(children);
      if (status) booking.status = status;
      if (tripStatus) booking.tripStatus = tripStatus;
      if (profitMargin !== undefined) booking.profitMargin = Number(profitMargin);
      if (feedbackRating !== undefined) booking.feedbackRating = Number(feedbackRating);
      if (feedbackComment !== undefined) booking.feedbackComment = feedbackComment;
    }

    // Audit log: Service Date changes
    const formatDateShort = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
    const startChanged = startDate && new Date(startDate).toISOString() !== new Date(oldStartDate).toISOString();
    const endChanged = endDate && new Date(endDate).toISOString() !== new Date(oldEndDate).toISOString();

    if (startChanged || endChanged) {
      let changeParts = [];
      if (startChanged) changeParts.push(`Departure: ${formatDateShort(oldStartDate)} → ${formatDateShort(startDate)}`);
      if (endChanged) changeParts.push(`Return: ${formatDateShort(oldEndDate)} → ${formatDateShort(endDate)}`);

      booking.comments.push({
        senderName: `System / ${req.user.name}`,
        message: `Service Date Updated — ${changeParts.join(' | ')}`,
        timestamp: new Date()
      });
    }

    // Handle optional screenshot upload (admin only)
    if (req.file && isAdmin) {
      booking.screenshot = req.file.path;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update booking payment details (Admin, Creator, or Assigned Employee)
// @route   PATCH /api/bookings/:id/update-payment
// @access  Private & Verified
router.patch('/:id/update-payment', protect, verifiedOnly, upload.single('screenshot'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permission check: Admin, Creator, or Assigned Employee
    const isCreator = booking.createdBy && booking.createdBy.toString() === req.user._id.toString();
    const isAssigned = booking.assignedTo && booking.assignedTo.some(id => id.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to update payment for this booking.' });
    }

    const { amount, transactionId, paymentDate, paymentFrom, paymentTo, paymentMode, attachmentName } = req.body;

    if (amount === undefined || amount === '') {
      return res.status(400).json({ success: false, message: 'Payment amount is required' });
    }

    const newPayment = Number(amount);
    if (isNaN(newPayment) || newPayment <= 0) {
      return res.status(400).json({ success: false, message: 'Payment amount must be a positive number' });
    }

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    // Check for duplicate transaction ID across the entire system
    const duplicateBooking = await isTransactionIdDuplicate(transactionId);
    if (duplicateBooking) {
      // Also check within the current booking's own payments
      const existsInCurrentBooking = booking.payments.some(p => p.details === transactionId.trim());
      const existsAsBookingTxn = booking.transactionId === transactionId.trim();
      if (duplicateBooking._id.toString() !== booking._id.toString() || existsInCurrentBooking || existsAsBookingTxn) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID "${transactionId.trim()}" already exists. Each transaction ID must be unique.`
        });
      }
    }

    // Only verified payments reduce the balance. paidAmount is normally kept
    // in sync by the model, but calculate from payment records here as an
    // additional guard against stale/legacy booking values.
    const verifiedAmount = booking.payments
      .filter(payment => payment.status === 'VERIFIED')
      .reduce((sum, payment) => sum + payment.amountPaid, 0);
    const currentDue = Math.max(0, booking.totalAmount - verifiedAmount);
    if (newPayment > currentDue) {
      return res.status(400).json({ success: false, message: `Payment amount ₹${newPayment} exceeds remaining due balance of ₹${currentDue}` });
    }

    let screenshotPath = '';
    if (req.file) {
      screenshotPath = req.file.path;
    }

    const newPaymentId = `${100000 + Math.floor(Math.random() * 900000)}`;

    const newPaymentItem = {
      paymentId: newPaymentId,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentFrom: paymentFrom || 'TRAVELER',
      paymentTo: paymentTo || 'COMPANY',
      amountPaid: newPayment,
      paymentMode: paymentMode || 'upi',
      status: 'VERIFICATION-REQUIRED',
      addedBy: req.user.name,
      attachment: screenshotPath || undefined,
      attachmentName: attachmentName || (req.file ? req.file.originalname : ''),
      details: transactionId.trim(),
      verified: false,
      invoiceNumber: `INV-${booking.bookingId}-${newPaymentId}`
    };

    booking.payments.push(newPaymentItem);

    // Dynamic pre-validate hook will ensure paidAmount and dueAmount do not update for unverified payments.

    // Automated System Comment Audit log indicating verification needed
    booking.comments.push({
      senderName: `System / ${req.user.name}`,
      message: `Payment Added (Verification Required): Added ₹${newPayment} (${newPaymentItem.paymentFrom} to ${newPaymentItem.paymentTo}) via ${newPaymentItem.paymentMode}. Transaction ID: ${newPaymentItem.details}. This payment requires Admin verification before updating the booking total.`,
      timestamp: new Date()
    });

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Edit a specific payment entry
// @route   PUT /api/bookings/:id/edit-payment/:paymentId
// @access  Private & Verified
router.put('/:id/edit-payment/:paymentId', protect, verifiedOnly, upload.single('screenshot'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permission check: Admin only
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied: Only admins are authorized to edit payments.' });
    }

    const { paymentId } = req.params;
    const paymentIndex = booking.payments.findIndex(p => p.paymentId === paymentId || p._id.toString() === paymentId);
    if (paymentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Payment entry not found' });
    }

    const payment = booking.payments[paymentIndex];
    const { amountPaid, paymentMode, paymentDate, paymentFrom, paymentTo, details, status, attachmentName } = req.body;

    // Recalculate paidAmount
    if (amountPaid !== undefined) {
      const oldAmount = payment.amountPaid;
      const newAmount = Number(amountPaid);
      if (oldAmount !== newAmount) {
        return res.status(400).json({ success: false, message: 'Paid amount cannot be modified once added.' });
      }
    }

    if (paymentMode) payment.paymentMode = paymentMode;
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (paymentFrom) payment.paymentFrom = paymentFrom;
    if (paymentTo) payment.paymentTo = paymentTo;
    if (details && details.trim() !== payment.details) {
      // Check for duplicate transaction ID when changing it
      const duplicateBooking = await isTransactionIdDuplicate(details, booking._id);
      if (duplicateBooking) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID "${details.trim()}" already exists in booking ${duplicateBooking.bookingId}. Each transaction ID must be unique.`
        });
      }
      // Also check within the same booking's other payments
      const existsInSameBooking = booking.payments.some((p, i) => i !== paymentIndex && p.details === details.trim());
      if (existsInSameBooking) {
        return res.status(400).json({
          success: false,
          message: `Transaction ID "${details.trim()}" already exists in another payment entry of this booking. Each transaction ID must be unique.`
        });
      }
      payment.details = details.trim();
      booking.transactionId = details.trim();
    }
    if (status) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized: Only admins can change payment status.' });
      }
      payment.status = status;
      payment.verified = status === 'VERIFIED';
    }
    if (attachmentName) payment.attachmentName = attachmentName;

    if (req.file) {
      payment.attachment = req.file.path;
      payment.attachmentName = req.file.originalname;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Edit payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Verify or toggle status of a payment entry / Send Receipt
// @route   PATCH /api/bookings/:id/verify-payment/:paymentId
// @access  Private & Verified
router.patch('/:id/verify-payment/:paymentId', protect, verifiedOnly, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const { paymentId } = req.params;
    const payment = booking.payments.find(p => p.paymentId === paymentId || p._id.toString() === paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment entry not found' });
    }

    const { status, action, reason } = req.body;

    // Handle send receipt (non-admin allowed)
    if (action === 'send-receipt') {
      const isCreator = booking.createdBy && booking.createdBy.toString() === req.user._id.toString();
      const isAssigned = booking.assignedTo && booking.assignedTo.some(id => id.toString() === req.user._id.toString());
      const isAdmin = req.user.role === 'admin';

      if (!isAdmin && !isCreator && !isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      booking.comments.push({
        senderName: 'System / Mailer',
        message: `Payment Receipt Sent: Receipt for payment ID ${payment.paymentId} (Amount: ₹${payment.amountPaid}) has been successfully emailed to ${booking.travellerEmail}.`,
        timestamp: new Date()
      });
    } else {
      // Verification status change requires admin privilege
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized: Only admins can verify or reject payments.' });
      }

      if (status === 'VERIFIED' || action === 'approve') {
        const wasBookingPending = booking.status === 'Pending';
        const isFirstVerifiedPayment = !booking.payments.some(p => p.status === 'VERIFIED');
        payment.status = 'VERIFIED';
        payment.verified = true;

        // Recalculate Booking totalPaid and dueAmount
        booking.paidAmount = booking.payments
          .filter(p => p.status === 'VERIFIED')
          .reduce((sum, p) => sum + p.amountPaid, 0);
        booking.dueAmount = Math.max(0, booking.totalAmount - booking.paidAmount);

        // Update booking status: automatically confirm when a payment is verified
        if (booking.status !== 'Cancelled') {
          booking.status = 'Confirmed';
        }

        const autoConfirmedMsg = (isFirstVerifiedPayment && wasBookingPending)
          ? ' Booking has been AUTO-CONFIRMED (first payment verified).'
          : '';

        booking.comments.push({
          senderName: `System / ${req.user.name}`,
          message: `Payment Approved: Payment ID ${payment.paymentId} (Amount: ₹${payment.amountPaid}) has been APPROVED. Total Paid: ₹${booking.paidAmount}. Balance Due: ₹${booking.dueAmount}.${autoConfirmedMsg}`,
          timestamp: new Date()
        });
      } else if (status === 'REJECTED' || action === 'reject') {
        payment.status = 'REJECTED';
        payment.verified = false;

        // Recalculate Booking totalPaid and dueAmount
        booking.paidAmount = booking.payments
          .filter(p => p.status === 'VERIFIED')
          .reduce((sum, p) => sum + p.amountPaid, 0);
        booking.dueAmount = Math.max(0, booking.totalAmount - booking.paidAmount);

        const rejectionReason = reason || 'No reason provided';
        booking.comments.push({
          senderName: `System / ${req.user.name}`,
          message: `Payment Rejected: Payment ID ${payment.paymentId} (Amount: ₹${payment.amountPaid}) was REJECTED. Reason: ${rejectionReason}.`,
          timestamp: new Date()
        });
      }
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    const wasAutoConfirmed = updatedBooking.status === 'Confirmed' && req.body.status === 'VERIFIED';
    res.json({
      success: true,
      message: action === 'send-receipt' ? 'Receipt email queued successfully' : 'Payment status updated',
      autoConfirmed: wasAutoConfirmed,
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Toggle task completion status
router.patch('/:id/toggle-task', protect, verifiedOnly, async (req, res) => {
  try {
    const { taskName } = req.body;
    if (!taskName) {
      return res.status(400).json({ success: false, message: 'taskName is required' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Permissions: Only Admin, Creator, or Assigned Employee can toggle
    const isAdmin = req.user.role === 'admin';
    const isCreator = booking.createdBy.toString() === req.user._id.toString();
    const isAssigned = booking.assignedTo.some(
      (empId) => empId.toString() === req.user._id.toString()
    );

    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to toggle tasks on this booking',
      });
    }

    // Find the task by name
    const task = booking.tasks.find((t) => t.taskName === taskName);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // System tasks (Booking Created, Initial Payment Submitted) are read-only
    if (taskName === 'Booking Created' || taskName === 'Initial Payment Submitted') {
      return res.status(400).json({
        success: false,
        message: 'System logged tasks cannot be manually toggled',
      });
    }

    // Employees cannot un-toggle (uncheck) a completed task
    if (req.user.role === 'employee' && task.isCompleted) {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot uncheck a completed activity audit task.',
      });
    }

    // Toggle
    task.isCompleted = !task.isCompleted;
    if (task.isCompleted) {
      task.updatedBy = req.user.name;
      task.updatedAt = new Date();
    } else {
      task.updatedBy = '';
      task.updatedAt = undefined;
    }

    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('comments.sender', 'name email role');

    res.json({
      success: true,
      message: 'Task toggled successfully',
      data: updatedBooking,
    });
  } catch (error) {
    console.error('Toggle task error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
