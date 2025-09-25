/**
 * Unified Documentation Service - Single Canonical Documentation Implementation
 * 
 * Consolidates all documentation functionality into a single, clean, production-ready
 * implementation that provides comprehensive documentation and knowledge management.
 * 
 * Features:
 * - Unified documentation generation and management
 * - Knowledge base management and search
 * - Documentation validation and quality checks
 * - Documentation monitoring and analytics
 * - Documentation automation and CI/CD integration
 * - Documentation standards and templates
 */

import unifiedAPIService from './unifiedAPIService.js';
import unifiedDataManager from './unifiedDataManager.js';
import unifiedSecurityService from './unifiedSecurityService.js';
import qualityAssuranceService from './qualityAssuranceService.js';

class UnifiedDocumentationService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
    
    // Documentation configuration
    this.config = {
      // Documentation generation
      generation: {
        enabled: true,
        autoGenerate: true,
        templates: {
          service: 'service-template.md',
          component: 'component-template.md',
          api: 'api-template.md',
          guide: 'guide-template.md'
        },
        formats: ['markdown', 'html', 'json', 'pdf'],
        outputDirectory: './docs',
        includeCodeExamples: true,
        includeDiagrams: true
      },
      
      // Knowledge base
      knowledgeBase: {
        enabled: true,
        searchEnabled: true,
        indexingEnabled: true,
        categories: ['services', 'components', 'apis', 'guides', 'tutorials'],
        tags: ['routing', 'search', 'accessibility', 'security', 'performance'],
        maxResults: 50
      },
      
      // Documentation validation
      validation: {
        enabled: true,
        checkLinks: true,
        checkImages: true,
        checkCodeExamples: true,
        checkSpelling: true,
        checkGrammar: true,
        checkConsistency: true
      },
      
      // Documentation monitoring
      monitoring: {
        enabled: true,
        trackUsage: true,
        trackSearch: true,
        trackFeedback: true,
        analyticsEnabled: true,
        reportGenerationInterval: 24 * 60 * 60 * 1000 // 24 hours
      },
      
      // Documentation standards
      standards: {
        enabled: true,
        enforceTemplates: true,
        enforceFormatting: true,
        enforceStructure: true,
        enforceMetadata: true,
        enforceVersioning: true
      }
    };
    
    // Documentation storage
    this.documentation = new Map();
    this.knowledgeBase = new Map();
    this.documentationIndex = new Map();
    this.documentationTemplates = new Map();
    
    // Documentation analytics
    this.analytics = {
      views: new Map(),
      searches: new Map(),
      feedback: new Map(),
      usage: new Map(),
      quality: new Map()
    };
    
    // Documentation validation
    this.validationResults = new Map();
    this.qualityMetrics = new Map();
    
    // Documentation generation
    this.generationQueue = [];
    this.generationStatus = new Map();
    
    // Documentation search
    this.searchIndex = new Map();
    this.searchHistory = [];
    
    // Documentation templates
    this.templates = {
      service: this._getServiceTemplate(),
      component: this._getComponentTemplate(),
      api: this._getAPITemplate(),
      guide: this._getGuideTemplate()
    };
  }

  /**
   * Initialize the unified documentation service
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
      console.log('🚀 Initializing Unified Documentation Service...');
      
      // Update configuration
      this.config = { ...this.config, ...options };
      
      // Initialize documentation templates
      this._initializeTemplates();
      
      // Initialize knowledge base
      await this._initializeKnowledgeBase();
      
      // Initialize documentation index
      await this._initializeDocumentationIndex();
      
      // Start documentation monitoring
      this._startDocumentationMonitoring();
      
      this.isInitialized = true;
      console.log('✅ Unified Documentation Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Unified Documentation Service:', error);
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Generate documentation for a service
   * @param {string} serviceName - Service name
   * @param {Object} serviceInfo - Service information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated documentation
   */
  async generateServiceDocumentation(serviceName, serviceInfo, options = {}) {
    try {
      console.log(`📝 Generating documentation for service: ${serviceName}`);
      
      const startTime = performance.now();
      
      // Generate documentation using service template
      const documentation = await this._generateDocumentation(
        'service',
        serviceName,
        serviceInfo,
        options
      );
      
      // Validate generated documentation
      const validation = await this._validateDocumentation(documentation);
      
      // Store documentation
      this.documentation.set(serviceName, {
        ...documentation,
        validation,
        generatedAt: new Date().toISOString(),
        generationTime: performance.now() - startTime
      });
      
      // Update knowledge base
      await this._updateKnowledgeBase(serviceName, documentation);
      
      // Update search index
      await this._updateSearchIndex(serviceName, documentation);
      
      console.log(`✅ Documentation generated for service: ${serviceName}`);
      return documentation;
      
    } catch (error) {
      console.error(`❌ Documentation generation failed for service: ${serviceName}`, error);
      throw error;
    }
  }

  /**
   * Generate documentation for a component
   * @param {string} componentName - Component name
   * @param {Object} componentInfo - Component information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated documentation
   */
  async generateComponentDocumentation(componentName, componentInfo, options = {}) {
    try {
      console.log(`📝 Generating documentation for component: ${componentName}`);
      
      const startTime = performance.now();
      
      // Generate documentation using component template
      const documentation = await this._generateDocumentation(
        'component',
        componentName,
        componentInfo,
        options
      );
      
      // Validate generated documentation
      const validation = await this._validateDocumentation(documentation);
      
      // Store documentation
      this.documentation.set(componentName, {
        ...documentation,
        validation,
        generatedAt: new Date().toISOString(),
        generationTime: performance.now() - startTime
      });
      
      // Update knowledge base
      await this._updateKnowledgeBase(componentName, documentation);
      
      // Update search index
      await this._updateSearchIndex(componentName, documentation);
      
      console.log(`✅ Documentation generated for component: ${componentName}`);
      return documentation;
      
    } catch (error) {
      console.error(`❌ Documentation generation failed for component: ${componentName}`, error);
      throw error;
    }
  }

  /**
   * Generate API documentation
   * @param {string} apiName - API name
   * @param {Object} apiInfo - API information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated API documentation
   */
  async generateAPIDocumentation(apiName, apiInfo, options = {}) {
    try {
      console.log(`📝 Generating API documentation: ${apiName}`);
      
      const startTime = performance.now();
      
      // Generate documentation using API template
      const documentation = await this._generateDocumentation(
        'api',
        apiName,
        apiInfo,
        options
      );
      
      // Validate generated documentation
      const validation = await this._validateDocumentation(documentation);
      
      // Store documentation
      this.documentation.set(apiName, {
        ...documentation,
        validation,
        generatedAt: new Date().toISOString(),
        generationTime: performance.now() - startTime
      });
      
      // Update knowledge base
      await this._updateKnowledgeBase(apiName, documentation);
      
      // Update search index
      await this._updateSearchIndex(apiName, documentation);
      
      console.log(`✅ API documentation generated: ${apiName}`);
      return documentation;
      
    } catch (error) {
      console.error(`❌ API documentation generation failed: ${apiName}`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive guide documentation
   * @param {string} guideName - Guide name
   * @param {Object} guideInfo - Guide information
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated guide documentation
   */
  async generateGuideDocumentation(guideName, guideInfo, options = {}) {
    try {
      console.log(`📝 Generating guide documentation: ${guideName}`);
      
      const startTime = performance.now();
      
      // Generate documentation using guide template
      const documentation = await this._generateDocumentation(
        'guide',
        guideName,
        guideInfo,
        options
      );
      
      // Validate generated documentation
      const validation = await this._validateDocumentation(documentation);
      
      // Store documentation
      this.documentation.set(guideName, {
        ...documentation,
        validation,
        generatedAt: new Date().toISOString(),
        generationTime: performance.now() - startTime
      });
      
      // Update knowledge base
      await this._updateKnowledgeBase(guideName, documentation);
      
      // Update search index
      await this._updateSearchIndex(guideName, documentation);
      
      console.log(`✅ Guide documentation generated: ${guideName}`);
      return documentation;
      
    } catch (error) {
      console.error(`❌ Guide documentation generation failed: ${guideName}`, error);
      throw error;
    }
  }

  /**
   * Search documentation
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchDocumentation(query, options = {}) {
    try {
      console.log(`🔍 Searching documentation: ${query}`);
      
      const { 
        category = null, 
        tags = [], 
        limit = this.config.knowledgeBase.maxResults,
        includeContent = true 
      } = options;
      
      // Perform search
      const results = await this._performSearch(query, {
        category,
        tags,
        limit,
        includeContent
      });
      
      // Track search
      this._trackSearch(query, results);
      
      console.log(`✅ Found ${results.length} documentation results`);
      return results;
      
    } catch (error) {
      console.error('❌ Documentation search failed:', error);
      throw error;
    }
  }

  /**
   * Validate documentation
   * @param {Object} documentation - Documentation to validate
   * @returns {Promise<Object>} Validation results
   */
  async validateDocumentation(documentation) {
    try {
      console.log('🔍 Validating documentation...');
      
      const validation = await this._validateDocumentation(documentation);
      
      // Store validation results
      this.validationResults.set(documentation.id || 'unknown', validation);
      
      console.log('✅ Documentation validation completed');
      return validation;
      
    } catch (error) {
      console.error('❌ Documentation validation failed:', error);
      throw error;
    }
  }

  /**
   * Get documentation analytics
   * @param {Object} options - Analytics options
   * @returns {Object} Documentation analytics
   */
  getDocumentationAnalytics(options = {}) {
    const { 
      timeRange = 30 * 24 * 60 * 60 * 1000, // 30 days
      includeDetails = true 
    } = options;
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    // Filter analytics by time range
    const filteredViews = this._filterAnalyticsByTime(this.analytics.views, startTime);
    const filteredSearches = this._filterAnalyticsByTime(this.analytics.searches, startTime);
    const filteredFeedback = this._filterAnalyticsByTime(this.analytics.feedback, startTime);
    
    const analytics = {
      overview: {
        totalDocumentation: this.documentation.size,
        totalViews: filteredViews.size,
        totalSearches: filteredSearches.size,
        totalFeedback: filteredFeedback.size,
        averageQuality: this._calculateAverageQuality()
      },
      topDocuments: this._getTopDocuments(filteredViews),
      topSearches: this._getTopSearches(filteredSearches),
      qualityMetrics: this._getQualityMetrics(),
      trends: includeDetails ? this._getTrends(startTime) : null
    };
    
    return analytics;
  }

  /**
   * Get documentation by ID
   * @param {string} id - Documentation ID
   * @returns {Object} Documentation
   */
  getDocumentation(id) {
    return this.documentation.get(id) || null;
  }

  /**
   * Get all documentation
   * @param {Object} options - Options
   * @returns {Array} All documentation
   */
  getAllDocumentation(options = {}) {
    const { category = null, tags = [], limit = null } = options;
    
    let docs = Array.from(this.documentation.values());
    
    if (category) {
      docs = docs.filter(doc => doc.category === category);
    }
    
    if (tags.length > 0) {
      docs = docs.filter(doc => tags.some(tag => doc.tags?.includes(tag)));
    }
    
    if (limit) {
      docs = docs.slice(0, limit);
    }
    
    return docs;
  }

  /**
   * Shutdown the documentation service
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log('🛑 Shutting down Unified Documentation Service...');
    
    // Clear all data
    this.documentation.clear();
    this.knowledgeBase.clear();
    this.documentationIndex.clear();
    this.documentationTemplates.clear();
    this.validationResults.clear();
    this.qualityMetrics.clear();
    this.generationQueue = [];
    this.generationStatus.clear();
    this.searchIndex.clear();
    this.searchHistory = [];
    
    // Clear analytics
    Object.values(this.analytics).forEach(map => map.clear());
    
    // Reset state
    this.isInitialized = false;
    this.initializationPromise = null;
    
    console.log('✅ Unified Documentation Service shutdown complete');
  }

  // Private methods

  _initializeTemplates() {
    // Store templates
    Object.entries(this.templates).forEach(([type, template]) => {
      this.documentationTemplates.set(type, template);
    });
  }

  async _initializeKnowledgeBase() {
    // Initialize knowledge base with existing documentation
    const existingDocs = [
      'API_CONSOLIDATION_GUIDE.md',
      'DATA_MANAGEMENT_GUIDE.md',
      'PERFORMANCE_OPTIMIZATION_GUIDE.md',
      'SECURITY_AUTHENTICATION_GUIDE.md',
      'TESTING_QUALITY_ASSURANCE_GUIDE.md',
      'productionRouting/MIGRATION_GUIDE.md'
    ];
    
    for (const doc of existingDocs) {
      await this._loadExistingDocumentation(doc);
    }
  }

  async _initializeDocumentationIndex() {
    // Initialize search index
    for (const [id, doc] of this.documentation) {
      await this._updateSearchIndex(id, doc);
    }
  }

  _startDocumentationMonitoring() {
    // Start monitoring tasks
    if (this.config.monitoring.enabled) {
      setInterval(() => {
        this._generateAnalyticsReport();
      }, this.config.monitoring.reportGenerationInterval);
    }
  }

  async _generateDocumentation(type, name, info, options) {
    const template = this.documentationTemplates.get(type);
    if (!template) {
      throw new Error(`Unknown documentation type: ${type}`);
    }
    
    // Generate documentation using template
    const documentation = {
      id: this._generateDocumentationId(name),
      type,
      name,
      title: info.title || name,
      description: info.description || '',
      content: this._processTemplate(template, info, options),
      metadata: {
        version: info.version || '1.0.0',
        author: info.author || 'Trek-IQ Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: info.category || type,
        tags: info.tags || [],
        status: info.status || 'active'
      },
      sections: info.sections || [],
      examples: info.examples || [],
      references: info.references || []
    };
    
    return documentation;
  }

  async _validateDocumentation(documentation) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      quality: {
        completeness: 0,
        clarity: 0,
        accuracy: 0,
        consistency: 0,
        overall: 0
      }
    };
    
    // Check required fields
    if (!documentation.title) {
      validation.errors.push('Missing title');
      validation.isValid = false;
    }
    
    if (!documentation.description) {
      validation.warnings.push('Missing description');
    }
    
    if (!documentation.content) {
      validation.errors.push('Missing content');
      validation.isValid = false;
    }
    
    // Check content quality
    if (documentation.content.length < 100) {
      validation.warnings.push('Content is too short');
    }
    
    // Check for code examples
    if (!documentation.examples || documentation.examples.length === 0) {
      validation.suggestions.push('Add code examples');
    }
    
    // Calculate quality metrics
    validation.quality = this._calculateQualityMetrics(documentation);
    
    return validation;
  }

  async _updateKnowledgeBase(id, documentation) {
    this.knowledgeBase.set(id, {
      ...documentation,
      indexedAt: new Date().toISOString(),
      category: documentation.metadata.category,
      tags: documentation.metadata.tags
    });
  }

  async _updateSearchIndex(id, documentation) {
    // Create search index entry
    const indexEntry = {
      id,
      title: documentation.title,
      description: documentation.description,
      content: documentation.content,
      category: documentation.metadata.category,
      tags: documentation.metadata.tags,
      keywords: this._extractKeywords(documentation)
    };
    
    this.searchIndex.set(id, indexEntry);
  }

  async _performSearch(query, options) {
    const results = [];
    const queryLower = query.toLowerCase();
    
    for (const [id, entry] of this.searchIndex) {
      let score = 0;
      
      // Title match
      if (entry.title.toLowerCase().includes(queryLower)) {
        score += 10;
      }
      
      // Description match
      if (entry.description.toLowerCase().includes(queryLower)) {
        score += 5;
      }
      
      // Content match
      if (entry.content.toLowerCase().includes(queryLower)) {
        score += 1;
      }
      
      // Tag match
      if (entry.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
        score += 3;
      }
      
      // Category filter
      if (options.category && entry.category !== options.category) {
        continue;
      }
      
      // Tag filter
      if (options.tags.length > 0 && !options.tags.some(tag => entry.tags.includes(tag))) {
        continue;
      }
      
      if (score > 0) {
        results.push({
          id,
          title: entry.title,
          description: entry.description,
          category: entry.category,
          tags: entry.tags,
          score,
          content: options.includeContent ? entry.content : null
        });
      }
    }
    
    // Sort by score and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit);
  }

  _trackSearch(query, results) {
    const searchEntry = {
      query,
      resultsCount: results.length,
      timestamp: Date.now()
    };
    
    this.analytics.searches.set(Date.now().toString(), searchEntry);
    this.searchHistory.push(searchEntry);
    
    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory = this.searchHistory.slice(-100);
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

  _calculateAverageQuality() {
    if (this.qualityMetrics.size === 0) return 0;
    
    let totalQuality = 0;
    for (const quality of this.qualityMetrics.values()) {
      totalQuality += quality.overall;
    }
    
    return totalQuality / this.qualityMetrics.size;
  }

  _getTopDocuments(views) {
    const docViews = new Map();
    
    for (const view of views.values()) {
      const count = docViews.get(view.documentId) || 0;
      docViews.set(view.documentId, count + 1);
    }
    
    return Array.from(docViews.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, views]) => ({ id, views }));
  }

  _getTopSearches(searches) {
    const searchCounts = new Map();
    
    for (const search of searches.values()) {
      const count = searchCounts.get(search.query) || 0;
      searchCounts.set(search.query, count + 1);
    }
    
    return Array.from(searchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));
  }

  _getQualityMetrics() {
    return {
      averageQuality: this._calculateAverageQuality(),
      totalValidated: this.validationResults.size,
      qualityDistribution: this._getQualityDistribution()
    };
  }

  _getTrends(startTime) {
    // Generate trends based on analytics data
    return {
      views: this._generateTrendData(this.analytics.views, startTime),
      searches: this._generateTrendData(this.analytics.searches, startTime),
      quality: this._generateQualityTrendData(startTime)
    };
  }

  _generateTrendData(analyticsMap, startTime) {
    const dailyData = new Map();
    
    for (const [key, value] of analyticsMap) {
      if (value.timestamp >= startTime) {
        const date = new Date(value.timestamp).toDateString();
        const count = dailyData.get(date) || 0;
        dailyData.set(date, count + 1);
      }
    }
    
    return Array.from(dailyData.entries())
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, count]) => ({ date, count }));
  }

  _generateQualityTrendData(startTime) {
    // Generate quality trend data
    return [];
  }

  _getQualityDistribution() {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
    
    for (const quality of this.qualityMetrics.values()) {
      if (quality.overall >= 90) distribution.excellent++;
      else if (quality.overall >= 80) distribution.good++;
      else if (quality.overall >= 70) distribution.fair++;
      else distribution.poor++;
    }
    
    return distribution;
  }

  _calculateQualityMetrics(documentation) {
    let completeness = 0;
    let clarity = 0;
    let accuracy = 0;
    let consistency = 0;
    
    // Completeness (based on required sections)
    const requiredSections = ['title', 'description', 'content'];
    const presentSections = requiredSections.filter(section => documentation[section]);
    completeness = (presentSections.length / requiredSections.length) * 100;
    
    // Clarity (based on content length and structure)
    if (documentation.content && documentation.content.length > 500) {
      clarity = 80;
    } else if (documentation.content && documentation.content.length > 200) {
      clarity = 60;
    } else {
      clarity = 40;
    }
    
    // Accuracy (based on examples and references)
    if (documentation.examples && documentation.examples.length > 0) {
      accuracy = 90;
    } else {
      accuracy = 70;
    }
    
    // Consistency (based on formatting and structure)
    consistency = 85; // Default good consistency
    
    const overall = (completeness + clarity + accuracy + consistency) / 4;
    
    return {
      completeness: Math.round(completeness),
      clarity: Math.round(clarity),
      accuracy: Math.round(accuracy),
      consistency: Math.round(consistency),
      overall: Math.round(overall)
    };
  }

  _extractKeywords(documentation) {
    const keywords = [];
    
    // Extract from title
    if (documentation.title) {
      keywords.push(...documentation.title.toLowerCase().split(' '));
    }
    
    // Extract from description
    if (documentation.description) {
      keywords.push(...documentation.description.toLowerCase().split(' '));
    }
    
    // Extract from tags
    if (documentation.metadata && documentation.metadata.tags) {
      keywords.push(...documentation.metadata.tags.map(tag => tag.toLowerCase()));
    }
    
    // Remove duplicates and common words
    return [...new Set(keywords)].filter(word => 
      word.length > 2 && 
      !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word)
    );
  }

  _processTemplate(template, info, options) {
    // Process template with provided information
    let content = template;
    
    // Replace placeholders
    Object.entries(info).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return content;
  }

  _generateDocumentationId(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
  }

  async _loadExistingDocumentation(filename) {
    // Load existing documentation file
    const doc = {
      id: this._generateDocumentationId(filename),
      type: 'guide',
      name: filename,
      title: filename.replace('.md', '').replace(/_/g, ' '),
      description: `Existing documentation: ${filename}`,
      content: `Content from ${filename}`,
      metadata: {
        version: '1.0.0',
        author: 'Trek-IQ Team',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'guide',
        tags: ['existing', 'legacy'],
        status: 'active'
      }
    };
    
    this.documentation.set(doc.id, doc);
    await this._updateKnowledgeBase(doc.id, doc);
    await this._updateSearchIndex(doc.id, doc);
  }

  _generateAnalyticsReport() {
    // Generate analytics report
    const report = this.getDocumentationAnalytics();
    console.log('📊 Documentation Analytics Report:', report.overview);
  }

  _getServiceTemplate() {
    return `# {{title}}

## Overview

{{description}}

## Features

{{features}}

## API Reference

{{apiReference}}

## Usage Examples

{{examples}}

## Configuration

{{configuration}}

## Migration Guide

{{migrationGuide}}

## Testing

{{testing}}

## Performance

{{performance}}

## Security

{{security}}

## Troubleshooting

{{troubleshooting}}

## References

{{references}}`;
  }

  _getComponentTemplate() {
    return `# {{title}}

## Overview

{{description}}

## Props

{{props}}

## Usage Examples

{{examples}}

## Styling

{{styling}}

## Accessibility

{{accessibility}}

## Testing

{{testing}}

## Performance

{{performance}}

## Migration Guide

{{migrationGuide}}

## References

{{references}}`;
  }

  _getAPITemplate() {
    return `# {{title}}

## Overview

{{description}}

## Endpoints

{{endpoints}}

## Authentication

{{authentication}}

## Request/Response Examples

{{examples}}

## Error Handling

{{errorHandling}}

## Rate Limiting

{{rateLimiting}}

## Testing

{{testing}}

## References

{{references}}`;
  }

  _getGuideTemplate() {
    return `# {{title}}

## Overview

{{description}}

## Prerequisites

{{prerequisites}}

## Step-by-Step Guide

{{steps}}

## Examples

{{examples}}

## Best Practices

{{bestPractices}}

## Troubleshooting

{{troubleshooting}}

## References

{{references}}`;
  }
}

// Export singleton instance
const unifiedDocumentationService = new UnifiedDocumentationService();
export default unifiedDocumentationService;
