/**
 * Data Management Tests
 * 
 * Tests for unified data manager, data validation service, and data consolidation
 * across the application.
 */

import unifiedDataManager from '../unifiedDataManager.js';
import dataValidationService from '../dataValidationService.js';
import dataConsolidationManager from '../dataConsolidationManager.js';

// Mock services
jest.mock('../unifiedAPIService.js', () => ({
  request: jest.fn(),
  initialize: jest.fn(),
  getHealthStatus: jest.fn(() => ({
    isInitialized: true,
    services: {},
    metrics: {},
    performance: {},
    circuitBreakers: {},
    cache: { size: 0, hitRate: 0 }
  }))
}));

jest.mock('../performanceOptimizationService.js', () => ({
  trackCache: jest.fn(),
  trackInterval: jest.fn(),
  trackEventListener: jest.fn()
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          get: jest.fn(() => ({
            onsuccess: null,
            onerror: null,
            result: null
          })),
          put: jest.fn(),
          createIndex: jest.fn()
        }))
      })),
      createObjectStore: jest.fn(() => ({
        createIndex: jest.fn()
      })),
      objectStoreNames: {
        contains: jest.fn(() => false)
      },
      close: jest.fn()
    }
  }))
};

global.indexedDB = mockIndexedDB;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
global.fetch = jest.fn();

describe('UnifiedDataManager', () => {
  beforeEach(async () => {
    await unifiedDataManager.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await unifiedDataManager.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedDataManager.isInitialized).toBe(true);
    });

    test('should initialize IndexedDB', () => {
      expect(mockIndexedDB.open).toHaveBeenCalledWith('TrekIQUnifiedDB', 1);
    });

    test('should initialize memory cache', () => {
      const status = unifiedDataManager.getStatus();
      expect(status.isInitialized).toBe(true);
    });
  });

  describe('Dataset Loading', () => {
    test('should load dataset from source', async () => {
      const mockData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[-63.5752, 44.6488], [-63.5753, 44.6489]]
            },
            properties: {
              id: 'test-1',
              name: 'Test Travelway'
            }
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      const result = await unifiedDataManager.loadDataset('activeTravelways');

      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith('/data/activeTravelways.geojson');
    });

    test('should cache dataset after loading', async () => {
      const mockData = { type: 'FeatureCollection', features: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      await unifiedDataManager.loadDataset('activeTravelways');
      
      // Second call should use cache
      const result = await unifiedDataManager.getDataset('activeTravelways');
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledTimes(1); // Only called once
    });

    test('should handle loading errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        unifiedDataManager.loadDataset('nonexistent')
      ).rejects.toThrow('Network error');
    });

    test('should load user data from localStorage', async () => {
      const mockUserData = {
        accessibility: { highContrast: true },
        routing: { avoidStairs: true },
        display: { theme: 'dark' }
      };

      mockLocalStorage.getItem.mockReturnValueOnce(
        JSON.stringify({
          data: mockUserData,
          timestamp: Date.now()
        })
      );

      const result = await unifiedDataManager.loadDataset('userPreferences');

      expect(result).toEqual(mockUserData);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('trek-iq-data-userPreferences');
    });
  });

  describe('Data Storage', () => {
    test('should store dataset in multiple storage layers', async () => {
      const testData = { type: 'FeatureCollection', features: [] };

      await unifiedDataManager.storeDataset('testDataset', testData);

      // Should be stored in memory cache
      const memoryData = unifiedDataManager.memoryCache.get('testDataset');
      expect(memoryData).toBeTruthy();
      expect(memoryData.data).toEqual(testData);
    });

    test('should clear dataset from all storage layers', async () => {
      const testData = { type: 'FeatureCollection', features: [] };
      
      await unifiedDataManager.storeDataset('testDataset', testData);
      await unifiedDataManager.clearDataset('testDataset');

      const memoryData = unifiedDataManager.memoryCache.get('testDataset');
      expect(memoryData).toBeUndefined();
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', async () => {
      const mockData = { type: 'FeatureCollection', features: [] };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData
      });

      await unifiedDataManager.loadDataset('activeTravelways');

      const metrics = unifiedDataManager.getPerformanceMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.cacheHits).toBeDefined();
      expect(metrics.cacheMisses).toBeDefined();
    });

    test('should calculate cache hit rate', async () => {
      const metrics = unifiedDataManager.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Status and Health', () => {
    test('should provide status information', () => {
      const status = unifiedDataManager.getStatus();
      
      expect(status.isInitialized).toBe(true);
      expect(status.isOnline).toBeDefined();
      expect(status.datasets).toBeInstanceOf(Array);
      expect(status.cacheSize).toBeDefined();
      expect(status.performance).toBeDefined();
    });
  });
});

describe('DataValidationService', () => {
  beforeEach(async () => {
    await dataValidationService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(dataValidationService.isInitialized).toBe(true);
    });

    test('should initialize validation rules', () => {
      expect(dataValidationService.validationRules.size).toBeGreaterThan(0);
    });

    test('should initialize consistency checks', () => {
      expect(dataValidationService.consistencyChecks.size).toBeGreaterThan(0);
    });
  });

  describe('Dataset Validation', () => {
    test('should validate valid dataset', () => {
      const validData = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[-63.5752, 44.6488], [-63.5753, 44.6489]]
            },
            properties: {
              id: 'test-1',
              name: 'Test Travelway',
              accessibility: 'accessible'
            }
          }
        ]
      };

      const result = dataValidationService.validateDataset('activeTravelways', validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.quality).toBeGreaterThan(0);
    });

    test('should detect invalid dataset', () => {
      const invalidData = {
        type: 'InvalidType',
        features: 'not an array'
      };

      const result = dataValidationService.validateDataset('activeTravelways', invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.quality).toBeLessThan(1);
    });

    test('should validate user preferences', () => {
      const validPreferences = {
        accessibility: {
          highContrast: true,
          screenReader: false,
          reducedMotion: false
        },
        routing: {
          avoidStairs: true,
          preferAccessible: true,
          maxDistance: 5000
        },
        display: {
          theme: 'dark',
          language: 'en',
          units: 'metric'
        }
      };

      const result = dataValidationService.validateDataset('userPreferences', validPreferences);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid user preferences', () => {
      const invalidPreferences = {
        accessibility: {
          highContrast: 'invalid', // Should be boolean
          screenReader: false,
          reducedMotion: false
        },
        routing: {
          avoidStairs: true,
          preferAccessible: true,
          maxDistance: 'invalid' // Should be number
        },
        display: {
          theme: 'invalid', // Should be enum value
          language: 'en',
          units: 'metric'
        }
      };

      const result = dataValidationService.validateDataset('userPreferences', invalidPreferences);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Consistency Checks', () => {
    test('should check geographic consistency', () => {
      const datasets = {
        activeTravelways: {
          features: [
            {
              geometry: {
                coordinates: [[-63.5752, 44.6488], [-63.5753, 44.6489]]
              }
            }
          ]
        }
      };

      const result = dataValidationService.checkConsistency(datasets);

      expect(result.checks.geographic).toBeDefined();
      expect(result.checks.geographic.isConsistent).toBeDefined();
    });

    test('should detect out-of-bounds coordinates', () => {
      const datasets = {
        activeTravelways: {
          features: [
            {
              geometry: {
                coordinates: [[-200, 100], [-63.5753, 44.6489]] // Invalid coordinates
              }
            }
          ]
        }
      };

      const result = dataValidationService.checkConsistency(datasets);

      expect(result.checks.geographic.isConsistent).toBe(false);
      expect(result.checks.geographic.errors.length).toBeGreaterThan(0);
    });

    test('should check temporal consistency', () => {
      const datasets = {
        sidewalkClosures: {
          features: [
            {
              properties: {
                startDate: '2023-01-01',
                endDate: '2023-01-31'
              }
            }
          ]
        }
      };

      const result = dataValidationService.checkConsistency(datasets);

      expect(result.checks.temporal).toBeDefined();
      expect(result.checks.temporal.isConsistent).toBeDefined();
    });
  });

  describe('Data Quality', () => {
    test('should track quality metrics', () => {
      const testData = {
        type: 'FeatureCollection',
        features: []
      };

      dataValidationService.validateDataset('activeTravelways', testData);

      const report = dataValidationService.getQualityReport('activeTravelways');
      expect(report.dataset).toBe('activeTravelways');
      expect(report.quality).toBeDefined();
      expect(report.totalValidations).toBeGreaterThan(0);
    });

    test('should generate overall quality report', () => {
      const report = dataValidationService.getQualityReport();
      
      expect(report.overall).toBeDefined();
      expect(report.overall.quality).toBeDefined();
      expect(report.overall.totalDatasets).toBeDefined();
      expect(report.datasets).toBeInstanceOf(Array);
    });
  });

  describe('Auto-correction', () => {
    test('should auto-correct data issues', () => {
      const dataWithIssues = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[-63.5752, 44.6488], [-63.5753, 44.6489]]
            },
            properties: {
              // Missing required fields
            }
          }
        ]
      };

      const corrected = dataValidationService.autoCorrect('activeTravelways', dataWithIssues);

      expect(corrected.features[0].properties.id).toBeDefined();
      expect(corrected.features[0].properties.name).toBeDefined();
    });

    test('should correct user preferences', () => {
      const incompletePreferences = {
        accessibility: {
          highContrast: true
          // Missing other fields
        }
      };

      const corrected = dataValidationService.autoCorrect('userPreferences', incompletePreferences);

      expect(corrected.accessibility.screenReader).toBeDefined();
      expect(corrected.routing).toBeDefined();
      expect(corrected.display).toBeDefined();
    });
  });
});

describe('DataConsolidationManager', () => {
  beforeEach(async () => {
    await dataConsolidationManager.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(dataConsolidationManager.isInitialized).toBe(true);
    });

    test('should track consolidation status', () => {
      const status = dataConsolidationManager.getConsolidationStatus();
      expect(status.totalServices).toBeGreaterThan(0);
      expect(status.deprecatedServices).toBeGreaterThan(0);
    });
  });

  describe('Deprecation Warnings', () => {
    test('should generate deprecation warnings', () => {
      const warning = dataConsolidationManager.getDeprecationWarning(
        'DataManager',
        'loadDataset'
      );

      expect(warning).toContain('DEPRECATION WARNING');
      expect(warning).toContain('DataManager');
      expect(warning).toContain('unifiedDataManager');
    });

    test('should not show duplicate warnings', () => {
      // First call
      const warning1 = dataConsolidationManager.getDeprecationWarning(
        'DataManager',
        'loadDataset'
      );
      expect(warning1).toBeTruthy();

      // Second call should return null (already shown)
      const warning2 = dataConsolidationManager.getDeprecationWarning(
        'DataManager',
        'loadDataset'
      );
      expect(warning2).toBeNull();
    });

    test('should not warn for non-deprecated services', () => {
      const warning = dataConsolidationManager.getDeprecationWarning(
        'unifiedDataManager',
        'loadDataset'
      );
      expect(warning).toBeNull();
    });
  });

  describe('Service Mappings', () => {
    test('should have correct service mappings', () => {
      const status = dataConsolidationManager.getConsolidationStatus();
      
      // Check that data services map to unifiedDataManager
      expect(dataConsolidationManager.serviceMappings.DataManager.target)
        .toBe('unifiedDataManager');
      expect(dataConsolidationManager.serviceMappings.halifaxDatabaseService.target)
        .toBe('unifiedDataManager');
      expect(dataConsolidationManager.serviceMappings.offlineService.target)
        .toBe('unifiedDataManager');
    });

    test('should have priority-based mappings', () => {
      const mappings = dataConsolidationManager.serviceMappings;
      
      // Priority 1 services (critical)
      expect(mappings.DataManager.priority).toBe(1);
      expect(mappings.halifaxDatabaseService.priority).toBe(1);
      
      // Priority 2 services (important)
      expect(mappings.performanceService.priority).toBe(2);
      expect(mappings.halifaxTransitDataService.priority).toBe(2);
    });
  });

  describe('Migration Recommendations', () => {
    test('should generate migration recommendations', () => {
      const recommendations = dataConsolidationManager.getMigrationRecommendations();
      
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
      const recommendations = dataConsolidationManager.getMigrationRecommendations();
      
      const priorities = recommendations.map(r => r.priority);
      expect(priorities).toEqual([...priorities].sort());
    });
  });

  describe('Data Migration', () => {
    test('should migrate data from legacy service', async () => {
      const legacyData = {
        datasets: new Map([
          ['activeTravelways', { type: 'FeatureCollection', features: [] }]
        ])
      };

      const result = await dataConsolidationManager.migrateData('DataManager', legacyData);

      expect(result.success).toBe(true);
      expect(result.migratedData).toBeDefined();
      expect(result.migrationTime).toBeGreaterThan(0);
    });

    test('should handle migration errors', async () => {
      const invalidData = null;

      const result = await dataConsolidationManager.migrateData('DataManager', invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should validate migrated data', async () => {
      const legacyData = {
        datasets: new Map([
          ['activeTravelways', { type: 'FeatureCollection', features: [] }]
        ])
      };

      const result = await dataConsolidationManager.migrateData('DataManager', legacyData, {
        validate: true
      });

      expect(result.success).toBe(true);
      expect(result.validationResult).toBeDefined();
    });
  });

  describe('Data Quality Report', () => {
    test('should generate data quality report', async () => {
      const report = await dataConsolidationManager.getDataQualityReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.overall).toBeDefined();
      expect(report.services).toBeDefined();
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    test('should include service status', async () => {
      const report = await dataConsolidationManager.getDataQualityReport();
      
      expect(report.services.unifiedDataManager).toBeDefined();
      expect(report.services.unifiedDataManager.status).toBeDefined();
    });
  });

  describe('Usage Statistics', () => {
    test('should track usage statistics', () => {
      const stats = dataConsolidationManager.getUsageStatistics();
      
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
      const report = dataConsolidationManager.generateMigrationReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.usage).toBeDefined();
      expect(report.nextSteps).toBeDefined();
    });

    test('should include next steps', () => {
      const report = dataConsolidationManager.generateMigrationReport();
      
      expect(report.nextSteps).toBeInstanceOf(Array);
      expect(report.nextSteps.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for data management', async () => {
    // Initialize all services
    await unifiedDataManager.initialize();
    await dataValidationService.initialize();
    await dataConsolidationManager.initialize();
    
    // Get deprecation warning
    const warning = dataConsolidationManager.getDeprecationWarning(
      'DataManager',
      'loadDataset'
    );
    
    expect(warning).toContain('unifiedDataManager');
    
    // Load and validate data
    const mockData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[-63.5752, 44.6488], [-63.5753, 44.6489]]
          },
          properties: {
            id: 'test-1',
            name: 'Test Travelway'
          }
        }
      ]
    };
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });
    
    const data = await unifiedDataManager.loadDataset('activeTravelways');
    expect(data).toEqual(mockData);
    
    // Validate data
    const validationResult = dataValidationService.validateDataset('activeTravelways', data);
    expect(validationResult.isValid).toBe(true);
    
    // Check consolidation status
    const status = dataConsolidationManager.getConsolidationStatus();
    expect(status.isInitialized).toBe(true);
    
    // Cleanup
    await unifiedDataManager.shutdown();
  });
});
