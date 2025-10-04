/**
 * Simple Route Rendering Service
 * 
 * Provides basic route rendering functionality for Leaflet maps
 */

/* global L */

class SimpleRouteRenderingService {
  constructor() {
    this.map = null;
    this.routeLayer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the service with a map instance
   */
  initialize(mapInstance) {
    if (!mapInstance) {
      throw new Error('Map instance is required');
    }

    this.map = mapInstance;
    this.isInitialized = true;
    console.log('✅ Simple Route Rendering Service initialized');
  }

  /**
   * Render a route on the map
   */
  async renderRoute(route, evidence = null) {
    if (!this.isInitialized || !this.map) {
      console.warn('Route rendering service not initialized');
      return;
    }

    try {
      // Clear existing route
      this.clearRoute();

      if (!route || !route.features || route.features.length === 0) {
        console.warn('No route data to render');
        return;
      }

      const routeFeature = route.features[0];
      const coordinates = routeFeature.geometry.coordinates;

      if (!coordinates || coordinates.length < 2) {
        console.warn('Invalid route coordinates');
        return;
      }

      // Create route layer (check if Leaflet is available)
      if (typeof L !== 'undefined') {
        this.routeLayer = L.geoJSON(routeFeature, {
          style: {
            color: '#3388ff',
            weight: 6,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round'
          },
          interactive: false
        });
      } else {
        console.warn('Leaflet not available for route rendering');
        return;
      }

      // Add to map
      this.routeLayer.addTo(this.map);

      // Fit map to route bounds with Halifax bounds validation
      const routeBounds = this.routeLayer.getBounds();
      const halifaxBounds = L.latLngBounds(
        L.latLng(44.5, -63.8), // Southwest
        L.latLng(44.8, -63.4)  // Northeast
      );

      // Check if route bounds are within Halifax bounds
      if (halifaxBounds.contains(routeBounds.getSouthWest()) && 
          halifaxBounds.contains(routeBounds.getNorthEast())) {
        this.map.fitBounds(routeBounds, {
          padding: [20, 20]
        });
        console.log('✅ Route rendered and map fitted to route bounds');
      } else {
        console.warn('🚫 Route bounds are outside Halifax area, skipping map fitting');
        console.log('✅ Route rendered without map fitting');
      }

    } catch (error) {
      console.error('❌ Failed to render route:', error);
    }
  }

  /**
   * Render directions on the map
   */
  async renderDirections(directions) {
    if (!this.isInitialized || !this.map) {
      console.warn('Route rendering service not initialized');
      return;
    }

    try {
      if (!directions || directions.length === 0) {
        console.warn('No directions to render');
        return;
      }

      // Clear existing directions
      this.clearDirections();

      // Create direction markers
      directions.forEach((direction, index) => {
        if (direction.coordinates && typeof L !== 'undefined') {
          const marker = L.marker(direction.coordinates, {
            icon: L.divIcon({
              className: 'direction-marker',
              html: `<div class="direction-number">${index + 1}</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          });

          marker.addTo(this.map);
          marker.bindPopup(direction.instruction || `Step ${index + 1}`);
        }
      });

      console.log('✅ Directions rendered successfully');

    } catch (error) {
      console.error('❌ Failed to render directions:', error);
    }
  }

  /**
   * Clear the current route
   */
  clearRoute() {
    if (this.routeLayer && this.map) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
  }

  /**
   * Clear all directions
   */
  clearDirections() {
    if (this.map) {
      this.map.eachLayer(layer => {
        if (layer.options && layer.options.icon && layer.options.icon.options && 
            layer.options.icon.options.className === 'direction-marker') {
          this.map.removeLayer(layer);
        }
      });
    }
  }

  /**
   * Clear all rendered content
   */
  clearAll() {
    this.clearRoute();
    this.clearDirections();
  }
}

// Create singleton instance
const simpleRouteRenderingService = new SimpleRouteRenderingService();

export default simpleRouteRenderingService;
