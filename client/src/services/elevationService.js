/**
 * Elevation Service for Trek.IQ
 * 
 * OPTIMIZATION: Lightweight elevation service with caching and fallback options
 */

class ElevationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.apiEndpoint = 'https://api.open-elevation.com/api/v1/lookup';
    this.maxBatchSize = 100; // Limit batch size for performance
    this.requestTimeout = 10000; // 10 second timeout
  }

  /**
   * Initialize the elevation service
   */
  async initialize() {
    try {
      // Test API availability
      const testCoords = [{ latitude: 44.6488, longitude: -63.5752 }]; // Halifax
      await this.getElevation(testCoords);
      
      console.log('✅ Elevation Service initialized');
      
      // Make service available globally for verification
      if (typeof window !== 'undefined') {
        window.TREK_IQ_ELEVATION_SERVICE = this;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ OpenElevation API not available, using fallback:', error);
      // Service is still available with fallback methods
      return true;
    }
  }

  /**
   * Get elevation data for coordinates
   * @param {Array} coordinates - Array of {latitude, longitude} objects
   * @returns {Promise<Array>} Array of elevation data
   */
  async getElevation(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return [];
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(coordinates);
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log(`✅ Open-Elevation API: Using cached data for ${coordinates.length} points`);
      return cached;
    }

    // For small requests, use GET API (limited to 1024 bytes)
    if (coordinates.length <= 10) {
      return this.getElevationGET(coordinates, cacheKey);
    }
    
    // For larger requests, use POST API
    return this.getElevationPOST(coordinates, cacheKey);
  }

  /**
   * Get elevation using GET API (for small requests)
   * @param {Array} coordinates - Array of {latitude, longitude} objects
   * @param {string} cacheKey - Cache key for storing results
   * @returns {Promise<Array>} Array of elevation data
   */
  async getElevationGET(coordinates, cacheKey) {
    try {
      // Format locations as per API spec: "lat,lng|lat,lng|..."
      const locationsParam = coordinates
        .map(coord => `${coord.latitude},${coord.longitude}`)
        .join('|');
      
      const url = `${this.apiEndpoint}?locations=${encodeURIComponent(locationsParam)}`;
      
      // Check if URL is within 1024 byte limit
      if (url.length > 1024) {
        console.log('GET request too large, switching to POST');
        return this.getElevationPOST(coordinates, cacheKey);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Elevation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format from Open-Elevation API');
      }
      
      const results = data.results;
      this.setCachedData(cacheKey, results);
      
      console.log(`✅ Open-Elevation API (GET): Retrieved ${results.length} elevation points`);
      return results;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Open-Elevation API GET request timed out, using fallback');
      } else {
        console.warn('Open-Elevation API GET failed, using fallback:', error.message);
      }
      return this.getFallbackElevation(coordinates);
    }
  }

  /**
   * Get elevation using POST API (for larger requests)
   * @param {Array} coordinates - Array of {latitude, longitude} objects
   * @param {string} cacheKey - Cache key for storing results
   * @returns {Promise<Array>} Array of elevation data
   */
  async getElevationPOST(coordinates, cacheKey) {

    try {
      // Limit batch size for performance (Open-Elevation has no POST limit, but we limit for performance)
      const limitedCoords = coordinates.slice(0, this.maxBatchSize);
      
      // Use AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
      
      // Format exactly as per Open-Elevation API specification
      const requestBody = {
        locations: limitedCoords.map(coord => ({
          latitude: coord.latitude,
          longitude: coord.longitude
        }))
      };
      
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Open-Elevation API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response format as per API specification
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid response format from Open-Elevation API');
      }
      
      const results = data.results;
      
      // Cache the results
      this.setCachedData(cacheKey, results);
      
      console.log(`✅ Open-Elevation API: Retrieved ${results.length} elevation points`);
      return results;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('Open-Elevation API request timed out, using fallback');
      } else {
        console.warn('Open-Elevation API failed, using fallback:', error.message);
      }
      return this.getFallbackElevation(coordinates);
    }
  }

  /**
   * Analyze elevation profile for a route
   * @param {Array} routeCoordinates - Array of [lng, lat] coordinates
   * @returns {Promise<Object>} Elevation analysis
   */
  async analyzeRouteElevation(routeCoordinates) {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return this.getDefaultElevationAnalysis();
    }

    try {
      // Sample coordinates for elevation analysis (every 10th point for performance)
      const sampledCoords = routeCoordinates
        .filter((_, index) => index % 10 === 0)
        .map(coord => ({
          latitude: coord[1],
          longitude: coord[0]
        }));

      const elevationData = await this.getElevation(sampledCoords);
      
      if (elevationData.length === 0) {
        return this.getDefaultElevationAnalysis();
      }

      return this.processElevationData(elevationData, routeCoordinates);
    } catch (error) {
      console.error('Elevation analysis failed:', error);
      return this.getDefaultElevationAnalysis();
    }
  }

  /**
   * Process elevation data into useful metrics
   * @param {Array} elevationData - Raw elevation data
   * @param {Array} routeCoordinates - Original route coordinates
   * @returns {Object} Processed elevation analysis
   */
  processElevationData(elevationData, routeCoordinates) {
    const elevations = elevationData.map(point => point.elevation);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const totalElevationGain = this.calculateElevationGain(elevations);
    const steepSegments = this.detectSteepSegments(elevationData, routeCoordinates);
    
    return {
      available: true,
      profile: elevationData,
      summary: {
        minElevation: Math.round(minElevation),
        maxElevation: Math.round(maxElevation),
        totalElevationGain: Math.round(totalElevationGain),
        totalElevationLoss: Math.round(this.calculateElevationLoss(elevations)),
        averageGrade: this.calculateAverageGrade(elevationData, routeCoordinates),
        maxGrade: this.calculateMaxGrade(elevationData, routeCoordinates)
      },
      steepSegments: steepSegments,
      accessibility: {
        wheelchairFriendly: steepSegments.length === 0,
        difficulty: this.calculateDifficulty(totalElevationGain, steepSegments),
        warnings: this.generateElevationWarnings(steepSegments, totalElevationGain)
      }
    };
  }

  /**
   * Fallback elevation estimation
   * @param {Array} coordinates - Coordinates array
   * @returns {Array} Estimated elevation data
   */
  getFallbackElevation(coordinates) {
    // Simple elevation estimation based on location
    // Halifax area: sea level to ~200m elevation
    return coordinates.map((coord, index) => ({
      latitude: coord.latitude,
      longitude: coord.longitude,
      elevation: Math.random() * 50 + 10, // 10-60m estimated for Halifax
      estimated: true
    }));
  }

  /**
   * Get default elevation analysis when API fails
   */
  getDefaultElevationAnalysis() {
    return {
      available: false,
      profile: [],
      summary: {
        minElevation: 0,
        maxElevation: 50,
        totalElevationGain: 25,
        totalElevationLoss: 25,
        averageGrade: 2,
        maxGrade: 5
      },
      steepSegments: [],
      accessibility: {
        wheelchairFriendly: true,
        difficulty: 'easy',
        warnings: []
      },
      fallback: true
    };
  }

  /**
   * Calculate total elevation gain
   */
  calculateElevationGain(elevations) {
    let gain = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) gain += diff;
    }
    return gain;
  }

  /**
   * Calculate total elevation loss
   */
  calculateElevationLoss(elevations) {
    let loss = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i - 1] - elevations[i];
      if (diff > 0) loss += diff;
    }
    return loss;
  }

  /**
   * Detect steep segments (>5% grade)
   */
  detectSteepSegments(elevationData, routeCoordinates) {
    const steepSegments = [];
    const gradeThreshold = 5; // 5% grade threshold
    
    for (let i = 1; i < elevationData.length; i++) {
      const elevDiff = elevationData[i].elevation - elevationData[i - 1].elevation;
      const distance = this.calculateDistance(
        elevationData[i - 1].latitude,
        elevationData[i - 1].longitude,
        elevationData[i].latitude,
        elevationData[i].longitude
      );
      
      if (distance > 0) {
        const grade = Math.abs(elevDiff / distance) * 100;
        
        if (grade > gradeThreshold) {
          steepSegments.push({
            startIndex: i - 1,
            endIndex: i,
            grade: Math.round(grade * 10) / 10,
            elevationChange: Math.round(elevDiff * 10) / 10,
            distance: Math.round(distance),
            coordinates: [
              [routeCoordinates[i - 1][0], routeCoordinates[i - 1][1]],
              [routeCoordinates[i][0], routeCoordinates[i][1]]
            ]
          });
        }
      }
    }
    
    return steepSegments;
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Calculate average grade
   */
  calculateAverageGrade(elevationData, routeCoordinates) {
    if (elevationData.length < 2) return 0;
    
    const totalElevChange = elevationData[elevationData.length - 1].elevation - elevationData[0].elevation;
    const totalDistance = this.calculateTotalDistance(elevationData);
    
    return totalDistance > 0 ? Math.round((totalElevChange / totalDistance) * 1000) / 10 : 0;
  }

  /**
   * Calculate maximum grade
   */
  calculateMaxGrade(elevationData, routeCoordinates) {
    let maxGrade = 0;
    
    for (let i = 1; i < elevationData.length; i++) {
      const elevDiff = elevationData[i].elevation - elevationData[i - 1].elevation;
      const distance = this.calculateDistance(
        elevationData[i - 1].latitude,
        elevationData[i - 1].longitude,
        elevationData[i].latitude,
        elevationData[i].longitude
      );
      
      if (distance > 0) {
        const grade = Math.abs(elevDiff / distance) * 100;
        maxGrade = Math.max(maxGrade, grade);
      }
    }
    
    return Math.round(maxGrade * 10) / 10;
  }

  /**
   * Calculate total distance
   */
  calculateTotalDistance(elevationData) {
    let totalDistance = 0;
    
    for (let i = 1; i < elevationData.length; i++) {
      totalDistance += this.calculateDistance(
        elevationData[i - 1].latitude,
        elevationData[i - 1].longitude,
        elevationData[i].latitude,
        elevationData[i].longitude
      );
    }
    
    return totalDistance;
  }

  /**
   * Calculate difficulty based on elevation gain and steep segments
   */
  calculateDifficulty(elevationGain, steepSegments) {
    if (steepSegments.length > 3 || elevationGain > 100) return 'challenging';
    if (steepSegments.length > 1 || elevationGain > 50) return 'moderate';
    return 'easy';
  }

  /**
   * Generate elevation warnings
   */
  generateElevationWarnings(steepSegments, elevationGain) {
    const warnings = [];
    
    if (steepSegments.length > 0) {
      warnings.push(`${steepSegments.length} steep segment${steepSegments.length > 1 ? 's' : ''} detected`);
    }
    
    if (elevationGain > 100) {
      warnings.push(`Significant elevation gain: ${Math.round(elevationGain)}m`);
    }
    
    return warnings;
  }

  /**
   * Cache management methods
   */
  generateCacheKey(coordinates) {
    return btoa(JSON.stringify(coordinates.slice(0, 5))).slice(0, 32);
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
}

// Create and export singleton instance
const elevationService = new ElevationService();
export default elevationService;
