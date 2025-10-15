/**
 * Geocoding Service
 * 
 * Wrapper around Enhanced Search Service for geocoding functionality
 */

import enhancedSearchService from './enhancedSearchService.js';

class GeocodingService {
  constructor() {
    this.enhancedSearch = enhancedSearchService;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    await this.enhancedSearch.initialize();
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address) {
    try {
      const results = await this.enhancedSearch.search(address);
      return results.map(result => ({
        coordinates: result.coordinates,
        address: result.address,
        name: result.name,
        place_name: result.place_name
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates) {
    try {
      const [lng, lat] = coordinates;
      const results = await this.enhancedSearch.reverseGeocode(lng, lat);
      return results.map(result => ({
        coordinates: result.coordinates,
        address: result.address,
        name: result.name,
        place_name: result.place_name
      }));
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return [];
    }
  }

  /**
   * Search for places
   */
  async search(query, options = {}) {
    return await this.enhancedSearch.search(query, options);
  }
}

export default GeocodingService;
