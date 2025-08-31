// Mapbox Routing Service - Direct integration with Mapbox Directions API
class MapboxRoutingService {
  constructor() {
    this.accessToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
    this.cache = new Map();
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 200ms between requests
    this.maxConcurrentRequests = 3;
    this.activeRequests = 0;
  }

  // Rate limiting helper
  async throttleRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  // Queue management for concurrent requests
  async executeRequest(requestFn) {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise(resolve => {
        this.requestQueue.push(resolve);
      });
    }
    
    this.activeRequests++;
    
    try {
      await this.throttleRequest();
      const result = await requestFn();
      return result;
    } finally {
      this.activeRequests--;
      
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        nextRequest();
      }
    }
  }

  // Calculate route using Mapbox Directions API
  async calculateRoute(origin, destination, profile = 'walking', options = {}) {
    const {
      alternatives = false,
      annotations = 'distance,duration',
      continue_straight = true,
      exclude = null,
      geometries = 'geojson',
      language = 'en',
      overview = 'full',
      radiuses = null,
      steps = true,
      voice_instructions = false,
      voice_units = 'metric',
      waypoints = null
    } = options;

    // Validate coordinates
    if (!origin || !destination) {
      throw new Error('Origin and destination coordinates are required');
    }

    const [originLng, originLat] = origin;
    const [destLng, destLat] = destination;

    // Check cache first
    const cacheKey = `${originLng},${originLat}_${destLng},${destLat}_${profile}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        access_token: this.accessToken,
        alternatives: alternatives.toString(),
        annotations: annotations,
        continue_straight: continue_straight.toString(),
        geometries: geometries,
        language: language,
        overview: overview,
        steps: steps.toString(),
        voice_instructions: voice_instructions.toString(),
        voice_units: voice_units
      });

      if (exclude) {
        params.append('exclude', exclude);
      }

      if (radiuses) {
        params.append('radiuses', radiuses);
      }

      if (waypoints) {
        params.append('waypoints', waypoints);
      }

      const coordinates = `${originLng},${originLat};${destLng},${destLat}`;
      const url = `${this.baseUrl}/${profile}/${coordinates}?${params}`;
      
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = this.formatRoute(data, profile);
          
          // Cache the result
          this.cache.set(cacheKey, route);
          
          return route;
        } else {
          throw new Error('No route found');
        }
      } else if (response.status === 429) {
        console.warn('Mapbox rate limit exceeded, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        throw new Error('Rate limit exceeded');
      } else {
        console.error('Mapbox routing failed:', response.status, response.statusText);
        throw new Error(`Routing failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Mapbox routing error:', error);
      throw error;
    }
  }

  // Format route response
  formatRoute(data, profile) {
    const route = data.routes[0];
    const leg = route.legs[0];
    
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            mode: profile,
            distance: route.distance, // meters
            duration: route.duration, // seconds
            summary: leg.summary,
            weight: route.weight,
            weight_name: route.weight_name,
            waypoints: data.waypoints,
            legs: route.legs,
            geometry: route.geometry,
            voiceLocale: data.voiceLocale,
            routes: data.routes,
            code: data.code,
            uuid: data.uuid
          },
          geometry: route.geometry
        }
      ],
      metadata: {
        profile: profile,
        distance: route.distance,
        duration: route.duration,
        waypoints: data.waypoints.length
      }
    };
  }

  // Calculate walking route
  async calculateWalkingRoute(origin, destination, options = {}) {
    return this.calculateRoute(origin, destination, 'walking', {
      ...options,
      alternatives: false,
      continue_straight: true
    });
  }

  // Calculate driving route
  async calculateDrivingRoute(origin, destination, options = {}) {
    return this.calculateRoute(origin, destination, 'driving', {
      ...options,
      alternatives: false,
      continue_straight: true
    });
  }

  // Calculate cycling route
  async calculateCyclingRoute(origin, destination, options = {}) {
    return this.calculateRoute(origin, destination, 'cycling', {
      ...options,
      alternatives: false,
      continue_straight: true
    });
  }

  // Calculate transit route (requires additional setup)
  async calculateTransitRoute(origin, destination, options = {}) {
    // Note: Transit routing requires additional Mapbox services
    // For now, we'll use walking as a fallback
    console.warn('Transit routing not fully implemented, using walking route');
    return this.calculateWalkingRoute(origin, destination, options);
  }

  // Get route alternatives
  async getRouteAlternatives(origin, destination, profile = 'driving', options = {}) {
    return this.calculateRoute(origin, destination, profile, {
      ...options,
      alternatives: true
    });
  }

  // Optimize route for accessibility
  async calculateAccessibleRoute(origin, destination, accessibilityOptions = {}) {
    const {
      avoidSteps = true,
      avoidSteepSlopes = true,
      preferWellLit = true,
      wheelchairAccessible = false
    } = accessibilityOptions;

    // For now, use walking route with basic options
    // In a full implementation, this would integrate with accessibility data
    const route = await this.calculateWalkingRoute(origin, destination);
    
    // Add accessibility metadata
    route.metadata.accessibility = {
      avoidSteps,
      avoidSteepSlopes,
      preferWellLit,
      wheelchairAccessible,
      score: 85, // Placeholder accessibility score
      issues: [] // Would be populated with actual issues
    };

    return route;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Get route - handles both coordinates and addresses
  async getRoute(routeData) {
    const { origin, destination, mode = 'walking', accessibilitySettings = {} } = routeData;
    
    try {
      // If origin and destination are addresses, we need to geocode them first
      let originCoords, destCoords;
      
      if (typeof origin === 'string') {
        // Geocode origin address
        originCoords = await this.geocodeAddress(origin);
      } else if (Array.isArray(origin)) {
        originCoords = origin;
      } else {
        throw new Error('Invalid origin format');
      }
      
      if (typeof destination === 'string') {
        // Geocode destination address
        destCoords = await this.geocodeAddress(destination);
      } else if (Array.isArray(destination)) {
        destCoords = destination;
      } else {
        throw new Error('Invalid destination format');
      }
      
      // Calculate route based on mode
      let route;
      switch (mode) {
        case 'walking':
          route = await this.calculateWalkingRoute(originCoords, destCoords);
          break;
        case 'driving':
          route = await this.calculateDrivingRoute(originCoords, destCoords);
          break;
        case 'cycling':
          route = await this.calculateCyclingRoute(originCoords, destCoords);
          break;
        case 'transit':
          route = await this.calculateTransitRoute(originCoords, destCoords);
          break;
        default:
          route = await this.calculateWalkingRoute(originCoords, destCoords);
      }
      
      // Add accessibility settings if provided
      if (Object.keys(accessibilitySettings).length > 0) {
        route = await this.calculateAccessibleRoute(originCoords, destCoords, accessibilitySettings);
      }
      
      return route;
    } catch (error) {
      console.error('Error getting route:', error);
      throw error;
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      console.log('Geocoding address:', address);
      
      // First try with more specific parameters for Halifax area
      const params = new URLSearchParams({
        access_token: this.accessToken,
        country: 'ca',
        bbox: '-63.8,44.5,-63.4,44.8', // Halifax area bounding box
        types: 'address,poi,place',
        limit: '5'
      });

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Geocoding results:', data.features);
      
      if (data.features && data.features.length > 0) {
        // Find the best match - prefer addresses over POIs
        const bestMatch = data.features.find(feature => 
          feature.place_type.includes('address')
        ) || data.features[0];
        
        const [lng, lat] = bestMatch.center;
        console.log('Selected coordinates:', [lng, lat], 'for address:', bestMatch.place_name);
        return [lng, lat];
      } else {
        throw new Error(`No coordinates found for address: ${address}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  // Get supported profiles
  getSupportedProfiles() {
    return ['walking', 'driving', 'cycling'];
  }
}

// Create singleton instance
const mapboxRoutingService = new MapboxRoutingService();
export default mapboxRoutingService;
