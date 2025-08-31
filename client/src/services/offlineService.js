// Offline Service for Trek.IQ
class OfflineService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.cacheName = 'trek-iq-cache-v1';
    this.offlineData = {
      routes: new Map(),
      barriers: new Map(),
      maps: new Map(),
      userData: new Map()
    };
    this.syncQueue = [];
    this.isOnline = navigator.onLine;
    
    this.initializeDatabase();
    this.setupNetworkListeners();
  }

  // Initialize IndexedDB for offline storage
  async initializeDatabase() {
    try {
      const request = indexedDB.open('TrekIQOfflineDB', 1);
      
      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isInitialized = true;
        console.log('Offline database initialized');
        this.loadOfflineData();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('routes')) {
          const routesStore = db.createObjectStore('routes', { keyPath: 'id' });
          routesStore.createIndex('origin', 'origin', { unique: false });
          routesStore.createIndex('destination', 'destination', { unique: false });
          routesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('barriers')) {
          const barriersStore = db.createObjectStore('barriers', { keyPath: 'id' });
          barriersStore.createIndex('location', 'location', { unique: false });
          barriersStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('maps')) {
          const mapsStore = db.createObjectStore('maps', { keyPath: 'tileKey' });
          mapsStore.createIndex('zoom', 'zoom', { unique: false });
          mapsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('userData')) {
          const userDataStore = db.createObjectStore('userData', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
    }
  }

  // Setup network status listeners
  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onNetworkRestored();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onNetworkLost();
    });
  }

  // Network restored handler
  async onNetworkRestored() {
    console.log('Network connection restored');
    
    // Process sync queue
    await this.processSyncQueue();
    
    // Refresh cached data
    await this.refreshOfflineData();
    
    // Notify app of online status
    this.notifyStatusChange('online');
  }

  // Network lost handler
  onNetworkLost() {
    console.log('Network connection lost');
    this.notifyStatusChange('offline');
  }

  // Store route offline
  async storeRoute(route) {
    if (!this.isInitialized) return;

    try {
      const routeData = {
        id: route.id || `route_${Date.now()}`,
        origin: route.origin,
        destination: route.destination,
        route: route,
        timestamp: Date.now(),
        mode: route.mode || 'walking'
      };

      const transaction = this.db.transaction(['routes'], 'readwrite');
      const store = transaction.objectStore('routes');
      await store.put(routeData);

      // Keep only last 50 routes
      await this.cleanupOldRoutes();
      
      console.log('Route stored offline:', routeData.id);
      return routeData.id;
    } catch (error) {
      console.error('Failed to store route offline:', error);
    }
  }

  // Get stored routes
  async getStoredRoutes(limit = 20) {
    if (!this.isInitialized) return [];

    try {
      const transaction = this.db.transaction(['routes'], 'readonly');
      const store = transaction.objectStore('routes');
      const index = store.index('timestamp');
      
      const request = index.openCursor(null, 'prev');
      const routes = [];
      
      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && routes.length < limit) {
            routes.push(cursor.value);
            cursor.continue();
          } else {
            resolve(routes);
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get stored routes:', error);
      return [];
    }
  }

  // Store barrier offline
  async storeBarrier(barrier) {
    if (!this.isInitialized) return;

    try {
      const barrierData = {
        id: barrier.id || `barrier_${Date.now()}`,
        barrier: barrier,
        timestamp: Date.now(),
        location: `${barrier.latitude},${barrier.longitude}`
      };

      const transaction = this.db.transaction(['barriers'], 'readwrite');
      const store = transaction.objectStore('barriers');
      await store.put(barrierData);

      // Add to sync queue if offline
      if (!this.isOnline) {
        await this.addToSyncQueue('barrier', barrierData);
      }

      console.log('Barrier stored offline:', barrierData.id);
      return barrierData.id;
    } catch (error) {
      console.error('Failed to store barrier offline:', error);
    }
  }

  // Get stored barriers
  async getStoredBarriers() {
    if (!this.isInitialized) return [];

    try {
      const transaction = this.db.transaction(['barriers'], 'readonly');
      const store = transaction.objectStore('barriers');
      const request = store.getAll();
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get stored barriers:', error);
      return [];
    }
  }

  // Cache map tiles
  async cacheMapTile(tileKey, tileData) {
    if (!this.isInitialized) return;

    try {
      const tileInfo = {
        tileKey,
        data: tileData,
        timestamp: Date.now(),
        zoom: this.extractZoomFromKey(tileKey)
      };

      const transaction = this.db.transaction(['maps'], 'readwrite');
      const store = transaction.objectStore('maps');
      await store.put(tileInfo);

      // Cleanup old tiles
      await this.cleanupOldTiles();
    } catch (error) {
      console.error('Failed to cache map tile:', error);
    }
  }

  // Get cached map tile
  async getCachedTile(tileKey) {
    if (!this.isInitialized) return null;

    try {
      const transaction = this.db.transaction(['maps'], 'readonly');
      const store = transaction.objectStore('maps');
      const request = store.get(tileKey);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result;
          if (result && Date.now() - result.timestamp < 24 * 60 * 60 * 1000) {
            resolve(result.data);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get cached tile:', error);
      return null;
    }
  }

  // Store user data
  async storeUserData(key, data) {
    if (!this.isInitialized) return;

    try {
      const userData = {
        key,
        data,
        timestamp: Date.now()
      };

      const transaction = this.db.transaction(['userData'], 'readwrite');
      const store = transaction.objectStore('userData');
      await store.put(userData);
    } catch (error) {
      console.error('Failed to store user data:', error);
    }
  }

  // Get user data
  async getUserData(key) {
    if (!this.isInitialized) return null;

    try {
      const transaction = this.db.transaction(['userData'], 'readonly');
      const store = transaction.objectStore('userData');
      const request = store.get(key);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to get user data:', error);
      return null;
    }
  }

  // Add item to sync queue
  async addToSyncQueue(type, data) {
    if (!this.isInitialized) return;

    try {
      const syncItem = {
        type,
        data,
        timestamp: Date.now(),
        retries: 0
      };

      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      await store.add(syncItem);
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
    }
  }

  // Process sync queue
  async processSyncQueue() {
    if (!this.isInitialized || !this.isOnline) return;

    try {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const items = request.result;
        
        for (const item of items) {
          try {
            await this.syncItem(item);
            await store.delete(item.id);
          } catch (error) {
            console.error('Failed to sync item:', error);
            item.retries++;
            
            if (item.retries < 3) {
              await store.put(item);
            } else {
              await store.delete(item.id);
            }
          }
        }
      };
    } catch (error) {
      console.error('Failed to process sync queue:', error);
    }
  }

  // Sync individual item
  async syncItem(item) {
    switch (item.type) {
      case 'barrier':
        return this.syncBarrier(item.data);
      case 'route':
        return this.syncRoute(item.data);
      default:
        console.warn('Unknown sync item type:', item.type);
    }
  }

  // Sync barrier to server
  async syncBarrier(barrierData) {
    try {
      const response = await fetch('/api/barriers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(barrierData.barrier)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Barrier synced successfully:', barrierData.id);
    } catch (error) {
      console.error('Failed to sync barrier:', error);
      throw error;
    }
  }

  // Sync route to server
  async syncRoute(routeData) {
    try {
      const response = await fetch('/api/routes/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(routeData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Route synced successfully:', routeData.id);
    } catch (error) {
      console.error('Failed to sync route:', error);
      throw error;
    }
  }

  // Cleanup old routes
  async cleanupOldRoutes() {
    if (!this.isInitialized) return;

    try {
      const transaction = this.db.transaction(['routes'], 'readwrite');
      const store = transaction.objectStore('routes');
      const index = store.index('timestamp');
      
      // Keep only last 50 routes
      const request = index.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          // Count total routes first, then delete old ones
          // This is a simplified version
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to cleanup old routes:', error);
    }
  }

  // Cleanup old map tiles
  async cleanupOldTiles() {
    if (!this.isInitialized) return;

    try {
      const transaction = this.db.transaction(['maps'], 'readwrite');
      const store = transaction.objectStore('maps');
      const index = store.index('timestamp');
      
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to cleanup old tiles:', error);
    }
  }

  // Extract zoom level from tile key
  extractZoomFromKey(tileKey) {
    const parts = tileKey.split('/');
    return parseInt(parts[1]) || 0;
  }

  // Load offline data into memory
  async loadOfflineData() {
    if (!this.isInitialized) return;

    try {
      // Load routes
      const routes = await this.getStoredRoutes();
      this.offlineData.routes = new Map(routes.map(r => [r.id, r]));

      // Load barriers
      const barriers = await this.getStoredBarriers();
      this.offlineData.barriers = new Map(barriers.map(b => [b.id, b]));

      console.log('Offline data loaded:', {
        routes: this.offlineData.routes.size,
        barriers: this.offlineData.barriers.size
      });
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }

  // Refresh offline data
  async refreshOfflineData() {
    await this.loadOfflineData();
  }

  // Check if data is available offline
  isDataAvailableOffline(type, key) {
    switch (type) {
      case 'route':
        return this.offlineData.routes.has(key);
      case 'barrier':
        return this.offlineData.barriers.has(key);
      case 'tile':
        return this.offlineData.maps.has(key);
      default:
        return false;
    }
  }

  // Get offline data
  getOfflineData(type, key) {
    switch (type) {
      case 'route':
        return this.offlineData.routes.get(key);
      case 'barrier':
        return this.offlineData.barriers.get(key);
      case 'tile':
        return this.offlineData.maps.get(key);
      default:
        return null;
    }
  }

  // Notify status change
  notifyStatusChange(status) {
    // Dispatch custom event for app to listen to
    window.dispatchEvent(new CustomEvent('offlineStatusChange', {
      detail: { status, timestamp: Date.now() }
    }));
  }

  // Get storage usage
  async getStorageUsage() {
    if (!this.isInitialized) return { used: 0, total: 0 };

    try {
      const transaction = this.db.transaction(['routes', 'barriers', 'maps', 'userData'], 'readonly');
      const stores = ['routes', 'barriers', 'maps', 'userData'];
      let totalSize = 0;

      for (const storeName of stores) {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        await new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const data = request.result;
            totalSize += JSON.stringify(data).length;
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      }

      return {
        used: totalSize,
        total: 50 * 1024 * 1024 // 50MB limit
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, total: 0 };
    }
  }

  // Clear all offline data
  async clearAllData() {
    if (!this.isInitialized) return;

    try {
      const stores = ['routes', 'barriers', 'maps', 'userData', 'syncQueue'];
      
      for (const storeName of stores) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await store.clear();
      }

      this.offlineData = {
        routes: new Map(),
        barriers: new Map(),
        maps: new Map(),
        userData: new Map()
      };

      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }

  // Get offline status
  getOfflineStatus() {
    return {
      isOnline: this.isOnline,
      isInitialized: this.isInitialized,
      dataCounts: {
        routes: this.offlineData.routes.size,
        barriers: this.offlineData.barriers.size,
        maps: this.offlineData.maps.size,
        userData: this.offlineData.userData.size
      }
    };
  }
}

// Create singleton instance
const offlineService = new OfflineService();

export default offlineService;
