/**
 * Routing Diagnostic Service
 * 
 * Provides comprehensive diagnostics and fixes for routing issues
 */

class RoutingDiagnosticService {
  constructor() {
    this.diagnostics = {
      routeData: null,
      mapComponent: null,
      renderingService: null,
      errors: [],
      warnings: []
    };
  }

  /**
   * Run comprehensive routing diagnostics
   */
  async runDiagnostics(route, mapComponent, renderingService) {
    console.log('🔍 Running routing diagnostics...');
    
    this.diagnostics.routeData = route;
    this.diagnostics.mapComponent = mapComponent;
    this.diagnostics.renderingService = renderingService;
    this.diagnostics.errors = [];
    this.diagnostics.warnings = [];

    // Check route data structure
    this.checkRouteDataStructure(route);
    
    // Check map component
    this.checkMapComponent(mapComponent);
    
    // Check rendering service
    this.checkRenderingService(renderingService);
    
    // Check for common issues
    this.checkCommonIssues();
    
    return this.diagnostics;
  }

  /**
   * Check route data structure
   */
  checkRouteDataStructure(route) {
    if (!route) {
      this.diagnostics.errors.push('Route data is null or undefined');
      return;
    }

    // Check for required properties
    if (!route.features) {
      this.diagnostics.errors.push('Route missing features array');
      return;
    }

    if (!Array.isArray(route.features)) {
      this.diagnostics.errors.push('Route features is not an array');
      return;
    }

    if (route.features.length === 0) {
      this.diagnostics.errors.push('Route features array is empty');
      return;
    }

    const firstFeature = route.features[0];
    
    if (!firstFeature.geometry) {
      this.diagnostics.errors.push('First route feature missing geometry');
      return;
    }

    if (!firstFeature.geometry.coordinates) {
      this.diagnostics.errors.push('First route feature missing coordinates');
      return;
    }

    if (!Array.isArray(firstFeature.geometry.coordinates)) {
      this.diagnostics.errors.push('Route coordinates is not an array');
      return;
    }

    if (firstFeature.geometry.coordinates.length < 2) {
      this.diagnostics.errors.push('Route has insufficient coordinates (need at least 2)');
      return;
    }

    // Check properties
    if (!firstFeature.properties) {
      this.diagnostics.warnings.push('Route feature missing properties');
    } else {
      if (!firstFeature.properties.distance) {
        this.diagnostics.warnings.push('Route missing distance property');
      }
      if (!firstFeature.properties.duration) {
        this.diagnostics.warnings.push('Route missing duration property');
      }
    }

    console.log('✅ Route data structure check completed');
  }

  /**
   * Check map component
   */
  checkMapComponent(mapComponent) {
    if (!mapComponent) {
      this.diagnostics.errors.push('Map component is null or undefined');
      return;
    }

    if (!mapComponent.current) {
      this.diagnostics.errors.push('Map component has no current map instance');
      return;
    }

    if (!mapComponent.current.isStyleLoaded) {
      this.diagnostics.errors.push('Map style not loaded');
      return;
    }

    if (!mapComponent.current.isStyleLoaded()) {
      this.diagnostics.warnings.push('Map style may not be fully loaded');
    }

    console.log('✅ Map component check completed');
  }

  /**
   * Check rendering service
   */
  checkRenderingService(renderingService) {
    if (!renderingService) {
      this.diagnostics.errors.push('Rendering service is null or undefined');
      return;
    }

    if (!renderingService.isInitialized) {
      this.diagnostics.errors.push('Rendering service not initialized');
      return;
    }

    if (!renderingService.map) {
      this.diagnostics.errors.push('Rendering service has no map instance');
      return;
    }

    console.log('✅ Rendering service check completed');
  }

  /**
   * Check for common issues
   */
  checkCommonIssues() {
    // Check for conflicting map libraries
    if (typeof L !== 'undefined' && typeof mapboxgl !== 'undefined') {
      this.diagnostics.warnings.push('Both Leaflet and Mapbox GL JS are loaded - this may cause conflicts');
    }

    // Check for route source conflicts
    if (this.diagnostics.mapComponent?.current) {
      const map = this.diagnostics.mapComponent.current;
      const routeSources = ['route-source', 'route-source-1', 'route-source-2'];
      
      routeSources.forEach(sourceId => {
        if (map.getSource(sourceId)) {
          this.diagnostics.warnings.push(`Route source '${sourceId}' already exists - may cause conflicts`);
        }
      });
    }

    console.log('✅ Common issues check completed');
  }

  /**
   * Generate fix recommendations
   */
  generateFixRecommendations() {
    const recommendations = [];

    if (this.diagnostics.errors.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Critical errors found',
        fixes: this.diagnostics.errors.map(error => `Fix: ${error}`)
      });
    }

    if (this.diagnostics.warnings.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Warnings found',
        fixes: this.diagnostics.warnings.map(warning => `Address: ${warning}`)
      });
    }

    // Add specific recommendations based on issues found
    if (this.diagnostics.errors.some(e => e.includes('Route data is null'))) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Route calculation failing',
        fixes: [
          'Check if productionRoutingService is properly initialized',
          'Verify origin and destination coordinates are valid',
          'Check for API rate limiting issues',
          'Ensure municipal datasets are loaded'
        ]
      });
    }

    if (this.diagnostics.errors.some(e => e.includes('coordinates'))) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Route geometry issues',
        fixes: [
          'Verify route calculation is returning valid GeoJSON',
          'Check if coordinates are in correct format [lng, lat]',
          'Ensure route has sufficient coordinate points'
        ]
      });
    }

    if (this.diagnostics.warnings.some(w => w.includes('distance') || w.includes('duration'))) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Route properties missing',
        fixes: [
          'Ensure route calculation sets distance and duration properties',
          'Add fallback calculations for missing properties',
          'Check route service implementation'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Apply automatic fixes
   */
  async applyFixes() {
    console.log('🔧 Applying automatic fixes...');
    
    const fixes = [];

    // Fix route data structure if possible
    if (this.diagnostics.routeData && this.diagnostics.routeData.features) {
      const firstFeature = this.diagnostics.routeData.features[0];
      
      // Add missing properties
      if (!firstFeature.properties) {
        firstFeature.properties = {};
        fixes.push('Added missing properties object');
      }

      // Calculate distance if missing
      if (!firstFeature.properties.distance && firstFeature.geometry?.coordinates) {
        const distance = this.calculateRouteDistance(firstFeature.geometry.coordinates);
        firstFeature.properties.distance = distance;
        fixes.push(`Calculated missing distance: ${distance}m`);
      }

      // Calculate duration if missing
      if (!firstFeature.properties.duration && firstFeature.properties.distance) {
        const duration = Math.round(firstFeature.properties.distance / 1.4); // ~1.4 m/s walking speed
        firstFeature.properties.duration = duration;
        fixes.push(`Calculated missing duration: ${duration}s`);
      }
    }

    console.log('✅ Applied fixes:', fixes);
    return fixes;
  }

  /**
   * Calculate route distance from coordinates
   */
  calculateRouteDistance(coordinates) {
    if (!coordinates || coordinates.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const [lng1, lat1] = coordinates[i - 1];
      const [lng2, lat2] = coordinates[i];
      
      // Simple distance calculation (not perfectly accurate but good enough)
      const distance = Math.sqrt(
        Math.pow(lng2 - lng1, 2) + Math.pow(lat2 - lat1, 2)
      ) * 111000; // Rough conversion to meters
      
      totalDistance += distance;
    }
    
    return Math.round(totalDistance);
  }

  /**
   * Get diagnostic summary
   */
  getSummary() {
    return {
      status: this.diagnostics.errors.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND',
      errorCount: this.diagnostics.errors.length,
      warningCount: this.diagnostics.warnings.length,
      errors: this.diagnostics.errors,
      warnings: this.diagnostics.warnings,
      recommendations: this.generateFixRecommendations()
    };
  }
}

// Create singleton instance
const routingDiagnosticService = new RoutingDiagnosticService();

export default routingDiagnosticService;
