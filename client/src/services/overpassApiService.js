/**
 * Overpass API Service
 * 
 * Provides access to OpenStreetMap accessibility data via Overpass API
 */

class OverpassApiService {
  constructor() {
    // Use a reliable Overpass API endpoint
    this.baseUrl = 'https://overpass-api.de/api/interpreter';
    this.timeout = 30000; // 30 second timeout for complex queries
    
    // Enhanced caching for expensive Overpass queries
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15 minutes for OSM data

    // Rate limiting configuration for Overpass API
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 60000; // 60 seconds between requests (1 call/minute)
    this.maxConcurrentRequests = 1;
    this.activeRequests = 0;
    this.retryDelay = 300000; // 5 minutes retry delay after 429 error
    this.last429Error = 0;
    this.apiAvailable = true;

    // Circuit breaker configuration
    this.circuitBreaker = {
      failureThreshold: 3, // Open circuit after 3 failures (more conservative for Overpass)
      recoveryTimeout: 600000, // 10 minutes before attempting recovery
      halfOpenMaxCalls: 2, // Max calls in half-open state
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    };

    // Exponential backoff configuration
    this.backoffConfig = {
      baseDelay: 2000, // 2 second base delay
      maxDelay: 600000, // 10 minutes max delay
      multiplier: 2,
      jitter: true
    };

    // Request deduplication
    this.pendingRequests = new Map();

    // Health monitoring
    this.healthMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0
    };
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker() {
    const now = Date.now();
    
    if (this.circuitBreaker.state === 'OPEN') {
      if (now - this.circuitBreaker.lastFailureTime > this.circuitBreaker.recoveryTimeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
        this.circuitBreaker.failures = 0;
        console.log('🔄 Overpass circuit breaker moved to HALF_OPEN state');
        return true;
      }
      return false;
    }
    
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      if (this.circuitBreaker.failures >= this.circuitBreaker.halfOpenMaxCalls) {
        this.circuitBreaker.state = 'OPEN';
        this.circuitBreaker.lastFailureTime = now;
        console.log('❌ Overpass circuit breaker moved to OPEN state');
        return false;
      }
    }
    
    return true;
  }

  /**
   * Record successful request
   */
  recordSuccess() {
    this.circuitBreaker.failures = 0;
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      console.log('✅ Overpass circuit breaker moved to CLOSED state');
    }
  }

  /**
   * Record failed request
   */
  recordFailure(error) {
    // Don't count rate limiting errors as circuit breaker failures
    if (error && (error.message.includes('rate limited') || error.message.includes('429'))) {
      console.log('⚠️ Rate limiting error - not counting as circuit breaker failure');
      return;
    }
    
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      console.log('❌ Overpass circuit breaker moved to OPEN state');
    }
  }

  /**
   * Calculate backoff delay
   */
  calculateBackoffDelay(attempt) {
    const delay = Math.min(
      this.backoffConfig.baseDelay * Math.pow(this.backoffConfig.multiplier, attempt),
      this.backoffConfig.maxDelay
    );
    
    if (this.backoffConfig.jitter) {
      return delay + Math.random() * 1000; // Add jitter
    }
    
    return delay;
  }

  /**
   * Generate cache key for deduplication
   */
  generateCacheKey(query) {
    return `overpass_${btoa(query).slice(0, 50)}`;
  }

  /**
   * Execute request with enhanced error handling
   */
  async executeEnhancedRequest(requestFn, cacheKey) {
    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🔄 Overpass request already pending, waiting...');
      return await this.pendingRequests.get(cacheKey);
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker()) {
      throw new Error('Overpass circuit breaker is OPEN - service temporarily unavailable');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Overpass rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check for 429 errors - instead of throwing, return fallback data
    if (now - this.last429Error < this.retryDelay) {
      console.warn('⚠️ Overpass API rate limited, using fallback data');
      // Return a promise that resolves to fallback data instead of throwing
      return this.getFallbackData({ south: 0, west: 0, north: 0, east: 0 });
    }

    // Create request promise
    const requestPromise = this._executeRequestWithRetry(requestFn, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with retry logic
   */
  async _executeRequestWithRetry(requestFn, cacheKey, attempt = 0) {
    const maxRetries = 2; // Fewer retries for Overpass due to rate limits
    
    try {
      const startTime = performance.now();
      const result = await requestFn();
      const responseTime = performance.now() - startTime;
      
      // Update health metrics
      this.healthMetrics.totalRequests++;
      this.healthMetrics.successfulRequests++;
      this.healthMetrics.averageResponseTime = 
        (this.healthMetrics.averageResponseTime * (this.healthMetrics.totalRequests - 1) + responseTime) / 
        this.healthMetrics.totalRequests;
      
      return result;
    } catch (error) {
      this.healthMetrics.totalRequests++;
      this.healthMetrics.failedRequests++;
      
      if (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('rate limited')) {
        this.healthMetrics.rateLimitedRequests++;
        this.last429Error = Date.now();
        console.warn('⚠️ Overpass rate limited by API');
        // Don't retry on rate limiting - return fallback data instead
        throw new Error('Overpass rate limited - using fallback data');
      }
      
      if (attempt < maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`🔄 Retrying Overpass request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._executeRequestWithRetry(requestFn, cacheKey, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Execute Overpass query
   */
  async executeQuery(query) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Get accessibility data from Overpass
   */
  async getAccessibilityData(bounds) {
    const { south, west, north, east } = bounds;
    
    const query = `
[out:json][timeout:25];
(
  // Wheelchair accessible buildings and amenities
  way["building"]["wheelchair"="yes"](${south},${west},${north},${east});
  relation["building"]["wheelchair"="yes"](${south},${west},${north},${east});
  
  // Public transport accessibility
  node["public_transport"="stop_position"]["wheelchair"="yes"](${south},${west},${north},${east});
  node["highway"="bus_stop"]["wheelchair"="yes"](${south},${west},${north},${east});
  way["railway"="platform"]["wheelchair"="yes"](${south},${west},${north},${east});
  
  // Accessible amenities
  node["amenity"]["wheelchair"="yes"](${south},${west},${north},${east});
  way["amenity"]["wheelchair"="yes"](${south},${west},${north},${east});
  
  // Pedestrian infrastructure
  way["highway"="footway"]["surface"](${south},${west},${north},${east});
  way["highway"="path"]["wheelchair"="yes"](${south},${west},${north},${east});
  node["barrier"="kerb"]["kerb"~"lowered|flush"](${south},${west},${north},${east});
  
  // Elevators and ramps
  node["highway"="elevator"](${south},${west},${north},${east});
  way["highway"="steps"]["ramp:wheelchair"="yes"](${south},${west},${north},${east});
  
  // Accessible parking
  node["amenity"="parking"]["wheelchair"="yes"](${south},${west},${north},${east});
  way["amenity"="parking"]["wheelchair"="yes"](${south},${west},${north},${east});
);
out geom;
`;

    try {
      // Generate cache key for deduplication
      const cacheKey = this.generateCacheKey(query);

      // Use enhanced request execution with circuit breaker, backoff, and deduplication
      const data = await this.executeEnhancedRequest(async () => {
        return await this.executeQuery(query);
      }, cacheKey);

      return this.processAccessibilityData(data);
    } catch (error) {
      console.error('❌ Failed to fetch Overpass accessibility data:', error);

      // Check if it's a rate limiting error
      if (error.message.includes('rate limited') || error.message.includes('429')) {
        console.log('🔄 Overpass API rate limited, using fallback data...');
        this.last429Error = Date.now();
        return await this.getFallbackData(bounds);
      }

      // Try fallback data service for other errors
      try {
        console.log('🔄 Using Halifax fallback data for Overpass...');
        return await this.getFallbackData(bounds);
      } catch (fallbackError) {
        console.error('❌ Fallback data also failed:', fallbackError);
        return { elements: [], summary: { total: 0, categories: {} } };
      }
    }
  }

  /**
   * Process accessibility data from Overpass
   */
  processAccessibilityData(data) {
    const elements = data.elements || [];
    const categories = {};

    elements.forEach(element => {
      const category = this.categorizeElements(element);
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category]++;
    });

    return {
      elements: elements,
      summary: {
        total: elements.length,
        categories: categories
      }
    };
  }

  /**
   * Categorize elements by type
   */
  categorizeElements(element) {
    if (element.tags) {
      if (element.tags.building) return 'building';
      if (element.tags.amenity) return 'amenity';
      if (element.tags.public_transport) return 'transit';
      if (element.tags.highway) return 'highway';
    }
    return 'other';
  }

  /**
   * Get fallback data
   */
  async getFallbackData(bounds) {
    try {
      console.log('🔄 Loading fallback accessibility data...');
      // Lazy load fallbackDataService to avoid circular dependency
      const { default: fallbackDataService } = await import('./fallbackDataService.js');
      const result = await fallbackDataService.getAccessibilityPlaces(bounds);
      
      return {
        elements: result.places || [],
        summary: {
          total: result.count || 0,
          categories: { 'fallback': result.count || 0 }
        }
      };
    } catch (error) {
      console.error('❌ Fallback data service failed:', error);
      
      // Return minimal fallback data structure
      return {
        elements: [],
        summary: {
          total: 0,
          categories: { 'fallback': 0 }
        }
      };
    }
  }

  /**
   * Get health metrics
   */
  getHealthMetrics() {
      return {
      ...this.healthMetrics,
      circuitBreakerState: this.circuitBreaker.state,
      circuitBreakerFailures: this.circuitBreaker.failures,
      apiAvailable: this.apiAvailable
    };
  }
}

// Create singleton instance
const overpassApiService = new OverpassApiService();

export default overpassApiService;
