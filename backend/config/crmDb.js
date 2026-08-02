const mongoose = require('mongoose');

// Create a separate connection instance for the CRM database
const crmDb = mongoose.createConnection(
  process.env.CRM_MONGO_URI || 'mongodb://127.0.0.1:27017/crm_website',
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
