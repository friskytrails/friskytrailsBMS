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

// --- Service Payment Schema (payments linked to a supplier service) ---
const ServicePaymentSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  paymentDate: { type: Date, required: true, default: Date.now },
  paymentFrom: {
    type: String, required: true,
    enum: ['Traveller', 'Company', 'Supplier'], default: 'Company',
  },
  paymentTo: {
    type: String, required: true,
    enum: ['Traveller', 'Company', 'Supplier'], default: 'Supplier',
  },
  paidAmount: { type: Number, required: true, min: 0 },
  paymentMode: {
    type: String, required: true,
    enum: ['Direct Cash', 'Account'], default: 'Account',
  },
  accountSubMode: { type: String, default: '' },
  screenshot: { type: String },
  screenshotName: { type: String },
  status: {
    type: String,
    enum: ['VERIFICATION-REQUIRED', 'VERIFIED', 'REJECTED'],
    default: 'VERIFICATION-REQUIRED',
  },
  addedBy: { type: String, required: true },
  details: { type: String, trim: true, default: '' },
  verified: { type: Boolean, default: false },
  isGenerated: { type: Boolean, default: false },
}, { timestamps: true });

// --- Service Schema (supplier services attached to a booking) ---
const ServiceSchema = new mongoose.Schema({
  serviceId: { type: String, required: true },
  supplierType: {
    type: String, required: true,
    enum: ['Hotels', 'Transport', 'Adventure', 'Guides', 'Outsourced'],
  },

  // Linked supplier reference
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierName: { type: String, default: '' },
  supplierSupplierId: { type: String, default: '' }, // Supplier's SUP-XXXX ID

  // Common fields
  b2bCost: { type: Number, default: 0 },
  collectionBySupplier: { type: Number, default: 0 },
  totalDue: { type: Number, default: 0 },
  startDate: { type: Date },
  endDate: { type: Date },
  adults: { type: Number, default: 0 },
  children: { type: Number, default: 0 },

  // Hotel-specific
  mealPlan: { type: String, enum: ['EP', 'CP', 'MAP', 'AP', ''], default: '' },
  roomType: { type: String, default: '' },
  numberOfRooms: { type: Number, default: 0 },

  // Transport-specific
  transportType: {
    type: String,
    enum: ['Hatchback', 'Sedan', 'Ertiga', 'Innova', 'Winger', '13 Seater', '17 Seater', '20 Seater', '26 Seater', 'Bus', ''],
    default: '',
  },

  // Adventure-specific
  productName: { type: String, default: '' },
  packageName: { type: String, default: '' },

  // Outsourced-specific
  outsourceName: { type: String, default: '' },

  serviceStatus: {
    type: String,
    enum: ['Pending', 'Booked', 'Completed', 'Cancelled Booking Charges', 'Cancelled No Charges'],
    default: 'Pending',
  },

  payments: { type: [ServicePaymentSchema], default: [] },

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedByName: { type: String, default: '' },
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
      'Pending', 'Cancelled', 'On Hold', 'Confirmed', 'Partial Payment', 'Payment Done'
    ],
    default: 'Pending',
  },
  tripStatus: {
    type: String,
    enum: ['Pending', 'Under Process', 'Fulfillment Done', 'Trip Completed', 'Postponed', 'Cash Refund', 'Wallet Refund', 'No Refund', 'Cash Refund Done', 'Wallet Refund Done'],
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
  emailHistory: [{
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentByName: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
  }],
  payments: {
    type: [PaymentSchema],
    default: [],
  },
  services: {
    type: [ServiceSchema],
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
    (doc.transactionId && p.details === doc.transactionId) ||
    p.addedBy === 'System Migrator'
  );

  if (!hasInitial) {
    // Sum of other payments
    const otherSum = doc.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const initialAmount = doc.paidAmount - otherSum;
    
    if (initialAmount > 0) {
      const isPaid = doc.status === 'Payment Done' || doc.status === 'Confirmed';
      const initialPayment = {
        paymentId: doc.paymentId || `${Math.floor(100000 + Math.random() * 900000)}`,
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
  // Booked was a legacy booking status; normalize it to the single approval state.
  if (this.status === 'Booked') this.status = 'Confirmed';

  ensureInitialPayment(this);
  ensureTasksChecklist(this);

  // Calculate Paid Amount dynamically based on verified sub-payments from TRAVELER (Booking payments)
  // AND verified Service Payments where paymentFrom is 'Traveller'
  let calculatedPaidAmount = 0;

  if (this.payments && this.payments.length > 0) {
    calculatedPaidAmount += this.payments
      .filter(p => p.status === 'VERIFIED' && p.paymentFrom === 'TRAVELER')
      .reduce((sum, p) => sum + p.amountPaid, 0);
  }

  if (this.services && this.services.length > 0) {
    this.services.forEach(s => {
      if (s.payments && s.payments.length > 0) {
        calculatedPaidAmount += s.payments
          .filter(p => p.status === 'VERIFIED' && p.paymentFrom === 'Traveller')
          .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      }
    });
  }

  this.paidAmount = calculatedPaidAmount;

  // Calculate Due Amount
  if (this.totalAmount !== undefined && this.paidAmount !== undefined) {
    this.dueAmount = Math.max(0, this.totalAmount - this.paidAmount);
  }

  // Recalculate totalDue for each service based on verified service payments
  if (this.services && this.services.length > 0) {
    this.services.forEach(s => {
      const verifiedPaymentsSum = (s.payments || [])
        .filter(p => p.status === 'VERIFIED')
        .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      s.totalDue = Math.max(0, (s.b2bCost || 0) - (s.collectionBySupplier || 0) - verifiedPaymentsSum);
    });
  }

  // Calculate Profit Margin: totalAmount - sum of b2bCost of active (non-cancelled no charges) services
  const activeB2BCost = (this.services || [])
    .filter(s => s.serviceStatus !== 'Cancelled No Charges')
    .reduce((sum, s) => sum + (s.b2bCost || 0), 0);
  this.profitMargin = (this.totalAmount || 0) - activeB2BCost;

  // Generate Booking ID if not exists
  if (!this.bookingId) {
    let uniqueIdGenerated = false;
    let attempts = 0;
    while (!uniqueIdGenerated && attempts < 10) {
      const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tempId = `FT${randomPart}`;
      
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
      const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
      const tempId = randomPart;
      
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

  // Recalculate paidAmount from VERIFIED TRAVELER payments (both main and service payments)
  let calculatedPaidAmount = 0;
  if (doc.payments && doc.payments.length > 0) {
    calculatedPaidAmount += doc.payments
      .filter(p => p.status === 'VERIFIED' && p.paymentFrom === 'TRAVELER')
      .reduce((sum, p) => sum + p.amountPaid, 0);
  }
  
  if (doc.services && doc.services.length > 0) {
    doc.services.forEach(s => {
      if (s.payments && s.payments.length > 0) {
        calculatedPaidAmount += s.payments
          .filter(p => p.status === 'VERIFIED' && p.paymentFrom === 'Traveller')
          .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      }
    });
  }
  doc.paidAmount = calculatedPaidAmount;

  // Recalculate dueAmount to stay consistent
  if (doc.totalAmount !== undefined && doc.paidAmount !== undefined) {
    doc.dueAmount = Math.max(0, doc.totalAmount - doc.paidAmount);
  }
  // Recalculate totalDue for each service based on verified service payments
  if (doc.services && doc.services.length > 0) {
    doc.services.forEach(s => {
      const verifiedPaymentsSum = (s.payments || [])
        .filter(p => p.status === 'VERIFIED')
        .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      s.totalDue = Math.max(0, (s.b2bCost || 0) - (s.collectionBySupplier || 0) - verifiedPaymentsSum);
    });
  }

  // Recalculate Profit Margin dynamically
  const activeB2BCost = (doc.services || [])
    .filter(s => s.serviceStatus !== 'Cancelled No Charges')
    .reduce((sum, s) => sum + (s.b2bCost || 0), 0);
  doc.profitMargin = (doc.totalAmount || 0) - activeB2BCost;
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
