const mongoose = require('mongoose');

const getCrmUri = () => {
  if (process.env.CRM_MONGO_URI) {
    return process.env.CRM_MONGO_URI;
  }
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI.replace('/ft_booking_system', '/crm_website');
  }
  return 'mongodb://127.0.0.1:27017/crm_website';
};

// Create a separate connection instance for the CRM database
const crmDb = mongoose.createConnection(
  getCrmUri(),
  {
    // Mongoose 6+ doesn't need useNewUrlParser or useUnifiedTopology
  }
);

crmDb.on('connected', () => {
  console.log(`CRM MongoDB Connected: ${crmDb.host}`);
});

crmDb.on('error', (err) => {
  console.error(`CRM MongoDB Connection Error: ${err.message}`);
});

module.exports = crmDb;
