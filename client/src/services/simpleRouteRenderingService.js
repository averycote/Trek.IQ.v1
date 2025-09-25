/**
 * Simple Route Rendering Service
 * 
 * Provides basic route rendering functionality for the restored routing service.
 * Handles map visualization of routes and directions.
 */

/* global L */

class SimpleRouteRenderingService {
  constructor() {
    this.map = null;
    this.routeLayer = null;
    this.directionsLayer = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the rendering service with a map instance
   */
  initialize(mapInstance) {
    if (!mapInstance) {
      console.warn('No map instance provided to route rendering service');
      return;
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

      // Fit map to route bounds
      this.map.fitBounds(this.routeLayer.getBounds(), {
        padding: [20, 20]
      });

      console.log('✅ Route rendered successfully');

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
      // Clear existing directions
      this.clearDirections();

      if (!directions || directions.length === 0) {
        console.warn('No directions to render');
        return;
      }

      // Create directions markers (check if Leaflet is available)
      if (typeof L === 'undefined') {
        console.warn('Leaflet not available for direction rendering');
        return;
      }

      const directionMarkers = [];

      directions.forEach((direction, index) => {
        if (direction.coordinates) {
          const marker = L.marker(direction.coordinates, {
            icon: L.divIcon({
              className: 'direction-marker',
              html: `<div class="direction-number">${direction.step}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })
          });

          // Add popup with instruction
          marker.bindPopup(`
            <div class="direction-popup">
              <strong>Step ${direction.step}</strong><br>
              ${direction.instruction}
              ${direction.distance ? `<br><small>Distance: ${(direction.distance / 1000).toFixed(2)} km</small>` : ''}
            </div>
          `);

          directionMarkers.push(marker);
        }
      });

      // Add markers to map
      if (typeof L !== 'undefined') {
        this.directionsLayer = L.layerGroup(directionMarkers);
        this.directionsLayer.addTo(this.map);
      }

      console.log(`✅ Rendered ${directionMarkers.length} direction markers`);

    } catch (error) {
      console.error('❌ Failed to render directions:', error);
    }
  }

  /**
   * Clear the current route
   */
  clearRoute() {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
  }

  /**
   * Clear the current directions
   */
  clearDirections() {
    if (this.directionsLayer) {
      this.map.removeLayer(this.directionsLayer);
      this.directionsLayer = null;
    }
  }

  /**
   * Clear all route-related layers
   */
  clearAll() {
    this.clearRoute();
    this.clearDirections();
  }

  /**
   * Get rendering status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      hasRoute: !!this.routeLayer,
      hasDirections: !!this.directionsLayer
    };
  }
}

// Export singleton instance
const simpleRouteRenderingService = new SimpleRouteRenderingService();
export default simpleRouteRenderingService;
