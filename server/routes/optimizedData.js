// Optimized Data Routes for Trek.IQ
// Serves optimized datasets with better performance and caching

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Fallback for better-sqlite3
let SQLite3;
try {
  SQLite3 = require('better-sqlite3');
} catch (error) {
  console.log('better-sqlite3 not available, using fallback for optimized data');
  SQLite3 = null;
}

// Cache for optimized datasets
const datasetCache = new Map();
const spatialIndexCache = new Map();
const cacheTimeout = 30 * 60 * 1000; // 30 minutes

// Data directory paths
const dataDir = path.join(__dirname, '../data');
const optimizedDir = path.join(__dirname, '../data/optimized');

// Serve optimized GeoJSON with compression
router.get('/optimized/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(optimizedDir, `${filename}_optimized.geojson`);
    
    // Check cache
    const cacheKey = `optimized_${filename}`;
    const cached = datasetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return res.json(cached.data);
    }
    
    // Check if optimized file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      // Fallback to original file
      const originalPath = path.join(dataDir, `${filename}.geojson`);
      const data = await fs.readFile(originalPath, 'utf8');
      const jsonData = JSON.parse(data);
      
      // Cache the original data
      datasetCache.set(cacheKey, {
        data: jsonData,
        timestamp: Date.now()
      });
      
      return res.json(jsonData);
    }
    
    // Load optimized data
    const data = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(data);
    
    // Cache the optimized data
    datasetCache.set(cacheKey, {
      data: jsonData,
      timestamp: Date.now()
    });
    
    res.json(jsonData);
  } catch (error) {
    console.error(`Error serving optimized dataset ${req.params.filename}:`, error);
    res.status(404).json({ error: 'Dataset not found', details: error.message });
  }
});

// Serve spatial index for fast proximity searches
router.get('/spatial-index/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const indexPath = path.join(optimizedDir, `${filename}_spatial_index.json`);
    
    // Check cache
    const cacheKey = `spatial_${filename}`;
    const cached = spatialIndexCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return res.json(cached.data);
    }
    
    // Check if spatial index exists
    try {
      await fs.access(indexPath);
    } catch (error) {
      return res.status(404).json({ error: 'Spatial index not found' });
    }
    
    // Load spatial index
    const data = await fs.readFile(indexPath, 'utf8');
    const jsonData = JSON.parse(data);
    
    // Cache the spatial index
    spatialIndexCache.set(cacheKey, {
      data: jsonData,
      timestamp: Date.now()
    });
    
    res.json(jsonData);
  } catch (error) {
    console.error(`Error serving spatial index ${req.params.filename}:`, error);
    res.status(404).json({ error: 'Spatial index not found', details: error.message });
  }
});

// Serve SQLite spatial database
router.get('/spatial-db/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const dbPath = path.join(optimizedDir, `${filename}_spatial.db`);
    
    // Check if database exists
    try {
      await fs.access(dbPath);
    } catch (error) {
      return res.status(404).json({ error: 'Spatial database not found' });
    }
    
    // Return database file
    res.sendFile(dbPath);
  } catch (error) {
    console.error(`Error serving spatial database ${req.params.filename}:`, error);
    res.status(404).json({ error: 'Spatial database not found', details: error.message });
  }
});

// Query spatial database for nearby features
router.get('/nearby/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { lat, lng, radius = 1000, limit = 50 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    const dbPath = path.join(optimizedDir, `${filename}_spatial.db`);
    
    // Check if database exists
    try {
      await fs.access(dbPath);
    } catch (error) {
      return res.status(404).json({ error: 'Spatial database not found' });
    }
    
    // Query database for nearby features
    const nearbyFeatures = await queryNearbyFeatures(dbPath, lat, lng, radius, limit);
    
    res.json({
      features: nearbyFeatures,
      query: { lat, lng, radius, limit },
      count: nearbyFeatures.length
    });
  } catch (error) {
    console.error(`Error querying nearby features for ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Query failed', details: error.message });
  }
});

// Query spatial database for features in bounding box
router.get('/bbox/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { minLat, minLng, maxLat, maxLng, limit = 100 } = req.query;
    
    if (!minLat || !minLng || !maxLat || !maxLng) {
      return res.status(400).json({ error: 'Bounding box coordinates required' });
    }
    
    const dbPath = path.join(optimizedDir, `${filename}_spatial.db`);
    
    // Check if database exists
    try {
      await fs.access(dbPath);
    } catch (error) {
      return res.status(404).json({ error: 'Spatial database not found' });
    }
    
    // Query database for features in bounding box
    const bboxFeatures = await queryBBoxFeatures(dbPath, minLat, minLng, maxLat, maxLng, limit);
    
    res.json({
      features: bboxFeatures,
      query: { minLat, minLng, maxLat, maxLng, limit },
      count: bboxFeatures.length
    });
  } catch (error) {
    console.error(`Error querying bbox features for ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Query failed', details: error.message });
  }
});

// Get dataset metadata
router.get('/metadata/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const optimizedPath = path.join(optimizedDir, `${filename}_optimized.geojson`);
    const originalPath = path.join(dataDir, `${filename}.geojson`);
    
    const metadata = {};
    
    // Get optimized file stats
    try {
      const optimizedStats = await fs.stat(optimizedPath);
      metadata.optimized = {
        size: optimizedStats.size,
        modified: optimizedStats.mtime
      };
    } catch (error) {
      metadata.optimized = null;
    }
    
    // Get original file stats
    try {
      const originalStats = await fs.stat(originalPath);
      metadata.original = {
        size: originalStats.size,
        modified: originalStats.mtime
      };
    } catch (error) {
      metadata.original = null;
    }
    
    // Calculate compression ratio
    if (metadata.optimized && metadata.original) {
      metadata.compressionRatio = (1 - metadata.optimized.size / metadata.original.size) * 100;
    }
    
    res.json(metadata);
  } catch (error) {
    console.error(`Error getting metadata for ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Failed to get metadata', details: error.message });
  }
});

// Clear cache
router.post('/clear-cache', (req, res) => {
  datasetCache.clear();
  spatialIndexCache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

// Helper function to query nearby features
function queryNearbyFeatures(dbPath, lat, lng, radius, limit) {
  return new Promise((resolve, reject) => {
    try {
      if (!SQLite3) {
        // Fallback: return empty result
        resolve([]);
        return;
      }
      const db = new SQLite3(dbPath);
      
      // Calculate bounding box for radius search
      const latDelta = radius / 111000; // Approximate degrees per meter
      const lngDelta = radius / (111000 * Math.cos(lat * Math.PI / 180));
      
      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;
      const minLng = lng - lngDelta;
      const maxLng = lng + lngDelta;
      
      const query = `
        SELECT id, lat, lng, type, properties, geometry
        FROM features
        WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
        ORDER BY ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?))
        LIMIT ?
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all(minLat, maxLat, minLng, maxLng, lat, lat, lng, lng, limit);
      db.close();
      
      // Parse JSON properties and geometry
      const features = rows.map(row => ({
        id: row.id,
        type: 'Feature',
        geometry: JSON.parse(row.geometry),
        properties: JSON.parse(row.properties),
        distance: calculateDistance(lat, lng, row.lat, row.lng)
      }));
      
      // Filter by actual radius and sort by distance
      const filteredFeatures = features
        .filter(f => f.distance <= radius)
        .sort((a, b) => a.distance - b.distance);
      
      resolve(filteredFeatures);
    } catch (err) {
      reject(err);
    }
  });
}

// Helper function to query features in bounding box
function queryBBoxFeatures(dbPath, minLat, minLng, maxLat, maxLng, limit) {
  return new Promise((resolve, reject) => {
    try {
      if (!SQLite3) {
        // Fallback: return empty result
        resolve([]);
        return;
      }
      const db = new SQLite3(dbPath);
      
      const query = `
        SELECT id, lat, lng, type, properties, geometry
        FROM features
        WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
        LIMIT ?
      `;
      
      const stmt = db.prepare(query);
      const rows = stmt.all(minLat, maxLat, minLng, maxLng, limit);
      db.close();
      
      // Parse JSON properties and geometry
      const features = rows.map(row => ({
        id: row.id,
        type: 'Feature',
        geometry: JSON.parse(row.geometry),
        properties: JSON.parse(row.properties)
      }));
      
      resolve(features);
    } catch (err) {
      reject(err);
    }
  });
}

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

module.exports = router;
