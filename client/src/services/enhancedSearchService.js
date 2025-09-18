// Enhanced Search Service - Unified search functionality for Trek.IQ
import performanceService from './performanceService.js';

class EnhancedSearchService {
  constructor() {
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.cache = new Map();
    this.autocompleteCache = new Map();
    this.maxCacheSize = 500;
    this.isInitialized = false;
    
    // Performance optimizations
    this.searchIndex = new Map();
    this.localDatasets = new Map();
    this.spatialIndex = new Map();
    this.batchSize = 10;
    this.debounceTime = 300;
    this.lastSearchTime = 0;
    
    // Halifax coordinates for proximity bias
    this.halifaxCoords = [-63.5756, 44.6475];
  }

  // Initialize with performance optimizations
  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Enhanced Search Service...');
      
      // Load local datasets in parallel
      await this.loadLocalDatasets();
      
      // Build search index
      await this.buildSearchIndex();
      
      // Build spatial index for location-based searches
      await this.buildSpatialIndex();
      
      this.isInitialized = true;
      console.log('Enhanced Search Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Search Service:', error);
      this.isInitialized = true; // Mark as initialized even if some features fail
    }
  }

  // Load local datasets with performance optimizations
  async loadLocalDatasets() {
    const datasets = [
      { name: 'civic_addresses', url: '/api/data/CivicAddresses_-5590432719903009914.geojson', priority: 'high' },
      { name: 'transit_stops', url: '/api/data/Bus_Stops_2_9086297843420881686.geojson', priority: 'high' },
      { name: 'accessible_parking', url: '/api/data/Accessible_Parking.geojson', priority: 'medium' },
      { name: 'public_washrooms', url: '/api/data/HRM_Public_Washrooms_8937353538278970153.geojson', priority: 'medium' },
      { name: 'transit_shelters', url: '/api/data/Transit_Shelters_1139561051208148127.geojson', priority: 'low' }
    ];

    // Load datasets in batches for better performance
    const batchSize = 3;
    const batches = [];
    
    for (let i = 0; i < datasets.length; i += batchSize) {
      batches.push(datasets.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (dataset) => {
        try {
          console.log(`Loading local dataset: ${dataset.name}`);
          
          // Use performance service for caching
          const data = await performanceService.getCachedData(
            `local_dataset_${dataset.name}`,
            async () => {
              const response = await fetch(dataset.url);
              if (response.ok) {
                return response.json();
              } else {
                console.warn(`Failed to load ${dataset.name}: HTTP ${response.status}`);
                return null;
              }
            },
            {
              ttl: 30 * 60 * 1000, // 30 minutes
              priority: dataset.priority,
              useIndexedDB: true
            }
          );
          
          if (data) {
            this.localDatasets.set(dataset.name, data);
            console.log(`Loaded ${dataset.name}: ${data.features?.length || 0} features`);
          }
        } catch (error) {
          console.warn(`Failed to load ${dataset.name}:`, error);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Build search index for fast lookups
  async buildSearchIndex() {
    console.log('Building search index...');
    
    for (const [datasetName, data] of this.localDatasets) {
      if (!data.features) continue;
      
      const index = new Map();
      
      data.features.forEach((feature, featureIndex) => {
        if (feature.properties) {
          const properties = feature.properties;
          
          // Index by address
          if (properties.address) {
            const addressKey = properties.address.toLowerCase();
            if (!index.has(addressKey)) {
              index.set(addressKey, []);
            }
            index.get(addressKey).push({ feature, featureIndex, type: 'address' });
          }
          
          // Index by street name
          if (properties.street) {
            const streetKey = properties.street.toLowerCase();
            if (!index.has(streetKey)) {
              index.set(streetKey, []);
            }
            index.get(streetKey).push({ feature, featureIndex, type: 'street' });
          }
          
          // Index by name
          if (properties.name) {
            const nameKey = properties.name.toLowerCase();
            if (!index.has(nameKey)) {
              index.set(nameKey, []);
            }
            index.get(nameKey).push({ feature, featureIndex, type: 'name' });
          }
          
          // Index by type/category
          if (properties.type || properties.category) {
            const typeKey = (properties.type || properties.category).toLowerCase();
            if (!index.has(typeKey)) {
              index.set(typeKey, []);
            }
            index.get(typeKey).push({ feature, featureIndex, type: 'category' });
          }
        }
      });
      
      this.searchIndex.set(datasetName, index);
    }
    
    console.log('Search index built successfully');
  }

  // Build spatial index for location-based searches
  async buildSpatialIndex() {
    console.log('Building spatial index...');
    
    for (const [datasetName, data] of this.localDatasets) {
      if (!data.features) continue;
      
      const spatialIndex = new Map();
      
      data.features.forEach((feature, featureIndex) => {
        if (feature.geometry && feature.geometry.coordinates) {
          const [lng, lat] = feature.geometry.coordinates;
          const key = `${Math.floor(lng * 100)},${Math.floor(lat * 100)}`;
          
          if (!spatialIndex.has(key)) {
            spatialIndex.set(key, []);
          }
          spatialIndex.get(key).push({ feature, featureIndex });
        }
      });
      
      this.spatialIndex.set(datasetName, spatialIndex);
    }
    
    console.log('Spatial index built successfully');
  }

  // Enhanced search with multiple strategies and fallbacks
  async search(query, options = {}) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const {
      limit = 10,
      types = 'address,poi,place',
      country = 'ca',
      bbox = '-63.8,44.5,-63.4,44.8',
      proximity = this.halifaxCoords
    } = options;

    // Check cache first
    const cacheKey = `${query}_${limit}_${types}`;
    if (this.cache.has(cacheKey)) {
      console.log(`Enhanced search cache hit for: "${query}"`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`Enhanced search for: "${query}"`);
      
      // Strategy 1: Try Mapbox search first
      const mapboxResults = await this.searchMapbox(query, {
        limit,
        types,
        country,
        bbox,
        proximity
      });

      // Strategy 2: Try local dataset search
      const localResults = await this.searchLocalDatasets(query, limit);

      // Strategy 3: Combine and rank results
      const combinedResults = this.combineAndRankResults(mapboxResults, localResults, query);

      // Cache the results
      this.cache.set(cacheKey, combinedResults);
      
      console.log(`Enhanced search returned ${combinedResults.length} results for "${query}"`);
      return combinedResults;

    } catch (error) {
      console.error('Enhanced search failed:', error);
      
      // Fallback to local search only
      try {
        const localResults = await this.searchLocalDatasets(query, limit);
        return localResults;
      } catch (fallbackError) {
        console.error('Local search fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  // Search using Mapbox API with performance optimizations
  async searchMapbox(query, options) {
    try {
      const { limit = 10, types = 'address,poi,place', country = 'ca', bbox, proximity } = options;
      
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        q: query,
        limit: limit.toString(),
        types,
        country,
        bbox: bbox || '-63.8,44.5,-63.4,44.8',
        proximity: proximity ? proximity.join(',') : this.halifaxCoords.join(',')
      });

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      return this.formatMapboxResults(data.features || []);
    } catch (error) {
      console.error('Mapbox search error:', error);
      return [];
    }
  }

  // Search local datasets with performance optimizations
  async searchLocalDatasets(query, limit = 10) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    // Search across all datasets in parallel
    const searchPromises = Array.from(this.searchIndex.entries()).map(async ([datasetName, index]) => {
      const datasetResults = [];
      
      // Find exact matches first
      for (const [key, entries] of index) {
        if (key.includes(queryLower)) {
          for (const entry of entries) {
            const result = this.formatSearchResult(entry.feature, datasetName, entry.type);
            if (result) {
              datasetResults.push(result);
            }
          }
        }
      }
      
      // Find partial matches
      for (const [key, entries] of index) {
        if (key.includes(queryLower) || queryLower.includes(key)) {
          for (const entry of entries) {
            const result = this.formatSearchResult(entry.feature, datasetName, entry.type);
            if (result && !datasetResults.find(r => r.id === result.id)) {
              datasetResults.push(result);
            }
          }
        }
      }
      
      return datasetResults;
    });

    const allResults = await Promise.all(searchPromises);
    
    // Combine and limit results
    for (const datasetResults of allResults) {
      results.push(...datasetResults);
      if (results.length >= limit) break;
    }
    
    return results.slice(0, limit);
  }

  // Format Mapbox results
  formatMapboxResults(features) {
    return features.map(feature => ({
      id: feature.id,
      name: feature.place_name,
      coordinates: feature.center,
      type: feature.place_type[0],
      relevance: feature.relevance,
      source: 'mapbox',
      properties: {
        address: feature.place_name,
        type: feature.place_type[0],
        relevance: feature.relevance
      }
    }));
  }

  // Format search result
  formatSearchResult(feature, datasetName, matchType) {
    if (!feature.properties) return null;
    
    const properties = feature.properties;
    const coordinates = feature.geometry?.coordinates;
    
    if (!coordinates) return null;
    
    return {
      id: `${datasetName}_${feature.id || Math.random()}`,
      name: properties.name || properties.address || `${datasetName} location`,
      coordinates: coordinates,
      type: properties.type || datasetName,
      relevance: this.calculateRelevance(properties, matchType),
      source: 'local',
      properties: {
        ...properties,
        dataset: datasetName,
        matchType
      }
    };
  }

  // Calculate relevance score
  calculateRelevance(properties, matchType) {
    let score = 0.5; // Base score
    
    // Boost exact matches
    if (matchType === 'address') score += 0.3;
    if (matchType === 'name') score += 0.2;
    if (matchType === 'street') score += 0.1;
    
    // Boost by proximity to Halifax
    if (properties.coordinates) {
      const distance = this.calculateDistance(properties.coordinates, this.halifaxCoords);
      if (distance < 1000) score += 0.2; // Within 1km
      else if (distance < 5000) score += 0.1; // Within 5km
    }
    
    return Math.min(score, 1.0);
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

  // Combine and rank results
  combineAndRankResults(mapboxResults, localResults, query) {
    const allResults = [...mapboxResults, ...localResults];
    
    // Remove duplicates based on coordinates
    const uniqueResults = [];
    const seenCoordinates = new Set();
    
    for (const result of allResults) {
      const coordKey = `${result.coordinates[0].toFixed(4)},${result.coordinates[1].toFixed(4)}`;
      if (!seenCoordinates.has(coordKey)) {
        seenCoordinates.add(coordKey);
        uniqueResults.push(result);
      }
    }
    
    // Sort by relevance and distance
    uniqueResults.sort((a, b) => {
      // Primary sort by relevance
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      
      // Secondary sort by distance to Halifax
      const distanceA = this.calculateDistance(a.coordinates, this.halifaxCoords);
      const distanceB = this.calculateDistance(b.coordinates, this.halifaxCoords);
      return distanceA - distanceB;
    });
    
    return uniqueResults;
  }

  // Parse coordinate string (e.g., "44.6475, -63.5756" or "Your Current Location")
  parseCoordinates(query) {
    if (!query || typeof query !== 'string') return null;
    
    // Check if it's a coordinate pair (lat, lng)
    const coordRegex = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
    const match = query.match(coordRegex);
    
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      // Validate coordinate ranges
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          coordinates: [lng, lat], // Mapbox format [lng, lat]
          lat: lat,
          lng: lng,
          name: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          address: `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          type: 'coordinates',
          relevance: 1.0,
          source: 'coordinate_parsing'
        };
      }
    }
    
    return null;
  }

  // Geocode location with performance optimizations
  async geocode(query, options = {}) {
    const cacheKey = `geocode_${query}_${JSON.stringify(options)}`;
    
    return await performanceService.getCachedData(
      cacheKey,
      async () => {
        // First, try to parse as coordinates
        const coordinateResult = this.parseCoordinates(query);
        if (coordinateResult) {
          return coordinateResult;
        }
        
        // Try Mapbox geocoding
        const mapboxResults = await this.searchMapbox(query, { ...options, limit: 1 });
        if (mapboxResults.length > 0) {
          return mapboxResults[0];
        }
        
        // Fallback to local search
        const localResults = await this.searchLocalDatasets(query, 1);
        if (localResults.length > 0) {
          return localResults[0];
        }
        
        return null;
      },
      {
        ttl: 30 * 60 * 1000, // 30 minutes
        priority: 'high',
        useIndexedDB: true
      }
    );
  }

  // Get recent searches
  getRecentSearches(limit = 10) {
    try {
      const recent = localStorage.getItem('trek_iq_recent_searches');
      if (recent) {
        const searches = JSON.parse(recent);
        return searches.slice(0, limit);
      }
    } catch (error) {
      console.error('Error getting recent searches:', error);
    }
    return [];
  }

  // Add to recent searches
  addToRecentSearches(query) {
    try {
      const recent = this.getRecentSearches(50);
      const updated = [query, ...recent.filter(q => q !== query)].slice(0, 50);
      localStorage.setItem('trek_iq_recent_searches', JSON.stringify(updated));
    } catch (error) {
      console.error('Error adding to recent searches:', error);
    }
  }

  // Clean cache
  cleanCache() {
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize / 2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  // Get statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      autocompleteCacheSize: this.autocompleteCache.size,
      searchIndexSize: this.searchIndex.size,
      localDatasetsSize: this.localDatasets.size,
      spatialIndexSize: this.spatialIndex.size
    };
  }

  // Test connection
  async testConnection() {
    try {
      const testQuery = 'Halifax';
      const results = await this.search(testQuery, { limit: 1 });
      return results.length > 0;
    } catch (error) {
      console.error('Search service connection test failed:', error);
      return false;
    }
  }

  // Get health status
  getHealthStatus() {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      initialized: this.isInitialized,
      cacheSize: this.cache.size,
      localDatasets: this.localDatasets.size,
      lastError: null
    };
  }
}

// Export singleton instance
const enhancedSearchService = new EnhancedSearchService();
export default enhancedSearchService;
