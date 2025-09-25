/**
 * API Integration Tests
 * 
 * Tests for unified API service, service consolidation manager,
 * and API integration patterns across the application.
 */

import unifiedAPIService from '../unifiedAPIService.js';
import serviceConsolidationManager from '../serviceConsolidationManager.js';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock performance.now
global.performance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024
  }
};

describe('Unified API Service', () => {
  beforeEach(async () => {
    await unifiedAPIService.initialize();
    fetch.mockClear();
  });

  afterEach(async () => {
    await unifiedAPIService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedAPIService.isInitialized).toBe(true);
    });

    test('should initialize rate limiters', () => {
      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.services).toBeDefined();
    });

    test('should initialize circuit breakers', () => {
      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.circuitBreakers).toBeDefined();
    });
  });

  describe('API Requests', () => {
    test('should make successful API request', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await unifiedAPIService.request('mapbox', '/test', {
        method: 'GET'
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.mapbox.com/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });

    test('should handle API request errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(
        unifiedAPIService.request('mapbox', '/nonexistent')
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    test('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        unifiedAPIService.request('mapbox', '/test')
      ).rejects.toThrow('Network error');
    });

    test('should add authentication headers', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await unifiedAPIService.request('mapbox', '/test');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    test('should respect rate limits', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // Make multiple requests quickly
      const promises = Array(5).fill().map(() =>
        unifiedAPIService.request('mapbox', '/test')
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      expect(fetch).toHaveBeenCalledTimes(5);
    });

    test('should track rate limiting metrics', async () => {
      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.metrics.rateLimitedRequests).toBeDefined();
    });
  });

  describe('Caching', () => {
    test('should cache successful responses', async () => {
      const mockResponse = { data: 'cached' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First request
      const result1 = await unifiedAPIService.request('mapbox', '/cache-test');
      expect(result1).toEqual(mockResponse);

      // Second request should use cache
      const result2 = await unifiedAPIService.request('mapbox', '/cache-test');
      expect(result2).toEqual(mockResponse);

      // Should only make one actual request
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should not cache error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // First request fails
      await expect(
        unifiedAPIService.request('mapbox', '/error-test')
      ).rejects.toThrow();

      // Second request should retry (not cached)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'success' })
      });

      const result = await unifiedAPIService.request('mapbox', '/error-test');
      expect(result).toEqual({ data: 'success' });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('should clear cache', () => {
      unifiedAPIService.clearCache('mapbox');
      
      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.cache.size).toBe(0);
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit breaker after failures', async () => {
      // Mock multiple failures
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      // Make multiple failing requests
      const promises = Array(6).fill().map(() =>
        unifiedAPIService.request('mapbox', '/failing-endpoint').catch(() => {})
      );

      await Promise.all(promises);

      // Circuit breaker should be open
      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.circuitBreakers.mapbox.state).toBe('OPEN');
    });

    test('should track circuit breaker trips', async () => {
      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.metrics.circuitBreakerTrips).toBeDefined();
    });
  });

  describe('Batch Requests', () => {
    test('should handle batch requests', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const requests = [
        { service: 'mapbox', endpoint: '/test1' },
        { service: 'mapbox', endpoint: '/test2' },
        { service: 'mapbox', endpoint: '/test3' }
      ];

      const results = await unifiedAPIService.batchRequest(requests);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect(result.value).toEqual(mockResponse);
      });
    });
  });

  describe('Health Monitoring', () => {
    test('should provide health status', () => {
      const healthStatus = unifiedAPIService.getHealthStatus();
      
      expect(healthStatus.isInitialized).toBe(true);
      expect(healthStatus.services).toBeDefined();
      expect(healthStatus.metrics).toBeDefined();
      expect(healthStatus.performance).toBeDefined();
      expect(healthStatus.circuitBreakers).toBeDefined();
      expect(healthStatus.cache).toBeDefined();
    });

    test('should track performance metrics', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await unifiedAPIService.request('mapbox', '/test');

      const healthStatus = unifiedAPIService.getHealthStatus();
      expect(healthStatus.metrics.totalRequests).toBeGreaterThan(0);
      expect(healthStatus.metrics.successfulRequests).toBeGreaterThan(0);
      expect(healthStatus.performance.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    test('should update API configuration', () => {
      const newConfig = {
        timeout: 15000,
        rateLimit: { requests: 1000, window: 60000 }
      };

      unifiedAPIService.updateAPIConfig('mapbox', newConfig);
      
      // Configuration should be updated
      expect(unifiedAPIService.apiConfigs.mapbox.timeout).toBe(15000);
      expect(unifiedAPIService.apiConfigs.mapbox.rateLimit.requests).toBe(1000);
    });
  });
});

describe('Service Consolidation Manager', () => {
  beforeEach(async () => {
    await serviceConsolidationManager.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(serviceConsolidationManager.isInitialized).toBe(true);
    });

    test('should track consolidation status', () => {
      const status = serviceConsolidationManager.getConsolidationStatus();
      expect(status.totalServices).toBeGreaterThan(0);
      expect(status.deprecatedServices).toBeGreaterThan(0);
    });
  });

  describe('Deprecation Warnings', () => {
    test('should generate deprecation warnings', () => {
      const warning = serviceConsolidationManager.getDeprecationWarning(
        'hardenedRoutingService',
        'calculateRoute'
      );

      expect(warning).toContain('DEPRECATION WARNING');
      expect(warning).toContain('hardenedRoutingService');
      expect(warning).toContain('productionRoutingService');
    });

    test('should not show duplicate warnings', () => {
      // First call
      const warning1 = serviceConsolidationManager.getDeprecationWarning(
        'hardenedRoutingService',
        'calculateRoute'
      );
      expect(warning1).toBeTruthy();

      // Second call should return null (already shown)
      const warning2 = serviceConsolidationManager.getDeprecationWarning(
        'hardenedRoutingService',
        'calculateRoute'
      );
      expect(warning2).toBeNull();
    });

    test('should not warn for non-deprecated services', () => {
      const warning = serviceConsolidationManager.getDeprecationWarning(
        'unifiedAPIService',
        'request'
      );
      expect(warning).toBeNull();
    });
  });

  describe('Service Mappings', () => {
    test('should have correct service mappings', () => {
      const status = serviceConsolidationManager.getConsolidationStatus();
      
      // Check that routing services map to productionRoutingService
      expect(serviceConsolidationManager.serviceMappings.hardenedRoutingService.target)
        .toBe('productionRoutingService');
      expect(serviceConsolidationManager.serviceMappings.restoredRoutingService.target)
        .toBe('productionRoutingService');
      
      // Check that API services map to unifiedAPIService
      expect(serviceConsolidationManager.serviceMappings.transitAPIService.target)
        .toBe('unifiedAPIService');
      expect(serviceConsolidationManager.serviceMappings.wheelmapApiService.target)
        .toBe('unifiedAPIService');
    });

    test('should have priority-based mappings', () => {
      const mappings = serviceConsolidationManager.serviceMappings;
      
      // Priority 1 services (critical)
      expect(mappings.hardenedRoutingService.priority).toBe(1);
      expect(mappings.transitAPIService.priority).toBe(1);
      
      // Priority 2 services (important)
      expect(mappings.enhancedSearchService.priority).toBe(2);
      expect(mappings.accessibilityService.priority).toBe(2);
    });
  });

  describe('Migration Recommendations', () => {
    test('should generate migration recommendations', () => {
      const recommendations = serviceConsolidationManager.getMigrationRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check priority structure
      recommendations.forEach(rec => {
        expect(rec.priority).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.services).toBeInstanceOf(Array);
        expect(rec.description).toBeDefined();
      });
    });

    test('should group services by priority', () => {
      const recommendations = serviceConsolidationManager.getMigrationRecommendations();
      
      const priorities = recommendations.map(r => r.priority);
      expect(priorities).toEqual([...priorities].sort());
    });
  });

  describe('Migration Progress Tracking', () => {
    test('should track migration progress', () => {
      serviceConsolidationManager.trackMigrationProgress(
        'hardenedRoutingService',
        'in_progress'
      );

      const status = serviceConsolidationManager.getConsolidationStatus();
      expect(status.migrationProgress.hardenedRoutingService).toBeDefined();
      expect(status.migrationProgress.hardenedRoutingService.status).toBe('in_progress');
    });

    test('should calculate progress percentages', () => {
      serviceConsolidationManager.trackMigrationProgress(
        'hardenedRoutingService',
        'completed'
      );

      const status = serviceConsolidationManager.getConsolidationStatus();
      expect(status.migrationProgress.hardenedRoutingService.progress).toBe(100);
    });
  });

  describe('Usage Statistics', () => {
    test('should track usage statistics', () => {
      const stats = serviceConsolidationManager.getUsageStatistics();
      
      expect(stats.totalDeprecationWarnings).toBeDefined();
      expect(stats.servicesWithWarnings).toBeDefined();
      expect(stats.migrationProgress).toBeDefined();
      expect(stats.migrationProgress.completed).toBeDefined();
      expect(stats.migrationProgress.inProgress).toBeDefined();
      expect(stats.migrationProgress.notStarted).toBeDefined();
    });
  });

  describe('Migration Report', () => {
    test('should generate migration report', () => {
      const report = serviceConsolidationManager.generateMigrationReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.usage).toBeDefined();
      expect(report.nextSteps).toBeDefined();
    });

    test('should include next steps', () => {
      const report = serviceConsolidationManager.generateMigrationReport();
      
      expect(report.nextSteps).toBeInstanceOf(Array);
      expect(report.nextSteps.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for service consolidation', async () => {
    // Initialize both services
    await unifiedAPIService.initialize();
    await serviceConsolidationManager.initialize();
    
    // Get deprecation warning
    const warning = serviceConsolidationManager.getDeprecationWarning(
      'transitAPIService',
      'getBusLocations'
    );
    
    expect(warning).toContain('unifiedAPIService');
    expect(warning).toContain('transit');
    
    // Make API request using unified service
    const mockResponse = { buses: [] };
    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });
    
    const result = await unifiedAPIService.request('transit', '/buses');
    expect(result).toEqual(mockResponse);
    
    // Check health status
    const apiHealth = unifiedAPIService.getHealthStatus();
    const consolidationStatus = serviceConsolidationManager.getConsolidationStatus();
    
    expect(apiHealth.isInitialized).toBe(true);
    expect(consolidationStatus.isInitialized).toBe(true);
    
    // Cleanup
    await unifiedAPIService.shutdown();
  });
});
