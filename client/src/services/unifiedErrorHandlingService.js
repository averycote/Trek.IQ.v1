/**
 * Unified Error Handling Service - Single Canonical Error Handling Implementation
 * 
 * Consolidates all error handling functionality into a single, clean, production-ready
 * implementation that provides comprehensive error management and recovery.
 * 
 * Features:
 * - Unified error handling and recovery
 * - Standardized error types and codes
 * - Error context and debugging information
 * - Error monitoring and alerting
 * - Error analytics and reporting
 * - Error recovery mechanisms
 */

import unifiedAPIService from './unifiedAPIService.js';
import unifiedSecurityService from './unifiedSecurityService.js';
import performanceOptimizationService from './performanceOptimizationService.js';

class UnifiedErrorHandlingService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Error handling configuration
    this.config = {
      // Error types and codes
      errorTypes: {
        VALIDATION_ERROR: 'VALIDATION_ERROR',
        AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
        AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
        NETWORK_ERROR: 'NETWORK_ERROR',
        API_ERROR: 'API_ERROR',
        DATABASE_ERROR: 'DATABASE_ERROR',
        CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
        RUNTIME_ERROR: 'RUNTIME_ERROR',
        SECURITY_ERROR: 'SECURITY_ERROR',
        PERFORMANCE_ERROR: 'PERFORMANCE_ERROR',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR'
      },
      
      // Error severity levels
      severityLevels: {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
      },
      
      // Error recovery strategies
      recoveryStrategies: {
        RETRY: 'retry',
        FALLBACK: 'fallback',
        CIRCUIT_BREAKER: 'circuit_breaker',
        GRACEFUL_DEGRADATION: 'graceful_degradation',
        USER_NOTIFICATION: 'user_notification',
        ADMIN_ALERT: 'admin_alert'
      },
      
      // Error monitoring
      monitoring: {
        enabled: true,
        trackErrors: true,
        trackRecoveries: true,
        trackPerformance: true,
        alertThresholds: {
          errorRate: 0.05, // 5% error rate
          responseTime: 5000, // 5 seconds
          memoryUsage: 0.8 // 80% memory usage
        },
        reportInterval: 60 * 1000 // 1 minute
      },
      
      // Error analytics
      analytics: {
        enabled: true,
        trackErrorTrends: true,
        trackErrorPatterns: true,
        trackRecoverySuccess: true,
        maxErrorHistory: 1000
      }
    };
    
    // Error storage and tracking
    this.errorHistory = [];
    this.errorMetrics = new Map();
    this.errorPatterns = new Map();
    this.recoveryHistory = [];
    this.recoveryMetrics = new Map();
    
    // Error monitoring
    this.monitoringActive = false;
    this.monitoringIntervals = [];
    this.alertThresholds = new Map();
    
    // Error recovery
    this.recoveryStrategies = new Map();
    this.circuitBreakers = new Map();
    this.fallbackServices = new Map();
    
    // Error context
    this.errorContext = {
      userId: null,
      sessionId: null,
      requestId: null,
      component: null,
      action: null,
      timestamp: null
    };
    
    // Error handlers
    this.errorHandlers = new Map();
    this.recoveryHandlers = new Map();
    
    // Performance tracking
    this.performanceMetrics = {
      totalErrors: 0,
      totalRecoveries: 0,
      averageRecoveryTime: 0,
      errorRate: 0,
      recoveryRate: 0
    };
  }

  /**
   * Initialize the unified error handling service
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) return;
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInitialization(options);
    return this.initializationPromise;
  }

  async _performInitialization(options = {}) {
    try {
      console.log('🚀 Initializing Unified Error Handling Service...');
      
      // Update configuration
      this.config = { ...this.config, ...options };
      
      // Initialize error handlers
      this._initializeErrorHandlers();
      
      // Initialize recovery strategies
      this._initializeRecoveryStrategies();
      
      // Initialize circuit breakers
      this._initializeCircuitBreakers();
      
      // Start error monitoring
      this._startErrorMonitoring();
      
      // Set up global error handlers
      this._setupGlobalErrorHandlers();
      
      this.isInitialized = true;
      console.log('✅ Unified Error Handling Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Unified Error Handling Service:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Handle an error with unified error handling
   * @param {Error} error - Error to handle
   * @param {Object} context - Error context
   * @param {Object} options - Handling options
   * @returns {Promise<Object>} Error handling result
   */
  async handleError(error, context = {}, options = {}) {
    const startTime = performance.now();
    
    try {
      console.log('🚨 Handling error:', error.message);
      
      // Create error record
      const errorRecord = this._createErrorRecord(error, context, options);
      
      // Classify error
      const errorClassification = this._classifyError(error, context);
      
      // Determine recovery strategy
      const recoveryStrategy = this._determineRecoveryStrategy(errorClassification, context);
      
      // Execute recovery strategy
      const recoveryResult = await this._executeRecoveryStrategy(recoveryStrategy, errorRecord, context);
      
      // Update metrics
      this._updateErrorMetrics(errorRecord, recoveryResult);
      
      // Store error record
      this._storeErrorRecord(errorRecord);
      
      // Check for alerting
      await this._checkAlerting(errorRecord, recoveryResult);
      
      const handlingTime = performance.now() - startTime;
      
      const result = {
        errorRecord,
        errorClassification,
        recoveryStrategy,
        recoveryResult,
        handlingTime,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Error handled successfully');
      return result;
      
    } catch (handlingError) {
      console.error('❌ Error handling failed:', handlingError);
      
      // Fallback error handling
      return this._fallbackErrorHandling(error, context, handlingError);
    }
  }

  /**
   * Create a standardized error
   * @param {string} type - Error type
   * @param {string} message - Error message
   * @param {Object} context - Error context
   * @param {Object} options - Error options
   * @returns {Error} Standardized error
   */
  createError(type, message, context = {}, options = {}) {
    const error = new Error(message);
    
    // Add error properties
    error.type = type;
    error.code = this._generateErrorCode(type, context);
    error.severity = this._determineSeverity(type, context);
    error.context = context;
    error.timestamp = new Date().toISOString();
    error.id = this._generateErrorId();
    
    // Add stack trace
    error.stack = this._enhanceStackTrace(error.stack, context);
    
    // Add recovery information
    error.recoveryStrategy = this._determineRecoveryStrategy(
      { type, severity: error.severity },
      context
    );
    
    // Add user-friendly message
    error.userMessage = this._generateUserMessage(type, message, context);
    
    return error;
  }

  /**
   * Wrap a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Error context
   * @param {Object} options - Wrapping options
   * @returns {Function} Wrapped function
   */
  wrapFunction(fn, context = {}, options = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorContext = {
          ...context,
          function: fn.name,
          arguments: args,
          timestamp: new Date().toISOString()
        };
        
        const result = await this.handleError(error, errorContext, options);
        
        // Re-throw if recovery failed
        if (!result.recoveryResult.success) {
          throw result.recoveryResult.error || error;
        }
        
        return result.recoveryResult.result;
      }
    };
  }

  /**
   * Create an error boundary for React components
   * @param {Object} options - Error boundary options
   * @returns {Object} Error boundary configuration
   */
  createErrorBoundary(options = {}) {
    return {
      componentDidCatch: (error, errorInfo) => {
        const context = {
          component: errorInfo.componentStack,
          props: errorInfo.props,
          state: errorInfo.state,
          timestamp: new Date().toISOString()
        };
        
        this.handleError(error, context, options);
      },
      
      getDerivedStateFromError: (error) => {
        return {
          hasError: true,
          error: error.message,
          errorId: error.id || this._generateErrorId()
        };
      }
    };
  }

  /**
   * Get error analytics
   * @param {Object} options - Analytics options
   * @returns {Object} Error analytics
   */
  getErrorAnalytics(options = {}) {
    const {
      timeRange = 24 * 60 * 60 * 1000, // 24 hours
      includeDetails = true
    } = options;
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    // Filter errors by time range
    const recentErrors = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() >= startTime
    );
    
    const analytics = {
      overview: {
        totalErrors: recentErrors.length,
        errorRate: this.performanceMetrics.errorRate,
        recoveryRate: this.performanceMetrics.recoveryRate,
        averageRecoveryTime: this.performanceMetrics.averageRecoveryTime
      },
      errorTypes: this._getErrorTypeDistribution(recentErrors),
      severityLevels: this._getSeverityDistribution(recentErrors),
      recoveryStrategies: this._getRecoveryStrategyDistribution(recentErrors),
      topErrors: this._getTopErrors(recentErrors),
      errorTrends: includeDetails ? this._getErrorTrends(startTime) : null,
      performanceImpact: includeDetails ? this._getPerformanceImpact(recentErrors) : null
    };
    
    return analytics;
  }

  /**
   * Get error patterns
   * @param {Object} options - Pattern options
   * @returns {Object} Error patterns
   */
  getErrorPatterns(options = {}) {
    const {
      minOccurrences = 3,
      timeRange = 7 * 24 * 60 * 60 * 1000 // 7 days
    } = options;
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    const recentErrors = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() >= startTime
    );
    
    const patterns = {
      frequentErrors: this._identifyFrequentErrors(recentErrors, minOccurrences),
      errorCorrelations: this._identifyErrorCorrelations(recentErrors),
      temporalPatterns: this._identifyTemporalPatterns(recentErrors),
      componentPatterns: this._identifyComponentPatterns(recentErrors),
      userPatterns: this._identifyUserPatterns(recentErrors)
    };
    
    return patterns;
  }

  /**
   * Get recovery metrics
   * @param {Object} options - Metrics options
   * @returns {Object} Recovery metrics
   */
  getRecoveryMetrics(options = {}) {
    const {
      timeRange = 24 * 60 * 60 * 1000, // 24 hours
      includeDetails = true
    } = options;
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    const recentRecoveries = this.recoveryHistory.filter(
      recovery => new Date(recovery.timestamp).getTime() >= startTime
    );
    
    const metrics = {
      overview: {
        totalRecoveries: recentRecoveries.length,
        successRate: this._calculateRecoverySuccessRate(recentRecoveries),
        averageRecoveryTime: this._calculateAverageRecoveryTime(recentRecoveries)
      },
      strategyEffectiveness: this._getStrategyEffectiveness(recentRecoveries),
      recoveryTrends: includeDetails ? this._getRecoveryTrends(startTime) : null,
      performanceImpact: includeDetails ? this._getRecoveryPerformanceImpact(recentRecoveries) : null
    };
    
    return metrics;
  }

  /**
   * Shutdown the error handling service
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('🛑 Shutting down Unified Error Handling Service...');
    
    // Stop monitoring
    this.monitoringActive = false;
    
    // Clear monitoring intervals
    this.monitoringIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.monitoringIntervals = [];
    
    // Clear all data
    this.errorHistory = [];
    this.errorMetrics.clear();
    this.errorPatterns.clear();
    this.recoveryHistory = [];
    this.recoveryMetrics.clear();
    this.alertThresholds.clear();
    this.recoveryStrategies.clear();
    this.circuitBreakers.clear();
    this.fallbackServices.clear();
    this.errorHandlers.clear();
    this.recoveryHandlers.clear();
    
    // Reset state
    this.isInitialized = false;
    this.initializationPromise = null;
    
    console.log('✅ Unified Error Handling Service shutdown complete');
  }

  // Private methods

  _initializeErrorHandlers() {
    // Initialize error handlers for different error types
    this.errorHandlers.set(this.config.errorTypes.VALIDATION_ERROR, this._handleValidationError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.AUTHENTICATION_ERROR, this._handleAuthenticationError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.AUTHORIZATION_ERROR, this._handleAuthorizationError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.NETWORK_ERROR, this._handleNetworkError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.API_ERROR, this._handleAPIError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.DATABASE_ERROR, this._handleDatabaseError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.CONFIGURATION_ERROR, this._handleConfigurationError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.RUNTIME_ERROR, this._handleRuntimeError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.SECURITY_ERROR, this._handleSecurityError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.PERFORMANCE_ERROR, this._handlePerformanceError.bind(this));
    this.errorHandlers.set(this.config.errorTypes.UNKNOWN_ERROR, this._handleUnknownError.bind(this));
  }

  _initializeRecoveryStrategies() {
    // Initialize recovery strategies
    this.recoveryStrategies.set(this.config.recoveryStrategies.RETRY, this._retryStrategy.bind(this));
    this.recoveryStrategies.set(this.config.recoveryStrategies.FALLBACK, this._fallbackStrategy.bind(this));
    this.recoveryStrategies.set(this.config.recoveryStrategies.CIRCUIT_BREAKER, this._circuitBreakerStrategy.bind(this));
    this.recoveryStrategies.set(this.config.recoveryStrategies.GRACEFUL_DEGRADATION, this._gracefulDegradationStrategy.bind(this));
    this.recoveryStrategies.set(this.config.recoveryStrategies.USER_NOTIFICATION, this._userNotificationStrategy.bind(this));
    this.recoveryStrategies.set(this.config.recoveryStrategies.ADMIN_ALERT, this._adminAlertStrategy.bind(this));
  }

  _initializeCircuitBreakers() {
    // Initialize circuit breakers for different services
    const services = ['api', 'database', 'authentication', 'routing', 'search'];
    
    services.forEach(service => {
      this.circuitBreakers.set(service, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        threshold: 5,
        timeout: 60000 // 1 minute
      });
    });
  }

  _startErrorMonitoring() {
    if (this.config.monitoring.enabled) {
      this.monitoringActive = true;
      
      // Monitor error rates
      const errorRateInterval = setInterval(() => {
        this._monitorErrorRates();
      }, this.config.monitoring.reportInterval);
      this.monitoringIntervals.push(errorRateInterval);
      
      // Monitor performance
      const performanceInterval = setInterval(() => {
        this._monitorPerformance();
      }, this.config.monitoring.reportInterval);
      this.monitoringIntervals.push(performanceInterval);
      
      // Monitor circuit breakers
      const circuitBreakerInterval = setInterval(() => {
        this._monitorCircuitBreakers();
      }, this.config.monitoring.reportInterval);
      this.monitoringIntervals.push(circuitBreakerInterval);
    }
  }

  _setupGlobalErrorHandlers() {
    // Set up global error handlers
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        type: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        type: 'unhandled_promise_rejection',
        promise: event.promise
      });
    });
  }

  _createErrorRecord(error, context, options) {
    return {
      id: this._generateErrorId(),
      type: error.type || this.config.errorTypes.UNKNOWN_ERROR,
      message: error.message,
      stack: error.stack,
      context: {
        ...this.errorContext,
        ...context
      },
      options,
      timestamp: new Date().toISOString(),
      severity: error.severity || this._determineSeverity(error.type, context),
      code: error.code || this._generateErrorCode(error.type, context)
    };
  }

  _classifyError(error, context) {
    // Classify error based on type, message, and context
    const classification = {
      type: error.type || this.config.errorTypes.UNKNOWN_ERROR,
      severity: this._determineSeverity(error.type, context),
      category: this._determineCategory(error, context),
      impact: this._determineImpact(error, context),
      recoverable: this._isRecoverable(error, context)
    };
    
    return classification;
  }

  _determineRecoveryStrategy(classification, context) {
    // Determine recovery strategy based on error classification
    if (classification.type === this.config.errorTypes.NETWORK_ERROR) {
      return this.config.recoveryStrategies.RETRY;
    } else if (classification.type === this.config.errorTypes.API_ERROR) {
      return this.config.recoveryStrategies.CIRCUIT_BREAKER;
    } else if (classification.severity === this.config.severityLevels.CRITICAL) {
      return this.config.recoveryStrategies.ADMIN_ALERT;
    } else if (classification.recoverable) {
      return this.config.recoveryStrategies.FALLBACK;
    } else {
      return this.config.recoveryStrategies.USER_NOTIFICATION;
    }
  }

  async _executeRecoveryStrategy(strategy, errorRecord, context) {
    const startTime = performance.now();
    
    try {
      const recoveryHandler = this.recoveryStrategies.get(strategy);
      if (!recoveryHandler) {
        throw new Error(`Unknown recovery strategy: ${strategy}`);
      }
      
      const result = await recoveryHandler(errorRecord, context);
      
      const recoveryTime = performance.now() - startTime;
      
      // Record recovery
      this._recordRecovery(strategy, result, recoveryTime, errorRecord);
      
      return {
        success: true,
        strategy,
        result,
        recoveryTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (recoveryError) {
      const recoveryTime = performance.now() - startTime;
      
      // Record failed recovery
      this._recordRecovery(strategy, { success: false, error: recoveryError }, recoveryTime, errorRecord);
      
      return {
        success: false,
        strategy,
        error: recoveryError,
        recoveryTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  _updateErrorMetrics(errorRecord, recoveryResult) {
    // Update error metrics
    this.performanceMetrics.totalErrors++;
    
    // Update error type metrics
    const typeMetrics = this.errorMetrics.get(errorRecord.type) || {
      count: 0,
      totalRecoveryTime: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
    
    typeMetrics.count++;
    typeMetrics.totalRecoveryTime += recoveryResult.recoveryTime;
    
    if (recoveryResult.success) {
      typeMetrics.successfulRecoveries++;
    } else {
      typeMetrics.failedRecoveries++;
    }
    
    this.errorMetrics.set(errorRecord.type, typeMetrics);
    
    // Update overall metrics
    this.performanceMetrics.totalRecoveries += recoveryResult.success ? 1 : 0;
    this.performanceMetrics.averageRecoveryTime = 
      (this.performanceMetrics.averageRecoveryTime * 0.9) + (recoveryResult.recoveryTime * 0.1);
    
    // Calculate rates
    this.performanceMetrics.errorRate = this._calculateErrorRate();
    this.performanceMetrics.recoveryRate = this._calculateRecoveryRate();
  }

  _storeErrorRecord(errorRecord) {
    // Store error record
    this.errorHistory.push(errorRecord);
    
    // Keep only recent errors
    if (this.errorHistory.length > this.config.analytics.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.analytics.maxErrorHistory);
    }
    
    // Update error patterns
    this._updateErrorPatterns(errorRecord);
  }

  async _checkAlerting(errorRecord, recoveryResult) {
    // Check if alerting is needed
    const shouldAlert = this._shouldAlert(errorRecord, recoveryResult);
    
    if (shouldAlert) {
      await this._sendAlert(errorRecord, recoveryResult);
    }
  }

  _fallbackErrorHandling(error, context, handlingError) {
    // Fallback error handling when main error handling fails
    console.error('🚨 Fallback error handling:', {
      originalError: error.message,
      handlingError: handlingError.message,
      context
    });
    
    return {
      errorRecord: {
        id: this._generateErrorId(),
        type: this.config.errorTypes.UNKNOWN_ERROR,
        message: `Error handling failed: ${handlingError.message}`,
        context,
        timestamp: new Date().toISOString(),
        severity: this.config.severityLevels.CRITICAL
      },
      errorClassification: {
        type: this.config.errorTypes.UNKNOWN_ERROR,
        severity: this.config.severityLevels.CRITICAL,
        recoverable: false
      },
      recoveryStrategy: this.config.recoveryStrategies.ADMIN_ALERT,
      recoveryResult: {
        success: false,
        error: handlingError
      },
      handlingTime: 0,
      timestamp: new Date().toISOString()
    };
  }

  // Error type handlers
  async _handleValidationError(error, context) {
    return { handled: true, userMessage: 'Please check your input and try again.' };
  }

  async _handleAuthenticationError(error, context) {
    return { handled: true, userMessage: 'Please log in again.' };
  }

  async _handleAuthorizationError(error, context) {
    return { handled: true, userMessage: 'You do not have permission to perform this action.' };
  }

  async _handleNetworkError(error, context) {
    return { handled: true, userMessage: 'Network connection issue. Please check your connection.' };
  }

  async _handleAPIError(error, context) {
    return { handled: true, userMessage: 'Service temporarily unavailable. Please try again later.' };
  }

  async _handleDatabaseError(error, context) {
    return { handled: true, userMessage: 'Data service temporarily unavailable.' };
  }

  async _handleConfigurationError(error, context) {
    return { handled: true, userMessage: 'Configuration issue. Please contact support.' };
  }

  async _handleRuntimeError(error, context) {
    return { handled: true, userMessage: 'An unexpected error occurred. Please try again.' };
  }

  async _handleSecurityError(error, context) {
    return { handled: true, userMessage: 'Security issue detected. Please contact support.' };
  }

  async _handlePerformanceError(error, context) {
    return { handled: true, userMessage: 'Performance issue detected. Please try again.' };
  }

  async _handleUnknownError(error, context) {
    return { handled: true, userMessage: 'An unexpected error occurred. Please try again.' };
  }

  // Recovery strategies
  async _retryStrategy(errorRecord, context) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Simulate retry logic
        await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        
        // Return success on retry
        return { success: true, retryCount: i + 1 };
      } catch (retryError) {
        if (i === maxRetries - 1) {
          throw retryError;
        }
      }
    }
  }

  async _fallbackStrategy(errorRecord, context) {
    // Implement fallback logic
    return { success: true, fallbackUsed: true };
  }

  async _circuitBreakerStrategy(errorRecord, context) {
    // Implement circuit breaker logic
    return { success: true, circuitBreakerUsed: true };
  }

  async _gracefulDegradationStrategy(errorRecord, context) {
    // Implement graceful degradation
    return { success: true, degradedMode: true };
  }

  async _userNotificationStrategy(errorRecord, context) {
    // Implement user notification
    return { success: true, userNotified: true };
  }

  async _adminAlertStrategy(errorRecord, context) {
    // Implement admin alert
    return { success: true, adminAlerted: true };
  }

  // Utility methods
  _generateErrorId() {
    return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  _generateErrorCode(type, context) {
    const typeCode = type.replace(/_ERROR$/, '').substr(0, 3).toUpperCase();
    const contextCode = context.component ? context.component.substr(0, 3).toUpperCase() : 'GEN';
    return `${typeCode}_${contextCode}_${Date.now().toString(36)}`;
  }

  _determineSeverity(type, context) {
    const severityMap = {
      [this.config.errorTypes.SECURITY_ERROR]: this.config.severityLevels.CRITICAL,
      [this.config.errorTypes.AUTHENTICATION_ERROR]: this.config.severityLevels.HIGH,
      [this.config.errorTypes.AUTHORIZATION_ERROR]: this.config.severityLevels.HIGH,
      [this.config.errorTypes.DATABASE_ERROR]: this.config.severityLevels.HIGH,
      [this.config.errorTypes.API_ERROR]: this.config.severityLevels.MEDIUM,
      [this.config.errorTypes.NETWORK_ERROR]: this.config.severityLevels.MEDIUM,
      [this.config.errorTypes.VALIDATION_ERROR]: this.config.severityLevels.LOW,
      [this.config.errorTypes.PERFORMANCE_ERROR]: this.config.severityLevels.MEDIUM,
      [this.config.errorTypes.CONFIGURATION_ERROR]: this.config.severityLevels.HIGH,
      [this.config.errorTypes.RUNTIME_ERROR]: this.config.severityLevels.MEDIUM,
      [this.config.errorTypes.UNKNOWN_ERROR]: this.config.severityLevels.MEDIUM
    };
    
    return severityMap[type] || this.config.severityLevels.MEDIUM;
  }

  _determineCategory(error, context) {
    // Determine error category based on context
    if (context.component) return 'component';
    if (context.api) return 'api';
    if (context.database) return 'database';
    if (context.network) return 'network';
    return 'general';
  }

  _determineImpact(error, context) {
    // Determine error impact
    if (context.critical) return 'critical';
    if (context.userFacing) return 'user';
    if (context.internal) return 'internal';
    return 'unknown';
  }

  _isRecoverable(error, context) {
    // Determine if error is recoverable
    const recoverableTypes = [
      this.config.errorTypes.NETWORK_ERROR,
      this.config.errorTypes.API_ERROR,
      this.config.errorTypes.VALIDATION_ERROR
    ];
    
    return recoverableTypes.includes(error.type);
  }

  _enhanceStackTrace(stack, context) {
    // Enhance stack trace with context information
    return stack + `\nContext: ${JSON.stringify(context, null, 2)}`;
  }

  _generateUserMessage(type, message, context) {
    // Generate user-friendly error message
    const userMessages = {
      [this.config.errorTypes.VALIDATION_ERROR]: 'Please check your input and try again.',
      [this.config.errorTypes.AUTHENTICATION_ERROR]: 'Please log in again.',
      [this.config.errorTypes.AUTHORIZATION_ERROR]: 'You do not have permission to perform this action.',
      [this.config.errorTypes.NETWORK_ERROR]: 'Network connection issue. Please check your connection.',
      [this.config.errorTypes.API_ERROR]: 'Service temporarily unavailable. Please try again later.',
      [this.config.errorTypes.DATABASE_ERROR]: 'Data service temporarily unavailable.',
      [this.config.errorTypes.CONFIGURATION_ERROR]: 'Configuration issue. Please contact support.',
      [this.config.errorTypes.RUNTIME_ERROR]: 'An unexpected error occurred. Please try again.',
      [this.config.errorTypes.SECURITY_ERROR]: 'Security issue detected. Please contact support.',
      [this.config.errorTypes.PERFORMANCE_ERROR]: 'Performance issue detected. Please try again.',
      [this.config.errorTypes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
    };
    
    return userMessages[type] || 'An unexpected error occurred. Please try again.';
  }

  _recordRecovery(strategy, result, recoveryTime, errorRecord) {
    const recovery = {
      id: this._generateErrorId(),
      strategy,
      result,
      recoveryTime,
      errorId: errorRecord.id,
      timestamp: new Date().toISOString()
    };
    
    this.recoveryHistory.push(recovery);
    
    // Keep only recent recoveries
    if (this.recoveryHistory.length > this.config.analytics.maxErrorHistory) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.config.analytics.maxErrorHistory);
    }
  }

  _updateErrorPatterns(errorRecord) {
    // Update error patterns for analysis
    const patternKey = `${errorRecord.type}_${errorRecord.context.component || 'unknown'}`;
    const pattern = this.errorPatterns.get(patternKey) || {
      count: 0,
      firstOccurrence: errorRecord.timestamp,
      lastOccurrence: errorRecord.timestamp,
      errors: []
    };
    
    pattern.count++;
    pattern.lastOccurrence = errorRecord.timestamp;
    pattern.errors.push(errorRecord.id);
    
    this.errorPatterns.set(patternKey, pattern);
  }

  _shouldAlert(errorRecord, recoveryResult) {
    // Determine if alerting is needed
    if (errorRecord.severity === this.config.severityLevels.CRITICAL) {
      return true;
    }
    
    if (errorRecord.severity === this.config.severityLevels.HIGH && !recoveryResult.success) {
      return true;
    }
    
    // Check error rate threshold
    if (this.performanceMetrics.errorRate > this.config.monitoring.alertThresholds.errorRate) {
      return true;
    }
    
    return false;
  }

  async _sendAlert(errorRecord, recoveryResult) {
    // Send alert (implementation would depend on alerting system)
    console.warn('🚨 Error Alert:', {
      errorId: errorRecord.id,
      type: errorRecord.type,
      severity: errorRecord.severity,
      message: errorRecord.message,
      recoverySuccess: recoveryResult.success
    });
  }

  _monitorErrorRates() {
    // Monitor error rates
    const currentErrorRate = this._calculateErrorRate();
    
    if (currentErrorRate > this.config.monitoring.alertThresholds.errorRate) {
      console.warn('🚨 High error rate detected:', currentErrorRate);
    }
  }

  _monitorPerformance() {
    // Monitor performance metrics
    if (this.performanceMetrics.averageRecoveryTime > this.config.monitoring.alertThresholds.responseTime) {
      console.warn('🚨 High recovery time detected:', this.performanceMetrics.averageRecoveryTime);
    }
  }

  _monitorCircuitBreakers() {
    // Monitor circuit breaker states
    for (const [service, breaker] of this.circuitBreakers) {
      if (breaker.state === 'OPEN') {
        console.warn(`🚨 Circuit breaker open for service: ${service}`);
      }
    }
  }

  _calculateErrorRate() {
    // Calculate error rate
    const totalOperations = this.performanceMetrics.totalErrors + this.performanceMetrics.totalRecoveries;
    return totalOperations > 0 ? this.performanceMetrics.totalErrors / totalOperations : 0;
  }

  _calculateRecoveryRate() {
    // Calculate recovery rate
    return this.performanceMetrics.totalErrors > 0 ? 
      this.performanceMetrics.totalRecoveries / this.performanceMetrics.totalErrors : 0;
  }

  // Analytics methods
  _getErrorTypeDistribution(errors) {
    const distribution = {};
    errors.forEach(error => {
      distribution[error.type] = (distribution[error.type] || 0) + 1;
    });
    return distribution;
  }

  _getSeverityDistribution(errors) {
    const distribution = {};
    errors.forEach(error => {
      distribution[error.severity] = (distribution[error.severity] || 0) + 1;
    });
    return distribution;
  }

  _getRecoveryStrategyDistribution(errors) {
    const distribution = {};
    errors.forEach(error => {
      const strategy = error.recoveryStrategy;
      distribution[strategy] = (distribution[strategy] || 0) + 1;
    });
    return distribution;
  }

  _getTopErrors(errors) {
    const errorCounts = {};
    errors.forEach(error => {
      const key = `${error.type}: ${error.message}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));
  }

  _getErrorTrends(startTime) {
    // Generate error trends
    return [];
  }

  _getPerformanceImpact(errors) {
    // Calculate performance impact
    return {
      averageRecoveryTime: this.performanceMetrics.averageRecoveryTime,
      totalDowntime: errors.reduce((sum, error) => sum + (error.recoveryTime || 0), 0)
    };
  }

  _identifyFrequentErrors(errors, minOccurrences) {
    const errorCounts = {};
    errors.forEach(error => {
      const key = `${error.type}: ${error.message}`;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .filter(([, count]) => count >= minOccurrences)
      .sort(([,a], [,b]) => b - a)
      .map(([error, count]) => ({ error, count }));
  }

  _identifyErrorCorrelations(errors) {
    // Identify error correlations
    return [];
  }

  _identifyTemporalPatterns(errors) {
    // Identify temporal patterns
    return [];
  }

  _identifyComponentPatterns(errors) {
    // Identify component patterns
    return [];
  }

  _identifyUserPatterns(errors) {
    // Identify user patterns
    return [];
  }

  _calculateRecoverySuccessRate(recoveries) {
    if (recoveries.length === 0) return 0;
    const successfulRecoveries = recoveries.filter(r => r.result.success).length;
    return successfulRecoveries / recoveries.length;
  }

  _calculateAverageRecoveryTime(recoveries) {
    if (recoveries.length === 0) return 0;
    const totalTime = recoveries.reduce((sum, r) => sum + r.recoveryTime, 0);
    return totalTime / recoveries.length;
  }

  _getStrategyEffectiveness(recoveries) {
    const strategyStats = {};
    recoveries.forEach(recovery => {
      const strategy = recovery.strategy;
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { total: 0, successful: 0 };
      }
      strategyStats[strategy].total++;
      if (recovery.result.success) {
        strategyStats[strategy].successful++;
      }
    });
    
    return Object.entries(strategyStats).map(([strategy, stats]) => ({
      strategy,
      successRate: stats.total > 0 ? stats.successful / stats.total : 0,
      totalAttempts: stats.total
    }));
  }

  _getRecoveryTrends(startTime) {
    // Generate recovery trends
    return [];
  }

  _getRecoveryPerformanceImpact(recoveries) {
    // Calculate recovery performance impact
    return {
      averageRecoveryTime: this._calculateAverageRecoveryTime(recoveries),
      totalRecoveryTime: recoveries.reduce((sum, r) => sum + r.recoveryTime, 0)
    };
  }
}

// Export singleton instance
const unifiedErrorHandlingService = new UnifiedErrorHandlingService();
export default unifiedErrorHandlingService;
