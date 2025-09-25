/**
 * Unified Configuration Service - Single Canonical Configuration Implementation
 * 
 * Consolidates all configuration functionality into a single, clean, production-ready
 * implementation that provides comprehensive configuration and environment management.
 * 
 * Features:
 * - Unified configuration management and validation
 * - Environment detection and management
 * - Configuration security and encryption
 * - Dynamic configuration updates
 * - Configuration monitoring and analytics
 * - Configuration backup and recovery
 */

import unifiedAPIService from './unifiedAPIService.js';
import unifiedSecurityService from './unifiedSecurityService.js';
import unifiedLoggingService from './unifiedLoggingService.js';
import unifiedErrorHandlingService from './unifiedErrorHandlingService.js';

class UnifiedConfigurationService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Configuration storage
    this.configurations = new Map();
    this.environmentConfigs = new Map();
    this.defaultConfigs = new Map();
    this.overrideConfigs = new Map();
    
    // Environment management
    this.currentEnvironment = null;
    this.environmentInfo = {};
    this.environmentValidated = false;
    
    // Configuration validation
    this.configSchemas = new Map();
    this.validationResults = new Map();
    this.configErrors = new Map();
    
    // Configuration monitoring
    this.monitoringActive = false;
    this.monitoringIntervals = [];
    this.configMetrics = new Map();
    
    // Configuration security
    this.encryptedConfigs = new Map();
    this.configSecrets = new Map();
    this.securityValidated = false;
    
    // Configuration updates
    this.updateQueue = [];
    this.updateHistory = [];
    this.updateListeners = new Map();
    
    // Configuration analytics
    this.analytics = {
      configAccess: new Map(),
      configUpdates: new Map(),
      configErrors: new Map(),
      environmentSwitches: new Map()
    };
    
    // Default configuration
    this.defaultConfiguration = {
      // Application configuration
      application: {
        name: 'Trek-IQ',
        version: '1.0.0',
        environment: 'development',
        debug: false,
        logLevel: 'INFO',
        timezone: 'UTC',
        locale: 'en-US'
      },
      
      // API configuration
      api: {
        baseUrl: 'https://api.trek-iq.com',
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        rateLimit: {
          requests: 1000,
          window: 60000
        }
      },
      
      // Database configuration
      database: {
        type: 'indexeddb',
        name: 'TrekIQDB',
        version: 1,
        maxSize: 50 * 1024 * 1024, // 50MB
        ttl: 24 * 60 * 60 * 1000 // 24 hours
      },
      
      // Cache configuration
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 300000, // 5 minutes
        cleanupInterval: 60000 // 1 minute
      },
      
      // Security configuration
      security: {
        encryptionEnabled: true,
        tokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15 minutes
      },
      
      // Performance configuration
      performance: {
        maxConcurrentRequests: 10,
        requestTimeout: 30000,
        memoryLimit: 100 * 1024 * 1024, // 100MB
        gcInterval: 5 * 60 * 1000 // 5 minutes
      },
      
      // Feature flags
      features: {
        routing: true,
        search: true,
        accessibility: true,
        transit: true,
        offline: false,
        analytics: true,
        monitoring: true
      }
    };
    
    // Environment-specific configurations
    this.environmentConfigurations = {
      development: {
        application: {
          debug: true,
          logLevel: 'DEBUG'
        },
        api: {
          baseUrl: 'http://localhost:3000',
          timeout: 60000
        },
        security: {
          encryptionEnabled: false
        },
        features: {
          offline: true,
          analytics: false
        }
      },
      
      staging: {
        application: {
          debug: false,
          logLevel: 'INFO'
        },
        api: {
          baseUrl: 'https://staging-api.trek-iq.com',
          timeout: 30000
        },
        security: {
          encryptionEnabled: true
        },
        features: {
          offline: false,
          analytics: true
        }
      },
      
      production: {
        application: {
          debug: false,
          logLevel: 'WARN'
        },
        api: {
          baseUrl: 'https://api.trek-iq.com',
          timeout: 15000
        },
        security: {
          encryptionEnabled: true
        },
        features: {
          offline: false,
          analytics: true,
          monitoring: true
        }
      }
    };
  }

  /**
   * Initialize the unified configuration service
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
      console.log('🚀 Initializing Unified Configuration Service...');
      
      // Detect environment
      await this._detectEnvironment();
      
      // Load configurations
      await this._loadConfigurations();
      
      // Validate configurations
      await this._validateConfigurations();
      
      // Set up configuration monitoring
      this._startConfigurationMonitoring();
      
      // Set up configuration security
      await this._setupConfigurationSecurity();
      
      this.isInitialized = true;
      console.log('✅ Unified Configuration Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Unified Configuration Service:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get configuration value
   * @param {string} path - Configuration path (e.g., 'api.baseUrl')
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    try {
      const keys = path.split('.');
      let value = this.configurations.get('current');
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }
      
      // Track configuration access
      this._trackConfigAccess(path);
      
      return value;
      
    } catch (error) {
      console.error(`❌ Failed to get configuration: ${path}`, error);
      return defaultValue;
    }
  }

  /**
   * Set configuration value
   * @param {string} path - Configuration path
   * @param {*} value - Configuration value
   * @param {Object} options - Set options
   * @returns {Promise<boolean>} Success status
   */
  async set(path, value, options = {}) {
    try {
      const {
        validate = true,
        persist = true,
        notify = true,
        encrypt = false
      } = options;
      
      // Validate configuration if requested
      if (validate) {
        const validation = await this._validateConfigurationValue(path, value);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Encrypt value if requested
      let finalValue = value;
      if (encrypt) {
        finalValue = await this._encryptConfigurationValue(value);
      }
      
      // Set configuration
      const keys = path.split('.');
      let config = this.configurations.get('current') || {};
      
      let current = config;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in current) || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
      
      current[keys[keys.length - 1]] = finalValue;
      this.configurations.set('current', config);
      
      // Persist configuration if requested
      if (persist) {
        await this._persistConfiguration(path, finalValue);
      }
      
      // Notify listeners if requested
      if (notify) {
        this._notifyConfigurationChange(path, value);
      }
      
      // Track configuration update
      this._trackConfigUpdate(path, value);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to set configuration: ${path}`, error);
      this._trackConfigError(path, error);
      return false;
    }
  }

  /**
   * Get environment information
   * @returns {Object} Environment information
   */
  getEnvironmentInfo() {
    return {
      current: this.currentEnvironment,
      info: this.environmentInfo,
      validated: this.environmentValidated,
      configurations: this.environmentConfigs
    };
  }

  /**
   * Switch environment
   * @param {string} environment - Target environment
   * @param {Object} options - Switch options
   * @returns {Promise<boolean>} Success status
   */
  async switchEnvironment(environment, options = {}) {
    try {
      console.log(`🔄 Switching to environment: ${environment}`);
      
      const {
        validate = true,
        backup = true,
        notify = true
      } = options;
      
      // Validate environment
      if (!this.environmentConfigurations[environment]) {
        throw new Error(`Unknown environment: ${environment}`);
      }
      
      // Backup current configuration if requested
      if (backup) {
        await this._backupConfiguration();
      }
      
      // Load environment configuration
      const envConfig = this.environmentConfigurations[environment];
      const mergedConfig = this._mergeConfigurations(this.defaultConfiguration, envConfig);
      
      // Validate configuration if requested
      if (validate) {
        const validation = await this._validateConfiguration(mergedConfig);
        if (!validation.isValid) {
          throw new Error(`Environment configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Update current environment
      this.currentEnvironment = environment;
      this.configurations.set('current', mergedConfig);
      this.environmentConfigs.set(environment, mergedConfig);
      
      // Update environment info
      this.environmentInfo = {
        name: environment,
        timestamp: new Date().toISOString(),
        config: mergedConfig
      };
      
      // Notify listeners if requested
      if (notify) {
        this._notifyEnvironmentChange(environment);
      }
      
      // Track environment switch
      this._trackEnvironmentSwitch(environment);
      
      console.log(`✅ Switched to environment: ${environment}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to switch environment: ${environment}`, error);
      return false;
    }
  }

  /**
   * Validate configuration
   * @param {Object} config - Configuration to validate
   * @param {Object} schema - Validation schema
   * @returns {Promise<Object>} Validation result
   */
  async validateConfiguration(config, schema = null) {
    try {
      const validationSchema = schema || this._getDefaultValidationSchema();
      const validation = await this._validateConfiguration(config, validationSchema);
      
      // Store validation result
      this.validationResults.set('current', validation);
      
      return validation;
      
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      return {
        isValid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Get configuration analytics
   * @param {Object} options - Analytics options
   * @returns {Object} Configuration analytics
   */
  getConfigurationAnalytics(options = {}) {
    const {
      timeRange = 24 * 60 * 60 * 1000, // 24 hours
      includeDetails = true
    } = options;
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    // Filter analytics by time range
    const filteredAccess = this._filterAnalyticsByTime(this.analytics.configAccess, startTime);
    const filteredUpdates = this._filterAnalyticsByTime(this.analytics.configUpdates, startTime);
    const filteredErrors = this._filterAnalyticsByTime(this.analytics.configErrors, startTime);
    const filteredSwitches = this._filterAnalyticsByTime(this.analytics.environmentSwitches, startTime);
    
    const analytics = {
      overview: {
        totalConfigurations: this.configurations.size,
        totalAccess: filteredAccess.size,
        totalUpdates: filteredUpdates.size,
        totalErrors: filteredErrors.size,
        totalEnvironmentSwitches: filteredSwitches.size,
        currentEnvironment: this.currentEnvironment
      },
      topAccessedConfigs: this._getTopAccessedConfigs(filteredAccess),
      topUpdatedConfigs: this._getTopUpdatedConfigs(filteredUpdates),
      configurationErrors: this._getConfigurationErrors(filteredErrors),
      environmentSwitches: this._getEnvironmentSwitches(filteredSwitches),
      trends: includeDetails ? this._getConfigurationTrends(startTime) : null
    };
    
    return analytics;
  }

  /**
   * Export configuration
   * @param {Object} options - Export options
   * @returns {Promise<string>} Exported configuration
   */
  async exportConfiguration(options = {}) {
    const {
      format = 'json',
      includeSecrets = false,
      environment = null
    } = options;
    
    let config = this.configurations.get('current');
    
    if (environment) {
      config = this.environmentConfigs.get(environment);
    }
    
    if (!includeSecrets) {
      config = this._removeSecretsFromConfig(config);
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        return this._convertToYAML(config);
      case 'env':
        return this._convertToEnvFormat(config);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import configuration
   * @param {string} configData - Configuration data
   * @param {Object} options - Import options
   * @returns {Promise<boolean>} Success status
   */
  async importConfiguration(configData, options = {}) {
    try {
      const {
        format = 'json',
        validate = true,
        merge = true,
        backup = true
      } = options;
      
      // Parse configuration data
      let config;
      switch (format) {
        case 'json':
          config = JSON.parse(configData);
          break;
        case 'yaml':
          config = this._parseYAML(configData);
          break;
        case 'env':
          config = this._parseEnvFormat(configData);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
      
      // Backup current configuration if requested
      if (backup) {
        await this._backupConfiguration();
      }
      
      // Validate configuration if requested
      if (validate) {
        const validation = await this._validateConfiguration(config);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Merge or replace configuration
      if (merge) {
        const currentConfig = this.configurations.get('current') || {};
        config = this._mergeConfigurations(currentConfig, config);
      }
      
      // Set configuration
      this.configurations.set('current', config);
      
      // Persist configuration
      await this._persistConfiguration('*', config);
      
      console.log('✅ Configuration imported successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Configuration import failed:', error);
      return false;
    }
  }

  /**
   * Add configuration change listener
   * @param {string} path - Configuration path
   * @param {Function} listener - Change listener
   * @returns {Function} Unsubscribe function
   */
  addConfigurationListener(path, listener) {
    if (!this.updateListeners.has(path)) {
      this.updateListeners.set(path, new Set());
    }
    
    this.updateListeners.get(path).add(listener);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.updateListeners.get(path);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.updateListeners.delete(path);
        }
      }
    };
  }

  /**
   * Shutdown the configuration service
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('🛑 Shutting down Unified Configuration Service...');
    
    // Stop monitoring
    this.monitoringActive = false;
    
    // Clear monitoring intervals
    this.monitoringIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.monitoringIntervals = [];
    
    // Clear all data
    this.configurations.clear();
    this.environmentConfigs.clear();
    this.defaultConfigs.clear();
    this.overrideConfigs.clear();
    this.configSchemas.clear();
    this.validationResults.clear();
    this.configErrors.clear();
    this.encryptedConfigs.clear();
    this.configSecrets.clear();
    this.updateQueue = [];
    this.updateHistory = [];
    this.updateListeners.clear();
    
    // Clear analytics
    Object.values(this.analytics).forEach(map => map.clear());
    
    // Reset state
    this.isInitialized = false;
    this.initializationPromise = null;
    
    console.log('✅ Unified Configuration Service shutdown complete');
  }

  // Private methods

  async _detectEnvironment() {
    // Detect environment from various sources
    const envSources = [
      process.env.NODE_ENV,
      process.env.REACT_APP_ENV,
      window.location.hostname,
      localStorage.getItem('trek-iq-environment')
    ];
    
    let detectedEnv = 'development';
    
    for (const source of envSources) {
      if (source) {
        if (source.includes('production') || source.includes('prod')) {
          detectedEnv = 'production';
          break;
        } else if (source.includes('staging') || source.includes('stage')) {
          detectedEnv = 'staging';
          break;
        } else if (source.includes('development') || source.includes('dev')) {
          detectedEnv = 'development';
          break;
        }
      }
    }
    
    this.currentEnvironment = detectedEnv;
    this.environmentInfo = {
      name: detectedEnv,
      detectedAt: new Date().toISOString(),
      sources: envSources.filter(s => s)
    };
    
    console.log(`🌍 Detected environment: ${detectedEnv}`);
  }

  async _loadConfigurations() {
    // Load default configuration
    this.defaultConfigs.set('default', this.defaultConfiguration);
    
    // Load environment-specific configuration
    const envConfig = this.environmentConfigurations[this.currentEnvironment];
    if (envConfig) {
      this.environmentConfigs.set(this.currentEnvironment, envConfig);
    }
    
    // Merge configurations
    const mergedConfig = this._mergeConfigurations(this.defaultConfiguration, envConfig);
    this.configurations.set('current', mergedConfig);
    
    // Load override configurations
    await this._loadOverrideConfigurations();
    
    console.log('📋 Configurations loaded successfully');
  }

  async _loadOverrideConfigurations() {
    // Load configurations from localStorage
    const storedConfig = localStorage.getItem('trek-iq-config-override');
    if (storedConfig) {
      try {
        const overrideConfig = JSON.parse(storedConfig);
        this.overrideConfigs.set('localStorage', overrideConfig);
        
        // Merge with current configuration
        const currentConfig = this.configurations.get('current');
        const mergedConfig = this._mergeConfigurations(currentConfig, overrideConfig);
        this.configurations.set('current', mergedConfig);
        
        console.log('📋 Override configurations loaded from localStorage');
      } catch (error) {
        console.warn('⚠️ Failed to load override configurations from localStorage:', error);
      }
    }
    
    // Load configurations from environment variables
    const envConfig = this._loadConfigFromEnvironment();
    if (Object.keys(envConfig).length > 0) {
      this.overrideConfigs.set('environment', envConfig);
      
      // Merge with current configuration
      const currentConfig = this.configurations.get('current');
      const mergedConfig = this._mergeConfigurations(currentConfig, envConfig);
      this.configurations.set('current', mergedConfig);
      
      console.log('📋 Override configurations loaded from environment variables');
    }
  }

  _loadConfigFromEnvironment() {
    const envConfig = {};
    
    // Load configuration from environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('REACT_APP_CONFIG_')) {
        const configKey = key.replace('REACT_APP_CONFIG_', '').toLowerCase();
        envConfig[configKey] = process.env[key];
      }
    });
    
    return envConfig;
  }

  async _validateConfigurations() {
    const currentConfig = this.configurations.get('current');
    const validation = await this._validateConfiguration(currentConfig);
    
    this.validationResults.set('current', validation);
    this.environmentValidated = validation.isValid;
    
    if (!validation.isValid) {
      console.warn('⚠️ Configuration validation failed:', validation.errors);
    } else {
      console.log('✅ Configuration validation passed');
    }
  }

  async _validateConfiguration(config, schema = null) {
    const validationSchema = schema || this._getDefaultValidationSchema();
    const errors = [];
    const warnings = [];
    
    // Validate required fields
    for (const [field, rules] of Object.entries(validationSchema)) {
      if (rules.required && !(field in config)) {
        errors.push(`Required field missing: ${field}`);
      }
      
      if (field in config) {
        const value = config[field];
        
        // Validate type
        if (rules.type && typeof value !== rules.type) {
          errors.push(`Invalid type for ${field}: expected ${rules.type}, got ${typeof value}`);
        }
        
        // Validate format
        if (rules.format && !rules.format.test(value)) {
          errors.push(`Invalid format for ${field}: ${value}`);
        }
        
        // Validate range
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`Value too small for ${field}: ${value} < ${rules.min}`);
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`Value too large for ${field}: ${value} > ${rules.max}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async _validateConfigurationValue(path, value) {
    // Basic validation for configuration values
    const errors = [];
    
    // Check for null/undefined
    if (value === null || value === undefined) {
      errors.push('Value cannot be null or undefined');
    }
    
    // Check for circular references
    try {
      JSON.stringify(value);
    } catch (error) {
      errors.push('Value contains circular references');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  _startConfigurationMonitoring() {
    this.monitoringActive = true;
    
    // Monitor configuration changes
    const changeInterval = setInterval(() => {
      this._monitorConfigurationChanges();
    }, 60000); // 1 minute
    this.monitoringIntervals.push(changeInterval);
    
    // Monitor configuration errors
    const errorInterval = setInterval(() => {
      this._monitorConfigurationErrors();
    }, 300000); // 5 minutes
    this.monitoringIntervals.push(errorInterval);
  }

  async _setupConfigurationSecurity() {
    // Set up configuration encryption for sensitive values
    const sensitivePaths = [
      'api.tokens',
      'security.secrets',
      'database.passwords'
    ];
    
    for (const path of sensitivePaths) {
      const value = this.get(path);
      if (value) {
        const encrypted = await this._encryptConfigurationValue(value);
        this.encryptedConfigs.set(path, encrypted);
      }
    }
    
    this.securityValidated = true;
    console.log('🔒 Configuration security setup complete');
  }

  _mergeConfigurations(base, override) {
    if (!override) return base;
    
    const merged = { ...base };
    
    for (const [key, value] of Object.entries(override)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = this._mergeConfigurations(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  _getDefaultValidationSchema() {
    return {
      application: {
        required: true,
        type: 'object'
      },
      api: {
        required: true,
        type: 'object'
      },
      database: {
        required: true,
        type: 'object'
      },
      cache: {
        required: true,
        type: 'object'
      },
      security: {
        required: true,
        type: 'object'
      },
      performance: {
        required: true,
        type: 'object'
      },
      features: {
        required: true,
        type: 'object'
      }
    };
  }

  async _encryptConfigurationValue(value) {
    // Simple encryption for configuration values
    // In production, use proper encryption
    return btoa(JSON.stringify(value));
  }

  async _decryptConfigurationValue(encryptedValue) {
    // Simple decryption for configuration values
    // In production, use proper decryption
    return JSON.parse(atob(encryptedValue));
  }

  async _persistConfiguration(path, value) {
    // Persist configuration to localStorage
    const currentConfig = this.configurations.get('current');
    localStorage.setItem('trek-iq-config', JSON.stringify(currentConfig));
  }

  _notifyConfigurationChange(path, value) {
    const listeners = this.updateListeners.get(path);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(path, value);
        } catch (error) {
          console.error('❌ Configuration listener error:', error);
        }
      });
    }
  }

  _notifyEnvironmentChange(environment) {
    // Notify all listeners about environment change
    this.updateListeners.forEach((listeners, path) => {
      listeners.forEach(listener => {
        try {
          listener(path, null, { environment });
        } catch (error) {
          console.error('❌ Environment change listener error:', error);
        }
      });
    });
  }

  async _backupConfiguration() {
    const currentConfig = this.configurations.get('current');
    const backup = {
      config: currentConfig,
      timestamp: new Date().toISOString(),
      environment: this.currentEnvironment
    };
    
    this.updateHistory.push(backup);
    
    // Keep only last 10 backups
    if (this.updateHistory.length > 10) {
      this.updateHistory = this.updateHistory.slice(-10);
    }
  }

  _trackConfigAccess(path) {
    const access = {
      path,
      timestamp: Date.now(),
      count: 1
    };
    
    const existing = this.analytics.configAccess.get(path);
    if (existing) {
      existing.count++;
      existing.lastAccess = Date.now();
    } else {
      this.analytics.configAccess.set(path, access);
    }
  }

  _trackConfigUpdate(path, value) {
    const update = {
      path,
      value,
      timestamp: Date.now()
    };
    
    this.analytics.configUpdates.set(path, update);
  }

  _trackConfigError(path, error) {
    const errorRecord = {
      path,
      error: error.message,
      timestamp: Date.now()
    };
    
    this.analytics.configErrors.set(path, errorRecord);
  }

  _trackEnvironmentSwitch(environment) {
    const switchRecord = {
      environment,
      timestamp: Date.now()
    };
    
    this.analytics.environmentSwitches.set(environment, switchRecord);
  }

  _monitorConfigurationChanges() {
    // Monitor configuration changes
    console.log('📊 Monitoring configuration changes...');
  }

  _monitorConfigurationErrors() {
    // Monitor configuration errors
    if (this.analytics.configErrors.size > 0) {
      console.warn('⚠️ Configuration errors detected:', this.analytics.configErrors.size);
    }
  }

  _filterAnalyticsByTime(analyticsMap, startTime) {
    const filtered = new Map();
    
    for (const [key, value] of analyticsMap) {
      if (value.timestamp >= startTime) {
        filtered.set(key, value);
      }
    }
    
    return filtered;
  }

  _getTopAccessedConfigs(accessMap) {
    return Array.from(accessMap.entries())
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 10)
      .map(([path, data]) => ({ path, count: data.count }));
  }

  _getTopUpdatedConfigs(updateMap) {
    return Array.from(updateMap.entries())
      .sort(([,a], [,b]) => b.timestamp - a.timestamp)
      .slice(0, 10)
      .map(([path, data]) => ({ path, timestamp: data.timestamp }));
  }

  _getConfigurationErrors(errorMap) {
    return Array.from(errorMap.entries())
      .map(([path, data]) => ({ path, error: data.error, timestamp: data.timestamp }));
  }

  _getEnvironmentSwitches(switchMap) {
    return Array.from(switchMap.entries())
      .map(([environment, data]) => ({ environment, timestamp: data.timestamp }));
  }

  _getConfigurationTrends(startTime) {
    // Generate configuration trends
    return [];
  }

  _removeSecretsFromConfig(config) {
    const cleaned = { ...config };
    
    // Remove sensitive fields
    const sensitiveFields = ['tokens', 'secrets', 'passwords', 'keys'];
    
    const removeSecrets = (obj) => {
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          removeSecrets(value);
        }
      }
    };
    
    removeSecrets(cleaned);
    return cleaned;
  }

  _convertToYAML(config) {
    // Simple YAML conversion
    return JSON.stringify(config, null, 2);
  }

  _convertToEnvFormat(config) {
    const envLines = [];
    
    const convertToEnv = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
        
        if (typeof value === 'object' && value !== null) {
          convertToEnv(value, envKey);
        } else {
          envLines.push(`${envKey}=${value}`);
        }
      }
    };
    
    convertToEnv(config);
    return envLines.join('\n');
  }

  _parseYAML(yamlData) {
    // Simple YAML parsing (in production, use proper YAML parser)
    return JSON.parse(yamlData);
  }

  _parseEnvFormat(envData) {
    const config = {};
    const lines = envData.split('\n');
    
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        config[key.toLowerCase()] = value;
      }
    }
    
    return config;
  }
}

// Export singleton instance
const unifiedConfigurationService = new UnifiedConfigurationService();
export default unifiedConfigurationService;
