/**
 * Security Monitoring Service
 * 
 * Provides comprehensive security monitoring, threat detection, and security
 * validation for the Trek-IQ application.
 * 
 * Features:
 * - Real-time security monitoring
 * - Threat detection and prevention
 * - Security event logging and analysis
 * - Input validation and sanitization
 * - Rate limiting and abuse prevention
 * - Security metrics and reporting
 */

import unifiedSecurityService from './unifiedSecurityService.js';
import unifiedAPIService from './unifiedAPIService.js';
import performanceOptimizationService from './performanceOptimizationService.js';

class SecurityMonitoringService {
  constructor() {
    this.isInitialized = false;
    this.monitoringActive = false;
    
    // Security configuration
    this.config = {
      // Monitoring intervals
      monitoring: {
        threatDetectionInterval: 30000, // 30 seconds
        metricsUpdateInterval: 60000, // 1 minute
        logCleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
        reportGenerationInterval: 60 * 60 * 1000 // 1 hour
      },
      
      // Threat detection thresholds
      threats: {
        maxFailedLogins: 5,
        maxFailedLoginsWindow: 15 * 60 * 1000, // 15 minutes
        maxSuspiciousRequests: 10,
        maxSuspiciousRequestsWindow: 5 * 60 * 1000, // 5 minutes
        maxRateLimitViolations: 3,
        maxRateLimitViolationsWindow: 60 * 60 * 1000, // 1 hour
        maxUnusualActivity: 20,
        maxUnusualActivityWindow: 10 * 60 * 1000 // 10 minutes
      },
      
      // Security policies
      policies: {
        enableInputValidation: true,
        enableOutputSanitization: true,
        enableCSRFProtection: true,
        enableXSSProtection: true,
        enableSQLInjectionProtection: true,
        enableRateLimiting: true,
        enableAuditLogging: true,
        enableThreatDetection: true
      },
      
      // Logging configuration
      logging: {
        maxLogEntries: 10000,
        logRetentionDays: 30,
        enableRealTimeAlerts: true,
        alertThresholds: {
          critical: 1,
          high: 5,
          medium: 10,
          low: 20
        }
      }
    };
    
    // Security metrics
    this.securityMetrics = {
      totalRequests: 0,
      blockedRequests: 0,
      suspiciousRequests: 0,
      failedAuthentications: 0,
      successfulAuthentications: 0,
      rateLimitViolations: 0,
      inputValidationFailures: 0,
      outputSanitizationFailures: 0,
      threatDetections: 0,
      lastThreatDetection: null,
      averageResponseTime: 0,
      peakConcurrentUsers: 0,
      currentConcurrentUsers: 0
    };
    
    // Security events log
    this.securityEvents = [];
    
    // Threat patterns
    this.threatPatterns = {
      // SQL injection patterns
      sqlInjection: [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
        /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
        /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
        /(\b(OR|AND)\s+1\s*=\s*1)/i,
        /(\b(OR|AND)\s+true)/i,
        /(\b(OR|AND)\s+false)/i
      ],
      
      // XSS patterns
      xss: [
        /<script[^>]*>.*?<\/script>/gi,
        /<iframe[^>]*>.*?<\/iframe>/gi,
        /<object[^>]*>.*?<\/object>/gi,
        /<embed[^>]*>.*?<\/embed>/gi,
        /<link[^>]*>.*?<\/link>/gi,
        /<meta[^>]*>.*?<\/meta>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /onclick\s*=/gi,
        /onmouseover\s*=/gi
      ],
      
      // Path traversal patterns
      pathTraversal: [
        /\.\.\//g,
        /\.\.\\/g,
        /\.\.%2f/gi,
        /\.\.%5c/gi,
        /\.\.%252f/gi,
        /\.\.%255c/gi
      ],
      
      // Command injection patterns
      commandInjection: [
        /[;&|`$()]/g,
        /\b(cat|ls|dir|type|more|less|head|tail|grep|find|awk|sed|cut|sort|uniq|wc|ps|kill|killall|pkill|top|htop|df|du|free|uptime|whoami|id|groups|su|sudo|passwd|chmod|chown|chgrp|tar|zip|unzip|gzip|gunzip|wget|curl|nc|netcat|telnet|ssh|ftp|scp|rsync)\b/i
      ],
      
      // Suspicious user agents
      suspiciousUserAgents: [
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i,
        /scanner/i,
        /hack/i,
        /exploit/i,
        /inject/i,
        /sqlmap/i,
        /nikto/i,
        /nmap/i,
        /masscan/i,
        /zap/i,
        /burp/i
      ]
    };
    
    // Rate limiting tracking
    this.rateLimiters = new Map();
    
    // Active sessions tracking
    this.activeSessions = new Map();
    
    // Security alerts
    this.securityAlerts = [];
    
    // Monitoring intervals
    this.monitoringIntervals = [];
  }

  /**
   * Initialize the security monitoring service
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Security Monitoring Service...');
    
    // Update configuration
    this.config = { ...this.config, ...options };
    
    // Initialize rate limiters
    this._initializeRateLimiters();
    
    // Start monitoring
    this._startMonitoring();
    
    this.isInitialized = true;
    this.monitoringActive = true;
    
    console.log('✅ Security Monitoring Service initialized successfully');
  }

  /**
   * Monitor incoming request for security threats
   * @param {Object} request - Request object
   * @param {Object} context - Request context
   * @returns {Object} Security assessment result
   */
  async monitorRequest(request, context = {}) {
    const startTime = performance.now();
    
    try {
      this.securityMetrics.totalRequests++;
      
      const assessment = {
        isSecure: true,
        threats: [],
        warnings: [],
        riskLevel: 'low',
        recommendations: [],
        blocked: false
      };
      
      // Input validation
      if (this.config.policies.enableInputValidation) {
        const inputValidation = await this._validateInputs(request, context);
        if (!inputValidation.isValid) {
          assessment.threats.push(...inputValidation.threats);
          assessment.warnings.push(...inputValidation.warnings);
          this.securityMetrics.inputValidationFailures++;
        }
      }
      
      // Threat pattern detection
      if (this.config.policies.enableThreatDetection) {
        const threatDetection = await this._detectThreats(request, context);
        if (threatDetection.threats.length > 0) {
          assessment.threats.push(...threatDetection.threats);
          this.securityMetrics.threatDetections++;
        }
      }
      
      // Rate limiting check
      if (this.config.policies.enableRateLimiting) {
        const rateLimitCheck = await this._checkRateLimit(request, context);
        if (!rateLimitCheck.allowed) {
          assessment.blocked = true;
          assessment.threats.push('Rate limit exceeded');
          this.securityMetrics.rateLimitViolations++;
        }
      }
      
      // CSRF protection
      if (this.config.policies.enableCSRFProtection) {
        const csrfCheck = await this._checkCSRF(request, context);
        if (!csrfCheck.valid) {
          assessment.threats.push('CSRF token missing or invalid');
        }
      }
      
      // Determine risk level
      assessment.riskLevel = this._calculateRiskLevel(assessment);
      
      // Block request if high risk
      if (assessment.riskLevel === 'critical' || assessment.blocked) {
        assessment.isSecure = false;
        this.securityMetrics.blockedRequests++;
        
        // Log security event
        this._logSecurityEvent('request_blocked', {
          request,
          context,
          assessment,
          timestamp: new Date().toISOString()
        });
      }
      
      // Log suspicious activity
      if (assessment.threats.length > 0 || assessment.warnings.length > 0) {
        this.securityMetrics.suspiciousRequests++;
        
        this._logSecurityEvent('suspicious_request', {
          request,
          context,
          assessment,
          timestamp: new Date().toISOString()
        });
      }
      
      const monitoringTime = performance.now() - startTime;
      
      // Update performance metrics
      this.securityMetrics.averageResponseTime = 
        (this.securityMetrics.averageResponseTime * 0.9) + (monitoringTime * 0.1);
      
      return assessment;
      
    } catch (error) {
      console.error('❌ Security monitoring failed:', error);
      
      // Log monitoring failure
      this._logSecurityEvent('monitoring_failure', {
        error: error.message,
        request,
        context,
        timestamp: new Date().toISOString()
      });
      
      // Return safe default
      return {
        isSecure: false,
        threats: ['Security monitoring failure'],
        warnings: [],
        riskLevel: 'high',
        recommendations: ['Review security monitoring configuration'],
        blocked: true
      };
    }
  }

  /**
   * Validate and sanitize input data
   * @param {Object} data - Data to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  async validateAndSanitizeInput(data, schema) {
    const result = {
      isValid: true,
      sanitizedData: {},
      errors: [],
      warnings: []
    };
    
    try {
      // Use unified security service for validation
      const validated = unifiedSecurityService.validateInput(data, schema);
      result.sanitizedData = validated;
      
    } catch (error) {
      result.isValid = false;
      result.errors.push(error.message);
      
      // Log validation failure
      this._logSecurityEvent('input_validation_failure', {
        data,
        schema,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  }

  /**
   * Get security metrics
   * @returns {Object} Security metrics
   */
  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      isMonitoringActive: this.monitoringActive,
      totalSecurityEvents: this.securityEvents.length,
      totalSecurityAlerts: this.securityAlerts.length,
      activeSessions: this.activeSessions.size,
      rateLimiters: this.rateLimiters.size
    };
  }

  /**
   * Get security report
   * @param {Object} options - Report options
   * @returns {Object} Security report
   */
  getSecurityReport(options = {}) {
    const { 
      timeRange = 24 * 60 * 60 * 1000, // 24 hours
      includeDetails = true 
    } = options;
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    // Filter events by time range
    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() >= startTime
    );
    
    // Categorize events
    const eventCategories = {
      threats: recentEvents.filter(e => e.type.includes('threat')),
      blocked: recentEvents.filter(e => e.type.includes('blocked')),
      suspicious: recentEvents.filter(e => e.type.includes('suspicious')),
      authentication: recentEvents.filter(e => e.type.includes('auth')),
      validation: recentEvents.filter(e => e.type.includes('validation'))
    };
    
    // Calculate statistics
    const statistics = {
      totalEvents: recentEvents.length,
      threatEvents: eventCategories.threats.length,
      blockedEvents: eventCategories.blocked.length,
      suspiciousEvents: eventCategories.suspicious.length,
      authenticationEvents: eventCategories.authentication.length,
      validationEvents: eventCategories.validation.length,
      averageEventsPerHour: recentEvents.length / (timeRange / (60 * 60 * 1000)),
      peakHour: this._findPeakHour(recentEvents),
      topThreatTypes: this._getTopThreatTypes(recentEvents),
      topBlockedIPs: this._getTopBlockedIPs(recentEvents)
    };
    
    const report = {
      timestamp: new Date().toISOString(),
      timeRange,
      statistics,
      metrics: this.getSecurityMetrics(),
      recommendations: this._generateSecurityRecommendations(statistics)
    };
    
    if (includeDetails) {
      report.eventCategories = eventCategories;
      report.recentAlerts = this.securityAlerts.slice(-10);
    }
    
    return report;
  }

  /**
   * Shutdown the security monitoring service
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('🛑 Shutting down Security Monitoring Service...');
    
    // Stop monitoring
    this.monitoringActive = false;
    
    // Clear monitoring intervals
    this.monitoringIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.monitoringIntervals = [];
    
    // Clear tracking data
    this.rateLimiters.clear();
    this.activeSessions.clear();
    this.securityEvents = [];
    this.securityAlerts = [];
    
    // Reset state
    this.isInitialized = false;
    
    console.log('✅ Security Monitoring Service shutdown complete');
  }

  // Private methods

  _initializeRateLimiters() {
    // Initialize rate limiters for different request types
    const rateLimitConfigs = {
      api: { requests: 100, window: 60000 }, // 100 requests per minute
      auth: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
      search: { requests: 50, window: 60000 }, // 50 requests per minute
      upload: { requests: 10, window: 60 * 60 * 1000 } // 10 requests per hour
    };
    
    Object.entries(rateLimitConfigs).forEach(([type, config]) => {
      this.rateLimiters.set(type, {
        requests: [],
        window: config.window,
        limit: config.requests
      });
    });
  }

  _startMonitoring() {
    // Threat detection monitoring
    const threatDetectionInterval = setInterval(() => {
      this._performThreatDetection();
    }, this.config.monitoring.threatDetectionInterval);
    this.monitoringIntervals.push(threatDetectionInterval);
    
    // Metrics update monitoring
    const metricsUpdateInterval = setInterval(() => {
      this._updateSecurityMetrics();
    }, this.config.monitoring.metricsUpdateInterval);
    this.monitoringIntervals.push(metricsUpdateInterval);
    
    // Log cleanup monitoring
    const logCleanupInterval = setInterval(() => {
      this._cleanupOldLogs();
    }, this.config.monitoring.logCleanupInterval);
    this.monitoringIntervals.push(logCleanupInterval);
    
    // Report generation monitoring
    const reportGenerationInterval = setInterval(() => {
      this._generateSecurityReport();
    }, this.config.monitoring.reportGenerationInterval);
    this.monitoringIntervals.push(reportGenerationInterval);
  }

  async _validateInputs(request, context) {
    const result = {
      isValid: true,
      threats: [],
      warnings: []
    };
    
    // Check for common injection patterns
    const inputData = {
      ...request.params,
      ...request.query,
      ...request.body,
      ...request.headers
    };
    
    Object.entries(inputData).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Check for SQL injection
        this.threatPatterns.sqlInjection.forEach(pattern => {
          if (pattern.test(value)) {
            result.threats.push(`SQL injection attempt in ${key}`);
            result.isValid = false;
          }
        });
        
        // Check for XSS
        this.threatPatterns.xss.forEach(pattern => {
          if (pattern.test(value)) {
            result.threats.push(`XSS attempt in ${key}`);
            result.isValid = false;
          }
        });
        
        // Check for path traversal
        this.threatPatterns.pathTraversal.forEach(pattern => {
          if (pattern.test(value)) {
            result.threats.push(`Path traversal attempt in ${key}`);
            result.isValid = false;
          }
        });
        
        // Check for command injection
        this.threatPatterns.commandInjection.forEach(pattern => {
          if (pattern.test(value)) {
            result.threats.push(`Command injection attempt in ${key}`);
            result.isValid = false;
          }
        });
      }
    });
    
    return result;
  }

  async _detectThreats(request, context) {
    const result = {
      threats: [],
      warnings: []
    };
    
    // Check user agent
    const userAgent = request.headers['user-agent'] || '';
    this.threatPatterns.suspiciousUserAgents.forEach(pattern => {
      if (pattern.test(userAgent)) {
        result.warnings.push('Suspicious user agent detected');
      }
    });
    
    // Check for unusual request patterns
    if (this._isUnusualRequestPattern(request, context)) {
      result.warnings.push('Unusual request pattern detected');
    }
    
    // Check for rapid requests from same IP
    if (this._isRapidRequestPattern(request, context)) {
      result.threats.push('Rapid request pattern detected');
    }
    
    return result;
  }

  async _checkRateLimit(request, context) {
    const clientId = context.clientId || request.ip || 'unknown';
    const requestType = this._getRequestType(request);
    
    const limiter = this.rateLimiters.get(requestType);
    if (!limiter) {
      return { allowed: true };
    }
    
    const now = Date.now();
    const windowStart = now - limiter.window;
    
    // Remove old requests
    limiter.requests = limiter.requests.filter(req => 
      req.timestamp > windowStart && req.clientId === clientId
    );
    
    // Check if limit exceeded
    if (limiter.requests.length >= limiter.limit) {
      return { allowed: false, reason: 'Rate limit exceeded' };
    }
    
    // Record this request
    limiter.requests.push({
      clientId,
      timestamp: now,
      request
    });
    
    return { allowed: true };
  }

  async _checkCSRF(request, context) {
    // Check for CSRF token in POST/PUT/DELETE requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfToken = request.headers['x-csrf-token'] || request.body?.csrfToken;
      const sessionToken = context.sessionToken;
      
      if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
        return { valid: false, reason: 'CSRF token missing or invalid' };
      }
    }
    
    return { valid: true };
  }

  _calculateRiskLevel(assessment) {
    if (assessment.blocked || assessment.threats.length > 0) {
      return 'critical';
    }
    
    if (assessment.warnings.length > 2) {
      return 'high';
    }
    
    if (assessment.warnings.length > 0) {
      return 'medium';
    }
    
    return 'low';
  }

  _getRequestType(request) {
    if (request.path?.includes('/auth')) return 'auth';
    if (request.path?.includes('/search')) return 'search';
    if (request.path?.includes('/upload')) return 'upload';
    return 'api';
  }

  _isUnusualRequestPattern(request, context) {
    // Check for unusual patterns (simplified implementation)
    const unusualPatterns = [
      request.path?.length > 1000, // Very long paths
      Object.keys(request.query || {}).length > 50, // Too many query parameters
      request.body && JSON.stringify(request.body).length > 10000 // Large body
    ];
    
    return unusualPatterns.some(pattern => pattern);
  }

  _isRapidRequestPattern(request, context) {
    const clientId = context.clientId || request.ip || 'unknown';
    const now = Date.now();
    const recentWindow = 60 * 1000; // 1 minute
    
    // Count recent requests from same client
    let recentRequestCount = 0;
    for (const [type, limiter] of this.rateLimiters.entries()) {
      recentRequestCount += limiter.requests.filter(req => 
        req.clientId === clientId && 
        (now - req.timestamp) < recentWindow
      ).length;
    }
    
    return recentRequestCount > 20; // More than 20 requests per minute
  }

  _logSecurityEvent(type, data) {
    const event = {
      id: this._generateEventId(),
      type,
      timestamp: new Date().toISOString(),
      ...data
    };
    
    this.securityEvents.push(event);
    
    // Keep only recent events
    if (this.securityEvents.length > this.config.logging.maxLogEntries) {
      this.securityEvents = this.securityEvents.slice(-this.config.logging.maxLogEntries);
    }
    
    // Check for alerts
    if (this.config.logging.enableRealTimeAlerts) {
      this._checkForAlerts(event);
    }
  }

  _checkForAlerts(event) {
    const alertThresholds = this.config.logging.alertThresholds;
    
    // Check for critical events
    if (event.type.includes('threat') || event.type.includes('blocked')) {
      this._createAlert('critical', `Security threat detected: ${event.type}`, event);
    }
    
    // Check for high frequency events
    const recentEvents = this.securityEvents.filter(e => 
      new Date(e.timestamp).getTime() > (Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );
    
    if (recentEvents.length > alertThresholds.high) {
      this._createAlert('high', `High frequency of security events: ${recentEvents.length}`, {
        eventCount: recentEvents.length,
        timeWindow: '5 minutes'
      });
    }
  }

  _createAlert(severity, message, data) {
    const alert = {
      id: this._generateEventId(),
      severity,
      message,
      timestamp: new Date().toISOString(),
      data
    };
    
    this.securityAlerts.push(alert);
    
    // Keep only recent alerts
    if (this.securityAlerts.length > 100) {
      this.securityAlerts = this.securityAlerts.slice(-100);
    }
    
    // Log alert
    console.warn(`🚨 Security Alert [${severity.toUpperCase()}]: ${message}`);
  }

  _performThreatDetection() {
    // Perform periodic threat detection
    const recentEvents = this.securityEvents.filter(e => 
      new Date(e.timestamp).getTime() > (Date.now() - 5 * 60 * 1000) // Last 5 minutes
    );
    
    // Check for patterns
    const threatCount = recentEvents.filter(e => e.type.includes('threat')).length;
    if (threatCount > this.config.threats.maxSuspiciousRequests) {
      this._createAlert('high', `High threat activity detected: ${threatCount} threats in 5 minutes`, {
        threatCount,
        timeWindow: '5 minutes'
      });
    }
  }

  _updateSecurityMetrics() {
    // Update concurrent users
    this.securityMetrics.currentConcurrentUsers = this.activeSessions.size;
    if (this.securityMetrics.currentConcurrentUsers > this.securityMetrics.peakConcurrentUsers) {
      this.securityMetrics.peakConcurrentUsers = this.securityMetrics.currentConcurrentUsers;
    }
    
    // Update last threat detection
    const lastThreat = this.securityEvents
      .filter(e => e.type.includes('threat'))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    
    if (lastThreat) {
      this.securityMetrics.lastThreatDetection = lastThreat.timestamp;
    }
  }

  _cleanupOldLogs() {
    const cutoffTime = Date.now() - (this.config.logging.logRetentionDays * 24 * 60 * 60 * 1000);
    
    this.securityEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > cutoffTime
    );
    
    this.securityAlerts = this.securityAlerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
  }

  _generateSecurityReport() {
    const report = this.getSecurityReport({ timeRange: 60 * 60 * 1000 }); // Last hour
    
    // Log report summary
    console.log('📊 Security Report (Last Hour):', {
      totalEvents: report.statistics.totalEvents,
      threats: report.statistics.threatEvents,
      blocked: report.statistics.blockedEvents,
      suspicious: report.statistics.suspiciousEvents
    });
  }

  _findPeakHour(events) {
    const hourCounts = {};
    
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  }

  _getTopThreatTypes(events) {
    const threatTypes = {};
    
    events.filter(e => e.type.includes('threat')).forEach(event => {
      threatTypes[event.type] = (threatTypes[event.type] || 0) + 1;
    });
    
    return Object.entries(threatTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  _getTopBlockedIPs(events) {
    const ipCounts = {};
    
    events.filter(e => e.type.includes('blocked')).forEach(event => {
      const ip = event.data?.context?.clientId || event.data?.request?.ip || 'unknown';
      ipCounts[ip] = (ipCounts[ip] || 0) + 1;
    });
    
    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));
  }

  _generateSecurityRecommendations(statistics) {
    const recommendations = [];
    
    if (statistics.threatEvents > 10) {
      recommendations.push('Consider implementing additional input validation');
    }
    
    if (statistics.blockedEvents > 5) {
      recommendations.push('Review and update rate limiting policies');
    }
    
    if (statistics.suspiciousEvents > 20) {
      recommendations.push('Investigate suspicious activity patterns');
    }
    
    if (statistics.authenticationEvents > 50) {
      recommendations.push('Consider implementing multi-factor authentication');
    }
    
    return recommendations;
  }

  _generateEventId() {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Export singleton instance
const securityMonitoringService = new SecurityMonitoringService();
export default securityMonitoringService;
