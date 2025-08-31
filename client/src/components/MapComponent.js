import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import HeatmapLayer from './HeatmapLayer';

// Set Mapbox access token from environment variable
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZXhsZXB6NzBtNWgybG9lZ3ppYmthcDcifQ.8CEbNWYb5Gnts1NjV6RrTQ';

const MapComponent = ({ 
  origin, 
  destination, 
  route, 
  activeLayers, 
  isDarkMode, 
  barriers = [],
  isReportingMode = false,
  selectedLocation = null,
  onMapClick,
  onBarrierClick,
  predictedBarriers = [],
  accessibilityData = [],
  isHeatmapVisible = false
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [layers, setLayers] = useState({});
  const [loadingLayers, setLoadingLayers] = useState(new Set());
  const [mapInitialized, setMapInitialized] = useState(false);

  // Halifax center coordinates
  const HALIFAX_CENTER = [-63.5756, 44.6475];

  // Layer cache to avoid re-fetching
  const layerCache = useRef(new Map());

  // Initialize Mapbox map
  useEffect(() => {
    if (map.current) return; // Initialize map only once

            map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: isDarkMode 
            ? 'mapbox://styles/mapbox/dark-v11'
            : 'mapbox://styles/mapbox/streets-v12',
          center: HALIFAX_CENTER,
          zoom: 15,
      attributionControl: false
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Add geolocate control
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true
    });
    map.current.addControl(geolocateControl, 'top-right');

    // Handle map click for barrier reporting
    map.current.on('click', (e) => {
      if (isReportingMode) {
        console.log('Map clicked in reporting mode:', e.lngLat);
        onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    });

    // Handle map load
    map.current.on('load', () => {
      setMapInitialized(true);
      console.log('Mapbox map loaded successfully');
    });

    // Handle map style change for dark mode
    map.current.on('styledata', () => {
      if (map.current.isStyleLoaded()) {
        loadActiveLayers();
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map style when dark mode changes
  useEffect(() => {
    if (map.current && mapInitialized) {
      const newStyle = isDarkMode 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/streets-v12';
      
      map.current.setStyle(newStyle);
    }
  }, [isDarkMode, mapInitialized]);

  // Load GeoJSON layers when activeLayers changes
  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    const loadLayers = async () => {
      const layerFiles = {
        'Active Travelways': 'Active_Travelways.geojson',
        'Transit Bus Routes': 'Transit_Bus_Routes.geojson',
        'Traffic Control': 'Traffic_Control.geojson',
        'Street Closures': 'Street_Closures.geojson',
        'Street Junctions': 'Street_Junctions.geojson',
        'Accessible Parking': 'Accessible_Parking.geojson',
        'Steps & Ramps': 'Steps_577353981712784942.geojson',
        'Bus Stops': 'Bus_Stops_2_9086297843420881686.geojson',
        'Transit Shelters': 'Transit_Shelters_1139561051208148127.geojson',
        'Snow Routes': 'Transit_Bus_Snow_Routes_2846831489590635221.geojson',
        'Bike Infrastructure': 'Bike_Infrastructure_and_Suggested_Routes_-8768028288468156838.geojson',
        'Sidewalk Closures': 'Sidewalk Closures.geojson',
        'Street Lights': 'Street_Lights_-8646609400635809433.geojson',
        'Public Washrooms': 'HRM_Public_Washrooms_8937353538278970153.geojson',
        'Civic Addresses': 'CivicAddresses_-5590432719903009914.geojson'
      };

      const newLayers = {};
      const layersToLoad = [];
      
      // Check which layers need to be loaded
      for (const [layerName, fileName] of Object.entries(layerFiles)) {
        if (activeLayers.has(layerName)) {
          if (layerCache.current.has(layerName)) {
            newLayers[layerName] = layerCache.current.get(layerName);
          } else {
            layersToLoad.push({ layerName, fileName });
          }
        }
      }
      
      // Update layers immediately with cached data
      if (Object.keys(newLayers).length > 0) {
        setLayers(newLayers);
      }
      
      // Load new layers in parallel
      if (layersToLoad.length > 0) {
        setLoadingLayers(new Set(layersToLoad.map(l => l.layerName)));
        
        const loadPromises = layersToLoad.map(async ({ layerName, fileName }) => {
          try {
            const response = await fetch(`/api/data/${fileName}`);
            if (response.ok) {
              const data = await response.json();
              layerCache.current.set(layerName, data);
              return { layerName, data };
            }
          } catch (error) {
            console.error(`Error loading layer ${layerName}:`, error);
          }
          return null;
        });
        
        const results = await Promise.all(loadPromises);
        
        const updatedLayers = { ...newLayers };
        results.forEach(result => {
          if (result) {
            updatedLayers[result.layerName] = result.data;
          }
        });
        
        setLayers(updatedLayers);
        setLoadingLayers(new Set());
      }
    };

    loadLayers();
  }, [activeLayers, mapInitialized]);

  // Load active layers to map
  const loadActiveLayers = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Remove existing layers
    Object.keys(layers).forEach(layerName => {
      const sourceId = `source-${layerName.replace(/\s+/g, '-').toLowerCase()}`;
      const layerId = `layer-${layerName.replace(/\s+/g, '-').toLowerCase()}`;
      
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    });

    // Add new layers
    Object.entries(layers).forEach(([layerName, data]) => {
      if (!data || !data.features) return;

      const sourceId = `source-${layerName.replace(/\s+/g, '-').toLowerCase()}`;
      const layerId = `layer-${layerName.replace(/\s+/g, '-').toLowerCase()}`;

      // Add source
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: data
      });

      // Add layer based on geometry type
      const firstFeature = data.features[0];
      if (firstFeature && firstFeature.geometry) {
        const style = getLayerStyle(layerName);
        
        if (firstFeature.geometry.type === 'Point') {
          // Add point layer
          map.current.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': 6,
              'circle-color': style.color,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          });
        } else {
          // Add line/polygon layer
          map.current.addLayer({
            id: layerId,
            type: firstFeature.geometry.type === 'LineString' ? 'line' : 'fill',
            source: sourceId,
            paint: firstFeature.geometry.type === 'LineString' ? {
              'line-color': style.color,
              'line-width': style.weight || 2,
              'line-opacity': style.opacity || 0.8
            } : {
              'fill-color': style.fillColor || style.color,
              'fill-opacity': style.fillOpacity || 0.3
            }
          });
        }

        // Add click handler
        map.current.on('click', layerId, (e) => {
          if (e.features.length > 0) {
            const feature = e.features[0];
            showPopup(feature, layerName, e.lngLat);
          }
        });

        // Add hover effects
        map.current.on('mouseenter', layerId, () => {
          map.current.getCanvas().style.cursor = 'pointer';
        });

        map.current.on('mouseleave', layerId, () => {
          map.current.getCanvas().style.cursor = '';
        });
      }
    });
  }, [layers]);

  // Get layer style configuration
  const getLayerStyle = (layerName) => {
    const baseStyle = {
      weight: 2,
      opacity: 0.8,
      fillOpacity: 0.3
    };

    switch (layerName) {
      case 'Active Travelways':
        return { ...baseStyle, color: '#2563eb', fillColor: '#3b82f6' };
      case 'Transit Bus Routes':
        return { ...baseStyle, color: '#dc2626', fillColor: '#ef4444' };
      case 'Traffic Control':
        return { ...baseStyle, color: '#f59e0b', fillColor: '#fbbf24' };
      case 'Street Closures':
        return { ...baseStyle, color: '#dc2626', fillColor: '#fecaca', weight: 3 };
      case 'Street Junctions':
        return { ...baseStyle, color: '#7c3aed', fillColor: '#a78bfa' };
      case 'Accessible Parking':
        return { ...baseStyle, color: '#059669', fillColor: '#10b981' };
      case 'Steps & Ramps':
        return { ...baseStyle, color: '#7c2d12', fillColor: '#a16207', weight: 1 };
      case 'Bus Stops':
        return { ...baseStyle, color: '#1e40af', fillColor: '#3b82f6', weight: 1 };
      case 'Transit Shelters':
        return { ...baseStyle, color: '#1e3a8a', fillColor: '#1d4ed8', weight: 1 };
      case 'Snow Routes':
        return { ...baseStyle, color: '#0ea5e9', fillColor: '#38bdf8', weight: 2 };
      case 'Bike Infrastructure':
        return { ...baseStyle, color: '#16a34a', fillColor: '#22c55e', weight: 2 };
      case 'Sidewalk Closures':
        return { ...baseStyle, color: '#dc2626', fillColor: '#fecaca', weight: 2 };
      case 'Street Lights':
        return { ...baseStyle, color: '#fbbf24', fillColor: '#fde047', weight: 1 };
      case 'Public Washrooms':
        return { ...baseStyle, color: '#0891b2', fillColor: '#06b6d4', weight: 1 };
      case 'Civic Addresses':
        return { ...baseStyle, color: '#6b7280', fillColor: '#9ca3af', weight: 1 };
      default:
        return { ...baseStyle, color: '#6b7280', fillColor: '#9ca3af' };
    }
  };

  // Show popup for clicked feature
  const showPopup = (feature, layerName, lngLat) => {
    const properties = feature.properties || {};
    
    const popupContent = createPopupContent(feature, layerName);
    
    new mapboxgl.Popup()
      .setLngLat(lngLat)
      .setHTML(popupContent)
      .addTo(map.current);
  };

  // Create popup content
  const createPopupContent = (feature, layerName) => {
    const properties = feature.properties || {};
    
    const getPopupContent = () => {
      switch (layerName) {
        case 'Accessible Parking':
          return {
            title: properties.name || 'Accessible Parking',
            details: [
              { label: 'Spaces', value: properties.spaces || 'N/A' },
              { label: 'Time Limit', value: properties.timeLimit || 'N/A' },
              { label: 'Cost', value: properties.cost || 'Free' },
              { label: 'Features', value: properties.features?.join(', ') || 'Standard' }
            ]
          };
        
        case 'Bus Stops':
          return {
            title: properties.name || 'Bus Stop',
            details: [
              { label: 'Routes', value: properties.routes?.join(', ') || 'N/A' },
              { label: 'Accessibility', value: properties.accessible ? 'Yes' : 'No' },
              { label: 'Shelter', value: properties.shelter ? 'Yes' : 'No' },
              { label: 'Real-time', value: properties.realTime ? 'Yes' : 'No' }
            ]
          };
        
        case 'Public Washrooms':
          return {
            title: properties.name || 'Public Washroom',
            details: [
              { label: 'Accessibility', value: properties.accessible ? 'Yes' : 'No' },
              { label: 'Hours', value: properties.hours || '24/7' },
              { label: 'Gender', value: properties.gender || 'All' },
              { label: 'Baby Change', value: properties.babyChange ? 'Yes' : 'No' }
            ]
          };
        
        default:
          return {
            title: properties.name || layerName,
            details: [
              { label: 'Type', value: properties.type || layerName },
              { label: 'Status', value: properties.status || 'Active' },
              { label: 'Last Updated', value: properties.updatedAt || 'N/A' }
            ]
          };
      }
    };

    const content = getPopupContent();
    const icon = getLayerIcon(layerName);

    return `
      <div class="modern-marker-popup p-4 max-w-sm">
        <div class="flex items-center gap-3 mb-3">
          <div class="text-2xl">${icon}</div>
          <h3 class="font-semibold text-lg text-gray-900">${content.title}</h3>
        </div>
        <div class="space-y-2">
          ${content.details.map(detail => `
            <div class="flex justify-between text-sm">
              <span class="font-medium text-gray-600">${detail.label}:</span>
              <span class="text-gray-900">${detail.value}</span>
            </div>
          `).join('')}
        </div>
        ${properties.description ? `
          <div class="mt-3 pt-3 border-t border-gray-200">
            <p class="text-sm text-gray-600">${properties.description}</p>
          </div>
        ` : ''}
      </div>
    `;
  };

  // Get layer icon
  const getLayerIcon = (layerName) => {
    const iconMap = {
      'Accessible Parking': '🅿️',
      'Bus Stops': '🚏',
      'Transit Shelters': '🏠',
      'Public Washrooms': '🚻',
      'Steps & Ramps': '🪜',
      'Street Lights': '💡',
      'Traffic Control': '🚦',
      'Street Closures': '🚧',
      'Sidewalk Closures': '🚧',
      'Snow Routes': '❄️',
      'Bike Infrastructure': '🚲',
      'Street Junctions': '➕',
      'Transit Bus Routes': '🚌',
      'Active Travelways': '🚶',
      'Civic Addresses': '📍'
    };
    return iconMap[layerName] || '📍';
  };

  // Load active layers when layers change
  useEffect(() => {
    if (map.current && mapInitialized) {
      loadActiveLayers();
    }
  }, [layers, loadActiveLayers, mapInitialized]);

  // Add route to map
  useEffect(() => {
    if (!map.current || !mapInitialized || !route) return;

    const routeSourceId = 'route-source';
    const routeLayerId = 'route-layer';

    // Remove existing route
    if (map.current.getLayer(routeLayerId)) {
      map.current.removeLayer(routeLayerId);
    }
    if (map.current.getSource(routeSourceId)) {
      map.current.removeSource(routeSourceId);
    }

    // Add route source
    map.current.addSource(routeSourceId, {
      type: 'geojson',
      data: route
    });

    // Add route layer
    map.current.addLayer({
      id: routeLayerId,
      type: 'line',
      source: routeSourceId,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Fit map to route bounds
    if (route.features && route.features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      route.features.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
          feature.geometry.coordinates.forEach(coord => {
            bounds.extend(coord);
          });
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [route, mapInitialized]);

  // Add origin and destination markers
  useEffect(() => {
    if (!map.current || !mapInitialized) return;

    const originMarkerId = 'origin-marker';
    const destinationMarkerId = 'destination-marker';

    // Remove existing markers
    if (map.current.getLayer(originMarkerId)) {
      map.current.removeLayer(originMarkerId);
    }
    if (map.current.getSource(originMarkerId)) {
      map.current.removeSource(originMarkerId);
    }
    if (map.current.getLayer(destinationMarkerId)) {
      map.current.removeLayer(destinationMarkerId);
    }
    if (map.current.getSource(destinationMarkerId)) {
      map.current.removeSource(destinationMarkerId);
    }

    // Add origin marker
    if (origin) {
      map.current.addSource(originMarkerId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [origin.lng, origin.lat]
          },
          properties: {}
        }
      });

      map.current.addLayer({
        id: originMarkerId,
        type: 'circle',
        source: originMarkerId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#10b981',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3
        }
      });
    }

    // Add destination marker
    if (destination) {
      map.current.addSource(destinationMarkerId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [destination.lng, destination.lat]
          },
          properties: {}
        }
      });

      map.current.addLayer({
        id: destinationMarkerId,
        type: 'circle',
        source: destinationMarkerId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#ef4444',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3
        }
      });
    }
  }, [origin, destination, mapInitialized]);

  // Add barrier markers
  useEffect(() => {
    if (!map.current || !mapInitialized || !barriers.length) return;

    const barrierSourceId = 'barrier-source';
    const barrierLayerId = 'barrier-layer';

    // Remove existing barriers
    if (map.current.getLayer(barrierLayerId)) {
      map.current.removeLayer(barrierLayerId);
    }
    if (map.current.getSource(barrierSourceId)) {
      map.current.removeSource(barrierSourceId);
    }

    // Create barrier features
    const barrierFeatures = barriers.map(barrier => {
      const barrierData = barrier.properties || barrier;
      const coordinates = barrier.geometry?.coordinates || [barrier.lng, barrier.lat];
      
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        properties: barrierData
      };
    });

    // Add barrier source
    map.current.addSource(barrierSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: barrierFeatures
      }
    });

    // Add barrier layer
    map.current.addLayer({
      id: barrierLayerId,
      type: 'circle',
      source: barrierSourceId,
      paint: {
        'circle-radius': 6,
        'circle-color': [
          'case',
          ['==', ['get', 'status'], 'open'], '#dc2626',
          ['==', ['get', 'status'], 'in_progress'], '#f59e0b',
          '#059669'
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });

    // Add click handler for barriers
    map.current.on('click', barrierLayerId, (e) => {
      if (e.features.length > 0) {
        const barrier = e.features[0];
        onBarrierClick(barrier);
      }
    });
  }, [barriers, mapInitialized, onBarrierClick]);

  // Add selected location marker for barrier reporting
  useEffect(() => {
    if (!map.current || !mapInitialized || !isReportingMode || !selectedLocation) return;

    const selectedLocationId = 'selected-location-marker';

    // Remove existing marker
    if (map.current.getLayer(selectedLocationId)) {
      map.current.removeLayer(selectedLocationId);
    }
    if (map.current.getSource(selectedLocationId)) {
      map.current.removeSource(selectedLocationId);
    }

    // Add selected location marker
    map.current.addSource(selectedLocationId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [selectedLocation.lng, selectedLocation.lat]
        },
        properties: {}
      }
    });

    map.current.addLayer({
      id: selectedLocationId,
      type: 'circle',
      source: selectedLocationId,
      paint: {
        'circle-radius': 10,
        'circle-color': '#dc2626',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 3
      }
    });
  }, [selectedLocation, isReportingMode, mapInitialized]);

  return (
    <div 
      className="map-container"
      style={{ 
        height: '100%', 
        width: '100%',
        cursor: isReportingMode ? 'crosshair' : 'grab'
      }}
    >
      {/* Reporting mode indicator */}
      {isReportingMode && (
        <div className="absolute top-4 left-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2">
            <span className="text-lg">📍</span>
            <span className="font-medium">Click on the map to select barrier location</span>
          </div>
        </div>
      )}
      
      {/* Map container */}
      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} />
      
      {/* Loading indicators */}
      {Array.from(loadingLayers).map(layerName => (
        <div key={`loading-${layerName}`} className="absolute top-4 right-4 z-50">
          <div className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm">
            Loading {layerName}...
          </div>
        </div>
      ))}
    </div>
  );
};

export default MapComponent;
