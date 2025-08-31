// Enhanced AI Service for Trek.IQ with Mapbox Integration
class EnhancedAIService {
  constructor() {
    this.accessibilityFeatures = new Map();
    this.barrierPredictions = new Map();
    this.routeModifications = new Map();
    this.explanations = new Map();
    this.isInitialized = false;
  }

  // Initialize the AI service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing enhanced AI service...');
      await this.loadAccessibilityModels();
      this.isInitialized = true;
      console.log('Enhanced AI service initialized successfully');
    } catch (error) {
      console.error('Error initializing AI service:', error);
    }
  }

  // Load accessibility models and data
  async loadAccessibilityModels() {
    try {
      // Load accessibility features from municipal datasets
      const datasets = [
        'steps',
        'sidewalk_closures',
        'traffic_control',
        'street_lights',
        'accessible_parking',
        'transit_shelters'
      ];

      for (const dataset of datasets) {
        try {
          const response = await fetch(`/api/data/${dataset}.geojson`);
          if (response.ok) {
            const data = await response.json();
            this.processAccessibilityData(dataset, data);
          }
        } catch (error) {
          console.warn(`Error loading ${dataset} dataset:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading accessibility models:', error);
    }
  }

  // Process accessibility data for AI analysis
  processAccessibilityData(datasetName, data) {
    if (!data.features) return;

    data.features.forEach(feature => {
      const coords = feature.geometry?.coordinates;
      if (coords) {
        const [lng, lat] = Array.isArray(coords[0]) ? coords[0] : coords;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        
        this.accessibilityFeatures.set(key, {
          type: datasetName,
          feature,
          properties: feature.properties || {},
          severity: this.calculateSeverity(feature, datasetName)
        });
      }
    });
  }

  // Calculate severity of accessibility issue
  calculateSeverity(feature, type) {
    const properties = feature.properties || {};
    
    switch (type) {
      case 'steps':
        return properties.stepCount > 10 ? 'high' : 'medium';
      case 'sidewalk_closures':
        return properties.closureType === 'full' ? 'critical' : 'high';
      case 'traffic_control':
        return 'medium';
      case 'street_lights':
        return properties.working === false ? 'high' : 'low';
      default:
        return 'medium';
    }
  }

  // Analyze route for accessibility issues
  async analyzeRouteAccessibility(route) {
    if (!route || !route.features || route.features.length === 0) {
      return { issues: [], modifications: [], explanation: 'No route to analyze' };
    }

    const issues = [];
    const modifications = [];
    let totalIssues = 0;

    route.features.forEach(feature => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates) return;

      coordinates.forEach(coord => {
        const nearbyIssues = this.findNearbyAccessibilityIssues(coord);
        issues.push(...nearbyIssues);
        totalIssues += nearbyIssues.length;
      });
    });

    // Generate modifications based on issues
    if (issues.length > 0) {
      modifications.push(...this.generateRouteModifications(issues));
    }

    // Generate AI explanation
    const explanation = this.generateAccessibilityExplanation(issues, modifications);

    return {
      issues,
      modifications,
      explanation,
      severity: this.calculateOverallSeverity(issues),
      totalIssues
    };
  }

  // Find nearby accessibility issues
  findNearbyAccessibilityIssues(coordinate, radius = 0.001) {
    const issues = [];
    const [lng, lat] = coordinate;
    
    this.accessibilityFeatures.forEach((feature, key) => {
      const [featureLat, featureLng] = key.split(',').map(Number);
      const distance = this.calculateDistance([lng, lat], [featureLng, featureLat]);
      
      if (distance <= radius) {
        issues.push({
          ...feature,
          distance,
          location: coordinate
        });
      }
    });

    return issues.sort((a, b) => a.distance - b.distance);
  }

  // Generate route modifications based on accessibility issues
  generateRouteModifications(issues) {
    const modifications = [];
    const issueTypes = new Set(issues.map(issue => issue.type));

    issueTypes.forEach(type => {
      switch (type) {
        case 'steps':
          modifications.push({
            type: 'reroute',
            reason: 'Avoid steps for accessibility',
            alternative: 'Use ramp or elevator if available',
            impact: 'medium',
            priority: 'high'
          });
          break;
        case 'sidewalk_closures':
          modifications.push({
            type: 'reroute',
            reason: 'Avoid sidewalk closure',
            alternative: 'Use alternative accessible route',
            impact: 'high',
            priority: 'critical'
          });
          break;
        case 'traffic_control':
          modifications.push({
            type: 'warning',
            reason: 'Traffic control device ahead',
            alternative: 'Exercise caution and follow signals',
            impact: 'low',
            priority: 'medium'
          });
          break;
        case 'street_lights':
          modifications.push({
            type: 'warning',
            reason: 'Poor lighting conditions',
            alternative: 'Consider daytime travel or well-lit alternative',
            impact: 'medium',
            priority: 'medium'
          });
          break;
        default:
          console.warn(`Unknown issue type: ${type}`);
          break;
      }
    });

    return modifications.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Generate accessibility explanation
  generateAccessibilityExplanation(issues, modifications) {
    if (issues.length === 0) {
      return "This route is accessible and follows best practices for your needs.";
    }

    const explanations = [];
    const issueCounts = {};
    
    // Count issues by type
    issues.forEach(issue => {
      issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
    });

    // Generate explanations for each type of issue
    Object.entries(issueCounts).forEach(([type, count]) => {
      const typeName = this.getIssueTypeName(type);
      if (count === 1) {
        explanations.push(`We detected 1 ${typeName} on your route.`);
      } else {
        explanations.push(`We detected ${count} ${typeName}s on your route.`);
      }
    });

    // Add modification explanations
    modifications.forEach(mod => {
      if (mod.type === 'reroute') {
        explanations.push(`We've adjusted your route to ${mod.reason.toLowerCase()}. ${mod.alternative}.`);
      } else if (mod.type === 'warning') {
        explanations.push(`Note: ${mod.reason}. ${mod.alternative}.`);
      }
    });

    return explanations.join(' ');
  }

  // Get human-readable issue type name
  getIssueTypeName(type) {
    const typeNames = {
      'steps': 'step',
      'sidewalk_closures': 'sidewalk closure',
      'traffic_control': 'traffic control device',
      'street_lights': 'lighting issue',
      'accessible_parking': 'parking issue',
      'transit_shelters': 'transit shelter issue'
    };
    return typeNames[type] || type;
  }

  // Calculate overall severity of issues
  calculateOverallSeverity(issues) {
    if (issues.length === 0) return 'none';

    const severityScores = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    const totalScore = issues.reduce((sum, issue) => {
      return sum + (severityScores[issue.severity] || 1);
    }, 0);

    const averageScore = totalScore / issues.length;

    if (averageScore >= 3.5) return 'critical';
    if (averageScore >= 2.5) return 'high';
    if (averageScore >= 1.5) return 'medium';
    return 'low';
  }

  // Predict potential barriers along route
  async predictBarriers(route) {
    if (!route || !route.features) return [];

    const predictions = [];
    const coordinates = [];

    // Collect all coordinates from route
    route.features.forEach(feature => {
      if (feature.geometry?.coordinates) {
        coordinates.push(...feature.geometry.coordinates);
      }
    });

    // Analyze each coordinate for potential barriers
    coordinates.forEach(coord => {
      const nearbyFeatures = this.findNearbyAccessibilityIssues(coord, 0.002);
      
      nearbyFeatures.forEach(feature => {
        if (feature.severity === 'high' || feature.severity === 'critical') {
          predictions.push({
            type: 'predicted_barrier',
            location: coord,
            feature,
            confidence: this.calculatePredictionConfidence(feature),
            description: `Potential ${this.getIssueTypeName(feature.type)} ahead`
          });
        }
      });
    });

    return predictions;
  }

  // Calculate prediction confidence
  calculatePredictionConfidence(feature) {
    const baseConfidence = 0.7;
    const severityBonus = {
      'critical': 0.3,
      'high': 0.2,
      'medium': 0.1,
      'low': 0.0
    };

    return Math.min(1.0, baseConfidence + (severityBonus[feature.severity] || 0));
  }

  // Suggest alternative routes
  async suggestAlternativeRoutes(origin, destination, originalRoute, issues) {
    const alternatives = [];
    
    // Generate alternative routes based on accessibility issues
    if (issues.some(issue => issue.type === 'steps')) {
      alternatives.push({
        type: 'ramp_alternative',
        description: 'Route avoiding steps',
        reason: 'Uses ramps and elevators where available',
        estimatedTime: originalRoute.features[0]?.properties?.duration * 1.2 || 0
      });
    }

    if (issues.some(issue => issue.type === 'sidewalk_closures')) {
      alternatives.push({
        type: 'detour_alternative',
        description: 'Route avoiding closures',
        reason: 'Uses open sidewalks and paths',
        estimatedTime: originalRoute.features[0]?.properties?.duration * 1.3 || 0
      });
    }

    if (issues.some(issue => issue.type === 'street_lights')) {
      alternatives.push({
        type: 'daytime_alternative',
        description: 'Daytime route',
        reason: 'Uses well-lit paths and main streets',
        estimatedTime: originalRoute.features[0]?.properties?.duration * 1.1 || 0
      });
    }

    return alternatives;
  }

  // Calculate distance between coordinates
  calculateDistance(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  // Get accessibility recommendations
  getAccessibilityRecommendations(route, issues) {
    const recommendations = [];

    if (issues.some(issue => issue.type === 'steps')) {
      recommendations.push({
        type: 'mobility_aid',
        title: 'Consider mobility aid',
        description: 'Steps detected on route - consider using a mobility aid or assistance',
        priority: 'high'
      });
    }

    if (issues.some(issue => issue.type === 'sidewalk_closures')) {
      recommendations.push({
        type: 'planning',
        title: 'Plan ahead',
        description: 'Sidewalk closures detected - allow extra time for detours',
        priority: 'high'
      });
    }

    if (issues.some(issue => issue.type === 'street_lights')) {
      recommendations.push({
        type: 'timing',
        title: 'Consider timing',
        description: 'Poor lighting conditions - consider traveling during daylight hours',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // Get service statistics
  getStats() {
    return {
      accessibilityFeaturesCount: this.accessibilityFeatures.size,
      barrierPredictionsCount: this.barrierPredictions.size,
      routeModificationsCount: this.routeModifications.size,
      isInitialized: this.isInitialized
    };
  }

  // Clear all data
  clearData() {
    this.accessibilityFeatures.clear();
    this.barrierPredictions.clear();
    this.routeModifications.clear();
    this.explanations.clear();
  }
}

// Export singleton instance
const enhancedAIService = new EnhancedAIService();
export default enhancedAIService;
