/**
 * Enhanced Route Summary Component
 * 
 * Displays comprehensive route information in a mobile-optimized bottom sheet
 * Shows distance, duration, accessibility score, warnings, and action buttons
 */

import React, { useState, useCallback } from 'react';
import { 
  MapPinIcon,
  ClockIcon,
  ArrowPathIcon,
  ShareIcon,
  Squares2X2Icon,
  PlayIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import './EnhancedRouteSummary.css';

const EnhancedRouteSummary = ({
  routeData = null,
  onStartNavigation,
  onShowAlternatives,
  onToggleLayers,
  onShare,
  isVisible = false,
  isMobile = false,
  accessibilitySettings = {}
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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
  const hasBarriers = routeData?.summary?.hasBarriers || false;

  /**
   * Format distance for display
   */
  const formatDistance = useCallback((distance) => {
    if (!distance) return 'N/A';
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  }, []);

  /**
   * Format duration for display
   */
  const formatDuration = useCallback((duration) => {
    if (!duration) return 'N/A';
    const minutes = Math.round(duration / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }, []);

  /**
   * Format elevation for display
   */
  const formatElevation = useCallback((elevation) => {
    if (!elevation) return 'N/A';
    return `${Math.round(elevation)}m`;
  }, []);

  /**
   * Get accessibility score color
   */
  const getAccessibilityColor = useCallback((grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100';
      case 'B': return 'text-yellow-600 bg-yellow-100';
      case 'C': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }, []);

  /**
   * Get warning icon and color
   */
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
   * Handle start navigation
   */
  const handleStartNavigation = useCallback(async () => {
    console.log('=== START NAVIGATION DEBUG ===');
    console.log('Start navigation clicked, routeData:', routeData);
    console.log('onStartNavigation function:', onStartNavigation);
    console.log('isStarting state:', isStarting);
    console.log('typeof onStartNavigation:', typeof onStartNavigation);
    
    setIsStarting(true);
    try {
      if (onStartNavigation && typeof onStartNavigation === 'function') {
        console.log('Calling onStartNavigation...');
        await onStartNavigation(routeData);
        console.log('onStartNavigation completed successfully');
      } else {
        console.warn('onStartNavigation handler not provided or not a function');
        console.warn('onStartNavigation:', onStartNavigation);
      }
    } catch (error) {
      console.error('Failed to start navigation:', error);
      console.error('Error stack:', error.stack);
    } finally {
      setIsStarting(false);
    }
  }, [onStartNavigation, routeData, isStarting]);

  /**
   * Handle share route
   */
  const handleShare = useCallback(() => {
    console.log('Share route clicked, routeData:', routeData);
    if (onShare) {
      onShare(routeData);
    } else {
      // Fallback to native sharing if available
      if (navigator.share && routeData.summary) {
        navigator.share({
          title: 'Trek.IQ Route',
          text: `Route from ${routeData.origin} to ${routeData.destination}`,
          url: window.location.href
        });
      }
    }
  }, [onShare, routeData]);



  // Early return after all hooks are defined
  if (!isVisible || !routeData) {
    return null;
  }

  return (
    <div className={`enhanced-route-summary ${isMobile ? 'mobile' : ''} ${isVisible ? 'visible' : ''}`}>
      {/* Main Content */}
      <div className="summary-content">
        {/* Header with expand/collapse */}
        <div className="summary-header">
          <div className="flex items-center justify-between">
            <h2 className="summary-title">Route Summary</h2>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-button"
              aria-label={isExpanded ? 'Collapse route details' : 'Expand route details'}
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-5 h-5" />
              ) : (
                <ChevronUpIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Basic Route Info */}
        <div className="basic-info">
          <div className="info-grid">
            <div className="info-item">
              <MapPinIcon className="info-icon" />
              <div>
                <span className="info-label">Distance</span>
                <span className="info-value">{formatDistance(summary.distance)}</span>
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

        {/* Expanded Details */}
        {isExpanded && (
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
                      <span className="detail-value">{formatDistance(summary.steepDistance)}</span>
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

            {/* Route Details */}
            {routeData.properties && (
              <div className="detail-section">
                <h3 className="detail-title">Route Details</h3>
                <div className="route-details">
                  {routeData.properties.summary && (
                    <p className="route-summary-text">{routeData.properties.summary}</p>
                  )}
                  {routeData.properties.instructions && routeData.properties.instructions.length > 0 && (
                    <div className="instructions-preview">
                      <span className="instructions-label">First few steps:</span>
                      <ul className="instructions-list">
                        {routeData.properties.instructions.slice(0, 3).map((instruction, index) => (
                          <li key={index} className="instruction-item">
                            {instruction.instruction}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}



        {/* Action Buttons */}
        <div className="action-buttons" style={{ 
          position: 'relative', 
          zIndex: 1000,
          pointerEvents: 'auto'
        }}>
          <button
            onClick={(e) => {
              console.log('=== BUTTON CLICK DEBUG ===');
              console.log('Button clicked! Event:', e);
              console.log('Button disabled state:', isStarting);
              console.log('handleStartNavigation function:', handleStartNavigation);
              console.log('typeof handleStartNavigation:', typeof handleStartNavigation);
              e.preventDefault();
              e.stopPropagation();
              handleStartNavigation();
            }}
            disabled={isStarting}
            className="btn-start"
            aria-label="Start navigation"
            style={{ 
              position: 'relative',
              zIndex: 9999,
              pointerEvents: 'auto',
              cursor: isStarting ? 'not-allowed' : 'pointer'
            }}
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


          <div className="secondary-buttons">
            {onShowAlternatives && (
              <button
                onClick={() => {
                  console.log('Show alternatives clicked');
                  onShowAlternatives(routeData);
                }}
                className="btn-secondary"
                aria-label="Show alternative routes"
                style={{ pointerEvents: 'auto' }}
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Alternatives</span>
              </button>
            )}

            {onToggleLayers && (
              <button
                onClick={() => {
                  console.log('Toggle layers clicked');
                  onToggleLayers();
                }}
                className="btn-secondary"
                aria-label="Toggle map layers"
                style={{ pointerEvents: 'auto' }}
              >
                <Squares2X2Icon className="w-4 h-4" />
                <span>Layers</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="btn-secondary"
              aria-label="Share route"
              style={{ pointerEvents: 'auto' }}
            >
              <ShareIcon className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedRouteSummary;
