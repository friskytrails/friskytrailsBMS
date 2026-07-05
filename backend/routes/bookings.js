const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect, verifiedOnly, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

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

    // Convert file buffer from memory storage to a Base64 data URL
    const screenshotPath = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

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
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

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
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

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

// @desc    Get all pending bookings (Admin only)
// @route   GET /api/bookings/pending
// @access  Private & Admin
router.get('/pending', protect, adminOnly, async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'Pending' })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

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

    if (!['Pending', 'Booked', 'Cancelled', 'On Hold', 'Confirmed', 'Partial Payment', 'Payment Done'].includes(status)) {
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
router.patch('/:id/comment', protect, verifiedOnly, async (req, res) => {
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
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Comment message is required' });
    }

    // Push comment
    booking.comments.push({
      sender: req.user._id,
      senderName: req.user.name,
      message: message.trim(),
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

    // Handle optional screenshot upload
    if (req.file) {
      booking.screenshot = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
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

    const { amount, transactionId } = req.body;

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

    // Update paidAmount and transactionId
    booking.paidAmount += newPayment;
    booking.dueAmount = Math.max(0, booking.totalAmount - booking.paidAmount);
    booking.transactionId = transactionId.trim();

    // Handle optional screenshot upload
    if (req.file) {
      booking.screenshot = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    // Automated Status Transition
    if (booking.dueAmount <= 0) {
      booking.status = 'Payment Done';
    } else {
      booking.status = 'Partial Payment';
    }

    // Automated System Comment Audit log
    booking.comments.push({
      senderName: `System / ${req.user.name}`,
      message: `Payment Updated: Added ₹${newPayment}. Total Paid: ₹${booking.paidAmount}. Balance Due: ₹${booking.dueAmount}. Transaction ID: ${booking.transactionId}.`,
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

module.exports = router;
