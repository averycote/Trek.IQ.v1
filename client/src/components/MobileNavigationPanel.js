import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MapPinIcon, 
  ClockIcon, 
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';

const MobileNavigationPanel = ({ 
  route, 
  routeMode, 
  isOpen, 
  onClose, 
  onStartNavigation,
  onReroute,
  origin,
  destination,
  isDarkMode = false,
  isNavigating = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // Extract route data safely
  const routeData = route?.features?.[0]?.properties || {};
  const coordinates = route?.features?.[0]?.geometry?.coordinates || [];
  const accessibility = routeData.accessibility || {};
  const directions = routeData.directions || [];
  const barriers = routeData.analysis?.barriers || accessibility.analysis?.barriers || [];

  // Auto-advance through steps - must be before any conditional returns
  useEffect(() => {
    if (isAutoPlay && directions.length > 0) {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < directions.length - 1) {
            return prev + 1;
          } else {
            setIsAutoPlay(false);
            return prev;
          }
        });
      }, 3000); // 3 seconds per step

      return () => clearInterval(interval);
    }
  }, [isAutoPlay, directions.length]);

  console.log('MobileNavigationPanel: Props received:', { route, isOpen, routeMode, origin, destination, isDarkMode });
  
  if (!route || !isOpen) {
    console.log('MobileNavigationPanel: Not rendering - route or isOpen is falsy');
    return null;
  }
  
  // Additional safety check for route structure
  if (!route.features || !Array.isArray(route.features) || route.features.length === 0) {
    console.error('MobileNavigationPanel: Invalid route structure - missing features array');
    return null;
  }
  
  console.log('MobileNavigationPanel: Route data extracted:', { routeData, accessibility, directions, barriers });

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDistance = (meters) => {
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getAccessibilityScore = () => {
    const score = accessibility.score || accessibility.accessibilityScore || 85;
    if (score >= 90) return { level: 'Excellent', color: 'text-green-500', bg: 'bg-green-100', icon: '🟢' };
    if (score >= 75) return { level: 'Good', color: 'text-blue-500', bg: 'bg-blue-100', icon: '🔵' };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-100', icon: '🟡' };
    return { level: 'Poor', color: 'text-red-500', bg: 'bg-red-100', icon: '🔴' };
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      case 'cycling': return '🚴';
      default: return '📍';
    }
  };

  const accessibilityScore = getAccessibilityScore();

  return (
    <div className="mobile-navigation-panel">
      {/* Backdrop */}
      <div 
        className="mobile-navigation-backdrop"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={`mobile-navigation-container ${isDarkMode ? 'dark-mode' : ''} ${
        isExpanded ? 'mobile-navigation-expanded' : 'mobile-navigation-collapsed'
      }`}>
        
        {/* Handle */}
        <div className="mobile-navigation-handle">
          <div className="mobile-navigation-handle-bar" />
        </div>

        {/* Header */}
        <div className="mobile-navigation-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getModeIcon(routeMode)}</span>
              <div>
                <h3 className="font-bold text-lg">
                  {isNavigating ? 'Navigation Active' : 'Route Details'}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {formatDistance(routeData.distance || 0)} • {formatTime(Math.round((routeData.duration || 0) / 60))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mobile-navigation-content">
          {/* Route Summary Content - Always show route summary, even during navigation */}
          <div className="p-4">
            {/* Route Summary Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getModeIcon(routeMode)}</span>
                <div>
                  <p className="font-semibold text-lg">
                    {formatDistance(routeData.distance || 0)} • {formatTime(Math.round((routeData.duration || 0) / 60))}
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isNavigating ? 'Navigation Active' : 'Route Ready'}
                  </p>
                </div>
              </div>
              {isNavigating && (
                <button
                  onClick={onClose}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  End
                </button>
              )}
            </div>

            {/* Compact Route Info - Only show during navigation */}
            {isNavigating && (
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚶</span>
                    <span className="text-sm font-medium">walking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span className="text-sm font-medium">{formatTime(Math.round((routeData.duration || 0) / 60))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📏</span>
                    <span className="text-sm font-medium">{formatDistance(routeData.distance || 0)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Route Points - Compact during navigation */}
            {!isNavigating && (
              <div className="mobile-route-points mb-4">
                <div className="mobile-route-point">
                  <div className="mobile-route-marker start" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">From</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{origin}</p>
                  </div>
                </div>
                <div className="mobile-route-point">
                  <div className="mobile-route-marker end" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">To</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{destination}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Compact Route Points - During navigation */}
            {isNavigating && (
              <div className="mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">From {origin}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">To {destination}</div>
              </div>
            )}

            {/* Accessibility Score - Only show when not navigating */}
            {!isNavigating && (
              <div className="mobile-accessibility-score mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{accessibilityScore.icon}</span>
                  <div>
                    <p className="font-semibold">Accessibility Score</p>
                    <p className={`text-sm ${accessibilityScore.color}`}>{accessibilityScore.level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{accessibility.score || accessibility.accessibilityScore || 85}%</p>
                </div>
              </div>
            )}

            {/* Barriers Warning - Only show when not navigating */}
            {!isNavigating && barriers.length > 0 && (
              <div className="mobile-barriers-warning mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">Barriers Detected</p>
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  {barriers.length} accessibility barrier{barriers.length !== 1 ? 's' : ''} found along your route
                </p>
              </div>
            )}

            {/* Action Buttons - Only show when not navigating */}
            {!isNavigating && (
              <div className="space-y-3">
                <button
                  onClick={onStartNavigation}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <PlayIcon className="w-5 h-5" />
                  Start Navigation
                </button>
                
                <button
                  onClick={onReroute}
                  className={`w-full py-3 px-6 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                    isDarkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  Find Alternative Route
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileNavigationPanel;
