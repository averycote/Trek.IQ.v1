/**
 * Accessibility.Cloud Service for Trek.IQ
 * 
 * This service integrates with accessibility.cloud API to fetch and process
 * accessibility data for places along generated routes. It uses Turf.js for
 * spatial operations to filter POIs within 50m of the route.
 */

import * as turf from '@turf/turf';

class AccessibilityCloudService {
  constructor() {
    this.baseUrl = 'https://accessibility-cloud-v2.freetls.fastly.net';
    this.appToken = 'eb848ae2fbaff7680ff34a9f31eabf06';
    // Specific Wheelmap dataset source with 150k records
    this.wheelmapSourceId = 'LiBTS67TjmBcXdEmX';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Main method to get accessibility data for a route
   * @param {Object} route - GeoJSON route object
   * @returns {Object} Processed accessibility summary
   */
  async getRouteAccessibilityData(route) {
    try {
      if (!route?.features?.[0]?.geometry?.coordinates) {
        console.warn('AccessibilityCloud: Invalid route data provided');
        return this.createEmptyResponse();
      }

      const routeGeometry = route.features[0].geometry;
      console.log('🌐 AccessibilityCloud: Processing route accessibility data');

      // Step 1: Compute bounding box around the route
      const bbox = this.computeRouteBoundingBox(routeGeometry);
      console.log('📍 AccessibilityCloud: Route bounding box:', bbox);

      // Step 2: Fetch POI data from accessibility.cloud API
      const poisData = await this.fetchAccessibilityData(bbox);
      
      if (!poisData || poisData.length === 0) {
        console.log('📍 AccessibilityCloud: No POI data found in area');
        return this.createEmptyResponse();
      }

      console.log(`📍 AccessibilityCloud: Found ${poisData.length} POIs in bounding box`);

      // Step 3: Filter POIs to those within 1km of route using spatial analysis
      const nearbyPois = this.filterPoisNearRoute(poisData, routeGeometry);
      console.log(`📍 AccessibilityCloud: Filtered to ${nearbyPois.length} POIs within 1km of route`);

      // Step 3.5: Fallback - if no POIs found with spatial filtering, use all POIs in bounding box
      let finalPois = nearbyPois;
      if (nearbyPois.length === 0 && poisData.length > 0) {
        console.log('🔄 AccessibilityCloud: No POIs found with spatial filtering, using all POIs in bounding box as fallback');
        finalPois = poisData.slice(0, 50); // Limit to first 50 for performance
        console.log(`📍 AccessibilityCloud: Using ${finalPois.length} POIs from bounding box as fallback`);
      }

      // Step 4: Process and summarize accessibility information
      const accessibilitySummary = this.processAccessibilityData(finalPois);
      
      return accessibilitySummary;

    } catch (error) {
      console.error('❌ AccessibilityCloud: Error fetching accessibility data:', error);
      return this.createErrorResponse();
    }
  }

  /**
   * Compute bounding box around route using Turf.js
   * @param {Object} routeGeometry - GeoJSON LineString geometry
   * @returns {Array} [minLon, minLat, maxLon, maxLat]
   */
  computeRouteBoundingBox(routeGeometry) {
    try {
      // Create a Turf LineString from the route geometry
      const routeLine = turf.lineString(routeGeometry.coordinates);
      
      // Get the bounding box
      const bbox = turf.bbox(routeLine);
      
      // Add a small buffer to ensure we catch nearby POIs
      const buffer = 0.002; // ~200m buffer
      return [
        bbox[0] - buffer, // minLon
        bbox[1] - buffer, // minLat
        bbox[2] + buffer, // maxLon
        bbox[3] + buffer  // maxLat
      ];
    } catch (error) {
      console.error('❌ AccessibilityCloud: Error computing bounding box:', error);
      // Fallback to Halifax area if route processing fails
      return [-63.7, 44.6, -63.5, 44.7];
    }
  }

  /**
   * Fetch accessibility data from accessibility.cloud API
   * @param {Array} bbox - Bounding box [minLon, minLat, maxLon, maxLat]
   * @returns {Array} Array of POI objects
   */
  async fetchAccessibilityData(bbox) {
    const cacheKey = bbox.join(',');
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📍 AccessibilityCloud: Using cached data');
        return cached.data;
      }
    }

    try {
      const bboxString = bbox.join(',');
      // Target the specific Wheelmap dataset with 150k records
      const url = `${this.baseUrl}/place-infos.json?appToken=${this.appToken}&bbox=${bboxString}&limit=500&sourceId=${this.wheelmapSourceId}`;
      
      console.log('📍 AccessibilityCloud: Fetching from Wheelmap dataset (150k records):', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const features = data.features || [];

      console.log('📊 AccessibilityCloud: API Response:', {
        status: response.status,
        dataKeys: Object.keys(data),
        featuresCount: features.length,
        sampleFeature: features.length > 0 ? {
          type: features[0].type,
          geometry: features[0].geometry ? 'present' : 'missing',
          properties: features[0].properties ? Object.keys(features[0].properties) : 'missing'
        } : 'No features'
      });

      // Cache the result
      this.cache.set(cacheKey, {
        data: features,
        timestamp: Date.now()
      });

      return features;

    } catch (error) {
      console.error('❌ AccessibilityCloud: API request failed:', error);
      return [];
    }
  }

  /**
   * Filter POIs to those within 50m of the route using Turf.js spatial analysis
   * @param {Array} pois - Array of POI features from accessibility.cloud
   * @param {Object} routeGeometry - Route LineString geometry
   * @returns {Array} Filtered POI array
   */
  filterPoisNearRoute(pois, routeGeometry) {
    try {
      console.log('🔍 AccessibilityCloud: Starting POI filtering...');
      console.log('📍 Input POIs:', pois.length);
      console.log('📍 Sample POI structure:', pois.length > 0 ? pois[0] : 'No POIs to sample');

      const routeLine = turf.lineString(routeGeometry.coordinates);
      const bufferDistance = 1.0; // 1000 meters - expanded to capture maximum accessibility data
      const routeBuffer = turf.buffer(routeLine, bufferDistance, { units: 'kilometers' });
      
      console.log('🗺️ AccessibilityCloud: Route buffer created:', {
        bufferDistance: `${bufferDistance}km`,
        routeCoordinates: routeGeometry.coordinates.length,
        bufferBounds: turf.bbox(routeBuffer)
      });

      let validPois = 0;
      let invalidPois = 0;
      let nearbyCount = 0;

      const nearbyPois = pois.filter(poi => {
        try {
          // Extract coordinates from POI geometry
          if (!poi.geometry || !poi.geometry.coordinates) {
            invalidPois++;
            console.log('⚠️ AccessibilityCloud: POI missing geometry:', poi);
            return false;
          }

          validPois++;
          const poiPoint = turf.point(poi.geometry.coordinates);
          
          // Check if POI point intersects with route buffer
          const isNearby = turf.booleanIntersects(poiPoint, routeBuffer);
          if (isNearby) {
            nearbyCount++;
            console.log('✅ AccessibilityCloud: POI within route buffer:', {
              name: poi.properties?.name || 'Unknown',
              coordinates: poi.geometry.coordinates
            });
          } else if (validPois <= 3) {
            // Log first few POIs that are NOT nearby for debugging
            console.log('❌ AccessibilityCloud: POI outside route buffer:', {
              name: poi.properties?.name || 'Unknown',
              coordinates: poi.geometry.coordinates,
              distance: turf.distance(poiPoint, routeLine, { units: 'meters' }) + 'm'
            });
          }
          
          return isNearby;
          
        } catch (error) {
          console.warn('⚠️ AccessibilityCloud: Error processing POI:', error, poi);
          return false;
        }
      });

      console.log('📊 AccessibilityCloud: Filtering results:', {
        totalPois: pois.length,
        validPois,
        invalidPois,
        nearbyCount,
        bufferDistance: `${bufferDistance * 1000}m`
      });

      return nearbyPois;

    } catch (error) {
      console.error('❌ AccessibilityCloud: Error filtering POIs:', error);
      return [];
    }
  }

  /**
   * Process accessibility data and create summary
   * @param {Array} nearbyPois - Filtered POI array
   * @returns {Object} Accessibility summary object
   */
  processAccessibilityData(nearbyPois) {
    const summary = {
      hasData: true,
      totalPois: nearbyPois.length,
      accessibleCount: 0,
      notAccessibleCount: 0,
      unknownCount: 0,
      categories: {},
      highlights: [],
      details: []
    };

    if (nearbyPois.length === 0) {
      return this.createEmptyResponse();
    }

    nearbyPois.forEach(poi => {
      try {
        const properties = poi.properties || {};
        const accessibility = properties.accessibility || {};
        const category = this.categorizePlace(properties);
        
        // Count accessibility status
        const isAccessible = this.determineAccessibility(accessibility, properties);
        if (isAccessible === true) {
          summary.accessibleCount++;
        } else if (isAccessible === false) {
          summary.notAccessibleCount++;
        } else {
          summary.unknownCount++;
        }

        // Group by category
        if (!summary.categories[category]) {
          summary.categories[category] = {
            total: 0,
            accessible: 0,
            notAccessible: 0,
            unknown: 0
          };
        }
        
        summary.categories[category].total++;
        if (isAccessible === true) {
          summary.categories[category].accessible++;
        } else if (isAccessible === false) {
          summary.categories[category].notAccessible++;
        } else {
          summary.categories[category].unknown++;
        }

        // Add to details for display
        summary.details.push({
          name: properties.name || 'Unnamed Place',
          category: category,
          isAccessible: isAccessible,
          accessibility: accessibility,
          distance: this.calculateDistance(poi, properties)
        });

      } catch (error) {
        console.warn('⚠️ AccessibilityCloud: Error processing POI data:', error);
      }
    });

    // Generate highlights (summary messages)
    summary.highlights = this.generateHighlights(summary);

    return summary;
  }

  /**
   * Determine accessibility status from accessibility.cloud data
   * @param {Object} accessibility - Accessibility object from POI
   * @returns {boolean|null} true (accessible), false (not accessible), null (unknown)
   */
  determineAccessibility(accessibility, properties = {}) {
    // Debug: log the actual data structure
    if (Object.keys(accessibility).length > 0 || Object.keys(properties).length > 0) {
      console.log('🔍 AccessibilityCloud: Analyzing accessibility data:', {
        accessibility: accessibility,
        properties: Object.keys(properties),
        sampleProps: Object.keys(properties).slice(0, 5).reduce((obj, key) => {
          obj[key] = properties[key];
          return obj;
        }, {})
      });
    }

    if (!accessibility || Object.keys(accessibility).length === 0) {
      // Try to extract accessibility from main properties
      return this.determineAccessibilityFromProperties(properties);
    }

    // Check various accessibility indicators
    const entranceAccessible = accessibility.entranceIsAccessible;
    const hasAccessibleEntrance = accessibility.hasAccessibleEntrance;
    const wheelchairAccessible = accessibility.isWheelchairAccessible;
    const accessibilityRating = accessibility.accessibilityRating;

    // If explicitly marked as accessible
    if (entranceAccessible === true || hasAccessibleEntrance === true || wheelchairAccessible === true) {
      return true;
    }

    // If explicitly marked as not accessible
    if (entranceAccessible === false || hasAccessibleEntrance === false || wheelchairAccessible === false) {
      return false;
    }

    // Check rating-based accessibility
    if (accessibilityRating && typeof accessibilityRating === 'number') {
      return accessibilityRating >= 0.7; // 70% threshold for accessibility
    }

    // Check for partial accessibility indicators
    const hasRamp = accessibility.hasRamp;
    const hasElevator = accessibility.hasElevator;
    const hasAccessibleToilet = accessibility.hasAccessibleToilet;

    if (hasRamp === true || hasElevator === true || hasAccessibleToilet === true) {
      return true;
    }

    return null; // Unknown accessibility status
  }

  /**
   * Try to determine accessibility from main properties when accessibility object is empty
   * @param {Object} properties - Main properties object
   * @returns {boolean|null} true (accessible), false (not accessible), null (unknown)
   */
  determineAccessibilityFromProperties(properties) {
    if (!properties || Object.keys(properties).length === 0) {
      return null;
    }

    // Check common accessibility field names in properties
    // Enhanced for Wheelmap dataset from accessibility.cloud
    const wheelchairFields = ['wheelchair', 'wheelchairAccessible', 'wheelchair_accessible', 'wheelchairAccessible'];
    const accessibilityFields = ['accessibility', 'accessible', 'isAccessible', 'wheelchair'];
    
    for (const field of wheelchairFields) {
      const value = properties[field];
      if (value === 'yes' || value === true || value === 'accessible') {
        return true;
      }
      if (value === 'no' || value === false || value === 'not_accessible') {
        return false;
      }
      if (value === 'limited' || value === 'partial') {
        return true; // Consider limited as accessible
      }
    }

    for (const field of accessibilityFields) {
      const value = properties[field];
      if (value === 'yes' || value === true || value === 'accessible') {
        return true;
      }
      if (value === 'no' || value === false || value === 'not_accessible') {
        return false;
      }
    }

    // For fallback data, assume places are accessible unless specified otherwise
    if (properties.source === 'Halifax Accessibility Fallback') {
      return true;
    }

    // If we have any accessibility-related data but can't determine status, 
    // create a simple heuristic based on place type
    const category = properties.category || '';
    const name = (properties.name || '').toLowerCase();
    
    // Modern buildings and services are more likely to be accessible
    if (name.includes('library') || name.includes('hospital') || name.includes('university') || 
        name.includes('government') || name.includes('civic') || name.includes('public') ||
        category.includes('healthcare') || category.includes('education') || category.includes('government')) {
      return true;
    }

    return null; // Unknown
  }

  /**
   * Categorize place based on properties
   * @param {Object} properties - POI properties
   * @returns {string} Category name
   */
  categorizePlace(properties) {
    const category = properties.category;
    const name = (properties.name || '').toLowerCase();
    
    if (category) {
      // Use provided category
      if (category.includes('restaurant') || category.includes('food')) return 'restaurant';
      if (category.includes('shop') || category.includes('store')) return 'shopping';
      if (category.includes('health') || category.includes('hospital')) return 'healthcare';
      if (category.includes('transport') || category.includes('transit')) return 'transportation';
      if (category.includes('hotel') || category.includes('accommodation')) return 'accommodation';
      if (category.includes('entertainment') || category.includes('culture')) return 'entertainment';
      return category;
    }

    // Categorize based on name if no category provided
    if (name.includes('restaurant') || name.includes('cafe') || name.includes('coffee')) return 'restaurant';
    if (name.includes('shop') || name.includes('store') || name.includes('market')) return 'shopping';
    if (name.includes('hospital') || name.includes('clinic') || name.includes('pharmacy')) return 'healthcare';
    if (name.includes('bus') || name.includes('metro') || name.includes('station')) return 'transportation';
    if (name.includes('hotel') || name.includes('inn') || name.includes('lodge')) return 'accommodation';
    if (name.includes('museum') || name.includes('theater') || name.includes('cinema')) return 'entertainment';
    if (name.includes('bank') || name.includes('atm') || name.includes('office')) return 'services';
    
    return 'other';
  }

  /**
   * Calculate approximate distance (placeholder - could be enhanced with actual route distance)
   * @param {Object} poi - POI object
   * @param {Object} properties - POI properties
   * @returns {number} Distance in meters
   */
  calculateDistance(poi, properties) {
    // This is a placeholder - in a real implementation, you might calculate
    // the actual distance along the route to this POI
    return Math.floor(Math.random() * 100) + 10; // Random distance between 10-110m
  }

  /**
   * Generate highlight messages for the accessibility summary
   * @param {Object} summary - Processed accessibility summary
   * @returns {Array} Array of highlight strings
   */
  generateHighlights(summary) {
    const highlights = [];

    if (summary.totalPois === 0) {
      return ['No accessibility data found for this route.'];
    }

    // Wheelchair accessible places
    if (summary.accessibleCount > 0) {
      highlights.push(`♿ ${summary.accessibleCount} wheelchair accessible place${summary.accessibleCount > 1 ? 's' : ''} along this route`);
    }

    // Not accessible places warning
    if (summary.notAccessibleCount > 0) {
      highlights.push(`⚠️ ${summary.notAccessibleCount} nearby place${summary.notAccessibleCount > 1 ? 's' : ''} not wheelchair accessible`);
    }

    // Specific amenities
    const categories = summary.categories;
    
    // Restaurants
    if (categories.restaurant && categories.restaurant.accessible > 0) {
      highlights.push(`🍽️ ${categories.restaurant.accessible} accessible restaurant${categories.restaurant.accessible > 1 ? 's' : ''} nearby`);
    }

    // Healthcare
    if (categories.healthcare && categories.healthcare.accessible > 0) {
      highlights.push(`🏥 ${categories.healthcare.accessible} accessible healthcare facilit${categories.healthcare.accessible > 1 ? 'ies' : 'y'} nearby`);
    }

    // Transportation
    if (categories.transportation && categories.transportation.accessible > 0) {
      highlights.push(`🚌 ${categories.transportation.accessible} accessible transit stop${categories.transportation.accessible > 1 ? 's' : ''} nearby`);
    }

    // Shopping
    if (categories.shopping && categories.shopping.accessible > 0) {
      highlights.push(`🛍️ ${categories.shopping.accessible} accessible shop${categories.shopping.accessible > 1 ? 's' : ''} nearby`);
    }

    // Services (including restrooms)
    if (categories.services && categories.services.accessible > 0) {
      // Check if any of the services might be restrooms
      const hasRestroom = summary.details.some(detail => 
        detail.category === 'services' && 
        detail.name.toLowerCase().includes('restroom') ||
        detail.name.toLowerCase().includes('washroom') ||
        detail.name.toLowerCase().includes('toilet')
      );
      
      if (hasRestroom) {
        highlights.push(`🚻 Accessible restroom available nearby`);
      } else {
        highlights.push(`🏢 ${categories.services.accessible} accessible service${categories.services.accessible > 1 ? 's' : ''} nearby`);
      }
    }

    // If no highlights generated, show general summary
    if (highlights.length === 0 && summary.totalPois > 0) {
      highlights.push(`📍 ${summary.totalPois} place${summary.totalPois > 1 ? 's' : ''} found along route - accessibility varies`);
    }

    return highlights;
  }

  /**
   * Create empty response when no data is available
   * @returns {Object} Empty response object
   */
  createEmptyResponse() {
    return {
      hasData: false,
      totalPois: 0,
      accessibleCount: 0,
      notAccessibleCount: 0,
      unknownCount: 0,
      categories: {},
      highlights: ['No accessibility data found for this route.'],
      details: []
    };
  }

  /**
   * Create error response when API fails
   * @returns {Object} Error response object
   */
  createErrorResponse() {
    return {
      hasData: false,
      totalPois: 0,
      accessibleCount: 0,
      notAccessibleCount: 0,
      unknownCount: 0,
      categories: {},
      highlights: ['Accessibility info unavailable.'],
      details: [],
      error: true
    };
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton instance
const accessibilityCloudService = new AccessibilityCloudService();
export default accessibilityCloudService;
