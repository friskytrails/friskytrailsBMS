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
    } = req.body;

    // Check if screenshot file was uploaded
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a transaction screenshot' });
    }

    // Relative path for frontend to consume (e.g. uploads/filename)
    const screenshotPath = `uploads/${req.file.filename}`;

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
      status: 'pending',
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

    // Employees can ONLY see confirmed bookings they created or are assigned to
    if (req.user.role === 'employee') {
      query.status = 'confirmed';
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
    const { bookingId, travellerName, travellerPhone, transactionId, startDate, endDate, location, status, bookingDate } = req.query;

    if (bookingId) {
      query.bookingId = bookingId.trim();
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
      query.status = 'confirmed';
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
    const bookings = await Booking.find({ status: 'pending' })
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
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking,
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

    booking.status = 'rejected';
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

// @desc    Get booking by Booking ID slug
// @route   GET /api/bookings/:bookingId
// @access  Private & Verified
router.get('/:bookingId', protect, verifiedOnly, async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Employees can only view confirmed bookings they created or are assigned to
    if (req.user.role === 'employee') {
      const isCreator = booking.createdBy && booking.createdBy._id.toString() === req.user._id.toString();
      const isAssigned = booking.assignedTo && booking.assignedTo.some(userObj => {
        const id = userObj._id || userObj;
        return id.toString() === req.user._id.toString();
      });
      if (booking.status !== 'confirmed' || (!isCreator && !isAssigned)) {
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

module.exports = router;
