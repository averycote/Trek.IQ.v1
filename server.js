import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { LRUCache } from "lru-cache";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced middleware with optimizations
app.use(helmet({
  contentSecurityPolicy: false // Temporarily disable CSP for Mapbox
}));

// Enhanced compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Optimized logging
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
}));

app.use(express.json({ limit: '10mb' }));

// Enhanced CORS configuration for Railway
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost, local network access, and Railway deployment
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080',
      /^http:\/\/192\.168\.\d+\.\d+:(3000|8080)$/,  // Allow local network IPs
      /^http:\/\/10\.\d+\.\d+\.\d+:(3000|8080)$/,   // Allow 10.x.x.x network
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:(3000|8080)$/,  // Allow 172.16-31.x.x network
      /^https:\/\/.*\.railway\.app$/,  // Allow Railway deployment
      /^https:\/\/.*\.up\.railway\.app$/  // Allow Railway deployment (alternative domain)
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      // In production, allow all origins for now (Railway might have dynamic URLs)
      if (process.env.NODE_ENV === 'production') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Rate limiting for API protection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Enhanced LRU Cache
const routeCache = new LRUCache({
  max: 5000,
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true,
  allowStale: true
});

const datasetCache = new LRUCache({
  max: 100,
  ttl: 1000 * 60 * 60 * 24, // 24 hours for datasets
  updateAgeOnGet: true,
  allowStale: true
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    performance: {
      routeCacheSize: routeCache.size,
      datasetCacheSize: datasetCache.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
  res.json(health);
});

// Simple health check for Railway
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Example backend route
app.get("/api/hello", (req, res) => {
  res.json({ message: "Trek.iQ backend is working 🚀" });
});

// Geocoding endpoint
app.get('/api/geocode', async (req, res) => {
  try {
    const query = req.query.q || req.query.query;
    const limit = req.query.limit || 5;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" or "query" is required' });
    }

    // Check cache first
    const cacheKey = `geocode_${query}_${limit}`;
    const cachedResult = routeCache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // Call Nominatim API
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Trek.IQ/1.0 (accessibility mapping application)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    routeCache.set(cacheKey, data);
    
    res.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Geocoding service unavailable' });
  }
});

// Route calculation endpoint
app.post('/api/route', async (req, res) => {
  try {
    const { origin, destination, mode = 'walking', avoidSteps = false, winterMode = false } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }
    
    // Check cache
    const cacheKey = `route_${JSON.stringify({ origin, destination, mode, avoidSteps, winterMode })}`;
    const cachedRoute = routeCache.get(cacheKey);
    if (cachedRoute) {
      return res.json(cachedRoute);
    }
    
    // Simplified route calculation for demo
    const distance = calculateDistance(origin, destination);
    const duration = mode === 'walking' ? distance * 12 : distance * 3; // minutes
    
    const route = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          mode,
          distance: distance * 1000, // meters
          duration: duration * 60, // seconds
          avoidSteps,
          winterMode,
          accessibility: {
            hasSidewalks: true,
            hasCurbCuts: true,
            surfaceType: 'paved',
            elevation: 'minimal'
          }
        },
        geometry: {
          type: 'LineString',
          coordinates: [
            [origin.lng, origin.lat],
            [destination.lng, destination.lat]
          ]
        }
      }]
    };
    
    // Cache the result
    routeCache.set(cacheKey, route);
    
    res.json(route);
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: 'Route calculation failed' });
  }
});

// Distance calculation helper
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

// Data serving endpoint for GeoJSON files
app.get('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Check cache
    const cacheKey = `dataset_${filename}`;
    const cachedData = datasetCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Load from server/data directory
    const filePath = path.join(__dirname, 'server/data', decodeURIComponent(filename));
    
    try {
      const { readFile } = await import('fs/promises');
      await readFile(filePath, 'utf8'); // Check if file exists
      const data = await readFile(filePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      // Cache the dataset
      datasetCache.set(cacheKey, jsonData);
      
      res.json(jsonData);
    } catch (fileError) {
      console.error(`File not found: ${filePath}`);
      return res.status(404).json({ error: 'Dataset not found', path: filePath });
    }
  } catch (error) {
    console.error(`Error serving dataset ${req.params.filename}:`, error);
    res.status(404).json({ error: 'Dataset not found', details: error.message });
  }
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Catch-all handler for SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  routeCache.clear();
  datasetCache.clear();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  routeCache.clear();
  datasetCache.clear();
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Trek.IQ Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}/`);
  console.log(`🔧 Backend API: http://localhost:${PORT}/api/...`);
  console.log(`📊 Cache initialized - Route cache: ${routeCache.size}, Dataset cache: ${datasetCache.size}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
