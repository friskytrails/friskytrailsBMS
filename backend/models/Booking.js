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
    enum: ['VERIFICATION-REQUIRED', 'VERIFIED', 'REJECTED', 'PAID', 'DISAPPROVED'],
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
    fileUrl: String,
    fileName: String,
    fileType: String,
    timestamp: { type: Date, default: Date.now }
  }],
  payments: {
    type: [PaymentSchema],
    default: [],
  },
  profitMargin: {
    type: Number,
    default: 0,
  },
  tasks: {
    type: [{
      taskName: String,
      isCompleted: { type: Boolean, default: false },
      updatedBy: { type: String, default: "" },
      updatedAt: { type: Date }
    }],
    default: []
  },
  feedbackRating: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
    default: 5
  },
  feedbackComment: {
    type: String,
    default: ""
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
        status: isPaid ? 'VERIFIED' : 'VERIFICATION-REQUIRED',
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

function ensureTasksChecklist(doc) {
  if (!doc.tasks || doc.tasks.length === 0) {
    doc.tasks = [
      { taskName: 'Confirmation Mail Done', isCompleted: false, updatedBy: '' },
      { taskName: 'Confirmation Call Done', isCompleted: false, updatedBy: '' },
      { taskName: 'Hotel Booked', isCompleted: false, updatedBy: '' },
      { taskName: 'Taxi Booked', isCompleted: false, updatedBy: '' },
      { taskName: 'Adventure Booked', isCompleted: false, updatedBy: '' },
      { taskName: 'Connected for Review', isCompleted: false, updatedBy: '' },
      { taskName: 'Review Done on Website', isCompleted: false, updatedBy: '' },
      { taskName: 'Booking Created', isCompleted: true, updatedBy: 'System', updatedAt: doc.createdAt || new Date() },
      { taskName: 'Initial Payment Submitted', isCompleted: true, updatedBy: 'System', updatedAt: doc.createdAt || new Date() }
    ];
  }
}

// Auto-generate Booking ID and calculate due amount pre-validation
BookingSchema.pre('validate', async function (next) {
  ensureInitialPayment(this);
  ensureTasksChecklist(this);

  // Calculate Paid Amount dynamically based on verified sub-payments
  if (this.payments && this.payments.length > 0) {
    this.paidAmount = this.payments
      .filter(p => p.status === 'VERIFIED')
      .reduce((sum, p) => sum + p.amountPaid, 0);
  } else {
    this.paidAmount = 0;
  }

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

// Dynamic migration post document load/initialization from database
BookingSchema.post('init', function (doc) {
  ensureInitialPayment(doc);
  ensureTasksChecklist(doc);
});

BookingSchema.index({ travellerName: 1 });
BookingSchema.index({ travellerPhone: 1 });
BookingSchema.index({ location: 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ startDate: 1 });
BookingSchema.index({ createdBy: 1 });
BookingSchema.index({ assignedTo: 1 });
BookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
