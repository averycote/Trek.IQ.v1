/**
 * Elevation Service
 * 
 * Provides elevation data and slope analysis
 */

class ElevationService {
  constructor() {
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Elevation Service...');
    
    this.isInitialized = true;
      console.log('✅ Elevation Service initialized');
  }

  /**
   * Get elevation for coordinates
   */
  async getElevation(coordinates) {
    try {
      // This is a simplified implementation
      // In a real implementation, you would call an elevation API
      
      const cacheKey = `${coordinates[0]},${coordinates[1]}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.elevation;
        }
      }
      
      // Mock elevation data for Halifax area
      const elevation = Math.random() * 100; // Random elevation between 0-100m
      
      this.cache.set(cacheKey, {
        elevation: elevation,
        timestamp: Date.now()
      });
      
      return elevation;
    } catch (error) {
      console.error('❌ Error getting elevation:', error);
      return 0;
    }
  }

  /**
   * Calculate slope between two points
   */
  async calculateSlope(point1, point2) {
    try {
      const elevation1 = await this.getElevation(point1);
      const elevation2 = await this.getElevation(point2);
      
      // Calculate distance between points
      const distance = this.calculateDistance(point1, point2);
      
      if (distance === 0) return 0;
      
      // Calculate slope percentage
      const slope = ((elevation2 - elevation1) / distance) * 100;
      
      return slope;
    } catch (error) {
      console.error('❌ Error calculating slope:', error);
      return 0;
    }
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Analyze route for elevation changes
   */
  async analyzeRouteElevation(route) {
    try {
      if (!route?.features?.[0]?.geometry?.coordinates) {
        return { totalElevationGain: 0, maxSlope: 0, averageSlope: 0 };
      }
      
      const coordinates = route.features[0].geometry.coordinates;
      let totalElevationGain = 0;
      let maxSlope = 0;
      let slopeSum = 0;
      let slopeCount = 0;
      
      for (let i = 1; i < coordinates.length; i++) {
        const prevCoord = coordinates[i - 1];
        const currCoord = coordinates[i];
        
        const slope = await this.calculateSlope(prevCoord, currCoord);
        maxSlope = Math.max(maxSlope, Math.abs(slope));
        slopeSum += Math.abs(slope);
        slopeCount++;
        
        if (slope > 0) {
          totalElevationGain += slope;
        }
      }
      
      return {
        totalElevationGain: Math.round(totalElevationGain),
        maxSlope: Math.round(maxSlope * 100) / 100,
        averageSlope: slopeCount > 0 ? Math.round((slopeSum / slopeCount) * 100) / 100 : 0
      };
    } catch (error) {
      console.error('❌ Error analyzing route elevation:', error);
      return { totalElevationGain: 0, maxSlope: 0, averageSlope: 0 };
    }
  }
}

// Create singleton instance
const elevationService = new ElevationService();

export default elevationService;