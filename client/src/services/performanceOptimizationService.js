/**
 * Performance Optimization Service
 * 
 * Centralized service for managing performance optimizations, memory cleanup,
 * and resource management across the application.
 */

class PerformanceOptimizationService {
  constructor() {
    this.isInitialized = false;
    this.cleanupTasks = new Map();
    this.performanceMetrics = {
      memoryUsage: [],
      cacheSizes: new Map(),
      intervalCounts: new Map(),
      eventListenerCounts: new Map(),
      lastCleanup: null,
      totalCleanups: 0
    };
    
    // Configuration
    this.config = {
      cleanupInterval: 60000, // 1 minute
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      maxCacheSize: 1000,
      maxIntervals: 10,
      maxEventListeners: 50,
      enableMemoryMonitoring: true,
      enableAutomaticCleanup: true
    };
    
    // Tracked resources
    this.trackedIntervals = new Set();
    this.trackedTimeouts = new Set();
    this.trackedEventListeners = new Map();
    this.trackedCaches = new Map();
  }

  /**
   * Initialize the performance optimization service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Performance Optimization Service...');
    
    // Start automatic cleanup
    if (this.config.enableAutomaticCleanup) {
      this.startAutomaticCleanup();
    }
    
    // Start memory monitoring
    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring();
    }
    
    this.isInitialized = true;
    console.log('✅ Performance Optimization Service initialized');
  }

  /**
   * Register a cleanup task
   * @param {string} id - Unique identifier for the task
   * @param {Function} cleanupFunction - Function to call for cleanup
   * @param {Object} options - Cleanup options
   */
  registerCleanupTask(id, cleanupFunction, options = {}) {
    this.cleanupTasks.set(id, {
      function: cleanupFunction,
      options: {
        priority: 1,
        autoCleanup: true,
        ...options
      },
      lastRun: null,
      runCount: 0
    });
    
    console.log(`📝 Registered cleanup task: ${id}`);
  }

  /**
   * Unregister a cleanup task
   * @param {string} id - Task identifier
   */
  unregisterCleanupTask(id) {
    if (this.cleanupTasks.has(id)) {
      this.cleanupTasks.delete(id);
      console.log(`🗑️ Unregistered cleanup task: ${id}`);
    }
  }

  /**
   * Track an interval for cleanup
   * @param {number} intervalId - Interval ID
   * @param {string} source - Source component/service
   */
  trackInterval(intervalId, source = 'unknown') {
    this.trackedIntervals.add(intervalId);
    this.performanceMetrics.intervalCounts.set(source, 
      (this.performanceMetrics.intervalCounts.get(source) || 0) + 1
    );
  }

  /**
   * Track a timeout for cleanup
   * @param {number} timeoutId - Timeout ID
   * @param {string} source - Source component/service
   */
  trackTimeout(timeoutId, source = 'unknown') {
    this.trackedTimeouts.add(timeoutId);
  }

  /**
   * Track an event listener for cleanup
   * @param {string} element - Element or event target
   * @param {string} event - Event type
   * @param {Function} listener - Event listener function
   * @param {string} source - Source component/service
   */
  trackEventListener(element, event, listener, source = 'unknown') {
    const key = `${element}-${event}`;
    if (!this.trackedEventListeners.has(key)) {
      this.trackedEventListeners.set(key, []);
    }
    this.trackedEventListeners.get(key).push({ listener, source });
    
    this.performanceMetrics.eventListenerCounts.set(source,
      (this.performanceMetrics.eventListenerCounts.get(source) || 0) + 1
    );
  }

  /**
   * Track a cache for monitoring
   * @param {string} name - Cache name
   * @param {Map|Object} cache - Cache instance
   * @param {Object} options - Cache options
   */
  trackCache(name, cache, options = {}) {
    this.trackedCaches.set(name, {
      cache,
      options: {
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        ...options
      },
      lastCleanup: null
    });
  }

  /**
   * Start automatic cleanup
   */
  startAutomaticCleanup() {
    const cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
    
    this.trackInterval(cleanupInterval, 'performanceOptimizationService');
  }

  /**
   * Start memory monitoring
   */
  startMemoryMonitoring() {
    if (!performance.memory) {
      console.warn('⚠️ Performance.memory not available');
      return;
    }
    
    const memoryInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, 30000); // Every 30 seconds
    
    this.trackInterval(memoryInterval, 'performanceOptimizationService');
  }

  /**
   * Record current memory usage
   */
  recordMemoryUsage() {
    if (!performance.memory) return;
    
    const memoryInfo = performance.memory;
    this.performanceMetrics.memoryUsage.push({
      timestamp: Date.now(),
      used: memoryInfo.usedJSHeapSize,
      total: memoryInfo.totalJSHeapSize,
      limit: memoryInfo.jsHeapSizeLimit
    });
    
    // Keep only last 100 measurements
    if (this.performanceMetrics.memoryUsage.length > 100) {
      this.performanceMetrics.memoryUsage.shift();
    }
    
    // Check memory threshold
    if (memoryInfo.usedJSHeapSize > this.config.memoryThreshold) {
      console.warn(`⚠️ High memory usage: ${Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)}MB`);
      this.performEmergencyCleanup();
    }
  }

  /**
   * Perform comprehensive cleanup
   */
  async performCleanup() {
    console.log('🧹 Performing performance cleanup...');
    
    const startTime = performance.now();
    let cleanedCount = 0;
    
    try {
      // Clean tracked caches
      cleanedCount += await this.cleanupCaches();
      
      // Run registered cleanup tasks
      cleanedCount += await this.runCleanupTasks();
      
      // Clean up orphaned intervals (if any)
      cleanedCount += this.cleanupOrphanedIntervals();
      
      // Update metrics
      this.performanceMetrics.lastCleanup = new Date().toISOString();
      this.performanceMetrics.totalCleanups++;
      
      const duration = performance.now() - startTime;
      console.log(`✅ Cleanup completed: ${cleanedCount} items cleaned in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Perform emergency cleanup for high memory usage
   */
  async performEmergencyCleanup() {
    console.log('🚨 Performing emergency cleanup...');
    
    // Clear all caches
    for (const [name, cacheInfo] of this.trackedCaches) {
      cacheInfo.cache.clear();
      console.log(`🧹 Emergency cleared cache: ${name}`);
    }
    
    // Run high-priority cleanup tasks
    for (const [id, task] of this.cleanupTasks) {
      if (task.options.priority <= 2) { // High priority
        try {
          await task.function();
          task.lastRun = Date.now();
          task.runCount++;
        } catch (error) {
          console.error(`❌ Emergency cleanup task failed: ${id}`, error);
        }
      }
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
      console.log('🗑️ Forced garbage collection');
    }
  }

  /**
   * Clean up tracked caches
   */
  async cleanupCaches() {
    let cleanedCount = 0;
    
    for (const [name, cacheInfo] of this.trackedCaches) {
      const { cache, options } = cacheInfo;
      const now = Date.now();
      
      // Clean expired entries
      if (cache instanceof Map) {
        for (const [key, value] of cache.entries()) {
          if (value.timestamp && (now - value.timestamp) > options.ttl) {
            cache.delete(key);
            cleanedCount++;
          }
        }
        
        // Enforce size limits
        if (cache.size > options.maxSize) {
          const entries = Array.from(cache.entries());
          entries.sort((a, b) => (a[1].timestamp || 0) - (b[1].timestamp || 0));
          
          const toRemove = entries.slice(0, cache.size - options.maxSize);
          toRemove.forEach(([key]) => {
            cache.delete(key);
            cleanedCount++;
          });
        }
      }
      
      cacheInfo.lastCleanup = now;
      this.performanceMetrics.cacheSizes.set(name, cache.size);
    }
    
    return cleanedCount;
  }

  /**
   * Run registered cleanup tasks
   */
  async runCleanupTasks() {
    let cleanedCount = 0;
    
    for (const [id, task] of this.cleanupTasks) {
      if (task.options.autoCleanup) {
        try {
          await task.function();
          task.lastRun = Date.now();
          task.runCount++;
          cleanedCount++;
        } catch (error) {
          console.error(`❌ Cleanup task failed: ${id}`, error);
        }
      }
    }
    
    return cleanedCount;
  }

  /**
   * Clean up orphaned intervals (basic check)
   */
  cleanupOrphanedIntervals() {
    // This is a basic implementation
    // In a real scenario, you'd need more sophisticated tracking
    let cleanedCount = 0;
    
    // Check for intervals that might be orphaned
    if (this.trackedIntervals.size > this.config.maxIntervals) {
      console.warn(`⚠️ High interval count: ${this.trackedIntervals.size}`);
      // In a real implementation, you'd clear specific intervals
    }
    
    return cleanedCount;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const currentMemory = performance.memory ? {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    } : null;
    
    return {
      ...this.performanceMetrics,
      currentMemory,
      trackedResources: {
        intervals: this.trackedIntervals.size,
        timeouts: this.trackedTimeouts.size,
        eventListeners: Array.from(this.trackedEventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
        caches: this.trackedCaches.size,
        cleanupTasks: this.cleanupTasks.size
      },
      config: this.config
    };
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend() {
    const memoryData = this.performanceMetrics.memoryUsage;
    if (memoryData.length < 2) return 'stable';
    
    const recent = memoryData.slice(-10);
    const trend = recent[recent.length - 1].used - recent[0].used;
    
    if (trend > 10 * 1024 * 1024) return 'increasing'; // 10MB increase
    if (trend < -10 * 1024 * 1024) return 'decreasing'; // 10MB decrease
    return 'stable';
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Performance optimization config updated:', newConfig);
  }

  /**
   * Shutdown the service
   */
  async shutdown() {
    console.log('🛑 Shutting down Performance Optimization Service...');
    
    // Clear all tracked intervals
    for (const intervalId of this.trackedIntervals) {
      clearInterval(intervalId);
    }
    
    // Clear all tracked timeouts
    for (const timeoutId of this.trackedTimeouts) {
      clearTimeout(timeoutId);
    }
    
    // Run final cleanup
    await this.performCleanup();
    
    // Clear all tracking
    this.trackedIntervals.clear();
    this.trackedTimeouts.clear();
    this.trackedEventListeners.clear();
    this.trackedCaches.clear();
    this.cleanupTasks.clear();
    
    this.isInitialized = false;
    console.log('✅ Performance Optimization Service shutdown complete');
  }
}

// Export singleton instance
const performanceOptimizationService = new PerformanceOptimizationService();
export default performanceOptimizationService;
