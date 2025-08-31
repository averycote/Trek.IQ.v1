import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  ArrowPathIcon,
  InformationCircleIcon,
  MapPinIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  PhotoIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import './LiabilityBarrierAlert.css';

const LiabilityBarrierAlert = ({
  barriers = [],
  analysis = null,
  onReroute,
  onProceed,
  onDismiss,
  onReport,
  isVisible = false,
  isMobile = false,
  routeData = null
}) => {
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [acknowledgmentTime, setAcknowledgmentTime] = useState(null);
  const [selectedBarrier, setSelectedBarrier] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Reset acknowledgment when alert becomes visible
      setHasAcknowledged(false);
      setAcknowledgmentTime(null);
      setSelectedBarrier(null);
      setShowPhotoModal(false);
    }
  }, [isVisible]);

  // Debug logging
  console.log('LiabilityBarrierAlert render:', {
    isVisible,
    barriersCount: barriers?.length,
    barriers,
    analysis
  });

  if (!isVisible || !barriers || barriers.length === 0) {
    console.log('LiabilityBarrierAlert: Not rendering - conditions not met');
    return null;
  }

  // Get the most critical barrier for display
  const primaryBarrier = barriers[0] || null;
  const totalBarriers = barriers.length;

  const getBarrierIcon = (type) => {
    switch (type) {
      case 'closure': return '🚧';
      case 'construction': return '🏗️';
      case 'accessibility': return '♿';
      case 'safety': return '⚠️';
      case 'weather': return '🌧️';
      case 'traffic': return '🚦';
      case 'steps_stairs': return '🪜';
      case 'steep_slope': return '📈';
      case 'obstructed_path': return '🚫';
      case 'inaccessible_entrance': return '🚪';
      case 'no_curb_cut': return '🛤️';
      case 'poor_lighting': return '💡';
      case 'snow_ice': return '❄️';
      default: return '🚫';
    }
  };

  const getBarrierTitle = (type) => {
    const titles = {
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
      'snow_ice': 'Snow or Ice Hazard'
    };
    return titles[type] || 'Route Barrier';
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'critical': return 'Critical Impact';
      case 'high': return 'High Impact';
      case 'medium': return 'Medium Impact';
      case 'low': return 'Low Impact';
      default: return 'Unknown Impact';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const icon = getBarrierIcon(primaryBarrier.type);
  const title = getBarrierTitle(primaryBarrier.type);
  const severityText = getSeverityText(primaryBarrier.severity);
  const severityColor = getSeverityColor(primaryBarrier.severity);

  const handleReroute = () => {
    if (!hasAcknowledged) return;
    
    // Log user decision
    if (window.barrierService) {
      window.barrierService.logUserDecision(barriers, 'reroute', routeData);
    }
    
    onReroute?.(barriers);
    onDismiss?.();
  };

  const handleProceed = () => {
    if (!hasAcknowledged) return;
    
    // Log user decision
    if (window.barrierService) {
      window.barrierService.logUserDecision(barriers, 'proceed', routeData);
    }
    
    onProceed?.(barriers);
    onDismiss?.();
  };

  const handleAcknowledge = () => {
    setHasAcknowledged(true);
    setAcknowledgmentTime(new Date().toISOString());
  };

  const handleReport = () => {
    onReport?.(primaryBarrier);
  };

  const handleDismiss = () => {
    // Log user decision
    if (window.barrierService) {
      window.barrierService.logUserDecision(barriers, 'dismiss', routeData);
    }
    
    onDismiss?.();
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return '< 1 min';
    return `${minutes} min`;
  };

  // eslint-disable-next-line no-unused-vars
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const handlePhotoClick = (barrier) => {
    setSelectedBarrier(barrier);
    setShowPhotoModal(true);
  };

  // Photo Modal Component
  const PhotoModal = ({ barrier, isOpen, onClose }) => {
    if (!isOpen || !barrier) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">Barrier Photo</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close photo modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-4">
            {barrier.photo ? (
              <img
                src={barrier.photo}
                alt={`${barrier.description}`}
                className="w-full h-auto rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No photo available</p>
                </div>
              </div>
            )}
            <div className="mt-4">
              <h4 className="font-semibold">{barrier.description}</h4>
              <p className="text-sm text-gray-600 mt-2">{barrier.location}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className={`text-sm font-medium px-2 py-1 rounded-full ${severityColor}`}>
                      {severityText}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Dismiss alert"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Multiple Barriers Indicator */}
              {totalBarriers > 1 && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />
                    {totalBarriers} barrier(s) detected along your route
                  </p>
                </div>
              )}

              {/* Liability Warning */}
              <div className="liability-warning mb-4">
                <div className="liability-warning-header">
                  <ShieldExclamationIcon className="w-5 h-5" />
                  <span>IMPORTANT SAFETY NOTICE</span>
                </div>
                <p className="liability-warning-text">
                  This route contains accessibility barriers that may impact your safety. 
                  You must acknowledge this warning before proceeding.
                </p>
              </div>

              {/* Barrier Details */}
              <div className="space-y-3 mb-4">
                <p className="text-gray-700 text-sm">
                  {primaryBarrier.description}
                </p>
                
                {primaryBarrier.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4" />
                    <span>{primaryBarrier.location}</span>
                  </div>
                )}

                {analysis?.estimatedDelay > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>Additional time: {formatDuration(analysis.estimatedDelay)}</span>
                  </div>
                )}

                {/* Photo if available */}
                {primaryBarrier.photo && (
                  <div className="mt-3">
                    <button
                      onClick={() => handlePhotoClick(primaryBarrier)}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <PhotoIcon className="w-4 h-4" />
                      View Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Acknowledgment Checkbox */}
              <div className="acknowledgment-checkbox mb-4">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={hasAcknowledged}
                    onChange={handleAcknowledge}
                    className="mt-1"
                  />
                  <span className="acknowledgment-text text-sm">
                    I understand the risks and acknowledge this safety warning
                  </span>
                </label>
                {acknowledgmentTime && (
                  <p className="acknowledgment-time text-xs text-gray-500 mt-1">
                    Acknowledged at: {new Date(acknowledgmentTime).toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="liability-actions space-y-2">
                <button
                  onClick={handleReroute}
                  disabled={!hasAcknowledged}
                  className={`liability-button primary w-full ${!hasAcknowledged ? 'disabled' : ''}`}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Reroute Around Barriers
                </button>
                
                <button
                  onClick={handleProceed}
                  disabled={!hasAcknowledged}
                  className={`liability-button danger w-full ${!hasAcknowledged ? 'disabled' : ''}`}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Proceed with Caution
                </button>
                
                <button
                  onClick={handleReport}
                  className="liability-button secondary w-full"
                >
                  <InformationCircleIcon className="w-4 h-4" />
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Modal */}
        <PhotoModal
          barrier={selectedBarrier}
          isOpen={showPhotoModal}
          onClose={() => setShowPhotoModal(false)}
        />
      </>
    );
  }

  // Desktop Layout
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                  <p className={`text-sm font-medium px-3 py-1 rounded-full ${severityColor}`}>
                    {severityText}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Dismiss alert"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Multiple Barriers Indicator */}
            {totalBarriers > 1 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <ExclamationTriangleIcon className="w-4 h-4 inline mr-2" />
                  {totalBarriers} barrier(s) detected along your route
                </p>
              </div>
            )}

            {/* Liability Warning */}
            <div className="liability-warning mb-6">
              <div className="liability-warning-header">
                <ShieldExclamationIcon className="w-6 h-6" />
                <span className="text-lg font-semibold">IMPORTANT SAFETY NOTICE</span>
              </div>
              <p className="liability-warning-text mt-2">
                This route contains accessibility barriers that may impact your safety. 
                You must acknowledge this warning before proceeding.
              </p>
            </div>

            {/* Barrier Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Barrier Information</h4>
                <p className="text-gray-700">
                  {primaryBarrier.description}
                </p>
                
                {primaryBarrier.location && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPinIcon className="w-5 h-5" />
                    <span>{primaryBarrier.location}</span>
                  </div>
                )}

                {analysis?.estimatedDelay > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <ClockIcon className="w-5 h-5" />
                    <span>Additional time: {formatDuration(analysis.estimatedDelay)}</span>
                  </div>
                )}

                {/* Photo if available */}
                {primaryBarrier.photo && (
                  <div className="mt-4">
                    <button
                      onClick={() => handlePhotoClick(primaryBarrier)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <PhotoIcon className="w-5 h-5" />
                      View Photo
                    </button>
                  </div>
                )}
              </div>

              {/* Analysis Summary */}
              {analysis && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Route Analysis</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Barriers:</span>
                        <span className="ml-2 font-medium">{analysis.totalBarriers}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Risk Level:</span>
                        <span className={`ml-2 font-medium ${getSeverityColor(analysis.riskLevel)}`}>
                          {analysis.riskLevel.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Accessibility Score:</span>
                        <span className="ml-2 font-medium">{analysis.accessibilityScore}/100</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Sources:</span>
                        <span className="ml-2 font-medium">
                          {analysis.sources ? analysis.sources.join(', ') : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Acknowledgment Checkbox */}
            <div className="acknowledgment-checkbox mb-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={hasAcknowledged}
                  onChange={handleAcknowledge}
                  className="mt-1 w-5 h-5"
                />
                <div>
                  <span className="acknowledgment-text font-medium">
                    I understand the risks and acknowledge this safety warning
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    By checking this box, you acknowledge that you understand the potential risks 
                    associated with proceeding on this route despite the detected barriers.
                  </p>
                  {acknowledgmentTime && (
                    <p className="acknowledgment-time text-xs text-gray-500 mt-2">
                      Acknowledged at: {new Date(acknowledgmentTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="liability-actions grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleReroute}
                disabled={!hasAcknowledged}
                className={`liability-button primary ${!hasAcknowledged ? 'disabled' : ''}`}
              >
                <ArrowPathIcon className="w-5 h-5" />
                Reroute Around Barriers
              </button>
              
              <button
                onClick={handleProceed}
                disabled={!hasAcknowledged}
                className={`liability-button danger ${!hasAcknowledged ? 'disabled' : ''}`}
              >
                <CheckCircleIcon className="w-5 h-5" />
                Proceed with Caution
              </button>
              
              <button
                onClick={handleReport}
                className="liability-button secondary"
              >
                <InformationCircleIcon className="w-5 h-5" />
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      <PhotoModal
        barrier={selectedBarrier}
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
      />
    </>
  );
};

export default LiabilityBarrierAlert;
