const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const path = require('path');

// Configure Cloudinary credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || 'ft_placeholder_cloud',
  api_key: process.env.CLOUDINARY_API_KEY || 'ft_placeholder_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'ft_placeholder_secret'
});

// Configure Multer Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPdf = ext === '.pdf';
    return {
      folder: 'ft_bookings',
      resource_type: isPdf ? 'raw' : 'image',
      public_id: Date.now() + '-' + path.basename(file.originalname, ext),
      format: isPdf ? 'pdf' : undefined
    };
  }
});

// Strictly allow only PNG, JPG, JPEG, and PDF formats
const fileFilter = (req, file, cb) => {
  const allowedExts = ['.png', '.jpg', '.jpeg', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    const error = new Error('Only PNG, JPG, and PDF are allowed.');
    error.status = 400; // Custom status field
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: fileFilter
});

module.exports = upload;
