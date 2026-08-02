const mongoose = require('mongoose');
const crmDb = require('../config/crmDb');

const InteractionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: String,
  notes: String,
});

const LeadSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  leadSource: {
    type: String,
  },
  status: {
    type: String,
    default: 'New',
  },
  interactionHistory: [InteractionSchema],
}, { 
  timestamps: true,
  strict: false // Allow any other fields present in CRM
});

LeadSchema.index({ mobileNumber: 1 });

// Export model tied specifically to the CRM database connection
module.exports = crmDb.model('Lead', LeadSchema, 'leads');
