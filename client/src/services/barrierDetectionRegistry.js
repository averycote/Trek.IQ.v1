/**
 * Barrier Detection Registry
 * 
 * Manages barrier detection services and provides unified barrier detection
 */

class BarrierDetectionRegistry {
  constructor() {
    this.isInitialized = false;
    this.detectors = new Map();
    this.barriers = [];
  }

  /**
   * Initialize the registry
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Barrier Detection Registry...');
    
    // Register default barrier detectors
    this.registerDetector('steps', this.detectSteps.bind(this));
    this.registerDetector('slopes', this.detectSlopes.bind(this));
    this.registerDetector('closures', this.detectClosures.bind(this));
    this.registerDetector('narrow_paths', this.detectNarrowPaths.bind(this));
    
    this.isInitialized = true;
    console.log('✅ Barrier Detection Registry initialized');
  }

  /**
   * Register a barrier detector
   */
  registerDetector(name, detector) {
    this.detectors.set(name, detector);
    console.log(`📝 Registered barrier detector: ${name}`);
  }

  /**
   * Detect barriers along a route
   */
  async detectBarriers(route, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const barriers = [];
    
    for (const [name, detector] of this.detectors) {
      try {
        const detectedBarriers = await detector(route, options);
        barriers.push(...detectedBarriers);
          } catch (error) {
        console.error(`❌ Error in barrier detector ${name}:`, error);
      }
    }

    this.barriers = barriers;
    return barriers;
  }

  /**
   * Detect steps along route
   */
  async detectSteps(route, options = {}) {
    const barriers = [];
    
    // This is a simplified implementation
    // In a real implementation, you would analyze the route geometry
    // and check against municipal data for steps
    
    if (options.avoidSteps) {
      barriers.push({
        type: 'steps',
        severity: 'high',
        message: 'Route may contain steps - verify accessibility',
        location: 'unknown',
        coordinates: null
      });
    }
    
    return barriers;
  }

  /**
   * Detect steep slopes along route
   */
  async detectSlopes(route, options = {}) {
    const barriers = [];
    
    if (options.avoidSteepSlopes) {
      barriers.push({
        type: 'steep_slope',
        severity: 'medium',
        message: 'Route may contain steep slopes - verify accessibility',
        location: 'unknown',
        coordinates: null
      });
    }
    
    return barriers;
  }

  /**
   * Detect closures along route
   */
  async detectClosures(route, options = {}) {
    const barriers = [];
    
    // Check for known closures
    // This would integrate with municipal data
    
    return barriers;
  }

  /**
   * Detect narrow paths along route
   */
  async detectNarrowPaths(route, options = {}) {
    const barriers = [];
    
    if (options.preferWidePaths) {
      barriers.push({
        type: 'narrow_path',
        severity: 'low',
        message: 'Route may contain narrow paths - verify accessibility',
        location: 'unknown',
        coordinates: null
      });
    }
    
    return barriers;
  }

  /**
   * Get all detected barriers
   */
  getBarriers() {
    return this.barriers;
  }

  /**
   * Clear all barriers
   */
  clearBarriers() {
    this.barriers = [];
  }
}

// Create singleton instance
const barrierDetectionRegistry = new BarrierDetectionRegistry();

export default barrierDetectionRegistry;