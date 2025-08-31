// Optimized Data Service for Trek.IQ
// Uses the migrated and optimized data files for better performance

class OptimizedDataService {
  constructor() {
    this.cache = new Map();
    this.spatialCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Optimized Data Service...');
    
    try {
      // Preload critical datasets
      await this.preloadCriticalData();
      this.isInitialized = true;
      console.log('Optimized Data Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Optimized Data Service:', error);
      throw error;
    }
  }

  async preloadCriticalData() {
    // Preload core data for fast access
    const criticalDatasets = [
      'trek-iq-core',
      'trek-iq-amenities',
      'trek-iq-transit'
    ];

    const loadPromises = criticalDatasets.map(dataset => 
      this.loadDataset(dataset).catch(error => {
        console.warn(`Failed to preload ${dataset}:`, error);
        return null;
      })
    );

    await Promise.allSettled(loadPromises);
  }

  async loadDataset(datasetName) {
    // Check cache first
    const cached = this.cache.get(datasetName);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Load from server
    const response = await fetch(`/api/optimized-data/${datasetName}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${datasetName}: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the data
    this.cache.set(datasetName, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  async findNearbyFeatures(coordinates, radius = 1000, datasetFilter = null) {
    const [lng, lat] = coordinates;
    
    // Use spatial database for fast proximity searches
    const response = await fetch(`/api/optimized-data/nearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        lat,
        lng,
        radius,
        dataset: datasetFilter
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to find nearby features: ${response.status}`);
    }

    return await response.json();
  }

  async searchAddresses(query, limit = 10) {
    // Search in civic addresses dataset
    const coreData = await this.loadDataset('trek-iq-core');
    
    if (!coreData.features) return [];

    const searchTerm = query.toLowerCase();
    const results = [];

    for (const feature of coreData.features) {
      if (results.length >= limit) break;

      const properties = feature.properties;
      if (properties.type === 'civic_address') {
        const address = properties.address || '';
        const street = properties.street || '';
        const number = properties.number || '';

        if (address.toLowerCase().includes(searchTerm) ||
            street.toLowerCase().includes(searchTerm) ||
            number.includes(searchTerm)) {
          
          results.push({
            id: properties.id,
            display_name: address,
            lat: feature.geometry.coordinates[1],
            lon: feature.geometry.coordinates[0],
            type: 'civic_address',
            importance: 0.8,
            address: {
              house_number: number,
              road: street,
              city: 'Halifax',
              state: 'Nova Scotia',
              country: 'Canada'
            }
          });
        }
      }
    }

    return results;
  }

  async findAccessibleParking(coordinates, radius = 2000) {
    // Find accessible parking spots
    const amenityData = await this.loadDataset('trek-iq-amenities');
    
    if (!amenityData.features) return [];

    const [lng, lat] = coordinates;
    const results = [];

    for (const feature of amenityData.features) {
      const properties = feature.properties;
      if (properties.type === 'accessible_parking') {
        const featureCoords = feature.geometry.coordinates;
        const distance = this.calculateDistance(lat, lng, featureCoords[1], featureCoords[0]);
        
        if (distance <= radius) {
          results.push({
            ...feature,
            distance,
            properties: {
              ...properties,
              distance: Math.round(distance)
            }
          });
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  async findBarriers(coordinates, radius = 1000) {
    // Find barriers (steps, closures, etc.)
    const dynamicData = await this.loadDynamicData();
    const [lng, lat] = coordinates;
    const results = [];

    for (const dataset of dynamicData) {
      for (const feature of dataset.features || []) {
        const featureCoords = feature.geometry.coordinates;
        const distance = this.calculateDistance(lat, lng, featureCoords[1], featureCoords[0]);
        
        if (distance <= radius) {
          results.push({
            ...feature,
            distance,
            dataset: dataset.name,
            properties: {
              ...feature.properties,
              distance: Math.round(distance)
            }
          });
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  async loadDynamicData() {
    // Load frequently updated data
    const dynamicFiles = [
      'Steps_577353981712784942.geojson',
      'Sidewalk Closures.geojson',
      'Street_Closures.geojson',
      'Transit_Shelters_1139561051208148127.geojson'
    ];

    const loadPromises = dynamicFiles.map(async (filename) => {
      try {
        const response = await fetch(`/api/data/dynamic/${filename}`);
        if (response.ok) {
          const data = await response.json();
          return { name: filename, ...data };
        }
      } catch (error) {
        console.warn(`Failed to load dynamic data ${filename}:`, error);
      }
      return null;
    });

    const results = await Promise.allSettled(loadPromises);
    return results
      .filter(result => result.status === 'fulfilled' && result.value)
      .map(result => result.value);
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  async getRouteBarriers(routeGeometry) {
    // Find barriers along a route
    const barriers = [];
    const dynamicData = await this.loadDynamicData();

    for (const dataset of dynamicData) {
      for (const feature of dataset.features || []) {
        const distance = this.calculateDistanceToRoute(feature, routeGeometry);
        if (distance < 50) { // Within 50 meters of route
          barriers.push({
            ...feature,
            distance,
            dataset: dataset.name,
            severity: this.calculateBarrierSeverity(feature, dataset.name)
          });
        }
      }
    }

    return barriers.sort((a, b) => a.distance - b.distance);
  }

  calculateDistanceToRoute(feature, routeGeometry) {
    // Simplified distance calculation to route
    const featureCoords = feature.geometry.coordinates;
    let minDistance = Infinity;

    for (const routeCoord of routeGeometry) {
      const distance = this.calculateDistance(
        featureCoords[1], featureCoords[0],
        routeCoord[1], routeCoord[0]
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  calculateBarrierSeverity(feature, datasetName) {
    if (datasetName.includes('Steps')) return 'high';
    if (datasetName.includes('Closures')) return 'medium';
    if (datasetName.includes('Shelters')) return 'low';
    
    return feature.properties?.severity || 'medium';
  }

  // Cache management
  clearCache() {
    this.cache.clear();
    this.spatialCache.clear();
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      spatialCacheSize: this.spatialCache.size,
      isInitialized: this.isInitialized
    };
  }
}

// Export singleton instance
export default new OptimizedDataService();
