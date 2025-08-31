import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  NavState, 
  NavigationState, 
  navigationController 
} from './state';
import NavigationPanel from './panel';
import { accessibilityLayerService } from './accessibilityLayer';
import { cameraService } from './camera';
import { accessibilityService } from './a11y';
import './navigation.css';

interface NavigationIntegrationProps {
  mapInstance: any;
  route: any | null;
  origin: string | null;
  destination: string | null;
  routeMode: 'walking' | 'driving' | 'transit';
  onRouteClear: () => void;
  onOriginChange: (origin: string) => void;
  onDestinationChange: (destination: string) => void;
}

const NavigationIntegration: React.FC<NavigationIntegrationProps> = ({
  mapInstance,
  route,
  origin,
  destination,
  routeMode,
  onRouteClear,
  onOriginChange,
  onDestinationChange
}) => {
  const [navigationState, setNavigationState] = useState<NavigationState>(
    navigationController.getState()
  );
  const [isSearchBarShrunk, setIsSearchBarShrunk] = useState(false);
  const [accessibilityFeatures, setAccessibilityFeatures] = useState<any[]>([]);

  // Subscribe to navigation state changes
  useEffect(() => {
    const unsubscribe = navigationController.subscribe((state) => {
      setNavigationState(state);
    });

    return unsubscribe;
  }, []);

  // Set map instance for services
  useEffect(() => {
    if (mapInstance) {
      navigationController.setMapInstance(mapInstance);
      cameraService.setMapInstance(mapInstance);
    }
  }, [mapInstance]);

  // Handle route changes
  useEffect(() => {
    if (route && origin && destination) {
      // Route computed - update navigation state
      navigationController.onRouteComputed(route, origin, destination, routeMode);
      
      // Shrink search bar
      setIsSearchBarShrunk(true);
      
      // Load accessibility features along route
      loadAccessibilityFeatures();
      
      // Check for route warnings
      checkRouteWarnings();
      
      // Announce route ready
      const eta = route.features?.[0]?.properties?.duration || 0;
      const distance = route.features?.[0]?.properties?.distance || 0;
      accessibilityService.announceNavigationEvent('route-ready', { eta, distance });
      
      // Update ETA and distance in navigation state
      navigationController.updateETAAndDistance(eta, distance);
    } else if (!route) {
      // Route cleared - reset navigation state
      navigationController.onTapEnd();
      setIsSearchBarShrunk(false);
      setAccessibilityFeatures([]);
    }
  }, [route, origin, destination, routeMode]);

  // Load accessibility features along route
  const loadAccessibilityFeatures = useCallback(async () => {
    if (!route?.features?.[0]?.geometry?.coordinates) return;

    try {
      const coordinates = route.features[0].geometry.coordinates;
      const enabledLayers = [
        'accessible_parking',
        'accessible_bathrooms', 
        'elevators',
        'ramps',
        'accessible_entrances',
        'transit_stops',
        'traffic_control'
      ];

      const features = await accessibilityLayerService.getAccessibilityFeaturesAlongRoute(
        coordinates,
        enabledLayers
      );

      setAccessibilityFeatures(features);
      navigationController.state.accessibilityMarkers = features;
    } catch (error) {
      console.error('Failed to load accessibility features:', error);
    }
  }, [route]);

  // Check for route warnings
  const checkRouteWarnings = useCallback(async () => {
    if (!route?.features?.[0]?.geometry?.coordinates) return;

    try {
      const coordinates = route.features[0].geometry.coordinates;
      const warnings = await accessibilityLayerService.getRouteWarnings(coordinates, routeMode);
      
      warnings.forEach(warning => {
        navigationController.addRouteWarning(warning);
        accessibilityService.announceNavigationEvent('warning-detected', warning);
      });
    } catch (error) {
      console.error('Failed to check route warnings:', error);
    }
  }, [route, routeMode]);

  // Navigation event handlers
  const handleTapGo = useCallback(async () => {
    try {
      // Start navigation
    navigationController.onTapGo();
    accessibilityService.announceNavigationEvent('navigation-started');

      // Zoom map to route with color-coded display
      if (mapInstance && route) {
        console.log('=== MAP ZOOM AND COLOR-CODING DEBUG ===');
        console.log('Map instance available:', !!mapInstance);
        console.log('Route data:', route);

        // Calculate route bounds for zooming
        if (route.features && route.features[0]?.geometry?.coordinates) {
          const coordinates = route.features[0].geometry.coordinates;
          console.log('Route coordinates:', coordinates);

          // Calculate bounds
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new (window as any).mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          // Zoom to route with smooth animation
          mapInstance.fitBounds(bounds, {
            padding: { top: 100, bottom: 300, left: 50, right: 50 },
            duration: 1500,
            maxZoom: 18
          });

          console.log('Map zoomed to route bounds successfully');

          // Add color-coded route line based on accessibility
          const routeLine = {
            type: 'Feature',
            properties: {
              accessibilityScore: route.summary?.accessibilityScore || {},
              barriers: route.summary?.barriers || []
            },
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          };

          // Remove existing route layers if any
          if (mapInstance.getLayer('navigation-route')) {
            mapInstance.removeLayer('navigation-route');
          }
          if (mapInstance.getSource('navigation-route')) {
            mapInstance.removeSource('navigation-route');
          }

          // Add route source
          mapInstance.addSource('navigation-route', {
            type: 'geojson',
            data: routeLine
          });

          // Determine route color based on accessibility
          const accessibilityScore = route.summary?.accessibilityScore?.grade || 'C';
          const hasBarriers = route.summary?.barriers?.length > 0;

          let routeColor = '#3b82f6'; // Default blue
          if (accessibilityScore === 'A' && !hasBarriers) {
            routeColor = '#10b981'; // Green for accessible
          } else if (accessibilityScore === 'B' || hasBarriers) {
            routeColor = '#f59e0b'; // Orange for caution
          } else if (accessibilityScore === 'C') {
            routeColor = '#ef4444'; // Red for challenging
          }

          // Add route layer with color coding
          mapInstance.addLayer({
            id: 'navigation-route',
            type: 'line',
            source: 'navigation-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': 8,
              'line-opacity': 0.8
            }
          });

          // Add a subtle glow effect
          mapInstance.addLayer({
            id: 'navigation-route-glow',
            type: 'line',
            source: 'navigation-route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': routeColor,
              'line-width': 12,
              'line-opacity': 0.3,
              'line-blur': 2
            }
          }, 'navigation-route');

          console.log('Color-coded route layer added successfully');
        } else {
          console.warn('Route coordinates not available for map display');
        }
      } else {
        console.warn('Map instance or route data not available for navigation display');
      }
    } catch (error) {
      console.error('Error during navigation start:', error);
    }
  }, [mapInstance, route, navigationController, accessibilityService]);

  const handleTapEnd = useCallback(() => {
    try {
      // Clean up navigation route layers
      if (mapInstance) {
        if (mapInstance.getLayer('navigation-route-glow')) {
          mapInstance.removeLayer('navigation-route-glow');
        }
        if (mapInstance.getLayer('navigation-route')) {
          mapInstance.removeLayer('navigation-route');
        }
        if (mapInstance.getSource('navigation-route')) {
          mapInstance.removeSource('navigation-route');
        }
        console.log('Navigation route layers cleaned up');
      }

      // End navigation
    navigationController.onTapEnd();
    onRouteClear();
    setIsSearchBarShrunk(false);
    setAccessibilityFeatures([]);
    accessibilityService.announceNavigationEvent('navigation-ended');
    } catch (error) {
      console.error('Error during navigation end:', error);
    }
  }, [mapInstance, navigationController, onRouteClear, accessibilityService]);

  const handleToggleMute = useCallback(() => {
    navigationController.toggleMute();
  }, []);

  const handleToggleFollowingUser = useCallback(() => {
    navigationController.toggleFollowingUser();
  }, []);

  const handleRecenter = useCallback(() => {
    if (navigationState.isFollowingUser) {
      cameraService.recenterOnUser();
    } else {
      cameraService.recenterOnRoute();
    }
  }, [navigationState.isFollowingUser]);

  const handleTogglePanel = useCallback(() => {
    navigationController.toggleDirectionsPanel();
  }, []);

  const handleToggleMinimized = useCallback(() => {
    navigationController.toggleDirectionsMinimized();
  }, []);

  // Update progress based on user location
  const updateProgress = useCallback((userLocation: [number, number]) => {
    if (!route?.features?.[0]?.geometry?.coordinates) return;

    const coordinates = route.features[0].geometry.coordinates;
    const totalDistance = route.features[0].properties.distance || 0;
    
    // Calculate progress based on user position along route
    let minDistance = Infinity;
    let currentStep = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      const distance = calculateDistance(userLocation, coordinates[i]);
      if (distance < minDistance) {
        minDistance = distance;
        currentStep = i;
      }
    }
    
    const progress = Math.min(100, (currentStep / coordinates.length) * 100);
    navigationController.updateProgress(progress, currentStep);
  }, [route]);

  // Calculate distance between two points
  const calculateDistance = (point1: [number, number], point2: [number, number]): number => {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;
    
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Update ETA and distance
  const updateETAAndDistance = useCallback(() => {
    if (!route?.features?.[0]?.properties) return;

    const { duration, distance } = route.features[0].properties;
    navigationController.state.eta = duration;
    navigationController.state.distance = distance;
  }, [route]);

  // Update ETA and distance when route changes
  useEffect(() => {
    updateETAAndDistance();
  }, [route, updateETAAndDistance]);

  // Shrunken search bar component
  const ShrunkenSearchBar = () => {
    if (!isSearchBarShrunk || !origin || !destination) return null;

    return (
      <AnimatePresence>
        <motion.div
          className="shrunken-search-bar"
          initial={{
            opacity: 0,
            scale: 0.85,
            x: -60,
            y: 10
          }}
          animate={{
            opacity: 1,
            scale: 1,
            x: 0,
            y: 0
          }}
          exit={{
            opacity: 0,
            scale: 0.85,
            x: -60,
            y: 10
          }}
          transition={{
            type: 'spring',
            damping: 28,
            stiffness: 250,
            mass: 0.7,
            duration: 0.35
          }}
        >
          <div className="search-bar-content">
            <div className="route-summary">
              <div className="origin-dest">
                <span className="origin">{origin}</span>
                <div className="route-line">
                  <div className="route-dot start" />
                  <div className="route-line-segment" />
                  <div className="route-dot end" />
                </div>
                <span className="destination">{destination}</span>
              </div>
            </div>
            <button
              className="edit-route-btn"
              onClick={() => {
                setIsSearchBarShrunk(false);
                navigationController.onTapEnd();
              }}
              aria-label="Edit route"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Go button component
  const GoButton = () => {
    if (navigationState.currentState !== NavState.ROUTE_READY) return null;

    return (
      <AnimatePresence>
        <motion.button
          className="go-button"
          onClick={handleTapGo}
          initial={{
            opacity: 0,
            scale: 0.6,
            y: 80,
            rotate: -10
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: 0
          }}
          exit={{
            opacity: 0,
            scale: 0.6,
            y: 80,
            rotate: 10
          }}
          transition={{
            type: 'spring',
            damping: 22,
            stiffness: 180,
            mass: 0.8,
            duration: 0.5
          }}
          aria-label="Start navigation"
        >
          <div className="go-button-glow" />
          <div className="go-button-content">
            <div className="go-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <span className="go-text">GO</span>
          </div>
        </motion.button>
      </AnimatePresence>
    );
  };

  return (
    <>
      {/* Shrunken Search Bar */}
      <ShrunkenSearchBar />
      
      {/* Go Button */}
      <GoButton />
      
      {/* Navigation Panel */}
      <NavigationPanel
        navigationState={navigationState}
        onTogglePanel={handleTogglePanel}
        onToggleMinimized={handleToggleMinimized}
        onToggleMute={handleToggleMute}
        onToggleFollowingUser={handleToggleFollowingUser}
        onTapGo={handleTapGo}
        onTapEnd={handleTapEnd}
        onRecenter={handleRecenter}
      />
      
      {/* Accessibility Features Layer */}
      <AccessibilityFeaturesLayer
        features={accessibilityFeatures}
        mapInstance={mapInstance}
        isVisible={navigationState.currentState === NavState.ACTIVE_NAV}
      />
    </>
  );
};

// Accessibility Features Layer Component
interface AccessibilityFeaturesLayerProps {
  features: any[];
  mapInstance: any;
  isVisible: boolean;
}

const AccessibilityFeaturesLayer: React.FC<AccessibilityFeaturesLayerProps> = ({
  features,
  mapInstance,
  isVisible
}) => {
  const [markers, setMarkers] = useState<any[]>([]);

  // Add markers to map
  useEffect(() => {
    if (!mapInstance || !isVisible) return;

    // Clear existing markers
    markers.forEach(marker => marker.remove());
    const newMarkers: any[] = [];

    features.forEach(feature => {
      const markerEl = document.createElement('div');
      markerEl.className = `accessibility-marker ${feature.type}`;
      
      const icon = getMarkerIcon(feature.type);
      const label = getMarkerLabel(feature.type, feature.properties);
      
      markerEl.innerHTML = `
        <div class="marker-glow"></div>
        <div class="marker-icon">${icon}</div>
        <div class="marker-label">${label}</div>
      `;

      const marker = new (window as any).mapboxgl.Marker({
        element: markerEl,
        anchor: 'bottom'
      })
      .setLngLat(feature.coordinates)
      .addTo(mapInstance);

      // Add popup
      const popup = new (window as any).mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'accessibility-popup'
      }).setHTML(`
        <div class="popup-content">
          <h4>${label}</h4>
          <div class="accessibility-info">
            ${getAccessibilityInfo(feature.type, feature.properties)}
          </div>
        </div>
      `);

      marker.setPopup(popup);
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    return () => {
      newMarkers.forEach(marker => marker.remove());
    };
  }, [features, mapInstance, isVisible]);

  return null;
};

// Helper functions for accessibility markers
const getMarkerIcon = (type: string): string => {
  switch (type) {
    case 'accessible_parking':
      return '♿';
    case 'accessible_bathrooms':
      return '🚻';
    case 'elevators':
      return '🛗';
    case 'ramps':
      return '🛤️';
    case 'accessible_entrances':
      return '🚪';
    case 'transit_stops':
      return '🚌';
    case 'traffic_control':
      return '🚦';
    default:
      return '📍';
  }
};

const getMarkerLabel = (type: string, properties: any): string => {
  return properties?.name || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getAccessibilityInfo = (type: string, properties: any): string => {
  const info = [];
  
  if (properties?.wheelchair) {
    info.push(`<div class="info-item"><span class="info-label">Wheelchair:</span><span class="info-value">${properties.wheelchair}</span></div>`);
  }
  
  if (properties?.surface) {
    info.push(`<div class="info-item"><span class="info-label">Surface:</span><span class="info-value">${properties.surface}</span></div>`);
  }
  
  if (properties?.slope) {
    info.push(`<div class="info-item"><span class="info-label">Slope:</span><span class="info-value">${properties.slope}</span></div>`);
  }
  
  if (properties?.spaces) {
    info.push(`<div class="info-item"><span class="info-label">Spaces:</span><span class="info-value">${properties.spaces}</span></div>`);
  }
  
  return info.join('') || '<div class="info-item">Accessibility information available</div>';
};

export default NavigationIntegration;
