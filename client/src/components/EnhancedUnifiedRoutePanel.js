import React, { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  MapPinIcon, 
  ExclamationTriangleIcon,
  StarIcon,
  HeartIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const EnhancedUnifiedRoutePanel = ({
  route,
  barriers = [],
  predictedBarriers = [],
  accessibilitySettings,
  onReroute,
  onBarrierReport,
  isMobile = false
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Announce route updates for screen readers
    if (route) {
      const announcement = `Route found: ${route.distance} kilometers, estimated time ${route.duration}`;
      // In a real app, you'd use a screen reader announcement service
      console.log('Screen reader announcement:', announcement);
    }
  }, [route]);

  if (!route) {
    return (
      <div className="trek-iq-route-panel trek-iq-fade-in">
        <div className="trek-iq-route-header">
          <div className="trek-iq-route-title">
            <span>Route Information</span>
          </div>
          <div className="text-center py-8 text-gray-400">
            <MapPinIcon className="w-12 h-12 mx-auto mb-4" />
            <p>Enter your destination to see route details</p>
          </div>
        </div>
      </div>
    );
  }

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

  const getBarrierSeverity = (barrier) => {
    if (barrier.severity === 'high' || barrier.type === 'closure') return 'high';
    if (barrier.severity === 'medium' || barrier.type === 'construction') return 'medium';
    return 'low';
  };

  const getBarrierIcon = (type) => {
    switch (type) {
      case 'closure': return '🚧';
      case 'construction': return '🏗️';
      case 'accessibility': return '♿';
      case 'safety': return '⚠️';
      default: return '🚫';
    }
  };

  const getPOIIcon = (type) => {
    switch (type) {
      case 'parking': return '🅿️';
      case 'washroom': return '🚻';
      case 'shelter': return '🏠';
      case 'stop': return '🚏';
      case 'hospital': return '🏥';
      case 'pharmacy': return '💊';
      default: return '📍';
    }
  };

  // Mock POIs - replace with actual data
  const nearbyPOIs = [
    { id: 1, name: 'Accessible Parking', type: 'parking', distance: 150, accessible: true },
    { id: 2, name: 'Public Washroom', type: 'washroom', distance: 300, accessible: true },
    { id: 3, name: 'Bus Shelter', type: 'shelter', distance: 450, accessible: true },
    { id: 4, name: 'Medical Center', type: 'hospital', distance: 800, accessible: true }
  ];

  if (isMobile) {
    return (
      <div className="trek-iq-route-panel trek-iq-fade-in">
        {/* Mobile Header */}
        <div className="trek-iq-route-header">
          <div className="trek-iq-route-title">
            <span>Route Details</span>
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              <HeartIcon className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          {/* Route Summary Stats */}
          <div className="trek-iq-route-summary">
            <div className="trek-iq-route-stat">
              <span className="trek-iq-route-stat-value">{formatDistance(route.distance)}</span>
              <span className="trek-iq-route-stat-label">Distance</span>
            </div>
            <div className="trek-iq-route-stat">
              <span className="trek-iq-route-stat-value">{formatTime(route.duration)}</span>
              <span className="trek-iq-route-stat-label">Duration</span>
            </div>
            <div className="trek-iq-route-stat">
              <span className="trek-iq-route-stat-value">{barriers.length}</span>
              <span className="trek-iq-route-stat-label">Barriers</span>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {['overview', 'barriers', 'pois', 'accessibility'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Mobile Tab Content */}
        <div className="trek-iq-route-content">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <InformationCircleIcon className="w-5 h-5" />
                  <span className="font-medium">Route Overview</span>
                </div>
                <p className="text-blue-700 text-sm">
                  This route is optimized for {accessibilitySettings?.wheelchair ? 'wheelchair' : 'standard'} accessibility.
                </p>
              </div>
              
              <button
                onClick={onReroute}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
              >
                <ArrowPathIcon className="w-5 h-5 inline mr-2" />
                Reroute Now
              </button>
            </div>
          )}

          {activeTab === 'barriers' && (
            <div className="space-y-3">
              {barriers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p>No barriers detected on this route</p>
                </div>
              ) : (
                barriers.map((barrier) => (
                  <div key={barrier.id} className="trek-iq-barrier-item">
                    <div className="trek-iq-barrier-header">
                      <div className="trek-iq-barrier-type">
                        <span className="text-xl mr-2">{getBarrierIcon(barrier.type)}</span>
                        <span>{barrier.description}</span>
                      </div>
                      <span className={`trek-iq-barrier-severity ${getBarrierSeverity(barrier)}`}>
                        {getBarrierSeverity(barrier)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Distance: {barrier.distance}m from start</p>
                      {barrier.duration && <p>Duration: {barrier.duration}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'pois' && (
            <div className="space-y-3">
              {nearbyPOIs.map((poi) => (
                <div key={poi.id} className="trek-iq-poi-item">
                  <div className="trek-iq-poi-icon">
                    <span className="text-xl">{getPOIIcon(poi.type)}</span>
                  </div>
                  <div className="trek-iq-poi-info">
                    <div className="trek-iq-poi-name">{poi.name}</div>
                    <div className="trek-iq-poi-distance">
                      <MapPinIcon className="w-4 h-4 inline mr-1" />
                      {poi.distance}m away
                    </div>
                  </div>
                  {poi.accessible && (
                    <div className="text-green-600 text-sm font-medium">♿ Accessible</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <StarIcon className="w-5 h-5" />
                  <span className="font-medium">Accessibility Features</span>
                </div>
                <ul className="text-green-700 text-sm space-y-1">
                  <li>• Wheelchair accessible sidewalks</li>
                  <li>• Curb ramps at intersections</li>
                  <li>• Audio signals at crosswalks</li>
                  <li>• Well-lit pathways</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="trek-iq-route-panel trek-iq-fade-in">
      <div className="trek-iq-route-header">
        <div className="trek-iq-route-title">
          <span>Route Information</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              <HeartIcon className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isCollapsed ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <div className="trek-iq-route-summary">
          <div className="trek-iq-route-stat">
            <span className="trek-iq-route-stat-value">{formatDistance(route.distance)}</span>
            <span className="trek-iq-route-stat-label">Distance</span>
          </div>
          <div className="trek-iq-route-stat">
            <span className="trek-iq-route-stat-value">{formatTime(route.duration)}</span>
            <span className="trek-iq-route-stat-label">Duration</span>
          </div>
          <div className="trek-iq-route-stat">
            <span className="trek-iq-route-stat-value">{barriers.length}</span>
            <span className="trek-iq-route-stat-label">Barriers</span>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="trek-iq-route-content">
          {/* Route Overview */}
          <div className="trek-iq-section">
            <div className="trek-iq-section-header">
              <div className="trek-iq-section-title">
                <InformationCircleIcon className="w-5 h-5" />
                Route Overview
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm">
                This route is optimized for {accessibilitySettings?.wheelchair ? 'wheelchair' : 'standard'} accessibility.
              </p>
            </div>
            <button
              onClick={onReroute}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
            >
              <ArrowPathIcon className="w-5 h-5 inline mr-2" />
              Reroute Now
            </button>
          </div>

          {/* Barriers Section */}
          <div className="trek-iq-section">
            <div className="trek-iq-section-header">
              <div className="trek-iq-section-title">
                <ExclamationTriangleIcon className="w-5 h-5" />
                Detected Barriers ({barriers.length})
              </div>
            </div>
            {barriers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p>No barriers detected on this route</p>
              </div>
            ) : (
              <div className="space-y-3">
                {barriers.map((barrier) => (
                  <div key={barrier.id} className="trek-iq-barrier-item">
                    <div className="trek-iq-barrier-header">
                      <div className="trek-iq-barrier-type">
                        <span className="text-xl mr-2">{getBarrierIcon(barrier.type)}</span>
                        <span>{barrier.description}</span>
                      </div>
                      <span className={`trek-iq-barrier-severity ${getBarrierSeverity(barrier)}`}>
                        {getBarrierSeverity(barrier)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Distance: {barrier.distance}m from start</p>
                      {barrier.duration && <p>Duration: {barrier.duration}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nearby POIs */}
          <div className="trek-iq-section">
            <div className="trek-iq-section-header">
              <div className="trek-iq-section-title">
                <MapPinIcon className="w-5 h-5" />
                Nearby Accessible POIs ({nearbyPOIs.length})
              </div>
            </div>
            <div className="space-y-3">
              {nearbyPOIs.map((poi) => (
                <div key={poi.id} className="trek-iq-poi-item">
                  <div className="trek-iq-poi-icon">
                    <span className="text-xl">{getPOIIcon(poi.type)}</span>
                  </div>
                  <div className="trek-iq-poi-info">
                    <div className="trek-iq-poi-name">{poi.name}</div>
                    <div className="trek-iq-poi-distance">
                      <MapPinIcon className="w-4 h-4 inline mr-1" />
                      {poi.distance}m away
                    </div>
                  </div>
                  {poi.accessible && (
                    <div className="text-green-600 text-sm font-medium">♿ Accessible</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Accessibility Notes */}
          <div className="trek-iq-section">
            <div className="trek-iq-section-header">
              <div className="trek-iq-section-title">
                <StarIcon className="w-5 h-5" />
                Accessibility Features
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <ul className="text-green-800 text-sm space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Wheelchair accessible sidewalks throughout the route
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Curb ramps at all intersections
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Audio signals at major crosswalks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Well-lit pathways for evening travel
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedUnifiedRoutePanel;
