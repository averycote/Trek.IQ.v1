// Consolidated Mapbox Routing Service - Single, reliable routing solution for Trek.IQ MVP
// Replaces all 8 routing services with one working Mapbox-based implementation

class ConsolidatedMapboxRoutingService {
  constructor() {
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
    this.geocodingUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
    
    // Simple caching
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 200ms between requests
    this.maxConcurrentRequests = 3;
    this.activeRequests = 0;
    
    this.isInitialized = true; // Always ready
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

  // Main routing method - matches the signature expected by the app
  async calculateRoute(routeData) {
    try {
      const { origin, destination, mode = 'walking', accessibilitySettings = {} } = routeData;
      
      console.log('ConsolidatedMapboxRoutingService: Calculating route:', { origin, destination, mode });
      
      // Validate inputs
      if (!origin || !destination) {
        throw new Error('Origin and destination are required');
      }
      
      // Geocode addresses to coordinates if needed
      const originCoords = await this.geocodeLocation(origin);
      const destCoords = await this.geocodeLocation(destination);
      
      // Calculate route using Mapbox Directions API
      const route = await this.calculateMapboxRoute(originCoords, destCoords, mode, accessibilitySettings);
      
      // Add turn-by-turn directions
      const routeWithDirections = await this.addTurnByTurnDirections(route, mode);
      
      console.log('ConsolidatedMapboxRoutingService: Route calculated successfully');
      return routeWithDirections;
      
    } catch (error) {
      console.error('ConsolidatedMapboxRoutingService: Route calculation failed:', error);
      throw error;
    }
  }

  // Geocode location (address string or coordinates)
  async geocodeLocation(location) {
    // If already coordinates, return as-is
    if (Array.isArray(location) && location.length === 2) {
      return location;
    }
    
    // If string, geocode it
    if (typeof location === 'string') {
      return await this.geocodeAddress(location);
    }
    
    throw new Error('Invalid location format');
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      console.log('Geocoding address:', address);
      
      // Check cache first
      const cacheKey = `geocode_${address}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.coords;
        }
      }
      
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        country: 'ca',
        bbox: '-63.8,44.5,-63.4,44.8', // Halifax area bounding box
        types: 'address,poi,place',
        limit: '5'
      });

      const response = await this.executeRequest(() => 
        fetch(`${this.geocodingUrl}/${encodeURIComponent(address)}.json?${params}`)
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
        const coords = [lng, lat];
        
        // Cache the result
        this.cache.set(cacheKey, {
          coords: coords,
          timestamp: Date.now()
        });
        
        console.log('Selected coordinates:', coords, 'for address:', bestMatch.place_name);
        return coords;
      } else {
        throw new Error(`No coordinates found for address: ${address}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      throw error;
    }
  }

  // Calculate route using Mapbox Directions API
  async calculateMapboxRoute(origin, destination, profile = 'walking', options = {}) {
    try {
      const [originLng, originLat] = origin;
      const [destLng, destLat] = destination;

      // Check cache first
      const cacheKey = `route_${originLng},${originLat}_${destLng},${destLat}_${profile}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.route;
        }
      }

      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        alternatives: 'false',
        annotations: 'distance,duration',
        continue_straight: 'true',
        geometries: 'geojson',
        language: 'en',
        overview: 'full',
        steps: 'true',
        voice_instructions: 'false',
        voice_units: 'metric'
      });

      const coordinates = `${originLng},${originLat};${destLng},${destLat}`;
      const url = `${this.baseUrl}/${profile}/${coordinates}?${params}`;
      
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = this.formatRoute(data, profile);
          
          // Cache the result
          this.cache.set(cacheKey, {
            route: route,
            timestamp: Date.now()
          });
          
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

  // Format route response to match expected structure
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
            uuid: data.uuid,
            // Add accessibility metadata
            accessibility: {
              score: this.calculateAccessibilityScore(route, profile),
              grade: this.getAccessibilityGrade(route, profile),
              issues: this.identifyAccessibilityIssues(route, profile)
            }
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

  // Add turn-by-turn directions
  async addTurnByTurnDirections(route, mode) {
    try {
      const routeFeature = route.features[0];
      const legs = routeFeature.properties.legs || [];
      
      const directions = [];
      
      legs.forEach((leg, legIndex) => {
        if (leg.steps) {
          leg.steps.forEach((step, stepIndex) => {
            const instruction = this.formatStepInstruction(step, mode);
            if (instruction) {
              directions.push({
                ...instruction,
                legIndex,
                stepIndex,
                totalSteps: leg.steps.length
              });
            }
          });
        }
      });
      
      // Add directions to route properties
      routeFeature.properties.directions = directions;
      routeFeature.properties.steps = directions; // For compatibility
      
      return route;
    } catch (error) {
      console.error('Error adding turn-by-turn directions:', error);
      return route; // Return route without directions if this fails
    }
  }

  // Format step instruction
  formatStepInstruction(step, mode) {
    if (!step.maneuver || !step.maneuver.instruction) {
      return null;
    }
    
    return {
      instruction: step.maneuver.instruction,
      distance: step.distance,
      duration: step.duration,
      coordinates: step.maneuver.location,
      bearing: step.maneuver.bearing_after,
      type: step.maneuver.type,
      modifier: step.maneuver.modifier,
      mode: mode
    };
  }

  // Calculate basic accessibility score
  calculateAccessibilityScore(route, mode) {
    let score = 100;
    
    // Basic scoring based on route characteristics
    if (mode === 'walking') {
      // Walking routes generally have good accessibility
      score = 85;
    } else if (mode === 'driving') {
      // Driving routes have excellent accessibility
      score = 95;
    } else if (mode === 'cycling') {
      // Cycling routes may have accessibility issues
      score = 70;
    }
    
    // Adjust based on distance (longer routes may have more issues)
    const distance = route.distance || 0;
    if (distance > 2000) { // > 2km
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Get accessibility grade
  getAccessibilityGrade(route, mode) {
    const score = this.calculateAccessibilityScore(route, mode);
    
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  // Identify accessibility issues
  identifyAccessibilityIssues(route, mode) {
    const issues = [];
    
    if (mode === 'walking') {
      issues.push('Route may contain steps or uneven surfaces');
    }
    
    if (mode === 'cycling') {
      issues.push('Route may not be suitable for wheelchairs');
    }
    
    return issues;
  }

  // Calculate walking route
  async calculateWalkingRoute(origin, destination, options = {}) {
    return this.calculateMapboxRoute(origin, destination, 'walking', options);
  }

  // Calculate driving route
  async calculateDrivingRoute(origin, destination, options = {}) {
    return this.calculateMapboxRoute(origin, destination, 'driving', options);
  }

  // Calculate cycling route
  async calculateCyclingRoute(origin, destination, options = {}) {
    return this.calculateMapboxRoute(origin, destination, 'cycling', options);
  }

  // Get route with accessibility considerations
  async calculateAccessibleRoute(origin, destination, accessibilityOptions = {}) {
    const {
      avoidSteps = true,
      avoidSteepSlopes = true,
      preferWellLit = true,
      wheelchairAccessible = false
    } = accessibilityOptions;

    // For now, use walking route with basic options
    const route = await this.calculateWalkingRoute(origin, destination);
    
    // Add accessibility metadata
    route.features[0].properties.accessibility = {
      avoidSteps,
      avoidSteepSlopes,
      preferWellLit,
      wheelchairAccessible,
      score: this.calculateAccessibilityScore(route.features[0], 'walking'),
      issues: this.identifyAccessibilityIssues(route.features[0], 'walking')
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

  // Get supported profiles
  getSupportedProfiles() {
    return ['walking', 'driving', 'cycling'];
  }

  // Initialize method (for compatibility)
  async initialize() {
    console.log('ConsolidatedMapboxRoutingService: Already initialized');
    return Promise.resolve();
  }

  // Calculate intelligent route (for compatibility with existing code)
  async calculateIntelligentRoute(origin, destination, options = {}) {
    return this.calculateRoute({
      origin,
      destination,
      mode: options.mode || 'walking',
      accessibilitySettings: options
    });
  }
}

// Create singleton instance
const consolidatedMapboxRoutingService = new ConsolidatedMapboxRoutingService();
export default consolidatedMapboxRoutingService;
