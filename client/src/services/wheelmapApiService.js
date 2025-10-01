/**
 * Wheelmap API Service
 * 
 * Provides access to Wheelmap accessibility data
 */

import fallbackDataService from './fallbackDataService.js';

class WheelmapApiService {
  constructor() {
    this.baseUrl = 'https://accessibility-cloud.freetls.fastly.net';
    this.localApiUrl = '/api/wheelmap'; // Local accessibility API proxy
    this.apiKey = 'eb848ae2fbaff7680ff34a9f31eabf06';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes for Accessibility Cloud data
    
    // Enhanced rate limiting configuration
    this.requestQueue = [];
    this.lastRequestTime = 0;
    this.minRequestInterval = 20000; // 20 seconds between requests (3 calls/minute)
    this.maxConcurrentRequests = 1;
    this.activeRequests = 0;
    this.retryDelay = 60000; // 60 seconds retry delay after 429 error
    this.last429Error = 0; // Track last 429 error time
    this.apiAvailable = true;

    // Circuit breaker configuration
    this.circuitBreaker = {
      failureThreshold: 5, // Open circuit after 5 failures
      recoveryTimeout: 300000, // 5 minutes before attempting recovery
      halfOpenMaxCalls: 3, // Max calls in half-open state
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
    };

    // Exponential backoff configuration
    this.backoffConfig = {
      baseDelay: 1000, // 1 second base delay
      maxDelay: 300000, // 5 minutes max delay
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
        console.log('🔄 Circuit breaker moved to HALF_OPEN state');
        return true;
      }
      return false;
    }
    
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      if (this.circuitBreaker.failures >= this.circuitBreaker.halfOpenMaxCalls) {
        this.circuitBreaker.state = 'OPEN';
        this.circuitBreaker.lastFailureTime = now;
        console.log('❌ Circuit breaker moved to OPEN state');
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
      console.log('✅ Circuit breaker moved to CLOSED state');
    }
  }

  /**
   * Record failed request
   */
  recordFailure() {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      console.log('❌ Circuit breaker moved to OPEN state');
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
  generateCacheKey(url, options = {}) {
    return `${url}_${JSON.stringify(options)}`;
  }

  /**
   * Execute request with enhanced error handling
   */
  async executeEnhancedRequest(requestFn, cacheKey) {
    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🔄 Request already pending, waiting...');
      return await this.pendingRequests.get(cacheKey);
    }

    // Check circuit breaker
    if (!this.checkCircuitBreaker()) {
      throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Check for 429 errors
    if (now - this.last429Error < this.retryDelay) {
      throw new Error('Rate limited - please wait before making another request');
    }

    // Create request promise
    const requestPromise = this._executeRequestWithRetry(requestFn, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with retry logic
   */
  async _executeRequestWithRetry(requestFn, cacheKey, attempt = 0) {
    const maxRetries = 3;
    
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
      
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        this.healthMetrics.rateLimitedRequests++;
        this.last429Error = Date.now();
        console.warn('⚠️ Rate limited by API');
      }
      
      if (attempt < maxRetries && !error.message.includes('429')) {
        const delay = this.calculateBackoffDelay(attempt);
        console.log(`🔄 Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this._executeRequestWithRetry(requestFn, cacheKey, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Search for accessible places
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

      // Generate cache key for deduplication
      const cacheKey = this.generateCacheKey(url, options);

      // Use enhanced request execution with circuit breaker, backoff, and deduplication
      const result = await this.executeEnhancedRequest(async () => {
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
      }, cacheKey);

      return result;
      
    } catch (error) {
      console.error('❌ Error fetching local accessibility data:', error);
      
      // Try external Wheelmap API first
      try {
      console.log('🔄 Falling back to external Wheelmap API...');
      return await this.fetchPOIs(bounds, options);
      } catch (externalError) {
        console.error('❌ External Wheelmap API also failed:', externalError);

        // Final fallback to Halifax static data
        console.log('🔄 Using Halifax fallback data...');
        return await this.getFallbackData(bounds, options);
      }
    }
  }

  /**
   * Fetch POIs from external Wheelmap API
   */
  async fetchPOIs(bounds, options = {}) {
    const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
    const url = `${this.baseUrl}/place-infos.json?appToken=${this.apiKey}&bbox=${bbox}&limit=100`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Wheelmap API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
    return {
      success: true,
      places: data.features || [],
      count: data.features?.length || 0,
      source: 'wheelmap'
    };
  }

  /**
   * Get fallback data
   */
  async getFallbackData(bounds, options = {}) {
    return await fallbackDataService.getAccessibilityPlaces(bounds, options);
  }

  /**
   * Analyze route accessibility
   */
  async analyzeRouteAccessibility(route) {
    try {
      const routeCoordinates = route?.features?.[0]?.geometry?.coordinates;
      if (!routeCoordinates || routeCoordinates.length === 0) {
        throw new Error('Invalid route: no coordinates found');
      }

      // Create route bounds
      const lngs = routeCoordinates.map(coord => coord[0]);
      const lats = routeCoordinates.map(coord => coord[1]);
      
      const bounds = {
        west: Math.min(...lngs),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        north: Math.max(...lats)
      };

      // Search for accessible places along route
      const accessibilityData = await this.searchAccessiblePlaces(bounds, {
        wheelchair: 'yes',
        limit: 50
      });
      
      return {
        success: true,
        analysis: {
          routeLength: routeCoordinates.length,
          accessiblePlaces: accessibilityData.places || [],
          accessibilityScore: this.calculateAccessibilityScore(accessibilityData.places || []),
          warnings: this.generateAccessibilityWarnings(accessibilityData.places || [])
        },
        source: accessibilityData.source
      };

    } catch (error) {
      console.error('❌ Error analyzing route accessibility:', error);
      return {
        success: false,
        error: error.message,
        analysis: {
          routeLength: 0,
          accessiblePlaces: [],
          accessibilityScore: 0,
          warnings: ['Unable to analyze route accessibility']
        }
      };
    }
  }

  /**
   * Calculate accessibility score
   */
  calculateAccessibilityScore(places) {
    if (!places || places.length === 0) return 0;
    
    const accessiblePlaces = places.filter(place => place.wheelchair === 'yes');
    return Math.round((accessiblePlaces.length / places.length) * 100);
  }

  /**
   * Generate accessibility warnings
   */
  generateAccessibilityWarnings(places) {
    const warnings = [];
    
    if (places.length === 0) {
      warnings.push('No accessibility information available for this route');
    } else {
      const accessiblePlaces = places.filter(place => place.wheelchair === 'yes');
      if (accessiblePlaces.length < places.length * 0.5) {
        warnings.push('Limited accessibility information available');
      }
    }
    
    return warnings;
  }

  /**
   * Find nearby accessible places
   */
  async findNearbyAccessiblePlaces(coordinates, radius = 1000) {
    try {
      const bounds = {
        west: coordinates[0] - 0.01,
        south: coordinates[1] - 0.01,
        east: coordinates[0] + 0.01,
        north: coordinates[1] + 0.01
      };

      const result = await this.searchAccessiblePlaces(bounds, {
        wheelchair: 'yes',
        limit: 10
      });

      return result.places || [];
    } catch (error) {
      console.error('❌ Error finding nearby accessible places:', error);
      return [];
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
const wheelmapApiService = new WheelmapApiService();

export default wheelmapApiService;
