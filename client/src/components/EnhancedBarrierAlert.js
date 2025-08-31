/**
 * Unified Route Panel Component
 *
 * Combines barrier alerts and route summary into a single panel
 * Shows barriers, route details, and navigation options in one cohesive interface
 * Mobile-optimized with accessibility compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  PhotoIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
  ShareIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';
import './EnhancedBarrierAlert.css';
import './EnhancedRouteSummary.css';

const UnifiedRoutePanel = ({
  barriers = [],
  routeData = null,
  onReroute,
  onProceed,
  onDismiss,
  onReport,
  onStartNavigation,
  onShowAlternatives,
  onToggleLayers,
  onShare,
  isVisible = false,
  isMobile = false,
  accessibilitySettings = {}
}) => {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [acknowledgmentTime, setAcknowledgmentTime] = useState(null);
  const [selectedBarrier, setSelectedBarrier] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [expandedBarriers, setExpandedBarriers] = useState(new Set());
  const [isRerouting, setIsRerouting] = useState(false);

  // Route summary state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Reset state when alert becomes visible
  useEffect(() => {
    if (isVisible) {
      setHasAcknowledged(false);
      setAcknowledgmentTime(null);
      setSelectedBarrier(null);
      setShowPhotoModal(false);
      setExpandedBarriers(new Set());
      setIsRerouting(false);
      setIsExpanded(false);
      setIsStarting(false);
    }
  }, [isVisible]);

  // Get the most critical barrier for display
  const primaryBarrier = barriers[0] || null;
  const totalBarriers = barriers.length;

  /**
   * Get barrier icon based on type
   */
  const getBarrierIcon = useCallback((type) => {
    const iconMap = {
      'closure': '🚧',
      'construction': '🏗️',
      'accessibility': '♿',
      'safety': '⚠️',
      'weather': '🌧️',
      'traffic': '🚦',
      'steps_stairs': '🪜',
      'steep_slope': '📈',
      'obstructed_path': '🚫',
      'inaccessible_entrance': '🚪',
      'no_curb_cut': '🛤️',
      'poor_lighting': '💡',
      'snow_ice': '❄️',
      'sidewalk_closure': '🚧',
      'street_closure': '🚧',
      'traffic_control': '🚦',
      'winter_maintenance': '❄️',
      'user_reported': '📝'
    };
    return iconMap[type] || '🚫';
  }, []);

  /**
   * Get barrier title based on type
   */
  const getBarrierTitle = useCallback((type) => {
    const titleMap = {
      'closure': 'Route Closure',
      'construction': 'Construction Zone',
      'accessibility': 'Accessibility Issue',
      'safety': 'Safety Alert',
      'weather': 'Weather Warning',
      'traffic': 'Traffic Alert',
      'steps_stairs': 'Steps or Stairs Detected',
      'steep_slope': 'Steep Slope Ahead',
      'obstructed_path': 'Path Obstruction',
      'inaccessible_entrance': 'Inaccessible Entrance',
      'no_curb_cut': 'Missing Curb Cut',
      'poor_lighting': 'Poor Lighting',
      'snow_ice': 'Snow or Ice Hazard',
      'sidewalk_closure': 'Sidewalk Closure',
      'street_closure': 'Street Closure',
      'traffic_control': 'Traffic Control',
      'winter_maintenance': 'Winter Maintenance',
      'user_reported': 'User-Reported Barrier'
    };
    return titleMap[type] || 'Route Barrier';
  }, []);

  /**
   * Get severity text and color
   */
  const getSeverityInfo = useCallback((severity) => {
    const severityMap = {
      'critical': { text: 'Critical Impact', color: 'red', bgColor: 'bg-red-100' },
      'high': { text: 'High Impact', color: 'orange', bgColor: 'bg-orange-100' },
      'medium': { text: 'Medium Impact', color: 'yellow', bgColor: 'bg-yellow-100' },
      'low': { text: 'Low Impact', color: 'blue', bgColor: 'bg-blue-100' }
    };
    return severityMap[severity] || severityMap['medium'];
  }, []);

  /**
   * Format distance for display
   */
  const formatDistance = useCallback((distance) => {
    if (distance === 0) return 'At location';
    if (distance < 1000) return `${Math.round(distance)}m ahead`;
    return `${(distance / 1000).toFixed(1)}km ahead`;
  }, []);

  // Route summary utility functions
  const formatRouteDistance = useCallback((distance) => {
    if (!distance) return 'N/A';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  }, []);

  const formatDuration = useCallback((duration) => {
    if (!duration) return 'N/A';
    const minutes = Math.round(duration / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }, []);

  const formatElevation = useCallback((elevation) => {
    if (!elevation) return 'N/A';
    return `${Math.round(elevation)}m`;
  }, []);

  const getAccessibilityColor = useCallback((grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-yellow-600 bg-yellow-100';
      case 'C': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  const getWarningInfo = useCallback((warning) => {
    const warningMap = {
      'barriers': { icon: ExclamationTriangleIcon, color: 'text-red-600' },
      'steep': { icon: ArrowPathIcon, color: 'text-orange-600' },
      'weather': { icon: InformationCircleIcon, color: 'text-blue-600' },
      'construction': { icon: ExclamationTriangleIcon, color: 'text-yellow-600' }
    };
    return warningMap[warning.type] || { icon: InformationCircleIcon, color: 'text-gray-600' };
  }, []);

  /**
   * Handle barrier expansion toggle
   */
  const toggleBarrierExpansion = useCallback((barrierId) => {
    setExpandedBarriers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barrierId)) {
        newSet.delete(barrierId);
      } else {
        newSet.add(barrierId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle reroute request
   */
  const handleReroute = useCallback(async () => {
    setIsRerouting(true);
    try {
      if (onReroute) {
        await onReroute(routeData, barriers);
      }
    } catch (error) {
      console.error('Reroute failed:', error);
    } finally {
      setIsRerouting(false);
    }
  }, [onReroute, routeData, barriers]);

  /**
   * Handle proceed with barriers
   */
  const handleProceed = useCallback(() => {
    if (!hasAcknowledged) {
      alert('Please acknowledge the barriers before proceeding.');
      return;
    }

    setAcknowledgmentTime(new Date().toISOString());
    if (onProceed) {
      onProceed(routeData, barriers, acknowledgmentTime);
    }
  }, [hasAcknowledged, onProceed, routeData, barriers, acknowledgmentTime]);

  /**
   * Handle start navigation
   */
  const handleStartNavigation = useCallback(async () => {
    console.log('=== START NAVIGATION DEBUG ===');
    console.log('Start navigation clicked, routeData:', routeData);
    console.log('onStartNavigation function:', onStartNavigation);

    setIsStarting(true);
    try {
      if (onStartNavigation && typeof onStartNavigation === 'function') {
        console.log('Calling onStartNavigation...');
        await onStartNavigation(routeData);
        console.log('onStartNavigation completed successfully');
      } else {
        console.warn('onStartNavigation handler not provided or not a function');
      }
    } catch (error) {
      console.error('Failed to start navigation:', error);
    } finally {
      setIsStarting(false);
    }
  }, [onStartNavigation, routeData]);

  /**
   * Handle share route
   */
  const handleShare = useCallback(() => {
    console.log('Share route clicked, routeData:', routeData);
    if (onShare) {
      onShare(routeData);
    } else {
      // Fallback to native sharing if available
      if (navigator.share && routeData?.summary) {
        navigator.share({
          title: 'Trek.IQ Route',
          text: `Route from ${routeData.origin} to ${routeData.destination}`,
          url: window.location.href
        });
      }
    }
  }, [onShare, routeData]);

  /**
   * Handle barrier report
   */
  const handleReport = useCallback((barrier) => {
    setSelectedBarrier(barrier);
    if (onReport) {
      onReport(barrier);
    }
  }, [onReport]);

  /**
   * Render individual barrier item
   */
  const renderBarrierItem = useCallback((barrier, index) => {
    const isExpanded = expandedBarriers.has(barrier.id || index);
    const severityInfo = getSeverityInfo(barrier.severity);
    const icon = getBarrierIcon(barrier.type);
    const title = getBarrierTitle(barrier.type);
    
    return (
      <div 
        key={barrier.id || index}
        className={`barrier-item ${severityInfo.bgColor} border-l-4 border-${severityInfo.color}-500 rounded-lg p-4 mb-3`}
        role="region"
        aria-label={`Barrier ${index + 1}: ${title}`}
      >
        {/* Barrier Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl" role="img" aria-label={title}>
              {icon}
            </span>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{barrier.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Severity Badge */}
            <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${severityInfo.color}-100 text-${severityInfo.color}-800`}>
              {severityInfo.text}
            </span>
            
            {/* Expand/Collapse Button */}
            <button
              onClick={() => toggleBarrierExpansion(barrier.id || index)}
              className="p-1 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isExpanded ? 'Collapse barrier details' : 'Expand barrier details'}
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {/* Location */}
            {barrier.location && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPinIcon className="w-4 h-4" />
                <span>Location: {barrier.location}</span>
              </div>
            )}

            {/* Distance */}
            {barrier.distance !== undefined && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ClockIcon className="w-4 h-4" />
                <span>{formatDistance(barrier.distance)}</span>
              </div>
            )}

            {/* Additional Details */}
            {barrier.details && (
              <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                <p>{barrier.details}</p>
              </div>
            )}

            {/* Photo/Image */}
            {barrier.photo && (
              <div className="flex items-center space-x-2">
                <PhotoIcon className="w-4 h-4 text-gray-500" />
                <button
                  onClick={() => setShowPhotoModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Photo
                </button>
              </div>
            )}

            {/* Report Button */}
            <button
              onClick={() => handleReport(barrier)}
              className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-800"
            >
              <ExclamationTriangleIcon className="w-4 h-4" />
              <span>Report Issue</span>
            </button>
          </div>
        )}
      </div>
    );
  }, [expandedBarriers, getSeverityInfo, getBarrierIcon, getBarrierTitle, formatDistance, toggleBarrierExpansion, handleReport]);

  // Extract summary data from the correct structure
  const summary = {
    distance: routeData?.distance || routeData?.summary?.distance || 0,
    duration: routeData?.duration || routeData?.summary?.duration || 0,
    ascent: routeData?.summary?.ascent || 0,
    descent: routeData?.summary?.descent || 0,
    steepDistance: routeData?.summary?.steepDistance || 0,
    ...routeData?.summary
  };
  const accessibilityScore = routeData?.accessibilityScore || {};
  const warnings = routeData?.summary?.warnings || [];
  const hasBarriers = barriers && barriers.length > 0;

  // Early return after all hooks are defined
  if (!isVisible || (!routeData && !hasBarriers)) {
    return null;
  }

  return (
    <>
      {/* Unified Route Panel */}
      <div
        className={`enhanced-barrier-alert ${isMobile ? 'mobile' : ''} ${isVisible ? 'visible' : ''}`}
        role="dialog"
        aria-labelledby="route-panel-title"
        aria-describedby="route-panel-description"
      >
        {/* Header */}
        <div className="alert-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasBarriers ? (
                <ShieldExclamationIcon className="w-6 h-6 text-red-600" />
              ) : (
                <InformationCircleIcon className="w-6 h-6 text-blue-600" />
              )}
              <div>
                <h2 id="route-panel-title" className="text-lg font-semibold text-gray-900">
                  {hasBarriers ? 'Route Barriers Detected' : 'Route Summary'}
                </h2>
                <p id="route-panel-description" className="text-sm text-gray-600">
                  {hasBarriers
                    ? `${totalBarriers} barrier${totalBarriers !== 1 ? 's' : ''} found on your route`
                    : 'Review your route before starting navigation'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {routeData && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={isExpanded ? 'Collapse route details' : 'Expand route details'}
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5" />
                  ) : (
                    <ChevronUpIcon className="w-5 h-5" />
                  )}
                </button>
              )}
              <button
                onClick={onDismiss}
                className="p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close route panel"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Route Summary - Basic Info */}
        {routeData && (
          <div className="basic-info">
            <div className="info-grid">
              <div className="info-item">
                <MapPinIcon className="info-icon" />
                <div>
                  <span className="info-label">Distance</span>
                  <span className="info-value">{formatRouteDistance(summary.distance)}</span>
                </div>
              </div>

              <div className="info-item">
                <ClockIcon className="info-icon" />
                <div>
                  <span className="info-label">Duration</span>
                  <span className="info-value">{formatDuration(summary.duration)}</span>
                </div>
              </div>
            </div>

            {/* Accessibility Score */}
            {accessibilityScore.score !== undefined && (
              <div className="accessibility-score">
                <div className="score-header">
                  <InformationCircleIcon className="w-4 h-4 text-gray-500" />
                  <span className="score-label">Accessibility Score</span>
                </div>
                <div className={`score-value ${getAccessibilityColor(accessibilityScore.grade)}`}>
                  {accessibilityScore.score}/100 ({accessibilityScore.grade})
                </div>
                {accessibilityScore.explanation && (
                  <p className="score-explanation">{accessibilityScore.explanation}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Barrier List */}
        {hasBarriers && (
          <div className="barrier-list">
            {barriers.map((barrier, index) => renderBarrierItem(barrier, index))}
          </div>
        )}

        {/* Expanded Route Details */}
        {isExpanded && routeData && (
          <div className="expanded-details">
            {/* Elevation Information */}
            {(summary.ascent || summary.descent || summary.steepDistance) && (
              <div className="detail-section">
                <h3 className="detail-title">Elevation</h3>
                <div className="detail-grid">
                  {summary.ascent && (
                    <div className="detail-item">
                      <span className="detail-label">Ascent</span>
                      <span className="detail-value">{formatElevation(summary.ascent)}</span>
                    </div>
                  )}
                  {summary.descent && (
                    <div className="detail-item">
                      <span className="detail-label">Descent</span>
                      <span className="detail-value">{formatElevation(summary.descent)}</span>
                    </div>
                  )}
                  {summary.steepDistance && (
                    <div className="detail-item">
                      <span className="detail-label">Steep Distance</span>
                      <span className="detail-value">{formatRouteDistance(summary.steepDistance)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="detail-section">
                <h3 className="detail-title">Warnings</h3>
                <div className="warnings-list">
                  {warnings.map((warning, index) => {
                    const warningInfo = getWarningInfo(warning);
                    const WarningIcon = warningInfo.icon;

                    return (
                      <div key={index} className="warning-item">
                        <WarningIcon className={`w-4 h-4 ${warningInfo.color}`} />
                        <span className="warning-text">{warning.message}</span>
                        {warning.severity && (
                          <span className={`warning-severity warning-${warning.severity}`}>
                            {warning.severity}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acknowledgment Checkbox - Only show if there are barriers */}
        {hasBarriers && (
          <div className="acknowledgment-section">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAcknowledged}
                onChange={(e) => setHasAcknowledged(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                aria-describedby="acknowledgment-description"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  I understand the barriers and associated risks
                </span>
                <p id="acknowledgment-description" className="text-xs text-gray-600 mt-1">
                  By checking this box, you acknowledge that you have been informed of the barriers
                  and understand that proceeding may involve additional risks or challenges.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {/* Primary Actions */}
          <div className="primary-actions">
            {hasBarriers ? (
              <>
                <button
                  onClick={handleReroute}
                  disabled={isRerouting}
                  className="btn-reroute"
                  aria-label="Reroute to avoid barriers"
                >
                  {isRerouting ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      <span>Rerouting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-4 h-4" />
                      <span>Reroute</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleProceed}
                  disabled={!hasAcknowledged}
                  className="btn-proceed"
                  aria-label="Proceed with current route despite barriers"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Proceed</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartNavigation}
                disabled={isStarting}
                className="btn-start"
                aria-label="Start navigation"
              >
                {isStarting ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    <span>Start Navigation</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Secondary Actions */}
          {routeData && (
            <div className="secondary-actions">
              {onShowAlternatives && (
                <button
                  onClick={() => onShowAlternatives(routeData)}
                  className="btn-secondary"
                  aria-label="Show alternative routes"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Alternatives</span>
                </button>
              )}

              {onToggleLayers && (
                <button
                  onClick={onToggleLayers}
                  className="btn-secondary"
                  aria-label="Toggle map layers"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  <span>Layers</span>
                </button>
              )}

              <button
                onClick={handleShare}
                className="btn-secondary"
                aria-label="Share route"
              >
                <ShareIcon className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>

        {/* Information Footer */}
        <div className="info-footer">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <InformationCircleIcon className="w-4 h-4" />
            <span>
              {hasBarriers
                ? 'Trek.IQ has identified potential barriers on your route. Please review carefully before proceeding.'
                : 'Review your route details and tap Start Navigation to begin.'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && selectedBarrier?.photo && (
        <div className="photo-modal-overlay" onClick={() => setShowPhotoModal(false)}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="photo-modal-header">
              <h3 className="text-lg font-semibold">{getBarrierTitle(selectedBarrier.type)}</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="p-1 rounded-full hover:bg-gray-200"
                aria-label="Close photo modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="photo-modal-body">
              <img 
                src={selectedBarrier.photo} 
                alt={`Photo of ${getBarrierTitle(selectedBarrier.type)}`}
                className="w-full h-auto rounded"
              />
              <p className="text-sm text-gray-600 mt-2">{selectedBarrier.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { UnifiedRoutePanel };
export default UnifiedRoutePanel;
