const express = require('express');
const router = express.Router();

// Transit API configuration
const TRANSIT_API_BASE_URL = 'https://external.transitapp.com/v3';
const TRANSIT_API_KEY = process.env.TRANSIT_API_KEY || 'cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b';

// Rate limiting tracking
let requestCount = 0;
let lastResetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 5;
const RESET_INTERVAL = 60 * 1000; // 1 minute

// Helper function to check rate limits
function checkRateLimit() {
  const now = Date.now();
  
  // Reset counter if a minute has passed
  if (now - lastResetTime >= RESET_INTERVAL) {
    requestCount = 0;
    lastResetTime = now;
  }
  
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    throw new Error('Rate limit exceeded. Maximum 5 requests per minute.');
  }
  
  requestCount++;
}

// Helper function to make Transit API requests
async function makeTransitAPIRequest(endpoint, params = {}) {
  try {
    checkRateLimit();
    
    const url = new URL(`${TRANSIT_API_BASE_URL}${endpoint}`);
    
    // Add API key
    url.searchParams.append('key', TRANSIT_API_KEY);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
    
    console.log(`🚌 Making Transit API request to: ${url.toString()}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrekIQ/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Transit API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Transit API request successful`);
    
    return data;
  } catch (error) {
    console.error('❌ Transit API request failed:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Transit API took too long to respond');
    }
    
    throw error;
  }
}

// Get trip plan
router.get('/plan', async (req, res) => {
  try {
    const { from_lat, from_lon, to_lat, to_lon, time, mode, max_walk_distance, num_itineraries } = req.query;
    
    if (!from_lat || !from_lon || !to_lat || !to_lon) {
      return res.status(400).json({ error: 'Missing required parameters: from_lat, from_lon, to_lat, to_lon' });
    }
    
    const params = {
      from_lat,
      from_lon,
      to_lat,
      to_lon,
      time: time || null,
      mode: mode || 'transit',
      max_walk_distance: max_walk_distance || 1000,
      num_itineraries: num_itineraries || 3
    };
    
    const data = await makeTransitAPIRequest('/public/plan', params);
    res.json(data);
  } catch (error) {
    console.error('Error in /plan:', error);
    res.status(500).json({ 
      error: 'Failed to get trip plan',
      details: error.message 
    });
  }
});

// Get nearby routes
router.get('/nearby_routes', async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lon' });
    }
    
    const params = {
      lat,
      lon,
      radius: radius || 500
    };
    
    const data = await makeTransitAPIRequest('/public/stops_near_me', params);
    res.json(data);
  } catch (error) {
    console.error('Error in /nearby_routes:', error);
    res.status(500).json({ 
      error: 'Failed to get nearby routes',
      details: error.message 
    });
  }
});

// Get service alerts
router.get('/alerts', async (req, res) => {
  try {
    const { lat, lon, radius } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing required parameters: lat, lon' });
    }
    
    const params = {
      lat,
      lon,
      radius: radius || 1000
    };
    
    const data = await makeTransitAPIRequest('/public/alerts', params);
    res.json(data);
  } catch (error) {
    console.error('Error in /alerts:', error);
    res.status(500).json({ 
      error: 'Failed to get service alerts',
      details: error.message 
    });
  }
});

// Get route details
router.get('/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    
    if (!routeId) {
      return res.status(400).json({ error: 'Missing route ID' });
    }
    
    const data = await makeTransitAPIRequest(`/public/route/${routeId}`);
    res.json(data);
  } catch (error) {
    console.error('Error in /route:', error);
    res.status(500).json({ 
      error: 'Failed to get route details',
      details: error.message 
    });
  }
});

// Get stop details
router.get('/stop/:stopId', async (req, res) => {
  try {
    const { stopId } = req.params;
    
    if (!stopId) {
      return res.status(400).json({ error: 'Missing stop ID' });
    }
    
    const data = await makeTransitAPIRequest(`/public/stop/${stopId}`);
    res.json(data);
  } catch (error) {
    console.error('Error in /stop:', error);
    res.status(500).json({ 
      error: 'Failed to get stop details',
      details: error.message 
    });
  }
});

// Get departures for a stop
router.get('/stop/:stopId/departures', async (req, res) => {
  try {
    const { stopId } = req.params;
    const { limit } = req.query;
    
    if (!stopId) {
      return res.status(400).json({ error: 'Missing stop ID' });
    }
    
    const params = {
      limit: limit || 10
    };
    
    const data = await makeTransitAPIRequest(`/public/stop/${stopId}/departures`, params);
    res.json(data);
  } catch (error) {
    console.error('Error in /stop/departures:', error);
    res.status(500).json({ 
      error: 'Failed to get departures',
      details: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    rateLimit: {
      requests: requestCount,
      maxRequests: MAX_REQUESTS_PER_MINUTE,
      resetTime: new Date(lastResetTime + RESET_INTERVAL).toISOString()
    },
    apiKey: TRANSIT_API_KEY ? 'configured' : 'missing'
  });
});

module.exports = router;
