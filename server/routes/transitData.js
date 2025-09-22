const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Load transit data files
let transitRoutes = null;
let busStops = null;
let accessibleStops = null;

// Initialize data loading
async function loadTransitData() {
  try {
    console.log('🚌 Loading Halifax Transit data...');
    
    // Load transit routes
    try {
      const routesPath = path.join(__dirname, '../data/Transit_Bus_Routes.geojson');
      const routesData = await fs.readFile(routesPath, 'utf8');
      transitRoutes = JSON.parse(routesData);
    } catch (error) {
      console.warn('⚠️ Could not load transit routes:', error.message);
      transitRoutes = { type: 'FeatureCollection', features: [] };
    }
    
    // Load bus stops
    try {
      const stopsPath = path.join(__dirname, '../data/Bus_Stops_2_9086297843420881686.geojson');
      const stopsData = await fs.readFile(stopsPath, 'utf8');
      busStops = JSON.parse(stopsData);
    } catch (error) {
      console.warn('⚠️ Could not load bus stops:', error.message);
      busStops = { type: 'FeatureCollection', features: [] };
    }
    
    // Filter accessible stops
    accessibleStops = {
      type: 'FeatureCollection',
      features: busStops.features.filter(feature => 
        feature.properties.ACCESSIBLE === 'Y'
      )
    };
    
    console.log(`✅ Loaded ${transitRoutes.features.length} routes, ${busStops.features.length} stops, ${accessibleStops.features.length} accessible stops`);
  } catch (error) {
    console.error('❌ Failed to load transit data:', error);
  }
}

// Initialize data on startup
loadTransitData();

// Get all transit routes
router.get('/transit-routes', (req, res) => {
  try {
    if (!transitRoutes) {
      return res.status(503).json({ error: 'Transit data not loaded' });
    }
    
    res.json(transitRoutes);
  } catch (error) {
    console.error('Error serving transit routes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all bus stops
router.get('/bus-stops', (req, res) => {
  try {
    if (!busStops) {
      return res.status(503).json({ error: 'Bus stops data not loaded' });
    }
    
    // Set timeout to 30 seconds for large files
    res.setTimeout(30000);
    
    // Add compression headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    res.json(busStops);
  } catch (error) {
    console.error('Error serving bus stops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get accessible stops only
router.get('/accessible-stops', (req, res) => {
  try {
    if (!accessibleStops) {
      return res.status(503).json({ error: 'Accessible stops data not loaded' });
    }
    
    // Set timeout and headers
    res.setTimeout(30000);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    res.json(accessibleStops);
  } catch (error) {
    console.error('Error serving accessible stops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bus stops with pagination
router.get('/bus-stops/paginated', (req, res) => {
  try {
    if (!busStops) {
      return res.status(503).json({ error: 'Bus stops data not loaded' });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedStops = {
      data: busStops.features.slice(startIndex, endIndex),
      pagination: {
        page,
        limit,
        total: busStops.features.length,
        totalPages: Math.ceil(busStops.features.length / limit)
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.json(paginatedStops);
  } catch (error) {
    console.error('Error serving paginated bus stops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get route by ID
router.get('/route/:routeId', (req, res) => {
  try {
    if (!transitRoutes) {
      return res.status(503).json({ error: 'Transit data not loaded' });
    }
    
    const routeId = parseInt(req.params.routeId);
    const route = transitRoutes.features.find(feature => 
      feature.properties.ROUTE_NUM === routeId
    );
    
    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    res.json(route);
  } catch (error) {
    console.error('Error serving route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stops for a specific route
router.get('/route/:routeId/stops', (req, res) => {
  try {
    if (!busStops) {
      return res.status(503).json({ error: 'Bus stops data not loaded' });
    }
    
    const routeId = parseInt(req.params.routeId);
    
    // For now, return all accessible stops
    // In a real implementation, this would filter by route
    const routeStops = accessibleStops.features.slice(0, 20); // Limit for demo
    
    res.json({
      routeId,
      stops: routeStops
    });
  } catch (error) {
    console.error('Error serving route stops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get stops near a location
router.get('/stops/nearby', (req, res) => {
  try {
    if (!busStops) {
      return res.status(503).json({ error: 'Bus stops data not loaded' });
    }
    
    const { lat, lng, radius = 0.01, accessible = false } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude required' });
    }
    
    const centerLat = parseFloat(lat);
    const centerLng = parseFloat(lng);
    const searchRadius = parseFloat(radius);
    
    const nearbyStops = busStops.features.filter(feature => {
      const [stopLng, stopLat] = feature.geometry.coordinates;
      const distance = calculateDistance(centerLat, centerLng, stopLat, stopLng);
      
      const withinRadius = distance <= searchRadius;
      const isAccessible = accessible === 'true' ? feature.properties.ACCESSIBLE === 'Y' : true;
      
      return withinRadius && isAccessible;
    });
    
    res.json({
      center: { lat: centerLat, lng: centerLng },
      radius: searchRadius,
      stops: nearbyStops
    });
  } catch (error) {
    console.error('Error serving nearby stops:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transit service statistics
router.get('/statistics', (req, res) => {
  try {
    if (!transitRoutes || !busStops) {
      return res.status(503).json({ error: 'Transit data not loaded' });
    }
    
    const totalRoutes = transitRoutes.features.length;
    const totalStops = busStops.features.length;
    const accessibleStops = busStops.features.filter(f => f.properties.ACCESSIBLE === 'Y').length;
    
    const routeTypes = {};
    const serviceDays = { weekday: 0, weekend: 0, both: 0 };
    
    transitRoutes.features.forEach(feature => {
      const props = feature.properties;
      const routeNum = props.ROUTE_NUM;
      
      // Categorize by route type
      let type = 'local';
      if (routeNum >= 100 && routeNum < 200) type = 'express';
      else if (routeNum >= 200 && routeNum < 300) type = 'metro';
      else if (routeNum >= 300 && routeNum < 400) type = 'regional';
      else if (routeNum >= 400) type = 'special';
      
      routeTypes[type] = (routeTypes[type] || 0) + 1;
      
      // Categorize by service days
      if (props.WEEKDAY === 'Y' && props.WEEKEND === 'Y') {
        serviceDays.both++;
      } else if (props.WEEKDAY === 'Y') {
        serviceDays.weekday++;
      } else if (props.WEEKEND === 'Y') {
        serviceDays.weekend++;
      }
    });
    
    res.json({
      summary: {
        totalRoutes,
        totalStops,
        accessibleStops,
        accessibilityPercentage: Math.round((accessibleStops / totalStops) * 100)
      },
      routes: {
        byType: routeTypes,
        byService: serviceDays
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error serving statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

module.exports = router;
