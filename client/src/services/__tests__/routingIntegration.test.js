/**
 * Integration Tests for End-to-End Routing Flow
 * 
 * Tests the complete routing flow from request to rendered route.
 * 
 * TODO: Fix Jest ES module configuration - currently failing due to import statements
 * Need to either install proper Babel dependencies or convert to CommonJS require()
 */

import hardenedRoutingService from '../hardenedRoutingService.js';
import routeRenderingService from '../routeRenderingService.js';
import routingWorkerManager from '../routingWorkerManager.js';

// Mock dependencies
jest.mock('../routingWorkerManager.js');
jest.mock('../routeRenderingService.js');

describe('Routing Integration Tests', () => {
  let service;
  let mockMap;

  beforeEach(() => {
    service = hardenedRoutingService;
    
    // Mock map instance
    mockMap = {
      addLayer: jest.fn(),
      removeLayer: jest.fn(),
      fitBounds: jest.fn(),
      getBounds: jest.fn(() => ({
        getNorthEast: () => ({ lat: 44.7, lng: -63.4 }),
        getSouthWest: () => ({ lat: 44.6, lng: -63.6 })
      }))
    };

    // Mock Leaflet
    global.L = {
      polyline: jest.fn(() => ({
        addTo: jest.fn(),
        setLatLngs: jest.fn(),
        bringToFront: jest.fn(),
        setStyle: jest.fn()
      })),
      latLngBounds: jest.fn(() => ({
        extend: jest.fn()
      }))
    };

    // Reset service state
    service.isInitialized = false;
    service.datasets = {
      activeTravelways: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[-63.6, 44.6], [-63.5, 44.6], [-63.4, 44.6]]
            },
            properties: {
              name: 'Test Street',
              winter_maintained: true,
              sidewalk: true
            }
          }
        ]
      },
      steps: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-63.55, 44.6]
            },
            properties: {
              stepCount: 5
            }
          }
        ]
      },
      sidewalkClosures: { type: 'FeatureCollection', features: [] },
      trafficControl: { type: 'FeatureCollection', features: [] },
      accessibleParking: { type: 'FeatureCollection', features: [] },
      transitStops: { type: 'FeatureCollection', features: [] },
      streetLights: { type: 'FeatureCollection', features: [] },
      publicWashrooms: { type: 'FeatureCollection', features: [] }
    };

    service.routingGraph = {
      nodes: new Map([
        ['-63.6,44.6', { id: 0, coordinates: [-63.6, 44.6], type: 'vertex' }],
        ['-63.5,44.6', { id: 1, coordinates: [-63.5, 44.6], type: 'vertex' }],
        ['-63.4,44.6', { id: 2, coordinates: [-63.4, 44.6], type: 'vertex' }]
      ]),
      edges: new Map([
        ['edge1', {
          id: 1,
          from: '-63.6,44.6',
          to: '-63.5,44.6',
          length_m: 100,
          is_step: false,
          slope: 2,
          properties: { name: 'Test Street', winter_maintained: true, sidewalk: true }
        }],
        ['edge2', {
          id: 2,
          from: '-63.5,44.6',
          to: '-63.4,44.6',
          length_m: 100,
          is_step: false,
          slope: 1,
          properties: { name: 'Test Street', winter_maintained: true, sidewalk: true }
        }]
      ])
    };

    // Mock Web Worker responses
    routingWorkerManager.initialize.mockResolvedValue();
    routingWorkerManager.buildGraph.mockResolvedValue({
      graph: {
        nodes: Object.fromEntries(service.routingGraph.nodes),
        edges: Object.fromEntries(service.routingGraph.edges)
      },
      nodeCount: 3,
      edgeCount: 2
    });
    routingWorkerManager.findPath.mockResolvedValue({
      pathEdges: Array.from(service.routingGraph.edges.values()),
      totalDistance: 200,
      edgeCount: 2
    });
    routingWorkerManager.calculateDistances.mockResolvedValue({
      total_distance_m_by_edges: 200,
      total_distance_m_by_turf: 200,
      difference: 0,
      percentage_difference: 0,
      verification_passed: true
    });
    routingWorkerManager.generateDirections.mockResolvedValue({
      directions: [
        {
          text: 'Start at origin on Test Street',
          segment_distance_m: 100,
          from_coord: [-63.6, 44.6],
          to_coord: [-63.5, 44.6],
          evidence_id: 1,
          bearing: 90,
          street_name: 'Test Street'
        },
        {
          text: 'Continue to destination on Test Street',
          segment_distance_m: 200,
          from_coord: [-63.5, 44.6],
          to_coord: [-63.4, 44.6],
          evidence_id: 2,
          bearing: 90,
          street_name: 'Test Street'
        }
      ]
    });
    routingWorkerManager.calculateScore.mockResolvedValue({
      score: 0.85,
      score_breakdown: {
        weights: {
          distance: 0.25,
          accessibility: 0.45,
          maintenance: 0.15,
          safety: 0.15
        },
        components: {
          distance_score: 0.9,
          accessibility_score: 0.9,
          maintenance_score: 1.0,
          safety_score: 0.7
        },
        raw_metrics: {
          total_distance_m: 200,
          steps_encountered_count: 0,
          steep_length_m: 0,
          percent_on_winter_maintained: 1.0,
          sidewalk_percentage: 1.0
        }
      }
    });

    // Mock rendering service
    routeRenderingService.initialize.mockImplementation();
    routeRenderingService.renderRoute.mockResolvedValue();
  });

  describe('End-to-End Routing Flow', () => {
    test('should complete full routing flow: compute -> evidence -> render', async () => {
      // 1. Initialize service
      await service.initialize();
      expect(service.isInitialized).toBe(true);

      // 2. Calculate route
      const origin = [-63.6, 44.6];
      const destination = [-63.4, 44.6];
      const options = { avoidSteps: true, maxSlope: 8 };

      const result = await service.calculateRoute(origin, destination, options);

      // 3. Verify route computation
      expect(result.success).toBe(true);
      expect(result.route).toBeDefined();
      expect(result.route.type).toBe('FeatureCollection');
      expect(result.route.features).toHaveLength(1);
      expect(result.route.features[0].geometry.type).toBe('LineString');
      expect(result.route.features[0].geometry.coordinates).toHaveLength(3);

      // 4. Verify evidence object
      expect(result.evidence).toBeDefined();
      expect(result.evidence.requestId).toBeDefined();
      expect(result.evidence.timestamp).toBeDefined();
      expect(result.evidence.start_original).toEqual(origin);
      expect(result.evidence.end_original).toEqual(destination);
      expect(result.evidence.total_distance_m_by_edges).toBe(200);
      expect(result.evidence.total_distance_m_by_turf).toBe(200);
      expect(result.evidence.segment_count).toBe(2);
      expect(result.evidence.steps_encountered_count).toBe(0);
      expect(result.evidence.score).toBe(0.85);
      expect(result.evidence.score_breakdown).toBeDefined();
      expect(result.evidence.warnings).toBeInstanceOf(Array);
      expect(result.evidence.renderEvidence).toBeDefined();
      expect(result.evidence.renderEvidence.rendered).toBe(false);

      // 5. Verify performance metrics
      expect(result.performance).toBeDefined();
      expect(result.performance.routeComputationTime).toBeGreaterThan(0);
      expect(result.performance.graphBuildTime).toBeGreaterThan(0);

      // 6. Initialize rendering service
      routeRenderingService.initialize(mockMap);

      // 7. Render route
      await routeRenderingService.renderRoute(result.route, result.evidence);

      // 8. Verify rendering was called
      expect(routeRenderingService.renderRoute).toHaveBeenCalledWith(
        result.route,
        result.evidence
      );

      // 9. Update render evidence
      service.updateRenderEvidence(result.evidence.requestId, true);
      expect(result.evidence.renderEvidence.rendered).toBe(true);
      expect(result.evidence.renderEvidence.polylineSetTimestamp).toBeDefined();
    });

    test('should handle routing errors gracefully', async () => {
      // Mock Web Worker error
      routingWorkerManager.findPath.mockRejectedValue(new Error('No path found'));

      await service.initialize();

      const result = await service.calculateRoute([-63.6, 44.6], [-63.4, 44.6], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No path found');
      expect(result.evidence).toBeDefined();
      expect(result.evidence.error).toBe('No path found');
      expect(result.evidence.warnings).toContain('Route calculation failed');
    });

    test('should enforce avoid-steps preference', async () => {
      // Mock route with steps
      routingWorkerManager.findPath.mockResolvedValue({
        pathEdges: [
          {
            id: 1,
            from: '-63.6,44.6',
            to: '-63.5,44.6',
            length_m: 100,
            is_step: true, // This should be avoided
            slope: 2,
            properties: { name: 'Test Street' }
          }
        ],
        totalDistance: 100,
        edgeCount: 1
      });

      await service.initialize();

      const result = await service.calculateRoute(
        [-63.6, 44.6], 
        [-63.4, 44.6], 
        { avoidSteps: true }
      );

      expect(result.success).toBe(true);
      expect(result.evidence.warnings).toContain('Route includes steps despite avoid-steps preference');
    });

    test('should provide comprehensive route information', async () => {
      await service.initialize();

      const result = await service.calculateRoute([-63.6, 44.6], [-63.4, 44.6], {});

      // Verify route properties
      const routeFeature = result.route.features[0];
      expect(routeFeature.properties.distance).toBe(200);
      expect(routeFeature.properties.duration).toBeGreaterThan(0);
      expect(routeFeature.properties.mode).toBe('walking');
      expect(routeFeature.properties.accessibility_score).toBe(0.85);
      expect(routeFeature.properties.directions).toHaveLength(2);
      expect(routeFeature.properties.evidence_id).toBeDefined();
      expect(routeFeature.properties.warnings).toBeInstanceOf(Array);

      // Verify directions
      const directions = routeFeature.properties.directions;
      expect(directions[0].text).toContain('Start at origin');
      expect(directions[0].text).toContain('Test Street');
      expect(directions[0].segment_distance_m).toBe(100);
      expect(directions[0].evidence_id).toBe(1);
      expect(directions[1].text).toContain('Continue to destination');
      expect(directions[1].segment_distance_m).toBe(200);
      expect(directions[1].evidence_id).toBe(2);
    });
  });

  describe('Rendering Integration', () => {
    test('should render route without perceptible blank', async () => {
      // Initialize rendering service
      routeRenderingService.initialize(mockMap);

      // Create mock route data
      const routeData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[-63.6, 44.6], [-63.5, 44.6], [-63.4, 44.6]]
          },
          properties: {
            distance: 200,
            duration: 143,
            mode: 'walking'
          }
        }]
      };

      const evidence = {
        requestId: 'test-request',
        renderEvidence: {
          routeComputedTimestamp: new Date().toISOString(),
          rendered: false
        }
      };

      // Render route
      await routeRenderingService.renderRoute(routeData, evidence);

      // Verify rendering was called
      expect(routeRenderingService.renderRoute).toHaveBeenCalledWith(routeData, evidence);

      // Verify map operations
      expect(mockMap.addLayer).toHaveBeenCalled();
      expect(mockMap.fitBounds).toHaveBeenCalled();
    });

    test('should update route layer with setLatLngs', async () => {
      const mockPolyline = {
        addTo: jest.fn(),
        setLatLngs: jest.fn(),
        bringToFront: jest.fn(),
        setStyle: jest.fn()
      };

      global.L.polyline.mockReturnValue(mockPolyline);

      routeRenderingService.initialize(mockMap);

      const routeData = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[-63.6, 44.6], [-63.5, 44.6], [-63.4, 44.6]]
          },
          properties: {}
        }]
      };

      const evidence = {
        requestId: 'test-request',
        renderEvidence: { routeComputedTimestamp: new Date().toISOString(), rendered: false }
      };

      await routeRenderingService.renderRoute(routeData, evidence);

      // Verify setLatLngs was called (not remove/add)
      expect(mockPolyline.setLatLngs).toHaveBeenCalled();
      expect(mockPolyline.bringToFront).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    test('should complete routing within reasonable time', async () => {
      const startTime = performance.now();

      await service.initialize();
      const result = await service.calculateRoute([-63.6, 44.6], [-63.4, 44.6], {});

      const totalTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.performance.routeComputationTime).toBeGreaterThan(0);
    });

    test('should track render latency', async () => {
      const computeTime = new Date('2025-01-22T19:00:00Z');
      const renderTime = new Date('2025-01-22T19:00:01Z');

      const evidence = {
        requestId: 'test-request',
        renderEvidence: {
          routeComputedTimestamp: computeTime.toISOString(),
          rendered: false
        }
      };

      // Mock Date.now to return render time
      const originalNow = Date.now;
      Date.now = jest.fn(() => renderTime.getTime());

      routeRenderingService.initialize(mockMap);
      await routeRenderingService.renderRoute({}, evidence);

      expect(evidence.renderEvidence.polylineSetTimestamp).toBeDefined();
      expect(evidence.renderEvidence.rendered).toBe(true);

      Date.now = originalNow;
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle dataset loading failures', async () => {
      // Mock fetch failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.initialize()).rejects.toThrow();
    });

    test('should handle Web Worker failures gracefully', async () => {
      routingWorkerManager.buildGraph.mockRejectedValue(new Error('Worker error'));

      await expect(service.initialize()).rejects.toThrow('Worker error');
    });

    test('should provide fallback when no route found', async () => {
      routingWorkerManager.findPath.mockResolvedValue({
        pathEdges: [],
        totalDistance: 0,
        edgeCount: 0
      });

      await service.initialize();

      const result = await service.calculateRoute([-63.6, 44.6], [-63.4, 44.6], {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No route found between origin and destination');
    });
  });
});
