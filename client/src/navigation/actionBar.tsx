import React from 'react';
import { NavState } from './state';

interface ActionBarProps {
  navigationState: any;
  onTapGo: () => void;
  onTapEnd: () => void;
  onRecenter: () => void;
  onToggleMute: () => void;
  onToggleFollowingUser: () => void;
  isMobile: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({
  navigationState,
  onTapGo,
  onTapEnd,
  onRecenter,
  onToggleMute,
  onToggleFollowingUser,
  isMobile
}) => {
  const isRouteReady = navigationState.currentState === NavState.ROUTE_READY;
  const isNavigating = navigationState.currentState === NavState.ACTIVE_NAV;

  if (!isRouteReady && !isNavigating) {
    return null;
  }

  return (
    <div className="action-bar">
      {/* Primary Action - Start Navigation or Continue */}
      {isRouteReady && (
        <button
          className="action-button"
          onClick={onTapGo}
          aria-label="Start navigation"
          type="button"
        >
          <span className="action-button-icon" aria-hidden="true">▶️</span>
          <span>Start Navigation</span>
        </button>
      )}

      {/* Navigation Actions */}
      {isNavigating && (
        <>
          {/* End Navigation */}
          <button
            className="action-button danger"
            onClick={onTapEnd}
            aria-label="End navigation"
            type="button"
          >
            <span className="action-button-icon" aria-hidden="true">⏹️</span>
            <span>End Route</span>
          </button>

          {/* Recenter Map */}
          <button
            className="action-button secondary"
            onClick={onRecenter}
            aria-label="Recenter map on current location"
            type="button"
          >
            <span className="action-button-icon" aria-hidden="true">🎯</span>
            <span>Recenter</span>
          </button>

          {/* Toggle Voice Guidance */}
          <button
            className={`action-button secondary ${navigationState.isVoiceEnabled ? 'active' : ''}`}
            onClick={onToggleMute}
            aria-label={navigationState.isVoiceEnabled ? 'Mute voice guidance' : 'Enable voice guidance'}
            type="button"
          >
            <span className="action-button-icon" aria-hidden="true">
              {navigationState.isVoiceEnabled ? '🔊' : '🔇'}
            </span>
            <span>
              {navigationState.isVoiceEnabled ? 'Mute' : 'Voice'}
            </span>
          </button>

          {/* Toggle Following User */}
          <button
            className={`action-button secondary ${navigationState.isFollowingUser ? 'active' : ''}`}
            onClick={onToggleFollowingUser}
            aria-label={navigationState.isFollowingUser ? 'Stop following user location' : 'Follow user location'}
            type="button"
          >
            <span className="action-button-icon" aria-hidden="true">
              {navigationState.isFollowingUser ? '📍' : '🎯'}
            </span>
            <span>
              {navigationState.isFollowingUser ? 'Following' : 'Follow'}
            </span>
          </button>
        </>
      )}
    </div>
  );
};

export default ActionBar;
