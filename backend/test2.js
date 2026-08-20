const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect('mongodb://127.0.0.1:27017/ftbooking', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const b = await Booking.findOne({ 'payments.status': 'VERIFICATION-REQUIRED' });
      if (!b) return console.log('No unverified payment found');
      
      console.log('Original Paid Amount:', b.paidAmount);
      const p = b.payments.find(p => p.status === 'VERIFICATION-REQUIRED');
      console.log('Verifying payment:', p.paymentId, p.amountPaid, p.paymentFrom);
      p.status = 'VERIFIED';
      
      await b.save();
      console.log('After save Paid Amount:', b.paidAmount);
      
    } catch (e) {
      console.error(e);
    } finally {
      mongoose.disconnect();
    }
  });
