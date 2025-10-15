/**
 * Real-Time Barrier Service
 * 
 * Integrates real-time barrier data with accessibility routing
 * - Loads current closures and construction
 * - Updates routing weights dynamically
 * - Provides barrier avoidance in pathfinding
 */

class RealTimeBarrierService {
  constructor() {
    this.isInitialized = false;
    this.barriers = new Map();
    this.updateInterval = null;
    this.updateFrequency = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚧 Initializing Real-Time Barrier Service...');
    
    try {
      await this.loadCurrentBarriers();
      this.startPeriodicUpdates();
      this.isInitialized = true;
      console.log('✅ Real-Time Barrier Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize barrier service:', error);
      throw error;
    }
  }

  /**
   * Load current barriers from server
   */
  async loadCurrentBarriers() {
    try {
      const response = await fetch('/api/accessibility-data/combined/core');
      if (!response.ok) {
        throw new Error(`Failed to load barrier data: ${response.status}`);
      }
      
      const data = await response.json();
      this.processBarrierData(data.data);
      
      console.log(`📊 Loaded ${this.barriers.size} barriers`);
    } catch (error) {
      console.error('❌ Error loading barriers:', error);
      throw error;
    }
  }

  /**
   * Process barrier data and create spatial index
   */
  processBarrierData(data) {
    this.barriers.clear();
    
    if (data.features) {
      for (const feature of data.features) {
        if (feature.dataset === 'steps') {
          this.addStepBarrier(feature);
        } else if (feature.dataset === 'closures') {
          this.addClosureBarrier(feature);
        }
      }
    }
  }

  /**
   * Add step barrier to spatial index
   */
  addStepBarrier(feature) {
    const coords = feature.geometry.coordinates;
    const props = feature.properties;
    
    const barrier = {
      id: props.ASSETID || `step_${coords[0]}_${coords[1]}`,
      type: 'steps',
      coordinates: coords,
      severity: 'high',
      material: props.MAT || 'unknown',
      location: props.LOCATION || 'Unknown location',
      weight: 100.0, // Very high weight to avoid
      radius: 50 // 50m radius around steps
    };
    
    this.barriers.set(barrier.id, barrier);
  }

  /**
   * Add closure barrier to spatial index
   */
  addClosureBarrier(feature) {
    const coords = feature.geometry.coordinates;
    const props = feature.properties;
    
    const barrier = {
      id: props.ASSETID || `closure_${coords[0]}_${coords[1]}`,
      type: 'closure',
      coordinates: coords,
      severity: 'critical',
      description: props.DESCRIPTION || 'Sidewalk closure',
      weight: 1000.0, // Extremely high weight
      radius: 100 // 100m radius around closures
    };
    
    this.barriers.set(barrier.id, barrier);
  }

  /**
   * Get barriers near a route segment
   */
  getBarriersNearRoute(routeCoordinates, radius = 100) {
    const nearbyBarriers = [];
    
    for (const [barrierId, barrier] of this.barriers) {
      for (const coord of routeCoordinates) {
        const distance = this.calculateDistance(coord, barrier.coordinates);
        
        if (distance <= radius) {
          nearbyBarriers.push({
            ...barrier,
            distance: distance,
            impact: this.calculateBarrierImpact(barrier, distance)
          });
        }
      }
    }
    
    return nearbyBarriers;
  }

  /**
   * Calculate barrier impact on routing weight
   */
  calculateBarrierImpact(barrier, distance) {
    let impact = barrier.weight;
    
    // Reduce impact based on distance
    if (distance > 0) {
      impact = impact * (1 - (distance / barrier.radius));
    }
    
    return Math.max(0, impact);
  }

  /**
   * Get routing weight adjustment for a coordinate
   */
  getRoutingWeightAdjustment(coordinates) {
    let totalAdjustment = 0;
    
    for (const [barrierId, barrier] of this.barriers) {
      const distance = this.calculateDistance(coordinates, barrier.coordinates);
      
      if (distance <= barrier.radius) {
        const impact = this.calculateBarrierImpact(barrier, distance);
        totalAdjustment += impact;
      }
    }
    
    return totalAdjustment;
  }

  /**
   * Check if coordinates are near any barriers
   */
  isNearBarrier(coordinates, radius = 50) {
    for (const [barrierId, barrier] of this.barriers) {
      const distance = this.calculateDistance(coordinates, barrier.coordinates);
      if (distance <= radius) {
        return {
          near: true,
          barrier: barrier,
          distance: distance
        };
      }
    }
    
    return { near: false };
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(coord1, coord2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
    const dLng = (coord2[0] - coord1[0]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Start periodic barrier updates
   */
  startPeriodicUpdates() {
    this.updateInterval = setInterval(async () => {
      try {
        await this.loadCurrentBarriers();
        console.log('🔄 Barrier data updated');
      } catch (error) {
        console.error('❌ Error updating barriers:', error);
      }
    }, this.updateFrequency);
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get all barriers
   */
  getAllBarriers() {
    return Array.from(this.barriers.values());
  }

  /**
   * Get barriers by type
   */
  getBarriersByType(type) {
    return Array.from(this.barriers.values()).filter(barrier => barrier.type === type);
  }

  /**
   * Shutdown service
   */
  shutdown() {
    this.stopPeriodicUpdates();
    this.barriers.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
const realTimeBarrierService = new RealTimeBarrierService();

export default realTimeBarrierService;

