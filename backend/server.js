const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // We can change this to specific domain in production
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded screenshots
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the FriskyTrails BMS API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  if (err.message === 'Only PNG, JPG, and PDF are allowed.') {
    return res.status(400).json({ success: false, message: err.message });
  }
  
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

