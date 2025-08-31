import React, { useState, useEffect } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const BarrierAlert = ({ 
  barrier, 
  onReroute, 
  onDismiss, 
  onViewDetails,
  showRerouteButton = true,
  showDetailsButton = true 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [rerouteLoading, setRerouteLoading] = useState(false);

  // Early return if barrier is undefined or null
  if (!barrier) {
    console.warn('BarrierAlert: barrier prop is undefined or null');
    return null;
  }

  const getBarrierIcon = (type) => {
    switch (type) {
      case 'sidewalk_closure':
        return '🚧';
      case 'street_closure':
        return '🚧';
      case 'steps':
        return '🪜';
      case 'traffic_control_issue':
        return '🚦';
      case 'construction':
        return '🏗️';
      case 'weather':
        return '🌧️';
      case 'maintenance':
        return '🔧';
      default:
        return '⚠️';
    }
  };

  const getBarrierColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getBarrierTitle = (type) => {
    const titles = {
      'sidewalk_closure': 'Sidewalk Closure',
      'street_closure': 'Street Closure',
      'steps': 'Steps Detected',
      'traffic_control_issue': 'Traffic Control Issue',
      'construction': 'Construction Work',
      'weather': 'Weather Condition',
      'maintenance': 'Maintenance Work'
    };
    return titles[type] || 'Accessibility Barrier';
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'high':
        return 'High Impact';
      case 'medium':
        return 'Medium Impact';
      case 'low':
        return 'Low Impact';
      default:
        return 'Unknown Impact';
    }
  };

  const handleReroute = async () => {
    if (!onReroute) return;
    
    setRerouteLoading(true);
    try {
      await onReroute(barrier);
    } catch (error) {
      console.error('Reroute failed:', error);
    } finally {
      setRerouteLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss && onDismiss(barrier.id);
    }, 300);
  };

  const handleViewDetails = () => {
    onViewDetails && onViewDetails(barrier);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md w-full transition-all duration-300 ease-in-out transform ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={`rounded-lg border p-4 shadow-lg ${getBarrierColor(barrier.severity)}`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getBarrierIcon(barrier.type)}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">
                {getBarrierTitle(barrier.type)}
              </h3>
              <p className="text-xs opacity-75">
                {getSeverityText(barrier.severity)}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <div className="mt-3">
          <p className="text-sm leading-relaxed">
            {barrier.message || `A ${getBarrierTitle(barrier.type).toLowerCase()} has been detected on your route.`}
          </p>
        </div>

        {/* Barrier Details */}
        {isExpanded && (
          <div className="mt-3 space-y-2">
            {barrier.reason && (
              <div className="text-xs">
                <span className="font-medium">Reason:</span> {barrier.reason}
              </div>
            )}
            {barrier.startDate && (
              <div className="text-xs">
                <span className="font-medium">Start Date:</span> {new Date(barrier.startDate).toLocaleDateString()}
              </div>
            )}
            {barrier.endDate && (
              <div className="text-xs">
                <span className="font-medium">End Date:</span> {new Date(barrier.endDate).toLocaleDateString()}
              </div>
            )}
            {barrier.length && (
              <div className="text-xs">
                <span className="font-medium">Length:</span> {barrier.length}m
              </div>
            )}
            {barrier.confidence && (
              <div className="text-xs">
                <span className="font-medium">Confidence:</span> {Math.round(barrier.confidence * 100)}%
              </div>
            )}
          </div>
        )}

        {/* Reroute Information */}
        {barrier.suggestedReroute && (
          <div className="mt-3 p-3 bg-white bg-opacity-50 rounded-md">
            <div className="flex items-center space-x-2 mb-2">
              <InformationCircleIcon className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">Alternative Route Available</span>
            </div>
            <div className="text-xs space-y-1">
              <div>
                <span className="font-medium">Additional Time:</span> {Math.round(barrier.suggestedReroute.estimatedAdditionalTime || 0)} minutes
              </div>
              <div>
                <span className="font-medium">Accessibility Score:</span> {barrier.suggestedReroute.accessibilityScore || 85}/100
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex space-x-2">
          {showRerouteButton && barrier.suggestedReroute && (
            <button
              onClick={handleReroute}
              disabled={rerouteLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center space-x-1"
            >
              {rerouteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Rerouting...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-3 w-3" />
                  <span>Reroute Now</span>
                </>
              )}
            </button>
          )}
          
          {showDetailsButton && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              {isExpanded ? 'Less' : 'More'} Details
            </button>
          )}
          
          {onViewDetails && (
            <button
              onClick={handleViewDetails}
              className="px-3 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              View on Map
            </button>
          )}
        </div>

        {/* Progress Bar for Temporary Barriers */}
        {barrier.endDate && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Duration</span>
              <span>{Math.round((new Date(barrier.endDate) - new Date(barrier.startDate)) / (1000 * 60 * 60 * 24))} days</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, Math.max(0, 
                    ((Date.now() - new Date(barrier.startDate).getTime()) / 
                    (new Date(barrier.endDate).getTime() - new Date(barrier.startDate).getTime())) * 100
                  ))}%`
                }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Notification Center Component
export const NotificationCenter = ({ notifications = [], onDismiss, onReroute, onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const handleDismiss = (notificationId) => {
    onDismiss && onDismiss(notificationId);
  };

  const handleReroute = async (barrier) => {
    onReroute && await onReroute(barrier);
  };

  const handleViewDetails = (barrier) => {
    onViewDetails && onViewDetails(barrier);
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <InformationCircleIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.type === 'barrier_alert' ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <InformationCircleIcon className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Action buttons for barrier alerts */}
                  {notification.type === 'barrier_alert' && notification.data?.barrier && (
                    <div className="mt-3 flex space-x-2">
                      {notification.data.action === 'reroute_now' && (
                        <button
                          onClick={() => handleReroute(notification.data.barrier)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md transition-colors"
                        >
                          Reroute Now
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(notification.data.barrier)}
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        View on Map
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  notifications.forEach(n => handleDismiss(n.id));
                }}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BarrierAlert;
