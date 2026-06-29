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

  // Clear any existing test users
  const testEmails = ['test_employee_verify@example.com', 'test_admin_verify@example.com'];
  await User.deleteMany({ email: { $in: testEmails } });

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
    });

    await booking.save();
    console.log('✓ Test Booking saved.');
    console.log(`  - Booking ID: ${booking.bookingId} (Expected: auto-generated unique string BK-XXXXXX)`);
    console.log(`  - Total Amount: ${booking.totalAmount}`);
    console.log(`  - Paid Amount: ${booking.paidAmount}`);
    console.log(`  - Due Amount: ${booking.dueAmount} (Expected: 900)`);

    if (!booking.bookingId || !booking.bookingId.startsWith('BK-')) {
      throw new Error(`Booking ID format is invalid: ${booking.bookingId}`);
    }

    if (booking.dueAmount !== 900) {
      throw new Error(`Due amount calculation is incorrect. Got ${booking.dueAmount}, expected 900.`);
    }

    console.log('✓ Booking ID auto-generation and due amount calculations verified.');

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
