const mongoose = require('mongoose');

const GeneratedItemSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  serviceId: { type: String, required: true },
  paymentSubdocumentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const SupplierPaymentItemSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  paymentSubdocumentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const BulkSettlementSchema = new mongoose.Schema({
  bulkSettlementId: { type: String, required: true, unique: true, index: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  generatedItems: { type: [GeneratedItemSchema], required: true, validate: v => v.length > 0 },
  supplierPaymentItems: { type: [SupplierPaymentItemSchema], default: [] },
  generatedTotal: { type: Number, required: true, min: 0 },
  supplierPaymentTotal: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, required: true },
  status: { type: String, enum: ['OPEN', 'PARTIALLY-SETTLED', 'SETTLED'], default: 'OPEN' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

BulkSettlementSchema.pre('validate', function (next) {
  this.generatedTotal = (this.generatedItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  this.supplierPaymentTotal = (this.supplierPaymentItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  this.remainingAmount = this.generatedTotal - this.supplierPaymentTotal;
  this.status = this.remainingAmount <= 0 ? 'SETTLED' : this.supplierPaymentTotal > 0 ? 'PARTIALLY-SETTLED' : 'OPEN';
  next();
});

module.exports = mongoose.model('BulkSettlement', BulkSettlementSchema);
