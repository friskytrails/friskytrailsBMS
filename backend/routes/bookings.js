const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect, verifiedOnly, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/multerConfig');

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

    // Cloudinary secure URL is stored in req.file.path
    const screenshotPath = req.file.path;

    // Create booking
    const booking = new Booking({
      startDate,
      endDate,
      packageName,
      location,
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount),
      transactionId,
      screenshot: screenshotPath,
      travellerName,
      travellerEmail,
      travellerPhone,
      createdBy: req.user._id,
      status: 'Pending',
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
      paymentMode: 'upi',
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

    // Employees can see bookings they created or are assigned to ONLY IF they are Confirmed
    if (req.user.role === 'employee') {
      query.status = 'Confirmed';
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
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
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setUTCHours(23, 59, 59, 999);
        query.startDate.$lte = end;
      }
    }

    // Visibility Logic
    if (req.user.role === 'employee') {
      query.status = 'Confirmed';
      query.$or = [
        { createdBy: req.user._id },
        { assignedTo: req.user._id }
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
    const { status } = req.body;
    if (!status) {
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

    if (!['Pending', 'Booked', 'Cancelled', 'On Hold', 'Confirmed', 'Partial Payment', 'Payment Done', 'Fulfillment Done', 'Trip Completed', 'No Refund', 'Refund Required', 'Refund Done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    booking.status = status;
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

    // Employees can only view bookings they created or are assigned to ONLY IF they are Confirmed
    if (req.user.role === 'employee') {
      const isConfirmed = booking.status === 'Confirmed';
      const isCreator = booking.createdBy && booking.createdBy._id.toString() === req.user._id.toString();
      const isAssigned = booking.assignedTo && booking.assignedTo.some(userObj => {
        const id = userObj._id || userObj;
        return id.toString() === req.user._id.toString();
      });
      if (!isConfirmed || (!isCreator && !isAssigned)) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not authorized to view this booking.' });
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
      travellerName,
      travellerEmail,
      travellerPhone,
      adults,
      children,
      status,
      profitMargin,
      feedbackRating,
      feedbackComment,
    } = req.body;

    if (startDate) booking.startDate = startDate;
    if (endDate) booking.endDate = endDate;
    if (packageName) booking.packageName = packageName;
    if (location) booking.location = location;
    if (totalAmount !== undefined) booking.totalAmount = Number(totalAmount);
    if (paidAmount !== undefined) booking.paidAmount = Number(paidAmount);
    if (transactionId) booking.transactionId = transactionId;
    if (travellerName) booking.travellerName = travellerName;
    if (travellerEmail) booking.travellerEmail = travellerEmail;
    if (travellerPhone) booking.travellerPhone = travellerPhone;
    
    if (adults !== undefined) booking.adults = Number(adults);
    if (children !== undefined) booking.children = Number(children);
    if (status) booking.status = status;
    if (profitMargin !== undefined) booking.profitMargin = Number(profitMargin);
    if (feedbackRating !== undefined) booking.feedbackRating = Number(feedbackRating);
    if (feedbackComment !== undefined) booking.feedbackComment = feedbackComment;

    // Handle optional screenshot upload
    if (req.file) {
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

    // Calculate current remaining dueAmount
    const currentDue = booking.totalAmount - booking.paidAmount;
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
    if (details) {
      payment.details = details;
      booking.transactionId = details; // update latest transaction ID
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
        payment.status = 'VERIFIED';
        payment.verified = true;

        // Recalculate Booking totalPaid and dueAmount
        booking.paidAmount = booking.payments
          .filter(p => p.status === 'VERIFIED')
          .reduce((sum, p) => sum + p.amountPaid, 0);
        booking.dueAmount = Math.max(0, booking.totalAmount - booking.paidAmount);

        // Update booking status based on remaining due amount
        if (booking.dueAmount <= 0) {
          booking.status = 'Payment Done';
        } else {
          booking.status = 'Partial Payment';
        }

        booking.comments.push({
          senderName: `System / ${req.user.name}`,
          message: `Payment Approved: Payment ID ${payment.paymentId} (Amount: ₹${payment.amountPaid}) has been APPROVED. Total Paid: ₹${booking.paidAmount}. Balance Due: ₹${booking.dueAmount}.`,
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

    res.json({
      success: true,
      message: action === 'send-receipt' ? 'Receipt email queued successfully' : 'Payment status updated',
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
