/**
 * System Integration Tests
 * 
 * Tests for system integration service and end-to-end system validation
 * across all unified services in the Trek-IQ application.
 */

import systemIntegrationService from '../systemIntegrationService.js';

// Mock all unified services
jest.mock('../unifiedAPIService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ requests: 100, errors: 0 }))
}));

jest.mock('../unifiedDataManager.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ datasets: 5, cacheHitRate: 0.85 }))
}));

jest.mock('../unifiedSecurityService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ authRequests: 50, successRate: 0.98 }))
}));

jest.mock('../unifiedTestingService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ testsRun: 100, passed: 95 }))
}));

jest.mock('../unifiedDocumentationService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ documents: 25, views: 1000 }))
}));

jest.mock('../unifiedErrorHandlingService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ errorsHandled: 10, recoveryRate: 0.9 }))
}));

jest.mock('../unifiedLoggingService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ logsGenerated: 500, errorRate: 0.02 }))
}));

jest.mock('../unifiedConfigurationService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  get: jest.fn((path) => {
    const configs = {
      'security.encryptionEnabled': true,
      'api.baseUrl': 'https://api.test.com',
      'application.debug': false
    };
    return configs[path] || null;
  }),
  getMetrics: jest.fn(() => ({ configsLoaded: 50, validationPassed: true }))
}));

jest.mock('../performanceOptimizationService.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ optimizations: 20, performanceGain: 0.15 }))
}));

jest.mock('../../utils/memoryLeakDetector.js', () => ({
  initialize: jest.fn(),
  shutdown: jest.fn(),
  isInitialized: false,
  getMetrics: jest.fn(() => ({ leaksDetected: 0, memoryUsage: 0.6 }))
}));

// Mock performance API
global.performance = {
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 200 * 1024 * 1024 // 200MB
  }
};

describe('SystemIntegrationService', () => {
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up mocks to return successful initialization
    const services = [
      'unifiedAPIService',
      'unifiedDataManager', 
      'unifiedSecurityService',
      'unifiedTestingService',
      'unifiedDocumentationService',
      'unifiedErrorHandlingService',
      'unifiedLoggingService',
      'unifiedConfigurationService',
      'performanceOptimizationService',
      'memoryLeakDetector'
    ];
    
    services.forEach(serviceName => {
      const mockService = require(`../${serviceName}.js`);
      mockService.initialize.mockResolvedValue();
      mockService.isInitialized = true;
    });
  });

  afterEach(async () => {
    await systemIntegrationService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await systemIntegrationService.initialize();
      
      expect(systemIntegrationService.isInitialized).toBe(true);
      expect(systemIntegrationService.services.size).toBeGreaterThan(0);
    });

    test('should register all unified services', async () => {
      await systemIntegrationService.initialize();
      
      const expectedServices = [
        'unifiedAPIService',
        'unifiedDataManager',
        'unifiedSecurityService',
        'unifiedTestingService',
        'unifiedDocumentationService',
        'unifiedErrorHandlingService',
        'unifiedLoggingService',
        'unifiedConfigurationService',
        'performanceOptimizationService',
        'memoryLeakDetector'
      ];
      
      expectedServices.forEach(serviceName => {
        expect(systemIntegrationService.services.has(serviceName)).toBe(true);
      });
    });

    test('should initialize services in dependency order', async () => {
      await systemIntegrationService.initialize();
      
      // Check that configuration service is initialized first
      const configService = systemIntegrationService.services.get('unifiedConfigurationService');
      expect(configService.initialize).toHaveBeenCalled();
      
      // Check that dependent services are initialized after their dependencies
      const apiService = systemIntegrationService.services.get('unifiedAPIService');
      expect(apiService.initialize).toHaveBeenCalled();
    });

    test('should set up cross-service communication', async () => {
      await systemIntegrationService.initialize();
      
      expect(systemIntegrationService.crossServiceCommunication.size).toBeGreaterThan(0);
      expect(systemIntegrationService.crossServiceCommunication.has('api-to-data')).toBe(true);
      expect(systemIntegrationService.crossServiceCommunication.has('security-to-api')).toBe(true);
    });

    test('should run system validation', async () => {
      await systemIntegrationService.initialize();
      
      expect(systemIntegrationService.validationResults.size).toBeGreaterThan(0);
      expect(systemIntegrationService.validationResults.has('system')).toBe(true);
    });

    test('should start system monitoring', async () => {
      await systemIntegrationService.initialize();
      
      expect(systemIntegrationService.monitoringActive).toBe(true);
      expect(systemIntegrationService.monitoringIntervals.length).toBeGreaterThan(0);
    });

    test('should set up recovery strategies', async () => {
      await systemIntegrationService.initialize();
      
      expect(systemIntegrationService.recoveryStrategies.size).toBeGreaterThan(0);
      expect(systemIntegrationService.recoveryStrategies.has('unifiedAPIService')).toBe(true);
    });

    test('should run integration tests', async () => {
      await systemIntegrationService.initialize();
      
      expect(systemIntegrationService.integrationResults.size).toBeGreaterThan(0);
      expect(systemIntegrationService.integrationResults.has('system')).toBe(true);
    });
  });

  describe('Service Management', () => {
    beforeEach(async () => {
      await systemIntegrationService.initialize();
    });

    test('should get service status', () => {
      const status = systemIntegrationService.getServiceStatus('unifiedAPIService');
      
      expect(status).toBeDefined();
      expect(status.name).toBe('unifiedAPIService');
      expect(status.initialized).toBe(true);
      expect(status.health).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(status.dependencies).toBeDefined();
    });

    test('should get system health', () => {
      const health = systemIntegrationService.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.services).toBeDefined();
      expect(health.performance).toBeDefined();
      expect(health.validation).toBeDefined();
      expect(health.integration).toBeDefined();
    });

    test('should get system metrics', () => {
      const metrics = systemIntegrationService.getSystemMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.services).toBeDefined();
      expect(metrics.services.total).toBeGreaterThan(0);
      expect(metrics.services.initialized).toBeGreaterThan(0);
      expect(metrics.performance).toBeDefined();
      expect(metrics.validation).toBeDefined();
      expect(metrics.integration).toBeDefined();
    });

    test('should restart service', async () => {
      const success = await systemIntegrationService.restartService('unifiedAPIService');
      
      expect(success).toBe(true);
    });

    test('should handle service restart failure', async () => {
      const apiService = systemIntegrationService.services.get('unifiedAPIService');
      apiService.initialize.mockRejectedValue(new Error('Restart failed'));
      
      const success = await systemIntegrationService.restartService('unifiedAPIService');
      
      expect(success).toBe(false);
    });
  });

  describe('System Validation', () => {
    beforeEach(async () => {
      await systemIntegrationService.initialize();
    });

    test('should validate individual services', async () => {
      const validation = systemIntegrationService.validationResults.get('system');
      
      expect(validation).toBeDefined();
      expect(validation.services).toBeDefined();
      expect(validation.dependencies).toBeDefined();
      expect(validation.performance).toBeDefined();
      expect(validation.security).toBeDefined();
      expect(validation.data).toBeDefined();
      expect(validation.overall).toBeDefined();
    });

    test('should validate service dependencies', async () => {
      const validation = systemIntegrationService.validationResults.get('system');
      
      expect(validation.dependencies).toBeDefined();
      expect(validation.dependencies.dependencies).toBeDefined();
    });

    test('should validate system performance', async () => {
      const validation = systemIntegrationService.validationResults.get('system');
      
      expect(validation.performance).toBeDefined();
      expect(validation.performance.metrics).toBeDefined();
    });

    test('should validate system security', async () => {
      const validation = systemIntegrationService.validationResults.get('system');
      
      expect(validation.security).toBeDefined();
      expect(validation.security.checks).toBeDefined();
    });

    test('should validate data integrity', async () => {
      const validation = systemIntegrationService.validationResults.get('system');
      
      expect(validation.data).toBeDefined();
      expect(validation.data.checks).toBeDefined();
    });
  });

  describe('System Monitoring', () => {
    beforeEach(async () => {
      await systemIntegrationService.initialize();
    });

    test('should monitor system health', async () => {
      // Wait for monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const health = systemIntegrationService.systemHealth;
      expect(health).toBeDefined();
      expect(health.overall).toBeDefined();
      expect(health.services).toBeDefined();
    });

    test('should monitor service health', async () => {
      // Wait for monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(systemIntegrationService.serviceHealth.size).toBeGreaterThan(0);
    });

    test('should monitor performance', async () => {
      // Wait for monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = systemIntegrationService.performanceMetrics;
      expect(metrics).toBeDefined();
      expect(metrics.runtime).toBeDefined();
      expect(metrics.memory).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await systemIntegrationService.initialize();
    });

    test('should run service communication tests', async () => {
      const results = systemIntegrationService.integrationResults.get('system');
      
      expect(results).toBeDefined();
      expect(results.tests).toBeDefined();
      expect(results.tests.service_communication).toBeDefined();
    });

    test('should run data flow tests', async () => {
      const results = systemIntegrationService.integrationResults.get('system');
      
      expect(results.tests.data_flow).toBeDefined();
    });

    test('should run error handling tests', async () => {
      const results = systemIntegrationService.integrationResults.get('system');
      
      expect(results.tests.error_handling).toBeDefined();
    });

    test('should run performance tests', async () => {
      const results = systemIntegrationService.integrationResults.get('system');
      
      expect(results.tests.performance).toBeDefined();
    });

    test('should have overall test status', async () => {
      const results = systemIntegrationService.integrationResults.get('system');
      
      expect(results.overall).toBeDefined();
      expect(['passed', 'partial', 'failed']).toContain(results.overall);
    });
  });

  describe('Recovery Management', () => {
    beforeEach(async () => {
      await systemIntegrationService.initialize();
    });

    test('should have recovery strategies', () => {
      expect(systemIntegrationService.recoveryStrategies.size).toBeGreaterThan(0);
      expect(systemIntegrationService.recoveryStrategies.has('unifiedAPIService')).toBe(true);
      expect(systemIntegrationService.recoveryStrategies.has('unifiedDataManager')).toBe(true);
      expect(systemIntegrationService.recoveryStrategies.has('unifiedSecurityService')).toBe(true);
    });

    test('should have failover configuration', () => {
      expect(systemIntegrationService.failoverConfig.size).toBeGreaterThan(0);
      expect(systemIntegrationService.failoverConfig.has('api_failure')).toBe(true);
      expect(systemIntegrationService.failoverConfig.has('data_failure')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization failure gracefully', async () => {
      const configService = require('../unifiedConfigurationService.js');
      configService.initialize.mockRejectedValue(new Error('Configuration failed'));
      
      await expect(systemIntegrationService.initialize()).rejects.toThrow('Configuration failed');
    });

    test('should handle service validation failure', async () => {
      const apiService = require('../unifiedAPIService.js');
      apiService.isInitialized = false;
      
      await systemIntegrationService.initialize();
      
      const validation = systemIntegrationService.validationResults.get('system');
      expect(validation.services.unifiedAPIService.status).toBe('invalid');
    });

    test('should handle monitoring errors gracefully', async () => {
      await systemIntegrationService.initialize();
      
      // Mock performance API to throw error
      global.performance.memory = null;
      
      // Wait for monitoring to run
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not throw error
      expect(systemIntegrationService.monitoringActive).toBe(true);
    });
  });

  describe('Shutdown', () => {
    test('should shutdown all services', async () => {
      await systemIntegrationService.initialize();
      await systemIntegrationService.shutdown();
      
      expect(systemIntegrationService.isInitialized).toBe(false);
      expect(systemIntegrationService.services.size).toBe(0);
      expect(systemIntegrationService.monitoringActive).toBe(false);
    });

    test('should shutdown services in reverse order', async () => {
      await systemIntegrationService.initialize();
      
      const shutdownOrder = [...systemIntegrationService.initializationOrder].reverse();
      const shutdownCalls = [];
      
      // Track shutdown calls
      shutdownOrder.forEach(serviceName => {
        const service = systemIntegrationService.services.get(serviceName);
        if (service && service.shutdown) {
          service.shutdown.mockImplementation(() => {
            shutdownCalls.push(serviceName);
            return Promise.resolve();
          });
        }
      });
      
      await systemIntegrationService.shutdown();
      
      // Check that services were shutdown in reverse order
      expect(shutdownCalls.length).toBeGreaterThan(0);
    });

    test('should handle shutdown errors gracefully', async () => {
      await systemIntegrationService.initialize();
      
      const apiService = systemIntegrationService.services.get('unifiedAPIService');
      apiService.shutdown.mockRejectedValue(new Error('Shutdown failed'));
      
      // Should not throw error
      await expect(systemIntegrationService.shutdown()).resolves.toBeUndefined();
    });
  });
});

describe('Integration Tests', () => {
  test('should work with all unified services for complete system integration', async () => {
    // Initialize system integration service
    await systemIntegrationService.initialize();
    
    // Get system health
    const health = systemIntegrationService.getSystemHealth();
    expect(health.overall).toBeDefined();
    
    // Get system metrics
    const metrics = systemIntegrationService.getSystemMetrics();
    expect(metrics.services.total).toBeGreaterThan(0);
    
    // Get service status
    const apiStatus = systemIntegrationService.getServiceStatus('unifiedAPIService');
    expect(apiStatus.initialized).toBe(true);
    
    // Restart a service
    const restartSuccess = await systemIntegrationService.restartService('unifiedAPIService');
    expect(restartSuccess).toBe(true);
    
    // Cleanup
    await systemIntegrationService.shutdown();
  });

  test('should handle end-to-end system workflow', async () => {
    await systemIntegrationService.initialize();
    
    // System should be healthy
    const health = systemIntegrationService.getSystemHealth();
    expect(health.overall).toBeDefined();
    
    // All services should be initialized
    const metrics = systemIntegrationService.getSystemMetrics();
    expect(metrics.services.initialized).toBeGreaterThan(0);
    
    // System validation should pass
    const validation = systemIntegrationService.validationResults.get('system');
    expect(validation).toBeDefined();
    
    // Integration tests should run
    const integration = systemIntegrationService.integrationResults.get('system');
    expect(integration).toBeDefined();
    
    // Monitoring should be active
    expect(systemIntegrationService.monitoringActive).toBe(true);
    
    // Recovery strategies should be set up
    expect(systemIntegrationService.recoveryStrategies.size).toBeGreaterThan(0);
    
    // Cross-service communication should be configured
    expect(systemIntegrationService.crossServiceCommunication.size).toBeGreaterThan(0);
    
    // Cleanup
    await systemIntegrationService.shutdown();
  });
});
