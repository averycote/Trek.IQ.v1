import React, { useState } from 'react';
import { 
  Squares2X2Icon, 
  Cog6ToothIcon, 
  BellIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  MapIcon,
  BookmarkIcon,
  FlagIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const EnhancedMapOverlay = ({
  onToggleLayers,
  onToggleAccessibility,
  onToggleNotifications,
  onToggleSearch,
  onToggleProfile,
  onToggleSettings,
  onToggleFavorites,
  onToggleReports,
  isMobile = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleQuickAction = (action) => {
    switch (action) {
      case 'layers':
        onToggleLayers?.();
        break;
      case 'accessibility':
        onToggleAccessibility?.();
        break;
      case 'notifications':
        onToggleNotifications?.();
        break;
      case 'search':
        onToggleSearch?.();
        break;
      case 'profile':
        onToggleProfile?.();
        break;
      case 'settings':
        onToggleSettings?.();
        break;
      case 'favorites':
        onToggleFavorites?.();
        break;
      case 'reports':
        onToggleReports?.();
        break;
      default:
        break;
    }
    setShowQuickActions(false);
  };

  if (isMobile) {
    return (
      <div className="trek-iq-map-overlay">
        <div className="trek-iq-overlay-controls">
          {/* Main Floating Action Button */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="trek-iq-overlay-button active"
            aria-label="Quick actions"
          >
            <PlusIcon className="w-6 h-6" />
          </button>

          {/* Quick Actions Panel */}
          {showQuickActions && (
            <div className="trek-iq-quick-actions show">
              <div className="trek-iq-quick-action" onClick={() => handleQuickAction('layers')}>
                <Squares2X2Icon className="w-5 h-5" />
                <span>Layers</span>
              </div>
              <div className="trek-iq-quick-action" onClick={() => handleQuickAction('accessibility')}>
                <Cog6ToothIcon className="w-5 h-5" />
                <span>Accessibility</span>
              </div>
              <div className="trek-iq-quick-action" onClick={() => handleQuickAction('notifications')}>
                <BellIcon className="w-5 h-5" />
                <span>Notifications</span>
              </div>
              <div className="trek-iq-quick-action" onClick={() => handleQuickAction('search')}>
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span>Search</span>
              </div>
              <div className="trek-iq-quick-action" onClick={() => handleQuickAction('favorites')}>
                <BookmarkIcon className="w-5 h-5" />
                <span>Favorites</span>
              </div>
              <div className="trek-iq-quick-action" onClick={() => handleQuickAction('reports')}>
                <FlagIcon className="w-5 h-5" />
                <span>Report Issue</span>
              </div>
            </div>
          )}

          {/* Individual Control Buttons */}
          <button
            onClick={() => handleQuickAction('layers')}
            className="trek-iq-overlay-button"
            aria-label="Toggle layers"
          >
            <Squares2X2Icon className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleQuickAction('accessibility')}
            className="trek-iq-overlay-button"
            aria-label="Accessibility settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => handleQuickAction('notifications')}
            className="trek-iq-overlay-button"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="trek-iq-map-overlay">
      <div className="trek-iq-overlay-controls">
        {/* Main Floating Action Button */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="trek-iq-overlay-button active"
          aria-label="Quick actions"
        >
          <PlusIcon className="w-6 h-6" />
        </button>

        {/* Quick Actions Panel */}
        {showQuickActions && (
          <div className="trek-iq-quick-actions show">
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('layers')}>
              <Squares2X2Icon className="w-5 h-5" />
              <span>Map Layers</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('accessibility')}>
              <Cog6ToothIcon className="w-5 h-5" />
              <span>Accessibility Settings</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('notifications')}>
              <BellIcon className="w-5 h-5" />
              <span>Notifications</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('search')}>
              <MagnifyingGlassIcon className="w-5 h-5" />
              <span>Search</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('profile')}>
              <UserIcon className="w-5 h-5" />
              <span>Profile</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('settings')}>
              <Cog6ToothIcon className="w-5 h-5" />
              <span>Settings</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('favorites')}>
              <BookmarkIcon className="w-5 h-5" />
              <span>Favorites</span>
            </div>
            <div className="trek-iq-quick-action" onClick={() => handleQuickAction('reports')}>
              <FlagIcon className="w-5 h-5" />
              <span>Report Issue</span>
            </div>
          </div>
        )}

        {/* Individual Control Buttons */}
        <button
          onClick={() => handleQuickAction('layers')}
          className="trek-iq-overlay-button"
          aria-label="Toggle layers"
        >
          <Squares2X2Icon className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleQuickAction('accessibility')}
          className="trek-iq-overlay-button"
          aria-label="Accessibility settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleQuickAction('notifications')}
          className="trek-iq-overlay-button"
          aria-label="Notifications"
        >
          <BellIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleQuickAction('search')}
          className="trek-iq-overlay-button"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default EnhancedMapOverlay;
