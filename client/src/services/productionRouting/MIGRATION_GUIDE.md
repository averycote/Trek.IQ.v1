# Production Routing Service Migration Guide

## Overview

The Production Routing Service consolidates all existing routing functionality into a single, clean, production-ready implementation. This guide helps you migrate from legacy routing services to the new unified system.

## Quick Migration

### Before (Legacy Services)
```javascript
// Multiple different services with different APIs
import hardenedRoutingService from './hardenedRoutingService.js';
import restoredRoutingService from './restoredRoutingService.js';
import unifiedRoutingService from './unifiedRoutingService.js';

// Different initialization patterns
await hardenedRoutingService.initialize();
await restoredRoutingService.initialize();
await unifiedRoutingService.initialize();

// Different method signatures
const result1 = await hardenedRoutingService.calculateRoute(origin, dest);
const result2 = await restoredRoutingService.getRoute(origin, dest);
const result3 = await unifiedRoutingService.findRoute(origin, dest);
```

### After (Production Service)
```javascript
// Single service with consistent API
import productionRoutingService from './productionRouting/ProductionRoutingService.js';
import DataManager from './productionRouting/DataManager.js';

// Consistent initialization
const dataManager = new DataManager();
await dataManager.initialize();
await productionRoutingService.initialize({ dataManager });

// Consistent method signature
const result = await productionRoutingService.calculateRoute(origin, dest, options);
```

## Service Mapping

| Legacy Service | Migration Path | Notes |
|---|---|---|
| `hardenedRoutingService` | `productionRoutingService` | All hardened features included |
| `restoredRoutingService` | `productionRoutingService` + `DataManager` | Real Halifax data via DataManager |
| `unifiedRoutingService` | `productionRoutingService` | AI integration included |
| `enhancedUnifiedRoutingService` | `productionRoutingService` | Performance optimizations included |
| `consolidatedMapboxRoutingService` | `productionRoutingService` | Mapbox integration included |
| `advancedRoutingService` | `productionRoutingService` | A* algorithm included |
| `optimizedRoutingService` | `productionRoutingService` | Spatial indexing included |
| `unifiedAccessibleRoutingService` | `productionRoutingService` | Accessibility features included |
| `routingService` | `productionRoutingService` | Basic routing included |
| `comprehensiveRoutingOrchestrator` | `productionRoutingService` | Orchestration included |

## API Changes

### Route Calculation

**Before:**
```javascript
// Different method names across services
const result1 = await hardenedRoutingService.calculateRoute(origin, dest);
const result2 = await restoredRoutingService.getRoute(origin, dest);
const result3 = await unifiedRoutingService.findRoute(origin, dest);
```

**After:**
```javascript
// Consistent method name
const result = await productionRoutingService.calculateRoute(origin, dest, options);
```

### Configuration

**Before:**
```javascript
// Different configuration patterns
hardenedRoutingService.config.weights = { distance: 0.5 };
restoredRoutingService.setWeights({ distance: 0.5 });
unifiedRoutingService.updateConfig({ weights: { distance: 0.5 } });
```

**After:**
```javascript
// Consistent configuration method
productionRoutingService.updateConfig({
  weights: { distance: 0.5 }
});
```

### Health Status

**Before:**
```javascript
// Different health check methods
const health1 = hardenedRoutingService.getStatus();
const health2 = restoredRoutingService.getHealth();
const health3 = unifiedRoutingService.checkHealth();
```

**After:**
```javascript
// Consistent health check method
const health = productionRoutingService.getHealthStatus();
```

## New Features

### DataManager Integration
```javascript
import DataManager from './productionRouting/DataManager.js';

const dataManager = new DataManager();
await dataManager.initialize();

// Load specific datasets
const travelways = await dataManager.loadDataset('activeTravelways');
const steps = await dataManager.loadDataset('steps');

// Find nearest features
const nearest = dataManager.findNearestFeatures('activeTravelways', [lng, lat], 1000);
```

### Enhanced Evidence Objects
```javascript
const result = await productionRoutingService.calculateRoute(origin, dest);

// Comprehensive evidence with all required fields
const evidence = result.evidence;
console.log('Distance by edges:', evidence.total_distance_m_by_edges);
console.log('Distance by turf:', evidence.total_distance_m_by_turf);
console.log('Route score:', evidence.score);
console.log('Warnings:', evidence.warnings);
```

### Adaptive Learning
```javascript
// Enable adaptive learning
productionRoutingService.setAdaptiveLearning(true, {
  learningRate: 0.1
});

// Learning is automatic and opt-in
```

### Cache Management
```javascript
// Warm cache with common routes
const routePairs = [
  [[-63.5752, 44.6488], [-63.5713, 44.6519]],
  [[-63.5752, 44.6488], [-63.5874, 44.6421]]
];
await productionRoutingService.warmCache(routePairs);
```

## Deprecation Warnings

During the transition period, legacy services will show deprecation warnings:

```
🚨 DEPRECATION WARNING 🚨
Service: hardenedRoutingService
Method: calculateRoute

This service has been deprecated and will be removed in a future version.
Please migrate to ProductionRoutingService for continued support.

Migration path: Use productionRoutingService directly - it includes all hardened features
```

## Testing

Run the migration tests to ensure compatibility:

```bash
npm test -- --testPathPattern=migration.test.js
```

## Performance Benefits

- **Single Service**: Eliminates conflicts between multiple routing services
- **Unified Caching**: Shared cache across all routing operations
- **Optimized Algorithms**: A* pathfinding with configurable heuristics
- **Web Worker Support**: Heavy computations off main thread
- **Spatial Indexing**: Fast nearest neighbor lookups
- **Distance Verification**: Dual verification with turf.js

## Backward Compatibility

The Production Routing Service maintains backward compatibility during the transition:

1. **Legacy wrappers** provide deprecation warnings
2. **Consistent API** across all routing operations
3. **Same data formats** for route results
4. **Evidence objects** with all required fields
5. **Error handling** maintains existing patterns

## Support

For migration assistance:
1. Check the test suite for examples
2. Review the deprecation warnings for specific migration paths
3. Use the DataManager for dataset management
4. Enable adaptive learning for improved performance

## Timeline

- **Phase 1**: Production service available with deprecation warnings
- **Phase 2**: Legacy services show warnings but continue to work
- **Phase 3**: Legacy services removed (future release)

Migrate early to take advantage of the new features and performance improvements!
