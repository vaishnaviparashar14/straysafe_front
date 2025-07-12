const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Upload single image
router.post('/image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { folder = 'straysafe' } = req.body;

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: folder,
          public_id: `${folder}_${Date.now()}`,
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(req.file.buffer);
    });

    res.json({
      message: 'Image uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/images', verifyToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const { folder = 'straysafe' } = req.body;

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            public_id: `${folder}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            transformation: [
              { width: 1200, height: 800, crop: 'limit' },
              { quality: 'auto' },
              { fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
                width: result.width,
                height: result.height,
                format: result.format,
                bytes: result.bytes
              });
            }
          }
        ).end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);

    res.json({
      message: 'Images uploaded successfully',
      images: results,
      count: results.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// Upload avatar image
router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    // Upload to Cloudinary with avatar-specific transformations
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: 'straysafe/avatars',
          public_id: `avatar_${req.user.id}_${Date.now()}`,
          transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(req.file.buffer);
    });

    res.json({
      message: 'Avatar uploaded successfully',
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Delete image from Cloudinary
router.delete('/image/:publicId', verifyToken, async (req, res) => {
  try {
    const publicId = req.params.publicId;

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({ message: 'Image deleted successfully' });
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get image transformation URL
router.post('/transform', verifyToken, async (req, res) => {
  try {
    const { publicId, transformations } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Generate transformation URL
    const transformedUrl = cloudinary.url(publicId, {
      transformation: transformations || [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    res.json({
      message: 'Transformation URL generated',
      url: transformedUrl,
      public_id: publicId
    });
  } catch (error) {
    console.error('Transform error:', error);
    res.status(500).json({ error: 'Failed to generate transformation' });
  }
});

// Get upload signature for direct uploads (for frontend)
router.post('/signature', verifyToken, async (req, res) => {
  try {
    const { folder = 'straysafe' } = req.body;
    
    const timestamp = Math.round(Date.now() / 1000);
    const params = {
      timestamp: timestamp,
      folder: folder,
      public_id: `${folder}_${req.user.id}_${timestamp}`,
      transformation: 'w_1200,h_800,c_limit,q_auto,f_auto'
    };

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder: params.folder,
      public_id: params.public_id
    });
  } catch (error) {
    console.error('Signature error:', error);
    res.status(500).json({ error: 'Failed to generate signature' });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 10 files.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field.' });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
});

module.exports = router;