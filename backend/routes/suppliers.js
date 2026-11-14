const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const Booking = require('../models/Booking');
const BulkSettlement = require('../models/BulkSettlement');
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

// @route   GET /api/suppliers/reconciliation
// @desc    List supplier identities with live service and payment totals
router.get('/reconciliation', protect, verifiedOnly, async (req, res) => {
  try {
    const { country = 'India', state, city } = req.query;
    const supplierFilter = {};
    const locationRegex = (value) => new RegExp(`^\\s*${value.trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*$`, 'i');
    if (country && country.trim()) supplierFilter.country = locationRegex(country);
    if (state && state.trim()) supplierFilter.state = locationRegex(state);
    if (city && city.trim()) supplierFilter.city = locationRegex(city);

    const suppliers = await Supplier.find(supplierFilter)
      .select('supplierId fullName businessName country state city totalAmountPaid status')
      .sort({ businessName: 1, fullName: 1 })
      .lean();

    const totals = await Booking.aggregate([
      { $unwind: '$services' },
      {
        $project: {
          supplierRef: { $ifNull: ['$services.supplier', '$services.supplierSupplierId'] },
          supplierCode: '$services.supplierSupplierId',
          bookingId: 1,
          travellerName: 1,
          service: {
            serviceId: '$services.serviceId',
            supplierType: '$services.supplierType',
            supplierName: '$services.supplierName',
            supplierSupplierId: '$services.supplierSupplierId',
            b2bCost: { $ifNull: ['$services.b2bCost', 0] },
            totalDue: { $ifNull: ['$services.totalDue', 0] },
            startDate: '$services.startDate',
            endDate: '$services.endDate',
            adults: { $ifNull: ['$services.adults', 0] },
            children: { $ifNull: ['$services.children', 0] },
            serviceStatus: '$services.serviceStatus',
            mealPlan: '$services.mealPlan',
            roomType: '$services.roomType',
            numberOfRooms: '$services.numberOfRooms',
            transportType: '$services.transportType',
            productName: '$services.productName',
            packageName: '$services.packageName',
            outsourceName: '$services.outsourceName',
            generatedPayments: {
              $filter: {
                input: { $ifNull: ['$services.payments', []] },
                as: 'payment',
                cond: {
                  $or: [
                    { $eq: ['$$payment.isGenerated', true] },
                    { $regexMatch: { input: { $ifNull: ['$$payment.paymentId', ''] }, regex: '^GPAY-' } },
                  ],
                },
              },
            },
            supplierPayments: {
              $filter: {
                input: { $ifNull: ['$services.payments', []] },
                as: 'payment',
                cond: {
                  $and: [
                    { $eq: ['$$payment.paymentFrom', 'Traveller'] },
                    { $eq: ['$$payment.paymentTo', 'Supplier'] },
                    { $eq: ['$$payment.accountSubMode', 'Supplier'] },
                    { $ne: ['$$payment.isGenerated', true] },
                  ],
                },
              },
            },
            bookingStartDate: '$startDate',
            bookingEndDate: '$endDate',
          },
          totalAmount: { $ifNull: ['$services.b2bCost', 0] },
          paidAmount: {
            $reduce: {
              input: {
                $filter: {
                  input: { $ifNull: ['$services.payments', []] },
                  as: 'payment',
                  cond: {
                    $and: [
                      { $eq: ['$$payment.status', 'VERIFIED'] },
                      { $eq: ['$$payment.paymentFrom', 'Company'] },
                      { $eq: ['$$payment.paymentTo', 'Supplier'] },
                    ],
                  },
                },
              },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.paidAmount', 0] }] },
            },
          },
          settledAmount: {
            $add: [
              { $ifNull: ['$services.collectionBySupplier', 0] },
              {
                $reduce: {
                  input: {
                    $filter: {
                      input: { $ifNull: ['$services.payments', []] },
                      as: 'payment',
                      cond: { $eq: ['$$payment.status', 'VERIFIED'] },
                    },
                  },
                  initialValue: 0,
                  in: { $add: ['$$value', { $ifNull: ['$$this.paidAmount', 0] }] },
                },
              },
            ],
          },
        },
      },
      { $match: { supplierRef: { $ne: null } } },
      {
        $group: {
          _id: '$supplierRef',
          serviceCount: {
            $sum: { $cond: [{ $ne: ['$service.serviceStatus', 'Cancelled No Charges'] }, 1, 0] },
          },
          totalAmount: {
            $sum: { $cond: [{ $ne: ['$service.serviceStatus', 'Cancelled No Charges'] }, '$totalAmount', 0] },
          },
          paidAmount: {
            $sum: { $cond: [{ $ne: ['$service.serviceStatus', 'Cancelled No Charges'] }, '$settledAmount', 0] },
          },
          services: {
            $push: {
              $mergeObjects: [
                '$service',
                { bookingId: '$bookingId', travellerName: '$travellerName', paidAmount: '$paidAmount', settledAmount: '$settledAmount' },
              ],
            },
          },
        },
      },
    ]);

    const manualSupplierPayments = await Booking.aggregate([
      { $unwind: '$payments' },
      {
        $match: {
          'payments.supplier': { $ne: null },
          'payments.paymentFrom': 'TRAVELER',
          'payments.paymentTo': 'SUPPLIER',
          'payments.paymentMode': 'Supplier',
        },
      },
      {
        $group: {
          _id: '$payments.supplier',
          payments: {
            $push: {
              paymentSubdocumentId: '$payments._id',
              paymentId: '$payments.paymentId',
              paymentDate: '$payments.paymentDate',
              paidAmount: '$payments.amountPaid',
              paymentMode: '$payments.paymentMode',
              status: '$payments.status',
              details: '$payments.details',
              paymentFrom: '$payments.paymentFrom',
              paymentTo: '$payments.paymentTo',
              bookingId: '$bookingId',
              travellerName: '$travellerName',
            },
          },
        },
      },
    ]);
    const manualPaymentsBySupplier = new Map(manualSupplierPayments.map((row) => [String(row._id), row.payments]));

    const totalsByKey = new Map(totals.map((row) => [String(row._id), row]));
    const data = suppliers.map((supplier) => {
      const row = totalsByKey.get(String(supplier._id)) || totalsByKey.get(supplier.supplierId) || {};
      const totalAmount = Number(row.totalAmount || 0);
      const paidAmount = Number(row.paidAmount || 0);
      return {
        ...supplier,
        serviceCount: Number(row.serviceCount || 0),
        totalAmount,
        paidAmount,
        dueAmount: totalAmount - paidAmount,
        services: row.services || [],
        supplierPayments: manualPaymentsBySupplier.get(String(supplier._id)) || [],
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error loading supplier reconciliation:', error);
    res.status(500).json({ success: false, message: 'Server error while loading supplier reconciliation' });
  }
});

// @route POST /api/suppliers/bulk-settlements
// Create a parent settlement while preserving every generated payment ID.
router.post('/bulk-settlements', protect, verifiedOnly, async (req, res) => {
  try {
    const { supplierId, generatedItems = [] } = req.body;
    const supplier = await Supplier.findOne({ $or: [{ _id: supplierId }, { supplierId }] });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one generated payment ID' });
    }

    const items = [];
    for (const requested of generatedItems) {
      if (!requested.bookingId || !requested.serviceId || !requested.paymentSubdocumentId || !mongoose.Types.ObjectId.isValid(requested.paymentSubdocumentId)) {
        return res.status(400).json({ success: false, message: 'Invalid generated payment selection' });
      }
      const booking = await Booking.findOne({ bookingId: requested.bookingId });
      const service = booking?.services.find((entry) => entry.serviceId === requested.serviceId && (String(entry.supplier) === String(supplier._id) || entry.supplierSupplierId === supplier.supplierId));
      const payment = service?.payments.id(requested.paymentSubdocumentId);
      if (!payment || (!payment.isGenerated && !String(payment.paymentId || '').startsWith('GPAY-'))) {
        return res.status(400).json({ success: false, message: `Generated payment ${requested.paymentId || ''} was not found for this supplier` });
      }
      items.push({ bookingId: booking.bookingId, serviceId: service.serviceId, paymentSubdocumentId: payment._id, paymentId: payment.paymentId, amount: Number(payment.paidAmount || 0) });
    }
    const duplicate = await BulkSettlement.findOne({ 'generatedItems.paymentSubdocumentId': { $in: items.map(item => item.paymentSubdocumentId) } });
    if (duplicate) return res.status(400).json({ success: false, message: 'One or more generated IDs are already included in a bulk settlement' });

    const bulkSettlement = await BulkSettlement.create({
      bulkSettlementId: `BULK-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      supplier: supplier._id,
      generatedItems: items,
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, data: bulkSettlement });
  } catch (error) {
    console.error('Create bulk settlement error:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to create bulk settlement' });
  }
});

// @route GET /api/suppliers/bulk-settlements?supplierId=...
router.get('/bulk-settlements', protect, verifiedOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.supplierId) {
      const supplier = await Supplier.findOne({ $or: [{ _id: req.query.supplierId }, { supplierId: req.query.supplierId }] }).select('_id');
      if (!supplier) return res.json({ success: true, data: [] });
      filter.supplier = supplier._id;
    }
    const data = await BulkSettlement.find(filter).populate('supplier', 'supplierId fullName businessName').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (error) {
    console.error('List bulk settlements error:', error);
    res.status(500).json({ success: false, message: 'Unable to load bulk settlements' });
  }
});

// @route DELETE /api/suppliers/bulk-settlements/:bulkSettlementId/generated-items/:paymentSubdocumentId
// Remove a generated payment ID from a bulk settlement without deleting the original payment.
router.delete('/bulk-settlements/:bulkSettlementId/generated-items/:paymentSubdocumentId', protect, verifiedOnly, async (req, res) => {
  try {
    const { bulkSettlementId, paymentSubdocumentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentSubdocumentId)) {
      return res.status(400).json({ success: false, message: 'Invalid generated payment ID' });
    }
    const bulkSettlement = await BulkSettlement.findOne({ bulkSettlementId });
    if (!bulkSettlement) return res.status(404).json({ success: false, message: 'Bulk settlement not found' });
    if (bulkSettlement.generatedItems.length <= 1) {
      return res.status(400).json({ success: false, message: 'A bulk settlement must keep at least one generated ID' });
    }
    const itemExists = bulkSettlement.generatedItems.some((item) => String(item.paymentSubdocumentId) === paymentSubdocumentId);
    if (!itemExists) return res.status(404).json({ success: false, message: 'Generated payment is not linked to this bulk settlement' });

    bulkSettlement.generatedItems = bulkSettlement.generatedItems.filter((item) => String(item.paymentSubdocumentId) !== paymentSubdocumentId);
    await bulkSettlement.save();
    res.json({ success: true, data: bulkSettlement });
  } catch (error) {
    console.error('Remove generated payment from bulk settlement error:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to remove generated payment' });
  }
});

// @route DELETE /api/suppliers/bulk-settlements/:bulkSettlementId/supplier-payments/:paymentSubdocumentId
// Remove a supplier payment from a bulk settlement without deleting the original payment.
router.delete('/bulk-settlements/:bulkSettlementId/supplier-payments/:paymentSubdocumentId', protect, verifiedOnly, async (req, res) => {
  try {
    const { bulkSettlementId, paymentSubdocumentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paymentSubdocumentId)) {
      return res.status(400).json({ success: false, message: 'Invalid supplier payment ID' });
    }
    const bulkSettlement = await BulkSettlement.findOne({ bulkSettlementId });
    if (!bulkSettlement) return res.status(404).json({ success: false, message: 'Bulk settlement not found' });
    const itemExists = bulkSettlement.supplierPaymentItems.some((item) => String(item.paymentSubdocumentId) === paymentSubdocumentId);
    if (!itemExists) return res.status(404).json({ success: false, message: 'Supplier payment is not linked to this bulk settlement' });

    bulkSettlement.supplierPaymentItems = bulkSettlement.supplierPaymentItems.filter((item) => String(item.paymentSubdocumentId) !== paymentSubdocumentId);
    await bulkSettlement.save();
    res.json({ success: true, data: bulkSettlement });
  } catch (error) {
    console.error('Remove supplier payment from bulk settlement error:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to remove supplier payment' });
  }
});

// @route POST /api/suppliers/bulk-settlements/:bulkSettlementId/payments
router.post('/bulk-settlements/:bulkSettlementId/payments', protect, verifiedOnly, async (req, res) => {
  try {
    const bulkSettlement = await BulkSettlement.findOne({ bulkSettlementId: req.params.bulkSettlementId });
    if (!bulkSettlement) return res.status(404).json({ success: false, message: 'Bulk settlement not found' });
    const { paymentItems = [] } = req.body;
    if (!Array.isArray(paymentItems) || paymentItems.length === 0) return res.status(400).json({ success: false, message: 'Select at least one supplier payment' });

    const existingIds = new Set((bulkSettlement.supplierPaymentItems || []).map(item => String(item.paymentSubdocumentId)));
    const selected = [];
    for (const requested of paymentItems) {
      if (!requested.bookingId || !requested.paymentSubdocumentId || !mongoose.Types.ObjectId.isValid(requested.paymentSubdocumentId)) {
        return res.status(400).json({ success: false, message: 'Invalid supplier payment selection' });
      }
      if (existingIds.has(String(requested.paymentSubdocumentId))) continue;
      const booking = await Booking.findOne({ bookingId: requested.bookingId, 'payments._id': requested.paymentSubdocumentId });
      const payment = booking?.payments.id(requested.paymentSubdocumentId);
      if (!payment || String(payment.supplier) !== String(bulkSettlement.supplier) || payment.paymentFrom !== 'TRAVELER' || payment.paymentTo !== 'SUPPLIER' || payment.paymentMode !== 'Supplier') {
        return res.status(400).json({ success: false, message: `Supplier payment ${requested.paymentId || ''} was not found for this supplier` });
      }
      const alreadyUsed = await BulkSettlement.exists({ 'supplierPaymentItems.paymentSubdocumentId': payment._id });
      if (alreadyUsed) return res.status(400).json({ success: false, message: `Supplier payment ${payment.paymentId} is already assigned to a bulk settlement` });
      selected.push({ bookingId: booking.bookingId, paymentSubdocumentId: payment._id, paymentId: payment.paymentId, amount: Number(payment.amountPaid || 0) });
    }
    bulkSettlement.supplierPaymentItems.push(...selected);
    await bulkSettlement.save();
    res.json({ success: true, data: bulkSettlement });
  } catch (error) {
    console.error('Apply supplier payments to bulk settlement error:', error);
    res.status(500).json({ success: false, message: error.message || 'Unable to apply supplier payments' });
  }
});

// @desc    Advanced search for suppliers
// @access  Protected (verified employees & admins)
router.get('/search', protect, verifiedOnly, async (req, res) => {
  try {
    const { supplierId, fullName, businessName, contactNumber, city, state, country, supplierFor, q } = req.query;
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
    if (state) filter.state = new RegExp(state.trim(), 'i');
    if (country) filter.country = new RegExp(country.trim(), 'i');
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
