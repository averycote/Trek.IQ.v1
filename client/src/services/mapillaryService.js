// Mapillary Service - Integration with Mapillary API for street-level imagery and accessibility data
// https://www.mapillary.com/developer/api-documentation

import { debugService } from './debugService';

class MapillaryService {
  constructor() {
    this.baseUrl = 'https://graph.mapillary.com';
    this.apiKey = process.env.REACT_APP_MAPILLARY_API_KEY || 'MLY|24382492204747543|ee17db9847ddf154ef049ef1690e9d0a';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
    this.rateLimit = {
      requests: 0,
      lastReset: Date.now(),
      maxRequests: 1000 // Per hour
    };
    this.isInitialized = false;
  }

  // Initialize the service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      this.isInitialized = true;
      console.log('MapillaryService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MapillaryService:', error);
    }
  }

  // Check rate limiting
  checkRateLimit() {
    const now = Date.now();
    if (now - this.rateLimit.lastReset > 3600000) { // 1 hour
      this.rateLimit.requests = 0;
      this.rateLimit.lastReset = now;
    }
    
    if (this.rateLimit.requests >= this.rateLimit.maxRequests) {
      throw new Error('Mapillary rate limit exceeded');
    }
    
    this.rateLimit.requests++;
  }

  // Get street-level imagery near a coordinate
  async getStreetLevelImagery(lat, lng, radius = 50) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `imagery_${lat}_${lng}_${radius}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    this.checkRateLimit();

    try {
      const query = `
        {
          images(
            bbox: [${lng - 0.001}, ${lat - 0.001}, ${lng + 0.001}, ${lat + 0.001}]
            first: 10
          ) {
            edges {
              node {
                id
                geometry {
                  coordinates
                }
                thumb_256_url
                thumb_1024_url
                captured_at
                sequence {
                  id
                }
              }
            }
          }
        }
      `;

      const apiUrl = `${this.baseUrl}/graphql?access_token=${this.apiKey}`;
      debugService.log('Mapillary API call', { url: apiUrl, method: 'POST', status: 'loading' });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const error = new Error(`Mapillary API error: ${response.status} ${response.statusText}`);
        debugService.error('Mapillary API call failed', { url: apiUrl, method: 'POST', error });
        throw error;
      }

      const data = await response.json();
      debugService.log('Mapillary API call successful', { url: apiUrl, method: 'POST', data });

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;

    } catch (error) {
      console.error('Mapillary imagery error:', error);
      throw error;
    }
  }

  // Get accessibility features near a coordinate
  async getAccessibilityFeatures(lat, lng, radius = 100) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `accessibility_${lat}_${lng}_${radius}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    this.checkRateLimit();

    try {
      const query = `
        {
          mapFeatures(
            bbox: [${lng - 0.002}, ${lat - 0.002}, ${lng + 0.002}, ${lat + 0.002}]
            first: 50
            types: [curb_ramp, tactile_paving, surface_markings]
          ) {
            edges {
              node {
                id
                geometry {
                  coordinates
                }
                value
                type
                properties
              }
            }
          }
        }
      `;

      const apiUrl = `${this.baseUrl}/graphql?access_token=${this.apiKey}`;
      debugService.log('Mapillary Accessibility API call', { url: apiUrl, method: 'POST', status: 'loading' });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        const error = new Error(`Mapillary Accessibility API error: ${response.status} ${response.statusText}`);
        debugService.error('Mapillary Accessibility API call failed', { url: apiUrl, method: 'POST', error });
        throw error;
      }

      const data = await response.json();
      debugService.log('Mapillary Accessibility API call successful', { url: apiUrl, method: 'POST', data });

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;

    } catch (error) {
      console.error('Mapillary accessibility error:', error);
      throw error;
    }
  }

  // Get route analysis with street-level data
  async analyzeRouteAccessibility(routeCoordinates) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const analysis = {
      streetLevelImages: [],
      accessibilityFeatures: [],
      warnings: [],
      accessibilityScore: 100
    };

    try {
      // Sample coordinates along the route for analysis
      const samplePoints = this.sampleRouteCoordinates(routeCoordinates, 10);
      
      for (const [lat, lng] of samplePoints) {
        try {
          // Get street-level imagery
          const imageryData = await this.getStreetLevelImagery(lat, lng);
          if (imageryData?.data?.images?.edges?.length > 0) {
            analysis.streetLevelImages.push({
              coordinate: [lat, lng],
              images: imageryData.data.images.edges.map(edge => edge.node)
            });
          }

          // Get accessibility features
          const accessibilityData = await this.getAccessibilityFeatures(lat, lng);
          if (accessibilityData?.data?.mapFeatures?.edges?.length > 0) {
            analysis.accessibilityFeatures.push({
              coordinate: [lat, lng],
              features: accessibilityData.data.mapFeatures.edges.map(edge => edge.node)
            });
          }

        } catch (error) {
          console.warn(`Failed to analyze point ${lat}, ${lng}:`, error);
        }
      }

      // Generate warnings based on analysis
      if (analysis.streetLevelImages.length === 0) {
        analysis.warnings.push({
          type: 'no_street_imagery',
          message: 'No street-level imagery available for route verification',
          severity: 'low'
        });
        analysis.accessibilityScore -= 5;
      }

      if (analysis.accessibilityFeatures.length === 0) {
        analysis.warnings.push({
          type: 'no_accessibility_data',
          message: 'No accessibility features detected along route',
          severity: 'moderate'
        });
        analysis.accessibilityScore -= 10;
      }

      return analysis;

    } catch (error) {
      console.error('Route accessibility analysis error:', error);
      throw error;
    }
  }

  // Sample coordinates along a route
  sampleRouteCoordinates(coordinates, sampleCount) {
    if (coordinates.length <= sampleCount) {
      return coordinates;
    }

    const samples = [];
    const step = Math.floor(coordinates.length / sampleCount);
    
    for (let i = 0; i < sampleCount; i++) {
      const index = Math.min(i * step, coordinates.length - 1);
      samples.push(coordinates[index]);
    }

    return samples;
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
    console.log('MapillaryService cache cleared');
  }
}

export default MapillaryService;
