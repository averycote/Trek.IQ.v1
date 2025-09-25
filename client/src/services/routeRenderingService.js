/**
 * Route Rendering Service
 * 
 * Handles optimized route rendering with persistent routeLayer and setLatLngs updates.
 * Eliminates lag by keeping existing route visible until new route is ready.
 */

/* global L */

class RouteRenderingService {
  constructor() {
    this.routeLayer = null;
    this.mapInstance = null;
    this.isInitialized = false;
    this.currentRoute = null;
    this.renderQueue = [];
    this.isRendering = false;
  }

  /**
   * Initialize the rendering service with map instance
   */
  initialize(mapInstance) {
    if (!mapInstance) {
      throw new Error('Map instance is required for route rendering');
    }

    // Check if Leaflet is available
    if (typeof L === 'undefined') {
      console.warn('⚠️ Leaflet not available - route rendering will be delayed');
      this.mapInstance = mapInstance;
      this.isInitialized = false;
      return;
    }

    this.mapInstance = mapInstance;
    
    // Create persistent route layer
    this.createRouteLayer();
    
    this.isInitialized = true;
    console.log('✅ Route Rendering Service initialized');
  }

  /**
   * Create persistent route layer
   */
  createRouteLayer() {
    if (!this.mapInstance) {
      throw new Error('Map instance not available');
    }

    if (typeof L === 'undefined') {
      throw new Error('Leaflet library not available');
    }

    // Create a single polyline layer that will be reused
    this.routeLayer = L.polyline([], {
      color: '#007bff',
      weight: 6,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    });

    // Add to map
    this.routeLayer.addTo(this.mapInstance);
    
    console.log('✅ Persistent route layer created');
  }

  /**
   * Reinitialize when Leaflet becomes available
   */
  reinitialize() {
    if (typeof L !== 'undefined' && this.mapInstance && !this.isInitialized) {
      this.createRouteLayer();
      this.isInitialized = true;
      console.log('✅ Route Rendering Service reinitialized with Leaflet');
    }
  }

  /**
   * Render route with optimized updates
   */
  async renderRoute(routeData, evidence) {
    // Try to reinitialize if Leaflet is now available
    if (!this.isInitialized) {
      this.reinitialize();
    }

    if (!this.isInitialized) {
      console.warn('⚠️ Route Rendering Service not initialized - skipping render');
      return;
    }

    // Add to render queue
    this.renderQueue.push({ routeData, evidence });
    
    // Process queue if not already rendering
    if (!this.isRendering) {
      await this.processRenderQueue();
    }
  }

  /**
   * Process render queue
   */
  async processRenderQueue() {
    if (this.isRendering || this.renderQueue.length === 0) {
      return;
    }

    this.isRendering = true;

    try {
      while (this.renderQueue.length > 0) {
        const { routeData, evidence } = this.renderQueue.shift();
        await this.renderSingleRoute(routeData, evidence);
      }
    } finally {
      this.isRendering = false;
    }
  }

  /**
   * Render a single route
   */
  async renderSingleRoute(routeData, evidence) {
    try {
      const startTime = performance.now();
      
      // Extract coordinates from route data
      const coordinates = this.extractCoordinates(routeData);
      
      if (!coordinates || coordinates.length === 0) {
        console.warn('⚠️ No coordinates found in route data');
        return;
      }

      // Update route layer with new coordinates
      this.routeLayer.setLatLngs(coordinates);
      
      // Bring to front to ensure visibility
      this.routeLayer.bringToFront();
      
      // Update bounds to include route
      this.updateMapBounds(coordinates);
      
      // Update render evidence
      this.updateRenderEvidence(evidence);
      
      // Store current route
      this.currentRoute = { routeData, evidence, coordinates };
      
      const renderTime = performance.now() - startTime;
      console.log(`✅ Route rendered in ${renderTime.toFixed(0)}ms`);
      
    } catch (error) {
      console.error('❌ Failed to render route:', error);
      throw error;
    }
  }

  /**
   * Extract coordinates from route data
   */
  extractCoordinates(routeData) {
    if (!routeData || !routeData.features || routeData.features.length === 0) {
      return [];
    }

    const feature = routeData.features[0];
    
    if (feature.geometry && feature.geometry.type === 'LineString') {
      return feature.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
    }

    return [];
  }

  /**
   * Update map bounds to include route
   */
  updateMapBounds(coordinates) {
    if (!this.mapInstance || !coordinates || coordinates.length === 0) {
      return;
    }

    try {
      // Create bounds from coordinates
      const bounds = L.latLngBounds(coordinates);
      
      // Fit map to bounds with padding
      this.mapInstance.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 16 // Don't zoom in too much
      });
      
    } catch (error) {
      console.warn('⚠️ Failed to update map bounds:', error);
    }
  }

  /**
   * Update render evidence with timestamps
   */
  updateRenderEvidence(evidence) {
    if (!evidence || !evidence.renderEvidence) {
      return;
    }

    evidence.renderEvidence.polylineSetTimestamp = new Date().toISOString();
    evidence.renderEvidence.rendered = true;
    
    // Log render latency
    if (evidence.renderEvidence.routeComputedTimestamp) {
      const computeTime = new Date(evidence.renderEvidence.routeComputedTimestamp);
      const renderTime = new Date(evidence.renderEvidence.polylineSetTimestamp);
      const renderLatencyMs = renderTime - computeTime;
      
      console.log(`📊 Render latency: ${renderLatencyMs}ms`);
    }
  }

  /**
   * Clear current route
   */
  clearRoute() {
    if (this.routeLayer) {
      this.routeLayer.setLatLngs([]);
    }
    
    this.currentRoute = null;
    console.log('🧹 Route cleared');
  }

  /**
   * Update route style
   */
  updateRouteStyle(style) {
    if (!this.routeLayer) {
      return;
    }

    const defaultStyle = {
      color: '#007bff',
      weight: 6,
      opacity: 0.8,
      lineCap: 'round',
      lineJoin: 'round'
    };

    const newStyle = { ...defaultStyle, ...style };
    
    this.routeLayer.setStyle(newStyle);
    console.log('🎨 Route style updated');
  }

  /**
   * Get current route information
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get rendering status
   */
  getRenderingStatus() {
    return {
      initialized: this.isInitialized,
      hasRoute: !!this.currentRoute,
      isRendering: this.isRendering,
      queueLength: this.renderQueue.length
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.routeLayer && this.mapInstance) {
      this.mapInstance.removeLayer(this.routeLayer);
    }
    
    this.routeLayer = null;
    this.mapInstance = null;
    this.currentRoute = null;
    this.renderQueue = [];
    this.isRendering = false;
    this.isInitialized = false;
    
    console.log('🧹 Route Rendering Service cleaned up');
  }
}

// Export singleton instance
const routeRenderingService = new RouteRenderingService();
export default routeRenderingService;
