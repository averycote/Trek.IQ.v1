/**
 * Accessibility Filter Service for Trek.IQ Map Integration
 * 
 * This service extends the accessibility.cloud integration to work with
 * map filters and layer management. It fetches POI data based on current
 * map bounds and manages Mapbox GL JS layers for each filter type.
 */

import mapboxgl from 'mapbox-gl';
import accessibilityCloudService from './accessibilityCloudService';

class AccessibilityFilterService {
  constructor() {
    this.baseUrl = 'https://accessibility-cloud-v2.freetls.fastly.net';
    this.appToken = 'eb848ae2fbaff7680ff34a9f31eabf06';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.activeLayers = new Map(); // Track active Mapbox layers
    this.layerSources = new Map(); // Track Mapbox sources
  }

  /**
   * Define accessibility filter types with their configurations
   */
  getFilterTypes() {
    return {
      'wheelchair_accessible_bathrooms': {
        name: 'Wheelchair Accessible Bathrooms',
        description: 'Restrooms with wheelchair accessibility',
        icon: '🚻',
        color: '#10B981', // Green
        category: 'Accessibility',
        query: 'toilets:wheelchair=yes',
        apiCategory: 'toilets'
      },
      'wheelchair_accessible_places': {
        name: 'Fully Wheelchair Accessible',
        description: 'Places with full wheelchair accessibility',
        icon: '♿',
        color: '#3B82F6', // Blue
        category: 'Accessibility',
        query: 'wheelchair=yes',
        apiCategory: 'all'
      },
      'limited_accessibility_places': {
        name: 'Limited Accessibility',
        description: 'Places with partial wheelchair accessibility',
        icon: '⚠️',
        color: '#F59E0B', // Yellow/Orange
        category: 'Accessibility',
        query: 'wheelchair=limited',
        apiCategory: 'all'
      },
      'not_accessible_places': {
        name: 'Not Accessible',
        description: 'Places that are not wheelchair accessible',
        icon: '❌',
        color: '#EF4444', // Red
        category: 'Accessibility',
        query: 'wheelchair=no',
        apiCategory: 'all'
      },
      'accessible_transit_stops': {
        name: 'Accessible Transit Stops',
        description: 'Transit stops with accessibility features',
        icon: '🚌',
        color: '#8B5CF6', // Purple
        category: 'Transit',
        query: 'public_transport=platform AND wheelchair=yes',
        apiCategory: 'public_transport'
      },
      'accessible_parking': {
        name: 'Accessible Parking',
        description: 'Designated accessible parking spaces',
        icon: '🅿️',
        color: '#F97316', // Orange
        category: 'Accessibility',
        query: 'amenity=parking AND wheelchair=yes',
        apiCategory: 'parking'
      },
      'accessibility_equipment': {
        name: 'Accessibility Equipment',
        description: 'Elevators, ramps, and accessibility equipment',
        icon: '⬆️',
        color: '#6B7280', // Gray
        category: 'Equipment',
        query: 'highway=elevator OR ramp:wheelchair=yes',
        apiCategory: 'equipment'
      }
    };
  }

  /**
   * Fetch accessibility data for a specific filter type within map bounds
   * @param {Object} bounds - Map bounds object with getNorth(), getSouth(), etc.
   * @param {string} filterType - Filter type key from getFilterTypes()
   * @param {number} limit - Maximum number of results (default: 100)
   * @returns {Promise<Array>} Array of POI features
   */
  async fetchAccessibilityData(bounds, filterType, limit = 100) {
    const filterConfig = this.getFilterTypes()[filterType];
    if (!filterConfig) {
      console.warn(`AccessibilityFilterService: Unknown filter type: ${filterType}`);
      return [];
    }

    // Create cache key
    const bbox = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    const cacheKey = `${filterType}_${bbox.join(',')}_${limit}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`🗄️ AccessibilityFilterService: Using cached data for ${filterType}`);
        return cached.data;
      }
    }

    try {
      console.log(`🌐 AccessibilityFilterService: Fetching ${filterType} data for bounds:`, bbox);

      const bboxString = bbox.join(',');
      let url = `${this.baseUrl}/place-infos.json?appToken=${this.appToken}&bbox=${bboxString}&limit=${limit}`;

      // Add category filter if specified
      if (filterConfig.apiCategory && filterConfig.apiCategory !== 'all') {
        url += `&category=${filterConfig.apiCategory}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const features = data.features || [];

      // Filter results based on accessibility criteria
      const filteredFeatures = this.filterFeaturesByAccessibility(features, filterType);

      console.log(`📍 AccessibilityFilterService: Found ${filteredFeatures.length} ${filterType} POIs`);

      // Cache the result
      this.cache.set(cacheKey, {
        data: filteredFeatures,
        timestamp: Date.now()
      });

      return filteredFeatures;

    } catch (error) {
      console.error(`❌ AccessibilityFilterService: Error fetching ${filterType} data:`, error);
      return [];
    }
  }

  /**
   * Filter features based on accessibility criteria
   * @param {Array} features - Raw features from API
   * @param {string} filterType - Filter type to apply
   * @returns {Array} Filtered features
   */
  filterFeaturesByAccessibility(features, filterType) {
    // const filterConfig = this.getFilterTypes()[filterType]; // Not used currently
    
    return features.filter(feature => {
      const properties = feature.properties || {};
      const accessibility = properties.accessibility || {};

      switch (filterType) {
        case 'wheelchair_accessible_bathrooms':
          return this.hasAccessibleBathroom(accessibility, properties);
        
        case 'wheelchair_accessible_places':
          return this.isWheelchairAccessible(accessibility) === true;
        
        case 'limited_accessibility_places':
          return this.isWheelchairAccessible(accessibility) === 'limited';
        
        case 'not_accessible_places':
          return this.isWheelchairAccessible(accessibility) === false;
        
        case 'accessible_transit_stops':
          return this.isAccessibleTransit(accessibility, properties);
        
        case 'accessible_parking':
          return this.isAccessibleParking(accessibility, properties);
        
        case 'accessibility_equipment':
          return this.hasAccessibilityEquipment(accessibility, properties);
        
        default:
          return true;
      }
    });
  }

  /**
   * Check if place has accessible bathroom
   */
  hasAccessibleBathroom(accessibility, properties) {
    return accessibility.hasAccessibleToilet === true ||
           accessibility.toilets?.wheelchair === 'yes' ||
           properties.category?.includes('toilet') ||
           properties.name?.toLowerCase().includes('restroom') ||
           properties.name?.toLowerCase().includes('washroom');
  }

  /**
   * Determine wheelchair accessibility status
   */
  isWheelchairAccessible(accessibility) {
    if (accessibility.isWheelchairAccessible === true || 
        accessibility.entranceIsAccessible === true ||
        accessibility.hasAccessibleEntrance === true) {
      return true;
    }
    
    if (accessibility.isWheelchairAccessible === false ||
        accessibility.entranceIsAccessible === false ||
        accessibility.hasAccessibleEntrance === false) {
      return false;
    }

    if (accessibility.wheelchairAccessible === 'limited' ||
        accessibility.accessibility === 'limited') {
      return 'limited';
    }

    return null; // Unknown
  }

  /**
   * Check if transit stop is accessible
   */
  isAccessibleTransit(accessibility, properties) {
    return properties.category?.includes('transit') ||
           properties.category?.includes('public_transport') ||
           (accessibility.isWheelchairAccessible === true && 
            (properties.name?.toLowerCase().includes('stop') ||
             properties.name?.toLowerCase().includes('station')));
  }

  /**
   * Check if parking is accessible
   */
  isAccessibleParking(accessibility, properties) {
    return properties.category?.includes('parking') ||
           accessibility.hasAccessibleParking === true ||
           properties.name?.toLowerCase().includes('parking');
  }

  /**
   * Check if place has accessibility equipment
   */
  hasAccessibilityEquipment(accessibility, properties) {
    return accessibility.hasElevator === true ||
           accessibility.hasRamp === true ||
           properties.name?.toLowerCase().includes('elevator') ||
           properties.name?.toLowerCase().includes('lift') ||
           properties.name?.toLowerCase().includes('ramp');
  }

  /**
   * Create a Mapbox GL JS marker for a POI
   * @param {Object} poi - POI feature object
   * @param {string} filterType - Filter type for styling
   * @returns {Object} GeoJSON feature formatted for Mapbox
   */
  createMarkerForPOI(poi, filterType) {
    const filterConfig = this.getFilterTypes()[filterType];
    const properties = poi.properties || {};

    return {
      type: 'Feature',
      geometry: poi.geometry,
      properties: {
        ...properties,
        filterType: filterType,
        markerColor: filterConfig.color,
        markerIcon: filterConfig.icon,
        markerSize: 'medium',
        title: properties.name || filterConfig.name,
        description: this.generatePOIDescription(poi, filterType),
        accessibility: properties.accessibility || {}
      }
    };
  }

  /**
   * Generate description for POI popup
   */
  generatePOIDescription(poi, filterType) {
    const properties = poi.properties || {};
    const accessibility = properties.accessibility || {};
    const filterConfig = this.getFilterTypes()[filterType];

    let description = filterConfig.description;

    if (properties.address) {
      description += `<br><strong>Address:</strong> ${properties.address}`;
    }

    if (accessibility.accessibilityRating) {
      description += `<br><strong>Accessibility Rating:</strong> ${Math.round(accessibility.accessibilityRating * 100)}%`;
    }

    if (accessibility.hasRamp) {
      description += `<br>✅ Has ramp`;
    }

    if (accessibility.hasElevator) {
      description += `<br>✅ Has elevator`;
    }

    if (accessibility.hasAccessibleToilet) {
      description += `<br>✅ Accessible restroom`;
    }

    return description;
  }

  /**
   * Toggle accessibility layer on/off
   * @param {Object} map - Mapbox GL JS map instance
   * @param {string} filterType - Filter type to toggle
   * @param {boolean} enabled - Whether to enable or disable the layer
   * @param {Object} bounds - Current map bounds
   */
  async toggleAccessibilityLayer(map, filterType, enabled, bounds) {
    // Ensure map is properly initialized with all required methods
    if (!map || !map.isStyleLoaded || !map.isStyleLoaded() || !map.getLayer || !map.getSource || !map.addSource || !map.addLayer) {
      console.warn(`AccessibilityFilterService: Map not ready for ${filterType} - missing required methods`);
      return;
    }

    const layerId = `accessibility-${filterType}`;
    const sourceId = `accessibility-source-${filterType}`;

    if (enabled) {
      // Fetch data and add layer
      console.log(`🔄 AccessibilityFilterService: Enabling ${filterType} layer`);
      
      const features = await this.fetchAccessibilityData(bounds, filterType);
      
      if (features.length === 0) {
        console.log(`📍 AccessibilityFilterService: No data found for ${filterType}`);
        return;
      }

      // Convert to GeoJSON format
      const geojsonData = {
        type: 'FeatureCollection',
        features: features.map(feature => this.createMarkerForPOI(feature, filterType))
      };

      // Remove existing layer if it exists
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });

      // Add layer with custom styling
      const filterConfig = this.getFilterTypes()[filterType];
      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 4,
            18, 12
          ],
          'circle-color': filterConfig.color,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.8
        }
      });

      // Add click handler for popups
      map.on('click', layerId, (e) => {
        const feature = e.features[0];
        const coordinates = e.lngLat;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div class="accessibility-popup">
              <h4>${feature.properties.markerIcon} ${feature.properties.title}</h4>
              <p>${feature.properties.description}</p>
              <div class="popup-footer">
                <small>Data from accessibility.cloud</small>
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Change cursor on hover
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });

      // Track active layer
      this.activeLayers.set(filterType, layerId);
      this.layerSources.set(filterType, sourceId);

      console.log(`✅ AccessibilityFilterService: Added ${features.length} markers for ${filterType}`);

    } else {
      // Remove layer
      console.log(`🔄 AccessibilityFilterService: Disabling ${filterType} layer`);

      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }

      // Remove from tracking
      this.activeLayers.delete(filterType);
      this.layerSources.delete(filterType);

      console.log(`✅ AccessibilityFilterService: Removed ${filterType} layer`);
    }
  }

  /**
   * Update all active layers when map bounds change
   * @param {Object} map - Mapbox GL JS map instance
   * @param {Object} bounds - New map bounds
   */
  async updateLayersForBounds(map, bounds) {
    const activeFilterTypes = Array.from(this.activeLayers.keys());
    
    if (activeFilterTypes.length === 0) {
      return;
    }

    console.log(`🔄 AccessibilityFilterService: Updating ${activeFilterTypes.length} layers for new bounds`);

    // Update each active layer
    for (const filterType of activeFilterTypes) {
      await this.toggleAccessibilityLayer(map, filterType, true, bounds);
    }
  }

  /**
   * Clear all accessibility layers
   * @param {Object} map - Mapbox GL JS map instance
   */
  clearAllLayers(map) {
    console.log('🧹 AccessibilityFilterService: Clearing all accessibility layers');

    for (const [filterType, layerId] of this.activeLayers.entries()) {
      const sourceId = this.layerSources.get(filterType);
      
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }

    this.activeLayers.clear();
    this.layerSources.clear();
  }

  /**
   * Get equipment status from disruptions API
   * @param {Array} equipmentIds - Array of equipment IDs to check
   * @returns {Promise<Object>} Equipment status map
   */
  async getEquipmentStatus(equipmentIds) {
    try {
      const url = `${this.baseUrl}/disruptions.json?appToken=${this.appToken}&equipment_ids=${equipmentIds.join(',')}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Equipment status request failed: ${response.status}`);
      }

      const data = await response.json();
      const statusMap = {};

      // Process disruptions to create status map
      (data.disruptions || []).forEach(disruption => {
        if (disruption.equipmentId) {
          statusMap[disruption.equipmentId] = {
            isWorking: !disruption.isActive,
            description: disruption.description,
            lastUpdate: disruption.lastUpdate
          };
        }
      });

      return statusMap;

    } catch (error) {
      console.error('❌ AccessibilityFilterService: Error fetching equipment status:', error);
      return {};
    }
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const accessibilityFilterService = new AccessibilityFilterService();
export default accessibilityFilterService;
