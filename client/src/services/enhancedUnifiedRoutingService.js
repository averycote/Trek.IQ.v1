// Enhanced Unified Routing Service - Intelligent routing with comprehensive API integration
import enhancedAIService from './enhancedAIService.js';
import enhancedSearchService from './enhancedSearchService.js';
import OpenRouteService from './openRouteService.js';
import OpenElevationService from './openElevationService.js';
// WheelmapService removed - no API token available
import EnhancedOverpassService from './enhancedOverpassService.js';
import transitService from './transitService.js';
import weatherService from './weatherService.js';
import barrierService from './barrierService.js';
// eslint-disable-next-line no-unused-vars
import apiHealthMonitor from './apiHealthMonitor.js';
import performanceService from './performanceService.js';

class EnhancedUnifiedRoutingService {
  constructor() {
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.cache = new Map();
    this.routeCache = new Map();
    this.isInitialized = false;
    
    // Enhanced rate limiting with adaptive throttling
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // Reduced for better performance
    this.maxConcurrentRequests = 8; // Increased for better performance
    this.activeRequests = 0;
    
    // Intelligent data harmonization
    this.dataHarmonizer = new Map();
    this.confidenceScores = new Map();
    this.dataSources = new Map();
    
    // Initialize all API services - use singleton instances where available
    this.services = {
      openRoute: new OpenRouteService(),
      openElevation: new OpenElevationService(),
      // wheelmap: new WheelmapService(), // Removed - no API token available
      overpass: new EnhancedOverpassService(),
      transit: transitService, // Use singleton instance
      weather: weatherService, // Use singleton instance
      barrier: barrierService, // Use singleton instance
      ai: enhancedAIService, // Use singleton instance
      search: enhancedSearchService // Use singleton instance
    };
    
    // Service priorities for fallback
    this.servicePriorities = {
      routing: ['mapbox', 'openRoute', 'local'],
      geocoding: ['mapbox', 'local', 'nominatim'],
      accessibility: ['overpass', 'local'], // wheelmap removed - no API token
      weather: ['openWeather', 'local'],
      transit: ['halifax', 'openRoute']
    };
    
    // Performance optimizations
    this.batchSize = 5;
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    this.spatialIndex = new Map();
    this.preloadQueue = [];
  }

  // Initialize the routing service with performance optimizations
  async initialize() {
    if (this.isInitialized) {
      console.log('Enhanced Unified Routing Service already initialized');
      return;
    }

    try {
      console.log('Initializing Enhanced Unified Routing Service...');
      
      // Initialize services in parallel for better performance
      const initPromises = Object.entries(this.services).map(async ([name, service]) => {
        try {
          if (service && typeof service.initialize === 'function') {
            console.log(`Initializing ${name} service...`);
            await service.initialize();
            console.log(`Initialized ${name} service successfully`);
          } else {
            console.log(`Skipping ${name} service (no initialize method)`);
          }
        } catch (error) {
          console.warn(`Failed to initialize ${name} service:`, error);
        }
      });

      await Promise.allSettled(initPromises);
      
      // Load datasets in parallel
      await this.loadAndHarmonizeDatasets();
      
      // Build spatial index for faster lookups
      await this.buildSpatialIndex();
      
      // Preload critical data
      await this.preloadCriticalData();
      
      this.isInitialized = true;
      console.log('Enhanced Unified Routing Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Unified Routing Service:', error);
      this.isInitialized = true; // Mark as initialized even if some services fail
    }
  }

  // Load and harmonize all datasets with performance optimizations
  async loadAndHarmonizeDatasets() {
    const datasets = [
      { name: 'active_travelways', url: '/api/data/Active_Travelways.geojson', priority: 'high' },
      { name: 'accessible_parking', url: '/api/data/Accessible_Parking.geojson', priority: 'high' },
      { name: 'steps', url: '/api/data/Steps_577353981712784942.geojson', priority: 'critical' },
      { name: 'sidewalk_closures', url: '/api/data/Sidewalk%20Closures.geojson', priority: 'critical' },
      { name: 'traffic_control', url: '/api/data/Traffic_Control.geojson', priority: 'medium' },
      { name: 'transit_stops', url: '/api/data/Bus_Stops_2_9086297843420881686.geojson', priority: 'high' },
      { name: 'transit_routes', url: '/api/data/Transit_Bus_Routes.geojson', priority: 'medium' },
      { name: 'street_lights', url: '/api/data/Street_Lights_-8646609400635809433.geojson', priority: 'medium' },
      { name: 'public_washrooms', url: '/api/data/HRM_Public_Washrooms_8937353538278970153.geojson', priority: 'high' }
    ];

    // Load datasets in batches for better performance
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < datasets.length; i += batchSize) {
      batches.push(datasets.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (dataset) => {
        try {
          console.log(`Loading dataset: ${dataset.name} from ${dataset.url}`);
          
          // Use performance service for caching
          const data = await performanceService.getCachedData(
            `dataset_${dataset.name}`,
            async () => {
              const response = await fetch(dataset.url);
              if (response.ok) {
                return response.json();
              } else {
                console.warn(`Failed to load ${dataset.name}: HTTP ${response.status} - ${response.statusText}`);
                const errorText = await response.text();
                console.warn(`Error details: ${errorText}`);
                return null;
              }
            },
            {
              ttl: this.cacheTimeout,
              priority: dataset.priority,
              useIndexedDB: true
            }
          );
          
          if (data) {
            this.harmonizeDataset(dataset.name, data, dataset.priority);
            console.log(`Loaded and harmonized ${dataset.name}: ${data.features?.length || 0} features`);
          }
        } catch (error) {
          console.warn(`Failed to load ${dataset.name}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Harmonize dataset with quality scoring and performance optimizations
  harmonizeDataset(datasetName, data, priority) {
    if (!data.features) return;

    // Optimize GeoJSON data
    const optimizedData = performanceService.optimizeGeoJSON(data, {
      maxFeatures: 2000,
      simplifyTolerance: 0.0001,
      enableClustering: true
    });

    this.dataHarmonizer.set(datasetName, {
      data: optimizedData,
      priority,
      timestamp: Date.now(),
      featureCount: optimizedData.features.length
    });

    // Build spatial index for this dataset
    this.buildDatasetSpatialIndex(datasetName, optimizedData);
  }

  // Build spatial index for a specific dataset
  buildDatasetSpatialIndex(datasetName, data) {
    if (!data.features) return;

    const index = new Map();
    
    data.features.forEach((feature, index) => {
      if (feature.geometry && feature.geometry.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        const key = `${Math.floor(lng * 100)},${Math.floor(lat * 100)}`;
        
        if (!index.has(key)) {
          index.set(key, []);
        }
        index.get(key).push({ feature, originalIndex: index });
      }
    });

    this.spatialIndex.set(datasetName, index);
  }

  // Build comprehensive spatial index
  async buildSpatialIndex() {
    console.log('Building spatial index...');
    
    for (const [datasetName, harmonizedData] of this.dataHarmonizer) {
      this.buildDatasetSpatialIndex(datasetName, harmonizedData.data);
    }
    
    console.log('Spatial index built successfully');
  }

  // Preload critical data for better performance
  async preloadCriticalData() {
    console.log('Preloading critical data...');
    
    const criticalDatasets = ['steps', 'sidewalk_closures', 'accessible_parking'];
    
    for (const datasetName of criticalDatasets) {
      const harmonizedData = this.dataHarmonizer.get(datasetName);
      if (harmonizedData) {
        // Preload into memory cache
        this.cache.set(`preload_${datasetName}`, {
          data: harmonizedData.data,
          timestamp: Date.now(),
          priority: 'critical'
        });
      }
    }
    
    console.log('Critical data preloaded');
  }

  // Geocode location with performance optimizations
  async geocodeLocation(query, options = {}) {
    const cacheKey = `geocode_${query}_${JSON.stringify(options)}`;
    
    return await performanceService.getCachedData(
      cacheKey,
      async () => {
        // Try multiple geocoding services in parallel
        const geocodingPromises = [
          this.services.search.geocode(query, options),
          this.geocodeWithMapbox(query, options)
        ];

        const results = await Promise.allSettled(geocodingPromises);
        
        // Return the best result
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            return result.value;
          }
        }
        
        return null;
      },
      {
        ttl: 30 * 60 * 1000, // 30 minutes
        priority: 'high',
        useIndexedDB: true
      }
    );
  }

  // Geocode with Mapbox API
  async geocodeWithMapbox(query, options = {}) {
    try {
      const { limit = 5, types = 'address,poi,place' } = options;
      
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${this.mapboxToken}&limit=${limit}&types=${types}&country=ca&bbox=-63.8,44.5,-63.4,44.8`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        return {
          coordinates: feature.center,
          name: feature.place_name,
          type: feature.place_type[0],
          confidence: feature.relevance
        };
      }
      
      return null;
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return null;
    }
  }

  // Calculate intelligent route with performance optimizations
  async calculateIntelligentRoute(origin, destination, options = {}) {
    const startTime = performance.now();
    
    try {
      // Generate cache key
      const cacheKey = `route_${JSON.stringify(origin)}_${JSON.stringify(destination)}_${JSON.stringify(options)}`;
      
      // Check cache first
      const cachedRoute = this.routeCache.get(cacheKey);
      if (cachedRoute && Date.now() - cachedRoute.timestamp < this.cacheTimeout) {
        performanceService.recordMetric('route_cache_hit', Date.now() - startTime);
        return cachedRoute.data;
      }

      // Geocode locations if needed
      const [originCoords, destCoords] = await Promise.all([
        this.geocodeLocation(origin),
        this.geocodeLocation(destination)
      ]);

      if (!originCoords || !destCoords) {
        throw new Error('Failed to geocode origin or destination');
      }

      // Try multiple routing services in parallel
      const routingPromises = [
        this.calculateMapboxRoute(originCoords, destCoords, options),
        this.calculateOpenRouteServiceRoute(originCoords, destCoords, options)
      ];

      const results = await Promise.allSettled(routingPromises);
      
      let bestRoute = null;
      let bestScore = 0;

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const route = result.value;
          const score = this.calculateRouteScore(route, options);
          
          if (score > bestScore) {
            bestRoute = route;
            bestScore = score;
          }
        }
      }

      if (!bestRoute) {
        throw new Error('No routing service returned a valid route');
      }

      // Enhance route with additional data
      const enhancedRoute = await this.enhanceRouteWithAccessibilityData(bestRoute, options);
      
      // Cache the result
      this.routeCache.set(cacheKey, {
        data: enhancedRoute,
        timestamp: Date.now()
      });

      const totalTime = performance.now() - startTime;
      performanceService.recordMetric('route_calculation_time', totalTime);
      
      return enhancedRoute;

    } catch (error) {
      console.error('Route calculation error:', error);
      throw error;
    }
  }

  // Calculate route with Mapbox
  async calculateMapboxRoute(origin, destination, options = {}) {
    try {
      const { profile = 'walking' } = options;
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.coordinates.join(',')};${destination.coordinates.join(',')}?access_token=${this.mapboxToken}&geometries=geojson&overview=full&steps=true`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          geometry: route.geometry,
          distance: route.distance,
          duration: route.duration,
          steps: route.legs[0].steps,
          source: 'mapbox'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Mapbox routing error:', error);
      return null;
    }
  }

  // Main calculateRoute method - matches the signature expected by AppShell
  async calculateRoute(routeData) {
    try {
      const { origin, destination, mode = 'walking', accessibilitySettings = {} } = routeData;
      
      console.log('EnhancedUnifiedRoutingService: Calculating route:', { origin, destination, mode });
      console.log('EnhancedUnifiedRoutingService: Service initialized:', this.isInitialized);
      console.log('EnhancedUnifiedRoutingService: Available services:', Object.keys(this.services));
      
      // Ensure service is initialized
      if (!this.isInitialized) {
        console.log('EnhancedUnifiedRoutingService: Initializing service...');
        await this.initialize();
      }
      
      // Try OpenRouteService first
      console.log('EnhancedUnifiedRoutingService: Attempting OpenRouteService...');
      let route = await this.calculateOpenRouteServiceRoute(origin, destination, {
        profile: this.getProfileForMode(mode),
        ...accessibilitySettings
      });
      
      console.log('EnhancedUnifiedRoutingService: OpenRouteService result:', route);
      
      if (!route) {
        console.log('EnhancedUnifiedRoutingService: Using fallback route...');
        // Fallback to direct path
        route = this.createFallbackRoute(origin, destination, mode);
      }
      
      // Enhance route with accessibility data
      console.log('EnhancedUnifiedRoutingService: Enhancing route...');
      const enhancedRoute = await this.enhanceRouteWithAccessibilityData(route, accessibilitySettings);
      
      console.log('EnhancedUnifiedRoutingService: Final route:', enhancedRoute);
      return enhancedRoute;
    } catch (error) {
      console.error('EnhancedUnifiedRoutingService calculateRoute error:', error);
      throw error;
    }
  }

  // Get profile for routing mode
  getProfileForMode(mode) {
    const profiles = {
      walking: 'foot-walking',
      driving: 'driving-car',
      cycling: 'cycling-regular',
      transit: 'foot-walking' // Transit uses walking for last-mile
    };
    return profiles[mode] || 'foot-walking';
  }

  // Create fallback route when routing service fails
  createFallbackRoute(origin, destination, mode) {
    console.log('EnhancedUnifiedRoutingService: Creating fallback route for:', { origin, destination, mode });
    
    // Try to get coordinates for origin and destination
    let originCoords, destCoords;
    
    if (Array.isArray(origin)) {
      originCoords = origin;
    } else {
      // Use Halifax center as fallback for origin
      originCoords = [-63.5756, 44.6475];
    }
    
    if (Array.isArray(destination)) {
      destCoords = destination;
    } else {
      // Use Halifax center as fallback for destination
      destCoords = [-63.5756, 44.6475];
    }
    
    // Calculate distance between points
    const distance = this.calculateDistance(originCoords, destCoords);
    const duration = distance / 1000 * 20; // Assume 20 min per km for walking
    
    console.log('EnhancedUnifiedRoutingService: Fallback route created with distance:', distance, 'm, duration:', duration, 'min');
    
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          mode: mode,
          distance: distance,
          duration: duration,
          source: 'fallback',
          accessibility: { 
            score: 50, 
            issues: ['no_route_service', 'estimated_route'],
            warnings: ['This is an estimated route. Actual conditions may vary.']
          }
        },
        geometry: {
          type: 'LineString',
          coordinates: [originCoords, destCoords]
        }
      }]
    };
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

  // Calculate route with OpenRouteService
  async calculateOpenRouteServiceRoute(origin, destination, options = {}) {
    try {
      if (!this.services.openRoute) return null;
      
      return await this.services.openRoute.calculateRoute(origin, destination, options);
    } catch (error) {
      console.error('OpenRouteService routing error:', error);
      return null;
    }
  }

  // Calculate route score based on preferences
  calculateRouteScore(route, options = {}) {
    let score = 0;
    
    // Distance score (shorter is better)
    if (route.distance) {
      score += 1000 / (route.distance / 1000); // Convert to km
    }
    
    // Duration score (faster is better)
    if (route.duration) {
      score += 1000 / (route.duration / 60); // Convert to minutes
    }
    
    // Accessibility score
    if (route.accessibilityScore) {
      score += route.accessibilityScore * 100;
    }
    
    // Source preference
    const sourceScores = { mapbox: 1.2, openRoute: 1.0, local: 0.8 };
    score *= sourceScores[route.source] || 1.0;
    
    return score;
  }

  // Enhance route with accessibility data
  async enhanceRouteWithAccessibilityData(route, options = {}) {
    try {
      // Get accessibility data along the route
      const accessibilityData = await this.getAccessibilityDataAlongRoute(route, options);
      
      // Get weather data
      const weatherData = await this.getWeatherDataForRoute(route, options);
      
      // Get barrier data
      const barrierData = await this.getBarrierDataAlongRoute(route, options);
      
      // Calculate comprehensive accessibility score
      const accessibilityScore = this.calculateComprehensiveAccessibilityScore(
        route, accessibilityData, weatherData, barrierData, options
      );
      
      // Generate recommendations
      const recommendations = this.generateComprehensiveRecommendations(
        route, accessibilityData, weatherData, barrierData, options
      );
      
      return {
        ...route,
        accessibilityData,
        weatherData,
        barrierData,
        accessibilityScore,
        recommendations,
        enhanced: true
      };
    } catch (error) {
      console.error('Route enhancement error:', error);
      return route; // Return original route if enhancement fails
    }
  }

  // Get accessibility data along route
  async getAccessibilityDataAlongRoute(route, options = {}) {
    try {
      const promises = [];
      
      // Wheelmap service removed - no API token available
      if (this.services.overpass) {
        promises.push(this.services.overpass.getAccessibilityDataAlongRoute(route, options));
      }
      
      const results = await Promise.allSettled(promises);
      const accessibilityData = [];
      
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          accessibilityData.push(...result.value);
        }
      });
      
      return accessibilityData;
    } catch (error) {
      console.error('Error getting accessibility data:', error);
      return [];
    }
  }

  // Get weather data for route
  async getWeatherDataForRoute(route, options = {}) {
    try {
      if (!this.services.weather) return null;
      
      // Get weather for route center point
      const centerPoint = this.getRouteCenterPoint(route);
      return await this.services.weather.getWeatherData(centerPoint, options);
    } catch (error) {
      console.error('Error getting weather data:', error);
      return null;
    }
  }

  // Get barrier data along route
  async getBarrierDataAlongRoute(route, options = {}) {
    try {
      if (!this.services.barrier) return [];
      
      return await this.services.barrier.getBarriersAlongRoute(route, options);
    } catch (error) {
      console.error('Error getting barrier data:', error);
      return [];
    }
  }

  // Get route center point
  getRouteCenterPoint(route) {
    if (route.geometry && route.geometry.coordinates) {
      const coords = route.geometry.coordinates;
      const midIndex = Math.floor(coords.length / 2);
      return coords[midIndex];
    }
    return null;
  }

  // Calculate comprehensive accessibility score
  calculateComprehensiveAccessibilityScore(route, accessibilityData, weatherData, barrierData, options = {}) {
    let score = 100; // Start with perfect score
    
    // Reduce score based on barriers
    if (barrierData && barrierData.length > 0) {
      const barrierPenalty = barrierData.reduce((penalty, barrier) => {
        const severityPenalties = { low: 5, medium: 15, high: 30, critical: 50 };
        return penalty + (severityPenalties[barrier.severity] || 10);
      }, 0);
      score -= Math.min(barrierPenalty, 80); // Cap penalty at 80
    }
    
    // Reduce score based on weather
    if (weatherData && weatherData.conditions) {
      const weatherPenalties = {
        'rain': 10, 'snow': 25, 'ice': 40, 'storm': 30
      };
      const weatherPenalty = weatherPenalties[weatherData.conditions] || 0;
      score -= weatherPenalty;
    }
    
    // Reduce score based on accessibility issues
    if (accessibilityData && accessibilityData.length > 0) {
      const accessibilityPenalty = accessibilityData.reduce((penalty, issue) => {
        return penalty + (issue.severity === 'high' ? 10 : 5);
      }, 0);
      score -= Math.min(accessibilityPenalty, 40);
    }
    
    return Math.max(score, 0); // Ensure score doesn't go below 0
  }

  // Generate comprehensive recommendations
  generateComprehensiveRecommendations(route, accessibilityData, weatherData, barrierData, options = {}) {
    const recommendations = [];
    
    // Barrier recommendations
    if (barrierData && barrierData.length > 0) {
      recommendations.push({
        type: 'barrier',
        priority: 'high',
        message: `${barrierData.length} barrier(s) detected along route. Consider alternative route.`,
        details: barrierData
      });
    }
    
    // Weather recommendations
    if (weatherData && weatherData.conditions) {
      const weatherMessages = {
        'rain': 'Wet conditions may affect accessibility. Use caution.',
        'snow': 'Snow may significantly impact accessibility. Consider alternative transportation.',
        'ice': 'Icy conditions detected. Route may be hazardous.',
        'storm': 'Severe weather conditions. Consider delaying travel.'
      };
      
      const message = weatherMessages[weatherData.conditions];
      if (message) {
        recommendations.push({
          type: 'weather',
          priority: weatherData.conditions === 'ice' || weatherData.conditions === 'storm' ? 'high' : 'medium',
          message,
          details: weatherData
        });
      }
    }
    
    // Accessibility recommendations
    if (accessibilityData && accessibilityData.length > 0) {
      const highPriorityIssues = accessibilityData.filter(issue => issue.severity === 'high');
      if (highPriorityIssues.length > 0) {
        recommendations.push({
          type: 'accessibility',
          priority: 'medium',
          message: `${highPriorityIssues.length} accessibility issue(s) detected.`,
          details: highPriorityIssues
        });
      }
    }
    
    return recommendations;
  }

  // Get service health status
  getServiceHealth() {
    const health = {};
    
    for (const [name, service] of Object.entries(this.services)) {
      if (service && typeof service.getHealthStatus === 'function') {
        health[name] = service.getHealthStatus();
      } else {
        health[name] = { status: 'unknown', initialized: !!service };
      }
    }
    
    return health;
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return {
      cacheSize: this.cache.size,
      routeCacheSize: this.routeCache.size,
      spatialIndexSize: this.spatialIndex.size,
      dataHarmonizerSize: this.dataHarmonizer.size,
      activeRequests: this.activeRequests
    };
  }

  // Cleanup resources
  cleanup() {
    this.cache.clear();
    this.routeCache.clear();
    this.spatialIndex.clear();
    this.dataHarmonizer.clear();
    this.preloadQueue = [];
  }
}

// Export singleton instance
const enhancedUnifiedRoutingService = new EnhancedUnifiedRoutingService();
export default enhancedUnifiedRoutingService;
