// OPTIMIZATION: Removed TensorFlow and lodash dependencies to reduce bundle size
// Simple debounce implementation to replace lodash
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

class AIService {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.predictionCache = new Map();
    this.weatherData = null;
    this.maintenanceData = null;
    this.lastUpdate = null;
  }

  // OPTIMIZATION: Simplified model initialization without TensorFlow
  async initializeModel() {
    try {
      // Use lightweight heuristic-based model instead of TensorFlow
      this.model = this.createHeuristicModel();
      this.isModelLoaded = true;
      console.log('AI service initialized with heuristic model');
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      // Fallback to rule-based prediction
      this.isModelLoaded = false;
    }
  }

  // OPTIMIZATION: Create lightweight heuristic model instead of TensorFlow
  createHeuristicModel() {
    return {
      predict: (features) => {
        // Simple heuristic-based prediction using weighted factors
        const [weather, time, temperature, precipitation, wind, visibility, 
               maintenance, roadCondition, trafficDensity, historicalIncidents,
               seasonalFactor, dayOfWeek, hourOfDay, weatherTrend, alertLevel] = features;
        
        // Calculate risk score based on weighted factors
        let riskScore = 0;
        
        // Weather factors (40% weight)
        riskScore += weather * 0.15;
        riskScore += precipitation * 0.15;
        riskScore += (1 - visibility) * 0.1;
        
        // Road conditions (30% weight)
        riskScore += roadCondition * 0.15;
        riskScore += maintenance * 0.15;
        
        // Traffic and time factors (20% weight)
        riskScore += trafficDensity * 0.1;
        riskScore += seasonalFactor * 0.1;
        
        // Historical data (10% weight)
        riskScore += historicalIncidents * 0.1;
        
        // Normalize to 0-1 range
        return Math.min(Math.max(riskScore, 0), 1);
      }
    };
  }

  // Predict potential barriers along a route
  async predictBarriers(route, weatherData = null, maintenanceData = null) {
    const cacheKey = this.generateCacheKey(route, weatherData, maintenanceData);
    
    if (this.predictionCache.has(cacheKey)) {
      return this.predictionCache.get(cacheKey);
    }

    const predictions = [];
    
    if (this.isModelLoaded && this.model) {
      // Use AI model for prediction
      predictions.push(...await this.aiPredictBarriers(route, weatherData, maintenanceData));
    } else {
      // Fallback to rule-based prediction
      predictions.push(...this.ruleBasedBarrierPrediction(route, weatherData, maintenanceData));
    }

    // Cache results for 5 minutes
    this.predictionCache.set(cacheKey, predictions);
    setTimeout(() => this.predictionCache.delete(cacheKey), 5 * 60 * 1000);

    return predictions;
  }

  // Enhanced AI-based barrier prediction with confidence scoring
  async aiPredictBarriers(route, weatherData, maintenanceData) {
    const predictions = [];
    
    try {
      // Extract enhanced features from route segments
      const features = this.extractEnhancedRouteFeatures(route, weatherData, maintenanceData);
      
      // Make predictions for each segment with confidence scoring
      for (let i = 0; i < features.length; i++) {
        const featureTensor = tf.tensor2d([features[i]], [1, 15]); // Enhanced feature set
        const prediction = await this.model.predict(featureTensor).data();
        
        // Calculate confidence score based on multiple factors
        const confidence = this.calculatePredictionConfidence(
          prediction[0], 
          features[i], 
          weatherData, 
          maintenanceData
        );
        
        // Dynamic threshold based on confidence
        const threshold = this.getDynamicThreshold(confidence, weatherData);
        
        if (prediction[0] > threshold) {
          const barrierInfo = {
            type: 'predicted_barrier',
            location: route.coordinates[i],
            probability: prediction[0],
            confidence: confidence,
            reason: this.getEnhancedBarrierReason(features[i], weatherData, maintenanceData),
            severity: this.calculateEnhancedSeverity(prediction[0], features[i], confidence),
            accessibilityImpact: this.calculateAccessibilityImpact(features[i]),
            alternativeRoutes: await this.suggestAlternativeRoutes(route.coordinates[i], features[i]),
            timeToResolution: this.estimateTimeToResolution(features[i], maintenanceData),
            seasonalFactors: this.analyzeSeasonalFactors(features[i], weatherData)
          };
          
          predictions.push(barrierInfo);
        }
        
        featureTensor.dispose();
      }
      
      // Sort predictions by confidence and severity
      predictions.sort((a, b) => {
        const aScore = a.confidence * a.severity.level;
        const bScore = b.confidence * b.severity.level;
        return bScore - aScore;
      });
      
    } catch (error) {
      console.error('Enhanced AI prediction error:', error);
    }

    return predictions;
  }

  // Enhanced feature extraction with more comprehensive data
  extractEnhancedRouteFeatures(route, weatherData, maintenanceData) {
    const features = [];
    
    for (let i = 0; i < route.coordinates.length; i++) {
      const coord = route.coordinates[i];
      const feature = [
        // Basic location features
        coord.lat,
        coord.lng,
        
        // Weather features
        weatherData?.temperature || 0,
        weatherData?.precipitation || 0,
        weatherData?.windSpeed || 0,
        weatherData?.humidity || 0,
        weatherData?.pressure || 0,
        
        // Time-based features
        new Date().getHours() / 24, // Hour of day (normalized)
        new Date().getDay() / 7,    // Day of week (normalized)
        new Date().getMonth() / 12, // Month (normalized)
        
        // Historical features
        this.getHistoricalBarrierFrequency(coord),
        this.getMaintenanceProximityScore(coord, maintenanceData),
        
        // Route-specific features
        i / route.coordinates.length, // Position in route
        this.getInfrastructureAge(coord),
        this.getAccessibilityScore(coord),
        this.getSeasonalRiskFactor(coord, weatherData)
      ];
      
      features.push(feature);
    }
    
    return features;
  }

  // Calculate prediction confidence based on multiple factors
  calculatePredictionConfidence(prediction, features, weatherData, maintenanceData) {
    let confidence = 0.5; // Base confidence
    
    // Weather data quality
    if (weatherData && weatherData.temperature !== null) {
      confidence += 0.1;
    }
    
    // Historical data availability
    const historicalData = this.getHistoricalBarrierFrequency(features);
    if (historicalData > 0) {
      confidence += 0.15;
    }
    
    // Maintenance data quality
    if (maintenanceData && maintenanceData.length > 0) {
      confidence += 0.1;
    }
    
    // Model prediction strength
    if (prediction > 0.8 || prediction < 0.2) {
      confidence += 0.15;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Get dynamic threshold based on confidence and conditions
  getDynamicThreshold(confidence, weatherData) {
    let baseThreshold = 0.6;
    
    // Lower threshold for high confidence predictions
    if (confidence > 0.8) {
      baseThreshold -= 0.1;
    }
    
    // Adjust for weather conditions
    if (weatherData?.precipitation > 10) {
      baseThreshold -= 0.05; // More sensitive in rain
    }
    
    if (weatherData?.temperature < 0) {
      baseThreshold -= 0.05; // More sensitive in cold
    }
    
    return Math.max(baseThreshold, 0.4);
  }

  // Enhanced barrier reason with more context
  getEnhancedBarrierReason(features, weatherData, maintenanceData) {
    const reasons = [];
    
    // Weather-based reasons
    if (weatherData?.precipitation > 10) {
      reasons.push('Heavy precipitation');
    }
    if (weatherData?.temperature < 0) {
      reasons.push('Freezing conditions');
    }
    
    // Historical reasons
    if (features[9] > 0.5) { // Historical barrier frequency
      reasons.push('Historical barrier hotspot');
    }
    
    // Maintenance reasons
    if (features[10] > 0.3) { // Maintenance proximity score
      reasons.push('Nearby maintenance work');
    }
    
    // Infrastructure reasons
    if (features[12] > 0.7) { // Infrastructure age
      reasons.push('Aging infrastructure');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Multiple factors';
  }

  // Enhanced severity calculation
  calculateEnhancedSeverity(prediction, features, confidence) {
    const baseSeverity = prediction * 10;
    let severity = Math.round(baseSeverity);
    
    // Adjust based on accessibility impact
    const accessibilityImpact = features[13]; // Accessibility score
    if (accessibilityImpact < 0.3) {
      severity += 2; // Higher severity for low accessibility areas
    }
    
    // Adjust based on seasonal factors
    const seasonalRisk = features[14]; // Seasonal risk factor
    severity += seasonalRisk * 2;
    
    // Adjust based on confidence
    if (confidence > 0.8) {
      severity += 1;
    }
    
    return {
      level: Math.min(severity, 10),
      category: severity <= 3 ? 'low' : severity <= 6 ? 'medium' : 'high',
      description: this.getSeverityDescription(severity)
    };
  }

  // Calculate accessibility impact
  calculateAccessibilityImpact(features) {
    const accessibilityScore = features[13];
    const infrastructureAge = features[12];
    const seasonalRisk = features[14];
    
    let impact = 'minimal';
    
    if (accessibilityScore < 0.3 || infrastructureAge > 0.7 || seasonalRisk > 0.6) {
      impact = 'significant';
    } else if (accessibilityScore < 0.5 || infrastructureAge > 0.5 || seasonalRisk > 0.3) {
      impact = 'moderate';
    }
    
    return {
      level: impact,
      wheelchairAccessible: accessibilityScore > 0.5,
      requiresAssistance: accessibilityScore < 0.3,
      seasonalVariation: seasonalRisk > 0.4
    };
  }

  // Suggest alternative routes
  async suggestAlternativeRoutes(location, features) {
    // This would integrate with the routing service
    // For now, return mock data
    return [
      {
        type: 'detour',
        distance: '150m',
        time: '+3 min',
        accessibility: 'high'
      },
      {
        type: 'transit',
        distance: '200m',
        time: '+5 min',
        accessibility: 'medium'
      }
    ];
  }

  // Estimate time to resolution
  estimateTimeToResolution(features, maintenanceData) {
    const infrastructureAge = features[12];
    const maintenanceProximityScore = features[10];
    
    let baseTime = 24; // hours
    
    if (infrastructureAge > 0.7) {
      baseTime *= 1.5; // Older infrastructure takes longer
    }
    
    if (maintenanceProximityScore > 0.5) {
      baseTime *= 0.7; // Near maintenance crews
    }
    
    return {
      hours: Math.round(baseTime),
      priority: baseTime < 12 ? 'high' : baseTime < 24 ? 'medium' : 'low'
    };
  }

  // Analyze seasonal factors
  analyzeSeasonalFactors(features, weatherData) {
    const seasonalRisk = features[14];
    const month = new Date().getMonth();
    
    const factors = {
      winter: month >= 11 || month <= 2,
      spring: month >= 3 && month <= 5,
      summer: month >= 6 && month <= 8,
      fall: month >= 9 && month <= 10,
      currentRisk: seasonalRisk,
      recommendations: []
    };
    
    if (factors.winter && weatherData?.temperature < 0) {
      factors.recommendations.push('Watch for ice and snow');
    }
    
    if (factors.spring && weatherData?.precipitation > 5) {
      factors.recommendations.push('Potential flooding');
    }
    
    return factors;
  }

  // Helper methods for feature extraction
  getHistoricalBarrierFrequency(coord) {
    // Mock implementation - would query historical data
    return Math.random() * 0.5;
  }

  getMaintenanceProximity(coord, maintenanceData) {
    // Mock implementation - would calculate distance to maintenance
    return Math.random() * 0.3;
  }

  getInfrastructureAge(coord) {
    // Mock implementation - would query infrastructure data
    return Math.random() * 0.8;
  }

  getAccessibilityScore(coord) {
    // Mock implementation - would query accessibility data
    return 0.3 + Math.random() * 0.7;
  }

  getSeasonalRiskFactor(coord, weatherData) {
    // Mock implementation - would calculate seasonal risk
    return Math.random() * 0.6;
  }

  getSeverityDescription(severity) {
    if (severity <= 3) return 'Minor inconvenience';
    if (severity <= 6) return 'Moderate barrier';
    if (severity <= 8) return 'Significant barrier';
    return 'Major accessibility issue';
  }

  // Rule-based barrier prediction (fallback)
  ruleBasedBarrierPrediction(route, weatherData, maintenanceData) {
    const predictions = [];
    
    route.coordinates.forEach((coord, index) => {
      let probability = 0;
      let reasons = [];

      // Weather-based predictions
      if (weatherData) {
        if (weatherData.temperature < 0 && weatherData.precipitation > 0) {
          probability += 0.3;
          reasons.push('Icy conditions likely');
        }
        if (weatherData.windSpeed > 30) {
          probability += 0.2;
          reasons.push('High winds may cause debris');
        }
      }

      // Maintenance-based predictions
      if (maintenanceData) {
        const nearbyMaintenance = this.findNearbyMaintenance(coord, maintenanceData);
        if (nearbyMaintenance.length > 0) {
          probability += 0.4;
          reasons.push(`Nearby maintenance work: ${nearbyMaintenance[0].type}`);
        }
      }

      // Historical data-based predictions
      const historicalRisk = this.getHistoricalRisk(coord);
      probability += historicalRisk * 0.3;
      if (historicalRisk > 0.5) {
        reasons.push('High historical barrier frequency');
      }

      if (probability > 0.5) {
        predictions.push({
          type: 'predicted_barrier',
          location: coord,
          probability: Math.min(probability, 0.95),
          reason: reasons.join(', '),
          severity: this.calculateSeverity(probability, [])
        });
      }
    });

    return predictions;
  }

  // Extract features from route for AI prediction
  extractRouteFeatures(route, weatherData, maintenanceData) {
    const features = [];
    
    route.coordinates.forEach((coord, index) => {
      const feature = [
        // Weather features
        weatherData?.temperature || 0,
        weatherData?.precipitation || 0,
        weatherData?.windSpeed || 0,
        
        // Time features
        new Date().getHours() / 24, // Hour of day (normalized)
        new Date().getDay() / 7,    // Day of week (normalized)
        
        // Location features
        coord.lat,
        coord.lng,
        
        // Historical risk
        this.getHistoricalRisk(coord),
        
        // Maintenance proximity
        this.getMaintenanceProximity(coord, maintenanceData),
        
        // Route segment features
        index / route.coordinates.length, // Position in route
        route.coordinates.length > 10 ? 1 : 0 // Long route indicator
      ];
      
      features.push(feature);
    });

    return features;
  }

  // Get historical risk for a location
  getHistoricalRisk(coord) {
    // This would typically query a database of historical barriers
    // For now, return a simple heuristic based on location
    const lat = Math.abs(coord.lat - 44.6475); // Distance from Halifax center
    const lng = Math.abs(coord.lng - (-63.5756));
    return Math.min((lat + lng) * 10, 1); // Normalized risk score
  }

  // Find nearby maintenance work
  findNearbyMaintenance(coord, maintenanceData) {
    if (!maintenanceData) return [];
    
    return maintenanceData.filter(maintenance => {
      const distance = this.calculateDistance(coord, maintenance.location);
      return distance < 0.5; // Within 500m
    });
  }

  // Calculate distance between two coordinates
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get maintenance proximity score
  getMaintenanceProximityScore(coord, maintenanceData) {
    if (!maintenanceData) return 0;
    
    const nearby = this.findNearbyMaintenance(coord, maintenanceData);
    return Math.min(nearby.length * 0.2, 1);
  }

  // Calculate barrier severity
  calculateSeverity(probability, features) {
    if (probability > 0.8) return 'high';
    if (probability > 0.6) return 'medium';
    return 'low';
  }

  // Get barrier reason based on features
  getBarrierReason(features, weatherData, maintenanceData) {
    const reasons = [];
    
    if (features[0] < 0) reasons.push('Freezing temperatures');
    if (features[1] > 0.5) reasons.push('Heavy precipitation');
    if (features[2] > 0.7) reasons.push('High winds');
    if (features[7] > 0.5) reasons.push('Historical barrier frequency');
    if (features[8] > 0.3) reasons.push('Nearby maintenance');
    
    return reasons.length > 0 ? reasons.join(', ') : 'General accessibility concern';
  }

  // Generate cache key for predictions
  generateCacheKey(route, weatherData, maintenanceData) {
    // Safely handle route coordinates
    const routeCoords = route?.coordinates || route?.geometry?.coordinates || [];
    const routeHash = JSON.stringify(Array.isArray(routeCoords) ? routeCoords.slice(0, 5) : []);
    const weatherHash = weatherData ? JSON.stringify(weatherData) : 'no-weather';
    const maintenanceHash = maintenanceData ? JSON.stringify(maintenanceData) : 'no-maintenance';
    return `${routeHash}-${weatherHash}-${maintenanceHash}`;
  }

  // Smart rerouting with accessibility constraints
  async generateAccessibleReroute(originalRoute, barriers, accessibilitySettings) {
    const constraints = this.buildAccessibilityConstraints(accessibilitySettings);
    const alternativeRoutes = await this.findAlternativeRoutes(originalRoute, constraints);
    
    return this.selectBestAlternative(alternativeRoutes, barriers, accessibilitySettings);
  }

  // Build accessibility constraints for rerouting
  buildAccessibilityConstraints(settings) {
    const constraints = {
      avoidSteps: settings.avoidSteps || false,
      avoidStairs: settings.avoidStairs || false,
      preferRamps: settings.preferRamps || false,
      maxSlope: settings.maxSlope || 8, // Maximum slope in degrees
      minWidth: settings.minWidth || 1.2, // Minimum path width in meters
      preferLightedPaths: settings.preferLightedPaths || false,
      avoidUnpavedPaths: settings.avoidUnpavedPaths || false
    };
    
    return constraints;
  }

  // Find alternative routes based on constraints
  async findAlternativeRoutes(originalRoute, constraints) {
    // This would typically call a routing API with accessibility parameters
    // For now, return a simple alternative
    const alternatives = [];
    
    // Generate parallel route
    const parallelRoute = this.generateParallelRoute(originalRoute, 100); // 100m offset
    alternatives.push({
      route: parallelRoute,
      score: this.calculateAccessibilityScore(parallelRoute, constraints),
      type: 'parallel'
    });
    
    // Generate detour route
    const detourRoute = this.generateDetourRoute(originalRoute, constraints);
    alternatives.push({
      route: detourRoute,
      score: this.calculateAccessibilityScore(detourRoute, constraints),
      type: 'detour'
    });
    
    return alternatives;
  }

  // Generate parallel route
  generateParallelRoute(originalRoute, offset) {
    // Simple parallel route generation
    const parallelCoords = originalRoute.coordinates.map(coord => ({
      lat: coord.lat + (offset / 111000), // Rough conversion to degrees
      lng: coord.lng + (offset / (111000 * Math.cos(coord.lat * Math.PI / 180)))
    }));
    
    return {
      ...originalRoute,
      coordinates: parallelCoords
    };
  }

  // Generate detour route
  generateDetourRoute(originalRoute, constraints) {
    // Simple detour generation - would be more sophisticated in real implementation
    const start = originalRoute.coordinates[0];
    const end = originalRoute.coordinates[originalRoute.coordinates.length - 1];
    
    // Create a detour via a midpoint
    const midPoint = {
      lat: (start.lat + end.lat) / 2 + 0.001,
      lng: (start.lng + end.lng) / 2 + 0.001
    };
    
    return {
      ...originalRoute,
      coordinates: [start, midPoint, end]
    };
  }

  // Calculate accessibility score for a route
  calculateAccessibilityScore(route, constraints) {
    let score = 100;
    
    // Penalize for steps if avoiding them
    if (constraints.avoidSteps) {
      score -= this.countSteps(route) * 10;
    }
    
    // Penalize for steep slopes
    score -= this.calculateSlopePenalty(route, constraints.maxSlope);
    
    // Penalize for narrow paths
    score -= this.calculateWidthPenalty(route, constraints.minWidth);
    
    // Bonus for ramps
    if (constraints.preferRamps) {
      score += this.countRamps(route) * 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Count steps in route (simplified)
  countSteps(route) {
    // This would query the steps dataset
    return Math.floor(Math.random() * 3); // Placeholder
  }

  // Count ramps in route (simplified)
  countRamps(route) {
    // This would query the ramps dataset
    return Math.floor(Math.random() * 2); // Placeholder
  }

  // Calculate slope penalty
  calculateSlopePenalty(route, maxSlope) {
    // This would calculate actual slopes from elevation data
    return Math.floor(Math.random() * 20); // Placeholder
  }

  // Calculate width penalty
  calculateWidthPenalty(route, minWidth) {
    // This would check path widths from infrastructure data
    return Math.floor(Math.random() * 15); // Placeholder
  }

  // Select best alternative route
  selectBestAlternative(alternatives, barriers, accessibilitySettings) {
    // Filter out routes with barriers
    const barrierFreeRoutes = alternatives.filter(alt => 
      !this.routeHasBarriers(alt.route, barriers)
    );
    
    if (barrierFreeRoutes.length === 0) {
      // If all routes have barriers, return the one with highest accessibility score
      return alternatives.reduce((best, current) => 
        current.score > best.score ? current : best
      );
    }
    
    // Return the route with highest accessibility score
    return barrierFreeRoutes.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  // Check if route has barriers
  routeHasBarriers(route, barriers) {
    return barriers.some(barrier => 
      route.coordinates.some(coord => 
        this.calculateDistance(coord, barrier.location) < 0.1 // Within 100m
      )
    );
  }

  // Debounced barrier prediction for performance
  debouncedPredictBarriers = debounce(async (route, weatherData, maintenanceData) => {
    return await this.predictBarriers(route, weatherData, maintenanceData);
  }, 500);

  // Update weather and maintenance data
  async updateExternalData() {
    try {
      // Fetch weather data
      this.weatherData = await this.fetchWeatherData();
      
      // Fetch maintenance data
      this.maintenanceData = await this.fetchMaintenanceData();
      
      this.lastUpdate = new Date();
    } catch (error) {
      console.error('Failed to update external data:', error);
    }
  }

  // Fetch weather data (placeholder)
  async fetchWeatherData() {
    // This would call a weather API
    return {
      temperature: 15,
      precipitation: 0,
      windSpeed: 10,
      conditions: 'clear'
    };
  }

  // Fetch maintenance data (placeholder)
  async fetchMaintenanceData() {
    // This would call municipal maintenance APIs
    return [];
  }
}

// Export singleton instance
const aiService = new AIService();
export default aiService;
