// OpenRouteService - Integration with OpenRouteService API for walking and wheelchair routing
// https://openrouteservice.org/dev/#/api-docs

import mapillaryService from './mapillaryService';
import { debugService } from './debugService';

class OpenRouteService {
  constructor() {
    this.baseUrl = 'https://api.openrouteservice.org/v2/directions';
    this.apiKey = process.env.REACT_APP_OPENROUTE_API_KEY || '5b3ce3597851110001cf6248d426d4d70da34b9c834b10a70918f114';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.rateLimit = {
      requests: 0,
      lastReset: Date.now(),
      maxRequests: 100 // Per hour
    };
    
    // Halifax Active Travelways data for route optimization
    this.activeTravelways = [];
    this.stepsData = [];
    this.isInitialized = false;
  }

  // Initialize the service and load Halifax datasets
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await this.loadHalifaxDatasets();
      this.isInitialized = true;
      console.log('OpenRouteService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenRouteService:', error);
    }
  }

  // Load Halifax Active Travelways and Steps datasets
  async loadHalifaxDatasets() {
    try {
      // Load Active Travelways for route optimization
      const travelwaysUrl = '/api/data/Active_Travelways.geojson';
      console.log(`Loading Active Travelways from: ${travelwaysUrl}`);
      
      const travelwaysResponse = await fetch(travelwaysUrl);
      if (travelwaysResponse.ok) {
        const travelwaysData = await travelwaysResponse.json();
        this.activeTravelways = travelwaysData.features || [];
        console.log(`Loaded ${this.activeTravelways.length} Active Travelways features`);
      } else {
        console.warn(`Failed to load Active Travelways: HTTP ${travelwaysResponse.status} - ${travelwaysResponse.statusText}`);
        const errorText = await travelwaysResponse.text();
        console.warn(`Error details: ${errorText}`);
      }

      // Load Steps data to avoid in routing
      const stepsUrl = '/api/data/Steps_577353981712784942.geojson';
      console.log(`Loading Steps data from: ${stepsUrl}`);
      
      const stepsResponse = await fetch(stepsUrl);
      if (stepsResponse.ok) {
        const stepsData = await stepsResponse.json();
        this.stepsData = stepsData.features || [];
        console.log(`Loaded ${this.stepsData.length} Steps features to avoid`);
      } else {
        console.warn(`Failed to load Steps data: HTTP ${stepsResponse.status} - ${stepsResponse.statusText}`);
        const errorText = await stepsResponse.text();
        console.warn(`Error details: ${errorText}`);
      }
    } catch (error) {
      debugService.error('OpenRouteService Halifax Datasets', error);
      console.error('Error loading Halifax datasets:', error);
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
      throw new Error('OpenRouteService rate limit exceeded');
    }
    
    this.rateLimit.requests++;
  }

  // Calculate route using OpenRouteService
  async calculateRoute(origin, destination, profile = 'foot-walking', options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const {
      wheelchair = false,
      avoidSteps = true,
      preferAccessible = true
    } = options;

    console.log('OpenRouteService: Starting route calculation:', { origin, destination, profile, options });

    // Check cache first
    const cacheKey = `${origin}|${destination}|${profile}|${wheelchair}|${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('OpenRouteService: Returning cached route');
      return cached.data;
    }

    // Check rate limit
    this.checkRateLimit();

    try {
      // Determine profile based on accessibility requirements
      let routingProfile = profile;
      if (wheelchair) {
        routingProfile = 'wheelchair';
      } else if (profile === 'foot-walking') {
        routingProfile = 'foot-walking';
      }

      console.log('OpenRouteService: Using routing profile:', routingProfile);

      // Prepare coordinates
      const originCoords = Array.isArray(origin) ? origin : await this.geocode(origin);
      const destCoords = Array.isArray(destination) ? destination : await this.geocode(destination);

      console.log('OpenRouteService: Origin coordinates:', originCoords);
      console.log('OpenRouteService: Destination coordinates:', destCoords);

      if (!originCoords || !destCoords) {
        throw new Error('Could not geocode origin or destination');
      }

      // Build request body with accessibility preferences
      const requestBody = {
        coordinates: [
          [originCoords[0], originCoords[1]],
          [destCoords[0], destCoords[1]]
        ],
        profile: routingProfile,
        format: 'geojson',
        instructions: true,
        elevation: true,
        extra_info: ['steepness', 'surface', 'waytype'],
        options: {
          avoid_features: avoidSteps ? ['steps'] : [],
          profile_params: {
            restrictions: {
              wheelchair: wheelchair,
              surface_type: preferAccessible ? 'asphalt' : undefined,
              smoothness_type: preferAccessible ? 'good' : undefined
            }
          }
        }
      };

      console.log('OpenRouteService: Request body:', JSON.stringify(requestBody, null, 2));

      // Add custom preferences for Halifax data
      if (avoidSteps && this.stepsData.length > 0) {
        requestBody.options.avoid_polygons = this.getStepsAvoidancePolygons();
      }

      // Make API request
      const apiUrl = `${this.baseUrl}/${routingProfile}/geojson`;
      console.log('OpenRouteService: Making API request to:', apiUrl);
      debugService.log('OpenRouteService API call', { url: apiUrl, method: 'POST', status: 'loading' });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('OpenRouteService: API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouteService: API error response:', errorText);
        const error = new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
        debugService.error('OpenRouteService API call failed', { url: apiUrl, method: 'POST', error });
        throw error;
      }

      const data = await response.json();
      console.log('OpenRouteService: API response data:', data);
      debugService.log('OpenRouteService API call successful', { url: apiUrl, method: 'POST', data });

      // Extract distance and duration from API response and add to route properties
      if (data.features && data.features[0]) {
        const routeFeature = data.features[0];
        const summary = data.features[0].properties?.summary;

        if (summary) {
          console.log('OpenRouteService: API summary data:', summary);

          // Add distance and duration to route properties
          routeFeature.properties.distance = summary.distance || 0; // in meters
          routeFeature.properties.duration = summary.duration || 0; // in seconds

          console.log('OpenRouteService: Added distance:', routeFeature.properties.distance, 'm');
          console.log('OpenRouteService: Added duration:', routeFeature.properties.duration, 's');
        } else {
          console.warn('OpenRouteService: No summary data found in API response');
          // Fallback: calculate approximate distance and duration
          const coordinates = routeFeature.geometry?.coordinates || [];
          if (coordinates.length >= 2) {
            let totalDistance = 0;
            for (let i = 0; i < coordinates.length - 1; i++) {
              totalDistance += this.calculateDistance(coordinates[i], coordinates[i + 1]);
            }

            routeFeature.properties.distance = totalDistance;
            routeFeature.properties.duration = totalDistance / 1000 * 20 * 60; // Assume 20 min per km walking

            console.log('OpenRouteService: Calculated fallback distance:', totalDistance, 'm');
            console.log('OpenRouteService: Calculated fallback duration:', routeFeature.properties.duration, 's');
          }
        }
      }

      // Process and enhance route with Halifax data
      const enhancedRoute = await this.enhanceRouteWithHalifaxData(data, options);

      // Cache the result
      this.cache.set(cacheKey, {
        data: enhancedRoute,
        timestamp: Date.now()
      });

      console.log('OpenRouteService: Route calculation completed successfully');
      return enhancedRoute;

    } catch (error) {
      console.error('OpenRouteService routing error:', error);
      throw error;
    }
  }

  // Enhance route with Halifax-specific accessibility data and Mapillary analysis
  async enhanceRouteWithHalifaxData(routeData, options) {
    const { wheelchair = false, avoidSteps = true, includeMapillary = true } = options;

    if (!routeData.features || routeData.features.length === 0) {
      return routeData;
    }

    const route = routeData.features[0];
    const coordinates = route.geometry.coordinates;

    // Add accessibility analysis to route properties
    route.properties.accessibility = {
      wheelchair_friendly: wheelchair,
      avoids_steps: avoidSteps,
      steep_segments: [],
      surface_quality: [],
      accessibility_score: 100
    };

    // Analyze each segment for accessibility
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segment = {
        start: coordinates[i],
        end: coordinates[i + 1],
        index: i
      };

      // Check for steep segments
      if (route.properties.segments && route.properties.segments[i]) {
        const steepness = route.properties.segments[i].steepness;
        if (steepness > 5) { // 5% incline threshold
          segment.steepness = steepness;
          route.properties.accessibility.steep_segments.push(segment);
          route.properties.accessibility.accessibility_score -= 10;
        }
      }

      // Check surface quality
      if (route.properties.segments && route.properties.segments[i]) {
        const surface = route.properties.segments[i].surface;
        if (surface && surface !== 'asphalt' && surface !== 'concrete') {
          segment.surface = surface;
          route.properties.accessibility.surface_quality.push(segment);
          route.properties.accessibility.accessibility_score -= 5;
        }
      }

      // Check proximity to Halifax Active Travelways
      const nearTravelway = this.findNearestActiveTravelway(segment.start);
      if (nearTravelway) {
        segment.near_travelway = nearTravelway;
      }
    }

    // Add Mapillary analysis if enabled
    if (includeMapillary) {
      try {
        const mapillaryAnalysis = await mapillaryService.analyzeRouteAccessibility(coordinates);
        route.properties.mapillary = mapillaryAnalysis;
        
        // Add Mapillary-based warnings
        if (mapillaryAnalysis.warnings.length > 0) {
          route.properties.warnings.push(...mapillaryAnalysis.warnings);
        }
        
        // Adjust accessibility score based on Mapillary data
        if (mapillaryAnalysis.accessibilityScore < 100) {
          route.properties.accessibility.accessibility_score = Math.max(
            0,
            route.properties.accessibility.accessibility_score - (100 - mapillaryAnalysis.accessibilityScore)
          );
        }
        
        console.log('✅ Mapillary analysis completed for route');
      } catch (error) {
        console.warn('⚠️ Mapillary analysis failed:', error.message);
        route.properties.mapillary = {
          error: error.message,
          accessibilityScore: 100
        };
      }
    }

    // Add warnings for accessibility issues
    route.properties.warnings = [];
    if (route.properties.accessibility.steep_segments.length > 0) {
      route.properties.warnings.push({
        type: 'steep_segments',
        message: `${route.properties.accessibility.steep_segments.length} steep segments detected`,
        severity: 'moderate'
      });
    }

    if (route.properties.accessibility.surface_quality.length > 0) {
      route.properties.warnings.push({
        type: 'poor_surface',
        message: `${route.properties.accessibility.surface_quality.length} segments with poor surface quality`,
        severity: 'low'
      });
    }

    return routeData;
  }

  // Find nearest Active Travelway to a coordinate
  findNearestActiveTravelway(coordinate) {
    if (!this.activeTravelways.length) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const travelway of this.activeTravelways) {
      if (travelway.geometry && travelway.geometry.coordinates) {
        const distance = this.calculateDistance(coordinate, travelway.geometry.coordinates[0]);
        if (distance < minDistance && distance < 50) { // Within 50 meters
          minDistance = distance;
          nearest = travelway;
        }
      }
    }

    return nearest;
  }

  // Calculate distance between two coordinates
  calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1[1] * Math.PI / 180;
    const φ2 = coord2[1] * Math.PI / 180;
    const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Get polygons to avoid steps
  getStepsAvoidancePolygons() {
    if (!this.stepsData.length) return [];

    return this.stepsData.map(step => {
      const coords = step.geometry.coordinates;
      return {
        type: 'Polygon',
        coordinates: [[
          [coords[0] - 0.0001, coords[1] - 0.0001],
          [coords[0] + 0.0001, coords[1] - 0.0001],
          [coords[0] + 0.0001, coords[1] + 0.0001],
          [coords[0] - 0.0001, coords[1] + 0.0001],
          [coords[0] - 0.0001, coords[1] - 0.0001]
        ]]
      };
    });
  }

  // Geocode address to coordinates
  async geocode(address) {
    try {
      console.log('OpenRouteService: Geocoding address:', address);
      
      const response = await fetch(`/api/geocoding?q=${encodeURIComponent(address)}&limit=1`);
      console.log('OpenRouteService: Geocoding response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('OpenRouteService: Geocoding response data:', data);
        
        if (data.length > 0) {
          const coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
          console.log('OpenRouteService: Resolved coordinates:', coords);
          return coords;
        } else {
          console.warn('OpenRouteService: No geocoding results found for:', address);
        }
      } else {
        console.error('OpenRouteService: Geocoding request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('OpenRouteService: Geocoding error:', error);
    }
    return null;
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
    console.log('OpenRouteService cache cleared');
  }
}

export default OpenRouteService;
