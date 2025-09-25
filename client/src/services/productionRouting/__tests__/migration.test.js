/**
 * Migration Tests for Production Routing Service
 * 
 * Tests the migration from legacy routing services to ProductionRoutingService
 * and ensures backward compatibility during the transition period.
 */

import productionRoutingService from '../ProductionRoutingService.js';
import DataManager from '../DataManager.js';
import { 
  deprecatedHardenedRoutingService,
  deprecatedRestoredRoutingService,
  deprecatedUnifiedRoutingService 
} from '../LegacyRoutingWrapper.js';

// Mock console.warn to capture deprecation warnings
const originalWarn = console.warn;
let deprecationWarnings = [];

beforeEach(() => {
  deprecationWarnings = [];
  console.warn = (...args) => {
    deprecationWarnings.push(args.join(' '));
  };
});

afterEach(() => {
  console.warn = originalWarn;
});

describe('ProductionRoutingService Migration Tests', () => {
  let dataManager;

  beforeEach(async () => {
    dataManager = new DataManager();
    await dataManager.initialize();
    
    // Initialize production service with DataManager
    await productionRoutingService.initialize({ dataManager });
  });

  afterEach(async () => {
    await productionRoutingService.shutdown();
  });

  describe('Service Initialization', () => {
    test('should initialize successfully with DataManager', async () => {
      const healthStatus = productionRoutingService.getHealthStatus();
      
      expect(healthStatus.isInitialized).toBe(true);
      expect(healthStatus.datasetsLoaded).toBeGreaterThan(0);
      expect(healthStatus.graphNodes).toBeGreaterThan(0);
      expect(healthStatus.graphEdges).toBeGreaterThan(0);
    });

    test('should handle initialization without DataManager', async () => {
      const service = new (await import('../ProductionRoutingService.js')).default();
      await service.initialize();
      
      const healthStatus = service.getHealthStatus();
      expect(healthStatus.isInitialized).toBe(true);
    });
  });

  describe('Route Calculation', () => {
    test('should calculate route between two points', async () => {
      const origin = [-63.5752, 44.6488];
      const destination = [-63.5713, 44.6519];
      
      const result = await productionRoutingService.calculateRoute(origin, destination);
      
      expect(result.success).toBe(true);
      expect(result.route).toBeDefined();
      expect(result.evidence).toBeDefined();
      expect(result.route.coordinates).toBeDefined();
      expect(result.route.totalDistance).toBeGreaterThan(0);
    });

    test('should handle invalid coordinates gracefully', async () => {
      const origin = [0, 0];
      const destination = [0, 0];
      
      const result = await productionRoutingService.calculateRoute(origin, destination);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should generate evidence object with all required fields', async () => {
      const origin = [-63.5752, 44.6488];
      const destination = [-63.5713, 44.6519];
      
      const result = await productionRoutingService.calculateRoute(origin, destination);
      
      expect(result.evidence).toMatchObject({
        requestId: expect.any(String),
        timestamp: expect.any(String),
        start_original: expect.any(Array),
        end_original: expect.any(Array),
        start_snapped: expect.any(Array),
        end_snapped: expect.any(Array),
        total_distance_m_by_edges: expect.any(Number),
        total_distance_m_by_turf: expect.any(Number),
        segment_count: expect.any(Number),
        steps_encountered_count: expect.any(Number),
        steep_length_m: expect.any(Number),
        percent_on_winter_maintained: expect.any(Number),
        score: expect.any(Number),
        score_breakdown: expect.any(Object),
        renderEvidence: expect.any(Object)
      });
    });

    test('should verify distance consistency between edges and turf', async () => {
      const origin = [-63.5752, 44.6488];
      const destination = [-63.5713, 44.6519];
      
      const result = await productionRoutingService.calculateRoute(origin, destination);
      
      const { total_distance_m_by_edges, total_distance_m_by_turf } = result.evidence;
      const difference = Math.abs(total_distance_m_by_edges - total_distance_m_by_turf);
      const tolerance = Math.max(total_distance_m_by_edges, total_distance_m_by_turf) * 0.005; // 0.5%
      
      expect(difference).toBeLessThanOrEqual(tolerance);
    });
  });

  describe('Configuration Management', () => {
    test('should update configuration at runtime', () => {
      const newConfig = {
        weights: {
          distance: 0.3,
          accessibility: 0.4,
          closure: 0.2,
          winter: 0.1
        }
      };
      
      productionRoutingService.updateConfig(newConfig);
      
      // Configuration should be updated
      expect(productionRoutingService.config.weights.distance).toBe(0.3);
      expect(productionRoutingService.config.weights.accessibility).toBe(0.4);
    });

    test('should enable/disable adaptive learning', () => {
      productionRoutingService.setAdaptiveLearning(true, { learningRate: 0.2 });
      
      expect(productionRoutingService.adaptiveLearning.enabled).toBe(true);
      expect(productionRoutingService.adaptiveLearning.learningRate).toBe(0.2);
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', async () => {
      const origin = [-63.5752, 44.6488];
      const destination = [-63.5713, 44.6519];
      
      await productionRoutingService.calculateRoute(origin, destination);
      
      const metrics = productionRoutingService.performanceMetrics;
      
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.successfulRequests).toBeGreaterThan(0);
      expect(metrics.routeComputationTime).toBeGreaterThan(0);
    });
  });

  describe('Cache Management', () => {
    test('should cache route results', async () => {
      const origin = [-63.5752, 44.6488];
      const destination = [-63.5713, 44.6519];
      
      // First call
      const result1 = await productionRoutingService.calculateRoute(origin, destination);
      
      // Second call should use cache
      const result2 = await productionRoutingService.calculateRoute(origin, destination);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.evidence.requestId).toBe(result2.evidence.requestId);
    });

    test('should warm cache with common routes', async () => {
      const routePairs = [
        [[-63.5752, 44.6488], [-63.5713, 44.6519]],
        [[-63.5752, 44.6488], [-63.5874, 44.6421]]
      ];
      
      await productionRoutingService.warmCache(routePairs);
      
      // Cache should be populated
      expect(productionRoutingService.evidenceCache.size).toBeGreaterThan(0);
    });
  });
});

describe('Legacy Service Deprecation Tests', () => {
  test('should show deprecation warning for hardenedRoutingService', async () => {
    const origin = [-63.5752, 44.6488];
    const destination = [-63.5713, 44.6519];
    
    await deprecatedHardenedRoutingService.calculateRoute(origin, destination);
    
    expect(deprecationWarnings.length).toBeGreaterThan(0);
    expect(deprecationWarnings[0]).toContain('DEPRECATION WARNING');
    expect(deprecationWarnings[0]).toContain('hardenedRoutingService');
  });

  test('should show deprecation warning for restoredRoutingService', async () => {
    await deprecatedRestoredRoutingService.initialize();
    
    expect(deprecationWarnings.length).toBeGreaterThan(0);
    expect(deprecationWarnings[0]).toContain('DEPRECATION WARNING');
    expect(deprecationWarnings[0]).toContain('restoredRoutingService');
  });

  test('should show deprecation warning for unifiedRoutingService', async () => {
    const healthStatus = deprecatedUnifiedRoutingService.getHealthStatus();
    
    expect(deprecationWarnings.length).toBeGreaterThan(0);
    expect(deprecationWarnings[0]).toContain('DEPRECATION WARNING');
    expect(deprecationWarnings[0]).toContain('unifiedRoutingService');
  });

  test('should only show deprecation warning once per service instance', async () => {
    const origin = [-63.5752, 44.6488];
    const destination = [-63.5713, 44.6519];
    
    // Call multiple methods
    await deprecatedHardenedRoutingService.calculateRoute(origin, destination);
    await deprecatedHardenedRoutingService.initialize();
    deprecatedHardenedRoutingService.getHealthStatus();
    
    // Should only show warning once
    const hardenedWarnings = deprecationWarnings.filter(w => w.includes('hardenedRoutingService'));
    expect(hardenedWarnings.length).toBe(1);
  });
});

describe('DataManager Tests', () => {
  let dataManager;

  beforeEach(async () => {
    dataManager = new DataManager();
  });

  test('should initialize successfully', async () => {
    await dataManager.initialize();
    
    const healthStatus = dataManager.getHealthStatus();
    expect(healthStatus.isInitialized).toBe(true);
    expect(healthStatus.loadedDatasets.length).toBeGreaterThan(0);
  });

  test('should load datasets with deduplication', async () => {
    await dataManager.initialize();
    
    // Load same dataset multiple times
    const dataset1 = await dataManager.loadDataset('activeTravelways');
    const dataset2 = await dataManager.loadDataset('activeTravelways');
    
    expect(dataset1).toBe(dataset2); // Should be same reference
  });

  test('should create spatial indexes', async () => {
    await dataManager.initialize();
    
    const spatialIndex = dataManager.getSpatialIndex('activeTravelways');
    expect(spatialIndex).toBeDefined();
    expect(spatialIndex.size).toBeGreaterThan(0);
  });

  test('should find nearest features', async () => {
    await dataManager.initialize();
    
    const point = [-63.5752, 44.6488];
    const nearest = dataManager.findNearestFeatures('activeTravelways', point, 1000);
    
    expect(Array.isArray(nearest)).toBe(true);
  });

  test('should get dataset metadata', async () => {
    await dataManager.initialize();
    
    const metadata = dataManager.getDatasetMetadata('activeTravelways');
    
    expect(metadata).toMatchObject({
      name: 'activeTravelways',
      featureCount: expect.any(Number),
      lastLoaded: expect.any(String),
      hasSpatialIndex: expect.any(Boolean),
      size: expect.any(Number)
    });
  });
});

describe('Integration Tests', () => {
  test('should work end-to-end with real coordinates', async () => {
    const dataManager = new DataManager();
    await dataManager.initialize();
    
    await productionRoutingService.initialize({ dataManager });
    
    // Test with Halifax coordinates
    const origin = [-63.5752, 44.6488]; // Halifax downtown
    const destination = [-63.5713, 44.6519]; // Nearby point
    
    const result = await productionRoutingService.calculateRoute(origin, destination);
    
    expect(result.success).toBe(true);
    expect(result.route.coordinates.length).toBeGreaterThan(1);
    expect(result.evidence.total_distance_m_by_edges).toBeGreaterThan(0);
    
    await productionRoutingService.shutdown();
  });

  test('should handle multiple concurrent requests', async () => {
    const dataManager = new DataManager();
    await dataManager.initialize();
    
    await productionRoutingService.initialize({ dataManager });
    
    const requests = [
      productionRoutingService.calculateRoute([-63.5752, 44.6488], [-63.5713, 44.6519]),
      productionRoutingService.calculateRoute([-63.5752, 44.6488], [-63.5874, 44.6421]),
      productionRoutingService.calculateRoute([-63.5713, 44.6519], [-63.5874, 44.6421])
    ];
    
    const results = await Promise.all(requests);
    
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
    
    await productionRoutingService.shutdown();
  });
});
