const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  paymentFrom: {
    type: String,
    required: true,
    enum: ['TRAVELER', 'COMPANY'],
    default: 'TRAVELER',
  },
  paymentTo: {
    type: String,
    required: true,
    enum: ['TRAVELER', 'COMPANY'],
    default: 'COMPANY',
  },
  amountPaid: {
    type: Number,
    required: true,
    min: [0, 'Amount paid cannot be negative'],
  },
  paymentMode: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['PAID', 'VERIFICATION-REQUIRED', 'DISAPPROVED'],
    default: 'VERIFICATION-REQUIRED',
  },
  addedBy: {
    type: String,
    required: true,
  },
  attachment: {
    type: String, // Base64 data url or path
  },
  attachmentName: {
    type: String,
  },
  details: {
    type: String,
    trim: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  invoiceNumber: {
    type: String,
  }
}, { timestamps: true });

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
    enum: [
      'Pending', 'Booked', 'Cancelled', 'On Hold', 'Confirmed', 'Partial Payment', 'Payment Done',
      'Fulfillment Done', 'Trip Completed', 'No Refund', 'Refund Required', 'Refund Done'
    ],
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
  payments: {
    type: [PaymentSchema],
    default: [],
  },
  profitMargin: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true,
});

function ensureInitialPayment(doc) {
  if (!doc.paidAmount || doc.paidAmount <= 0) return;
  
  if (!doc.payments) {
    doc.payments = [];
  }

  // Find if initial payment exists
  const hasInitial = doc.payments.some(p => 
    p.invoiceNumber === `INV-${doc.bookingId}` || 
    p.details === 'Initial Booking Payment' ||
    p.addedBy === 'System Migrator'
  );

  if (!hasInitial) {
    // Sum of other payments
    const otherSum = doc.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const initialAmount = doc.paidAmount - otherSum;
    
    if (initialAmount > 0) {
      const isPaid = doc.status === 'Payment Done' || doc.status === 'Confirmed';
      const initialPayment = {
        paymentId: doc.paymentId || `PAY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        paymentDate: doc.createdAt || new Date(),
        paymentFrom: 'TRAVELER',
        paymentTo: 'COMPANY',
        amountPaid: initialAmount,
        paymentMode: 'upi',
        status: isPaid ? 'PAID' : 'VERIFICATION-REQUIRED',
        addedBy: 'System Migrator',
        attachment: doc.screenshot,
        attachmentName: 'screenshot.jpg',
        details: doc.transactionId || 'Initial Booking Payment',
        verified: isPaid,
        invoiceNumber: `INV-${doc.bookingId}`
      };
      doc.payments.unshift(initialPayment);
    }
  }
}

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

  ensureInitialPayment(this);

  next();
});

// Dynamic migration post document load/initialization from database
BookingSchema.post('init', function (doc) {
  ensureInitialPayment(doc);
});

module.exports = mongoose.model('Booking', BookingSchema);
