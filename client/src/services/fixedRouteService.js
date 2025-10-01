/**
 * Fixed Route Service
 * 
 * Provides reliable route calculation with proper error handling
 * and consistent data structure output
 */

class FixedRouteService {
  constructor() {
    this.isInitialized = false;
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Fixed Route Service...');
    
    // Verify Mapbox token
    if (!this.mapboxToken) {
      throw new Error('Mapbox token not configured');
    }
    
    this.isInitialized = true;
    console.log('✅ Fixed Route Service initialized');
  }

  /**
   * Calculate route with guaranteed proper data structure
   */
  async calculateRoute(origin, destination, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🛣️ Calculating route:', { origin, destination, options });

      // Validate inputs
      if (!origin || !destination) {
        throw new Error('Origin and destination are required');
      }

      // Check cache
      const cacheKey = this.generateCacheKey(origin, destination, options);
      const cached = this.getCachedRoute(cacheKey);
      if (cached) {
        console.log('📋 Route served from cache');
        return cached;
      }

      // Normalize coordinates
      const originCoords = await this.normalizeCoordinates(origin);
      const destCoords = await this.normalizeCoordinates(destination);

      console.log('📍 Coordinates:', { origin: originCoords, destination: destCoords });

      // Calculate route using Mapbox
      const routeData = await this.calculateMapboxRoute(originCoords, destCoords, options);

      // Ensure proper data structure
      const normalizedRoute = this.normalizeRouteData(routeData, originCoords, destCoords, options);

      // Cache result
      this.cacheRoute(cacheKey, normalizedRoute);

      console.log('✅ Route calculated successfully');
      return normalizedRoute;

    } catch (error) {
      console.error('❌ Route calculation failed:', error);
      
      // Return fallback route
      return this.createFallbackRoute(origin, destination, options);
    }
  }

  /**
   * Normalize coordinates (handle both arrays and objects)
   */
  async normalizeCoordinates(location) {
    if (Array.isArray(location)) {
      return location;
    }

    if (typeof location === 'object' && location.lng && location.lat) {
      return [location.lng, location.lat];
    }

    if (typeof location === 'string') {
      // Geocode address
      return await this.geocodeAddress(location);
    }

    throw new Error(`Invalid location format: ${location}`);
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address) {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.mapboxToken}&limit=1`
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Address not found');
      }

      return data.features[0].center; // [lng, lat]
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Failed to geocode address: ${address}`);
    }
  }

  /**
   * Calculate route using Mapbox Directions API
   */
  async calculateMapboxRoute(origin, destination, options = {}) {
    const profile = options.profile || 'walking';
    const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${this.mapboxToken}&geometries=geojson&overview=full&steps=true`;

    console.log('🌐 Calling Mapbox Directions API:', url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No routes found');
    }

    return data;
  }

  /**
   * Normalize route data to consistent structure
   */
  normalizeRouteData(mapboxData, origin, destination, options) {
    const route = mapboxData.routes[0];
    const leg = route.legs[0];

    // Create proper GeoJSON structure
    const routeData = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route.geometry.coordinates
        },
        properties: {
          distance: Math.round(route.distance), // meters
          duration: Math.round(route.duration), // seconds
          mode: options.profile || 'walking',
          accessibility: this.calculateAccessibilityScore(route, options),
          warnings: this.generateWarnings(route, options),
          recommendations: this.generateRecommendations(route, options),
          source: 'mapbox',
          timestamp: new Date().toISOString()
        }
      }],
      metadata: {
        origin: origin,
        destination: destination,
        options: options,
        calculated_at: new Date().toISOString()
      }
    };

    // Add turn-by-turn directions if available
    if (route.legs && route.legs[0] && route.legs[0].steps) {
      routeData.directions = this.generateDirections(route.legs[0].steps);
    }

    return routeData;
  }

  /**
   * Generate turn-by-turn directions
   */
  generateDirections(steps) {
    return steps.map((step, index) => ({
      step: index + 1,
      instruction: step.maneuver.instruction,
      distance: Math.round(step.distance),
      duration: Math.round(step.duration),
      coordinates: step.maneuver.location,
      bearing: step.maneuver.bearing_after || 0
    }));
  }

  /**
   * Calculate accessibility score
   */
  calculateAccessibilityScore(route, options) {
    let score = 100; // Start with perfect score

    // Reduce score for steps if user wants to avoid them
    if (options.avoidSteps) {
      // This is a simplified calculation - in reality you'd analyze the route
      score -= 10; // Assume some steps might be present
    }

    // Reduce score for steep slopes
    if (options.avoidSteepSlopes) {
      score -= 5; // Assume some slopes might be present
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate accessibility warnings
   */
  generateWarnings(route, options) {
    const warnings = [];

    if (options.avoidSteps) {
      warnings.push('Route may contain steps - verify accessibility');
    }

    if (options.avoidSteepSlopes) {
      warnings.push('Route may contain steep slopes - verify accessibility');
    }

    if (route.distance > 1000) {
      warnings.push('Long route - consider breaks for accessibility needs');
    }

    return warnings;
  }

  /**
   * Generate accessibility recommendations
   */
  generateRecommendations(route, options) {
    const recommendations = [];

    if (options.wheelchairAccessible) {
      recommendations.push('Verify wheelchair accessibility along entire route');
    }

    if (options.visualImpairment) {
      recommendations.push('Ensure route has good lighting and clear paths');
    }

    if (options.hearingImpairment) {
      recommendations.push('Be aware of audio signals at intersections');
    }

    return recommendations;
  }

  /**
   * Create fallback route when main calculation fails
   */
  createFallbackRoute(origin, destination, options) {
    console.log('🔄 Creating fallback route');

    // Create a simple straight-line route
    const originCoords = Array.isArray(origin) ? origin : [origin.lng, origin.lat];
    const destCoords = Array.isArray(destination) ? destination : [destination.lng, destination.lat];

    const distance = this.calculateDistance(originCoords, destCoords);
    const duration = Math.round(distance / 1.4); // ~1.4 m/s walking speed

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [originCoords, destCoords]
        },
        properties: {
          distance: distance,
          duration: duration,
          mode: options.profile || 'walking',
          accessibility: 50, // Lower score for fallback
          warnings: ['This is a fallback route - verify accessibility'],
          recommendations: ['Check actual route accessibility before traveling'],
          source: 'fallback',
          timestamp: new Date().toISOString()
        }
      }],
      metadata: {
        origin: originCoords,
        destination: destCoords,
        options: options,
        calculated_at: new Date().toISOString(),
        fallback: true
      }
    };
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance);
  }

  /**
   * Generate cache key
   */
  generateCacheKey(origin, destination, options) {
    const originStr = Array.isArray(origin) ? origin.join(',') : JSON.stringify(origin);
    const destStr = Array.isArray(destination) ? destination.join(',') : JSON.stringify(destination);
    const optionsStr = JSON.stringify(options);
    return `${originStr}|${destStr}|${optionsStr}`;
  }

  /**
   * Get cached route
   */
  getCachedRoute(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Cache route
   */
  cacheRoute(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });

    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }
}

// Create singleton instance
const fixedRouteService = new FixedRouteService();

export default fixedRouteService;
