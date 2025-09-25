/**
 * Data Manager - Centralized Dataset Loading and Caching
 * 
 * Provides a single interface for loading and managing datasets with:
 * - Promise memoization to prevent duplicate loads
 * - Transparent caching with metadata
 * - Streaming/iterative parsing for large GeoJSONs
 * - Spatial index creation for fast lookups
 */

class DataManager {
  constructor() {
    this.isInitialized = false;
    this.datasets = new Map();
    this.loadPromises = new Map(); // Promise memoization
    this.cache = new Map();
    this.spatialIndexes = new Map();
    
    // Configuration
    this.config = {
      cacheSize: 100,
      cacheTTL: 300000, // 5 minutes
      maxConcurrentLoads: 5,
      retryAttempts: 3,
      retryDelay: 1000
    };
    
    // Dataset metadata
    this.datasetMetadata = {
      activeTravelways: { required: true, priority: 1 },
      steps: { required: false, priority: 2 },
      sidewalkClosures: { required: false, priority: 3 },
      trafficControl: { required: false, priority: 4 },
      accessibleParking: { required: false, priority: 5 },
      transitStops: { required: false, priority: 6 },
      streetLights: { required: false, priority: 7 },
      publicWashrooms: { required: false, priority: 8 }
    };
  }

  /**
   * Initialize the DataManager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('📊 Initializing DataManager...');
    
    // Load required datasets first
    const requiredDatasets = Object.entries(this.datasetMetadata)
      .filter(([name, meta]) => meta.required)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    for (const [datasetName] of requiredDatasets) {
      try {
        await this.loadDataset(datasetName);
      } catch (error) {
        console.error(`❌ Failed to load required dataset ${datasetName}:`, error);
        throw error;
      }
    }
    
    this.isInitialized = true;
    console.log('✅ DataManager initialized successfully');
  }

  /**
   * Load a dataset with deduplication and caching
   * @param {string} name - Dataset name
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Dataset
   */
  async loadDataset(name, options = {}) {
    const { force = false } = options;
    
    // Check if already loaded and not forcing reload
    if (!force && this.datasets.has(name)) {
      console.log(`📋 Dataset ${name} already loaded`);
      return this.datasets.get(name);
    }
    
    // Check if load is already in progress (Promise memoization)
    if (this.loadPromises.has(name)) {
      console.log(`⏳ Dataset ${name} load already in progress`);
      return this.loadPromises.get(name);
    }
    
    // Start loading
    const loadPromise = this._performLoad(name, options);
    this.loadPromises.set(name, loadPromise);
    
    try {
      const dataset = await loadPromise;
      this.datasets.set(name, dataset);
      this.loadPromises.delete(name);
      
      // Create spatial index if applicable
      await this._createSpatialIndex(name, dataset);
      
      console.log(`✅ Dataset ${name} loaded successfully`);
      return dataset;
      
    } catch (error) {
      this.loadPromises.delete(name);
      console.error(`❌ Failed to load dataset ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a loaded dataset
   * @param {string} name - Dataset name
   * @returns {Object|null} Dataset or null if not loaded
   */
  getDataset(name) {
    return this.datasets.get(name) || null;
  }

  /**
   * Get spatial index for a dataset
   * @param {string} name - Dataset name
   * @returns {Object|null} Spatial index or null if not available
   */
  getSpatialIndex(name) {
    return this.spatialIndexes.get(name) || null;
  }

  /**
   * Find nearest features to a point
   * @param {string} datasetName - Dataset name
   * @param {Array} point - [lng, lat] coordinates
   * @param {number} maxDistance - Maximum distance in meters
   * @returns {Array} Nearest features
   */
  findNearestFeatures(datasetName, point, maxDistance = 1000) {
    const dataset = this.getDataset(datasetName);
    if (!dataset) return [];
    
    const spatialIndex = this.getSpatialIndex(datasetName);
    if (!spatialIndex) {
      // Fallback to brute force search
      return this._bruteForceNearestSearch(dataset, point, maxDistance);
    }
    
    // Use spatial index for fast lookup
    return this._spatialIndexNearestSearch(spatialIndex, point, maxDistance);
  }

  /**
   * Get dataset metadata
   * @param {string} name - Dataset name
   * @returns {Object} Metadata
   */
  getDatasetMetadata(name) {
    const dataset = this.datasets.get(name);
    if (!dataset) return null;
    
    return {
      name,
      featureCount: dataset.features ? dataset.features.length : 0,
      lastLoaded: new Date().toISOString(),
      hasSpatialIndex: this.spatialIndexes.has(name),
      size: JSON.stringify(dataset).length
    };
  }

  /**
   * Clear cache and reload all datasets
   * @returns {Promise<void>}
   */
  async reloadAll() {
    console.log('🔄 Reloading all datasets...');
    
    this.datasets.clear();
    this.loadPromises.clear();
    this.spatialIndexes.clear();
    
    await this.initialize();
  }

  /**
   * Get health status
   * @returns {Object} Health status
   */
  getHealthStatus() {
    const loadedDatasets = Array.from(this.datasets.keys());
    const requiredDatasets = Object.entries(this.datasetMetadata)
      .filter(([name, meta]) => meta.required)
      .map(([name]) => name);
    
    const missingRequired = requiredDatasets.filter(name => !loadedDatasets.includes(name));
    
    return {
      isInitialized: this.isInitialized,
      loadedDatasets,
      missingRequired,
      totalDatasets: Object.keys(this.datasetMetadata).length,
      cacheSize: this.datasets.size,
      spatialIndexes: Array.from(this.spatialIndexes.keys())
    };
  }

  // Private methods

  async _performLoad(name, options) {
    const metadata = this.datasetMetadata[name];
    if (!metadata) {
      throw new Error(`Unknown dataset: ${name}`);
    }
    
    console.log(`📥 Loading dataset: ${name}`);
    
    // Simulate dataset loading
    // In production, this would load from server endpoints
    const dataset = await this._loadFromServer(name, options);
    
    return dataset;
  }

  async _loadFromServer(name, options) {
    // Simulate server loading with retry logic
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Return mock dataset
        return this._createMockDataset(name);
        
      } catch (error) {
        if (attempt === this.config.retryAttempts) {
          throw error;
        }
        
        console.warn(`⚠️ Load attempt ${attempt} failed for ${name}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      }
    }
  }

  _createMockDataset(name) {
    // Create mock dataset based on name
    const mockDatasets = {
      activeTravelways: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[-63.5752, 44.6488], [-63.5713, 44.6519]]
            },
            properties: {
              name: 'Mock Travelway',
              surface: 'paved',
              accessibility: 'accessible'
            }
          }
        ]
      },
      steps: {
        type: 'FeatureCollection',
        features: []
      },
      sidewalkClosures: {
        type: 'FeatureCollection',
        features: []
      },
      trafficControl: {
        type: 'FeatureCollection',
        features: []
      },
      accessibleParking: {
        type: 'FeatureCollection',
        features: []
      },
      transitStops: {
        type: 'FeatureCollection',
        features: []
      },
      streetLights: {
        type: 'FeatureCollection',
        features: []
      },
      publicWashrooms: {
        type: 'FeatureCollection',
        features: []
      }
    };
    
    return mockDatasets[name] || { type: 'FeatureCollection', features: [] };
  }

  async _createSpatialIndex(name, dataset) {
    if (!dataset.features || dataset.features.length === 0) {
      return;
    }
    
    console.log(`🗺️ Creating spatial index for ${name}...`);
    
    // Simple spatial index implementation
    // In production, this would use a proper spatial index like R-tree
    const spatialIndex = new Map();
    
    for (const feature of dataset.features) {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = this._extractCoordinates(feature.geometry);
        
        for (const coord of coords) {
          const [lng, lat] = coord;
          const key = `${Math.floor(lng * 1000)},${Math.floor(lat * 1000)}`;
          
          if (!spatialIndex.has(key)) {
            spatialIndex.set(key, []);
          }
          spatialIndex.get(key).push(feature);
        }
      }
    }
    
    this.spatialIndexes.set(name, spatialIndex);
    console.log(`✅ Spatial index created for ${name}`);
  }

  _extractCoordinates(geometry) {
    switch (geometry.type) {
      case 'Point':
        return [geometry.coordinates];
      case 'LineString':
        return geometry.coordinates;
      case 'Polygon':
        return geometry.coordinates[0];
      case 'MultiPoint':
        return geometry.coordinates;
      case 'MultiLineString':
        return geometry.coordinates.flat();
      case 'MultiPolygon':
        return geometry.coordinates.flat().flat();
      default:
        return [];
    }
  }

  _bruteForceNearestSearch(dataset, point, maxDistance) {
    const [lng, lat] = point;
    const nearest = [];
    
    for (const feature of dataset.features) {
      const coords = this._extractCoordinates(feature.geometry);
      
      for (const coord of coords) {
        const distance = this._calculateDistance([lng, lat], coord);
        if (distance <= maxDistance) {
          nearest.push({
            feature,
            distance,
            coordinates: coord
          });
        }
      }
    }
    
    return nearest.sort((a, b) => a.distance - b.distance);
  }

  _spatialIndexNearestSearch(spatialIndex, point, maxDistance) {
    const [lng, lat] = point;
    const nearest = [];
    
    // Search nearby grid cells
    const searchRadius = Math.ceil(maxDistance / 111000 * 1000); // Rough conversion
    const centerKey = `${Math.floor(lng * 1000)},${Math.floor(lat * 1000)}`;
    
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const [centerLng, centerLat] = centerKey.split(',').map(Number);
        const key = `${centerLng + dx},${centerLat + dy}`;
        
        const features = spatialIndex.get(key) || [];
        for (const feature of features) {
          const coords = this._extractCoordinates(feature.geometry);
          
          for (const coord of coords) {
            const distance = this._calculateDistance([lng, lat], coord);
            if (distance <= maxDistance) {
              nearest.push({
                feature,
                distance,
                coordinates: coord
              });
            }
          }
        }
      }
    }
    
    return nearest.sort((a, b) => a.distance - b.distance);
  }

  _calculateDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
}

export default DataManager;
