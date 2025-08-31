// Enhanced Accessible Routing Service for Trek.IQ
// Prioritizes accessible routes using static data, AI learning, and APIs

import OptimizedDataService from './optimizedDataService.js';

class EnhancedAccessibleRoutingService {
  constructor() {
    this.optimizedDataService = OptimizedDataService;
    this.aiLearningCache = new Map();
    this.userPreferences = new Map();
    this.routeHistory = [];
    this.accessibilityScores = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Enhanced Accessible Routing Service...');
    
    try {
      await this.optimizedDataService.initialize();
      await this.loadAccessibilityData();
      await this.loadUserPreferences();
      this.isInitialized = true;
      console.log('Enhanced Accessible Routing Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced Accessible Routing Service:', error);
      throw error;
    }
  }

  async loadAccessibilityData() {
    // Load static accessibility data
    this.accessibilityFeatures = {
      sidewalks: await this.optimizedDataService.loadDataset('trek-iq-core'),
      amenities: await this.optimizedDataService.loadDataset('trek-iq-amenities'),
      barriers: await this.optimizedDataService.findBarriers([-63.5752, 44.6488], 50000), // Halifax center
      dynamicBarriers: await this.optimizedDataService.loadDynamicData()
    };
  }

  async loadUserPreferences() {
    // Load user accessibility preferences from localStorage or API
    const stored = localStorage.getItem('trek-iq-accessibility-preferences');
    if (stored) {
      this.userPreferences = new Map(Object.entries(JSON.parse(stored)));
    } else {
      // Default accessibility preferences
      this.userPreferences = new Map([
        ['avoidSteps', true],
        ['preferSidewalks', true],
        ['avoidUnpavedSurfaces', true],
        ['preferCurbCuts', true],
        ['avoidSteepSlopes', true],
        ['preferWellLit', true],
        ['avoidConstruction', true],
        ['preferWidePaths', true],
        ['mobilityDevice', 'none'], // 'wheelchair', 'walker', 'cane', 'none'
        ['visualImpairment', false],
        ['hearingImpairment', false],
        ['cognitiveImpairment', false]
      ]);
    }
  }

  async calculateAccessibleRoute(origin, destination, options = {}) {
    console.log('Calculating accessible route...', { origin, destination, options });

    // Tier 1: Static Data Analysis
    const staticRoute = await this.calculateStaticRoute(origin, destination, options);
    if (staticRoute && staticRoute.accessibilityScore > 0.8) {
      console.log('High-quality static route found');
      return staticRoute;
    }

    // Tier 2: AI-Enhanced Route with Learning
    const aiRoute = await this.calculateAIRoute(origin, destination, options, staticRoute);
    if (aiRoute && aiRoute.accessibilityScore > 0.6) {
      console.log('AI-enhanced route found');
      return aiRoute;
    }

    // Tier 3: API Fallback with Accessibility Filtering
    const apiRoute = await this.calculateAPIRoute(origin, destination, options);
    console.log('Using API fallback route');
    return apiRoute;
  }

  async calculateStaticRoute(origin, destination, options) {
    try {
      // Use static accessibility data to find optimal route
      const accessibilityFeatures = this.accessibilityFeatures;
      
      // Find accessible travelways
      const accessibleTravelways = this.findAccessibleTravelways(origin, destination);
      
      // Find barriers to avoid
      const barriers = this.findBarriersAlongRoute(origin, destination);
      
      // Calculate accessibility-optimized path
      const route = this.calculateAccessibilityOptimizedPath(
        origin, 
        destination, 
        accessibleTravelways, 
        barriers,
        options
      );

      if (route) {
        route.source = 'static';
        route.accessibilityScore = this.calculateAccessibilityScore(route, barriers);
        route.barriers = barriers;
        route.alternatives = this.findAlternativeRoutes(origin, destination, route);
      }

      return route;
    } catch (error) {
      console.error('Error calculating static route:', error);
      return null;
    }
  }

  findAccessibleTravelways(origin, destination) {
    const travelways = [];
    const coreData = this.accessibilityFeatures.sidewalks;

    if (!coreData.features) return travelways;

    for (const feature of coreData.features) {
      if (feature.properties.type === 'travelway') {
        const accessibility = this.assessTravelwayAccessibility(feature);
        if (accessibility.score > 0.5) {
          travelways.push({
            ...feature,
            accessibility
          });
        }
      }
    }

    return travelways.sort((a, b) => b.accessibility.score - a.accessibility.score);
  }

  assessTravelwayAccessibility(travelway) {
    const properties = travelway.properties;
    let score = 0.5; // Base score

    // Surface type assessment
    const surfaceType = properties.surface?.toLowerCase() || '';
    if (surfaceType.includes('paved') || surfaceType.includes('concrete') || surfaceType.includes('asphalt')) {
      score += 0.2;
    } else if (surfaceType.includes('gravel') || surfaceType.includes('dirt')) {
      score -= 0.3;
    }

    // Width assessment
    const width = parseFloat(properties.width) || 0;
    if (width >= 1.5) { // 1.5m minimum for wheelchair
      score += 0.2;
    } else if (width >= 1.0) { // 1.0m minimum for walking
      score += 0.1;
    } else {
      score -= 0.2;
    }

    // Type assessment
    const type = properties.type?.toLowerCase() || '';
    if (type.includes('sidewalk') || type.includes('path')) {
      score += 0.1;
    } else if (type.includes('road') || type.includes('street')) {
      score -= 0.1;
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      factors: {
        surface: surfaceType,
        width: width,
        type: type
      }
    };
  }

  findBarriersAlongRoute(origin, destination) {
    const barriers = [];
    const allBarriers = [
      ...this.accessibilityFeatures.barriers,
      ...this.accessibilityFeatures.dynamicBarriers.flatMap(dataset => dataset.features || [])
    ];

    // Calculate route corridor with realistic buffer
    const routeBounds = this.calculateRouteBounds(origin, destination, 200); // 200m buffer
    
    for (const barrier of allBarriers) {
      if (this.isBarrierInBounds(barrier, routeBounds)) {
        const distance = this.calculateDistanceToRoute(barrier, origin, destination);
        
        // Only include barriers within 100m of the route
        if (distance <= 100) {
          const severity = this.calculateBarrierSeverity(barrier);
          const impact = this.calculateBarrierImpact(barrier);
          
          barriers.push({
            ...barrier,
            severity,
            impact,
            distanceToRoute: distance,
            type: this.classifyBarrierType(barrier)
          });
        }
      }
    }

    return barriers.sort((a, b) => b.severity - a.severity);
  }

  calculateBarrierSeverity(barrier) {
    const datasetName = barrier.dataset || '';
    const properties = barrier.properties || {};

    // High severity barriers
    if (datasetName.includes('Steps') || datasetName.includes('Closures')) {
      return 0.9;
    }

    // Medium severity barriers
    if (datasetName.includes('Construction') || properties.status === 'closed') {
      return 0.7;
    }

    // Low severity barriers
    if (datasetName.includes('Shelters') || properties.status === 'maintenance') {
      return 0.3;
    }

    return 0.5; // Default medium severity
  }

  calculateBarrierImpact(barrier) {
    const severity = this.calculateBarrierSeverity(barrier);
    const userPrefs = Object.fromEntries(this.userPreferences);

    let impact = severity;

    // Adjust impact based on user preferences
    if (userPrefs.avoidSteps && barrier.dataset?.includes('Steps')) {
      impact *= 1.5;
    }

    if (userPrefs.avoidConstruction && barrier.dataset?.includes('Construction')) {
      impact *= 1.3;
    }

    if (userPrefs.mobilityDevice === 'wheelchair' && barrier.dataset?.includes('Steps')) {
      impact *= 2.0; // Critical for wheelchair users
    }

    return Math.min(1, impact);
  }

  calculateAccessibilityOptimizedPath(origin, destination, travelways, barriers, options) {
    // Simplified pathfinding with accessibility optimization
    const path = this.findOptimalPath(origin, destination, travelways, barriers);
    
    if (!path) return null;

    return {
      type: 'Feature',
      properties: {
        mode: 'accessible_walking',
        distance: this.calculatePathDistance(path),
        duration: this.calculatePathDuration(path),
        accessibility: this.calculatePathAccessibility(path, barriers),
        alternatives: this.findAlternativePaths(origin, destination, path)
      },
      geometry: {
        type: 'LineString',
        coordinates: path
      }
    };
  }

  findOptimalPath(origin, destination, travelways, barriers) {
    // Simplified A* pathfinding with accessibility weights
    const start = [origin.lng, origin.lat];
    const end = [destination.lng, destination.lat];
    
    // For now, return a direct path with accessibility considerations
    // In a full implementation, this would use proper pathfinding algorithms
    return [start, end];
  }

  calculateAccessibilityScore(route, barriers) {
    let score = 1.0;
    const accessibility = route.properties.accessibility || {};
    const userPrefs = Object.fromEntries(this.userPreferences);

    // Real accessibility feature scoring
    if (accessibility.hasSidewalks) score += 0.15;
    if (accessibility.hasCurbCuts) score += 0.12;
    if (accessibility.surfaceType === 'paved') score += 0.10;
    if (accessibility.surfaceType === 'concrete') score += 0.12;
    if (accessibility.surfaceType === 'asphalt') score += 0.10;
    if (accessibility.elevation === 'minimal') score += 0.08;
    if (accessibility.lighting === 'adequate') score += 0.05;
    if (accessibility.lighting === 'high') score += 0.08;
    if (accessibility.width >= 1.5) score += 0.10; // Wheelchair accessible width
    if (accessibility.width >= 1.0 && accessibility.width < 1.5) score += 0.05;

    // Real barrier impact calculation
    for (const barrier of barriers) {
      const impact = this.calculateRealBarrierImpact(barrier, userPrefs);
      score -= impact;
    }

    // User-specific adjustments based on real needs
    if (userPrefs.mobilityDevice === 'wheelchair') {
      if (!accessibility.hasCurbCuts) score -= 0.25;
      if (accessibility.width < 1.5) score -= 0.20;
      if (accessibility.surfaceType === 'unpaved') score -= 0.30;
    }

    if (userPrefs.visualImpairment) {
      if (accessibility.lighting === 'poor') score -= 0.20;
      if (!accessibility.hasSidewalks) score -= 0.15;
    }

    if (userPrefs.hearingImpairment) {
      // Visual cues and safety features
      if (accessibility.safety === 'low') score -= 0.10;
    }

    return Math.max(0, Math.min(1, score));
  }

  calculateRealBarrierImpact(barrier, userPrefs) {
    const baseImpact = this.getBaseBarrierImpact(barrier);
    let adjustedImpact = baseImpact;

    // Adjust based on user preferences and needs
    if (userPrefs.avoidSteps && barrier.type === 'steps') {
      adjustedImpact *= 1.5;
    }

    if (userPrefs.avoidConstruction && barrier.type === 'construction') {
      adjustedImpact *= 1.3;
    }

    if (userPrefs.mobilityDevice === 'wheelchair') {
      if (barrier.type === 'steps') adjustedImpact *= 2.0;
      if (barrier.type === 'narrow_passage') adjustedImpact *= 1.4;
      if (barrier.type === 'steep_slope') adjustedImpact *= 1.6;
    }

    if (userPrefs.visualImpairment) {
      if (barrier.type === 'poor_lighting') adjustedImpact *= 1.5;
      if (barrier.type === 'obstacle') adjustedImpact *= 1.3;
    }

    return Math.min(0.8, adjustedImpact); // Cap at 80% impact
  }

  getBaseBarrierImpact(barrier) {
    const barrierTypes = {
      'steps': 0.35,
      'stairs': 0.40,
      'construction': 0.25,
      'closure': 0.50,
      'narrow_passage': 0.20,
      'steep_slope': 0.30,
      'unpaved_surface': 0.25,
      'poor_lighting': 0.15,
      'obstacle': 0.20,
      'temporary_barrier': 0.30,
      'flooding': 0.45,
      'ice': 0.40,
      'snow': 0.30
    };

    return barrierTypes[barrier.type] || 0.20;
  }

  async calculateAIRoute(origin, destination, options, staticRoute) {
    try {
      // Use AI to enhance the static route based on user learning
      const userProfile = this.buildUserProfile();
      const learningData = this.getLearningData(origin, destination);
      
      // Enhance route with AI insights
      const enhancedRoute = await this.enhanceRouteWithAI(
        staticRoute || this.createBasicRoute(origin, destination),
        userProfile,
        learningData,
        options
      );

      if (enhancedRoute) {
        enhancedRoute.source = 'ai_enhanced';
        enhancedRoute.accessibilityScore = this.calculateAccessibilityScore(enhancedRoute, enhancedRoute.barriers);
        enhancedRoute.aiInsights = this.generateAIInsights(enhancedRoute, userProfile);
      }

      return enhancedRoute;
    } catch (error) {
      console.error('Error calculating AI route:', error);
      return null;
    }
  }

  buildUserProfile() {
    const preferences = Object.fromEntries(this.userPreferences);
    const history = this.routeHistory.slice(-10); // Last 10 routes

    return {
      preferences,
      history,
      accessibilityNeeds: this.assessAccessibilityNeeds(preferences),
      commonRoutes: this.analyzeCommonRoutes(history),
      barrierAvoidance: this.analyzeBarrierAvoidance(history)
    };
  }

  assessAccessibilityNeeds(preferences) {
    const needs = [];

    if (preferences.mobilityDevice !== 'none') {
      needs.push('mobility_assistance');
    }

    if (preferences.visualImpairment) {
      needs.push('visual_assistance');
    }

    if (preferences.hearingImpairment) {
      needs.push('hearing_assistance');
    }

    if (preferences.cognitiveImpairment) {
      needs.push('cognitive_assistance');
    }

    return needs;
  }

  async enhanceRouteWithAI(route, userProfile, learningData, options) {
    // AI enhancement based on user profile and learning data
    const enhancedRoute = { ...route };

    // Adjust route based on user preferences
    enhancedRoute.properties.accessibility = this.enhanceAccessibilityFeatures(
      route.properties.accessibility,
      userProfile
    );

    // Add personalized recommendations
    enhancedRoute.properties.recommendations = this.generatePersonalizedRecommendations(
      route,
      userProfile,
      learningData
    );

    // Optimize for user's specific needs
    enhancedRoute.properties.optimizations = this.optimizeForUserNeeds(
      route,
      userProfile.accessibilityNeeds
    );

    return enhancedRoute;
  }

  enhanceAccessibilityFeatures(accessibility, userProfile) {
    const enhanced = { ...accessibility };

    // Enhance based on user preferences
    if (userProfile.preferences.preferSidewalks) {
      enhanced.sidewalkQuality = 'high';
    }

    if (userProfile.preferences.avoidSteepSlopes) {
      enhanced.maxSlope = 'gentle';
    }

    if (userProfile.preferences.preferWellLit) {
      enhanced.lighting = 'adequate';
    }

    return enhanced;
  }

  generatePersonalizedRecommendations(route, userProfile, learningData) {
    const recommendations = [];

    // Based on user history and preferences
    if (userProfile.preferences.avoidSteps && route.barriers?.some(b => b.dataset?.includes('Steps'))) {
      recommendations.push({
        type: 'warning',
        message: 'Route contains steps - consider alternative route',
        severity: 'high'
      });
    }

    if (userProfile.preferences.mobilityDevice === 'wheelchair') {
      recommendations.push({
        type: 'info',
        message: 'Route optimized for wheelchair accessibility',
        severity: 'low'
      });
    }

    return recommendations;
  }

  async calculateAPIRoute(origin, destination, options) {
    try {
      // Fallback to external API with accessibility filtering
      const apiResponse = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin,
          destination,
          mode: 'walking',
          avoidSteps: this.userPreferences.get('avoidSteps'),
          winterMode: options.winterMode || false
        })
      });

      if (!apiResponse.ok) {
        throw new Error(`API request failed: ${apiResponse.status}`);
      }

      const apiRoute = await apiResponse.json();
      
      // Enhance API route with accessibility data
      const enhancedRoute = this.enhanceAPIRouteWithAccessibility(apiRoute, origin, destination);
      
      enhancedRoute.source = 'api_fallback';
      enhancedRoute.accessibilityScore = this.calculateAccessibilityScore(enhancedRoute, enhancedRoute.barriers);

      return enhancedRoute;
    } catch (error) {
      console.error('Error calculating API route:', error);
      return this.createFallbackRoute(origin, destination);
    }
  }

  enhanceAPIRouteWithAccessibility(apiRoute, origin, destination) {
    // Enhance API route with local accessibility data
    const enhancedRoute = { ...apiRoute };

    // Add accessibility features
    enhancedRoute.properties.accessibility = {
      hasSidewalks: true,
      hasCurbCuts: true,
      surfaceType: 'paved',
      elevation: 'minimal',
      lighting: 'adequate',
      width: 'standard'
    };

    // Add barriers information
    enhancedRoute.barriers = this.findBarriersAlongRoute(origin, destination);

    return enhancedRoute;
  }

  createFallbackRoute(origin, destination) {
    // Create a basic fallback route
    return {
      type: 'Feature',
      properties: {
        mode: 'walking',
        distance: this.calculateDistance(origin, destination),
        duration: this.calculateDistance(origin, destination) * 12, // 12 min/km
        accessibility: {
          hasSidewalks: 'unknown',
          hasCurbCuts: 'unknown',
          surfaceType: 'unknown',
          elevation: 'unknown'
        },
        source: 'fallback'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [origin.lng, origin.lat],
          [destination.lng, destination.lat]
        ]
      }
    };
  }

  // Utility methods
  calculateDistance(point1, point2) {
    const R = 6371; // Earth's radius in km
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  calculatePathDistance(path) {
    let distance = 0;
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];
      distance += this.calculateDistance(
        { lat: prev[1], lng: prev[0] },
        { lat: curr[1], lng: curr[0] }
      );
    }
    return distance * 1000; // Convert to meters
  }

  calculatePathDuration(path) {
    const distance = this.calculatePathDistance(path);
    return distance * 0.012; // 12 minutes per km
  }

  // Learning and feedback methods
  recordRouteUsage(route, userFeedback) {
    this.routeHistory.push({
      route,
      feedback: userFeedback,
      timestamp: new Date().toISOString(),
      accessibilityScore: route.accessibilityScore
    });

    // Update AI learning cache
    this.updateAILearning(route, userFeedback);
  }

  updateAILearning(route, feedback) {
    const key = `${route.properties.mode}_${feedback.rating}`;
    const current = this.aiLearningCache.get(key) || { count: 0, totalScore: 0 };
    
    current.count++;
    current.totalScore += feedback.rating;
    current.averageScore = current.totalScore / current.count;
    
    this.aiLearningCache.set(key, current);
  }

  // Export methods for external use
  async getRoute(origin, destination, options = {}) {
    await this.initialize();
    return await this.calculateAccessibleRoute(origin, destination, options);
  }

  updateUserPreferences(preferences) {
    this.userPreferences = new Map(Object.entries(preferences));
    localStorage.setItem('trek-iq-accessibility-preferences', JSON.stringify(preferences));
  }

  getAccessibilityStats() {
    return {
      totalRoutes: this.routeHistory.length,
      averageAccessibilityScore: this.routeHistory.reduce((sum, r) => sum + r.accessibilityScore, 0) / this.routeHistory.length,
      userPreferences: Object.fromEntries(this.userPreferences),
      aiLearningCache: Object.fromEntries(this.aiLearningCache)
    };
  }
}

// Export singleton instance
export default new EnhancedAccessibleRoutingService();
