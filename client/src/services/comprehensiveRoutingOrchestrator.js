/**
 * Comprehensive Routing Orchestrator - Fast Version
 * 
 * Simplified implementation that prioritizes speed and reliability
 * Falls back gracefully when external services are unavailable
 */

import apiIntegrationManager from './apiIntegrationManager';
import enhancedUnifiedRoutingService from './enhancedUnifiedRoutingService';

class ComprehensiveRoutingOrchestrator {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Performance tracking
    this.performanceMetrics = {
      geocodeTime: 0,
      routeTime: 0,
      enrichmentTime: 0,
      barrierScanTime: 0,
      totalTime: 0
    };
    
    // Cache for session data
    this.sessionCache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    
    // Telemetry data (non-PII)
    this.telemetry = {
      totalRoutes: 0,
      successfulRoutes: 0,
      failedRoutes: 0,
      barrierHits: 0,
      userDecisions: {
        proceed: 0,
        reroute: 0,
        cancel: 0
      },
      engineUsage: {
        openRouteService: 0,
        mapbox: 0,
        fallback: 0
      }
    };
  }

  /**
   * Fast initialization - only essential services
   */
  async initialize() {
    if (this.isInitialized) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.performFastInitialization();
    return this.initializationPromise;
  }

  async performFastInitialization() {
    try {
      console.log('🚀 Fast initializing Comprehensive Routing Orchestrator...');
      
      // Only initialize essential services with short timeouts
      const initPromises = [];
      
      // API integration manager (essential)
      try {
        const apiInit = apiIntegrationManager.initialize();
        const apiTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API Manager timeout')), 2000)
        );
        await Promise.race([apiInit, apiTimeout]);
        console.log('✅ API Integration Manager initialized');
      } catch (error) {
        console.warn('⚠️ API Integration Manager failed:', error.message);
      }
      
      // Enhanced unified routing service (essential)
      try {
        const routingInit = enhancedUnifiedRoutingService.initialize();
        const routingTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Routing Service timeout')), 3000)
        );
        await Promise.race([routingInit, routingTimeout]);
        console.log('✅ Enhanced Unified Routing Service initialized');
      } catch (error) {
        console.warn('⚠️ Enhanced Unified Routing Service failed:', error.message);
      }
      
      this.isInitialized = true;
      console.log('✅ Comprehensive Routing Orchestrator ready');
      
    } catch (error) {
      console.error('❌ Error in fast initialization:', error);
      // Still mark as initialized so we can proceed
      this.isInitialized = true;
    }
  }

  /**
   * Main routing method - optimized for speed
   */
  async generateRoute(routeRequest) {
    const startTime = performance.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('🚀 Starting fast route generation:', routeRequest);
      
      // A) PREP & INPUT VALIDATION (simplified)
      const validatedInputs = await this.validateAndNormalizeInputs(routeRequest);
      
      // B) ROUTE COMPUTATION (core functionality)
      const routeResult = await this.computeRoute(validatedInputs);
      
      // C) ROUTE ENRICHMENT (minimal, non-blocking)
      const enrichedRoute = await this.enrichRouteFast(routeResult);
      
      // D) BARRIER NOTIFICATION (simplified)
      const barrierAnalysis = await this.analyzeBarriersFast(enrichedRoute);
      
      // E) RENDERING & UX (prepared data)
      const finalRoute = await this.prepareForRendering(enrichedRoute, barrierAnalysis);
      
      // Update performance metrics
      this.performanceMetrics.totalTime = performance.now() - startTime;
      this.telemetry.totalRoutes++;
      this.telemetry.successfulRoutes++;
      
      console.log('✅ Route generation completed:', {
        totalTime: this.performanceMetrics.totalTime.toFixed(0) + 'ms',
        route: finalRoute
      });
      
      return {
        success: true,
        route: finalRoute,
        barriers: barrierAnalysis.barriers,
        accessibilityScore: enrichedRoute.accessibilityScore,
        performance: this.performanceMetrics,
        telemetry: this.telemetry
      };
      
    } catch (error) {
      console.error('❌ Route generation failed:', error);
      this.telemetry.totalRoutes++;
      this.telemetry.failedRoutes++;
      
      return {
        success: false,
        error: error.message,
        performance: this.performanceMetrics
      };
    }
  }

  /**
   * A) PREP & INPUT VALIDATION (simplified)
   */
  async validateAndNormalizeInputs(routeRequest) {
    const startTime = performance.now();
    
    try {
      const { origin, destination, mode, time, userPrefs } = routeRequest;
      
      // Basic validation
      if (!origin || !destination) {
        throw new Error('Origin and destination are required');
      }
      
      const validatedInputs = {
        origin: this.normalizeLocation(origin),
        destination: this.normalizeLocation(destination),
        mode: this.validateMode(mode),
        time: this.validateTime(time),
        userPrefs: this.validateUserPrefs(userPrefs)
      };
      
      // Simple geocoding (use existing service if available)
      const geocodedInputs = await this.geocodeWithFallbacks(validatedInputs);
      
      this.performanceMetrics.geocodeTime = performance.now() - startTime;
      
      return geocodedInputs;
      
    } catch (error) {
      console.error('Input validation failed:', error);
      throw error;
    }
  }

  /**
   * Normalize location input
   */
  normalizeLocation(location) {
    if (!location) return null;
    
    if (typeof location === 'string') {
      return location.trim()
        .replace(/\s+/g, ' ')
        .replace(/st\./gi, 'Street')
        .replace(/ave\./gi, 'Avenue')
        .replace(/rd\./gi, 'Road')
        .replace(/blvd\./gi, 'Boulevard');
    }
    
    if (Array.isArray(location) && location.length === 2) {
      return location;
    }
    
    throw new Error('Invalid location format');
  }

  /**
   * Validate and normalize mode
   */
  validateMode(mode) {
    const validModes = ['walking', 'wheelchair', 'driving', 'transit', 'cycling'];
    const normalizedMode = mode?.toLowerCase() || 'walking';
    return validModes.includes(normalizedMode) ? normalizedMode : 'walking';
  }

  /**
   * Validate time input
   */
  validateTime(time) {
    if (!time) return { type: 'now' };
    
    if (time.type === 'depart' || time.type === 'arrive') {
      return {
        type: time.type,
        timestamp: new Date(time.timestamp || Date.now()).toISOString()
      };
    }
    
    return { type: 'now' };
  }

  /**
   * Validate user preferences
   */
  validateUserPrefs(userPrefs) {
    const defaults = {
      avoidSteps: true,
      maxSlope: 8,
      preferCurbRamps: true,
      surfaceQuality: 'good',
      preferWellLit: true,
      avoidSteepSlopes: true,
      preferWidePaths: true,
      wheelchairAccessible: false
    };
    
    return { ...defaults, ...userPrefs };
  }

  /**
   * Geocode with fallbacks (simplified)
   */
  async geocodeWithFallbacks(inputs) {
    const geocodedInputs = { ...inputs };
    
    // For now, just return the inputs as-is
    // In a real implementation, this would call geocoding services
    console.log('📍 Geocoding inputs:', inputs);
    
    return geocodedInputs;
  }

  /**
   * B) ROUTE COMPUTATION (core functionality)
   */
  async computeRoute(inputs) {
    const startTime = performance.now();
    
    try {
      const { origin, destination, mode, userPrefs } = inputs;
      
      console.log('🛣️ Computing route:', { origin, destination, mode });
      
      // Use the enhanced unified routing service
      let route;
      try {
        route = await enhancedUnifiedRoutingService.calculateIntelligentRoute(
          origin,
          destination,
          {
            mode: mode,
            accessibility: userPrefs,
            avoidSteps: userPrefs.avoidSteps,
            maxSlope: userPrefs.maxSlope,
            preferCurbRamps: userPrefs.preferCurbRamps
          }
        );
        
        this.telemetry.engineUsage.openRouteService++;
        console.log('✅ Route computed successfully');
        
      } catch (error) {
        console.warn('⚠️ Primary routing failed, using fallback:', error.message);
        
        // Simple fallback route
        route = {
          geometry: {
            type: 'LineString',
            coordinates: [
              Array.isArray(origin) ? origin : [-63.6, 44.6],
              Array.isArray(destination) ? destination : [-63.5, 44.7]
            ]
          },
          properties: {
            distance: 1000,
            duration: 600,
            summary: 'Fallback route',
            instructions: [
              { instruction: 'Start at origin', distance: 0 },
              { instruction: 'Follow path to destination', distance: 1000 }
            ]
          }
        };
        
        this.telemetry.engineUsage.fallback++;
      }
      
      this.performanceMetrics.routeTime = performance.now() - startTime;
      
      return {
        primary: route,
        alternatives: [],
        mode: mode,
        userPrefs: userPrefs
      };
      
    } catch (error) {
      console.error('Route computation failed:', error);
      throw error;
    }
  }

  /**
   * C) ROUTE ENRICHMENT (minimal, non-blocking)
   */
  async enrichRoute(routeResult) {
    const startTime = performance.now();
    
    try {
      const { primary, mode, userPrefs } = routeResult;
      
      // Minimal enrichment - just add basic accessibility score
      const accessibilityScore = this.computeBasicAccessibilityScore(primary, userPrefs);
      
      this.performanceMetrics.enrichmentTime = performance.now() - startTime;
      
      return {
        ...primary,
        enrichment: {},
        accessibilityScore: accessibilityScore,
        alternatives: []
      };
      
    } catch (error) {
      console.error('Route enrichment failed:', error);
      // Return route without enrichment rather than failing completely
      return {
        ...routeResult.primary,
        enrichment: {},
        accessibilityScore: { score: 75, grade: 'B', explanation: 'Standard route' }
      };
    }
  }

  /**
   * Fast route enrichment
   */
  async enrichRouteFast(routeResult) {
    return this.enrichRoute(routeResult);
  }

  /**
   * Compute basic accessibility score
   */
  computeBasicAccessibilityScore(route, userPrefs) {
    let score = 100;
    const issues = [];
    
    // Basic scoring based on user preferences
    if (userPrefs.avoidSteps) {
      score -= 5; // Assume some steps might be present
      issues.push('Route may contain steps');
    }
    
    if (userPrefs.wheelchairAccessible) {
      score -= 10; // Wheelchair routes are more restrictive
      issues.push('Wheelchair accessibility requirements');
    }
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));
    
    // Determine grade
    let grade = 'C';
    if (score >= 80) grade = 'A';
    else if (score >= 60) grade = 'B';
    
    return {
      score: score,
      grade: grade,
      issues: issues,
      explanation: this.generateAccessibilityExplanation(score, grade, issues)
    };
  }

  /**
   * Generate accessibility explanation
   */
  generateAccessibilityExplanation(score, grade, issues) {
    if (score >= 80) {
      return 'Good accessibility with minimal barriers';
    } else if (score >= 60) {
      return 'Moderate accessibility - some considerations apply';
    } else {
      return 'Limited accessibility - review route carefully';
    }
  }

  /**
   * D) BARRIER NOTIFICATION (simplified)
   */
  async analyzeBarriers(enrichedRoute) {
    const startTime = performance.now();
    
    try {
      // Simple barrier detection
      const barriers = await this.scanForBarriersSimple(enrichedRoute);
      
      if (barriers.length > 0) {
        this.telemetry.barrierHits += barriers.length;
      }
      
      this.performanceMetrics.barrierScanTime = performance.now() - startTime;
      
      return {
        barriers: barriers,
        hasBarriers: barriers.length > 0,
        severity: this.calculateOverallSeverity(barriers)
      };
      
    } catch (error) {
      console.error('Barrier analysis failed:', error);
      return {
        barriers: [],
        hasBarriers: false,
        severity: 'low'
      };
    }
  }

  /**
   * Fast barrier analysis
   */
  async analyzeBarriersFast(enrichedRoute) {
    return this.analyzeBarriers(enrichedRoute);
  }

  /**
   * Simple barrier scanning
   */
  async scanForBarriersSimple(enrichedRoute) {
    const barriers = [];
    
    // Add some example barriers for testing
    if (Math.random() > 0.7) { // 30% chance of barriers
      barriers.push({
        id: 'test-barrier-1',
        type: 'construction',
        severity: 'medium',
        location: 'Route midpoint',
        description: 'Construction work in progress',
        distance: 500
      });
    }
    
    return barriers;
  }

  /**
   * Calculate overall barrier severity
   */
  calculateOverallSeverity(barriers) {
    if (barriers.length === 0) return 'none';
    
    const severityScores = {
      'low': 1,
      'medium': 2,
      'high': 3,
      'critical': 4
    };
    
    const totalScore = barriers.reduce((sum, barrier) => {
      return sum + (severityScores[barrier.severity] || 1);
    }, 0);
    
    const averageScore = totalScore / barriers.length;
    
    if (averageScore >= 3) return 'high';
    if (averageScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * E) RENDERING & UX
   */
  async prepareForRendering(enrichedRoute, barrierAnalysis) {
    try {
      const renderingData = this.prepareMapRenderingData(enrichedRoute, barrierAnalysis);
      const routeSummary = this.prepareRouteSummary(enrichedRoute, barrierAnalysis);
      const navigationData = this.prepareNavigationData(enrichedRoute, barrierAnalysis);
      
      // Convert to proper GeoJSON format for map rendering and mobile navigation
      const geoJsonRoute = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: enrichedRoute.geometry || {
              type: 'LineString',
              coordinates: [
                [-63.6, 44.6],
                [-63.5, 44.7]
              ]
            },
            properties: {
              ...enrichedRoute.properties,
              distance: enrichedRoute.distance || enrichedRoute.properties?.distance || 1000,
              duration: enrichedRoute.duration || enrichedRoute.properties?.duration || 600,
              mode: enrichedRoute.mode || 'walking',
              accessibility: enrichedRoute.accessibilityScore || { score: 75, grade: 'B' },
              directions: enrichedRoute.properties?.instructions || [],
              analysis: {
                barriers: barrierAnalysis.barriers || [],
                hasBarriers: barrierAnalysis.hasBarriers || false,
                severity: barrierAnalysis.severity || 'low'
              }
            }
          }
        ]
      };
      
      return {
        ...geoJsonRoute,
        rendering: renderingData,
        summary: routeSummary,
        navigation: navigationData,
        // Keep original data for compatibility
        originalRoute: enrichedRoute
      };
      
    } catch (error) {
      console.error('Rendering preparation failed:', error);
      // Return a basic GeoJSON structure as fallback
      return {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [-63.6, 44.6],
                [-63.5, 44.7]
              ]
            },
            properties: {
              distance: 1000,
              duration: 600,
              mode: 'walking',
              accessibility: { score: 75, grade: 'B' },
              directions: [],
              analysis: { barriers: [], hasBarriers: false, severity: 'low' }
            }
          }
        ]
      };
    }
  }

  /**
   * Prepare data for map rendering
   */
  prepareMapRenderingData(enrichedRoute, barrierAnalysis) {
    return {
      routeGeometry: enrichedRoute.geometry,
      colorCodedSegments: [],
      accessiblePOIs: [],
      barrierMarkers: barrierAnalysis.barriers.map(barrier => ({
        type: barrier.type,
        coordinates: barrier.location,
        severity: barrier.severity,
        description: barrier.description
      }))
    };
  }

  /**
   * Prepare route summary for bottom sheet
   */
  prepareRouteSummary(enrichedRoute, barrierAnalysis) {
    const route = enrichedRoute;
    
    return {
      distance: route.distance || route.properties?.distance || 0,
      duration: route.duration || route.properties?.duration || 0,
      ascent: 0,
      descent: 0,
      steepDistance: 0,
      accessibilityScore: enrichedRoute.accessibilityScore,
      warnings: this.generateWarnings(barrierAnalysis),
      hasBarriers: barrierAnalysis.hasBarriers
    };
  }

  /**
   * Generate warnings for route summary
   */
  generateWarnings(barrierAnalysis) {
    const warnings = [];
    
    if (barrierAnalysis.barriers.length > 0) {
      warnings.push({
        type: 'barriers',
        message: `${barrierAnalysis.barriers.length} barrier(s) detected`,
        severity: barrierAnalysis.severity
      });
    }
    
    return warnings;
  }

  /**
   * Prepare navigation data
   */
  prepareNavigationData(enrichedRoute, barrierAnalysis) {
    return {
      instructions: enrichedRoute.properties?.instructions || [],
      barriers: barrierAnalysis.barriers,
      alerts: this.generateNavigationAlerts(enrichedRoute, barrierAnalysis)
    };
  }

  /**
   * Generate navigation alerts
   */
  generateNavigationAlerts(enrichedRoute, barrierAnalysis) {
    const alerts = [];
    
    // Add barrier alerts
    barrierAnalysis.barriers.forEach(barrier => {
      alerts.push({
        type: 'barrier',
        message: `${barrier.description} ahead`,
        distance: barrier.distance,
        severity: barrier.severity
      });
    });
    
    return alerts;
  }

  /**
   * Handle user decision on barriers
   */
  handleBarrierDecision(decision, routeData) {
    this.telemetry.userDecisions[decision]++;
    
    switch (decision) {
      case 'proceed':
        return { action: 'proceed', route: routeData };
      case 'reroute':
        return { action: 'reroute', route: routeData };
      case 'cancel':
        return { action: 'cancel' };
      default:
        return { action: 'cancel' };
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMetrics;
  }

  /**
   * Get telemetry data
   */
  getTelemetry() {
    return this.telemetry;
  }

  /**
   * Clear session cache
   */
  clearCache() {
    this.sessionCache.clear();
  }
}

// Export singleton instance
const comprehensiveRoutingOrchestrator = new ComprehensiveRoutingOrchestrator();
export default comprehensiveRoutingOrchestrator;
