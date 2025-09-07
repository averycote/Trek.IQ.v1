/**
 * Local Accessibility Data Service
 * 
 * Provides fast access to locally cached accessibility data from the 150k Wheelmap dataset.
 * This service works with data downloaded by scripts/downloadAccessibilityData.js
 */

const fs = require('fs');
const path = require('path');

class LocalAccessibilityService {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data', 'accessibility');
    this.cache = new Map();
    this.indexes = null;
    this.optimizedData = null;
    this.initialized = false;
  }

  /**
   * Initialize the service by loading cached data and indexes
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Local Accessibility Service...');
      
      // Load indexes for fast lookups
      await this.loadIndexes();
      
      // Load optimized data structure
      await this.loadOptimizedData();
      
      this.initialized = true;
      console.log('✅ Local Accessibility Service initialized');
      console.log(`📊 Loaded ${Object.keys(this.optimizedData?.places || {}).length} accessibility records`);
      
    } catch (error) {
      console.warn('⚠️ Local Accessibility Service initialization failed:', error.message);
      console.warn('💡 Run "npm run download:accessibility" to download data');
      this.initialized = false;
    }
  }

  /**
   * Load indexes for fast category and accessibility lookups
   */
  async loadIndexes() {
    const indexFile = path.join(this.dataDir, 'indexes.json');
    
    if (fs.existsSync(indexFile)) {
      const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
      this.indexes = indexData;
      console.log('📂 Loaded accessibility indexes');
    } else {
      throw new Error('Index file not found');
    }
  }

  /**
   * Load optimized data structure
   */
  async loadOptimizedData() {
    const optimizedFile = path.join(this.dataDir, 'wheelmap-optimized.json');
    
    if (fs.existsSync(optimizedFile)) {
      const data = JSON.parse(fs.readFileSync(optimizedFile, 'utf8'));
      this.optimizedData = data;
      console.log('📊 Loaded optimized accessibility data');
    } else {
      throw new Error('Optimized data file not found');
    }
  }

  /**
   * Check if service is ready to use
   */
  isReady() {
    return this.initialized && this.optimizedData && this.indexes;
  }

  /**
   * Get places within a bounding box
   * @param {Array} bbox - [minLon, minLat, maxLon, maxLat]
   * @param {Object} options - Query options
   * @returns {Array} Array of places within the bounding box
   */
  getPlacesInBounds(bbox, options = {}) {
    if (!this.isReady()) {
      return [];
    }

    const [minLon, minLat, maxLon, maxLat] = bbox;
    const results = [];
    const limit = options.limit || 500;
    const wheelchair = options.wheelchair;
    const category = options.category;

    // Filter places by bounding box and criteria
    Object.values(this.optimizedData.places).forEach(place => {
      const [lon, lat] = place.coordinates;
      
      // Check if within bounds
      if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
        
        // Apply wheelchair filter if specified
        if (wheelchair && place.wheelchair !== wheelchair) {
          return;
        }
        
        // Apply category filter if specified
        if (category && place.category !== category) {
          return;
        }
        
        results.push(place);
      }
    });

    // Limit results and return
    return results.slice(0, limit);
  }

  /**
   * Get places by category
   * @param {string} category - Category name
   * @param {Object} options - Query options
   * @returns {Array} Places in the specified category
   */
  getPlacesByCategory(category, options = {}) {
    if (!this.isReady()) {
      return [];
    }

    const placeIds = this.optimizedData.categories[category] || [];
    const limit = options.limit || 100;
    
    return placeIds
      .slice(0, limit)
      .map(id => this.optimizedData.places[id])
      .filter(place => place);
  }

  /**
   * Get places by accessibility status
   * @param {string} wheelchair - Wheelchair accessibility (yes, limited, no, unknown)
   * @param {Object} options - Query options
   * @returns {Array} Places with specified accessibility status
   */
  getPlacesByAccessibility(wheelchair, options = {}) {
    if (!this.isReady()) {
      return [];
    }

    const placeIds = this.optimizedData.accessibility[wheelchair] || [];
    const limit = options.limit || 100;
    
    return placeIds
      .slice(0, limit)
      .map(id => this.optimizedData.places[id])
      .filter(place => place);
  }

  /**
   * Get accessibility statistics
   * @returns {Object} Statistics about the dataset
   */
  getStatistics() {
    if (!this.isReady()) {
      return null;
    }

    return {
      totalPlaces: Object.keys(this.optimizedData.places).length,
      categories: this.indexes.categories,
      accessibility: this.indexes.accessibility,
      bounds: this.optimizedData.spatial?.bounds,
      lastUpdated: this.optimizedData.metadata?.downloadDate
    };
  }

  /**
   * Search places by name or category
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Matching places
   */
  searchPlaces(query, options = {}) {
    if (!this.isReady() || !query) {
      return [];
    }

    const limit = options.limit || 50;
    const results = [];
    const searchTerm = query.toLowerCase();

    Object.values(this.optimizedData.places).forEach(place => {
      const name = (place.name || '').toLowerCase();
      const category = (place.category || '').toLowerCase();
      
      if (name.includes(searchTerm) || category.includes(searchTerm)) {
        results.push({
          ...place,
          relevance: this.calculateRelevance(place, searchTerm)
        });
      }
    });

    // Sort by relevance and return limited results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  /**
   * Calculate search relevance score
   * @param {Object} place - Place object
   * @param {string} searchTerm - Search term
   * @returns {number} Relevance score
   */
  calculateRelevance(place, searchTerm) {
    const name = (place.name || '').toLowerCase();
    const category = (place.category || '').toLowerCase();
    
    let score = 0;
    
    // Exact name match gets highest score
    if (name === searchTerm) score += 100;
    else if (name.startsWith(searchTerm)) score += 50;
    else if (name.includes(searchTerm)) score += 25;
    
    // Category matches get lower scores
    if (category === searchTerm) score += 20;
    else if (category.includes(searchTerm)) score += 10;
    
    // Accessible places get slight boost
    if (place.wheelchair === 'yes') score += 5;
    
    return score;
  }

  /**
   * Get nearby places to a coordinate
   * @param {Array} coordinates - [longitude, latitude]
   * @param {number} radius - Search radius in meters
   * @param {Object} options - Search options
   * @returns {Array} Nearby places with distance
   */
  getNearbyPlaces(coordinates, radius = 1000, options = {}) {
    if (!this.isReady()) {
      return [];
    }

    const [targetLon, targetLat] = coordinates;
    const limit = options.limit || 20;
    const results = [];

    Object.values(this.optimizedData.places).forEach(place => {
      const [placeLon, placeLat] = place.coordinates;
      const distance = this.calculateDistance(targetLat, targetLon, placeLat, placeLon);
      
      if (distance <= radius) {
        results.push({
          ...place,
          distance: Math.round(distance)
        });
      }
    });

    // Sort by distance and return limited results
    return results
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lon1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lon2 - Longitude 2
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = LocalAccessibilityService;



