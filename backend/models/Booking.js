const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: [true, 'Booking ID is required'],
    unique: true,
  },
  paymentId: {
    type: String,
    required: [true, 'Payment ID is required'],
    unique: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Please add a start date'],
  },
  endDate: {
    type: Date,
    required: [true, 'Please add an end date'],
  },
  packageName: {
    type: String,
    required: [true, 'Please add a package name'],
    trim: true,
  },
  location: {
    type: String,
    required: [true, 'Please add a location'],
    trim: true,
  },
  totalAmount: {
    type: Number,
    required: [true, 'Please add a total amount'],
    min: [0, 'Total amount cannot be negative'],
  },
  paidAmount: {
    type: Number,
    required: [true, 'Please add a paid amount'],
    min: [0, 'Paid amount cannot be negative'],
    default: 0,
  },
  dueAmount: {
    type: Number,
    required: [true, 'Due amount is required'],
    min: [0, 'Due amount cannot be negative'],
    default: 0,
  },
  transactionId: {
    type: String,
    required: [true, 'Please add a transaction ID'],
    unique: true,
    trim: true,
  },
  screenshot: {
    type: String,
    required: [true, 'Please upload a transaction screenshot'],
  },
  travellerName: {
    type: String,
    required: [true, 'Please add a traveler name'],
    trim: true,
  },
  travellerEmail: {
    type: String,
    required: [true, 'Please add a traveler email'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  travellerPhone: {
    type: String,
    required: [true, 'Please add a traveler phone number'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Please provide a valid 10-digit Indian phone number starting with 6, 7, 8, or 9'],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user is required'],
  },
  status: {
    type: String,
    required: [true, 'Booking status is required'],
    enum: ['Pending', 'Booked', 'Cancelled', 'On Hold', 'Confirmed', 'Partial Payment', 'Payment Done'],
    default: 'Pending',
  },
  assignedTo: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    default: [],
  },
  adults: {
    type: Number,
    required: [true, 'Number of adults is required'],
    min: [0, 'Number of adults cannot be negative'],
  },
  children: {
    type: Number,
    required: [true, 'Number of children is required'],
    min: [0, 'Number of children cannot be negative'],
  },
  comments: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
}, {
  timestamps: true,
});

// Auto-generate Booking ID and calculate due amount pre-validation
BookingSchema.pre('validate', async function (next) {
  // Calculate Due Amount
  if (this.totalAmount !== undefined && this.paidAmount !== undefined) {
    this.dueAmount = Math.max(0, this.totalAmount - this.paidAmount);
  }

  // Generate Booking ID if not exists
  if (!this.bookingId) {
    let uniqueIdGenerated = false;
    let attempts = 0;
    while (!uniqueIdGenerated && attempts < 10) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tempId = `BK-${randomPart}`;
      
      // Check if it already exists
      const existingBooking = await mongoose.models.Booking.findOne({ bookingId: tempId });
      if (!existingBooking) {
        this.bookingId = tempId;
        uniqueIdGenerated = true;
      }
      attempts++;
    }
  }

  // Generate Payment ID if not exists
  if (!this.paymentId) {
    let uniqueIdGenerated = false;
    let attempts = 0;
    while (!uniqueIdGenerated && attempts < 10) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tempId = `PAY-${randomPart}`;
      
      // Check if it already exists
      const existingBooking = await mongoose.models.Booking.findOne({ paymentId: tempId });
      if (!existingBooking) {
        this.paymentId = tempId;
        uniqueIdGenerated = true;
      }
      attempts++;
    }
  }
  next();
});

module.exports = mongoose.model('Booking', BookingSchema);
