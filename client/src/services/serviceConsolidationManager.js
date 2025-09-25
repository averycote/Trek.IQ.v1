/**
 * Service Consolidation Manager
 * 
 * Manages the consolidation of overlapping services into unified implementations.
 * Provides deprecation warnings, migration paths, and gradual service replacement.
 */

import unifiedAPIService from './unifiedAPIService.js';
import productionRoutingService from './productionRouting/ProductionRoutingService.js';
import DataManager from './productionRouting/DataManager.js';

class ServiceConsolidationManager {
  constructor() {
    this.isInitialized = false;
    this.consolidationStatus = new Map();
    this.migrationProgress = new Map();
    this.deprecationWarnings = new Map();
    
    // Service mapping for consolidation
    this.serviceMappings = {
      // API Services → UnifiedAPIService
      'apiIntegrationManager': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request(service, endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'transitAPIService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("transit", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'wheelmapApiService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("wheelmap", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'openRouteService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("openRoute", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'openElevationService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("openElevation", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'overpassApiService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("overpass", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'enhancedOverpassService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("overpass", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      'mapboxSearchService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("mapbox", endpoint, options)',
        priority: 1,
        deprecated: true
      },
      
      // Search Services → UnifiedAPIService
      'enhancedSearchService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with search-specific endpoints',
        priority: 2,
        deprecated: true
      },
      'simpleGeocodingService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("mapbox", "/geocoding/v5/mapbox.places/", options)',
        priority: 2,
        deprecated: true
      },
      'geocodingService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("mapbox", "/geocoding/v5/mapbox.places/", options)',
        priority: 2,
        deprecated: true
      },
      
      // AI Services → UnifiedAPIService (with AI-specific endpoints)
      'aiService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with AI-specific endpoints',
        priority: 3,
        deprecated: true
      },
      'enhancedAIService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with enhanced AI endpoints',
        priority: 3,
        deprecated: true
      },
      'simpleAIService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with simple AI endpoints',
        priority: 3,
        deprecated: true
      },
      'aiLearningService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with learning endpoints',
        priority: 3,
        deprecated: true
      },
      
      // Routing Services → ProductionRoutingService
      'hardenedRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService.calculateRoute(origin, destination, options)',
        priority: 1,
        deprecated: true
      },
      'restoredRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with DataManager for Halifax data',
        priority: 1,
        deprecated: true
      },
      'unifiedRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with AI integration',
        priority: 1,
        deprecated: true
      },
      'enhancedUnifiedRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with performance optimizations',
        priority: 1,
        deprecated: true
      },
      'consolidatedMapboxRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with Mapbox integration',
        priority: 1,
        deprecated: true
      },
      'advancedRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with A* algorithm',
        priority: 1,
        deprecated: true
      },
      'optimizedRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with spatial indexing',
        priority: 1,
        deprecated: true
      },
      'unifiedAccessibleRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with accessibility features',
        priority: 1,
        deprecated: true
      },
      'routingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService for basic routing',
        priority: 1,
        deprecated: true
      },
      'comprehensiveRoutingOrchestrator': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with orchestration capabilities',
        priority: 1,
        deprecated: true
      },
      
      // Accessibility Services → UnifiedAPIService
      'accessibilityService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with accessibility endpoints',
        priority: 2,
        deprecated: true
      },
      'accessibilityCloudService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with cloud accessibility endpoints',
        priority: 2,
        deprecated: true
      },
      'accessibilityFilterService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with filter endpoints',
        priority: 2,
        deprecated: true
      },
      'enhancedAccessibleRoutingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService with enhanced accessibility',
        priority: 1,
        deprecated: true
      },
      
      // Transit Services → UnifiedAPIService
      'transitService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("transit", endpoint, options)',
        priority: 2,
        deprecated: true
      },
      'halifaxTransitDataService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService with Halifax-specific transit endpoints',
        priority: 2,
        deprecated: true
      },
      
      // Elevation Services → UnifiedAPIService
      'elevationService': {
        target: 'unifiedAPIService',
        migrationPath: 'Use unifiedAPIService.request("openElevation", endpoint, options)',
        priority: 2,
        deprecated: true
      },
      
      // Rendering Services → ProductionRoutingService
      'routeRenderingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService route rendering capabilities',
        priority: 2,
        deprecated: true
      },
      'simpleRouteRenderingService': {
        target: 'productionRoutingService',
        migrationPath: 'Use productionRoutingService simple rendering',
        priority: 2,
        deprecated: true
      }
    };
    
    // Services to keep (not deprecated)
    this.keepServices = [
      'unifiedAPIService',
      'productionRoutingService',
      'DataManager',
      'performanceOptimizationService',
      'memoryLeakDetector',
      'authService',
      'barrierService',
      'barrierReportingService',
      'geolocationService',
      'weatherService',
      'voiceNavigationService',
      'offlineService',
      'debugService',
      'performanceService',
      'optimizedDataService',
      'mapillaryService',
      'halifaxDatabaseService'
    ];
  }

  /**
   * Initialize the service consolidation manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Service Consolidation Manager...');
    
    // Initialize target services
    await unifiedAPIService.initialize();
    await productionRoutingService.initialize();
    
    // Track consolidation status
    this._trackConsolidationStatus();
    
    this.isInitialized = true;
    console.log('✅ Service Consolidation Manager initialized');
  }

  /**
   * Get deprecation warning for a service
   * @param {string} serviceName - Service name
   * @param {string} methodName - Method being called
   * @returns {string} Deprecation warning message
   */
  getDeprecationWarning(serviceName, methodName = 'unknown') {
    const mapping = this.serviceMappings[serviceName];
    if (!mapping || !mapping.deprecated) {
      return null;
    }
    
    const warningKey = `${serviceName}:${methodName}`;
    if (this.deprecationWarnings.has(warningKey)) {
      return null; // Already shown
    }
    
    this.deprecationWarnings.set(warningKey, true);
    
    return `
🚨 DEPRECATION WARNING 🚨
Service: ${serviceName}
Method: ${methodName}

This service has been deprecated and will be removed in a future version.
Please migrate to ${mapping.target} for continued support.

Migration path: ${mapping.migrationPath}

Example:
  import ${mapping.target} from './${mapping.target}.js';
  // Use the new service according to the migration path above
    `;
  }

  /**
   * Create a deprecated service wrapper
   * @param {string} serviceName - Service name
   * @param {Object} serviceInstance - Service instance
   * @returns {Object} Wrapped service with deprecation warnings
   */
  createDeprecatedWrapper(serviceName, serviceInstance) {
    const mapping = this.serviceMappings[serviceName];
    if (!mapping || !mapping.deprecated) {
      return serviceInstance;
    }
    
    return new Proxy(serviceInstance, {
      get(target, prop) {
        if (typeof target[prop] === 'function') {
          return function(...args) {
            const warning = this.getDeprecationWarning(serviceName, prop);
            if (warning) {
              console.warn(warning);
            }
            return target[prop].apply(target, args);
          }.bind(this);
        }
        return target[prop];
      }
    });
  }

  /**
   * Get consolidation status
   * @returns {Object} Consolidation status
   */
  getConsolidationStatus() {
    return {
      isInitialized: this.isInitialized,
      totalServices: Object.keys(this.serviceMappings).length,
      deprecatedServices: Object.values(this.serviceMappings).filter(m => m.deprecated).length,
      migrationProgress: Object.fromEntries(this.migrationProgress),
      consolidationStatus: Object.fromEntries(this.consolidationStatus),
      targetServices: {
        unifiedAPIService: 'Consolidates all API services',
        productionRoutingService: 'Consolidates all routing services',
        DataManager: 'Centralized dataset management'
      }
    };
  }

  /**
   * Get migration recommendations
   * @returns {Array} Array of migration recommendations
   */
  getMigrationRecommendations() {
    const recommendations = [];
    
    // Group by priority
    const byPriority = {};
    Object.entries(this.serviceMappings).forEach(([service, mapping]) => {
      if (!byPriority[mapping.priority]) {
        byPriority[mapping.priority] = [];
      }
      byPriority[mapping.priority].push({ service, ...mapping });
    });
    
    // Generate recommendations by priority
    Object.keys(byPriority).sort().forEach(priority => {
      const services = byPriority[priority];
      recommendations.push({
        priority: parseInt(priority),
        title: `Priority ${priority} Services`,
        services: services.map(s => ({
          name: s.service,
          target: s.target,
          migrationPath: s.migrationPath
        })),
        description: this._getPriorityDescription(priority)
      });
    });
    
    return recommendations;
  }

  /**
   * Track migration progress
   * @param {string} serviceName - Service name
   * @param {string} status - Migration status
   */
  trackMigrationProgress(serviceName, status) {
    this.migrationProgress.set(serviceName, {
      status,
      timestamp: new Date().toISOString(),
      progress: this._calculateProgress(serviceName, status)
    });
  }

  /**
   * Get service usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStatistics() {
    const stats = {
      totalDeprecationWarnings: this.deprecationWarnings.size,
      servicesWithWarnings: new Set(Array.from(this.deprecationWarnings.keys())
        .map(key => key.split(':')[0])).size,
      migrationProgress: {
        completed: 0,
        inProgress: 0,
        notStarted: 0
      }
    };
    
    // Calculate migration progress
    Object.values(this.migrationProgress).forEach(progress => {
      switch (progress.status) {
        case 'completed':
          stats.migrationProgress.completed++;
          break;
        case 'in_progress':
          stats.migrationProgress.inProgress++;
          break;
        default:
          stats.migrationProgress.notStarted++;
      }
    });
    
    return stats;
  }

  /**
   * Generate migration report
   * @returns {Object} Migration report
   */
  generateMigrationReport() {
    const status = this.getConsolidationStatus();
    const recommendations = this.getMigrationRecommendations();
    const usage = this.getUsageStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalServices: status.totalServices,
        deprecatedServices: status.deprecatedServices,
        targetServices: Object.keys(status.targetServices).length,
        migrationProgress: usage.migrationProgress
      },
      recommendations,
      usage,
      nextSteps: this._generateNextSteps(recommendations, usage)
    };
  }

  // Private methods

  _trackConsolidationStatus() {
    Object.keys(this.serviceMappings).forEach(serviceName => {
      this.consolidationStatus.set(serviceName, {
        status: 'deprecated',
        target: this.serviceMappings[serviceName].target,
        priority: this.serviceMappings[serviceName].priority,
        lastChecked: new Date().toISOString()
      });
    });
  }

  _getPriorityDescription(priority) {
    const descriptions = {
      1: 'Critical services that should be migrated immediately',
      2: 'Important services that should be migrated soon',
      3: 'Optional services that can be migrated later'
    };
    
    return descriptions[priority] || 'Services to be migrated';
  }

  _calculateProgress(serviceName, status) {
    const mapping = this.serviceMappings[serviceName];
    if (!mapping) return 0;
    
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      case 'planned':
        return 25;
      default:
        return 0;
    }
  }

  _generateNextSteps(recommendations, usage) {
    const nextSteps = [];
    
    if (usage.migrationProgress.notStarted > 0) {
      nextSteps.push('Start migrating Priority 1 services immediately');
    }
    
    if (usage.migrationProgress.inProgress > 0) {
      nextSteps.push('Complete in-progress migrations');
    }
    
    if (usage.totalDeprecationWarnings > 0) {
      nextSteps.push('Address deprecation warnings in codebase');
    }
    
    if (recommendations.length > 0) {
      nextSteps.push('Follow migration recommendations by priority');
    }
    
    return nextSteps;
  }
}

// Export singleton instance
const serviceConsolidationManager = new ServiceConsolidationManager();
export default serviceConsolidationManager;
