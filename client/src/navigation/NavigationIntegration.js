import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import './navigation.css';

// Mobile detection utility
const checkMobileDevice = () => {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const NavigationIntegration = ({
  mapInstance,
  route,
  origin,
  destination,
  routeMode,
  onRouteClear,
  onOriginChange,
  onDestinationChange,
  onNavigationStart,
  onNavigationEnd,
  isMobile = false,
  isNavigating = false
}) => {
  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Check if device is mobile - use prop if provided, otherwise detect
  useEffect(() => {
    if (typeof isMobile === 'boolean') {
      // Use the prop if it's provided
      setIsMobileDevice(isMobile);
    } else {
      // Otherwise detect mobile device
      const checkMobile = () => {
        setIsMobileDevice(checkMobileDevice());
      };
      
      checkMobile();
      window.addEventListener('resize', checkMobile);
      
      return () => {
        window.removeEventListener('resize', checkMobile);
      };
    }
  }, [isMobile]);

  // Handle route changes
  useEffect(() => {
    if (route && origin && destination && isMobileDevice) {
      setIsNavigationActive(false); // Start in route ready state, not active navigation
      setIsPanelOpen(true);
      setIsPanelCollapsed(false); // Start with expanded panel
    } else {
      setIsNavigationActive(false);
      setIsPanelOpen(false);
      setIsPanelCollapsed(false);
    }
  }, [route, origin, destination, isMobileDevice]);

  // Handle navigation state changes - IMPLEMENT PROPER MOBILE FLOW
  useEffect(() => {
    if (isNavigating) {
      // Hide the mobile navigation panel when navigation is active
      // The DirectionsPanel will be shown instead by the parent component
      setIsPanelOpen(false);
      setIsPanelCollapsed(false);
    } else if (route && origin && destination && isMobileDevice) {
      // Show the mobile navigation panel when not navigating but route is available
      // This shows the route summary with barrier alerts
      setIsPanelOpen(true);
      setIsPanelCollapsed(false);
    }
  }, [isNavigating, route, origin, destination, isMobileDevice]);

  // Handle route changes - show route summary when route is generated
  useEffect(() => {
    if (route && origin && destination && isMobileDevice && !isNavigating) {
      // Show route summary when route is generated but not yet started
      setIsPanelOpen(true);
      setIsPanelCollapsed(false);
    } else if (!route) {
      // Hide panel when route is cleared
      setIsPanelOpen(false);
    }
  }, [route, origin, destination, isMobileDevice, isNavigating]);

  // Handle Start Navigation - FIXED MOBILE INTEGRATION
  const handleStartNavigation = useCallback(() => {

    setIsNavigationActive(true);

    // Notify parent component
    if (onNavigationStart) {
      console.log('NavigationIntegration: Calling onNavigationStart');
      onNavigationStart();
    }

    if (mapInstance && route) {
      console.log('NavigationIntegration: Attempting to zoom to route bounds');

      try {
        // Get route coordinates - handle different route data structures
        let coordinates = null;

        if (route.features && route.features[0] && route.features[0].geometry) {
          coordinates = route.features[0].geometry.coordinates;
        } else if (route.geometry && route.geometry.coordinates) {
          coordinates = route.geometry.coordinates;
        }

        console.log('NavigationIntegration: Route coordinates:', coordinates);

        if (coordinates && coordinates.length > 0) {
          const bounds = coordinates.reduce((bounds, coord) => {
            return bounds.extend(coord);
          }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

          console.log('NavigationIntegration: Calculated bounds:', bounds);

          // Use different padding for mobile vs desktop
          const padding = isMobileDevice ? {
            top: 100,
            bottom: 250,
            left: 50,
            right: 50
          } : 50;

          console.log('NavigationIntegration: Using padding:', padding);

          mapInstance.fitBounds(bounds, {
            padding: padding,
            duration: 1000,
            maxZoom: 16
          });

          console.log('NavigationIntegration: Successfully initiated map zoom');
        } else {
          console.error('NavigationIntegration: No valid coordinates found in route');
        }
      } catch (error) {
        console.error('NavigationIntegration: Error zooming to route bounds:', error);
      }
    } else {
      console.warn('NavigationIntegration: Cannot zoom - missing mapInstance or route');
    }
  }, [mapInstance, route, onNavigationStart, isMobileDevice]);

  // Handle End Route - FIXED MOBILE INTEGRATION
  const handleEndRoute = useCallback(() => {
    setIsNavigationActive(false);
    
    // Notify parent component
    if (onNavigationEnd) {
      onNavigationEnd();
    }
    
    onRouteClear();
    setIsPanelOpen(false);
    setIsPanelCollapsed(false);
    setCurrentStep(0);
  }, [onRouteClear, onNavigationEnd]);

  // Handle panel collapse toggle
  const handleToggleCollapse = useCallback(() => {
    setIsPanelCollapsed(prev => !prev);
  }, []);

  // Mobile Navigation Panel
  const MobileNavigationPanel = () => {
    if (!route) {
      return null;
    }

    const steps = route.features?.[0]?.properties?.legs?.[0]?.steps || [];
    const currentStepData = steps[currentStep] || steps[0];
    const nextStepData = steps[currentStep + 1] || null;
    
    // Extract accessibility data
    const routeData = route.features?.[0]?.properties || {};
    const accessibility = routeData.accessibility || {};
    const barriers = routeData.analysis?.barriers || accessibility.analysis?.barriers || [];
    
    // Debug accessibility data
    console.log('NavigationIntegration: Route data:', routeData);
    console.log('NavigationIntegration: Accessibility data:', accessibility);
    console.log('NavigationIntegration: Barriers:', barriers);
    console.log('NavigationIntegration: Route summary panel should show:');
    console.log('- Route metrics (time, distance)');
    console.log('- Accessibility score with icon and level');
    console.log('- Barriers warning (if any) or "No Barriers" message');
    console.log('- Origin and destination points');
    console.log('- Start Route and Regenerate buttons');
    
    const getAccessibilityScore = () => {
      const score = accessibility.score || accessibility.accessibilityScore || routeData.accessibilityScore || 85;
      console.log('NavigationIntegration: Accessibility score:', score);
      if (score >= 90) return { level: 'Excellent', color: 'text-green-500', bg: 'bg-green-100', icon: '🟢' };
      if (score >= 75) return { level: 'Good', color: 'text-blue-500', bg: 'bg-blue-100', icon: '🔵' };
      if (score >= 60) return { level: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-100', icon: '🟡' };
      return { level: 'Poor', color: 'text-red-500', bg: 'bg-red-100', icon: '🔴' };
    };
    
    const accessibilityScore = getAccessibilityScore();


    return (
      <AnimatePresence>
        <motion.div
          className={`mobile-navigation-panel ${isPanelCollapsed ? 'collapsed' : ''} ${isNavigationActive ? 'active-navigation' : 'route-summary'}`}
          initial={{ y: '100%' }}
          animate={{ y: isPanelOpen ? 0 : '100%' }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {/* Drag Handle with Collapse Toggle */}
          <div className="drag-handle" onClick={handleToggleCollapse}>
            <div className="handle-bar" />
            <div className="collapse-indicator">
              {isPanelCollapsed ? '⌃' : '⌄'}
            </div>
          </div>

          {/* Collapsed Navigation Content */}
          <div className="collapsed-navigation">
            {currentStepData && (
              <div className="collapsed-current-step">
                <div className="collapsed-step-icon">
                  {getStepIcon(currentStepData.maneuver)}
                </div>
                <div className="collapsed-step-details">
                  <div className="collapsed-step-instruction">
                    {currentStepData.maneuver.instruction}
                  </div>
                  <div className="collapsed-step-metrics">
                    {currentStepData.distance > 0 && (
                      <span>📏 {formatDistance(currentStepData.distance)}</span>
                    )}
                    {currentStepData.duration > 0 && (
                      <span>⏱️ {formatDuration(currentStepData.duration)}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Next Step Preview */}
            {nextStepData && (
              <div className="collapsed-next-step">
                <div className="collapsed-next-icon">
                  {getStepIcon(nextStepData.maneuver)}
                </div>
                <div className="collapsed-next-instruction">
                  {nextStepData.maneuver.instruction}
                </div>
              </div>
            )}
          </div>

          {/* Panel Content - Full Navigation */}
          <div className="panel-content">
                         {/* Route Header */}
             <div className="route-header">
               <div className="route-info">
                 <div className="route-mode">
                   <span className="mode-icon">
                     {routeMode === 'walking' ? '🚶' : routeMode === 'driving' ? '🚗' : '🚌'}
                   </span>
                   <span className="mode-text">{routeMode}</span>
                 </div>
                 
                 <div className="route-stats">
                   <div className="stat">
                     <span className="stat-icon">⏱️</span>
                     <span className="stat-value">
                       {Math.round((route?.features?.[0]?.properties?.duration || 0) / 60)} min
                     </span>
                   </div>
                   <div className="stat">
                     <span className="stat-icon">📏</span>
                     <span className="stat-value">
                       {((route?.features?.[0]?.properties?.distance || 0) / 1000).toFixed(1)} km
                     </span>
                   </div>
                 </div>
               </div>

               {/* Comprehensive Accessibility Information - Only for walking/transit */}
               {routeMode !== 'driving' && routeMode !== 'driving-traffic' && (
                 <div className="comprehensive-accessibility">
                   <div className="accessibility-header">
                     <span className="accessibility-icon">♿</span>
                     <span className="accessibility-title">Route Accessibility</span>
                   </div>

                   <div className="accessibility-content">
                     {/* Route Score */}
                     <div className="accessibility-score">
                       <div className="score-info">
                         <span className="score-icon">{accessibilityScore.icon}</span>
                         <div className="score-details">
                           <span className="score-label">Overall Score</span>
                           <span className={`score-level ${accessibilityScore.color}`}>{accessibilityScore.level}</span>
                         </div>
                       </div>
                       <div className="score-value">
                         <span className="score-number">{accessibility.score || accessibility.accessibilityScore || 85}%</span>
                       </div>
                     </div>

                   {/* Route Conditions */}
                   <div className="route-conditions">
                     <div className="condition-item">
                       <span className="condition-icon">🚶</span>
                       <div className="condition-info">
                         <span className="condition-label">Travel Mode</span>
                         <span className="condition-value">{routeMode === 'walking' ? 'Pedestrian' : routeMode === 'driving' ? 'Vehicle' : 'Transit'}</span>
                       </div>
                     </div>

                     <div className="condition-item">
                       <span className="condition-icon">📏</span>
                       <div className="condition-info">
                         <span className="condition-label">Distance</span>
                         <span className="condition-value">{(route.features[0].properties.distance / 1000).toFixed(1)} km</span>
                       </div>
                     </div>

                     <div className="condition-item">
                       <span className="condition-icon">⏱️</span>
                       <div className="condition-info">
                         <span className="condition-label">Duration</span>
                         <span className="condition-value">{Math.round((route?.features?.[0]?.properties?.duration || 0) / 60)} min</span>
                       </div>
                     </div>
                   </div>

                   {/* Barriers Status */}
                   {barriers && barriers.length > 0 ? (
                     <div className="barriers-status warning">
                       <span className="status-icon">⚠️</span>
                       <div className="status-info">
                         <span className="status-label">Barriers Detected</span>
                         <span className="status-detail">{barriers.length} accessibility barrier{barriers.length !== 1 ? 's' : ''} found</span>
                       </div>
                 </div>
               ) : (
                     <div className="barriers-status success">
                       <span className="status-icon">✅</span>
                       <div className="status-info">
                         <span className="status-label">No Barriers</span>
                         <span className="status-detail">Route appears accessible</span>
                       </div>
                   </div>
                   )}
                 </div>
               </div>
               )}

               <div className="route-points">
                 <div className="point origin">
                   <div className="point-marker start" />
                   <div className="point-text">
                     <span className="point-label">From</span>
                     <span className="point-address">{origin}</span>
                   </div>
                 </div>
                 <div className="point destination">
                   <div className="point-marker end" />
                   <div className="point-text">
                     <span className="point-label">To</span>
                     <span className="point-address">{destination}</span>
                   </div>
                 </div>
               </div>
             </div>

            {/* Action Buttons - ROUTE SUMMARY FLOW */}
            <div className="action-bar">
              {!isNavigationActive ? (
                <>
                  <button
                    className="action-button"
                    onClick={handleStartNavigation}
                    aria-label="Start navigation"
                  >
                    <span className="action-button-icon">▶️</span>
                    <span>Start Route</span>
                  </button>
                  <button
                    className="action-button secondary"
                    onClick={() => {
                      // Trigger route regeneration
                      if (onRouteClear) {
                        onRouteClear();
                      }
                    }}
                    aria-label="Regenerate route"
                  >
                    <span className="action-button-icon">🔄</span>
                    <span>Regenerate</span>
                  </button>
                </>
              ) : (
                <button
                  className="action-button danger"
                  onClick={handleEndRoute}
                  aria-label="End route"
                >
                  <span className="action-button-icon">⏹️</span>
                  <span>End Route</span>
                </button>
              )}
            </div>

            {/* Current Step */}
            {currentStepData && (
              <div className="current-step">
                <div className="step-header">
                  <h3 className="step-title">Current Step</h3>
                  <span className="step-counter">{currentStep + 1} of {steps.length}</span>
                </div>
                
                <div className="step-content">
                  <div className="step-icon">
                    {getStepIcon(currentStepData.maneuver)}
                  </div>
                  <div className="step-details">
                    <div className="step-instruction">
                      {currentStepData.maneuver.instruction}
                    </div>
                    <div className="step-metrics">
                      {currentStepData.distance > 0 && (
                        <span className="step-distance">
                          📏 {formatDistance(currentStepData.distance)}
                        </span>
                      )}
                      {currentStepData.duration > 0 && (
                        <span className="step-duration">
                          ⏱️ {formatDuration(currentStepData.duration)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Steps */}
            {steps.length > 1 && (
              <div className="upcoming-steps">
                <h4 className="upcoming-title">Upcoming</h4>
                <div className="steps-list">
                  {steps.slice(1, 4).map((step, index) => (
                    <div key={`step-${currentStep + index + 1}`} className="upcoming-step">
                      <div className="step-icon small">
                        {getStepIcon(step.maneuver)}
                      </div>
                      <div className="step-details">
                        <div className="step-instruction">
                          {step.maneuver.instruction}
                        </div>
                        {step.distance > 0 && (
                          <span className="step-distance">
                            {formatDistance(step.distance)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Helper functions
  const getStepIcon = (maneuver) => {
    const type = maneuver?.type || '';
    const modifier = maneuver?.modifier || '';
    
    switch (type) {
      case 'turn':
        switch (modifier) {
          case 'left': return '⬅️';
          case 'right': return '➡️';
          case 'slight left': return '↖️';
          case 'slight right': return '↗️';
          case 'sharp left': return '↙️';
          case 'sharp right': return '↘️';
          default: return '➡️';
        }
      case 'continue': return '➡️';
      case 'depart': return '🚶';
      case 'arrive': return '📍';
      case 'merge': return '🔀';
      case 'exit': return '🚪';
      case 'roundabout': return '🔄';
      case 'rotary': return '🔄';
      case 'new name': return '🆕';
      case 'end of road': return '🛑';
      case 'fork': return '🔀';
      case 'ramp': return '🛣️';
      default: return '➡️';
    }
  };

  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return '< 1 min';
    return `${minutes} min`;
  };

  // Debug logging for NavigationIntegration
  console.log('NavigationIntegration: Component render', {
    hasMapInstance: !!mapInstance,
    hasRoute: !!route,
    isMobileDevice,
    routeType: route?.type,
    routeFeatures: route?.features?.length,
    routeProperties: route?.features?.[0]?.properties
  });

  // Ensure map zoom happens when route is available and we're navigating
  useEffect(() => {
    if (mapInstance && route && isNavigating) {
      console.log('NavigationIntegration: Auto-zooming to route on navigation start');

      try {
        // Get route coordinates
        let coordinates = null;

        if (route.features && route.features[0] && route.features[0].geometry) {
          coordinates = route.features[0].geometry.coordinates;
        } else if (route.geometry && route.geometry.coordinates) {
          coordinates = route.geometry.coordinates;
        }

        console.log('NavigationIntegration: Route coordinates for zoom:', coordinates);

        if (coordinates && coordinates.length > 0) {
          // Halifax bounds for validation
          const halifaxBounds = {
            west: -63.8,
            east: -63.4,
            south: 44.5,
            north: 44.8
          };

          // Validate that all coordinates are within Halifax bounds
          const validCoordinates = coordinates.filter(coord => {
            const [lng, lat] = coord;
            return lng >= halifaxBounds.west && lng <= halifaxBounds.east &&
                   lat >= halifaxBounds.south && lat <= halifaxBounds.north;
          });

          if (validCoordinates.length >= 2) {
            const bounds = validCoordinates.reduce((bounds, coord) => {
              return bounds.extend(coord);
            }, new mapboxgl.LngLatBounds(validCoordinates[0], validCoordinates[0]));

            console.log('NavigationIntegration: Calculated bounds for zoom:', bounds);

            // Use different padding for mobile vs desktop
            const padding = isMobileDevice ? {
              top: 100,
              bottom: 300,
              left: 50,
              right: 50
            } : 50;

            console.log('NavigationIntegration: Using padding for zoom:', padding);

            mapInstance.fitBounds(bounds, {
              padding: padding,
              duration: 1000,
              maxZoom: 16
            });

            console.log('NavigationIntegration: Successfully initiated auto-zoom');
          } else {
            console.warn('NavigationIntegration: Route coordinates are outside Halifax bounds, skipping auto-zoom');
          }
        } else {
          console.error('NavigationIntegration: No valid coordinates found for auto-zoom');
        }
      } catch (error) {
        console.error('NavigationIntegration: Error during auto-zoom:', error);
      }
    }
  }, [mapInstance, route, isNavigating, isMobileDevice]);

  return null; // NavigationIntegration now only handles map operations, not UI components
};

export default NavigationIntegration;
