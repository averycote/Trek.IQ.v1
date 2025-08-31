// Unified Accessible Routing Service for Trek.IQ
// Integrates static data, AI learning, and APIs with accessibility focus

import EnhancedAccessibleRoutingService from './enhancedAccessibleRoutingService.js';
import AILearningService from './aiLearningService.js';
import OptimizedDataService from './optimizedDataService.js';

class UnifiedAccessibleRoutingService {
  constructor() {
    this.enhancedRouting = EnhancedAccessibleRoutingService;
    this.aiLearning = AILearningService;
    this.optimizedData = OptimizedDataService;
    this.isInitialized = false;
    this.currentUser = null;
    this.routeCache = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing Unified Accessible Routing Service...');
    
    try {
      // Initialize all services
      await Promise.all([
        this.enhancedRouting.initialize(),
        this.aiLearning.initialize(),
        this.optimizedData.initialize()
      ]);

      this.isInitialized = true;
      console.log('Unified Accessible Routing Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Unified Accessible Routing Service:', error);
      throw error;
    }
  }

  async calculateRoute(origin, destination, options = {}) {
    await this.initialize();

    console.log('Calculating unified accessible route...', { origin, destination, options });

    const context = this.buildContext(origin, destination, options);
    const userProfile = this.buildUserProfile();

    // Tier 1: Static Data Analysis (Highest Priority)
    console.log('🔄 Tier 1: Analyzing static accessibility data...');
    const staticRoute = await this.calculateStaticRoute(origin, destination, options, context);
    
    if (staticRoute && staticRoute.accessibilityScore > 0.8) {
      console.log('✅ High-quality static route found (Score:', staticRoute.accessibilityScore, ')');
      return await this.enhanceRouteWithAI(staticRoute, userProfile, context);
    }

    // Tier 2: AI-Enhanced Route with Learning
    console.log('🔄 Tier 2: Applying AI learning and optimization...');
    const aiRoute = await this.calculateAIRoute(origin, destination, options, staticRoute, userProfile, context);
    
    if (aiRoute && aiRoute.accessibilityScore > 0.6) {
      console.log('✅ AI-enhanced route found (Score:', aiRoute.accessibilityScore, ')');
      return aiRoute;
    }

    // Tier 3: API Fallback with Accessibility Filtering
    console.log('🔄 Tier 3: Using API fallback with accessibility filtering...');
    const apiRoute = await this.calculateAPIRoute(origin, destination, options, context);
    
    console.log('✅ API fallback route generated (Score:', apiRoute.accessibilityScore, ')');
    return apiRoute;
  }

  async calculateStaticRoute(origin, destination, options, context) {
    try {
      // Use enhanced routing service for static data analysis
      const route = await this.enhancedRouting.calculateStaticRoute(origin, destination, options);
      
      if (route) {
        // Enhance with accessibility features
        route.properties.accessibility = this.assessRouteAccessibility(route, context);
        route.accessibilityScore = this.calculateAccessibilityScore(route, context);
        route.source = 'static_data';
        route.tier = 1;
      }

      return route;
    } catch (error) {
      console.error('Error calculating static route:', error);
      return null;
    }
  }

  async calculateAIRoute(origin, destination, options, staticRoute, userProfile, context) {
    try {
      // Use AI learning service to enhance the route
      const baseRoute = staticRoute || await this.createBasicRoute(origin, destination);
      
      const aiOptimization = await this.aiLearning.optimizeRouteForUser(baseRoute, userProfile, context);
      
      if (aiOptimization && aiOptimization.optimizedRoute) {
        const enhancedRoute = aiOptimization.optimizedRoute;
        
        // Add AI-specific enhancements
        enhancedRoute.properties.aiEnhancements = {
          confidence: aiOptimization.confidence,
          improvements: aiOptimization.improvements,
          learningInsights: this.aiLearning.extractGeneralInsights()
        };
        
        enhancedRoute.accessibilityScore = this.calculateAccessibilityScore(enhancedRoute, context);
        enhancedRoute.source = 'ai_enhanced';
        enhancedRoute.tier = 2;
        
        return enhancedRoute;
      }

      return null;
    } catch (error) {
      console.error('Error calculating AI route:', error);
      return null;
    }
  }

  async calculateAPIRoute(origin, destination, options, context) {
    try {
      // Use enhanced routing service for API fallback
      const route = await this.enhancedRouting.calculateAPIRoute(origin, destination, options);
      
      if (route) {
        // Enhance with accessibility data
        route.properties.accessibility = this.assessRouteAccessibility(route, context);
        route.accessibilityScore = this.calculateAccessibilityScore(route, context);
        route.source = 'api_fallback';
        route.tier = 3;
      }

      return route;
    } catch (error) {
      console.error('Error calculating API route:', error);
      return this.createFallbackRoute(origin, destination, context);
    }
  }

  async enhanceRouteWithAI(route, userProfile, context) {
    try {
      // Apply AI enhancements to static route
      const aiOptimization = await this.aiLearning.optimizeRouteForUser(route, userProfile, context);
      
      if (aiOptimization && aiOptimization.optimizedRoute) {
        const enhancedRoute = aiOptimization.optimizedRoute;
        
        // Add AI enhancements while preserving static data source
        enhancedRoute.properties.aiEnhancements = {
          confidence: aiOptimization.confidence,
          improvements: aiOptimization.improvements,
          learningInsights: this.aiLearning.extractGeneralInsights()
        };
        
        enhancedRoute.accessibilityScore = this.calculateAccessibilityScore(enhancedRoute, context);
        enhancedRoute.source = 'static_ai_enhanced';
        enhancedRoute.tier = 1;
        
        return enhancedRoute;
      }

      return route;
    } catch (error) {
      console.error('Error enhancing route with AI:', error);
      return route;
    }
  }

  assessRouteAccessibility(route, context) {
    const accessibility = {
      hasSidewalks: false,
      hasCurbCuts: false,
      surfaceType: 'unknown',
      elevation: 'unknown',
      lighting: 'unknown',
      width: 'unknown',
      safety: 'unknown',
      barriers: []
    };

    // Assess based on route properties
    if (route.properties.accessibility) {
      Object.assign(accessibility, route.properties.accessibility);
    }

    // Assess based on barriers
    if (route.barriers && route.barriers.length > 0) {
      accessibility.barriers = route.barriers.map(barrier => ({
        type: barrier.type,
        severity: barrier.severity,
        impact: barrier.impact
      }));
    }

    // Assess based on context
    if (context.timeOfDay === 'night') {
      accessibility.lighting = 'required';
    }

    if (context.weather?.condition === 'rain' || context.weather?.condition === 'snow') {
      accessibility.surfaceType = 'paved';
    }

    return accessibility;
  }

  calculateAccessibilityScore(route, context) {
    let score = 1.0;

    // Reduce score based on barriers
    if (route.barriers) {
      for (const barrier of route.barriers) {
        score -= barrier.impact * 0.1;
      }
    }

    // Boost score for accessibility features
    const accessibility = route.properties.accessibility;
    if (accessibility.hasSidewalks) score += 0.1;
    if (accessibility.hasCurbCuts) score += 0.1;
    if (accessibility.surfaceType === 'paved') score += 0.1;
    if (accessibility.elevation === 'minimal') score += 0.1;
    if (accessibility.lighting === 'adequate' || accessibility.lighting === 'high') score += 0.05;

    // Adjust based on user preferences
    if (this.currentUser) {
      const preferences = this.currentUser.preferences;
      
      if (preferences.avoidSteps && route.barriers?.some(b => b.type === 'steps')) {
        score -= 0.3;
      }
      
      if (preferences.preferSidewalks && accessibility.hasSidewalks) {
        score += 0.1;
      }
      
      if (preferences.mobilityDevice === 'wheelchair') {
        if (accessibility.width === 'wide') score += 0.1;
        if (route.barriers?.some(b => b.type === 'steps')) score -= 0.5;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  buildContext(origin, destination, options) {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay = 'day';
    if (hour < 6 || hour > 22) timeOfDay = 'night';
    else if (hour >= 7 && hour <= 9) timeOfDay = 'morning_rush';
    else if (hour >= 16 && hour <= 18) timeOfDay = 'evening_rush';

    return {
      timestamp: now.toISOString(),
      timeOfDay,
      dayOfWeek: now.getDay(),
      weather: options.weather || null,
      season: this.getSeason(now),
      accessibility: options.accessibility || {},
      userPreferences: this.currentUser?.preferences || {}
    };
  }

  buildUserProfile() {
    if (!this.currentUser) {
      return {
        id: 'anonymous',
        preferences: {},
        accessibilityNeeds: [],
        history: []
      };
    }

    return {
      id: this.currentUser.id,
      preferences: this.currentUser.preferences,
      accessibilityNeeds: this.assessAccessibilityNeeds(this.currentUser.preferences),
      history: this.currentUser.routeHistory || []
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

  getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  async createBasicRoute(origin, destination) {
    return {
      type: 'Feature',
      properties: {
        mode: 'accessible_walking',
        distance: this.calculateDistance(origin, destination),
        duration: this.calculateDistance(origin, destination) * 12,
        accessibility: {
          hasSidewalks: true,
          hasCurbCuts: true,
          surfaceType: 'paved',
          elevation: 'minimal'
        }
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

  createFallbackRoute(origin, destination, context) {
    return {
      type: 'Feature',
      properties: {
        mode: 'walking',
        distance: this.calculateDistance(origin, destination),
        duration: this.calculateDistance(origin, destination) * 12,
        accessibility: {
          hasSidewalks: 'unknown',
          hasCurbCuts: 'unknown',
          surfaceType: 'unknown',
          elevation: 'unknown'
        },
        source: 'fallback',
        tier: 3
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

  // User management
  setCurrentUser(user) {
    this.currentUser = user;
    
    // Update user preferences in all services
    if (user.preferences) {
      this.enhancedRouting.updateUserPreferences(user.preferences);
    }
  }

  // Feedback and learning
  async recordRouteFeedback(route, feedback) {
    if (!this.currentUser) return;

    const userProfile = this.buildUserProfile();
    
    // Record feedback in AI learning service
    this.aiLearning.recordUserFeedback(route, feedback, userProfile);
    
    // Record in enhanced routing service
    this.enhancedRouting.recordRouteUsage(route, feedback);
    
    console.log('Route feedback recorded:', feedback);
  }

  // Route alternatives
  async findAlternativeRoutes(origin, destination, currentRoute, options = {}) {
    const alternatives = [];

    // Generate alternative routes with different accessibility priorities
    const alternativeOptions = [
      { ...options, priority: 'safety' },
      { ...options, priority: 'speed' },
      { ...options, priority: 'comfort' }
    ];

    for (const altOptions of alternativeOptions) {
      try {
        const altRoute = await this.calculateRoute(origin, destination, altOptions);
        if (altRoute && altRoute.accessibilityScore > 0.5) {
          alternatives.push(altRoute);
        }
      } catch (error) {
        console.warn('Failed to generate alternative route:', error);
      }
    }

    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  // Performance monitoring
  getServiceStats() {
    return {
      enhancedRouting: this.enhancedRouting.getAccessibilityStats(),
      aiLearning: this.aiLearning.getLearningStats(),
      optimizedData: this.optimizedData.getCacheStats(),
      currentUser: this.currentUser ? {
        id: this.currentUser.id,
        preferences: this.currentUser.preferences,
        accessibilityNeeds: this.assessAccessibilityNeeds(this.currentUser.preferences)
      } : null
    };
  }

  // Export methods
  async getRoute(origin, destination, options = {}) {
    return await this.calculateRoute(origin, destination, options);
  }

  async getRouteWithAlternatives(origin, destination, options = {}) {
    const primaryRoute = await this.calculateRoute(origin, destination, options);
    const alternatives = await this.findAlternativeRoutes(origin, destination, primaryRoute, options);
    
    return {
      primary: primaryRoute,
      alternatives,
      summary: {
        totalRoutes: alternatives.length + 1,
        bestScore: Math.max(primaryRoute.accessibilityScore, ...alternatives.map(r => r.accessibilityScore)),
        averageScore: (primaryRoute.accessibilityScore + alternatives.reduce((sum, r) => sum + r.accessibilityScore, 0)) / (alternatives.length + 1)
      }
    };
  }

  async provideRouteFeedback(route, feedback) {
    await this.recordRouteFeedback(route, feedback);
  }

  updateUserPreferences(preferences) {
    if (this.currentUser) {
      this.currentUser.preferences = { ...this.currentUser.preferences, ...preferences };
    }
    
    this.enhancedRouting.updateUserPreferences(preferences);
  }
}

// Export singleton instance
export default new UnifiedAccessibleRoutingService();

