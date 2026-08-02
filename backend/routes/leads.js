const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { protect, verifiedOnly } = require('../middleware/auth');

// @desc    Get lead details by mobile number
// @route   GET /api/lead-details/:mobileNumber
// @access  Private & Verified
router.get('/:mobileNumber', protect, verifiedOnly, async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    
    // Search for a matching lead in CRMDB (checking both phone and mobileNumber fields)
    const lead = await Lead.findOne({
      $or: [
        { phone: mobileNumber },
        { mobileNumber: mobileNumber }
      ]
    }).lean();
    
    if (!lead) {
      return res.status(200).json({ success: false, message: 'Lead not found in CRM.' });
    }
    
    res.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error('Get lead details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
