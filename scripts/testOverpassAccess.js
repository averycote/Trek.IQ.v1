#!/usr/bin/env node

/**
 * Test direct OpenStreetMap Overpass API access for wheelchair accessibility data
 * This is the same data source that Wheelmap uses
 */

const https = require('https');

console.log('🌍 DIRECT OPENSTREETMAP ACCESS TEST');
console.log('===================================');
console.log('Testing Overpass API for wheelchair accessibility data...');
console.log('');

// Overpass query for wheelchair-tagged amenities (limited scope for testing)
const query = `[out:json][timeout:25];
(
  node["wheelchair"~"yes|no|limited"]["amenity"];
  way["wheelchair"~"yes|no|limited"]["amenity"];
  relation["wheelchair"~"yes|no|limited"]["amenity"];
);
out center meta;`;

const postData = query;

const options = {
  hostname: 'overpass-api.de',
  port: 443,
  path: '/api/interpreter',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(postData),
    'User-Agent': 'Trek.IQ Accessibility Data Collector'
  }
};

console.log('🔍 Querying Overpass API for wheelchair-tagged amenities...');

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      const elements = json.elements || [];
      
      console.log('✅ SUCCESS! Found', elements.length, 'accessibility records from OpenStreetMap');
      
      if (elements.length > 0) {
        console.log('🎉 BREAKTHROUGH! We have direct access to OSM accessibility data!');
        console.log('');
        console.log('Sample records:');
        
        elements.slice(0, 5).forEach((element, i) => {
          const name = element.tags?.name || 'Unnamed';
          const amenity = element.tags?.amenity || 'unknown';
          const wheelchair = element.tags?.wheelchair || 'unknown';
          const lat = element.lat || element.center?.lat || 'unknown';
          const lon = element.lon || element.center?.lon || 'unknown';
          
          console.log(`  ${i+1}. ${name} (${amenity}) - wheelchair: ${wheelchair} [${lat}, ${lon}]`);
        });
        
        console.log('');
        console.log('📊 Wheelchair accessibility breakdown:');
        const wheelchairStats = {};
        elements.forEach(element => {
          const wheelchair = element.tags?.wheelchair || 'unknown';
          wheelchairStats[wheelchair] = (wheelchairStats[wheelchair] || 0) + 1;
        });
        
        Object.entries(wheelchairStats).forEach(([status, count]) => {
          console.log(`  ${status}: ${count} places`);
        });
        
        console.log('');
        console.log('🚀 This is our data source! We can use this instead of accessibility.cloud');
        console.log('💡 Next step: Create a comprehensive query for global wheelchair data');
        
      } else {
        console.log('⚠️ No data returned. Trying alternative query...');
      }
      
    } catch(e) {
      console.log('❌ Parse error:', e.message);
      console.log('Raw response length:', data.length);
      console.log('Response preview:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  console.log('💡 Trying alternative Overpass server...');
  
  // Try alternative server
  const altOptions = {
    hostname: 'lz4.overpass-api.de',
    port: 443,
    path: '/api/interpreter',
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const altReq = https.request(altOptions, (res) => {
    console.log('Alternative server status:', res.statusCode);
    let altData = '';
    res.on('data', chunk => altData += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(altData);
        console.log('✅ Alternative server SUCCESS! Found', json.elements?.length || 0, 'records');
      } catch(e) {
        console.log('❌ Alternative server also failed');
      }
    });
  });
  
  altReq.write(postData);
  altReq.end();
});

req.write(postData);
req.end();

