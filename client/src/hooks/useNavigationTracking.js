/**
 * Navigation Tracking Hook
 * 
 * Provides real-time location tracking for navigation with:
 * - High accuracy GPS
 * - Distance calculations
 * - Step progression
 * - Turn announcements
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as turf from '@turf/turf';

const useNavigationTracking = ({ route, isActive, onStepComplete, onRouteComplete }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToNextStep, setDistanceToNextStep] = useState(null);
  const [heading, setHeading] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  
  const watchIdRef = useRef(null);
  const lastAnnouncedStepRef = useRef(-1);
  
  // Calculate distance to next waypoint/step
  const calculateDistanceToNext = useCallback((position, nextPoint) => {
    if (!position || !nextPoint) return null;
    
    try {
      const from = turf.point([position.lng, position.lat]);
      const to = turf.point(nextPoint);
      const distance = turf.distance(from, to, { units: 'meters' });
      return Math.round(distance);
    } catch (error) {
      console.error('Error calculating distance:', error);
      return null;
    }
  }, []);
  
  // Get route steps from route object
  const getRouteSteps = useCallback(() => {
    if (!route) return [];
    
    // Try different route structures
    if (route.features?.[0]?.geometry?.coordinates) {
      return route.features[0].geometry.coordinates;
    }
    if (route.geometry?.coordinates) {
      return route.geometry.coordinates;
    }
    if (route.coordinates) {
      return route.coordinates;
    }
    
    return [];
  }, [route]);
  
  // Handle position update
  const handlePositionUpdate = useCallback((position) => {
    const { latitude, longitude, heading: deviceHeading, accuracy: posAccuracy } = position.coords;
    
    const newLocation = {
      lat: latitude,
      lng: longitude
    };
    
    setUserLocation(newLocation);
    setHeading(deviceHeading);
    setAccuracy(posAccuracy);
    
    // Calculate distance to next step
    const steps = getRouteSteps();
    if (steps && steps.length > 0 && currentStepIndex < steps.length) {
      const nextStep = steps[currentStepIndex];
      const distance = calculateDistanceToNext(newLocation, nextStep);
      setDistanceToNextStep(distance);
      
      // Auto-advance to next step if within threshold (25 meters for driving, 15 for walking)
      const threshold = route?.properties?.mode === 'driving' ? 25 : 15;
      if (distance !== null && distance < threshold && currentStepIndex < steps.length - 1) {
        const nextIndex = currentStepIndex + 1;
        setCurrentStepIndex(nextIndex);
        
        // Announce step completion (only once per step)
        if (lastAnnouncedStepRef.current !== nextIndex) {
          lastAnnouncedStepRef.current = nextIndex;
          if (onStepComplete) {
            onStepComplete(nextIndex, steps[nextIndex]);
          }
        }
      }
      
      // Check if route is complete (within 20m of final destination)
      if (currentStepIndex === steps.length - 1 && distance !== null && distance < 20) {
        if (onRouteComplete) {
          onRouteComplete();
        }
      }
    }
  }, [currentStepIndex, getRouteSteps, calculateDistanceToNext, route, onStepComplete, onRouteComplete]);
  
  // Handle geolocation errors
  const handlePositionError = useCallback((error) => {
    console.error('Location tracking error:', error);
    
    let errorMessage = 'Location tracking error';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
      default:
        errorMessage = 'Unknown location error';
    }
    
    console.warn(errorMessage);
  }, []);
  
  // Start tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return;
    }
    
    if (watchIdRef.current !== null) {
      console.warn('Tracking already started');
      return;
    }
    
    console.log('🎯 Starting navigation tracking with high accuracy GPS');
    
    const options = {
      enableHighAccuracy: true, // Use GPS for driving
      timeout: 5000,
      maximumAge: 0 // Always get fresh location
    };
    
    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      options
    );
    
    setIsTracking(true);
  }, [handlePositionUpdate, handlePositionError]);
  
  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      console.log('⏹️ Stopping navigation tracking');
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);
  
  // Auto-start/stop tracking based on isActive
  useEffect(() => {
    if (isActive && route) {
      startTracking();
    } else {
      stopTracking();
    }
    
    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [isActive, route, startTracking, stopTracking]);
  
  // Reset step index when route changes
  useEffect(() => {
    setCurrentStepIndex(0);
    lastAnnouncedStepRef.current = -1;
  }, [route]);
  
  return {
    userLocation,
    currentStepIndex,
    distanceToNextStep,
    heading,
    accuracy,
    isTracking,
    startTracking,
    stopTracking,
    totalSteps: getRouteSteps().length
  };
};

export default useNavigationTracking;

