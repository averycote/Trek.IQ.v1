/**
 * Overpass API Service
 * 
 * Integrates with the Overpass API to fetch rich OpenStreetMap accessibility data
 * Complements Wheelmap data with more comprehensive OSM information
 */

class OverpassApiService {
  constructor() {
    // Use a reliable Overpass API endpoint
    this.baseUrl = 'https://overpass-api.de/api/interpreter';
    this.timeout = 30000; // 30 second timeout for complex queries
    
    // OPTIMIZATION: Add caching for expensive Overpass queries
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes for OSM data
  }

  /**
   * Execute an Overpass QL query with caching
   * @param {string} query - Overpass QL query string
   * @returns {Promise<Object>} Query results
   */
  async executeQuery(query) {
    // OPTIMIZATION: Check cache first
    const cacheKey = this.generateCacheKey(query);
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('✅ Overpass API: Using cached data');
      return cached;
    }

    try {
      console.log('🔍 Overpass API: Executing query:', query.substring(0, 200) + '...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: query,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Overpass API: Query successful, received', data.elements?.length || 0, 'elements');
      
      // OPTIMIZATION: Cache the result
      this.setCachedData(cacheKey, data);
      
      return data;
    } catch (error) {
      console.error('❌ Overpass API: Query failed:', error);
      throw error;
    }
  }

  /**
   * Generate cache key for query
   * @param {string} query - Query string
   * @returns {string} Cache key
   */
  generateCacheKey(query) {
    // Simple hash of query for cache key
    return btoa(query.replace(/\s+/g, ' ').trim()).slice(0, 50);
  }

  /**
   * Get cached data if still valid
   * @param {string} key - Cache key
   * @returns {Object|null} Cached data or null
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // OPTIMIZATION: Limit cache size to prevent memory leaks
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Get comprehensive accessibility data for a bounding box
   * @param {Object} bounds - Bounding box {south, west, north, east}
   * @returns {Promise<Object>} Comprehensive accessibility data
   */
  async getAccessibilityData(bounds) {
    const { south, west, north, east } = bounds;
    
    const query = `
[out:json][timeout:25];
(
  // Wheelchair accessible buildings and amenities
  way["building"]["wheelchair"="yes"](${south},${west},${north},${east});
  relation["building"]["wheelchair"="yes"](${south},${west},${north},${east});
  
  // Public transport accessibility
  node["public_transport"="stop_position"]["wheelchair"="yes"](${south},${west},${north},${east});
  node["highway"="bus_stop"]["wheelchair"="yes"](${south},${west},${north},${east});
  way["railway"="platform"]["wheelchair"="yes"](${south},${west},${north},${east});
  
  // Accessible amenities
  node["amenity"]["wheelchair"="yes"](${south},${west},${north},${east});
  way["amenity"]["wheelchair"="yes"](${south},${west},${north},${east});
  
  // Pedestrian infrastructure
  way["highway"="footway"]["surface"](${south},${west},${north},${east});
  way["highway"="path"]["wheelchair"="yes"](${south},${west},${north},${east});
  node["barrier"="kerb"]["kerb"~"lowered|flush"](${south},${west},${north},${east});
  
  // Elevators and ramps
  node["highway"="elevator"](${south},${west},${north},${east});
  way["highway"="steps"]["ramp:wheelchair"="yes"](${south},${west},${north},${east});
  
  // Accessible parking
  node["amenity"="parking"]["wheelchair"="yes"](${south},${west},${north},${east});
  way["amenity"="parking"]["wheelchair"="yes"](${south},${west},${north},${east});
);
out geom;
`;

    try {
      const data = await this.executeQuery(query);
      return this.processAccessibilityData(data);
    } catch (error) {
      console.error('❌ Failed to fetch Overpass accessibility data:', error);
      return { elements: [], summary: { total: 0, categories: {} } };
    }
  }

  /**
   * Get detailed pedestrian infrastructure data
   * @param {Object} bounds - Bounding box
   * @returns {Promise<Object>} Pedestrian infrastructure data
   */
  async getPedestrianInfrastructure(bounds) {
    const { south, west, north, east } = bounds;
    
    const query = `
[out:json][timeout:25];
(
  // Sidewalks and footways with surface information
  way["highway"="footway"](${south},${west},${north},${east});
  way["highway"="path"]["foot"!="no"](${south},${west},${north},${east});
  
  // Curb cuts and tactile paving
  node["barrier"="kerb"](${south},${west},${north},${east});
  node["tactile_paving"="yes"](${south},${west},${north},${east});
  way["tactile_paving"="yes"](${south},${west},${north},${east});
  
  // Crossings
  node["highway"="crossing"](${south},${west},${north},${east});
  
  // Steps and ramps
  way["highway"="steps"](${south},${west},${north},${east});
  way["ramp"="yes"](${south},${west},${north},${east});
);
out geom;
`;

    try {
      const data = await this.executeQuery(query);
      return this.processPedestrianData(data);
    } catch (error) {
      console.error('❌ Failed to fetch pedestrian infrastructure data:', error);
      return { elements: [], summary: { total: 0, types: {} } };
    }
  }

  /**
   * Get accessible public transport information
   * @param {Object} bounds - Bounding box
   * @returns {Promise<Object>} Public transport accessibility data
   */
  async getPublicTransportAccessibility(bounds) {
    const { south, west, north, east } = bounds;
    
    const query = `
[out:json][timeout:25];
(
  // Bus stops with accessibility info
  node["highway"="bus_stop"](${south},${west},${north},${east});
  node["public_transport"="stop_position"](${south},${west},${north},${east});
  
  // Train/subway stations
  node["railway"="station"](${south},${west},${north},${east});
  way["railway"="platform"](${south},${west},${north},${east});
  
  // Elevators at transport hubs
  node["highway"="elevator"]["level"](${south},${west},${north},${east});
);
out geom;
`;

    try {
      const data = await this.executeQuery(query);
      return this.processTransportData(data);
    } catch (error) {
      console.error('❌ Failed to fetch public transport data:', error);
      return { elements: [], summary: { total: 0, accessible: 0 } };
    }
  }

  /**
   * Process raw Overpass accessibility data
   * @param {Object} data - Raw Overpass response
   * @returns {Object} Processed accessibility data
   */
  processAccessibilityData(data) {
    const elements = data.elements || [];
    const categories = {};
    let accessibleCount = 0;

    elements.forEach(element => {
      const tags = element.tags || {};
      
      // Categorize by amenity type or building type
      const category = tags.amenity || tags.building || tags.public_transport || 'other';
      
      if (!categories[category]) {
        categories[category] = { total: 0, accessible: 0, elements: [] };
      }
      
      categories[category].total++;
      categories[category].elements.push({
        id: element.id,
        type: element.type,
        lat: element.lat || (element.center && element.center.lat),
        lon: element.lon || (element.center && element.center.lon),
        tags: tags,
        wheelchair: tags.wheelchair,
        name: tags.name,
        amenity: tags.amenity,
        building: tags.building
      });

      if (tags.wheelchair === 'yes') {
        categories[category].accessible++;
        accessibleCount++;
      }
    });

    return {
      elements: elements,
      summary: {
        total: elements.length,
        accessible: accessibleCount,
        categories: categories
      }
    };
  }

  /**
   * Process pedestrian infrastructure data
   * @param {Object} data - Raw Overpass response
   * @returns {Object} Processed pedestrian data
   */
  processPedestrianData(data) {
    const elements = data.elements || [];
    const types = {};

    elements.forEach(element => {
      const tags = element.tags || {};
      const highway = tags.highway;
      const barrier = tags.barrier;
      
      let type = 'other';
      if (highway === 'footway') type = 'footway';
      else if (highway === 'path') type = 'path';
      else if (highway === 'crossing') type = 'crossing';
      else if (highway === 'steps') type = 'steps';
      else if (barrier === 'kerb') type = 'curb';
      else if (tags.tactile_paving) type = 'tactile_paving';

      if (!types[type]) {
        types[type] = [];
      }

      types[type].push({
        id: element.id,
        type: element.type,
        lat: element.lat || (element.center && element.center.lat),
        lon: element.lon || (element.center && element.center.lon),
        tags: tags,
        surface: tags.surface,
        wheelchair: tags.wheelchair,
        tactile_paving: tags.tactile_paving,
        kerb: tags.kerb
      });
    });

    return {
      elements: elements,
      summary: {
        total: elements.length,
        types: types
      }
    };
  }

  /**
   * Process public transport data
   * @param {Object} data - Raw Overpass response
   * @returns {Object} Processed transport data
   */
  processTransportData(data) {
    const elements = data.elements || [];
    let accessibleCount = 0;

    const processedElements = elements.map(element => {
      const tags = element.tags || {};
      const isAccessible = tags.wheelchair === 'yes';
      
      if (isAccessible) accessibleCount++;

      return {
        id: element.id,
        type: element.type,
        lat: element.lat || (element.center && element.center.lat),
        lon: element.lon || (element.center && element.center.lon),
        tags: tags,
        name: tags.name,
        wheelchair: tags.wheelchair,
        public_transport: tags.public_transport,
        highway: tags.highway,
        railway: tags.railway,
        operator: tags.operator,
        network: tags.network
      };
    });

    return {
      elements: processedElements,
      summary: {
        total: elements.length,
        accessible: accessibleCount,
        accessibility_percentage: elements.length > 0 ? Math.round((accessibleCount / elements.length) * 100) : 0
      }
    };
  }

  /**
   * Get route-specific accessibility analysis
   * @param {Array} routeCoordinates - Array of [lng, lat] coordinates
   * @param {number} bufferDistance - Buffer distance in meters (default: 100m)
   * @returns {Promise<Object>} Route accessibility analysis
   */
  async analyzeRouteAccessibility(routeCoordinates, bufferDistance = 100) {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      throw new Error('Invalid route coordinates provided');
    }

    // Create a simplified bounding box for the route
    const lats = routeCoordinates.map(coord => coord[1]);
    const lngs = routeCoordinates.map(coord => coord[0]);
    
    const bounds = {
      south: Math.min(...lats) - 0.001, // Add small buffer
      west: Math.min(...lngs) - 0.001,
      north: Math.max(...lats) + 0.001,
      east: Math.max(...lngs) + 0.001
    };

    try {
      const [accessibilityData, pedestrianData, transportData] = await Promise.all([
        this.getAccessibilityData(bounds),
        this.getPedestrianInfrastructure(bounds),
        this.getPublicTransportAccessibility(bounds)
      ]);

      return {
        route_analysis: {
          bounds: bounds,
          buffer_distance: bufferDistance,
          total_accessibility_points: accessibilityData.summary.total,
          accessible_points: accessibilityData.summary.accessible,
          pedestrian_infrastructure: pedestrianData.summary.total,
          transport_accessibility: transportData.summary.accessible
        },
        accessibility_data: accessibilityData,
        pedestrian_data: pedestrianData,
        transport_data: transportData,
        recommendations: this.generateRouteRecommendations(accessibilityData, pedestrianData, transportData)
      };
    } catch (error) {
      console.error('❌ Route accessibility analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate accessibility recommendations based on data
   * @param {Object} accessibilityData - Accessibility data
   * @param {Object} pedestrianData - Pedestrian infrastructure data
   * @param {Object} transportData - Transport data
   * @returns {Array} Array of recommendations
   */
  generateRouteRecommendations(accessibilityData, pedestrianData, transportData) {
    const recommendations = [];

    // Analyze accessibility score
    const accessibilityScore = accessibilityData.summary.total > 0 
      ? (accessibilityData.summary.accessible / accessibilityData.summary.total) * 100 
      : 0;

    if (accessibilityScore > 80) {
      recommendations.push({
        type: 'positive',
        icon: '✅',
        message: 'Excellent accessibility along this route with many wheelchair-accessible venues'
      });
    } else if (accessibilityScore > 50) {
      recommendations.push({
        type: 'warning',
        icon: '⚠️',
        message: 'Moderate accessibility - some venues may have limited access'
      });
    } else if (accessibilityData.summary.total > 0) {
      recommendations.push({
        type: 'alert',
        icon: '❌',
        message: 'Limited accessibility along this route - consider alternative paths'
      });
    }

    // Check pedestrian infrastructure
    if (pedestrianData.summary.types.tactile_paving?.length > 0) {
      recommendations.push({
        type: 'positive',
        icon: '🦯',
        message: 'Route includes tactile paving for visually impaired navigation'
      });
    }

    if (pedestrianData.summary.types.curb?.length > 0) {
      recommendations.push({
        type: 'info',
        icon: '🚶',
        message: 'Multiple curb cuts available for wheelchair users'
      });
    }

    // Check transport accessibility
    if (transportData.summary.accessible > 0) {
      recommendations.push({
        type: 'positive',
        icon: '🚌',
        message: `${transportData.summary.accessible} accessible public transport stops nearby`
      });
    }

    return recommendations;
  }
}

// Create and export a singleton instance
const overpassApiService = new OverpassApiService();
export default overpassApiService;
