#!/usr/bin/env node

const https = require('https');

console.log('🎯 TESTING SIMPLE OVERPASS QUERIES');
console.log('==================================');

// Test multiple simple queries to find working approach
const queries = [
  {
    name: 'Simple wheelchair nodes',
    query: '[out:json][timeout:25];node["wheelchair"];out 10;'
  },
  {
    name: 'Wheelchair restaurants',
    query: '[out:json][timeout:25];node["amenity"="restaurant"]["wheelchair"];out 10;'
  },
  {
    name: 'Any wheelchair tag',
    query: '[out:json][timeout:25];(node["wheelchair"="yes"];node["wheelchair"="no"];node["wheelchair"="limited"];);out 10;'
  },
  {
    name: 'Wheelchair in specific area (Berlin)',
    query: '[out:json][timeout:25];node["wheelchair"](52.4,13.3,52.6,13.5);out 10;'
  }
];

let completedQueries = 0;

queries.forEach((queryObj, index) => {
  setTimeout(() => {
    console.log(`\n🔍 Testing: ${queryObj.name}`);
    
    const options = {
      hostname: 'overpass-api.de',
      port: 443,
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Content-Length': Buffer.byteLength(queryObj.query),
        'User-Agent': 'Trek.IQ Test'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        completedQueries++;
        try {
          const json = JSON.parse(data);
          const count = json.elements?.length || 0;
          console.log(`✅ ${queryObj.name}: ${count} results`);
          
          if (count > 0) {
            console.log('🎉 FOUND DATA! Sample:');
            json.elements.slice(0, 2).forEach((el, i) => {
              console.log(`  ${i+1}. ${el.tags?.name || 'Unnamed'} - wheelchair: ${el.tags?.wheelchair}`);
            });
          }
        } catch(e) {
          console.log(`❌ ${queryObj.name}: Parse error - ${e.message}`);
        }
        
        if (completedQueries === queries.length) {
          console.log('\n🚀 Testing alternative data sources...');
        }
      });
    });
    
    req.on('error', (e) => {
      completedQueries++;
      console.log(`❌ ${queryObj.name}: Request failed - ${e.message}`);
      if (completedQueries === queries.length) {
        console.log('\n🚀 Testing alternative data sources...');
      }
    });
    
    req.write(queryObj.query);
    req.end();
    
  }, index * 2000); // Stagger requests
});


