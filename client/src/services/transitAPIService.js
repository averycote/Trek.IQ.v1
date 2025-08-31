// Transit API Service for Halifax Transit Data Integration
// API Documentation: http://api-doc.transitapp.com/

class TransitAPIService {
  constructor() {
    // Use environment variables with fallbacks
    this.baseUrl = process.env.REACT_APP_TRANSIT_API_URL || 'https://external.transitapp.com/v3';
    this.apiKey = process.env.REACT_APP_TRANSIT_API_KEY;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 12000; // 12 seconds between requests (5 calls/minute = 1 call per 12 seconds)
    this.maxConcurrentRequests = 1;
    this.activeRequests = 0;
    this.apiAvailable = true; // Track if API is available

    // Halifax coordinates for region filtering
    this.halifaxRegion = {
      lat: 44.6488,
      lng: -63.5752,
      radius: 50000 // 50km radius
    };

    // Rate limiting tracking
    this.monthlyRequestCount = 0;
    this.lastResetDate = new Date().toISOString().split('T')[0];
  }

  // Rate limiting helper
  async throttleRequest() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`Rate limiting: Waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  // Safe fetch with timeout wrapper
  async fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  // Queue management for concurrent requests
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

      // Track monthly usage
      this.trackMonthlyUsage();

      return result;
    } catch (error) {
      // Handle API errors gracefully
      console.warn('Transit API request failed:', error.message);

      // If it's an authentication or rate limit error, mark API as unavailable
      if (error.message.includes('401') || error.message.includes('403') || error.message.includes('429')) {
        console.warn('Transit API authentication or rate limit issue detected');
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

  // Track monthly API usage
  trackMonthlyUsage() {
    const today = new Date().toISOString().split('T')[0];

    if (today !== this.lastResetDate) {
      // Reset counter for new month
      this.monthlyRequestCount = 0;
      this.lastResetDate = today;
    }

    this.monthlyRequestCount++;

    if (this.monthlyRequestCount >= 1400) { // Warning at 1400/1500 limit
      console.warn(`Transit API usage: ${this.monthlyRequestCount}/1500 calls this month`);
    }

    if (this.monthlyRequestCount >= 1500) {
      console.error('Transit API monthly limit reached!');
      throw new Error('Transit API monthly limit exceeded');
    }
  }

  // Get stops near a location
  async getStopsNearLocation(lat, lng, radius = 500) {
    const cacheKey = `stops_${lat}_${lng}_${radius}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await this.executeRequest(() =>
        this.fetchWithTimeout(`${this.baseUrl}/public/stops_near_me?lat=${lat}&lon=${lng}&radius=${radius}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      if (!response.ok) {
        throw new Error(`Transit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching stops from Transit API:', error);
      return null;
    }
  }

  // Get routes serving specific stops
  async getRoutesForStops(stopIds) {
    if (!stopIds || stopIds.length === 0) return null;

    const cacheKey = `routes_${stopIds.join('_')}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const stopIdsParam = stopIds.join(',');
      const response = await this.executeRequest(() =>
        fetch(`${this.baseUrl}/public/routes_serving_stop?stop_ids=${stopIdsParam}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      if (!response.ok) {
        throw new Error(`Transit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching routes from Transit API:', error);
      return null;
    }
  }

  // Get real-time arrivals for stops
  async getRealtimeArrivals(stopIds) {
    if (!stopIds || stopIds.length === 0) return null;

    try {
      const stopIdsParam = stopIds.join(',');
      const response = await this.executeRequest(() =>
        fetch(`${this.baseUrl}/public/realtime_arrivals?stop_ids=${stopIdsParam}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      if (!response.ok) {
        throw new Error(`Transit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching real-time arrivals from Transit API:', error);
      return null;
    }
  }

  // Get trip planning between two locations
  async getTripPlan(originLat, originLng, destLat, destLng, options = {}) {
    const {
      time = null,
      mode = 'transit',
      maxWalkDistance = 1000,
      numItineraries = 3
    } = options;

    const cacheKey = `trip_${originLat}_${originLng}_${destLat}_${destLng}_${time}_${mode}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      let url = `${this.baseUrl}/public/plan_trip?from_lat=${originLat}&from_lon=${originLng}&to_lat=${destLat}&to_lon=${destLng}`;

      if (time) {
        url += `&time=${time}`;
      }

      url += `&mode=${mode}&max_walk_distance=${maxWalkDistance}&num_itineraries=${numItineraries}`;

      const response = await this.executeRequest(() =>
        fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      if (!response.ok) {
        throw new Error(`Transit API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Error fetching trip plan from Transit API:', error);
      return null;
    }
  }

  // Convert Transit API data to our internal format
  convertStopToInternalFormat(transitStop) {
    return {
      id: transitStop.stop_id || transitStop.id,
      name: transitStop.stop_name || transitStop.name,
      location: [transitStop.stop_lon || transitStop.lon, transitStop.stop_lat || transitStop.lat],
      routes: transitStop.routes || [],
      accessibility: this.parseAccessibilityFeatures(transitStop),
      amenities: this.parseAmenities(transitStop),
      type: 'bus_stop',
      source: 'transit_api'
    };
  }

  convertRouteToInternalFormat(transitRoute) {
    return {
      id: transitRoute.route_id || transitRoute.id,
      name: transitRoute.route_long_name || transitRoute.long_name || transitRoute.route_short_name || transitRoute.short_name,
      number: transitRoute.route_short_name || transitRoute.short_name,
      type: transitRoute.route_type === 3 ? 'bus' : 'transit',
      status: 'active',
      frequency: this.estimateFrequency(transitRoute),
      description: transitRoute.route_desc || transitRoute.description || '',
      coordinates: [], // Would need to fetch shapes separately
      color: this.getRouteColor(transitRoute),
      accessibility: this.parseRouteAccessibility(transitRoute),
      source: 'transit_api'
    };
  }

  convertArrivalToInternalFormat(arrival, stopId) {
    return {
      routeId: arrival.route_id,
      routeName: arrival.route_name || arrival.trip_headsign,
      routeNumber: arrival.route_short_name,
      destination: arrival.trip_headsign || arrival.headsign,
      arrivalTime: arrival.arrival_time || new Date(arrival.timestamp * 1000).toISOString(),
      status: arrival.delay > 300 ? 'delayed' : 'on_time',
      delay: arrival.delay || 0,
      accessibility: arrival.wheelchair_accessible ? ['wheelchair_accessible'] : [],
      stopId: stopId,
      source: 'transit_api'
    };
  }

  // Helper methods for data conversion
  parseAccessibilityFeatures(stop) {
    const features = [];

    if (stop.wheelchair_boarding === 1) {
      features.push('wheelchair_accessible');
    }

    if (stop.location_type === 1) {
      features.push('station');
    }

    return features;
  }

  parseAmenities(stop) {
    const amenities = [];

    // Transit API doesn't provide detailed amenity info
    // We can infer some from stop codes or names
    if (stop.stop_name && stop.stop_name.toLowerCase().includes('terminal')) {
      amenities.push('terminal');
    }

    return amenities;
  }

  estimateFrequency(route) {
    // This would ideally come from schedule data
    // For now, provide reasonable estimates based on route type
    const routeType = route.route_type;

    switch (routeType) {
      case 0: return 'Express routes - 15-30 minutes'; // Tram, Streetcar, Light rail
      case 1: return 'Subway - 3-8 minutes'; // Subway, Metro
      case 2: return 'Commuter rail - 20-60 minutes'; // Rail
      case 3: return 'Local bus - 10-20 minutes'; // Bus
      case 4: return 'Ferry - 30-60 minutes'; // Ferry
      case 5: return 'Cable tram - 10-15 minutes'; // Cable tram
      case 6: return 'Aerial lift - 15-30 minutes'; // Aerial lift
      case 7: return 'Funicular - 10-20 minutes'; // Funicular
      default: return '15-30 minutes';
    }
  }

  getRouteColor(route) {
    // Use route color if provided, otherwise generate based on route ID
    if (route.route_color) {
      return `#${route.route_color}`;
    }

    // Generate consistent colors based on route ID
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    const hash = route.route_id ? route.route_id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0) : Math.random() * 1000;

    return colors[Math.abs(hash) % colors.length];
  }

  parseRouteAccessibility(route) {
    const features = [];

    if (route.wheelchair_accessible) {
      features.push('wheelchair_accessible');
    }

    // Add other accessibility features based on route type
    if (route.route_type === 1) { // Subway/Metro
      features.push('priority_seating', 'audio_announcements');
    }

    return features;
  }

  // Get API usage statistics
  getUsageStats() {
    const today = new Date().toISOString().split('T')[0];

    return {
      monthlyUsage: this.monthlyRequestCount,
      monthlyLimit: 1500,
      remainingCalls: Math.max(0, 1500 - this.monthlyRequestCount),
      lastResetDate: this.lastResetDate,
      currentDate: today,
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests,
      queueLength: this.requestQueue.length
    };
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('Transit API cache cleared');
  }

  // Initialize service
  async initialize() {
    try {
      console.log('Initializing Transit API service...');

      // Check if API key is available
      if (!this.apiKey) {
        console.warn('Transit API key not found in environment variables');
        this.apiAvailable = false;
        return false;
      }

      // Test API connectivity with a simple endpoint using timeout
      const testResponse = await this.executeRequest(() =>
        this.fetchWithTimeout(`${this.baseUrl}/public/stops_near_me?lat=44.6488&lon=-63.5752&radius=100`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }, 5000) // 5 second timeout for initialization
      );

      if (testResponse.ok) {
        console.log('Transit API service initialized successfully');
        this.apiAvailable = true;
        return true;
      } else {
        console.warn(`Transit API service test failed with status: ${testResponse.status}`);
        this.apiAvailable = false;
        return false;
      }
    } catch (error) {
      console.warn('Transit API service initialization failed:', error.message);
      this.apiAvailable = false;
      return false;
    }
  }

  // Check if API is available
  isAvailable() {
    return this.apiAvailable;
  }

  // Reset API availability (useful for retrying after failures)
  resetAvailability() {
    this.apiAvailable = true;
  }
}

// Create singleton instance
const transitAPIService = new TransitAPIService();

export default transitAPIService;
