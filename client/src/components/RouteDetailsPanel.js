import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  MapPinIcon, 
  ClockIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const RouteDetailsPanel = ({ 
  route, 
  routeMode, 
  isOpen, 
  onClose, 
  isDarkMode,
  activeLayers 
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['summary']));

  if (!route || !isOpen) return null;

  const routeData = route.features?.[0]?.properties || {};
  const coordinates = route.features?.[0]?.geometry?.coordinates || [];
  const accessibility = routeData.accessibility || {};

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getAccessibilityScore = () => {
    const score = accessibility.accessibilityScore || 95;
    if (score >= 90) return { level: 'Excellent', color: 'text-green-500', bg: 'bg-green-100' };
    if (score >= 75) return { level: 'Good', color: 'text-blue-500', bg: 'bg-blue-100' };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-100' };
    return { level: 'Poor', color: 'text-red-500', bg: 'bg-red-100' };
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      default: return '📍';
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case 'walking': return 'bg-green-500';
      case 'driving': return 'bg-blue-500';
      case 'transit': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const accessibilityScore = getAccessibilityScore();

  return (
    <div className={`fixed top-4 left-4 z-50 max-w-md w-full ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className={`p-4 rounded-lg shadow-xl max-h-96 overflow-y-auto ${
        isDarkMode 
          ? 'bg-gray-800 border border-gray-600' 
          : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getModeIcon(routeMode)}</span>
            <h3 className="font-semibold text-lg">Route Details</h3>
            <span className={`px-2 py-1 text-xs rounded-full text-white ${getModeColor(routeMode)}`}>
              {routeMode.charAt(0).toUpperCase() + routeMode.slice(1)}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-full hover:bg-opacity-20 ${
              isDarkMode ? 'hover:bg-white' : 'hover:bg-gray-800'
            }`}
            aria-label="Close panel"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Route Summary */}
        <div className="mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-3">
              <MapPinIcon className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium">
                  {(routeData.distance || 0).toFixed(2)} km
                </div>
                <div className="text-sm opacity-75">Distance</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ClockIcon className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium">
                  {Math.round(routeData.duration || 0)} min
                </div>
                <div className="text-sm opacity-75">Duration</div>
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium">Accessibility Score</div>
                <div className="text-sm opacity-75">{accessibilityScore.level}</div>
              </div>
            </div>
            <div className={`text-2xl font-bold ${accessibilityScore.color}`}>
              {accessibility.accessibilityScore || 95}%
            </div>
          </div>
        </div>

        {/* Mode-Specific Information */}
        {routeMode === 'walking' && (
          <div className="mb-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-medium mb-2">Walking Route Features</h4>
              <div className="space-y-2 text-sm">
                {accessibility.hasSidewalks && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>Sidewalks available</span>
                  </div>
                )}
                {accessibility.hasCurbCuts && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>Curb cuts present</span>
                  </div>
                )}
                {accessibility.avoidSteps && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>Steps avoided</span>
                  </div>
                )}
                {accessibility.stepsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                    <span>{accessibility.stepsCount} steps encountered</span>
                  </div>
                )}
                {accessibility.winterMode && (
                  <div className="flex items-center gap-2">
                    <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                    <span>Winter-maintained route</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {routeMode === 'driving' && (
          <div className="mb-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-medium mb-2">Driving Route Features</h4>
              <div className="space-y-2 text-sm">
                {route.accessibleParking && route.accessibleParking.length > 0 && (
                  <div>
                    <div className="font-medium mb-2">Accessible Parking Near Destination:</div>
                    {route.accessibleParking.slice(0, 3).map((parking, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded mb-2">
                        <div className="font-medium">{parking.name}</div>
                        <div className="text-sm opacity-75">{parking.distance}m away</div>
                        <div className="text-sm opacity-75">{parking.cost} • {parking.timeLimit}</div>
                        <div className="text-xs mt-1">
                          {parking.features.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {routeMode === 'transit' && (
          <div className="mb-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-medium mb-2">Transit Route Features</h4>
              <div className="space-y-2 text-sm">
                {accessibility.nearbyTransitStops > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>{accessibility.nearbyTransitStops} transit stops nearby</span>
                  </div>
                )}
                {accessibility.accessibleStops > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    <span>{accessibility.accessibleStops} accessible stops</span>
                  </div>
                )}
                {accessibility.nearbyWashrooms > 0 && (
                  <div className="flex items-center gap-2">
                    <InformationCircleIcon className="w-4 h-4 text-blue-500" />
                    <span>{accessibility.nearbyWashrooms} public washrooms nearby</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Route Directions */}
        {route.directions && (
          <div className="mb-4">
            <button
              onClick={() => toggleSection('directions')}
              className="w-full text-left font-medium mb-2 flex items-center justify-between"
            >
              <span>Step-by-Step Directions</span>
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            {expandedSections.has('directions') && (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {route.directions.map((step, index) => (
                  <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                    <div className="font-medium">Step {step.step}</div>
                    <div className="opacity-75">{step.instruction}</div>
                    {step.distance > 0 && (
                      <div className="text-xs opacity-60">{step.distance}m</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Layers Info */}
        {activeLayers.size > 0 && (
          <div className="mb-4">
            <div className="text-sm opacity-75">
              <div className="font-medium mb-1">Active Layers:</div>
              <div className="flex flex-wrap gap-1">
                {Array.from(activeLayers).map(layer => (
                  <span key={layer} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                    {layer}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Route Warnings */}
        {accessibility.accessibilityScore < 70 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div className="text-sm">
                <div className="font-medium">Accessibility Warning</div>
                <div className="opacity-75">This route may have accessibility challenges</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteDetailsPanel;
