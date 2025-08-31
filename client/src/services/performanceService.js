// Enhanced Performance Service for TREK.IQ
// Implements lazy loading, intelligent caching, and performance optimization

class PerformanceService {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = [];
    this.performanceMetrics = {
      routeCalculations: [],
      dataLoads: [],
      renderTimes: [],
      memoryUsage: []
    };
    this.isLowPerformanceMode = false;
    this.observer = null;
    this.intersectionObserver = null;
    this.memoryMonitor = null;
    this.networkMonitor = null;
    this.initPerformanceMonitoring();
  }

  // Initialize performance monitoring
  initPerformanceMonitoring() {
    // Detect low-performance devices
    this.detectDeviceCapabilities();
    
    // Set up intersection observer for lazy loading
    this.setupIntersectionObserver();
    
    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Monitor network conditions
    this.monitorNetworkConditions();
    
    // Set up performance observers
    this.setupPerformanceObservers();
  }

  // Detect device capabilities and set performance mode
  detectDeviceCapabilities() {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = navigator.connection;
    
    this.isLowPerformanceMode = memory < 4 || cores < 4 || 
      (connection && connection.effectiveType === 'slow-2g');
    
    console.log(`Performance mode: ${this.isLowPerformanceMode ? 'Low' : 'High'}`);
    console.log(`Device memory: ${memory}GB, Cores: ${cores}`);
  }

  // Set up intersection observer for lazy loading
  setupIntersectionObserver() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const loadFunction = element.dataset.loadFunction;
            if (loadFunction && typeof window[loadFunction] === 'function') {
              window[loadFunction]();
              this.intersectionObserver.unobserve(element);
            }
          }
        });
      },
      { rootMargin: '100px' }
    );
  }

  // Set up performance observers
  setupPerformanceObservers() {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            console.warn('Long task detected:', entry);
            this.recordMetric('long_task', entry);
          }
        });
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task observer not supported');
      }

      // Monitor layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.value > 0.1) {
            console.warn('Layout shift detected:', entry);
            this.recordMetric('layout_shift', entry);
          }
        });
      });
      
      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        console.warn('Layout shift observer not supported');
      }
    }
  }

  // Start memory monitoring
  startMemoryMonitoring() {
    if (performance.memory) {
      this.memoryMonitor = setInterval(() => {
        const memoryInfo = performance.memory;
        this.performanceMetrics.memoryUsage.push({
          timestamp: Date.now(),
          used: memoryInfo.usedJSHeapSize,
          total: memoryInfo.totalJSHeapSize,
          limit: memoryInfo.jsHeapSizeLimit
        });

        // Keep only last 100 entries
        if (this.performanceMetrics.memoryUsage.length > 100) {
          this.performanceMetrics.memoryUsage.shift();
        }

        // Trigger cleanup if memory usage is high
        if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
          this.triggerMemoryCleanup();
        }
      }, 5000);
    }
  }

  // Monitor network conditions
  monitorNetworkConditions() {
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        const connection = navigator.connection;
        this.isLowPerformanceMode = connection.effectiveType === 'slow-2g' || 
                                   connection.effectiveType === '2g';
        console.log('Network condition changed:', connection.effectiveType);
      });
    }
  }

  // Intelligent caching with TTL and priority
  async getCachedData(key, fetchFunction, options = {}) {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      priority = 'normal',
      maxSize = 100,
      useIndexedDB = false
    } = options;

    // Check memory cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      this.recordMetric('cache_hit', key);
      return cached.data;
    }

    // Check IndexedDB if enabled
    if (useIndexedDB) {
      try {
        const indexedData = await this.getFromIndexedDB(key);
        if (indexedData && Date.now() - indexedData.timestamp < ttl) {
          this.recordMetric('indexeddb_hit', key);
          return indexedData.data;
        }
      } catch (error) {
        console.warn('IndexedDB cache check failed:', error);
      }
    }

    // Fetch new data
    const startTime = performance.now();
    try {
      const data = await fetchFunction();
      const loadTime = performance.now() - startTime;
      
      // Store in memory cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        priority,
        loadTime
      });

      // Store in IndexedDB if enabled
      if (useIndexedDB) {
        try {
          await this.storeInIndexedDB(key, data, Date.now());
        } catch (error) {
          console.warn('IndexedDB storage failed:', error);
        }
      }

      // Cleanup cache if needed
      this.cleanupCache(maxSize);
      
      this.recordMetric('data_load', { key, loadTime });
      return data;
    } catch (error) {
      this.recordMetric('data_load_error', { key, error: error.message });
      throw error;
    }
  }

  // IndexedDB operations
  async getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TrekIQCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readonly');
        const store = transaction.objectStore('cache');
        const getRequest = store.get(key);
        
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => resolve(getRequest.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  async storeInIndexedDB(key, data, timestamp) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TrekIQCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const putRequest = store.put({ key, data, timestamp });
        
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  // Cleanup cache based on priority and age
  cleanupCache(maxSize) {
    if (this.cache.size <= maxSize) return;

    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => {
      const [keyA, valueA] = a;
      const [keyB, valueB] = b;
      
      // Sort by priority first, then by age
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[valueA.priority] - priorityOrder[valueB.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return valueA.timestamp - valueB.timestamp;
    });

    // Remove oldest entries
    const toRemove = entries.slice(0, this.cache.size - maxSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  // Trigger memory cleanup
  triggerMemoryCleanup() {
    console.log('Triggering memory cleanup...');
    
    // Clear old cache entries
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutes
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > maxAge && value.priority !== 'critical') {
        this.cache.delete(key);
      }
    }
    
    // Clear old performance metrics
    if (this.performanceMetrics.memoryUsage.length > 50) {
      this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-50);
    }
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  // Lazy load components and data
  lazyLoad(element, loadFunction, options = {}) {
    const {
      // eslint-disable-next-line no-unused-vars
      threshold = 0.1,
      // eslint-disable-next-line no-unused-vars
      rootMargin = '50px',
      fallback = null
    } = options;

    element.dataset.loadFunction = loadFunction.name;
    
    // Add fallback content
    if (fallback) {
      element.innerHTML = fallback;
    }

    // Observe element for intersection
    this.intersectionObserver.observe(element);
  }

  // Preload critical data
  preloadData(urls, priority = 'normal') {
    urls.forEach(url => {
      this.preloadQueue.push({ url, priority });
    });
    
    // Process queue with rate limiting
    this.processPreloadQueue();
  }

  // Process preload queue with rate limiting
  async processPreloadQueue() {
    if (this.preloadQueue.length === 0) return;

    const batch = this.preloadQueue.splice(0, 3); // Process 3 at a time
    
    await Promise.allSettled(
      batch.map(async ({ url, priority }) => {
        try {
          const response = await fetch(url);
          const data = await response.json();
          
          this.cache.set(url, {
            data,
            timestamp: Date.now(),
            priority,
            preloaded: true
          });
        } catch (error) {
          console.warn(`Failed to preload ${url}:`, error);
        }
      })
    );

    // Process next batch after delay
    setTimeout(() => this.processPreloadQueue(), 100);
  }

  // Optimize route calculation with batching
  async batchRouteCalculations(routeRequests) {
    const startTime = performance.now();
    
    // Group similar requests
    const grouped = this.groupRouteRequests(routeRequests);
    
    // Process in batches
    const results = [];
    for (const group of grouped) {
      const batchResults = await Promise.allSettled(
        group.map(req => this.calculateSingleRoute(req))
      );
      results.push(...batchResults);
    }
    
    const totalTime = performance.now() - startTime;
    this.recordMetric('batch_route_calculation', {
      count: routeRequests.length,
      time: totalTime
    });
    
    return results;
  }

  // Group similar route requests for optimization
  groupRouteRequests(requests) {
    const groups = [];
    const processed = new Set();
    
    requests.forEach((req, index) => {
      if (processed.has(index)) return;
      
      const group = [req];
      processed.add(index);
      
      // Find similar requests (same origin/destination area)
      requests.forEach((otherReq, otherIndex) => {
        if (processed.has(otherIndex)) return;
        
        if (this.areRequestsSimilar(req, otherReq)) {
          group.push(otherReq);
          processed.add(otherIndex);
        }
      });
      
      groups.push(group);
    });
    
    return groups;
  }

  // Check if two route requests are similar
  areRequestsSimilar(req1, req2) {
    const distanceThreshold = 0.01; // ~1km
    
    const originDistance = Math.sqrt(
      Math.pow(req1.origin.lat - req2.origin.lat, 2) +
      Math.pow(req1.origin.lng - req2.origin.lng, 2)
    );
    
    const destDistance = Math.sqrt(
      Math.pow(req1.destination.lat - req2.destination.lat, 2) +
      Math.pow(req1.destination.lng - req2.destination.lng, 2)
    );
    
    return originDistance < distanceThreshold && destDistance < distanceThreshold;
  }

  // Calculate single route with caching
  async calculateSingleRoute(request) {
    const cacheKey = this.generateRouteCacheKey(request);
    
    return this.getCachedData(
      cacheKey,
      () => this.performRouteCalculation(request),
      { ttl: 10 * 60 * 1000, priority: 'high' } // 10 minutes for routes
    );
  }

  // Generate cache key for route
  generateRouteCacheKey(request) {
    return `route:${request.origin.lat},${request.origin.lng}-${request.destination.lat},${request.destination.lng}-${JSON.stringify(request.options)}`;
  }

  // Perform actual route calculation
  async performRouteCalculation(request) {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Route calculation failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Optimize GeoJSON rendering
  optimizeGeoJSON(geojson, options = {}) {
    const {
      simplifyTolerance = 0.0001,
      maxFeatures = 1000,
      clusterThreshold = 50,
      enableClustering = true
    } = options;

    if (!geojson || !geojson.features) return geojson;

    let optimized = { ...geojson };

    // Limit features if too many
    if (optimized.features.length > maxFeatures) {
      optimized.features = optimized.features.slice(0, maxFeatures);
    }

    // Simplify geometries for better performance
    optimized.features = optimized.features.map(feature => ({
      ...feature,
      geometry: this.simplifyGeometry(feature.geometry, simplifyTolerance)
    }));

    // Apply clustering if enabled and features are points
    if (enableClustering && optimized.features.length > clusterThreshold) {
      optimized = this.applyClustering(optimized, clusterThreshold);
    }

    return optimized;
  }

  // Simplify geometry for performance
  simplifyGeometry(geometry, tolerance) {
    if (!geometry || !geometry.coordinates) return geometry;

    switch (geometry.type) {
      case 'Point':
        return geometry;
      case 'LineString':
        return {
          ...geometry,
          coordinates: this.simplifyLineString(geometry.coordinates, tolerance)
        };
      case 'Polygon':
        return {
          ...geometry,
          coordinates: geometry.coordinates.map(ring => 
            this.simplifyLineString(ring, tolerance)
          )
        };
      default:
        return geometry;
    }
  }

  // Simplify line string using Douglas-Peucker algorithm
  simplifyLineString(coordinates, tolerance) {
    if (coordinates.length <= 2) return coordinates;

    const findPerpendicularDistance = (point, lineStart, lineEnd) => {
      const [x, y] = point;
      const [x1, y1] = lineStart;
      const [x2, y2] = lineEnd;
      
      const A = x - x1;
      const B = y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      
      if (lenSq === 0) return Math.sqrt(A * A + B * B);
      
      const param = dot / lenSq;
      let xx, yy;
      
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }
      
      const dx = x - xx;
      const dy = y - yy;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const douglasPeucker = (points, tolerance) => {
      if (points.length <= 2) return points;
      
      let maxDistance = 0;
      let index = 0;
      
      for (let i = 1; i < points.length - 1; i++) {
        const distance = findPerpendicularDistance(points[i], points[0], points[points.length - 1]);
        if (distance > maxDistance) {
          maxDistance = distance;
          index = i;
        }
      }
      
      if (maxDistance > tolerance) {
        const firstLine = douglasPeucker(points.slice(0, index + 1), tolerance);
        const secondLine = douglasPeucker(points.slice(index), tolerance);
        return [...firstLine.slice(0, -1), ...secondLine];
      } else {
        return [points[0], points[points.length - 1]];
      }
    };

    return douglasPeucker(coordinates, tolerance);
  }

  // Apply clustering to point features
  applyClustering(geojson, threshold) {
    const points = geojson.features.filter(f => f.geometry.type === 'Point');
    const clusters = this.createClusters(points, threshold);
    
    return {
      type: 'FeatureCollection',
      features: clusters.map(cluster => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: cluster.center
        },
        properties: {
          cluster: true,
          point_count: cluster.points.length,
          points: cluster.points
        }
      }))
    };
  }

  // Create clusters from points
  createClusters(points, threshold) {
    const clusters = [];
    const visited = new Set();
    
    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;
      
      const cluster = {
        center: points[i].geometry.coordinates,
        points: [points[i]]
      };
      visited.add(i);
      
      for (let j = i + 1; j < points.length; j++) {
        if (visited.has(j)) continue;
        
        const distance = this.calculateDistance(
          points[i].geometry.coordinates,
          points[j].geometry.coordinates
        );
        
        if (distance <= threshold) {
          cluster.points.push(points[j]);
          visited.add(j);
          
          // Update cluster center
          const totalLng = cluster.points.reduce((sum, p) => sum + p.geometry.coordinates[0], 0);
          const totalLat = cluster.points.reduce((sum, p) => sum + p.geometry.coordinates[1], 0);
          cluster.center = [totalLng / cluster.points.length, totalLat / cluster.points.length];
        }
      }
      
      clusters.push(cluster);
    }
    
    return clusters;
  }

  // Calculate distance between two points
  calculateDistance(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  // Batch API requests for better performance
  async batchRequests(requests, options = {}) {
    const {
      maxConcurrent = 5,
      delay = 100,
      retries = 3
    } = options;

    const results = [];
    const chunks = this.chunkArray(requests, maxConcurrent);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (request, index) => {
        let lastError;
        
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            const result = await request();
            return { success: true, data: result, index };
          } catch (error) {
            lastError = error;
            if (attempt < retries - 1) {
              await this.delay(delay * Math.pow(2, attempt)); // Exponential backoff
            }
          }
        }
        
        return { success: false, error: lastError, index };
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Add delay between chunks to avoid overwhelming the server
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await this.delay(delay);
      }
    }

    return results;
  }

  // Chunk array into smaller arrays
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Delay utility
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Record performance metric
  recordMetric(type, data) {
    const metric = {
      type,
      data,
      timestamp: Date.now()
    };

    switch (type) {
      case 'route_calculation':
        this.performanceMetrics.routeCalculations.push(metric);
        break;
      case 'data_load':
        this.performanceMetrics.dataLoads.push(metric);
        break;
      case 'render_time':
        this.performanceMetrics.renderTimes.push(metric);
        break;
      default:
        // Store in general metrics
        if (!this.performanceMetrics[type]) {
          this.performanceMetrics[type] = [];
        }
        this.performanceMetrics[type].push(metric);
    }

    // Keep metrics arrays manageable
    Object.keys(this.performanceMetrics).forEach(key => {
      if (this.performanceMetrics[key].length > 100) {
        this.performanceMetrics[key] = this.performanceMetrics[key].slice(-100);
      }
    });
  }

  // Get performance statistics
  getPerformanceStats() {
    const stats = {
      memoryUsage: this.getMemoryStats(),
      cacheStats: this.getCacheStats(),
      renderStats: this.getRenderStats(),
      networkStats: this.getNetworkStats()
    };

    return stats;
  }

  // Get memory statistics
  getMemoryStats() {
    if (!performance.memory) return null;

    const memory = performance.memory;
    const usage = this.performanceMetrics.memoryUsage;
    
    return {
      current: {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      },
      average: usage.length > 0 ? {
        used: usage.reduce((sum, m) => sum + m.used, 0) / usage.length,
        total: usage.reduce((sum, m) => sum + m.total, 0) / usage.length
      } : null
    };
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        priority: value.priority,
        loadTime: value.loadTime
      }))
    };
  }

  // Get render statistics
  getRenderStats() {
    const renderTimes = this.performanceMetrics.renderTimes;
    if (renderTimes.length === 0) return null;

    const times = renderTimes.map(m => m.data);
    return {
      count: times.length,
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      recent: times.slice(-10)
    };
  }

  // Get network statistics
  getNetworkStats() {
    if (!navigator.connection) return null;

    const connection = navigator.connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  // Get current memory usage
  getCurrentMemoryUsage() {
    if (!performance.memory) return null;

    const memory = performance.memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  // Cleanup resources
  cleanup() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.cache.clear();
    this.performanceMetrics = {
      routeCalculations: [],
      dataLoads: [],
      renderTimes: [],
      memoryUsage: []
    };
  }
}

// Export singleton instance
const performanceService = new PerformanceService();
export default performanceService;
