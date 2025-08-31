import React, { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox access token from environment variable
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZXhsZXB6NzBtNWgybG9lZ3ppYmthcDcifQ.8CEbNWYb5Gnts1NjV6RrTQ';

const BasicMapComponent = ({ 
  onMapLoad,
  route,
  origin,
  destination,
  activeLayers = [],
  routeMode = 'walking',
  accessibilitySettings = {},
  isReportingMode = false,
  onMapClick,
  onBarrierClick,
  mapPadding = { top: 0, bottom: 0, left: 0, right: 0 }
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  
  // Status display for user feedback

  // Halifax center coordinates
  const HALIFAX_CENTER = useMemo(() => [-63.5756, 44.6475], []);

  // Get route color based on accessibility score
  const getRouteColor = (accessibilityScore) => {
    const score = accessibilityScore || 50;

    if (score >= 90) {
      return '#10b981'; // Green - Excellent
    }
    if (score >= 75) {
      return '#3b82f6'; // Blue - Good
    }
    if (score >= 60) {
      return '#f59e0b'; // Orange - Fair
    }
    if (score >= 40) {
      return '#ef4444'; // Red - Poor
    }
    return '#7c3aed'; // Purple - Very Poor
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return;

      // Wait for container to have dimensions
  const waitForContainer = () => {
    if (mapContainer.current && mapContainer.current.offsetWidth > 0 && mapContainer.current.offsetHeight > 0) {
      initMap();
    } else {
      setTimeout(waitForContainer, 100);
    }
  };

    const initMap = () => {
      try {
        setStatus('Creating map...');
        
        // Use Mapbox tiles with your personal token
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: HALIFAX_CENTER,
          zoom: 12,
          maxZoom: 18,
          minZoom: 10
        });

        map.current.on('load', () => {
          setStatus('Map loaded!');
          setMapInitialized(true);
          onMapLoad?.(map.current);
          
          // Add navigation controls after map loads
          map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
          
          // Add geolocate control
          const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
          });
          map.current.addControl(geolocateControl, 'top-right');
          
          // Add fullscreen control
          map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        });

        // Listen for style data to be loaded
        map.current.on('styledata', () => {
          if (map.current.isStyleLoaded()) {
            setStatus('Style loaded!');
            setStyleLoaded(true);
          }
        });

        map.current.on('error', (e) => {
          console.error('BasicMapComponent: Map error:', e);
          setStatus('Map error occurred');
        });

        // Handle user location updates
        map.current.on('geolocate', (e) => {
          setUserLocation({
            lat: e.coords.latitude,
            lng: e.coords.longitude
          });
          setStatus('Location found!');
        });

        // Handle map clicks
        map.current.on('click', (e) => {
          if (isReportingMode && onMapClick) {
            onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          } else {
            console.log('Map clicked at:', e.lngLat);
            setStatus(`Clicked: ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`);
          }
        });

      } catch (error) {
        console.error('BasicMapComponent: Failed to initialize:', error);
        setStatus('Failed to initialize map');
      }
    };

    // Start waiting for container to be ready
    waitForContainer();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapLoad, isReportingMode, onMapClick, HALIFAX_CENTER]);



  // Render origin and destination markers
  useEffect(() => {
    if (!map.current || !mapInitialized || !styleLoaded) return;



    // Remove existing markers
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());

    // Add origin marker
    if (origin) {
      let originCoords = null;
      if (Array.isArray(origin)) {
        originCoords = origin;
      } else if (origin.coordinates) {
        originCoords = origin.coordinates;
      }
      
      if (originCoords) {
        
        new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat(originCoords)
          .setPopup(new mapboxgl.Popup().setHTML('<div>Origin</div>'))
          .addTo(map.current);
      }
    }

    // Add destination marker
    if (destination) {
      let destCoords = null;
      if (Array.isArray(destination)) {
        destCoords = destination;
      } else if (destination.coordinates) {
        destCoords = destination.coordinates;
      }
      
      if (destCoords) {
        
        new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat(destCoords)
          .setPopup(new mapboxgl.Popup().setHTML('<div>Destination</div>'))
          .addTo(map.current);
      }
    }
  }, [origin, destination, mapInitialized, styleLoaded]);

  // Load data layers
  useEffect(() => {
    if (!map.current || !mapInitialized || !styleLoaded || !activeLayers || activeLayers.length === 0) return;



    // Load accessible parking spots
    if (activeLayers.includes('accessibleParking')) {
      fetch('/api/data/accessible-parking')
        .then(response => response.json())
        .then(data => {
          if (map.current.getSource('accessible-parking')) {
            map.current.removeLayer('accessible-parking-layer');
            map.current.removeSource('accessible-parking');
          }
          
          map.current.addSource('accessible-parking', {
            type: 'geojson',
            data: data
          });

          map.current.addLayer({
            id: 'accessible-parking-layer',
            type: 'circle',
            source: 'accessible-parking',
            paint: {
              'circle-radius': 6,
              'circle-color': '#10b981',
              'circle-opacity': 0.8
            }
          });
        })
        .catch(error => console.error('Error loading accessible parking:', error));
    }

    // Load transit routes
    if (activeLayers.includes('transitRoutes')) {
      fetch('/api/data/transit-routes')
        .then(response => response.json())
        .then(data => {
          if (map.current.getSource('transit-routes')) {
            map.current.removeLayer('transit-routes-layer');
            map.current.removeSource('transit-routes');
          }
          
          map.current.addSource('transit-routes', {
            type: 'geojson',
            data: data
          });

          map.current.addLayer({
            id: 'transit-routes-layer',
            type: 'line',
            source: 'transit-routes',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 3,
              'line-opacity': 0.6
            }
          });
        })
        .catch(error => console.error('Error loading transit routes:', error));
    }

    // Load sidewalk closures
    if (activeLayers.includes('sidewalkClosures')) {
      fetch('/api/data/sidewalk-closures')
        .then(response => response.json())
        .then(data => {
          if (map.current.getSource('sidewalk-closures')) {
            map.current.removeLayer('sidewalk-closures-layer');
            map.current.removeSource('sidewalk-closures');
          }
          
          map.current.addSource('sidewalk-closures', {
            type: 'geojson',
            data: data
          });

          map.current.addLayer({
            id: 'sidewalk-closures-layer',
            type: 'line',
            source: 'sidewalk-closures',
            paint: {
              'line-color': '#ef4444',
              'line-width': 4,
              'line-opacity': 0.8,
              'line-dasharray': [2, 2]
            }
          });
        })
        .catch(error => console.error('Error loading sidewalk closures:', error));
    }

  }, [activeLayers, mapInitialized, styleLoaded]);

  // Render route
  useEffect(() => {
    if (!map.current || !mapInitialized || !styleLoaded || !route) {
      return;
    }

    // Add a small delay to ensure style is fully loaded
    const renderRouteWithDelay = () => {
      setTimeout(() => {
        if (map.current && map.current.isStyleLoaded()) {
          // Route rendering logic
          const routeSourceId = 'route-source';
          const routeLayerId = 'route-layer';

    // Remove existing route
    if (map.current.getLayer('route-layer-backup')) {
      map.current.removeLayer('route-layer-backup');
    }
    if (map.current.getLayer(routeLayerId)) {
      map.current.removeLayer(routeLayerId);
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
      console.error('BasicMapComponent: Cannot determine route data structure:', routeData);
      return;
    }

    // Validate that we have valid geometry
    if (!routeData.features || routeData.features.length === 0) {
      console.error('BasicMapComponent: No features found in route data');
      return;
    }

    const firstFeature = routeData.features[0];

    if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
      console.error('BasicMapComponent: No valid geometry found in route feature:', firstFeature);
      return;
    }

    const coordinates = firstFeature.geometry.coordinates;

    // Validate coordinate format - Mapbox expects [lng, lat]
    if (coordinates.length > 0) {
      const firstCoord = coordinates[0];

      if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
        const [lng, lat] = firstCoord;

        // Check if coordinates are in valid range
        if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
          console.error('BasicMapComponent: Invalid coordinate range detected');
          return;
        }
      } else {
        console.error('BasicMapComponent: Invalid coordinate format');
        return;
      }
    }

    // Extract accessibility score and route properties
    const properties = firstFeature.properties || {};
    const accessibility = properties.accessibility || {};
    const accessibilityScore = accessibility.score || properties.accessibilityScore || accessibility.accessibility_score || 85;

    // Get route color based on accessibility
    const routeColor = getRouteColor(accessibilityScore);

    // Define line width variables outside try block for scope
    const lineWidth = window.innerWidth <= 768 ? 12 : 8; // Thinner on mobile for better UX
    const backupLineWidth = window.innerWidth <= 768 ? 16 : 12; // Backup layer slightly thicker

    try {
      // Remove any existing route source and layers first
      if (map.current.getSource(routeSourceId)) {
        map.current.removeSource(routeSourceId);
      }

      if (map.current.getLayer(routeLayerId)) {
        map.current.removeLayer(routeLayerId);
      }

      if (map.current.getLayer('route-layer-backup')) {
        map.current.removeLayer('route-layer-backup');
      }

      // Add route source
      map.current.addSource(routeSourceId, {
        type: 'geojson',
        data: routeData
      });

      // Verify source was added
      const sourceExists = map.current.getSource(routeSourceId);

      if (!sourceExists) {
        console.error('BasicMapComponent: Failed to add route source');
        return;
      }

      // Add route layer with accessibility-based color and mobile-friendly width

      map.current.addLayer({
        id: routeLayerId,
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'visible'
        },
        paint: {
          'line-color': routeColor,
          'line-width': lineWidth,
          'line-opacity': 0.9
        }
      });

      // Force the route layer to be on top
      if (map.current.getLayer('poi-label')) {
        map.current.moveLayer(routeLayerId, 'poi-label');
      }

    } catch (error) {
      console.error('BasicMapComponent: Error adding route source and layer:', error);
    }

      // Add a backup route layer with accessibility-based color for maximum visibility
      map.current.addLayer({
        id: 'route-layer-backup',
        type: 'line',
        source: routeSourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
          visibility: 'visible'
        },
        paint: {
          'line-color': routeColor,
          'line-width': backupLineWidth,
          'line-opacity': 0.6 // Slightly transparent for outline effect
        }
      }, routeLayerId);

    // Verify the layer was added
    const layerExists = map.current.getLayer(routeLayerId);
    const backupLayerExists = map.current.getLayer('route-layer-backup');

    if (layerExists) {
      // Force the route layer to be on top by moving it to the end
      try {
        map.current.moveLayer(routeLayerId);
        if (backupLayerExists) {
          map.current.moveLayer('route-layer-backup');
        }

        // Force visibility to 'visible'
        map.current.setLayoutProperty(routeLayerId, 'visibility', 'visible');
        if (backupLayerExists) {
          map.current.setLayoutProperty('route-layer-backup', 'visibility', 'visible');
        }

      } catch (moveError) {
        console.warn('BasicMapComponent: Could not move route layers to top:', moveError);
      }

      // Force a map repaint
      setTimeout(() => {
        if (map.current) {
          map.current.triggerRepaint();
        }
      }, 100);

    } else {
      console.error('BasicMapComponent: Route layer failed to render!');
    }

      // Fit map to route bounds
      if (routeData.features && routeData.features.length > 0) {
        const coordinates = routeData.features[0].geometry.coordinates;

        if (coordinates && coordinates.length > 0) {
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          // Use different padding for mobile vs desktop
          const padding = window.innerWidth <= 768 ? {
            top: 100,
            bottom: 300,
            left: 50,
            right: 50
          } : 50;

          map.current.fitBounds(bounds, {
            padding: padding,
            duration: 1000,
            maxZoom: 16 // Prevent excessive zooming
          });
        }
      }

        } else {
          console.warn('BasicMapComponent: Map style not fully loaded, retrying...');
          setTimeout(renderRouteWithDelay, 200);
        }
      }, 100);
    };

    // Start the rendering process with delay
    renderRouteWithDelay();

  }, [route, mapInitialized, styleLoaded]);

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100vh'
    }}>
      <div 
        ref={mapContainer} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: '400px'
        }} 
      />
      




      {/* Location info */}
      {userLocation && (
        <div style={{
          position: 'absolute',
          top: '50px',
          left: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          📍 Your Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
        </div>
      )}



      {/* Reporting mode indicator */}
      {isReportingMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ef4444',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          📍 Click on the map to report an accessibility barrier
        </div>
      )}
    </div>
  );
};

export default BasicMapComponent;

