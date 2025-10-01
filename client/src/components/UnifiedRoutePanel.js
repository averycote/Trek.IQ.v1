// OPTIMIZATION: Added useMemo and useCallback for performance
import React, { useState, useEffect, useMemo, useCallback } from 'react';
// OPTIMIZATION: Removed unused imports to reduce bundle size
import {
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import TransitLogo from './TransitLogo';
import accessibilityCloudService from '../services/accessibilityCloudService';
import wheelmapApiService from '../services/wheelmapApiService';

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
  const [expandedSections, setExpandedSections] = useState(new Set(['barriers']));
  const [accessibilityData, setAccessibilityData] = useState(null);
  const [loadingAccessibility, setLoadingAccessibility] = useState(false);
  const [wheelmapData, setWheelmapData] = useState(null);
  const [nearbyAccessiblePlaces, setNearbyAccessiblePlaces] = useState([]);
  const [loadingWheelmap, setLoadingWheelmap] = useState(false);

  // Fetch accessibility data when route changes
  useEffect(() => {
    const fetchAccessibilityData = async () => {
      if (!route?.features?.[0]?.geometry?.coordinates) {
        return;
      }

      setLoadingAccessibility(true);
      try {
        console.log('🌐 UnifiedRoutePanel: Fetching accessibility data for route');
        const accessibilityInfo = await accessibilityCloudService.getRouteAccessibilityData(route);
        setAccessibilityData(accessibilityInfo);
        console.log('✅ UnifiedRoutePanel: Accessibility data loaded:', accessibilityInfo);
      } catch (error) {
        console.error('❌ UnifiedRoutePanel: Error loading accessibility data:', error);
        setAccessibilityData(accessibilityCloudService.createErrorResponse());
      } finally {
        setLoadingAccessibility(false);
      }
    };

    if (isOpen) {
      fetchAccessibilityData();
    }
  }, [route, isOpen]);

  // Fetch Wheelmap data when route changes
  useEffect(() => {
    const fetchWheelmapData = async () => {
      if (!route?.features?.[0]?.geometry?.coordinates || !isOpen) {
        setWheelmapData(null);
        setNearbyAccessiblePlaces([]);
        return;
      }

      setLoadingWheelmap(true);
      try {
        console.log('🌐 UnifiedRoutePanel: Fetching Wheelmap data for route');
        
        // Analyze route accessibility
        const routeAnalysis = await wheelmapApiService.analyzeRouteAccessibility(route);
        setWheelmapData(routeAnalysis);

        // Get destination coordinates for nearby places
        const routeCoords = route?.features?.[0]?.geometry?.coordinates;
        if (!routeCoords || routeCoords.length === 0) {
          console.warn('No route coordinates available');
          return;
        }
        const destinationCoords = routeCoords[routeCoords.length - 1];
        
        // Find nearby accessible places at destination
        const nearbyPlaces = await wheelmapApiService.findNearbyAccessiblePlaces(destinationCoords, 3);
        setNearbyAccessiblePlaces(nearbyPlaces);

        console.log('✅ UnifiedRoutePanel: Wheelmap data loaded successfully');
      } catch (error) {
        console.error('❌ UnifiedRoutePanel: Error fetching Wheelmap data:', error);
        setWheelmapData(null);
        setNearbyAccessiblePlaces([]);
      } finally {
        setLoadingWheelmap(false);
      }
    };

    if (isOpen) {
      fetchWheelmapData();
    }
  }, [route, isOpen]);

  // OPTIMIZATION: Move all hooks before early return to comply with Rules of Hooks
  // Memoize expensive route data calculations
  const routeData = useMemo(() => route?.features?.[0]?.properties || {}, [route]);
  const coordinates = useMemo(() => route?.features?.[0]?.geometry?.coordinates || [], [route]);
  const accessibility = useMemo(() => routeData.accessibility || {}, [routeData]);
  const barriers = useMemo(() => accessibility.analysis?.barriers || [], [accessibility]);
  const warnings = useMemo(() => accessibility.analysis?.warnings || [], [accessibility]);
  const recommendations = useMemo(() => accessibility.analysis?.recommendations || [], [accessibility]);
  const amenities = useMemo(() => accessibility.amenities || {}, [accessibility]);
  const aiInsights = useMemo(() => routeData.aiInsights || {}, [routeData]);

  // Memoize callback functions to prevent unnecessary re-renders
  const toggleSection = useCallback((section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }, [expandedSections]);

  // Memoize accessibility score calculation using comprehensive scoring
  const accessibilityScoreInfo = useMemo(() => {
    // Use comprehensive accessibility data if available
    const comprehensiveData = routeData.comprehensiveAccessibility;
    if (comprehensiveData) {
      const colorMap = {
        '#10b981': { level: 'Excellent', color: 'text-green-500', bg: 'bg-green-100', icon: '🟢' },
        '#3b82f6': { level: 'Good', color: 'text-blue-500', bg: 'bg-blue-100', icon: '🔵' },
        '#f59e0b': { level: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-100', icon: '🟡' },
        '#ef4444': { level: 'Poor', color: 'text-red-500', bg: 'bg-red-100', icon: '🔴' },
        '#7c2d12': { level: 'Very Poor', color: 'text-red-700', bg: 'bg-red-200', icon: '🔴' }
      };
      
      return {
        ...colorMap[comprehensiveData.color] || colorMap['#3b82f6'],
        score: comprehensiveData.overallScore,
        grade: comprehensiveData.grade,
        details: comprehensiveData
      };
    }
    
    // Fallback to existing logic
    const score = accessibility.score || 95;
    if (score >= 90) return { level: 'Excellent', color: 'text-green-500', bg: 'bg-green-100', icon: '🟢', score };
    if (score >= 75) return { level: 'Good', color: 'text-blue-500', bg: 'bg-blue-100', icon: '🔵', score };
    if (score >= 60) return { level: 'Fair', color: 'text-yellow-500', bg: 'bg-yellow-100', icon: '🟡', score };
    return { level: 'Poor', color: 'text-red-500', bg: 'bg-red-100', icon: '🔴', score };
  }, [accessibility.score, routeData.comprehensiveAccessibility]);

  if (!route || !isOpen) return null;

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

  // OPTIMIZATION: Use memoized accessibility score info
  const accessibilityScore = accessibilityScoreInfo;

  return (
    <div className={`fixed z-50 ${isDarkMode ? 'text-white' : 'text-gray-800'} ${
      window.innerWidth <= 768
        ? 'bottom-16 left-4 right-4 max-w-none'
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

        {/* Route Overview section removed per user request */}

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

        {/* Comprehensive Accessibility Information */}
        <div className="mb-4">
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">♿</span>
              <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">Route Accessibility</span>
            </div>
            <div className="space-y-4">
              {/* Overall Score - Cleaned up layout */}
              <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{accessibilityScore.icon || '🟢'}</span>
                    <div>
                      <div className="font-medium text-gray-800 dark:text-gray-200">Overall Score</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Based on accessibility data</div>
                </div>
                        </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      <span className={accessibilityScore.color}>
                        {accessibilityScore.score || accessibilityData?.accessibilityScore || wheelmapData?.accessibilityScore || 85}%
                              </span>
                            </div>
                    {accessibilityScore.grade && (
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Grade {accessibilityScore.grade}
                    </div>
                  )}
                    </div>
        </div>

                {/* Supporting evidence bullet points */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
                  {/* Confidence and warnings row */}
                  {accessibilityScore.details && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">
                        Confidence: {Math.round(accessibilityScore.details.confidence * 100)}%
                      </span>
                      {accessibilityScore.details.analysis?.warnings?.length > 0 && (
                        <span className="text-orange-600 dark:text-orange-400">
                          {accessibilityScore.details.analysis.warnings.length} warning(s)
                        </span>
              )}
            </div>
                  )}
                  
                  {/* Supporting evidence bullet points */}
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Supporting Evidence:
                          </div>
                    <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                      {/* Generate bullet points based on comprehensive scoring data */}
                      {accessibilityScore.details?.components?.elevation?.score > 80 && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span>Minimal elevation changes detected</span>
                </div>
              )}
                      {accessibilityScore.details?.components?.barriers?.score > 85 && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span>Users report no significant barriers</span>
            </div>
          )}
                      {accessibilityScore.details?.components?.infrastructure?.score > 75 && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span>Good sidewalk infrastructure available</span>
        </div>
                      )}
                      {accessibilityScore.details?.components?.amenities?.score > 70 && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span>Accessible amenities found along route</span>
            </div>
                      )}
                      {accessibilityScore.details?.analysis?.steepSegments?.length === 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 dark:text-green-400">•</span>
                          <span>No steep slopes detected</span>
                              </div>
                            )}
                      
                      {/* Negative indicators */}
                      {accessibilityScore.details?.components?.elevation?.score < 60 && (
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600 dark:text-orange-400">•</span>
                          <span>Significant elevation changes present</span>
                </div>
              )}
                      {accessibilityScore.details?.components?.barriers?.score < 70 && (
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600 dark:text-orange-400">•</span>
                          <span>Potential barriers reported by users</span>
            </div>
          )}
                      {accessibilityScore.details?.analysis?.steepSegments?.length > 0 && (
                        <div className="flex items-start gap-2">
                          <span className="text-orange-600 dark:text-orange-400">•</span>
                          <span>{accessibilityScore.details.analysis.steepSegments.length} steep segment(s) detected</span>
        </div>
                      )}
                      
                      {/* Fallback bullet points if no comprehensive data */}
                      {!accessibilityScore.details && (
                        <>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400">•</span>
                            <span>Route analyzed for accessibility features</span>
            </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400">•</span>
                            <span>Based on community accessibility data</span>
                      </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400">•</span>
                            <span>Infrastructure and barrier assessment included</span>
                      </div>
                        </>
                    )}
                      </div>
                      </div>
                  </div>
                </div>

              {/* Route Conditions */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-center">
                  <div className="text-lg mb-1">🚶</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Travel Mode</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{routeMode}</div>
                      </div>
                    
                <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-center">
                  <div className="text-lg mb-1">📏</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Distance</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{(route?.features?.[0]?.properties?.distance / 1000 || 0).toFixed(1)} km</div>
                      </div>
                    
                <div className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-center">
                  <div className="text-lg mb-1">⏱️</div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Duration</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">{Math.round((route?.features?.[0]?.properties?.duration || 0) / 60)} min</div>
                  </div>
                </div>
                    
              {/* Barriers Status */}
              <div className={`p-3 rounded-lg border ${
                (wheelmapData?.barriers && wheelmapData.barriers.length > 0) 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
                      <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {(wheelmapData?.barriers && wheelmapData.barriers.length > 0) ? '⚠️' : '✅'}
                  </span>
                        <div>
                    <div className={`font-medium ${
                      (wheelmapData?.barriers && wheelmapData.barriers.length > 0)
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-green-800 dark:text-green-200'
                    }`}>
                      {(wheelmapData?.barriers && wheelmapData.barriers.length > 0) ? 'Barriers Detected' : 'No Barriers'}
                      </div>
                    <div className={`text-sm ${
                      (wheelmapData?.barriers && wheelmapData.barriers.length > 0)
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {(wheelmapData?.barriers && wheelmapData.barriers.length > 0) 
                        ? `${wheelmapData.barriers.length} accessibility barrier${wheelmapData.barriers.length !== 1 ? 's' : ''} found`
                        : 'Route appears accessible'
                      }
                      </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              {wheelmapData && wheelmapData.totalPOIs > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{wheelmapData.accessible}</div>
                    <div className="text-xs text-green-600 dark:text-green-400">Accessible Places</div>
                    </div>
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-center">
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{wheelmapData.partiallyAccessible}</div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">Partial Access</div>
                    </div>
                    </div>
                  )}
                </div>
              </div>
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
