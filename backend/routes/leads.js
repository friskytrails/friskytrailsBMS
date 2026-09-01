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

// @desc    Add a note to a lead by mobile number
// @route   POST /api/lead-details/:mobileNumber/notes
// @access  Private & Verified
router.post('/:mobileNumber/notes', protect, verifiedOnly, async (req, res) => {
  try {
    const { mobileNumber } = req.params;
    const { text, notes, author } = req.body;

    const noteContent = text || notes;
    if (!noteContent || !noteContent.trim()) {
      return res.status(400).json({ success: false, message: 'Note content is required.' });
    }

    const lead = await Lead.findOne({
      $or: [
        { phone: mobileNumber },
        { mobileNumber: mobileNumber }
      ]
    });

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found in CRM.' });
    }

    const newNote = {
      text: noteContent.trim(),
      notes: noteContent.trim(),
      author: author || req.user.name || 'Agent',
      timestamp: new Date(),
      date: new Date()
    };

    if (!lead.notes) {
      lead.notes = [];
    }
    lead.notes.push(newNote);

    if (!lead.interactionHistory) {
      lead.interactionHistory = [];
    }
    lead.interactionHistory.push({
      date: new Date(),
      type: 'Note',
      notes: noteContent.trim(),
      author: author || req.user.name || 'Agent'
    });

    await lead.save();

    res.json({
      success: true,
      message: 'Note added successfully',
      data: lead,
    });
  } catch (error) {
    console.error('Add lead note error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
