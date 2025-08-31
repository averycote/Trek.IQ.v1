const express = require('express');
const { z } = require('zod');
const aiService = require('../services/aiService');
const db = require('../database');

const router = express.Router();

// Validation schemas
const routeSchema = z.object({
  coordinates: z.array(z.object({
    lat: z.number(),
    lng: z.number()
  })).min(2),
  options: z.object({
    avoidSteps: z.boolean().optional(),
    avoidStairs: z.boolean().optional(),
    preferRamps: z.boolean().optional(),
    maxSlope: z.number().optional(),
    minWidth: z.number().optional(),
    mode: z.enum(['walking', 'driving', 'transit']).optional()
  }).optional()
});

const barrierReportSchema = z.object({
  type: z.string(),
  lat: z.number(),
  lng: z.number(),
  severity: z.enum(['low', 'medium', 'high']),
  description: z.string(),
  reported_at: z.string().datetime(),
  contact_email: z.string().email().optional()
});

const rerouteRequestSchema = z.object({
  barrier: z.object({
    type: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number()
    }),
    severity: z.string(),
    reason: z.string().optional()
  }),
  mode: z.enum(['walking', 'driving', 'transit']),
  originalRoute: z.object({
    coordinates: z.array(z.array(z.number())).optional(),
    features: z.array(z.object({
      geometry: z.object({
        coordinates: z.array(z.array(z.number()))
      })
    })).optional()
  })
});

// Initialize AI service
router.post('/initialize', async (req, res) => {
  try {
    await aiService.initialize();
    res.json({ 
      success: true, 
      message: 'AI service initialized successfully with all municipal datasets',
      status: aiService.getStatus()
    });
  } catch (error) {
    console.error('AI initialization error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to initialize AI service' 
    });
  }
});

// Enhanced barrier detection using all datasets
router.post('/detect-barriers', async (req, res) => {
  try {
    const { route, mode = 'walking' } = req.body;
    
    if (!route) {
      return res.status(400).json({
        success: false,
        error: 'Route is required'
      });
    }

    const barriers = await aiService.detectBarriers(route, mode);
    
    res.json({
      success: true,
      barriers,
      count: barriers.length,
      mode: mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Barrier detection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to detect barriers' 
    });
  }
});

// Proactive rerouting around barriers
router.post('/reroute-around-barrier', async (req, res) => {
  try {
    const validatedData = rerouteRequestSchema.parse(req.body);
    
    const reroute = await aiService.rerouteAroundBarrier(validatedData.barrier, validatedData.mode);
    
    if (reroute) {
      res.json({
        success: true,
        reroute,
        message: 'Alternative route generated successfully'
      });
    } else {
      res.json({
        success: false,
        message: 'No alternative route available'
      });
    }
  } catch (error) {
    console.error('Rerouting error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data',
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to generate reroute' 
      });
    }
  }
});

// Predict barriers for a route
router.post('/predict-barriers', async (req, res) => {
  try {
    const { route, options = {} } = routeSchema.parse(req.body);
    
    const predictions = await aiService.predictBarriers(route, options);
    
    res.json({
      success: true,
      predictions,
      count: predictions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Barrier prediction error:', error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request data',
        details: error.errors 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to predict barriers' 
      });
    }
  }
});

// Get real-time notifications
router.get('/notifications', async (req, res) => {
  try {
    const { userId = 'system', limit = 50, unreadOnly = false } = req.query;
    
    let notifications = await db.getNotifications(userId, parseInt(limit));
    
    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }
    
    res.json({
      success: true,
      notifications,
      count: notifications.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get notifications' 
    });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.markNotificationRead(id);
    
    res.json({
      success: true,
      message: 'Notification marked as read',
      updated: result
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notification as read' 
    });
  }
});

// Get dataset statistics
router.get('/dataset-stats', async (req, res) => {
  try {
    const stats = {};
    const datasetTables = [
      'accessible_parking',
      'active_travelways', 
      'bike_infrastructure',
      'bus_stops',
      'civic_addresses',
      'public_washrooms',
      'sidewalk_closures',
      'steps',
      'street_closures',
      'street_junctions',
      'street_lights',
      'traffic_control',
      'transit_routes',
      'transit_shelters'
    ];

    for (const table of datasetTables) {
      try {
        const data = await db.getDatasetData(table);
        stats[table] = {
          count: data.length,
          lastUpdated: data.length > 0 ? data[0].last_updated : null
        };
      } catch (error) {
        stats[table] = { count: 0, error: error.message };
      }
    }

    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dataset stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get dataset statistics' 
    });
  }
});

// Get nearby data for a location
router.get('/nearby-data', async (req, res) => {
  try {
    const { lat, lng, radius = 0.5, datasets } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const nearbyData = {};
    const requestedDatasets = datasets ? datasets.split(',') : [
      'accessible_parking',
      'bus_stops',
      'public_washrooms',
      'sidewalk_closures',
      'steps',
      'street_closures'
    ];

    for (const dataset of requestedDatasets) {
      try {
        const data = await db.getNearbyData(dataset, parseFloat(lat), parseFloat(lng), parseFloat(radius));
        nearbyData[dataset] = data;
      } catch (error) {
        nearbyData[dataset] = { error: error.message };
      }
    }

    res.json({
      success: true,
      nearbyData,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: parseFloat(radius),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Nearby data error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get nearby data' 
    });
  }
});

// Get accessibility analysis for a route
router.post('/accessibility-analysis', async (req, res) => {
  try {
    const { route, mode = 'walking', options = {} } = req.body;
    
    if (!route) {
      return res.status(400).json({
        success: false,
        error: 'Route is required'
      });
    }

    const analysis = await aiService.analyzeRouteAccessibility(route, mode, options);
    
    res.json({
      success: true,
      analysis,
      mode: mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Accessibility analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to analyze accessibility' 
    });
  }
});

// Get route recommendations
router.post('/route-recommendations', async (req, res) => {
  try {
    const { origin, destination, mode = 'walking', preferences = {} } = req.body;
    
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }

    const recommendations = await aiService.generateRouteRecommendations(origin, destination, mode, preferences);
    
    res.json({
      success: true,
      recommendations,
      mode: mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Route recommendations error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate route recommendations' 
    });
  }
});

// Cluster barrier reports
router.post('/cluster-reports', async (req, res) => {
  try {
    const { reports, options = {} } = req.body;
    
    if (!Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Reports array is required and must not be empty'
      });
    }

    const clusteredReports = await aiService.clusterBarrierReports(reports, options);
    
    // Group by cluster
    const clusters = {};
    clusteredReports.forEach(report => {
      const clusterId = report.cluster;
      if (!clusters[clusterId]) {
        clusters[clusterId] = [];
      }
      clusters[clusterId].push(report);
    });

    res.json({
      success: true,
      clusters,
      totalClusters: Object.keys(clusters).length,
      totalReports: clusteredReports.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Clustering error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cluster reports' 
    });
  }
});

// Get AI service status
router.get('/status', (req, res) => {
  try {
    const status = aiService.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get AI service status' 
    });
  }
});

// Retrain AI model
router.post('/retrain', async (req, res) => {
  try {
    await aiService.retrainModel();
    res.json({
      success: true,
      message: 'AI model retraining completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Retraining error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrain AI model' 
    });
  }
});

// Get barrier analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, type, severity } = req.query;
    
    // Filter historical barriers based on query parameters
    let filteredBarriers = aiService.historicalBarriers;
    
    if (startDate) {
      filteredBarriers = filteredBarriers.filter(b => 
        new Date(b.reported_at) >= new Date(startDate)
      );
    }
    
    if (endDate) {
      filteredBarriers = filteredBarriers.filter(b => 
        new Date(b.reported_at) <= new Date(endDate)
      );
    }
    
    if (type) {
      filteredBarriers = filteredBarriers.filter(b => b.type === type);
    }
    
    if (severity) {
      filteredBarriers = filteredBarriers.filter(b => b.severity === severity);
    }

    // Calculate analytics
    const analytics = {
      totalBarriers: filteredBarriers.length,
      resolvedBarriers: filteredBarriers.filter(b => b.resolved_at).length,
      unresolvedBarriers: filteredBarriers.filter(b => !b.resolved_at).length,
      averageResolutionTime: calculateAverageResolutionTime(filteredBarriers),
      barriersByType: groupBy(filteredBarriers, 'type'),
      barriersBySeverity: groupBy(filteredBarriers, 'severity'),
      barriersByMonth: groupByMonth(filteredBarriers),
      topLocations: getTopLocations(filteredBarriers),
      weatherCorrelation: analyzeWeatherCorrelation(filteredBarriers)
    };

    res.json({
      success: true,
      analytics,
      filters: { startDate, endDate, type, severity },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate analytics' 
    });
  }
});

// Get predictive maintenance insights
router.get('/predictive-maintenance', async (req, res) => {
  try {
    const insights = await generatePredictiveMaintenanceInsights();
    
    res.json({
      success: true,
      insights,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Predictive maintenance error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate predictive maintenance insights' 
    });
  }
});

// Helper functions
function calculateAverageResolutionTime(barriers) {
  const resolvedBarriers = barriers.filter(b => b.resolved_at);
  if (resolvedBarriers.length === 0) return 0;
  
  const totalTime = resolvedBarriers.reduce((sum, barrier) => {
    const reported = new Date(barrier.reported_at);
    const resolved = new Date(barrier.resolved_at);
    return sum + (resolved - reported);
  }, 0);
  
  return totalTime / resolvedBarriers.length / (1000 * 60 * 60 * 24); // Days
}

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = 0;
    }
    groups[group]++;
    return groups;
  }, {});
}

function groupByMonth(barriers) {
  const months = {};
  barriers.forEach(barrier => {
    const date = new Date(barrier.reported_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!months[monthKey]) {
      months[monthKey] = 0;
    }
    months[monthKey]++;
  });
  return months;
}

function getTopLocations(barriers, limit = 10) {
  const locations = {};
  barriers.forEach(barrier => {
    const locationKey = `${barrier.lat.toFixed(3)},${barrier.lng.toFixed(3)}`;
    if (!locations[locationKey]) {
      locations[locationKey] = {
        lat: barrier.lat,
        lng: barrier.lng,
        count: 0,
        types: new Set()
      };
    }
    locations[locationKey].count++;
    locations[locationKey].types.add(barrier.type);
  });
  
  return Object.values(locations)
    .map(loc => ({ ...loc, types: Array.from(loc.types) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function analyzeWeatherCorrelation(barriers) {
  const weatherTypes = {};
  barriers.forEach(barrier => {
    if (barrier.weather_conditions) {
      const temp = barrier.weather_conditions.temperature;
      const precip = barrier.weather_conditions.precipitation;
      
      if (temp < 0) {
        weatherTypes.freezing = (weatherTypes.freezing || 0) + 1;
      }
      if (precip > 0.5) {
        weatherTypes.heavyPrecipitation = (weatherTypes.heavyPrecipitation || 0) + 1;
      }
    }
  });
  
  return weatherTypes;
}

async function generatePredictiveMaintenanceInsights() {
  const barriers = aiService.historicalBarriers;
  
  // Find recurring patterns
  const recurringPatterns = findRecurringPatterns(barriers);
  
  // Identify high-risk areas
  const highRiskAreas = identifyHighRiskAreas(barriers);
  
  // Predict future barriers
  const futurePredictions = predictFutureBarriers(barriers);
  
  return {
    recurringPatterns,
    highRiskAreas,
    futurePredictions,
    recommendations: generateRecommendations(recurringPatterns, highRiskAreas)
  };
}

function findRecurringPatterns(barriers) {
  const patterns = [];
  
  // Group by location and analyze patterns
  const locationGroups = {};
  barriers.forEach(barrier => {
    const locationKey = `${barrier.lat.toFixed(3)},${barrier.lng.toFixed(3)}`;
    if (!locationGroups[locationKey]) {
      locationGroups[locationKey] = [];
    }
    locationGroups[locationKey].push(barrier);
  });
  
  Object.entries(locationGroups).forEach(([location, locationBarriers]) => {
    if (locationBarriers.length >= 3) {
      const avgTimeBetweenReports = calculateAverageTimeBetweenReports(locationBarriers);
      patterns.push({
        location,
        barrierCount: locationBarriers.length,
        avgTimeBetweenReports,
        mostCommonType: getMostCommonType(locationBarriers),
        riskLevel: calculateRiskLevel(locationBarriers)
      });
    }
  });
  
  return patterns.sort((a, b) => b.barrierCount - a.barrierCount);
}

function identifyHighRiskAreas(barriers) {
  const areas = {};
  const gridSize = 0.01; // Roughly 1km grid
  
  barriers.forEach(barrier => {
    const gridKey = `${Math.floor(barrier.lat / gridSize)},${Math.floor(barrier.lng / gridSize)}`;
    if (!areas[gridKey]) {
      areas[gridKey] = {
        barriers: [],
        unresolvedCount: 0,
        highSeverityCount: 0
      };
    }
    areas[gridKey].barriers.push(barrier);
    if (!barrier.resolved_at) areas[gridKey].unresolvedCount++;
    if (barrier.severity === 'high') areas[gridKey].highSeverityCount++;
  });
  
  return Object.entries(areas)
    .filter(([key, area]) => area.barriers.length >= 2)
    .map(([key, area]) => ({
      gridKey: key,
      ...area,
      riskScore: calculateAreaRiskScore(area)
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10);
}

function predictFutureBarriers(barriers) {
  // Simple prediction based on historical patterns
  const predictions = [];
  const recentBarriers = barriers.filter(b => {
    const daysSince = (Date.now() - new Date(b.reported_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 30;
  });
  
  // Group by location and predict based on frequency
  const locationFrequency = {};
  recentBarriers.forEach(barrier => {
    const locationKey = `${barrier.lat.toFixed(3)},${barrier.lng.toFixed(3)}`;
    locationFrequency[locationKey] = (locationFrequency[locationKey] || 0) + 1;
  });
  
  Object.entries(locationFrequency).forEach(([location, frequency]) => {
    if (frequency >= 2) {
      predictions.push({
        location,
        probability: Math.min(frequency / 5, 0.9), // Cap at 90%
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        reason: `High frequency of recent barriers (${frequency} in last 30 days)`
      });
    }
  });
  
  return predictions;
}

function generateRecommendations(patterns, highRiskAreas) {
  const recommendations = [];
  
  // Recommendations based on recurring patterns
  patterns.slice(0, 5).forEach(pattern => {
    recommendations.push({
      type: 'recurring_pattern',
      priority: 'high',
      description: `Address recurring ${pattern.mostCommonType} barriers at ${pattern.location}`,
      action: 'Schedule preventive maintenance',
      estimatedImpact: 'Reduce barrier frequency by 60-80%'
    });
  });
  
  // Recommendations based on high-risk areas
  highRiskAreas.slice(0, 3).forEach(area => {
    recommendations.push({
      type: 'high_risk_area',
      priority: 'critical',
      description: `High-risk area with ${area.unresolvedCount} unresolved barriers`,
      action: 'Immediate inspection and maintenance',
      estimatedImpact: 'Prevent future barrier formation'
    });
  });
  
  return recommendations;
}

function calculateAverageTimeBetweenReports(barriers) {
  if (barriers.length < 2) return 0;
  
  const sortedBarriers = barriers.sort((a, b) => new Date(a.reported_at) - new Date(b.reported_at));
  let totalTime = 0;
  
  for (let i = 1; i < sortedBarriers.length; i++) {
    const timeDiff = new Date(sortedBarriers[i].reported_at) - new Date(sortedBarriers[i-1].reported_at);
    totalTime += timeDiff;
  }
  
  return totalTime / (sortedBarriers.length - 1) / (1000 * 60 * 60 * 24); // Days
}

function getMostCommonType(barriers) {
  const typeCount = {};
  barriers.forEach(barrier => {
    typeCount[barrier.type] = (typeCount[barrier.type] || 0) + 1;
  });
  
  return Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0];
}

function calculateRiskLevel(barriers) {
  const unresolvedCount = barriers.filter(b => !b.resolved_at).length;
  const highSeverityCount = barriers.filter(b => b.severity === 'high').length;
  
  if (unresolvedCount > 2 || highSeverityCount > 1) return 'high';
  if (unresolvedCount > 0 || highSeverityCount > 0) return 'medium';
  return 'low';
}

function calculateAreaRiskScore(area) {
  return area.barriers.length * 10 + area.unresolvedCount * 20 + area.highSeverityCount * 30;
}

module.exports = router;
