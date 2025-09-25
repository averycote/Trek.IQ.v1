/**
 * Data Consolidation Manager
 * 
 * Manages the consolidation of overlapping data services into unified implementations.
 * Provides deprecation warnings, migration paths, and gradual data service replacement.
 */

import unifiedDataManager from './unifiedDataManager.js';
import dataValidationService from './dataValidationService.js';

class DataConsolidationManager {
  constructor() {
    this.isInitialized = false;
    this.consolidationStatus = new Map();
    this.migrationProgress = new Map();
    this.deprecationWarnings = new Map();
    
    // Data service mapping for consolidation
    this.serviceMappings = {
      // Database Services → UnifiedDataManager
      'DataManager': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager.loadDataset(datasetName, options)',
        priority: 1,
        deprecated: true
      },
      'halifaxDatabaseService': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager with Halifax-specific datasets',
        priority: 1,
        deprecated: true
      },
      'optimizedDataService': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager with performance optimizations',
        priority: 1,
        deprecated: true
      },
      'offlineService': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager with offline support',
        priority: 1,
        deprecated: true
      },
      
      // Caching Services → UnifiedDataManager
      'performanceService': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager caching capabilities',
        priority: 2,
        deprecated: true
      },
      
      // Data Loading Services → UnifiedDataManager
      'halifaxTransitDataService': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager with transit datasets',
        priority: 2,
        deprecated: true
      },
      
      // Storage Services → UnifiedDataManager
      'authService': {
        target: 'unifiedDataManager',
        migrationPath: 'Use unifiedDataManager for user data storage',
        priority: 3,
        deprecated: true
      }
    };
    
    // Services to keep (not deprecated)
    this.keepServices = [
      'unifiedDataManager',
      'dataValidationService',
      'unifiedAPIService',
      'productionRoutingService',
      'performanceOptimizationService',
      'memoryLeakDetector',
      'serviceConsolidationManager',
      'componentConsolidationManager'
    ];
    
    // Data migration strategies
    this.migrationStrategies = {
      // Immediate migration (Priority 1)
      immediate: [
        'DataManager',
        'halifaxDatabaseService',
        'optimizedDataService',
        'offlineService'
      ],
      
      // Gradual migration (Priority 2)
      gradual: [
        'performanceService',
        'halifaxTransitDataService'
      ],
      
      // Optional migration (Priority 3)
      optional: [
        'authService'
      ]
    };
  }

  /**
   * Initialize the data consolidation manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Data Consolidation Manager...');
    
    // Initialize target services
    await unifiedDataManager.initialize();
    await dataValidationService.initialize();
    
    // Track consolidation status
    this._trackConsolidationStatus();
    
    this.isInitialized = true;
    console.log('✅ Data Consolidation Manager initialized');
  }

  /**
   * Get deprecation warning for a data service
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
Data Service: ${serviceName}
Method: ${methodName}

This data service has been deprecated and will be removed in a future version.
Please migrate to ${mapping.target} for continued support.

Migration path: ${mapping.migrationPath}

Example:
  import ${mapping.target} from './${mapping.target}.js';
  // Use the new service according to the migration path above
    `;
  }

  /**
   * Create a deprecated data service wrapper
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
        unifiedDataManager: 'Consolidates all data management services',
        dataValidationService: 'Provides data validation and consistency checks'
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
        title: `Priority ${priority} Data Services`,
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
   * Get data service usage statistics
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

  /**
   * Migrate data from legacy service to unified service
   * @param {string} serviceName - Legacy service name
   * @param {Object} data - Data to migrate
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration result
   */
  async migrateData(serviceName, data, options = {}) {
    const mapping = this.serviceMappings[serviceName];
    if (!mapping) {
      throw new Error(`No migration path found for service: ${serviceName}`);
    }
    
    try {
      console.log(`🔄 Migrating data from ${serviceName} to ${mapping.target}...`);
      
      const startTime = performance.now();
      let migratedData = data;
      
      // Apply service-specific migration logic
      switch (serviceName) {
        case 'DataManager':
          migratedData = await this._migrateDataManager(data, options);
          break;
        case 'halifaxDatabaseService':
          migratedData = await this._migrateHalifaxDatabase(data, options);
          break;
        case 'optimizedDataService':
          migratedData = await this._migrateOptimizedData(data, options);
          break;
        case 'offlineService':
          migratedData = await this._migrateOfflineData(data, options);
          break;
        case 'performanceService':
          migratedData = await this._migratePerformanceData(data, options);
          break;
        case 'halifaxTransitDataService':
          migratedData = await this._migrateTransitData(data, options);
          break;
        case 'authService':
          migratedData = await this._migrateAuthData(data, options);
          break;
        default:
          console.warn(`⚠️ No specific migration logic for ${serviceName}, using direct transfer`);
      }
      
      // Validate migrated data
      if (options.validate !== false) {
        const validationResult = await dataValidationService.validateDataset(
          serviceName, 
          migratedData
        );
        
        if (!validationResult.isValid) {
          console.warn(`⚠️ Migrated data validation failed:`, validationResult.errors);
        }
      }
      
      const migrationTime = performance.now() - startTime;
      
      // Track migration progress
      this.trackMigrationProgress(serviceName, 'completed');
      
      console.log(`✅ Data migration completed in ${migrationTime.toFixed(2)}ms`);
      
      return {
        success: true,
        migratedData,
        migrationTime,
        validationResult: options.validate !== false ? validationResult : null
      };
      
    } catch (error) {
      console.error(`❌ Data migration failed for ${serviceName}:`, error);
      this.trackMigrationProgress(serviceName, 'failed');
      
      return {
        success: false,
        error: error.message,
        originalData: data
      };
    }
  }

  /**
   * Get data quality report across all services
   * @returns {Object} Data quality report
   */
  async getDataQualityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overall: {
        quality: 0,
        totalDatasets: 0,
        validatedDatasets: 0,
        issues: []
      },
      services: {},
      recommendations: []
    };
    
    try {
      // Get quality report from validation service
      const validationReport = dataValidationService.getQualityReport();
      report.overall = validationReport.overall;
      
      // Get status from unified data manager
      const dataManagerStatus = unifiedDataManager.getStatus();
      report.services.unifiedDataManager = {
        status: dataManagerStatus,
        quality: dataManagerStatus.performance?.cacheHitRate || 0
      };
      
      // Generate recommendations
      report.recommendations = this._generateQualityRecommendations(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Failed to generate data quality report:', error);
      report.overall.issues.push(error.message);
      return report;
    }
  }

  // Private methods

  _trackConsolidationStatus() {
    Object.keys(this.serviceMappings).forEach(serviceName => {
      this.consolidationStatus.set(serviceName, {
        status: this.serviceMappings[serviceName].deprecated ? 'deprecated' : 'active',
        target: this.serviceMappings[serviceName].target,
        priority: this.serviceMappings[serviceName].priority,
        lastChecked: new Date().toISOString()
      });
    });
  }

  _getPriorityDescription(priority) {
    const descriptions = {
      1: 'Critical data services that should be migrated immediately',
      2: 'Important data services that should be migrated soon',
      3: 'Optional data services that can be migrated later'
    };
    
    return descriptions[priority] || 'Data services to be migrated';
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
      case 'failed':
        return 0;
      default:
        return 0;
    }
  }

  _generateNextSteps(recommendations, usage) {
    const nextSteps = [];
    
    if (usage.migrationProgress.notStarted > 0) {
      nextSteps.push('Start migrating Priority 1 data services immediately');
    }
    
    if (usage.migrationProgress.inProgress > 0) {
      nextSteps.push('Complete in-progress data service migrations');
    }
    
    if (usage.totalDeprecationWarnings > 0) {
      nextSteps.push('Address deprecation warnings in data services');
    }
    
    if (recommendations.length > 0) {
      nextSteps.push('Follow migration recommendations by priority');
    }
    
    nextSteps.push('Validate data quality after migration');
    nextSteps.push('Update data access patterns to use unified services');
    
    return nextSteps;
  }

  async _migrateDataManager(data, options) {
    // Migrate DataManager data to unifiedDataManager format
    const migratedData = {};
    
    if (data.datasets) {
      for (const [datasetName, datasetData] of data.datasets.entries()) {
        migratedData[datasetName] = datasetData;
      }
    }
    
    return migratedData;
  }

  async _migrateHalifaxDatabase(data, options) {
    // Migrate Halifax database data to unified format
    const migratedData = {};
    
    if (data.halifaxData) {
      // Map Halifax-specific data to standard dataset names
      const mapping = {
        'active_travelways': 'activeTravelways',
        'sidewalk_steps': 'steps',
        'closures': 'sidewalkClosures',
        'traffic_control': 'trafficControl',
        'accessible_parking': 'accessibleParking',
        'transit_stops': 'transitStops',
        'street_lights': 'streetLights',
        'public_washrooms': 'publicWashrooms'
      };
      
      Object.entries(mapping).forEach(([halifaxKey, unifiedKey]) => {
        if (data.halifaxData[halifaxKey]) {
          migratedData[unifiedKey] = data.halifaxData[halifaxKey];
        }
      });
    }
    
    return migratedData;
  }

  async _migrateOptimizedData(data, options) {
    // Migrate optimized data service data
    const migratedData = {};
    
    if (data.cache) {
      // Migrate cache data
      for (const [key, value] of data.cache.entries()) {
        migratedData[key] = value;
      }
    }
    
    return migratedData;
  }

  async _migrateOfflineData(data, options) {
    // Migrate offline service data
    const migratedData = {};
    
    if (data.offlineData) {
      // Migrate offline datasets
      Object.entries(data.offlineData).forEach(([key, value]) => {
        migratedData[key] = value;
      });
    }
    
    return migratedData;
  }

  async _migratePerformanceData(data, options) {
    // Migrate performance service data
    const migratedData = {};
    
    if (data.metrics) {
      migratedData.performanceMetrics = data.metrics;
    }
    
    return migratedData;
  }

  async _migrateTransitData(data, options) {
    // Migrate transit data service data
    const migratedData = {};
    
    if (data.transitData) {
      migratedData.transitStops = data.transitData.stops;
      migratedData.transitRoutes = data.transitData.routes;
    }
    
    return migratedData;
  }

  async _migrateAuthData(data, options) {
    // Migrate auth service data
    const migratedData = {};
    
    if (data.userData) {
      migratedData.userPreferences = data.userData.preferences;
      migratedData.userProfile = data.userData.profile;
    }
    
    return migratedData;
  }

  _generateQualityRecommendations(report) {
    const recommendations = [];
    
    if (report.overall.quality < 0.8) {
      recommendations.push('Data quality is below 80%. Consider running data validation and correction.');
    }
    
    if (report.overall.validatedDatasets < report.overall.totalDatasets) {
      recommendations.push('Not all datasets have been validated. Run comprehensive validation.');
    }
    
    if (report.overall.issues.length > 0) {
      recommendations.push('Address data quality issues identified in the report.');
    }
    
    return recommendations;
  }
}

// Export singleton instance
const dataConsolidationManager = new DataConsolidationManager();
export default dataConsolidationManager;
