// AI Learning Service for Trek.IQ
// Continuously improves routing algorithms based on user feedback and patterns

class AILearningService {
  constructor() {
    this.learningData = new Map();
    this.userPatterns = new Map();
    this.routeOptimizations = new Map();
    this.feedbackHistory = [];
    this.performanceMetrics = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing AI Learning Service...');
    
    try {
      await this.loadLearningData();
      await this.analyzeUserPatterns();
      this.isInitialized = true;
      console.log('AI Learning Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Learning Service:', error);
      throw error;
    }
  }

  async loadLearningData() {
    // Load historical learning data from localStorage or API
    const stored = localStorage.getItem('trek-iq-ai-learning-data');
    if (stored) {
      this.learningData = new Map(Object.entries(JSON.parse(stored)));
    }

    // Load user patterns
    const patternsStored = localStorage.getItem('trek-iq-user-patterns');
    if (patternsStored) {
      this.userPatterns = new Map(Object.entries(JSON.parse(patternsStored)));
    }
  }

  async analyzeUserPatterns() {
    // Analyze user behavior patterns for route optimization
    const patterns = this.extractUserPatterns();
    
    for (const [userId, userData] of patterns) {
      const optimizedPreferences = this.optimizeUserPreferences(userData);
      this.userPatterns.set(userId, optimizedPreferences);
    }

    // Save patterns
    localStorage.setItem('trek-iq-user-patterns', 
      JSON.stringify(Object.fromEntries(this.userPatterns)));
  }

  extractUserPatterns() {
    const patterns = new Map();
    
    // Extract patterns from route history and feedback
    // This would typically come from a database or API
    const samplePatterns = {
      'user_1': {
        routes: [
          { origin: 'A', destination: 'B', preferences: { avoidSteps: true }, rating: 5 },
          { origin: 'B', destination: 'C', preferences: { preferSidewalks: true }, rating: 4 },
          { origin: 'A', destination: 'C', preferences: { avoidSteps: true }, rating: 3 }
        ],
        commonDestinations: ['B', 'C'],
        preferredRoutes: ['A-B', 'B-C'],
        avoidedFeatures: ['steps', 'unpaved_surfaces']
      }
    };

    return new Map(Object.entries(samplePatterns));
  }

  optimizeUserPreferences(userData) {
    const optimized = {
      preferences: {},
      routeOptimizations: {},
      learningInsights: {}
    };

    // Analyze route ratings to optimize preferences
    const routeAnalysis = this.analyzeRouteRatings(userData.routes);
    
    // Optimize preferences based on successful routes
    optimized.preferences = this.deriveOptimalPreferences(routeAnalysis);
    
    // Generate route-specific optimizations
    optimized.routeOptimizations = this.generateRouteOptimizations(userData.routes);
    
    // Extract learning insights
    optimized.learningInsights = this.extractLearningInsights(userData);

    return optimized;
  }

  analyzeRouteRatings(routes) {
    const analysis = {
      highRatedRoutes: [],
      lowRatedRoutes: [],
      preferenceEffectiveness: {},
      commonFeatures: {}
    };

    for (const route of routes) {
      if (route.rating >= 4) {
        analysis.highRatedRoutes.push(route);
      } else if (route.rating <= 2) {
        analysis.lowRatedRoutes.push(route);
      }

      // Analyze preference effectiveness
      for (const [pref, value] of Object.entries(route.preferences)) {
        if (!analysis.preferenceEffectiveness[pref]) {
          analysis.preferenceEffectiveness[pref] = { total: 0, sum: 0 };
        }
        analysis.preferenceEffectiveness[pref].total++;
        analysis.preferenceEffectiveness[pref].sum += route.rating;
      }
    }

    return analysis;
  }

  deriveOptimalPreferences(routeAnalysis) {
    const optimalPreferences = {};

    // Calculate average effectiveness for each preference
    for (const [pref, data] of Object.entries(routeAnalysis.preferenceEffectiveness)) {
      const averageRating = data.sum / data.total;
      optimalPreferences[pref] = averageRating > 3.5; // Enable if effective
    }

    return optimalPreferences;
  }

  generateRouteOptimizations(routes) {
    const optimizations = {};

    for (const route of routes) {
      const routeKey = `${route.origin}-${route.destination}`;
      
      if (!optimizations[routeKey]) {
        optimizations[routeKey] = {
          successRate: 0,
          optimalPreferences: {},
          alternativeRoutes: [],
          commonBarriers: []
        };
      }

      // Update success rate
      const current = optimizations[routeKey];
      current.successRate = (current.successRate + (route.rating / 5)) / 2;
      
      // Merge optimal preferences
      Object.assign(current.optimalPreferences, route.preferences);
    }

    return optimizations;
  }

  extractLearningInsights(userData) {
    const insights = {
      preferredFeatures: [],
      avoidedFeatures: userData.avoidedFeatures || [],
      commonDestinations: userData.commonDestinations || [],
      routePatterns: this.identifyRoutePatterns(userData.routes),
      accessibilityNeeds: this.inferAccessibilityNeeds(userData)
    };

    return insights;
  }

  identifyRoutePatterns(routes) {
    const patterns = {
      timeOfDay: {},
      dayOfWeek: {},
      weatherConditions: {},
      routeComplexity: {}
    };

    // Analyze patterns in route usage
    for (const route of routes) {
      // This would analyze actual route data with timestamps
      // For now, using simplified analysis
    }

    return patterns;
  }

  inferAccessibilityNeeds(userData) {
    const needs = [];

    // Infer needs based on route preferences and patterns
    if (userData.avoidedFeatures.includes('steps')) {
      needs.push('mobility_assistance');
    }

    if (userData.preferredRoutes.some(route => route.includes('sidewalk'))) {
      needs.push('prefer_safe_paths');
    }

    return needs;
  }

  // Route optimization methods
  async optimizeRoute(route, userProfile, context) {
    const optimization = {
      originalRoute: route,
      optimizedRoute: null,
      improvements: [],
      confidence: 0
    };

    try {
      // Apply learned optimizations
      const userOptimizations = this.userPatterns.get(userProfile.id);
      if (userOptimizations) {
        optimization.optimizedRoute = this.applyUserOptimizations(
          route, 
          userOptimizations, 
          context
        );
      }

      // Apply general learning improvements
      optimization.optimizedRoute = this.applyGeneralOptimizations(
        optimization.optimizedRoute || route,
        context
      );

      // Calculate improvement confidence
      optimization.confidence = this.calculateOptimizationConfidence(
        optimization.optimizedRoute,
        userProfile
      );

      // Generate improvement explanations
      optimization.improvements = this.generateImprovementExplanations(
        route,
        optimization.optimizedRoute
      );

    } catch (error) {
      console.error('Error optimizing route:', error);
      optimization.optimizedRoute = route;
      optimization.confidence = 0;
    }

    return optimization;
  }

  applyUserOptimizations(route, userOptimizations, context) {
    let optimizedRoute = { ...route };

    // Apply user-specific route optimizations
    const routeKey = `${route.properties.origin}-${route.properties.destination}`;
    const routeOptimization = userOptimizations.routeOptimizations[routeKey];

    if (routeOptimization) {
      // Apply learned preferences
      optimizedRoute.properties.accessibility = {
        ...optimizedRoute.properties.accessibility,
        ...routeOptimization.optimalPreferences
      };

      // Avoid known problematic features
      if (routeOptimization.commonBarriers.length > 0) {
        optimizedRoute.properties.barriers = optimizedRoute.properties.barriers.filter(
          barrier => !routeOptimization.commonBarriers.includes(barrier.type)
        );
      }
    }

    return optimizedRoute;
  }

  applyGeneralOptimizations(route, context) {
    let optimizedRoute = { ...route };

    // Apply general learning improvements
    const generalInsights = this.extractGeneralInsights();

    // Optimize based on time of day
    if (context.timeOfDay) {
      optimizedRoute = this.optimizeForTimeOfDay(optimizedRoute, context.timeOfDay);
    }

    // Optimize based on weather
    if (context.weather) {
      optimizedRoute = this.optimizeForWeather(optimizedRoute, context.weather);
    }

    // Optimize based on accessibility patterns
    optimizedRoute = this.optimizeForAccessibilityPatterns(optimizedRoute, generalInsights);

    return optimizedRoute;
  }

  optimizeForTimeOfDay(route, timeOfDay) {
    const optimizedRoute = { ...route };

    // Adjust route based on time of day patterns
    if (timeOfDay === 'night') {
      optimizedRoute.properties.accessibility.lighting = 'high';
      optimizedRoute.properties.accessibility.safety = 'enhanced';
    } else if (timeOfDay === 'rush_hour') {
      optimizedRoute.properties.accessibility.crowding = 'avoided';
    }

    return optimizedRoute;
  }

  optimizeForWeather(route, weather) {
    const optimizedRoute = { ...route };

    // Adjust route based on weather conditions
    if (weather.condition === 'rain' || weather.condition === 'snow') {
      optimizedRoute.properties.accessibility.surfaceType = 'paved';
      optimizedRoute.properties.accessibility.shelter = 'preferred';
    }

    return optimizedRoute;
  }

  optimizeForAccessibilityPatterns(route, insights) {
    const optimizedRoute = { ...route };

    // Apply learned accessibility patterns
    if (insights.preferredFeatures.includes('curb_cuts')) {
oad      optimizedRoute.properties.accessibility.curbCuts = 'required';
    }

    if (insights.avoidedFeatures.includes('steep_slopes')) {
      optimizedRoute.properties.accessibility.maxSlope = 'gentle';
    }

    return optimizedRoute;
  }

  calculateOptimizationConfidence(optimizedRoute, userProfile) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on user pattern match
    const userPatterns = this.userPatterns.get(userProfile.id);
    if (userPatterns) {
      const patternMatch = this.calculatePatternMatch(optimizedRoute, userPatterns);
      confidence += patternMatch * 0.3;
    }

    // Increase confidence based on general learning
    const generalMatch = this.calculateGeneralLearningMatch(optimizedRoute);
    confidence += generalMatch * 0.2;

    return Math.min(1, confidence);
  }

  calculatePatternMatch(route, userPatterns) {
    let match = 0;
    let totalChecks = 0;

    // Check if route matches user's preferred features
    for (const feature of userPatterns.learningInsights.preferredFeatures) {
      totalChecks++;
      if (route.properties.accessibility[feature]) {
        match++;
      }
    }

    // Check if route avoids user's avoided features
    for (const feature of userPatterns.learningInsights.avoidedFeatures) {
      totalChecks++;
      if (!route.properties.barriers?.some(b => b.type === feature)) {
        match++;
      }
    }

    return totalChecks > 0 ? match / totalChecks : 0;
  }

  calculateGeneralLearningMatch(route) {
    // Calculate how well the route matches general learning patterns
    const generalInsights = this.extractGeneralInsights();
    let match = 0;
    let totalChecks = 0;

    // Check against general accessibility patterns
    for (const feature of generalInsights.preferredFeatures) {
      totalChecks++;
      if (route.properties.accessibility[feature]) {
        match++;
      }
    }

    return totalChecks > 0 ? match / totalChecks : 0;
  }

  generateImprovementExplanations(originalRoute, optimizedRoute) {
    const improvements = [];

    // Compare accessibility features
    const originalAccessibility = originalRoute.properties.accessibility;
    const optimizedAccessibility = optimizedRoute.properties.accessibility;

    for (const [feature, value] of Object.entries(optimizedAccessibility)) {
      if (originalAccessibility[feature] !== value) {
        improvements.push({
          type: 'accessibility_improvement',
          feature,
          oldValue: originalAccessibility[feature],
          newValue: value,
          explanation: `Improved ${feature} from ${originalAccessibility[feature]} to ${value}`
        });
      }
    }

    // Compare barriers
    const originalBarriers = originalRoute.properties.barriers?.length || 0;
    const optimizedBarriers = optimizedRoute.properties.barriers?.length || 0;

    if (optimizedBarriers < originalBarriers) {
      improvements.push({
        type: 'barrier_reduction',
        oldCount: originalBarriers,
        newCount: optimizedBarriers,
        explanation: `Reduced barriers from ${originalBarriers} to ${optimizedBarriers}`
      });
    }

    return improvements;
  }

  // Feedback and learning methods
  recordFeedback(route, userFeedback, userProfile) {
    const feedbackRecord = {
      route,
      userFeedback,
      userProfile,
      timestamp: new Date().toISOString(),
      learningInsights: this.extractFeedbackInsights(route, userFeedback)
    };

    this.feedbackHistory.push(feedbackRecord);

    // Update learning data
    this.updateLearningFromFeedback(feedbackRecord);

    // Save to localStorage
    this.saveLearningData();
  }

  extractFeedbackInsights(route, userFeedback) {
    const insights = {
      successfulFeatures: [],
      problematicFeatures: [],
      userPreferences: {},
      routeEffectiveness: userFeedback.rating / 5
    };

    // Extract insights from feedback
    if (userFeedback.rating >= 4) {
      // Successful route - identify good features
      insights.successfulFeatures = this.identifySuccessfulFeatures(route);
    } else if (userFeedback.rating <= 2) {
      // Problematic route - identify issues
      insights.problematicFeatures = this.identifyProblematicFeatures(route);
    }

    return insights;
  }

  identifySuccessfulFeatures(route) {
    const features = [];

    // Identify features that contributed to success
    const accessibility = route.properties.accessibility;
    
    if (accessibility.hasSidewalks) features.push('sidewalks');
    if (accessibility.hasCurbCuts) features.push('curb_cuts');
    if (accessibility.surfaceType === 'paved') features.push('paved_surface');
    if (accessibility.elevation === 'minimal') features.push('minimal_elevation');

    return features;
  }

  identifyProblematicFeatures(route) {
    const features = [];

    // Identify features that caused problems
    const barriers = route.properties.barriers || [];
    
    for (const barrier of barriers) {
      features.push(barrier.type);
    }

    return features;
  }

  updateLearningFromFeedback(feedbackRecord) {
    const { route, userFeedback, userProfile, learningInsights } = feedbackRecord;

    // Update user-specific learning
    const userId = userProfile.id;
    if (!this.learningData.has(userId)) {
      this.learningData.set(userId, {
        routes: [],
        preferences: {},
        patterns: {}
      });
    }

    const userData = this.learningData.get(userId);
    userData.routes.push({
      route,
      feedback: userFeedback,
      insights: learningInsights
    });

    // Update general learning patterns
    this.updateGeneralLearningPatterns(learningInsights);
  }

  updateGeneralLearningPatterns(insights) {
    // Update general accessibility patterns
    for (const feature of insights.successfulFeatures) {
      this.incrementFeatureSuccess(feature);
    }

    for (const feature of insights.problematicFeatures) {
      this.incrementFeatureProblems(feature);
    }
  }

  incrementFeatureSuccess(feature) {
    const current = this.learningData.get('general') || { featureSuccess: {}, featureProblems: {} };
    current.featureSuccess[feature] = (current.featureSuccess[feature] || 0) + 1;
    this.learningData.set('general', current);
  }

  incrementFeatureProblems(feature) {
    const current = this.learningData.get('general') || { featureSuccess: {}, featureProblems: {} };
    current.featureProblems[feature] = (current.featureProblems[feature] || 0) + 1;
    this.learningData.set('general', current);
  }

  extractGeneralInsights() {
    const generalData = this.learningData.get('general');
    if (!generalData) return { preferredFeatures: [], avoidedFeatures: [] };

    const insights = {
      preferredFeatures: [],
      avoidedFeatures: []
    };

    // Identify preferred features (high success rate)
    for (const [feature, successCount] of Object.entries(generalData.featureSuccess)) {
      const problemCount = generalData.featureProblems[feature] || 0;
      const successRate = successCount / (successCount + problemCount);
      
      if (successRate > 0.7) {
        insights.preferredFeatures.push(feature);
      }
    }

    // Identify avoided features (high problem rate)
    for (const [feature, problemCount] of Object.entries(generalData.featureProblems)) {
      const successCount = generalData.featureSuccess[feature] || 0;
      const problemRate = problemCount / (successCount + problemCount);
      
      if (problemRate > 0.6) {
        insights.avoidedFeatures.push(feature);
      }
    }

    return insights;
  }

  calculateRouteMetrics(route) {
    return {
      distance: route.properties.distance || 0,
      duration: route.properties.duration || 0,
      accessibilityScore: route.accessibilityScore || 0,
      barrierCount: route.barriers?.length || 0,
      surfaceTypes: this.extractSurfaceTypes(route),
      elevationChanges: this.calculateElevationChanges(route),
      lightingConditions: this.extractLightingConditions(route),
      widthVariations: this.extractWidthVariations(route)
    };
  }

  extractSurfaceTypes(route) {
    const surfaces = new Set();
    if (route.properties.accessibility?.surfaceType) {
      surfaces.add(route.properties.accessibility.surfaceType);
    }
    if (route.barriers) {
      route.barriers.forEach(barrier => {
        if (barrier.properties?.surface) {
          surfaces.add(barrier.properties.surface);
        }
      });
    }
    return Array.from(surfaces);
  }

  calculateElevationChanges(route) {
    if (!route.geometry?.coordinates) return { total: 0, max: 0, average: 0 };
    
    const coordinates = route.geometry.coordinates;
    let totalElevation = 0;
    let maxElevation = 0;
    let elevationChanges = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i-1];
      const curr = coordinates[i];
      
      if (prev.length >= 3 && curr.length >= 3) {
        const elevationDiff = Math.abs(curr[2] - prev[2]);
        totalElevation += elevationDiff;
        maxElevation = Math.max(maxElevation, elevationDiff);
        if (elevationDiff > 0) elevationChanges++;
      }
    }

    return {
      total: totalElevation,
      max: maxElevation,
      average: elevationChanges > 0 ? totalElevation / elevationChanges : 0,
      changes: elevationChanges
    };
  }

  extractLightingConditions(route) {
    const lighting = route.properties.accessibility?.lighting || 'unknown';
    return {
      primary: lighting,
      hasStreetLights: lighting === 'adequate' || lighting === 'high',
      isWellLit: lighting === 'high'
    };
  }

  extractWidthVariations(route) {
    const width = route.properties.accessibility?.width || 0;
    return {
      average: width,
      isWheelchairAccessible: width >= 1.5,
      isStandard: width >= 1.0 && width < 1.5,
      isNarrow: width < 1.0
    };
  }

  extractBarrierReports(userFeedback) {
    const reports = [];
    
    if (userFeedback.reportedBarriers) {
      userFeedback.reportedBarriers.forEach(report => {
        reports.push({
          type: report.type,
          location: report.location,
          description: report.description,
          severity: report.severity || 'medium',
          timestamp: new Date().toISOString(),
          verified: false
        });
      });
    }

    return reports;
  }

  processReportedBarriers(reportedBarriers, userProfile) {
    reportedBarriers.forEach(report => {
      const barrierKey = `${report.location.lat.toFixed(4)}_${report.location.lng.toFixed(4)}`;
      
      if (!this.reportedBarriers.has(barrierKey)) {
        this.reportedBarriers.set(barrierKey, {
          reports: [],
          firstReported: new Date().toISOString(),
          lastReported: new Date().toISOString(),
          totalReports: 0,
          averageSeverity: 0,
          verified: false
        });
      }

      const barrierData = this.reportedBarriers.get(barrierKey);
      barrierData.reports.push({
        type: report.type,
        description: report.description,
        severity: report.severity || 'medium',
        reportedBy: userProfile.id,
        timestamp: new Date().toISOString()
      });

      barrierData.lastReported = new Date().toISOString();
      barrierData.totalReports++;
      
      // Calculate average severity
      const severityValues = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
      const totalSeverity = barrierData.reports.reduce((sum, r) => 
        sum + (severityValues[r.severity] || 2), 0);
      barrierData.averageSeverity = totalSeverity / barrierData.totalReports;

      // Auto-verify if multiple reports
      if (barrierData.totalReports >= 3) {
        barrierData.verified = true;
      }
    });

    // Save reported barriers
    localStorage.setItem('trek-iq-reported-barriers', 
      JSON.stringify(Object.fromEntries(this.reportedBarriers)));
  }

  applyPatternOptimizations(route, pattern) {
    const optimizedRoute = { ...route };
    
    // Apply pattern-based optimizations
    if (pattern.surfaceTypes.includes('paved')) {
      optimizedRoute.properties.accessibility.surfaceType = 'paved';
    }
    
    if (pattern.lightingQuality === 'high') {
      optimizedRoute.properties.accessibility.lighting = 'high';
    }
    
    if (pattern.widthCategory === 'wide') {
      optimizedRoute.properties.accessibility.width = 1.8;
    }
    
    return optimizedRoute;
  }

  enhanceWithPreferredFeatures(accessibility, preferredFeatures) {
    const enhanced = { ...accessibility };
    
    // Apply user's preferred features
    if (preferredFeatures.wide_paths > 2) {
      enhanced.width = Math.max(enhanced.width || 0, 1.5);
    }
    
    if (preferredFeatures.good_lighting > 2) {
      enhanced.lighting = 'high';
    }
    
    if (preferredFeatures.minimal_elevation > 2) {
      enhanced.elevation = 'minimal';
    }
    
    return enhanced;
  }

  avoidProblematicFeatures(route, avoidedFeatures) {
    const optimizedRoute = { ...route };
    
    // Avoid problematic features based on user history
    if (avoidedFeatures.barriers > 1) {
      // Prefer routes with fewer barriers
      if (optimizedRoute.barriers && optimizedRoute.barriers.length > 2) {
        optimizedRoute.accessibilityScore = Math.max(0, optimizedRoute.accessibilityScore - 0.1);
      }
    }
    
    if (avoidedFeatures.unpaved_surfaces > 1) {
      optimizedRoute.properties.accessibility.surfaceType = 'paved';
    }
    
    if (avoidedFeatures.poor_lighting > 1) {
      optimizedRoute.properties.accessibility.lighting = 'adequate';
    }
    
    return optimizedRoute;
  }

  updateRouteSpecificLearning(route, userFeedback, userProfile) {
    // Update route-specific learning patterns
    const routeKey = `${route.properties.origin || 'unknown'}-${route.properties.destination || 'unknown'}`;
    
    if (!this.routeOptimizations.has(routeKey)) {
      this.routeOptimizations.set(routeKey, {
        successCount: 0,
        failureCount: 0,
        averageRating: 0,
        commonIssues: [],
        successfulFeatures: []
      });
    }
    
    const routeData = this.routeOptimizations.get(routeKey);
    
    if (userFeedback.rating >= 4) {
      routeData.successCount++;
      routeData.successfulFeatures.push(...this.identifySuccessfulFeatures(route));
    } else if (userFeedback.rating <= 2) {
      routeData.failureCount++;
      routeData.commonIssues.push(...this.identifyProblematicFeatures(route));
    }
    
    // Update average rating
    const totalRating = routeData.successCount * 5 + routeData.failureCount * 1;
    const totalRoutes = routeData.successCount + routeData.failureCount;
    routeData.averageRating = totalRoutes > 0 ? totalRating / totalRoutes : 0;
  }

  generateLearningInsights(userData, context) {
    const insights = {
      userPatterns: {},
      recommendations: [],
      confidence: 0
    };
    
    if (userData && userData.metrics) {
      // Generate insights based on user patterns
      const topPreferred = Object.entries(userData.metrics.preferredFeatures)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([feature]) => feature);
      
      const topAvoided = Object.entries(userData.metrics.avoidedFeatures)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([feature]) => feature);
      
      insights.userPatterns = {
        preferredFeatures: topPreferred,
        avoidedFeatures: topAvoided,
        averageRating: userData.metrics.averageRating,
        totalRoutes: userData.metrics.totalRoutes
      };
      
      // Generate recommendations
      insights.recommendations = this.generateUserRecommendations(userData, context);
      
      // Calculate confidence based on data quality
      insights.confidence = Math.min(1, userData.metrics.totalRoutes / 10);
    }
    
    return insights;
  }

  generateUserRecommendations(userData, context) {
    const recommendations = [];
    
    if (userData.metrics.averageRating < 3.5) {
      recommendations.push({
        type: 'improvement',
        message: 'Consider routes with better accessibility features',
        priority: 'high'
      });
    }
    
    if (userData.metrics.avoidedFeatures.barriers > 3) {
      recommendations.push({
        type: 'avoidance',
        message: 'You prefer routes with fewer barriers - we\'ll prioritize these',
        priority: 'medium'
      });
    }
    
    if (userData.metrics.preferredFeatures.wide_paths > 2) {
      recommendations.push({
        type: 'preference',
        message: 'We\'ll prioritize wider paths for better accessibility',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  saveLearningData() {
    localStorage.setItem('trek-iq-ai-learning-data', 
      JSON.stringify(Object.fromEntries(this.learningData)));
    localStorage.setItem('trek-iq-user-patterns', 
      JSON.stringify(Object.fromEntries(this.userPatterns)));
    localStorage.setItem('trek-iq-route-feedback', 
      JSON.stringify(this.feedbackHistory));
  }

  // Performance monitoring
  recordPerformanceMetrics(route, metrics) {
    const routeKey = `${route.properties.origin}-${route.properties.destination}`;
    
    if (!this.performanceMetrics.has(routeKey)) {
      this.performanceMetrics.set(routeKey, []);
    }

    this.performanceMetrics.get(routeKey).push({
      ...metrics,
      timestamp: new Date().toISOString()
    });
  }

  getPerformanceReport() {
    const report = {
      totalRoutes: this.feedbackHistory.length,
      averageRating: this.calculateAverageRating(),
      learningEffectiveness: this.calculateLearningEffectiveness(),
      userSatisfaction: this.calculateUserSatisfaction(),
      optimizationSuccess: this.calculateOptimizationSuccess()
    };

    return report;
  }

  calculateAverageRating() {
    if (this.feedbackHistory.length === 0) return 0;
    
    const totalRating = this.feedbackHistory.reduce((sum, record) => 
      sum + record.userFeedback.rating, 0);
    
    return totalRating / this.feedbackHistory.length;
  }

  calculateLearningEffectiveness() {
    // Calculate how effective the learning algorithm is
    const recentFeedback = this.feedbackHistory.slice(-20); // Last 20 feedbacks
    if (recentFeedback.length === 0) return 0;

    const recentAverage = recentFeedback.reduce((sum, record) => 
      sum + record.userFeedback.rating, 0) / recentFeedback.length;
    
    const overallAverage = this.calculateAverageRating();
    
    return recentAverage > overallAverage ? (recentAverage - overallAverage) / overallAverage : 0;
  }

  calculateUserSatisfaction() {
    const highRatings = this.feedbackHistory.filter(record => 
      record.userFeedback.rating >= 4).length;
    
    return this.feedbackHistory.length > 0 ? highRatings / this.feedbackHistory.length : 0;
  }

  calculateOptimizationSuccess() {
    // Calculate success rate of route optimizations
    const optimizations = this.feedbackHistory.filter(record => 
      record.route.source === 'ai_enhanced');
    
    if (optimizations.length === 0) return 0;

    const successfulOptimizations = optimizations.filter(record => 
      record.userFeedback.rating >= 4).length;
    
    return successfulOptimizations / optimizations.length;
  }

  // Export methods
  async optimizeRouteForUser(route, userProfile, context) {
    await this.initialize();
    return await this.optimizeRoute(route, userProfile, context);
  }

  recordUserFeedback(route, userFeedback, userProfile) {
    this.recordFeedback(route, userFeedback, userProfile);
  }

  getLearningStats() {
    return {
      totalFeedback: this.feedbackHistory.length,
      userPatterns: this.userPatterns.size,
      performanceReport: this.getPerformanceReport(),
      generalInsights: this.extractGeneralInsights()
    };
  }
}

// Export singleton instance
export default new AILearningService();
