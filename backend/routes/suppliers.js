const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, verifiedOnly } = require('../middleware/auth');
const crmDb = require('../config/crmDb');
const upload = require('../middleware/multerConfig');

// @route   POST /api/suppliers
// @desc    Create a new supplier
// @access  Protected (verified employees & admins)
router.post('/', protect, verifiedOnly, upload.array('documents', 10), async (req, res) => {
  try {
    const {
      country, state, city,
      fullName, businessName, contactNumber, alternateNumber, email,
      gstin, msme, accountNumber, ifscCode, accountHolderName, bankName, upiId, upiNumber,
      supplierFor,
    } = req.body;

    // Parse supplierFor — it may arrive as a JSON string or a comma-separated string
    let parsedSupplierFor = [];
    if (supplierFor) {
      try {
        parsedSupplierFor = JSON.parse(supplierFor);
      } catch {
        parsedSupplierFor = supplierFor.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    // Build documents array from uploaded files
    const documents = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        documents.push({
          url: file.path || file.secure_url || file.url,
          name: file.originalname,
        });
      }
    }

    const supplier = await Supplier.create({
      country,
      state,
      city,
      fullName,
      businessName,
      contactNumber,
      alternateNumber: alternateNumber || '',
      email,
      gstin: gstin || '',
      msme: msme || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode || '',
      accountHolderName: accountHolderName || '',
      bankName: bankName || '',
      upiId: upiId || '',
      upiNumber: upiNumber || '',
      supplierFor: parsedSupplierFor,
      documents,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Supplier created successfully with ID: ${supplier.supplierId}`,
      data: supplier,
    });
  } catch (error) {
    console.error('Error creating supplier:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(500).json({ success: false, message: 'Server error while creating supplier' });
  }
});

// @route   GET /api/suppliers/search
// @route   GET /api/suppliers/locations
// @desc    Get countries, states, and cities from the main website database
router.get("/locations", protect, verifiedOnly, async (req, res) => {
  try {
    if (crmDb.readyState !== 1) await crmDb.asPromise();
    const databaseNames = [process.env.MAIN_DB_NAME || "FRISKYTRAILS_MAIN", "friskytrails"];
    let locations = null;
    for (const databaseName of databaseNames.filter((name, index, names) => names.indexOf(name) === index)) {
      const db = crmDb.client.db(databaseName);
      const [countries, states, cities] = await Promise.all([
        db.collection("countries").find({}, { projection: { name: 1 } }).sort({ name: 1 }).toArray(),
        db.collection("states").find({}, { projection: { name: 1, country: 1 } }).sort({ name: 1 }).toArray(),
        db.collection("cities").find({}, { projection: { name: 1, country: 1, state: 1 } }).sort({ name: 1 }).toArray(),
      ]);
      if (countries.length || states.length || cities.length) { locations = { countries, states, cities }; break; }
    }
    locations = locations || { countries: [], states: [], cities: [] };
    res.json({ success: true, data: {
      countries: locations.countries.map(({ _id, name }) => ({ id: String(_id), name })),
      states: locations.states.map(({ _id, name, country }) => ({ id: String(_id), name, country: String(country) })),
      cities: locations.cities.map(({ _id, name, country, state }) => ({ id: String(_id), name, country: String(country), state: String(state) })),
    }});
  } catch (error) {
    console.error("Error fetching website locations:", error);
    res.status(500).json({ success: false, message: "Server error while fetching locations" });
  }
});

// @desc    Advanced search for suppliers
// @access  Protected (verified employees & admins)
router.get('/search', protect, verifiedOnly, async (req, res) => {
  try {
    const { supplierId, fullName, businessName, contactNumber, city, supplierFor, q } = req.query;
    const filter = {};

    // Standard simple search logic
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { fullName: regex },
        { businessName: regex },
        { city: regex },
        { supplierId: regex },
      ];
    }
    
    // Advanced filters
    if (supplierId) filter.supplierId = new RegExp(supplierId.trim(), 'i');
    if (fullName) filter.fullName = new RegExp(fullName.trim(), 'i');
    if (businessName) filter.businessName = new RegExp(businessName.trim(), 'i');
    if (contactNumber) filter.contactNumber = new RegExp(contactNumber.trim(), 'i');
    if (city) filter.city = new RegExp(city.trim(), 'i');
    if (supplierFor) filter.supplierFor = supplierFor; // Array inclusion match

    const suppliers = await Supplier.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error searching suppliers:', error);
    res.status(500).json({ success: false, message: 'Server error while searching suppliers' });
  }
});

// @route   GET /api/suppliers
// @desc    Get all suppliers
// @access  Protected (verified employees & admins)
router.get('/', protect, verifiedOnly, async (req, res) => {
  try {
    const suppliers = await Supplier.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching suppliers' });
  }
});

// @route   GET /api/suppliers/:supplierId
// @desc    Get a single supplier by supplierId
// @access  Protected (verified employees & admins)
router.get('/:supplierId', protect, verifiedOnly, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierId: req.params.supplierId })
      .populate('createdBy', 'name email');

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching supplier' });
  }
});

// @route   PUT /api/suppliers/:supplierId
// @desc    Update a supplier by supplierId
// @access  Protected (verified employees & admins)
router.put('/:supplierId', protect, verifiedOnly, upload.array('documents', 10), async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ supplierId: req.params.supplierId });

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const {
      country, state, city,
      fullName, businessName, contactNumber, alternateNumber, email,
      gstin, msme, accountNumber, ifscCode, accountHolderName, bankName, upiId, upiNumber,
      supplierFor, status, removeDocumentIndexes,
    } = req.body;

    // Update text fields if provided
    if (country !== undefined) supplier.country = country;
    if (state !== undefined) supplier.state = state;
    if (city !== undefined) supplier.city = city;
    if (fullName !== undefined) supplier.fullName = fullName;
    if (businessName !== undefined) supplier.businessName = businessName;
    if (contactNumber !== undefined) supplier.contactNumber = contactNumber;
    if (alternateNumber !== undefined) supplier.alternateNumber = alternateNumber;
    if (email !== undefined) supplier.email = email;
    if (gstin !== undefined) supplier.gstin = gstin;
    if (msme !== undefined) supplier.msme = msme;
    if (accountNumber !== undefined) supplier.accountNumber = accountNumber;
    if (ifscCode !== undefined) supplier.ifscCode = ifscCode;
    if (accountHolderName !== undefined) supplier.accountHolderName = accountHolderName;
    if (bankName !== undefined) supplier.bankName = bankName;
    if (upiId !== undefined) supplier.upiId = upiId;
    if (upiNumber !== undefined) supplier.upiNumber = upiNumber;
    
    // Status update logic (admin only)
    if (status !== undefined && status !== supplier.status) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Only admins can change supplier status.' });
      }
      supplier.status = status;
    }

    // Update supplierFor categories
    if (supplierFor) {
      let parsedSupplierFor = [];
      try {
        parsedSupplierFor = JSON.parse(supplierFor);
      } catch {
        parsedSupplierFor = supplierFor.split(',').map(s => s.trim()).filter(Boolean);
      }
      supplier.supplierFor = parsedSupplierFor;
    }

    // Remove documents by index if requested
    if (removeDocumentIndexes) {
      let indexesToRemove = [];
      try {
        indexesToRemove = JSON.parse(removeDocumentIndexes);
      } catch {
        indexesToRemove = [];
      }
      if (indexesToRemove.length > 0) {
        supplier.documents = supplier.documents.filter((_, idx) => !indexesToRemove.includes(idx));
      }
    }

    // Append newly uploaded documents
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        supplier.documents.push({
          url: file.path || file.secure_url || file.url,
          name: file.originalname,
        });
      }
    }

    await supplier.save();

    // Re-populate createdBy for the response
    await supplier.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier,
    });
  } catch (error) {
    console.error('Error updating supplier:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(500).json({ success: false, message: 'Server error while updating supplier' });
  }
});

module.exports = router;
