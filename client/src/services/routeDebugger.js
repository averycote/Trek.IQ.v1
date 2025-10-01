/**
 * Route Debugger Service
 * 
 * Provides debugging and logging for route rendering issues
 */

class RouteDebugger {
  constructor() {
    this.debugLog = [];
    this.maxLogEntries = 100;
  }

  /**
   * Log route debugging information
   */
  log(message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    };
    
    this.debugLog.push(entry);
    
    // Keep only recent entries
    if (this.debugLog.length > this.maxLogEntries) {
      this.debugLog.shift();
    }
    
    console.log(`🔍 RouteDebugger: ${message}`, data || '');
  }

  /**
   * Debug route data structure
   */
  debugRouteData(route, context = '') {
    this.log(`Debugging route data ${context}`, {
      hasRoute: !!route,
      routeType: route?.type,
      hasFeatures: !!route?.features,
      featuresLength: route?.features?.length,
      firstFeature: route?.features?.[0] ? {
        type: route.features[0].type,
        hasGeometry: !!route.features[0].geometry,
        geometryType: route.features[0].geometry?.type,
        hasCoordinates: !!route.features[0].geometry?.coordinates,
        coordinatesLength: route.features[0].geometry?.coordinates?.length,
        hasProperties: !!route.features[0].properties,
        properties: route.features[0].properties
      } : null
    });
  }

  /**
   * Debug map instance
   */
  debugMapInstance(map, context = '') {
    this.log(`Debugging map instance ${context}`, {
      hasMap: !!map,
      isStyleLoaded: map?.isStyleLoaded ? map.isStyleLoaded() : false,
      hasGetSource: typeof map?.getSource === 'function',
      hasAddSource: typeof map?.addSource === 'function',
      hasAddLayer: typeof map?.addLayer === 'function',
      hasRemoveLayer: typeof map?.removeLayer === 'function'
    });
  }

  /**
   * Debug route rendering attempt
   */
  debugRouteRendering(route, map, renderer = null) {
    this.log('Starting route rendering debug', {
      routeValid: this.isRouteValid(route),
      mapValid: this.isMapValid(map),
      rendererValid: renderer ? this.isRendererValid(renderer) : 'No renderer'
    });

    this.debugRouteData(route, 'for rendering');
    this.debugMapInstance(map, 'for rendering');

    if (renderer) {
      this.log('Renderer state', {
        isInitialized: renderer.isInitialized,
        hasMap: !!renderer.map,
        mapType: renderer.mapType
      });
    }
  }

  /**
   * Check if route data is valid
   */
  isRouteValid(route) {
    if (!route) return false;
    if (!route.features || !Array.isArray(route.features)) return false;
    if (route.features.length === 0) return false;
    
    const firstFeature = route.features[0];
    if (!firstFeature.geometry) return false;
    if (!firstFeature.geometry.coordinates) return false;
    if (!Array.isArray(firstFeature.geometry.coordinates)) return false;
    if (firstFeature.geometry.coordinates.length < 2) return false;
    
    return true;
  }

  /**
   * Check if map instance is valid
   */
  isMapValid(map) {
    if (!map) return false;
    if (typeof map.getSource !== 'function') return false;
    if (typeof map.addSource !== 'function') return false;
    if (typeof map.addLayer !== 'function') return false;
    return true;
  }

  /**
   * Check if renderer is valid
   */
  isRendererValid(renderer) {
    if (!renderer) return false;
    if (!renderer.isInitialized) return false;
    if (!renderer.map) return false;
    return true;
  }

  /**
   * Get debugging summary
   */
  getDebugSummary() {
    return {
      totalLogEntries: this.debugLog.length,
      recentEntries: this.debugLog.slice(-10),
      lastEntry: this.debugLog[this.debugLog.length - 1]
    };
  }

  /**
   * Clear debug log
   */
  clearLog() {
    this.debugLog = [];
  }

  /**
   * Create a simple test route for debugging
   */
  createTestRoute() {
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [-63.5752, 44.6488], // Halifax downtown
            [-63.5806, 44.6478], // Spring Garden Road
            [-63.5850, 44.6500]  // Robie Street
          ]
        },
        properties: {
          distance: 1500,
          duration: 1200,
          mode: 'walking',
          accessibility: 85,
          source: 'test'
        }
      }]
    };
  }
}

// Create singleton instance
const routeDebugger = new RouteDebugger();

export default routeDebugger;
