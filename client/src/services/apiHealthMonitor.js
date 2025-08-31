// API Health Monitor - Centralized monitoring and optimization for all Trek.IQ APIs
class APIHealthMonitor {
  constructor() {
    this.services = new Map();
    this.healthStatus = new Map();
    this.performanceMetrics = new Map();
    this.errorLog = [];
    this.isInitialized = false;
    
    // Rate limiting and throttling
    this.requestCounts = new Map();
    this.lastRequestTime = new Map();
    this.rateLimits = new Map();
    
    // Cache management
    this.cacheStats = new Map();
    this.cacheHits = new Map();
    this.cacheMisses = new Map();
    
    // Service dependencies
    this.serviceDependencies = {
      'unifiedRouting': ['mapbox', 'openRoute', 'openElevation', 'wheelmap', 'overpass'],
      'enhancedSearch': ['mapbox', 'nominatim', 'halifax'],
      'transit': ['halifax', 'openRoute'],
      'accessibility': ['wheelmap', 'halifax', 'overpass'],
      'weather': ['openWeather'],
      'ai': ['openAI', 'tensorflow']
    };
  }

  // Register a service for monitoring
  registerService(serviceName, serviceInstance, config = {}) {
    this.services.set(serviceName, {
      instance: serviceInstance,
      config: {
        maxRequestsPerMinute: config.maxRequestsPerMinute || 60,
        timeout: config.timeout || 10000,
        retryAttempts: config.retryAttempts || 3,
        cacheTimeout: config.cacheTimeout || 300000, // 5 minutes
        ...config
      },
      status: 'unknown',
      lastCheck: null,
      errorCount: 0,
      successCount: 0
    });
    
    this.healthStatus.set(serviceName, 'unknown');
    this.performanceMetrics.set(serviceName, {
      avgResponseTime: 0,
      totalRequests: 0,
      errorRate: 0,
      lastResponseTime: null
    });
    
    console.log(`Registered service: ${serviceName}`);
  }

  // Initialize health monitoring
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing API Health Monitor...');
      
      // Start health check interval
      this.startHealthChecks();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      this.isInitialized = true;
      console.log('API Health Monitor initialized successfully');
    } catch (error) {
      console.error('Error initializing API Health Monitor:', error);
    }
  }

  // Start periodic health checks
  startHealthChecks() {
    setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  // Perform health checks for all services
  async performHealthChecks() {
    const healthChecks = Array.from(this.services.keys()).map(async (serviceName) => {
      try {
        const service = this.services.get(serviceName);
        const startTime = Date.now();
        
        // Perform service-specific health check
        const isHealthy = await this.checkServiceHealth(serviceName);
        
        const responseTime = Date.now() - startTime;
        
        // Update service status
        service.status = isHealthy ? 'healthy' : 'unhealthy';
        service.lastCheck = new Date();
        
        if (isHealthy) {
          service.successCount++;
        } else {
          service.errorCount++;
        }
        
        // Update performance metrics
        const metrics = this.performanceMetrics.get(serviceName);
        metrics.totalRequests++;
        metrics.lastResponseTime = responseTime;
        metrics.avgResponseTime = (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
        metrics.errorRate = service.errorCount / (service.successCount + service.errorCount);
        
        this.healthStatus.set(serviceName, service.status);
        
        console.log(`Health check for ${serviceName}: ${service.status} (${responseTime}ms)`);
        
      } catch (error) {
        console.error(`Health check failed for ${serviceName}:`, error);
        this.logError(serviceName, 'health_check', error);
      }
    });
    
    await Promise.allSettled(healthChecks);
  }

  // Check health of specific service
  async checkServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return false;
    
    try {
      switch (serviceName) {
        case 'unifiedRouting':
        case 'enhancedUnifiedRouting':
          return await this.checkRoutingServiceHealth();
        case 'enhancedSearch':
          return await this.checkSearchServiceHealth();
        case 'transit':
          return await this.checkTransitServiceHealth();
        case 'accessibility':
          return await this.checkAccessibilityServiceHealth();
        case 'weather':
          return await this.checkWeatherServiceHealth();
        case 'ai':
        case 'enhancedAI':
          return await this.checkAIServiceHealth();
        default:
          return await this.checkGenericServiceHealth(serviceName);
      }
    } catch (error) {
      console.error(`Health check error for ${serviceName}:`, error);
      return false;
    }
  }

  // Service-specific health checks
  async checkRoutingServiceHealth() {
    try {
      const routingService = this.services.get('unifiedRouting') || this.services.get('enhancedUnifiedRouting');
      if (!routingService || !routingService.instance) return false;
      
      const testRoute = await routingService.instance.calculateRoute({
        origin: 'Halifax, NS',
        destination: 'Dartmouth, NS',
        mode: 'walking'
      });
      return testRoute && testRoute.features && testRoute.features.length > 0;
    } catch (error) {
      return false;
    }
  }

  async checkSearchServiceHealth() {
    try {
      const searchService = this.services.get('enhancedSearch');
      if (!searchService || !searchService.instance) return false;
      
      const testSearch = await searchService.instance.search('Halifax');
      return testSearch && Array.isArray(testSearch) && testSearch.length > 0;
    } catch (error) {
      return false;
    }
  }

  async checkTransitServiceHealth() {
    try {
      const transitService = this.services.get('transit');
      if (!transitService || !transitService.instance) return false;
      
      const testTransit = await transitService.instance.getNearbyStops([-63.5742, 44.6488]);
      return testTransit && Array.isArray(testTransit);
    } catch (error) {
      return false;
    }
  }

  async checkAccessibilityServiceHealth() {
    try {
      const accessibilityService = this.services.get('accessibility') || this.services.get('wheelmap');
      if (!accessibilityService || !accessibilityService.instance) return false;
      
      const testAccessibility = await accessibilityService.instance.getAccessibilityFeatures([-63.5742, 44.6488]);
      return testAccessibility && Array.isArray(testAccessibility);
    } catch (error) {
      return false;
    }
  }

  async checkWeatherServiceHealth() {
    try {
      const weatherService = this.services.get('weather');
      if (!weatherService || !weatherService.instance) return false;
      
      const testWeather = await weatherService.instance.getCurrentWeather([-63.5742, 44.6488]);
      return testWeather && testWeather.temperature !== undefined;
    } catch (error) {
      return false;
    }
  }

  async checkAIServiceHealth() {
    try {
      const aiService = this.services.get('ai') || this.services.get('enhancedAI');
      if (!aiService || !aiService.instance) return false;
      
      const testAI = await aiService.instance.analyzeRouteAccessibility({
        features: [{
          properties: { mode: 'walking' },
          geometry: { coordinates: [[-63.5742, 44.6488], [-63.5743, 44.6489]] }
        }]
      });
      return testAI && testAI.analysis;
    } catch (error) {
      return false;
    }
  }

  async checkGenericServiceHealth(serviceName) {
    const service = this.services.get(serviceName);
    if (!service || !service.instance) return false;
    
    // Check if service has an initialize method and it's been called
    if (service.instance.isInitialized !== undefined) {
      return service.instance.isInitialized;
    }
    
    // Check if service has a health check method
    if (typeof service.instance.healthCheck === 'function') {
      return await service.instance.healthCheck();
    }
    
    // Check if service has a testConnection method
    if (typeof service.instance.testConnection === 'function') {
      return await service.instance.testConnection();
    }
    
    return true; // Assume healthy if no specific checks available
  }

  // Start performance monitoring
  startPerformanceMonitoring() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 60000); // Update every minute
  }

  // Update performance metrics
  updatePerformanceMetrics() {
    this.services.forEach((service, serviceName) => {
      const metrics = this.performanceMetrics.get(serviceName);
      if (metrics && metrics.totalRequests > 0) {
        metrics.errorRate = service.errorCount / (service.successCount + service.errorCount);
      }
    });
  }

  // Log errors for monitoring
  logError(serviceName, operation, error) {
    const errorEntry = {
      timestamp: new Date(),
      service: serviceName,
      operation: operation,
      error: error.message || error,
      stack: error.stack
    };
    
    this.errorLog.push(errorEntry);
    
    // Keep only last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }
    
    console.error(`API Error [${serviceName}]:`, errorEntry);
  }

  // Get overall health status
  getOverallHealth() {
    const services = Array.from(this.healthStatus.values());
    const healthyServices = services.filter(status => status === 'healthy').length;
    const totalServices = services.length;
    
    return {
      overall: totalServices > 0 ? (healthyServices / totalServices) * 100 : 0,
      healthy: healthyServices,
      total: totalServices,
      services: Object.fromEntries(this.healthStatus),
      performance: Object.fromEntries(this.performanceMetrics),
      recentErrors: this.errorLog.slice(-10)
    };
  }

  // Get service-specific metrics
  getServiceMetrics(serviceName) {
    const service = this.services.get(serviceName);
    const metrics = this.performanceMetrics.get(serviceName);
    const status = this.healthStatus.get(serviceName);
    
    if (!service || !metrics) return null;
    
    return {
      name: serviceName,
      status: status,
      config: service.config,
      metrics: metrics,
      lastCheck: service.lastCheck,
      errorCount: service.errorCount,
      successCount: service.successCount
    };
  }

  // Check if service is ready for requests
  isServiceReady(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) return false;
    
    // For services that don't require initialization, consider them ready
    if (service.instance && service.instance.isInitialized === undefined) {
      return service.status === 'healthy';
    }
    
    return service.status === 'healthy' && service.instance && service.instance.isInitialized;
  }

  // Get dependency status
  getDependencyStatus(serviceName) {
    const dependencies = this.serviceDependencies[serviceName] || [];
    const status = {};
    
    dependencies.forEach(dep => {
      status[dep] = this.isServiceReady(dep);
    });
    
    return status;
  }

  // Clear error log
  clearErrorLog() {
    this.errorLog = [];
  }

  // Reset service metrics
  resetServiceMetrics(serviceName) {
    const service = this.services.get(serviceName);
    if (service) {
      service.errorCount = 0;
      service.successCount = 0;
      service.lastCheck = null;
    }
    
    const metrics = this.performanceMetrics.get(serviceName);
    if (metrics) {
      metrics.avgResponseTime = 0;
      metrics.totalRequests = 0;
      metrics.errorRate = 0;
      metrics.lastResponseTime = null;
    }
  }
}

// Create singleton instance
const apiHealthMonitor = new APIHealthMonitor();
export default apiHealthMonitor;
