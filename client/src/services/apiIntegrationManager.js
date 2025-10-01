// API Integration Manager - Central coordinator for all Trek.IQ APIs
import productionRoutingService from './productionRouting/ProductionRoutingService.js';
import weatherService from './weatherService.js';
import barrierService from './barrierService.js';
import enhancedSearchService from './enhancedSearchService.js';
import transitService from './transitService.js';
import halifaxTransitDataService from './halifaxTransitDataService.js';
import apiHealthMonitor from './apiHealthMonitor.js';

class APIIntegrationManager {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Service registry - simplified
    this.services = {
      routing: productionRoutingService,
      weather: weatherService,
      barrier: barrierService,
      search: enhancedSearchService,
      transit: transitService,
      halifaxTransit: halifaxTransitDataService
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
    
    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  async _performInitialization() {
    try {
      console.log('🚀 Initializing API Integration Manager...');
      
      // Initialize individual services
      const initPromises = Object.entries(this.services).map(async ([name, service]) => {
        try {
          if (service && typeof service.initialize === 'function') {
            await service.initialize();
            this.serviceStatus.set(name, 'initialized');
            console.log(`✅ ${name} service initialized`);
          } else {
            this.serviceStatus.set(name, 'no_init_method');
            console.log(`⚠️ ${name} service has no initialize method`);
          }
        } catch (error) {
          console.error(`❌ Failed to initialize ${name} service:`, error);
          this.serviceStatus.set(name, 'failed');
        }
      });

      await Promise.allSettled(initPromises);
      
      // Start monitoring tasks
      this.startMonitoringTasks();
      
      this.isInitialized = true;
      console.log('✅ API Integration Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize API Integration Manager:', error);
      throw error;
    }
  }

  // Get a service by name
  getService(serviceName) {
    return this.services[serviceName] || null;
  }

  // Get service status
  getServiceStatus(serviceName) {
    return this.serviceStatus.get(serviceName) || 'unknown';
  }

  // Get all service statuses
  getAllServiceStatuses() {
    const statuses = {};
    for (const [name, status] of this.serviceStatus.entries()) {
      statuses[name] = status;
    }
    return statuses;
  }

  // Start monitoring and maintenance tasks
  startMonitoringTasks() {
    // Health monitoring
    const healthInterval = setInterval(() => {
      this.performHealthChecks();
    }, 60000); // Every minute
    this.monitoringIntervals = this.monitoringIntervals || [];
    this.monitoringIntervals.push(healthInterval);
    
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
  performHealthChecks() {
    const healthStatus = {
      services: this.getAllServiceStatuses(),
      performance: this.performanceMetrics,
      timestamp: new Date().toISOString()
    };
    
    // Check overall health
    const failedServices = Object.values(healthStatus.services).filter(status => status === 'failed').length;
    const totalServices = Object.keys(healthStatus.services).length;
    const healthPercentage = totalServices > 0 ? ((totalServices - failedServices) / totalServices) * 100 : 100;
    
    if (healthPercentage < 50) {
      console.warn('System health is below 50%:', healthStatus);
      this.notifyStatusChange('system_health', { level: 'warning', status: healthStatus });
    }
  }

  // Update performance metrics
  updatePerformanceMetrics() {
    try {
      const overallHealth = apiHealthMonitor.getOverallHealth();
      
      // Ensure performance data exists and is an object
      const performanceData = overallHealth?.performance || {};
      
      // Safely get performance values
      const performanceValues = Object.values(performanceData);
      const performanceKeys = Object.keys(performanceData);
      
      this.performanceMetrics.totalRequests = performanceValues
        .reduce((sum, metrics) => sum + (metrics?.totalRequests || 0), 0);
      
      this.performanceMetrics.successfulRequests = performanceValues
        .reduce((sum, metrics) => {
          const total = metrics?.totalRequests || 0;
          const errorRate = metrics?.errorRate || 0;
          return sum + (total - (errorRate * total));
        }, 0);
      
      this.performanceMetrics.failedRequests = this.performanceMetrics.totalRequests - this.performanceMetrics.successfulRequests;
      
      // Calculate average response time safely
      if (performanceKeys.length > 0) {
        this.performanceMetrics.averageResponseTime = performanceValues
          .reduce((sum, metrics) => sum + (metrics?.avgResponseTime || 0), 0) / performanceKeys.length;
      } else {
        this.performanceMetrics.averageResponseTime = 0;
      }
      
      this.performanceMetrics.lastRequestTime = new Date();
    } catch (error) {
      console.error('❌ Error updating performance metrics:', error);
      // Set default values to prevent further errors
      this.performanceMetrics.totalRequests = 0;
      this.performanceMetrics.successfulRequests = 0;
      this.performanceMetrics.failedRequests = 0;
      this.performanceMetrics.averageResponseTime = 0;
      this.performanceMetrics.lastRequestTime = new Date();
    }
  }

  // Notify status change listeners
  notifyStatusChange(type, data) {
    this.statusListeners.forEach(listener => {
      try {
        listener(type, data);
      } catch (error) {
        console.error('Error in status change listener:', error);
      }
    });
  }

  // Add status change listener
  addStatusListener(listener) {
    this.statusListeners.add(listener);
  }

  // Remove status change listener
  removeStatusListener(listener) {
    this.statusListeners.delete(listener);
  }

  // Get performance metrics
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  // Get data harmonization status
  getDataHarmonizationStatus() {
    return { ...this.dataHarmonization };
  }
}

// Create singleton instance
const apiIntegrationManager = new APIIntegrationManager();

export default apiIntegrationManager;
