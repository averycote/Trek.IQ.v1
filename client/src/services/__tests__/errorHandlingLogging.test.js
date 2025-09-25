/**
 * Error Handling & Logging Tests
 * 
 * Tests for unified error handling service and unified logging service
 * across the application.
 */

import unifiedErrorHandlingService from '../unifiedErrorHandlingService.js';
import unifiedLoggingService from '../unifiedLoggingService.js';

// Mock services
jest.mock('../unifiedAPIService.js', () => ({
  request: jest.fn(),
  initialize: jest.fn(),
  getHealthStatus: jest.fn(() => ({
    isInitialized: true,
    services: {},
    metrics: {},
    performance: {},
    circuitBreakers: {},
    cache: { size: 0, hitRate: 0 }
  }))
}));

jest.mock('../unifiedSecurityService.js', () => ({
  authenticate: jest.fn(),
  hasPermission: jest.fn(),
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn(),
  getAuthHeaders: jest.fn(),
  validateInput: jest.fn()
}));

jest.mock('../performanceOptimizationService.js', () => ({
  trackCache: jest.fn(),
  trackInterval: jest.fn(),
  trackEventListener: jest.fn()
}));

describe('UnifiedErrorHandlingService', () => {
  beforeEach(async () => {
    await unifiedErrorHandlingService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await unifiedErrorHandlingService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedErrorHandlingService.isInitialized).toBe(true);
    });

    test('should initialize error handlers', () => {
      expect(unifiedErrorHandlingService.errorHandlers.size).toBeGreaterThan(0);
      expect(unifiedErrorHandlingService.errorHandlers.has('VALIDATION_ERROR')).toBe(true);
      expect(unifiedErrorHandlingService.errorHandlers.has('AUTHENTICATION_ERROR')).toBe(true);
      expect(unifiedErrorHandlingService.errorHandlers.has('NETWORK_ERROR')).toBe(true);
    });

    test('should initialize recovery strategies', () => {
      expect(unifiedErrorHandlingService.recoveryStrategies.size).toBeGreaterThan(0);
      expect(unifiedErrorHandlingService.recoveryStrategies.has('retry')).toBe(true);
      expect(unifiedErrorHandlingService.recoveryStrategies.has('fallback')).toBe(true);
      expect(unifiedErrorHandlingService.recoveryStrategies.has('circuit_breaker')).toBe(true);
    });

    test('should initialize circuit breakers', () => {
      expect(unifiedErrorHandlingService.circuitBreakers.size).toBeGreaterThan(0);
      expect(unifiedErrorHandlingService.circuitBreakers.has('api')).toBe(true);
      expect(unifiedErrorHandlingService.circuitBreakers.has('database')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation error', async () => {
      const error = new Error('Invalid input');
      error.type = 'VALIDATION_ERROR';
      
      const context = {
        component: 'testComponent',
        action: 'validateInput'
      };
      
      const result = await unifiedErrorHandlingService.handleError(error, context);
      
      expect(result).toBeDefined();
      expect(result.errorRecord).toBeDefined();
      expect(result.errorRecord.type).toBe('VALIDATION_ERROR');
      expect(result.errorClassification).toBeDefined();
      expect(result.recoveryStrategy).toBeDefined();
      expect(result.recoveryResult).toBeDefined();
      expect(result.handlingTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeDefined();
    });

    test('should handle authentication error', async () => {
      const error = new Error('Authentication failed');
      error.type = 'AUTHENTICATION_ERROR';
      
      const context = {
        component: 'authComponent',
        action: 'login'
      };
      
      const result = await unifiedErrorHandlingService.handleError(error, context);
      
      expect(result).toBeDefined();
      expect(result.errorRecord.type).toBe('AUTHENTICATION_ERROR');
      expect(result.errorClassification.severity).toBe('high');
    });

    test('should handle network error', async () => {
      const error = new Error('Network connection failed');
      error.type = 'NETWORK_ERROR';
      
      const context = {
        component: 'apiService',
        action: 'makeRequest'
      };
      
      const result = await unifiedErrorHandlingService.handleError(error, context);
      
      expect(result).toBeDefined();
      expect(result.errorRecord.type).toBe('NETWORK_ERROR');
      expect(result.recoveryStrategy).toBe('retry');
    });

    test('should handle API error', async () => {
      const error = new Error('API request failed');
      error.type = 'API_ERROR';
      
      const context = {
        component: 'apiService',
        action: 'apiCall'
      };
      
      const result = await unifiedErrorHandlingService.handleError(error, context);
      
      expect(result).toBeDefined();
      expect(result.errorRecord.type).toBe('API_ERROR');
      expect(result.recoveryStrategy).toBe('circuit_breaker');
    });

    test('should handle security error', async () => {
      const error = new Error('Security violation detected');
      error.type = 'SECURITY_ERROR';
      
      const context = {
        component: 'securityService',
        action: 'validateRequest'
      };
      
      const result = await unifiedErrorHandlingService.handleError(error, context);
      
      expect(result).toBeDefined();
      expect(result.errorRecord.type).toBe('SECURITY_ERROR');
      expect(result.errorClassification.severity).toBe('critical');
    });

    test('should handle unknown error', async () => {
      const error = new Error('Unknown error occurred');
      
      const context = {
        component: 'unknownComponent',
        action: 'unknownAction'
      };
      
      const result = await unifiedErrorHandlingService.handleError(error, context);
      
      expect(result).toBeDefined();
      expect(result.errorRecord.type).toBe('UNKNOWN_ERROR');
      expect(result.errorClassification.severity).toBe('medium');
    });
  });

  describe('Error Creation', () => {
    test('should create standardized error', () => {
      const error = unifiedErrorHandlingService.createError(
        'VALIDATION_ERROR',
        'Invalid input provided',
        { component: 'testComponent' }
      );
      
      expect(error).toBeInstanceOf(Error);
      expect(error.type).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input provided');
      expect(error.code).toBeDefined();
      expect(error.severity).toBe('low');
      expect(error.context).toBeDefined();
      expect(error.timestamp).toBeDefined();
      expect(error.id).toBeDefined();
      expect(error.recoveryStrategy).toBeDefined();
      expect(error.userMessage).toBeDefined();
    });

    test('should create error with different severity levels', () => {
      const validationError = unifiedErrorHandlingService.createError(
        'VALIDATION_ERROR',
        'Invalid input',
        { component: 'testComponent' }
      );
      
      const securityError = unifiedErrorHandlingService.createError(
        'SECURITY_ERROR',
        'Security violation',
        { component: 'securityComponent' }
      );
      
      expect(validationError.severity).toBe('low');
      expect(securityError.severity).toBe('critical');
    });

    test('should generate unique error codes', () => {
      const error1 = unifiedErrorHandlingService.createError(
        'VALIDATION_ERROR',
        'Error 1',
        { component: 'component1' }
      );
      
      const error2 = unifiedErrorHandlingService.createError(
        'VALIDATION_ERROR',
        'Error 2',
        { component: 'component2' }
      );
      
      expect(error1.code).not.toBe(error2.code);
    });
  });

  describe('Function Wrapping', () => {
    test('should wrap function with error handling', async () => {
      const testFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const wrappedFunction = unifiedErrorHandlingService.wrapFunction(
        testFunction,
        { component: 'testComponent' }
      );
      
      await expect(wrappedFunction('arg1', 'arg2')).rejects.toThrow();
      
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('should wrap successful function', async () => {
      const testFunction = jest.fn().mockResolvedValue('success');
      
      const wrappedFunction = unifiedErrorHandlingService.wrapFunction(
        testFunction,
        { component: 'testComponent' }
      );
      
      const result = await wrappedFunction('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(testFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('Error Boundary', () => {
    test('should create error boundary configuration', () => {
      const errorBoundary = unifiedErrorHandlingService.createErrorBoundary();
      
      expect(errorBoundary).toBeDefined();
      expect(errorBoundary.componentDidCatch).toBeDefined();
      expect(errorBoundary.getDerivedStateFromError).toBeDefined();
    });

    test('should handle component errors', () => {
      const errorBoundary = unifiedErrorHandlingService.createErrorBoundary();
      const error = new Error('Component error');
      const errorInfo = {
        componentStack: 'TestComponent',
        props: { test: 'prop' },
        state: { test: 'state' }
      };
      
      const state = errorBoundary.getDerivedStateFromError(error);
      
      expect(state).toBeDefined();
      expect(state.hasError).toBe(true);
      expect(state.error).toBe('Component error');
      expect(state.errorId).toBeDefined();
    });
  });

  describe('Error Analytics', () => {
    test('should get error analytics', async () => {
      // Generate some test errors
      await unifiedErrorHandlingService.handleError(
        unifiedErrorHandlingService.createError('VALIDATION_ERROR', 'Test error 1'),
        { component: 'testComponent1' }
      );
      
      await unifiedErrorHandlingService.handleError(
        unifiedErrorHandlingService.createError('NETWORK_ERROR', 'Test error 2'),
        { component: 'testComponent2' }
      );
      
      const analytics = unifiedErrorHandlingService.getErrorAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalErrors).toBeGreaterThan(0);
      expect(analytics.overview.errorRate).toBeDefined();
      expect(analytics.overview.recoveryRate).toBeDefined();
      expect(analytics.overview.averageRecoveryTime).toBeDefined();
      expect(analytics.errorTypes).toBeDefined();
      expect(analytics.severityLevels).toBeDefined();
      expect(analytics.recoveryStrategies).toBeDefined();
      expect(analytics.topErrors).toBeDefined();
    });

    test('should get error analytics with trends', () => {
      const analytics = unifiedErrorHandlingService.getErrorAnalytics({
        includeDetails: true
      });
      
      expect(analytics.errorTrends).toBeDefined();
      expect(analytics.performanceImpact).toBeDefined();
    });
  });

  describe('Error Patterns', () => {
    test('should get error patterns', async () => {
      // Generate some test errors
      for (let i = 0; i < 5; i++) {
        await unifiedErrorHandlingService.handleError(
          unifiedErrorHandlingService.createError('VALIDATION_ERROR', 'Frequent error'),
          { component: 'testComponent' }
        );
      }
      
      const patterns = unifiedErrorHandlingService.getErrorPatterns();
      
      expect(patterns).toBeDefined();
      expect(patterns.frequentErrors).toBeDefined();
      expect(patterns.errorCorrelations).toBeDefined();
      expect(patterns.temporalPatterns).toBeDefined();
      expect(patterns.componentPatterns).toBeDefined();
      expect(patterns.userPatterns).toBeDefined();
    });

    test('should identify frequent errors', async () => {
      // Generate frequent errors
      for (let i = 0; i < 5; i++) {
        await unifiedErrorHandlingService.handleError(
          unifiedErrorHandlingService.createError('VALIDATION_ERROR', 'Frequent error'),
          { component: 'testComponent' }
        );
      }
      
      const patterns = unifiedErrorHandlingService.getErrorPatterns({
        minOccurrences: 3
      });
      
      expect(patterns.frequentErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Recovery Metrics', () => {
    test('should get recovery metrics', async () => {
      // Generate some test errors with recoveries
      await unifiedErrorHandlingService.handleError(
        unifiedErrorHandlingService.createError('NETWORK_ERROR', 'Network error'),
        { component: 'testComponent' }
      );
      
      const metrics = unifiedErrorHandlingService.getRecoveryMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.overview).toBeDefined();
      expect(metrics.overview.totalRecoveries).toBeGreaterThan(0);
      expect(metrics.overview.successRate).toBeDefined();
      expect(metrics.overview.averageRecoveryTime).toBeDefined();
      expect(metrics.strategyEffectiveness).toBeDefined();
    });

    test('should get recovery metrics with trends', () => {
      const metrics = unifiedErrorHandlingService.getRecoveryMetrics({
        includeDetails: true
      });
      
      expect(metrics.recoveryTrends).toBeDefined();
      expect(metrics.performanceImpact).toBeDefined();
    });
  });
});

describe('UnifiedLoggingService', () => {
  beforeEach(async () => {
    await unifiedLoggingService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await unifiedLoggingService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedLoggingService.isInitialized).toBe(true);
    });

    test('should initialize with correct log level', () => {
      expect(unifiedLoggingService.currentLogLevel).toBeDefined();
    });

    test('should set log level from environment', () => {
      // Test log level setting
      unifiedLoggingService.setLogLevel('DEBUG');
      expect(unifiedLoggingService.currentLogLevel).toBe(0);
      
      unifiedLoggingService.setLogLevel('ERROR');
      expect(unifiedLoggingService.currentLogLevel).toBe(3);
    });
  });

  describe('Basic Logging', () => {
    test('should log debug message', async () => {
      await unifiedLoggingService.debug('Debug message', { component: 'testComponent' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('DEBUG');
      expect(log.message).toBe('Debug message');
      expect(log.context.component).toBe('testComponent');
    });

    test('should log info message', async () => {
      await unifiedLoggingService.info('Info message', { component: 'testComponent' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('Info message');
    });

    test('should log warning message', async () => {
      await unifiedLoggingService.warn('Warning message', { component: 'testComponent' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('WARN');
      expect(log.message).toBe('Warning message');
    });

    test('should log error message', async () => {
      await unifiedLoggingService.error('Error message', { component: 'testComponent' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('ERROR');
      expect(log.message).toBe('Error message');
    });

    test('should log critical message', async () => {
      await unifiedLoggingService.critical('Critical message', { component: 'testComponent' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('CRITICAL');
      expect(log.message).toBe('Critical message');
    });
  });

  describe('Specialized Logging', () => {
    test('should log security event', async () => {
      await unifiedLoggingService.security('User login', { userId: 'user123' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('Security: User login');
      expect(log.category).toBe('security');
      expect(log.context.userId).toBe('user123');
    });

    test('should log performance metric', async () => {
      await unifiedLoggingService.performance('Response time: 100ms', { endpoint: '/api/test' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('Performance: Response time: 100ms');
      expect(log.category).toBe('performance');
      expect(log.context.endpoint).toBe('/api/test');
    });

    test('should log API request', async () => {
      await unifiedLoggingService.apiRequest('GET', '/api/test', { userId: 'user123' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('API Request: GET /api/test');
      expect(log.category).toBe('api');
      expect(log.context.method).toBe('GET');
      expect(log.context.url).toBe('/api/test');
    });

    test('should log API response', async () => {
      await unifiedLoggingService.apiResponse('GET', '/api/test', 200, { userId: 'user123' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('API Response: GET /api/test - 200');
      expect(log.category).toBe('api');
      expect(log.context.statusCode).toBe(200);
    });

    test('should log API error response', async () => {
      await unifiedLoggingService.apiResponse('GET', '/api/test', 500, { userId: 'user123' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('ERROR');
      expect(log.message).toBe('API Response: GET /api/test - 500');
    });

    test('should log user action', async () => {
      await unifiedLoggingService.userAction('Button clicked', { buttonId: 'submit' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('User Action: Button clicked');
      expect(log.category).toBe('user');
      expect(log.context.buttonId).toBe('submit');
    });

    test('should log audit event', async () => {
      await unifiedLoggingService.audit('Data accessed', { dataType: 'userProfile' });
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.level).toBe('INFO');
      expect(log.message).toBe('Audit: Data accessed');
      expect(log.category).toBe('audit');
      expect(log.context.dataType).toBe('userProfile');
    });
  });

  describe('Log Level Filtering', () => {
    test('should respect log level filtering', async () => {
      unifiedLoggingService.setLogLevel('ERROR');
      
      await unifiedLoggingService.debug('Debug message');
      await unifiedLoggingService.info('Info message');
      await unifiedLoggingService.warn('Warning message');
      await unifiedLoggingService.error('Error message');
      await unifiedLoggingService.critical('Critical message');
      
      const logs = unifiedLoggingService.logs;
      const recentLogs = logs.slice(-5);
      
      // Only ERROR and CRITICAL logs should be stored
      expect(recentLogs.filter(log => log.level === 'DEBUG').length).toBe(0);
      expect(recentLogs.filter(log => log.level === 'INFO').length).toBe(0);
      expect(recentLogs.filter(log => log.level === 'WARN').length).toBe(0);
      expect(recentLogs.filter(log => log.level === 'ERROR').length).toBe(1);
      expect(recentLogs.filter(log => log.level === 'CRITICAL').length).toBe(1);
    });
  });

  describe('Global Context', () => {
    test('should set global context', () => {
      unifiedLoggingService.setGlobalContext({
        userId: 'user123',
        sessionId: 'session456',
        component: 'globalComponent'
      });
      
      expect(unifiedLoggingService.globalContext.userId).toBe('user123');
      expect(unifiedLoggingService.globalContext.sessionId).toBe('session456');
      expect(unifiedLoggingService.globalContext.component).toBe('globalComponent');
    });

    test('should include global context in logs', async () => {
      unifiedLoggingService.setGlobalContext({
        userId: 'user123',
        sessionId: 'session456'
      });
      
      await unifiedLoggingService.info('Test message', { component: 'testComponent' });
      
      const log = unifiedLoggingService.logs[unifiedLoggingService.logs.length - 1];
      expect(log.context.userId).toBe('user123');
      expect(log.context.sessionId).toBe('session456');
      expect(log.context.component).toBe('testComponent');
    });
  });

  describe('Log Analytics', () => {
    test('should get log analytics', async () => {
      // Generate some test logs
      await unifiedLoggingService.info('Info message 1');
      await unifiedLoggingService.warn('Warning message 1');
      await unifiedLoggingService.error('Error message 1');
      await unifiedLoggingService.info('Info message 2');
      
      const analytics = unifiedLoggingService.getLogAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalLogs).toBeGreaterThan(0);
      expect(analytics.overview.logRate).toBeDefined();
      expect(analytics.overview.errorRate).toBeDefined();
      expect(analytics.overview.averageLogSize).toBeDefined();
      expect(analytics.logsByLevel).toBeDefined();
      expect(analytics.logsByCategory).toBeDefined();
      expect(analytics.topMessages).toBeDefined();
    });

    test('should get log analytics with trends', () => {
      const analytics = unifiedLoggingService.getLogAnalytics({
        includeDetails: true
      });
      
      expect(analytics.logTrends).toBeDefined();
      expect(analytics.performanceImpact).toBeDefined();
    });
  });

  describe('Log Patterns', () => {
    test('should get log patterns', async () => {
      // Generate some test logs
      for (let i = 0; i < 5; i++) {
        await unifiedLoggingService.info('Frequent message');
      }
      
      const patterns = unifiedLoggingService.getLogPatterns();
      
      expect(patterns).toBeDefined();
      expect(patterns.frequentMessages).toBeDefined();
      expect(patterns.logCorrelations).toBeDefined();
      expect(patterns.temporalPatterns).toBeDefined();
      expect(patterns.componentPatterns).toBeDefined();
      expect(patterns.userPatterns).toBeDefined();
    });

    test('should identify frequent messages', async () => {
      // Generate frequent messages
      for (let i = 0; i < 5; i++) {
        await unifiedLoggingService.info('Frequent message');
      }
      
      const patterns = unifiedLoggingService.getLogPatterns({
        minOccurrences: 3
      });
      
      expect(patterns.frequentMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Log Filtering', () => {
    test('should filter logs by level', async () => {
      await unifiedLoggingService.info('Info message');
      await unifiedLoggingService.warn('Warning message');
      await unifiedLoggingService.error('Error message');
      
      const infoLogs = unifiedLoggingService.getLogs({ level: 'INFO' });
      const errorLogs = unifiedLoggingService.getLogs({ level: 'ERROR' });
      
      expect(infoLogs.every(log => log.level === 'INFO')).toBe(true);
      expect(errorLogs.every(log => log.level === 'ERROR')).toBe(true);
    });

    test('should filter logs by category', async () => {
      await unifiedLoggingService.security('Security event');
      await unifiedLoggingService.performance('Performance metric');
      await unifiedLoggingService.info('Regular message');
      
      const securityLogs = unifiedLoggingService.getLogs({ category: 'security' });
      const performanceLogs = unifiedLoggingService.getLogs({ category: 'performance' });
      
      expect(securityLogs.every(log => log.category === 'security')).toBe(true);
      expect(performanceLogs.every(log => log.category === 'performance')).toBe(true);
    });

    test('should filter logs by component', async () => {
      await unifiedLoggingService.info('Message 1', { component: 'component1' });
      await unifiedLoggingService.info('Message 2', { component: 'component2' });
      
      const component1Logs = unifiedLoggingService.getLogs({ component: 'component1' });
      const component2Logs = unifiedLoggingService.getLogs({ component: 'component2' });
      
      expect(component1Logs.every(log => log.context.component === 'component1')).toBe(true);
      expect(component2Logs.every(log => log.context.component === 'component2')).toBe(true);
    });

    test('should filter logs by time range', async () => {
      await unifiedLoggingService.info('Recent message');
      
      const recentLogs = unifiedLoggingService.getLogs({}, { timeRange: 60000 }); // Last minute
      const oldLogs = unifiedLoggingService.getLogs({}, { timeRange: 1000 }); // Last second
      
      expect(recentLogs.length).toBeGreaterThan(0);
      expect(oldLogs.length).toBe(0);
    });
  });

  describe('Log Management', () => {
    test('should clear logs', async () => {
      await unifiedLoggingService.info('Message 1');
      await unifiedLoggingService.info('Message 2');
      
      expect(unifiedLoggingService.logs.length).toBeGreaterThan(0);
      
      await unifiedLoggingService.clearLogs();
      
      expect(unifiedLoggingService.logs.length).toBe(0);
    });

    test('should clear logs with filters', async () => {
      await unifiedLoggingService.info('Info message');
      await unifiedLoggingService.error('Error message');
      
      await unifiedLoggingService.clearLogs({ level: 'INFO' });
      
      const remainingLogs = unifiedLoggingService.logs;
      expect(remainingLogs.every(log => log.level !== 'INFO')).toBe(true);
    });

    test('should export logs to JSON', async () => {
      await unifiedLoggingService.info('Test message');
      
      const exportedLogs = await unifiedLoggingService.exportLogs({ format: 'json' });
      
      expect(exportedLogs).toBeDefined();
      const parsedLogs = JSON.parse(exportedLogs);
      expect(Array.isArray(parsedLogs)).toBe(true);
      expect(parsedLogs.length).toBeGreaterThan(0);
    });

    test('should export logs to CSV', async () => {
      await unifiedLoggingService.info('Test message');
      
      const exportedLogs = await unifiedLoggingService.exportLogs({ format: 'csv' });
      
      expect(exportedLogs).toBeDefined();
      expect(exportedLogs.includes('timestamp,level,category,message')).toBe(true);
    });

    test('should export logs to text', async () => {
      await unifiedLoggingService.info('Test message');
      
      const exportedLogs = await unifiedLoggingService.exportLogs({ format: 'text' });
      
      expect(exportedLogs).toBeDefined();
      expect(exportedLogs.includes('Test message')).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for error handling and logging', async () => {
    // Initialize all services
    await unifiedErrorHandlingService.initialize();
    await unifiedLoggingService.initialize();
    
    // Set up logging context
    unifiedLoggingService.setGlobalContext({
      userId: 'user123',
      sessionId: 'session456'
    });
    
    // Log some events
    await unifiedLoggingService.info('Application started');
    await unifiedLoggingService.security('User login', { userId: 'user123' });
    
    // Handle some errors
    const error = unifiedErrorHandlingService.createError(
      'VALIDATION_ERROR',
      'Invalid input provided',
      { component: 'testComponent' }
    );
    
    const errorResult = await unifiedErrorHandlingService.handleError(error, {
      component: 'testComponent',
      action: 'validateInput'
    });
    
    // Log the error handling result
    await unifiedLoggingService.error('Error handled', {
      errorId: errorResult.errorRecord.id,
      recoveryStrategy: errorResult.recoveryStrategy
    });
    
    // Get analytics
    const errorAnalytics = unifiedErrorHandlingService.getErrorAnalytics();
    const logAnalytics = unifiedLoggingService.getLogAnalytics();
    
    expect(errorAnalytics.overview.totalErrors).toBeGreaterThan(0);
    expect(logAnalytics.overview.totalLogs).toBeGreaterThan(0);
    
    // Cleanup
    await unifiedErrorHandlingService.shutdown();
    await unifiedLoggingService.shutdown();
  });

  test('should handle end-to-end error and logging workflow', async () => {
    await unifiedErrorHandlingService.initialize();
    await unifiedLoggingService.initialize();
    
    // Set up logging context
    unifiedLoggingService.setGlobalContext({
      userId: 'user123',
      sessionId: 'session456',
      component: 'testComponent'
    });
    
    // Log application start
    await unifiedLoggingService.info('Application starting');
    
    // Simulate API request
    await unifiedLoggingService.apiRequest('GET', '/api/test', { userId: 'user123' });
    
    // Simulate API error
    const apiError = unifiedErrorHandlingService.createError(
      'API_ERROR',
      'API request failed',
      { endpoint: '/api/test', method: 'GET' }
    );
    
    const errorResult = await unifiedErrorHandlingService.handleError(apiError, {
      component: 'apiService',
      action: 'makeRequest'
    });
    
    // Log API response with error
    await unifiedLoggingService.apiResponse('GET', '/api/test', 500, {
      errorId: errorResult.errorRecord.id
    });
    
    // Log error handling result
    await unifiedLoggingService.error('API error handled', {
      errorId: errorResult.errorRecord.id,
      recoveryStrategy: errorResult.recoveryStrategy,
      recoverySuccess: errorResult.recoveryResult.success
    });
    
    // Get comprehensive analytics
    const errorAnalytics = unifiedErrorHandlingService.getErrorAnalytics({
      includeDetails: true
    });
    
    const logAnalytics = unifiedLoggingService.getLogAnalytics({
      includeDetails: true
    });
    
    expect(errorAnalytics.overview.totalErrors).toBeGreaterThan(0);
    expect(errorAnalytics.errorTrends).toBeDefined();
    expect(logAnalytics.overview.totalLogs).toBeGreaterThan(0);
    expect(logAnalytics.logTrends).toBeDefined();
    
    // Get patterns
    const errorPatterns = unifiedErrorHandlingService.getErrorPatterns();
    const logPatterns = unifiedLoggingService.getLogPatterns();
    
    expect(errorPatterns.frequentErrors).toBeDefined();
    expect(logPatterns.frequentMessages).toBeDefined();
    
    // Cleanup
    await unifiedErrorHandlingService.shutdown();
    await unifiedLoggingService.shutdown();
  });
});
