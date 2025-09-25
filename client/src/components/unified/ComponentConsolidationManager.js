/**
 * Component Consolidation Manager
 * 
 * Manages the consolidation of overlapping components into unified implementations.
 * Provides deprecation warnings, migration paths, and gradual component replacement.
 */

import React from 'react';
import performanceOptimizationService from '../../services/performanceOptimizationService.js';

class ComponentConsolidationManager {
  constructor() {
    this.isInitialized = false;
    this.consolidationStatus = new Map();
    this.migrationProgress = new Map();
    this.deprecationWarnings = new Map();
    
    // Component mapping for consolidation
    this.componentMappings = {
      // Map Components → UnifiedMapComponent
      'MapComponent': {
        target: 'UnifiedMapComponent',
        migrationPath: 'Use UnifiedMapComponent with unified map rendering',
        priority: 1,
        deprecated: true
      },
      'EnhancedMapComponent': {
        target: 'UnifiedMapComponent',
        migrationPath: 'Use UnifiedMapComponent with enhanced features',
        priority: 1,
        deprecated: true
      },
      'OptimizedMapComponent': {
        target: 'UnifiedMapComponent',
        migrationPath: 'Use UnifiedMapComponent with performance optimizations',
        priority: 1,
        deprecated: true
      },
      'BasicMapComponent': {
        target: 'UnifiedMapComponent',
        migrationPath: 'Use UnifiedMapComponent with basic features',
        priority: 1,
        deprecated: true
      },
      'MapCanvas': {
        target: 'UnifiedMapComponent',
        migrationPath: 'Use UnifiedMapComponent with canvas rendering',
        priority: 1,
        deprecated: true
      },
      
      // Search Components → UnifiedSearchComponent
      'SearchPanel': {
        target: 'UnifiedSearchComponent',
        migrationPath: 'Use UnifiedSearchComponent with unified search interface',
        priority: 1,
        deprecated: true
      },
      'EnhancedSearchPanel': {
        target: 'UnifiedSearchComponent',
        migrationPath: 'Use UnifiedSearchComponent with enhanced search features',
        priority: 1,
        deprecated: true
      },
      'SearchBar': {
        target: 'UnifiedSearchComponent',
        migrationPath: 'Use UnifiedSearchComponent with search bar interface',
        priority: 1,
        deprecated: true
      },
      
      // Layer Panel Components → UnifiedLayerPanel
      'LayersPanel': {
        target: 'UnifiedLayerPanel',
        migrationPath: 'Use UnifiedLayerPanel with unified layer management',
        priority: 2,
        deprecated: true
      },
      'SimplifiedLayersPanel': {
        target: 'UnifiedLayerPanel',
        migrationPath: 'Use UnifiedLayerPanel with simplified interface',
        priority: 2,
        deprecated: true
      },
      'FiltersLayersPanel': {
        target: 'UnifiedLayerPanel',
        migrationPath: 'Use UnifiedLayerPanel with filter capabilities',
        priority: 2,
        deprecated: true
      },
      
      // Route Panel Components → UnifiedRoutePanel
      'UnifiedRoutePanel': {
        target: 'UnifiedRoutePanel',
        migrationPath: 'Use UnifiedRoutePanel (already unified)',
        priority: 1,
        deprecated: false
      },
      'EnhancedUnifiedRoutePanel': {
        target: 'UnifiedRoutePanel',
        migrationPath: 'Use UnifiedRoutePanel with enhanced features',
        priority: 1,
        deprecated: true
      },
      'RouteDetailsPanel': {
        target: 'UnifiedRoutePanel',
        migrationPath: 'Use UnifiedRoutePanel with route details',
        priority: 2,
        deprecated: true
      },
      
      // Accessibility Components → UnifiedAccessibilityComponent
      'AccessibilityLayerManager': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with layer management',
        priority: 2,
        deprecated: true
      },
      'AccessibilityHeatmap': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with heatmap features',
        priority: 2,
        deprecated: true
      },
      'AccessibilityMarkers': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with marker management',
        priority: 2,
        deprecated: true
      },
      'AccessibilityPanel': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with panel interface',
        priority: 2,
        deprecated: true
      },
      'AccessibilityProfile': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with profile features',
        priority: 2,
        deprecated: true
      },
      'AccessibilitySettings': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with settings',
        priority: 2,
        deprecated: true
      },
      'AccessibilityConfidenceScore': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with confidence scoring',
        priority: 2,
        deprecated: true
      },
      'EnhancedAccessibilityLayer': {
        target: 'UnifiedAccessibilityComponent',
        migrationPath: 'Use UnifiedAccessibilityComponent with enhanced layer',
        priority: 2,
        deprecated: true
      },
      
      // Barrier Components → UnifiedBarrierComponent
      'BarrierAlert': {
        target: 'UnifiedBarrierComponent',
        migrationPath: 'Use UnifiedBarrierComponent with alert functionality',
        priority: 2,
        deprecated: true
      },
      'EnhancedBarrierAlert': {
        target: 'UnifiedBarrierComponent',
        migrationPath: 'Use UnifiedBarrierComponent with enhanced alerts',
        priority: 2,
        deprecated: true
      },
      'LiabilityBarrierAlert': {
        target: 'UnifiedBarrierComponent',
        migrationPath: 'Use UnifiedBarrierComponent with liability features',
        priority: 2,
        deprecated: true
      },
      'BarrierReportFAB': {
        target: 'UnifiedBarrierComponent',
        migrationPath: 'Use UnifiedBarrierComponent with FAB interface',
        priority: 2,
        deprecated: true
      },
      
      // Navigation Components → UnifiedNavigationComponent
      'NavigationMode': {
        target: 'UnifiedNavigationComponent',
        migrationPath: 'Use UnifiedNavigationComponent with navigation mode',
        priority: 2,
        deprecated: true
      },
      'MobileNavigationPanel': {
        target: 'UnifiedNavigationComponent',
        migrationPath: 'Use UnifiedNavigationComponent with mobile interface',
        priority: 2,
        deprecated: true
      },
      'NavigationIntegration': {
        target: 'UnifiedNavigationComponent',
        migrationPath: 'Use UnifiedNavigationComponent with integration features',
        priority: 2,
        deprecated: true
      }
    };
    
    // Components to keep (not deprecated)
    this.keepComponents = [
      'UnifiedMapComponent',
      'UnifiedSearchComponent',
      'UnifiedLayerPanel',
      'UnifiedRoutePanel',
      'UnifiedAccessibilityComponent',
      'UnifiedBarrierComponent',
      'UnifiedNavigationComponent',
      'AppShell',
      'TopBar',
      'SideMenu',
      'FabCluster',
      'LoadingSpinner',
      'ErrorBoundary',
      'TransitInfo',
      'SystemStatusPanel',
      'ReportBarrierModal',
      'UserAuthModal',
      'AdminAuthModal',
      'AdminDashboard',
      'AdminPanel',
      'MunicipalDashboard',
      'GamificationPanel',
      'SafetyFeatures',
      'SeasonalAdaptation',
      'MapPerformanceMonitor',
      'MapTroubleshootingGuide',
      'PageWrapper',
      'ProfileSettings',
      'ModeSelector',
      'BottomDrawer',
      'AdvancedRoutingDemo',
      'RouteDemo',
      'RouteStep',
      'HeatmapLayer',
      'HeatmapLegend',
      'LayerControl',
      'EnhancedLayerControl',
      'SmartLayerControl',
      'WheelmapLayer',
      'WheelmapLayerManager',
      'TransitLogo',
      'LoadingState'
    ];
  }

  /**
   * Initialize the component consolidation manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🔄 Initializing Component Consolidation Manager...');
    
    // Track consolidation status
    this._trackConsolidationStatus();
    
    this.isInitialized = true;
    console.log('✅ Component Consolidation Manager initialized');
  }

  /**
   * Get deprecation warning for a component
   * @param {string} componentName - Component name
   * @param {string} propName - Prop being used
   * @returns {string} Deprecation warning message
   */
  getDeprecationWarning(componentName, propName = 'unknown') {
    const mapping = this.componentMappings[componentName];
    if (!mapping || !mapping.deprecated) {
      return null;
    }
    
    const warningKey = `${componentName}:${propName}`;
    if (this.deprecationWarnings.has(warningKey)) {
      return null; // Already shown
    }
    
    this.deprecationWarnings.set(warningKey, true);
    
    return `
🚨 DEPRECATION WARNING 🚨
Component: ${componentName}
Prop: ${propName}

This component has been deprecated and will be removed in a future version.
Please migrate to ${mapping.target} for continued support.

Migration path: ${mapping.migrationPath}

Example:
  import ${mapping.target} from './unified/${mapping.target}.js';
  // Use the new component according to the migration path above
    `;
  }

  /**
   * Create a deprecated component wrapper
   * @param {string} componentName - Component name
   * @param {React.Component} componentInstance - Component instance
   * @returns {React.Component} Wrapped component with deprecation warnings
   */
  createDeprecatedWrapper(componentName, componentInstance) {
    const mapping = this.componentMappings[componentName];
    if (!mapping || !mapping.deprecated) {
      return componentInstance;
    }
    
    return React.forwardRef((props, ref) => {
      // Show deprecation warning
      const warning = this.getDeprecationWarning(componentName, 'render');
      if (warning) {
        console.warn(warning);
      }
      
      // Track component usage
      performanceOptimizationService.trackCache(
        `component_${componentName}`,
        { props, timestamp: Date.now() },
        'ComponentConsolidationManager'
      );
      
      return React.createElement(componentInstance, { ...props, ref });
    });
  }

  /**
   * Get consolidation status
   * @returns {Object} Consolidation status
   */
  getConsolidationStatus() {
    return {
      isInitialized: this.isInitialized,
      totalComponents: Object.keys(this.componentMappings).length,
      deprecatedComponents: Object.values(this.componentMappings).filter(m => m.deprecated).length,
      migrationProgress: Object.fromEntries(this.migrationProgress),
      consolidationStatus: Object.fromEntries(this.consolidationStatus),
      targetComponents: {
        UnifiedMapComponent: 'Consolidates all map components',
        UnifiedSearchComponent: 'Consolidates all search components',
        UnifiedLayerPanel: 'Consolidates all layer panel components',
        UnifiedRoutePanel: 'Consolidates all route panel components',
        UnifiedAccessibilityComponent: 'Consolidates all accessibility components',
        UnifiedBarrierComponent: 'Consolidates all barrier components',
        UnifiedNavigationComponent: 'Consolidates all navigation components'
      }
    };
  }

  /**
   * Get migration recommendations
   * @returns {Array} Array of migration recommendations
   */
  getMigrationRecommendations() {
    const recommendations = [];
    
    // Group by priority
    const byPriority = {};
    Object.entries(this.componentMappings).forEach(([component, mapping]) => {
      if (!byPriority[mapping.priority]) {
        byPriority[mapping.priority] = [];
      }
      byPriority[mapping.priority].push({ component, ...mapping });
    });
    
    // Generate recommendations by priority
    Object.keys(byPriority).sort().forEach(priority => {
      const components = byPriority[priority];
      recommendations.push({
        priority: parseInt(priority),
        title: `Priority ${priority} Components`,
        components: components.map(c => ({
          name: c.component,
          target: c.target,
          migrationPath: c.migrationPath
        })),
        description: this._getPriorityDescription(priority)
      });
    });
    
    return recommendations;
  }

  /**
   * Track migration progress
   * @param {string} componentName - Component name
   * @param {string} status - Migration status
   */
  trackMigrationProgress(componentName, status) {
    this.migrationProgress.set(componentName, {
      status,
      timestamp: new Date().toISOString(),
      progress: this._calculateProgress(componentName, status)
    });
  }

  /**
   * Get component usage statistics
   * @returns {Object} Usage statistics
   */
  getUsageStatistics() {
    const stats = {
      totalDeprecationWarnings: this.deprecationWarnings.size,
      componentsWithWarnings: new Set(Array.from(this.deprecationWarnings.keys())
        .map(key => key.split(':')[0])).size,
      migrationProgress: {
        completed: 0,
        inProgress: 0,
        notStarted: 0
      }
    };
    
    // Calculate migration progress
    Object.values(this.migrationProgress).forEach(progress => {
      switch (progress.status) {
        case 'completed':
          stats.migrationProgress.completed++;
          break;
        case 'in_progress':
          stats.migrationProgress.inProgress++;
          break;
        default:
          stats.migrationProgress.notStarted++;
      }
    });
    
    return stats;
  }

  /**
   * Generate migration report
   * @returns {Object} Migration report
   */
  generateMigrationReport() {
    const status = this.getConsolidationStatus();
    const recommendations = this.getMigrationRecommendations();
    const usage = this.getUsageStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: status.totalComponents,
        deprecatedComponents: status.deprecatedComponents,
        targetComponents: Object.keys(status.targetComponents).length,
        migrationProgress: usage.migrationProgress
      },
      recommendations,
      usage,
      nextSteps: this._generateNextSteps(recommendations, usage)
    };
  }

  // Private methods

  _trackConsolidationStatus() {
    Object.keys(this.componentMappings).forEach(componentName => {
      this.consolidationStatus.set(componentName, {
        status: this.componentMappings[componentName].deprecated ? 'deprecated' : 'active',
        target: this.componentMappings[componentName].target,
        priority: this.componentMappings[componentName].priority,
        lastChecked: new Date().toISOString()
      });
    });
  }

  _getPriorityDescription(priority) {
    const descriptions = {
      1: 'Critical components that should be migrated immediately',
      2: 'Important components that should be migrated soon',
      3: 'Optional components that can be migrated later'
    };
    
    return descriptions[priority] || 'Components to be migrated';
  }

  _calculateProgress(componentName, status) {
    const mapping = this.componentMappings[componentName];
    if (!mapping) return 0;
    
    switch (status) {
      case 'completed':
        return 100;
      case 'in_progress':
        return 50;
      case 'planned':
        return 25;
      default:
        return 0;
    }
  }

  _generateNextSteps(recommendations, usage) {
    const nextSteps = [];
    
    if (usage.migrationProgress.notStarted > 0) {
      nextSteps.push('Start migrating Priority 1 components immediately');
    }
    
    if (usage.migrationProgress.inProgress > 0) {
      nextSteps.push('Complete in-progress component migrations');
    }
    
    if (usage.totalDeprecationWarnings > 0) {
      nextSteps.push('Address deprecation warnings in components');
    }
    
    if (recommendations.length > 0) {
      nextSteps.push('Follow migration recommendations by priority');
    }
    
    return nextSteps;
  }
}

// Export singleton instance
const componentConsolidationManager = new ComponentConsolidationManager();
export default componentConsolidationManager;
