/**
 * Wheelmap API Service for Trek.IQ
 * 
 * This service provides secure integration with the Wheelmap API for
 * accessibility data. It includes route analysis, nearby POI discovery,
 * and detailed place information with proper caching and error handling.
 */

import * as turf from '@turf/turf';

class WheelmapApiService {
  constructor() {
    this.baseUrl = 'https://accessibility-cloud.freetls.fastly.net';
    this.localApiUrl = '/api/wheelmap'; // Local accessibility API proxy
    this.apiKey = 'eb848ae2fbaff7680ff34a9f31eabf06';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for Accessibility Cloud data
    
    // Rate limiting configuration
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 20000; // 20 seconds between requests (3 calls/minute)
    this.maxConcurrentRequests = 1;
    this.activeRequests = 0;
    this.retryDelay = 60000; // 60 seconds retry delay after 429 error
    this.last429Error = 0; // Track last 429 error time
    this.apiAvailable = true;
  }

  /**
   * Rate limiting helper
   */
  async throttleRequest() {
    const now = Date.now();
    
    // Check if we're in a 429 error cooldown period
    if (now - this.last429Error < this.retryDelay) {
      const waitTime = this.retryDelay - (now - this.last429Error);
      console.log(`Wheelmap 429 cooldown: Waiting ${waitTime}ms before retry`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`Wheelmap rate limiting: Waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute request with rate limiting
   */
  async executeRequest(requestFn) {
    if (this.activeRequests >= this.maxConcurrentRequests) {
      // Wait for current request to complete
      await new Promise(resolve => {
        this.requestQueue.push(resolve);
      });
    }

    this.activeRequests++;

    try {
      await this.throttleRequest();
      const result = await requestFn();
      return result;
    } catch (error) {
      // Handle 429 rate limit errors specifically
      if (error.message.includes('429')) {
        console.warn('Wheelmap API rate limit exceeded, setting cooldown period');
        this.last429Error = Date.now();
        this.apiAvailable = false;
        
        // Return cached data if available instead of throwing error
        return null;
      }

      // If it's an authentication error, mark API as unavailable
      if (error.message.includes('401') || error.message.includes('403')) {
        console.warn('Wheelmap API authentication issue detected');
        this.apiAvailable = false;
      }

      throw error;
    } finally {
      this.activeRequests--;

      // Process next request in queue
      if (this.requestQueue.length > 0) {
        const nextRequest = this.requestQueue.shift();
        nextRequest();
      }
    }
  }

  /**
   * Get accessibility categories with their configurations
   */
  getAccessibilityCategories() {
    return {
      'parking': {
        name: 'Accessible Parking',
        icon: '🅿️',
        color: '#F97316', // Orange
        wheelmapCategory: 'parking'
      },
      'toilets': {
        name: 'Accessible Bathrooms',
        icon: '🚻',
        color: '#10B981', // Green
        wheelmapCategory: 'toilets'
      },
      'food': {
        name: 'Accessible Restaurants',
        icon: '🍴',
        color: '#8B5CF6', // Purple
        wheelmapCategory: 'food'
      },
      'shopping': {
        name: 'Accessible Shopping',
        icon: '🛍️',
        color: '#3B82F6', // Blue
        wheelmapCategory: 'shopping'
      },
      'accommodation': {
        name: 'Accessible Hotels',
        icon: '🏨',
        color: '#EC4899', // Pink
        wheelmapCategory: 'accommodation'
      },
      'leisure': {
        name: 'Accessible Entertainment',
        icon: '🎭',
        color: '#06B6D4', // Cyan
        wheelmapCategory: 'leisure'
      }
    };
  }

  /**
   * Get accessibility status configuration
   */
  getAccessibilityStatus() {
    return {
      'yes': {
        label: 'Fully Accessible',
        icon: '✅',
        color: '#10B981',
        description: 'Wheelchair accessible'
      },
      'limited': {
        label: 'Partially Accessible',
        icon: '⚠️',
        color: '#F59E0B',
        description: 'Limited accessibility'
      },
      'no': {
        label: 'Not Accessible',
        icon: '❌',
        color: '#EF4444',
        description: 'Not wheelchair accessible'
      },
      'unknown': {
        label: 'Unknown',
        icon: '❓',
        color: '#6B7280',
        description: 'Accessibility unknown'
      }
    };
  }

  /**
   * Search accessible places using local accessibility API
   * @param {Object} bounds - Map bounds object with north, south, east, west
   * @param {Object} options - Search options (wheelchair, category, limit)
   * @returns {Promise<Object>} Places data with accessibility information
   */
  async searchAccessiblePlaces(bounds, options = {}) {
    try {
      console.log('🔍 WheelmapApiService: Searching local accessibility data');
      
      // Convert bounds to bbox format for our API
      const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
      
      // Build query parameters
      const params = new URLSearchParams({
        bbox: bbox,
        limit: options.limit || 100
      });
      
      if (options.wheelchair && options.wheelchair !== 'all') {
        params.append('wheelchair', options.wheelchair);
      }
      
      if (options.category && options.category !== 'all') {
        params.append('category', options.category);
      }
      
      const url = `${this.localApiUrl}/places?${params}`;
      console.log('🌐 Fetching from local API:', url);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - server took too long to respond');
        }
        throw error;
      }

      if (!response.ok) {
        throw new Error(`Local API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Local accessibility data loaded:', data.count, 'places');
      
      return {
        success: true,
        places: data.places || [],
        count: data.count || 0,
        source: 'local'
      };
      
    } catch (error) {
      console.error('❌ Error fetching local accessibility data:', error);
      
      // Fallback to external Wheelmap API if local fails
      console.log('🔄 Falling back to external Wheelmap API...');
      return await this.fetchPOIs(bounds, options);
    }
  }

  /**
   * Fetch POIs from Wheelmap API with bounding box (fallback method)
   * @param {Object} bounds - Map bounds or bbox array
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of POI features
   */
  async fetchPOIs(bounds, options = {}) {
    try {
      // Convert bounds to bbox format
      let bbox;
      if (Array.isArray(bounds)) {
        bbox = bounds; // [west, south, east, north]
      } else if (bounds.getWest) {
        // Mapbox bounds object
        bbox = [
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ];
      } else if (bounds.west !== undefined && bounds.south !== undefined && bounds.east !== undefined && bounds.north !== undefined) {
        // Custom bounds object with west, south, east, north properties
        bbox = [
          bounds.west,
          bounds.south,
          bounds.east,
          bounds.north
        ];
      } else {
        throw new Error('Invalid bounds format. Expected array, Mapbox bounds object, or object with west/south/east/north properties');
      }

      // Create cache key
      const cacheKey = `wheelmap_pois_${bbox.join(',')}_${JSON.stringify(options)}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('🗄️ WheelmapApiService: Using cached POI data');
          return cached.data;
        }
      }

      // Build API URL for Accessibility Cloud
      const params = new URLSearchParams({
        appToken: this.apiKey,
        latitude: (bbox[1] + bbox[3]) / 2, // Center latitude
        longitude: (bbox[0] + bbox[2]) / 2, // Center longitude
        accuracy: Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 111000, // Convert to meters
        limit: options.limit || 50
      });

      if (options.wheelchair === 'yes') {
        params.append('filter', 'at-least-partially-accessible-by-wheelchair');
      }

      // Use backend proxy to avoid CORS issues
      const proxyUrl = `/api/wheelmap/nodes?${params.toString()}`;
      console.log('🌐 WheelmapApiService: Fetching POIs via proxy:', proxyUrl);

      const response = await this.executeRequest(async () => {
        return await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
      });

      if (!response || !response.ok) {
        // Handle 429 rate limit errors
        if (response && response.status === 429) {
          console.warn('Wheelmap API rate limited, returning cached data if available');
          const cached = this.cache.get(cacheKey);
          return cached ? cached.data : [];
        }
        
        // If proxy fails, use fallback data for Halifax area
        if (response && response.status === 504) {
          console.log('🔄 WheelmapApiService: Proxy timeout, using Halifax accessibility fallback data');
          return this.getHalifaxAccessibilityFallback(bounds, options);
        }
        
        throw new Error(`Wheelmap API request failed: ${response?.status || 'No response'} ${response?.statusText || 'Unknown error'}`);
      }

      const data = await response.json();
      const features = this.transformAccessibilityCloudData(data.places || []);

      console.log(`📍 WheelmapApiService: Found ${features.length} POIs`);

      // Cache the result
      this.cache.set(cacheKey, {
        data: features,
        timestamp: Date.now()
      });

      return features;

    } catch (error) {
      console.error('❌ WheelmapApiService: Error fetching POIs:', error);
      
      // Try fallback data for Halifax area
      console.log('🔄 WheelmapApiService: Using Halifax accessibility fallback due to error');
      return this.getHalifaxAccessibilityFallback(bounds, options);
    }
  }

  /**
   * Get detailed information for a specific place
   * @param {string|number} nodeId - Wheelmap node ID
   * @returns {Promise<Object>} Detailed place information
   */
  async getPlaceDetails(nodeId) {
    try {
      const cacheKey = `wheelmap_details_${nodeId}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`🗄️ WheelmapApiService: Using cached details for ${nodeId}`);
          return cached.data;
        }
      }

      const url = `${this.baseUrl}/nodes/${nodeId}?api_key=${this.apiKey}`;
      console.log(`🌐 WheelmapApiService: Fetching details for node ${nodeId}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Trek.IQ/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Wheelmap API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const details = this.transformPlaceDetails(data.node);

      // Cache the result
      this.cache.set(cacheKey, {
        data: details,
        timestamp: Date.now()
      });

      return details;

    } catch (error) {
      console.error(`❌ WheelmapApiService: Error fetching details for ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Analyze route for accessibility along the path
   * @param {Object} route - GeoJSON route object
   * @param {number} bufferDistance - Buffer distance in meters (default: 100m)
   * @returns {Promise<Object>} Route accessibility analysis
   */
  async analyzeRouteAccessibility(route, bufferDistance = 1000) {
    try {
      if (!route?.features?.[0]?.geometry?.coordinates) {
        console.warn('WheelmapApiService: Invalid route data for analysis');
        return this.getEmptyAnalysis();
      }

      console.log('🔍 WheelmapApiService: Analyzing route accessibility');

      // Create route line and buffer
      const routeLine = turf.lineString(route.features[0].geometry.coordinates);
      const routeBuffer = turf.buffer(routeLine, bufferDistance, { units: 'meters' });
      
      // Get bounding box of the buffered route
      const bbox = turf.bbox(routeBuffer);
      
      // Fetch POIs within the bounding box - increased limit for maximum data
      const bounds = {
        west: bbox[0],
        south: bbox[1], 
        east: bbox[2],
        north: bbox[3]
      };
      const result = await this.searchAccessiblePlaces(bounds, { limit: 500 });
      const allPOIs = result.places || [];
      
      // Filter POIs that actually intersect with the route buffer
      const routePOIs = allPOIs.filter(poi => {
        // Handle both local API format (coordinates) and external API format (geometry.coordinates)
        const coords = poi.coordinates || poi.geometry?.coordinates;
        if (!coords) return false;
        const point = turf.point(coords);
        return turf.booleanPointInPolygon(point, routeBuffer);
      });

      // Analyze accessibility status
      const analysis = this.analyzeAccessibilityData(routePOIs);
      
      console.log(`📊 WheelmapApiService: Route analysis complete - ${routePOIs.length} POIs found`);
      
      return {
        ...analysis,
        totalPOIs: routePOIs.length,
        routePOIs: routePOIs,
        bufferDistance: bufferDistance
      };

    } catch (error) {
      console.error('❌ WheelmapApiService: Error analyzing route accessibility:', error);
      return this.getEmptyAnalysis();
    }
  }

  /**
   * Find nearest accessible places to a destination point
   * @param {Array} destinationCoords - [longitude, latitude]
   * @param {number} limit - Number of places to return (default: 3)
   * @param {number} searchRadius - Search radius in meters (default: 500m)
   * @returns {Promise<Array>} Array of nearest accessible places
   */
  async findNearbyAccessiblePlaces(destinationCoords, limit = 3, searchRadius = 2000) {
    try {
      console.log('🎯 WheelmapApiService: Finding nearby accessible places at destination');

      // Create search area around destination
      const destinationPoint = turf.point(destinationCoords);
      const searchArea = turf.buffer(destinationPoint, searchRadius, { units: 'meters' });
      const bbox = turf.bbox(searchArea);

      // Fetch POIs in the search area - increased limit for maximum data
      const bounds = {
        west: bbox[0],
        south: bbox[1],
        east: bbox[2], 
        north: bbox[3]
      };
      const result = await this.searchAccessiblePlaces(bounds, { 
        limit: 200,
        wheelchair: 'yes' // Only accessible places
      });
      const allPOIs = result.places || [];

      // Calculate distances and sort by proximity
      const poisWithDistance = allPOIs.map(poi => {
        // Handle both local API format (coordinates) and external API format (geometry.coordinates)
        const coords = poi.coordinates || poi.geometry?.coordinates;
        if (!coords) return null;
        const poiPoint = turf.point(coords);
        const distance = turf.distance(destinationPoint, poiPoint, { units: 'meters' });
        
        return {
          ...poi,
          distanceFromDestination: Math.round(distance)
        };
      }).filter(poi => poi !== null).sort((a, b) => a.distanceFromDestination - b.distanceFromDestination);

      // Return top results
      const nearbyPlaces = poisWithDistance.slice(0, limit);
      
      console.log(`📍 WheelmapApiService: Found ${nearbyPlaces.length} nearby accessible places`);
      
      return nearbyPlaces;

    } catch (error) {
      console.error('❌ WheelmapApiService: Error finding nearby accessible places:', error);
      return [];
    }
  }

  /**
   * Transform Wheelmap API data to GeoJSON format
   * @param {Array} nodes - Wheelmap nodes array
   * @returns {Array} GeoJSON features
   */
  transformWheelmapData(nodes) {
    return nodes.map(node => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(node.lon), parseFloat(node.lat)]
      },
      properties: {
        id: node.id,
        name: node.name || 'Unnamed Place',
        category: node.category,
        wheelchair: node.wheelchair || 'unknown',
        wheelchair_description: node.wheelchair_description,
        website: node.website,
        phone: node.phone,
        address: this.formatAddress(node),
        amenity: node.amenity,
        shop: node.shop,
        cuisine: node.cuisine,
        opening_hours: node.opening_hours,
        source: 'wheelmap'
      }
    }));
  }

  /**
   * Transform Accessibility Cloud data to GeoJSON format
   * @param {Array} places - Accessibility Cloud places array
   * @returns {Array} Transformed GeoJSON features
   */
  transformAccessibilityCloudData(places) {
    return places.map(place => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(place.longitude), parseFloat(place.latitude)]
      },
      properties: {
        id: place.id,
        name: place.name || 'Unnamed Place',
        category: place.category || 'unknown',
        wheelchair: place.wheelchair || 'unknown',
        wheelchair_description: place.wheelchairDescription,
        website: place.website,
        phone: place.phone,
        address: place.address || '',
        amenity: place.amenity,
        shop: place.shop,
        cuisine: place.cuisine,
        opening_hours: place.openingHours,
        source: 'accessibility-cloud',
        accessibility_info: place.accessibilityInfo || {}
      }
    }));
  }

  /**
   * Transform detailed place data
   * @param {Object} node - Wheelmap node object
   * @returns {Object} Transformed place details
   */
  transformPlaceDetails(node) {
    const accessibilityStatus = this.getAccessibilityStatus()[node.wheelchair] || this.getAccessibilityStatus()['unknown'];

    // Enhanced accessibility features extraction
    const accessibilityFeatures = this.extractAccessibilityFeatures(node);

    // Extract photos if available
    const photos = this.extractPhotos(node);

    // Extract reviews and ratings
    const reviews = this.extractReviews(node);

    // Extract detailed facility information
    const facilities = this.extractFacilities(node);

    return {
      id: node.id,
      name: node.name || 'Unnamed Place',
      category: node.category,
      accessibility: {
        status: node.wheelchair || 'unknown',
        description: node.wheelchair_description || accessibilityStatus.description,
        features: accessibilityFeatures,
        rating: node.wheelchair_rating || null,
        ...accessibilityStatus
      },
      contact: {
        website: node.website,
        phone: node.phone,
        email: node.email
      },
      address: this.formatAddress(node),
      details: {
        amenity: node.amenity,
        shop: node.shop,
        cuisine: node.cuisine,
        opening_hours: node.opening_hours,
        description: node.description,
        operator: node.operator,
        brand: node.brand
      },
      facilities: facilities,
      photos: photos,
      reviews: reviews,
      community: {
        contributor: node.user?.username || null,
        lastUpdated: node.updated_at,
        created: node.created_at,
        version: node.version
      },
      coordinates: [parseFloat(node.lon), parseFloat(node.lat)],
      source: 'wheelmap',
      rawData: node // Keep original data for future enhancements
    };
  }

  /**
   * Extract detailed accessibility features from Wheelmap node
   * @param {Object} node - Wheelmap node
   * @returns {Array} Array of accessibility features
   */
  extractAccessibilityFeatures(node) {
    const features = [];

    // Wheelchair accessibility details
    if (node.wheelchair === 'yes' || node.wheelchair === 'limited') {
      features.push({
        type: 'wheelchair',
        status: node.wheelchair,
        description: node.wheelchair_description || 'Wheelchair accessible'
      });
    }

    // Entrance accessibility
    if (node.wheelchair_entrance) {
      features.push({
        type: 'entrance',
        status: node.wheelchair_entrance,
        description: this.getFeatureDescription('entrance', node.wheelchair_entrance)
      });
    }

    // Toilet accessibility
    if (node.wheelchair_toilet) {
      features.push({
        type: 'toilet',
        status: node.wheelchair_toilet,
        description: this.getFeatureDescription('toilet', node.wheelchair_toilet)
      });
    }

    // Parking accessibility
    if (node.wheelchair_parking) {
      features.push({
        type: 'parking',
        status: node.wheelchair_parking,
        description: this.getFeatureDescription('parking', node.wheelchair_parking)
      });
    }

    // Elevator/Lift
    if (node.wheelchair_lift) {
      features.push({
        type: 'lift',
        status: node.wheelchair_lift,
        description: this.getFeatureDescription('lift', node.wheelchair_lift)
      });
    }

    // Ramps
    if (node.ramp) {
      features.push({
        type: 'ramp',
        status: node.ramp,
        description: this.getFeatureDescription('ramp', node.ramp)
      });
    }

    // Step-free access
    if (node.step_free) {
      features.push({
        type: 'step_free',
        status: node.step_free,
        description: this.getFeatureDescription('step_free', node.step_free)
      });
    }

    // Tactile paving
    if (node.tactile_paving) {
      features.push({
        type: 'tactile_paving',
        status: node.tactile_paving,
        description: this.getFeatureDescription('tactile_paving', node.tactile_paving)
      });
    }

    return features;
  }

  /**
   * Get human-readable description for accessibility features
   * @param {string} featureType - Type of accessibility feature
   * @param {string} status - Status of the feature
   * @returns {string} Human-readable description
   */
  getFeatureDescription(featureType, status) {
    const descriptions = {
      entrance: {
        yes: 'Accessible entrance available',
        no: 'No accessible entrance',
        unknown: 'Entrance accessibility unknown'
      },
      toilet: {
        yes: 'Wheelchair accessible toilet',
        no: 'No wheelchair accessible toilet',
        unknown: 'Toilet accessibility unknown'
      },
      parking: {
        yes: 'Wheelchair accessible parking',
        no: 'No wheelchair accessible parking',
        unknown: 'Parking accessibility unknown'
      },
      lift: {
        yes: 'Elevator/lift available',
        no: 'No elevator/lift',
        unknown: 'Lift availability unknown'
      },
      ramp: {
        yes: 'Ramp available',
        no: 'No ramp available',
        unknown: 'Ramp availability unknown'
      },
      step_free: {
        yes: 'Step-free access',
        no: 'Steps present',
        unknown: 'Step-free access unknown'
      },
      tactile_paving: {
        yes: 'Tactile paving for visually impaired',
        no: 'No tactile paving',
        unknown: 'Tactile paving unknown'
      }
    };

    return descriptions[featureType]?.[status] || `${featureType} status: ${status}`;
  }

  /**
   * Extract photos from Wheelmap node
   * @param {Object} node - Wheelmap node
   * @returns {Array} Array of photo objects
   */
  extractPhotos(node) {
    const photos = [];

    // Check for photos in various possible locations
    if (node.photos && Array.isArray(node.photos)) {
      node.photos.forEach((photo, index) => {
        photos.push({
          id: photo.id || `photo_${index}`,
          url: photo.url || photo.image_url || photo,
          thumbnail: photo.thumbnail_url || photo.url || photo.image_url || photo,
          caption: photo.caption || photo.description || '',
          uploadedBy: photo.user?.username || node.user?.username || 'Community',
          uploadedAt: photo.created_at || node.created_at
        });
      });
    }

    // Check for image field
    if (node.image && !photos.length) {
      photos.push({
        id: 'main_image',
        url: node.image,
        thumbnail: node.image,
        caption: 'Main photo',
        uploadedBy: node.user?.username || 'Community',
        uploadedAt: node.created_at
      });
    }

    return photos;
  }

  /**
   * Extract reviews and ratings from Wheelmap node
   * @param {Object} node - Wheelmap node
   * @returns {Object} Reviews and ratings data
   */
  extractReviews(node) {
    return {
      overallRating: node.rating || node.average_rating || null,
      wheelchairRating: node.wheelchair_rating || null,
      totalReviews: node.review_count || node.reviews?.length || 0,
      recentReviews: node.reviews || [],
      lastReviewDate: node.last_review_date || null
    };
  }

  /**
   * Extract detailed facility information
   * @param {Object} node - Wheelmap node
   * @returns {Object} Facility details
   */
  extractFacilities(node) {
    const facilities = {};

    // Extract common facility information
    const facilityFields = [
      'capacity', 'seats', 'rooms', 'floors', 'height', 'width', 'length',
      'wheelchair_capacity', 'toilets', 'changing_rooms', 'showers',
      'atm', 'cash_withdrawal', 'cash_deposit', 'self_service',
      'drive_through', 'delivery', 'takeaway', 'internet_access',
      'wifi', 'power_supply', 'charging_station', 'parking_fee',
      'opening_hours', 'fee', 'payment_options'
    ];

    facilityFields.forEach(field => {
      if (node[field] !== undefined && node[field] !== null) {
        facilities[field] = node[field];
      }
    });

    // Special handling for certain facilities
    if (node.amenity === 'restaurant' || node.amenity === 'cafe') {
      facilities.type = 'food_service';
      facilities.outdoor_seating = node.outdoor_seating;
      facilities.reservation = node.reservation;
      facilities.delivery = node.delivery;
    }

    if (node.amenity === 'bank' || node.amenity === 'atm') {
      facilities.type = 'financial';
      facilities.atm_count = node.atm_count;
      facilities.drive_through = node.drive_through;
    }

    if (node.amenity === 'parking') {
      facilities.type = 'parking';
      facilities.capacity = node.capacity;
      facilities.fee = node.fee;
      facilities.maxheight = node.maxheight;
      facilities.parking_type = node.parking;
    }

    return facilities;
  }

  /**
   * Format address from Wheelmap node data
   * @param {Object} node - Wheelmap node
   * @returns {string} Formatted address
   */
  formatAddress(node) {
    const parts = [];

    if (node.housenumber) parts.push(node.housenumber);
    if (node.street) parts.push(node.street);
    if (node.city) parts.push(node.city);
    if (node.postcode) parts.push(node.postcode);

    return parts.join(', ') || 'Address not available';
  }

  /**
   * Analyze accessibility data from POIs
   * @param {Array} pois - Array of POI features
   * @returns {Object} Accessibility analysis
   */
  analyzeAccessibilityData(pois) {
    const analysis = {
      accessible: 0,
      partiallyAccessible: 0,
      notAccessible: 0,
      unknown: 0,
      byCategory: {}
    };

    pois.forEach(poi => {
      const wheelchair = poi.properties.wheelchair;
      const category = poi.properties.category || 'other';

      // Count by accessibility status
      switch (wheelchair) {
        case 'yes':
          analysis.accessible++;
          break;
        case 'limited':
          analysis.partiallyAccessible++;
          break;
        case 'no':
          analysis.notAccessible++;
          break;
        default:
          analysis.unknown++;
      }

      // Count by category
      if (!analysis.byCategory[category]) {
        analysis.byCategory[category] = {
          accessible: 0,
          partiallyAccessible: 0,
          notAccessible: 0,
          unknown: 0,
          total: 0
        };
      }

      analysis.byCategory[category][wheelchair === 'yes' ? 'accessible' : 
                                   wheelchair === 'limited' ? 'partiallyAccessible' : 
                                   wheelchair === 'no' ? 'notAccessible' : 'unknown']++;
      analysis.byCategory[category].total++;
    });

    return analysis;
  }

  /**
   * Fallback accessibility data for Halifax area when API is unavailable
   * @param {Object} bounds - Bounding box coordinates
   * @param {Object} options - Query options
   * @returns {Array} Array of simulated accessible POIs
   */
  getHalifaxAccessibilityFallback(bounds, options) {
    const { minLon, minLat, maxLon, maxLat } = bounds;
    
    // Halifax-specific accessible locations (real places)
    const halifaxAccessiblePlaces = [
      {
        id: 'halifax-library-central',
        name: 'Halifax Central Library',
        coordinates: [-63.5752, 44.6488],
        category: 'library',
        wheelchair: 'yes',
        description: 'Fully accessible modern library with elevators and accessible washrooms'
      },
      {
        id: 'halifax-waterfront-boardwalk',
        name: 'Halifax Waterfront Boardwalk',
        coordinates: [-63.5698, 44.6464],
        category: 'tourism',
        wheelchair: 'yes',
        description: 'Accessible waterfront boardwalk with accessible parking'
      },
      {
        id: 'halifax-spring-garden-place',
        name: 'Spring Garden Place Shopping',
        coordinates: [-63.5785, 44.6426],
        category: 'shopping',
        wheelchair: 'yes',
        description: 'Accessible shopping center with accessible parking and washrooms'
      },
      {
        id: 'halifax-iga-barrington',
        name: 'IGA Barrington Street',
        coordinates: [-63.5734, 44.6503],
        category: 'food',
        wheelchair: 'yes',
        description: 'Accessible grocery store with accessible parking'
      },
      {
        id: 'halifax-tim-hortons-barrington',
        name: 'Tim Hortons - Barrington Street',
        coordinates: [-63.5745, 44.6485],
        category: 'food',
        wheelchair: 'yes',
        description: 'Accessible coffee shop with accessible entrance'
      }
    ];

    // Filter places within bounds and by wheelchair status if specified
    let filteredPlaces = halifaxAccessiblePlaces.filter(place => {
      const [lon, lat] = place.coordinates;
      const inBounds = lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
      
      if (!inBounds) return false;
      
      if (options.wheelchair) {
        const wheelchairOptions = options.wheelchair.split(',');
        return wheelchairOptions.includes(place.wheelchair);
      }
      
      return true;
    });

    // Limit results
    const limit = options.limit || 100;
    filteredPlaces = filteredPlaces.slice(0, limit);

    console.log(`📍 WheelmapApiService: Using ${filteredPlaces.length} Halifax fallback locations`);

    // Transform to GeoJSON format
    return filteredPlaces.map(place => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: place.coordinates
      },
      properties: {
        id: place.id,
        name: place.name,
        category: place.category,
        wheelchair: place.wheelchair,
        wheelchair_description: place.description,
        source: 'Halifax Accessibility Fallback'
      }
    }));
  }

  /**
   * Get empty analysis structure
   * @returns {Object} Empty analysis object
   */
  getEmptyAnalysis() {
    return {
      accessible: 0,
      partiallyAccessible: 0,
      notAccessible: 0,
      unknown: 0,
      totalPOIs: 0,
      routePOIs: [],
      byCategory: {},
      bufferDistance: 0
    };
  }

  /**
   * Generate accessibility clusters for heatmap
   * @param {Object} bounds - Map bounds
   * @param {number} gridSize - Grid cell size in degrees
   * @returns {Promise<Array>} Array of accessibility clusters
   */
  async generateAccessibilityHeatmap(bounds, gridSize = 0.01) {
    try {
      console.log('🗺️ WheelmapApiService: Generating accessibility heatmap');

      // Fetch all POIs in bounds
      const allPOIs = await this.fetchPOIs(bounds, { limit: 200 });
      
      if (allPOIs.length === 0) {
        return [];
      }

      // Create grid
      const bbox = Array.isArray(bounds) ? bounds : [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ];

      const clusters = [];
      const [west, south, east, north] = bbox;

      // Generate grid cells
      for (let lng = west; lng < east; lng += gridSize) {
        for (let lat = south; lat < north; lat += gridSize) {
          const cellBounds = [lng, lat, lng + gridSize, lat + gridSize];
          const cellPOIs = allPOIs.filter(poi => {
            const [poiLng, poiLat] = poi.geometry.coordinates;
            return poiLng >= cellBounds[0] && poiLng < cellBounds[2] &&
                   poiLat >= cellBounds[1] && poiLat < cellBounds[3];
          });

          if (cellPOIs.length > 0) {
            const analysis = this.analyzeAccessibilityData(cellPOIs);
            const accessibilityRatio = analysis.accessible / (analysis.accessible + analysis.notAccessible + analysis.partiallyAccessible);
            
            clusters.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [lng + gridSize / 2, lat + gridSize / 2]
              },
              properties: {
                count: cellPOIs.length,
                accessibilityRatio: accessibilityRatio || 0,
                accessible: analysis.accessible,
                partiallyAccessible: analysis.partiallyAccessible,
                notAccessible: analysis.notAccessible,
                color: this.getHeatmapColor(accessibilityRatio),
                radius: Math.min(Math.max(cellPOIs.length * 10, 20), 100)
              }
            });
          }
        }
      }

      console.log(`📊 WheelmapApiService: Generated ${clusters.length} heatmap clusters`);
      return clusters;

    } catch (error) {
      console.error('❌ WheelmapApiService: Error generating heatmap:', error);
      return [];
    }
  }

  /**
   * Get heatmap color based on accessibility ratio
   * @param {number} ratio - Accessibility ratio (0-1)
   * @returns {string} Color hex code
   */
  getHeatmapColor(ratio) {
    if (ratio >= 0.8) return '#10B981'; // Green - High accessibility
    if (ratio >= 0.6) return '#F59E0B'; // Yellow - Medium accessibility  
    if (ratio >= 0.4) return '#F97316'; // Orange - Low accessibility
    return '#EF4444'; // Red - Very low accessibility
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 WheelmapApiService: Cache cleared');
  }
}

// Export singleton instance
const wheelmapApiService = new WheelmapApiService();
export default wheelmapApiService;
