const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Supplier = require('../models/Supplier');

async function recalculateSupplierPaidAmounts(supplierIds = null) {
  const validIds = supplierIds ? supplierIds.filter(id => id && mongoose.Types.ObjectId.isValid(String(id))) : null;
  const supplierMatch = validIds && validIds.length ? { 'services.supplier': { $in: validIds.map(id => new mongoose.Types.ObjectId(String(id))) } } : {};
  const totals = await Booking.aggregate([
    { $unwind: '$services' }, { $match: supplierMatch }, { $unwind: '$services.payments' },
    { $match: { 'services.supplier': { $ne: null }, 'services.payments.status': 'VERIFIED', 'services.payments.paymentFrom': 'Company', 'services.payments.paymentTo': 'Supplier' } },
    { $group: { _id: '$services.supplier', totalAmountPaid: { $sum: { $ifNull: ['$services.payments.paidAmount', 0] } } } },
  ]);
  const totalBySupplier = new Map(totals.map(row => [String(row._id), row.totalAmountPaid]));
  const suppliers = validIds && validIds.length ? await Supplier.find({ _id: { $in: validIds } }).select('_id').lean() : await Supplier.find().select('_id').lean();
  if (suppliers.length) await Supplier.bulkWrite(suppliers.map(({ _id }) => ({ updateOne: { filter: { _id }, update: { $set: { totalAmountPaid: totalBySupplier.get(String(_id)) || 0 } } } })));
  return totals;
}

module.exports = { recalculateSupplierPaidAmounts };
