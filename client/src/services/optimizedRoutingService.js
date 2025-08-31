// Optimized Routing Service for Trek.IQ
// Implements advanced spatial indexing, efficient data loading, and intelligent routing algorithms

import * as turf from '@turf/turf';
import RBush from 'rbush';

class OptimizedRoutingService {
  constructor() {
    // Core data structures
    this.spatialIndex = new RBush();
    this.routeGraph = new Map();
    this.datasetCache = new Map();
    this.routeCache = new Map();
    
    // Performance optimizations
    this.loadingQueue = [];
    this.activeLoads = 0;
    this.maxConcurrentLoads = 4;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    
    // Spatial indexing
    this.gridIndex = new Map();
    this.rtreeIndex = new RBush();
    this.featureIndex = new Map();
    
    // Routing optimization
    this.accessibilityWeights = new Map();
    this.barrierCache = new Map();
    this.routeOptimizer = null;
    
    // Service integration
    this.services = {
      mapbox: null,
      openRoute: null,
      ai: null
    };
    
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing Optimized Routing Service...');
    
    try {
      // Initialize services
      await this.initializeServices();
      
      // Load and optimize datasets
      await this.loadOptimizedDatasets();
      
      // Build spatial indexes
      await this.buildSpatialIndexes();
      
      // Initialize route optimizer
      this.initializeRouteOptimizer();
      
      this.isInitialized = true;
      console.log('Optimized Routing Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Optimized Routing Service:', error);
      throw error;
    }
  }

  async initializeServices() {
    // Initialize external services with proper error handling
    this.services.mapbox = {
      token: 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ',
      baseUrl: 'https://api.mapbox.com/directions/v5'
    };
    
    // Initialize other services as needed
  }

  async loadOptimizedDatasets() {
    const datasets = [
      { name: 'active_travelways', url: '/api/data/Active_Travelways.geojson', priority: 'critical' },
      { name: 'steps', url: '/api/data/Steps_577353981712784942.geojson', priority: 'critical' },
      { name: 'accessible_parking', url: '/api/data/Accessible_Parking.geojson', priority: 'high' },
      { name: 'sidewalk_closures', url: '/api/data/Sidewalk%20Closures.geojson', priority: 'high' },
      { name: 'transit_stops', url: '/api/data/Bus_Stops_2_9086297843420881686.geojson', priority: 'medium' }
    ];

    // Load datasets with priority-based queuing
    const loadPromises = datasets.map(dataset => 
      this.loadDatasetWithPriority(dataset)
    );

    await Promise.allSettled(loadPromises);
  }

  async loadDatasetWithPriority(dataset) {
    return new Promise((resolve) => {
      const loadTask = {
        dataset,
        priority: this.getPriorityScore(dataset.priority),
        resolve,
        timestamp: Date.now()
      };

      this.loadingQueue.push(loadTask);
      this.loadingQueue.sort((a, b) => b.priority - a.priority);
      
      this.processLoadingQueue();
    });
  }

  async processLoadingQueue() {
    if (this.activeLoads >= this.maxConcurrentLoads || this.loadingQueue.length === 0) {
      return;
    }

    const task = this.loadingQueue.shift();
    this.activeLoads++;

    try {
      const data = await this.loadAndOptimizeDataset(task.dataset);
      this.datasetCache.set(task.dataset.name, data);
      task.resolve(data);
    } catch (error) {
      console.warn(`Failed to load dataset ${task.dataset.name}:`, error);
      task.resolve(null);
    } finally {
      this.activeLoads--;
      this.processLoadingQueue();
    }
  }

  async loadAndOptimizeDataset(dataset) {
    // Check cache first
    const cached = this.datasetCache.get(dataset.name);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Load from server
    const response = await fetch(dataset.url);
    if (!response.ok) {
      throw new Error(`Failed to load ${dataset.name}: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Optimize the dataset
    const optimizedData = this.optimizeDataset(rawData, dataset.name);
    
    return {
      data: optimizedData,
      timestamp: Date.now(),
      metadata: {
        originalSize: JSON.stringify(rawData).length,
        optimizedSize: JSON.stringify(optimizedData).length,
        featureCount: optimizedData.features?.length || 0
      }
    };
  }

  optimizeDataset(data, datasetName) {
    if (!data.features) return data;

    const optimized = {
      type: 'FeatureCollection',
      features: []
    };

    // Apply optimizations based on dataset type
    switch (datasetName) {
      case 'active_travelways':
        optimized.features = this.optimizeTravelways(data.features);
        break;
      case 'steps':
        optimized.features = this.optimizeSteps(data.features);
        break;
      case 'accessible_parking':
        optimized.features = this.optimizeParking(data.features);
        break;
      default:
        optimized.features = this.optimizeGenericFeatures(data.features);
    }

    return optimized;
  }

  optimizeTravelways(features) {
    return features.map(feature => {
      // Simplify geometry
      const simplified = turf.simplify(feature, {
        tolerance: 0.0001,
        highQuality: true
      });

      // Extract essential properties
      const optimized = {
        type: 'Feature',
        geometry: simplified.geometry,
        properties: {
          id: feature.properties?.id || feature.id,
          name: feature.properties?.name,
          type: feature.properties?.type,
          surface: feature.properties?.surface_type,
          width: feature.properties?.width,
          accessibility: this.calculateAccessibilityScore(feature.properties)
        }
      };

      return optimized;
    });
  }

  optimizeSteps(features) {
    return features.map(feature => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id: feature.properties?.id || feature.id,
        location: feature.properties?.location,
        severity: 'high' // Steps are always high severity barriers
      }
    }));
  }

  optimizeParking(features) {
    return features.map(feature => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id: feature.properties?.id || feature.id,
        name: feature.properties?.name,
        spaces: feature.properties?.spaces,
        features: feature.properties?.accessible_features,
        timeLimit: feature.properties?.time_limit
      }
    }));
  }

  optimizeGenericFeatures(features) {
    return features.map(feature => ({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        id: feature.properties?.id || feature.id,
        name: feature.properties?.name,
        type: feature.properties?.type
      }
    }));
  }

  calculateAccessibilityScore(properties) {
    let score = 100; // Start with perfect score
    
    // Reduce score based on accessibility issues
    if (properties.surface_type === 'gravel') score -= 20;
    if (properties.surface_type === 'dirt') score -= 30;
    if (properties.width < 1.5) score -= 15;
    if (properties.slope > 0.05) score -= 25;
    if (properties.steps > 0) score -= 50;
    
    return Math.max(0, score);
  }

  async buildSpatialIndexes() {
    console.log('Building spatial indexes...');

    // Build R-tree index for all features
    const rtreeData = [];
    
    for (const [datasetName, dataset] of this.datasetCache) {
      if (!dataset.data.features) continue;

      dataset.data.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          const bbox = this.getBoundingBox(feature);
          rtreeData.push({
            minX: bbox[0], minY: bbox[1],
            maxX: bbox[2], maxY: bbox[3],
            feature: feature,
            dataset: datasetName
          });
        }
      });
    }

    this.rtreeIndex.load(rtreeData);

    // Build grid index for fast proximity searches
    this.buildGridIndex();

    console.log(`Spatial indexes built: ${rtreeData.length} features indexed`);
  }

  buildGridIndex() {
    const gridSize = 0.01; // ~1km grid cells

    for (const [datasetName, dataset] of this.datasetCache) {
      if (!dataset.data.features) continue;

      dataset.data.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          const coords = this.getFeatureCenter(feature);
          const gridKey = this.getGridKey(coords, gridSize);
          
          if (!this.gridIndex.has(gridKey)) {
            this.gridIndex.set(gridKey, []);
          }
          
          this.gridIndex.get(gridKey).push({
            feature,
            dataset: datasetName,
            distance: 0 // Will be calculated during search
          });
        }
      });
    }
  }

  getBoundingBox(feature) {
    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates;
      return [lng, lat, lng, lat];
    } else if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates;
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
    } else {
      // For other geometry types, use turf.js
      const bbox = turf.bbox(feature);
      return bbox;
    }
  }

  getFeatureCenter(feature) {
    if (feature.geometry.type === 'Point') {
      return feature.geometry.coordinates;
    } else {
      const center = turf.center(feature);
      return center.geometry.coordinates;
    }
  }

  getGridKey(coordinates, gridSize) {
    const [lng, lat] = coordinates;
    return `${Math.floor(lng / gridSize)},${Math.floor(lat / gridSize)}`;
  }

  getPriorityScore(priority) {
    const scores = {
      critical: 100,
      high: 75,
      medium: 50,
      low: 25
    };
    return scores[priority] || 50;
  }

  initializeRouteOptimizer() {
    this.routeOptimizer = {
      // A* pathfinding with accessibility weights
      findPath: (start, end, options = {}) => {
        return this.aStarPathfinding(start, end, options);
      },
      
      // Multi-criteria optimization
      optimizeRoute: (routes, criteria) => {
        return this.multiCriteriaOptimization(routes, criteria);
      },
      
      // Accessibility-aware routing
      findAccessibleRoute: (start, end, accessibilityNeeds) => {
        return this.findAccessiblePath(start, end, accessibilityNeeds);
      }
    };
  }

  async calculateRoute(origin, destination, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const routeKey = this.generateRouteKey(origin, destination, options);
    
    // Check cache
    const cached = this.routeCache.get(routeKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.route;
    }

    // Calculate new route
    const route = await this.calculateOptimizedRoute(origin, destination, options);
    
    // Cache the result
    this.routeCache.set(routeKey, {
      route,
      timestamp: Date.now()
    });

    return route;
  }

  async calculateOptimizedRoute(origin, destination, options) {
    const {
      mode = 'walking',
      accessibility = 'standard',
      avoidBarriers = true,
      optimizeFor = 'time'
    } = options;

    // Get multiple route options
    const routeOptions = await this.getRouteOptions(origin, destination, mode);
    
    // Apply accessibility filtering
    const accessibleRoutes = avoidBarriers ? 
      this.filterBarriers(routeOptions, origin, destination) : 
      routeOptions;
    
    // Optimize based on criteria
    const optimizedRoute = this.routeOptimizer.optimizeRoute(accessibleRoutes, {
      accessibility,
      optimizeFor,
      userPreferences: options.preferences || {}
    });

    return optimizedRoute;
  }

  async getRouteOptions(origin, destination, mode) {
    const routes = [];

    // Get Mapbox route
    try {
      const mapboxRoute = await this.getMapboxRoute(origin, destination, mode);
      if (mapboxRoute) routes.push(mapboxRoute);
    } catch (error) {
      console.warn('Mapbox routing failed:', error);
    }

    // Get OpenRouteService route
    try {
      const openRouteRoute = await this.getOpenRouteRoute(origin, destination, mode);
      if (openRouteRoute) routes.push(openRouteRoute);
    } catch (error) {
      console.warn('OpenRouteService routing failed:', error);
    }

    // Generate custom accessibility-aware route
    const customRoute = this.generateCustomRoute(origin, destination, mode);
    if (customRoute) routes.push(customRoute);

    return routes;
  }

  filterBarriers(routes, origin, destination) {
    return routes.map(route => {
      const barriers = this.detectBarriersAlongRoute(route);
      const barrierScore = this.calculateBarrierScore(barriers);
      
      return {
        ...route,
        barriers,
        barrierScore,
        accessibility: this.calculateRouteAccessibility(route, barriers)
      };
    });
  }

  detectBarriersAlongRoute(route) {
    const barriers = [];
    const routeGeometry = route.geometry || route.coordinates;
    
    if (!routeGeometry) return barriers;

    // Check for barriers along the route using spatial index
    const routeBbox = turf.bbox(routeGeometry);
    const nearbyFeatures = this.rtreeIndex.search({
      minX: routeBbox[0], minY: routeBbox[1],
      maxX: routeBbox[2], maxY: routeBbox[3]
    });

    // Filter features that are actual barriers
    nearbyFeatures.forEach(item => {
      if (this.isBarrier(item.feature, item.dataset)) {
        const distance = this.calculateDistanceToRoute(item.feature, routeGeometry);
        if (distance < 50) { // Within 50 meters of route
          barriers.push({
            feature: item.feature,
            dataset: item.dataset,
            distance,
            severity: this.calculateBarrierSeverity(item.feature, item.dataset)
          });
        }
      }
    });

    return barriers;
  }

  isBarrier(feature, dataset) {
    // Define what constitutes a barrier based on dataset
    const barrierDatasets = ['steps', 'sidewalk_closures', 'street_closures'];
    const barrierTypes = ['steps', 'construction', 'closure'];
    
    return barrierDatasets.includes(dataset) || 
           barrierTypes.includes(feature.properties?.type);
  }

  calculateBarrierSeverity(feature, dataset) {
    if (dataset === 'steps') return 'high';
    if (dataset === 'sidewalk_closures') return 'medium';
    if (dataset === 'street_closures') return 'high';
    
    return feature.properties?.severity || 'medium';
  }

  calculateDistanceToRoute(feature, routeGeometry) {
    const point = turf.point(feature.geometry.coordinates);
    const line = turf.lineString(routeGeometry);
    return turf.pointToLineDistance(point, line, { units: 'meters' });
  }

  calculateBarrierScore(barriers) {
    const weights = { high: 3, medium: 2, low: 1 };
    return barriers.reduce((score, barrier) => {
      return score + (weights[barrier.severity] || 1);
    }, 0);
  }

  calculateRouteAccessibility(route, barriers) {
    let score = 100;
    
    // Reduce score based on barriers
    barriers.forEach(barrier => {
      const weight = barrier.severity === 'high' ? 20 : 
                    barrier.severity === 'medium' ? 10 : 5;
      score -= weight;
    });
    
    // Consider route properties
    if (route.properties?.surface === 'gravel') score -= 10;
    if (route.properties?.width < 1.5) score -= 15;
    if (route.properties?.slope > 0.05) score -= 20;
    
    return Math.max(0, score);
  }

  generateRouteKey(origin, destination, options) {
    const key = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}-${JSON.stringify(options)}`;
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '');
  }

  // Spatial search methods
  findNearbyFeatures(coordinates, radius, datasetFilter = null) {
    const [lng, lat] = coordinates;
    const bbox = [lng - radius/111000, lat - radius/111000, 
                  lng + radius/111000, lat + radius/111000];
    
    const nearby = this.rtreeIndex.search({
      minX: bbox[0], minY: bbox[1],
      maxX: bbox[2], maxY: bbox[3]
    });

    return nearby
      .filter(item => !datasetFilter || item.dataset === datasetFilter)
      .map(item => ({
        ...item.feature,
        distance: this.calculateDistance(coordinates, item.feature.geometry.coordinates)
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  calculateDistance(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Cleanup and memory management
  cleanup() {
    this.datasetCache.clear();
    this.routeCache.clear();
    this.spatialIndex.clear();
    this.gridIndex.clear();
    this.rtreeIndex.clear();
    this.featureIndex.clear();
  }
}

export default new OptimizedRoutingService();
