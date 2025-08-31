import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import mapboxgl from 'mapbox-gl';

const AccessibilityMarkers = ({ map, activeLayers, route }) => {
  const [markers, setMarkers] = useState([]);
  const [markerData, setMarkerData] = useState({
    accessibleParking: [],
    transitStops: [],
    trafficControl: [],
    activeTravelways: []
  });

  // Load GeoJSON data from server and external sources
  const loadMarkerData = useCallback(async () => {
    try {
      const dataTypes = [
        'accessible_parking',
        'transit_stops', 
        'traffic_control',
        'active_travelways',
        'accessible_bathrooms',
        'elevators',
        'ramps',
        'accessible_entrances'
      ];

      const loadedData = {};

      // Load local GeoJSON data
      for (const dataType of dataTypes) {
        try {
          const response = await fetch(`/api/data/${dataType}.geojson`);
          if (response.ok) {
            const data = await response.json();
            loadedData[dataType] = data.features || [];
          } else {
            loadedData[dataType] = [];
          }
        } catch (error) {
          console.warn(`Failed to load ${dataType}:`, error);
          loadedData[dataType] = [];
        }
      }

      // Supplement with OpenStreetMap accessibility data
      try {
        const osmData = await fetchAccessibilityDataFromOSM();
        if (osmData) {
          // Merge OSM data with existing data
          Object.keys(osmData).forEach(key => {
            if (loadedData[key]) {
              loadedData[key] = [...loadedData[key], ...osmData[key]];
            } else {
              loadedData[key] = osmData[key];
            }
          });
        }
      } catch (error) {
        console.warn('Failed to load OSM accessibility data:', error);
      }

      setMarkerData(loadedData);
    } catch (error) {
      console.error('Failed to load marker data:', error);
    }
  }, []);

  // Fetch accessibility data from OpenStreetMap
  const fetchAccessibilityDataFromOSM = async () => {
    try {
      // Example OSM Overpass API query for wheelchair accessibility
      const query = `
        [out:json][timeout:25];
        (
          node["wheelchair"](44.6,-63.6,44.7,-63.5);
          way["wheelchair"](44.6,-63.6,44.7,-63.5);
          relation["wheelchair"](44.6,-63.6,44.7,-63.5);
        );
        out body;
        >;
        out skel qt;
      `;
      
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });
      
      if (response.ok) {
        const data = await response.json();
        return processOSMData(data);
      }
    } catch (error) {
      console.warn('OSM API request failed:', error);
    }
    return null;
  };

  // Process OSM data into our format
  const processOSMData = (osmData) => {
    const processed = {
      accessible_bathrooms: [],
      elevators: [],
      ramps: [],
      accessible_entrances: []
    };

    osmData.elements?.forEach(element => {
      if (element.tags) {
        const feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [element.lon, element.lat]
          },
          properties: {
            name: element.tags.name || 'Accessibility Feature',
            wheelchair: element.tags.wheelchair,
            type: determineOSMType(element.tags),
            source: 'osm'
          }
        };

        const type = determineOSMType(element.tags);
        if (processed[type]) {
          processed[type].push(feature);
        }
      }
    });

    return processed;
  };

  // Determine OSM feature type
  const determineOSMType = (tags) => {
    if (tags.amenity === 'toilets' && tags.wheelchair) {
      return 'accessible_bathrooms';
    } else if (tags.highway === 'elevator' || tags.elevator) {
      return 'elevators';
    } else if (tags.highway === 'steps' && tags.wheelchair === 'no') {
      return 'ramps';
    } else if (tags.entrance && tags.wheelchair) {
      return 'accessible_entrances';
    }
    return 'accessible_entrances';
  };

  // Create futuristic marker elements
  const createMarkerElement = useCallback((type, properties) => {
    const markerEl = document.createElement('div');
    markerEl.className = `accessibility-marker ${type}`;
    
    const icon = getMarkerIcon(type, properties);
    const label = getMarkerLabel(type, properties);
    
    markerEl.innerHTML = `
      <div class="marker-glow"></div>
      <div class="marker-icon">${icon}</div>
      <div class="marker-label">${label}</div>
      <div class="marker-pulse"></div>
    `;

    return markerEl;
  }, []);

  // Get marker icon based on type and properties
  const getMarkerIcon = (type, properties) => {
    switch (type) {
      case 'accessibleParking':
        return '♿';
      case 'transitStops':
        return properties?.wheelchair_accessible ? '🚌♿' : '🚌';
      case 'trafficControl':
        return '🚦';
      case 'activeTravelways':
        return properties?.type === 'sidewalk' ? '🚶' : '🚴';
      case 'accessibleBathrooms':
        return '🚻';
      case 'elevators':
        return '🛗';
      case 'ramps':
        return '🛤️';
      case 'accessibleEntrances':
        return '🚪';
      default:
        return '📍';
    }
  };

  // Get marker label
  const getMarkerLabel = (type, properties) => {
    switch (type) {
      case 'accessibleParking':
        return properties?.name || 'Accessible Parking';
      case 'transitStops':
        return properties?.name || 'Transit Stop';
      case 'trafficControl':
        return properties?.type || 'Traffic Control';
      case 'activeTravelways':
        return properties?.type || 'Active Travelway';
      case 'accessibleBathrooms':
        return properties?.name || 'Accessible Bathroom';
      case 'elevators':
        return properties?.name || 'Elevator';
      case 'ramps':
        return properties?.name || 'Accessible Ramp';
      case 'accessibleEntrances':
        return properties?.name || 'Accessible Entrance';
      default:
        return 'Accessibility Point';
    }
  };

  // Add markers to map
  const addMarkersToMap = useCallback(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    const newMarkers = [];

    // Add markers for each active layer
    Object.entries(markerData).forEach(([dataType, features]) => {
      if (!activeLayers.has(dataType)) return;

      features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        
        const markerEl = createMarkerElement(dataType, feature.properties);
        
        const marker = new mapboxgl.Marker({
          element: markerEl,
          anchor: 'bottom'
        })
        .setLngLat([lng, lat])
        .addTo(map);

        // Add popup with accessibility info
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'accessibility-popup'
        }).setHTML(`
          <div class="popup-content">
            <h4>${getMarkerLabel(dataType, feature.properties)}</h4>
            <div class="accessibility-info">
              ${getAccessibilityInfo(dataType, feature.properties)}
            </div>
          </div>
        `);

        marker.setPopup(popup);
        newMarkers.push(marker);
      });
    });

    setMarkers(newMarkers);
  }, [map, markerData, activeLayers, createMarkerElement]);

  // Get accessibility information for popup
  const getAccessibilityInfo = (type, properties) => {
    switch (type) {
      case 'accessibleParking':
        return `
          <div class="info-item">
            <span class="info-label">Spaces:</span>
            <span class="info-value">${properties?.spaces || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Surface:</span>
            <span class="info-value">${properties?.surface || 'Paved'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value">${properties?.wheelchair === 'yes' ? 'Yes' : 'No'}</span>
          </div>
        `;
      case 'transitStops':
        return `
          <div class="info-item">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value">${properties?.wheelchair_accessible ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Shelter:</span>
            <span class="info-value">${properties?.shelter ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Audio Announcements:</span>
            <span class="info-value">${properties?.audio_announcements ? 'Yes' : 'No'}</span>
          </div>
        `;
      case 'trafficControl':
        return `
          <div class="info-item">
            <span class="info-label">Type:</span>
            <span class="info-value">${properties?.type || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Audio Signal:</span>
            <span class="info-value">${properties?.audio_signal ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Tactile Surface:</span>
            <span class="info-value">${properties?.tactile_surface ? 'Yes' : 'No'}</span>
          </div>
        `;
      case 'activeTravelways':
        return `
          <div class="info-item">
            <span class="info-label">Type:</span>
            <span class="info-value">${properties?.type || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Surface:</span>
            <span class="info-value">${properties?.surface || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value">${properties?.wheelchair === 'yes' ? 'Yes' : 'No'}</span>
          </div>
        `;
      case 'accessibleBathrooms':
        return `
          <div class="info-item">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value">${properties?.wheelchair === 'yes' ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Changing Table:</span>
            <span class="info-value">${properties?.changing_table ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Emergency Call:</span>
            <span class="info-value">${properties?.emergency_call ? 'Yes' : 'No'}</span>
          </div>
        `;
      case 'elevators':
        return `
          <div class="info-item">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value">${properties?.wheelchair === 'yes' ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Audio Announcements:</span>
            <span class="info-value">${properties?.audio_announcements ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Braille Buttons:</span>
            <span class="info-value">${properties?.braille_buttons ? 'Yes' : 'No'}</span>
          </div>
        `;
      case 'ramps':
        return `
          <div class="info-item">
            <span class="info-label">Slope:</span>
            <span class="info-value">${properties?.slope || 'Unknown'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Handrails:</span>
            <span class="info-value">${properties?.handrails ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Surface:</span>
            <span class="info-value">${properties?.surface || 'Unknown'}</span>
          </div>
        `;
      case 'accessibleEntrances':
        return `
          <div class="info-item">
            <span class="info-label">Wheelchair Accessible:</span>
            <span class="info-value">${properties?.wheelchair === 'yes' ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Automatic Doors:</span>
            <span class="info-value">${properties?.automatic_doors ? 'Yes' : 'No'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Width:</span>
            <span class="info-value">${properties?.width || 'Unknown'}</span>
          </div>
        `;
      default:
        return '<div class="info-item">Accessibility information available</div>';
    }
  };

  // Load data on mount
  useEffect(() => {
    loadMarkerData();
  }, [loadMarkerData]);

  // Update markers when data or active layers change
  useEffect(() => {
    addMarkersToMap();
  }, [addMarkersToMap]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [markers]);

  return null; // This component doesn't render anything visible, it just manages map markers
};

export default AccessibilityMarkers;
