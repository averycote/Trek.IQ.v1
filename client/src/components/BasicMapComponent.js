import React, { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import AccessibilityLayerManager from './AccessibilityLayerManager';
import WheelmapLayer from './WheelmapLayer';
import AccessibilityHeatmap from './AccessibilityHeatmap';

// Set Mapbox access token from environment variable
mapboxgl.accessToken =
  process.env.REACT_APP_MAPBOX_ACCESS_TOKEN ||
  "pk.eyJ1IjoiYXZlcnljb3RlIiwiYSI6ImNtZXhsZXB6NzBtNWgybG9lZ3ppYmthcDcifQ.8CEbNWYb5Gnts1NjV6RrTQ";

// Utility function to safely fetch JSON data from APIs
const safeFetchJSON = async (url, layerName) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const text = await response.text();
      console.warn(`${layerName} API returned non-JSON response:`, text);
      return null;
    }
  } catch (error) {
    console.warn(`${layerName} API not available:`, error.message);
    return null;
  }
};

const BasicMapComponent = ({
  onMapLoad,
  route,
  origin,
  destination,
  activeLayers = [],
  routeMode = "walking",
  accessibilitySettings = {},
  isReportingMode = false,
  onMapClick,
  onBarrierClick,
  mapPadding = { top: 0, bottom: 0, left: 0, right: 0 },
  isMobile = false,
  onLayerToggle,
  userLocation = null,
  barriers = []
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [internalUserLocation, setInternalUserLocation] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapFullyReady, setMapFullyReady] = useState(false);
  const [status, setStatus] = useState("Initializing...");

  // Status display for user feedback

  // Halifax center coordinates
  const HALIFAX_CENTER = useMemo(() => [-63.5756, 44.6475], []);

  // Helper function to safely call map methods
  const safeMapCall = (callback, fallback = null) => {
    try {
      if (map.current && map.current.isStyleLoaded && map.current.isStyleLoaded()) {
        return callback(map.current);
      }
      return fallback;
    } catch (error) {
      console.warn('Map method call failed:', error);
      return fallback;
    }
  };

  // Get route color based on accessibility score
  const getRouteColor = (accessibilityScore) => {
    const score = accessibilityScore || 50;

    if (score >= 90) {
      return "#10b981"; // Green - Excellent
    }
    if (score >= 75) {
      return "#3b82f6"; // Blue - Good
    }
    if (score >= 60) {
      return "#f59e0b"; // Orange - Fair
    }
    if (score >= 40) {
      return "#ef4444"; // Red - Poor
    }
    return "#7c3aed"; // Purple - Very Poor
  };

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    // Wait for container to have dimensions
    const waitForContainer = () => {
      if (
        mapContainer.current &&
        mapContainer.current.offsetWidth > 0 &&
        mapContainer.current.offsetHeight > 0
      ) {
        initMap();
      } else {
        setTimeout(waitForContainer, 100);
      }
    };

    const initMap = () => {
      try {
        setStatus("Creating map...");

        // Use Mapbox tiles with your personal token
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: HALIFAX_CENTER,
          zoom: 12,
          maxZoom: 18,
          minZoom: 10,
          // Add defensive options to prevent undefined state errors
          antialias: true,
          preserveDrawingBuffer: true,
          failIfMajorPerformanceCaveat: false,
          // Disable fog/atmosphere effects that might cause undefined state issues
          fog: false,
          sky: false
        });

        map.current.on("load", () => {
          setStatus("Map loaded!");
          setMapInitialized(true);
          onMapLoad?.(map.current);

          // Add navigation controls after map loads
          map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

          // Add geolocate control
          const geolocateControl = new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            trackUserLocation: true,
            showUserHeading: true,
          });
          map.current.addControl(geolocateControl, "top-right");

          // Add fullscreen control
          map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");
          
          // Check if style is already loaded
          if (map.current.isStyleLoaded()) {
            setStatus("Style loaded!");
            setStyleLoaded(true);
            // Set map as fully ready after a small delay to ensure all methods are available
            setTimeout(() => {
              if (map.current && map.current.getLayer && map.current.getSource) {
                setMapFullyReady(true);
                setStatus("Map ready!");
              }
            }, 100);
          }
        });

        // Add error handling for map events
        map.current.on("error", (e) => {
          console.error("Mapbox GL JS error:", e);
          setStatus("Map error occurred");
        });

        // Add error handling for style loading
        map.current.on("style.load", () => {
          console.log("Map style loaded successfully");
        });

        // Add error handling for style errors
        map.current.on("style.error", (e) => {
          console.error("Mapbox GL JS style error:", e);
        });

        // Listen for style data to be loaded
        map.current.on("idle", () => {
          if (map.current.isStyleLoaded()) {
            setStatus("Style loaded!");
            setStyleLoaded(true);
            // Set map as fully ready after a small delay to ensure all methods are available
            setTimeout(() => {
              if (map.current && map.current.getLayer && map.current.getSource) {
                setMapFullyReady(true);
                setStatus("Map ready!");
              }
            }, 100);
          }
        });
        
        map.current.on("styledata", () => {
          if (map.current.isStyleLoaded()) {
            setStatus("Style loaded!");
            setStyleLoaded(true);
            // Set map as fully ready after a small delay to ensure all methods are available
            setTimeout(() => {
              if (map.current && map.current.getLayer && map.current.getSource) {
                setMapFullyReady(true);
                setStatus("Map ready!");
              }
            }, 100);
          }
        });

        map.current.on("error", (e) => {
          console.error("BasicMapComponent: Map error:", e);
          setStatus("Map error occurred");
        });

        // Handle user location updates from Mapbox geolocate control
        map.current.on("geolocate", (e) => {
          const locationData = {
            lat: e.coords.latitude,
            lng: e.coords.longitude,
            coordinates: [e.coords.longitude, e.coords.latitude], // Mapbox format [lng, lat]
            accuracy: e.coords.accuracy,
            timestamp: Date.now(),
            name: 'Your Current Location',
            type: 'current_location',
            source: 'mapbox_geolocate'
          };
          setInternalUserLocation(locationData);
          setStatus("Location found via Mapbox!");
        });

        // Handle map clicks
        map.current.on("click", (e) => {
          if (isReportingMode && onMapClick) {
            onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
          } else {
            console.log("Map clicked at:", e.lngLat);
            setStatus(
              `Clicked: ${e.lngLat.lat.toFixed(4)}, ${e.lngLat.lng.toFixed(4)}`
            );
          }
        });
      } catch (error) {
        console.error("BasicMapComponent: Failed to initialize:", error);
        setStatus("Failed to initialize map");
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

  // Render origin, destination, and user location markers
  useEffect(() => {
    if (!map.current || !mapInitialized || !styleLoaded || !mapFullyReady) return;

    // Remove existing markers
    const existingMarkers = document.querySelectorAll(".mapboxgl-marker");
    existingMarkers.forEach((marker) => marker.remove());

    // Use either passed userLocation or internal location from Mapbox geolocate
    const currentUserLocation = userLocation || internalUserLocation;

    // Add user location marker (if available and not being used as origin)
    if (currentUserLocation && currentUserLocation.coordinates) {
      const isUserLocationOrigin = origin && (
        (Array.isArray(origin) && 
         Math.abs(origin[0] - currentUserLocation.coordinates[0]) < 0.0001 && 
         Math.abs(origin[1] - currentUserLocation.coordinates[1]) < 0.0001) ||
        (typeof origin === 'string' && origin.includes('Your Current Location'))
      );
      
      if (!isUserLocationOrigin) {
        // Create a custom marker element for user location
        const userMarkerElement = document.createElement('div');
        userMarkerElement.className = 'user-location-marker';
        userMarkerElement.style.cssText = `
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          border: 3px solid #ffffff;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          cursor: pointer;
        `;
        
        new mapboxgl.Marker({ element: userMarkerElement })
          .setLngLat(currentUserLocation.coordinates)
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div>
              <strong>📍 Your Current Location</strong><br/>
              <small>Accuracy: ±${Math.round(currentUserLocation.accuracy || 0)}m</small>
            </div>
          `))
          .addTo(map.current);
      }
    }

    // Add origin marker
    if (origin) {
      let originCoords = null;
      if (Array.isArray(origin)) {
        originCoords = origin;
      } else if (origin.coordinates) {
        originCoords = origin.coordinates;
      } else if (currentUserLocation && typeof origin === 'string' && origin.includes('Your Current Location')) {
        // Use user location coordinates for origin
        originCoords = currentUserLocation.coordinates;
      }

      if (originCoords) {
        // Create a custom marker element for origin
        const originMarkerElement = document.createElement('div');
        originMarkerElement.className = 'origin-marker';
        originMarkerElement.style.cssText = `
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #10b981;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        `;
        
        new mapboxgl.Marker({ element: originMarkerElement })
          .setLngLat(originCoords)
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div>
              <strong>🟢 Starting Point</strong><br/>
              ${typeof origin === 'string' ? origin : 'Origin'}
            </div>
          `))
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
        // Create a custom marker element for destination
        const destMarkerElement = document.createElement('div');
        destMarkerElement.className = 'destination-marker';
        destMarkerElement.style.cssText = `
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ef4444;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        `;
        
        new mapboxgl.Marker({ element: destMarkerElement })
          .setLngLat(destCoords)
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div>
              <strong>🔴 Destination</strong><br/>
              ${typeof destination === 'string' ? destination : 'Destination'}
            </div>
          `))
          .addTo(map.current);
      }
    }
  }, [origin, destination, userLocation, internalUserLocation, mapInitialized, styleLoaded, mapFullyReady]);

  // Load data layers
  useEffect(() => {
    if (
      !map.current ||
      !mapInitialized ||
      !styleLoaded ||
      !mapFullyReady ||
      !activeLayers ||
      activeLayers.length === 0
    )
      return;

    // Load accessible parking spots
    if (activeLayers.includes("accessibleParking")) {
      safeFetchJSON("/api/data/Accessible_Parking.geojson", "Accessible parking")
        .then((data) => {
          if (!data) {
            console.log("No accessible parking data available, skipping layer");
            return;
          }
          
          if (map.current.getSource("accessible-parking")) {
            map.current.removeLayer("accessible-parking-layer");
            map.current.removeSource("accessible-parking");
          }

          map.current.addSource("accessible-parking", {
            type: "geojson",
            data: data,
          });

          map.current.addLayer({
            id: "accessible-parking-layer",
            type: "circle",
            source: "accessible-parking",
            paint: {
              "circle-radius": 6,
              "circle-color": "#10b981",
              "circle-opacity": 0.8,
            },
          });
        });
    }

    // Load transit routes
    if (activeLayers.includes("transitRoutes")) {
      safeFetchJSON("/api/data/Transit_Bus_Routes.geojson", "Transit routes")
        .then((data) => {
          if (!data) {
            console.log("No transit routes data available, skipping layer");
            return;
          }
          
          if (map.current.getSource("transit-routes")) {
            map.current.removeLayer("transit-routes-layer");
            map.current.removeSource("transit-routes");
          }

          map.current.addSource("transit-routes", {
            type: "geojson",
            data: data,
          });

          map.current.addLayer({
            id: "transit-routes-layer",
            type: "line",
            source: "transit-routes",
            paint: {
              "line-color": "#3b82f6",
              "line-width": 3,
              "line-opacity": 0.6,
            },
          });
        });
    }

    // Load sidewalk closures
    if (activeLayers.includes("sidewalkClosures")) {
      safeFetchJSON("/api/data/dynamic/Sidewalk Closures.geojson", "Sidewalk closures")
        .then((data) => {
          if (!data) {
            console.log("No sidewalk closures data available, skipping layer");
            return;
          }
          
          if (map.current.getSource("sidewalk-closures")) {
            map.current.removeLayer("sidewalk-closures-layer");
            map.current.removeSource("sidewalk-closures");
          }

          map.current.addSource("sidewalk-closures", {
            type: "geojson",
            data: data,
          });

          map.current.addLayer({
            id: "sidewalk-closures-layer",
            type: "line",
            source: "sidewalk-closures",
            paint: {
              "line-color": "#ef4444",
              "line-width": 4,
              "line-opacity": 0.8,
              "line-dasharray": [2, 2],
            },
          });
        });
    }

    // Load public washrooms
    if (activeLayers.includes("publicWashrooms")) {
      safeFetchJSON("/api/data/HRM_Public_Washrooms_8937353538278970153.geojson", "Public washrooms")
        .then((data) => {
          if (!data) {
            console.log("No public washrooms data available, skipping layer");
            return;
          }
          
          if (map.current.getSource("public-washrooms")) {
            map.current.removeLayer("public-washrooms-layer");
            map.current.removeSource("public-washrooms");
          }

          map.current.addSource("public-washrooms", {
            type: "geojson",
            data: data,
          });

          map.current.addLayer({
            id: "public-washrooms-layer",
            type: "circle",
            source: "public-washrooms",
            paint: {
              "circle-radius": 5,
              "circle-color": "#8b5cf6",
              "circle-opacity": 0.8,
            },
          });
        });
    }

    // Load bus stops
    if (activeLayers.includes("busStops")) {
      safeFetchJSON("/api/data/Bus_Stops_2_9086297843420881686.geojson", "Bus stops")
        .then((data) => {
          if (!data) {
            console.log("No bus stops data available, skipping layer");
            return;
          }
          
          if (map.current.getSource("bus-stops")) {
            map.current.removeLayer("bus-stops-layer");
            map.current.removeSource("bus-stops");
          }

          map.current.addSource("bus-stops", {
            type: "geojson",
            data: data,
          });

          map.current.addLayer({
            id: "bus-stops-layer",
            type: "circle",
            source: "bus-stops",
            paint: {
              "circle-radius": 4,
              "circle-color": "#f59e0b",
              "circle-opacity": 0.8,
            },
          });
        });
    }
  }, [activeLayers, mapInitialized, styleLoaded, mapFullyReady]);

  // Render route
  useEffect(() => {
    if (!map.current || !mapInitialized || !styleLoaded || !mapFullyReady || !route) {
      return;
    }

    // Add a small delay to ensure style is fully loaded
    const renderRouteWithDelay = () => {
      setTimeout(async () => {
        if (map.current && map.current.isStyleLoaded && map.current.isStyleLoaded()) {
          // Route rendering logic
          const routeSourceId = "route-source";
          const routeLayerId = "route-layer";

          // Remove existing route
          if (map.current.getLayer("route-layer-backup")) {
            map.current.removeLayer("route-layer-backup");
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
          if (
            routeData.type === "FeatureCollection" &&
            routeData.features &&
            Array.isArray(routeData.features)
          ) {
            // Route is already valid
          }
          // Check if route is a single Feature
          else if (routeData.type === "Feature" && routeData.geometry) {
            routeData = {
              type: "FeatureCollection",
              features: [routeData],
            };
          }
          // Check if route has geometry property directly
          else if (routeData.geometry) {
            routeData = {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: routeData.properties || {},
                  geometry: routeData.geometry,
                },
              ],
            };
          }
          // Check if route has features array but wrong type
          else if (routeData.features && Array.isArray(routeData.features)) {
            routeData = {
              type: "FeatureCollection",
              features: routeData.features,
            };
          } else {
            console.error(
              "BasicMapComponent: Cannot determine route data structure:",
              routeData
            );
            return;
          }

          // Validate that we have valid geometry
          if (!routeData.features || routeData.features.length === 0) {
            console.error("BasicMapComponent: No features found in route data");
            return;
          }

          const firstFeature = routeData.features[0];

          if (!firstFeature.geometry || !firstFeature.geometry.coordinates) {
            console.error(
              "BasicMapComponent: No valid geometry found in route feature:",
              firstFeature
            );
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
                console.error(
                  "BasicMapComponent: Invalid coordinate range detected"
                );
                return;
              }
            } else {
              console.error("BasicMapComponent: Invalid coordinate format");
              return;
            }
          }

          // Log route information for debugging
          console.log("BasicMapComponent: Route rendering details:", {
            coordinatesCount: coordinates.length,
            routeSource: firstFeature.properties?.source || 'unknown',
            isEnhancedFallback: firstFeature.properties?.source === 'enhanced_fallback',
            isMobile: window.innerWidth <= 768,
            routeMode: firstFeature.properties?.mode || 'unknown'
          });

          // Extract accessibility score and route properties
          const properties = firstFeature.properties || {};
          
          // Get route color using comprehensive scoring or fallback
          let routeColor = '#3b82f6'; // Default blue
          
          // Special handling for enhanced fallback routes
          if (properties.source === 'enhanced_fallback') {
            routeColor = '#f59e0b'; // Orange color for fallback routes
            console.log('🎨 Using fallback route color (orange) for enhanced fallback route');
          } else {
            try {
              // Check if comprehensive accessibility data is already available
              if (properties.comprehensiveAccessibility) {
                routeColor = properties.comprehensiveAccessibility.color;
                console.log(`🎨 Using cached comprehensive route color: ${routeColor}`);
              } else {
                // Calculate comprehensive score for this route
                const { default: comprehensiveRouteScorer } = await import('../services/comprehensiveRouteScorer');
                const userPreferences = {
                  maxSlope: 8,
                  avoidSteps: true,
                  mobilityDevice: localStorage.getItem('trek-iq-mobility-device') || 'none',
                  visualImpairment: localStorage.getItem('trek-iq-visual-impairment') === 'true'
                };
                
                const scoringResult = await comprehensiveRouteScorer.calculateRouteScore(route, { userPreferences });
                routeColor = scoringResult.color;
                
                console.log(`🎨 BasicMapComponent route color: ${routeColor} (Score: ${scoringResult.overallScore})`);
                
                // Cache the result
                properties.comprehensiveAccessibility = scoringResult;
              }
            } catch (error) {
              console.error('Failed to get comprehensive route color, using fallback:', error);
              
              // Fallback to existing logic
              const accessibility = properties.accessibility || {};
              const accessibilityScore =
                accessibility.score ||
                properties.accessibilityScore ||
                accessibility.accessibility_score ||
                85;

              routeColor = getRouteColor(accessibilityScore);
            }
          }

          // Define line width variables outside try block for scope
          const lineWidth = window.innerWidth <= 768 ? 12 : 8; // Thinner on mobile for better UX
          const backupLineWidth = window.innerWidth <= 768 ? 16 : 12; // Backup layer slightly thicker
          
          // Define fallback route check outside try block for scope
          const isFallbackRoute = properties.source === 'enhanced_fallback';

          try {
            // Remove any existing route source and layers first
            if (map.current.getSource(routeSourceId)) {
              map.current.removeSource(routeSourceId);
            }

            if (map.current.getLayer(routeLayerId)) {
              map.current.removeLayer(routeLayerId);
            }

            if (map.current.getLayer("route-layer-backup")) {
              map.current.removeLayer("route-layer-backup");
            }

            // Add route source
            map.current.addSource(routeSourceId, {
              type: "geojson",
              data: routeData,
            });

            // Verify source was added
            const sourceExists = map.current.getSource(routeSourceId);

            if (!sourceExists) {
              console.error("BasicMapComponent: Failed to add route source");
              return;
            }

            // Add route layer with accessibility-based color and mobile-friendly width
            // Use dashed line for fallback routes to indicate they're estimated
            
            map.current.addLayer({
              id: routeLayerId,
              type: "line",
              source: routeSourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
                visibility: "visible",
                ...(isFallbackRoute && { "line-dasharray": [2, 2] }) // Dashed line for fallback routes
              },
              paint: {
                "line-color": routeColor,
                "line-width": lineWidth,
                "line-opacity": 0.9,
              },
            });

            // Force the route layer to be on top
            if (map.current.getLayer("poi-label")) {
              map.current.moveLayer(routeLayerId, "poi-label");
            }
          } catch (error) {
            console.error(
              "BasicMapComponent: Error adding route source and layer:",
              error
            );
          }

          // Add a backup route layer with accessibility-based color for maximum visibility
          map.current.addLayer(
            {
              id: "route-layer-backup",
              type: "line",
              source: routeSourceId,
              layout: {
                "line-join": "round",
                "line-cap": "round",
                visibility: "visible",
                ...(isFallbackRoute && { "line-dasharray": [2, 2] }) // Dashed line for fallback routes
              },
              paint: {
                "line-color": routeColor,
                "line-width": backupLineWidth,
                "line-opacity": 0.6, // Slightly transparent for outline effect
              },
            },
            routeLayerId
          );

          // Verify the layer was added
          const layerExists = map.current.getLayer(routeLayerId);
          const backupLayerExists = map.current.getLayer("route-layer-backup");

          if (layerExists) {
            // Force the route layer to be on top by moving it to the end
            try {
              map.current.moveLayer(routeLayerId);
              if (backupLayerExists) {
                map.current.moveLayer("route-layer-backup");
              }

              // Force visibility to 'visible'
              map.current.setLayoutProperty(
                routeLayerId,
                "visibility",
                "visible"
              );
              if (backupLayerExists) {
                map.current.setLayoutProperty(
                  "route-layer-backup",
                  "visibility",
                  "visible"
                );
              }
            } catch (moveError) {
              console.warn(
                "BasicMapComponent: Could not move route layers to top:",
                moveError
              );
            }

            // Force a map repaint
            setTimeout(() => {
              if (map.current) {
                map.current.triggerRepaint();
              }
            }, 100);
          } else {
            console.error("BasicMapComponent: Route layer failed to render!");
          }

          // Fit map to route bounds
          if (routeData.features && routeData.features.length > 0) {
            const coordinates = routeData.features[0].geometry.coordinates;

            if (coordinates && coordinates.length > 0) {
              const bounds = coordinates.reduce((bounds, coord) => {
                return bounds.extend(coord);
              }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

              // Use different padding for mobile vs desktop
              const padding =
                window.innerWidth <= 768
                  ? {
                      top: 100,
                      bottom: 300,
                      left: 50,
                      right: 50,
                    }
                  : 50;

              map.current.fitBounds(bounds, {
                padding: padding,
                duration: 1000,
                maxZoom: 16, // Prevent excessive zooming
              });
            }
          }
        } else {
          console.warn(
            "BasicMapComponent: Map style not fully loaded, retrying..."
          );
          setTimeout(renderRouteWithDelay, 200);
        }
      }, 400);
    };

    // Start the rendering process with delay
    renderRouteWithDelay();
  }, [route, mapInitialized, styleLoaded, mapFullyReady]);

  // Handle barrier display
  useEffect(() => {
    if (!map.current || !mapInitialized || !styleLoaded || !barriers.length) return;

    const barrierSourceId = 'user-barriers';
    const barrierLayerId = 'user-barriers-layer';

    // Remove existing barriers
    if (map.current.getLayer(barrierLayerId)) {
      map.current.removeLayer(barrierLayerId);
    }
    if (map.current.getSource(barrierSourceId)) {
      map.current.removeSource(barrierSourceId);
    }

    try {
      // Create barrier features from the barriers array
      const barrierFeatures = barriers.map(barrier => {
        const coordinates = barrier.geometry ? 
          barrier.geometry.coordinates : 
          [barrier.lng || barrier.longitude, barrier.lat || barrier.latitude];
        
        const properties = barrier.properties || barrier;
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          properties: {
            id: properties.id,
            type: properties.type,
            severity: properties.severity,
            notes: properties.notes || properties.description,
            status: properties.status || 'new',
            created_at: properties.created_at
          }
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
          'circle-radius': 8,
          'circle-color': [
            'case',
            ['==', ['get', 'severity'], 'high'], '#ef4444',
            ['==', ['get', 'severity'], 'medium'], '#f59e0b',
            '#10b981'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      });

      // Add barrier labels
      map.current.addLayer({
        id: barrierLayerId + '-labels',
        type: 'symbol',
        source: barrierSourceId,
        layout: {
          'text-field': [
            'case',
            ['==', ['get', 'type'], 'steps'], '🪜',
            ['==', ['get', 'type'], 'construction'], '🚧',
            ['==', ['get', 'type'], 'curb'], '🛑',
            ['==', ['get', 'type'], 'icy'], '🧊',
            '⚠️'
          ],
          'text-size': 16,
          'text-offset': [0, 0],
          'text-anchor': 'center'
        }
      });

      // Add click handler for barriers
      map.current.on('click', barrierLayerId, (e) => {
        if (e.features.length > 0) {
          const barrier = e.features[0];
          const coordinates = barrier.geometry.coordinates.slice();
          const properties = barrier.properties;

          // Create popup content
          const popupContent = `
            <div class="barrier-popup" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">${getBarrierIcon(properties.type)}</span>
                ${properties.type}
              </h3>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Severity:</strong> 
                <span style="color: ${getBarrierColor(properties.severity)}; font-weight: bold;">
                  ${properties.severity}
                </span>
              </p>
              <p style="margin: 4px 0; font-size: 14px;"><strong>Description:</strong> ${properties.notes || 'No description provided'}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;"><strong>Reported:</strong> ${new Date(properties.created_at).toLocaleDateString()}</p>
            </div>
          `;

          new mapboxgl.Popup({ offset: 15 })
            .setLngLat(coordinates)
            .setHTML(popupContent)
            .addTo(map.current);

          if (onBarrierClick) {
            onBarrierClick(barrier);
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', barrierLayerId, () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', barrierLayerId, () => {
        map.current.getCanvas().style.cursor = '';
      });

      console.log(`✅ Displayed ${barriers.length} barriers on map`);

    } catch (error) {
      console.error('Error displaying barriers on map:', error);
    }
  }, [barriers, mapInitialized, styleLoaded, onBarrierClick]);

  // Helper functions for barrier display
  const getBarrierIcon = (type) => {
    const icons = {
      'steps': '🪜',
      'construction': '🚧',
      'curb': '🛑',
      'icy': '🧊',
      'other': '⚠️'
    };
    return icons[type] || '⚠️';
  };

  const getBarrierColor = (severity) => {
    const colors = {
      'low': '#10b981',
      'medium': '#f59e0b',
      'high': '#ef4444'
    };
    return colors[severity] || '#6b7280';
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
      }}
    >
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
        }}
      />

      {/* Location info */}
      {(userLocation || internalUserLocation) && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            left: "10px",
            background: "rgba(0, 0, 0, 0.8)",
            color: "white",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            zIndex: 1000,
          }}
        >
          📍 Your Location: {(userLocation || internalUserLocation).lat.toFixed(4)},{" "}
          {(userLocation || internalUserLocation).lng.toFixed(4)}
          {(userLocation || internalUserLocation).accuracy && (
            <><br/><small>±{Math.round((userLocation || internalUserLocation).accuracy)}m</small></>
          )}
        </div>
      )}

      {/* Reporting mode indicator */}
      {isReportingMode && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#ef4444",
            color: "white",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            zIndex: 1000,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          📍 Click on the map to report an accessibility barrier
        </div>
      )}

      {/* Accessibility Layer Manager - Handles accessibility.cloud integration */}
      {mapInitialized && styleLoaded && mapFullyReady && map.current && (
        <AccessibilityLayerManager
          map={map.current}
          activeLayers={new Set(activeLayers)}
          onLayerToggle={onLayerToggle}
          isDarkMode={false} // TODO: Get from theme context
        />
      )}

      {/* Wheelmap Layer - Shows accessibility markers based on active layers */}
      {mapInitialized && styleLoaded && mapFullyReady && map.current && (
        <WheelmapLayer
          isVisible={true}
          map={map.current}
          bounds={map.current.getBounds()}
          onLayerToggle={onLayerToggle}
          activeLayers={new Set(activeLayers)}
          isDarkMode={false} // TODO: Get from theme context
          isMobile={isMobile}
        />
      )}

      {/* Accessibility Heatmap - Optional heatmap overlay */}
      {mapInitialized && styleLoaded && mapFullyReady && map.current && (
        <AccessibilityHeatmap
          map={map.current}
          isVisible={activeLayers.includes('accessibility_heatmap')}
          isDarkMode={false} // TODO: Get from theme context
        />
      )}
    </div>
  );
};

export default BasicMapComponent;
