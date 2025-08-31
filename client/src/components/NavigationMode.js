import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationMode = ({
  route,
  origin,
  destination,
  onStartNavigation,
  onEditRoute,
  onExitNavigation,
  isActive = false
}) => {
  const [isDirectionsPanelOpen, setIsDirectionsPanelOpen] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distanceToNext, setDistanceToNext] = useState(null);

  const directionsPanelRef = useRef(null);

  // Handle start navigation
  const handleStartNavigation = useCallback(() => {
    setIsNavigating(true);
    onStartNavigation();
    
    // Start location tracking
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.longitude, position.coords.latitude]);
        },
        (error) => {
          console.error('Location tracking failed:', error);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    }
  }, [onStartNavigation]);

  // Calculate distance to next step
  useEffect(() => {
    if (userLocation && route?.features?.[0]?.properties?.legs?.[0]?.steps) {
      const steps = route.features[0].properties.legs[0].steps;
      if (steps[currentStep]) {
        // Simple distance calculation (in real app, use proper geospatial library)
        const stepCoords = steps[currentStep].geometry.coordinates[0];
        const distance = Math.sqrt(
          Math.pow(userLocation[0] - stepCoords[0], 2) + 
          Math.pow(userLocation[1] - stepCoords[1], 2)
        ) * 111000; // Rough conversion to meters
        setDistanceToNext(Math.round(distance));
      }
    }
  }, [userLocation, route, currentStep]);

  // Auto-advance to next step when close enough
  useEffect(() => {
    if (distanceToNext && distanceToNext < 50 && isNavigating) { // Within 50 meters
      const steps = route?.features?.[0]?.properties?.legs?.[0]?.steps;
      if (steps && currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    }
  }, [distanceToNext, isNavigating, route, currentStep]);

  if (!isActive || !route) return null;

  const steps = route?.features?.[0]?.properties?.legs?.[0]?.steps || [];
  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        className="navigation-mode"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Shrunken Search Bar */}
        <motion.div
          className="shrunken-search-bar"
          initial={{ width: "100%", height: "auto" }}
          animate={{ width: "300px", height: "60px" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <div className="search-bar-content">
            <div className="route-summary">
              <div className="origin-dest">
                <span className="origin">{origin}</span>
                <div className="route-line">
                  <div className="route-dot start"></div>
                  <div className="route-line-segment"></div>
                  <div className="route-dot end"></div>
                </div>
                <span className="destination">{destination}</span>
              </div>
            </div>
            <button 
              className="edit-route-btn"
              onClick={onEditRoute}
              aria-label="Edit route"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Go Button */}
        {!isNavigating && (
          <motion.button
            className="go-button"
            onClick={handleStartNavigation}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="go-button-content">
              <div className="go-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
              <span className="go-text">GO</span>
            </div>
            <div className="go-button-glow"></div>
          </motion.button>
        )}

        {/* Directions Panel */}
        {isNavigating && (
          <motion.div
            ref={directionsPanelRef}
            className={`directions-panel ${isMinimized ? 'minimized' : ''}`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="directions-header">
              <div className="directions-title">
                <h3>Navigation</h3>
                {distanceToNext && (
                  <span className="distance-to-next">{distanceToNext}m to next turn</span>
                )}
              </div>
              <div className="directions-controls">
                <button
                  className="minimize-btn"
                  onClick={() => setIsMinimized(!isMinimized)}
                  aria-label={isMinimized ? "Expand directions" : "Minimize directions"}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={isMinimized ? "M6 9l6 6 6-6" : "M18 15l-6-6-6 6"}/>
                  </svg>
                </button>
                <button
                  className="exit-navigation-btn"
                  onClick={onExitNavigation}
                  aria-label="Exit navigation"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {!isMinimized && (
              <motion.div
                className="directions-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {currentStepData ? (
                  <div className="current-step">
                    <div className="step-icon">
                      {getStepIcon(currentStepData.maneuver.type)}
                    </div>
                    <div className="step-content">
                      <div className="step-instruction">
                        {currentStepData.maneuver.instruction}
                      </div>
                      <div className="step-details">
                        <span className="step-distance">
                          {Math.round(currentStepData.distance)}m
                        </span>
                        <span className="step-duration">
                          {Math.round(currentStepData.duration)}s
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="no-directions">
                    <p>Route completed!</p>
                  </div>
                )}

                <div className="upcoming-steps">
                  {steps.slice(currentStep + 1, currentStep + 4).map((step, index) => (
                    <div key={index} className="upcoming-step">
                      <div className="step-icon small">
                        {getStepIcon(step.maneuver.type)}
                      </div>
                      <div className="step-content">
                        <div className="step-instruction">
                          {step.maneuver.instruction}
                        </div>
                        <div className="step-distance">
                          {Math.round(step.distance)}m
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function to get step icons
const getStepIcon = (maneuverType) => {
  switch (maneuverType) {
    case 'turn':
      return '↪️';
    case 'merge':
      return '↗️';
    case 'depart':
      return '🚶';
    case 'arrive':
      return '🎯';
    case 'continue':
      return '➡️';
    default:
      return '📍';
  }
};

export default NavigationMode;
