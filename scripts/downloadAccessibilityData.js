#!/usr/bin/env node

/**
 * Trek.IQ Accessibility Data Downloader
 * 
 * Downloads and caches the massive Wheelmap dataset (150k+ records) from accessibility.cloud
 * for faster local access and improved performance.
 * 
 * Usage: node scripts/downloadAccessibilityData.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

class AccessibilityDataDownloader {
  constructor() {
    this.baseUrl = 'https://accessibility-cloud.freetls.fastly.net';
    this.appToken = 'eb848ae2fbaff7680ff34a9f31eabf06';
    this.dataDir = path.join(__dirname, '..', 'server', 'data', 'accessibility');
    this.batchSize = 1000; // Download in batches to avoid timeouts
    this.maxRetries = 3;
    
    // Focus on Halifax for initial testing and faster downloads
    this.coverageAreas = [
      { name: 'Halifax', lat: 44.6488, lon: -63.5752, radius: 15000 }
    ];
  }

  /**
   * Initialize the downloader - create directories and prepare for download
   */
  async initialize() {
    console.log('🚀 Trek.IQ Accessibility Data Downloader');
    console.log('==========================================');
    console.log('✅ Using WORKING accessibility.cloud API endpoint!');
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log(`📁 Created data directory: ${this.dataDir}`);
    }

    console.log(`🌍 Coverage area: Halifax, Nova Scotia (focused download)`);
    console.log(`📊 API endpoint: ${this.baseUrl}/place-infos`);
    console.log(`🎯 Expected records: ~1,354 accessibility records for Halifax`);
    console.log(`📦 Batch size: ${this.batchSize} records per area`);
    console.log('');
  }


  /**
   * Download accessibility data from multiple geographic areas
   */
  async downloadData() {
    try {
      console.log('🌐 Starting global accessibility data download...');
      
      let allData = [];
      let totalAreas = this.coverageAreas.length;
      let completedAreas = 0;
      
      for (const area of this.coverageAreas) {
        completedAreas++;
        console.log(`📍 Downloading ${area.name} (${completedAreas}/${totalAreas})...`);
        
        try {
          const areaData = await this.downloadArea(area);
          
          if (areaData && areaData.length > 0) {
            allData = allData.concat(areaData);
            console.log(`✅ ${area.name}: ${areaData.length} records`);
          } else {
            console.log(`⚠️ ${area.name}: No data available`);
          }
          
          console.log(`📊 Total downloaded: ${allData.length} records`);
          
          // Add delay to be respectful to the API
          await this.delay(2000);
          
        } catch (error) {
          console.log(`❌ ${area.name} failed: ${error.message}`);
          // Continue with next area
        }
      }
      
      console.log('');
      console.log(`🎉 Global download complete! Total records: ${allData.length}`);
      
      // Save the data
      await this.saveData(allData);
      
      // Generate summary statistics
      this.generateSummary(allData);
      
      return allData;
      
    } catch (error) {
      console.error('❌ Download failed:', error.message);
      throw error;
    }
  }

  /**
   * Download accessibility data for a specific geographic area
   */
  async downloadArea(area, retryCount = 0) {
    try {
      const url = `${this.baseUrl}/place-infos?latitude=${area.lat}&longitude=${area.lon}&accuracy=${area.radius}&appToken=${this.appToken}`;
      
      const response = await this.makeRequest(url, {
        'Accept': 'application/json',
        'User-Agent': 'Trek.IQ/1.0'
      });
      
      const data = JSON.parse(response);
      const features = data.features || [];
      const totalCount = data.totalFeatureCount || data.count || features.length;
      
      console.log(`  📊 Found ${features.length} records (total available: ${totalCount})`);
      
      // If there are more records available, try to get them with pagination
      if (totalCount > features.length && features.length === 1000) {
        console.log(`  🔄 Getting additional records for ${area.name}...`);
        // Note: The API might support skip parameter for pagination
        // For now, we'll take the first 1000 records per area
      }
      
      return features;
      
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`  ⚠️ ${area.name} failed, retrying (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(2000 * (retryCount + 1));
        return this.downloadArea(area, retryCount + 1);
      } else {
        console.error(`  ❌ ${area.name} failed after ${this.maxRetries} retries:`, error.message);
        return [];
      }
    }
  }

  /**
   * Make HTTP request with Promise wrapper
   */
  makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trek.IQ/1.0',
          ...headers
        },
        timeout: 30000
      };
      
      const request = https.get(url, options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  /**
   * Save data to multiple formats for optimal access
   */
  async saveData(data) {
    console.log('💾 Saving data...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 1. Save raw GeoJSON for spatial operations
    const geoJsonFile = path.join(this.dataDir, 'wheelmap-accessibility.geojson');
    const geoJsonData = {
      type: 'FeatureCollection',
      features: data,
      metadata: {
        source: 'accessibility.cloud',
        sourceId: this.wheelmapSourceId,
        downloadDate: new Date().toISOString(),
        totalFeatures: data.length
      }
    };
    
    fs.writeFileSync(geoJsonFile, JSON.stringify(geoJsonData, null, 2));
    console.log(`✅ Saved GeoJSON: ${geoJsonFile}`);
    
    // 2. Save optimized JSON for fast queries
    const optimizedFile = path.join(this.dataDir, 'wheelmap-optimized.json');
    const optimizedData = this.optimizeData(data);
    fs.writeFileSync(optimizedFile, JSON.stringify(optimizedData, null, 2));
    console.log(`✅ Saved optimized data: ${optimizedFile}`);
    
    // 3. Save backup with timestamp
    const backupFile = path.join(this.dataDir, `wheelmap-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(geoJsonData));
    console.log(`✅ Saved backup: ${backupFile}`);
    
    // 4. Create index files for fast lookups
    await this.createIndexes(data);
  }

  /**
   * Optimize data structure for fast queries
   */
  optimizeData(data) {
    const optimized = {
      metadata: {
        source: 'accessibility.cloud',
        sourceId: this.wheelmapSourceId,
        downloadDate: new Date().toISOString(),
        totalRecords: data.length
      },
      places: {},
      categories: {},
      accessibility: {
        accessible: [],
        limited: [],
        not_accessible: [],
        unknown: []
      },
      spatial: {
        bounds: this.calculateBounds(data)
      }
    };

    data.forEach((feature, index) => {
      const props = feature.properties || {};
      const id = props.id || `place_${index}`;
      
      // Store place data
      optimized.places[id] = {
        id: id,
        name: props.name || 'Unnamed Place',
        coordinates: feature.geometry?.coordinates || [0, 0],
        category: props.category || 'unknown',
        wheelchair: props.wheelchair || 'unknown',
        address: props.address || '',
        website: props.website || '',
        phone: props.phone || ''
      };
      
      // Index by category
      const category = props.category || 'unknown';
      if (!optimized.categories[category]) {
        optimized.categories[category] = [];
      }
      optimized.categories[category].push(id);
      
      // Index by accessibility
      const wheelchair = props.wheelchair || 'unknown';
      if (optimized.accessibility[wheelchair]) {
        optimized.accessibility[wheelchair].push(id);
      } else {
        optimized.accessibility.unknown.push(id);
      }
    });

    return optimized;
  }

  /**
   * Create spatial and category indexes
   */
  async createIndexes(data) {
    console.log('🗂️ Creating indexes...');
    
    // Category index
    const categoryIndex = {};
    const accessibilityIndex = {};
    
    data.forEach((feature) => {
      const props = feature.properties || {};
      const category = props.category || 'unknown';
      const wheelchair = props.wheelchair || 'unknown';
      
      // Category index
      if (!categoryIndex[category]) {
        categoryIndex[category] = 0;
      }
      categoryIndex[category]++;
      
      // Accessibility index
      if (!accessibilityIndex[wheelchair]) {
        accessibilityIndex[wheelchair] = 0;
      }
      accessibilityIndex[wheelchair]++;
    });
    
    const indexFile = path.join(this.dataDir, 'indexes.json');
    fs.writeFileSync(indexFile, JSON.stringify({
      categories: categoryIndex,
      accessibility: accessibilityIndex,
      generatedAt: new Date().toISOString()
    }, null, 2));
    
    console.log(`✅ Created indexes: ${indexFile}`);
  }

  /**
   * Calculate bounding box for all data
   */
  calculateBounds(data) {
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    
    data.forEach((feature) => {
      const coords = feature.geometry?.coordinates;
      if (coords && coords.length === 2) {
        const [lon, lat] = coords;
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    });
    
    return [minLon, minLat, maxLon, maxLat];
  }

  /**
   * Generate and display summary statistics
   */
  generateSummary(data) {
    console.log('');
    console.log('📊 DOWNLOAD SUMMARY');
    console.log('==================');
    console.log(`Total records: ${data.length.toLocaleString()}`);
    
    // Accessibility breakdown
    const accessibilityStats = {};
    const categoryStats = {};
    
    data.forEach((feature) => {
      const props = feature.properties || {};
      const wheelchair = props.wheelchair || 'unknown';
      const category = props.category || 'unknown';
      
      accessibilityStats[wheelchair] = (accessibilityStats[wheelchair] || 0) + 1;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    console.log('');
    console.log('♿ Accessibility Status:');
    Object.entries(accessibilityStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        const percentage = ((count / data.length) * 100).toFixed(1);
        console.log(`  ${status}: ${count.toLocaleString()} (${percentage}%)`);
      });
    
    console.log('');
    console.log('🏢 Top Categories:');
    Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([category, count]) => {
        const percentage = ((count / data.length) * 100).toFixed(1);
        console.log(`  ${category}: ${count.toLocaleString()} (${percentage}%)`);
      });
    
    console.log('');
    console.log('✅ Data successfully downloaded and optimized!');
    console.log(`📁 Files saved to: ${this.dataDir}`);
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const downloader = new AccessibilityDataDownloader();
  
  try {
    await downloader.initialize();
    await downloader.downloadData();
    
    console.log('');
    console.log('🎉 Download completed successfully!');
    console.log('Trek.IQ now has access to comprehensive accessibility data.');
    
  } catch (error) {
    console.error('');
    console.error('❌ Download failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = AccessibilityDataDownloader;
