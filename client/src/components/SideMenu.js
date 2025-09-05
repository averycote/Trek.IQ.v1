import React, { useCallback, useMemo, useRef, useEffect } from 'react';

const SideMenu = React.memo(({
  isOpen,
  onClose,
  currentTheme = 'light',
  onThemeChange,
  voiceGuidanceEnabled = false,
  onVoiceGuidanceToggle,
  onNavigate
}) => {
  // Memoized menu items for better performance
  const menuItems = useMemo(() => [
    {
      id: 'account',
      icon: '👤',
      title: 'Account & Settings',
      description: 'Font size, color theme, voice guidance',
      action: () => onNavigate && onNavigate('/account')
    },
    {
      id: 'saved',
      icon: '💾',
      title: 'Saved Routes',
      description: 'Your frequently used routes',
      action: () => onNavigate && onNavigate('/saved-routes')
    },
    {
      id: 'reported',
      icon: '⚠️',
      title: 'Reported Barriers',
      description: 'Your barrier reporting history',
      action: () => onNavigate && onNavigate('/reported-barriers')
    },
    {
      id: 'help',
      icon: '❓',
      title: 'Help & Support',
      description: 'Get help and contact support',
      action: () => onNavigate && onNavigate('/help')
    },
    {
      id: 'about',
      icon: 'ℹ️',
      title: 'About Trek.IQ',
      description: 'Learn more about the app',
      action: () => onNavigate && onNavigate('/about')
    },
    {
      id: 'admin',
      icon: '🔧',
      title: 'Admin Dashboard',
      description: 'System analytics and management tools',
      action: () => onNavigate && onNavigate('/admin')
    }
  ], [onNavigate]);

  // Memoized handlers for better performance
  const handleThemeToggle = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    onThemeChange && onThemeChange(newTheme);
  }, [currentTheme, onThemeChange]);

  const handleVoiceGuidanceToggle = useCallback(() => {
    onVoiceGuidanceToggle && onVoiceGuidanceToggle(!voiceGuidanceEnabled);
  }, [voiceGuidanceEnabled, onVoiceGuidanceToggle]);

  const handleMenuItemClick = useCallback((item) => {
    item.action();
    onClose(); // Close menu after navigation
  }, [onClose]);

  const menuRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Focus the close button when menu opens
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="side-menu-backdrop"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Side Menu */}
      <div 
        ref={menuRef}
        className={`side-menu ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Main menu"
        inert={!isOpen ? '' : undefined}
        style={{ display: isOpen ? 'flex' : 'none' }}
      >
        {/* Header */}
        <div className="side-menu-header">
          <div className="menu-brand">
            <div className="menu-logo" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"/>
              </svg>
            </div>
            <div className="menu-brand-text">
              <h2 className="menu-title">Trek.IQ</h2>
              <p className="menu-subtitle">The Smart Way Forward</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="menu-close-button"
            aria-label="Close menu"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Menu Content */}
        <div className="side-menu-content p-2">
          {/* Navigation Items */}
          <div className="menu-section">
            <h3 className="section-title">Navigation</h3>
            <div className="menu-items">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item)}
                  className="menu-item"
                  aria-label={item.description}
                  type="button"
                >
                  <span className="menu-item-icon" aria-hidden="true">{item.icon}</span>
                  <div className="menu-item-content">
                    <span className="menu-item-title">{item.title}</span>
                    <span className="menu-item-description">{item.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="menu-section">
            <h3 className="section-title">Settings</h3>
            <div className="settings-group">
              <button
                onClick={handleThemeToggle}
                className="setting-button"
                aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
                type="button"
              >
                <span className="setting-icon" aria-hidden="true">
                  {currentTheme === 'light' ? '🌙' : '☀️'}
                </span>
                <div className="setting-content">
                  <span className="setting-title">Dark Mode</span>
                  <span className="setting-description">
                    {currentTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
                  </span>
                </div>
              </button>

              <button
                onClick={handleVoiceGuidanceToggle}
                className="setting-button"
                aria-label={`${voiceGuidanceEnabled ? 'Disable' : 'Enable'} voice guidance`}
                type="button"
              >
                <span className="setting-icon" aria-hidden="true">
                  {voiceGuidanceEnabled ? '🔇' : '🔊'}
                </span>
                <div className="setting-content">
                  <span className="setting-title">Voice Guidance</span>
                  <span className="setting-description">
                    {voiceGuidanceEnabled ? 'Turn off voice navigation' : 'Turn on voice navigation'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

SideMenu.displayName = 'SideMenu';

export default SideMenu;
