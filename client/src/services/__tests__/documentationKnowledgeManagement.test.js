/**
 * Documentation & Knowledge Management Tests
 * 
 * Tests for unified documentation service and knowledge management service
 * across the application.
 */

import unifiedDocumentationService from '../unifiedDocumentationService.js';
import knowledgeManagementService from '../knowledgeManagementService.js';

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

jest.mock('../unifiedSecurityService.js', () => ({
  authenticate: jest.fn(),
  hasPermission: jest.fn(),
  getCurrentUser: jest.fn(),
  isAuthenticated: jest.fn(),
  getAuthHeaders: jest.fn(),
  validateInput: jest.fn()
}));

jest.mock('../qualityAssuranceService.js', () => ({
  runQualityAnalysis: jest.fn(),
  monitorCodeQuality: jest.fn(),
  monitorPerformance: jest.fn(),
  monitorSecurity: jest.fn(),
  generateQualityReport: jest.fn(),
  getQualityMetrics: jest.fn()
}));

describe('UnifiedDocumentationService', () => {
  beforeEach(async () => {
    await unifiedDocumentationService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await unifiedDocumentationService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(unifiedDocumentationService.isInitialized).toBe(true);
    });

    test('should initialize documentation templates', () => {
      expect(unifiedDocumentationService.documentationTemplates.size).toBeGreaterThan(0);
      expect(unifiedDocumentationService.documentationTemplates.has('service')).toBe(true);
      expect(unifiedDocumentationService.documentationTemplates.has('component')).toBe(true);
      expect(unifiedDocumentationService.documentationTemplates.has('api')).toBe(true);
      expect(unifiedDocumentationService.documentationTemplates.has('guide')).toBe(true);
    });

    test('should initialize knowledge base', () => {
      expect(unifiedDocumentationService.knowledgeBase.size).toBeGreaterThan(0);
    });

    test('should initialize documentation index', () => {
      expect(unifiedDocumentationService.documentationIndex.size).toBeGreaterThan(0);
    });
  });

  describe('Service Documentation Generation', () => {
    test('should generate service documentation', async () => {
      const serviceInfo = {
        title: 'Test Service',
        description: 'A test service for documentation',
        features: ['Feature 1', 'Feature 2'],
        apiReference: 'API reference content',
        examples: ['Example 1', 'Example 2'],
        configuration: 'Configuration options',
        migrationGuide: 'Migration guide content',
        testing: 'Testing information',
        performance: 'Performance details',
        security: 'Security considerations',
        troubleshooting: 'Troubleshooting guide',
        references: ['Reference 1', 'Reference 2']
      };

      const documentation = await unifiedDocumentationService.generateServiceDocumentation(
        'testService',
        serviceInfo
      );

      expect(documentation).toBeDefined();
      expect(documentation.id).toBeDefined();
      expect(documentation.type).toBe('service');
      expect(documentation.name).toBe('testService');
      expect(documentation.title).toBe('Test Service');
      expect(documentation.description).toBe('A test service for documentation');
      expect(documentation.content).toBeDefined();
      expect(documentation.metadata).toBeDefined();
      expect(documentation.sections).toBeDefined();
      expect(documentation.examples).toBeDefined();
      expect(documentation.references).toBeDefined();
    });

    test('should validate generated service documentation', async () => {
      const serviceInfo = {
        title: 'Test Service',
        description: 'A test service for documentation',
        features: ['Feature 1', 'Feature 2']
      };

      const documentation = await unifiedDocumentationService.generateServiceDocumentation(
        'testService',
        serviceInfo
      );

      expect(documentation.validation).toBeDefined();
      expect(documentation.validation.isValid).toBe(true);
      expect(documentation.validation.errors).toBeDefined();
      expect(documentation.validation.warnings).toBeDefined();
      expect(documentation.validation.suggestions).toBeDefined();
      expect(documentation.validation.quality).toBeDefined();
    });
  });

  describe('Component Documentation Generation', () => {
    test('should generate component documentation', async () => {
      const componentInfo = {
        title: 'Test Component',
        description: 'A test component for documentation',
        props: ['prop1', 'prop2'],
        examples: ['Example 1', 'Example 2'],
        styling: 'Styling information',
        accessibility: 'Accessibility features',
        testing: 'Testing information',
        performance: 'Performance details',
        migrationGuide: 'Migration guide content',
        references: ['Reference 1', 'Reference 2']
      };

      const documentation = await unifiedDocumentationService.generateComponentDocumentation(
        'testComponent',
        componentInfo
      );

      expect(documentation).toBeDefined();
      expect(documentation.id).toBeDefined();
      expect(documentation.type).toBe('component');
      expect(documentation.name).toBe('testComponent');
      expect(documentation.title).toBe('Test Component');
      expect(documentation.description).toBe('A test component for documentation');
      expect(documentation.content).toBeDefined();
      expect(documentation.metadata).toBeDefined();
    });

    test('should validate generated component documentation', async () => {
      const componentInfo = {
        title: 'Test Component',
        description: 'A test component for documentation'
      };

      const documentation = await unifiedDocumentationService.generateComponentDocumentation(
        'testComponent',
        componentInfo
      );

      expect(documentation.validation).toBeDefined();
      expect(documentation.validation.isValid).toBe(true);
      expect(documentation.validation.quality).toBeDefined();
    });
  });

  describe('API Documentation Generation', () => {
    test('should generate API documentation', async () => {
      const apiInfo = {
        title: 'Test API',
        description: 'A test API for documentation',
        endpoints: ['endpoint1', 'endpoint2'],
        authentication: 'Authentication details',
        examples: ['Example 1', 'Example 2'],
        errorHandling: 'Error handling information',
        rateLimiting: 'Rate limiting details',
        testing: 'Testing information',
        references: ['Reference 1', 'Reference 2']
      };

      const documentation = await unifiedDocumentationService.generateAPIDocumentation(
        'testAPI',
        apiInfo
      );

      expect(documentation).toBeDefined();
      expect(documentation.id).toBeDefined();
      expect(documentation.type).toBe('api');
      expect(documentation.name).toBe('testAPI');
      expect(documentation.title).toBe('Test API');
      expect(documentation.description).toBe('A test API for documentation');
      expect(documentation.content).toBeDefined();
      expect(documentation.metadata).toBeDefined();
    });

    test('should validate generated API documentation', async () => {
      const apiInfo = {
        title: 'Test API',
        description: 'A test API for documentation'
      };

      const documentation = await unifiedDocumentationService.generateAPIDocumentation(
        'testAPI',
        apiInfo
      );

      expect(documentation.validation).toBeDefined();
      expect(documentation.validation.isValid).toBe(true);
      expect(documentation.validation.quality).toBeDefined();
    });
  });

  describe('Guide Documentation Generation', () => {
    test('should generate guide documentation', async () => {
      const guideInfo = {
        title: 'Test Guide',
        description: 'A test guide for documentation',
        prerequisites: ['Prerequisite 1', 'Prerequisite 2'],
        steps: ['Step 1', 'Step 2'],
        examples: ['Example 1', 'Example 2'],
        bestPractices: ['Best practice 1', 'Best practice 2'],
        troubleshooting: 'Troubleshooting information',
        references: ['Reference 1', 'Reference 2']
      };

      const documentation = await unifiedDocumentationService.generateGuideDocumentation(
        'testGuide',
        guideInfo
      );

      expect(documentation).toBeDefined();
      expect(documentation.id).toBeDefined();
      expect(documentation.type).toBe('guide');
      expect(documentation.name).toBe('testGuide');
      expect(documentation.title).toBe('Test Guide');
      expect(documentation.description).toBe('A test guide for documentation');
      expect(documentation.content).toBeDefined();
      expect(documentation.metadata).toBeDefined();
    });

    test('should validate generated guide documentation', async () => {
      const guideInfo = {
        title: 'Test Guide',
        description: 'A test guide for documentation'
      };

      const documentation = await unifiedDocumentationService.generateGuideDocumentation(
        'testGuide',
        guideInfo
      );

      expect(documentation.validation).toBeDefined();
      expect(documentation.validation.isValid).toBe(true);
      expect(documentation.validation.quality).toBeDefined();
    });
  });

  describe('Documentation Search', () => {
    test('should search documentation', async () => {
      // Add some test documentation first
      await unifiedDocumentationService.generateServiceDocumentation('testService', {
        title: 'Test Service',
        description: 'A test service for search testing',
        features: ['search', 'testing']
      });

      const results = await unifiedDocumentationService.searchDocumentation('test service');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      if (results.length > 0) {
        const result = results[0];
        expect(result.id).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.description).toBeDefined();
        expect(result.score).toBeDefined();
      }
    });

    test('should search documentation with filters', async () => {
      const results = await unifiedDocumentationService.searchDocumentation('test', {
        category: 'service',
        tags: ['testing'],
        limit: 5,
        includeContent: false
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test('should track search analytics', async () => {
      await unifiedDocumentationService.searchDocumentation('test query');

      // Check if search was tracked
      expect(unifiedDocumentationService.searchHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Documentation Validation', () => {
    test('should validate documentation', async () => {
      const documentation = {
        id: 'test-doc',
        title: 'Test Documentation',
        description: 'Test description',
        content: 'Test content with sufficient length for validation',
        metadata: {
          version: '1.0.0',
          author: 'Test Author',
          category: 'test',
          tags: ['test', 'validation']
        }
      };

      const validation = await unifiedDocumentationService.validateDocumentation(documentation);

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(validation.suggestions).toBeDefined();
      expect(validation.quality).toBeDefined();
      expect(validation.quality.completeness).toBeDefined();
      expect(validation.quality.clarity).toBeDefined();
      expect(validation.quality.accuracy).toBeDefined();
      expect(validation.quality.consistency).toBeDefined();
      expect(validation.quality.overall).toBeDefined();
    });

    test('should detect validation errors', async () => {
      const documentation = {
        id: 'test-doc',
        // Missing title
        description: 'Test description',
        content: 'Test content'
      };

      const validation = await unifiedDocumentationService.validateDocumentation(documentation);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should detect validation warnings', async () => {
      const documentation = {
        id: 'test-doc',
        title: 'Test Documentation',
        // Missing description
        content: 'Test content'
      };

      const validation = await unifiedDocumentationService.validateDocumentation(documentation);

      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Documentation Analytics', () => {
    test('should get documentation analytics', () => {
      const analytics = unifiedDocumentationService.getDocumentationAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalDocumentation).toBeDefined();
      expect(analytics.overview.totalViews).toBeDefined();
      expect(analytics.overview.totalSearches).toBeDefined();
      expect(analytics.overview.totalFeedback).toBeDefined();
      expect(analytics.overview.averageQuality).toBeDefined();
      expect(analytics.topDocuments).toBeDefined();
      expect(analytics.topSearches).toBeDefined();
      expect(analytics.qualityMetrics).toBeDefined();
    });

    test('should get documentation analytics with trends', () => {
      const analytics = unifiedDocumentationService.getDocumentationAnalytics({
        includeTrends: true
      });

      expect(analytics.trends).toBeDefined();
    });

    test('should get documentation analytics with recommendations', () => {
      const analytics = unifiedDocumentationService.getDocumentationAnalytics({
        includeRecommendations: true
      });

      expect(analytics.recommendations).toBeDefined();
    });
  });

  describe('Documentation Management', () => {
    test('should get documentation by ID', async () => {
      await unifiedDocumentationService.generateServiceDocumentation('testService', {
        title: 'Test Service',
        description: 'A test service'
      });

      const documentation = unifiedDocumentationService.getDocumentation('testService');

      expect(documentation).toBeDefined();
      expect(documentation.name).toBe('testService');
    });

    test('should get all documentation', () => {
      const allDocs = unifiedDocumentationService.getAllDocumentation();

      expect(Array.isArray(allDocs)).toBe(true);
    });

    test('should get documentation with filters', () => {
      const filteredDocs = unifiedDocumentationService.getAllDocumentation({
        category: 'service',
        tags: ['testing'],
        limit: 5
      });

      expect(Array.isArray(filteredDocs)).toBe(true);
    });
  });
});

describe('KnowledgeManagementService', () => {
  beforeEach(async () => {
    await knowledgeManagementService.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await knowledgeManagementService.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(knowledgeManagementService.isInitialized).toBe(true);
      expect(knowledgeManagementService.monitoringActive).toBe(true);
    });

    test('should initialize knowledge base', () => {
      expect(knowledgeManagementService.knowledgeBase.size).toBeGreaterThan(0);
    });

    test('should initialize content indexes', () => {
      expect(knowledgeManagementService.contentIndex.size).toBeGreaterThan(0);
      expect(knowledgeManagementService.categoryIndex.size).toBeGreaterThan(0);
      expect(knowledgeManagementService.tagIndex.size).toBeGreaterThan(0);
    });

    test('should initialize search functionality', () => {
      expect(knowledgeManagementService.searchIndex.size).toBeGreaterThan(0);
    });
  });

  describe('Content Management', () => {
    test('should add content to knowledge base', async () => {
      const content = {
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      };

      const addedContent = await knowledgeManagementService.addContent(content);

      expect(addedContent).toBeDefined();
      expect(addedContent.id).toBeDefined();
      expect(addedContent.title).toBe('Test Content');
      expect(addedContent.description).toBe('Test content description');
      expect(addedContent.content).toBe('Test content body');
      expect(addedContent.category).toBe('guides');
      expect(addedContent.tags).toEqual(['test', 'content']);
      expect(addedContent.metadata).toBeDefined();
      expect(addedContent.analytics).toBeDefined();
    });

    test('should process content with metadata', async () => {
      const content = {
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content'],
        author: 'Test Author',
        version: '1.0.0'
      };

      const addedContent = await knowledgeManagementService.addContent(content);

      expect(addedContent.metadata.author).toBe('Test Author');
      expect(addedContent.metadata.version).toBe('1.0.0');
      expect(addedContent.metadata.createdAt).toBeDefined();
      expect(addedContent.metadata.updatedAt).toBeDefined();
      expect(addedContent.metadata.quality).toBeDefined();
    });

    test('should update content indexes', async () => {
      const content = {
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      };

      await knowledgeManagementService.addContent(content);

      // Check category index
      const categoryContent = knowledgeManagementService.categoryIndex.get('guides');
      expect(categoryContent).toBeDefined();
      expect(categoryContent.length).toBeGreaterThan(0);

      // Check tag index
      const testTagContent = knowledgeManagementService.tagIndex.get('test');
      expect(testTagContent).toBeDefined();
      expect(testTagContent.length).toBeGreaterThan(0);

      const contentTagContent = knowledgeManagementService.tagIndex.get('content');
      expect(contentTagContent).toBeDefined();
      expect(contentTagContent.length).toBeGreaterThan(0);

      // Check search index
      expect(knowledgeManagementService.searchIndex.size).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Base Search', () => {
    test('should search knowledge base', async () => {
      // Add test content first
      await knowledgeManagementService.addContent({
        title: 'Test Search Content',
        description: 'Content for search testing',
        content: 'This content is for testing search functionality',
        category: 'guides',
        tags: ['search', 'testing']
      });

      const results = await knowledgeManagementService.searchKnowledgeBase('test search');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      if (results.length > 0) {
        const result = results[0];
        expect(result.id).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.description).toBeDefined();
        expect(result.category).toBeDefined();
        expect(result.tags).toBeDefined();
        expect(result.score).toBeDefined();
      }
    });

    test('should search knowledge base with filters', async () => {
      const results = await knowledgeManagementService.searchKnowledgeBase('test', {
        category: 'guides',
        tags: ['testing'],
        limit: 5,
        includeContent: false
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    test('should perform different search types', async () => {
      const fullTextResults = await knowledgeManagementService.searchKnowledgeBase('test', {
        searchType: 'fullText'
      });

      const semanticResults = await knowledgeManagementService.searchKnowledgeBase('test', {
        searchType: 'semantic'
      });

      const fuzzyResults = await knowledgeManagementService.searchKnowledgeBase('test', {
        searchType: 'fuzzy'
      });

      expect(fullTextResults).toBeDefined();
      expect(semanticResults).toBeDefined();
      expect(fuzzyResults).toBeDefined();
    });

    test('should track search analytics', async () => {
      await knowledgeManagementService.searchKnowledgeBase('test query');

      expect(knowledgeManagementService.searchHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Content Recommendations', () => {
    test('should get content recommendations', async () => {
      // Add test content first
      const content = await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const recommendations = await knowledgeManagementService.getContentRecommendations(content.id);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should get content-based recommendations', async () => {
      const content = await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const recommendations = await knowledgeManagementService.getContentRecommendations(content.id, {
        basedOn: 'content',
        limit: 5
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should get tag-based recommendations', async () => {
      const content = await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const recommendations = await knowledgeManagementService.getContentRecommendations(content.id, {
        basedOn: 'tags',
        limit: 5
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should get category-based recommendations', async () => {
      const content = await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const recommendations = await knowledgeManagementService.getContentRecommendations(content.id, {
        basedOn: 'categories',
        limit: 5
      });

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Content Organization', () => {
    test('should get content by category', async () => {
      await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const categoryContent = await knowledgeManagementService.getContentByCategory('guides');

      expect(categoryContent).toBeDefined();
      expect(Array.isArray(categoryContent)).toBe(true);
      expect(categoryContent.length).toBeGreaterThan(0);
    });

    test('should get content by tags', async () => {
      await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const tagContent = await knowledgeManagementService.getContentByTags(['test', 'content']);

      expect(tagContent).toBeDefined();
      expect(Array.isArray(tagContent)).toBe(true);
      expect(tagContent.length).toBeGreaterThan(0);
    });

    test('should get content by tags with match all', async () => {
      await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const tagContent = await knowledgeManagementService.getContentByTags(['test', 'content'], {
        matchAll: true
      });

      expect(tagContent).toBeDefined();
      expect(Array.isArray(tagContent)).toBe(true);
    });
  });

  describe('Knowledge Base Analytics', () => {
    test('should get knowledge base analytics', () => {
      const analytics = knowledgeManagementService.getKnowledgeBaseAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.overview.totalContent).toBeDefined();
      expect(analytics.overview.totalViews).toBeDefined();
      expect(analytics.overview.totalSearches).toBeDefined();
      expect(analytics.overview.totalInteractions).toBeDefined();
      expect(analytics.overview.averageContentQuality).toBeDefined();
      expect(analytics.topContent).toBeDefined();
      expect(analytics.topSearches).toBeDefined();
      expect(analytics.categoryDistribution).toBeDefined();
      expect(analytics.tagDistribution).toBeDefined();
    });

    test('should get knowledge base analytics with trends', () => {
      const analytics = knowledgeManagementService.getKnowledgeBaseAnalytics({
        includeDetails: true
      });

      expect(analytics.contentTrends).toBeDefined();
      expect(analytics.searchTrends).toBeDefined();
    });
  });

  describe('Content Insights', () => {
    test('should get content insights', () => {
      const insights = knowledgeManagementService.getContentInsights();

      expect(insights).toBeDefined();
      expect(insights.contentGaps).toBeDefined();
      expect(insights.popularContent).toBeDefined();
      expect(insights.trendingTopics).toBeDefined();
      expect(insights.contentQuality).toBeDefined();
      expect(insights.userBehavior).toBeDefined();
      expect(insights.recommendations).toBeDefined();
    });

    test('should get content insights for specific content', () => {
      const insights = knowledgeManagementService.getContentInsights({
        contentId: 'test-content'
      });

      expect(insights).toBeDefined();
    });

    test('should get content insights for specific category', () => {
      const insights = knowledgeManagementService.getContentInsights({
        category: 'guides'
      });

      expect(insights).toBeDefined();
    });
  });

  describe('Content Sharing', () => {
    test('should share content', async () => {
      const content = await knowledgeManagementService.addContent({
        title: 'Test Content',
        description: 'Test content description',
        content: 'Test content body',
        category: 'guides',
        tags: ['test', 'content']
      });

      const share = await knowledgeManagementService.shareContent(content.id, {
        shareWith: ['user1', 'user2'],
        permissions: 'read',
        message: 'Check out this content'
      });

      expect(share).toBeDefined();
      expect(share.id).toBeDefined();
      expect(share.contentId).toBe(content.id);
      expect(share.sharedWith).toEqual(['user1', 'user2']);
      expect(share.permissions).toBe('read');
      expect(share.message).toBe('Check out this content');
      expect(share.createdAt).toBeDefined();
      expect(share.accessCount).toBe(0);
    });

    test('should handle sharing non-existent content', async () => {
      await expect(
        knowledgeManagementService.shareContent('non-existent', {
          shareWith: ['user1']
        })
      ).rejects.toThrow('Content not found: non-existent');
    });
  });

  describe('Content Management', () => {
    test('should get all content', () => {
      const allContent = knowledgeManagementService.getAllContent();

      expect(Array.isArray(allContent)).toBe(true);
    });

    test('should get content with filters', () => {
      const filteredContent = knowledgeManagementService.getAllContent({
        category: 'guides',
        tags: ['test'],
        limit: 5,
        sortBy: 'relevance'
      });

      expect(Array.isArray(filteredContent)).toBe(true);
    });

    test('should get content sorted by date', () => {
      const dateSortedContent = knowledgeManagementService.getAllContent({
        sortBy: 'date'
      });

      expect(Array.isArray(dateSortedContent)).toBe(true);
    });

    test('should get content sorted by popularity', () => {
      const popularitySortedContent = knowledgeManagementService.getAllContent({
        sortBy: 'popularity'
      });

      expect(Array.isArray(popularitySortedContent)).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for documentation and knowledge management', async () => {
    // Initialize all services
    await unifiedDocumentationService.initialize();
    await knowledgeManagementService.initialize();
    
    // Generate documentation
    const serviceDoc = await unifiedDocumentationService.generateServiceDocumentation('testService', {
      title: 'Test Service',
      description: 'A test service for integration testing',
      features: ['integration', 'testing']
    });
    
    // Add content to knowledge base
    const content = await knowledgeManagementService.addContent({
      title: 'Test Content',
      description: 'Test content description',
      content: 'Test content body',
      category: 'guides',
      tags: ['test', 'content']
    });
    
    // Search documentation
    const docResults = await unifiedDocumentationService.searchDocumentation('test service');
    expect(docResults.length).toBeGreaterThanOrEqual(0);
    
    // Search knowledge base
    const kbResults = await knowledgeManagementService.searchKnowledgeBase('test content');
    expect(kbResults.length).toBeGreaterThanOrEqual(0);
    
    // Get recommendations
    const recommendations = await knowledgeManagementService.getContentRecommendations(content.id);
    expect(Array.isArray(recommendations)).toBe(true);
    
    // Get analytics
    const docAnalytics = unifiedDocumentationService.getDocumentationAnalytics();
    const kbAnalytics = knowledgeManagementService.getKnowledgeBaseAnalytics();
    
    expect(docAnalytics.overview).toBeDefined();
    expect(kbAnalytics.overview).toBeDefined();
    
    // Cleanup
    await unifiedDocumentationService.shutdown();
    await knowledgeManagementService.shutdown();
  });

  test('should handle end-to-end documentation workflow', async () => {
    await unifiedDocumentationService.initialize();
    await knowledgeManagementService.initialize();
    
    // Generate multiple types of documentation
    const serviceDoc = await unifiedDocumentationService.generateServiceDocumentation('testService', {
      title: 'Test Service',
      description: 'A test service'
    });
    
    const componentDoc = await unifiedDocumentationService.generateComponentDocumentation('testComponent', {
      title: 'Test Component',
      description: 'A test component'
    });
    
    const apiDoc = await unifiedDocumentationService.generateAPIDocumentation('testAPI', {
      title: 'Test API',
      description: 'A test API'
    });
    
    const guideDoc = await unifiedDocumentationService.generateGuideDocumentation('testGuide', {
      title: 'Test Guide',
      description: 'A test guide'
    });
    
    // Add content to knowledge base
    const content = await knowledgeManagementService.addContent({
      title: 'Test Content',
      description: 'Test content description',
      content: 'Test content body',
      category: 'guides',
      tags: ['test', 'content']
    });
    
    // Search across all documentation
    const searchResults = await unifiedDocumentationService.searchDocumentation('test');
    expect(searchResults.length).toBeGreaterThanOrEqual(0);
    
    // Get content recommendations
    const recommendations = await knowledgeManagementService.getContentRecommendations(content.id);
    expect(Array.isArray(recommendations)).toBe(true);
    
    // Get comprehensive analytics
    const docAnalytics = unifiedDocumentationService.getDocumentationAnalytics({
      includeTrends: true,
      includeRecommendations: true
    });
    
    const kbAnalytics = knowledgeManagementService.getKnowledgeBaseAnalytics({
      includeDetails: true
    });
    
    expect(docAnalytics.overview.totalDocumentation).toBeGreaterThan(0);
    expect(kbAnalytics.overview.totalContent).toBeGreaterThan(0);
    
    // Cleanup
    await unifiedDocumentationService.shutdown();
    await knowledgeManagementService.shutdown();
  });
});
