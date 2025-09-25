/**
 * Data Validation Service
 * 
 * Provides comprehensive data validation, consistency checks, and data quality
 * management for all datasets in the Trek-IQ application.
 * 
 * Features:
 * - Schema validation for all data types
 * - Data consistency checks across datasets
 * - Data quality metrics and reporting
 * - Automatic data correction and normalization
 * - Data integrity monitoring
 */

import unifiedDataManager from './unifiedDataManager.js';

class DataValidationService {
  constructor() {
    this.isInitialized = false;
    this.validationRules = new Map();
    this.qualityMetrics = new Map();
    this.consistencyChecks = new Map();
    
    // Validation configuration
    this.config = {
      strictMode: false,
      autoCorrect: true,
      reportThreshold: 0.95, // Report if quality drops below 95%
      maxErrors: 100,
      validationTimeout: 30000 // 30 seconds
    };
    
    // Data schemas
    this.schemas = {
      // Geospatial data schemas
      activeTravelways: {
        type: 'FeatureCollection',
        required: ['type', 'features'],
        properties: {
          type: { enum: ['FeatureCollection'] },
          features: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'geometry', 'properties'],
              properties: {
                type: { enum: ['Feature'] },
                geometry: {
                  type: 'object',
                  required: ['type', 'coordinates'],
                  properties: {
                    type: { enum: ['LineString', 'MultiLineString'] },
                    coordinates: {
                      type: 'array',
                      minItems: 2
                    }
                  }
                },
                properties: {
                  type: 'object',
                  required: ['id', 'name'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    accessibility: { type: 'string', enum: ['accessible', 'partially_accessible', 'not_accessible'] },
                    surface: { type: 'string' },
                    width: { type: 'number', minimum: 0 },
                    length: { type: 'number', minimum: 0 }
                  }
                }
              }
            }
          }
        }
      },
      
      steps: {
        type: 'FeatureCollection',
        required: ['type', 'features'],
        properties: {
          type: { enum: ['FeatureCollection'] },
          features: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'geometry', 'properties'],
              properties: {
                type: { enum: ['Feature'] },
                geometry: {
                  type: 'object',
                  required: ['type', 'coordinates'],
                  properties: {
                    type: { enum: ['Point'] },
                    coordinates: {
                      type: 'array',
                      items: { type: 'number' },
                      minItems: 2,
                      maxItems: 3
                    }
                  }
                },
                properties: {
                  type: 'object',
                  required: ['id', 'height'],
                  properties: {
                    id: { type: 'string' },
                    height: { type: 'number', minimum: 0, maximum: 50 },
                    width: { type: 'number', minimum: 0 },
                    material: { type: 'string' },
                    condition: { type: 'string', enum: ['good', 'fair', 'poor'] }
                  }
                }
              }
            }
          }
        }
      },
      
      sidewalkClosures: {
        type: 'FeatureCollection',
        required: ['type', 'features'],
        properties: {
          type: { enum: ['FeatureCollection'] },
          features: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'geometry', 'properties'],
              properties: {
                type: { enum: ['Feature'] },
                geometry: {
                  type: 'object',
                  required: ['type', 'coordinates'],
                  properties: {
                    type: { enum: ['Polygon', 'MultiPolygon'] },
                    coordinates: { type: 'array' }
                  }
                },
                properties: {
                  type: 'object',
                  required: ['id', 'startDate', 'endDate', 'reason'],
                  properties: {
                    id: { type: 'string' },
                    startDate: { type: 'string', format: 'date' },
                    endDate: { type: 'string', format: 'date' },
                    reason: { type: 'string' },
                    severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                    alternativeRoute: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },
      
      // User data schemas
      userPreferences: {
        type: 'object',
        required: ['accessibility', 'routing', 'display'],
        properties: {
          accessibility: {
            type: 'object',
            required: ['highContrast', 'screenReader', 'reducedMotion'],
            properties: {
              highContrast: { type: 'boolean' },
              screenReader: { type: 'boolean' },
              reducedMotion: { type: 'boolean' },
              fontSize: { type: 'string', enum: ['small', 'medium', 'large'] }
            }
          },
          routing: {
            type: 'object',
            required: ['avoidStairs', 'preferAccessible', 'maxDistance'],
            properties: {
              avoidStairs: { type: 'boolean' },
              preferAccessible: { type: 'boolean' },
              maxDistance: { type: 'number', minimum: 100, maximum: 50000 },
              avoidHighways: { type: 'boolean' },
              avoidTolls: { type: 'boolean' }
            }
          },
          display: {
            type: 'object',
            required: ['theme', 'language', 'units'],
            properties: {
              theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
              language: { type: 'string', enum: ['en', 'fr'] },
              units: { type: 'string', enum: ['metric', 'imperial'] }
            }
          }
        }
      },
      
      searchHistory: {
        type: 'array',
        items: {
          type: 'object',
          required: ['query', 'timestamp', 'results'],
          properties: {
            query: { type: 'string', minLength: 1, maxLength: 100 },
            timestamp: { type: 'string', format: 'date-time' },
            results: { type: 'array' },
            location: {
              type: 'object',
              properties: {
                lat: { type: 'number', minimum: -90, maximum: 90 },
                lng: { type: 'number', minimum: -180, maximum: 180 }
              }
            }
          }
        }
      },
      
      savedRoutes: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'name', 'origin', 'destination', 'route', 'createdAt'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            origin: {
              type: 'object',
              required: ['name', 'coordinates'],
              properties: {
                name: { type: 'string' },
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 3
                }
              }
            },
            destination: {
              type: 'object',
              required: ['name', 'coordinates'],
              properties: {
                name: { type: 'string' },
                coordinates: {
                  type: 'array',
                  items: { type: 'number' },
                  minItems: 2,
                  maxItems: 3
                }
              }
            },
            route: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
            lastUsed: { type: 'string', format: 'date-time' },
            useCount: { type: 'number', minimum: 0 }
          }
        }
      }
    };
    
    // Consistency rules
    this.consistencyRules = {
      // Geographic consistency
      geographic: {
        coordinateBounds: {
          lat: { min: 44.0, max: 45.0 }, // Halifax area
          lng: { min: -64.0, max: -63.0 }
        },
        maxDistance: 50000, // 50km max distance between points
        minDistance: 1 // 1m min distance between points
      },
      
      // Temporal consistency
      temporal: {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        minAge: 0,
        futureLimit: 30 * 24 * 60 * 60 * 1000 // 30 days in future
      },
      
      // Data relationship consistency
      relationships: {
        // Steps should be on or near travelways
        stepsOnTravelways: {
          maxDistance: 10, // 10m
          required: false
        },
        
        // Closures should not overlap with each other
        noOverlappingClosures: {
          required: true
        },
        
        // Transit stops should be accessible
        transitAccessibility: {
          required: true,
          minAccessibilityScore: 0.7
        }
      }
    };
  }

  /**
   * Initialize the data validation service
   * @param {Object} options - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Data Validation Service...');
    
    // Update configuration
    this.config = { ...this.config, ...options };
    
    // Initialize validation rules
    this._initializeValidationRules();
    
    // Initialize consistency checks
    this._initializeConsistencyChecks();
    
    this.isInitialized = true;
    console.log('✅ Data Validation Service initialized');
  }

  /**
   * Validate dataset against schema
   * @param {string} datasetName - Dataset name
   * @param {Object} data - Data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateDataset(datasetName, data, options = {}) {
    const startTime = performance.now();
    
    try {
      const schema = this.schemas[datasetName];
      if (!schema) {
        return {
          isValid: false,
          errors: [`No schema found for dataset: ${datasetName}`],
          warnings: [],
          quality: 0
        };
      }
      
      const result = this._validateAgainstSchema(data, schema, datasetName);
      const validationTime = performance.now() - startTime;
      
      // Update quality metrics
      this._updateQualityMetrics(datasetName, result, validationTime);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Validation failed for ${datasetName}:`, error);
      return {
        isValid: false,
        errors: [error.message],
        warnings: [],
        quality: 0
      };
    }
  }

  /**
   * Check data consistency across datasets
   * @param {Object} datasets - Map of dataset names to data
   * @param {Object} options - Consistency check options
   * @returns {Object} Consistency check result
   */
  checkConsistency(datasets, options = {}) {
    const startTime = performance.now();
    
    try {
      const result = {
        isConsistent: true,
        errors: [],
        warnings: [],
        quality: 1.0,
        checks: {}
      };
      
      // Geographic consistency
      result.checks.geographic = this._checkGeographicConsistency(datasets);
      
      // Temporal consistency
      result.checks.temporal = this._checkTemporalConsistency(datasets);
      
      // Relationship consistency
      result.checks.relationships = this._checkRelationshipConsistency(datasets);
      
      // Aggregate results
      const allChecks = Object.values(result.checks);
      result.isConsistent = allChecks.every(check => check.isConsistent);
      result.errors = allChecks.flatMap(check => check.errors);
      result.warnings = allChecks.flatMap(check => check.warnings);
      result.quality = allChecks.reduce((sum, check) => sum + check.quality, 0) / allChecks.length;
      
      const checkTime = performance.now() - startTime;
      console.log(`✅ Consistency check completed in ${checkTime.toFixed(2)}ms`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Consistency check failed:', error);
      return {
        isConsistent: false,
        errors: [error.message],
        warnings: [],
        quality: 0
      };
    }
  }

  /**
   * Get data quality report
   * @param {string} datasetName - Dataset name (optional)
   * @returns {Object} Quality report
   */
  getQualityReport(datasetName = null) {
    if (datasetName) {
      return this.qualityMetrics.get(datasetName) || {
        dataset: datasetName,
        quality: 0,
        lastValidated: null,
        totalValidations: 0,
        averageValidationTime: 0,
        commonErrors: []
      };
    }
    
    // Return overall quality report
    const allMetrics = Array.from(this.qualityMetrics.values());
    return {
      overall: {
        quality: allMetrics.reduce((sum, m) => sum + m.quality, 0) / Math.max(allMetrics.length, 1),
        totalDatasets: allMetrics.length,
        totalValidations: allMetrics.reduce((sum, m) => sum + m.totalValidations, 0),
        averageValidationTime: allMetrics.reduce((sum, m) => sum + m.averageValidationTime, 0) / Math.max(allMetrics.length, 1)
      },
      datasets: allMetrics
    };
  }

  /**
   * Auto-correct data issues
   * @param {string} datasetName - Dataset name
   * @param {Object} data - Data to correct
   * @param {Object} options - Correction options
   * @returns {Object} Corrected data
   */
  autoCorrect(datasetName, data, options = {}) {
    if (!this.config.autoCorrect) {
      return data;
    }
    
    try {
      const correctedData = { ...data };
      
      // Apply dataset-specific corrections
      switch (datasetName) {
        case 'activeTravelways':
          correctedData.features = this._correctTravelways(correctedData.features);
          break;
        case 'steps':
          correctedData.features = this._correctSteps(correctedData.features);
          break;
        case 'sidewalkClosures':
          correctedData.features = this._correctClosures(correctedData.features);
          break;
        case 'userPreferences':
          correctedData = this._correctUserPreferences(correctedData);
          break;
        case 'searchHistory':
          correctedData = this._correctSearchHistory(correctedData);
          break;
        case 'savedRoutes':
          correctedData = this._correctSavedRoutes(correctedData);
          break;
      }
      
      console.log(`✅ Auto-corrected data for ${datasetName}`);
      return correctedData;
      
    } catch (error) {
      console.error(`❌ Auto-correction failed for ${datasetName}:`, error);
      return data;
    }
  }

  // Private methods

  _initializeValidationRules() {
    // Initialize validation rules for each dataset
    Object.keys(this.schemas).forEach(datasetName => {
      this.validationRules.set(datasetName, {
        schema: this.schemas[datasetName],
        customRules: this._getCustomRules(datasetName)
      });
    });
  }

  _initializeConsistencyChecks() {
    // Initialize consistency checks
    this.consistencyChecks.set('geographic', this._checkGeographicConsistency);
    this.consistencyChecks.set('temporal', this._checkTemporalConsistency);
    this.consistencyChecks.set('relationships', this._checkRelationshipConsistency);
  }

  _validateAgainstSchema(data, schema, datasetName) {
    const errors = [];
    const warnings = [];
    
    // Basic type validation
    if (schema.type && data.type !== schema.type) {
      errors.push(`Expected type '${schema.type}', got '${data.type}'`);
    }
    
    // Required fields validation
    if (schema.required) {
      schema.required.forEach(field => {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      });
    }
    
    // Properties validation
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([field, rules]) => {
        if (field in data) {
          const fieldErrors = this._validateField(data[field], rules, field);
          errors.push(...fieldErrors);
        }
      });
    }
    
    // Custom validation rules
    const customRules = this._getCustomRules(datasetName);
    customRules.forEach(rule => {
      const ruleErrors = rule(data);
      errors.push(...ruleErrors);
    });
    
    const quality = Math.max(0, 1 - (errors.length / 10)); // Simple quality calculation
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      quality
    };
  }

  _validateField(value, rules, fieldName) {
    const errors = [];
    
    // Type validation
    if (rules.type) {
      const expectedType = rules.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      
      if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`${fieldName} must be an array`);
      } else if (expectedType !== 'array' && actualType !== expectedType) {
        errors.push(`${fieldName} must be of type ${expectedType}, got ${actualType}`);
      }
    }
    
    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }
    
    // String validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must be at most ${rules.maxLength} characters`);
    }
    
    // Number validation
    if (rules.minimum !== undefined && value < rules.minimum) {
      errors.push(`${fieldName} must be at least ${rules.minimum}`);
    }
    
    if (rules.maximum !== undefined && value > rules.maximum) {
      errors.push(`${fieldName} must be at most ${rules.maximum}`);
    }
    
    // Array validation
    if (rules.minItems && value.length < rules.minItems) {
      errors.push(`${fieldName} must have at least ${rules.minItems} items`);
    }
    
    if (rules.maxItems && value.length > rules.maxItems) {
      errors.push(`${fieldName} must have at most ${rules.maxItems} items`);
    }
    
    return errors;
  }

  _getCustomRules(datasetName) {
    const customRules = {
      activeTravelways: [
        (data) => {
          const errors = [];
          if (data.features) {
            data.features.forEach((feature, i) => {
              if (feature.geometry && feature.geometry.coordinates) {
                const coords = feature.geometry.coordinates;
                if (coords.length < 2) {
                  errors.push(`Feature ${i}: LineString must have at least 2 coordinates`);
                }
              }
            });
          }
          return errors;
        }
      ],
      
      steps: [
        (data) => {
          const errors = [];
          if (data.features) {
            data.features.forEach((feature, i) => {
              if (feature.properties && feature.properties.height > 20) {
                errors.push(`Feature ${i}: Step height ${feature.properties.height}cm seems too high`);
              }
            });
          }
          return errors;
        }
      ],
      
      sidewalkClosures: [
        (data) => {
          const errors = [];
          if (data.features) {
            data.features.forEach((feature, i) => {
              if (feature.properties) {
                const startDate = new Date(feature.properties.startDate);
                const endDate = new Date(feature.properties.endDate);
                if (startDate >= endDate) {
                  errors.push(`Feature ${i}: Start date must be before end date`);
                }
              }
            });
          }
          return errors;
        }
      ]
    };
    
    return customRules[datasetName] || [];
  }

  _checkGeographicConsistency(datasets) {
    const result = {
      isConsistent: true,
      errors: [],
      warnings: [],
      quality: 1.0
    };
    
    const bounds = this.consistencyRules.geographic.coordinateBounds;
    
    // Check coordinate bounds
    Object.entries(datasets).forEach(([datasetName, data]) => {
      if (data.features) {
        data.features.forEach((feature, i) => {
          if (feature.geometry && feature.geometry.coordinates) {
            const coords = feature.geometry.coordinates;
            coords.forEach((coord, j) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                const [lng, lat] = coord;
                if (lat < bounds.lat.min || lat > bounds.lat.max) {
                  result.errors.push(`${datasetName} feature ${i} coordinate ${j}: Latitude ${lat} out of bounds`);
                  result.isConsistent = false;
                }
                if (lng < bounds.lng.min || lng > bounds.lng.max) {
                  result.errors.push(`${datasetName} feature ${i} coordinate ${j}: Longitude ${lng} out of bounds`);
                  result.isConsistent = false;
                }
              }
            });
          }
        });
      }
    });
    
    result.quality = Math.max(0, 1 - (result.errors.length / 100));
    return result;
  }

  _checkTemporalConsistency(datasets) {
    const result = {
      isConsistent: true,
      errors: [],
      warnings: [],
      quality: 1.0
    };
    
    const now = Date.now();
    const maxAge = this.consistencyRules.temporal.maxAge;
    const futureLimit = this.consistencyRules.temporal.futureLimit;
    
    // Check temporal consistency
    Object.entries(datasets).forEach(([datasetName, data]) => {
      if (data.features) {
        data.features.forEach((feature, i) => {
          if (feature.properties) {
            // Check for date fields
            ['startDate', 'endDate', 'createdAt', 'lastUsed'].forEach(dateField => {
              if (feature.properties[dateField]) {
                const date = new Date(feature.properties[dateField]);
                const age = now - date.getTime();
                
                if (age > maxAge) {
                  result.warnings.push(`${datasetName} feature ${i}: ${dateField} is very old`);
                }
                
                if (age < -futureLimit) {
                  result.errors.push(`${datasetName} feature ${i}: ${dateField} is too far in the future`);
                  result.isConsistent = false;
                }
              }
            });
          }
        });
      }
    });
    
    result.quality = Math.max(0, 1 - (result.errors.length / 50));
    return result;
  }

  _checkRelationshipConsistency(datasets) {
    const result = {
      isConsistent: true,
      errors: [],
      warnings: [],
      quality: 1.0
    };
    
    // Check relationships between datasets
    if (datasets.steps && datasets.activeTravelways) {
      // Check if steps are near travelways
      const maxDistance = this.consistencyRules.relationships.stepsOnTravelways.maxDistance;
      let orphanedSteps = 0;
      
      datasets.steps.features.forEach((step, i) => {
        if (step.geometry && step.geometry.coordinates) {
          const [stepLng, stepLat] = step.geometry.coordinates;
          let nearTravelway = false;
          
          datasets.activeTravelways.features.forEach(travelway => {
            if (travelway.geometry && travelway.geometry.coordinates) {
              const coords = travelway.geometry.coordinates;
              coords.forEach(coord => {
                if (Array.isArray(coord) && coord.length >= 2) {
                  const [lng, lat] = coord;
                  const distance = this._calculateDistance(stepLat, stepLng, lat, lng);
                  if (distance <= maxDistance) {
                    nearTravelway = true;
                  }
                }
              });
            }
          });
          
          if (!nearTravelway) {
            orphanedSteps++;
          }
        }
      });
      
      if (orphanedSteps > 0) {
        result.warnings.push(`${orphanedSteps} steps are not near any travelways`);
      }
    }
    
    result.quality = Math.max(0, 1 - (result.errors.length / 20));
    return result;
  }

  _calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  _updateQualityMetrics(datasetName, result, validationTime) {
    const existing = this.qualityMetrics.get(datasetName) || {
      dataset: datasetName,
      quality: 0,
      lastValidated: null,
      totalValidations: 0,
      averageValidationTime: 0,
      commonErrors: []
    };
    
    existing.quality = (existing.quality * existing.totalValidations + result.quality) / (existing.totalValidations + 1);
    existing.lastValidated = new Date().toISOString();
    existing.totalValidations++;
    existing.averageValidationTime = (existing.averageValidationTime * (existing.totalValidations - 1) + validationTime) / existing.totalValidations;
    
    // Track common errors
    result.errors.forEach(error => {
      const existingError = existing.commonErrors.find(e => e.error === error);
      if (existingError) {
        existingError.count++;
      } else {
        existing.commonErrors.push({ error, count: 1 });
      }
    });
    
    // Keep only top 10 common errors
    existing.commonErrors.sort((a, b) => b.count - a.count);
    existing.commonErrors = existing.commonErrors.slice(0, 10);
    
    this.qualityMetrics.set(datasetName, existing);
  }

  _correctTravelways(features) {
    return features.map(feature => {
      const corrected = { ...feature };
      
      // Ensure coordinates are valid
      if (corrected.geometry && corrected.geometry.coordinates) {
        corrected.geometry.coordinates = corrected.geometry.coordinates.filter(coord => 
          Array.isArray(coord) && coord.length >= 2 && 
          typeof coord[0] === 'number' && typeof coord[1] === 'number'
        );
      }
      
      // Ensure required properties
      if (corrected.properties) {
        corrected.properties.id = corrected.properties.id || `travelway_${Date.now()}_${Math.random()}`;
        corrected.properties.name = corrected.properties.name || 'Unnamed Travelway';
        corrected.properties.accessibility = corrected.properties.accessibility || 'unknown';
      }
      
      return corrected;
    });
  }

  _correctSteps(features) {
    return features.map(feature => {
      const corrected = { ...feature };
      
      // Ensure height is reasonable
      if (corrected.properties && corrected.properties.height > 50) {
        corrected.properties.height = 20; // Default reasonable height
      }
      
      // Ensure required properties
      if (corrected.properties) {
        corrected.properties.id = corrected.properties.id || `step_${Date.now()}_${Math.random()}`;
        corrected.properties.height = corrected.properties.height || 15;
        corrected.properties.condition = corrected.properties.condition || 'good';
      }
      
      return corrected;
    });
  }

  _correctClosures(features) {
    return features.map(feature => {
      const corrected = { ...feature };
      
      // Ensure dates are valid
      if (corrected.properties) {
        const startDate = new Date(corrected.properties.startDate);
        const endDate = new Date(corrected.properties.endDate);
        
        if (isNaN(startDate.getTime())) {
          corrected.properties.startDate = new Date().toISOString().split('T')[0];
        }
        
        if (isNaN(endDate.getTime()) || endDate <= startDate) {
          corrected.properties.endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        }
        
        corrected.properties.id = corrected.properties.id || `closure_${Date.now()}_${Math.random()}`;
        corrected.properties.reason = corrected.properties.reason || 'Maintenance';
        corrected.properties.severity = corrected.properties.severity || 'medium';
      }
      
      return corrected;
    });
  }

  _correctUserPreferences(data) {
    const corrected = { ...data };
    
    // Ensure all required sections exist
    corrected.accessibility = corrected.accessibility || {};
    corrected.routing = corrected.routing || {};
    corrected.display = corrected.display || {};
    
    // Set defaults for missing values
    corrected.accessibility.highContrast = corrected.accessibility.highContrast || false;
    corrected.accessibility.screenReader = corrected.accessibility.screenReader || false;
    corrected.accessibility.reducedMotion = corrected.accessibility.reducedMotion || false;
    
    corrected.routing.avoidStairs = corrected.routing.avoidStairs || false;
    corrected.routing.preferAccessible = corrected.routing.preferAccessible || true;
    corrected.routing.maxDistance = corrected.routing.maxDistance || 5000;
    
    corrected.display.theme = corrected.display.theme || 'light';
    corrected.display.language = corrected.display.language || 'en';
    corrected.display.units = corrected.display.units || 'metric';
    
    return corrected;
  }

  _correctSearchHistory(data) {
    return data.filter(item => 
      item.query && 
      item.query.length > 0 && 
      item.query.length <= 100 &&
      item.timestamp &&
      !isNaN(new Date(item.timestamp).getTime())
    ).slice(0, 100); // Keep only last 100 searches
  }

  _correctSavedRoutes(data) {
    return data.map(route => {
      const corrected = { ...route };
      
      // Ensure required fields
      corrected.id = corrected.id || `route_${Date.now()}_${Math.random()}`;
      corrected.name = corrected.name || 'Unnamed Route';
      corrected.createdAt = corrected.createdAt || new Date().toISOString();
      corrected.useCount = corrected.useCount || 0;
      
      // Ensure coordinates are valid
      if (corrected.origin && corrected.origin.coordinates) {
        corrected.origin.coordinates = corrected.origin.coordinates.slice(0, 3);
      }
      if (corrected.destination && corrected.destination.coordinates) {
        corrected.destination.coordinates = corrected.destination.coordinates.slice(0, 3);
      }
      
      return corrected;
    });
  }
}

// Export singleton instance
const dataValidationService = new DataValidationService();
export default dataValidationService;
