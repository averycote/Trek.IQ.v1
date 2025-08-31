// OpenElevationService - Integration with Open-Elevation API for route elevation analysis
// https://open-elevation.com/

import { debugService } from './debugService';

class OpenElevationService {
  constructor() {
    this.baseUrl = 'https://api.open-elevation.com/api/v1/lookup';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
    this.rateLimit = {
      requests: 0,
      lastReset: Date.now(),
      maxRequests: 1000 // Per day
    };
    this.maxBatchSize = 100; // Maximum coordinates per request
  }

  // Check rate limiting
  checkRateLimit() {
    const now = Date.now();
    if (now - this.rateLimit.lastReset > 86400000) { // 24 hours
      this.rateLimit.requests = 0;
      this.rateLimit.lastReset = now;
    }
    
    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      throw new Error('OpenElevation API rate limit exceeded');
    }
    
    this.rateLimit.requests++;
  }

  // Get elevation data for route coordinates
  async getRouteElevation(coordinates, options = {}) {
    const {
      maxSlopeThreshold = 5, // 5% slope threshold for warnings
      sampleInterval = 50, // Sample every 50 meters
      includeSlopeAnalysis = true
    } = options;

    // Check cache first
    const cacheKey = `elevation_${JSON.stringify(coordinates)}_${maxSlopeThreshold}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Check rate limit
    this.checkRateLimit();

    try {
      // Sample coordinates at regular intervals to reduce API calls
      const sampledCoordinates = this.sampleCoordinates(coordinates, sampleInterval);
      
      // Get elevation data in batches
      const elevationData = await this.getElevationBatch(sampledCoordinates);
      
      // Calculate slopes and analyze route
      const routeAnalysis = this.analyzeRouteElevation(elevationData, coordinates, {
        maxSlopeThreshold,
        includeSlopeAnalysis
      });

      // Cache the result
      this.cache.set(cacheKey, {
        data: routeAnalysis,
        timestamp: Date.now()
      });

      return routeAnalysis;

    } catch (error) {
      console.error('OpenElevation API error:', error);
      throw error;
    }
  }

  // Sample coordinates at regular intervals
  sampleCoordinates(coordinates, interval) {
    if (coordinates.length <= 2) return coordinates;

    const sampled = [coordinates[0]]; // Always include start
    let distanceAccumulated = 0;

    for (let i = 1; i < coordinates.length; i++) {
      const prevCoord = coordinates[i - 1];
      const currCoord = coordinates[i];
      
      const segmentDistance = this.calculateDistance(prevCoord, currCoord);
      distanceAccumulated += segmentDistance;

      if (distanceAccumulated >= interval) {
        sampled.push(currCoord);
        distanceAccumulated = 0;
      }
    }

    // Always include end point
    if (sampled[sampled.length - 1] !== coordinates[coordinates.length - 1]) {
      sampled.push(coordinates[coordinates.length - 1]);
    }

    return sampled;
  }

  // Get elevation data for a batch of coordinates
  async getElevationBatch(coordinates) {
    const batches = this.chunkArray(coordinates, this.maxBatchSize);
    const allResults = [];

    for (const batch of batches) {
      const locations = batch.map(coord => ({
        latitude: coord[1],
        longitude: coord[0]
      }));

      const requestBody = { locations };

      try {
        debugService.log('OpenElevationService API call', { url: this.baseUrl, method: 'POST', status: 'loading' });
        
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const error = new Error(`OpenElevation API error: ${response.status} ${response.statusText}`);
          debugService.error('OpenElevationService API call failed', { url: this.baseUrl, method: 'POST', error });
          throw error;
        }

        const data = await response.json();
        debugService.log('OpenElevationService API call successful', { url: this.baseUrl, method: 'POST', data });
        
        if (data.results) {
          allResults.push(...data.results);
        }

        // Add small delay between batches to be respectful
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error('Error fetching elevation batch:', error);
        // Return fallback data for this batch
        const fallbackResults = batch.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
          elevation: 0 // Fallback elevation
        }));
        allResults.push(...fallbackResults);
      }
    }

    return allResults;
  }

  // Analyze route elevation and calculate slopes
  analyzeRouteElevation(elevationData, originalCoordinates, options) {
    const { maxSlopeThreshold = 5, includeSlopeAnalysis = true } = options;

    const analysis = {
      totalDistance: 0,
      totalElevationGain: 0,
      totalElevationLoss: 0,
      maxElevation: -Infinity,
      minElevation: Infinity,
      steepSegments: [],
      slopeWarnings: [],
      elevationProfile: [],
      accessibilityScore: 100
    };

    // Create elevation profile
    for (let i = 0; i < elevationData.length; i++) {
      const point = elevationData[i];
      const elevation = point.elevation || 0;
      
      analysis.elevationProfile.push({
        index: i,
        coordinate: [point.longitude, point.latitude],
        elevation: elevation,
        distance: i > 0 ? this.calculateDistance(
          [elevationData[i-1].longitude, elevationData[i-1].latitude],
          [point.longitude, point.latitude]
        ) : 0
      });

      analysis.maxElevation = Math.max(analysis.maxElevation, elevation);
      analysis.minElevation = Math.min(analysis.minElevation, elevation);
    }

    // Calculate slopes and identify steep segments
    if (includeSlopeAnalysis && elevationData.length > 1) {
      for (let i = 1; i < elevationData.length; i++) {
        const prevPoint = elevationData[i - 1];
        const currPoint = elevationData[i];
        
        const distance = this.calculateDistance(
          [prevPoint.longitude, prevPoint.latitude],
          [currPoint.longitude, currPoint.latitude]
        );
        
        const elevationChange = (currPoint.elevation || 0) - (prevPoint.elevation || 0);
        const slope = distance > 0 ? (elevationChange / distance) * 100 : 0; // Slope as percentage
        
        analysis.totalDistance += distance;
        
        if (elevationChange > 0) {
          analysis.totalElevationGain += elevationChange;
        } else {
          analysis.totalElevationLoss += Math.abs(elevationChange);
        }

        // Check for steep segments
        if (Math.abs(slope) > maxSlopeThreshold) {
          const segment = {
            startIndex: i - 1,
            endIndex: i,
            startCoordinate: [prevPoint.longitude, prevPoint.latitude],
            endCoordinate: [currPoint.longitude, currPoint.latitude],
            startElevation: prevPoint.elevation || 0,
            endElevation: currPoint.elevation || 0,
            distance: distance,
            slope: slope,
            slopePercentage: Math.abs(slope),
            isUphill: slope > 0,
            severity: this.getSlopeSeverity(slope)
          };

          analysis.steepSegments.push(segment);
          
          // Add warning
          analysis.slopeWarnings.push({
            type: 'steep_slope',
            message: `${segment.isUphill ? 'Uphill' : 'Downhill'} slope of ${Math.abs(slope).toFixed(1)}% detected`,
            severity: segment.severity,
            segment: segment
          });

          // Reduce accessibility score
          analysis.accessibilityScore -= this.getSlopePenalty(slope);
        }
      }
    }

    // Ensure accessibility score doesn't go below 0
    analysis.accessibilityScore = Math.max(0, analysis.accessibilityScore);

    // Add summary warnings
    if (analysis.steepSegments.length > 0) {
      analysis.slopeWarnings.unshift({
        type: 'summary',
        message: `${analysis.steepSegments.length} steep segments detected on this route`,
        severity: 'moderate',
        count: analysis.steepSegments.length
      });
    }

    return analysis;
  }

  // Calculate distance between two coordinates in meters
  calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1[1] * Math.PI / 180;
    const φ2 = coord2[1] * Math.PI / 180;
    const Δφ = (coord2[1] - coord1[1]) * Math.PI / 180;
    const Δλ = (coord2[0] - coord1[0]) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  // Get slope severity level
  getSlopeSeverity(slope) {
    const absSlope = Math.abs(slope);
    if (absSlope > 15) return 'high';
    if (absSlope > 10) return 'moderate';
    if (absSlope > 5) return 'low';
    return 'minimal';
  }

  // Get accessibility penalty for slope
  getSlopePenalty(slope) {
    const absSlope = Math.abs(slope);
    if (absSlope > 15) return 20;
    if (absSlope > 10) return 15;
    if (absSlope > 5) return 10;
    return 0;
  }

  // Split array into chunks
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Get elevation for a single coordinate
  async getSingleElevation(latitude, longitude) {
    const cacheKey = `single_${latitude}_${longitude}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}?locations=${latitude},${longitude}`);
      if (response.ok) {
        const data = await response.json();
        const result = data.results?.[0];
        
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return result;
      }
    } catch (error) {
      console.error('Error fetching single elevation:', error);
    }
    
    return { latitude, longitude, elevation: 0 };
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key: key.substring(0, 50) + '...',
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('OpenElevationService cache cleared');
  }
}

export default OpenElevationService;
