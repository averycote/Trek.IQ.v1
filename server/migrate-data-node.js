#!/usr/bin/env node

// Trek.IQ Data Migration Script (Node.js Version)
// This script converts large GeoJSON files to optimized formats without requiring GDAL

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

class DataMigrator {
  constructor() {
    this.dataDir = path.join(__dirname, 'data');
    this.backupDir = null;
    this.optimizedDir = path.join(this.dataDir, 'optimized');
  }

  async initialize() {
    console.log('🚀 Starting Trek.IQ Data Migration (Node.js Version)...');
    console.log('=====================================================');

    // Check if we're in the right directory
    if (!await this.checkDirectory()) {
      process.exit(1);
    }

    // Create backup directory
    await this.createBackup();
  }

  async checkDirectory() {
    try {
      await fs.access(this.dataDir);
      console.log('✅ Data directory found:', this.dataDir);
      return true;
    } catch (error) {
      console.log('❌ Error: Please run this script from the server directory');
      console.log('   Current directory:', process.cwd());
      console.log('   Expected: server/data/ directory should exist');
      return false;
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupDir = path.join(this.dataDir, 'backup', timestamp);
    
    console.log('📁 Creating backup directory...');
    await fs.mkdir(this.backupDir, { recursive: true });

    // Backup existing files
    console.log('💾 Backing up existing files...');
    const files = await fs.readdir(this.dataDir);
    
    for (const file of files) {
      if (file.endsWith('.geojson') || file.endsWith('.gpkg') || file.endsWith('.db')) {
        const sourcePath = path.join(this.dataDir, file);
        const backupPath = path.join(this.backupDir, file);
        await fs.copyFile(sourcePath, backupPath);
      }
    }

    console.log('✅ Backup created in:', this.backupDir);
  }

  async migrateData() {
    console.log('\n🔄 Step 1: Converting large files to optimized format...');

    // Create optimized directory
    await fs.mkdir(this.optimizedDir, { recursive: true });

    // Process large files
    const largeFiles = [
      'CivicAddresses_-5590432719903009914.geojson',
      'Street_Lights_-8646609400635809433.geojson',
      'Active_Travelways.geojson',
      'Bus_Stops_2_9086297843420881686.geojson',
      'Transit_Bus_Snow_Routes_2846831489590635221.geojson',
      'Bike_Infrastructure_and_Suggested_Routes_-8768028288468156838.geojson'
    ];

    console.log('   Creating trek-iq-core.json...');
    const coreData = { type: 'FeatureCollection', features: [] };

    for (const fileName of largeFiles) {
      const filePath = path.join(this.dataDir, fileName);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const geojson = JSON.parse(data);
        
        if (geojson.features) {
          console.log(`   - Processing ${fileName} (${geojson.features.length} features)`);
          
          // Optimize features
          const optimizedFeatures = geojson.features.map(feature => this.optimizeFeature(feature, fileName));
          coreData.features.push(...optimizedFeatures);
        }
      } catch (error) {
        console.log(`   ⚠️  ${fileName} not found or invalid, skipping...`);
      }
    }

    // Save optimized core data
    const corePath = path.join(this.optimizedDir, 'trek-iq-core.json');
    await fs.writeFile(corePath, JSON.stringify(coreData, null, 2));
    console.log(`   ✅ Saved ${coreData.features.length} features to trek-iq-core.json`);

    // Process amenity files
    console.log('\n   Creating trek-iq-amenities.json...');
    const amenityFiles = [
      'Accessible_Parking.geojson',
      'Accessible_Parking_Spots_-8108737058942968370.geojson',
      'Active_Travelways_-4200371894220343912.geojson',
      'HRM_Public_Washrooms_8937353538278970153.geojson'
    ];

    const amenityData = { type: 'FeatureCollection', features: [] };

    for (const fileName of amenityFiles) {
      const filePath = path.join(this.dataDir, fileName);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const geojson = JSON.parse(data);
        
        if (geojson.features) {
          console.log(`   - Processing ${fileName} (${geojson.features.length} features)`);
          const optimizedFeatures = geojson.features.map(feature => this.optimizeFeature(feature, fileName));
          amenityData.features.push(...optimizedFeatures);
        }
      } catch (error) {
        console.log(`   ⚠️  ${fileName} not found or invalid, skipping...`);
      }
    }

    const amenityPath = path.join(this.optimizedDir, 'trek-iq-amenities.json');
    await fs.writeFile(amenityPath, JSON.stringify(amenityData, null, 2));
    console.log(`   ✅ Saved ${amenityData.features.length} features to trek-iq-amenities.json`);

    // Process transit files
    console.log('\n   Creating trek-iq-transit.json...');
    const transitFiles = [
      'Transit_Bus_Routes.geojson',
      'Traffic_Control.geojson'
    ];

    const transitData = { type: 'FeatureCollection', features: [] };

    for (const fileName of transitFiles) {
      const filePath = path.join(this.dataDir, fileName);
      try {
        const data = await fs.readFile(filePath, 'utf8');
        const geojson = JSON.parse(data);
        
        if (geojson.features) {
          console.log(`   - Processing ${fileName} (${geojson.features.length} features)`);
          const optimizedFeatures = geojson.features.map(feature => this.optimizeFeature(feature, fileName));
          transitData.features.push(...optimizedFeatures);
        }
      } catch (error) {
        console.log(`   ⚠️  ${fileName} not found or invalid, skipping...`);
      }
    }

    const transitPath = path.join(this.optimizedDir, 'trek-iq-transit.json');
    await fs.writeFile(transitPath, JSON.stringify(transitData, null, 2));
    console.log(`   ✅ Saved ${transitData.features.length} features to trek-iq-transit.json`);
  }

  optimizeFeature(feature, sourceFile) {
    const optimized = {
      type: 'Feature',
      geometry: feature.geometry,
      properties: {}
    };

    // Extract essential properties based on source file
    if (sourceFile.includes('CivicAddresses')) {
      optimized.properties = {
        id: feature.properties?.id || feature.id,
        address: feature.properties?.ADDRESS || feature.properties?.address,
        street: feature.properties?.STREET_NAME || feature.properties?.street,
        number: feature.properties?.CIVIC_NUMBER || feature.properties?.number,
        type: 'civic_address'
      };
    } else if (sourceFile.includes('Street_Lights')) {
      optimized.properties = {
        id: feature.properties?.id || feature.id,
        status: feature.properties?.STATUS || feature.properties?.status,
        type: feature.properties?.TYPE || feature.properties?.type,
        type: 'street_light'
      };
    } else if (sourceFile.includes('Active_Travelways')) {
      optimized.properties = {
        id: feature.properties?.id || feature.id,
        name: feature.properties?.NAME || feature.properties?.name,
        type: feature.properties?.TYPE || feature.properties?.type,
        surface: feature.properties?.SURFACE_TYPE || feature.properties?.surface,
        width: feature.properties?.WIDTH || feature.properties?.width,
        type: 'travelway'
      };
    } else if (sourceFile.includes('Bus_Stops')) {
      optimized.properties = {
        id: feature.properties?.id || feature.id,
        name: feature.properties?.NAME || feature.properties?.name,
        route: feature.properties?.ROUTE || feature.properties?.route,
        type: 'bus_stop'
      };
    } else if (sourceFile.includes('Accessible_Parking')) {
      optimized.properties = {
        id: feature.properties?.id || feature.id,
        name: feature.properties?.NAME || feature.properties?.name,
        spaces: feature.properties?.SPACES || feature.properties?.spaces,
        features: feature.properties?.FEATURES || feature.properties?.features,
        type: 'accessible_parking'
      };
    } else {
      // Generic optimization
      optimized.properties = {
        id: feature.properties?.id || feature.id,
        name: feature.properties?.NAME || feature.properties?.name,
        type: feature.properties?.TYPE || feature.properties?.type,
        source: sourceFile.replace('.geojson', '')
      };
    }

    return optimized;
  }

  async createSpatialDatabase() {
    console.log('\n🔄 Step 2: Creating spatial database...');

    const dbPath = path.join(this.optimizedDir, 'trek-iq-spatial.db');
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        const sqlScript = `
          -- Create spatial tables for fast proximity searches
          CREATE VIRTUAL TABLE IF NOT EXISTS civic_addresses USING rtree(
            id, min_lat, max_lat, min_lng, max_lng
          );

          CREATE VIRTUAL TABLE IF NOT EXISTS street_lights USING rtree(
            id, min_lat, max_lat, min_lng, max_lng
          );

          CREATE VIRTUAL TABLE IF NOT EXISTS active_travelways USING rtree(
            id, min_lat, max_lat, min_lng, max_lng
          );

          CREATE VIRTUAL TABLE IF NOT EXISTS bus_stops USING rtree(
            id, min_lat, max_lat, min_lng, max_lng
          );

          -- Create metadata table
          CREATE TABLE IF NOT EXISTS dataset_metadata (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            created_date TEXT NOT NULL,
            feature_count INTEGER,
            file_size INTEGER,
            description TEXT
          );

          -- Insert metadata
          INSERT OR REPLACE INTO dataset_metadata (name, type, created_date, description) VALUES
          ('trek-iq-core', 'optimized_json', datetime('now'), 'Core datasets including addresses, street lights, and travelways'),
          ('trek-iq-amenities', 'optimized_json', datetime('now'), 'Amenity datasets including parking and washrooms'),
          ('trek-iq-transit', 'optimized_json', datetime('now'), 'Transit-related datasets including bus routes and traffic control');
        `;

        db.exec(sqlScript, (err) => {
          if (err) {
            reject(err);
            return;
          }

          console.log('✅ Spatial database created:', dbPath);
          db.close();
          resolve();
        });
      });
    });
  }

  async organizeFiles() {
    console.log('\n🔄 Step 3: Creating directory structure...');

    // Create directories
    const dynamicDir = path.join(this.dataDir, 'dynamic');
    const staticDir = path.join(this.dataDir, 'static');
    
    await fs.mkdir(dynamicDir, { recursive: true });
    await fs.mkdir(staticDir, { recursive: true });

    // Move frequently updated files to dynamic directory
    console.log('   Moving dynamic files...');
    const dynamicFiles = [
      'Steps_577353981712784942.geojson',
      'Sidewalk Closures.geojson',
      'Street_Closures.geojson',
      'Transit_Shelters_1139561051208148127.geojson'
    ];

    for (const fileName of dynamicFiles) {
      const sourcePath = path.join(this.dataDir, fileName);
      const destPath = path.join(dynamicDir, fileName);
      
      try {
        await fs.rename(sourcePath, destPath);
        console.log(`   - Moved ${fileName} to dynamic/`);
      } catch (error) {
        console.log(`   ⚠️  ${fileName} not found`);
      }
    }

    // Move static files to static directory
    console.log('   Moving static files...');
    const staticFiles = [
      'Street_Junctions.geojson'
    ];

    for (const fileName of staticFiles) {
      const sourcePath = path.join(this.dataDir, fileName);
      const destPath = path.join(staticDir, fileName);
      
      try {
        await fs.rename(sourcePath, destPath);
        console.log(`   - Moved ${fileName} to static/`);
      } catch (error) {
        console.log(`   ⚠️  ${fileName} not found`);
      }
    }
  }

  async generateReport() {
    console.log('\n🔄 Step 4: Generating migration report...');

    const report = {
      timestamp: new Date().toISOString(),
      originalFiles: [],
      optimizedFiles: [],
      databaseFiles: [],
      directoryStructure: {
        dynamic: 'Frequently updated data',
        static: 'Rarely changed data',
        backup: 'Original files backup',
        optimized: 'Optimized data files'
      }
    };

    // Get original file sizes
    if (this.backupDir) {
      const backupFiles = await fs.readdir(this.backupDir);
      for (const file of backupFiles) {
        if (file.endsWith('.geojson')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          report.originalFiles.push({
            name: file,
            size: Math.round(stats.size / 1024 / 1024 * 100) / 100 // MB
          });
        }
      }
    }

    // Get optimized file sizes
    const optimizedFiles = await fs.readdir(this.optimizedDir);
    for (const file of optimizedFiles) {
      if (file.endsWith('.json') || file.endsWith('.db')) {
        const filePath = path.join(this.optimizedDir, file);
        const stats = await fs.stat(filePath);
        const size = file.endsWith('.db') ? 
          Math.round(stats.size / 1024 * 100) / 100 : // KB
          Math.round(stats.size / 1024 / 1024 * 100) / 100; // MB
        
        report.optimizedFiles.push({
          name: file,
          size: size,
          unit: file.endsWith('.db') ? 'KB' : 'MB'
        });
      }
    }

    // Save report
    const reportPath = path.join(this.optimizedDir, 'migration_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Display summary
    console.log('\n📊 Migration Report');
    console.log('==================');
    console.log('Generated:', report.timestamp);
    console.log('\nOriginal GeoJSON files:');
    console.log('----------------------');
    report.originalFiles.forEach(file => {
      console.log(`  ${file.name}: ${file.size}MB`);
    });

    console.log('\nOptimized files:');
    console.log('---------------');
    report.optimizedFiles.forEach(file => {
      console.log(`  ${file.name}: ${file.size}${file.unit}`);
    });

    console.log('\nDirectory structure:');
    console.log('-------------------');
    Object.entries(report.directoryStructure).forEach(([dir, desc]) => {
      console.log(`  ${dir}/: ${desc}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📁 New file structure:');
    console.log('   optimized/trek-iq-core.json       # Large datasets');
    console.log('   optimized/trek-iq-amenities.json  # Amenity datasets');
    console.log('   optimized/trek-iq-transit.json    # Transit datasets');
    console.log('   optimized/trek-iq-spatial.db      # Spatial database');
    console.log('   dynamic/                          # Frequently updated data');
    console.log('   static/                           # Rarely changed data');
    console.log('   backup/                           # Original files backup');
    console.log('\n📋 Next steps:');
    console.log('   1. Update your routing service to use the new optimized files');
    console.log('   2. Test the spatial database queries');
    console.log('   3. Update client-side data loading');
    console.log('   4. Remove old GeoJSON files after testing');
    console.log('\n📄 Full report saved to: optimized/migration_report.json');
  }

  async run() {
    try {
      await this.initialize();
      await this.migrateData();
      await this.createSpatialDatabase();
      await this.organizeFiles();
      await this.generateReport();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }
}

// Run the migration
if (require.main === module) {
  const migrator = new DataMigrator();
  migrator.run();
}

module.exports = DataMigrator;
