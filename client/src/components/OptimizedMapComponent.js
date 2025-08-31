import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import HeatmapLayer from './HeatmapLayer';
import performanceService from '../services/performanceService';

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZWxpdmpxMzBpOWQyanE0Z2p2YWRicjIifQ.fQzZ_KDIxILvcV471Z3EjQ';

const OptimizedMapComponent = ({
  origin,
  destination,
  route,
  activeLayers = [],
  isDarkMode = false,
  barriers = [],
  isReportingMode = false,
  selectedLocation = null,
  onMapClick,
  onBarrierClick,
  predictedBarriers = [],
  accessibilityData = [],
  isHeatmapVisible = false,
  routeMode = 'walking',
  onMapLoad,
  // Performance options
  enableClustering = true,
  enableCaching = true,
  enableLazyLoading = true,
  maxFeaturesPerLayer = 1000,
  simplifyTolerance = 0.0001
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [loadingLayers, setLoadingLayers] = useState(new Set());
  const [mapInitialized, setMapInitialized] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState(new Set());

  // Halifax center coordinates - memoized to prevent dependency changes
  const HALIFAX_CENTER = useMemo(() => [-63.5756, 44.6475], []);

  // Layer cache to avoid re-fetching
  const layerCache = useRef(new Map());
  
  // Performance optimizations
  const layerLoadQueue = useRef([]);
  const isProcessingQueue = useRef(false);
  const debounceTimer = useRef(null);
  const lastViewport = useRef(null);

  // Get layer styling with performance optimizations
  const getLayerStyle = useCallback((layerName, isDark) => {
    const baseStyle = {
      paint: {
        'circle-radius': 6,
        'circle-color': '#ff0000',
        'circle-opacity': 0.8,
        'circle-stroke-width': 2,
        'circle-stroke-color': isDark ? '#ffffff' : '#000000'
      },
      layout: {
        visibility: 'visible'
      }
    };

    const layerStyles = {
      accessible_parking: {
        paint: {
          'circle-radius': 8,
          'circle-color': '#00ff00',
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': isDark ? '#ffffff' : '#000000'
        }
      },
      steps: {
        paint: {
          'circle-radius': 6,
          'circle-color': '#ff6600',
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': isDark ? '#ffffff' : '#000000'
        }
      },
      sidewalk_closures: {
        paint: {
          'circle-radius': 7,
          'circle-color': '#ff0000',
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': isDark ? '#ffffff' : '#000000'
        }
      }
    };

    return layerStyles[layerName] || baseStyle;
  }, []);

  // Get popup content with memoization
  const getPopupContent = useCallback((layerName, feature) => {
    const properties = feature.properties || {};
    
    switch (layerName) {
      case 'accessible_parking':
        return `
          <div class="popup-content">
            <h3>🚗 Accessible Parking</h3>
            <p><strong>Location:</strong> ${properties.address || 'Unknown'}</p>
            <p><strong>Spaces:</strong> ${properties.spaces || 'Unknown'}</p>
            <p><strong>Accessibility:</strong> ${properties.accessibility || 'Standard'}</p>
          </div>
        `;
      case 'steps':
        return `
          <div class="popup-content">
            <h3>🪜 Steps</h3>
            <p><strong>Location:</strong> ${properties.address || 'Unknown'}</p>
            <p><strong>Type:</strong> ${properties.type || 'Standard'}</p>
            <p><strong>Accessibility:</strong> ${properties.accessibility || 'Limited'}</p>
          </div>
        `;
      case 'sidewalk_closures':
        return `
          <div class="popup-content">
            <h3>🚧 Sidewalk Closure</h3>
            <p><strong>Location:</strong> ${properties.address || 'Unknown'}</p>
            <p><strong>Reason:</strong> ${properties.reason || 'Unknown'}</p>
            <p><strong>Duration:</strong> ${properties.duration || 'Unknown'}</p>
          </div>
        `;
      default:
        return `
          <div class="popup-content">
            <h3>📍 ${layerName.replace(/_/g, ' ').toUpperCase()}</h3>
            <p><strong>Location:</strong> ${properties.address || properties.name || 'Unknown'}</p>
            ${properties.description ? `<p><strong>Description:</strong> ${properties.description}</p>` : ''}
          </div>
        `;
    }
  }, []);

  // Bounds comparison helper
  const boundsEqual = useCallback((bounds1, bounds2) => {
    return bounds1.getWest() === bounds2.getWest() &&
           bounds1.getEast() === bounds2.getEast() &&
           bounds1.getNorth() === bounds2.getNorth() &&
           bounds1.getSouth() === bounds2.getSouth();
  }, []);

  // Get layer configuration
  const getLayerConfig = useCallback((layerName) => {
    const configs = {
      accessible_parking: { minZoom: 12, maxZoom: 18, priority: 'high' },
      steps: { minZoom: 14, maxZoom: 18, priority: 'critical' },
      sidewalk_closures: { minZoom: 13, maxZoom: 18, priority: 'critical' },
      transit_stops: { minZoom: 12, maxZoom: 18, priority: 'medium' },
      public_washrooms: { minZoom: 13, maxZoom: 18, priority: 'medium' }
    };
    return configs[layerName] || { minZoom: 10, maxZoom: 18, priority: 'normal' };
  }, []);

  // Check if layer is in bounds (simplified check)
  const isLayerInBounds = useCallback((layerName, bounds) => {
    // For now, assume all layers are in bounds
    // In a real implementation, you'd check against layer bounds
    return true;
  }, []);

  // Update visible layers based on viewport
  const updateVisibleLayers = useCallback(() => {
    if (!map.current || !enableLazyLoading) return;

    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();
    
    // Only load layers that are in viewport and at appropriate zoom level
    const layersToLoad = activeLayers.filter(layerName => {
      const layerConfig = getLayerConfig(layerName);
      return layerConfig && 
             zoom >= layerConfig.minZoom && 
             zoom <= layerConfig.maxZoom &&
             isLayerInBounds(layerName, bounds);
    });

    setVisibleLayers(new Set(layersToLoad));
  }, [activeLayers, enableLazyLoading, getLayerConfig, isLayerInBounds]);

  // Initialize map with performance optimizations
  useEffect(() => {
    if (map.current || mapInitialized) return;

    const initializeMap = async () => {
      try {
        const startTime = performance.now();
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: isDarkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
          center: HALIFAX_CENTER,
          zoom: 12,
          maxZoom: 18,
          minZoom: 10,
          // Performance optimizations
          preserveDrawingBuffer: false,
          antialias: false,
          attributionControl: false,
          // Reduce tile loading
          maxPitch: 60,
          maxBounds: [
            [-63.8, 44.5], // Southwest
            [-63.4, 44.8]  // Northeast
          ],
          // Additional performance settings
          fadeDuration: 0,
          crossSourceCollisions: false,
          localIdeographFontFamily: false
        });

        // Performance event listeners
        map.current.on('load', () => {
          const loadTime = performance.now() - startTime;
          performanceService.recordMetric('map_load_time', loadTime);
          setMapInitialized(true);
          onMapLoad?.();
        });

        map.current.on('error', (e) => {
          console.error('Map error:', e);
          setMapError('Failed to load map');
        });

        // Optimize viewport changes
        map.current.on('moveend', () => {
          if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
          }
          
          debounceTimer.current = setTimeout(() => {
            const currentViewport = map.current.getBounds();
            if (!lastViewport.current || !boundsEqual(lastViewport.current, currentViewport)) {
              lastViewport.current = currentViewport;
              updateVisibleLayers();
            }
          }, 100);
        });

        // Memory cleanup
        map.current.on('remove', () => {
          if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
          }
          layerCache.current.clear();
        });

      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError('Failed to initialize map');
      }
    };

    initializeMap();
  }, [isDarkMode, mapInitialized, onMapLoad, boundsEqual, updateVisibleLayers]);

  // Load layer data with caching
  const loadLayerData = useCallback(async (layerName) => {
    const cacheKey = `layer_${layerName}`;
    
    return await performanceService.getCachedData(
      cacheKey,
      async () => {
        const response = await fetch(`/api/data/${getLayerFileName(layerName)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      },
      {
        ttl: 10 * 60 * 1000, // 10 minutes
        priority: getLayerConfig(layerName).priority,
        useIndexedDB: enableCaching
      }
    );
  }, [enableCaching, getLayerConfig]);

  // Get layer filename
  const getLayerFileName = useCallback((layerName) => {
    const fileMap = {
      'accessible_parking': 'Accessible_Parking.geojson',
      'steps': 'Steps_577353981712784942.geojson',
      'sidewalk_closures': 'Sidewalk%20Closures.geojson',
      'transit_stops': 'Bus_Stops_2_9086297843420881686.geojson',
      'public_washrooms': 'HRM_Public_Washrooms_8937353538278970153.geojson'
    };
    return fileMap[layerName] || `${layerName}.geojson`;
  }, []);

  // Process layer loading queue
  const processLayerQueue = useCallback(async () => {
    if (isProcessingQueue.current || layerLoadQueue.current.length === 0) return;

    isProcessingQueue.current = true;
    const startTime = performance.now();

    try {
      // Process layers in batches for better performance
      const batchSize = 3;
      const batches = [];
      
      for (let i = 0; i < layerLoadQueue.current.length; i += batchSize) {
        batches.push(layerLoadQueue.current.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (layerName) => {
          try {
            setLoadingLayers(prev => new Set([...prev, layerName]));
            
            const data = await loadLayerData(layerName);
            if (data) {
              // Optimize GeoJSON data
              const optimizedData = performanceService.optimizeGeoJSON(data, {
                maxFeatures: maxFeaturesPerLayer,
                simplifyTolerance,
                enableClustering
              });
              
              layerCache.current.set(layerName, optimizedData);
              addLayerToMap(layerName, optimizedData);
            }
          } catch (error) {
            console.error(`Failed to load layer ${layerName}:`, error);
          } finally {
            setLoadingLayers(prev => {
              const newSet = new Set(prev);
              newSet.delete(layerName);
              return newSet;
            });
          }
        });

        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const totalTime = performance.now() - startTime;
      performanceService.recordMetric('layer_load_time', totalTime);

    } finally {
      isProcessingQueue.current = false;
      layerLoadQueue.current = [];
    }
  }, [maxFeaturesPerLayer, simplifyTolerance, enableClustering, loadLayerData]);

  // Load layers with performance optimizations
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const layersToLoad = enableLazyLoading ? Array.from(visibleLayers) : activeLayers;
    
    // Queue layer loading for better performance
    layerLoadQueue.current = layersToLoad.filter(layerName => 
      !layerCache.current.has(layerName) && !loadingLayers.has(layerName)
    );

    if (layerLoadQueue.current.length > 0 && !isProcessingQueue.current) {
      processLayerQueue();
    }
  }, [visibleLayers, activeLayers, enableLazyLoading, loadingLayers, processLayerQueue]);

  // Add layer to map with error handling and performance optimizations
  const addLayerToMap = useCallback((layerName, data) => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const layerId = `layer-${layerName}`;
    const sourceId = `source-${layerName}`;

    try {
      // Remove existing layer if it exists
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      // Only add layer if there's data
      if (data && data.features && data.features.length > 0) {
        // Add source with clustering if enabled
        const sourceConfig = {
          type: 'geojson',
          data: data
        };

        if (enableClustering && data.features.length > 50) {
          sourceConfig.cluster = true;
          sourceConfig.clusterMaxZoom = 16;
          sourceConfig.clusterRadius = 50;
        }

        map.current.addSource(sourceId, sourceConfig);

        // Add layer with styling
        const style = getLayerStyle(layerName, isDarkMode);
        map.current.addLayer({
          id: layerId,
          type: 'circle',
          source: sourceId,
          ...style
        }, map.current.getLayer('poi-label') ? 'poi-label' : undefined);

        // Add popup on click with debouncing
        let popupTimeout;
        map.current.on('click', layerId, (e) => {
          if (popupTimeout) clearTimeout(popupTimeout);
          
          popupTimeout = setTimeout(() => {
            const features = map.current.queryRenderedFeatures(e.point, { layers: [layerId] });
            if (features.length > 0) {
              const feature = features[0];
              new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(getPopupContent(layerName, feature))
                .addTo(map.current);
            }
          }, 100);
        });
      }
    } catch (error) {
      console.error(`Error adding layer ${layerName}:`, error);
    }
  }, [isDarkMode, getLayerStyle, getPopupContent, enableClustering]);

  // Update route with performance optimizations
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !route) return;

    const updateRoute = () => {
      try {
        const routeId = 'route-line';
        const routeSourceId = 'route-source';

        // Remove existing route
        if (map.current.getLayer(routeId)) {
          map.current.removeLayer(routeId);
        }
        if (map.current.getSource(routeSourceId)) {
          map.current.removeSource(routeSourceId);
        }

        // Validate route data structure
        let routeData = route;
        
        // Check if route is already a FeatureCollection
        if (routeData.type === 'FeatureCollection' && routeData.features && Array.isArray(routeData.features)) {
          // Route is already valid
        }
        // Check if route is a single Feature
        else if (routeData.type === 'Feature' && routeData.geometry) {
          routeData = {
            type: 'FeatureCollection',
            features: [routeData]
          };
        }
        // Check if route has geometry property directly
        else if (routeData.geometry) {
          routeData = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              properties: routeData.properties || {},
              geometry: routeData.geometry
            }]
          };
        }
        // Check if route has features array but wrong type
        else if (routeData.features && Array.isArray(routeData.features)) {
          routeData = {
            type: 'FeatureCollection',
            features: routeData.features
          };
        }
        else {
          console.error('Cannot determine route data structure:', routeData);
          return;
        }

        // Validate that we have valid geometry
        if (!routeData.features || routeData.features.length === 0) {
          console.error('No features found in route data');
          return;
        }

        const firstFeature = routeData.features[0];
        if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
          console.error('No valid geometry found in route feature:', firstFeature);
          return;
        }

        // Add route source
        map.current.addSource(routeSourceId, {
          type: 'geojson',
          data: routeData
        });

        // Add route layer
        map.current.addLayer({
          id: routeId,
          type: 'line',
          source: routeSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
            visibility: 'visible'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 8,
            'line-opacity': 1.0
          }
        }, map.current.getLayer('poi-label') ? 'poi-label' : undefined);

        // Fit map to route bounds with performance optimization
        if (routeData.features && routeData.features.length > 0) {
          const coordinates = routeData.features[0].geometry.coordinates;
          
          if (coordinates && coordinates.length > 0) {
            const bounds = coordinates.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
            
            map.current.fitBounds(bounds, {
              padding: 50,
              duration: 1000,
              maxZoom: 16 // Prevent excessive zooming
            });
          }
        }
      } catch (error) {
        console.error('Error updating route:', error);
      }
    };

    // Debounce route updates
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(updateRoute, 100);
  }, [route, mapInitialized]);

  // Add origin and destination markers with performance optimizations
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const updateMarkers = () => {
      try {
        // Remove existing markers efficiently
        const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
        existingMarkers.forEach(marker => marker.remove());

        // Add origin marker
        if (origin && origin.coordinates) {
          new mapboxgl.Marker({ color: '#10b981' })
            .setLngLat(origin.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML('<div><strong>Origin</strong><br/>' + (origin.name || 'Starting point') + '</div>'))
            .addTo(map.current);
        }

        // Add destination marker
        if (destination && destination.coordinates) {
          new mapboxgl.Marker({ color: '#ef4444' })
            .setLngLat(destination.coordinates)
            .setPopup(new mapboxgl.Popup().setHTML('<div><strong>Destination</strong><br/>' + (destination.name || 'End point') + '</div>'))
            .addTo(map.current);
        }
      } catch (error) {
        console.error('Error adding markers:', error);
      }
    };

    // Debounce marker updates
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(updateMarkers, 100);
  }, [origin, destination]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  return (
    <div className="enhanced-map-container">
      <div ref={mapContainer} className="map-container" />
      
      {/* Error message */}
      {mapError && (
        <div className="map-error-overlay">
          <div className="error-message">
            <h3>Map Error</h3>
            <p>{mapError}</p>
            <button onClick={() => window.location.reload()}>Reload Page</button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {loadingLayers.size > 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            Loading layers: {Array.from(loadingLayers).join(', ')}
          </div>
        </div>
      )}

      {/* Heatmap layer */}
      {isHeatmapVisible && (
        <HeatmapLayer
          barriers={barriers}
          predictedBarriers={predictedBarriers}
          accessibilityData={accessibilityData}
          isVisible={isHeatmapVisible}
          isDarkMode={isDarkMode}
          map={map.current}
        />
      )}
    </div>
  );
};

export default OptimizedMapComponent;
