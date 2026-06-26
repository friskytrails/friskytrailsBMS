const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authenticate user via JWT
const protect = async (req, res, next) => {
  let token;

  // Read token from headers (Authorization: Bearer <token>) or from cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

      // Get user from the database
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

// Check if user is verified (admins bypass this or are verified by default)
const verifiedOnly = (req, res, next) => {
  if (req.user && (req.user.isVerified || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Account pending admin approval.',
      isPending: true
    });
  }
};

// Restrict access to admins only
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }
};

module.exports = {
  protect,
  verifiedOnly,
  adminOnly,
};
