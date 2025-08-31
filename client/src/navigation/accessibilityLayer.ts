// Accessibility Layer Service for Trek.IQ
// Manages loading and filtering of accessibility data along routes

export interface AccessibilityFeature {
  id: string;
  type: string;
  coordinates: [number, number];
  properties: {
    name?: string;
    wheelchair?: string;
    surface?: string;
    slope?: string;
    handrails?: boolean;
    automatic_doors?: boolean;
    audio_signal?: boolean;
    tactile_surface?: boolean;
    shelter?: boolean;
    audio_announcements?: boolean;
    changing_table?: boolean;
    emergency_call?: boolean;
    braille_buttons?: boolean;
    width?: string;
    spaces?: number;
    [key: string]: any;
  };
  distance?: number; // Distance from route
  isOnRoute?: boolean;
}

export interface RouteWarning {
  id: string;
  type: 'barrier' | 'closure' | 'steep_slope' | 'inaccessible';
  title: string;
  message: string;
  coordinates: [number, number];
  severity: 'low' | 'medium' | 'high';
  action?: string;
  distance?: number;
}

export class AccessibilityLayerService {
  private datasets: Map<string, any[]> = new Map();
  private routeBuffer: number = 100; // meters
  private isInitialized: boolean = false;

  // Initialize the service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadAllDatasets();
      this.isInitialized = true;
      console.log('Accessibility layer service initialized');
    } catch (error) {
      console.error('Failed to initialize accessibility layer service:', error);
      throw error;
    }
  }

  // Load all accessibility datasets
  private async loadAllDatasets(): Promise<void> {
    const datasetUrls = [
      '/api/data/accessible_parking.geojson',
      '/api/data/accessible_bathrooms.geojson',
      '/api/data/elevators.geojson',
      '/api/data/ramps.geojson',
      '/api/data/accessible_entrances.geojson',
      '/api/data/transit_stops.geojson',
      '/api/data/traffic_control.geojson',
      '/api/data/active_travelways.geojson',
      '/api/data/steps.geojson',
      '/api/data/sidewalk_closures.geojson'
    ];

    const loadPromises = datasetUrls.map(url => this.loadDataset(url));
    await Promise.allSettled(loadPromises);
  }

  // Load a single dataset
  private async loadDataset(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load ${url}: ${response.statusText}`);
      }

      const data = await response.json();
      const datasetName = url.split('/').pop()?.replace('.geojson', '') || 'unknown';
      
      this.datasets.set(datasetName, data.features || []);
      console.log(`Loaded ${datasetName}: ${data.features?.length || 0} features`);
    } catch (error) {
      console.warn(`Failed to load dataset ${url}:`, error);
      this.datasets.set(url.split('/').pop()?.replace('.geojson', '') || 'unknown', []);
    }
  }

  // Get accessibility features along a route
  async getAccessibilityFeaturesAlongRoute(
    routeCoordinates: [number, number][],
    enabledLayers: string[] = []
  ): Promise<AccessibilityFeature[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const features: AccessibilityFeature[] = [];
    const routeBuffer = this.createRouteBuffer(routeCoordinates, this.routeBuffer);

    // Process each enabled layer
    for (const layerName of enabledLayers) {
      const dataset = this.datasets.get(layerName);
      if (!dataset) continue;

      const layerFeatures = this.filterFeaturesByRoute(dataset, routeBuffer, routeCoordinates);
      features.push(...layerFeatures);
    }

    // Sort by distance from route
    features.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return features;
  }

  // Create a buffer around the route
  private createRouteBuffer(
    coordinates: [number, number][], 
    bufferMeters: number
  ): [number, number, number, number] {
    if (coordinates.length === 0) {
      return [-180, -90, 180, 90];
    }

    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    for (const [lng, lat] of coordinates) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    // Add buffer (rough approximation: 1 degree ≈ 111km)
    const bufferDegrees = bufferMeters / 111000;
    
    return [
      minLng - bufferDegrees,
      minLat - bufferDegrees,
      maxLng + bufferDegrees,
      maxLat + bufferDegrees
    ];
  }

  // Filter features by route buffer and calculate distances
  private filterFeaturesByRoute(
    features: any[],
    buffer: [number, number, number, number],
    routeCoordinates: [number, number][]
  ): AccessibilityFeature[] {
    const [minLng, minLat, maxLng, maxLat] = buffer;
    const filtered: AccessibilityFeature[] = [];

    for (const feature of features) {
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) continue;

      const [lng, lat] = coords;

      // Check if feature is within buffer
      if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
        // Calculate distance to route
        const distance = this.calculateDistanceToRoute([lng, lat], routeCoordinates);
        
        if (distance <= this.routeBuffer) {
          filtered.push({
            id: feature.id || `${feature.type}_${lng}_${lat}`,
            type: feature.properties.type || 'unknown',
            coordinates: [lng, lat],
            properties: feature.properties,
            distance,
            isOnRoute: distance < 10 // Within 10m considered "on route"
          });
        }
      }
    }

    return filtered;
  }

  // Calculate distance from point to route
  private calculateDistanceToRoute(
    point: [number, number],
    routeCoordinates: [number, number][]
  ): number {
    if (routeCoordinates.length === 0) return Infinity;

    let minDistance = Infinity;

    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentStart = routeCoordinates[i];
      const segmentEnd = routeCoordinates[i + 1];
      
      const distance = this.distanceToSegment(point, segmentStart, segmentEnd);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  // Calculate distance from point to line segment
  private distanceToSegment(
    point: [number, number],
    segmentStart: [number, number],
    segmentEnd: [number, number]
  ): number {
    const [px, py] = point;
    const [x1, y1] = segmentStart;
    const [x2, y2] = segmentEnd;

    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) {
      // Segment is a point
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    let param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;

    // Convert to meters (rough approximation)
    return Math.sqrt(dx * dx + dy * dy) * 111000;
  }

  // Check for route warnings (barriers, closures, etc.)
  async getRouteWarnings(
    routeCoordinates: [number, number][],
    routeMode: 'walking' | 'driving' | 'transit'
  ): Promise<RouteWarning[]> {
    const warnings: RouteWarning[] = [];

    // Check for steps (barrier for walking)
    if (routeMode === 'walking') {
      const steps = this.datasets.get('steps') || [];
      const stepsWarnings = this.checkStepsOnRoute(steps, routeCoordinates);
      warnings.push(...stepsWarnings);
    }

    // Check for closures
    const closures = this.datasets.get('sidewalk_closures') || [];
    const closureWarnings = this.checkClosuresOnRoute(closures, routeCoordinates);
    warnings.push(...closureWarnings);

    // Check for steep slopes
    const ramps = this.datasets.get('ramps') || [];
    const slopeWarnings = this.checkSteepSlopes(ramps, routeCoordinates);
    warnings.push(...slopeWarnings);

    return warnings;
  }

  // Check for steps on walking route
  private checkStepsOnRoute(
    steps: any[],
    routeCoordinates: [number, number][]
  ): RouteWarning[] {
    const warnings: RouteWarning[] = [];
    const buffer = this.createRouteBuffer(routeCoordinates, 50); // 50m buffer

    for (const step of steps) {
      if (step.geometry.type === 'LineString') {
        const stepCoords = step.geometry.coordinates;
        const distance = this.calculateDistanceToRoute(stepCoords[0], routeCoordinates);
        
        if (distance <= 50) {
          warnings.push({
            id: `step_${step.id || 'unknown'}`,
            type: 'barrier',
            title: 'Steps Detected',
            message: `Steps found on route: ${step.properties.name || 'Unknown location'}`,
            coordinates: stepCoords[0],
            severity: 'high',
            action: 'Re-route',
            distance
          });
        }
      }
    }

    return warnings;
  }

  // Check for closures on route
  private checkClosuresOnRoute(
    closures: any[],
    routeCoordinates: [number, number][]
  ): RouteWarning[] {
    const warnings: RouteWarning[] = [];

    for (const closure of closures) {
      if (closure.geometry.type === 'LineString') {
        const closureCoords = closure.geometry.coordinates;
        const distance = this.calculateDistanceToRoute(closureCoords[0], routeCoordinates);
        
        if (distance <= 100) {
          warnings.push({
            id: `closure_${closure.id || 'unknown'}`,
            type: 'closure',
            title: 'Route Closure',
            message: `Route closure: ${closure.properties.name || 'Unknown closure'}`,
            coordinates: closureCoords[0],
            severity: 'high',
            action: 'Re-route',
            distance
          });
        }
      }
    }

    return warnings;
  }

  // Check for steep slopes
  private checkSteepSlopes(
    ramps: any[],
    routeCoordinates: [number, number][]
  ): RouteWarning[] {
    const warnings: RouteWarning[] = [];

    for (const ramp of ramps) {
      const slope = ramp.properties.slope;
      if (slope) {
        const slopeValue = parseFloat(slope.replace('%', ''));
        if (slopeValue > 8.33) { // ADA maximum is 8.33%
          const distance = this.calculateDistanceToRoute(ramp.geometry.coordinates, routeCoordinates);
          
          if (distance <= 100) {
            warnings.push({
              id: `slope_${ramp.id || 'unknown'}`,
              type: 'steep_slope',
              title: 'Steep Slope',
              message: `Steep slope detected: ${slope} (exceeds ADA guidelines)`,
              coordinates: ramp.geometry.coordinates,
              severity: 'medium',
              action: 'Consider alternative route',
              distance
            });
          }
        }
      }
    }

    return warnings;
  }

  // Get available layer names
  getAvailableLayers(): string[] {
    return Array.from(this.datasets.keys());
  }

  // Reload datasets
  async reloadDatasets(): Promise<void> {
    this.datasets.clear();
    this.isInitialized = false;
    await this.initialize();
  }

  // Set route buffer distance
  setRouteBuffer(meters: number): void {
    this.routeBuffer = Math.max(10, Math.min(500, meters));
  }
}

// Create singleton instance
export const accessibilityLayerService = new AccessibilityLayerService();
