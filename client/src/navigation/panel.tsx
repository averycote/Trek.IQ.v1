import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NavState } from './state';
import RouteHeader from './routeHeader';
import ActionBar from './actionBar';
import DirectionsList from './directionsList';

interface NavigationPanelProps {
  navigationState: any;
  onTogglePanel: () => void;
  onToggleMinimized: () => void;
  onToggleMute: () => void;
  onToggleFollowingUser: () => void;
  onTapGo: () => void;
  onTapEnd: () => void;
  onRecenter: () => void;
}

const NavigationPanel: React.FC<NavigationPanelProps> = ({
  navigationState,
  onTogglePanel,
  onToggleMinimized,
  onToggleMute,
  onToggleFollowingUser,
  onTapGo,
  onTapEnd,
  onRecenter
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-collapse navigation panel on mobile for better UX
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [navigationState.currentState]);

  // Enhanced touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    dragStartY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const deltaY = e.touches[0].clientY - dragStartY.current;
    const threshold = 50; // pixels to trigger collapse/expand
    
    if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0 && !isCollapsed) {
        // Dragging down - collapse
        setIsCollapsed(true);
      } else if (deltaY < 0 && isCollapsed) {
        // Dragging up - expand
        setIsCollapsed(false);
      }
      setIsDragging(false);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onTogglePanel();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isCollapsed) {
          setIsCollapsed(false);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isCollapsed) {
          setIsCollapsed(true);
        }
        break;
    }
  };

  // Don't render if not in navigation states
  if (navigationState.currentState === NavState.IDLE) {
    return null;
  }

  // Mobile bottom sheet
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          ref={sheetRef}
          className={`mobile-navigation-panel ${isCollapsed ? 'collapsed' : ''}`}
          initial={{ y: '100%', opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            transition: {
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8,
              duration: 0.4
            }
          }}
          exit={{
            y: '100%',
            opacity: 0,
            transition: {
              type: 'spring',
              damping: 35,
              stiffness: 350,
              mass: 0.6,
              duration: 0.3
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label="Navigation panel"
          aria-modal="true"
        >
          {/* Drag Handle */}
          <div 
            className="drag-handle"
            role="button"
            tabIndex={0}
            aria-label="Drag to resize navigation panel"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="handle-bar" />
          </div>

          {/* Close Button */}
          <button
            className="close-panel-button mobile"
            onClick={onTogglePanel}
            aria-label="Close navigation panel"
            type="button"
          >
            <span aria-hidden="true">✕</span>
          </button>

          {/* Collapsed Navigation Content */}
          <motion.div
            className="collapsed-navigation"
            initial={{ opacity: 0 }}
            animate={{ opacity: isCollapsed ? 1 : 0 }}
            transition={{ duration: 0.2, delay: isCollapsed ? 0.1 : 0 }}
          >
            {navigationState.currentStep && (
              <div className="collapsed-current-step">
                <div className="collapsed-step-icon">
                  {getStepIcon(navigationState.currentStep.maneuver)}
                </div>
                <div className="collapsed-step-details">
                  <div className="collapsed-step-instruction">
                    {navigationState.currentStep.instruction}
                  </div>
                  <div className="collapsed-step-metrics">
                    <span>📏 {formatDistance(navigationState.currentStep.distance)}</span>
                    <span>⏱️ {formatDuration(navigationState.currentStep.duration)}</span>
                  </div>
                </div>
              </div>
            )}
            
            {navigationState.nextStep && (
              <div className="collapsed-next-step">
                <div className="collapsed-next-icon">
                  {getStepIcon(navigationState.nextStep.maneuver)}
                </div>
                <div className="collapsed-next-instruction">
                  {navigationState.nextStep.instruction}
                </div>
              </div>
            )}
          </motion.div>

          {/* Expanded Panel Content */}
          <motion.div
            className="panel-content"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
              opacity: isCollapsed ? 0 : 1,
              scale: isCollapsed ? 0.98 : 1
            }}
            transition={{
              duration: 0.25,
              delay: isCollapsed ? 0 : 0.1,
              ease: 'easeOut'
            }}
          >
            <RouteHeader 
              navigationState={navigationState}
              onToggleMinimized={onToggleMinimized}
            />

            <ActionBar
              navigationState={navigationState}
              onTapGo={onTapGo}
              onTapEnd={onTapEnd}
              onRecenter={onRecenter}
              onToggleMute={onToggleMute}
              onToggleFollowingUser={onToggleFollowingUser}
              isMobile={true}
            />


            <DirectionsList
              navigationState={navigationState}
              isMobile={true}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop navigation panel
  return (
    <AnimatePresence>
      <motion.div
        className="desktop-navigation-panel"
        initial={{
          opacity: 0,
          x: 320,
          scale: 0.95,
          rotateY: -10
        }}
        animate={{
          opacity: 1,
          x: 0,
          scale: 1,
          rotateY: 0
        }}
        exit={{
          opacity: 0,
          x: 320,
          scale: 0.95,
          rotateY: 10
        }}
        transition={{
          type: 'spring',
          damping: 25,
          stiffness: 200,
          duration: 0.4
        }}
        role="dialog"
        aria-label="Navigation panel"
      >
        <div className="panel-header">
          <h2>Navigation</h2>
          <button
            onClick={onTogglePanel}
            aria-label="Close navigation panel"
            className="close-button"
          >
            ✕
          </button>
        </div>

        <div className="panel-content">
          <RouteHeader 
            navigationState={navigationState}
            onToggleMinimized={onToggleMinimized}
          />

          <ActionBar
            navigationState={navigationState}
            onTapGo={onTapGo}
            onTapEnd={onTapEnd}
            onRecenter={onRecenter}
            onToggleMute={onToggleMute}
            onToggleFollowingUser={onToggleFollowingUser}
            isMobile={false}
          />


          <DirectionsList
            navigationState={navigationState}
            isMobile={false}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper functions
const getStepIcon = (maneuver: any): string => {
  const type = maneuver?.type || '';
  const modifier = maneuver?.modifier || '';
  
  switch (type) {
    case 'turn':
      switch (modifier) {
        case 'left': return '⬅️';
        case 'right': return '➡️';
        case 'slight left': return '↖️';
        case 'slight right': return '↗️';
        case 'sharp left': return '↙️';
        case 'sharp right': return '↘️';
        default: return '➡️';
      }
    case 'continue': return '➡️';
    case 'depart': return '🚶';
    case 'arrive': return '📍';
    case 'merge': return '🔀';
    case 'exit': return '🚪';
    case 'roundabout': return '🔄';
    case 'rotary': return '🔄';
    case 'new name': return '🆕';
    case 'end of road': return '🛑';
    case 'fork': return '🔀';
    case 'ramp': return '🛣️';
    default: return '➡️';
  }
};

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return '< 1 min';
  return `${minutes} min`;
};

export default NavigationPanel;
