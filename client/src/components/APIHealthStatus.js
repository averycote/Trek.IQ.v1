/**
 * API Health Status Component
 * 
 * Displays real-time API health status and provides user-friendly
 * feedback when services are experiencing issues.
 */

import React, { useState, useEffect } from 'react';
import apiHealthMonitor from '../services/apiHealthMonitor';

const APIHealthStatus = ({ 
  showDetails = false, 
  onStatusChange = null,
  className = '' 
}) => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to health status changes
    const handleHealthChange = (overallHealth) => {
      setHealthStatus(overallHealth);
      if (onStatusChange) {
        onStatusChange(overallHealth);
      }
    };

    apiHealthMonitor.subscribeToHealthChanges(handleHealthChange);

    // Get initial health status
    const initialHealth = apiHealthMonitor.getOverallHealth();
    setHealthStatus(initialHealth);

    return () => {
      apiHealthMonitor.unsubscribeFromHealthChanges(handleHealthChange);
    };
  }, [onStatusChange]);

  if (!healthStatus) {
    return null;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'unavailable':
        return '❌';
      case 'error':
        return '🚨';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'unavailable':
        return 'text-red-600';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200';
      case 'unavailable':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Don't show anything if all services are healthy and details are not requested
  if (healthStatus.status === 'healthy' && !showDetails) {
    return null;
  }

  return (
    <div className={`api-health-status ${className}`}>
      {/* Main status indicator */}
      <div 
        className={`flex items-center justify-between p-3 rounded-lg border ${getStatusBgColor(healthStatus.status)} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getStatusIcon(healthStatus.status)}</span>
          <div>
            <p className={`font-medium ${getStatusColor(healthStatus.status)}`}>
              {healthStatus.status === 'healthy' ? 'All services operational' : 
               healthStatus.status === 'degraded' ? 'Some services experiencing issues' :
               healthStatus.status === 'unavailable' ? 'Services temporarily unavailable' :
               'Service status unknown'}
            </p>
            {healthStatus.message && (
              <p className="text-sm text-gray-600">{healthStatus.message}</p>
            )}
          </div>
        </div>
        
        {showDetails && (
          <button className="text-gray-500 hover:text-gray-700">
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && showDetails && (
        <div className="mt-2 space-y-2">
          {Object.entries(apiHealthMonitor.getHealthSummary().services).map(([serviceName, serviceHealth]) => (
            <div key={serviceName} className="p-2 bg-white rounded border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{getStatusIcon(serviceHealth.status)}</span>
                  <span className="font-medium text-sm capitalize">
                    {serviceName.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <span className={`text-xs ${getStatusColor(serviceHealth.status)}`}>
                  {serviceHealth.status}
                </span>
              </div>
              
              {serviceHealth.message && (
                <p className="text-xs text-gray-600 mt-1">{serviceHealth.message}</p>
              )}
              
              {serviceHealth.consecutiveFailures > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {serviceHealth.consecutiveFailures} consecutive failures
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {healthStatus.status !== 'healthy' && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">💡 Recommendations:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {healthStatus.status === 'unavailable' && (
              <>
                <li>• Some data may not be available right now</li>
                <li>• Please try again in a few minutes</li>
                <li>• The app will continue to work with cached data</li>
              </>
            )}
            {healthStatus.status === 'degraded' && (
              <>
                <li>• Services are working but may be slower</li>
                <li>• Some features might have limited functionality</li>
                <li>• Data will be refreshed when services recover</li>
              </>
            )}
            <li>• You can continue using the app normally</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default APIHealthStatus;
