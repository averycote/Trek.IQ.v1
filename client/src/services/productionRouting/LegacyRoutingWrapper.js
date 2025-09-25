/**
 * Legacy Routing Wrapper - Deprecation Layer for Existing Services
 * 
 * This module provides deprecation warnings and migration paths for existing
 * routing services, directing users to the new ProductionRoutingService.
 */

import productionRoutingService from './ProductionRoutingService.js';

class LegacyRoutingWrapper {
  constructor(serviceName, migrationPath = null) {
    this.serviceName = serviceName;
    this.migrationPath = migrationPath;
    this.deprecationWarningShown = false;
  }

  /**
   * Show deprecation warning
   * @param {string} methodName - Method being called
   */
  _showDeprecationWarning(methodName) {
    if (this.deprecationWarningShown) return;
    
    console.warn(`
🚨 DEPRECATION WARNING 🚨
Service: ${this.serviceName}
Method: ${methodName}

This service has been deprecated and will be removed in a future version.
Please migrate to ProductionRoutingService for continued support.

Migration path: ${this.migrationPath || 'Use productionRoutingService directly'}

Example:
  import productionRoutingService from './productionRouting/ProductionRoutingService.js';
  const result = await productionRoutingService.calculateRoute(origin, destination, options);
    `);
    
    this.deprecationWarningShown = true;
  }

  /**
   * Legacy wrapper for calculateRoute
   */
  async calculateRoute(origin, destination, options = {}) {
    this._showDeprecationWarning('calculateRoute');
    
    try {
      return await productionRoutingService.calculateRoute(origin, destination, options);
    } catch (error) {
      throw new Error(`Deprecated service ${this.serviceName} failed: ${error.message}`);
    }
  }

  /**
   * Legacy wrapper for initialize
   */
  async initialize(options = {}) {
    this._showDeprecationWarning('initialize');
    
    try {
      return await productionRoutingService.initialize(options);
    } catch (error) {
      throw new Error(`Deprecated service ${this.serviceName} failed to initialize: ${error.message}`);
    }
  }

  /**
   * Legacy wrapper for getHealthStatus
   */
  getHealthStatus() {
    this._showDeprecationWarning('getHealthStatus');
    
    try {
      return productionRoutingService.getHealthStatus();
    } catch (error) {
      throw new Error(`Deprecated service ${this.serviceName} failed to get health status: ${error.message}`);
    }
  }

  /**
   * Legacy wrapper for shutdown
   */
  async shutdown() {
    this._showDeprecationWarning('shutdown');
    
    try {
      return await productionRoutingService.shutdown();
    } catch (error) {
      throw new Error(`Deprecated service ${this.serviceName} failed to shutdown: ${error.message}`);
    }
  }

  /**
   * Legacy wrapper for warmCache
   */
  async warmCache(routePairs = []) {
    this._showDeprecationWarning('warmCache');
    
    try {
      return await productionRoutingService.warmCache(routePairs);
    } catch (error) {
      throw new Error(`Deprecated service ${this.serviceName} failed to warm cache: ${error.message}`);
    }
  }
}

// Create deprecation wrappers for each legacy service
export const createDeprecatedService = (serviceName, migrationPath = null) => {
  return new LegacyRoutingWrapper(serviceName, migrationPath);
};

// Specific deprecation wrappers for known services
export const deprecatedHardenedRoutingService = createDeprecatedService(
  'hardenedRoutingService',
  'Use productionRoutingService directly - it includes all hardened features'
);

export const deprecatedRestoredRoutingService = createDeprecatedService(
  'restoredRoutingService', 
  'Use productionRoutingService with DataManager for real Halifax data'
);

export const deprecatedUnifiedRoutingService = createDeprecatedService(
  'unifiedRoutingService',
  'Use productionRoutingService with enhanced AI integration'
);

export const deprecatedEnhancedUnifiedRoutingService = createDeprecatedService(
  'enhancedUnifiedRoutingService',
  'Use productionRoutingService with performance optimizations'
);

export const deprecatedConsolidatedMapboxRoutingService = createDeprecatedService(
  'consolidatedMapboxRoutingService',
  'Use productionRoutingService with Mapbox integration'
);

export const deprecatedAdvancedRoutingService = createDeprecatedService(
  'advancedRoutingService',
  'Use productionRoutingService with A* algorithm'
);

export const deprecatedOptimizedRoutingService = createDeprecatedService(
  'optimizedRoutingService',
  'Use productionRoutingService with spatial indexing'
);

export const deprecatedUnifiedAccessibleRoutingService = createDeprecatedService(
  'unifiedAccessibleRoutingService',
  'Use productionRoutingService with accessibility features'
);

export const deprecatedRoutingService = createDeprecatedService(
  'routingService',
  'Use productionRoutingService for basic routing'
);

export const deprecatedComprehensiveRoutingOrchestrator = createDeprecatedService(
  'comprehensiveRoutingOrchestrator',
  'Use productionRoutingService with orchestration capabilities'
);

export default LegacyRoutingWrapper;
