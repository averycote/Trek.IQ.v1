/**
 * Unified Route Renderer
 * 
 * Provides a single, reliable route rendering service that works with
 * both Mapbox GL JS and Leaflet, handling all route rendering needs
 */

/* global L, mapboxgl */

class UnifiedRouteRenderer {
  constructor() {
    this.map = null;
    this.mapType = null; // 'mapbox' or 'leaflet'
    this.isInitialized = false;
    this.currentRoute = null;
    this.routeLayers = new Map();
  }

  /**
   * Initialize the renderer with a map instance
   */
  initialize(mapInstance) {
    if (!mapInstance) {
      throw new Error('Map instance is required');
    }

    this.map = mapInstance;
    
    // Detect map type
    if (mapInstance.getSource && mapInstance.addSource) {
      this.mapType = 'mapbox';
    } else if (mapInstance.addLayer && mapInstance.removeLayer) {
      this.mapType = 'leaflet';
    } else {
      throw new Error('Unsupported map type');
    }

    this.isInitialized = true;
    console.log(`✅ UnifiedRouteRenderer initialized with ${this.mapType} map`);
  }

  /**
   * Render a route on the map
   */
  async renderRoute(route, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Renderer not initialized');
    }

    if (!route) {
      console.warn('No route data provided');
      return;
    }

    try {
      // Clear existing routes
      this.clearRoutes();

      // Validate route data
      const validatedRoute = this.validateRouteData(route);
      if (!validatedRoute) {
        throw new Error('Invalid route data');
      }

      // Render based on map type
      if (this.mapType === 'mapbox') {
        await this.renderMapboxRoute(validatedRoute, options);
      } else if (this.mapType === 'leaflet') {
        await this.renderLeafletRoute(validatedRoute, options);
      }

      this.currentRoute = validatedRoute;
      console.log('✅ Route rendered successfully');

    } catch (error) {
      console.error('❌ Failed to render route:', error);
      throw error;
    }
  }

  /**
   * Validate and normalize route data
   */
  validateRouteData(route) {
    // Handle different route data structures
    let routeData = route;

    // If it's not a GeoJSON FeatureCollection, try to convert it
    if (!routeData.type || routeData.type !== 'FeatureCollection') {
      if (routeData.features) {
        routeData = {
          type: 'FeatureCollection',
          features: routeData.features
        };
      } else if (routeData.geometry) {
        routeData = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: routeData.geometry,
            properties: routeData.properties || {}
          }]
        };
      } else if (Array.isArray(routeData)) {
        // Assume it's coordinates array
        routeData = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: routeData
            },
            properties: {}
          }]
        };
      } else {
        console.error('Unrecognized route data structure:', routeData);
        return null;
      }
    }

    // Validate required properties
    if (!routeData.features || !Array.isArray(routeData.features) || routeData.features.length === 0) {
      console.error('Route missing features array');
      return null;
    }

    const firstFeature = routeData.features[0];
    if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
      console.error('Route feature missing geometry or coordinates');
      return null;
    }

    if (!Array.isArray(firstFeature.geometry.coordinates) || firstFeature.geometry.coordinates.length < 2) {
      console.error('Route coordinates invalid');
      return null;
    }

    // Ensure properties exist
    if (!firstFeature.properties) {
      firstFeature.properties = {};
    }

    // Calculate missing distance/duration if needed
    if (!firstFeature.properties.distance) {
      firstFeature.properties.distance = this.calculateDistance(firstFeature.geometry.coordinates);
    }

    if (!firstFeature.properties.duration) {
      firstFeature.properties.duration = Math.round(firstFeature.properties.distance / 1.4); // ~1.4 m/s walking
    }

    return routeData;
  }

  /**
   * Render route on Mapbox GL JS map
   */
  async renderMapboxRoute(routeData, options = {}) {
    const sourceId = 'unified-route-source';
    const layerId = 'unified-route-layer';

    // Remove existing route
    if (this.map.getLayer(layerId)) {
      this.map.removeLayer(layerId);
    }
    if (this.map.getSource(sourceId)) {
      this.map.removeSource(sourceId);
    }

    // Add route source
    this.map.addSource(sourceId, {
      type: 'geojson',
      data: routeData
    });

    // Add route layer
    this.map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        visibility: 'visible'
      },
      paint: {
        'line-color': options.color || '#3b82f6',
        'line-width': options.width || 6,
        'line-opacity': options.opacity || 0.8
      }
    });

    // Store layer reference
    this.routeLayers.set(layerId, { sourceId, layerId });

    // Fit map to route bounds
    this.fitMapToRoute(routeData);
  }

  /**
   * Render route on Leaflet map
   */
  async renderLeafletRoute(routeData, options = {}) {
    if (typeof L === 'undefined') {
      throw new Error('Leaflet not available');
    }

    const layerId = 'unified-route-layer';

    // Remove existing route
    if (this.routeLayers.has(layerId)) {
      this.map.removeLayer(this.routeLayers.get(layerId).layer);
    }

    // Create route layer
    const routeLayer = L.geoJSON(routeData, {
      style: {
        color: options.color || '#3b82f6',
        weight: options.width || 6,
        opacity: options.opacity || 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      },
      interactive: false
    });

    // Add to map
    routeLayer.addTo(this.map);

    // Store layer reference
    this.routeLayers.set(layerId, { layer: routeLayer });

    // Fit map to route bounds
    this.fitMapToRoute(routeData);
  }

  /**
   * Fit map to route bounds with Halifax bounds validation
   */
  fitMapToRoute(routeData) {
    if (!routeData.features || routeData.features.length === 0) return;

    const firstFeature = routeData.features[0];
    const coordinates = firstFeature.geometry.coordinates;

    // Halifax bounds for validation
    const halifaxBounds = {
      west: -63.8,
      east: -63.4,
      south: 44.5,
      north: 44.8
    };

    // Validate that all coordinates are within Halifax bounds
    const validCoordinates = coordinates.filter(coord => {
      const [lng, lat] = coord;
      return lng >= halifaxBounds.west && lng <= halifaxBounds.east &&
             lat >= halifaxBounds.south && lat <= halifaxBounds.north;
    });

    // If no valid coordinates or too few valid coordinates, don't fit bounds
    if (validCoordinates.length < 2) {
      console.warn('🚫 Route coordinates are outside Halifax bounds, skipping map fitting');
      return;
    }

    if (this.mapType === 'mapbox') {
      // Mapbox GL JS bounds fitting with valid coordinates only
      const bounds = validCoordinates.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(validCoordinates[0], validCoordinates[0]));

      this.map.fitBounds(bounds, {
        padding: 50,
        duration: 1000,
        maxZoom: 16
      });
    } else if (this.mapType === 'leaflet') {
      // Leaflet bounds fitting with valid coordinates only
      const latLngs = validCoordinates.map(coord => L.latLng(coord[1], coord[0]));
      const bounds = L.latLngBounds(latLngs);
      
      this.map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 16
      });
    }
  }

  /**
   * Clear all rendered routes
   */
  clearRoutes() {
    if (this.mapType === 'mapbox') {
      // Remove Mapbox layers and sources
      for (const [layerId, { sourceId, layerId: layer }] of this.routeLayers) {
        if (this.map.getLayer(layer)) {
          this.map.removeLayer(layer);
        }
        if (this.map.getSource(sourceId)) {
          this.map.removeSource(sourceId);
        }
      }
    } else if (this.mapType === 'leaflet') {
      // Remove Leaflet layers
      for (const [layerId, { layer }] of this.routeLayers) {
        this.map.removeLayer(layer);
      }
    }

    this.routeLayers.clear();
    this.currentRoute = null;
  }

  /**
   * Calculate distance from coordinates
   */
  calculateDistance(coordinates) {
    if (!coordinates || coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      
      // Haversine formula for accurate distance calculation
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      totalDistance += distance;
    }
    
    return Math.round(totalDistance);
  }

  /**
   * Get current route data
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Check if renderer is ready
   */
  isReady() {
    return this.isInitialized && this.map !== null;
  }
}

// Create singleton instance
const unifiedRouteRenderer = new UnifiedRouteRenderer();

export default unifiedRouteRenderer;
