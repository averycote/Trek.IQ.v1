import React, { useState, useEffect } from 'react';
import { NavigationState } from './state';

interface DirectionsListProps {
  navigationState: NavigationState;
  isMobile: boolean;
}

const DirectionsList: React.FC<DirectionsListProps> = ({ navigationState, isMobile }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Extract steps from route
  const getSteps = () => {
    if (!navigationState.route?.features?.[0]?.properties?.legs?.[0]?.steps) {
      return [];
    }
    return navigationState.route.features[0].properties.legs[0].steps;
  };

  const steps = getSteps();
  const currentStep = steps[currentStepIndex] || null;

  // Get step icon based on maneuver type
  const getStepIcon = (maneuver: any): string => {
    const type = maneuver?.type || '';
    const modifier = maneuver?.modifier || '';
    
    switch (type) {
      case 'turn':
        switch (modifier) {
          case 'left':
            return '⬅️';
          case 'right':
            return '➡️';
          case 'slight left':
            return '↖️';
          case 'slight right':
            return '↗️';
          case 'sharp left':
            return '↙️';
          case 'sharp right':
            return '↘️';
          default:
            return '➡️';
        }
      case 'continue':
        return '➡️';
      case 'depart':
        return '🚶';
      case 'arrive':
        return '📍';
      case 'merge':
        return '🔀';
      case 'exit':
        return '🚪';
      case 'roundabout':
        return '🔄';
      case 'rotary':
        return '🔄';
      case 'new name':
        return '🆕';
      case 'end of road':
        return '🛑';
      case 'fork':
        return '🔀';
      case 'ramp':
        return '🛣️';
      default:
        return '➡️';
    }
  };

  // Format distance
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return '< 1 min';
    return `${minutes} min`;
  };

  // Handle step click
  const handleStepClick = (index: number) => {
    setCurrentStepIndex(index);
  };

  // Auto-advance current step based on progress
  useEffect(() => {
    if (steps.length > 0) {
      const progressStep = Math.floor((navigationState.progress / 100) * steps.length);
      setCurrentStepIndex(Math.min(progressStep, steps.length - 1));
    }
  }, [navigationState.progress, steps.length]);

  if (steps.length === 0) {
    return (
      <div className="directions-list">
        <div className="no-directions">
          <p>No directions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="directions-list">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isCompleted = index < currentStepIndex;
        
        return (
          <div
            key={index}
            className={`direction-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
            onClick={() => handleStepClick(index)}
            role="button"
            tabIndex={0}
            aria-label={`Step ${index + 1}: ${step.maneuver.instruction}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStepClick(index);
              }
            }}
          >
            <div className="direction-step-icon">
              {getStepIcon(step.maneuver)}
            </div>
            
            <div className="direction-step-details">
              <div className="direction-step-instruction">
                {step.maneuver.instruction}
              </div>
              
              <div className="direction-step-metrics">
                <div className="direction-step-distance">
                  <span aria-hidden="true">📏</span>
                  {formatDistance(step.distance)}
                </div>
                <div className="direction-step-duration">
                  <span aria-hidden="true">⏱️</span>
                  {formatDuration(step.duration)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DirectionsList;
