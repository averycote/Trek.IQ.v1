/**
 * Performance and Memory Tests
 * 
 * Tests for performance optimization service, memory leak detection,
 * and resource management across the application.
 */

import performanceOptimizationService from '../performanceOptimizationService.js';
import memoryLeakDetector from '../../utils/memoryLeakDetector.js';

// Mock performance.memory for testing
const mockPerformanceMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB
};

// Mock performance object
Object.defineProperty(global, 'performance', {
  value: {
    memory: mockPerformanceMemory,
    now: () => Date.now()
  },
  writable: true
});

describe('Performance Optimization Service', () => {
  beforeEach(async () => {
    await performanceOptimizationService.initialize();
  });

  afterEach(async () => {
    await performanceOptimizationService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(performanceOptimizationService.isInitialized).toBe(true);
    });

    test('should start automatic cleanup', () => {
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      expect(metrics.trackedResources.intervals).toBeGreaterThan(0);
    });
  });

  describe('Cleanup Task Management', () => {
    test('should register and unregister cleanup tasks', () => {
      const cleanupFunction = jest.fn();
      
      performanceOptimizationService.registerCleanupTask('test-task', cleanupFunction);
      
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      expect(metrics.trackedResources.cleanupTasks).toBe(1);
      
      performanceOptimizationService.unregisterCleanupTask('test-task');
      
      const updatedMetrics = performanceOptimizationService.getPerformanceMetrics();
      expect(updatedMetrics.trackedResources.cleanupTasks).toBe(0);
    });

    test('should run cleanup tasks automatically', async () => {
      const cleanupFunction = jest.fn();
      
      performanceOptimizationService.registerCleanupTask('test-task', cleanupFunction, {
        autoCleanup: true
      });
      
      // Trigger cleanup
      await performanceOptimizationService.performCleanup();
      
      expect(cleanupFunction).toHaveBeenCalled();
    });
  });

  describe('Resource Tracking', () => {
    test('should track intervals', () => {
      const intervalId = setInterval(() => {}, 1000);
      
      performanceOptimizationService.trackInterval(intervalId, 'test-component');
      
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      expect(metrics.trackedResources.intervals).toBeGreaterThan(0);
      
      clearInterval(intervalId);
    });

    test('should track timeouts', () => {
      const timeoutId = setTimeout(() => {}, 1000);
      
      performanceOptimizationService.trackTimeout(timeoutId, 'test-component');
      
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      expect(metrics.trackedResources.timeouts).toBeGreaterThan(0);
      
      clearTimeout(timeoutId);
    });

    test('should track event listeners', () => {
      const element = document.createElement('div');
      const listener = () => {};
      
      performanceOptimizationService.trackEventListener(element, 'click', listener, 'test-component');
      
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      expect(metrics.trackedResources.eventListeners).toBeGreaterThan(0);
    });

    test('should track caches', () => {
      const cache = new Map();
      cache.set('key1', { data: 'value1', timestamp: Date.now() });
      cache.set('key2', { data: 'value2', timestamp: Date.now() - 400000 }); // Expired
      
      performanceOptimizationService.trackCache('test-cache', cache, {
        maxSize: 10,
        ttl: 300000 // 5 minutes
      });
      
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      expect(metrics.trackedResources.caches).toBe(1);
    });
  });

  describe('Cache Management', () => {
    test('should clean expired cache entries', async () => {
      const cache = new Map();
      const now = Date.now();
      
      // Add expired entry
      cache.set('expired', { data: 'value', timestamp: now - 400000 });
      // Add valid entry
      cache.set('valid', { data: 'value', timestamp: now - 100000 });
      
      performanceOptimizationService.trackCache('test-cache', cache, {
        ttl: 300000 // 5 minutes
      });
      
      await performanceOptimizationService.performCleanup();
      
      expect(cache.has('expired')).toBe(false);
      expect(cache.has('valid')).toBe(true);
    });

    test('should enforce cache size limits', async () => {
      const cache = new Map();
      
      // Add more entries than max size
      for (let i = 0; i < 15; i++) {
        cache.set(`key${i}`, { data: `value${i}`, timestamp: Date.now() - (i * 1000) });
      }
      
      performanceOptimizationService.trackCache('test-cache', cache, {
        maxSize: 10
      });
      
      await performanceOptimizationService.performCleanup();
      
      expect(cache.size).toBeLessThanOrEqual(10);
    });
  });

  describe('Memory Monitoring', () => {
    test('should record memory usage', () => {
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      
      expect(metrics.currentMemory).toBeDefined();
      expect(metrics.currentMemory.used).toBe(mockPerformanceMemory.usedJSHeapSize);
    });

    test('should detect memory trend', () => {
      const trend = performanceOptimizationService.getMemoryTrend();
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });
  });

  describe('Configuration', () => {
    test('should update configuration', () => {
      const newConfig = {
        cleanupInterval: 120000,
        memoryThreshold: 200 * 1024 * 1024
      };
      
      performanceOptimizationService.updateConfig(newConfig);
      
      expect(performanceOptimizationService.config.cleanupInterval).toBe(120000);
      expect(performanceOptimizationService.config.memoryThreshold).toBe(200 * 1024 * 1024);
    });
  });
});

describe('Memory Leak Detector', () => {
  beforeEach(() => {
    memoryLeakDetector.resetBaseline();
  });

  afterEach(() => {
    memoryLeakDetector.stopMonitoring();
  });

  describe('Memory Monitoring', () => {
    test('should start and stop monitoring', () => {
      expect(memoryLeakDetector.isMonitoring).toBe(false);
      
      memoryLeakDetector.startMonitoring();
      expect(memoryLeakDetector.isMonitoring).toBe(true);
      
      memoryLeakDetector.stopMonitoring();
      expect(memoryLeakDetector.isMonitoring).toBe(false);
    });

    test('should detect memory leaks', (done) => {
      memoryLeakDetector.on('memoryLeak', (data) => {
        expect(data.currentMemory).toBeDefined();
        expect(data.memoryIncrease).toBeDefined();
        expect(data.trend).toBeDefined();
        done();
      });
      
      // Simulate memory leak by increasing threshold
      memoryLeakDetector.leakThreshold = 10 * 1024 * 1024; // 10MB
      memoryLeakDetector.startMonitoring();
      
      // Simulate memory increase
      mockPerformanceMemory.usedJSHeapSize = 100 * 1024 * 1024; // 100MB
      memoryLeakDetector.checkMemoryUsage();
    });
  });

  describe('Resource Tracking', () => {
    test('should track intervals', () => {
      const intervalId = setInterval(() => {}, 1000);
      
      memoryLeakDetector.trackInterval(intervalId, 'test-component');
      
      const stats = memoryLeakDetector.getMemoryStats();
      expect(stats.trackedResources.intervals).toBeGreaterThan(0);
      
      clearInterval(intervalId);
    });

    test('should track timeouts', () => {
      const timeoutId = setTimeout(() => {}, 1000);
      
      memoryLeakDetector.trackTimeout(timeoutId, 'test-component');
      
      const stats = memoryLeakDetector.getMemoryStats();
      expect(stats.trackedResources.timeouts).toBeGreaterThan(0);
      
      clearTimeout(timeoutId);
    });

    test('should track event listeners', () => {
      const element = document.createElement('div');
      const listener = () => {};
      
      memoryLeakDetector.trackEventListener(element, 'click', listener, 'test-component');
      
      const stats = memoryLeakDetector.getMemoryStats();
      expect(stats.trackedResources.eventListeners).toBeGreaterThan(0);
    });

    test('should track caches', () => {
      const cache = new Map();
      
      memoryLeakDetector.trackCache('test-cache', cache, 'test-component');
      
      const stats = memoryLeakDetector.getMemoryStats();
      expect(stats.trackedResources.caches).toBe(1);
    });
  });

  describe('Memory Analysis', () => {
    test('should analyze memory trend', () => {
      // Add some memory history
      memoryLeakDetector.memoryHistory = [
        { timestamp: Date.now() - 200000, memory: 50 * 1024 * 1024, increase: 0 },
        { timestamp: Date.now() - 150000, memory: 55 * 1024 * 1024, increase: 5 * 1024 * 1024 },
        { timestamp: Date.now() - 100000, memory: 60 * 1024 * 1024, increase: 10 * 1024 * 1024 },
        { timestamp: Date.now() - 50000, memory: 65 * 1024 * 1024, increase: 15 * 1024 * 1024 },
        { timestamp: Date.now(), memory: 70 * 1024 * 1024, increase: 20 * 1024 * 1024 }
      ];
      
      const trend = memoryLeakDetector.analyzeMemoryTrend();
      expect(trend).toBe('increasing');
    });

    test('should get memory statistics', () => {
      const stats = memoryLeakDetector.getMemoryStats();
      
      expect(stats.available).toBe(true);
      expect(stats.current).toBe(mockPerformanceMemory.usedJSHeapSize);
      expect(stats.baseline).toBeDefined();
      expect(stats.trend).toBeDefined();
      expect(stats.trackedResources).toBeDefined();
    });
  });

  describe('Optimization Recommendations', () => {
    test('should provide optimization recommendations', () => {
      const recommendations = memoryLeakDetector.getOptimizationRecommendations();
      
      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
      });
    });
  });

  describe('Event Callbacks', () => {
    test('should register and trigger callbacks', (done) => {
      const callback = jest.fn((data) => {
        expect(data).toBeDefined();
        done();
      });
      
      memoryLeakDetector.on('memoryLeak', callback);
      
      // Simulate memory leak detection
      memoryLeakDetector.detectMemoryLeak(100 * 1024 * 1024, 50 * 1024 * 1024);
    });

    test('should unregister callbacks', () => {
      const callback = jest.fn();
      
      memoryLeakDetector.on('memoryLeak', callback);
      memoryLeakDetector.off('memoryLeak', callback);
      
      // Simulate memory leak detection
      memoryLeakDetector.detectMemoryLeak(100 * 1024 * 1024, 50 * 1024 * 1024);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for comprehensive monitoring', async () => {
    // Initialize both services
    await performanceOptimizationService.initialize();
    memoryLeakDetector.startMonitoring();
    
    // Register cleanup task
    const cleanupFunction = jest.fn();
    performanceOptimizationService.registerCleanupTask('integration-test', cleanupFunction);
    
    // Track resources
    const intervalId = setInterval(() => {}, 1000);
    performanceOptimizationService.trackInterval(intervalId, 'integration-test');
    memoryLeakDetector.trackInterval(intervalId, 'integration-test');
    
    // Perform cleanup
    await performanceOptimizationService.performCleanup();
    
    // Check results
    expect(cleanupFunction).toHaveBeenCalled();
    
    const perfMetrics = performanceOptimizationService.getPerformanceMetrics();
    const memStats = memoryLeakDetector.getMemoryStats();
    
    expect(perfMetrics.trackedResources.intervals).toBeGreaterThan(0);
    expect(memStats.trackedResources.intervals).toBeGreaterThan(0);
    
    // Cleanup
    clearInterval(intervalId);
    await performanceOptimizationService.shutdown();
    memoryLeakDetector.stopMonitoring();
  });
});
