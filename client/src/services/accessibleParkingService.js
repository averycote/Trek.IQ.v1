/**
 * Accessible Parking Service
 * 
 * Loads and enriches routes with accessible parking information near destinations
 * Uses Halifax Municipal Accessible Parking GeoJSON data
 */

import * as turf from '@turf/turf';

class AccessibleParkingService {
  constructor() {
    this.parkingData = null;
    this.isLoaded = false;
    this.loadingPromise = null;
  }

  /**
   * Initialize and load parking data
   */
  async initialize() {
    if (this.isLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this._loadParkingData();
    await this.loadingPromise;
    this.isLoaded = true;
  }

  /**
   * Load parking data from server
   */
  async _loadParkingData() {
    try {
      console.log('🚗 Loading accessible parking data...');
      const response = await fetch('/api/accessibility-data/accessible-parking');
      
      if (!response.ok) {
        throw new Error(`Failed to load parking data: ${response.status}`);
      }

      const result = await response.json();
      this.parkingData = result.data || result;

      console.log(`✅ Loaded ${this.parkingData.features?.length || 0} accessible parking spots`);
    } catch (error) {
      console.error('❌ Error loading accessible parking data:', error);
      // Use fallback empty data
      this.parkingData = {
        type: 'FeatureCollection',
        features: []
      };
    }
  }

  /**
   * Find accessible parking near destination
   * @param {Array} destinationCoords - [lng, lat]
   * @param {number} radiusMeters - Search radius in meters (default 500m)
   * @param {number} limit - Maximum number of spots to return (default 10)
   * @returns {Array} Array of parking spot objects with enriched data
   */
  async findNearDestination(destinationCoords, radiusMeters = 500, limit = 10) {
    if (!this.isLoaded) {
      await this.initialize();
    }

    if (!this.parkingData || !this.parkingData.features) {
      return [];
    }

    const destinationPoint = turf.point(destinationCoords);
    const parkingSpots = [];

    for (const feature of this.parkingData.features) {
      const parkingPoint = turf.point(feature.geometry.coordinates);
      const distance = turf.distance(destinationPoint, parkingPoint, { units: 'meters' });

      if (distance <= radiusMeters) {
        parkingSpots.push({
          id: feature.properties.id || `parking-${parkingSpots.length}`,
          name: feature.properties.name || 'Accessible Parking',
          coordinates: feature.geometry.coordinates,
          distance: Math.round(distance),
          
          // Parking details
          timeLimit: feature.properties.time_limit || 'No limit',
          cost: feature.properties.cost || 'Unknown',
          capacity: feature.properties.capacity || 'Unknown',
          available: feature.properties.available || null,
          
          // Accessibility features
          features: feature.properties.features || [],
          
          // Additional info
          address: feature.properties.address || null,
          notes: feature.properties.notes || null,
          
          // Raw properties for advanced use
          properties: feature.properties
        });
      }
    }

    // Sort by distance
    parkingSpots.sort((a, b) => a.distance - b.distance);

    // Return limited results
    return parkingSpots.slice(0, limit);
  }

  /**
   * Enrich route with accessible parking information
   * Adds parking data to route properties for driving routes
   * @param {Object} route - Route GeoJSON object
   * @param {string} mode - Route mode (walking, driving, transit)
   * @returns {Object} Route with enriched parking data
   */
  async enrichRoute(route, mode = 'walking') {
    // Only enrich driving routes
    if (mode !== 'driving' && mode !== 'driving-traffic') {
      return route;
    }

    if (!route || !route.features || !route.features[0]) {
      return route;
    }

    const routeFeature = route.features[0];
    const coordinates = routeFeature.geometry.coordinates;
    
    if (!coordinates || coordinates.length === 0) {
      return route;
    }

    // Get destination (last coordinate)
    const destination = coordinates[coordinates.length - 1];

    try {
      // Find parking near destination (within 500m)
      const parkingSpots = await this.findNearDestination(destination, 500, 5);

      console.log(`🅿️ Found ${parkingSpots.length} accessible parking spots near destination`);

      // Add parking data to route properties
      if (!routeFeature.properties) {
        routeFeature.properties = {};
      }

      routeFeature.properties.accessibleParking = parkingSpots;
      routeFeature.properties.hasParkingInfo = parkingSpots.length > 0;

      // Add to route-level metadata
      if (!route.metadata) {
        route.metadata = {};
      }
      route.metadata.accessibleParkingCount = parkingSpots.length;

    } catch (error) {
      console.error('❌ Error enriching route with parking data:', error);
    }

    return route;
  }

  /**
   * Get parking spot by ID
   */
  async getParkingSpotById(id) {
    if (!this.isLoaded) {
      await this.initialize();
    }

    if (!this.parkingData || !this.parkingData.features) {
      return null;
    }

    const feature = this.parkingData.features.find(
      f => f.properties.id === id
    );

    if (!feature) {
      return null;
    }

    return {
      id: feature.properties.id,
      name: feature.properties.name || 'Accessible Parking',
      coordinates: feature.geometry.coordinates,
      timeLimit: feature.properties.time_limit || 'No limit',
      cost: feature.properties.cost || 'Unknown',
      capacity: feature.properties.capacity || 'Unknown',
      available: feature.properties.available || null,
      features: feature.properties.features || [],
      address: feature.properties.address || null,
      notes: feature.properties.notes || null,
      properties: feature.properties
    };
  }

  /**
   * Get all parking spots as GeoJSON
   */
  async getAllParkingSpots() {
    if (!this.isLoaded) {
      await this.initialize();
    }

    return this.parkingData;
  }

  /**
   * Get parking statistics
   */
  async getStatistics() {
    if (!this.isLoaded) {
      await this.initialize();
    }

    if (!this.parkingData || !this.parkingData.features) {
      return {
        total: 0,
        withTimeLimit: 0,
        free: 0,
        paid: 0,
        averageCapacity: 0
      };
    }

    const features = this.parkingData.features;
    const stats = {
      total: features.length,
      withTimeLimit: features.filter(f => f.properties.time_limit && f.properties.time_limit !== 'No limit').length,
      free: features.filter(f => {
        const cost = (f.properties.cost || '').toLowerCase();
        return cost.includes('free') || cost.includes('no cost');
      }).length,
      paid: features.filter(f => {
        const cost = (f.properties.cost || '').toLowerCase();
        return cost.includes('$') || cost.includes('paid');
      }).length,
      averageCapacity: Math.round(
        features
          .map(f => f.properties.capacity || 0)
          .reduce((sum, cap) => sum + cap, 0) / features.length
      )
    };

    return stats;
  }
}

// Export singleton instance
const accessibleParkingService = new AccessibleParkingService();
export default accessibleParkingService;

