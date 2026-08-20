const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect('mongodb://127.0.0.1:27017/ftbooking', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const b = await Booking.findOne({}).sort({ createdAt: -1 });
      if (!b) return console.log('No booking found');
      
      console.log('Original Paid Amount:', b.paidAmount);
      
      // Add a payment
      b.payments.push({
        paymentId: 'TEST999',
        paymentDate: new Date(),
        paymentFrom: 'TRAVELER',
        paymentTo: 'COMPANY',
        amountPaid: 1000,
        paymentMode: 'upi',
        status: 'VERIFIED',
        addedBy: 'Test Script',
        verified: true
      });
      
      await b.save();
      console.log('After save Paid Amount:', b.paidAmount);
      
    } catch (e) {
      console.error(e);
    } finally {
      mongoose.disconnect();
    }
  });
