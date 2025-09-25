/**
 * Production Routing Module - Single Entry Point
 * 
 * This module provides the new consolidated routing system that replaces
 * all existing routing services with a single, clean implementation.
 */

// Main services
export { default as ProductionRoutingService } from './ProductionRoutingService.js';
export { default as DataManager } from './DataManager.js';
export { default as LegacyRoutingWrapper } from './LegacyRoutingWrapper.js';

// Deprecated service wrappers
export {
  createDeprecatedService,
  deprecatedHardenedRoutingService,
  deprecatedRestoredRoutingService,
  deprecatedUnifiedRoutingService,
  deprecatedEnhancedUnifiedRoutingService,
  deprecatedConsolidatedMapboxRoutingService,
  deprecatedAdvancedRoutingService,
  deprecatedOptimizedRoutingService,
  deprecatedUnifiedAccessibleRoutingService,
  deprecatedRoutingService,
  deprecatedComprehensiveRoutingOrchestrator
} from './LegacyRoutingWrapper.js';

// Default export - main production service
export { default } from './ProductionRoutingService.js';
