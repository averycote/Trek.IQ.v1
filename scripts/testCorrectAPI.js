#!/usr/bin/env node

/**
 * Test the CORRECT accessibility.cloud API endpoint
 * Based on official documentation from GitHub
 */

const https = require('https');

console.log('🎯 TESTING CORRECT ACCESSIBILITY.CLOUD API');
console.log('==========================================');
console.log('Using the official endpoint from GitHub docs...');
console.log('');

// Test the correct endpoint with geographic parameters
const testLocations = [
  { name: 'Vienna, Austria', lat: 48.251, lon: 16.5, accuracy: 10000 },
  { name: 'Berlin, Germany', lat: 52.5243, lon: 13.4063, accuracy: 5000 },
  { name: 'New York, USA', lat: 40.7128, lon: -74.0060, accuracy: 5000 },
  { name: 'Halifax, Canada', lat: 44.6488, lon: -63.5752, accuracy: 5000 }
];

let completedTests = 0;

testLocations.forEach((location, index) => {
  setTimeout(() => {
    console.log(`🔍 Testing: ${location.name}`);
    
    const url = `https://accessibility-cloud.freetls.fastly.net/place-infos?latitude=${location.lat}&longitude=${location.lon}&accuracy=${location.accuracy}&appToken=eb848ae2fbaff7680ff34a9f31eabf06`;
    
    const options = {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Trek.IQ/1.0'
      },
      timeout: 10000
    };
    
    const req = https.get(url, options, (res) => {
      console.log(`  Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      
      res.on('end', () => {
        completedTests++;
        
        try {
          const json = JSON.parse(data);
          const features = json.features || [];
          const totalCount = json.totalFeatureCount || json.count || features.length;
          
          console.log(`  ✅ SUCCESS! Found ${features.length} features (total: ${totalCount})`);
          
          if (features.length > 0) {
            console.log(`  🎉 BREAKTHROUGH! We have accessibility data for ${location.name}!`);
            
            // Show sample features
            features.slice(0, 3).forEach((feature, i) => {
              const props = feature.properties || {};
              const name = props.name || 'Unnamed';
              const category = props.category || 'unknown';
              const wheelchair = props.accessibility?.accessibleWith?.wheelchair || 'unknown';
              
              console.log(`    ${i+1}. ${name} (${category}) - wheelchair: ${wheelchair}`);
            });
            
            console.log('  📊 Data structure confirmed - ready for bulk download!');
          }
          
        } catch(e) {
          console.log(`  ❌ Parse error: ${e.message}`);
          console.log(`  Raw response preview: ${data.substring(0, 100)}...`);
        }
        
        if (completedTests === testLocations.length) {
          console.log('\n🚀 API TEST COMPLETE!');
          console.log('Ready to implement bulk data download...');
        }
      });
    });
    
    req.on('error', (e) => {
      completedTests++;
      console.log(`  ❌ Request failed: ${e.message}`);
      
      if (completedTests === testLocations.length) {
        console.log('\n🚀 API TEST COMPLETE!');
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      completedTests++;
      console.log(`  ⏰ Request timeout for ${location.name}`);
      
      if (completedTests === testLocations.length) {
        console.log('\n🚀 API TEST COMPLETE!');
      }
    });
    
  }, index * 2000); // Stagger requests by 2 seconds
});

