/**
 * Memory Leak Detector
 * 
 * Utility for detecting and preventing memory leaks in the application.
 * Provides monitoring, detection, and cleanup capabilities.
 */

class MemoryLeakDetector {
  constructor() {
    this.isMonitoring = false;
    this.baselineMemory = null;
    this.memoryHistory = [];
    this.leakThreshold = 50 * 1024 * 1024; // 50MB increase
    this.monitoringInterval = null;
    this.callbacks = new Map();
    
    // Tracked resources
    this.trackedIntervals = new WeakMap();
    this.trackedTimeouts = new WeakMap();
    this.trackedEventListeners = new WeakMap();
    this.trackedCaches = new WeakMap();
  }

  /**
   * Start memory monitoring
   * @param {Object} options - Monitoring options
   */
  startMonitoring(options = {}) {
    if (this.isMonitoring) return;
    
    const config = {
      interval: 30000, // 30 seconds
      threshold: this.leakThreshold,
      ...options
    };
    
    this.leakThreshold = config.threshold;
    
    // Set baseline memory
    if (performance.memory) {
      this.baselineMemory = performance.memory.usedJSHeapSize;
      console.log(`🔍 Memory monitoring started. Baseline: ${Math.round(this.baselineMemory / 1024 / 1024)}MB`);
    } else {
      console.warn('⚠️ Performance.memory not available');
      return;
    }
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, config.interval);
    
    this.isMonitoring = true;
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    console.log('🛑 Memory monitoring stopped');
  }

  /**
   * Check current memory usage
   */
  checkMemoryUsage() {
    if (!performance.memory) return;
    
    const currentMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = currentMemory - this.baselineMemory;
    
    // Record memory history
    this.memoryHistory.push({
      timestamp: Date.now(),
      memory: currentMemory,
      increase: memoryIncrease
    });
    
    // Keep only last 100 measurements
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }
    
    // Check for potential memory leak
    if (memoryIncrease > this.leakThreshold) {
      this.detectMemoryLeak(currentMemory, memoryIncrease);
    }
    
    // Log memory status
    const memoryMB = Math.round(currentMemory / 1024 / 1024);
    const increaseMB = Math.round(memoryIncrease / 1024 / 1024);
    console.log(`📊 Memory: ${memoryMB}MB (+${increaseMB}MB from baseline)`);
  }

  /**
   * Detect potential memory leak
   * @param {number} currentMemory - Current memory usage
   * @param {number} memoryIncrease - Memory increase from baseline
   */
  detectMemoryLeak(currentMemory, memoryIncrease) {
    console.warn(`🚨 Potential memory leak detected!`);
    console.warn(`   Current: ${Math.round(currentMemory / 1024 / 1024)}MB`);
    console.warn(`   Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    console.warn(`   Threshold: ${Math.round(this.leakThreshold / 1024 / 1024)}MB`);
    
    // Analyze memory trend
    const trend = this.analyzeMemoryTrend();
    console.warn(`   Trend: ${trend}`);
    
    // Notify callbacks
    this.notifyCallbacks('memoryLeak', {
      currentMemory,
      memoryIncrease,
      trend,
      threshold: this.leakThreshold
    });
    
    // Suggest cleanup actions
    this.suggestCleanupActions();
  }

  /**
   * Analyze memory trend
   * @returns {string} Memory trend description
   */
  analyzeMemoryTrend() {
    if (this.memoryHistory.length < 5) return 'insufficient data';
    
    const recent = this.memoryHistory.slice(-5);
    const trend = recent[recent.length - 1].memory - recent[0].memory;
    
    if (trend > 10 * 1024 * 1024) return 'rapidly increasing';
    if (trend > 5 * 1024 * 1024) return 'increasing';
    if (trend < -5 * 1024 * 1024) return 'decreasing';
    return 'stable';
  }

  /**
   * Suggest cleanup actions
   */
  suggestCleanupActions() {
    console.log('💡 Suggested cleanup actions:');
    console.log('   1. Clear application caches');
    console.log('   2. Remove unused event listeners');
    console.log('   3. Clear intervals and timeouts');
    console.log('   4. Force garbage collection (if available)');
    console.log('   5. Check for circular references');
  }

  /**
   * Register a callback for memory leak events
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, []);
    }
    this.callbacks.get(event).push(callback);
  }

  /**
   * Unregister a callback
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   */
  off(event, callback) {
    if (this.callbacks.has(event)) {
      const callbacks = this.callbacks.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Notify callbacks of an event
   * @param {string} event - Event type
   * @param {*} data - Event data
   */
  notifyCallbacks(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Memory leak callback error:', error);
        }
      });
    }
  }

  /**
   * Track an interval for potential leak detection
   * @param {number} intervalId - Interval ID
   * @param {string} source - Source component/service
   */
  trackInterval(intervalId, source = 'unknown') {
    this.trackedIntervals.set(intervalId, {
      source,
      createdAt: Date.now()
    });
  }

  /**
   * Track a timeout for potential leak detection
   * @param {number} timeoutId - Timeout ID
   * @param {string} source - Source component/service
   */
  trackTimeout(timeoutId, source = 'unknown') {
    this.trackedTimeouts.set(timeoutId, {
      source,
      createdAt: Date.now()
    });
  }

  /**
   * Track an event listener for potential leak detection
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
    this.trackedEventListeners.get(key).push({
      listener,
      source,
      createdAt: Date.now()
    });
  }

  /**
   * Track a cache for potential leak detection
   * @param {string} name - Cache name
   * @param {Map|Object} cache - Cache instance
   * @param {string} source - Source component/service
   */
  trackCache(name, cache, source = 'unknown') {
    this.trackedCaches.set(cache, {
      name,
      source,
      createdAt: Date.now(),
      initialSize: cache.size || Object.keys(cache).length
    });
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getMemoryStats() {
    if (!performance.memory) {
      return { available: false };
    }
    
    const currentMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = this.baselineMemory ? currentMemory - this.baselineMemory : 0;
    
    return {
      available: true,
      current: currentMemory,
      baseline: this.baselineMemory,
      increase: memoryIncrease,
      trend: this.analyzeMemoryTrend(),
      history: this.memoryHistory.slice(-10), // Last 10 measurements
      trackedResources: {
        intervals: this.trackedIntervals.size,
        timeouts: this.trackedTimeouts.size,
        eventListeners: Array.from(this.trackedEventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
        caches: this.trackedCaches.size
      }
    };
  }

  /**
   * Force garbage collection (if available)
   */
  forceGarbageCollection() {
    if (window.gc) {
      window.gc();
      console.log('🗑️ Forced garbage collection');
      return true;
    } else {
      console.warn('⚠️ Garbage collection not available');
      return false;
    }
  }

  /**
   * Get recommendations for memory optimization
   * @returns {Array} Array of recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const stats = this.getMemoryStats();
    
    if (!stats.available) {
      recommendations.push('Enable performance.memory for detailed monitoring');
      return recommendations;
    }
    
    if (stats.increase > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider clearing caches');
    }
    
    if (stats.trackedResources.intervals > 20) {
      recommendations.push('High number of intervals detected - review interval management');
    }
    
    if (stats.trackedResources.eventListeners > 100) {
      recommendations.push('High number of event listeners detected - review listener cleanup');
    }
    
    if (stats.trend === 'rapidly increasing') {
      recommendations.push('Rapid memory increase detected - immediate cleanup recommended');
    }
    
    return recommendations;
  }

  /**
   * Reset baseline memory
   */
  resetBaseline() {
    if (performance.memory) {
      this.baselineMemory = performance.memory.usedJSHeapSize;
      this.memoryHistory = [];
      console.log(`🔄 Memory baseline reset to ${Math.round(this.baselineMemory / 1024 / 1024)}MB`);
    }
  }
}

// Export singleton instance
const memoryLeakDetector = new MemoryLeakDetector();
export default memoryLeakDetector;
