/**
 * Accessibility Data API Routes
 * 
 * Provides API endpoints for accessing locally cached accessibility data
 * from the 150k Wheelmap dataset.
 */

const express = require('express');
const LocalAccessibilityService = require('../services/localAccessibilityService');
const router = express.Router();

// Initialize the local accessibility service
const accessibilityService = new LocalAccessibilityService();
let serviceInitialized = false;

// Initialize service on first request
const ensureServiceInitialized = async (req, res, next) => {
  if (!serviceInitialized) {
    try {
      await accessibilityService.initialize();
      serviceInitialized = true;
    } catch (error) {
      console.warn('⚠️ Local accessibility service unavailable:', error.message);
    }
  }
  next();
};

/**
 * GET /api/accessibility/places
 * Get places within a bounding box with optional filters
 */
router.get('/places', ensureServiceInitialized, (req, res) => {
  try {
    const { bbox, wheelchair, category, limit } = req.query;
    
    if (!bbox) {
      return res.status(400).json({
        error: 'Missing required parameter: bbox',
        example: '/api/accessibility/places?bbox=-63.6,-44.6,-63.5,44.7'
      });
    }
    
    // Parse bounding box
    const bboxArray = bbox.split(',').map(Number);
    if (bboxArray.length !== 4) {
      return res.status(400).json({
        error: 'Invalid bbox format. Expected: minLon,minLat,maxLon,maxLat'
      });
    }
    
    const options = {};
    if (wheelchair) options.wheelchair = wheelchair;
    if (category) options.category = category;
    if (limit) options.limit = parseInt(limit);
    
    const places = accessibilityService.getPlacesInBounds(bboxArray, options);
    
    res.json({
      success: true,
      count: places.length,
      places: places,
      filters: options
    });
    
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({
      error: 'Failed to fetch places',
      message: error.message
    });
  }
});

/**
 * GET /api/accessibility/nearby
 * Get places near a specific coordinate
 */
router.get('/nearby', ensureServiceInitialized, (req, res) => {
  try {
    const { lat, lon, radius, wheelchair, limit } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lon',
        example: '/api/accessibility/nearby?lat=44.6475&lon=-63.5756'
      });
    }
    
    const coordinates = [parseFloat(lon), parseFloat(lat)];
    const searchRadius = radius ? parseInt(radius) : 1000;
    const options = {};
    if (limit) options.limit = parseInt(limit);
    
    let places = accessibilityService.getNearbyPlaces(coordinates, searchRadius, options);
    
    // Filter by wheelchair accessibility if specified
    if (wheelchair) {
      places = places.filter(place => place.wheelchair === wheelchair);
    }
    
    res.json({
      success: true,
      count: places.length,
      center: { lat: parseFloat(lat), lon: parseFloat(lon) },
      radius: searchRadius,
      places: places
    });
    
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    res.status(500).json({
      error: 'Failed to fetch nearby places',
      message: error.message
    });
  }
});

/**
 * GET /api/accessibility/search
 * Search places by name or category
 */
router.get('/search', ensureServiceInitialized, (req, res) => {
  try {
    const { q, wheelchair, limit } = req.query;
    
    if (!q) {
      return res.status(400).json({
        error: 'Missing required parameter: q (query)',
        example: '/api/accessibility/search?q=library'
      });
    }
    
    const options = {};
    if (limit) options.limit = parseInt(limit);
    
    let places = accessibilityService.searchPlaces(q, options);
    
    // Filter by wheelchair accessibility if specified
    if (wheelchair) {
      places = places.filter(place => place.wheelchair === wheelchair);
    }
    
    res.json({
      success: true,
      query: q,
      count: places.length,
      places: places
    });
    
  } catch (error) {
    console.error('Error searching places:', error);
    res.status(500).json({
      error: 'Failed to search places',
      message: error.message
    });
  }
});

/**
 * GET /api/accessibility/categories
 * Get places by category
 */
router.get('/categories/:category', ensureServiceInitialized, (req, res) => {
  try {
    const { category } = req.params;
    const { wheelchair, limit } = req.query;
    
    const options = {};
    if (limit) options.limit = parseInt(limit);
    
    let places = accessibilityService.getPlacesByCategory(category, options);
    
    // Filter by wheelchair accessibility if specified
    if (wheelchair) {
      places = places.filter(place => place.wheelchair === wheelchair);
    }
    
    res.json({
      success: true,
      category: category,
      count: places.length,
      places: places
    });
    
  } catch (error) {
    console.error('Error fetching category places:', error);
    res.status(500).json({
      error: 'Failed to fetch category places',
      message: error.message
    });
  }
});

/**
 * GET /api/accessibility/stats
 * Get dataset statistics
 */
router.get('/stats', ensureServiceInitialized, (req, res) => {
  try {
    const stats = accessibilityService.getStatistics();
    
    if (!stats) {
      return res.status(503).json({
        error: 'Accessibility data not available',
        suggestion: 'Run "npm run download:accessibility" to download data'
      });
    }
    
    res.json({
      success: true,
      statistics: stats,
      serviceReady: accessibilityService.isReady()
    });
    
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/accessibility/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    serviceReady: accessibilityService.isReady(),
    initialized: serviceInitialized,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

