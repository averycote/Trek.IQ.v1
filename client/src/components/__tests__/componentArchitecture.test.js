/**
 * Component Architecture Tests
 * 
 * Tests for unified components, state management, and component consolidation
 * across the application.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UnifiedMapComponent from '../unified/UnifiedMapComponent.js';
import UnifiedSearchComponent from '../unified/UnifiedSearchComponent.js';
import useUnifiedState from '../../hooks/useUnifiedState.js';
import componentConsolidationManager from '../unified/ComponentConsolidationManager.js';

// Mock services
jest.mock('../../services/unifiedAPIService.js', () => ({
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

jest.mock('../../services/productionRouting/ProductionRoutingService.js', () => ({
  initialize: jest.fn(),
  calculateRoute: jest.fn()
}));

jest.mock('../../services/performanceOptimizationService.js', () => ({
  trackInterval: jest.fn(),
  trackEventListener: jest.fn(),
  trackCache: jest.fn(),
  getCachedResponse: jest.fn(),
  cacheResponse: jest.fn()
}));

// Mock Leaflet
jest.mock('leaflet', () => ({
  map: jest.fn(() => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn(),
    eachLayer: jest.fn(),
    _layers: new Map(),
    _markers: []
  })),
  tileLayer: jest.fn(() => ({
    addTo: jest.fn()
  })),
  geoJSON: jest.fn(() => ({
    addTo: jest.fn(),
    getBounds: jest.fn(() => ({
      getNorthEast: jest.fn(() => ({ lat: 45, lng: -63 })),
      getSouthWest: jest.fn(() => ({ lat: 44, lng: -64 }))
    }))
  })),
  canvas: jest.fn(() => ({}))
}));

// Mock react-leaflet
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, whenReady, ...props }) => {
    React.useEffect(() => {
      if (whenReady) {
        whenReady({ target: { setView: jest.fn() } });
      }
    }, [whenReady]);
    return <div data-testid="map-container" {...props}>{children}</div>;
  },
  TileLayer: ({ ...props }) => <div data-testid="tile-layer" {...props} />,
  useMap: () => ({
    setView: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    fitBounds: jest.fn()
  }),
  useMapEvents: jest.fn()
}));

describe('UnifiedMapComponent', () => {
  const defaultProps = {
    center: [44.6488, -63.5752],
    zoom: 13,
    height: '100vh',
    width: '100%'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render map container', () => {
      render(<UnifiedMapComponent {...defaultProps} />);
      
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
      expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    });

    test('should render with custom props', () => {
      const customProps = {
        ...defaultProps,
        center: [45.0, -64.0],
        zoom: 15,
        height: '500px',
        width: '800px'
      };
      
      render(<UnifiedMapComponent {...customProps} />);
      
      const mapContainer = screen.getByTestId('map-container');
      expect(mapContainer).toBeInTheDocument();
    });

    test('should render loading indicator initially', () => {
      render(<UnifiedMapComponent {...defaultProps} />);
      
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    test('should render error fallback when error occurs', () => {
      const fallbackComponent = <div>Custom fallback</div>;
      
      render(
        <UnifiedMapComponent 
          {...defaultProps} 
          fallbackComponent={fallbackComponent}
        />
      );
      
      // Simulate error
      const mapComponent = screen.getByRole('application');
      expect(mapComponent).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<UnifiedMapComponent {...defaultProps} />);
      
      const mapElement = screen.getByRole('application');
      expect(mapElement).toHaveAttribute('aria-label', 'Interactive map');
    });

    test('should support high contrast mode', () => {
      render(<UnifiedMapComponent {...defaultProps} highContrast={true} />);
      
      const mapElement = screen.getByRole('application');
      expect(mapElement).toHaveClass('high-contrast');
    });

    test('should support accessibility mode', () => {
      render(<UnifiedMapComponent {...defaultProps} accessibilityMode={true} />);
      
      const mapElement = screen.getByRole('application');
      expect(mapElement).toHaveClass('accessibility-mode');
    });
  });

  describe('Performance', () => {
    test('should track performance metrics', () => {
      render(<UnifiedMapComponent {...defaultProps} />);
      
      // Wait for component to initialize
      waitFor(() => {
        expect(performanceOptimizationService.trackInterval).toHaveBeenCalled();
      });
    });

    test('should show performance metrics in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<UnifiedMapComponent {...defaultProps} />);
      
      // Performance metrics should be visible in development
      waitFor(() => {
        expect(screen.getByText(/Render:/)).toBeInTheDocument();
        expect(screen.getByText(/Layers:/)).toBeInTheDocument();
        expect(screen.getByText(/Markers:/)).toBeInTheDocument();
        expect(screen.getByText(/Memory:/)).toBeInTheDocument();
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Event Handling', () => {
    test('should handle map click events', () => {
      const onMapClick = jest.fn();
      
      render(<UnifiedMapComponent {...defaultProps} onMapClick={onMapClick} />);
      
      // Event handlers should be registered
      waitFor(() => {
        expect(performanceOptimizationService.trackEventListener).toHaveBeenCalledWith(
          expect.any(Object),
          'click',
          onMapClick,
          'UnifiedMapComponent'
        );
      });
    });

    test('should handle map move events', () => {
      const onMapMove = jest.fn();
      
      render(<UnifiedMapComponent {...defaultProps} onMapMove={onMapMove} />);
      
      waitFor(() => {
        expect(performanceOptimizationService.trackEventListener).toHaveBeenCalledWith(
          expect.any(Object),
          'moveend',
          onMapMove,
          'UnifiedMapComponent'
        );
      });
    });

    test('should handle map zoom events', () => {
      const onMapZoom = jest.fn();
      
      render(<UnifiedMapComponent {...defaultProps} onMapZoom={onMapZoom} />);
      
      waitFor(() => {
        expect(performanceOptimizationService.trackEventListener).toHaveBeenCalledWith(
          expect.any(Object),
          'zoomend',
          onMapZoom,
          'UnifiedMapComponent'
        );
      });
    });
  });
});

describe('UnifiedSearchComponent', () => {
  const defaultProps = {
    placeholder: 'Search for places...',
    value: '',
    onChange: jest.fn(),
    onSelect: jest.fn(),
    onClear: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render search input', () => {
      render(<UnifiedSearchComponent {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for places...');
      expect(input).toBeInTheDocument();
    });

    test('should render with custom placeholder', () => {
      const customProps = {
        ...defaultProps,
        placeholder: 'Custom search placeholder'
      };
      
      render(<UnifiedSearchComponent {...customProps} />);
      
      const input = screen.getByPlaceholderText('Custom search placeholder');
      expect(input).toBeInTheDocument();
    });

    test('should render search icon when enabled', () => {
      render(<UnifiedSearchComponent {...defaultProps} showSearchIcon={true} />);
      
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });

    test('should render clear button when value exists', () => {
      render(<UnifiedSearchComponent {...defaultProps} value="test query" />);
      
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    test('should handle input changes', () => {
      const onChange = jest.fn();
      
      render(<UnifiedSearchComponent {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByPlaceholderText('Search for places...');
      fireEvent.change(input, { target: { value: 'test query' } });
      
      expect(onChange).toHaveBeenCalledWith('test query');
    });

    test('should clear search when clear button clicked', () => {
      const onClear = jest.fn();
      
      render(<UnifiedSearchComponent {...defaultProps} value="test" onClear={onClear} />);
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      
      expect(onClear).toHaveBeenCalled();
    });

    test('should show loading indicator during search', () => {
      render(<UnifiedSearchComponent {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for places...');
      fireEvent.change(input, { target: { value: 'test query' } });
      
      // Loading indicator should appear
      waitFor(() => {
        expect(screen.getByRole('search')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<UnifiedSearchComponent {...defaultProps} />);
      
      const searchElement = screen.getByRole('search');
      expect(searchElement).toHaveAttribute('aria-label', 'Search for places');
      
      const input = screen.getByPlaceholderText('Search for places...');
      expect(input).toHaveAttribute('aria-expanded', 'false');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
    });

    test('should support keyboard navigation', () => {
      const onSelect = jest.fn();
      
      render(<UnifiedSearchComponent {...defaultProps} onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for places...');
      
      // Test arrow key navigation
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.keyDown(input, { key: 'Escape' });
      
      // Keyboard navigation should work
      expect(input).toBeInTheDocument();
    });

    test('should support screen reader', () => {
      render(<UnifiedSearchComponent {...defaultProps} screenReaderSupport={true} />);
      
      const screenReaderElement = screen.getByRole('search').querySelector('[aria-live="polite"]');
      expect(screenReaderElement).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should debounce search requests', () => {
      render(<UnifiedSearchComponent {...defaultProps} debounceMs={300} />);
      
      const input = screen.getByPlaceholderText('Search for places...');
      
      // Rapid input changes should be debounced
      fireEvent.change(input, { target: { value: 't' } });
      fireEvent.change(input, { target: { value: 'te' } });
      fireEvent.change(input, { target: { value: 'test' } });
      
      // Only the final value should trigger search
      expect(input.value).toBe('test');
    });

    test('should show performance metrics in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(<UnifiedSearchComponent {...defaultProps} />);
      
      // Performance metrics should be visible in development
      waitFor(() => {
        expect(screen.getByText(/Search:/)).toBeInTheDocument();
        expect(screen.getByText(/Results:/)).toBeInTheDocument();
        expect(screen.getByText(/Cache:/)).toBeInTheDocument();
        expect(screen.getByText(/Total:/)).toBeInTheDocument();
      });
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('useUnifiedState Hook', () => {
  const TestComponent = ({ stateKey, initialState, options }) => {
    const state = useUnifiedState(stateKey, initialState, options);
    
    return (
      <div>
        <div data-testid="state">{JSON.stringify(state.state)}</div>
        <div data-testid="is-dirty">{state.isDirty.toString()}</div>
        <div data-testid="can-undo">{state.canUndo.toString()}</div>
        <div data-testid="can-redo">{state.canRedo.toString()}</div>
        <button 
          data-testid="set-state"
          onClick={() => state.setState({ test: 'updated' })}
        >
          Update State
        </button>
        <button 
          data-testid="undo"
          onClick={state.undo}
        >
          Undo
        </button>
        <button 
          data-testid="redo"
          onClick={state.redo}
        >
          Redo
        </button>
        <button 
          data-testid="reset"
          onClick={state.resetState}
        >
          Reset
        </button>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('State Management', () => {
    test('should initialize with initial state', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      expect(screen.getByTestId('state')).toHaveTextContent('{"test":"initial"}');
      expect(screen.getByTestId('is-dirty')).toHaveTextContent('false');
    });

    test('should update state when setState called', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      const setStateButton = screen.getByTestId('set-state');
      fireEvent.click(setStateButton);
      
      expect(screen.getByTestId('state')).toHaveTextContent('{"test":"updated"}');
      expect(screen.getByTestId('is-dirty')).toHaveTextContent('true');
    });

    test('should reset state when resetState called', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      // Update state first
      const setStateButton = screen.getByTestId('set-state');
      fireEvent.click(setStateButton);
      
      // Then reset
      const resetButton = screen.getByTestId('reset');
      fireEvent.click(resetButton);
      
      expect(screen.getByTestId('state')).toHaveTextContent('{"test":"initial"}');
      expect(screen.getByTestId('is-dirty')).toHaveTextContent('false');
    });
  });

  describe('History Management', () => {
    test('should track state history', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      // Update state to create history
      const setStateButton = screen.getByTestId('set-state');
      fireEvent.click(setStateButton);
      
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
    });

    test('should undo state changes', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      // Update state
      const setStateButton = screen.getByTestId('set-state');
      fireEvent.click(setStateButton);
      
      // Undo
      const undoButton = screen.getByTestId('undo');
      fireEvent.click(undoButton);
      
      expect(screen.getByTestId('state')).toHaveTextContent('{"test":"initial"}');
      expect(screen.getByTestId('can-undo')).toHaveTextContent('false');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('true');
    });

    test('should redo state changes', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      // Update state
      const setStateButton = screen.getByTestId('set-state');
      fireEvent.click(setStateButton);
      
      // Undo
      const undoButton = screen.getByTestId('undo');
      fireEvent.click(undoButton);
      
      // Redo
      const redoButton = screen.getByTestId('redo');
      fireEvent.click(redoButton);
      
      expect(screen.getByTestId('state')).toHaveTextContent('{"test":"updated"}');
      expect(screen.getByTestId('can-undo')).toHaveTextContent('true');
      expect(screen.getByTestId('can-redo')).toHaveTextContent('false');
    });
  });

  describe('Persistence', () => {
    test('should persist state to localStorage', () => {
      const initialState = { test: 'initial' };
      
      render(<TestComponent stateKey="test" initialState={initialState} />);
      
      // Update state
      const setStateButton = screen.getByTestId('set-state');
      fireEvent.click(setStateButton);
      
      // Check localStorage
      const stored = localStorage.getItem('trek-iq-state-test');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored);
      expect(parsed.state).toEqual({ test: 'updated' });
    });

    test('should load persisted state on mount', () => {
      // Set up localStorage
      const persistedState = { test: 'persisted' };
      localStorage.setItem('trek-iq-state-test', JSON.stringify({
        state: persistedState,
        timestamp: Date.now(),
        version: '1.0'
      }));
      
      render(<TestComponent stateKey="test" initialState={{ test: 'initial' }} />);
      
      expect(screen.getByTestId('state')).toHaveTextContent('{"test":"persisted"}');
    });
  });
});

describe('Component Consolidation Manager', () => {
  beforeEach(async () => {
    await componentConsolidationManager.initialize();
  });

  describe('Initialization', () => {
    test('should initialize successfully', () => {
      expect(componentConsolidationManager.isInitialized).toBe(true);
    });

    test('should track consolidation status', () => {
      const status = componentConsolidationManager.getConsolidationStatus();
      expect(status.totalComponents).toBeGreaterThan(0);
      expect(status.deprecatedComponents).toBeGreaterThan(0);
    });
  });

  describe('Deprecation Warnings', () => {
    test('should generate deprecation warnings', () => {
      const warning = componentConsolidationManager.getDeprecationWarning(
        'MapComponent',
        'render'
      );

      expect(warning).toContain('DEPRECATION WARNING');
      expect(warning).toContain('MapComponent');
      expect(warning).toContain('UnifiedMapComponent');
    });

    test('should not show duplicate warnings', () => {
      // First call
      const warning1 = componentConsolidationManager.getDeprecationWarning(
        'MapComponent',
        'render'
      );
      expect(warning1).toBeTruthy();

      // Second call should return null (already shown)
      const warning2 = componentConsolidationManager.getDeprecationWarning(
        'MapComponent',
        'render'
      );
      expect(warning2).toBeNull();
    });

    test('should not warn for non-deprecated components', () => {
      const warning = componentConsolidationManager.getDeprecationWarning(
        'UnifiedMapComponent',
        'render'
      );
      expect(warning).toBeNull();
    });
  });

  describe('Component Mappings', () => {
    test('should have correct component mappings', () => {
      const status = componentConsolidationManager.getConsolidationStatus();
      
      // Check that map components map to UnifiedMapComponent
      expect(componentConsolidationManager.componentMappings.MapComponent.target)
        .toBe('UnifiedMapComponent');
      expect(componentConsolidationManager.componentMappings.EnhancedMapComponent.target)
        .toBe('UnifiedMapComponent');
      
      // Check that search components map to UnifiedSearchComponent
      expect(componentConsolidationManager.componentMappings.SearchPanel.target)
        .toBe('UnifiedSearchComponent');
      expect(componentConsolidationManager.componentMappings.EnhancedSearchPanel.target)
        .toBe('UnifiedSearchComponent');
    });

    test('should have priority-based mappings', () => {
      const mappings = componentConsolidationManager.componentMappings;
      
      // Priority 1 components (critical)
      expect(mappings.MapComponent.priority).toBe(1);
      expect(mappings.SearchPanel.priority).toBe(1);
      
      // Priority 2 components (important)
      expect(mappings.LayersPanel.priority).toBe(2);
      expect(mappings.AccessibilityPanel.priority).toBe(2);
    });
  });

  describe('Migration Recommendations', () => {
    test('should generate migration recommendations', () => {
      const recommendations = componentConsolidationManager.getMigrationRecommendations();
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Check priority structure
      recommendations.forEach(rec => {
        expect(rec.priority).toBeDefined();
        expect(rec.title).toBeDefined();
        expect(rec.components).toBeInstanceOf(Array);
        expect(rec.description).toBeDefined();
      });
    });

    test('should group components by priority', () => {
      const recommendations = componentConsolidationManager.getMigrationRecommendations();
      
      const priorities = recommendations.map(r => r.priority);
      expect(priorities).toEqual([...priorities].sort());
    });
  });

  describe('Migration Progress Tracking', () => {
    test('should track migration progress', () => {
      componentConsolidationManager.trackMigrationProgress(
        'MapComponent',
        'in_progress'
      );

      const status = componentConsolidationManager.getConsolidationStatus();
      expect(status.migrationProgress.MapComponent).toBeDefined();
      expect(status.migrationProgress.MapComponent.status).toBe('in_progress');
    });

    test('should calculate progress percentages', () => {
      componentConsolidationManager.trackMigrationProgress(
        'MapComponent',
        'completed'
      );

      const status = componentConsolidationManager.getConsolidationStatus();
      expect(status.migrationProgress.MapComponent.progress).toBe(100);
    });
  });

  describe('Usage Statistics', () => {
    test('should track usage statistics', () => {
      const stats = componentConsolidationManager.getUsageStatistics();
      
      expect(stats.totalDeprecationWarnings).toBeDefined();
      expect(stats.componentsWithWarnings).toBeDefined();
      expect(stats.migrationProgress).toBeDefined();
      expect(stats.migrationProgress.completed).toBeDefined();
      expect(stats.migrationProgress.inProgress).toBeDefined();
      expect(stats.migrationProgress.notStarted).toBeDefined();
    });
  });

  describe('Migration Report', () => {
    test('should generate migration report', () => {
      const report = componentConsolidationManager.generateMigrationReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.usage).toBeDefined();
      expect(report.nextSteps).toBeDefined();
    });

    test('should include next steps', () => {
      const report = componentConsolidationManager.generateMigrationReport();
      
      expect(report.nextSteps).toBeInstanceOf(Array);
      expect(report.nextSteps.length).toBeGreaterThan(0);
    });
  });
});

describe('Integration Tests', () => {
  test('should work together for component consolidation', async () => {
    // Initialize component consolidation manager
    await componentConsolidationManager.initialize();
    
    // Get deprecation warning
    const warning = componentConsolidationManager.getDeprecationWarning(
      'MapComponent',
      'render'
    );
    
    expect(warning).toContain('UnifiedMapComponent');
    
    // Render unified map component
    render(<UnifiedMapComponent center={[44.6488, -63.5752]} zoom={13} />);
    
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    
    // Check consolidation status
    const status = componentConsolidationManager.getConsolidationStatus();
    expect(status.isInitialized).toBe(true);
    expect(status.totalComponents).toBeGreaterThan(0);
  });
});
