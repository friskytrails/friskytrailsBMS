const mongoose = require('mongoose');
const User = require('./models/User');
const Booking = require('./models/Booking');
require('dotenv').config();

const runTests = async () => {
  console.log('--- Starting Programmatic Backend Verification Tests ---');
  
  // 1. Connect to Database
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ft_booking_system';
    await mongoose.connect(mongoURI);
    console.log('✓ Successfully connected to MongoDB.');
  } catch (err) {
    console.error('✗ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  // Clear any existing test users and bookings
  const testEmails = ['test_employee_verify@example.com', 'test_admin_verify@example.com'];
  await User.deleteMany({ email: { $in: testEmails } });
  await Booking.deleteMany({ transactionId: 'TXN-TEST-999' });

  let testEmployeeId;
  let testAdminId;

  // 2. Test User Registration (Employee)
  try {
    const employee = await User.create({
      name: 'Test Employee',
      email: 'test_employee_verify@example.com',
      password: 'password123',
      role: 'employee',
      isVerified: false,
    });
    testEmployeeId = employee._id;

    console.log('✓ Test Employee created.');
    console.log(`  - Name: ${employee.name}`);
    console.log(`  - Role: ${employee.role} (Expected: employee)`);
    console.log(`  - isVerified: ${employee.isVerified} (Expected: false)`);
    
    // Check password hashing
    if (employee.password === 'password123') {
      throw new Error('Password was not hashed!');
    }
    console.log('✓ Password successfully hashed.');

    // Test matchPassword
    const isMatch = await employee.matchPassword('password123');
    if (!isMatch) {
      throw new Error('matchPassword failed for correct password');
    }
    const isWrongMatch = await employee.matchPassword('wrong_password');
    if (isWrongMatch) {
      throw new Error('matchPassword returned true for incorrect password');
    }
    console.log('✓ Password match methods verified.');
  } catch (error) {
    console.error('✗ User Registration (Employee) Test Failed:', error.message);
    process.exit(1);
  }

  // 3. Test User Registration (Admin)
  try {
    const admin = await User.create({
      name: 'Test Admin',
      email: 'test_admin_verify@example.com',
      password: 'password456',
      role: 'admin',
      isVerified: true,
    });
    testAdminId = admin._id;

    console.log('✓ Test Admin created.');
    console.log(`  - Name: ${admin.name}`);
    console.log(`  - Role: ${admin.role} (Expected: admin)`);
    console.log(`  - isVerified: ${admin.isVerified} (Expected: true)`);
  } catch (error) {
    console.error('✗ User Registration (Admin) Test Failed:', error.message);
    process.exit(1);
  }

  // 4. Test Booking Creation & Calculations
  try {
    const booking = new Booking({
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-07-10'),
      packageName: 'Premium Alpine Tour',
      location: 'Swiss Alps, Switzerland',
      totalAmount: 1500,
      paidAmount: 600,
      transactionId: 'TXN-TEST-999',
      screenshot: 'uploads/test-screenshot.png',
      travellerName: 'Alice Smith',
      travellerEmail: 'alice.smith@example.com',
      travellerPhone: '9876543210',
      createdBy: testEmployeeId,
      adults: 2,
      children: 1,
    });

    await booking.save();
    console.log('✓ Test Booking saved.');
    console.log(`  - Booking ID: ${booking.bookingId} (Expected: auto-generated unique string BK-XXXXXX)`);
    console.log(`  - Total Amount: ${booking.totalAmount}`);
    console.log(`  - Initial Paid Amount (Unverified): ${booking.paidAmount} (Expected: 0)`);
    console.log(`  - Initial Due Amount (Unverified): ${booking.dueAmount} (Expected: 1500)`);

    if (!booking.bookingId || !booking.bookingId.startsWith('BK-')) {
      throw new Error(`Booking ID format is invalid: ${booking.bookingId}`);
    }

    if (booking.paidAmount !== 0) {
      throw new Error(`Initially paidAmount should be 0 (unverified). Got ${booking.paidAmount}`);
    }
    if (booking.dueAmount !== 1500) {
      throw new Error(`Initially dueAmount should be 1500. Got ${booking.dueAmount}, expected 1500.`);
    }

    // Admin verifies the initial payment
    const payment = booking.payments[0];
    payment.status = 'VERIFIED';
    payment.verified = true;
    await booking.save();

    console.log(`  - Verified Paid Amount: ${booking.paidAmount} (Expected: 600)`);
    console.log(`  - Verified Due Amount: ${booking.dueAmount} (Expected: 900)`);

    if (booking.paidAmount !== 600) {
      throw new Error(`After verification paidAmount should be 600. Got ${booking.paidAmount}`);
    }
    if (booking.dueAmount !== 900) {
      throw new Error(`After verification dueAmount should be 900. Got ${booking.dueAmount}`);
    }

    console.log('✓ Booking ID auto-generation, unverified locking, and verified calculations verified.');

    // 5. Test Tasks Checklist Initialization
    if (!booking.tasks || booking.tasks.length !== 9) {
      throw new Error(`Tasks checklist size is incorrect. Expected 9, got ${booking.tasks ? booking.tasks.length : 0}`);
    }

    const createdTask = booking.tasks.find(t => t.taskName === 'Booking Created');
    const paymentTask = booking.tasks.find(t => t.taskName === 'Initial Payment Submitted');
    const hotelTask = booking.tasks.find(t => t.taskName === 'Hotel Booked');

    if (!createdTask || !createdTask.isCompleted || createdTask.updatedBy !== 'System') {
      throw new Error('Booking Created task is not automatically completed by System.');
    }
    if (!paymentTask || !paymentTask.isCompleted || paymentTask.updatedBy !== 'System') {
      throw new Error('Initial Payment Submitted task is not automatically completed by System.');
    }
    if (!hotelTask || hotelTask.isCompleted || hotelTask.updatedBy !== '') {
      throw new Error('Operations tasks (like Hotel Booked) should be uncompleted by default.');
    }

    // Toggle tasks
    hotelTask.isCompleted = true;
    hotelTask.updatedBy = 'Test User';
    hotelTask.updatedAt = new Date();
    await booking.save();

    const updatedChecklistBooking = await Booking.findById(booking._id);
    const updatedHotelTask = updatedChecklistBooking.tasks.find(t => t.taskName === 'Hotel Booked');
    if (!updatedHotelTask || !updatedHotelTask.isCompleted || updatedHotelTask.updatedBy !== 'Test User') {
      throw new Error('Failed to persist task toggle modifications.');
    }

    console.log('✓ Operations checklist tasks and automatic logging verified.');

    // Clean up booking
    await Booking.deleteOne({ _id: booking._id });
    console.log('✓ Test Booking cleaned up.');
  } catch (error) {
    console.error('✗ Booking Creation & Calculation Test Failed:', error.message);
    process.exit(1);
  }

  // Clean up users
  await User.deleteMany({ _id: { $in: [testEmployeeId, testAdminId] } });
  console.log('✓ Test Users cleaned up.');

  console.log('--- All Backend Programmatic Tests Passed Successfully! ---');
  mongoose.connection.close();
};

runTests();
