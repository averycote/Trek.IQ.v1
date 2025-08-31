// Data Preprocessing Utility for Trek.IQ
// Converts large GeoJSON files to optimized formats and creates spatial indexes

const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class DataPreprocessor {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.outputDir = path.join(__dirname, '../data/optimized');
    this.maxFeatures = 2000;
    this.simplifyTolerance = 0.0001;
  }

  async initialize() {
    // Create output directory if it doesn't exist
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async processAllDatasets() {
    console.log('Starting data preprocessing...');
    
    const datasets = [
      { name: 'Active_Travelways', priority: 'critical' },
      { name: 'CivicAddresses_-5590432719903009914', priority: 'high' },
      { name: 'Street_Lights_-8646609400635809433', priority: 'medium' },
      { name: 'Bus_Stops_2_9086297843420881686', priority: 'high' },
      { name: 'Steps_577353981712784942', priority: 'critical' },
      { name: 'Accessible_Parking', priority: 'high' },
      { name: 'Sidewalk Closures', priority: 'critical' }
    ];

    for (const dataset of datasets) {
      try {
        console.log(`Processing ${dataset.name}...`);
        await this.processDataset(dataset);
      } catch (error) {
        console.error(`Failed to process ${dataset.name}:`, error);
      }
    }

    console.log('Data preprocessing completed');
  }

  async processDataset(dataset) {
    const inputPath = path.join(this.dataDir, `${dataset.name}.geojson`);
    const outputPath = path.join(this.outputDir, dataset.name);

    // Check if input file exists
    try {
      await fs.access(inputPath);
    } catch (error) {
      console.warn(`Input file not found: ${inputPath}`);
      return;
    }

    // Read and analyze the dataset
    const rawData = await this.readGeoJSON(inputPath);
    const analysis = this.analyzeDataset(rawData);
    
    console.log(`Dataset analysis for ${dataset.name}:`, analysis);

    // Apply optimizations based on dataset type and size
    const optimizedData = await this.optimizeDataset(rawData, dataset, analysis);

    // Save optimized versions
    await this.saveOptimizedVersions(optimizedData, outputPath, dataset);

    // Create spatial indexes
    await this.createSpatialIndexes(optimizedData, outputPath, dataset);
  }

  async readGeoJSON(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  analyzeDataset(data) {
    const features = data.features || [];
    const analysis = {
      featureCount: features.length,
      geometryTypes: new Set(),
      propertyKeys: new Set(),
      sizeBytes: JSON.stringify(data).length,
      boundingBox: null
    };

    // Analyze features
    features.forEach(feature => {
      if (feature.geometry) {
        analysis.geometryTypes.add(feature.geometry.type);
      }
      
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => {
          analysis.propertyKeys.add(key);
        });
      }
    });

    // Calculate bounding box
    if (features.length > 0) {
      analysis.boundingBox = this.calculateBoundingBox(features);
    }

    return {
      ...analysis,
      geometryTypes: Array.from(analysis.geometryTypes),
      propertyKeys: Array.from(analysis.propertyKeys)
    };
  }

  calculateBoundingBox(features) {
    let minLng = Infinity, minLat = Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;

    features.forEach(feature => {
      if (feature.geometry && feature.geometry.coordinates) {
        this.extractCoordinates(feature.geometry.coordinates).forEach(coord => {
          const [lng, lat] = coord;
          minLng = Math.min(minLng, lng);
          minLat = Math.min(minLat, lat);
          maxLng = Math.max(maxLng, lng);
          maxLat = Math.max(maxLat, lat);
        });
      }
    });

    return [minLng, minLat, maxLng, maxLat];
  }

  extractCoordinates(coordinates) {
    const coords = [];
    
    if (Array.isArray(coordinates[0])) {
      coordinates.forEach(coord => {
        coords.push(...this.extractCoordinates(coord));
      });
    } else {
      coords.push(coordinates);
    }
    
    return coords;
  }

  async optimizeDataset(data, dataset, analysis) {
    const optimized = {
      type: 'FeatureCollection',
      features: []
    };

    // Apply different optimizations based on dataset type and size
    if (analysis.featureCount > this.maxFeatures) {
      // For large datasets, sample and cluster
      optimized.features = await this.sampleAndCluster(data.features, dataset);
    } else {
      // For smaller datasets, optimize each feature
      optimized.features = data.features.map(feature => 
        this.optimizeFeature(feature, dataset)
      );
    }

    return optimized;
  }

  async sampleAndCluster(features, dataset) {
    // Simple random sampling for now
    // In production, use more sophisticated clustering
    const sampled = features.length > this.maxFeatures ? 
      this.randomSample(features, this.maxFeatures) : 
      features;

    return sampled.map(feature => this.optimizeFeature(feature, dataset));
  }

  randomSample(array, size) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  optimizeFeature(feature, dataset) {
    const optimized = {
      type: 'Feature',
      geometry: this.optimizeGeometry(feature.geometry),
      properties: this.optimizeProperties(feature.properties, dataset)
    };

    return optimized;
  }

  optimizeGeometry(geometry) {
    if (!geometry) return null;

    // Simplify complex geometries
    if (geometry.type === 'LineString' && geometry.coordinates.length > 100) {
      geometry.coordinates = this.simplifyLineString(geometry.coordinates);
    } else if (geometry.type === 'Polygon' && geometry.coordinates[0].length > 100) {
      geometry.coordinates[0] = this.simplifyLineString(geometry.coordinates[0]);
    }

    return geometry;
  }

  simplifyLineString(coordinates) {
    // Douglas-Peucker simplification
    const tolerance = this.simplifyTolerance;
    const simplified = [];
    
    if (coordinates.length <= 2) return coordinates;

    simplified.push(coordinates[0]);
    
    for (let i = 1; i < coordinates.length - 1; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];
      const next = coordinates[i + 1];
      
      const distance = this.pointToLineDistance(curr, prev, next);
      
      if (distance > tolerance) {
        simplified.push(curr);
      }
    }
    
    simplified.push(coordinates[coordinates.length - 1]);
    
    return simplified;
  }

  pointToLineDistance(point, lineStart, lineEnd) {
    const [px, py] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;
    
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }
    
    const param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  optimizeProperties(properties, dataset) {
    if (!properties) return {};

    const optimized = {};

    // Keep essential properties based on dataset type
    switch (dataset.name) {
      case 'Active_Travelways':
        optimized.id = properties.id;
        optimized.name = properties.name;
        optimized.type = properties.type;
        optimized.surface = properties.surface_type;
        optimized.width = properties.width;
        optimized.accessibility = this.calculateAccessibilityScore(properties);
        break;
        
      case 'Steps_577353981712784942':
        optimized.id = properties.id;
        optimized.location = properties.location;
        optimized.severity = 'high';
        break;
        
      case 'Accessible_Parking':
        optimized.id = properties.id;
        optimized.name = properties.name;
        optimized.spaces = properties.spaces;
        optimized.features = properties.accessible_features;
        optimized.timeLimit = properties.time_limit;
        break;
        
      case 'CivicAddresses_-5590432719903009914':
        optimized.id = properties.id;
        optimized.number = properties.civic_number;
        optimized.street = properties.street_name;
        optimized.postal = properties.postal_code;
        break;
        
      default:
        // Keep common properties
        optimized.id = properties.id;
        optimized.name = properties.name;
        optimized.type = properties.type;
    }

    return optimized;
  }

  calculateAccessibilityScore(properties) {
    let score = 100;
    
    if (properties.surface_type === 'gravel') score -= 20;
    if (properties.surface_type === 'dirt') score -= 30;
    if (properties.width < 1.5) score -= 15;
    if (properties.slope > 0.05) score -= 25;
    if (properties.steps > 0) score -= 50;
    
    return Math.max(0, score);
  }

  async saveOptimizedVersions(data, outputPath, dataset) {
    // Save optimized GeoJSON
    const geojsonPath = `${outputPath}_optimized.geojson`;
    await fs.writeFile(geojsonPath, JSON.stringify(data, null, 2));
    
    console.log(`Saved optimized GeoJSON: ${geojsonPath}`);

    // Convert to MBTiles if tippecanoe is available
    try {
      await this.convertToMBTiles(geojsonPath, `${outputPath}.mbtiles`);
    } catch (error) {
      console.warn(`MBTiles conversion failed for ${dataset.name}:`, error.message);
    }

    // Save as Protocol Buffers
    try {
      await this.convertToProtobuf(data, `${outputPath}.pb`);
    } catch (error) {
      console.warn(`Protobuf conversion failed for ${dataset.name}:`, error.message);
    }
  }

  async convertToMBTiles(geojsonPath, mbtilesPath) {
    const command = `tippecanoe -o "${mbtilesPath}" "${geojsonPath}" --drop-densest-as-needed --extend-zooms-if-still-dropping`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(`MBTiles conversion successful: ${mbtilesPath}`);
      if (stderr) console.warn('MBTiles warnings:', stderr);
    } catch (error) {
      throw new Error(`MBTiles conversion failed: ${error.message}`);
    }
  }

  async convertToProtobuf(data, protobufPath) {
    // Simple protobuf-like serialization
    // In production, use actual protobuf library
    const protobufData = this.serializeToProtobuf(data);
    await fs.writeFile(protobufPath, protobufData);
    console.log(`Protobuf conversion successful: ${protobufPath}`);
  }

  serializeToProtobuf(data) {
    // Simplified protobuf-like serialization
    const buffer = [];
    
    // Write feature count
    const featureCount = data.features.length;
    buffer.push(this.writeVarint(featureCount));
    
    // Write each feature
    data.features.forEach(feature => {
      buffer.push(this.serializeFeature(feature));
    });
    
    return Buffer.concat(buffer);
  }

  serializeFeature(feature) {
    const buffer = [];
    
    // Serialize geometry
    if (feature.geometry) {
      buffer.push(this.serializeGeometry(feature.geometry));
    }
    
    // Serialize properties
    if (feature.properties) {
      buffer.push(this.serializeProperties(feature.properties));
    }
    
    return Buffer.concat(buffer);
  }

  serializeGeometry(geometry) {
    // Simplified geometry serialization
    const buffer = [];
    
    // Write geometry type
    const typeMap = { 'Point': 1, 'LineString': 2, 'Polygon': 3 };
    const type = typeMap[geometry.type] || 0;
    buffer.push(this.writeVarint(type));
    
    // Write coordinates
    if (geometry.coordinates) {
      buffer.push(this.serializeCoordinates(geometry.coordinates));
    }
    
    return Buffer.concat(buffer);
  }

  serializeCoordinates(coordinates) {
    const buffer = [];
    
    if (Array.isArray(coordinates[0])) {
      // Multi-dimensional array
      buffer.push(this.writeVarint(coordinates.length));
      coordinates.forEach(coord => {
        buffer.push(this.serializeCoordinates(coord));
      });
    } else {
      // Single coordinate pair
      buffer.push(this.writeVarint(coordinates.length));
      coordinates.forEach(coord => {
        buffer.push(this.writeDouble(coord));
      });
    }
    
    return Buffer.concat(buffer);
  }

  serializeProperties(properties) {
    const buffer = [];
    const keys = Object.keys(properties);
    
    buffer.push(this.writeVarint(keys.length));
    
    keys.forEach(key => {
      buffer.push(this.writeString(key));
      buffer.push(this.writeString(String(properties[key])));
    });
    
    return Buffer.concat(buffer);
  }

  writeVarint(value) {
    const buffer = [];
    while (value >= 0x80) {
      buffer.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    buffer.push(value & 0x7F);
    return Buffer.from(buffer);
  }

  writeString(value) {
    const bytes = Buffer.from(value, 'utf8');
    const length = this.writeVarint(bytes.length);
    return Buffer.concat([length, bytes]);
  }

  writeDouble(value) {
    const buffer = Buffer.alloc(8);
    buffer.writeDoubleLE(value, 0);
    return buffer;
  }

  async createSpatialIndexes(data, outputPath, dataset) {
    // Create SQLite spatial index
    const dbPath = `${outputPath}_spatial.db`;
    await this.createSQLiteSpatialIndex(data, dbPath, dataset);
    
    // Create JSON spatial index
    const spatialIndexPath = `${outputPath}_spatial_index.json`;
    await this.createJSONSpatialIndex(data, spatialIndexPath);
  }

  async createSQLiteSpatialIndex(data, dbPath, dataset) {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create spatial table
        const createTable = `
          CREATE TABLE IF NOT EXISTS features (
            id TEXT PRIMARY KEY,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            type TEXT,
            properties TEXT,
            geometry TEXT
          )
        `;

        db.run(createTable, (err) => {
          if (err) {
            reject(err);
            return;
          }

          // Insert features
          const insertStmt = db.prepare(`
            INSERT INTO features (id, lat, lng, type, properties, geometry)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          let completed = 0;
          const total = data.features.length;

          data.features.forEach(feature => {
            const center = this.getFeatureCenter(feature);
            const [lng, lat] = center;
            
            insertStmt.run(
              feature.properties?.id || feature.id,
              lat,
              lng,
              feature.geometry?.type,
              JSON.stringify(feature.properties),
              JSON.stringify(feature.geometry),
              (err) => {
                if (err) {
                  console.warn(`Failed to insert feature:`, err);
                }
                
                completed++;
                if (completed === total) {
                  insertStmt.finalize(() => {
                    db.close();
                    console.log(`SQLite spatial index created: ${dbPath}`);
                    resolve();
                  });
                }
              }
            );
          });
        });
      });
    });
  }

  async createJSONSpatialIndex(data, outputPath) {
    const gridSize = 0.01; // ~1km grid cells
    const spatialIndex = new Map();

    data.features.forEach(feature => {
      const center = this.getFeatureCenter(feature);
      const gridKey = this.getGridKey(center, gridSize);
      
      if (!spatialIndex.has(gridKey)) {
        spatialIndex.set(gridKey, []);
      }
      
      spatialIndex.get(gridKey).push({
        id: feature.properties?.id || feature.id,
        lat: center[1],
        lng: center[0],
        type: feature.geometry?.type,
        properties: feature.properties
      });
    });

    const indexData = {
      gridSize,
      grids: Object.fromEntries(spatialIndex),
      metadata: {
        featureCount: data.features.length,
        gridCount: spatialIndex.size,
        created: new Date().toISOString()
      }
    };

    await fs.writeFile(outputPath, JSON.stringify(indexData, null, 2));
    console.log(`JSON spatial index created: ${outputPath}`);
  }

  getFeatureCenter(feature) {
    if (feature.geometry.type === 'Point') {
      return feature.geometry.coordinates;
    } else if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      const midIndex = Math.floor(coords.length / 2);
      return coords[midIndex];
    } else {
      // For polygons, use centroid
      const coords = feature.geometry.coordinates[0];
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      return [
        (Math.min(...lngs) + Math.max(...lngs)) / 2,
        (Math.min(...lats) + Math.max(...lats)) / 2
      ];
    }
  }

  getGridKey(coordinates, gridSize) {
    const [lng, lat] = coordinates;
    return `${Math.floor(lng / gridSize)},${Math.floor(lat / gridSize)}`;
  }

  async generateOptimizationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      datasets: [],
      summary: {
        totalOriginalSize: 0,
        totalOptimizedSize: 0,
        compressionRatio: 0
      }
    };

    // Analyze all processed datasets
    const files = await fs.readdir(this.outputDir);
    
    for (const file of files) {
      if (file.endsWith('_optimized.geojson')) {
        const datasetName = file.replace('_optimized.geojson', '');
        const originalPath = path.join(this.dataDir, `${datasetName}.geojson`);
        const optimizedPath = path.join(this.outputDir, file);
        
        try {
          const originalStats = await fs.stat(originalPath);
          const optimizedStats = await fs.stat(optimizedPath);
          
          const datasetReport = {
            name: datasetName,
            originalSize: originalStats.size,
            optimizedSize: optimizedStats.size,
            compressionRatio: (1 - optimizedStats.size / originalStats.size) * 100
          };
          
          report.datasets.push(datasetReport);
          report.summary.totalOriginalSize += originalStats.size;
          report.summary.totalOptimizedSize += optimizedStats.size;
        } catch (error) {
          console.warn(`Could not analyze ${datasetName}:`, error.message);
        }
      }
    }

    report.summary.compressionRatio = 
      (1 - report.summary.totalOptimizedSize / report.summary.totalOriginalSize) * 100;

    const reportPath = path.join(this.outputDir, 'optimization_report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('Optimization report generated:', reportPath);
    console.log('Summary:', report.summary);
    
    return report;
  }
}

module.exports = DataPreprocessor;
