const express = require('express');
const router = express.Router();

// Wheelmap API configuration
const WHEELMAP_API_KEY = process.env.WHEELMAP_API_KEY || 'eb848ae2fbaff7680ff34a9f31eabf06';

// Accessibility Cloud API proxy route to avoid CORS issues
router.get('/nodes', async (req, res) => {
  try {
    // Build Accessibility Cloud API URL with proper parameters
    const params = new URLSearchParams({
      appToken: WHEELMAP_API_KEY,
      ...req.query
    });
    
    const accessibilityCloudUrl = `https://accessibility-cloud.freetls.fastly.net/place-infos?${params.toString()}`;
    
    console.log('🌐 Accessibility Cloud Proxy: Forwarding request to:', accessibilityCloudUrl);
    
    // Use dynamic import for node-fetch
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(accessibilityCloudUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Trek.IQ/1.0 (Accessibility Navigation App)',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      console.error(`❌ Accessibility Cloud API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Accessibility Cloud API request failed',
        status: response.status,
        statusText: response.statusText
      });
    }

    const data = await response.json();
    console.log(`✅ Accessibility Cloud Proxy: Successfully fetched ${data.places ? data.places.length : 0} places`);
    
    // Log sample data for debugging
    if (data.places && data.places.length > 0) {
      console.log('📍 Sample Accessibility Cloud place:', JSON.stringify(data.places[0], null, 2));
    }
    
    // Forward the response with proper CORS headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ Accessibility Cloud Proxy error:', error.message);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Handle preflight requests
router.options('/nodes', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.status(200).end();
});

module.exports = router;
