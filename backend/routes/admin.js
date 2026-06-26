const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');

// @desc    Get all users (for admin panel)
// @route   GET /api/admin/users
// @access  Private & Admin
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    // Return all users (exclude password)
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Toggle verification status of a user
// @route   PATCH /api/admin/users/:id/verify
// @access  Private & Admin
router.patch('/users/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.body.userId || req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Toggle verification
    user.isVerified = !user.isVerified;
    await user.save();

    res.json({
      success: true,
      message: `User verification set to ${user.isVerified}`,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
