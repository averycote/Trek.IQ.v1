import React from 'react';
import { NavState } from './state';
import TransitLogo from '../components/TransitLogo';

interface RouteHeaderProps {
  navigationState: any;
  onToggleMinimized: () => void;
}

const RouteHeader: React.FC<RouteHeaderProps> = ({
  navigationState,
  onToggleMinimized
}) => {
  const formatTime = (seconds: number) => {
    if (!seconds) return '--';
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatDistance = (meters: number) => {
    if (!meters) return '--';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getRouteModeIcon = (mode: string) => {
    switch (mode) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      case 'cycling': return '🚴';
      default: return '📍';
    }
  };

  const getRouteModeLabel = (mode: string) => {
    switch (mode) {
      case 'walking': return 'Walking';
      case 'driving': return 'Driving';
      case 'transit': return 'Transit';
      case 'cycling': return 'Cycling';
      default: return 'Route';
    }
  };

  return (
    <div className="route-header">
      <div className="route-header-title">
        <span className="route-header-icon" aria-hidden="true">
          {getRouteModeIcon(navigationState.routeMode)}
        </span>
        <span>{getRouteModeLabel(navigationState.routeMode)} Route</span>
      </div>

      <div className="route-metrics">
        <div className="route-metric">
          <div className="metric-value">
            {formatTime(navigationState.eta)}
          </div>
          <div className="metric-label">ETA</div>
        </div>
        
        <div className="route-metric">
          <div className="metric-value">
            {formatDistance(navigationState.distance)}
          </div>
          <div className="metric-label">Distance</div>
        </div>
      </div>

      {/* Transit API Attribution */}
      {navigationState.routeMode === 'transit' && navigationState.poweredByTransit && (
        <div className="route-transit-attribution" style={{ marginTop: '8px', textAlign: 'center' }}>
          <TransitLogo size="small" showText={false} />
        </div>
      )}

      {/* Route Progress */}
      {navigationState.currentState === NavState.ACTIVE_NAV && navigationState.progress !== undefined && (
        <div className="route-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${navigationState.progress}%` }}
              aria-label={`${Math.round(navigationState.progress)}% of route completed`}
            />
          </div>
          <div className="progress-text">
            {Math.round(navigationState.progress)}% complete
          </div>
        </div>
      )}

      {/* Route Points */}
      {navigationState.origin && navigationState.destination && (
        <div className="route-points">
          <div className="route-point">
            <div className="route-point-icon from">📍</div>
            <div className="route-point-details">
              <div className="route-point-label">FROM</div>
              <div className="route-point-address">{navigationState.origin}</div>
            </div>
          </div>
          
          <div className="route-point">
            <div className="route-point-icon to">🎯</div>
            <div className="route-point-details">
              <div className="route-point-label">TO</div>
              <div className="route-point-address">{navigationState.destination}</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Step Info */}
      {navigationState.currentStep && (
        <div className="current-step-info">
          <div className="step-instruction">
            {navigationState.currentStep.instruction}
          </div>
          {navigationState.currentStep.distance && (
            <div className="step-distance">
              {formatDistance(navigationState.currentStep.distance)} remaining
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteHeader;

