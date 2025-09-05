const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { LRUCache } = require('lru-cache');
const rateLimit = require('express-rate-limit');

// Import database and routes
const db = require('./database');
const barrierRoutes = require('./routes/barriers');
const aiRoutes = require('./routes/ai');
const geocodingRoutes = require('./routes/geocoding');
const wheelmapRoutes = require('./routes/wheelmap');

const app = express();
const PORT = process.env.PORT || 8081;

// Enhanced middleware with optimizations
app.use(helmet({
  contentSecurityPolicy: false // Temporarily disable CSP to test Mapbox
}));

// Enhanced compression with better settings
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

// Enhanced CORS configuration
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
      /^http:\/\/192\.168\.\d+\.\d+:3000$/,  // Allow local network IPs
      /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,   // Allow 10.x.x.x network
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,  // Allow 172.16-31.x.x network
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

// Enhanced LRU Cache with better settings
const routeCache = new LRUCache({
  max: 5000, // Increased cache size for better performance
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true,
  allowStale: true,
  maxSize: 50000000, // 50MB max size
  sizeCalculation: (value, key) => {
    // Estimate size based on JSON string length
    return JSON.stringify(value).length;
  },
  dispose: (key, value) => {
    // Clean up large objects
    if (value && typeof value === 'object') {
      Object.keys(value).forEach(k => delete value[k]);
    }
  }
});

// Dataset cache for better performance
const datasetCache = new LRUCache({
  max: 100, // Increased for more datasets
  ttl: 1000 * 60 * 60 * 24, // 24 hours for datasets
  updateAgeOnGet: true,
  allowStale: true,
  maxSize: 100000000, // 100MB max size for large datasets
  sizeCalculation: (value, key) => {
    // Estimate size based on JSON string length
    return JSON.stringify(value).length;
  }
});

// Geocoding cache for search performance
const geocodingCache = new LRUCache({
  max: 10000, // Large cache for geocoding results
  ttl: 1000 * 60 * 60 * 24, // 24 hours for geocoding
  updateAgeOnGet: true,
  allowStale: true,
  maxSize: 10000000, // 10MB max size
  sizeCalculation: (value, key) => {
    // Estimate size based on JSON string length
    return JSON.stringify(value).length;
  }
});

// Health check endpoint with enhanced monitoring
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    performance: {
      routeCacheSize: routeCache.size,
      datasetCacheSize: datasetCache.size,
      geocodingCacheSize: geocodingCache.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      routeCacheSize: routeCache.size,
      datasetCacheSize: datasetCache.size
    }
  };
  
  res.json(health);
});

// Health check endpoint (simple)
app.get('/healthz', (req, res) => {
  res.status(200).json({ 
    ok: true, 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Transit API ping endpoint
app.get('/api/transit/ping', async (req, res) => {
  try {
    // Simple endpoint that doesn't require API key validation
    // This helps check if the Transit API infrastructure is accessible
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      // Use a simple HEAD request to check connectivity
      const response = await fetch('https://external.transitapp.com/v3', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status === 405) { // 405 Method Not Allowed is fine for HEAD
        res.status(200).json({
          status: 'available',
          message: 'Transit API infrastructure is accessible',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(502).json({
          status: 'unavailable',
          message: `Transit API returned status: ${response.status}`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('[Transit API Ping Error]', error.message);
    res.status(502).json({
      status: 'error',
      message: 'Transit API is not accessible',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Optimized geocoding endpoint with enhanced caching
app.get('/api/geocode', async (req, res) => {
  try {
    console.log('Geocoding request received:', {
      query: req.query,
      url: req.url,
      method: req.method
    });
    
    // Support both 'q' and 'query' parameters for compatibility
    const query = req.query.q || req.query.query;
    const limit = req.query.limit || 5;
    
    if (!query) {
      console.log('Missing query parameter');
      return res.status(400).json({ error: 'Query parameter "q" or "query" is required' });
    }

    console.log(`Geocoding request for: ${query}`);

    // Check cache first
    const cacheKey = `geocode_${query}_${limit}`;
    const cachedResult = routeCache.get(cacheKey);
    if (cachedResult) {
      console.log(`Geocoding cache hit for: ${query}`);
      return res.json(cachedResult);
    }

    // Call Nominatim API
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}`;
    
    console.log(`Calling Nominatim API: ${nominatimUrl}`);
    
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
    
    console.log(`Geocoding successful for: ${query}, found ${data.length} results`);
    res.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Geocoding service unavailable' });
  }
});

// Optimized civic address search with caching
async function searchCivicAddresses(query, limit) {
  try {
    const cacheKey = `civic_${query}_${limit}`;
    const cachedResult = datasetCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const fs = require('fs').promises;
    const path = require('path');
    
    // Load civic addresses data
    const civicPath = path.join(__dirname, 'data', 'CivicAddresses_-5590432719903009914.geojson');
    const civicData = await fs.readFile(civicPath, 'utf8');
    const civicAddresses = JSON.parse(civicData);
    
    if (!civicAddresses.features) {
      return [];
    }
    
    const searchTerm = query.toLowerCase();
    const results = [];
    
    // Optimized search with early termination
    for (const feature of civicAddresses.features) {
      if (results.length >= limit) break;
      
      const properties = feature.properties || {};
      const address = properties.ADDRESS || '';
      const streetName = properties.STREET_NAME || '';
      const civicNumber = properties.CIVIC_NUMBER || '';
      
      // Enhanced search matching
      if (address.toLowerCase().includes(searchTerm) ||
          streetName.toLowerCase().includes(searchTerm) ||
          civicNumber.includes(searchTerm)) {
        
        const coords = feature.geometry?.coordinates;
        if (coords) {
          results.push({
            place_id: `civic_${feature.id || Date.now()}`,
            display_name: address,
            lat: coords[1].toString(),
            lon: coords[0].toString(),
            type: 'civic_address',
            importance: 0.8,
            address: {
              house_number: civicNumber,
              road: streetName,
              city: 'Halifax',
              state: 'Nova Scotia',
              country: 'Canada'
            }
          });
        }
      }
    }
    
    // Cache the result
    datasetCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching civic addresses:', error);
    return [];
  }
}

// Optimized Nominatim search with caching
async function searchNominatim(query, limit) {
  try {
    const cacheKey = `nominatim_${query}_${limit}`;
    const cachedResult = routeCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&countrycodes=ca&addressdetails=1`
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim request failed: ${response.statusText}`);
    }
    
    const results = await response.json();
    
    // Cache the result
    routeCache.set(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error searching Nominatim:', error);
    return [];
  }
}

// Optimized result combination
function combineGeocodingResults(civicResults, nominatimResults, limit) {
  const combined = [...civicResults, ...nominatimResults];
  
  // Remove duplicates based on coordinates
  const seen = new Set();
  const uniqueResults = combined.filter(result => {
    const key = `${result.lat},${result.lon}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  
  // Sort by importance and limit results
  return uniqueResults
    .sort((a, b) => (b.importance || 0) - (a.importance || 0))
    .slice(0, limit);
}

// Optimized route calculation endpoint
app.post('/api/route', async (req, res) => {
  try {
    const { origin, destination, mode = 'walking', avoidSteps = false, winterMode = false } = req.body;
    
    // Validate input
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }
    
    // Check cache
    const cacheKey = `route_${JSON.stringify({ origin, destination, mode, avoidSteps, winterMode })}`;
    const cachedRoute = routeCache.get(cacheKey);
    if (cachedRoute) {
      return res.json(cachedRoute);
    }
    
    // Calculate route (simplified for demo)
    const route = await calculateOptimizedRoute(origin, destination, mode, avoidSteps, winterMode);
    
    // Cache the result
    routeCache.set(cacheKey, route);
    
    res.json(route);
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: 'Route calculation failed' });
  }
});

// Optimized route calculation
async function calculateOptimizedRoute(origin, destination, mode, avoidSteps, winterMode) {
  // Simplified route calculation for demo
  const distance = calculateDistance(origin, destination);
  const duration = mode === 'walking' ? distance * 12 : distance * 3; // minutes
  
  return {
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
}

// Optimized distance calculation
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

// Optimized dataset serving with caching
app.get('/api/data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Check cache
    const cacheKey = `dataset_${filename}`;
    const cachedData = datasetCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Decode URL-encoded filename
    const decodedFilename = decodeURIComponent(filename);
    
    // Load dataset
    const filePath = path.join(__dirname, 'data', decodedFilename);
    console.log(`Attempting to load dataset: ${filePath}`);
    console.log(`Original filename: ${filename}`);
    console.log(`Decoded filename: ${decodedFilename}`);
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
      console.log(`File exists: ${filePath}`);
    } catch (accessError) {
      console.error(`File does not exist: ${filePath}`);
      console.error(`Access error: ${accessError.message}`);
      return res.status(404).json({ error: 'Dataset not found', path: filePath });
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    // Cache the dataset
    datasetCache.set(cacheKey, jsonData);
    
    console.log(`Successfully loaded dataset: ${decodedFilename}`);
    res.json(jsonData);
  } catch (error) {
    console.error(`Error serving dataset ${req.params.filename}:`, error);
    res.status(404).json({ error: 'Dataset not found', details: error.message });
  }
});





// Enhanced barrier routes
app.use('/api/barriers', barrierRoutes);

// Enhanced AI routes
app.use('/api/ai', aiRoutes);

// Geocoding routes
app.use('/api/geocoding', geocodingRoutes);

// Wheelmap proxy routes
app.use('/api/wheelmap', wheelmapRoutes);

// Optimized data routes
const optimizedDataRoutes = require('./routes/optimizedData');
app.use('/api/optimized-data', optimizedDataRoutes);

// Serve optimized data files
app.get('/api/optimized-data/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'data/optimized', filename);
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Optimized data file not found' });
    }
    
    // Check cache
    const cacheKey = `optimized_${filename}`;
    const cached = datasetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return res.json(cached.data);
    }
    
    // Load and cache the data
    const data = await fs.promises.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    datasetCache.set(cacheKey, {
      data: jsonData,
      timestamp: Date.now()
    });
    
    res.json(jsonData);
  } catch (error) {
    console.error(`Error serving optimized data ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Failed to load optimized data' });
  }
});

// Serve dynamic data files
app.get('/api/data/dynamic/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'data/dynamic', filename);
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: 'Dynamic data file not found' });
    }
    
    // Check cache
    const cacheKey = `dynamic_${filename}`;
    const cached = datasetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes for dynamic data
      return res.json(cached.data);
    }
    
    // Load and cache the data
    const data = await fs.promises.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    datasetCache.set(cacheKey, {
      data: jsonData,
      timestamp: Date.now()
    });
    
    res.json(jsonData);
  } catch (error) {
    console.error(`Error serving dynamic data ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Failed to load dynamic data' });
  }
});

// Optimized static file serving
app.use(express.static(path.join(__dirname, '../client/build'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  // Don't log sensitive information
  const errorMessage = err.message || 'Unknown error';
  console.error('[Server Error]', errorMessage);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? errorMessage : 'Something went wrong',
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

// Initialize database and start server
async function startServer() {
  try {
    console.log('🔄 Initializing database...');
    await db.init();
    console.log('✅ Database initialized successfully');
    
    // Start server with enhanced logging
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Trek.IQ Server running on port ${PORT}`);
      console.log(`🌐 Server accessible at:`);
      console.log(`   - Local: http://localhost:${PORT}`);
      console.log(`   - Network: http://0.0.0.0:${PORT}`);
      console.log(`📊 Cache initialized - Route cache: ${routeCache.size}, Dataset cache: ${datasetCache.size}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Current directory: ${__dirname}`);
      console.log(`📁 Data directory: ${path.join(__dirname, 'data')}`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    console.error('Server startup aborted');
    process.exit(1);
  }
}

// Start the server
startServer();
