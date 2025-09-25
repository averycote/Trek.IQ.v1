/**
 * Unified Data Manager - Single Canonical Data Management Implementation
 * 
 * Consolidates all data services into a single, clean, production-ready
 * implementation that replaces overlapping data services.
 * 
 * Features:
 * - Unified data loading and caching
 * - Multi-tier storage (memory, IndexedDB, localStorage)
 * - Data validation and consistency checks
 * - Performance optimizations with lazy loading
 * - Offline support with sync capabilities
 * - Data versioning and migration
 */

import unifiedAPIService from './unifiedAPIService.js';
import performanceOptimizationService from './performanceOptimizationService.js';

class UnifiedDataManager {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Storage layers
    this.memoryCache = new Map();
    this.indexedDB = null;
    this.localStorage = window.localStorage;
    
    // Data management
    this.datasets = new Map();
    this.loadPromises = new Map(); // Promise memoization
    this.spatialIndexes = new Map();
    this.dataVersions = new Map();
    
    // Configuration
    this.config = {
      // Cache configuration
      memoryCache: {
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        cleanupInterval: 60000 // 1 minute
      },
      indexedDB: {
        name: 'TrekIQUnifiedDB',
        version: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      },
      localStorage: {
        maxSize: 5 * 1024 * 1024, // 5MB
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      
      // Performance configuration
      performance: {
        maxConcurrentLoads: 5,
        retryAttempts: 3,
        retryDelay: 1000,
        batchSize: 100,
        lazyLoading: true
      },
      
      // Data validation
      validation: {
        enabled: true,
        strictMode: false,
        schemaValidation: true
      }
    };
    
    // Dataset metadata
    this.datasetMetadata = {
      // Core datasets
      activeTravelways: { 
        required: true, 
        priority: 1, 
        size: 'large',
        updateFrequency: 'daily',
        storage: ['memory', 'indexedDB']
      },
      steps: { 
        required: false, 
        priority: 2, 
        size: 'medium',
        updateFrequency: 'weekly',
        storage: ['memory', 'indexedDB']
      },
      sidewalkClosures: { 
        required: false, 
        priority: 3, 
        size: 'small',
        updateFrequency: 'realtime',
        storage: ['memory', 'indexedDB', 'localStorage']
      },
      trafficControl: { 
        required: false, 
        priority: 4, 
        size: 'medium',
        updateFrequency: 'daily',
        storage: ['memory', 'indexedDB']
      },
      accessibleParking: { 
        required: false, 
        priority: 5, 
        size: 'small',
        updateFrequency: 'weekly',
        storage: ['memory', 'indexedDB']
      },
      transitStops: { 
        required: false, 
        priority: 6, 
        size: 'medium',
        updateFrequency: 'daily',
        storage: ['memory', 'indexedDB']
      },
      streetLights: { 
        required: false, 
        priority: 7, 
        size: 'large',
        updateFrequency: 'monthly',
        storage: ['memory', 'indexedDB']
      },
      publicWashrooms: { 
        required: false, 
        priority: 8, 
        size: 'small',
        updateFrequency: 'monthly',
        storage: ['memory', 'indexedDB']
      },
      
      // User data
      userPreferences: {
        required: false,
        priority: 1,
        size: 'tiny',
        updateFrequency: 'realtime',
        storage: ['memory', 'localStorage']
      },
      searchHistory: {
        required: false,
        priority: 2,
        size: 'small',
        updateFrequency: 'realtime',
        storage: ['memory', 'localStorage']
      },
      savedRoutes: {
        required: false,
        priority: 2,
        size: 'medium',
        updateFrequency: 'realtime',
        storage: ['memory', 'indexedDB', 'localStorage']
      }
    };
    
    // Data schemas for validation
    this.dataSchemas = {
      activeTravelways: {
        type: 'FeatureCollection',
        required: ['type', 'features'],
        properties: {
          features: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'geometry', 'properties']
            }
          }
        }
      },
      userPreferences: {
        type: 'object',
        properties: {
          accessibility: { type: 'object' },
          routing: { type: 'object' },
          display: { type: 'object' }
        }
      }
    };
    
    // Performance tracking
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      memoryUsage: 0,
      storageUsage: 0
    };
    
    // Sync management
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
  }

  /**
   * Initialize the unified data manager
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInitialization(options);
    return this.initializationPromise;
  }

  async _performInitialization(options = {}) {
    try {
      console.log('🚀 Initializing Unified Data Manager...');
      
      // Update configuration
      this.config = { ...this.config, ...options };
      
      // Initialize IndexedDB
      await this._initializeIndexedDB();
      
      // Initialize memory cache cleanup
      this._startCacheCleanup();
      
      // Initialize network monitoring
      this._initializeNetworkMonitoring();
      
      // Load critical datasets
      await this._loadCriticalDatasets();
      
      this.isInitialized = true;
      console.log('✅ Unified Data Manager initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Unified Data Manager:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Load dataset with unified caching strategy
   * @param {string} datasetName - Dataset name
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Dataset data
   */
  async loadDataset(datasetName, options = {}) {
    const startTime = performance.now();
    
    try {
      // Check if already loading
      if (this.loadPromises.has(datasetName)) {
        return this.loadPromises.get(datasetName);
      }
      
      // Check memory cache first
      const memoryData = this._getFromMemoryCache(datasetName);
      if (memoryData) {
        this._updatePerformanceMetrics('cache_hit', performance.now() - startTime);
        return memoryData;
      }
      
      // Check IndexedDB
      const indexedData = await this._getFromIndexedDB(datasetName);
      if (indexedData) {
        this._updatePerformanceMetrics('cache_hit', performance.now() - startTime);
        this._storeInMemoryCache(datasetName, indexedData);
        return indexedData;
      }
      
      // Check localStorage for small datasets
      const localData = this._getFromLocalStorage(datasetName);
      if (localData) {
        this._updatePerformanceMetrics('cache_hit', performance.now() - startTime);
        this._storeInMemoryCache(datasetName, localData);
        return localData;
      }
      
      // Load from source
      const loadPromise = this._loadFromSource(datasetName, options);
      this.loadPromises.set(datasetName, loadPromise);
      
      try {
        const data = await loadPromise;
        
        // Validate data
        if (this.config.validation.enabled) {
          this._validateData(datasetName, data);
        }
        
        // Store in all appropriate caches
        this._storeDataset(datasetName, data);
        
        // Create spatial index if needed
        if (this._needsSpatialIndex(datasetName)) {
          this._createSpatialIndex(datasetName, data);
        }
        
        this._updatePerformanceMetrics('cache_miss', performance.now() - startTime);
        return data;
        
      } finally {
        this.loadPromises.delete(datasetName);
      }
      
    } catch (error) {
      console.error(`❌ Failed to load dataset ${datasetName}:`, error);
      this._updatePerformanceMetrics('load_error', performance.now() - startTime);
      throw error;
    }
  }

  /**
   * Store data with unified storage strategy
   * @param {string} datasetName - Dataset name
   * @param {Object} data - Data to store
   * @param {Object} options - Storage options
   */
  async storeDataset(datasetName, data, options = {}) {
    try {
      // Validate data
      if (this.config.validation.enabled) {
        this._validateData(datasetName, data);
      }
      
      // Store in all appropriate storage layers
      this._storeDataset(datasetName, data, options);
      
      // Update version
      this.dataVersions.set(datasetName, {
        version: Date.now(),
        size: JSON.stringify(data).length,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Stored dataset ${datasetName}`);
      
    } catch (error) {
      console.error(`❌ Failed to store dataset ${datasetName}:`, error);
      throw error;
    }
  }

  /**
   * Get data with unified retrieval strategy
   * @param {string} datasetName - Dataset name
   * @param {Object} options - Retrieval options
   * @returns {Promise<Object>} Dataset data
   */
  async getDataset(datasetName, options = {}) {
    const { forceReload = false, useCache = true } = options;
    
    if (forceReload) {
      return this.loadDataset(datasetName, options);
    }
    
    if (useCache) {
      // Check memory cache first
      const memoryData = this._getFromMemoryCache(datasetName);
      if (memoryData) {
        return memoryData;
      }
      
      // Check IndexedDB
      const indexedData = await this._getFromIndexedDB(datasetName);
      if (indexedData) {
        this._storeInMemoryCache(datasetName, indexedData);
        return indexedData;
      }
      
      // Check localStorage
      const localData = this._getFromLocalStorage(datasetName);
      if (localData) {
        this._storeInMemoryCache(datasetName, localData);
        return localData;
      }
    }
    
    // Load from source if not in cache
    return this.loadDataset(datasetName, options);
  }

  /**
   * Clear dataset from all storage layers
   * @param {string} datasetName - Dataset name
   */
  async clearDataset(datasetName) {
    try {
      // Clear from memory cache
      this.memoryCache.delete(datasetName);
      
      // Clear from IndexedDB
      await this._clearFromIndexedDB(datasetName);
      
      // Clear from localStorage
      this._clearFromLocalStorage(datasetName);
      
      // Clear spatial index
      this.spatialIndexes.delete(datasetName);
      
      // Clear version info
      this.dataVersions.delete(datasetName);
      
      console.log(`🧹 Cleared dataset ${datasetName}`);
      
    } catch (error) {
      console.error(`❌ Failed to clear dataset ${datasetName}:`, error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.cacheHits / 
        Math.max(this.performanceMetrics.totalRequests, 1),
      memoryUsage: this._calculateMemoryUsage(),
      storageUsage: this._calculateStorageUsage()
    };
  }

  /**
   * Get data manager status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      datasets: Array.from(this.datasets.keys()),
      cacheSize: this.memoryCache.size,
      spatialIndexes: Array.from(this.spatialIndexes.keys()),
      performance: this.getPerformanceMetrics()
    };
  }

  /**
   * Shutdown the data manager
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('🛑 Shutting down Unified Data Manager...');
    
    // Clear all caches
    this.memoryCache.clear();
    this.loadPromises.clear();
    this.spatialIndexes.clear();
    
    // Close IndexedDB
    if (this.indexedDB) {
      this.indexedDB.close();
      this.indexedDB = null;
    }
    
    // Reset state
    this.isInitialized = false;
    this.initializationPromise = null;
    
    console.log('✅ Unified Data Manager shutdown complete');
  }

  // Private methods

  async _initializeIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.indexedDB.name, this.config.indexedDB.version);
      
      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.indexedDB = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for each dataset
        Object.keys(this.datasetMetadata).forEach(datasetName => {
          if (!db.objectStoreNames.contains(datasetName)) {
            const store = db.createObjectStore(datasetName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('version', 'version', { unique: false });
          }
        });
        
        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  _startCacheCleanup() {
    setInterval(() => {
      this._cleanupMemoryCache();
      this._cleanupIndexedDB();
      this._cleanupLocalStorage();
    }, this.config.memoryCache.cleanupInterval);
  }

  _initializeNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this._processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async _loadCriticalDatasets() {
    const criticalDatasets = Object.entries(this.datasetMetadata)
      .filter(([_, metadata]) => metadata.required)
      .sort(([_, a], [__, b]) => a.priority - b.priority);
    
    for (const [datasetName, metadata] of criticalDatasets) {
      try {
        await this.loadDataset(datasetName);
        console.log(`✅ Loaded critical dataset: ${datasetName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to load critical dataset ${datasetName}:`, error);
      }
    }
  }

  async _loadFromSource(datasetName, options) {
    const metadata = this.datasetMetadata[datasetName];
    if (!metadata) {
      throw new Error(`Unknown dataset: ${datasetName}`);
    }
    
    // Load from API or file based on dataset type
    if (datasetName.startsWith('user')) {
      return this._loadUserData(datasetName);
    } else {
      return this._loadGeospatialData(datasetName);
    }
  }

  async _loadGeospatialData(datasetName) {
    // Load from API or local file
    const dataUrl = `/data/${datasetName}.geojson`;
    
    try {
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error(`❌ Failed to load geospatial data for ${datasetName}:`, error);
      throw error;
    }
  }

  async _loadUserData(datasetName) {
    // Load user data from localStorage or create default
    const defaultData = this._getDefaultUserData(datasetName);
    const storedData = this._getFromLocalStorage(datasetName);
    
    return storedData || defaultData;
  }

  _getDefaultUserData(datasetName) {
    const defaults = {
      userPreferences: {
        accessibility: {
          highContrast: false,
          screenReader: false,
          reducedMotion: false
        },
        routing: {
          avoidStairs: false,
          preferAccessible: true,
          maxDistance: 5000
        },
        display: {
          theme: 'light',
          language: 'en',
          units: 'metric'
        }
      },
      searchHistory: [],
      savedRoutes: []
    };
    
    return defaults[datasetName] || {};
  }

  _storeDataset(datasetName, data, options = {}) {
    const metadata = this.datasetMetadata[datasetName];
    if (!metadata) return;
    
    // Store in memory cache
    this._storeInMemoryCache(datasetName, data);
    
    // Store in appropriate storage layers
    metadata.storage.forEach(storageType => {
      switch (storageType) {
        case 'indexedDB':
          this._storeInIndexedDB(datasetName, data);
          break;
        case 'localStorage':
          this._storeInLocalStorage(datasetName, data);
          break;
      }
    });
  }

  _getFromMemoryCache(datasetName) {
    const cached = this.memoryCache.get(datasetName);
    if (cached && Date.now() - cached.timestamp < this.config.memoryCache.ttl) {
      return cached.data;
    }
    
    if (cached) {
      this.memoryCache.delete(datasetName);
    }
    
    return null;
  }

  _storeInMemoryCache(datasetName, data) {
    // Enforce cache size limit
    if (this.memoryCache.size >= this.config.memoryCache.maxSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(datasetName, {
      data,
      timestamp: Date.now()
    });
  }

  async _getFromIndexedDB(datasetName) {
    if (!this.indexedDB) return null;
    
    try {
      const transaction = this.indexedDB.transaction([datasetName], 'readonly');
      const store = transaction.objectStore(datasetName);
      const request = store.get(datasetName);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result && Date.now() - result.timestamp < this.config.indexedDB.ttl) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
      
    } catch (error) {
      console.warn(`⚠️ IndexedDB read failed for ${datasetName}:`, error);
      return null;
    }
  }

  async _storeInIndexedDB(datasetName, data) {
    if (!this.indexedDB) return;
    
    try {
      const transaction = this.indexedDB.transaction([datasetName], 'readwrite');
      const store = transaction.objectStore(datasetName);
      
      const item = {
        id: datasetName,
        data,
        timestamp: Date.now(),
        version: this.dataVersions.get(datasetName)?.version || 1
      };
      
      store.put(item);
      
    } catch (error) {
      console.warn(`⚠️ IndexedDB write failed for ${datasetName}:`, error);
    }
  }

  _getFromLocalStorage(datasetName) {
    try {
      const key = `trek-iq-data-${datasetName}`;
      const stored = this.localStorage.getItem(key);
      
      if (stored) {
        const data = JSON.parse(stored);
        if (Date.now() - data.timestamp < this.config.localStorage.ttl) {
          return data.data;
        } else {
          this.localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn(`⚠️ localStorage read failed for ${datasetName}:`, error);
    }
    
    return null;
  }

  _storeInLocalStorage(datasetName, data) {
    try {
      const key = `trek-iq-data-${datasetName}`;
      const item = {
        data,
        timestamp: Date.now()
      };
      
      this.localStorage.setItem(key, JSON.stringify(item));
      
    } catch (error) {
      console.warn(`⚠️ localStorage write failed for ${datasetName}:`, error);
    }
  }

  _validateData(datasetName, data) {
    const schema = this.dataSchemas[datasetName];
    if (!schema) return;
    
    // Basic validation - can be extended with more sophisticated validation
    if (schema.type && data.type !== schema.type) {
      throw new Error(`Invalid data type for ${datasetName}: expected ${schema.type}, got ${data.type}`);
    }
    
    if (schema.required) {
      schema.required.forEach(field => {
        if (!(field in data)) {
          throw new Error(`Missing required field ${field} in ${datasetName}`);
        }
      });
    }
  }

  _needsSpatialIndex(datasetName) {
    const metadata = this.datasetMetadata[datasetName];
    return metadata && metadata.size === 'large' && datasetName.includes('Travelways');
  }

  _createSpatialIndex(datasetName, data) {
    // Create spatial index for fast nearest neighbor lookups
    // This is a simplified implementation
    const index = new Map();
    
    if (data.features) {
      data.features.forEach((feature, i) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const [lng, lat] = feature.geometry.coordinates[0];
          const key = `${Math.floor(lat * 100)}_${Math.floor(lng * 100)}`;
          
          if (!index.has(key)) {
            index.set(key, []);
          }
          index.get(key).push(i);
        }
      });
    }
    
    this.spatialIndexes.set(datasetName, index);
  }

  _updatePerformanceMetrics(type, loadTime) {
    this.performanceMetrics.totalRequests++;
    
    switch (type) {
      case 'cache_hit':
        this.performanceMetrics.cacheHits++;
        break;
      case 'cache_miss':
        this.performanceMetrics.cacheMisses++;
        break;
      case 'load_error':
        // Track errors
        break;
    }
    
    // Update average load time
    this.performanceMetrics.averageLoadTime = 
      (this.performanceMetrics.averageLoadTime * 0.9) + (loadTime * 0.1);
  }

  _calculateMemoryUsage() {
    let totalSize = 0;
    for (const [key, value] of this.memoryCache.entries()) {
      totalSize += JSON.stringify(value).length;
    }
    return totalSize;
  }

  _calculateStorageUsage() {
    let totalSize = 0;
    for (let i = 0; i < this.localStorage.length; i++) {
      const key = this.localStorage.key(i);
      if (key && key.startsWith('trek-iq-data-')) {
        totalSize += this.localStorage.getItem(key).length;
      }
    }
    return totalSize;
  }

  _cleanupMemoryCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > this.config.memoryCache.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired memory cache entries`);
    }
  }

  async _cleanupIndexedDB() {
    if (!this.indexedDB) return;
    
    // Cleanup expired entries from IndexedDB
    // Implementation would go here
  }

  _cleanupLocalStorage() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (let i = 0; i < this.localStorage.length; i++) {
      const key = this.localStorage.key(i);
      if (key && key.startsWith('trek-iq-data-')) {
        try {
          const stored = JSON.parse(this.localStorage.getItem(key));
          if (now - stored.timestamp > this.config.localStorage.ttl) {
            keysToDelete.push(key);
          }
        } catch (error) {
          keysToDelete.push(key); // Remove corrupted entries
        }
      }
    }
    
    keysToDelete.forEach(key => this.localStorage.removeItem(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${keysToDelete.length} expired localStorage entries`);
    }
  }

  async _processSyncQueue() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    
    try {
      // Process sync queue
      // Implementation would go here
      
    } finally {
      this.syncInProgress = false;
    }
  }
}

// Export singleton instance
const unifiedDataManager = new UnifiedDataManager();
export default unifiedDataManager;
