const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', {
    expiresIn: '30d',
  });
};

const createMailTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, adminCode } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    let finalRole = 'employee';
    let finalVerified = false;

    // If attempting to register as admin, verify secret admin code
    if (role === 'admin') {
      const serverAdminCode = process.env.ADMIN_SECRET_KEY || 'ft_admin_secret_123';
      if (adminCode === serverAdminCode) {
        finalRole = 'admin';
        finalVerified = true; // Admin accounts are auto-verified
      } else {
        return res.status(400).json({ success: false, message: 'Invalid admin code' });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
      isVerified: finalVerified,
    });

    if (user) {
      res.status(201).json({
        success: true,
        token: generateToken(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// @desc    Send a password reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const generic = { success: true, message: 'If an account exists for that email, a password reset link has been sent.' };
    if (!email) return res.json(generic);
    const user = await User.findOne({ email });
    if (!user) return res.json(generic);
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    const base = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = base + '/reset-password/' + rawToken;
    await createMailTransporter().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: user.email, subject: 'Reset your FriskyTrails BMS password', text: 'Reset link (expires in 15 minutes): ' + resetUrl, html: '<p>Hello ' + (user.name || 'there') + ',</p><p><a href="' + resetUrl + '">Reset your password</a></p><p>This link expires in 15 minutes.</p>' });
    res.json(generic);
  } catch (error) { console.error('Forgot password error:', error); res.status(500).json({ success: false, message: error.message || 'Unable to send reset email' }); }
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const token = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
    user.password = password; user.resetPasswordToken = undefined; user.resetPasswordExpire = undefined; await user.save();
    res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });
  } catch (error) { console.error('Reset password error:', error); res.status(500).json({ success: false, message: error.message || 'Unable to reset password' }); }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // req.user was set by protect middleware
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
