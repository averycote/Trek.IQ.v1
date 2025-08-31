// Enhanced Geocoding Service with Mapbox Integration and Rate Limiting
class GeocodingService {
  constructor() {
    this.cache = new Map();
    this.autocompleteCache = new Map();
    this.recentSearches = [];
    this.maxCacheSize = 1000;
    this.maxRecentSearches = 50;
    this.isInitialized = false;
    this.civicAddresses = [];
    this.pointsOfInterest = [];
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    
    // Rate limiting
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests (10 requests per second)
    this.maxConcurrentRequests = 5;
    this.activeRequests = 0;
  }

  // Rate limiting helper
  async throttleRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }

  // Queue management for concurrent requests
  async executeRequest(requestFn) {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      // Wait for a slot to become available
      await new Promise(resolve => {
        this.requestQueue.push(resolve);
      });
    }
    
    this.activeRequests++;
    
    try {
      await this.throttleRequest();
      const result = await requestFn();
      return result;
    } finally {
      this.activeRequests--;
      
      // Process next request in queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        nextRequest();
      }
    }
  }

  // Initialize the geocoding service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing Mapbox geocoding service...');
      await this.loadCivicAddresses();
      await this.loadPointsOfInterest();
      this.buildSearchIndex();
      this.isInitialized = true;
      console.log('Mapbox geocoding service initialized successfully');
    } catch (error) {
      console.error('Error initializing geocoding service:', error);
    }
  }

  // Load civic addresses with error handling and retry logic
  async loadCivicAddresses() {
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch('/api/data/civic_addresses.geojson');
        if (response.ok) {
          const data = await response.json();
          this.civicAddresses = data.features || [];
          console.log(`Loaded ${this.civicAddresses.length} civic addresses`);
          break;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        retries--;
        console.warn(`Failed to load civic addresses (${retries} retries left):`, error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries))); // Exponential backoff
        }
      }
    }
  }

  // Load points of interest with error handling and retry logic
  async loadPointsOfInterest() {
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch('/api/data/points_of_interest.geojson');
        if (response.ok) {
          const data = await response.json();
          this.pointsOfInterest = data.features || [];
          console.log(`Loaded ${this.pointsOfInterest.length} points of interest`);
          break;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        retries--;
        console.warn(`Failed to load points of interest (${retries} retries left):`, error);
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries))); // Exponential backoff
        }
      }
    }
  }

  // Build search index with error handling
  buildSearchIndex() {
    try {
      this.searchIndex = new Map();
      
      // Index civic addresses
      this.civicAddresses.forEach(address => {
        const properties = address.properties || {};
        const searchTerms = [
          properties.civic_address,
          properties.street_name,
          properties.street_type,
          properties.community,
          properties.street_number
        ].filter(Boolean);
        
        searchTerms.forEach(term => {
          const words = term.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length >= 2) {
              if (!this.searchIndex.has(word)) {
                this.searchIndex.set(word, []);
              }
              this.searchIndex.get(word).push({
                type: 'civic_address',
                data: address,
                relevance: word === term.toLowerCase() ? 10 : 5
              });
            }
          });
        });
        
        // Also index the full civic address as a single term for better matching
        if (properties.civic_address) {
          const fullAddress = properties.civic_address.toLowerCase();
          if (!this.searchIndex.has(fullAddress)) {
            this.searchIndex.set(fullAddress, []);
          }
          this.searchIndex.get(fullAddress).push({
            type: 'civic_address',
            data: address,
            relevance: 20 // Higher relevance for exact matches
          });
        }
      });
      
      // Index points of interest
      this.pointsOfInterest.forEach(poi => {
        const properties = poi.properties || {};
        const searchTerms = [
          properties.name,
          properties.category,
          properties.description
        ].filter(Boolean);
        
        searchTerms.forEach(term => {
          const words = term.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length >= 2) {
              if (!this.searchIndex.has(word)) {
                this.searchIndex.set(word, []);
              }
              this.searchIndex.get(word).push({
                type: 'poi',
                data: poi,
                relevance: word === term.toLowerCase() ? 8 : 4
              });
            }
          });
        });
      });
      
      console.log(`Built search index with ${this.searchIndex.size} unique words`);
    } catch (error) {
      console.error('Error building search index:', error);
    }
  }

  // Search for locations with Mapbox Geocoding API and rate limiting
  async search(query, options = {}) {
    const {
      limit = 10,
      includeCivicAddresses = true,
      includePOIs = true,
      category = null,
      location = null, // For location-based ranking
      radius = 0.01 // ~1km radius for location-based ranking
    } = options;

    if (!query || query.trim().length < 2) {
      return this.getRecentSearches(limit);
    }

    const cacheKey = `${query}|${JSON.stringify(options)}`;
    if (this.autocompleteCache.has(cacheKey)) {
      return this.autocompleteCache.get(cacheKey);
    }

    try {
      // First try local search for better performance
      const localResults = await this.localSearch(query, options);
      
      // Then try Mapbox Geocoding API with rate limiting
      const mapboxResults = await this.executeRequest(() => 
        this.mapboxSearch(query, options)
      );
      
      // Combine and deduplicate results
      const combinedResults = this.combineSearchResults(localResults, mapboxResults, limit);
      
      // Cache results
      this.autocompleteCache.set(cacheKey, combinedResults);
      
      // Clean cache if too large
      if (this.autocompleteCache.size > this.maxCacheSize) {
        this.cleanCache();
      }

      return combinedResults;
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search only
      return await this.localSearch(query, options);
    }
  }

  // Local search using indexed data
  async localSearch(query, options) {
    const { limit = 10, includeCivicAddresses = true, includePOIs = true, category = null } = options;
    
    const searchTerm = query.trim().toLowerCase();
    const words = searchTerm.split(/\s+/);
    const results = new Map();

    // Search through indexed data
    words.forEach(word => {
      if (word.length >= 2) {
        const matches = this.searchIndex.get(word) || [];
        
        matches.forEach(match => {
          const key = `${match.type}_${match.data.id || match.data.properties?.id}`;
          
          if (!results.has(key)) {
            results.set(key, {
              ...match,
              relevance: 0
            });
          }
          
          results.get(key).relevance += match.relevance;
        });
      }
    });

    // Also search for exact civic address matches
    if (includeCivicAddresses) {
      this.civicAddresses.forEach(address => {
        const properties = address.properties || {};
        const civicAddress = properties.civic_address || '';
        const streetName = properties.street_name || '';
        
        // Check if the search term matches the civic address or street name
        if (civicAddress.toLowerCase().includes(searchTerm) || 
            streetName.toLowerCase().includes(searchTerm)) {
          const key = `civic_address_${address.id || properties.id}`;
          
          if (!results.has(key)) {
            results.set(key, {
              type: 'civic_address',
              data: address,
              relevance: civicAddress.toLowerCase().includes(searchTerm) ? 15 : 10
            });
          }
        }
      });
    }

    // Filter and sort results
    let filteredResults = Array.from(results.values())
      .filter(result => {
        if (!includeCivicAddresses && result.type === 'civic_address') return false;
        if (!includePOIs && result.type === 'poi') return false;
        if (category && result.data.category !== category) return false;
        return true;
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    return filteredResults.map(result => this.formatSearchResult(result));
  }

  // Mapbox Geocoding API search with rate limiting
  async mapboxSearch(query, options) {
    const { limit = 10, location = null } = options;
    
    try {
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        q: query,
        limit: limit.toString(),
        types: 'address,poi,place',
        country: 'ca',
        bbox: '-63.8,44.5,-63.4,44.8', // Halifax area bounding box
        language: 'en'
      });

      if (location) {
        params.append('proximity', `${location[0]},${location[1]}`);
      }

      const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.features.map(feature => this.formatMapboxResult(feature));
      } else if (response.status === 429) {
        // Rate limit exceeded - wait and retry
        console.warn('Mapbox rate limit exceeded, waiting before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return [];
      } else {
        console.error('Mapbox search failed:', response.status, response.statusText);
        return [];
      }
    } catch (error) {
      console.error('Mapbox search error:', error);
      return [];
    }
  }

  // Format Mapbox geocoding result
  formatMapboxResult(feature) {
    const [lng, lat] = feature.center;
    const context = feature.context || [];
    
    // Extract address components
    const street = context.find(c => c.id.startsWith('address'))?.text || '';
    const city = context.find(c => c.id.startsWith('place'))?.text || '';
    const province = context.find(c => c.id.startsWith('region'))?.text || '';
    
    let name = feature.text;
    let address = '';
    
    if (feature.place_type.includes('address')) {
      // This is an address
      name = feature.text;
      address = `${street}, ${city}, ${province}`.replace(/^,\s*/, '').replace(/,\s*$/, '');
    } else if (feature.place_type.includes('poi')) {
      // This is a POI
      name = feature.text;
      address = feature.place_name.replace(`${feature.text}, `, '');
    } else {
      // This is a place
      name = feature.text;
      address = feature.place_name.replace(`${feature.text}, `, '');
    }

    return {
      id: feature.id,
      name: name,
      address: address,
      type: feature.place_type[0] || 'unknown',
      coordinates: [lng, lat],
      relevance: feature.relevance || 0,
      properties: {
        place_name: feature.place_name,
        place_type: feature.place_type,
        bbox: feature.bbox
      }
    };
  }

  // Combine local and Mapbox search results
  combineSearchResults(localResults, mapboxResults, limit) {
    const combined = [...localResults];
    
    // Add Mapbox results that aren't already in local results
    mapboxResults.forEach(mapboxResult => {
      const exists = combined.some(localResult => 
        localResult.coordinates && 
        Math.abs(localResult.coordinates[0] - mapboxResult.coordinates[0]) < 0.001 &&
        Math.abs(localResult.coordinates[1] - mapboxResult.coordinates[1]) < 0.001
      );
      
      if (!exists) {
        combined.push(mapboxResult);
      }
    });

    // Sort by relevance and limit
    return combined
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  // Rank results by proximity to location
  rankByLocation(results, location, radius) {
    if (!location) return results;
    
    return results.map(result => {
      if (result.coordinates) {
        const distance = this.calculateDistance(location, result.coordinates);
        return { ...result, distance };
      }
      return result;
    }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
  }

  // Format search result
  formatSearchResult(result) {
    const properties = result.data.properties || {};
    const coords = result.data.geometry?.coordinates || [0, 0];
    
    let name, address;
    
    if (result.type === 'civic_address') {
      // For civic addresses, use the full civic address as name
      name = properties.civic_address || `${properties.street_number || ''} ${properties.street_name || ''}`.trim();
      address = properties.community || properties.city || 'Halifax, NS';
    } else if (result.type === 'poi') {
      // For POIs, use the name and address
      name = properties.name || 'Unknown Location';
      address = properties.address || properties.street_name || '';
    } else {
      // Fallback
      name = properties.civic_address || properties.name || 'Unknown Location';
      address = properties.street_name || properties.address || '';
    }
    
    return {
      id: result.data.id || properties.id || Math.random().toString(36),
      name: name,
      address: address,
      type: result.type,
      coordinates: coords,
      relevance: result.relevance,
      properties: properties
    };
  }

  // Geocode address to coordinates using Mapbox
  async geocode(address, options = {}) {
    if (!address) return null;

    const cacheKey = `geocode_${address}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // First try local search with higher limit to get better matches
      const localResults = await this.search(address, { limit: 5, ...options });
      if (localResults.length > 0) {
        // Find the best match
        const bestMatch = localResults.find(result => 
          result.coordinates && 
          (result.name.toLowerCase().includes(address.toLowerCase()) ||
           result.address.toLowerCase().includes(address.toLowerCase()))
        ) || localResults[0];
        
        if (bestMatch.coordinates) {
          const result = {
            coordinates: bestMatch.coordinates,
            address: bestMatch.name,
            confidence: 'high'
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }

      // Fallback to Mapbox geocoding with rate limiting
      const mapboxResults = await this.executeRequest(() => 
        this.mapboxSearch(address, { limit: 1, ...options })
      );
      
      if (mapboxResults.length > 0) {
        const result = {
          coordinates: mapboxResults[0].coordinates,
          address: mapboxResults[0].name,
          confidence: 'medium'
        };
        this.cache.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }

    return null;
  }

  // Reverse geocode coordinates to address using Mapbox
  async reverseGeocode(coordinates) {
    if (!coordinates || coordinates.length !== 2) return null;

    const cacheKey = `reverse_${coordinates[0]}_${coordinates[1]}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Find nearest civic address
      const nearestAddress = this.findNearestCivicAddress(coordinates);
      if (nearestAddress) {
        const result = {
          address: nearestAddress.properties.civic_address || nearestAddress.properties.street_name,
          coordinates: coordinates,
          confidence: 'high'
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      // Fallback to Mapbox reverse geocoding with rate limiting
      const [lng, lat] = coordinates;
      const params = new URLSearchParams({
        access_token: this.mapboxToken,
        types: 'address,poi,place'
      });

      const response = await this.executeRequest(() => 
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params}`)
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const result = {
            address: feature.place_name,
            coordinates: coordinates,
            confidence: 'medium'
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }

    return null;
  }

  // Find nearest civic address to coordinates
  findNearestCivicAddress(coordinates) {
    let nearest = null;
    let minDistance = Infinity;

    this.civicAddresses.forEach(address => {
      const coords = address.geometry?.coordinates;
      if (coords) {
        const distance = this.calculateDistance(coordinates, coords);
        if (distance < minDistance && distance < 0.001) { // Within 100m
          minDistance = distance;
          nearest = address;
        }
      }
    });

    return nearest;
  }

  // Calculate distance between two coordinates
  calculateDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get recent searches
  getRecentSearches(limit = 10) {
    return this.recentSearches.slice(0, limit);
  }

  // Add to recent searches
  addToRecentSearches(search) {
    this.recentSearches = [
      search,
      ...this.recentSearches.filter(s => s !== search)
    ].slice(0, this.maxRecentSearches);
  }

  // Clean cache
  cleanCache() {
    const entries = Array.from(this.autocompleteCache.entries());
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = sortedEntries.slice(0, Math.floor(this.maxCacheSize * 0.2));
    
    toRemove.forEach(([key]) => {
      this.autocompleteCache.delete(key);
    });
  }

  // Get service statistics
  getStats() {
    return {
      cacheSize: this.cache.size,
      autocompleteCacheSize: this.autocompleteCache.size,
      recentSearches: this.recentSearches.length,
      civicAddresses: this.civicAddresses.length,
      pointsOfInterest: this.pointsOfInterest.length,
      searchIndexSize: this.searchIndex?.size || 0,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length
    };
  }
}

const geocodingService = new GeocodingService();
export default geocodingService;
