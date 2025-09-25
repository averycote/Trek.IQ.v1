// API Integration Manager - Central coordinator for all Trek.IQ APIs
import enhancedUnifiedRoutingService from './enhancedUnifiedRoutingService.js';
import enhancedSearchService from './enhancedSearchService.js';
import enhancedAIService from './enhancedAIService.js';
import transitService from './transitService.js';
import transitAPIService from './transitAPIService.js';
import weatherService from './weatherService.js';
import barrierService from './barrierService.js';
// wheelmapService removed - no API token available
import openElevationService from './openElevationService.js';
import openRouteService from './openRouteService.js';
import enhancedOverpassService from './enhancedOverpassService.js';
import apiHealthMonitor from './apiHealthMonitor.js';

class APIIntegrationManager {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Service registry
    this.services = {
      routing: enhancedUnifiedRoutingService,
      search: enhancedSearchService,
      ai: enhancedAIService,
      transit: transitService,
      transitAPI: transitAPIService,
      weather: weatherService,
      barrier: barrierService,
      // wheelmap: wheelmapService, // Removed - no API token available
      elevation: openElevationService,
      openRoute: openRouteService,
      overpass: enhancedOverpassService
    };
    
    // Service status tracking
    this.serviceStatus = new Map();
    this.dataFlowStatus = new Map();
    this.lastDataUpdate = new Map();
    
    // Performance tracking
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
    
    // Data harmonization tracking
    this.dataHarmonization = {
      conflicts: [],
      resolutions: [],
      qualityScores: new Map(),
      lastHarmonization: null
    };
    
    // Event listeners for service status changes
    this.statusListeners = new Set();
  }

  // Initialize all services and establish data flow
  async initialize() {
    if (this.isInitialized) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  async performInitialization() {
    try {
      console.log('Initializing API Integration Manager...');
      
      // Register all services with health monitor
      await this.registerServicesWithHealthMonitor();
      
      // Initialize services in dependency order
      await this.initializeServicesInOrder();
      
      // Establish data flow connections
      await this.establishDataFlow();
      
      // Perform initial data harmonization
      await this.performDataHarmonization();
      
      // Start monitoring and maintenance tasks
      this.startMonitoringTasks();
      
      this.isInitialized = true;
      console.log('API Integration Manager initialized successfully');
      
      // Notify listeners
      this.notifyStatusChange('initialized', { success: true });
      
    } catch (error) {
      console.error('Error initializing API Integration Manager:', error);
      this.notifyStatusChange('initialized', { success: false, error });
      throw error;
    }
  }

  // Register services with health monitor
  async registerServicesWithHealthMonitor() {
    const registrationPromises = Object.entries(this.services).map(async ([name, service]) => {
      try {
        apiHealthMonitor.registerService(name, service, {
          maxRequestsPerMinute: this.getServiceRateLimit(name),
          timeout: this.getServiceTimeout(name),
          retryAttempts: 3
        });
        console.log(`Registered ${name} service with health monitor`);
      } catch (error) {
        console.warn(`Failed to register ${name} service:`, error);
      }
    });
    
    await Promise.allSettled(registrationPromises);
  }

  // Initialize services in dependency order
  async initializeServicesInOrder() {
    const initializationOrder = [
      'search',      // Base search functionality
      'elevation',   // Elevation data
      'overpass',    // OpenStreetMap data
      // 'wheelmap',    // Accessibility data - removed - no API token
      'transitAPI',  // Transit API service
      'transit',     // Transit data (depends on transitAPI)
      'weather',     // Weather data
      'barrier',     // Barrier data
      'ai',          // AI analysis
      'routing'      // Unified routing (depends on others)
    ];

    for (const serviceName of initializationOrder) {
      const service = this.services[serviceName];
      if (service && service.initialize) {
        try {
          console.log(`Initializing ${serviceName} service...`);
          await service.initialize();
          this.serviceStatus.set(serviceName, 'ready');
          console.log(`${serviceName} service initialized successfully`);
        } catch (error) {
          console.warn(`Failed to initialize ${serviceName} service:`, error);
          this.serviceStatus.set(serviceName, 'failed');
        }
      }
    }
  }

  // Establish data flow between services
  async establishDataFlow() {
    console.log('Establishing data flow between services...');
    
    // Set up data flow connections
    const dataFlowConnections = [
      {
        from: 'search',
        to: 'routing',
        dataType: 'geocoding',
        priority: 'high'
      },
      {
        from: 'elevation',
        to: 'routing',
        dataType: 'elevation',
        priority: 'medium'
      },
      // {
      //   from: 'wheelmap',
      //   to: 'routing',
      //   dataType: 'accessibility',
      //   priority: 'high'
      // },
      {
        from: 'transitAPI',
        to: 'transit',
        dataType: 'realtime_transit',
        priority: 'high'
      },
      {
        from: 'transit',
        to: 'routing',
        dataType: 'transit',
        priority: 'medium'
      },
      {
        from: 'weather',
        to: 'routing',
        dataType: 'weather',
        priority: 'low'
      },
      {
        from: 'barrier',
        to: 'routing',
        dataType: 'barriers',
        priority: 'high'
      }
    ];

    dataFlowConnections.forEach(connection => {
      this.dataFlowStatus.set(`${connection.from}_to_${connection.to}`, {
        status: 'established',
        dataType: connection.dataType,
        priority: connection.priority,
        lastUpdate: new Date()
      });
    });
  }

  // Perform initial data harmonization
  async performDataHarmonization() {
    console.log('Performing initial data harmonization...');
    
    try {
      // Check for data conflicts between services
      const conflicts = await this.detectDataConflicts();
      this.dataHarmonization.conflicts = conflicts;
      
      // Resolve conflicts
      const resolutions = await this.resolveDataConflicts(conflicts);
      this.dataHarmonization.resolutions = resolutions;
      
      // Calculate quality scores
      await this.calculateDataQualityScores();
      
      this.dataHarmonization.lastHarmonization = new Date();
      console.log('Data harmonization completed successfully');
      
    } catch (error) {
      console.error('Error during data harmonization:', error);
    }
  }

  // Detect data conflicts between services
  async detectDataConflicts() {
    const conflicts = [];
    
    // Check for accessibility data conflicts (wheelmap service removed)
    // try {
    //   const wheelmapData = await this.services.wheelmap.getAccessibilityFeatures([-63.5742, 44.6488]);
    //   const overpassData = await this.services.overpass.getAccessibilityFeatures([-63.5742, 44.6488]);
    //   
    //   if (wheelmapData && overpassData) {
    //     // Compare accessibility ratings
    //     const wheelmapRatings = new Map(wheelmapData.map(item => [item.id, item.rating]));
    //     const overpassRatings = new Map(overpassData.map(item => [item.id, item.rating]));
    //     
    //     for (const [id, wheelmapRating] of wheelmapRatings) {
    //       if (overpassRatings.has(id)) {
    //       const overpassRating = overpassRatings.get(id);
    //       if (Math.abs(wheelmapRating - overpassRating) > 0.3) {
    //         conflicts.push({
    //           type: 'accessibility_rating',
    //           location: id,
    //           wheelmap: wheelmapRating,
    //           overpass: overpassRating,
    //           severity: 'medium'
    //         });
    //       }
    //     }
    //   }
    // }
    // } catch (error) {
    //   console.warn('Error detecting accessibility conflicts:', error);
    // }
    
    return conflicts;
  }

  // Resolve data conflicts
  async resolveDataConflicts(conflicts) {
    const resolutions = [];
    
    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'accessibility_rating':
          // Use weighted average based on data source reliability
          const resolution = {
            type: 'accessibility_rating',
            location: conflict.location,
            resolvedValue: this.calculateWeightedAverage(
              conflict.wheelmap, 0.7,  // Wheelmap has higher reliability
              conflict.overpass, 0.3
            ),
            method: 'weighted_average',
            confidence: 0.8
          };
          resolutions.push(resolution);
          break;
        default:
          console.warn(`Unknown conflict type: ${conflict.type}`);
          break;
      }
    }
    
    return resolutions;
  }

  // Calculate weighted average for conflict resolution
  calculateWeightedAverage(value1, weight1, value2, weight2) {
    return (value1 * weight1 + value2 * weight2) / (weight1 + weight2);
  }

  // Calculate data quality scores
  async calculateDataQualityScores() {
    const qualityScores = new Map();
    
    for (const [serviceName, service] of Object.entries(this.services)) {
      try {
        const score = await this.calculateServiceDataQuality(serviceName, service);
        qualityScores.set(serviceName, score);
      } catch (error) {
        console.warn(`Error calculating quality score for ${serviceName}:`, error);
        qualityScores.set(serviceName, 0.5); // Default score
      }
    }
    
    this.dataHarmonization.qualityScores = qualityScores;
  }

  // Calculate service-specific data quality
  async calculateServiceDataQuality(serviceName, service) {
    // Base quality score
    let quality = 0.8;
    
    // Check if service is healthy
    if (apiHealthMonitor.isServiceReady(serviceName)) {
      quality += 0.1;
    }
    
    // Check service-specific metrics
    const metrics = apiHealthMonitor.getServiceMetrics(serviceName);
    if (metrics) {
      // Factor in error rate
      quality -= metrics.metrics.errorRate * 0.3;
      
      // Factor in response time
      if (metrics.metrics.avgResponseTime < 1000) {
        quality += 0.05;
      } else if (metrics.metrics.avgResponseTime > 5000) {
        quality -= 0.1;
      }
    }
    
    return Math.max(0, Math.min(1, quality));
  }

  // Start monitoring and maintenance tasks
  startMonitoringTasks() {
    // Clear existing intervals
    this.stopMonitoringTasks();
    
    // Store interval IDs for cleanup
    this.monitoringIntervals = this.monitoringIntervals || [];
    
    // Periodic health checks
    const healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Every minute
    this.monitoringIntervals.push(healthCheckInterval);
    
    // Periodic data harmonization
    const harmonizationInterval = setInterval(() => {
      this.performDataHarmonization();
    }, 300000); // Every 5 minutes
    this.monitoringIntervals.push(harmonizationInterval);
    
    // Performance monitoring
    const performanceInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Every 30 seconds
    this.monitoringIntervals.push(performanceInterval);
  }

  // Stop monitoring and maintenance tasks
  stopMonitoringTasks() {
    if (this.monitoringIntervals) {
      this.monitoringIntervals.forEach(intervalId => {
        clearInterval(intervalId);
      });
      this.monitoringIntervals = [];
    }
  }

  // Perform health checks
  async performHealthChecks() {
    const healthStatus = apiHealthMonitor.getOverallHealth();
    
    // Update service status
    Object.keys(this.services).forEach(serviceName => {
      const isHealthy = apiHealthMonitor.isServiceReady(serviceName);
      const currentStatus = this.serviceStatus.get(serviceName);
      
      if (currentStatus !== (isHealthy ? 'ready' : 'failed')) {
        this.serviceStatus.set(serviceName, isHealthy ? 'ready' : 'failed');
        this.notifyStatusChange('service_status', { service: serviceName, status: isHealthy ? 'ready' : 'failed' });
      }
    });
    
    // Check overall system health
    if (healthStatus.overall < 50) {
      console.warn('System health is below 50%:', healthStatus);
      this.notifyStatusChange('system_health', { level: 'warning', status: healthStatus });
    }
  }

  // Update performance metrics
  updatePerformanceMetrics() {
    const overallHealth = apiHealthMonitor.getOverallHealth();
    
    this.performanceMetrics.totalRequests = Object.values(overallHealth.performance)
      .reduce((sum, metrics) => sum + (metrics.totalRequests || 0), 0);
    
    this.performanceMetrics.successfulRequests = Object.values(overallHealth.performance)
      .reduce((sum, metrics) => sum + (metrics.totalRequests - (metrics.errorRate * metrics.totalRequests || 0)), 0);
    
    this.performanceMetrics.failedRequests = this.performanceMetrics.totalRequests - this.performanceMetrics.successfulRequests;
    
    this.performanceMetrics.averageResponseTime = Object.values(overallHealth.performance)
      .reduce((sum, metrics) => sum + (metrics.avgResponseTime || 0), 0) / Object.keys(overallHealth.performance).length;
    
    this.performanceMetrics.lastRequestTime = new Date();
  }

  // Get service rate limit
  getServiceRateLimit(serviceName) {
    const rateLimits = {
      routing: 120,
      search: 100,
      ai: 60,
      transit: 80,
      transitAPI: 5,  // Transit API limit: 5 calls per minute
      weather: 60,
      barrier: 100,
      wheelmap: 50,
      elevation: 100,
      openRoute: 100,
      overpass: 200
    };

    return rateLimits[serviceName] || 60;
  }

  // Get service timeout
  getServiceTimeout(serviceName) {
    const timeouts = {
      routing: 15000,
      search: 10000,
      ai: 20000,
      transit: 10000,
      transitAPI: 8000,  // Transit API timeout
      weather: 8000,
      barrier: 10000,
      wheelmap: 12000,
      elevation: 8000,
      openRoute: 15000,
      overpass: 10000
    };

    return timeouts[serviceName] || 10000;
  }

  // Add status change listener
  addStatusListener(listener) {
    this.statusListeners.add(listener);
  }

  // Remove status change listener
  removeStatusListener(listener) {
    this.statusListeners.delete(listener);
  }

  // Notify status change listeners
  notifyStatusChange(type, data) {
    this.statusListeners.forEach(listener => {
      try {
        listener(type, data);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  // Get service by name
  getService(serviceName) {
    return this.services[serviceName];
  }

  // Get all services
  getAllServices() {
    return this.services;
  }

  // Get service status
  getServiceStatus(serviceName) {
    return this.serviceStatus.get(serviceName);
  }

  // Get overall system status
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      serviceStatus: Object.fromEntries(this.serviceStatus),
      dataFlowStatus: Object.fromEntries(this.dataFlowStatus),
      performanceMetrics: this.performanceMetrics,
      dataHarmonization: {
        conflicts: this.dataHarmonization.conflicts.length,
        resolutions: this.dataHarmonization.resolutions.length,
        lastHarmonization: this.dataHarmonization.lastHarmonization,
        qualityScores: Object.fromEntries(this.dataHarmonization.qualityScores)
      },
      healthStatus: apiHealthMonitor.getOverallHealth()
    };
  }

  // Check if system is ready
  isSystemReady() {
    return this.isInitialized && 
           Array.from(this.serviceStatus.values()).some(status => status === 'ready');
  }

  // Get data quality score for service
  getDataQualityScore(serviceName) {
    return this.dataHarmonization.qualityScores.get(serviceName) || 0;
  }

  // Force refresh of service
  async refreshService(serviceName) {
    const service = this.services[serviceName];
    if (service && service.initialize) {
      try {
        await service.initialize();
        this.serviceStatus.set(serviceName, 'ready');
        console.log(`${serviceName} service refreshed successfully`);
        return true;
      } catch (error) {
        console.error(`Failed to refresh ${serviceName} service:`, error);
        this.serviceStatus.set(serviceName, 'failed');
        return false;
      }
    }
    return false;
  }
}

// Create singleton instance
const apiIntegrationManager = new APIIntegrationManager();
export default apiIntegrationManager;
