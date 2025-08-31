// Unified Routing Service - Intelligent routing with AI analysis and accessibility features
import enhancedAIService from './enhancedAIService.js';
import enhancedSearchService from './enhancedSearchService.js';
import OpenRouteService from './openRouteService.js';
import OpenElevationService from './openElevationService.js';
import WheelmapService from './wheelmapService.js';
import EnhancedOverpassService from './enhancedOverpassService.js';

class UnifiedRoutingService {
  constructor() {
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.cache = new Map();
    this.routeCache = new Map();
    this.isInitialized = false;
    
    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 200ms between requests
    this.maxConcurrentRequests = 3;
    this.activeRequests = 0;
    
    // Datasets for accessibility analysis
    this.datasets = {};
    this.accessibilityFeatures = new Map();
    this.spatialIndex = new Map();
    
    // Initialize new API services
    this.openRouteService = new OpenRouteService();
    this.openElevationService = new OpenElevationService();
    this.wheelmapService = new WheelmapService();
    this.enhancedOverpassService = new EnhancedOverpassService();
  }

  // Initialize the routing service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing unified routing service...');
      
      // Initialize dependencies
      await enhancedSearchService.initialize();
      await enhancedAIService.initialize();
      
      // Initialize new API services
      await this.openRouteService.initialize();
      await this.openElevationService.initialize();
      await this.wheelmapService.initialize();
      await this.enhancedOverpassService.initialize();
      
      // Load accessibility datasets
      await this.loadAccessibilityDatasets();
      this.buildSpatialIndex();
      
      this.isInitialized = true;
      console.log('Unified routing service initialized successfully');
    } catch (error) {
      console.error('Error initializing routing service:', error);
    }
  }

  // Load accessibility datasets
  async loadAccessibilityDatasets() {
    const datasets = [
      { name: 'active_travelways', url: '/api/data/Active_Travelways.geojson' },
      { name: 'accessible_parking', url: '/api/data/Accessible_Parking.geojson' },
      { name: 'steps', url: '/api/data/Steps_577353981712784942.geojson' },
      { name: 'sidewalk_closures', url: '/api/data/Sidewalk Closures.geojson' },
      { name: 'traffic_control', url: '/api/data/Traffic_Control.geojson' },
      { name: 'transit_stops', url: '/api/data/Bus_Stops_2_9086297843420881686.geojson' },
      { name: 'transit_routes', url: '/api/data/Transit_Bus_Routes.geojson' },
      { name: 'street_lights', url: '/api/data/Street_Lights_-8646609400635809433.geojson' },
      { name: 'public_washrooms', url: '/api/data/HRM_Public_Washrooms_8937353538278970153.geojson' }
    ];

    const loadPromises = datasets.map(async (dataset) => {
      try {
        const response = await fetch(dataset.url);
        if (response.ok) {
          const data = await response.json();
          this.datasets[dataset.name] = data;
          console.log(`Loaded ${dataset.name}: ${data.features?.length || 0} features`);
        }
      } catch (error) {
        console.warn(`Failed to load ${dataset.name}:`, error);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  // Build spatial index for fast accessibility lookups
  buildSpatialIndex() {
    try {
      Object.entries(this.datasets).forEach(([datasetName, data]) => {
        if (data.features) {
          this.spatialIndex.set(datasetName, new Map());
          
          data.features.forEach(feature => {
            const coords = feature.geometry?.coordinates;
            if (coords) {
              const key = `${Math.round(coords[0] * 1000) / 1000},${Math.round(coords[1] * 1000) / 1000}`;
              if (!this.spatialIndex.get(datasetName).has(key)) {
                this.spatialIndex.get(datasetName).set(key, []);
              }
              this.spatialIndex.get(datasetName).get(key).push(feature);
            }
          });
        }
      });
      
      console.log('Spatial index built successfully');
    } catch (error) {
      console.error('Error building spatial index:', error);
    }
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

  // Main route calculation method
  async calculateRoute(routeData) {
    const { origin, destination, mode = 'walking', accessibilitySettings = {} } = routeData;
    
    try {
      // Validate inputs
      if (!origin || !destination) {
        throw new Error('Origin and destination are required');
      }

      // Check cache first
      const cacheKey = `${origin}|${destination}|${mode}|${JSON.stringify(accessibilitySettings)}`;
      if (this.routeCache.has(cacheKey)) {
        return this.routeCache.get(cacheKey);
      }

      // Geocode addresses if needed
      const originCoords = await this.geocodeLocation(origin);
      const destCoords = await this.geocodeLocation(destination);

      if (!originCoords || !destCoords) {
        throw new Error('Could not geocode origin or destination');
      }

      // Calculate route based on mode using appropriate service
      let route;
      if (mode === 'walking' || mode === 'wheelchair') {
        // Use OpenRouteService for walking and wheelchair routing
        route = await this.calculateAccessibleRoute(originCoords, destCoords, mode, accessibilitySettings);
      } else {
        // Use Mapbox for driving, transit, and cycling
        route = await this.calculateBaseRoute(originCoords, destCoords, mode);
      }

      // Apply accessibility analysis and modifications
      route = await this.applyAccessibilityAnalysis(route, accessibilitySettings);

      // Add AI-powered insights and recommendations
      route = await this.addAIInsights(route, accessibilitySettings);

      // Cache the result
      this.routeCache.set(cacheKey, route);

      return route;
    } catch (error) {
      console.error('Route calculation error:', error);
      throw error;
    }
  }

  // Geocode location (address or coordinates)
  async geocodeLocation(location) {
    if (Array.isArray(location)) {
      return location; // Already coordinates
    }
    
    if (typeof location === 'string') {
      const result = await enhancedSearchService.geocode(location);
      return result?.coordinates || null;
    }
    
    return null;
  }

  // Calculate accessible route using OpenRouteService
  async calculateAccessibleRoute(origin, destination, mode, accessibilitySettings) {
    try {
      const options = {
        wheelchair: mode === 'wheelchair',
        avoidSteps: accessibilitySettings.avoidSteps !== false,
        preferAccessible: accessibilitySettings.preferAccessible !== false,
        maxIncline: accessibilitySettings.maxIncline || 8,
        avoidClosures: accessibilitySettings.avoidClosures !== false
      };

      // Get route from OpenRouteService
      const routeData = await this.openRouteService.calculateRoute(origin, destination, mode, options);
      
      if (!routeData.features || routeData.features.length === 0) {
        throw new Error('No accessible route found');
      }

      const route = routeData.features[0];
      
      // Get elevation data for slope analysis
      const elevationData = await this.openElevationService.getRouteElevation(
        route.geometry.coordinates,
        { maxSlopeThreshold: options.maxIncline }
      );

      // Enhance route with elevation and slope information
      route.properties.elevation = elevationData;
      route.properties.accessibility = {
        ...route.properties.accessibility,
        slopeAnalysis: elevationData,
        steepSegments: elevationData.steepSegments,
        warnings: [...(route.properties.warnings || []), ...elevationData.slopeWarnings]
      };

      return routeData;
    } catch (error) {
      console.error('Accessible route calculation error:', error);
      // Fallback to base route if OpenRouteService fails
      return this.calculateBaseRoute(origin, destination, mode);
    }
  }

  // Calculate base route using Mapbox Directions API
  async calculateBaseRoute(origin, destination, mode) {
    const [originLng, originLat] = origin;
    const [destLng, destLat] = destination;

    try {
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        geometries: 'geojson',
        overview: 'full',
        steps: 'true',
        annotations: 'distance,duration',
        continue_straight: 'true'
      });

      const coordinates = `${originLng},${originLat};${destLng},${destLat}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/${mode}/${coordinates}?${params}`;
      
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          return {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: {
                mode: mode,
                distance: route.distance, // meters
                duration: route.duration, // seconds
                summary: route.legs[0]?.summary || '',
                weight: route.weight,
                weight_name: route.weight_name,
                waypoints: data.waypoints,
                legs: route.legs,
                code: data.code,
                uuid: data.uuid
              },
              geometry: route.geometry
            }],
            metadata: {
              profile: mode,
              distance: route.distance,
              duration: route.duration,
              waypoints: data.waypoints.length
            }
          };
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
      console.error('Base route calculation error:', error);
      throw error;
    }
  }

  // Apply accessibility analysis to route
  async applyAccessibilityAnalysis(route, accessibilitySettings) {
    if (!route.features || route.features.length === 0) {
      return route;
    }

    const feature = route.features[0];
    const coordinates = feature.geometry.coordinates;
    
    // Analyze route for accessibility issues
    const accessibilityAnalysis = await this.analyzeRouteAccessibility(coordinates, accessibilitySettings);
    
    // Find nearby amenities
    const nearbyAmenities = await this.findNearbyAmenities(coordinates);
    
    // Generate accessibility score
    const accessibilityScore = this.calculateAccessibilityScore(accessibilityAnalysis, accessibilitySettings);
    
    // Add accessibility data to route
    feature.properties.accessibility = {
      score: accessibilityScore,
      analysis: accessibilityAnalysis,
      amenities: nearbyAmenities,
      settings: accessibilitySettings
    };

    return route;
  }

  // Analyze route for accessibility issues
  async analyzeRouteAccessibility(coordinates, accessibilitySettings) {
    const analysis = {
      issues: [],
      warnings: [],
      recommendations: [],
      barriers: []
    };

    // Check each coordinate for accessibility issues
    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i];
      const nearbyIssues = await this.findNearbyAccessibilityIssues(coord);
      
      nearbyIssues.forEach(issue => {
        if (issue.severity === 'high' || issue.severity === 'critical') {
          analysis.barriers.push({
            type: issue.type,
            severity: issue.severity,
            location: coord,
            description: issue.description,
            distance: issue.distance
          });
        } else {
          analysis.warnings.push({
            type: issue.type,
            severity: issue.severity,
            location: coord,
            description: issue.description,
            distance: issue.distance
          });
        }
      });
    }

    // Generate recommendations based on issues and settings
    analysis.recommendations = this.generateAccessibilityRecommendations(analysis, accessibilitySettings);

    return analysis;
  }

  // Find nearby accessibility issues
  async findNearbyAccessibilityIssues(coordinate, radius = 0.001) {
    const issues = [];
    const [lng, lat] = coordinate;
    
    // Check each dataset for nearby issues
    Object.entries(this.datasets).forEach(([datasetName, data]) => {
      if (data.features) {
        data.features.forEach(feature => {
          const coords = feature.geometry?.coordinates;
          if (coords) {
            const distance = this.calculateDistance(coordinate, coords);
            if (distance <= radius) {
              const issue = this.createAccessibilityIssue(feature, datasetName, distance);
              if (issue) {
                issues.push(issue);
              }
            }
          }
        });
      }
    });

    return issues.sort((a, b) => a.distance - b.distance);
  }

  // Create accessibility issue from feature
  createAccessibilityIssue(feature, datasetName, distance) {
    const properties = feature.properties || {};
    
    switch (datasetName) {
      case 'steps':
        return {
          type: 'steps',
          severity: properties.stepCount > 10 ? 'high' : 'medium',
          description: `${properties.stepCount || 'Unknown'} steps`,
          distance: distance,
          properties: properties
        };
      
      case 'sidewalk_closures':
        return {
          type: 'sidewalk_closure',
          severity: properties.closureType === 'full' ? 'critical' : 'high',
          description: `Sidewalk closure: ${properties.reason || 'Unknown reason'}`,
          distance: distance,
          properties: properties
        };
      
      case 'traffic_control':
        return {
          type: 'traffic_control',
          severity: 'medium',
          description: `Traffic control device: ${properties.type || 'Unknown'}`,
          distance: distance,
          properties: properties
        };
      
      case 'street_lights':
        if (properties.working === false) {
          return {
            type: 'poor_lighting',
            severity: 'medium',
            description: 'Poor lighting conditions',
            distance: distance,
            properties: properties
          };
        }
        break;
      
      default:
        return null;
    }
  }

  // Find nearby amenities
  async findNearbyAmenities(coordinates, radius = 0.002) {
    const amenities = {
      accessibleWashrooms: [],
      accessibleParking: [],
      accessibleBusStops: [],
      transitShelters: []
    };

    // Check each coordinate for nearby amenities
    coordinates.forEach(coord => {
      Object.entries(this.datasets).forEach(([datasetName, data]) => {
        if (data.features) {
          data.features.forEach(feature => {
            const featureCoords = feature.geometry?.coordinates;
            if (featureCoords) {
              const distance = this.calculateDistance(coord, featureCoords);
              if (distance <= radius) {
                const amenity = this.createAmenity(feature, datasetName, distance);
                if (amenity) {
                  switch (datasetName) {
                    case 'public_washrooms':
                      if (amenity.accessible) {
                        amenities.accessibleWashrooms.push(amenity);
                      }
                      break;
                    case 'accessible_parking':
                      amenities.accessibleParking.push(amenity);
                      break;
                    case 'transit_stops':
                      if (amenity.accessible) {
                        amenities.accessibleBusStops.push(amenity);
                      }
                      break;
                    case 'transit_shelters':
                      amenities.transitShelters.push(amenity);
                      break;
                  }
                }
              }
            }
          });
        }
      });
    });

    // Remove duplicates and sort by distance
    Object.keys(amenities).forEach(key => {
      amenities[key] = amenities[key]
        .filter((amenity, index, self) => 
          index === self.findIndex(a => a.id === amenity.id)
        )
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5); // Limit to 5 nearest
    });

    return amenities;
  }

  // Create amenity from feature
  createAmenity(feature, datasetName, distance) {
    const properties = feature.properties || {};
    
    return {
      id: feature.id || properties.id || Math.random().toString(36),
      name: properties.name || datasetName,
      type: datasetName,
      distance: distance,
      accessible: properties.accessible !== false,
      properties: properties
    };
  }

  // Calculate accessibility score
  calculateAccessibilityScore(analysis, accessibilitySettings) {
    let score = 100;
    
    // Reduce score based on barriers
    analysis.barriers.forEach(barrier => {
      switch (barrier.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    // Reduce score based on warnings
    analysis.warnings.forEach(warning => {
      switch (warning.severity) {
        case 'high':
          score -= 8;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    });

    // Boost score for accessibility-friendly settings
    if (accessibilitySettings.avoidSteps) {
      score += 5;
    }
    if (accessibilitySettings.preferWellLit) {
      score += 3;
    }
    if (accessibilitySettings.wheelchairAccessible) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Generate accessibility recommendations
  generateAccessibilityRecommendations(analysis, accessibilitySettings) {
    const recommendations = [];

    if (analysis.barriers.some(b => b.type === 'steps')) {
      recommendations.push({
        type: 'reroute',
        priority: 'high',
        description: 'Consider alternative route to avoid steps',
        reason: 'Steps detected on current route'
      });
    }

    if (analysis.barriers.some(b => b.type === 'sidewalk_closure')) {
      recommendations.push({
        type: 'reroute',
        priority: 'critical',
        description: 'Route includes sidewalk closures',
        reason: 'Sidewalk closures detected'
      });
    }

    if (analysis.barriers.some(b => b.type === 'poor_lighting')) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        description: 'Consider traveling during daylight hours',
        reason: 'Poor lighting conditions detected'
      });
    }

    if (accessibilitySettings.wheelchairAccessible && analysis.barriers.length > 0) {
      recommendations.push({
        type: 'assistance',
        priority: 'medium',
        description: 'Consider requesting assistance for this route',
        reason: 'Multiple accessibility barriers detected'
      });
    }

    return recommendations;
  }

  // Add AI insights to route
  async addAIInsights(route, accessibilitySettings) {
    try {
      // Use the enhanced AI service to analyze the route
      const aiAnalysis = await enhancedAIService.analyzeRouteAccessibility(route);
      
      // Add AI insights to route properties
      if (route.features && route.features.length > 0) {
        route.features[0].properties.aiInsights = {
          analysis: aiAnalysis,
          recommendations: aiAnalysis.modifications || [],
          explanation: aiAnalysis.explanation || 'AI analysis completed',
          confidence: aiAnalysis.confidence || 'medium'
        };
      }

      return route;
    } catch (error) {
      console.error('Error adding AI insights:', error);
      return route; // Return route without AI insights if analysis fails
    }
  }

  // Calculate distance between coordinates
  calculateDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get service statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      routeCacheSize: this.routeCache.size,
      datasetsLoaded: Object.keys(this.datasets).length,
      spatialIndexSize: this.spatialIndex.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      isInitialized: this.isInitialized
    };
  }

  // Clear caches
  clearCaches() {
    this.cache.clear();
    this.routeCache.clear();
  }
}

// Create singleton instance
const unifiedRoutingService = new UnifiedRoutingService();
export default unifiedRoutingService;
