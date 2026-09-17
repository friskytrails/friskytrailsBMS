require('dotenv').config();
const connectDB = require('../config/db');
const { recalculateSupplierPaidAmounts } = require('../utils/supplierPayments');
(async () => { await connectDB(); const totals = await recalculateSupplierPaidAmounts(); console.log('Backfilled totalAmountPaid. ' + totals.length + ' supplier totals found.'); process.exit(0); })().catch(error => { console.error('Supplier payment backfill failed:', error); process.exit(1); });
