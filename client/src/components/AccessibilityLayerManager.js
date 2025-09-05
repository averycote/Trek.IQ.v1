/**
 * AccessibilityLayerManager Component
 * 
 * This component manages accessibility layers from accessibility.cloud API
 * and integrates them with the map filter system. It handles layer toggling,
 * map bounds updates, and marker management.
 */

import { useEffect, useCallback, useRef } from 'react';
import accessibilityFilterService from '../services/accessibilityFilterService';

const AccessibilityLayerManager = ({ 
  map, 
  activeLayers, 
  onLayerToggle,
  isDarkMode = false 
}) => {
  const lastBoundsRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  // Get accessibility filter types
  const accessibilityFilters = accessibilityFilterService.getFilterTypes();
  const accessibilityFilterIds = Object.keys(accessibilityFilters);

  // Handle layer toggle for accessibility filters
  const handleAccessibilityLayerToggle = useCallback(async (layerId, enabled) => {
    if (!map || !map.isStyleLoaded || !map.isStyleLoaded() || !map.getBounds || !accessibilityFilterIds.includes(layerId)) {
      console.warn(`AccessibilityLayerManager: Map not ready for ${layerId} or layer not supported`);
      return;
    }

    console.log(`🔄 AccessibilityLayerManager: Toggling ${layerId} - ${enabled ? 'ON' : 'OFF'}`);

    try {
      const bounds = map.getBounds();
      await accessibilityFilterService.toggleAccessibilityLayer(map, layerId, enabled, bounds);
    } catch (error) {
      console.error(`❌ AccessibilityLayerManager: Error toggling ${layerId}:`, error);
    }
  }, [map, accessibilityFilterIds]);

  // Update layers when active layers change
  useEffect(() => {
    if (!map) return;

    // Check which accessibility layers are active
    const activeAccessibilityLayers = Array.from(activeLayers).filter(layerId => 
      accessibilityFilterIds.includes(layerId)
    );

    const currentlyActiveLayers = Array.from(accessibilityFilterService.activeLayers.keys());

    // Enable newly activated layers
    activeAccessibilityLayers.forEach(layerId => {
      if (!currentlyActiveLayers.includes(layerId)) {
        handleAccessibilityLayerToggle(layerId, true);
      }
    });

    // Disable deactivated layers
    currentlyActiveLayers.forEach(layerId => {
      if (!activeAccessibilityLayers.includes(layerId)) {
        handleAccessibilityLayerToggle(layerId, false);
      }
    });

  }, [activeLayers, handleAccessibilityLayerToggle, accessibilityFilterIds]);

  // Handle map bounds change with debouncing
  const handleBoundsChange = useCallback(() => {
    if (!map || !map.getBounds || !map.isStyleLoaded || !map.isStyleLoaded()) return;

    const currentBounds = map.getBounds();
    
    // Check if bounds actually changed significantly
    if (lastBoundsRef.current) {
      const lastBounds = lastBoundsRef.current;
      const threshold = 0.001; // Minimum change threshold
      
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

    updateTimeoutRef.current = setTimeout(async () => {
      console.log('🗺️ AccessibilityLayerManager: Map bounds changed, updating layers');
      try {
        await accessibilityFilterService.updateLayersForBounds(map, currentBounds);
      } catch (error) {
        console.error('❌ AccessibilityLayerManager: Error updating layers for bounds:', error);
      }
    }, 1000); // 1 second debounce

  }, [map]);

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
  }, [handleBoundsChange]); // Removed 'map' from dependencies as it's stable

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map) {
        console.log('🧹 AccessibilityLayerManager: Cleaning up on unmount');
        accessibilityFilterService.clearAllLayers(map);
      }
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [map]);

  // Add custom CSS for accessibility popups
  useEffect(() => {
    const styleId = 'accessibility-popup-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .accessibility-popup {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 250px;
      }
      
      .accessibility-popup h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: ${isDarkMode ? '#ffffff' : '#1f2937'};
      }
      
      .accessibility-popup p {
        margin: 0 0 12px 0;
        font-size: 14px;
        line-height: 1.4;
        color: ${isDarkMode ? '#e5e7eb' : '#4b5563'};
      }
      
      .accessibility-popup .popup-footer {
        border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
        padding-top: 8px;
        margin-top: 8px;
      }
      
      .accessibility-popup .popup-footer small {
        font-size: 12px;
        color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
        font-style: italic;
      }

      /* Mapbox popup styling adjustments */
      .mapboxgl-popup-content {
        padding: 12px 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      .mapboxgl-popup-tip {
        border-top-color: ${isDarkMode ? '#374151' : '#ffffff'} !important;
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

  // This component doesn't render anything - it's just for managing layers
  return null;
};

export default AccessibilityLayerManager;
