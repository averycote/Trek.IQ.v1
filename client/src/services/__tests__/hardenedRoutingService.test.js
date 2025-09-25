/**
 * Unit Tests for Hardened Routing Service
 * 
 * Tests all routing functionality including distance verification, scoring, and rendering.
 */

import hardenedRoutingService from '../hardenedRoutingService.js';
import * as turf from '@turf/turf';

// Mock turf for testing
jest.mock('@turf/turf', () => ({
  point: jest.fn((coord) => ({ type: 'Point', coordinates: coord })),
  lineString: jest.fn((coords) => ({ type: 'LineString', coordinates: coords })),
  distance: jest.fn((from, to, options) => {
    // Simple distance calculation for testing
    const [lng1, lat1] = from.coordinates;
    const [lng2, lat2] = to.coordinates;
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
  }),
  length: jest.fn((lineString, options) => {
    // Calculate length of lineString
    const coords = lineString.coordinates;
    let totalLength = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const from = { coordinates: coords[i] };
      const to = { coordinates: coords[i + 1] };
      totalLength += turf.distance(from, to, options);
    }
    return totalLength;
  }),
  nearestPointOnLine: jest.fn((line, point, options) => ({
    geometry: { coordinates: [point.coordinates[0] + 0.001, point.coordinates[1] + 0.001] },
    properties: { dist: 10 }
  })),
  bearing: jest.fn(() => 45),
  pointToLineDistance: jest.fn(() => 5)
}));

// Mock Web Worker Manager
jest.mock('../routingWorkerManager.js', () => ({
  default: {
    initialize: jest.fn(),
    buildGraph: jest.fn(),
    findPath: jest.fn(),
    calculateDistances: jest.fn(),
    generateDirections: jest.fn(),
    calculateScore: jest.fn()
  }
}));

describe('HardenedRoutingService', () => {
  let service;

  beforeEach(() => {
    service = hardenedRoutingService;
    // Reset service state
    service.isInitialized = false;
    service.datasets = {
      activeTravelways: null,
      steps: null,
      sidewalkClosures: null,
      trafficControl: null,
      accessibleParking: null,
      transitStops: null,
      streetLights: null,
      publicWashrooms: null
    };
    service.routingGraph = {
      nodes: new Map(),
      edges: new Map()
    };
  });

  describe('Library Verification', () => {
    test('should verify required libraries at startup', () => {
      // Mock global L (Leaflet)
      global.L = {
        polyline: jest.fn(),
        latLngBounds: jest.fn(),
        point: jest.fn()
      };

      expect(() => service.verifyRequiredLibraries()).not.toThrow();
    });

    test('should fail loudly if leaflet is missing', () => {
      delete global.L;
      
      expect(() => service.verifyRequiredLibraries()).toThrow('Required libraries missing: leaflet');
    });
  });

  describe('Distance Verification', () => {
    test('route distance equals sum of edge lengths and turf length', async () => {
      const routeEdges = [
        {
          id: 1,
          from: 'node1',
          to: 'node2',
          length_m: 100,
          properties: {}
        },
        {
          id: 2,
          from: 'node2',
          to: 'node3',
          length_m: 150,
          properties: {}
        }
      ];

      const nodes = {
        'node1': { coordinates: [-63.6, 44.6] },
        'node2': { coordinates: [-63.5, 44.6] },
        'node3': { coordinates: [-63.4, 44.6] }
      };

      service.routingGraph.nodes = new Map(Object.entries(nodes));

      // Mock Web Worker response
      const routingWorkerManager = require('../routingWorkerManager.js').default;
      routingWorkerManager.calculateDistances.mockResolvedValue({
        total_distance_m_by_edges: 250,
        total_distance_m_by_turf: 250,
        difference: 0,
        percentage_difference: 0,
        verification_passed: true
      });

      const result = await service.calculateDistances(routeEdges);

      expect(result.total_distance_m_by_edges).toBe(250);
      expect(result.total_distance_m_by_turf).toBe(250);
      expect(result.verification_passed).toBe(true);
      expect(Math.abs(result.total_distance_m_by_edges - result.total_distance_m_by_turf))
        .toBeLessThan(result.total_distance_m_by_edges * 0.005); // <0.5% tolerance
    });

    test('should log discrepancy if distances differ by more than 0.5%', async () => {
      const routeEdges = [
        {
          id: 1,
          from: 'node1',
          to: 'node2',
          length_m: 100,
          properties: {}
        }
      ];

      const nodes = {
        'node1': { coordinates: [-63.6, 44.6] },
        'node2': { coordinates: [-63.5, 44.6] }
      };

      service.routingGraph.nodes = new Map(Object.entries(nodes));

      // Mock Web Worker response with discrepancy
      const routingWorkerManager = require('../routingWorkerManager.js').default;
      routingWorkerManager.calculateDistances.mockResolvedValue({
        total_distance_m_by_edges: 100,
        total_distance_m_by_turf: 110,
        difference: 10,
        percentage_difference: 0.1, // 10% difference
        verification_passed: false
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.calculateDistances(routeEdges);

      expect(result.verification_passed).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Distance verification failed: 10.00% difference')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Route Scoring', () => {
    test('score is weighted sum and components normalized', async () => {
      const routeEdges = [
        {
          id: 1,
          length_m: 1000,
          is_step: false,
          slope: 3,
          properties: { winter_maintained: true, sidewalk: true }
        }
      ];

      const options = { avoidSteps: true };

      // Mock Web Worker response
      const routingWorkerManager = require('../routingWorkerManager.js').default;
      routingWorkerManager.calculateScore.mockResolvedValue({
        score: 0.75,
        score_breakdown: {
          weights: {
            distance: 0.25,
            accessibility: 0.45,
            maintenance: 0.15,
            safety: 0.15
          },
          components: {
            distance_score: 0.8,
            accessibility_score: 0.9,
            maintenance_score: 1.0,
            safety_score: 0.5
          },
          raw_metrics: {
            total_distance_m: 1000,
            steps_encountered_count: 0,
            steep_length_m: 0,
            percent_on_winter_maintained: 1.0,
            sidewalk_percentage: 1.0
          }
        }
      });

      const result = await service.calculateRouteScore(routeEdges, options);

      expect(result.score).toBeCloseTo(0.75);
      expect(result.score_breakdown.components.distance_score).toBeCloseTo(0.8);
      expect(result.score_breakdown.components.accessibility_score).toBeCloseTo(0.9);
      expect(result.score_breakdown.components.maintenance_score).toBeCloseTo(1.0);
      expect(result.score_breakdown.components.safety_score).toBeCloseTo(0.5);

      // Verify weighted sum calculation
      const expectedScore = 
        0.25 * 0.8 +  // distance
        0.45 * 0.9 +  // accessibility
        0.15 * 1.0 +  // maintenance
        0.15 * 0.5;   // safety

      expect(result.score).toBeCloseTo(expectedScore);
    });

    test('should handle missing data attributes gracefully', async () => {
      const routeEdges = [
        {
          id: 1,
          length_m: 1000,
          is_step: false,
          slope: null,
          properties: {} // No winter_maintained or sidewalk data
        }
      ];

      // Mock Web Worker response with missing data
      const routingWorkerManager = require('../routingWorkerManager.js').default;
      routingWorkerManager.calculateScore.mockResolvedValue({
        score: 0.5,
        score_breakdown: {
          weights: service.config.weights,
          components: {
            distance_score: 0.8,
            accessibility_score: 0.5,
            maintenance_score: 0.0, // Missing data
            safety_score: 0.5
          },
          raw_metrics: {
            total_distance_m: 1000,
            steps_encountered_count: 0,
            steep_length_m: 0,
            percent_on_winter_maintained: 0.0,
            sidewalk_percentage: 0.0
          }
        }
      });

      const result = await service.calculateRouteScore(routeEdges, {});

      expect(result.score_breakdown.raw_metrics.percent_on_winter_maintained).toBe(0.0);
      expect(result.score_breakdown.raw_metrics.sidewalk_percentage).toBe(0.0);
    });
  });

  describe('Avoid Steps Enforcement', () => {
    test('should not include edges with is_step=true when avoidSteps is true', async () => {
      const graph = {
        nodes: {
          'node1': { coordinates: [-63.6, 44.6] },
          'node2': { coordinates: [-63.5, 44.6] },
          'node3': { coordinates: [-63.4, 44.6] }
        },
        edges: {
          'edge1': {
            id: 1,
            from: 'node1',
            to: 'node2',
            length_m: 100,
            is_step: false,
            properties: {}
          },
          'edge2': {
            id: 2,
            from: 'node2',
            to: 'node3',
            length_m: 150,
            is_step: true, // This should be avoided
            properties: {}
          }
        }
      };

      const options = { avoidSteps: true };

      // Mock Web Worker response - should not include step edge
      const routingWorkerManager = require('../routingWorkerManager.js').default;
      routingWorkerManager.findPath.mockResolvedValue({
        pathEdges: [graph.edges.edge1], // Only non-step edge
        totalDistance: 100,
        edgeCount: 1
      });

      const result = await service.findOptimalPath([-63.6, 44.6], [-63.4, 44.6], options);

      expect(result).toHaveLength(1);
      expect(result[0].is_step).toBe(false);
    });

    test('should explain why steps are included if unavoidable', async () => {
      const routeEdges = [
        {
          id: 1,
          from: 'node1',
          to: 'node2',
          length_m: 100,
          is_step: true, // Unavoidable step
          properties: {}
        }
      ];

      const evidence = service.createRouteEvidence({
        requestId: 'test-request',
        timestamp: new Date().toISOString(),
        start_original: [-63.6, 44.6],
        end_original: [-63.4, 44.6],
        start_snapped: [-63.6, 44.6],
        end_snapped: [-63.4, 44.6],
        routeEdges,
        distanceVerification: {
          total_distance_m_by_edges: 100,
          total_distance_m_by_turf: 100,
          verification_passed: true
        },
        directions: [],
        routeScore: { score: 0.5, score_breakdown: {} },
        options: { avoidSteps: true }
      });

      expect(evidence.warnings).toContain('Route includes steps despite avoid-steps preference');
    });
  });

  describe('Evidence Object', () => {
    test('should create comprehensive evidence object with all required fields', () => {
      const routeEdges = [
        {
          id: 1,
          length_m: 100,
          is_step: false,
          slope: 3,
          properties: { winter_maintained: true }
        }
      ];

      const evidence = service.createRouteEvidence({
        requestId: 'test-request-123',
        timestamp: '2025-01-22T19:00:00Z',
        start_original: [-63.6, 44.6],
        end_original: [-63.4, 44.6],
        start_snapped: [-63.6, 44.6],
        end_snapped: [-63.4, 44.6],
        routeEdges,
        distanceVerification: {
          total_distance_m_by_edges: 100,
          total_distance_m_by_turf: 100,
          verification_passed: true
        },
        directions: [],
        routeScore: {
          score: 0.75,
          score_breakdown: {
            weights: service.config.weights,
            components: {
              distance_score: 0.8,
              accessibility_score: 0.9,
              maintenance_score: 1.0,
              safety_score: 0.5
            }
          }
        },
        options: {}
      });

      // Verify all required fields are present
      expect(evidence.requestId).toBe('test-request-123');
      expect(evidence.timestamp).toBe('2025-01-22T19:00:00Z');
      expect(evidence.start_original).toEqual([-63.6, 44.6]);
      expect(evidence.end_original).toEqual([-63.4, 44.6]);
      expect(evidence.start_snapped).toEqual([-63.6, 44.6]);
      expect(evidence.end_snapped).toEqual([-63.4, 44.6]);
      expect(evidence.total_distance_m_by_edges).toBe(100);
      expect(evidence.total_distance_m_by_turf).toBe(100);
      expect(evidence.segment_count).toBe(1);
      expect(evidence.steps_encountered_count).toBe(0);
      expect(evidence.score).toBe(0.75);
      expect(evidence.score_breakdown.weights).toEqual(service.config.weights);
      expect(evidence.score_breakdown.components).toBeDefined();
      expect(evidence.warnings).toBeInstanceOf(Array);
      expect(evidence.renderEvidence).toBeDefined();
      expect(evidence.renderEvidence.routeComputedTimestamp).toBe('2025-01-22T19:00:00Z');
      expect(evidence.renderEvidence.rendered).toBe(false);
    });
  });

  describe('Adaptive Learning', () => {
    test('should update segment preferences with EMA', async () => {
      const segmentId = 'test-segment-123';
      const feedbackScore = 4; // 4/5 rating
      const anonymizedUserId = 'user-456';

      // Enable adaptive learning
      service.adaptiveLearning.enabled = true;

      const result = await service.submitFeedback(segmentId, feedbackScore, anonymizedUserId);

      expect(result.segmentId).toBe(segmentId);
      expect(result.feedback_score).toBe(4);
      expect(result.anonymizedUserId).toBe(anonymizedUserId);
      expect(result.previous_p).toBe(0.5); // Default preference
      expect(result.new_p).toBeGreaterThan(0.5); // Should increase with positive feedback
      expect(result.alpha).toBe(service.adaptiveLearning.learningRate);
      expect(result.timestamp).toBeDefined();

      // Verify preference was updated
      const updatedPreference = service.adaptiveLearning.segmentPreferences.get(segmentId);
      expect(updatedPreference).toBeGreaterThan(0.5);
    });

    test('should require opt-in for adaptive learning', async () => {
      service.adaptiveLearning.enabled = false;

      await expect(
        service.submitFeedback('test-segment', 4, 'user-123')
      ).rejects.toThrow('Adaptive learning not enabled');
    });

    test('should validate feedback score range', async () => {
      service.adaptiveLearning.enabled = true;

      await expect(
        service.submitFeedback('test-segment', -1, 'user-123')
      ).rejects.toThrow('Feedback score must be between 0 and 5');

      await expect(
        service.submitFeedback('test-segment', 6, 'user-123')
      ).rejects.toThrow('Feedback score must be between 0 and 5');
    });
  });

  describe('Performance Metrics', () => {
    test('should track performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty('routeComputationTime');
      expect(metrics).toHaveProperty('graphBuildTime');
      expect(metrics).toHaveProperty('snappingTime');
      expect(metrics).toHaveProperty('scoringTime');
      expect(typeof metrics.routeComputationTime).toBe('number');
    });
  });

  describe('Health Status', () => {
    test('should return comprehensive health status', () => {
      const health = service.getHealthStatus();

      expect(health).toHaveProperty('initialized');
      expect(health).toHaveProperty('datasets_loaded');
      expect(health).toHaveProperty('graph_nodes');
      expect(health).toHaveProperty('graph_edges');
      expect(health).toHaveProperty('adaptive_learning_enabled');
      expect(health).toHaveProperty('performance_metrics');
    });
  });
});
