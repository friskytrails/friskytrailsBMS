const mongoose = require('mongoose');

const SupplierSchema = new mongoose.Schema({
  supplierId: {
    type: String,
    required: [true, 'Supplier ID is required'],
    unique: true,
  },

  // Location Information
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },

  // Contact Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number'],
  },
  alternateNumber: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },

  // Financial Information
  gstin: {
    type: String,
    trim: true,
    default: '',
  },
  msme: {
    type: String,
    trim: true,
    default: '',
  },
  accountNumber: {
    type: String,
    trim: true,
    default: '',
  },
  ifscCode: {
    type: String,
    trim: true,
    default: '',
  },
  accountHolderName: {
    type: String,
    trim: true,
    default: '',
  },
  bankName: {
    type: String,
    trim: true,
    default: '',
  },
  upiId: {
    type: String,
    trim: true,
    default: '',
  },
  upiNumber: {
    type: String,
    trim: true,
    default: '',
  },

  // Supplier Categories
  supplierFor: {
    type: [String],
    enum: ['Hotels', 'Transport', 'Adventure', 'Guides', 'Outsourced'],
    default: [],
  },

  // Documents (Cloudinary URLs)
  documents: [{
    url: { type: String, required: true },
    name: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  },
}, {
  timestamps: true,
});

// Auto-generate Supplier ID (SUP-XXXXXX) pre-validation
SupplierSchema.pre('validate', async function (next) {
  if (!this.supplierId) {
    let uniqueIdGenerated = false;
    let attempts = 0;
    while (!uniqueIdGenerated && attempts < 10) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tempId = `SUP-${randomPart}`;

      const existing = await mongoose.models.Supplier.findOne({ supplierId: tempId });
      if (!existing) {
        this.supplierId = tempId;
        uniqueIdGenerated = true;
      }
      attempts++;
    }
  }
  next();
});

// Indexes for efficient querying
SupplierSchema.index({ supplierId: 1 });
SupplierSchema.index({ fullName: 1 });
SupplierSchema.index({ businessName: 1 });
SupplierSchema.index({ contactNumber: 1 });
SupplierSchema.index({ city: 1 });
SupplierSchema.index({ supplierFor: 1 });
SupplierSchema.index({ createdBy: 1 });
SupplierSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Supplier', SupplierSchema);
