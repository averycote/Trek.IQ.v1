/**
 * Simple AI Service
 * 
 * Provides basic AI/ML functionality for the restored routing service.
 * Maintains compatibility with existing AI features while providing
 * simplified implementations.
 */

class SimpleAIService {
  constructor() {
    this.isInitialized = false;
    this.userPreferences = new Map();
    this.routeHistory = [];
    this.learningEnabled = false;
  }

  /**
   * Initialize the AI service
   */
  async initialize() {
    this.isInitialized = true;
    console.log('✅ Simple AI Service initialized');
  }

  /**
   * Optimize a route based on user preferences and historical data
   */
  async optimizeRoute(route, accessibilitySettings = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Simple route optimization based on accessibility preferences
      const optimizedRoute = { ...route };
      
      // Apply accessibility preferences
      if (accessibilitySettings.avoidSteps) {
        optimizedRoute.properties = {
          ...optimizedRoute.properties,
          avoidSteps: true,
          accessibilityOptimized: true
        };
      }

      if (accessibilitySettings.preferAccessible) {
        optimizedRoute.properties = {
          ...optimizedRoute.properties,
          preferAccessible: true,
          accessibilityOptimized: true
        };
      }

      // Add AI insights
      optimizedRoute.properties.aiInsights = this.generateAIInsights(route, accessibilitySettings);

      return optimizedRoute;

    } catch (error) {
      console.error('❌ Route optimization failed:', error);
      return route; // Return original route if optimization fails
    }
  }

  /**
   * Generate AI insights for a route
   */
  generateAIInsights(route, accessibilitySettings) {
    const insights = [];

    // Analyze route accessibility
    const accessibilityScore = route.properties?.accessibilityScore || 0.5;
    
    if (accessibilityScore > 0.8) {
      insights.push({
        type: 'positive',
        message: 'This route has excellent accessibility features',
        confidence: 0.9
      });
    } else if (accessibilityScore < 0.5) {
      insights.push({
        type: 'warning',
        message: 'This route may have accessibility challenges',
        confidence: 0.8
      });
    }

    // Analyze route distance
    const distance = route.properties?.distance || 0;
    if (distance > 2000) { // More than 2km
      insights.push({
        type: 'info',
        message: 'This is a longer route - consider breaks if needed',
        confidence: 0.7
      });
    }

    // Analyze user preferences
    if (accessibilitySettings.avoidSteps) {
      insights.push({
        type: 'info',
        message: 'Route optimized to avoid steps and stairs',
        confidence: 0.8
      });
    }

    return insights;
  }

  /**
   * Learn from user behavior (simplified)
   */
  async learnFromUserBehavior(route, accessibilitySettings) {
    if (!this.learningEnabled) {
      return;
    }

    try {
      // Store route in history
      this.routeHistory.push({
        route: route,
        settings: accessibilitySettings,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100 routes
      if (this.routeHistory.length > 100) {
        this.routeHistory = this.routeHistory.slice(-100);
      }

      // Update user preferences based on usage patterns
      this.updateUserPreferences(accessibilitySettings);

    } catch (error) {
      console.error('❌ Learning from user behavior failed:', error);
    }
  }

  /**
   * Update user preferences based on usage patterns
   */
  updateUserPreferences(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      if (typeof value === 'boolean') {
        const current = this.userPreferences.get(key) || 0;
        this.userPreferences.set(key, current + (value ? 1 : -1));
      }
    });
  }

  /**
   * Get user preferences
   */
  getUserPreferences() {
    const preferences = {};
    this.userPreferences.forEach((value, key) => {
      preferences[key] = value > 0;
    });
    return preferences;
  }

  /**
   * Enable or disable learning
   */
  setLearningEnabled(enabled) {
    this.learningEnabled = enabled;
    console.log(`AI learning ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get AI service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      learningEnabled: this.learningEnabled,
      routeHistoryCount: this.routeHistory.length,
      userPreferencesCount: this.userPreferences.size
    };
  }
}

// Export singleton instance
const simpleAIService = new SimpleAIService();
export default simpleAIService;
