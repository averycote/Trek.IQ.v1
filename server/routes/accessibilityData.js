/**
 * Accessibility Data API Routes
 * 
 * Serves Halifax municipal accessibility data for the TRUE accessibility routing service
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Cache for loaded data
const dataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load and cache Halifax municipal data
 */
async function loadHalifaxData(datasetName) {
  const cacheKey = datasetName;
  const cached = dataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    let filePath;
    
    switch (datasetName) {
      case 'travelways':
        filePath = path.join(__dirname, '../data/Active_Travelways.geojson');
        break;
      case 'steps':
        filePath = path.join(__dirname, '../data/dynamic/Steps_577353981712784942.geojson');
        break;
      case 'closures':
        filePath = path.join(__dirname, '../data/dynamic/Sidewalk Closures.geojson');
        break;
      case 'accessible-parking':
        filePath = path.join(__dirname, '../data/Accessible_Parking.geojson');
        break;
      case 'transit-stops':
        filePath = path.join(__dirname, '../data/Bus_Stops_2_9086297843420881686.geojson');
        break;
      case 'street-lights':
        filePath = path.join(__dirname, '../data/Street_Lights_-8646609400635809433.geojson');
        break;
      case 'public-washrooms':
        filePath = path.join(__dirname, '../data/HRM_Public_Washrooms_8937353538278970153.geojson');
        break;
      default:
        throw new Error(`Unknown dataset: ${datasetName}`);
    }
    
    const data = await fs.readFile(filePath, 'utf8');
    const parsedData = JSON.parse(data);
    
    // Cache the data
    dataCache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now()
    });
    
    return parsedData;
  } catch (error) {
    console.error(`Error loading ${datasetName} data:`, error);
    throw error;
  }
}

/**
 * GET /api/accessibility-data/:dataset
 * Get specific Halifax municipal dataset
 */
router.get('/:dataset', async (req, res) => {
  try {
    const { dataset } = req.params;
    const data = await loadHalifaxData(dataset);
    
    res.json({
      success: true,
      dataset: dataset,
      data: data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error serving accessibility data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/accessibility-data/combined/core
 * Get combined core accessibility datasets for routing
 */
router.get('/combined/core', async (req, res) => {
  try {
    const [travelways, steps, closures] = await Promise.all([
      loadHalifaxData('travelways'),
      loadHalifaxData('steps'),
      loadHalifaxData('closures')
    ]);
    
    const combinedData = {
      type: 'FeatureCollection',
      features: [
        ...travelways.features.map(f => ({ ...f, dataset: 'travelways' })),
        ...steps.features.map(f => ({ ...f, dataset: 'steps' })),
        ...closures.features.map(f => ({ ...f, dataset: 'closures' }))
      ],
      metadata: {
        travelways: travelways.features.length,
        steps: steps.features.length,
        closures: closures.features.length,
        total: travelways.features.length + steps.features.length + closures.features.length
      }
    };
    
    res.json({
      success: true,
      dataset: 'combined_core',
      data: combinedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error serving combined accessibility data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/accessibility-data/amenities
 * Get accessibility amenities (parking, washrooms, etc.)
 */
router.get('/amenities', async (req, res) => {
  try {
    const [parking, washrooms, transitStops] = await Promise.all([
      loadHalifaxData('accessible-parking'),
      loadHalifaxData('public-washrooms'),
      loadHalifaxData('transit-stops')
    ]);
    
    const amenities = {
      type: 'FeatureCollection',
      features: [
        ...parking.features.map(f => ({ ...f, amenity_type: 'parking' })),
        ...washrooms.features.map(f => ({ ...f, amenity_type: 'washroom' })),
        ...transitStops.features.map(f => ({ ...f, amenity_type: 'transit' }))
      ],
      metadata: {
        parking: parking.features.length,
        washrooms: washrooms.features.length,
        transit: transitStops.features.length,
        total: parking.features.length + washrooms.features.length + transitStops.features.length
      }
    };
    
    res.json({
      success: true,
      dataset: 'amenities',
      data: amenities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error serving amenities data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/accessibility-data/analysis/:dataset
 * Get accessibility analysis for a specific dataset
 */
router.get('/analysis/:dataset', async (req, res) => {
  try {
    const { dataset } = req.params;
    const data = await loadHalifaxData(dataset);
    
    let analysis = {};
    
    if (dataset === 'travelways') {
      // Analyze travelways for accessibility metrics
      const features = data.features || [];
      const widthStats = features
        .map(f => f.properties?.WIDTH)
        .filter(w => w !== null && w !== undefined);
      
      const materialStats = features
        .map(f => f.properties?.MAT)
        .filter(m => m !== null && m !== undefined);
      
      const winterMaintained = features
        .filter(f => f.properties?.WINT_PLOW === 'Y').length;
      
      analysis = {
        total_features: features.length,
        width_stats: {
          min: Math.min(...widthStats),
          max: Math.max(...widthStats),
          avg: widthStats.reduce((a, b) => a + b, 0) / widthStats.length,
          wheelchair_accessible: features.filter(f => (f.properties?.WIDTH || 0) >= 1.5).length
        },
        material_breakdown: materialStats.reduce((acc, mat) => {
          acc[mat] = (acc[mat] || 0) + 1;
          return acc;
        }, {}),
        winter_maintenance: {
          maintained: winterMaintained,
          not_maintained: features.length - winterMaintained,
          percentage: (winterMaintained / features.length) * 100
        }
      };
    } else if (dataset === 'steps') {
      // Analyze steps data
      const features = data.features || [];
      const materialStats = features
        .map(f => f.properties?.MAT)
        .filter(m => m !== null && m !== undefined);
      
      analysis = {
        total_steps: features.length,
        material_breakdown: materialStats.reduce((acc, mat) => {
          acc[mat] = (acc[mat] || 0) + 1;
          return acc;
        }, {}),
        locations: features.map(f => ({
          id: f.properties?.ASSETID,
          location: f.properties?.LOCATION,
          coordinates: f.geometry?.coordinates
        }))
      };
    }
    
    res.json({
      success: true,
      dataset: dataset,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error analyzing accessibility data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;