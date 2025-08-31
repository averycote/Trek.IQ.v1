import React, { useState } from 'react';
import {
  XMarkIcon,
  MapPinIcon,
  ClockIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  WifiIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  TruckIcon,
  BusIcon,
  CarIcon,
  PersonWalkingIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import TransitLogo from './TransitLogo';

const UnifiedRoutePanel = ({
  route,
  routeMode,
  isOpen,
  onClose,
  isDarkMode,
  onReroute,
  onStartNavigation,
  origin,
  destination
}) => {
  const [expandedSections, setExpandedSections] = useState(new Set(['overview', 'barriers']));

  if (!route || !isOpen) return null;

  const routeData = route.features?.[0]?.properties || {};
  const coordinates = route.features?.[0]?.geometry?.coordinates || [];
  const accessibility = routeData.accessibility || {};
  const barriers = accessibility.analysis?.barriers || [];
  const warnings = accessibility.analysis?.warnings || [];
  const recommendations = accessibility.analysis?.recommendations || [];
  const amenities = accessibility.amenities || {};
  const aiInsights = routeData.aiInsights || {};

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
    const score = accessibility.score || 95;
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

  const getRouteColorInfo = (score) => {
    if (score >= 90) return { color: 'bg-green-500', label: 'Excellent', textColor: 'text-green-600' };
    if (score >= 75) return { color: 'bg-blue-500', label: 'Good', textColor: 'text-blue-600' };
    if (score >= 60) return { color: 'bg-orange-500', label: 'Fair', textColor: 'text-orange-600' };
    if (score >= 40) return { color: 'bg-red-500', label: 'Poor', textColor: 'text-red-600' };
    return { color: 'bg-purple-500', label: 'Very Poor', textColor: 'text-purple-600' };
  };

  const getBarrierSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const accessibilityScore = getAccessibilityScore();

  return (
    <div className={`fixed z-50 ${isDarkMode ? 'text-white' : 'text-gray-800'} ${
      window.innerWidth <= 768
        ? 'bottom-24 left-4 right-4 max-w-none'
        : 'bottom-4 left-4 max-w-md'
    }`}>
      <div className={`p-4 rounded-lg shadow-xl overflow-y-auto ${
        isDarkMode
          ? 'bg-gray-800 border border-gray-600'
          : 'bg-white border border-gray-200'
      } ${
        window.innerWidth <= 768
          ? 'max-h-80'
          : 'max-h-96'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getModeIcon(routeMode)}</span>
            <h3 className="font-semibold text-lg">Route Information</h3>
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

        {/* Route Overview */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('overview')}
            className="w-full text-left font-medium mb-2 flex items-center justify-between"
          >
            <span>Route Overview</span>
            {expandedSections.has('overview') ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          {expandedSections.has('overview') && (
            <div className="space-y-3">
              {/* Distance and Duration */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="font-medium">
                      {(() => {
                        const distance = routeData.distance || 0;
                        if (distance >= 1000) {
                          return `${(distance / 1000).toFixed(1)} km`;
                        }
                        return `${Math.round(distance)} m`;
                      })()}
                    </div>
                    <div className="text-sm opacity-75">Distance</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ClockIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium">
                      {(() => {
                        const duration = routeData.duration || 0;
                        if (duration >= 3600) { // More than 1 hour
                          const hours = Math.floor(duration / 3600);
                          const minutes = Math.round((duration % 3600) / 60);
                          return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                        }
                        return `${Math.round(duration / 60)} min`;
                      })()}
                    </div>
                    <div className="text-sm opacity-75">Duration</div>
                  </div>
                </div>
              </div>

              {/* Accessibility Score */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium">Accessibility Score</div>
                    <div className="text-sm opacity-75">{accessibilityScore.level}</div>
                  </div>
                </div>
                <div className={`text-2xl font-bold ${accessibilityScore.color}`}>
                  {accessibilityScore.icon} {accessibility.score || 95}%
                </div>
              </div>

              {/* Route Color Indicator */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${getRouteColorInfo(accessibility.score || 85).color}`}></div>
                  <div>
                    <div className="font-medium">Route Line Color</div>
                    <div className="text-sm opacity-75">Shows accessibility level</div>
                  </div>
                </div>
                <div className={`font-medium ${getRouteColorInfo(accessibility.score || 85).textColor}`}>
                  {getRouteColorInfo(accessibility.score || 85).label}
                </div>
              </div>

              {/* Route endpoints */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">From:</span>
                    <span className="opacity-75">{origin?.display_name || 'Selected location'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="font-medium">To:</span>
                    <span className="opacity-75">{destination?.display_name || 'Selected location'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barriers and Warnings */}
        {(barriers.length > 0 || warnings.length > 0) && (
          <div className="mb-4">
            <button
              onClick={() => toggleSection('barriers')}
              className="w-full text-left font-medium mb-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <span>Barriers & Warnings ({barriers.length + warnings.length})</span>
              </div>
              {expandedSections.has('barriers') ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has('barriers') && (
              <div className="space-y-3">
                {/* Barriers */}
                {barriers.map((barrier, index) => (
                  <div key={`barrier-${index}`} className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🚧</span>
                        <span className="font-medium">{barrier.type}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getBarrierSeverityColor(barrier.severity)}`}>
                          {barrier.severity}
                        </span>
                      </div>
                      {onReroute && (
                        <button
                          onClick={() => onReroute(barrier)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Reroute
                        </button>
                      )}
                    </div>
                    <div className="text-sm opacity-75 mb-2">{barrier.description}</div>
                    {barrier.distance && (
                      <div className="text-xs opacity-60">
                        Distance: {(barrier.distance * 1000).toFixed(0)}m from route
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Warnings */}
                {warnings.map((warning, index) => (
                  <div key={`warning-${index}`} className="p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <span className="font-medium">{warning.type}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getBarrierSeverityColor(warning.severity)}`}>
                          {warning.severity}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm opacity-75 mb-2">{warning.description}</div>
                    {warning.distance && (
                      <div className="text-xs opacity-60">
                        Distance: {(warning.distance * 1000).toFixed(0)}m from route
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Insights */}
        {aiInsights.explanation && (
          <div className="mb-4">
            <button
              onClick={() => toggleSection('aiInsights')}
              className="w-full text-left font-medium mb-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <LightBulbIcon className="w-5 h-5 text-purple-500" />
                <span>AI Insights</span>
              </div>
              {expandedSections.has('aiInsights') ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has('aiInsights') && (
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                  <div className="text-sm opacity-75 mb-2">
                    {aiInsights.explanation}
                  </div>
                  {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-medium text-sm">Recommendations:</div>
                      {aiInsights.recommendations.map((rec, index) => (
                        <div key={index} className="text-xs opacity-75">
                          • {rec.description || rec.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accessibility Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => toggleSection('recommendations')}
              className="w-full text-left font-medium mb-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-blue-500" />
                <span>Recommendations ({recommendations.length})</span>
              </div>
              {expandedSections.has('recommendations') ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has('recommendations') && (
              <div className="space-y-3">
                {recommendations.map((recommendation, index) => (
                  <div key={index} className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{recommendation.description}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        recommendation.priority === 'critical' ? 'bg-red-100 text-red-600' :
                        recommendation.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {recommendation.priority}
                      </span>
                    </div>
                    <div className="text-sm opacity-75">
                      {recommendation.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Amenities */}
        {amenities && Object.keys(amenities).length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => toggleSection('amenities')}
              className="w-full text-left font-medium mb-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                <span>Nearby Amenities</span>
              </div>
              {expandedSections.has('amenities') ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
            {expandedSections.has('amenities') && (
              <div className="space-y-3">
                {/* Washrooms */}
                {amenities.accessibleWashrooms && amenities.accessibleWashrooms.length > 0 && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🚻</span>
                      <span className="font-medium">Accessible Washrooms</span>
                      <span className="text-sm opacity-75">({amenities.accessibleWashrooms.length})</span>
                    </div>
                    <div className="text-sm opacity-75">
                      {amenities.accessibleWashrooms.slice(0, 2).map((washroom, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{washroom.name}</span>
                          <span>{washroom.distance}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bus Stops */}
                {amenities.accessibleBusStops && amenities.accessibleBusStops.length > 0 && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🚏</span>
                      <span className="font-medium">Accessible Bus Stops</span>
                      <span className="text-sm opacity-75">({amenities.accessibleBusStops.length})</span>
                    </div>
                    <div className="text-sm opacity-75">
                      {amenities.accessibleBusStops.slice(0, 2).map((stop, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{stop.name}</span>
                          <span>{stop.distance}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parking */}
                {amenities.accessibleParking && amenities.accessibleParking.length > 0 && (
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🅿️</span>
                      <span className="font-medium">Accessible Parking</span>
                      <span className="text-sm opacity-75">({amenities.accessibleParking.length})</span>
                    </div>
                    <div className="text-sm opacity-75">
                      {amenities.accessibleParking.slice(0, 2).map((parking, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{parking.name}</span>
                          <span>{parking.distance}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Accessibility Details */}
        <div className="mb-4">
          <button
            onClick={() => toggleSection('accessibility')}
            className="w-full text-left font-medium mb-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-green-500" />
              <span>Accessibility Details</span>
            </div>
            {expandedSections.has('accessibility') ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
          {expandedSections.has('accessibility') && (
            <div className="space-y-3">
              {/* Mode-specific features */}
              {routeMode === 'walking' && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <h4 className="font-medium mb-2">Walking Features</h4>
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
              )}

              {routeMode === 'driving' && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <h4 className="font-medium mb-2">Driving Features</h4>
                  <div className="space-y-2 text-sm">
                    {routeData.accessibleParking && routeData.accessibleParking.length > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span>{routeData.accessibleParking.length} accessible parking spots nearby</span>
                      </div>
                    )}
                    {accessibility.hasTrafficSignals && (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span>Traffic signals present</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {routeMode === 'transit' && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <h4 className="font-medium mb-2">Transit Features</h4>
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
                  </div>
                </div>
              )}

              {/* General accessibility info */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                <h4 className="font-medium mb-2">General Accessibility</h4>
                <div className="space-y-2 text-sm">
                  {accessibility.surfaceType && (
                    <div className="flex items-center gap-2">
                      <span>Surface: {accessibility.surfaceType}</span>
                    </div>
                  )}
                  {accessibility.elevation && (
                    <div className="flex items-center gap-2">
                      <span>Elevation: {accessibility.elevation}</span>
                    </div>
                  )}
                  {accessibility.lighting && (
                    <div className="flex items-center gap-2">
                      <LightBulbIcon className="w-4 h-4 text-yellow-500" />
                      <span>Street lighting available</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transit API Attribution */}
        {routeMode === 'transit' && (route?.properties?.poweredByTransit || route?.features?.some(f => f.properties?.poweredByTransit)) && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-center">
              <TransitLogo size="small" showText={true} />
            </div>
            <div className="text-xs text-center mt-2 opacity-75">
              Real-time transit data provided by Transit App API
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2">
          {onStartNavigation && (
            <button
              onClick={() => onStartNavigation(route)}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
            >
              🚀 Start Navigation
            </button>
          )}
          {onReroute && barriers.length > 0 && (
            <button
              onClick={() => onReroute(barriers[0])}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              Reroute Now
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedRoutePanel;
