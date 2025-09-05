/**
 * WheelmapLayerManager Component
 * 
 * This component manages Wheelmap layers and integrates them with the map 
 * filter system. It handles layer toggling, map bounds updates, marker 
 * management, and detailed popups for Wheelmap POIs.
 */

import { useEffect, useCallback, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import wheelmapApiService from '../services/wheelmapApiService';

const WheelmapLayerManager = ({ 
  map, 
  activeLayers, 
  onLayerToggle,
  isDarkMode = false 
}) => {
  const lastBoundsRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const activeWheelmapLayers = useRef(new Map()); // Track active Wheelmap layers
  const layerSources = useRef(new Map()); // Track Mapbox sources

  // Get Wheelmap filter types
  const wheelmapCategories = wheelmapApiService.getAccessibilityCategories();
  const wheelmapFilterIds = [
    'wheelmap_parking',
    'wheelmap_toilets', 
    'wheelmap_food',
    'wheelmap_shopping',
    'wheelmap_accommodation',
    'wheelmap_leisure'
  ];

  /**
   * Map filter IDs to Wheelmap categories
   */
  const getWheelmapCategory = (layerId) => {
    const mapping = {
      'wheelmap_parking': 'parking',
      'wheelmap_toilets': 'toilets',
      'wheelmap_food': 'food',
      'wheelmap_shopping': 'shopping',
      'wheelmap_accommodation': 'accommodation',
      'wheelmap_leisure': 'leisure'
    };
    return mapping[layerId];
  };

  /**
   * Handle layer toggle for Wheelmap filters
   */
  const handleWheelmapLayerToggle = useCallback(async (layerId, enabled) => {
    if (!map || !wheelmapFilterIds.includes(layerId)) {
      return;
    }

    console.log(`🔄 WheelmapLayerManager: Toggling ${layerId} - ${enabled ? 'ON' : 'OFF'}`);

    try {
      const mapboxBounds = map.getBounds();
      console.log('🗺️ WheelmapLayerManager: Raw Mapbox bounds:', mapboxBounds);

      // Convert Mapbox GL JS LngLatBounds to bbox object for API
      const bounds = {
        west: mapboxBounds.getWest(),
        south: mapboxBounds.getSouth(),
        east: mapboxBounds.getEast(),
        north: mapboxBounds.getNorth()
      };

      console.log('📦 WheelmapLayerManager: Converted bbox:', bounds);
      await toggleWheelmapLayer(map, layerId, enabled, bounds);
    } catch (error) {
      console.error(`❌ WheelmapLayerManager: Error toggling ${layerId}:`, error);
    }
  }, [map, wheelmapFilterIds]);

  /**
   * Toggle Wheelmap layer on/off
   */
  const toggleWheelmapLayer = async (map, layerId, enabled, bounds) => {
    // Ensure map is properly initialized with all required methods
    if (!map || !map.isStyleLoaded || !map.isStyleLoaded() || !map.getLayer || !map.getSource || !map.addSource || !map.addLayer) {
      console.warn(`WheelmapLayerManager: Map not ready for ${layerId} - missing required methods`);
      return;
    }

    const mapboxLayerId = `wheelmap-${layerId}`;
    const sourceId = `wheelmap-source-${layerId}`;
    const category = getWheelmapCategory(layerId);

    if (enabled) {
      // Fetch data and add layer
      console.log(`🔄 WheelmapLayerManager: Enabling ${layerId} layer`);
      
      const result = await wheelmapApiService.searchAccessiblePlaces(bounds, { 
        category: category,
        limit: 100,
        wheelchair: 'yes' // Only show accessible places
      });
      const features = result.places || [];
      
      if (features.length === 0) {
        console.log(`📍 WheelmapLayerManager: No data found for ${layerId}`);
        return;
      }

      // Convert to GeoJSON format
      const geojsonData = {
        type: 'FeatureCollection',
        features: features.map(feature => createMarkerForPOI(feature, layerId))
      };

      // Remove existing layer if it exists
      try {
        if (map.getLayer && map.getLayer(mapboxLayerId)) {
          map.removeLayer(mapboxLayerId);
        }
      } catch (error) {
        // Layer doesn't exist, continue
      }
      
      try {
        if (map.getSource && map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (error) {
        // Source doesn't exist, continue
      }

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });

      // Add layer with custom styling
      const categoryConfig = wheelmapCategories[category];
      map.addLayer({
        id: mapboxLayerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 6,
            18, 14
          ],
          'circle-color': categoryConfig.color,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-opacity': 0.9
        }
      });

      // Add click handler for detailed popups
      map.on('click', mapboxLayerId, async (e) => {
        const feature = e.features[0];
        const coordinates = e.lngLat;
        const nodeId = feature.properties.id;

        // Show loading popup first
        const loadingPopup = new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setHTML(`
            <div class="wheelmap-popup">
              <div class="flex items-center gap-2">
                <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading details...</span>
              </div>
            </div>
          `)
          .addTo(map);

        try {
          // Fetch detailed information
          const details = await wheelmapApiService.getPlaceDetails(nodeId);
          
          if (details) {
            // Update popup with detailed information
            loadingPopup.setHTML(generateDetailedPopupContent(details, categoryConfig));
          } else {
            loadingPopup.setHTML(`
              <div class="wheelmap-popup">
                <h4>${categoryConfig.icon} ${feature.properties.name}</h4>
                <p>Unable to load detailed information</p>
              </div>
            `);
          }
        } catch (error) {
          console.error('Error loading place details:', error);
          loadingPopup.setHTML(`
            <div class="wheelmap-popup">
              <h4>${categoryConfig.icon} ${feature.properties.name}</h4>
              <p>Error loading details</p>
            </div>
          `);
        }
      });

      // Change cursor on hover
      map.on('mouseenter', mapboxLayerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', mapboxLayerId, () => {
        map.getCanvas().style.cursor = '';
      });

      // Track active layer
      activeWheelmapLayers.current.set(layerId, mapboxLayerId);
      layerSources.current.set(layerId, sourceId);

      console.log(`✅ WheelmapLayerManager: Added ${features.length} markers for ${layerId}`);

    } else {
      // Remove layer
      console.log(`🔄 WheelmapLayerManager: Disabling ${layerId} layer`);

      try {
        if (map.getLayer && map.getLayer(mapboxLayerId)) {
          map.removeLayer(mapboxLayerId);
        }
      } catch (error) {
        // Layer doesn't exist, continue
      }
      
      try {
        if (map.getSource && map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      } catch (error) {
        // Source doesn't exist, continue
      }

      // Remove from tracking
      activeWheelmapLayers.current.delete(layerId);
      layerSources.current.delete(layerId);

      console.log(`✅ WheelmapLayerManager: Removed ${layerId} layer`);
    }
  };

  /**
   * Create a Mapbox GL JS marker for a POI
   */
  const createMarkerForPOI = (poi, layerId) => {
    const category = getWheelmapCategory(layerId);
    const categoryConfig = wheelmapCategories[category];
    
    // Handle both local API format and external API format
    const geometry = poi.geometry || {
      type: 'Point',
      coordinates: poi.coordinates
    };
    
    const properties = poi.properties || {
      name: poi.name?.en || poi.name || 'Unknown',
      wheelchair: poi.wheelchair || 'unknown',
      category: poi.category || category
    };
    
    return {
      type: 'Feature',
      geometry: geometry,
      properties: {
        ...properties,
        layerId: layerId,
        category: category,
        markerColor: categoryConfig.color,
        markerIcon: categoryConfig.icon,
        title: properties.name || categoryConfig.name,
        accessibility: properties.wheelchair || 'unknown'
      }
    };
  };

  /**
   * Generate detailed popup content for a POI
   */
  const generateDetailedPopupContent = (details, categoryConfig) => {
    const accessibilityIcon = details.accessibility.icon;
    const accessibilityLabel = details.accessibility.label;
    const accessibilityColor = details.accessibility.color;

    return `
      <div class="wheelmap-popup">
        <h4>${categoryConfig.icon} ${details.name}</h4>
        
        <div class="accessibility-status" style="color: ${accessibilityColor}">
          <strong>${accessibilityIcon} ${accessibilityLabel}</strong>
        </div>
        
        ${details.accessibility.description ? `
          <p class="accessibility-description">${details.accessibility.description}</p>
        ` : ''}
        
        ${details.address ? `
          <div class="address">
            <strong>📍 Address:</strong><br>
            ${details.address}
          </div>
        ` : ''}
        
        ${details.contact.phone ? `
          <div class="contact">
            <strong>📞 Phone:</strong> ${details.contact.phone}
          </div>
        ` : ''}
        
        ${details.contact.website ? `
          <div class="contact">
            <strong>🌐 Website:</strong> 
            <a href="${details.contact.website}" target="_blank" rel="noopener noreferrer">Visit</a>
          </div>
        ` : ''}
        
        ${details.details.opening_hours ? `
          <div class="hours">
            <strong>🕒 Hours:</strong> ${details.details.opening_hours}
          </div>
        ` : ''}
        
        ${details.details.cuisine ? `
          <div class="cuisine">
            <strong>🍽️ Cuisine:</strong> ${details.details.cuisine}
          </div>
        ` : ''}
        
        <div class="popup-footer">
          <small>
            Community data from 
            <a href="https://wheelmap.org/nodes/${details.id}" target="_blank" rel="noopener noreferrer">
              Wheelmap.org
            </a>
          </small>
        </div>
      </div>
    `;
  };

  // Update layers when active layers change
  useEffect(() => {
    if (!map) return;

    // Check which Wheelmap layers are active
    const activeWheelmapFilters = Array.from(activeLayers).filter(layerId => 
      wheelmapFilterIds.includes(layerId)
    );

    const currentlyActiveLayers = Array.from(activeWheelmapLayers.current.keys());

    // Enable newly activated layers
    activeWheelmapFilters.forEach(layerId => {
      if (!currentlyActiveLayers.includes(layerId)) {
        handleWheelmapLayerToggle(layerId, true);
      }
    });

    // Disable deactivated layers
    currentlyActiveLayers.forEach(layerId => {
      if (!activeWheelmapFilters.includes(layerId)) {
        handleWheelmapLayerToggle(layerId, false);
      }
    });

  }, [activeLayers, handleWheelmapLayerToggle, wheelmapFilterIds]);

  // Handle map bounds change with debouncing
  const handleBoundsChange = useCallback(() => {
    if (!map) return;

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
      console.log('🗺️ WheelmapLayerManager: Map bounds changed, updating layers');
      try {
        const activeWheelmapFilters = Array.from(activeLayers).filter(layerId => 
          wheelmapFilterIds.includes(layerId)
        );

        // Update each active layer
        for (const layerId of activeWheelmapFilters) {
          await toggleWheelmapLayer(map, layerId, true, currentBounds);
        }
      } catch (error) {
        console.error('❌ WheelmapLayerManager: Error updating layers for bounds:', error);
      }
    }, 1500); // 1.5 second debounce (longer than accessibility.cloud to avoid conflicts)

  }, [activeLayers, wheelmapFilterIds]);

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
      if (map) {
        console.log('🧹 WheelmapLayerManager: Cleaning up on unmount');
        
        // Remove all Wheelmap layers
        for (const [layerId, mapboxLayerId] of activeWheelmapLayers.current.entries()) {
          const sourceId = layerSources.current.get(layerId);
          
          try {
            if (map.getLayer && map.getLayer(mapboxLayerId)) {
              map.removeLayer(mapboxLayerId);
            }
          } catch (error) {
            // Layer doesn't exist, continue
          }
          
          try {
            if (map.getSource && map.getSource(sourceId)) {
              map.removeSource(sourceId);
            }
          } catch (error) {
            // Source doesn't exist, continue
          }
        }

        activeWheelmapLayers.current.clear();
        layerSources.current.clear();
      }
      
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [map]);

  // Add custom CSS for Wheelmap popups
  useEffect(() => {
    const styleId = 'wheelmap-popup-styles';
    
    // Check if styles already exist
    if (document.getElementById(styleId)) {
      return;
    }

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .wheelmap-popup {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 280px;
        line-height: 1.4;
      }
      
      .wheelmap-popup h4 {
        margin: 0 0 8px 0;
        font-size: 16px;
        font-weight: 600;
        color: ${isDarkMode ? '#ffffff' : '#1f2937'};
      }
      
      .wheelmap-popup .accessibility-status {
        margin-bottom: 8px;
        padding: 4px 8px;
        border-radius: 4px;
        background-color: ${isDarkMode ? '#374151' : '#f3f4f6'};
        font-size: 14px;
        font-weight: 500;
      }
      
      .wheelmap-popup .accessibility-description {
        margin: 0 0 12px 0;
        font-size: 13px;
        color: ${isDarkMode ? '#d1d5db' : '#4b5563'};
        font-style: italic;
      }
      
      .wheelmap-popup .address,
      .wheelmap-popup .contact,
      .wheelmap-popup .hours,
      .wheelmap-popup .cuisine {
        margin-bottom: 6px;
        font-size: 13px;
        color: ${isDarkMode ? '#e5e7eb' : '#374151'};
      }
      
      .wheelmap-popup .address strong,
      .wheelmap-popup .contact strong,
      .wheelmap-popup .hours strong,
      .wheelmap-popup .cuisine strong {
        color: ${isDarkMode ? '#f9fafb' : '#111827'};
      }
      
      .wheelmap-popup a {
        color: ${isDarkMode ? '#60a5fa' : '#2563eb'};
        text-decoration: none;
      }
      
      .wheelmap-popup a:hover {
        text-decoration: underline;
      }
      
      .wheelmap-popup .popup-footer {
        border-top: 1px solid ${isDarkMode ? '#374151' : '#e5e7eb'};
        padding-top: 8px;
        margin-top: 12px;
        text-align: center;
      }
      
      .wheelmap-popup .popup-footer small {
        font-size: 11px;
        color: ${isDarkMode ? '#9ca3af' : '#6b7280'};
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

export default WheelmapLayerManager;
