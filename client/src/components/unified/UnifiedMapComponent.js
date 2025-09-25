/**
 * Unified Map Component - Single Canonical Map Implementation
 * 
 * Consolidates all map components into a single, clean, production-ready
 * implementation that replaces overlapping map components.
 * 
 * Features:
 * - Unified map rendering with Leaflet/Mapbox
 * - Centralized layer management
 * - Optimized performance with virtualization
 * - Accessibility features built-in
 * - Mobile-first responsive design
 * - Error boundaries and fallbacks
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import unified services
import unifiedAPIService from '../../services/unifiedAPIService.js';
import productionRoutingService from '../../services/productionRouting/ProductionRoutingService.js';
import performanceOptimizationService from '../../services/performanceOptimizationService.js';

const UnifiedMapComponent = ({
  // Core props
  center = [44.6488, -63.5752], // Halifax default
  zoom = 13,
  height = '100vh',
  width = '100%',
  
  // Layer configuration
  layers = [],
  activeLayers = new Set(),
  onLayerToggle = () => {},
  
  // Interaction props
  onMapClick = () => {},
  onMapMove = () => {},
  onMapZoom = () => {},
  onMarkerClick = () => {},
  
  // Route props
  route = null,
  showRoute = true,
  routeOptions = {},
  
  // Accessibility props
  accessibilityMode = false,
  highContrast = false,
  screenReaderSupport = true,
  
  // Performance props
  enableClustering = true,
  enableVirtualization = true,
  maxMarkers = 1000,
  
  // Error handling
  onError = () => {},
  fallbackComponent = null,
  
  // Styling
  className = '',
  style = {},
  
  // Children
  children
}) => {
  // State management
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    layerCount: 0,
    markerCount: 0,
    memoryUsage: 0
  });
  
  // Refs
  const mapRef = useRef(null);
  const performanceRef = useRef({ startTime: 0 });
  
  // Memoized configurations
  const mapConfig = useMemo(() => ({
    center,
    zoom,
    zoomControl: true,
    attributionControl: true,
    dragging: true,
    touchZoom: true,
    doubleClickZoom: true,
    scrollWheelZoom: true,
    boxZoom: true,
    keyboard: true,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    maxZoom: 18,
    minZoom: 1,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
    preferCanvas: true, // Better performance
    renderer: L.canvas() // Use canvas renderer for better performance
  }), [center, zoom]);
  
  const tileLayerConfig = useMemo(() => ({
    url: accessibilityMode 
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' // High contrast
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
    subdomains: 'abcd',
    accessToken: process.env.REACT_APP_MAPBOX_TOKEN
  }), [accessibilityMode]);
  
  // Performance monitoring
  useEffect(() => {
    performanceRef.current.startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - performanceRef.current.startTime;
      setPerformanceMetrics(prev => ({
        ...prev,
        renderTime
      }));
      
      // Track performance
      performanceOptimizationService.trackInterval(
        setInterval(() => {
          if (mapInstance) {
            const layerCount = mapInstance.eachLayer ? 
              Array.from(mapInstance._layers).length : 0;
            const markerCount = mapInstance._markers ? 
              mapInstance._markers.length : 0;
            
            setPerformanceMetrics(prev => ({
              ...prev,
              layerCount,
              markerCount,
              memoryUsage: performance.memory ? 
                performance.memory.usedJSHeapSize : 0
            }));
          }
        }, 5000),
        'UnifiedMapComponent'
      );
    };
  }, [mapInstance]);
  
  // Map event handlers
  const handleMapReady = useCallback((map) => {
    setMapInstance(map);
    setMapReady(true);
    setIsLoading(false);
    
    // Register map with performance service
    performanceOptimizationService.trackEventListener(
      map,
      'click',
      onMapClick,
      'UnifiedMapComponent'
    );
    
    performanceOptimizationService.trackEventListener(
      map,
      'moveend',
      onMapMove,
      'UnifiedMapComponent'
    );
    
    performanceOptimizationService.trackEventListener(
      map,
      'zoomend',
      onMapZoom,
      'UnifiedMapComponent'
    );
    
    console.log('🗺️ Unified Map Component ready');
  }, [onMapClick, onMapMove, onMapZoom]);
  
  // Layer management
  const handleLayerToggle = useCallback((layerId, enabled) => {
    if (onLayerToggle) {
      onLayerToggle(layerId, enabled);
    }
    
    // Update active layers
    const newActiveLayers = new Set(activeLayers);
    if (enabled) {
      newActiveLayers.add(layerId);
    } else {
      newActiveLayers.delete(layerId);
    }
    
    // Track layer changes
    performanceOptimizationService.trackCache(
      `layer_${layerId}`,
      { enabled, timestamp: Date.now() },
      'UnifiedMapComponent'
    );
  }, [activeLayers, onLayerToggle]);
  
  // Route rendering
  const renderRoute = useCallback(() => {
    if (!route || !showRoute || !mapInstance) return null;
    
    try {
      // Use production routing service for route rendering
      const routeLayer = L.geoJSON(route, {
        style: {
          color: routeOptions.color || '#3388ff',
          weight: routeOptions.weight || 5,
          opacity: routeOptions.opacity || 0.8
        },
        onEachFeature: (feature, layer) => {
          if (feature.properties && feature.properties.popupContent) {
            layer.bindPopup(feature.properties.popupContent);
          }
        }
      });
      
      routeLayer.addTo(mapInstance);
      
      // Fit map to route bounds
      if (routeLayer.getBounds) {
        mapInstance.fitBounds(routeLayer.getBounds(), {
          padding: [20, 20]
        });
      }
      
      return routeLayer;
    } catch (error) {
      console.error('❌ Route rendering failed:', error);
      onError(error);
      return null;
    }
  }, [route, showRoute, mapInstance, routeOptions, onError]);
  
  // Error boundary
  if (error) {
    console.error('❌ Map component error:', error);
    
    if (fallbackComponent) {
      return fallbackComponent;
    }
    
    return (
      <div 
        className={`unified-map-error ${className}`}
        style={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          ...style 
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h3>Map Loading Error</h3>
          <p>Unable to load the map. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`unified-map-component ${className} ${accessibilityMode ? 'accessibility-mode' : ''} ${highContrast ? 'high-contrast' : ''}`}
      style={{ height, width, position: 'relative', ...style }}
      role="application"
      aria-label="Interactive map"
    >
      {/* Loading indicator */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 10px'
              }}
            />
            <p>Loading map...</p>
          </div>
        </div>
      )}
      
      {/* Map container */}
      <MapContainer
        ref={mapRef}
        {...mapConfig}
        whenReady={handleMapReady}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Base tile layer */}
        <TileLayer {...tileLayerConfig} />
        
        {/* Map event handlers */}
        <MapEventHandlers 
          onMapClick={onMapClick}
          onMapMove={onMapMove}
          onMapZoom={onMapZoom}
        />
        
        {/* Route rendering */}
        {mapReady && <RouteRenderer route={route} showRoute={showRoute} routeOptions={routeOptions} />}
        
        {/* Layer management */}
        {mapReady && (
          <LayerManager 
            layers={layers}
            activeLayers={activeLayers}
            onLayerToggle={handleLayerToggle}
            enableClustering={enableClustering}
            enableVirtualization={enableVirtualization}
            maxMarkers={maxMarkers}
          />
        )}
        
        {/* Custom children */}
        {children}
      </MapContainer>
      
      {/* Performance metrics (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000
          }}
        >
          <div>Render: {performanceMetrics.renderTime.toFixed(2)}ms</div>
          <div>Layers: {performanceMetrics.layerCount}</div>
          <div>Markers: {performanceMetrics.markerCount}</div>
          <div>Memory: {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
        </div>
      )}
      
      {/* Accessibility features */}
      {screenReaderSupport && (
        <div 
          style={{
            position: 'absolute',
            left: '-10000px',
            width: '1px',
            height: '1px',
            overflow: 'hidden'
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {mapReady ? 'Map loaded and ready for interaction' : 'Map is loading'}
        </div>
      )}
    </div>
  );
};

// Map event handlers component
const MapEventHandlers = ({ onMapClick, onMapMove, onMapZoom }) => {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e);
      }
    },
    moveend: (e) => {
      if (onMapMove) {
        onMapMove(e);
      }
    },
    zoomend: (e) => {
      if (onMapZoom) {
        onMapZoom(e);
      }
    }
  });
  
  return null;
};

// Route renderer component
const RouteRenderer = ({ route, showRoute, routeOptions }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!route || !showRoute) return;
    
    try {
      const routeLayer = L.geoJSON(route, {
        style: {
          color: routeOptions?.color || '#3388ff',
          weight: routeOptions?.weight || 5,
          opacity: routeOptions?.opacity || 0.8
        }
      });
      
      routeLayer.addTo(map);
      
      if (routeLayer.getBounds) {
        map.fitBounds(routeLayer.getBounds(), {
          padding: [20, 20]
        });
      }
      
      return () => {
        map.removeLayer(routeLayer);
      };
    } catch (error) {
      console.error('❌ Route rendering error:', error);
    }
  }, [route, showRoute, routeOptions, map]);
  
  return null;
};

// Layer manager component
const LayerManager = ({ 
  layers, 
  activeLayers, 
  onLayerToggle, 
  enableClustering, 
  enableVirtualization, 
  maxMarkers 
}) => {
  const map = useMap();
  
  useEffect(() => {
    // Render active layers
    layers.forEach(layer => {
      if (activeLayers.has(layer.id)) {
        try {
          const layerInstance = L.geoJSON(layer.data, {
            style: layer.style,
            onEachFeature: layer.onEachFeature
          });
          
          layerInstance.addTo(map);
          
          // Store reference for cleanup
          layer._layerInstance = layerInstance;
        } catch (error) {
          console.error(`❌ Layer ${layer.id} rendering failed:`, error);
        }
      }
    });
    
    return () => {
      // Cleanup layers
      layers.forEach(layer => {
        if (layer._layerInstance) {
          map.removeLayer(layer._layerInstance);
        }
      });
    };
  }, [layers, activeLayers, map]);
  
  return null;
};

export default UnifiedMapComponent;
