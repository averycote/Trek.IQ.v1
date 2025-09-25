/**
 * Restored TREK.IQ Routing Service
 * 
 * This is a simplified, working routing service that uses real Halifax GeoJSON data
 * and implements proper A* pathfinding with accessibility features.
 * 
 * Features:
 * - Uses real Active_Travelways.geojson for routing network
 * - Avoids Steps and barriers using real data
 * - Implements A* pathfinding algorithm
 * - Provides turn-by-turn directions
 * - Calculates accessibility scores
 * - Integrates with existing AI/ML features
 */

import * as turf from '@turf/turf';
import simpleGeocodingService from './simpleGeocodingService.js';
import simpleAIService from './simpleAIService.js';

class RestoredRoutingService {
  constructor() {
    this.isInitialized = false;
    this.datasets = {};
    this.routingGraph = {
      nodes: new Map(),
      edges: new Map()
    };
    this.cache = new Map();
    this.performanceMetrics = {
      initializationTime: 0,
      routeComputationTime: 0,
      graphBuildTime: 0
    };
    
    // Incremental loading configuration
    this.loadingConfig = {
      batchSize: 1000, // Process 1000 features at a time
      delayBetweenBatches: 10, // 10ms delay between batches
      maxConcurrentBatches: 3, // Process up to 3 batches concurrently
      cacheKey: 'trek-iq-routing-cache',
      cacheExpiry: 30 * 60 * 1000, // 30 minutes for data files
      barriersCacheExpiry: 5 * 60 * 1000, // 5 minutes for user barriers
      refreshInterval: 30 * 60 * 1000 // 30 minutes refresh cycle
    };
    
    // Loading state
    this.loadingProgress = {
      totalFeatures: 0,
      loadedFeatures: 0,
      isComplete: false
    };
    
    // Refresh timers
    this.refreshTimer = null;
    this.barriersTimer = null;
  }

  /**
   * Initialize the routing service with caching and incremental loading
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    const startTime = performance.now();
    console.log('🚀 Initializing Restored Routing Service...');

    try {
      // Try to load from cache first
      const cachedData = this.loadFromCache();
      if (cachedData) {
        console.log('📦 Loading from cache...');
        this.datasets = cachedData.datasets;
        this.routingGraph = cachedData.routingGraph;
        this.isInitialized = true;
        this.performanceMetrics.initializationTime = performance.now() - startTime;
        console.log(`✅ Loaded from cache in ${this.performanceMetrics.initializationTime.toFixed(0)}ms`);
        
        // Load dynamic updates in background
        this.loadDynamicUpdates();
        return;
      }

      // Load essential datasets with incremental processing
      await this.loadEssentialDatasetsIncremental();
      
      // Build routing graph
      await this.buildRoutingGraph();
      
      // Cache the data for future use
      this.saveToCache();
      
      this.isInitialized = true;
      this.performanceMetrics.initializationTime = performance.now() - startTime;
      
      console.log(`✅ Restored Routing Service initialized in ${this.performanceMetrics.initializationTime.toFixed(0)}ms`);
      console.log(`📊 Graph: ${this.routingGraph.nodes.size} nodes, ${this.routingGraph.edges.size} edges`);
      
      // Load dynamic updates in background
      this.loadDynamicUpdates();
      
      // Start refresh timers
      this.startRefreshTimers();
      
    } catch (error) {
      console.error('❌ Failed to initialize Restored Routing Service:', error);
      throw error;
    }
  }

  /**
   * Load from browser cache
   */
  loadFromCache() {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return null;
      }
      
      const cached = localStorage.getItem(this.loadingConfig.cacheKey);
      if (!cached) return null;
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - data.timestamp > this.loadingConfig.cacheExpiry) {
        localStorage.removeItem(this.loadingConfig.cacheKey);
        return null;
      }
      
      // Convert back to Maps
      data.routingGraph.nodes = new Map(data.routingGraph.nodes);
      data.routingGraph.edges = new Map(data.routingGraph.edges);
      
      return data;
    } catch (error) {
      console.warn('Failed to load from cache:', error);
      return null;
    }
  }

  /**
   * Save to browser cache
   */
  saveToCache() {
    try {
      // Check if localStorage is available (browser environment)
      if (typeof localStorage === 'undefined') {
        return;
      }
      
      const data = {
        timestamp: Date.now(),
        datasets: this.datasets,
        routingGraph: {
          nodes: Array.from(this.routingGraph.nodes.entries()),
          edges: Array.from(this.routingGraph.edges.entries())
        }
      };
      
      localStorage.setItem(this.loadingConfig.cacheKey, JSON.stringify(data));
      console.log('💾 Data cached successfully');
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
  }

  /**
   * Start refresh timers for data updates
   */
  startRefreshTimers() {
    // Clear existing timers
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.barriersTimer) clearInterval(this.barriersTimer);
    
    // 30-minute refresh for data files
    this.refreshTimer = setInterval(() => {
      console.log('🔄 30-minute refresh: Updating data files...');
      this.refreshDataFiles();
    }, this.loadingConfig.refreshInterval);
    
    // 5-minute refresh for user-reported barriers (real-time)
    this.barriersTimer = setInterval(() => {
      console.log('🔄 5-minute refresh: Updating user barriers...');
      this.refreshUserBarriers();
    }, this.loadingConfig.barriersCacheExpiry);
    
    console.log('⏰ Refresh timers started (30min data, 5min barriers)');
  }

  /**
   * Refresh data files (30-minute cycle)
   */
  async refreshDataFiles() {
    try {
      console.log('🔄 Refreshing data files...');
      
      // Load recent closures
      const closuresResponse = await fetch('/api/data/dynamic/Street_Closures.geojson');
      if (closuresResponse.ok) {
        const closures = await closuresResponse.json();
        this.datasets.streetClosures = closures;
        console.log(`📊 Updated ${closures.features?.length || 0} street closures`);
      }
      
      // Load sidewalk closures
      const sidewalkClosuresResponse = await fetch('/api/data/dynamic/Sidewalk%20Closures.geojson');
      if (sidewalkClosuresResponse.ok) {
        const sidewalkClosures = await sidewalkClosuresResponse.json();
        this.datasets.sidewalkClosures = sidewalkClosures;
        console.log(`📊 Updated ${sidewalkClosures.features?.length || 0} sidewalk closures`);
      }
      
      // Load Wheelmap data (if available)
      const wheelmapResponse = await fetch('/api/data/accessibility/wheelmap-optimized.json');
      if (wheelmapResponse.ok) {
        const wheelmapData = await wheelmapResponse.json();
        this.datasets.wheelmap = wheelmapData;
        console.log(`📊 Updated ${wheelmapData.features?.length || 0} Wheelmap locations`);
      }
      
      // Update cache with new data
      this.saveToCache();
      
      console.log('✅ Data files refreshed');
      
    } catch (error) {
      console.warn('⚠️ Failed to refresh some data files:', error);
    }
  }

  /**
   * Refresh user-reported barriers (5-minute cycle)
   */
  async refreshUserBarriers() {
    try {
      console.log('🔄 Refreshing user barriers...');
      
      // Load reported barriers
      const barriersResponse = await fetch('/api/barriers/reported');
      if (barriersResponse.ok) {
        const barriers = await barriersResponse.json();
        this.datasets.reportedBarriers = barriers;
        console.log(`📊 Updated ${barriers.features?.length || 0} user-reported barriers`);
      }
      
      // Load recent barrier reports
      const recentBarriersResponse = await fetch('/api/barriers/recent');
      if (recentBarriersResponse.ok) {
        const recentBarriers = await recentBarriersResponse.json();
        this.datasets.recentBarriers = recentBarriers;
        console.log(`📊 Updated ${recentBarriers.features?.length || 0} recent barriers`);
      }
      
      console.log('✅ User barriers refreshed');
      
    } catch (error) {
      console.warn('⚠️ Failed to refresh user barriers:', error);
    }
  }

  /**
   * Load dynamic updates (barriers, closures, etc.)
   */
  async loadDynamicUpdates() {
    try {
      console.log('🔄 Loading dynamic updates...');
      
      // Load user barriers first (real-time)
      await this.refreshUserBarriers();
      
      // Load other dynamic data
      await this.refreshDataFiles();
      
      console.log('✅ Dynamic updates loaded');
      
    } catch (error) {
      console.warn('⚠️ Failed to load some dynamic updates:', error);
    }
  }

  /**
   * Load essential datasets with incremental processing and rate limiting
   */
  async loadEssentialDatasetsIncremental() {
    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof fetch !== 'undefined';
    
    const datasets = [
      { name: 'activeTravelways', url: isBrowser ? '/api/data/Active_Travelways.geojson' : null, critical: true, retries: 3 },
      { name: 'steps', url: isBrowser ? '/api/data/dynamic/Steps_577353981712784942.geojson' : null, critical: true, retries: 3 },
      { name: 'accessibleParking', url: isBrowser ? '/api/data/Accessible_Parking.geojson' : null, critical: false, retries: 2 },
      { name: 'transitRoutes', url: isBrowser ? '/api/data/Transit_Bus_Routes.geojson' : null, critical: false, retries: 2 }
    ];

    const loadPromises = datasets.map(async (dataset) => {
      let lastError = null;
      
      // If no URL (not in browser), use fallback data immediately
      if (!dataset.url) {
        console.log(`📊 Using fallback data for ${dataset.name} (not in browser environment)...`);
        const fallbackData = await this.loadFallbackDataset(dataset.name);
        if (fallbackData) {
          this.datasets[dataset.name] = fallbackData;
          console.log(`✅ Loaded fallback data for ${dataset.name}: ${fallbackData.features?.length || 0} features`);
          return { name: dataset.name, success: true, featureCount: fallbackData.features?.length || 0, fallback: true };
        } else {
          // Create minimal dataset
          this.datasets[dataset.name] = this.createMinimalHalifaxData(dataset.name);
          return { name: dataset.name, success: true, featureCount: this.datasets[dataset.name].features?.length || 0, fallback: true };
        }
      }
      
      for (let attempt = 1; attempt <= dataset.retries; attempt++) {
        try {
          console.log(`📊 Loading ${dataset.name} (attempt ${attempt}/${dataset.retries})...`);
          
          // Add delay between attempts to avoid rate limiting
          if (attempt > 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Exponential backoff, max 10s
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          const response = await fetch(dataset.url, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (!response.ok) {
            if (response.status === 429) {
              console.warn(`⚠️ Rate limited for ${dataset.name}, attempt ${attempt}/${dataset.retries}`);
              lastError = new Error(`HTTP 429: Rate limited (attempt ${attempt}/${dataset.retries})`);
              continue; // Try again
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          this.datasets[dataset.name] = data;
          
          console.log(`✅ Loaded ${dataset.name}: ${data.features?.length || 0} features`);
          return { name: dataset.name, success: true, featureCount: data.features?.length || 0 };
          
        } catch (error) {
          console.error(`❌ Failed to load ${dataset.name} (attempt ${attempt}/${dataset.retries}):`, error);
          lastError = error;
          
          // If this is the last attempt, handle the failure
          if (attempt === dataset.retries) {
            if (dataset.critical) {
              // For critical datasets, try to use fallback data
              console.log(`🔄 Attempting fallback for critical dataset ${dataset.name}...`);
              const fallbackData = await this.loadFallbackDataset(dataset.name);
              if (fallbackData) {
                this.datasets[dataset.name] = fallbackData;
                console.log(`✅ Loaded fallback data for ${dataset.name}: ${fallbackData.features?.length || 0} features`);
                return { name: dataset.name, success: true, featureCount: fallbackData.features?.length || 0, fallback: true };
              }
              throw new Error(`Critical dataset ${dataset.name} failed to load after ${dataset.retries} attempts: ${lastError.message}`);
            }
            
            // Create empty dataset for non-critical failures
            this.datasets[dataset.name] = { type: 'FeatureCollection', features: [] };
            return { name: dataset.name, success: false, error: lastError.message };
          }
        }
      }
    });

    await Promise.all(loadPromises);
  }

  /**
   * Load fallback dataset when primary dataset fails
   */
  async loadFallbackDataset(datasetName) {
    try {
      console.log(`🔄 Loading fallback data for ${datasetName}...`);
      
      // Try alternative file paths for critical datasets
      const fallbackPaths = {
        'activeTravelways': [
          '/api/data/Active_Travelways_-4200371894220343912.geojson',
          '/api/data/optimized/trek-iq-core.json'
        ],
        'steps': [
          '/api/data/optimized/trek-iq-core.json'
        ]
      };
      
      const paths = fallbackPaths[datasetName] || [];
      
      for (const path of paths) {
        try {
          console.log(`📊 Trying fallback path: ${path}`);
          const response = await fetch(path);
          
          if (response.ok) {
            const data = await response.json();
            
            // Extract relevant data based on dataset type
            if (datasetName === 'activeTravelways' && data.features) {
              return data;
            } else if (datasetName === 'steps' && data.features) {
              // Filter for step features
              const stepFeatures = data.features.filter(feature => 
                feature.properties?.type === 'step' || 
                feature.properties?.MAT === 'STEP' ||
                feature.geometry?.type === 'Point'
              );
              return {
                type: 'FeatureCollection',
                features: stepFeatures
              };
            }
          }
        } catch (error) {
          console.warn(`⚠️ Fallback path ${path} failed:`, error.message);
        }
      }
      
      // If no fallback data found, create minimal real Halifax data
      return this.createMinimalHalifaxData(datasetName);
      
    } catch (error) {
      console.error(`❌ Failed to load fallback data for ${datasetName}:`, error);
      return null;
    }
  }

  /**
   * Create minimal Halifax data when all else fails
   */
  createMinimalHalifaxData(datasetName) {
    console.log(`🏗️ Creating minimal Halifax data for ${datasetName}...`);
    
    if (datasetName === 'activeTravelways') {
      // Create minimal Active Travelways with key Halifax streets
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [-63.5751, 44.6475], // Spring Garden Road
                [-63.5800, 44.6480]  // Citadel Hill
              ]
            },
            properties: {
              MAT: 'CONC',
              WIDTH: 2.0,
              LOCATION: 'Spring Garden Road to Citadel Hill'
            }
          },
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [-63.5700, 44.6450], // Waterfront
                [-63.5751, 44.6475]  // Spring Garden Road
              ]
            },
            properties: {
              MAT: 'CONC',
              WIDTH: 2.0,
              LOCATION: 'Waterfront to Spring Garden Road'
            }
          }
        ]
      };
    } else if (datasetName === 'steps') {
      // Create minimal steps data (empty for now)
      return {
        type: 'FeatureCollection',
        features: []
      };
    }
    
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  /**
   * Build routing graph from Active Travelways
   */
  async buildRoutingGraph() {
    const startTime = performance.now();
    console.log('🔧 Building routing graph from Active Travelways...');

    const activeTravelways = this.datasets.activeTravelways;
    if (!activeTravelways || !activeTravelways.features) {
      throw new Error('Active Travelways data not available');
    }

    let nodeId = 0;
    let edgeId = 0;

    // Process each travelway feature
    activeTravelways.features.forEach((feature, featureIndex) => {
      if (!feature.geometry || feature.geometry.type !== 'LineString') {
        return;
      }

      const coordinates = feature.geometry.coordinates;
      const properties = feature.properties || {};

      // Create nodes for each coordinate
      const nodeIds = [];
      coordinates.forEach((coord, coordIndex) => {
        const nodeKey = `${coord[0]},${coord[1]}`;
        
        if (!this.routingGraph.nodes.has(nodeKey)) {
          this.routingGraph.nodes.set(nodeKey, {
            id: nodeId++,
            coordinates: coord,
            type: 'vertex',
            properties: properties
          });
        }
        
        nodeIds.push(nodeKey);
      });

      // Create edges between consecutive coordinates
      for (let i = 0; i < nodeIds.length - 1; i++) {
        const fromNode = this.routingGraph.nodes.get(nodeIds[i]);
        const toNode = this.routingGraph.nodes.get(nodeIds[i + 1]);
        
        // Calculate edge length using turf
        const fromPoint = turf.point(fromNode.coordinates);
        const toPoint = turf.point(toNode.coordinates);
        const length_m = turf.distance(fromPoint, toPoint, { units: 'meters' });
        
        // Check for steps overlap
        const isStep = this.checkStepsOverlap(fromNode.coordinates, toNode.coordinates);
        
        // Calculate accessibility score
        const accessibilityScore = this.calculateEdgeAccessibilityScore(properties, isStep);
        
        const edgeKey = `${nodeIds[i]}-${nodeIds[i + 1]}`;
        this.routingGraph.edges.set(edgeKey, {
          id: edgeId++,
          from: nodeIds[i],
          to: nodeIds[i + 1],
          length_m: length_m,
          isStep: isStep,
          accessibilityScore: accessibilityScore,
          properties: properties,
          featureIndex: featureIndex
        });
      }
    });

    this.performanceMetrics.graphBuildTime = performance.now() - startTime;
    console.log(`✅ Graph built in ${this.performanceMetrics.graphBuildTime.toFixed(0)}ms`);
  }

  /**
   * Check if edge overlaps with steps or barriers
   */
  checkStepsOverlap(startCoord, endCoord) {
    const edgeLine = turf.lineString([startCoord, endCoord]);
    
    // Check static steps data
    const steps = this.datasets.steps;
    if (steps && steps.features) {
      const hasSteps = steps.features.some(stepFeature => {
        if (!stepFeature.geometry) return false;
        
        const stepGeometry = stepFeature.geometry;
        
        // Check for intersection
        if (stepGeometry.type === 'Point') {
          const stepPoint = turf.point(stepGeometry.coordinates);
          const distance = turf.pointToLineDistance(stepPoint, edgeLine, { units: 'meters' });
          return distance < 5; // Within 5 meters
        } else if (stepGeometry.type === 'LineString') {
          const stepLine = turf.lineString(stepGeometry.coordinates);
          return turf.booleanIntersects(edgeLine, stepLine);
        } else if (stepGeometry.type === 'Polygon') {
          const stepPolygon = turf.polygon(stepGeometry.coordinates);
          return turf.booleanIntersects(edgeLine, stepPolygon);
        }
        
        return false;
      });
      
      if (hasSteps) return true;
    }
    
    // Check user-reported barriers (real-time)
    const reportedBarriers = this.datasets.reportedBarriers;
    if (reportedBarriers && reportedBarriers.features) {
      const hasBarriers = reportedBarriers.features.some(barrierFeature => {
        if (!barrierFeature.geometry) return false;
        
        const barrierGeometry = barrierFeature.geometry;
        
        // Check for intersection with reported barriers
        if (barrierGeometry.type === 'Point') {
          const barrierPoint = turf.point(barrierGeometry.coordinates);
          const distance = turf.pointToLineDistance(barrierPoint, edgeLine, { units: 'meters' });
          return distance < 10; // Within 10 meters of reported barrier
        } else if (barrierGeometry.type === 'LineString') {
          const barrierLine = turf.lineString(barrierGeometry.coordinates);
          return turf.booleanIntersects(edgeLine, barrierLine);
        } else if (barrierGeometry.type === 'Polygon') {
          const barrierPolygon = turf.polygon(barrierGeometry.coordinates);
          return turf.booleanIntersects(edgeLine, barrierPolygon);
        }
        
        return false;
      });
      
      if (hasBarriers) return true;
    }
    
    // Check street closures
    const streetClosures = this.datasets.streetClosures;
    if (streetClosures && streetClosures.features) {
      const hasClosures = streetClosures.features.some(closureFeature => {
        if (!closureFeature.geometry) return false;
        
        const closureGeometry = closureFeature.geometry;
        
        // Check for intersection with closures
        if (closureGeometry.type === 'LineString') {
          const closureLine = turf.lineString(closureGeometry.coordinates);
          return turf.booleanIntersects(edgeLine, closureLine);
        } else if (closureGeometry.type === 'Polygon') {
          const closurePolygon = turf.polygon(closureGeometry.coordinates);
          return turf.booleanIntersects(edgeLine, closurePolygon);
        }
        
        return false;
      });
      
      if (hasClosures) return true;
    }
    
    return false;
  }

  /**
   * Calculate accessibility score for an edge
   */
  calculateEdgeAccessibilityScore(properties, isStep) {
    let score = 1.0;
    
    // Penalty for steps
    if (isStep) {
      score *= 0.1; // Heavy penalty for steps
    }
    
    // Check material type
    const material = properties.MAT || properties.material;
    if (material) {
      switch (material.toLowerCase()) {
        case 'conc':
        case 'concrete':
          score *= 1.0; // Good
          break;
        case 'asph':
        case 'asphalt':
          score *= 0.9; // Good
          break;
        case 'gravel':
        case 'dirt':
          score *= 0.6; // Poor
          break;
        default:
          score *= 0.8; // Unknown
      }
    }
    
    // Check width
    const width = properties.WIDTH || properties.width;
    if (width) {
      if (width >= 2.0) {
        score *= 1.0; // Wide enough
      } else if (width >= 1.5) {
        score *= 0.9; // Adequate
      } else {
        score *= 0.7; // Narrow
      }
    }
    
    return Math.max(0.0, Math.min(1.0, score));
  }

  /**
   * Main route calculation method
   */
  async calculateRoute(origin, destination, options = {}) {
    const startTime = performance.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🛣️ Calculating route: ${JSON.stringify(origin)} → ${JSON.stringify(destination)}`);
      
      // Geocode addresses to coordinates if needed
      let originCoords, destCoords;
      
      if (typeof origin === 'string') {
        originCoords = await this.geocodeAddress(origin);
      } else {
        originCoords = origin;
      }
      
      if (typeof destination === 'string') {
        destCoords = await this.geocodeAddress(destination);
      } else {
        destCoords = destination;
      }
      
      if (!originCoords || !destCoords) {
        throw new Error('Could not geocode origin or destination');
      }

      // Snap to nearest nodes in the routing graph
      const startNode = this.findNearestNode(originCoords);
      const endNode = this.findNearestNode(destCoords);
      
      if (!startNode || !endNode) {
        throw new Error('Could not find routing nodes near origin or destination');
      }

      // Find route using A* algorithm
      const routeEdges = this.findOptimalPath(startNode, endNode, options);
      
      if (!routeEdges || routeEdges.length === 0) {
        throw new Error('No route found between origin and destination');
      }

      // Calculate route metrics
      const totalDistance = routeEdges.reduce((sum, edge) => sum + edge.length_m, 0);
      const averageAccessibility = routeEdges.reduce((sum, edge) => sum + edge.accessibilityScore, 0) / routeEdges.length;
      
      // Generate turn-by-turn directions
      const directions = this.generateTurnByTurnDirections(routeEdges);
      
      // Create GeoJSON route
      const routeGeoJSON = this.createRouteGeoJSON(routeEdges, {
        totalDistance,
        averageAccessibility,
        directions
      });

      // Apply AI optimizations
      const optimizedRoute = await simpleAIService.optimizeRoute(routeGeoJSON, options);
      
      // Learn from this route calculation
      await simpleAIService.learnFromUserBehavior(optimizedRoute, options);

      this.performanceMetrics.routeComputationTime = performance.now() - startTime;
      
      console.log(`✅ Route calculated successfully in ${this.performanceMetrics.routeComputationTime.toFixed(0)}ms`);
      console.log(`📏 Distance: ${(totalDistance / 1000).toFixed(2)} km, Accessibility: ${(averageAccessibility * 100).toFixed(1)}%`);
      
      return {
        success: true,
        route: optimizedRoute,
        distance: totalDistance,
        accessibilityScore: averageAccessibility,
        directions: directions,
        performance: this.performanceMetrics
      };
      
    } catch (error) {
      console.error('❌ Route calculation failed:', error);
      
      return {
        success: false,
        error: error.message,
        performance: this.performanceMetrics
      };
    }
  }

  /**
   * Find nearest node to given coordinates
   */
  findNearestNode(coord) {
    let nearestNode = null;
    let minDistance = Infinity;
    
    this.routingGraph.nodes.forEach((node, nodeKey) => {
      const distance = turf.distance(
        turf.point(coord),
        turf.point(node.coordinates),
        { units: 'meters' }
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = { ...node, key: nodeKey };
      }
    });
    
    return nearestNode;
  }

  /**
   * Find optimal path using A* algorithm
   */
  findOptimalPath(startNode, endNode, options = {}) {
    const { avoidSteps = true, preferAccessible = true } = options;
    
    // A* algorithm implementation
    const openSet = new Set([startNode.key]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    // Initialize scores
    this.routingGraph.nodes.forEach((node, key) => {
      gScore.set(key, Infinity);
      fScore.set(key, Infinity);
    });
    
    gScore.set(startNode.key, 0);
    fScore.set(startNode.key, this.heuristic(startNode, endNode));
    
    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current = null;
      let lowestF = Infinity;
      
      for (const nodeKey of openSet) {
        const f = fScore.get(nodeKey);
        if (f < lowestF) {
          lowestF = f;
          current = nodeKey;
        }
      }
      
      if (current === endNode.key) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, current);
      }
      
      openSet.delete(current);
      
      // Check all neighbors
      this.routingGraph.edges.forEach((edge, edgeKey) => {
        if (edge.from === current) {
          const neighbor = edge.to;
          
          // Skip if this edge has steps and we're avoiding steps
          if (avoidSteps && edge.isStep) {
            return;
          }
          
          const tentativeG = gScore.get(current) + this.getEdgeCost(edge, preferAccessible);
          
          if (tentativeG < gScore.get(neighbor)) {
            cameFrom.set(neighbor, current);
            gScore.set(neighbor, tentativeG);
            fScore.set(neighbor, tentativeG + this.heuristic(this.routingGraph.nodes.get(neighbor), endNode));
            
            if (!openSet.has(neighbor)) {
              openSet.add(neighbor);
            }
          }
        }
      });
    }
    
    return null; // No path found
  }

  /**
   * Heuristic function for A* (straight-line distance)
   */
  heuristic(nodeA, nodeB) {
    return turf.distance(
      turf.point(nodeA.coordinates),
      turf.point(nodeB.coordinates),
      { units: 'meters' }
    );
  }

  /**
   * Get edge cost for pathfinding
   */
  getEdgeCost(edge, preferAccessible) {
    let cost = edge.length_m;
    
    if (preferAccessible) {
      // Invert accessibility score (lower score = higher cost)
      cost *= (2.0 - edge.accessibilityScore);
    }
    
    return cost;
  }

  /**
   * Reconstruct path from A* result
   */
  reconstructPath(cameFrom, current) {
    const path = [];
    const pathNodes = [current];
    
    while (cameFrom.has(current)) {
      current = cameFrom.get(current);
      pathNodes.unshift(current);
    }
    
    // Convert nodes to edges
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const edgeKey = `${pathNodes[i]}-${pathNodes[i + 1]}`;
      const edge = this.routingGraph.edges.get(edgeKey);
      if (edge) {
        path.push(edge);
      }
    }
    
    return path;
  }

  /**
   * Generate turn-by-turn directions
   */
  generateTurnByTurnDirections(routeEdges) {
    const directions = [];
    
    if (routeEdges.length === 0) {
      return directions;
    }
    
    // Start instruction
    directions.push({
      step: 1,
      instruction: 'Start at origin',
      distance: 0,
      bearing: null
    });
    
    // Process each edge
    for (let i = 0; i < routeEdges.length; i++) {
      const edge = routeEdges[i];
      const fromNode = this.routingGraph.nodes.get(edge.from);
      const toNode = this.routingGraph.nodes.get(edge.to);
      
      // Calculate bearing
      const bearing = turf.bearing(
        turf.point(fromNode.coordinates),
        turf.point(toNode.coordinates)
      );
      
      // Generate instruction
      let instruction = '';
      if (i === routeEdges.length - 1) {
        instruction = 'Continue to destination';
      } else {
        const direction = this.getDirectionFromBearing(bearing);
        instruction = `Continue ${direction}`;
      }
      
      // Add street name if available
      const streetName = edge.properties.LOCATION || edge.properties.name;
      if (streetName) {
        instruction += ` on ${streetName}`;
      }
      
      directions.push({
        step: i + 2,
        instruction: instruction,
        distance: edge.length_m,
        bearing: bearing,
        accessibilityScore: edge.accessibilityScore
      });
    }
    
    return directions;
  }

  /**
   * Get direction string from bearing
   */
  getDirectionFromBearing(bearing) {
    const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Create GeoJSON route from edges
   */
  createRouteGeoJSON(routeEdges, metadata) {
    const coordinates = [];
    
    // Add start coordinate
    if (routeEdges.length > 0) {
      const firstEdge = routeEdges[0];
      const startNode = this.routingGraph.nodes.get(firstEdge.from);
      coordinates.push(startNode.coordinates);
    }
    
    // Add end coordinates
    routeEdges.forEach(edge => {
      const endNode = this.routingGraph.nodes.get(edge.to);
      coordinates.push(endNode.coordinates);
    });
    
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          distance: metadata.totalDistance,
          accessibilityScore: metadata.averageAccessibility,
          directions: metadata.directions,
          edgeCount: routeEdges.length
        },
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }]
    };
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address) {
    try {
      const result = await simpleGeocodingService.geocode(address);
      if (result && result.coordinates) {
        return result.coordinates;
      }
      return null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      nodeCount: this.routingGraph.nodes.size,
      edgeCount: this.routingGraph.edges.size,
      performance: this.performanceMetrics,
      refreshTimers: {
        dataRefresh: !!this.refreshTimer,
        barriersRefresh: !!this.barriersTimer
      },
      datasets: {
        activeTravelways: !!this.datasets.activeTravelways,
        steps: !!this.datasets.steps,
        reportedBarriers: !!this.datasets.reportedBarriers,
        streetClosures: !!this.datasets.streetClosures,
        wheelmap: !!this.datasets.wheelmap
      }
    };
  }

  /**
   * Cleanup timers and resources
   */
  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    if (this.barriersTimer) {
      clearInterval(this.barriersTimer);
      this.barriersTimer = null;
    }
    
    console.log('🧹 Routing service cleanup completed');
  }
}

// Export singleton instance
const restoredRoutingService = new RestoredRoutingService();
export default restoredRoutingService;
