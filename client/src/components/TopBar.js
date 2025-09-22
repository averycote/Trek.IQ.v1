import React, { useCallback, useMemo } from 'react';

const TopBar = React.memo(({
  onToggleMenu,
  onSearchToggle,
  isSearchPanelOpen,
  currentTheme = 'light',
  onThemeChange,
  onSystemStatusToggle,
  announcements = [],
  isMobile = false
}) => {
  // Memoized handlers for better performance
  const handleMenuToggle = useCallback(() => {
    onToggleMenu();
  }, [onToggleMenu]);

  const handleSearchToggle = useCallback(() => {
    onSearchToggle();
  }, [onSearchToggle]);

  const handleThemeToggle = useCallback(() => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    onThemeChange(newTheme);
  }, [currentTheme, onThemeChange]);

  const handleSystemStatusToggle = useCallback(() => {
    onSystemStatusToggle();
  }, [onSystemStatusToggle]);


  // Memoized theme icon for better performance
  const themeIcon = useMemo(() => {
    return currentTheme === 'light' ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
        <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
      </svg>
    );
  }, [currentTheme]);

  return (
    <header className="top-bar" role="banner" aria-label="Trek.IQ application header">
      <div className="top-bar-content">
        {/* Left Section - Menu and Brand */}
        <div className="top-bar-left">
          <button
            className="menu-toggle"
            onClick={handleMenuToggle}
            aria-label="Open main menu"
            aria-controls="side-menu"
            aria-expanded="false"
            type="button"
          >
            <span className="hamburger-icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
          
          <div className="app-brand">
            <div className="menu-brand">
              <div className="menu-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3"/>
                </svg>
              </div>
              <div className="menu-brand-text">
                <h1 className="menu-title">Trek.IQ</h1>
                <p className="menu-subtitle">The Smart Way Forward</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Search and Theme Toggle */}
        <div className="top-bar-right">
          <button
            className="search-toggle"
            onClick={handleSearchToggle}
            aria-label={isSearchPanelOpen ? "Close search panel" : "Open search panel"}
            aria-expanded={isSearchPanelOpen}
            aria-controls="search-panel"
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </button>

          <button
            className="theme-toggle"
            onClick={handleThemeToggle}
            aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
            type="button"
          >
            {themeIcon}
          </button>

          {/* System Status Button - Only show on desktop */}
          {!isMobile && (
            <button
              className="system-status-toggle"
              onClick={handleSystemStatusToggle}
              aria-label="Open system status panel"
              type="button"
              title="System Status"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6" aria-hidden="true">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </button>
          )}

        </div>
      </div>

      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>
    </header>
  );
});

TopBar.displayName = 'TopBar';

export default TopBar;
