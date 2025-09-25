/**
 * Security & Authentication Tests
 * 
 * Tests for unified security service, authentication component, and security monitoring
 * across the application.
 */

import unifiedSecurityService from '../unifiedSecurityService.js';
import securityMonitoringService from '../securityMonitoringService.js';
import unifiedAPIService from '../unifiedAPIService.js';
import unifiedDataManager from '../unifiedDataManager.js';

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

jest.mock('../unifiedDataManager.js', () => ({
  initialize: jest.fn(),
  loadDataset: jest.fn(),
  storeDataset: jest.fn(),
  getDataset: jest.fn(),
  clearDataset: jest.fn(),
  getPerformanceMetrics: jest.fn(() => ({
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTime: 0,
    memoryUsage: 0,
    storageUsage: 0
  })),
  getStatus: jest.fn(() => ({
    isInitialized: true,
    isOnline: true,
    syncInProgress: false,
    datasets: [],
    cacheSize: 0,
    spatialIndexes: [],
    performance: {}
  }))
}));

jest.mock('../performanceOptimizationService.js', () => ({
  trackCache: jest.fn(),
  trackInterval: jest.fn(),
  trackEventListener: jest.fn()
}));

// Mock crypto for password hashing
global.crypto = {
  subtle: {
    digest: jest.fn(),
    generateKey: jest.fn()
  }
};

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('UnifiedSecurityService', () => {
  beforeEach(async () => {
    await unifiedSecurityService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await unifiedSecurityService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedSecurityService.isInitialized).toBe(true);
    });

    test('should initialize rate limiters', () => {
      expect(unifiedSecurityService.rateLimiters.size).toBeGreaterThan(0);
    });

    test('should initialize security configuration', () => {
      expect(unifiedSecurityService.config).toBeDefined();
      expect(unifiedSecurityService.config.token).toBeDefined();
      expect(unifiedSecurityService.config.rateLimit).toBeDefined();
      expect(unifiedSecurityService.config.security).toBeDefined();
    });
  });

  describe('Authentication', () => {
    test('should authenticate user successfully', async () => {
      const result = await unifiedSecurityService.authenticate(
        'demo@trek-iq.com',
        'demo123'
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('demo@trek-iq.com');
      expect(result.tokens).toBeDefined();
      expect(result.sessionId).toBeDefined();
    });

    test('should handle authentication failure', async () => {
      await expect(
        unifiedSecurityService.authenticate('invalid@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should validate input parameters', async () => {
      await expect(
        unifiedSecurityService.authenticate('', 'password')
      ).rejects.toThrow('email is required');

      await expect(
        unifiedSecurityService.authenticate('email@example.com', '')
      ).rejects.toThrow('password is required');
    });

    test('should check rate limiting', async () => {
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        try {
          await unifiedSecurityService.authenticate('test@example.com', 'wrongpassword');
        } catch (error) {
          // Expected to fail
        }
      }

      // Should be rate limited now
      await expect(
        unifiedSecurityService.authenticate('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Authorization', () => {
    beforeEach(async () => {
      // Authenticate a user first
      await unifiedSecurityService.authenticate('demo@trek-iq.com', 'demo123');
    });

    test('should check user permissions', () => {
      expect(unifiedSecurityService.hasPermission('read:public')).toBe(true);
      expect(unifiedSecurityService.hasPermission('search:basic')).toBe(true);
      expect(unifiedSecurityService.hasPermission('admin:users')).toBe(false);
    });

    test('should return current user', () => {
      const user = unifiedSecurityService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user.email).toBe('demo@trek-iq.com');
    });

    test('should check authentication status', () => {
      expect(unifiedSecurityService.isAuthenticated()).toBe(true);
    });

    test('should provide auth headers', () => {
      const headers = unifiedSecurityService.getAuthHeaders();
      expect(headers.Authorization).toContain('Bearer');
      expect(headers['X-User-ID']).toBeDefined();
      expect(headers['X-Session-ID']).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    test('should validate input data', () => {
      const schema = {
        email: {
          required: true,
          type: 'string',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          sanitize: 'html'
        },
        password: {
          required: true,
          type: 'string',
          minLength: 8,
          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        }
      };

      const validData = {
        email: 'test@example.com',
        password: 'Password123!'
      };

      const result = unifiedSecurityService.validateInput(validData, schema);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('Password123!');
    });

    test('should reject invalid input data', () => {
      const schema = {
        email: {
          required: true,
          type: 'string',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
      };

      const invalidData = {
        email: 'invalid-email'
      };

      expect(() => {
        unifiedSecurityService.validateInput(invalidData, schema);
      }).toThrow('Validation failed');
    });

    test('should sanitize input data', () => {
      const schema = {
        content: {
          required: true,
          type: 'string',
          sanitize: 'html'
        }
      };

      const dataWithHTML = {
        content: '<script>alert("xss")</script>Hello World'
      };

      const result = unifiedSecurityService.validateInput(dataWithHTML, schema);
      expect(result.content).toBe('alert("xss")Hello World');
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      await unifiedSecurityService.authenticate('demo@trek-iq.com', 'demo123');
    });

    test('should logout user successfully', async () => {
      expect(unifiedSecurityService.isAuthenticated()).toBe(true);

      await unifiedSecurityService.logout();

      expect(unifiedSecurityService.isAuthenticated()).toBe(false);
      expect(unifiedSecurityService.getCurrentUser()).toBeNull();
    });

    test('should clear tokens on logout', async () => {
      await unifiedSecurityService.logout();

      const headers = unifiedSecurityService.getAuthHeaders();
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('Security Metrics', () => {
    test('should track security metrics', async () => {
      const initialMetrics = unifiedSecurityService.getSecurityMetrics();

      // Perform some authentication attempts
      try {
        await unifiedSecurityService.authenticate('demo@trek-iq.com', 'demo123');
      } catch (error) {
        // Expected
      }

      const updatedMetrics = unifiedSecurityService.getSecurityMetrics();
      expect(updatedMetrics.totalLogins).toBeGreaterThan(initialMetrics.totalLogins);
    });

    test('should provide audit log', () => {
      const auditLog = unifiedSecurityService.getAuditLog();
      expect(Array.isArray(auditLog)).toBe(true);
    });

    test('should filter audit log by type', () => {
      const loginLogs = unifiedSecurityService.getAuditLog({ type: 'login_success' });
      expect(Array.isArray(loginLogs)).toBe(true);
    });
  });
});

describe('SecurityMonitoringService', () => {
  beforeEach(async () => {
    await securityMonitoringService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await securityMonitoringService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(securityMonitoringService.isInitialized).toBe(true);
      expect(securityMonitoringService.monitoringActive).toBe(true);
    });

    test('should initialize rate limiters', () => {
      expect(securityMonitoringService.rateLimiters.size).toBeGreaterThan(0);
    });

    test('should initialize threat patterns', () => {
      expect(securityMonitoringService.threatPatterns).toBeDefined();
      expect(securityMonitoringService.threatPatterns.sqlInjection).toBeDefined();
      expect(securityMonitoringService.threatPatterns.xss).toBeDefined();
      expect(securityMonitoringService.threatPatterns.pathTraversal).toBeDefined();
    });
  });

  describe('Request Monitoring', () => {
    test('should monitor secure requests', async () => {
      const request = {
        method: 'GET',
        path: '/api/data',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        params: {},
        query: {},
        body: {}
      };

      const context = {
        clientId: '127.0.0.1',
        sessionToken: 'valid-session-token'
      };

      const assessment = await securityMonitoringService.monitorRequest(request, context);

      expect(assessment.isSecure).toBe(true);
      expect(assessment.threats).toHaveLength(0);
      expect(assessment.riskLevel).toBe('low');
    });

    test('should detect SQL injection attempts', async () => {
      const request = {
        method: 'POST',
        path: '/api/search',
        headers: {},
        params: {},
        query: { q: "'; DROP TABLE users; --" },
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      const assessment = await securityMonitoringService.monitorRequest(request, context);

      expect(assessment.isSecure).toBe(false);
      expect(assessment.threats.length).toBeGreaterThan(0);
      expect(assessment.threats.some(t => t.includes('SQL injection'))).toBe(true);
      expect(assessment.riskLevel).toBe('critical');
    });

    test('should detect XSS attempts', async () => {
      const request = {
        method: 'POST',
        path: '/api/comment',
        headers: {},
        params: {},
        query: {},
        body: { content: '<script>alert("xss")</script>' }
      };

      const context = { clientId: '127.0.0.1' };

      const assessment = await securityMonitoringService.monitorRequest(request, context);

      expect(assessment.isSecure).toBe(false);
      expect(assessment.threats.length).toBeGreaterThan(0);
      expect(assessment.threats.some(t => t.includes('XSS'))).toBe(true);
    });

    test('should detect path traversal attempts', async () => {
      const request = {
        method: 'GET',
        path: '/api/file',
        headers: {},
        params: { file: '../../../etc/passwd' },
        query: {},
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      const assessment = await securityMonitoringService.monitorRequest(request, context);

      expect(assessment.isSecure).toBe(false);
      expect(assessment.threats.length).toBeGreaterThan(0);
      expect(assessment.threats.some(t => t.includes('Path traversal'))).toBe(true);
    });

    test('should detect command injection attempts', async () => {
      const request = {
        method: 'POST',
        path: '/api/execute',
        headers: {},
        params: {},
        query: {},
        body: { command: 'ls; cat /etc/passwd' }
      };

      const context = { clientId: '127.0.0.1' };

      const assessment = await securityMonitoringService.monitorRequest(request, context);

      expect(assessment.isSecure).toBe(false);
      expect(assessment.threats.length).toBeGreaterThan(0);
      expect(assessment.threats.some(t => t.includes('Command injection'))).toBe(true);
    });

    test('should detect suspicious user agents', async () => {
      const request = {
        method: 'GET',
        path: '/api/data',
        headers: {
          'user-agent': 'sqlmap/1.0'
        },
        params: {},
        query: {},
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      const assessment = await securityMonitoringService.monitorRequest(request, context);

      expect(assessment.warnings.length).toBeGreaterThan(0);
      expect(assessment.warnings.some(w => w.includes('Suspicious user agent'))).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const request = {
        method: 'GET',
        path: '/api/data',
        headers: {},
        params: {},
        query: {},
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      // Make multiple requests quickly
      for (let i = 0; i < 105; i++) {
        await securityMonitoringService.monitorRequest(request, context);
      }

      // Should be rate limited
      const assessment = await securityMonitoringService.monitorRequest(request, context);
      expect(assessment.blocked).toBe(true);
      expect(assessment.threats.some(t => t.includes('Rate limit exceeded'))).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should validate and sanitize input', async () => {
      const schema = {
        email: {
          required: true,
          type: 'string',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          sanitize: 'html'
        },
        content: {
          required: true,
          type: 'string',
          sanitize: 'xss'
        }
      };

      const data = {
        email: 'test@example.com',
        content: '<script>alert("xss")</script>Hello World'
      };

      const result = await securityMonitoringService.validateAndSanitizeInput(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.sanitizedData.email).toBe('test@example.com');
      expect(result.sanitizedData.content).toBe('alert("xss")Hello World');
    });

    test('should reject invalid input', async () => {
      const schema = {
        email: {
          required: true,
          type: 'string',
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
      };

      const data = {
        email: 'invalid-email'
      };

      const result = await securityMonitoringService.validateAndSanitizeInput(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Security Metrics', () => {
    test('should track security metrics', async () => {
      const initialMetrics = securityMonitoringService.getSecurityMetrics();

      // Perform some monitoring
      const request = {
        method: 'GET',
        path: '/api/data',
        headers: {},
        params: {},
        query: {},
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      await securityMonitoringService.monitorRequest(request, context);

      const updatedMetrics = securityMonitoringService.getSecurityMetrics();
      expect(updatedMetrics.totalRequests).toBeGreaterThan(initialMetrics.totalRequests);
    });

    test('should provide security report', () => {
      const report = securityMonitoringService.getSecurityReport();

      expect(report.timestamp).toBeDefined();
      expect(report.timeRange).toBeDefined();
      expect(report.statistics).toBeDefined();
      expect(report.metrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    test('should filter report by time range', () => {
      const report = securityMonitoringService.getSecurityReport({
        timeRange: 60 * 60 * 1000 // 1 hour
      });

      expect(report.timeRange).toBe(60 * 60 * 1000);
    });
  });

  describe('Threat Detection', () => {
    test('should detect rapid request patterns', async () => {
      const request = {
        method: 'GET',
        path: '/api/data',
        headers: {},
        params: {},
        query: {},
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      // Make rapid requests
      for (let i = 0; i < 25; i++) {
        await securityMonitoringService.monitorRequest(request, context);
      }

      const assessment = await securityMonitoringService.monitorRequest(request, context);
      expect(assessment.threats.some(t => t.includes('Rapid request pattern'))).toBe(true);
    });

    test('should detect unusual request patterns', async () => {
      const request = {
        method: 'GET',
        path: '/api/data',
        headers: {},
        params: {},
        query: { param: 'a'.repeat(1000) }, // Very long parameter
        body: {}
      };

      const context = { clientId: '127.0.0.1' };

      const assessment = await securityMonitoringService.monitorRequest(request, context);
      expect(assessment.warnings.some(w => w.includes('Unusual request pattern'))).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for security and authentication', async () => {
    // Initialize all services
    await unifiedSecurityService.initialize();
    await securityMonitoringService.initialize();
    
    // Authenticate user
    const authResult = await unifiedSecurityService.authenticate('demo@trek-iq.com', 'demo123');
    expect(authResult.success).toBe(true);
    
    // Monitor authenticated request
    const request = {
      method: 'GET',
      path: '/api/protected',
      headers: unifiedSecurityService.getAuthHeaders(),
      params: {},
      query: {},
      body: {}
    };
    
    const context = {
      clientId: '127.0.0.1',
      sessionToken: authResult.sessionId
    };
    
    const assessment = await securityMonitoringService.monitorRequest(request, context);
    expect(assessment.isSecure).toBe(true);
    
    // Check permissions
    expect(unifiedSecurityService.hasPermission('read:public')).toBe(true);
    
    // Get security metrics
    const securityMetrics = unifiedSecurityService.getSecurityMetrics();
    const monitoringMetrics = securityMonitoringService.getSecurityMetrics();
    
    expect(securityMetrics.isAuthenticated).toBe(true);
    expect(monitoringMetrics.isMonitoringActive).toBe(true);
    
    // Cleanup
    await unifiedSecurityService.logout();
    await securityMonitoringService.shutdown();
  });

  test('should handle security threats end-to-end', async () => {
    await securityMonitoringService.initialize();
    
    // Simulate malicious request
    const maliciousRequest = {
      method: 'POST',
      path: '/api/search',
      headers: {
        'user-agent': 'sqlmap/1.0'
      },
      params: {},
      query: { q: "'; DROP TABLE users; --" },
      body: {}
    };
    
    const context = { clientId: '127.0.0.1' };
    
    const assessment = await securityMonitoringService.monitorRequest(maliciousRequest, context);
    
    expect(assessment.isSecure).toBe(false);
    expect(assessment.blocked).toBe(true);
    expect(assessment.threats.length).toBeGreaterThan(0);
    expect(assessment.riskLevel).toBe('critical');
    
    // Check that metrics were updated
    const metrics = securityMonitoringService.getSecurityMetrics();
    expect(metrics.blockedRequests).toBeGreaterThan(0);
    expect(metrics.threatDetections).toBeGreaterThan(0);
    
    await securityMonitoringService.shutdown();
  });
});
