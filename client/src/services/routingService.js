// Enhanced Routing Service for Trek.IQ with Mapbox Directions API and Rate Limiting
class RoutingService {
  constructor() {
    this.cache = new Map();
    this.datasets = {};
    this.notifications = [];
    this.currentRoute = null;
    this.barrierAlerts = [];
    this.spatialIndex = new Map(); // Spatial indexing for faster lookups
    this.datasetCache = new Map(); // Cache for dataset loading
    this.calculationCache = new Map(); // Cache for distance calculations
    this.routeCache = new Map(); // Cache for route calculations
    this.isInitialized = false;
    this.activeTravelways = []; // Active Travelways for route snapping
    this.accessibilityFeatures = new Map(); // Accessibility features by location
    this.weatherData = null; // Weather data for dynamic routing
    this.transitSchedule = new Map(); // Transit schedule data
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    
    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // 200ms between requests (5 requests per second)
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
      // Wait for a slot to become available
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
      
      // Process next request in queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        nextRequest();
      }
    }
  }

  // Initialize service with optimized data loading
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Mapbox routing service...');
      await this.loadAllDatasets();
      this.buildSpatialIndex();
      await this.loadAccessibilityFeatures();
      await this.loadTransitSchedule();
      this.isInitialized = true;
      console.log('Mapbox routing service initialized with optimizations');
    } catch (error) {
      console.error('Error initializing routing service:', error);
    }
  }

  // Load all datasets with retry logic
  async loadAllDatasets() {
    const datasets = [
      'active_travelways',
      'accessible_parking',
      'steps',
      'sidewalk_closures',
      'traffic_control',
      'transit_stops'
    ];

    const loadPromises = datasets.map(dataset => this.loadDatasetWithRetry(dataset));
    await Promise.allSettled(loadPromises);
  }

  // Load dataset with retry logic
  async loadDatasetWithRetry(datasetName, maxRetries = 3) {
    let retries = maxRetries;
    
    while (retries > 0) {
      try {
        const response = await fetch(`/api/data/${datasetName}.geojson`);
        if (response.ok) {
          const data = await response.json();
          this.datasets[datasetName] = data;
          this.datasetCache.set(datasetName, data);
          console.log(`Loaded ${datasetName}: ${data.features?.length || 0} features`);
          return data;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        retries--;
        console.warn(`Failed to load ${datasetName} (${retries} retries left):`, error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (maxRetries - retries))); // Exponential backoff
        }
      }
    }
    
    console.error(`Failed to load ${datasetName} after ${maxRetries} retries`);
    return null;
  }

  // Build spatial index for faster lookups
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

  // Load accessibility features
  async loadAccessibilityFeatures() {
    try {
      const features = ['steps', 'sidewalk_closures', 'traffic_control'];
      
      features.forEach(featureType => {
        const dataset = this.datasets[featureType];
        if (dataset && dataset.features) {
          dataset.features.forEach(feature => {
            const coords = feature.geometry?.coordinates;
            if (coords) {
              const key = `${coords[0]},${coords[1]}`;
              this.accessibilityFeatures.set(key, {
                type: featureType,
                feature: feature,
                severity: this.calculateSeverity(feature, featureType)
              });
            }
          });
        }
      });
      
      console.log(`Loaded ${this.accessibilityFeatures.size} accessibility features`);
    } catch (error) {
      console.error('Error loading accessibility features:', error);
    }
  }

  // Load transit schedule
  async loadTransitSchedule() {
    try {
      // This would typically load from a transit API
      // For now, we'll create a mock schedule
      const mockSchedule = new Map();
      mockSchedule.set('route_1', {
        frequency: 15, // minutes
        operatingHours: { start: '06:00', end: '23:00' },
        accessible: true
      });
      
      this.transitSchedule = mockSchedule;
      console.log('Transit schedule loaded');
    } catch (error) {
      console.error('Error loading transit schedule:', error);
    }
  }

  // Calculate severity of accessibility issue
  calculateSeverity(feature, type) {
    const properties = feature.properties || {};

    switch (type) {
      case 'steps':
        return properties.stepCount > 10 ? 'high' : 'medium';
      case 'sidewalk_closures':
        return properties.closureType === 'full' ? 'critical' : 'high';
      case 'traffic_control':
        return 'medium';
      default:
        return 'medium';
    }
  }

  // Helper to call Mapbox Directions API with rate limiting
  async getMapboxRoute(originCoords, destCoords, profile, options = {}) {
    const [originLng, originLat] = originCoords;
    const [destLng, destLat] = destCoords;

    const params = new URLSearchParams({
      access_token: this.mapboxToken,
      geometries: 'geojson',
      overview: 'full',
      steps: 'true',
      annotations: 'distance,duration',
      ...options
    });

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originLng},${originLat};${destLng},${destLat}?${params}`;

    try {
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          return {
            type: 'Feature',
            properties: {
              mode: profile,
              distance: route.distance, // meters
              duration: route.duration, // seconds
              summary: route.legs.map(leg => leg.summary).join(', '),
              weight: route.weight,
              weight_name: route.weight_name,
              snapped_waypoints: data.waypoints,
              // Add accessibility properties here based on AI analysis
              accessibility: { score: 100, issues: [], level: 'excellent' }
            },
            geometry: route.geometry
          };
        }
        return null;
      } else if (response.status === 429) {
        // Rate limit exceeded - wait and retry
        console.warn('Mapbox rate limit exceeded, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return null;
      } else {
        console.error(`Mapbox Directions API error: ${response.status} ${response.statusText}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching Mapbox ${profile} route:`, error);
      return null;
    }
  }

  // Calculate walking route with accessibility considerations
  async calculateWalkingRoute(origin, destination, accessibility, avoidSteps) {
    const originCoords = await this.geocode(origin);
    const destCoords = await this.geocode(destination);

    if (!originCoords || !destCoords) {
      throw new Error('Could not geocode origin or destination');
    }

    let mapboxRoute = await this.getMapboxRoute(originCoords, destCoords, 'walking');

    if (!mapboxRoute) {
      // Fallback to direct path if Mapbox fails
      mapboxRoute = {
        type: 'Feature',
        properties: { mode: 'walking', distance: 0, duration: 0, accessibility: { score: 0, issues: ['no_route_found'] } },
        geometry: { type: 'LineString', coordinates: [originCoords, destCoords] }
      };
    }

    // Apply AI-assisted modifications
    const aiAnalysis = await this.enhancedAIService.analyzeRouteAccessibility(mapboxRoute);
    mapboxRoute.properties.accessibility = aiAnalysis.accessibility;
    mapboxRoute.properties.aiExplanation = aiAnalysis.explanation;
    mapboxRoute.properties.modifications = aiAnalysis.modifications;

    return {
      type: 'FeatureCollection',
      features: [mapboxRoute]
    };
  }

  // Calculate driving route with accessible parking
  async calculateDrivingRoute(origin, destination) {
    const originCoords = await this.geocode(origin);
    const destCoords = await this.geocode(destination);

    if (!originCoords || !destCoords) {
      throw new Error('Could not geocode origin or destination');
    }

    try {
      // Find accessible parking near destination
      const accessibleParking = this.findAccessibleParking(destCoords);
      
      // Calculate route to parking using Mapbox
      const routeToParking = await this.getMapboxRoute(
        originCoords,
        accessibleParking,
        'driving'
      );

      // Calculate walking route from parking to destination
      const walkingFromParking = await this.getMapboxRoute(
        accessibleParking,
        destCoords,
        'walking'
      );

      return {
        type: 'FeatureCollection',
        features: [
          {
            ...routeToParking.features[0],
            properties: {
              ...routeToParking.features[0].properties,
              mode: 'driving',
              accessibility: 'accessible_parking_available',
              parkingSpot: accessibleParking
            }
          },
          {
            ...walkingFromParking.features[0],
            properties: {
              ...walkingFromParking.features[0].properties,
              mode: 'walking',
              accessibility: this.assessRouteAccessibility(walkingFromParking.features[0].geometry.coordinates)
            }
          }
        ]
      };
    } catch (error) {
      console.error('Mapbox driving route error:', error);
      throw error;
    }
  }

  // Calculate transit route
  async calculateTransitRoute(origin, destination) {
    const originCoords = await this.geocode(origin);
    const destCoords = await this.geocode(destination);

    if (!originCoords || !destCoords) {
      throw new Error('Could not geocode origin or destination');
    }

    try {
      // Try to use Transit API first
      const transitRouteData = await this.calculateTransitRouteWithAPI(originCoords, destCoords);

      if (transitRouteData) {
        console.log('Using Transit API data for route calculation');
        return transitRouteData;
      }

      // Fallback to existing method if Transit API fails
      console.log('Transit API unavailable, falling back to existing method');
      return await this.calculateTransitRouteFallback(originCoords, destCoords);

    } catch (error) {
      console.error('Transit route calculation error:', error);
      // Fallback to existing method
      return await this.calculateTransitRouteFallback(originCoords, destCoords);
    }
  }

  // Calculate transit route using Transit API
  async calculateTransitRouteWithAPI(originCoords, destCoords) {
    try {
      // Get Transit API service directly
      const { default: transitAPIService } = await import('./transitAPIService.js');

      if (!transitAPIService || !transitAPIService.isAvailable()) {
        console.log('Transit API service not available');
        return null;
      }

      const [originLng, originLat] = originCoords;
      const [destLng, destLat] = destCoords;

      // Get trip plan from Transit API
      const tripPlan = await transitAPIService.getTripPlan(
        originLat, originLng, destLat, destLng,
        {
          mode: 'transit',
          maxWalkDistance: 1000,
          numItineraries: 3 // Get multiple options
        }
      );

      if (!tripPlan || !tripPlan.itineraries || tripPlan.itineraries.length === 0) {
        console.log('No transit itineraries found from Transit API');
        return null;
      }

      const itinerary = tripPlan.itineraries[0];
      const features = [];

      // Process each leg of the itinerary
      for (const leg of itinerary.legs) {
        if (leg.mode === 'WALK') {
          // Walking leg
          const walkCoords = leg.geometry ? this.decodePolyline(leg.geometry) : [originCoords, destCoords];

          features.push({
            type: 'Feature',
            properties: {
              mode: 'walking',
              distance: leg.distance || 0,
              duration: leg.duration || 0,
              accessibility: this.assessRouteAccessibility(walkCoords),
              instructions: leg.instructions || 'Walk to transit stop'
            },
            geometry: {
              type: 'LineString',
              coordinates: walkCoords
            }
          });
        } else if (leg.mode === 'BUS' || leg.mode === 'TRANSIT') {
          // Transit leg
          const transitCoords = leg.geometry ? this.decodePolyline(leg.geometry) : [originCoords, destCoords];

          features.push({
            type: 'Feature',
            properties: {
              mode: 'transit',
              distance: leg.distance || 0,
              duration: leg.duration || 0,
              accessibility: leg.wheelchair_accessible ? ['wheelchair_accessible', 'priority_seating'] : ['accessible_transit'],
              route: leg.route || leg.route_name || 'Unknown Route',
              routeId: leg.route_id,
              routeNumber: leg.route_short_name || leg.route,
              agency: leg.agency_name || 'Halifax Transit',
              headsign: leg.headsign || leg.trip_headsign,
              transitMode: leg.mode,
              poweredByTransit: true, // Flag for logo display
              source: 'transit_api',
              startLocation: leg.from,
              endLocation: leg.to
            },
            geometry: {
              type: 'LineString',
              coordinates: transitCoords
            }
          });
        }
      }

      // Add alternative routes if available
      const alternativeRoutes = [];
      if (tripPlan.itineraries.length > 1) {
        for (let i = 1; i < Math.min(tripPlan.itineraries.length, 3); i++) {
          const altItinerary = tripPlan.itineraries[i];
          alternativeRoutes.push({
            duration: altItinerary.duration,
            transfers: altItinerary.transfers || 0,
            legs: altItinerary.legs.map(leg => ({
              mode: leg.mode === 'WALK' ? 'walk' : 'bus',
              routeId: leg.route_id || leg.route,
              routeName: leg.route_name || leg.route,
              routeNumber: leg.route_short_name || leg.route,
              duration: leg.duration || 0,
              distance: leg.distance || 0,
              headsign: leg.headsign || leg.trip_headsign,
              accessibility: leg.wheelchair_accessible ? ['wheelchair_accessible'] : [],
              agency: leg.agency_name || 'Halifax Transit'
            }))
          });
        }
      }

      return {
        type: 'FeatureCollection',
        features: features,
        properties: {
          totalDuration: itinerary.duration,
          totalDistance: itinerary.distance,
          transfers: itinerary.transfers || 0,
          fare: itinerary.fare,
          poweredByTransit: true,
          source: 'transit_api',
          alternatives: alternativeRoutes,
          summary: {
            totalDuration: itinerary.duration,
            totalTransfers: itinerary.transfers || 0,
            totalDistance: itinerary.distance,
            accessibility: itinerary.legs.some(leg => leg.wheelchair_accessible) ? ['wheelchair_accessible'] : []
          }
        }
      };

    } catch (error) {
      console.error('Error using Transit API for route calculation:', error);
      return null;
    }
  }

  // Fallback transit route calculation (existing method)
  async calculateTransitRouteFallback(originCoords, destCoords) {
    try {
      // Find accessible bus stops
      const originStop = this.findAccessibleBusStop(originCoords);
      const destStop = this.findAccessibleBusStop(destCoords);

      if (!originStop || !destStop) {
        throw new Error('No accessible transit stops found');
      }

      // Calculate walking routes to/from stops using Mapbox
      const walkToStop = await this.getMapboxRoute(originCoords, originStop, 'walking');
      const walkFromStop = await this.getMapboxRoute(destStop, destCoords, 'walking');

      // Find transit route between stops
      const transitRoute = this.findTransitRoute(originStop, destStop);

      return {
        type: 'FeatureCollection',
        features: [
          {
            ...walkToStop.features[0],
            properties: {
              ...walkToStop.features[0].properties,
              mode: 'walking',
              accessibility: this.assessRouteAccessibility(walkToStop.features[0].geometry.coordinates)
            }
          },
          {
            type: 'Feature',
            properties: {
              mode: 'transit',
              distance: this.calculateDistance(transitRoute),
              duration: this.estimateTransitTime(transitRoute),
              accessibility: 'accessible_transit',
              route: transitRoute.properties?.route || 'Unknown',
              poweredByTransit: false
            },
            geometry: {
              type: 'LineString',
              coordinates: transitRoute
            }
          },
          {
            ...walkFromStop.features[0],
            properties: {
              ...walkFromStop.features[0].properties,
              mode: 'walking',
              accessibility: this.assessRouteAccessibility(walkFromStop.features[0].geometry.coordinates)
            }
          }
        ],
        properties: {
          poweredByTransit: false,
          source: 'fallback'
        }
      };
    } catch (error) {
      console.error('Fallback transit route error:', error);
      throw error;
    }
  }

  // Decode polyline from Transit API (simple implementation)
  decodePolyline(encoded) {
    // This is a simplified polyline decoder
    // In a real implementation, you'd use a proper polyline decoding library
    if (!encoded || typeof encoded !== 'string') {
      return [];
    }

    // For now, return a simple line between points
    // TODO: Implement proper polyline decoding
    return [];
  }

  // Calculate cycling route
  async calculateCyclingRoute(origin, destination) {
    const originCoords = await this.geocode(origin);
    const destCoords = await this.geocode(destination);

    if (!originCoords || !destCoords) {
      throw new Error('Could not geocode origin or destination');
    }

    let mapboxRoute = await this.getMapboxRoute(originCoords, destCoords, 'cycling');

    if (!mapboxRoute) {
      // Fallback to direct path if Mapbox fails
      mapboxRoute = {
        type: 'Feature',
        properties: { mode: 'cycling', distance: 0, duration: 0, accessibility: { score: 0, issues: ['no_route_found'] } },
        geometry: { type: 'LineString', coordinates: [originCoords, destCoords] }
      };
    }

    // Apply cycling-specific accessibility analysis
    const cyclingAnalysis = await this.assessBikeInfrastructure(mapboxRoute);
    mapboxRoute.properties.accessibility = cyclingAnalysis.accessibility;
    mapboxRoute.properties.bikeInfrastructure = cyclingAnalysis.infrastructure;

    return {
      type: 'FeatureCollection',
      features: [mapboxRoute]
    };
  }

  // Main route calculation method
  async calculateRoute(origin, destination, options = {}) {
    const {
      mode = 'walking',
      accessibility = {},
      avoidSteps = true,
      avoidClosures = true,
      preferAccessible = true
    } = options;

    // Check cache first
    const cacheKey = `${origin}|${destination}|${mode}|${JSON.stringify(options)}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey);
    }

    let route;
    
    try {
      switch (mode) {
        case 'walking':
          route = await this.calculateWalkingRoute(origin, destination, accessibility, avoidSteps);
          break;
        case 'driving':
          route = await this.calculateDrivingRoute(origin, destination);
          break;
        case 'transit':
          route = await this.calculateTransitRoute(origin, destination);
          break;
        case 'cycling':
          route = await this.calculateCyclingRoute(origin, destination);
          break;
        default:
          throw new Error(`Unsupported routing mode: ${mode}`);
      }

      // Cache the result
      this.routeCache.set(cacheKey, route);
      
      // Clean cache if too large
      if (this.routeCache.size > 100) {
        this.cleanRouteCache();
      }

      return route;
    } catch (error) {
      console.error('Route calculation error:', error);
      throw error;
    }
  }

  // Find accessible parking near coordinates
  findAccessibleParking(coordinates) {
    const parkingDataset = this.datasets['accessible_parking'];
    if (!parkingDataset || !parkingDataset.features) {
      return coordinates; // Fallback to destination
    }

    let nearest = null;
    let minDistance = Infinity;

    parkingDataset.features.forEach(parking => {
      const coords = parking.geometry?.coordinates;
      if (coords) {
        const distance = this.calculateDistance(coordinates, coords);
        if (distance < minDistance && distance < 0.5) { // Within 500m
          minDistance = distance;
          nearest = coords;
        }
      }
    });

    return nearest || coordinates;
  }

  // Find accessible bus stop near coordinates
  findAccessibleBusStop(coordinates) {
    const stopsDataset = this.datasets['transit_stops'];
    if (!stopsDataset || !stopsDataset.features) {
      return coordinates; // Fallback to coordinates
    }

    let nearest = null;
    let minDistance = Infinity;

    stopsDataset.features.forEach(stop => {
      const coords = stop.geometry?.coordinates;
      if (coords && stop.properties?.accessible) {
        const distance = this.calculateDistance(coordinates, coords);
        if (distance < minDistance && distance < 0.3) { // Within 300m
          minDistance = distance;
          nearest = coords;
        }
      }
    });

    return nearest || coordinates;
  }

  // Find transit route between stops
  findTransitRoute(originStop, destStop) {
    // This would typically query a transit API
    // For now, return a direct line between stops
    return [originStop, destStop];
  }

  // Assess route accessibility
  assessRouteAccessibility(coordinates) {
    let issues = [];
    let score = 100;

    coordinates.forEach(coord => {
      const key = `${coord[0]},${coord[1]}`;
      const feature = this.accessibilityFeatures.get(key);
      
      if (feature) {
        issues.push({
          type: feature.type,
          severity: feature.severity,
          location: coord
        });
        
        // Reduce score based on severity
        switch (feature.severity) {
          case 'low':
            score -= 5;
            break;
          case 'medium':
            score -= 15;
            break;
          case 'high':
            score -= 30;
            break;
          case 'critical':
            score -= 50;
            break;
        }
      }
    });

    return {
      score: Math.max(0, score),
      issues: issues,
      level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor'
    };
  }

  // Assess bike infrastructure
  async assessBikeInfrastructure(route) {
    // This would analyze bike lanes, paths, etc.
    return {
      accessibility: { score: 85, issues: [], level: 'good' },
      infrastructure: {
        bikeLanes: 0.7,
        bikePaths: 0.3,
        bikeFriendly: true
      }
    };
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

  // Estimate transit time
  estimateTransitTime(route) {
    // This would use actual transit schedules
    return 15 * 60; // 15 minutes in seconds
  }

  // Geocode address (delegates to geocoding service)
  async geocode(address) {
    // This would typically use the geocoding service
    // For now, return mock coordinates
    return [-63.5756, 44.6475]; // Halifax center
  }

  // Clean route cache
  cleanRouteCache() {
    const entries = Array.from(this.routeCache.entries());
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2)); // Remove 20%
    
    toRemove.forEach(([key]) => {
      this.routeCache.delete(key);
    });
  }

  // Get service statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      routeCacheSize: this.routeCache.size,
      datasetCacheSize: this.datasetCache.size,
      spatialIndexSize: this.spatialIndex.size,
      accessibilityFeatures: this.accessibilityFeatures.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      isInitialized: this.isInitialized
    };
  }
}

const routingService = new RoutingService();
export default routingService;
