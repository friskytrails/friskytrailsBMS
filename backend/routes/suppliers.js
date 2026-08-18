const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const { protect, verifiedOnly } = require('../middleware/auth');
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

module.exports = router;
