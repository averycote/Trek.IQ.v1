/**
 * API Health Monitor Service
 * 
 * Provides centralized monitoring and health reporting for all API services.
 * Helps users understand when services are experiencing issues and provides
 * fallback recommendations.
 */

class APIHealthMonitor {
  constructor() {
    this.services = new Map();
    this.healthStatus = new Map();
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 30000; // 30 seconds
    this.notificationCallbacks = [];
    
    // Start periodic health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Register an API service for monitoring
   * @param {string} serviceName - Name of the service
   * @param {Object} serviceInstance - Service instance with health metrics
   * @param {Object} config - Service configuration
   */
  registerService(serviceName, serviceInstance, config = {}) {
    this.services.set(serviceName, {
      instance: serviceInstance,
      config: {
        maxFailureRate: 0.5, // 50% failure rate threshold
        maxResponseTime: 10000, // 10 second response time threshold
        circuitBreakerThreshold: 5, // Circuit breaker failure threshold
        ...config
      },
      lastHealthCheck: 0,
      consecutiveFailures: 0,
      status: 'unknown'
    });
    
    console.log(`🔍 API Health Monitor: Registered service ${serviceName}`);
  }

  /**
   * Start periodic health monitoring
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health check on all registered services
   */
  async performHealthCheck() {
    const now = Date.now();
    this.lastHealthCheck = now;
    
    for (const [serviceName, serviceData] of this.services) {
      try {
        await this.checkServiceHealth(serviceName, serviceData);
      } catch (error) {
        console.error(`❌ Health check failed for ${serviceName}:`, error);
        this.updateServiceStatus(serviceName, 'error', error.message);
      }
    }
    
    this.notifyHealthStatusChange();
  }

  /**
   * Check health of a specific service
   * @param {string} serviceName - Service name
   * @param {Object} serviceData - Service data
   */
  async checkServiceHealth(serviceName, serviceData) {
    const { instance, config } = serviceData;
    
    // Get health metrics from service
    let metrics;
    try {
      if (instance.getHealthMetrics) {
        metrics = instance.getHealthMetrics();
      } else {
        // Fallback for services without health metrics
        metrics = {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          rateLimitedRequests: 0,
          averageResponseTime: 0,
          apiAvailable: true
        };
      }
    } catch (error) {
      this.updateServiceStatus(serviceName, 'error', 'Failed to get health metrics');
      return;
    }

    // Calculate health indicators
    const totalRequests = metrics.totalRequests || 0;
    const failedRequests = metrics.failedRequests || 0;
    const rateLimitedRequests = metrics.rateLimitedRequests || 0;
    const averageResponseTime = metrics.averageResponseTime || 0;
    const circuitBreakerState = metrics.circuitBreakerState || 'CLOSED';
    
    // Determine service status
    let status = 'healthy';
    let issues = [];
    
    // Check circuit breaker
    if (circuitBreakerState === 'OPEN') {
      status = 'unavailable';
      issues.push('Circuit breaker is open');
    } else if (circuitBreakerState === 'HALF_OPEN') {
      status = 'degraded';
      issues.push('Circuit breaker is half-open');
    }
    
    // Check failure rate
    if (totalRequests > 0) {
      const failureRate = failedRequests / totalRequests;
      if (failureRate > config.maxFailureRate) {
        status = status === 'healthy' ? 'degraded' : status;
        issues.push(`High failure rate: ${(failureRate * 100).toFixed(1)}%`);
      }
    }
    
    // Check response time
    if (averageResponseTime > config.maxResponseTime) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`Slow response time: ${averageResponseTime.toFixed(0)}ms`);
    }
    
    // Check rate limiting
    if (rateLimitedRequests > 0) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`${rateLimitedRequests} rate limit errors`);
    }
    
    // Check API availability
    if (metrics.apiAvailable === false) {
      status = 'unavailable';
      issues.push('API marked as unavailable');
    }
    
    this.updateServiceStatus(serviceName, status, issues.join(', '));
  }

  /**
   * Update service status
   * @param {string} serviceName - Service name
   * @param {string} status - Service status
   * @param {string} message - Status message
   */
  updateServiceStatus(serviceName, status, message) {
    const serviceData = this.services.get(serviceName);
    if (!serviceData) return;
    
    const previousStatus = serviceData.status;
    serviceData.status = status;
    serviceData.lastHealthCheck = Date.now();
    serviceData.message = message;
    
    // Track consecutive failures
    if (status === 'error' || status === 'unavailable') {
      serviceData.consecutiveFailures++;
    } else {
      serviceData.consecutiveFailures = 0;
    }
    
    // Log status changes
    if (previousStatus !== status) {
      console.log(`🔄 API Health: ${serviceName} status changed from ${previousStatus} to ${status}`);
      if (message) {
        console.log(`   Reason: ${message}`);
      }
    }
    
    this.healthStatus.set(serviceName, {
      status,
      message,
      lastCheck: serviceData.lastHealthCheck,
      consecutiveFailures: serviceData.consecutiveFailures
    });
  }

  /**
   * Get overall system health status
   * @returns {Object} Overall health status
   */
  getOverallHealth() {
    const services = Array.from(this.healthStatus.values());
    const totalServices = services.length;
    
    if (totalServices === 0) {
      return {
        status: 'unknown',
        message: 'No services registered',
        services: []
      };
    }
    
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const unavailableServices = services.filter(s => s.status === 'unavailable' || s.status === 'error').length;
    
    let overallStatus = 'healthy';
    let message = 'All services are healthy';
    
    if (unavailableServices > 0) {
      overallStatus = 'unavailable';
      message = `${unavailableServices} service(s) unavailable`;
    } else if (degradedServices > 0) {
      overallStatus = 'degraded';
      message = `${degradedServices} service(s) experiencing issues`;
    }
    
    return {
      status: overallStatus,
      message,
      services: {
        total: totalServices,
        healthy: healthyServices,
        degraded: degradedServices,
        unavailable: unavailableServices
      },
      lastCheck: this.lastHealthCheck
    };
  }

  /**
   * Get health status for a specific service
   * @param {string} serviceName - Service name
   * @returns {Object} Service health status
   */
  getServiceHealth(serviceName) {
    return this.healthStatus.get(serviceName) || {
      status: 'unknown',
      message: 'Service not found',
      lastCheck: 0,
      consecutiveFailures: 0
    };
  }

  /**
   * Get recommendations for service issues
   * @param {string} serviceName - Service name
   * @returns {Array} Array of recommendations
   */
  getRecommendations(serviceName) {
    const health = this.getServiceHealth(serviceName);
    const recommendations = [];
    
    switch (health.status) {
      case 'unavailable':
        recommendations.push('Service is currently unavailable. Please try again later.');
        recommendations.push('Consider using alternative data sources if available.');
        break;
        
      case 'degraded':
        recommendations.push('Service is experiencing issues but may still work.');
        recommendations.push('Response times may be slower than usual.');
        if (health.message.includes('rate limit')) {
          recommendations.push('Rate limit exceeded. Please wait before making more requests.');
        }
        break;
        
      case 'error':
        recommendations.push('Service encountered an error. Please try again.');
        recommendations.push('If the problem persists, contact support.');
        break;
        
      default:
        recommendations.push('Service status is unknown. Please try again.');
    }
    
    return recommendations;
  }

  /**
   * Subscribe to health status changes
   * @param {Function} callback - Callback function
   */
  subscribeToHealthChanges(callback) {
    this.notificationCallbacks.push(callback);
  }

  /**
   * Unsubscribe from health status changes
   * @param {Function} callback - Callback function
   */
  unsubscribeFromHealthChanges(callback) {
    const index = this.notificationCallbacks.indexOf(callback);
    if (index > -1) {
      this.notificationCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify subscribers of health status changes
   */
  notifyHealthStatusChange() {
    const overallHealth = this.getOverallHealth();
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(overallHealth);
      } catch (error) {
        console.error('Error in health status notification callback:', error);
      }
    });
  }

  /**
   * Get health status summary for display
   * @returns {Object} Health summary
   */
  getHealthSummary() {
    const overall = this.getOverallHealth();
    const serviceDetails = {};
    
    for (const [serviceName] of this.services) {
      serviceDetails[serviceName] = this.getServiceHealth(serviceName);
    }
    
    return {
      overall,
      services: serviceDetails,
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const apiHealthMonitor = new APIHealthMonitor();

export default apiHealthMonitor;