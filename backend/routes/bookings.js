const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect, verifiedOnly } = require('../middleware/auth');
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

    // Employees can only see their own bookings. Admins can see all bookings.
    if (req.user.role === 'employee') {
      query.createdBy = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('createdBy', 'name email')
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

// @desc    Get booking by Booking ID slug
// @route   GET /api/bookings/:bookingId
// @access  Private & Verified
router.get('/:bookingId', protect, verifiedOnly, async (req, res) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.bookingId })
      .populate('createdBy', 'name email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Employees can only view their own bookings. Admins can view any booking.
    if (req.user.role === 'employee' && booking.createdBy && booking.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own bookings.' });
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
