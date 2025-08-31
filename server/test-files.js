const fs = require('fs').promises;
const path = require('path');

async function testFileAccess() {
  const testFiles = [
    'Street_Junctions.geojson',
    'Street_Closures.geojson',
    'Traffic_Control.geojson',
    'Sidewalk Closures.geojson'
  ];

  console.log('Current directory:', __dirname);
  console.log('Data directory:', path.join(__dirname, 'data'));
  
  for (const filename of testFiles) {
    const filePath = path.join(__dirname, 'data', filename);
    try {
      await fs.access(filePath);
      console.log(`✅ File exists: ${filename}`);
    } catch (error) {
      console.log(`❌ File not found: ${filename} - ${error.message}`);
    }
  }
}

testFileAccess().catch(console.error);
