/**
 * Comprehensive Route Accessibility Scorer
 * 
 * This service provides accurate, dynamic route accessibility scoring by integrating
 * data from multiple sources: elevation, Wheelmap, Overpass API, barrier detection,
 * and user preferences.
 */

import * as turf from '@turf/turf';

class ComprehensiveRouteScorer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    
    // Scoring weights for different factors
    this.weights = {
      elevation: 0.25,      // Slope/elevation changes
      infrastructure: 0.20,  // Sidewalks, ramps, etc.
      barriers: 0.20,       // Physical barriers
      amenities: 0.15,      // Accessible amenities along route
      surface: 0.10,        // Surface quality
      lighting: 0.05,       // Lighting conditions
      safety: 0.05         // Safety factors
    };
    
    // Base scores for different conditions
    this.baseScores = {
      excellent: 95,
      good: 80,
      fair: 65,
      poor: 40,
      veryPoor: 20
    };
  }

  /**
   * Calculate comprehensive accessibility score for a route
   * @param {Object} route - GeoJSON route object
   * @param {Object} options - Scoring options and user preferences
   * @returns {Promise<Object>} Comprehensive scoring result
   */
  async calculateRouteScore(route, options = {}) {
    try {
      const cacheKey = this.generateCacheKey(route, options);
      const cached = this.getCachedScore(cacheKey);
      if (cached) {
        console.log('✅ Using cached route score');
        return cached;
      }

      console.log('🔍 Calculating comprehensive route accessibility score...');
      
      if (!route?.features?.[0]?.geometry?.coordinates) {
        console.warn('Invalid route data for scoring');
        return this.getDefaultScore();
      }

      const coordinates = route.features[0].geometry.coordinates;
      const routeProperties = route.features[0].properties || {};
      
      // Initialize scoring components
      const scoringResult = {
        overallScore: 0,
        grade: 'C',
        color: '#f59e0b',
        components: {
          elevation: { score: 0, weight: this.weights.elevation, details: {} },
          infrastructure: { score: 0, weight: this.weights.infrastructure, details: {} },
          barriers: { score: 0, weight: this.weights.barriers, details: {} },
          amenities: { score: 0, weight: this.weights.amenities, details: {} },
          surface: { score: 0, weight: this.weights.surface, details: {} },
          lighting: { score: 0, weight: this.weights.lighting, details: {} },
          safety: { score: 0, weight: this.weights.safety, details: {} }
        },
        analysis: {
          totalDistance: 0,
          steepSegments: [],
          barriers: [],
          accessibleFeatures: [],
          warnings: [],
          recommendations: []
        },
        confidence: 0.8 // Base confidence level
      };

      // Calculate route distance
      const routeLine = turf.lineString(coordinates);
      scoringResult.analysis.totalDistance = turf.length(routeLine, { units: 'meters' });

      // Analyze each scoring component
      await Promise.all([
        this.analyzeElevation(coordinates, scoringResult, options),
        this.analyzeInfrastructure(coordinates, scoringResult, options),
        this.analyzeBarriers(coordinates, scoringResult, options),
        this.analyzeAmenities(coordinates, scoringResult, options),
        this.analyzeSurface(coordinates, scoringResult, options),
        this.analyzeLighting(coordinates, scoringResult, options),
        this.analyzeSafety(coordinates, scoringResult, options)
      ]);

      // Calculate weighted overall score
      this.calculateWeightedScore(scoringResult);
      
      // Apply user preference adjustments
      this.applyUserPreferences(scoringResult, options.userPreferences || {});
      
      // Generate grade and color
      this.assignGradeAndColor(scoringResult);
      
      // Cache the result
      this.setCachedScore(cacheKey, scoringResult);
      
      console.log(`✅ Route scoring complete - Score: ${scoringResult.overallScore}, Grade: ${scoringResult.grade}`);
      return scoringResult;

    } catch (error) {
      console.error('❌ Error calculating route score:', error);
      return this.getDefaultScore();
    }
  }

  /**
   * Analyze elevation and slope data
   */
  async analyzeElevation(coordinates, result, options) {
    try {
      // Lazy load elevation service
      const { default: elevationService } = await import('./elevationService');
      
      if (!elevationService.isAvailable()) {
        console.warn('Elevation service not available, using fallback');
        result.components.elevation.score = 70; // Neutral score
        result.components.elevation.details = { fallback: true };
        return;
      }

      // Convert coordinates to elevation API format
      const elevationPoints = coordinates.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));

      const elevationData = await elevationService.getElevation(elevationPoints);
      
      if (!elevationData || elevationData.length === 0) {
        result.components.elevation.score = 70;
        return;
      }

      // Analyze slopes
      const slopeAnalysis = this.calculateSlopes(elevationData);
      result.components.elevation.details = slopeAnalysis;
      result.analysis.steepSegments = slopeAnalysis.steepSegments;

      // Score based on slope difficulty
      let elevationScore = this.baseScores.excellent;
      
      // Penalize for steep segments
      const maxSlope = options.userPreferences?.maxSlope || 8; // 8% default max slope
      slopeAnalysis.steepSegments.forEach(segment => {
        if (segment.grade > maxSlope) {
          const penalty = Math.min(30, (segment.grade - maxSlope) * 3);
          elevationScore -= penalty;
        }
      });

      // Penalize for total elevation gain
      if (slopeAnalysis.totalElevationGain > 50) {
        elevationScore -= Math.min(20, slopeAnalysis.totalElevationGain / 10);
      }

      result.components.elevation.score = Math.max(0, elevationScore);
      
      // Add warnings for steep segments
      if (slopeAnalysis.steepSegments.length > 0) {
        result.analysis.warnings.push({
          type: 'elevation',
          severity: 'medium',
          message: `${slopeAnalysis.steepSegments.length} steep segment(s) detected`,
          details: slopeAnalysis.steepSegments
        });
      }

    } catch (error) {
      console.error('Error analyzing elevation:', error);
      result.components.elevation.score = 70; // Neutral fallback
    }
  }

  /**
   * Analyze infrastructure from Overpass API
   */
  async analyzeInfrastructure(coordinates, result, options) {
    try {
      // Lazy load Overpass service
      const { default: overpassApiService } = await import('./overpassApiService');
      
      // Create bounding box around route
      const routeLine = turf.lineString(coordinates);
      const buffered = turf.buffer(routeLine, 100, { units: 'meters' });
      const bbox = turf.bbox(buffered);
      
      const bounds = {
        south: bbox[1],
        west: bbox[0], 
        north: bbox[3],
        east: bbox[2]
      };

      const infrastructureData = await overpassApiService.getPedestrianInfrastructure(bounds);
      
      let infrastructureScore = this.baseScores.fair; // Start with fair
      const details = {
        sidewalks: 0,
        crossings: 0,
        ramps: 0,
        elevators: 0,
        accessibleParking: 0
      };

      if (infrastructureData.elements) {
        infrastructureData.elements.forEach(element => {
          const tags = element.tags || {};
          
          // Count sidewalks and footways
          if (tags.highway === 'footway' || tags.highway === 'sidewalk') {
            details.sidewalks++;
            infrastructureScore += 2;
          }
          
          // Count accessible crossings
          if (tags.highway === 'crossing' && tags.crossing === 'traffic_signals') {
            details.crossings++;
            infrastructureScore += 3;
          }
          
          // Count ramps
          if (tags.highway === 'steps' && tags['ramp:wheelchair'] === 'yes') {
            details.ramps++;
            infrastructureScore += 5;
          }
          
          // Count elevators
          if (tags.highway === 'elevator') {
            details.elevators++;
            infrastructureScore += 8;
          }
          
          // Count accessible parking
          if (tags.amenity === 'parking' && tags.wheelchair === 'yes') {
            details.accessibleParking++;
            infrastructureScore += 3;
          }
        });
      }

      result.components.infrastructure.score = Math.min(100, infrastructureScore);
      result.components.infrastructure.details = details;

      // Add accessible features to analysis
      const accessibleFeatures = [];
      if (details.ramps > 0) accessibleFeatures.push(`${details.ramps} ramp(s)`);
      if (details.elevators > 0) accessibleFeatures.push(`${details.elevators} elevator(s)`);
      if (details.accessibleParking > 0) accessibleFeatures.push(`${details.accessibleParking} accessible parking space(s)`);
      
      result.analysis.accessibleFeatures.push(...accessibleFeatures);

    } catch (error) {
      console.error('Error analyzing infrastructure:', error);
      result.components.infrastructure.score = 65; // Fair fallback
    }
  }

  /**
   * Analyze barriers from multiple sources
   */
  async analyzeBarriers(coordinates, result, options) {
    try {
      // Lazy load barrier detection registry
      const { default: barrierDetectionRegistry } = await import('./barrierDetectionRegistry');
      
      const routeLine = turf.lineString(coordinates);
      const routeData = {
        geometry: { coordinates },
        bounds: turf.bbox(routeLine)
      };

      let barrierScore = this.baseScores.excellent; // Start optimistic
      const allBarriers = [];

      // Get barriers from all registered services
      const services = ['local_geojson', 'user_reports', 'overpass'];
      
      for (const serviceId of services) {
        try {
          const service = barrierDetectionRegistry.getService(serviceId);
          if (service?.available) {
            const barriers = await service.detect(routeData);
            allBarriers.push(...barriers);
          }
        } catch (error) {
          console.warn(`Barrier service ${serviceId} failed:`, error);
        }
      }

      // Score based on barrier severity and count
      allBarriers.forEach(barrier => {
        const impact = this.calculateBarrierImpact(barrier, options.userPreferences);
        barrierScore -= impact;
        
        result.analysis.barriers.push({
          type: barrier.type || 'unknown',
          severity: barrier.severity || 'medium',
          location: barrier.location,
          impact: impact,
          description: barrier.description
        });
      });

      result.components.barriers.score = Math.max(0, barrierScore);
      result.components.barriers.details = {
        totalBarriers: allBarriers.length,
        highSeverity: allBarriers.filter(b => b.severity === 'high').length,
        mediumSeverity: allBarriers.filter(b => b.severity === 'medium').length,
        lowSeverity: allBarriers.filter(b => b.severity === 'low').length
      };

      // Add warnings for significant barriers
      if (allBarriers.length > 3) {
        result.analysis.warnings.push({
          type: 'barriers',
          severity: 'high',
          message: `${allBarriers.length} potential barriers detected along route`,
          details: allBarriers
        });
      }

    } catch (error) {
      console.error('Error analyzing barriers:', error);
      result.components.barriers.score = 80; // Good fallback
    }
  }

  /**
   * Analyze accessible amenities along route
   */
  async analyzeAmenities(coordinates, result, options) {
    try {
      // Lazy load Wheelmap service
      const { default: wheelmapApiService } = await import('./wheelmapApiService');
      
      const routeGeoJSON = {
        features: [{
          geometry: { coordinates },
          properties: {}
        }]
      };

      const amenityAnalysis = await wheelmapApiService.analyzeRouteAccessibility(routeGeoJSON, 200);
      
      let amenityScore = this.baseScores.fair; // Start with fair
      
      if (amenityAnalysis.totalPOIs > 0) {
        // Boost score based on accessible amenities
        const accessibleRatio = amenityAnalysis.accessibilityStats?.accessible / amenityAnalysis.totalPOIs;
        amenityScore += accessibleRatio * 30;
        
        // Additional boost for variety of amenities
        const categories = amenityAnalysis.categoryBreakdown || {};
        const categoryCount = Object.keys(categories).length;
        amenityScore += Math.min(15, categoryCount * 3);
      }

      result.components.amenities.score = Math.min(100, amenityScore);
      result.components.amenities.details = {
        totalPOIs: amenityAnalysis.totalPOIs,
        accessiblePOIs: amenityAnalysis.accessibilityStats?.accessible || 0,
        categories: amenityAnalysis.categoryBreakdown,
        accessibilityRatio: amenityAnalysis.totalPOIs > 0 ? 
          (amenityAnalysis.accessibilityStats?.accessible / amenityAnalysis.totalPOIs) : 0
      };

    } catch (error) {
      console.error('Error analyzing amenities:', error);
      result.components.amenities.score = 65; // Fair fallback
    }
  }

  /**
   * Analyze surface conditions (simplified for now)
   */
  async analyzeSurface(coordinates, result, options) {
    // This would ideally integrate with street surface data
    // For now, provide a reasonable default based on urban/rural context
    
    let surfaceScore = this.baseScores.good; // Assume good surfaces in urban areas
    
    result.components.surface.score = surfaceScore;
    result.components.surface.details = {
      assumedSurface: 'paved',
      confidence: 0.6,
      note: 'Surface analysis based on urban context assumptions'
    };
  }

  /**
   * Analyze lighting conditions (simplified for now)
   */
  async analyzeLighting(coordinates, result, options) {
    // This would ideally integrate with street lighting data
    // For now, provide a reasonable default
    
    let lightingScore = this.baseScores.good; // Assume adequate lighting in urban areas
    
    result.components.lighting.score = lightingScore;
    result.components.lighting.details = {
      assumedLighting: 'adequate',
      confidence: 0.5,
      note: 'Lighting analysis based on urban context assumptions'
    };
  }

  /**
   * Analyze safety factors (simplified for now)
   */
  async analyzeSafety(coordinates, result, options) {
    // This would ideally integrate with crime data, traffic data, etc.
    // For now, provide a reasonable default
    
    let safetyScore = this.baseScores.good; // Assume good safety in urban areas
    
    result.components.safety.score = safetyScore;
    result.components.safety.details = {
      assumedSafety: 'good',
      confidence: 0.5,
      note: 'Safety analysis based on urban context assumptions'
    };
  }

  /**
   * Calculate slopes from elevation data
   */
  calculateSlopes(elevationData) {
    const slopes = [];
    const steepSegments = [];
    let totalElevationGain = 0;
    let totalElevationLoss = 0;

    for (let i = 1; i < elevationData.length; i++) {
      const prev = elevationData[i - 1];
      const curr = elevationData[i];
      
      if (!prev || !curr || prev.elevation === undefined || curr.elevation === undefined) continue;
      
      // Calculate distance between points (approximate)
      const distance = this.calculateDistance(prev, curr);
      const elevationChange = curr.elevation - prev.elevation;
      const grade = distance > 0 ? Math.abs(elevationChange / distance) * 100 : 0;
      
      slopes.push({
        index: i,
        grade: grade,
        elevationChange: elevationChange,
        distance: distance
      });

      // Track elevation changes
      if (elevationChange > 0) {
        totalElevationGain += elevationChange;
      } else {
        totalElevationLoss += Math.abs(elevationChange);
      }

      // Identify steep segments (>6% grade)
      if (grade > 6) {
        steepSegments.push({
          startIndex: i - 1,
          endIndex: i,
          grade: grade,
          elevationChange: elevationChange,
          distance: distance,
          severity: grade > 12 ? 'high' : grade > 8 ? 'medium' : 'low'
        });
      }
    }

    return {
      slopes,
      steepSegments,
      totalElevationGain,
      totalElevationLoss,
      maxGrade: Math.max(...slopes.map(s => s.grade), 0),
      avgGrade: slopes.length > 0 ? slopes.reduce((sum, s) => sum + s.grade, 0) / slopes.length : 0
    };
  }

  /**
   * Calculate barrier impact based on type and user preferences
   */
  calculateBarrierImpact(barrier, userPreferences = {}) {
    let baseImpact = 10; // Default impact
    
    switch (barrier.type) {
      case 'steps':
        baseImpact = userPreferences.mobilityDevice === 'wheelchair' ? 40 : 15;
        break;
      case 'construction':
        baseImpact = 25;
        break;
      case 'narrow_path':
        baseImpact = userPreferences.mobilityDevice === 'wheelchair' ? 20 : 8;
        break;
      case 'steep_slope':
        baseImpact = 18;
        break;
      case 'no_sidewalk':
        baseImpact = 15;
        break;
      default:
        baseImpact = 10;
    }

    // Adjust based on severity
    const severityMultiplier = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5
    };
    
    return baseImpact * (severityMultiplier[barrier.severity] || 1.0);
  }

  /**
   * Calculate weighted overall score
   */
  calculateWeightedScore(result) {
    let weightedSum = 0;
    let totalWeight = 0;

    Object.entries(result.components).forEach(([key, component]) => {
      weightedSum += component.score * component.weight;
      totalWeight += component.weight;
    });

    result.overallScore = Math.round(weightedSum / totalWeight);
  }

  /**
   * Apply user preference adjustments
   */
  applyUserPreferences(result, preferences) {
    // Adjust scores based on user-specific needs
    if (preferences.mobilityDevice === 'wheelchair') {
      // More weight on barriers and infrastructure
      if (result.components.barriers.score < 70) {
        result.overallScore -= 10;
      }
      if (result.components.infrastructure.score > 80) {
        result.overallScore += 5;
      }
    }

    if (preferences.visualImpairment) {
      // More weight on lighting and safety
      if (result.components.lighting.score < 70) {
        result.overallScore -= 8;
      }
    }

    if (preferences.avoidSteps && result.analysis.barriers.some(b => b.type === 'steps')) {
      result.overallScore -= 15;
      result.analysis.warnings.push({
        type: 'user_preference',
        severity: 'high',
        message: 'Route contains steps, but user preference is to avoid steps'
      });
    }

    // Ensure score stays within bounds
    result.overallScore = Math.max(0, Math.min(100, result.overallScore));
  }

  /**
   * Assign grade and color based on score
   */
  assignGradeAndColor(result) {
    const score = result.overallScore;
    
    if (score >= 90) {
      result.grade = 'A';
      result.color = '#10b981'; // Green
      result.label = 'Excellent';
    } else if (score >= 75) {
      result.grade = 'B';
      result.color = '#3b82f6'; // Blue
      result.label = 'Good';
    } else if (score >= 60) {
      result.grade = 'C';
      result.color = '#f59e0b'; // Orange
      result.label = 'Fair';
    } else if (score >= 40) {
      result.grade = 'D';
      result.color = '#ef4444'; // Red
      result.label = 'Poor';
    } else {
      result.grade = 'F';
      result.color = '#7c2d12'; // Dark red
      result.label = 'Very Poor';
    }
  }

  /**
   * Helper methods
   */
  calculateDistance(point1, point2) {
    // Simple distance calculation (Haversine would be more accurate)
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = point1.latitude * Math.PI / 180;
    const lat2Rad = point2.latitude * Math.PI / 180;
    const deltaLat = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLng = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  generateCacheKey(route, options) {
    const coords = route.features?.[0]?.geometry?.coordinates;
    if (!coords) return 'invalid';
    
    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];
    const prefsHash = JSON.stringify(options.userPreferences || {});
    
    return `${firstCoord[0]},${firstCoord[1]}-${lastCoord[0]},${lastCoord[1]}-${prefsHash}`;
  }

  getCachedScore(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedScore(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  getDefaultScore() {
    return {
      overallScore: 75,
      grade: 'B',
      color: '#3b82f6',
      label: 'Good',
      components: {},
      analysis: {
        totalDistance: 0,
        steepSegments: [],
        barriers: [],
        accessibleFeatures: [],
        warnings: [{
          type: 'system',
          severity: 'low',
          message: 'Using default accessibility score due to analysis error'
        }],
        recommendations: []
      },
      confidence: 0.3
    };
  }
}

export default new ComprehensiveRouteScorer();
