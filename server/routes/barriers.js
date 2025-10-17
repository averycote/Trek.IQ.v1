const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();
const db = require('../database');
const emailService = require('../emailService');

// Rate limiting for barrier reports
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 reports per windowMs
  message: 'Too many barrier reports from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'barrier-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validation schemas
const barrierReportSchema = z.object({
  lat: z.coerce.number().min(44.6).max(44.7),
  lng: z.coerce.number().min(-63.7).max(-63.5),
  type: z.enum([
    'steps_stairs',
    'steep_slope',
    'obstructed_path',
    'inaccessible_entrance',
    'no_curb_cut',
    'poor_lighting',
    'construction',
    'snow_ice',
    'other'
  ]),
  severity: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
  description: z.string().optional(),
  locationDetails: z.string().optional(),
  contact: z.object({
    name: z.string().optional(),
    email: z.string().email().optional()
  }).optional()
});

const statusUpdateSchema = z.object({
  status: z.enum(['new', 'in_review', 'resolved'])
});

// Basic Auth middleware
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Access"');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [username, password] = credentials.split(':');
  
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'changeme';
  
  if (username === adminUser && password === adminPass) {
    req.adminUser = username;
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Access"');
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

// Admin verification endpoint
router.get('/admin/verify', basicAuth, (req, res) => {
  res.json({ 
    authenticated: true, 
    user: req.adminUser,
    timestamp: new Date().toISOString()
  });
});

// POST /api/barriers/report - Report a new barrier
router.post('/report', reportLimiter, upload.single('photo'), async (req, res) => {
  try {
    // Validate request body
    const validatedData = barrierReportSchema.parse(req.body);
    
    // Generate unique ID
    const barrierId = uuidv4();
    
    // Handle photo upload
    let photoUrl = null;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }
    
    // Create barrier object
    const barrier = {
      id: barrierId,
      lat: validatedData.lat,
      lng: validatedData.lng,
      type: validatedData.type,
      severity: validatedData.severity,
      notes: validatedData.notes || validatedData.description || '',
      contact: validatedData.contact,
      photoUrl: photoUrl
    };
    
    // Save to database
    await db.insertBarrier(barrier);
    
    // Send email notification
    try {
      await emailService.sendBarrierReport(barrier);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the request if email fails
    }
    
    res.json({
      status: 'ok',
      id: barrierId,
      message: 'Barrier report submitted successfully'
    });
    
  } catch (error) {
    console.error('Error reporting barrier:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    }
    
    res.status(500).json({
      error: 'Failed to submit barrier report',
      message: error.message
    });
  }
});

// GET /api/barriers - Get all barriers as GeoJSON
router.get('/', async (req, res) => {
  try {
    const barriers = await db.getAllBarriers();
    
    // Convert to GeoJSON FeatureCollection
    const geojson = {
      type: 'FeatureCollection',
      features: barriers.map(barrier => ({
        type: 'Feature',
        properties: {
          id: barrier.id,
          type: barrier.type,
          severity: barrier.severity,
          notes: barrier.notes,
          contact_name: barrier.contact_name,
          contact_email: barrier.contact_email,
          photo_url: barrier.photo_url,
          status: barrier.status,
          created_at: barrier.created_at
        },
        geometry: {
          type: 'Point',
          coordinates: [barrier.lng, barrier.lat]
        }
      }))
    };
    
    res.json(geojson);
    
  } catch (error) {
    console.error('Error fetching barriers:', error);
    res.status(500).json({
      error: 'Failed to fetch barriers',
      message: error.message
    });
  }
});

// PATCH /api/barriers/:id/status - Update barrier status (admin only)
router.patch('/:id/status', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = statusUpdateSchema.parse(req.body);
    
    const result = await db.updateBarrierStatus(id, validatedData.status);
    
    if (result === 0) {
      return res.status(404).json({
        error: 'Barrier not found'
      });
    }
    
    res.json({
      status: 'ok',
      message: 'Barrier status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating barrier status:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Invalid status value',
        details: error.errors
      });
    }
    
    res.status(500).json({
      error: 'Failed to update barrier status',
      message: error.message
    });
  }
});

// GET /api/barriers/user-reported - Get user-reported barriers (public access)
router.get('/user-reported', async (req, res) => {
  try {
    const barriers = await db.getAllBarriers();
    
    // Convert to GeoJSON FeatureCollection for user-reported barriers
    const geojson = {
      type: 'FeatureCollection',
      features: barriers.map(barrier => ({
        type: 'Feature',
        properties: {
          id: barrier.id,
          type: barrier.type,
          severity: barrier.severity,
          notes: barrier.notes,
          status: barrier.status,
          created_at: barrier.created_at
        },
        geometry: {
          type: 'Point',
          coordinates: [barrier.lng, barrier.lat]
        }
      }))
    };
    
    res.json(geojson);
    
  } catch (error) {
    console.error('Error fetching user-reported barriers:', error);
    res.status(500).json({
      error: 'Failed to fetch user-reported barriers',
      message: error.message
    });
  }
});

// GET /api/barriers/:id - Get specific barrier (admin only)
router.get('/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const barrier = await db.getBarrierById(id);
    
    if (!barrier) {
      return res.status(404).json({
        error: 'Barrier not found'
      });
    }
    
    res.json(barrier);
    
  } catch (error) {
    console.error('Error fetching barrier:', error);
    res.status(500).json({
      error: 'Failed to fetch barrier',
      message: error.message
    });
  }
});

// Serve uploaded files
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

module.exports = router;
