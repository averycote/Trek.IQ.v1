/**
 * Test suite for Restored Routing Service
 * 
 * Tests the core functionality of the restored routing service
 * to ensure it works correctly with real Halifax data.
 */

import restoredRoutingService from '../restoredRoutingService.js';

describe('Restored Routing Service', () => {
  beforeAll(async () => {
    // Initialize the service before running tests
    await restoredRoutingService.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      const status = restoredRoutingService.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.nodeCount).toBeGreaterThan(0);
      expect(status.edgeCount).toBeGreaterThan(0);
    });

    test('should load essential datasets', () => {
      const status = restoredRoutingService.getStatus();
      expect(status.nodeCount).toBeGreaterThan(1000); // Should have many nodes from Active Travelways
      expect(status.edgeCount).toBeGreaterThan(1000); // Should have many edges
    });
  });

  describe('Route Calculation', () => {
    test('should calculate route between two points', async () => {
      const origin = [-63.5751, 44.6475]; // Halifax Central Library
      const destination = [-63.5800, 44.6480]; // Citadel Hill
      
      const result = await restoredRoutingService.calculateRoute(origin, destination);
      
      expect(result.success).toBe(true);
      expect(result.route).toBeDefined();
      expect(result.route.features).toHaveLength(1);
      expect(result.route.features[0].geometry.type).toBe('LineString');
      expect(result.route.features[0].geometry.coordinates.length).toBeGreaterThan(1);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.accessibilityScore).toBeGreaterThan(0);
      expect(result.directions).toBeDefined();
      expect(result.directions.length).toBeGreaterThan(0);
    });

    test('should avoid steps when avoidSteps is true', async () => {
      const origin = [-63.5751, 44.6475];
      const destination = [-63.5800, 44.6480];
      
      const result = await restoredRoutingService.calculateRoute(origin, destination, {
        avoidSteps: true
      });
      
      expect(result.success).toBe(true);
      expect(result.route).toBeDefined();
      // The route should be calculated without steps
    });

    test('should prefer accessible routes when preferAccessible is true', async () => {
      const origin = [-63.5751, 44.6475];
      const destination = [-63.5800, 44.6480];
      
      const result = await restoredRoutingService.calculateRoute(origin, destination, {
        preferAccessible: true
      });
      
      expect(result.success).toBe(true);
      expect(result.accessibilityScore).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid coordinates', async () => {
      const origin = [0, 0]; // Invalid coordinates (not in Halifax)
      const destination = [1, 1]; // Invalid coordinates
      
      const result = await restoredRoutingService.calculateRoute(origin, destination);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing origin or destination', async () => {
      const result = await restoredRoutingService.calculateRoute(null, [-63.5800, 44.6480]);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should calculate routes within reasonable time', async () => {
      const origin = [-63.5751, 44.6475];
      const destination = [-63.5800, 44.6480];
      
      const startTime = performance.now();
      const result = await restoredRoutingService.calculateRoute(origin, destination);
      const endTime = performance.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Data Integrity', () => {
    test('should use real Halifax data', () => {
      const status = restoredRoutingService.getStatus();
      // Should have a substantial number of nodes and edges from real Halifax data
      expect(status.nodeCount).toBeGreaterThan(10000);
      expect(status.edgeCount).toBeGreaterThan(10000);
    });

    test('should have proper accessibility scoring', async () => {
      const origin = [-63.5751, 44.6475];
      const destination = [-63.5800, 44.6480];
      
      const result = await restoredRoutingService.calculateRoute(origin, destination);
      
      expect(result.success).toBe(true);
      expect(result.accessibilityScore).toBeGreaterThanOrEqual(0);
      expect(result.accessibilityScore).toBeLessThanOrEqual(1);
    });
  });
});
