/**
 * Preference Routing Service
 * 
 * Applies user accessibility preferences to routing calculations
 * This service filters and weights routing data based on user needs
 */

const turf = require('@turf/turf');

class PreferenceRoutingService {
  constructor() {
    this.spatialIndexes = new Map();
  }

  /**
   * Apply user preferences to routing data
   * @param {Object} preferences - User accessibility preferences
   * @param {Object} geojsonLayers - Available routing data layers
   * @param {Object} options - Additional routing options (timeOfDay, etc.)
   * @returns {Object} Filtered and weighted routing data
   */
  applyPreferencesToRouting(preferences = {}, geojsonLayers = {}, options = {}) {
    const { timeOfDay = 'day' } = options;
    
    // Clone layers to avoid mutating originals
    const layers = {
      activeTravelways: geojsonLayers.activeTravelways ? { ...geojsonLayers.activeTravelways } : null,
      steps: geojsonLayers.steps ? { ...geojsonLayers.steps } : null,
      crossings: geojsonLayers.crossings ? { ...geojsonLayers.crossings } : null,
      lighting: geojsonLayers.lighting ? { ...geojsonLayers.lighting } : null,
      tactilePaving: geojsonLayers.tactilePaving ? { ...geojsonLayers.tactilePaving } : null,
      streetLights: geojsonLayers.streetLights ? { ...geojsonLayers.streetLights } : null,
    };

    // Weight overrides for route segments (lower = more preferred)
    const weightOverrides = new Map();

    // 1. HARD CONSTRAINTS - Exclude segments entirely
    
    // Exclude steps if user avoids them
    if (preferences.wheelchair || preferences.avoidSteps) {
      layers.activeTravelways = this.filterOutSteps(layers.activeTravelways, layers.steps);
    }

    // Exclude steep slopes
    if (preferences.avoidSteepSlopes) {
      layers.activeTravelways = this.filterOutSteepSlopes(layers.activeTravelways);
    }

    // Exclude segments without tactile paving for blind users
    if (preferences.blind && preferences.requireTactilePaving) {
      layers.activeTravelways = this.filterForTactilePaving(layers.activeTravelways, layers.tactilePaving);
    }

    // 2. SOFT PREFERENCES - Weight segments differently

    // Prefer well-lit paths at night
    if (preferences.preferWellLitAtNight && timeOfDay === 'night') {
      this.applyLightingWeights(layers.activeTravelways, layers.lighting, weightOverrides);
    }

    // Prefer crossings with audible signals
    if (preferences.lowVision || preferences.requireAudibleCrosswalks) {
      this.applyAudibleCrossingWeights(layers.activeTravelways, layers.crossings, weightOverrides);
    }

    // Prefer visual signals for hearing impaired users
    if (preferences.hearingImpaired || preferences.preferVisualSignals) {
      this.applyVisualSignalWeights(layers.activeTravelways, layers.crossings, weightOverrides);
    }

    return {
      layers,
      weightOverrides,
      preferences: preferences,
      appliedFilters: this.getAppliedFilters(preferences)
    };
  }

  /**
   * Filter out travelway segments that intersect with steps
   */
  filterOutSteps(travelways, steps) {
    if (!travelways || !steps || !travelways.features || !steps.features) {
      return travelways;
    }

    const stepIndex = this.buildSpatialIndex(steps.features);
    
    return {
      ...travelways,
      features: travelways.features.filter(segment => {
        return !this.segmentIntersectsSteps(segment, stepIndex);
      })
    };
  }

  /**
   * Filter out travelway segments with steep slopes
   */
  filterOutSteepSlopes(travelways) {
    if (!travelways || !travelways.features) {
      return travelways;
    }

    return {
      ...travelways,
      features: travelways.features.filter(segment => {
        const slope = segment.properties?.slope || 0;
        return slope < 8; // Exclude slopes >= 8% grade
      })
    };
  }

  /**
   * Filter for segments with tactile paving
   */
  filterForTactilePaving(travelways, tactilePaving) {
    if (!travelways || !travelways.features) {
      return travelways;
    }

    if (!tactilePaving || !tactilePaving.features) {
      // If no tactile paving data, return original (don't filter)
      return travelways;
    }

    const tactileIndex = this.buildSpatialIndex(tactilePaving.features);
    
    return {
      ...travelways,
      features: travelways.features.filter(segment => {
        return this.segmentNearTactilePaving(segment, tactileIndex);
      })
    };
  }

  /**
   * Apply lighting-based weights to route segments
   */
  applyLightingWeights(travelways, lighting, weightOverrides) {
    if (!travelways || !travelways.features || !lighting || !lighting.features) {
      return;
    }

    const lightingIndex = this.buildSpatialIndex(lighting.features);
    
    travelways.features.forEach(segment => {
      const segmentId = this.getSegmentId(segment);
      const nearbyLighting = this.findNearbyFeatures(segment, lightingIndex, 20); // 20m radius
      
      const hasGoodLighting = nearbyLighting.some(light => {
        const level = light.properties?.level || light.properties?.wattage || 0;
        return level >= 7; // Consider 7+ as good lighting
      });

      if (hasGoodLighting) {
        weightOverrides.set(segmentId, 0.7); // 30% cost reduction
      } else {
        weightOverrides.set(segmentId, 1.5); // 50% cost increase
      }
    });
  }

  /**
   * Apply audible crossing weights
   */
  applyAudibleCrossingWeights(travelways, crossings, weightOverrides) {
    if (!travelways || !travelways.features || !crossings || !crossings.features) {
      return;
    }

    const crossingIndex = this.buildSpatialIndex(crossings.features);
    
    travelways.features.forEach(segment => {
      const segmentId = this.getSegmentId(segment);
      const nearbyCrossings = this.findNearbyFeatures(segment, crossingIndex, 15); // 15m radius
      
      const hasAudibleCrossing = nearbyCrossings.some(crossing => {
        return crossing.properties?.audible === true || 
               crossing.properties?.audio_signal === true;
      });

      if (hasAudibleCrossing) {
        weightOverrides.set(segmentId, 0.6); // 40% cost reduction
      }
    });
  }

  /**
   * Apply visual signal weights
   */
  applyVisualSignalWeights(travelways, crossings, weightOverrides) {
    if (!travelways || !travelways.features || !crossings || !crossings.features) {
      return;
    }

    const crossingIndex = this.buildSpatialIndex(crossings.features);
    
    travelways.features.forEach(segment => {
      const segmentId = this.getSegmentId(segment);
      const nearbyCrossings = this.findNearbyFeatures(segment, crossingIndex, 15);
      
      const hasVisualSignal = nearbyCrossings.some(crossing => {
        return crossing.properties?.visual_signal === true || 
               crossing.properties?.traffic_light === true;
      });

      if (hasVisualSignal) {
        weightOverrides.set(segmentId, 0.8); // 20% cost reduction
      }
    });
  }

  /**
   * Build a simple spatial index for faster lookups
   */
  buildSpatialIndex(features) {
    return features.map(feature => ({
      ...feature,
      centroid: turf.centroid(feature)
    }));
  }

  /**
   * Check if a segment intersects with any steps
   */
  segmentIntersectsSteps(segment, stepIndex) {
    return stepIndex.some(step => {
      try {
        return turf.booleanIntersects(segment, step);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Check if a segment is near tactile paving
   */
  segmentNearTactilePaving(segment, tactileIndex) {
    return tactileIndex.some(tactile => {
      try {
        const distance = turf.distance(turf.centroid(segment), tactile.centroid, { units: 'meters' });
        return distance <= 10; // Within 10 meters
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Find features near a segment
   */
  findNearbyFeatures(segment, featureIndex, radiusMeters) {
    const segmentCentroid = turf.centroid(segment);
    
    return featureIndex.filter(feature => {
      try {
        const distance = turf.distance(segmentCentroid, feature.centroid, { units: 'meters' });
        return distance <= radiusMeters;
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * Get a unique ID for a route segment
   */
  getSegmentId(segment) {
    return segment.properties?.id || 
           segment.properties?.uid || 
           segment.id || 
           `${segment.geometry.coordinates[0][0]}_${segment.geometry.coordinates[0][1]}`;
  }

  /**
   * Get a summary of applied filters for debugging
   */
  getAppliedFilters(preferences) {
    const filters = [];
    
    if (preferences.wheelchair || preferences.avoidSteps) {
      filters.push('excluded_steps');
    }
    
    if (preferences.avoidSteepSlopes) {
      filters.push('excluded_steep_slopes');
    }
    
    if (preferences.blind && preferences.requireTactilePaving) {
      filters.push('required_tactile_paving');
    }
    
    if (preferences.preferWellLitAtNight) {
      filters.push('preferred_well_lit');
    }
    
    if (preferences.requireAudibleCrosswalks) {
      filters.push('preferred_audible_crossings');
    }
    
    if (preferences.preferVisualSignals) {
      filters.push('preferred_visual_signals');
    }
    
    return filters;
  }

  /**
   * Generate simplified routing instructions for cognitive accessibility
   */
  generateSimplifiedInstructions(route, preferences) {
    if (!preferences.cognitiveAccessibility && !preferences.simplifiedInstructions) {
      return route.instructions || [];
    }

    // Simplify complex instructions
    const simplifiedInstructions = route.instructions?.map(instruction => {
      return {
        ...instruction,
        text: this.simplifyInstructionText(instruction.text),
        distance: this.roundDistance(instruction.distance),
        duration: this.roundDuration(instruction.duration)
      };
    }) || [];

    return simplifiedInstructions;
  }

  /**
   * Simplify instruction text
   */
  simplifyInstructionText(text) {
    // Replace complex directions with simpler ones
    return text
      .replace(/Turn left onto/gi, 'Go left on')
      .replace(/Turn right onto/gi, 'Go right on')
      .replace(/Continue straight/gi, 'Go straight')
      .replace(/at the intersection/gi, 'at the crossing')
      .replace(/approximately/gi, 'about')
      .replace(/Continue for/gi, 'Go for');
  }

  /**
   * Round distance to nearest 10 meters
   */
  roundDistance(distance) {
    return Math.round(distance / 10) * 10;
  }

  /**
   * Round duration to nearest minute
   */
  roundDuration(duration) {
    return Math.round(duration / 60) * 60;
  }
}

module.exports = new PreferenceRoutingService();








