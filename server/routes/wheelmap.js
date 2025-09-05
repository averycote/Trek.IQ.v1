const express = require('express');
const router = express.Router();

// Wheelmap API proxy route to avoid CORS issues
router.get('/nodes', async (req, res) => {
  try {
    // Forward all query parameters to the Wheelmap API
    const queryParams = new URLSearchParams(req.query).toString();
    const wheelmapUrl = `https://wheelmap.org/api/nodes?${queryParams}`;
    
    console.log('🌐 Wheelmap Proxy: Forwarding request to:', wheelmapUrl);
    
    // Use dynamic import for node-fetch
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(wheelmapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Trek.IQ/1.0 (Accessibility Navigation App)',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      console.error(`❌ Wheelmap API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Wheelmap API request failed',
        status: response.status,
        statusText: response.statusText
      });
    }

    const data = await response.json();
    console.log(`✅ Wheelmap Proxy: Successfully fetched ${data.nodes ? data.nodes.length : 0} nodes`);
    
    // Log sample data for debugging
    if (data.nodes && data.nodes.length > 0) {
      console.log('📍 Sample Wheelmap node:', JSON.stringify(data.nodes[0], null, 2));
    }
    
    // Forward the response with proper CORS headers
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ Wheelmap Proxy error:', error.message);
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
