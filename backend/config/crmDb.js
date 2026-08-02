const mongoose = require('mongoose');

const getCrmUri = () => {
  if (process.env.CRM_MONGO_URI) {
    return process.env.CRM_MONGO_URI;
  }
  return 'mongodb+srv://friskytrails_db_user:e64_KzSSYzHyZ%2AX@cluster7.2mbgpzr.mongodb.net/crm_website';
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
