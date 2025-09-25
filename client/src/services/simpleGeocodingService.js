/**
 * Simple Geocoding Service
 * 
 * Provides basic geocoding functionality for the restored routing service.
 * Uses a simple lookup table for common Halifax locations.
 */

class SimpleGeocodingService {
  constructor() {
    // Simple lookup table for common Halifax locations
    this.locations = {
      'halifax central library': [-63.5751, 44.6475],
      'spring garden road': [-63.5751, 44.6475],
      'citadel hill': [-63.5800, 44.6480],
      'waterfront': [-63.5700, 44.6450],
      'dalhousie university': [-63.5900, 44.6400],
      'saint mary university': [-63.5800, 44.6350],
      'halifax shopping centre': [-63.6200, 44.6500],
      'point pleasant park': [-63.5600, 44.6200],
      'public gardens': [-63.5800, 44.6420],
      'halifax commons': [-63.5800, 44.6500],
      'seaport farmers market': [-63.5700, 44.6450],
      'halifax ferry terminal': [-63.5700, 44.6450],
      'downtown halifax': [-63.5750, 44.6470],
      'north end': [-63.5800, 44.6600],
      'south end': [-63.5700, 44.6300],
      'west end': [-63.6200, 44.6470],
      'east end': [-63.5500, 44.6470]
    };
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address) {
    if (!address || typeof address !== 'string') {
      return null;
    }

    const normalizedAddress = address.toLowerCase().trim();
    
    // Check exact match first
    if (this.locations[normalizedAddress]) {
      return {
        coordinates: this.locations[normalizedAddress],
        address: address,
        confidence: 1.0
      };
    }

    // Check partial matches
    for (const [location, coords] of Object.entries(this.locations)) {
      if (normalizedAddress.includes(location) || location.includes(normalizedAddress)) {
        return {
          coordinates: coords,
          address: address,
          confidence: 0.8
        };
      }
    }

    // If no match found, return null
    console.warn(`No geocoding match found for: ${address}`);
    return null;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates) {
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return null;
    }

    const [lng, lat] = coordinates;
    let closestLocation = null;
    let minDistance = Infinity;

    // Find closest location
    for (const [location, coords] of Object.entries(this.locations)) {
      const [locLng, locLat] = coords;
      const distance = Math.sqrt(
        Math.pow(lng - locLng, 2) + Math.pow(lat - locLat, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestLocation = location;
      }
    }

    if (closestLocation && minDistance < 0.01) { // Within ~1km
      return {
        address: closestLocation,
        coordinates: coordinates,
        confidence: 1.0 - (minDistance * 100)
      };
    }

    return null;
  }

  /**
   * Add a new location to the lookup table
   */
  addLocation(name, coordinates) {
    if (name && coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      this.locations[name.toLowerCase()] = coordinates;
      return true;
    }
    return false;
  }

  /**
   * Get all available locations
   */
  getLocations() {
    return Object.keys(this.locations);
  }
}

// Export singleton instance
const simpleGeocodingService = new SimpleGeocodingService();
export default simpleGeocodingService;
