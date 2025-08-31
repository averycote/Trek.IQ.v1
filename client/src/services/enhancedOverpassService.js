// Enhanced Overpass Service - Expanded OSM data integration for accessibility
// Expands current usage to include wheelchair=yes/no, kerb=*, surface=* for sidewalk quality

import { debugService } from './debugService';

class EnhancedOverpassService {
  constructor() {
    this.baseUrl = 'https://overpass-api.de/api/interpreter';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.rateLimit = {
      requests: 0,
      lastReset: Date.now(),
      maxRequests: 100 // Per hour
    };
    
    // Halifax area bounds
    this.halifaxBounds = {
      north: 44.8,
      south: 44.5,
      east: -63.4,
      west: -63.8
    };
    
    this.isInitialized = false;
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.isInitialized = true;
      console.log('EnhancedOverpassService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize EnhancedOverpassService:', error);
    }
  }

  // Check rate limiting
  checkRateLimit() {
    const now = Date.now();
    if (now - this.rateLimit.lastReset > 3600000) { // 1 hour
      this.rateLimit.requests = 0;
      this.rateLimit.lastReset = now;
    }
    
    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      throw new Error('Overpass API rate limit exceeded');
    }
    
    this.rateLimit.requests++;
  }

  // Fetch comprehensive accessibility data from OSM
  async fetchAccessibilityData(bounds = null, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      // eslint-disable-next-line no-unused-vars
      categories = ['all'] // 'all', 'bathrooms', 'entrances', 'sidewalks', 'crossings'
    } = options;

    // Use provided bounds or default to Halifax area
    const searchBounds = bounds || this.halifaxBounds;

    // Check cache first
    const cacheKey = `overpass_${JSON.stringify(searchBounds)}_${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Check rate limit
    this.checkRateLimit();

    try {
      // Build comprehensive Overpass query
      const query = this.buildAccessibilityQuery(searchBounds, options);
      
      debugService.log('EnhancedOverpassService API call', { url: this.baseUrl, method: 'POST', status: 'loading' });
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        const error = new Error(`Overpass API error: ${response.status} ${response.statusText}`);
        debugService.error('EnhancedOverpassService API call failed', { url: this.baseUrl, method: 'POST', error });
        throw error;
      }

      const data = await response.json();
      debugService.log('EnhancedOverpassService API call successful', { url: this.baseUrl, method: 'POST', data });
      
      // Process and enhance the data
      const enhancedData = this.processAccessibilityData(data, options);

      // Cache the result
      this.cache.set(cacheKey, {
        data: enhancedData,
        timestamp: Date.now()
      });

      return enhancedData;

    } catch (error) {
      console.error('Enhanced Overpass API error:', error);
      throw error;
    }
  }

  // Build comprehensive Overpass query for accessibility data
  buildAccessibilityQuery(bounds, options) {
    const { north, south, east, west } = bounds;
    const bbox = `${south},${west},${north},${east}`;
    
    let query = '[out:json][timeout:60];\n(\n';

    // Wheelchair accessibility features
    if (options.includeWheelchair) {
      query += `
        // Wheelchair accessible bathrooms
        node["amenity"="toilets"]["wheelchair"](${bbox});
        way["amenity"="toilets"]["wheelchair"](${bbox});
        
        // Wheelchair accessible entrances
        node["entrance"]["wheelchair"](${bbox});
        way["entrance"]["wheelchair"](${bbox});
        
        // Wheelchair accessible parking
        node["amenity"="parking"]["wheelchair"](${bbox});
        way["amenity"="parking"]["wheelchair"](${bbox});
        
        // Wheelchair accessible restaurants and cafes
        node["amenity"~"^(restaurant|cafe)$"]["wheelchair"](${bbox});
        way["amenity"~"^(restaurant|cafe)$"]["wheelchair"](${bbox});
        
        // Wheelchair accessible shops
        node["shop"]["wheelchair"](${bbox});
        way["shop"]["wheelchair"](${bbox});
        
        // Wheelchair accessible banks
        node["amenity"="bank"]["wheelchair"](${bbox});
        way["amenity"="bank"]["wheelchair"](${bbox});
        
        // Wheelchair accessible hospitals
        node["amenity"="hospital"]["wheelchair"](${bbox});
        way["amenity"="hospital"]["wheelchair"](${bbox});
      `;
    }

    // Surface quality data for sidewalks and paths
    if (options.includeSurfaceQuality) {
      query += `
        // Sidewalks with surface information
        way["highway"="footway"]["surface"](${bbox});
        way["highway"="path"]["surface"](${bbox});
        way["highway"="pedestrian"]["surface"](${bbox});
        
        // Roads with sidewalk surface information
        way["highway"~"^(primary|secondary|tertiary|residential)$"]["sidewalk:surface"](${bbox});
        
        // Paths with smoothness information
        way["highway"="footway"]["smoothness"](${bbox});
        way["highway"="path"]["smoothness"](${bbox});
      `;
    }

    // Kerb data for crossings
    if (options.includeKerbData) {
      query += `
        // Kerb information at crossings
        node["highway"="crossing"]["kerb"](${bbox});
        way["highway"="crossing"]["kerb"](${bbox});
        
        // Tactile paving at crossings
        node["highway"="crossing"]["tactile_paving"](${bbox});
        way["highway"="crossing"]["tactile_paving"](${bbox});
        
        // Traffic signals with accessibility features
        node["highway"="traffic_signals"]["wheelchair"](${bbox});
        way["highway"="traffic_signals"]["wheelchair"](${bbox});
      `;
    }

    // Sidewalk quality and accessibility
    if (options.includeSidewalkQuality) {
      query += `
        // Sidewalks with width information
        way["highway"="footway"]["width"](${bbox});
        way["highway"="pedestrian"]["width"](${bbox});
        
        // Sidewalks with incline information
        way["highway"="footway"]["incline"](${bbox});
        way["highway"="path"]["incline"](${bbox});
        
        // Steps and ramps
        way["highway"="steps"]["wheelchair"](${bbox});
        node["highway"="steps"]["wheelchair"](${bbox});
        
        // Elevators and lifts
        node["highway"="elevator"](${bbox});
        way["highway"="elevator"](${bbox});
      `;
    }

    query += '\n);\nout body;\n>;\nout skel qt;';

    return query;
  }

  // Process accessibility data from OSM
  processAccessibilityData(osmData, options) {
    const processed = {
      accessible_bathrooms: [],
      accessible_entrances: [],
      accessible_parking: [],
      accessible_restaurants: [],
      accessible_shops: [],
      accessible_banks: [],
      accessible_hospitals: [],
      sidewalks: [],
      crossings: [],
      traffic_signals: [],
      steps_and_ramps: [],
      elevators: [],
      surface_quality: {
        good: [],
        moderate: [],
        poor: []
      },
      wheelchair_accessible: {
        yes: [],
        limited: [],
        no: [],
        unknown: []
      }
    };

    if (!osmData.elements) {
      return processed;
    }

    osmData.elements.forEach(element => {
      if (element.tags) {
        const feature = this.createFeatureFromElement(element);
        if (feature) {
          this.categorizeFeature(feature, processed, options);
        }
      }
    });

    // Add summary statistics
    processed.summary = this.calculateSummary(processed);

    return processed;
  }

  // Create GeoJSON feature from OSM element
  createFeatureFromElement(element) {
    let coordinates = null;
    let geometryType = 'Point';

    if (element.type === 'node') {
      coordinates = [element.lon, element.lat];
    } else if (element.type === 'way' && element.geometry) {
      coordinates = element.geometry.map(point => [point.lon, point.lat]);
      geometryType = coordinates.length > 2 ? 'LineString' : 'Point';
    } else {
      return null;
    }

    return {
      type: 'Feature',
      geometry: {
        type: geometryType,
        coordinates: geometryType === 'Point' ? coordinates : coordinates
      },
      properties: {
        id: element.id,
        osm_type: element.type,
        tags: element.tags,
        name: element.tags.name || 'Unnamed Feature',
        wheelchair: element.tags.wheelchair || 'unknown',
        surface: element.tags.surface || element.tags['sidewalk:surface'] || 'unknown',
        smoothness: element.tags.smoothness || 'unknown',
        kerb: element.tags.kerb || 'unknown',
        tactile_paving: element.tags.tactile_paving || 'unknown',
        width: element.tags.width || 'unknown',
        incline: element.tags.incline || 'unknown',
        accessibility_score: this.calculateAccessibilityScore(element.tags)
      }
    };
  }

  // Categorize feature based on its properties
  categorizeFeature(feature, processed, options) {
    const tags = feature.properties.tags;
    const wheelchair = feature.properties.wheelchair;

    // Categorize by wheelchair accessibility
    if (processed.wheelchair_accessible[wheelchair]) {
      processed.wheelchair_accessible[wheelchair].push(feature);
    }

    // Categorize by feature type
    if (tags.amenity === 'toilets' && wheelchair) {
      processed.accessible_bathrooms.push(feature);
    } else if (tags.entrance && wheelchair) {
      processed.accessible_entrances.push(feature);
    } else if (tags.amenity === 'parking' && wheelchair) {
      processed.accessible_parking.push(feature);
    } else if (tags.amenity === 'restaurant' && wheelchair) {
      processed.accessible_restaurants.push(feature);
    } else if (tags.amenity === 'cafe' && wheelchair) {
      processed.accessible_restaurants.push(feature);
    } else if (tags.shop && wheelchair) {
      processed.accessible_shops.push(feature);
    } else if (tags.amenity === 'bank' && wheelchair) {
      processed.accessible_banks.push(feature);
    } else if (tags.amenity === 'hospital' && wheelchair) {
      processed.accessible_hospitals.push(feature);
    } else if (tags.highway === 'footway' || tags.highway === 'pedestrian') {
      processed.sidewalks.push(feature);
      this.categorizeSurfaceQuality(feature, processed);
    } else if (tags.highway === 'crossing') {
      processed.crossings.push(feature);
    } else if (tags.highway === 'traffic_signals') {
      processed.traffic_signals.push(feature);
    } else if (tags.highway === 'steps') {
      processed.steps_and_ramps.push(feature);
    } else if (tags.highway === 'elevator') {
      processed.elevators.push(feature);
    }
  }

  // Categorize surface quality
  categorizeSurfaceQuality(feature, processed) {
    const surface = feature.properties.surface;
    const smoothness = feature.properties.smoothness;

    let quality = 'unknown';
    
    if (surface === 'asphalt' || surface === 'concrete' || smoothness === 'excellent') {
      quality = 'good';
    } else if (surface === 'paved' || surface === 'cobblestone' || smoothness === 'good') {
      quality = 'moderate';
    } else if (surface === 'unpaved' || surface === 'gravel' || smoothness === 'bad') {
      quality = 'poor';
    }

    if (processed.surface_quality[quality]) {
      processed.surface_quality[quality].push(feature);
    }
  }

  // Calculate accessibility score for a feature
  calculateAccessibilityScore(tags) {
    let score = 50; // Base score

    // Wheelchair accessibility
    switch (tags.wheelchair) {
      case 'yes': score += 30; break;
      case 'limited': score += 15; break;
      case 'no': score -= 20; break;
      default: score += 0; break;
    }

    // Surface quality
    switch (tags.surface) {
      case 'asphalt':
      case 'concrete': score += 15; break;
      case 'paved': score += 10; break;
      case 'cobblestone': score += 5; break;
      case 'unpaved':
      case 'gravel': score -= 10; break;
      default: score += 0; break;
    }

    // Smoothness
    switch (tags.smoothness) {
      case 'excellent': score += 10; break;
      case 'good': score += 5; break;
      case 'bad': score -= 10; break;
      default: score += 0; break;
    }

    // Kerb information
    if (tags.kerb === 'lowered') score += 10;
    if (tags.tactile_paving === 'yes') score += 5;

    return Math.max(0, Math.min(100, score));
  }

  // Calculate summary statistics
  calculateSummary(processed) {
    return {
      total_features: Object.values(processed).filter(Array.isArray).reduce((sum, arr) => sum + arr.length, 0),
      wheelchair_accessible: {
        yes: processed.wheelchair_accessible.yes.length,
        limited: processed.wheelchair_accessible.limited.length,
        no: processed.wheelchair_accessible.no.length,
        unknown: processed.wheelchair_accessible.unknown.length
      },
      surface_quality: {
        good: processed.surface_quality.good.length,
        moderate: processed.surface_quality.moderate.length,
        poor: processed.surface_quality.poor.length
      },
      by_category: {
        bathrooms: processed.accessible_bathrooms.length,
        entrances: processed.accessible_entrances.length,
        parking: processed.accessible_parking.length,
        restaurants: processed.accessible_restaurants.length,
        shops: processed.accessible_shops.length,
        banks: processed.accessible_banks.length,
        hospitals: processed.accessible_hospitals.length,
        sidewalks: processed.sidewalks.length,
        crossings: processed.crossings.length,
        traffic_signals: processed.traffic_signals.length,
        steps_and_ramps: processed.steps_and_ramps.length,
        elevators: processed.elevators.length
      }
    };
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key: key.substring(0, 50) + '...',
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('EnhancedOverpassService cache cleared');
  }
}

export default EnhancedOverpassService;
