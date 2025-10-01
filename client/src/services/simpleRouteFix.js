/* global L, mapboxgl */

/**
 * Simple Route Fix
 * 
 * Provides a simple, reliable route rendering solution
 */

class SimpleRouteFix {
  constructor() {
    this.map = null;
    this.currentRouteLayer = null;
  }

  /**
   * Initialize with map instance
   */
  initialize(mapInstance) {
    this.map = mapInstance;
    console.log('✅ SimpleRouteFix initialized');
  }

  /**
   * Render route with maximum compatibility
   */
  async renderRoute(route) {
    if (!this.map) {
      console.error('❌ No map instance available');
      return;
    }

    if (!route) {
      console.error('❌ No route data provided');
      return;
    }

    try {
      // Clear existing route
      this.clearRoute();

      // Validate route data
      if (!route.features || route.features.length === 0) {
        console.error('❌ Route has no features');
        return;
      }

      const firstFeature = route.features[0];
      if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
        console.error('❌ Route feature has no geometry or coordinates');
        return;
      }

      const coordinates = firstFeature.geometry.coordinates;
      if (coordinates.length < 2) {
        console.error('❌ Route has insufficient coordinates');
        return;
      }

      console.log('🛣️ Rendering route with', coordinates.length, 'coordinates');

      // Try different rendering methods based on map type
      if (this.isMapboxMap()) {
        await this.renderMapboxRoute(route);
      } else if (this.isLeafletMap()) {
        await this.renderLeafletRoute(route);
      } else {
        console.error('❌ Unknown map type');
      }

    } catch (error) {
      console.error('❌ Route rendering failed:', error);
    }
  }

  /**
   * Check if this is a Mapbox GL JS map
   */
  isMapboxMap() {
    return this.map && typeof this.map.addSource === 'function' && typeof this.map.addLayer === 'function';
  }

  /**
   * Check if this is a Leaflet map
   */
  isLeafletMap() {
    return this.map && typeof this.map.addLayer === 'function' && typeof this.map.removeLayer === 'function';
  }

  /**
   * Render route on Mapbox GL JS map
   */
  async renderMapboxRoute(route) {
    const sourceId = 'simple-route-source';
    const layerId = 'simple-route-layer';

    try {
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
        data: route
      });

      // Add route layer
      this.map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ff0000', // Bright red for visibility
          'line-width': 8,
          'line-opacity': 0.8
        }
      });

      this.currentRouteLayer = { sourceId, layerId };
      console.log('✅ Route rendered on Mapbox map');

      // Fit map to route
      this.fitMapToRoute(route);

    } catch (error) {
      console.error('❌ Mapbox route rendering failed:', error);
    }
  }

  /**
   * Render route on Leaflet map
   */
  async renderLeafletRoute(route) {
    try {
      if (typeof L === 'undefined') {
        console.error('❌ Leaflet not available');
        return;
      }

      const firstFeature = route.features[0];
      const coordinates = firstFeature.geometry.coordinates;

      // Convert coordinates to Leaflet format
      const latLngs = coordinates.map(coord => L.latLng(coord[1], coord[0]));

      // Create polyline
      const polyline = L.polyline(latLngs, {
        color: '#ff0000', // Bright red for visibility
        weight: 8,
        opacity: 0.8
      });

      // Add to map
      polyline.addTo(this.map);
      this.currentRouteLayer = polyline;

      console.log('✅ Route rendered on Leaflet map');

      // Fit map to route
      this.fitMapToRoute(route);

    } catch (error) {
      console.error('❌ Leaflet route rendering failed:', error);
    }
  }

  /**
   * Fit map to route bounds
   */
  fitMapToRoute(route) {
    try {
      const firstFeature = route.features[0];
      const coordinates = firstFeature.geometry.coordinates;

      if (this.isMapboxMap()) {
        // Mapbox bounds fitting
        const bounds = coordinates.reduce((bounds, coord) => {
          return bounds.extend(coord);
        }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

        this.map.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      } else if (this.isLeafletMap()) {
        // Leaflet bounds fitting
        const latLngs = coordinates.map(coord => L.latLng(coord[1], coord[0]));
        const bounds = L.latLngBounds(latLngs);
        
        this.map.fitBounds(bounds, {
          padding: [20, 20]
        });
      }
    } catch (error) {
      console.error('❌ Failed to fit map to route:', error);
    }
  }

  /**
   * Clear current route
   */
  clearRoute() {
    if (!this.map) return;

    try {
      if (this.isMapboxMap() && this.currentRouteLayer) {
        const { sourceId, layerId } = this.currentRouteLayer;
        if (this.map.getLayer(layerId)) {
          this.map.removeLayer(layerId);
        }
        if (this.map.getSource(sourceId)) {
          this.map.removeSource(sourceId);
        }
      } else if (this.isLeafletMap() && this.currentRouteLayer) {
        this.map.removeLayer(this.currentRouteLayer);
      }

      this.currentRouteLayer = null;
    } catch (error) {
      console.error('❌ Failed to clear route:', error);
    }
  }
}

// Create singleton instance
const simpleRouteFix = new SimpleRouteFix();

export default simpleRouteFix;
