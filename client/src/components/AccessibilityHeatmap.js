/**
 * AccessibilityHeatmap Component
 * 
 * This component creates a lightweight accessibility heatmap overlay using
 * Wheelmap data. It shows green clusters for areas with many accessible places
 * and red clusters for areas with few/no accessible places.
 */

import { useEffect, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import wheelmapApiService from '../services/wheelmapApiService';

const AccessibilityHeatmap = ({ 
  map, 
  isVisible, 
  isDarkMode = false 
}) => {
  const heatmapLayerId = 'accessibility-heatmap';
  const heatmapSourceId = 'accessibility-heatmap-source';
  const lastBoundsRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  /**
   * Generate and display heatmap
   */
  const generateHeatmap = useCallback(async (bounds) => {
    if (!map || !bounds) return;
    
    // Ensure map is properly initialized with all required methods
    if (!map.isStyleLoaded || !map.isStyleLoaded() || !map.getLayer || !map.getSource || !map.addSource || !map.addLayer) {
      console.warn('AccessibilityHeatmap: Map not ready for heatmap generation - missing required methods');
      return;
    }

    try {
      console.log('🗺️ AccessibilityHeatmap: Generating heatmap for current bounds');

      // Generate heatmap clusters
      const clusters = await wheelmapApiService.generateAccessibilityHeatmap(bounds, 0.008);
      
      if (clusters.length === 0) {
        console.log('📊 AccessibilityHeatmap: No clusters generated');
        return;
      }

      // Create GeoJSON data
      const geojsonData = {
        type: 'FeatureCollection',
        features: clusters
      };

      // Remove existing heatmap if it exists
      try {
        if (map.getLayer && map.getLayer(heatmapLayerId)) {
          map.removeLayer(heatmapLayerId);
        }
      } catch (error) {
        // Layer doesn't exist, continue
      }
      
      try {
        if (map.getSource && map.getSource(heatmapSourceId)) {
          map.removeSource(heatmapSourceId);
        }
      } catch (error) {
        // Source doesn't exist, continue
      }

      // Add source
      map.addSource(heatmapSourceId, {
        type: 'geojson',
        data: geojsonData
      });

      // Add heatmap layer
      map.addLayer({
        id: heatmapLayerId,
        type: 'circle',
        source: heatmapSourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'radius'],
            20, 15,
            100, 40
          ],
          'circle-color': ['get', 'color'],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.6,
            15, 0.4,
            18, 0.2
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': isDarkMode ? '#374151' : '#ffffff',
          'circle-stroke-opacity': 0.8
        }
      });

      // Add click handler for cluster details
      map.on('click', heatmapLayerId, (e) => {
        const feature = e.features[0];
        const coordinates = e.lngLat;
        const properties = feature.properties;

        const accessibilityRatio = Math.round(properties.accessibilityRatio * 100);
        const totalPlaces = properties.count;
        const accessible = properties.accessible;
        const partiallyAccessible = properties.partiallyAccessible;
        const notAccessible = properties.notAccessible;

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div class="accessibility-heatmap-popup">
              <h4>📊 Accessibility Overview</h4>
              <div class="heatmap-stats">
                <div class="stat-row">
                  <span class="stat-label">Accessibility Score:</span>
                  <span class="stat-value" style="color: ${properties.color}">
                    ${accessibilityRatio}%
                  </span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Total Places:</span>
                  <span class="stat-value">${totalPlaces}</span>
                </div>
                <div class="breakdown">
                  <div class="breakdown-item">
                    <span class="breakdown-icon">✅</span>
                    <span class="breakdown-text">Accessible: ${accessible}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-icon">⚠️</span>
                    <span class="breakdown-text">Partial: ${partiallyAccessible}</span>
                  </div>
                  <div class="breakdown-item">
                    <span class="breakdown-icon">❌</span>
                    <span class="breakdown-text">Not Accessible: ${notAccessible}</span>
                  </div>
                </div>
              </div>
              <div class="popup-footer">
                <small>Data from Wheelmap.org</small>
              </div>
            </div>
          `)
          .addTo(map);
      });

      // Change cursor on hover
      map.on('mouseenter', heatmapLayerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', heatmapLayerId, () => {
        map.getCanvas().style.cursor = '';
      });

      console.log(`✅ AccessibilityHeatmap: Generated ${clusters.length} clusters`);

    } catch (error) {
      console.error('❌ AccessibilityHeatmap: Error generating heatmap:', error);
    }
  }, [map, isDarkMode]);

  /**
   * Remove heatmap layer
   */
  const removeHeatmap = useCallback(() => {
    if (!map) return;

    console.log('🧹 AccessibilityHeatmap: Removing heatmap layer');

    try {
      if (map.getLayer && map.getLayer(heatmapLayerId)) {
        map.removeLayer(heatmapLayerId);
      }
    } catch (error) {
      // Layer doesn't exist, continue
    }
    
    try {
      if (map.getSource && map.getSource(heatmapSourceId)) {
        map.removeSource(heatmapSourceId);
      }
    } catch (error) {
      // Source doesn't exist, continue
    }
  }, [map]);

  /**
   * Handle map bounds change with debouncing
   */
  const handleBoundsChange = useCallback(() => {
    if (!map || !isVisible) return;

    const currentBounds = map.getBounds();
    
    // Check if bounds actually changed significantly
    if (lastBoundsRef.current) {
      const lastBounds = lastBoundsRef.current;
      const threshold = 0.002; // Larger threshold for heatmap updates
      
      const latDiff = Math.abs(currentBounds.getNorth() - lastBounds.getNorth());
      const lngDiff = Math.abs(currentBounds.getEast() - lastBounds.getEast());
      
      if (latDiff < threshold && lngDiff < threshold) {
        return; // Bounds haven't changed significantly
      }
    }

    lastBoundsRef.current = currentBounds;

    // Debounce the update to avoid too many API calls
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      generateHeatmap(currentBounds);
    }, 2000); // 2 second debounce for heatmap

  }, [map, isVisible, generateHeatmap]);

  // Handle visibility changes
  useEffect(() => {
    if (!map) return;

    if (isVisible) {
      console.log('🔄 AccessibilityHeatmap: Enabling heatmap');
      const bounds = map.getBounds();
      generateHeatmap(bounds);
    } else {
      console.log('🔄 AccessibilityHeatmap: Disabling heatmap');
      removeHeatmap();
    }
  }, [isVisible, map, generateHeatmap, removeHeatmap]);

  // Set up map event listeners
  useEffect(() => {
    if (!map) return;

    // Listen for map move events
    map.on('moveend', handleBoundsChange);
    map.on('zoomend', handleBoundsChange);

    // Cleanup
    return () => {
      map.off('moveend', handleBoundsChange);
      map.off('zoomend', handleBoundsChange);
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [handleBoundsChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      removeHeatmap();
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [removeHeatmap]);

  // Add custom CSS for heatmap popups
  useEffect(() => {
    const styleId = 'accessibility-heatmap-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .accessibility-heatmap-popup {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 250px;
        line-height: 1.4;
      }
      
      .accessibility-heatmap-popup h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: ${isDarkMode ? '#ffffff' : '#1f2937'};
      }
      
      .heatmap-stats {
        margin-bottom: 12px;
      }
      
      .stat-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 14px;
      }
      
      .stat-label {
        color: ${isDarkMode ? '#d1d5db' : '#4b5563'};
      }
      
      .stat-value {
        font-weight: 600;
        color: ${isDarkMode ? '#ffffff' : '#111827'};
      }
      
      .breakdown {
        border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
        padding-top: 8px;
        margin-top: 8px;
      }
      
      .breakdown-item {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
        font-size: 13px;
        color: ${isDarkMode ? '#e5e7eb' : '#374151'};
      }
      
      .breakdown-icon {
        font-size: 14px;
      }
      
      .popup-footer {
        border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
        padding-top: 8px;
        margin-top: 12px;
        text-align: center;
      }
      
      .popup-footer small {
        font-size: 11px;
        color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
      }
    `;

    document.head.appendChild(style);

    // Cleanup styles on unmount
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [isDarkMode]);

  // This component doesn't render anything - it's just for managing the heatmap
  return null;
};

export default AccessibilityHeatmap;
