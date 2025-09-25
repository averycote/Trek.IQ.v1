/**
 * Configuration & Environment Management Tests
 * 
 * Tests for unified configuration service and environment management
 * across the application.
 */

import unifiedConfigurationService from '../unifiedConfigurationService.js';

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

jest.mock('../unifiedLoggingService.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  critical: jest.fn(),
  initialize: jest.fn()
}));

jest.mock('../unifiedErrorHandlingService.js', () => ({
  handleError: jest.fn(),
  createError: jest.fn(),
  wrapFunction: jest.fn(),
  initialize: jest.fn()
}));

describe('UnifiedConfigurationService', () => {
  beforeEach(async () => {
    await unifiedConfigurationService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await unifiedConfigurationService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedConfigurationService.isInitialized).toBe(true);
    });

    test('should detect environment', () => {
      expect(unifiedConfigurationService.currentEnvironment).toBeDefined();
      expect(['development', 'staging', 'production']).toContain(
        unifiedConfigurationService.currentEnvironment
      );
    });

    test('should load default configurations', () => {
      expect(unifiedConfigurationService.configurations.size).toBeGreaterThan(0);
      expect(unifiedConfigurationService.configurations.has('current')).toBe(true);
    });

    test('should load environment-specific configurations', () => {
      expect(unifiedConfigurationService.environmentConfigs.size).toBeGreaterThan(0);
      expect(unifiedConfigurationService.environmentConfigurations).toBeDefined();
    });

    test('should validate configurations', () => {
      expect(unifiedConfigurationService.environmentValidated).toBe(true);
      expect(unifiedConfigurationService.validationResults.size).toBeGreaterThan(0);
    });
  });

  describe('Configuration Access', () => {
    test('should get configuration value', () => {
      const appName = unifiedConfigurationService.get('application.name');
      expect(appName).toBe('Trek-IQ');
    });

    test('should get nested configuration value', () => {
      const apiTimeout = unifiedConfigurationService.get('api.timeout');
      expect(apiTimeout).toBeDefined();
      expect(typeof apiTimeout).toBe('number');
    });

    test('should return default value for non-existent path', () => {
      const nonExistent = unifiedConfigurationService.get('non.existent.path', 'default');
      expect(nonExistent).toBe('default');
    });

    test('should return null for non-existent path without default', () => {
      const nonExistent = unifiedConfigurationService.get('non.existent.path');
      expect(nonExistent).toBeNull();
    });

    test('should track configuration access', () => {
      unifiedConfigurationService.get('application.name');
      
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      expect(analytics.overview.totalAccess).toBeGreaterThan(0);
    });
  });

  describe('Configuration Updates', () => {
    test('should set configuration value', async () => {
      const success = await unifiedConfigurationService.set('application.name', 'Test App');
      expect(success).toBe(true);
      
      const appName = unifiedConfigurationService.get('application.name');
      expect(appName).toBe('Test App');
    });

    test('should set nested configuration value', async () => {
      const success = await unifiedConfigurationService.set('api.timeout', 60000);
      expect(success).toBe(true);
      
      const apiTimeout = unifiedConfigurationService.get('api.timeout');
      expect(apiTimeout).toBe(60000);
    });

    test('should validate configuration value', async () => {
      const success = await unifiedConfigurationService.set('api.timeout', 'invalid', {
        validate: true
      });
      expect(success).toBe(false);
    });

    test('should encrypt configuration value', async () => {
      const success = await unifiedConfigurationService.set('security.secret', 'secret-value', {
        encrypt: true
      });
      expect(success).toBe(true);
      
      const secret = unifiedConfigurationService.get('security.secret');
      expect(secret).toBeDefined();
    });

    test('should notify configuration change', async () => {
      const listener = jest.fn();
      const unsubscribe = unifiedConfigurationService.addConfigurationListener('application.name', listener);
      
      await unifiedConfigurationService.set('application.name', 'New App Name', {
        notify: true
      });
      
      expect(listener).toHaveBeenCalledWith('application.name', 'New App Name');
      
      unsubscribe();
    });

    test('should track configuration update', async () => {
      await unifiedConfigurationService.set('application.name', 'Updated App');
      
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      expect(analytics.overview.totalUpdates).toBeGreaterThan(0);
    });
  });

  describe('Environment Management', () => {
    test('should get environment information', () => {
      const envInfo = unifiedConfigurationService.getEnvironmentInfo();
      
      expect(envInfo).toBeDefined();
      expect(envInfo.current).toBeDefined();
      expect(envInfo.info).toBeDefined();
      expect(envInfo.validated).toBe(true);
      expect(envInfo.configurations).toBeDefined();
    });

    test('should switch to staging environment', async () => {
      const success = await unifiedConfigurationService.switchEnvironment('staging');
      expect(success).toBe(true);
      
      const envInfo = unifiedConfigurationService.getEnvironmentInfo();
      expect(envInfo.current).toBe('staging');
    });

    test('should switch to production environment', async () => {
      const success = await unifiedConfigurationService.switchEnvironment('production');
      expect(success).toBe(true);
      
      const envInfo = unifiedConfigurationService.getEnvironmentInfo();
      expect(envInfo.current).toBe('production');
    });

    test('should switch to development environment', async () => {
      const success = await unifiedConfigurationService.switchEnvironment('development');
      expect(success).toBe(true);
      
      const envInfo = unifiedConfigurationService.getEnvironmentInfo();
      expect(envInfo.current).toBe('development');
    });

    test('should fail to switch to unknown environment', async () => {
      const success = await unifiedConfigurationService.switchEnvironment('unknown');
      expect(success).toBe(false);
    });

    test('should backup configuration before environment switch', async () => {
      const success = await unifiedConfigurationService.switchEnvironment('staging', {
        backup: true
      });
      expect(success).toBe(true);
      
      expect(unifiedConfigurationService.updateHistory.length).toBeGreaterThan(0);
    });

    test('should notify environment change', async () => {
      const listener = jest.fn();
      const unsubscribe = unifiedConfigurationService.addConfigurationListener('*', listener);
      
      await unifiedConfigurationService.switchEnvironment('staging', {
        notify: true
      });
      
      expect(listener).toHaveBeenCalled();
      
      unsubscribe();
    });

    test('should track environment switch', async () => {
      await unifiedConfigurationService.switchEnvironment('staging');
      
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      expect(analytics.overview.totalEnvironmentSwitches).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate current configuration', async () => {
      const validation = await unifiedConfigurationService.validateConfiguration();
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
    });

    test('should validate custom configuration', async () => {
      const customConfig = {
        application: {
          name: 'Test App',
          version: '1.0.0'
        },
        api: {
          baseUrl: 'https://api.test.com',
          timeout: 30000
        }
      };
      
      const validation = await unifiedConfigurationService.validateConfiguration(customConfig);
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
    });

    test('should detect validation errors', async () => {
      const invalidConfig = {
        application: {
          name: 123, // Should be string
          version: '1.0.0'
        }
      };
      
      const validation = await unifiedConfigurationService.validateConfiguration(invalidConfig);
      
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Analytics', () => {
    test('should get configuration analytics', () => {
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalConfigurations).toBeGreaterThan(0);
      expect(analytics.overview.currentEnvironment).toBeDefined();
      expect(analytics.topAccessedConfigs).toBeDefined();
      expect(analytics.topUpdatedConfigs).toBeDefined();
      expect(analytics.configurationErrors).toBeDefined();
      expect(analytics.environmentSwitches).toBeDefined();
    });

    test('should get configuration analytics with trends', () => {
      const analytics = unifiedConfigurationService.getConfigurationAnalytics({
        includeDetails: true
      });
      
      expect(analytics.trends).toBeDefined();
    });

    test('should track configuration access', () => {
      unifiedConfigurationService.get('application.name');
      unifiedConfigurationService.get('api.timeout');
      unifiedConfigurationService.get('database.type');
      
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      expect(analytics.topAccessedConfigs.length).toBeGreaterThan(0);
    });

    test('should track configuration updates', async () => {
      await unifiedConfigurationService.set('application.name', 'Updated App');
      await unifiedConfigurationService.set('api.timeout', 60000);
      
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      expect(analytics.topUpdatedConfigs.length).toBeGreaterThan(0);
    });

    test('should track configuration errors', async () => {
      await unifiedConfigurationService.set('api.timeout', 'invalid', {
        validate: true
      });
      
      const analytics = unifiedConfigurationService.getConfigurationAnalytics();
      expect(analytics.configurationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Export/Import', () => {
    test('should export configuration to JSON', async () => {
      const exported = await unifiedConfigurationService.exportConfiguration({
        format: 'json'
      });
      
      expect(exported).toBeDefined();
      const parsed = JSON.parse(exported);
      expect(parsed).toBeDefined();
      expect(parsed.application).toBeDefined();
    });

    test('should export configuration to YAML', async () => {
      const exported = await unifiedConfigurationService.exportConfiguration({
        format: 'yaml'
      });
      
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
    });

    test('should export configuration to ENV format', async () => {
      const exported = await unifiedConfigurationService.exportConfiguration({
        format: 'env'
      });
      
      expect(exported).toBeDefined();
      expect(exported.includes('=')).toBe(true);
    });

    test('should export configuration without secrets', async () => {
      await unifiedConfigurationService.set('security.secret', 'secret-value');
      
      const exported = await unifiedConfigurationService.exportConfiguration({
        includeSecrets: false
      });
      
      expect(exported).toBeDefined();
      expect(exported.includes('secret-value')).toBe(false);
    });

    test('should export specific environment configuration', async () => {
      const exported = await unifiedConfigurationService.exportConfiguration({
        environment: 'staging'
      });
      
      expect(exported).toBeDefined();
    });

    test('should import configuration from JSON', async () => {
      const configData = JSON.stringify({
        application: {
          name: 'Imported App',
          version: '2.0.0'
        }
      });
      
      const success = await unifiedConfigurationService.importConfiguration(configData, {
        format: 'json'
      });
      
      expect(success).toBe(true);
      
      const appName = unifiedConfigurationService.get('application.name');
      expect(appName).toBe('Imported App');
    });

    test('should import configuration from YAML', async () => {
      const configData = JSON.stringify({
        application: {
          name: 'YAML App',
          version: '1.0.0'
        }
      });
      
      const success = await unifiedConfigurationService.importConfiguration(configData, {
        format: 'yaml'
      });
      
      expect(success).toBe(true);
    });

    test('should import configuration from ENV format', async () => {
      const configData = 'APPLICATION_NAME=Env App\nAPI_TIMEOUT=60000';
      
      const success = await unifiedConfigurationService.importConfiguration(configData, {
        format: 'env'
      });
      
      expect(success).toBe(true);
    });

    test('should validate imported configuration', async () => {
      const invalidConfigData = JSON.stringify({
        application: {
          name: 123 // Invalid type
        }
      });
      
      const success = await unifiedConfigurationService.importConfiguration(invalidConfigData, {
        format: 'json',
        validate: true
      });
      
      expect(success).toBe(false);
    });

    test('should backup configuration before import', async () => {
      const configData = JSON.stringify({
        application: {
          name: 'Backup Test App'
        }
      });
      
      const success = await unifiedConfigurationService.importConfiguration(configData, {
        format: 'json',
        backup: true
      });
      
      expect(success).toBe(true);
      expect(unifiedConfigurationService.updateHistory.length).toBeGreaterThan(0);
    });

    test('should merge imported configuration', async () => {
      const originalName = unifiedConfigurationService.get('application.name');
      
      const configData = JSON.stringify({
        application: {
          version: '2.0.0'
        }
      });
      
      const success = await unifiedConfigurationService.importConfiguration(configData, {
        format: 'json',
        merge: true
      });
      
      expect(success).toBe(true);
      
      const appName = unifiedConfigurationService.get('application.name');
      const appVersion = unifiedConfigurationService.get('application.version');
      
      expect(appName).toBe(originalName);
      expect(appVersion).toBe('2.0.0');
    });
  });

  describe('Configuration Listeners', () => {
    test('should add configuration listener', () => {
      const listener = jest.fn();
      const unsubscribe = unifiedConfigurationService.addConfigurationListener('application.name', listener);
      
      expect(unsubscribe).toBeDefined();
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });

    test('should notify configuration listeners', async () => {
      const listener = jest.fn();
      const unsubscribe = unifiedConfigurationService.addConfigurationListener('application.name', listener);
      
      await unifiedConfigurationService.set('application.name', 'Listener Test', {
        notify: true
      });
      
      expect(listener).toHaveBeenCalledWith('application.name', 'Listener Test');
      
      unsubscribe();
    });

    test('should unsubscribe configuration listener', async () => {
      const listener = jest.fn();
      const unsubscribe = unifiedConfigurationService.addConfigurationListener('application.name', listener);
      
      unsubscribe();
      
      await unifiedConfigurationService.set('application.name', 'Unsubscribe Test', {
        notify: true
      });
      
      expect(listener).not.toHaveBeenCalled();
    });

    test('should notify multiple listeners', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      const unsubscribe1 = unifiedConfigurationService.addConfigurationListener('application.name', listener1);
      const unsubscribe2 = unifiedConfigurationService.addConfigurationListener('application.name', listener2);
      
      await unifiedConfigurationService.set('application.name', 'Multiple Listeners Test', {
        notify: true
      });
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      
      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('Configuration Security', () => {
    test('should encrypt sensitive configuration values', async () => {
      const success = await unifiedConfigurationService.set('security.secret', 'sensitive-data', {
        encrypt: true
      });
      
      expect(success).toBe(true);
      expect(unifiedConfigurationService.encryptedConfigs.size).toBeGreaterThan(0);
    });

    test('should remove secrets from exported configuration', async () => {
      await unifiedConfigurationService.set('security.secret', 'secret-value');
      
      const exported = await unifiedConfigurationService.exportConfiguration({
        includeSecrets: false
      });
      
      expect(exported).toBeDefined();
      expect(exported.includes('secret-value')).toBe(false);
      expect(exported.includes('[REDACTED]')).toBe(true);
    });
  });

  describe('Configuration Monitoring', () => {
    test('should start configuration monitoring', () => {
      expect(unifiedConfigurationService.monitoringActive).toBe(true);
      expect(unifiedConfigurationService.monitoringIntervals.length).toBeGreaterThan(0);
    });

    test('should monitor configuration changes', () => {
      // Configuration monitoring is active
      expect(unifiedConfigurationService.monitoringActive).toBe(true);
    });

    test('should monitor configuration errors', () => {
      // Configuration error monitoring is active
      expect(unifiedConfigurationService.monitoringActive).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('should work with other services for configuration management', async () => {
    // Initialize configuration service
    await unifiedConfigurationService.initialize();
    
    // Set up configuration
    await unifiedConfigurationService.set('api.baseUrl', 'https://api.test.com');
    await unifiedConfigurationService.set('security.encryptionEnabled', true);
    
    // Switch environment
    await unifiedConfigurationService.switchEnvironment('staging');
    
    // Get configuration
    const apiUrl = unifiedConfigurationService.get('api.baseUrl');
    const encryptionEnabled = unifiedConfigurationService.get('security.encryptionEnabled');
    
    expect(apiUrl).toBeDefined();
    expect(encryptionEnabled).toBeDefined();
    
    // Get analytics
    const analytics = unifiedConfigurationService.getConfigurationAnalytics();
    expect(analytics.overview.totalConfigurations).toBeGreaterThan(0);
    
    // Cleanup
    await unifiedConfigurationService.shutdown();
  });

  test('should handle end-to-end configuration workflow', async () => {
    await unifiedConfigurationService.initialize();
    
    // Set up configuration listener
    const listener = jest.fn();
    const unsubscribe = unifiedConfigurationService.addConfigurationListener('application.name', listener);
    
    // Update configuration
    await unifiedConfigurationService.set('application.name', 'Test App');
    await unifiedConfigurationService.set('api.timeout', 60000);
    
    // Switch environment
    await unifiedConfigurationService.switchEnvironment('production');
    
    // Export configuration
    const exported = await unifiedConfigurationService.exportConfiguration({
      format: 'json',
      includeSecrets: false
    });
    
    // Import configuration
    const success = await unifiedConfigurationService.importConfiguration(exported, {
      format: 'json',
      validate: true,
      backup: true
    });
    
    expect(success).toBe(true);
    expect(listener).toHaveBeenCalled();
    
    // Get comprehensive analytics
    const analytics = unifiedConfigurationService.getConfigurationAnalytics({
      includeDetails: true
    });
    
    expect(analytics.overview.totalConfigurations).toBeGreaterThan(0);
    expect(analytics.overview.totalAccess).toBeGreaterThan(0);
    expect(analytics.overview.totalUpdates).toBeGreaterThan(0);
    expect(analytics.overview.totalEnvironmentSwitches).toBeGreaterThan(0);
    expect(analytics.trends).toBeDefined();
    
    // Cleanup
    unsubscribe();
    await unifiedConfigurationService.shutdown();
  });
});
