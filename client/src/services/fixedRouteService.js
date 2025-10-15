/**
 * Fixed Route Service
 * 
 * Provides reliable route calculation with proper error handling
 * and consistent data structure output
 */

import accessibleParkingService from './accessibleParkingService';

class FixedRouteService {
  constructor() {
    this.isInitialized = false;
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes (increased for better performance)
    this.maxCacheSize = 1000; // Limit cache size
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
    
    // Initialize accessible parking service
    try {
      await accessibleParkingService.initialize();
      console.log('✅ Accessible parking service initialized');
    } catch (error) {
      console.warn('⚠️ Accessible parking service initialization failed:', error);
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

      // Ensure proper data structure - FIXED: Await async method
      const normalizedRoute = await this.normalizeRouteData(routeData, originCoords, destCoords, options);

      // Enrich with accessible parking for driving routes
      const enrichedRoute = await this.enrichWithAccessibleParking(normalizedRoute, options);

      // Cache result
      this.cacheRoute(cacheKey, enrichedRoute);

      console.log('✅ Route calculated successfully with accessibility data');
      return enrichedRoute;

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
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${this.mapboxToken}&country=CA&proximity=-63.5752,44.6488&bbox=-63.8,44.5,-63.4,44.8&limit=1`
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Address not found');
      }

      const coordinates = data.features[0].center; // [lng, lat]
      
      // Validate coordinates are within Halifax bounds
      const halifaxBounds = {
        west: -63.8,
        east: -63.4,
        south: 44.5,
        north: 44.8
      };
      
      const [lng, lat] = coordinates;
      if (lng < halifaxBounds.west || lng > halifaxBounds.east ||
          lat < halifaxBounds.south || lat > halifaxBounds.north) {
        console.warn('⚠️ FixedRouteService: Geocoded coordinates are outside Halifax bounds:', coordinates);
        throw new Error('Address is outside Halifax area');
      }
      
      return coordinates;
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
   * Normalize route data to consistent structure - FIXED: Async to support real data
   */
  async normalizeRouteData(mapboxData, origin, destination, options) {
    const route = mapboxData.routes[0];
    const leg = route.legs[0];

    // Calculate accessibility score with real data
    const accessibilityResult = await this.calculateAccessibilityScore(route, options);

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
          accessibility: {
            score: accessibilityResult.score,
            confidence: accessibilityResult.confidence,
            barriers: accessibilityResult.barriers,
            verified: accessibilityResult.confidence > 70
          },
          warnings: this.generateWarnings(route, options),
          recommendations: this.generateRecommendations(route, options),
          source: 'mapbox_with_halifax_data',
          timestamp: new Date().toISOString()
        }
      }],
      metadata: {
        origin: origin,
        destination: destination,
        options: options,
        calculated_at: new Date().toISOString(),
        dataConfidence: accessibilityResult.confidence
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
   * Calculate accessibility score - ENHANCED: Use real data when available
   */
  async calculateAccessibilityScore(route, options) {
    let score = 100; // Start with perfect score
    let confidence = 50; // Lower confidence for fallback service
    const barriers = [];

    try {
      // Try to get real steps data from Halifax
      const stepsResponse = await fetch('/api/accessibility-data/steps');
      if (stepsResponse.ok) {
        const stepsResult = await stepsResponse.json();
        const stepsData = stepsResult.data || stepsResult;
        
        // Check if route goes near any steps
        const routeCoords = route.geometry?.coordinates || [];
        let stepsNearRoute = 0;
        
        if (stepsData?.features) {
          for (const step of stepsData.features) {
            const stepCoords = step.geometry.coordinates;
            for (const routeCoord of routeCoords) {
              const distance = this.calculateSimpleDistance(routeCoord, stepCoords);
              if (distance < 30) { // Within 30 meters
                stepsNearRoute++;
                if (options.avoidSteps || options.wheelchairAccessible) {
                  barriers.push({
                    type: 'steps',
                    verified: true,
                    description: `Steps detected near route`
                  });
                  score -= 20;
                }
                break;
              }
            }
          }
          confidence = 80; // Higher confidence with real data
        }
      }
    } catch (error) {
      console.warn('Could not load steps data for scoring:', error);
      // Fall back to estimates
    if (options.avoidSteps) {
        score -= 10; // Estimate
        confidence = 30;
      }
    }

    // Reduce score for steep slopes (still estimated, could be enhanced with elevation API)
    if (options.avoidSteepSlopes) {
      score -= 5; // Estimate
    }

    // Store barriers for later use
    this._lastCalculatedBarriers = barriers;
    this._lastConfidence = confidence;

    return {
      score: Math.max(0, Math.min(100, score)),
      confidence: confidence,
      barriers: barriers
    };
  }

  /**
   * Generate accessibility warnings - ENHANCED: Real data warnings
   */
  generateWarnings(route, options) {
    const warnings = [];

    // Add verified barriers as warnings
    if (this._lastCalculatedBarriers && this._lastCalculatedBarriers.length > 0) {
      for (const barrier of this._lastCalculatedBarriers) {
        warnings.push({
          type: barrier.type,
          description: barrier.description,
          verified: barrier.verified
        });
      }
    } else {
      // Fallback to generic warnings when no real data
    if (options.avoidSteps) {
        warnings.push({
          type: 'steps',
          description: 'Route may contain steps - verify accessibility',
          verified: false
        });
    }

    if (options.avoidSteepSlopes) {
        warnings.push({
          type: 'slope',
          description: 'Route may contain steep slopes - verify accessibility',
          verified: false
        });
      }
    }

    if (route.distance > 1000) {
      warnings.push({
        type: 'distance',
        description: 'Long route - consider breaks for accessibility needs',
        verified: true
      });
    }

    // Add confidence indicator
    if (this._lastConfidence && this._lastConfidence < 70) {
      warnings.push({
        type: 'data_quality',
        description: `Route accessibility based on estimates (${this._lastConfidence}% confidence)`,
        verified: false
      });
    }

    return warnings;
  }

  /**
   * Calculate simple distance between two coordinates (faster than turf)
   */
  calculateSimpleDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
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
   * Enrich route with accessible parking for driving routes
   */
  async enrichWithAccessibleParking(route, options) {
    try {
      // Only enrich driving routes
      const mode = options.profile || 'walking';
      if (mode !== 'driving' && mode !== 'driving-traffic') {
        return route;
      }

      console.log('🅿️ Enriching driving route with accessible parking...');
      const enrichedRoute = await accessibleParkingService.enrichRoute(route, 'driving');
      
      return enrichedRoute;
    } catch (error) {
      console.error('❌ Error enriching route with parking:', error);
      return route; // Return original route if enrichment fails
    }
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
   * Cache route with size management
   */
  cacheRoute(key, data) {
    // Clean up old cache entries if cache is getting too large
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
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
