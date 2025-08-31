// Enhanced Barrier Service for comprehensive barrier detection and analysis
import performanceService from './performanceService.js';

class BarrierService {
  constructor() {
    this.barriers = [];
    this.localBarriers = []; // From GeoJSON layers
    this.userReportedBarriers = []; // User-submitted barriers
    this.externalBarriers = []; // From external APIs
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Performance optimizations
    this.spatialIndex = new Map();
    this.barrierTypes = new Map();
    this.severityIndex = new Map();
    this.batchSize = 10;
    this.analysisCache = new Map();
    
    this.dataSources = {
      localLayers: ['steps', 'sidewalk_closures', 'traffic_control', 'winter_maintenance'],
      externalAPIs: ['mapillary', 'overpass', 'municipal_alerts'],
      userReports: true
    };
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      console.log('Initializing enhanced BarrierService...');
      
      // Load barriers from all sources in parallel
      await Promise.allSettled([
        this.loadLocalBarriers(),
        this.loadUserReportedBarriers(),
        this.loadExternalBarriers()
      ]);
      
      this.combineBarriers();
      this.buildSpatialIndex();
      this.buildTypeIndexes();
      
      this.isInitialized = true;
      console.log(`BarrierService initialized with ${this.barriers.length} total barriers`);
    } catch (error) {
      console.error('Failed to initialize BarrierService:', error);
      this.isInitialized = true; // Mark as initialized even if some sources fail
    }
  }

  // Load local barriers with performance optimizations
  async loadLocalBarriers() {
    const layerFiles = [
      { name: 'steps', url: '/api/data/Steps_577353981712784942.geojson', priority: 'critical' },
      { name: 'sidewalk_closures', url: '/api/data/Sidewalk%20Closures.geojson', priority: 'critical' },
      { name: 'traffic_control', url: '/api/data/Traffic_Control.geojson', priority: 'high' },
      { name: 'winter_maintenance', url: '/api/data/winter_maintenance.geojson', priority: 'medium' }
    ];

    // Load layers in batches for better performance
    const batchSize = 2;
    const batches = [];
    
    for (let i = 0; i < layerFiles.length; i += batchSize) {
      batches.push(layerFiles.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (layer) => {
        try {
          console.log(`Loading barrier layer: ${layer.name}`);
          
          // Use performance service for caching
          const data = await performanceService.getCachedData(
            `barrier_layer_${layer.name}`,
            async () => {
              const response = await fetch(layer.url);
              if (response.ok) {
                return response.json();
              } else {
                console.warn(`Failed to load ${layer.name}: HTTP ${response.status}`);
                return null;
              }
            },
            {
              ttl: 15 * 60 * 1000, // 15 minutes
              priority: layer.priority,
              useIndexedDB: true
            }
          );
          
          if (data) {
            const barriers = this.convertGeoJSONToBarriers(data, layer.name);
            this.localBarriers.push(...barriers);
            console.log(`Loaded ${barriers.length} barriers from ${layer.name}`);
          }
        } catch (error) {
          console.warn(`Failed to load ${layer.name}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Convert GeoJSON to barriers with performance optimizations
  convertGeoJSONToBarriers(geojson, source) {
    if (!geojson.features) return [];

    // Optimize GeoJSON data
    const optimizedData = performanceService.optimizeGeoJSON(geojson, {
      maxFeatures: 2000,
      simplifyTolerance: 0.0001,
      enableClustering: false
    });

    return optimizedData.features.map(feature => {
      const properties = feature.properties || {};
      const coordinates = feature.geometry?.coordinates;
      
      if (!coordinates) return null;

      return {
        id: `${source}_${feature.id || Math.random()}`,
        type: this.mapLayerToBarrierType(source, properties),
        severity: this.determineSeverity(source, properties),
        location: this.generateLocation(properties),
        description: this.generateDescription(source, properties),
        coordinates: Array.isArray(coordinates[0]) ? coordinates[0] : coordinates,
        source: source,
        properties: properties,
        timestamp: new Date().toISOString(),
        photo: properties.photo || null
      };
    }).filter(Boolean);
  }

  // Map layer to barrier type
  mapLayerToBarrierType(layer, properties) {
    const typeMap = {
      'steps': 'steps',
      'sidewalk_closures': 'sidewalk_closure',
      'traffic_control': 'traffic_control',
      'winter_maintenance': 'winter_hazard'
    };
    
    return typeMap[layer] || 'unknown';
  }

  // Determine severity based on source and properties
  determineSeverity(source, properties) {
    const severityMap = {
      'steps': properties.accessibility === 'limited' ? 'high' : 'medium',
      'sidewalk_closures': 'critical',
      'traffic_control': 'medium',
      'winter_maintenance': properties.condition === 'icy' ? 'high' : 'medium'
    };
    
    return severityMap[source] || 'medium';
  }

  // Generate location description
  generateLocation(properties) {
    return properties.address || properties.street_name || properties.location || 'Unknown location';
  }

  // Generate description
  generateDescription(source, properties) {
    const descriptions = {
      'steps': `Steps at ${properties.address || 'this location'} - ${properties.accessibility || 'standard'} accessibility`,
      'sidewalk_closures': `Sidewalk closure at ${properties.address || 'this location'} - ${properties.reason || 'construction'}`,
      'traffic_control': `Traffic control measure at ${properties.address || 'this location'}`,
      'winter_maintenance': `Winter maintenance issue at ${properties.address || 'this location'} - ${properties.condition || 'snow/ice'}`
    };
    
    return descriptions[source] || `Barrier at ${properties.address || 'this location'}`;
  }

  // Load user reported barriers with performance optimizations
  async loadUserReportedBarriers() {
    try {
      // Use performance service for caching
      const data = await performanceService.getCachedData(
        'user_reported_barriers',
        async () => {
          const response = await fetch('/api/barriers/user-reported');
          if (response.ok) {
            return response.json();
          } else {
            console.warn('Failed to load user-reported barriers:', response.status);
            return [];
          }
        },
        {
          ttl: 2 * 60 * 1000, // 2 minutes
          priority: 'high',
          useIndexedDB: true
        }
      );
      
      this.userReportedBarriers = data || [];
      console.log(`Loaded ${this.userReportedBarriers.length} user-reported barriers`);
    } catch (error) {
      console.warn('Failed to load user-reported barriers:', error);
      this.userReportedBarriers = [];
    }
  }

  // Load external barriers with performance optimizations
  async loadExternalBarriers() {
    try {
      // Load from multiple external sources in parallel
      const [mapillaryBarriers, overpassBarriers] = await Promise.allSettled([
        this.loadMapillaryBarriers(),
        this.loadOverpassBarriers()
      ]);

      if (mapillaryBarriers.status === 'fulfilled') {
        this.externalBarriers.push(...mapillaryBarriers.value);
      }
      
      if (overpassBarriers.status === 'fulfilled') {
        this.externalBarriers.push(...overpassBarriers.value);
      }
      
      console.log(`Loaded ${this.externalBarriers.length} external barriers`);
    } catch (error) {
      console.warn('Failed to load external barriers:', error);
    }
  }

  // Load Mapillary barriers (placeholder)
  async loadMapillaryBarriers() {
    // Placeholder for Mapillary integration
    return [];
  }

  // Load Overpass barriers with performance optimizations
  async loadOverpassBarriers() {
    try {
      // eslint-disable-next-line no-unused-vars
      const halifaxBounds = {
        north: 44.8,
        south: 44.5,
        east: -63.4,
        west: -63.8
      };

      // Use performance service for caching
      const data = await performanceService.getCachedData(
        'overpass_barriers',
        async () => {
          const query = `
            [out:json][timeout:25];
            (
              way["barrier"]["wheelchair"!="yes"](44.5,-63.8,44.8,-63.4);
              way["highway"="steps"](44.5,-63.8,44.8,-63.4);
              way["surface"="ice"](44.5,-63.8,44.8,-63.4);
            );
            out body;
            >;
            out skel qt;
          `;

          const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`
          });

          if (response.ok) {
            return response.json();
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        },
        {
          ttl: 10 * 60 * 1000, // 10 minutes
          priority: 'medium',
          useIndexedDB: true
        }
      );

      return this.convertOverpassToBarriers(data);
    } catch (error) {
      console.warn('Failed to load Overpass barriers:', error);
      return [];
    }
  }

  // Convert Overpass data to barriers
  convertOverpassToBarriers(overpassData) {
    if (!overpassData.elements) return [];

    return overpassData.elements
      .filter(element => element.type === 'way' && element.tags)
      .map(way => {
        const center = this.calculateWayCenter(way);
        if (!center) return null;

        return {
          id: `overpass_${way.id}`,
          type: this.mapOverpassTagsToBarrierType(way.tags),
          severity: this.determineOverpassSeverity(way.tags),
          location: this.generateOverpassDescription(way.tags),
          description: this.generateOverpassDescription(way.tags),
          coordinates: center,
          source: 'overpass',
          properties: way.tags,
          timestamp: new Date().toISOString(),
          photo: null
        };
      })
      .filter(Boolean);
  }

  // Calculate way center
  calculateWayCenter(way) {
    if (!way.center) return null;
    return [way.center.lon, way.center.lat];
  }

  // Map Overpass tags to barrier type
  mapOverpassTagsToBarrierType(tags) {
    if (tags.barrier && tags.wheelchair !== 'yes') return 'accessibility_barrier';
    if (tags.highway === 'steps') return 'steps';
    if (tags.surface === 'ice') return 'winter_hazard';
    return 'unknown';
  }

  // Determine Overpass severity
  determineOverpassSeverity(tags) {
    if (tags.barrier && tags.wheelchair !== 'yes') return 'high';
    if (tags.highway === 'steps') return 'medium';
    if (tags.surface === 'ice') return 'critical';
    return 'medium';
  }

  // Generate Overpass description
  generateOverpassDescription(tags) {
    if (tags.barrier && tags.wheelchair !== 'yes') {
      return `Accessibility barrier: ${tags.barrier}`;
    }
    if (tags.highway === 'steps') {
      return 'Steps detected';
    }
    if (tags.surface === 'ice') {
      return 'Icy surface detected';
    }
    return 'Barrier detected';
  }

  // Combine barriers with deduplication
  combineBarriers() {
    const allBarriers = [
      ...this.localBarriers,
      ...this.userReportedBarriers,
      ...this.externalBarriers
    ];

    this.barriers = this.removeDuplicateBarriers(allBarriers);
    
    // Sort by severity and timestamp
    this.barriers.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  // Remove duplicate barriers
  removeDuplicateBarriers(barriers) {
    const seen = new Set();
    return barriers.filter(barrier => {
      const key = `${barrier.coordinates[0].toFixed(4)},${barrier.coordinates[1].toFixed(4)}_${barrier.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Build spatial index for fast lookups
  buildSpatialIndex() {
    console.log('Building barrier spatial index...');
    
    this.spatialIndex.clear();
    
    this.barriers.forEach(barrier => {
      const [lng, lat] = barrier.coordinates;
      const key = `${Math.floor(lng * 100)},${Math.floor(lat * 100)}`;
      
      if (!this.spatialIndex.has(key)) {
        this.spatialIndex.set(key, []);
      }
      this.spatialIndex.get(key).push(barrier);
    });
    
    console.log('Barrier spatial index built');
  }

  // Build type and severity indexes
  buildTypeIndexes() {
    this.barrierTypes.clear();
    this.severityIndex.clear();
    
    this.barriers.forEach(barrier => {
      // Type index
      if (!this.barrierTypes.has(barrier.type)) {
        this.barrierTypes.set(barrier.type, []);
      }
      this.barrierTypes.get(barrier.type).push(barrier);
      
      // Severity index
      if (!this.severityIndex.has(barrier.severity)) {
        this.severityIndex.set(barrier.severity, []);
      }
      this.severityIndex.get(barrier.severity).push(barrier);
    });
  }

  // Get barriers near location with performance optimizations
  getBarriersNearLocation(coordinates, radiusMeters = 100) {
    const [lng, lat] = coordinates;
    const nearbyBarriers = [];
    
    // Search in spatial index
    const searchRadius = Math.ceil(radiusMeters / 1000); // Convert to grid units
    // eslint-disable-next-line no-unused-vars
    const centerKey = `${Math.floor(lng * 100)},${Math.floor(lat * 100)}`;
    
    for (let i = -searchRadius; i <= searchRadius; i++) {
      for (let j = -searchRadius; j <= searchRadius; j++) {
        const key = `${Math.floor(lng * 100) + i},${Math.floor(lat * 100) + j}`;
        const barriers = this.spatialIndex.get(key) || [];
        
        barriers.forEach(barrier => {
          const distance = this.calculateDistance(coordinates, barrier.coordinates);
          if (distance <= radiusMeters) {
            nearbyBarriers.push({ ...barrier, distance });
          }
        });
      }
    }
    
    return nearbyBarriers.sort((a, b) => a.distance - b.distance);
  }

  // Check route for barriers with performance optimizations
  checkRouteForBarriers(routeCoordinates, bufferMeters = 50) {
    const routeBarriers = [];
    
    // Sample route points for performance
    const samplePoints = this.sampleRoutePoints(routeCoordinates, 100);
    
    samplePoints.forEach(point => {
      const nearbyBarriers = this.getBarriersNearLocation(point, bufferMeters);
      nearbyBarriers.forEach(barrier => {
        if (!routeBarriers.find(b => b.id === barrier.id)) {
          routeBarriers.push(barrier);
        }
      });
    });
    
    return routeBarriers.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // Sample route points for performance
  sampleRoutePoints(coordinates, maxPoints = 100) {
    if (coordinates.length <= maxPoints) return coordinates;
    
    const step = Math.floor(coordinates.length / maxPoints);
    const sampled = [];
    
    for (let i = 0; i < coordinates.length; i += step) {
      sampled.push(coordinates[i]);
      if (sampled.length >= maxPoints) break;
    }
    
    return sampled;
  }

  // Get barriers by type with performance optimizations
  getBarriersByType(type) {
    return this.barrierTypes.get(type) || [];
  }

  // Get barriers by severity with performance optimizations
  getBarriersBySeverity(severity) {
    return this.severityIndex.get(severity) || [];
  }

  // Get barrier statistics
  getBarrierStats() {
    const stats = {
      total: this.barriers.length,
      byType: {},
      bySeverity: {},
      bySource: {}
    };
    
    this.barriers.forEach(barrier => {
      // Count by type
      stats.byType[barrier.type] = (stats.byType[barrier.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[barrier.severity] = (stats.bySeverity[barrier.severity] || 0) + 1;
      
      // Count by source
      stats.bySource[barrier.source] = (stats.bySource[barrier.source] || 0) + 1;
    });
    
    return stats;
  }

  // Generate comprehensive barrier analysis with performance optimizations
  generateComprehensiveBarrierAnalysis(routeCoordinates, accessibilitySettings = {}) {
    const cacheKey = `analysis_${JSON.stringify(routeCoordinates)}_${JSON.stringify(accessibilitySettings)}`;
    
    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    const barriers = this.checkRouteForBarriers(routeCoordinates);
    
    if (barriers.length === 0) {
      return {
        hasBarriers: false,
        barriers: [],
        riskLevel: 'low',
        accessibilityScore: 100,
        estimatedDelay: 0,
        recommendations: []
      };
    }

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(barriers);
    
    // Calculate accessibility score
    const accessibilityScore = this.calculateComprehensiveAccessibilityScore(barriers, accessibilitySettings);
    
    // Estimate delay
    const estimatedDelay = this.estimateDelay(barriers);
    
    // Generate recommendations
    const recommendations = this.generateBarrierRecommendations(barriers, accessibilitySettings);

    const analysis = {
      hasBarriers: true,
      barriers: barriers,
      riskLevel: riskLevel,
      accessibilityScore: accessibilityScore,
      estimatedDelay: estimatedDelay,
      recommendations: recommendations
    };

    // Cache the analysis
    this.analysisCache.set(cacheKey, {
      data: analysis,
      timestamp: Date.now()
    });

    return analysis;
  }

  // Calculate risk level
  calculateRiskLevel(barriers) {
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    
    barriers.forEach(barrier => {
      severityCounts[barrier.severity]++;
    });
    
    if (severityCounts.critical > 0) return 'critical';
    if (severityCounts.high > 2) return 'high';
    if (severityCounts.high > 0 || severityCounts.medium > 3) return 'medium';
    return 'low';
  }

  // Calculate comprehensive accessibility score
  calculateComprehensiveAccessibilityScore(barriers, accessibilitySettings) {
    let score = 100;
    
    barriers.forEach(barrier => {
      const severityPenalties = { critical: 25, high: 15, medium: 8, low: 3 };
      score -= severityPenalties[barrier.severity] || 5;
    });
    
    // Apply accessibility setting modifiers
    if (accessibilitySettings.wheelchair) {
      const wheelchairBarriers = barriers.filter(b => b.type === 'steps' || b.type === 'accessibility_barrier');
      score -= wheelchairBarriers.length * 10;
    }
    
    return Math.max(score, 0);
  }

  // Estimate delay
  estimateDelay(barriers) {
    return barriers.reduce((total, barrier) => {
      const delayMap = { critical: 15, high: 8, medium: 4, low: 2 };
      return total + (delayMap[barrier.severity] || 3);
    }, 0);
  }

  // Generate barrier recommendations
  generateBarrierRecommendations(barriers, accessibilitySettings) {
    const recommendations = [];
    
    const criticalBarriers = barriers.filter(b => b.severity === 'critical');
    if (criticalBarriers.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${criticalBarriers.length} critical barrier(s) detected. Consider alternative route.`,
        priority: 'high'
      });
    }
    
    const stepBarriers = barriers.filter(b => b.type === 'steps');
    if (stepBarriers.length > 0 && accessibilitySettings.wheelchair) {
      recommendations.push({
        type: 'accessibility',
        message: `${stepBarriers.length} step(s) detected. Route may not be wheelchair accessible.`,
        priority: 'high'
      });
    }
    
    const winterBarriers = barriers.filter(b => b.type === 'winter_hazard');
    if (winterBarriers.length > 0) {
      recommendations.push({
        type: 'weather',
        message: `${winterBarriers.length} winter hazard(s) detected. Use caution.`,
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  // Log user decision for analytics
  logUserDecision(barriers, decision, routeData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      barriers: barriers.map(b => ({ id: b.id, type: b.type, severity: b.severity })),
      decision: decision,
      routeData: {
        distance: routeData?.distance,
        duration: routeData?.duration,
        mode: routeData?.mode
      }
    };

    // Store locally
    try {
      const logs = JSON.parse(localStorage.getItem('trek_iq_barrier_logs') || '[]');
      logs.push(logEntry);
      if (logs.length > 1000) logs.shift(); // Keep only last 1000 entries
      localStorage.setItem('trek_iq_barrier_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store barrier decision log:', error);
    }

    // Send to server
    this.sendAnalyticsToServer(logEntry);
  }

  // Send analytics to server
  async sendAnalyticsToServer(logEntry) {
    try {
      await fetch('/api/analytics/barrier-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.warn('Failed to send barrier analytics to server:', error);
    }
  }

  // Get analytics data
  getAnalyticsData() {
    try {
      const logs = JSON.parse(localStorage.getItem('trek_iq_barrier_logs') || '[]');
      return logs;
    } catch (error) {
      console.error('Failed to get barrier analytics data:', error);
      return [];
    }
  }

  // Get barriers along a route
  async getBarriersAlongRoute(route, options = {}) {
    try {
      console.log('BarrierService: Getting barriers along route');
      
      // Extract coordinates from route
      const coordinates = this.extractRouteCoordinates(route);
      if (!coordinates || coordinates.length === 0) {
        console.warn('BarrierService: No coordinates found in route');
        return [];
      }

      const barriers = [];
      const radius = options.radius || 50; // Default 50m radius

      // Check each coordinate along the route
      for (const coord of coordinates) {
        const nearbyBarriers = this.getBarriersNearLocation(coord, radius);
        barriers.push(...nearbyBarriers);
      }

      // Remove duplicates based on barrier ID
      const uniqueBarriers = barriers.filter((barrier, index, self) => 
        index === self.findIndex(b => b.id === barrier.id)
      );

      console.log(`BarrierService: Found ${uniqueBarriers.length} barriers along route`);
      return uniqueBarriers;
      
    } catch (error) {
      console.error('BarrierService: Error getting barriers along route:', error);
      return [];
    }
  }

  // Extract coordinates from route
  extractRouteCoordinates(route) {
    try {
      if (route.features && route.features.length > 0) {
        const feature = route.features[0];
        if (feature.geometry && feature.geometry.coordinates) {
          return feature.geometry.coordinates;
        }
      }
      return [];
    } catch (error) {
      console.error('BarrierService: Error extracting route coordinates:', error);
      return [];
    }
  }

  // Get nearby barriers with performance optimizations
  getNearbyBarriers(coordinates, radiusMeters = 100) {
    return this.getBarriersNearLocation(coordinates, radiusMeters);
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  // Get health status
  getHealthStatus() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      totalBarriers: this.barriers.length,
      localBarriers: this.localBarriers.length,
      userReportedBarriers: this.userReportedBarriers.length,
      externalBarriers: this.externalBarriers.length,
      cacheSize: this.cache.size,
      analysisCacheSize: this.analysisCache.size
    };
  }

  // Cleanup resources
  cleanup() {
    this.cache.clear();
    this.analysisCache.clear();
    this.spatialIndex.clear();
    this.barrierTypes.clear();
    this.severityIndex.clear();
  }
}

// Export singleton instance
const barrierService = new BarrierService();
export default barrierService;
