// Mapbox Search Service - Enhanced integration with Mapbox Geocoding API
class MapboxSearchService {
  constructor() {
    this.accessToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
    this.cache = new Map();
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 100; // 100ms between requests
    this.maxConcurrentRequests = 5;
    this.activeRequests = 0;
    
    // Halifax coordinates for proximity bias
    this.halifaxCoords = [-63.5756, 44.6475];
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
      
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        nextRequest();
      }
    }
  }

  // Enhanced search for places using Mapbox Geocoding API
  async search(query, options = {}) {
    const {
      limit = 8,
      proximity = this.halifaxCoords, // Default to Halifax
      bbox = '-63.8,44.5,-63.4,44.8', // Halifax area
      types = 'address,poi,place',
      country = 'ca',
      language = 'en'
    } = options;

    // Check cache first
    const cacheKey = `${query}_${limit}_${types}`;
    if (this.cache.has(cacheKey)) {
      console.log(`Cache hit for query: "${query}"`);
      return this.cache.get(cacheKey);
    }

    try {
      // Enhanced search strategy
      const results = await this.performEnhancedSearch(query, {
        limit,
        proximity,
        bbox,
        types,
        country,
        language
      });
      
      // Cache the results
      this.cache.set(cacheKey, results);
      return results;
      
    } catch (error) {
      console.error('Enhanced search failed:', error);
      // Fallback to basic search
      return this.performBasicSearch(query, options);
    }
  }

  // Enhanced search with multiple strategies
  async performEnhancedSearch(query, options) {
    const { limit, proximity, bbox, types, country, language } = options;
    
    // Strategy 1: Try with civic address optimization
    let results = await this.searchWithStrategy(query, {
      ...options,
      types: 'address,poi,place',
      proximity
    });

    // If no results or poor results, try broader search
    if (results.length === 0 || this.areResultsPoor(results, query)) {
      console.log(`No good results for "${query}", trying broader search...`);
      
      // Strategy 2: Broader search without proximity bias
      const broaderResults = await this.searchWithStrategy(query, {
        ...options,
        types: 'poi,place,address',
        proximity: null // Remove proximity bias for broader results
      });
      
      // Strategy 3: Try with different type combinations
      if (broaderResults.length === 0) {
        const poiResults = await this.searchWithStrategy(query, {
          ...options,
          types: 'poi',
          proximity
        });
        
        const addressResults = await this.searchWithStrategy(query, {
          ...options,
          types: 'address',
          proximity
        });
        
        // Combine and deduplicate results
        results = this.combineAndDeduplicate([...poiResults, ...addressResults]);
      } else {
        results = broaderResults;
      }
    }

    // Limit results and enhance with additional data
    return this.enhanceResults(results.slice(0, limit), query);
  }

  // Basic search fallback
  async performBasicSearch(query, options) {
    const { limit, types, country, language } = options;
    
    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: limit.toString(),
      types: types,
      country: country,
      language: language
    });

    const url = `${this.baseUrl}/${encodeURIComponent(query)}.json?${params}`;
    
    try {
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        return this.formatSearchResults(data.features);
      } else {
        console.error(`Mapbox API error: ${response.status}`);
        return [];
      }
    } catch (error) {
      console.error('Basic search failed:', error);
      return [];
    }
  }

  // Search with specific strategy
  async searchWithStrategy(query, options) {
    const { limit, proximity, bbox, types, country, language } = options;
    
    const params = new URLSearchParams({
      access_token: this.accessToken,
      limit: limit.toString(),
      types: types,
      country: country,
      language: language
    });

    if (proximity) {
      params.append('proximity', `${proximity[0]},${proximity[1]}`);
    }

    if (bbox) {
      params.append('bbox', bbox);
    }

    const url = `${this.baseUrl}/${encodeURIComponent(query)}.json?${params}`;
    
    try {
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        return this.formatSearchResults(data.features);
      } else {
        console.error(`Mapbox API error: ${response.status}`);
        return [];
      }
    } catch (error) {
      console.error('Search strategy failed:', error);
      return [];
    }
  }

  // Check if results are poor quality
  areResultsPoor(results, query) {
    if (results.length === 0) return true;
    
    const queryLower = query.toLowerCase();
    const hasExactMatch = results.some(result => {
      const name = (result.name || '').toLowerCase();
      const address = (result.address || '').toLowerCase();
      return name.includes(queryLower) || address.includes(queryLower);
    });
    
    return !hasExactMatch;
  }

  // Combine and deduplicate results
  combineAndDeduplicate(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = `${result.name}-${result.address}-${result.coordinates?.join(',')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Enhance results with additional context
  enhanceResults(results, query) {
    return results.map(result => ({
      ...result,
      relevance: this.calculateRelevance(result, query),
      displayName: this.generateDisplayName(result),
      fullAddress: this.generateFullAddress(result)
    })).sort((a, b) => b.relevance - a.relevance);
  }

  // Calculate relevance score
  calculateRelevance(result, query) {
    const queryLower = query.toLowerCase();
    const name = (result.name || '').toLowerCase();
    const address = (result.address || '').toLowerCase();
    
    let score = 0;
    
    // Exact matches get high scores
    if (name === queryLower) score += 100;
    if (address === queryLower) score += 100;
    
    // Partial matches
    if (name.includes(queryLower)) score += 50;
    if (address.includes(queryLower)) score += 30;
    
    // Halifax proximity bonus
    if (result.coordinates) {
      const distance = this.calculateDistance(
        result.coordinates,
        this.halifaxCoords
      );
      if (distance < 10) score += 20; // Within 10km of Halifax
      else if (distance < 50) score += 10; // Within 50km
    }
    
    return score;
  }

  // Generate display name
  generateDisplayName(result) {
    if (result.name && result.address) {
      return `${result.name}, ${result.address}`;
    }
    return result.name || result.address || result.place_name || '';
  }

  // Generate full address
  generateFullAddress(result) {
    return result.place_name || result.address || result.name || '';
  }

  // Calculate distance between coordinates
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Format Mapbox search results
  formatSearchResults(features) {
    if (!features || !Array.isArray(features)) {
      return [];
    }
    
    return features.map(feature => {
      if (!feature) return null;
      
      const result = {
        id: feature.id || `feature_${Math.random()}`,
        name: feature.text || '',
        address: feature.place_name || '',
        coordinates: feature.center || null, // [lng, lat]
        type: feature.place_type?.[0] || 'unknown',
        relevance: feature.relevance || 0,
        properties: feature.properties || {},
        context: feature.context || [],
        bbox: feature.bbox || null
      };

      // Enhance civic address results
      if (feature.place_type?.[0] === 'address') {
        result.name = this.formatCivicAddress(feature);
        result.isCivicAddress = true;
      }

      return result;
    }).filter(Boolean); // Remove null entries
  }

  // Format civic address for better display
  formatCivicAddress(feature) {
    if (!feature || !feature.place_name) {
      return '';
    }
    
    const address = feature.place_name;
    const parts = address.split(', ');
    
    // For civic addresses, show the street address prominently
    if (parts.length > 0) {
      return parts[0]; // Return just the street address part
    }
    
    return address;
  }

  // Geocode an address to coordinates
  async geocode(address, options = {}) {
    if (!address || address.trim().length === 0) {
      console.warn('Empty address provided for geocoding');
      return null;
    }

    try {
      const results = await this.search(address, { ...options, limit: 1 });
      if (results.length > 0) {
        return {
          coordinates: results[0].coordinates,
          address: results[0].address,
          name: results[0].name
        };
      }
      console.warn(`No geocoding results found for: "${address}"`);
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(coordinates, options = {}) {
    if (!coordinates || coordinates.length !== 2) {
      console.warn('Invalid coordinates provided for reverse geocoding');
      return null;
    }

    const [lng, lat] = coordinates;
    
    try {
      const params = new URLSearchParams({
        access_token: this.accessToken,
        types: 'address,poi,place',
        limit: '1'
      });

      const url = `${this.baseUrl}/${lng},${lat}.json?${params}`;
      
      const response = await this.executeRequest(() => fetch(url));
      
      if (response.ok) {
        const data = await response.json();
        if (data.features.length > 0) {
          const feature = data.features[0];
          return {
            address: feature.place_name,
            name: feature.text,
            coordinates: feature.center,
            type: feature.place_type[0]
          };
        }
      }
      console.warn(`No reverse geocoding results found for coordinates: [${lng}, ${lat}]`);
      return null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  // Get autocomplete suggestions
  async getAutocomplete(query, options = {}) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    
    return this.search(query, { ...options, limit: 5 });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('Mapbox search cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // Helper method to detect if query is likely a civic address
  isLikelyCivicAddress(query) {
    const trimmedQuery = query.trim().toLowerCase();
    
    // Check for common address patterns
    const addressPatterns = [
      /\d+\s+[a-z]+\s+(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|place|pl|court|ct|terrace|ter)/i,
      /\d+\s+[a-z]+\s+[a-z]+/i, // Number + word + word (e.g., "123 Main Street")
      /^\d+\s+[a-z]+/i, // Starts with number + word
      /[a-z]+\s+\d+/i, // Word + number (e.g., "Main 123")
    ];
    
    return addressPatterns.some(pattern => pattern.test(trimmedQuery));
  }

  // Test the service connection
  async testConnection() {
    try {
      const testQuery = 'Halifax';
      const results = await this.search(testQuery, { limit: 1 });
      console.log('Mapbox service connection test successful');
      return results.length > 0;
    } catch (error) {
      console.error('Mapbox service connection test failed:', error);
      return false;
    }
  }

  // Get service health status
  getHealthStatus() {
    return {
      isConnected: true, // We'll assume it's connected unless proven otherwise
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length,
      lastRequestTime: this.lastRequestTime
    };
  }
}

// Create singleton instance
const mapboxSearchService = new MapboxSearchService();

// Test connection on initialization
mapboxSearchService.testConnection().then(isConnected => {
  console.log(`Mapbox service initialized: ${isConnected ? 'Connected' : 'Not connected'}`);
});

export default mapboxSearchService;
