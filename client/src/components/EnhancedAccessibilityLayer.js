/**
 * Enhanced Accessibility Layer
 * 
 * Combines Wheelmap community data with comprehensive Overpass API OpenStreetMap data
 * to provide the richest possible accessibility information
 */

import React, { useState, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import wheelmapApiService from '../services/wheelmapApiService';
import overpassApiService from '../services/overpassApiService';

const EnhancedAccessibilityLayer = ({ 
  isVisible, 
  map, 
  bounds, 
  onLayerToggle, 
  isDarkMode = false,
  isMobile = false,
  dataSource = 'combined' // 'wheelmap', 'overpass', or 'combined'
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wheelmapData, setWheelmapData] = useState(null);
  const [overpassData, setOverpassData] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    category: 'all',
    accessibility: 'yes',
    dataSource: 'combined'
  });

  // Load enhanced accessibility data when layer becomes visible
  useEffect(() => {
    if (isVisible && map && bounds) {
      loadEnhancedAccessibilityData();
    } else if (!isVisible) {
      clearMarkers();
    }
  }, [isVisible, map, bounds, selectedFilters]);

  /**
   * Load combined accessibility data from multiple sources
   */
  const loadEnhancedAccessibilityData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🚀 Enhanced Accessibility Layer: Loading comprehensive data...');
      
      // Convert Mapbox bounds to standard format
      const bbox = {
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast()
      };

      const promises = [];

      // Load Wheelmap data if requested
      if (dataSource === 'wheelmap' || dataSource === 'combined') {
        promises.push(
          wheelmapApiService.searchAccessiblePlaces(bbox, {
            category: selectedFilters.category,
            wheelchair: selectedFilters.accessibility
          }).then(data => ({ source: 'wheelmap', data }))
        );
      }

      // Load Overpass data if requested
      if (dataSource === 'overpass' || dataSource === 'combined') {
        promises.push(
          overpassApiService.getAccessibilityData(bbox)
            .then(data => ({ source: 'overpass', data }))
        );
      }

      const results = await Promise.allSettled(promises);
      
      let wheelmapResult = null;
      let overpassResult = null;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.source === 'wheelmap') {
            wheelmapResult = result.value.data;
          } else if (result.value.source === 'overpass') {
            overpassResult = result.value.data;
          }
        } else {
          console.warn(`Failed to load ${result.reason}`);
        }
      });

      setWheelmapData(wheelmapResult);
      setOverpassData(overpassResult);

      // Combine and display data
      const combinedData = combineAccessibilityData(wheelmapResult, overpassResult);
      await displayEnhancedMarkers(combinedData);

      console.log('✅ Enhanced Accessibility Layer: Data loaded successfully');
      console.log(`📊 Wheelmap: ${wheelmapResult?.places?.length || 0} places`);
      console.log(`📊 Overpass: ${overpassResult?.elements?.length || 0} elements`);
      
    } catch (error) {
      console.error('❌ Enhanced Accessibility Layer: Failed to load data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Combine data from multiple sources, removing duplicates and enhancing information
   */
  const combineAccessibilityData = (wheelmapResult, overpassResult) => {
    const combined = [];
    const seenLocations = new Map(); // Track locations to avoid duplicates

    // Add Wheelmap data
    if (wheelmapResult?.places) {
      wheelmapResult.places.forEach(place => {
        const key = `${place.geometry.coordinates[1].toFixed(5)},${place.geometry.coordinates[0].toFixed(5)}`;
        
        combined.push({
          id: `wheelmap_${place.properties.originalId || place.id}`,
          source: 'wheelmap',
          lat: place.geometry.coordinates[1],
          lng: place.geometry.coordinates[0],
          name: place.properties.name,
          category: place.properties.category,
          wheelchair: place.properties.wheelchair,
          tags: place.properties,
          confidence: 'high', // Wheelmap has community verification
          data_quality: 'community_verified'
        });
        
        seenLocations.set(key, true);
      });
    }

    // Add Overpass data (avoiding duplicates)
    if (overpassResult?.elements) {
      overpassResult.elements.forEach(element => {
        const lat = element.lat || (element.center && element.center.lat);
        const lng = element.lon || (element.center && element.center.lon);
        
        if (!lat || !lng) return;
        
        const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
        
        // Skip if we already have data for this location
        if (seenLocations.has(key)) return;
        
        const tags = element.tags || {};
        
        combined.push({
          id: `overpass_${element.type}_${element.id}`,
          source: 'overpass',
          lat: lat,
          lng: lng,
          name: tags.name || tags.amenity || tags.building || 'Unnamed',
          category: tags.amenity || tags.building || tags.public_transport || 'other',
          wheelchair: tags.wheelchair,
          tags: tags,
          confidence: tags.wheelchair ? 'medium' : 'low',
          data_quality: 'osm_tagged'
        });
        
        seenLocations.set(key, true);
      });
    }

    return combined;
  };

  /**
   * Display enhanced markers on the map
   */
  const displayEnhancedMarkers = async (data) => {
    if (!map || !data.length) return;

    // Clear existing markers
    clearMarkers();

    const newMarkers = [];

    data.forEach(place => {
      // Create enhanced marker with multiple data sources
      const markerElement = createEnhancedMarker(place);
      
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'bottom'
      })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      // Enhanced popup with combined data
      const popup = createEnhancedPopup(place);
      marker.setPopup(popup);

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);
    console.log(`✅ Enhanced Accessibility Layer: Added ${newMarkers.length} markers to map`);
  };

  /**
   * Create enhanced marker element with data source indicators
   */
  const createEnhancedMarker = (place) => {
    const markerDiv = document.createElement('div');
    markerDiv.className = 'enhanced-accessibility-marker';
    
    // Determine marker style based on accessibility and data source
    let backgroundColor = '#6b7280'; // Default gray
    let borderColor = '#374151';
    let icon = '❓';

    // Color based on accessibility
    if (place.wheelchair === 'yes') {
      backgroundColor = '#10b981'; // Green
      borderColor = '#059669';
      icon = '♿';
    } else if (place.wheelchair === 'limited') {
      backgroundColor = '#f59e0b'; // Yellow
      borderColor = '#d97706';
      icon = '⚠️';
    } else if (place.wheelchair === 'no') {
      backgroundColor = '#ef4444'; // Red
      borderColor = '#dc2626';
      icon = '❌';
    }

    // Add data source indicator
    const sourceIndicator = place.source === 'wheelmap' ? '🌐' : '📍';
    
    markerDiv.innerHTML = `
      <div style="
        background: ${backgroundColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        color: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        position: relative;
      ">
        ${icon}
        <div style="
          position: absolute;
          top: -4px;
          right: -4px;
          background: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        ">
          ${sourceIndicator}
        </div>
      </div>
    `;

    return markerDiv;
  };

  /**
   * Create enhanced popup with combined data
   */
  const createEnhancedPopup = (place) => {
    const accessibilityIcon = place.wheelchair === 'yes' ? '✅' : 
                             place.wheelchair === 'limited' ? '⚠️' : 
                             place.wheelchair === 'no' ? '❌' : '❓';
    
    const sourceLabel = place.source === 'wheelmap' ? 'Wheelmap Community' : 'OpenStreetMap';
    const qualityLabel = place.data_quality === 'community_verified' ? 'Community Verified' : 'OSM Tagged';

    const popupContent = `
      <div style="
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 280px;
        padding: 0;
      ">
        <!-- Trek.IQ Header -->
        <div style="
          background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%);
          color: white;
          padding: 12px 16px;
          margin: -10px -10px 12px -10px;
          border-radius: 8px 8px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="
              background: rgba(255,255,255,0.2);
              border-radius: 4px;
              padding: 4px 6px;
              font-weight: bold;
              font-size: 10px;
            ">TQ</div>
            <div style="font-weight: 600; font-size: 14px;">TREK.IQ</div>
          </div>
          <div style="font-size: 10px; opacity: 0.9;">${sourceLabel}</div>
        </div>

        <!-- Main Content -->
        <div style="padding: 0 4px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
            ${place.name}
          </h3>

          <!-- Category and Accessibility -->
          <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
            <div style="
              background: #f3f4f6;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 12px;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>🏷️</span>
              <span>${place.category.replace('_', ' ')}</span>
            </div>
            <div style="
              background: ${place.wheelchair === 'yes' ? '#dcfce7' : 
                          place.wheelchair === 'limited' ? '#fef3c7' : 
                          place.wheelchair === 'no' ? '#fee2e2' : '#f3f4f6'};
              border: 1px solid ${place.wheelchair === 'yes' ? '#bbf7d0' : 
                                 place.wheelchair === 'limited' ? '#fde68a' : 
                                 place.wheelchair === 'no' ? '#fecaca' : '#d1d5db'};
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 12px;
              display: flex;
              align-items: center;
              gap: 4px;
            ">
              <span>${accessibilityIcon}</span>
              <span>${place.wheelchair === 'yes' ? 'Accessible' : 
                      place.wheelchair === 'limited' ? 'Limited' : 
                      place.wheelchair === 'no' ? 'Not Accessible' : 'Unknown'}</span>
            </div>
          </div>

          <!-- Enhanced OSM Tags (if available) -->
          ${place.tags && Object.keys(place.tags).length > 2 ? `
            <div style="margin-bottom: 12px;">
              <div style="font-weight: 600; font-size: 12px; color: #374151; margin-bottom: 6px;">
                Additional Information
              </div>
              <div style="font-size: 11px; color: #6b7280; line-height: 1.4;">
                ${Object.entries(place.tags)
                  .filter(([key, value]) => 
                    !['name', 'wheelchair', 'amenity', 'building'].includes(key) && 
                    value && 
                    typeof value === 'string' && 
                    value.length < 50
                  )
                  .slice(0, 3)
                  .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
                  .join('<br>')}
              </div>
            </div>
          ` : ''}

          <!-- Data Quality Indicator -->
          <div style="
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            font-size: 10px;
            color: #9ca3af;
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <span>${qualityLabel}</span>
            <span>${place.confidence} confidence</span>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          padding: 8px 16px;
          margin: 12px -10px -10px -10px;
          border-radius: 0 0 8px 8px;
          text-align: center;
        ">
          <a href="${place.source === 'wheelmap' ? 
                    `https://wheelmap.org/nodes/${place.tags.originalId || place.id}` :
                    `https://www.openstreetmap.org/${place.id.split('_')[1]}/${place.id.split('_')[2]}`
                   }" 
             target="_blank" 
             rel="noopener noreferrer"
             style="
               color: #3b82f6;
               text-decoration: none;
               font-size: 11px;
               display: flex;
               align-items: center;
               justify-content: center;
               gap: 4px;
             ">
            <span>🔗</span>
            <span>View on ${place.source === 'wheelmap' ? 'Wheelmap' : 'OpenStreetMap'}</span>
          </a>
        </div>
      </div>
    `;

    return new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px',
      className: 'enhanced-accessibility-popup'
    }).setHTML(popupContent);
  };

  /**
   * Clear all markers from the map
   */
  const clearMarkers = useCallback(() => {
    markers.forEach(marker => marker.remove());
    setMarkers([]);
  }, [markers]);

  // Don't render controls on mobile (handled by layers panel)
  if (!isVisible || isMobile) {
    return null;
  }

  // Desktop controls
  return (
    <div className="enhanced-accessibility-controls" style={{
      position: 'absolute',
      top: '80px',
      right: '20px',
      background: isDarkMode ? '#1f2937' : 'white',
      border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      zIndex: 1000,
      maxWidth: '320px',
      minWidth: '280px'
    }}>
      <h3 style={{
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: isDarkMode ? '#f9fafb' : '#1f2937'
      }}>
        🌟 Enhanced Accessibility
      </h3>

      {/* Data Source Selection */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '600',
          color: isDarkMode ? '#d1d5db' : '#374151',
          marginBottom: '4px'
        }}>
          Data Source:
        </label>
        <select 
          value={selectedFilters.dataSource}
          onChange={(e) => setSelectedFilters(prev => ({ ...prev, dataSource: e.target.value }))}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: `1px solid ${isDarkMode ? '#4b5563' : '#d1d5db'}`,
            background: isDarkMode ? '#374151' : 'white',
            color: isDarkMode ? '#f9fafb' : '#1f2937',
            fontSize: '12px'
          }}
        >
          <option value="combined">🌟 Combined (Wheelmap + OSM)</option>
          <option value="wheelmap">🌐 Wheelmap Community</option>
          <option value="overpass">📍 OpenStreetMap Only</option>
        </select>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div style={{
          padding: '12px',
          background: isDarkMode ? '#374151' : '#f3f4f6',
          borderRadius: '6px',
          textAlign: 'center',
          fontSize: '12px',
          color: isDarkMode ? '#d1d5db' : '#6b7280'
        }}>
          🔄 Loading enhanced accessibility data...
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#dc2626'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results Summary */}
      {!loading && (wheelmapData || overpassData) && (
        <div style={{
          padding: '12px',
          background: isDarkMode ? '#065f46' : '#d1fae5',
          border: `1px solid ${isDarkMode ? '#047857' : '#a7f3d0'}`,
          borderRadius: '6px',
          fontSize: '12px',
          color: isDarkMode ? '#d1fae5' : '#065f46'
        }}>
          ✅ Found {markers.length} accessible places
          <br />
          📊 Wheelmap: {wheelmapData?.places?.length || 0} • OSM: {overpassData?.elements?.length || 0}
        </div>
      )}
    </div>
  );
};

export default EnhancedAccessibilityLayer;
