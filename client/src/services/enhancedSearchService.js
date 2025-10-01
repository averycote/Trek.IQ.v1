/**
 * Enhanced Search Service
 * 
 * Provides search functionality with geocoding and location services
 */

class EnhancedSearchService {
  constructor() {
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.mapboxToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';
    this.recentSearches = [];
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Enhanced Search Service...');
    
    this.isInitialized = true;
    console.log('✅ Enhanced Search Service initialized');
  }

  /**
   * Search for locations using Mapbox Geocoding API
   */
  async search(query, options = {}) {
    try {
      const cacheKey = `search_${query}_${JSON.stringify(options)}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.results;
        }
      }

      console.log('🔍 Searching for:', query);

      // Use Mapbox Geocoding API for real search results
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${this.mapboxToken}&country=CA&proximity=-63.5752,44.6488&limit=8&types=address,poi,place,locality,neighborhood`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        console.log('No search results found for:', query);
        return [];
      }

      // Transform Mapbox results to our format
      const results = data.features.map((feature, index) => ({
        id: feature.id || `result_${index}`,
        name: feature.text || feature.place_name,
        address: feature.place_name,
        coordinates: feature.center, // [lng, lat]
        type: this._getFeatureType(feature),
        relevance: feature.relevance || 1,
        context: feature.context || []
      }));

      console.log('✅ Search results:', results.length, 'found');

      this.cache.set(cacheKey, {
        results: results,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      console.error('❌ Error searching:', error);
      
      // Fallback to mock results if API fails
      return this._getFallbackResults(query);
    }
  }

  /**
   * Get feature type from Mapbox feature
   */
  _getFeatureType(feature) {
    const placeType = feature.place_type?.[0];
    
    switch (placeType) {
      case 'address': return 'address';
      case 'poi': return 'poi';
      case 'place': return 'place';
      case 'locality': return 'city';
      case 'neighborhood': return 'neighborhood';
      case 'postcode': return 'postal';
      case 'region': return 'region';
      case 'country': return 'country';
      default: return 'unknown';
    }
  }

  /**
   * Fallback results when API fails
   */
  _getFallbackResults(query) {
    const fallbackResults = [
      {
        id: 'halifax_downtown',
        name: 'Halifax Downtown',
        address: 'Halifax, NS, Canada',
        coordinates: [-63.5752, 44.6488],
        type: 'area'
      },
      {
        id: 'halifax_airport',
        name: 'Halifax Stanfield International Airport',
        address: '1 Bell Blvd, Enfield, NS, Canada',
        coordinates: [-63.5120, 44.8808],
        type: 'airport'
      },
      {
        id: 'halifax_waterfront',
        name: 'Halifax Waterfront',
        address: 'Halifax Waterfront, Halifax, NS, Canada',
        coordinates: [-63.5700, 44.6450],
        type: 'attraction'
      },
      {
        id: 'dartmouth',
        name: 'Dartmouth',
        address: 'Dartmouth, NS, Canada',
        coordinates: [-63.5874, 44.6421],
        type: 'city'
      },
      {
        id: 'spring_garden',
        name: 'Spring Garden Road',
        address: 'Spring Garden Road, Halifax, NS, Canada',
        coordinates: [-63.5806, 44.6478],
        type: 'street'
      }
    ];

    return fallbackResults.filter(result => 
      result.name.toLowerCase().includes(query.toLowerCase()) ||
      result.address.toLowerCase().includes(query.toLowerCase())
    );
  }

  /**
   * Geocode an address to coordinates using Mapbox API
   */
  async geocode(address) {
    try {
      const cacheKey = `geocode_${address}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.coordinates;
        }
      }

      console.log('🗺️ Geocoding address:', address);

      // Use Mapbox Geocoding API
      const encodedAddress = encodeURIComponent(address);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${this.mapboxToken}&country=CA&proximity=-63.5752,44.6488&limit=1`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Address not found');
      }

      const coordinates = data.features[0].center; // [lng, lat]
      console.log('✅ Geocoded coordinates:', coordinates);

      this.cache.set(cacheKey, {
        coordinates: coordinates,
        timestamp: Date.now()
      });

      return coordinates;
    } catch (error) {
      console.error('❌ Error geocoding:', error);
      
      // Fallback to mock geocoding
      const mockResults = {
        'halifax downtown': [-63.5752, 44.6488],
        'halifax airport': [-63.5120, 44.8808],
        'halifax waterfront': [-63.5700, 44.6450],
        'dartmouth': [-63.5874, 44.6421],
        'spring garden road': [-63.5806, 44.6478]
      };

      const coordinates = mockResults[address.toLowerCase()] || [-63.5752, 44.6488];
      console.log('🔄 Using fallback coordinates:', coordinates);
      
      return coordinates;
    }
  }

  /**
   * Add search result to recent searches
   */
  addToRecentSearches(result) {
    // Remove if already exists
    this.recentSearches = this.recentSearches.filter(item => item.id !== result.id);
    
    // Add to beginning
    this.recentSearches.unshift(result);
    
    // Keep only last 10
    this.recentSearches = this.recentSearches.slice(0, 10);
    
    console.log('📝 Added to recent searches:', result.name);
  }

  /**
   * Get recent searches
   */
  getRecentSearches() {
    return this.recentSearches;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates) {
    const [lng, lat] = coordinates;
    
    try {
      const cacheKey = `reverse_${lng}_${lat}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.address;
        }
      }

      // Use Mapbox reverse geocoding
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${this.mapboxToken}&types=address,poi,place`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('No address found');
      }

      const address = data.features[0].place_name;

      this.cache.set(cacheKey, {
        address: address,
        timestamp: Date.now()
      });

      return address;
    } catch (error) {
      console.error('❌ Error reverse geocoding:', error);
      
      // Fallback to mock reverse geocoding
      const address = `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return address;
    }
  }
}

// Create singleton instance
const enhancedSearchService = new EnhancedSearchService();

export default enhancedSearchService;
