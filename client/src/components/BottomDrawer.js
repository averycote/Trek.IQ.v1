import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import enhancedSearchService from '../services/enhancedSearchService';

const BottomDrawer = ({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  routeMode,
  onRouteModeChange,
  onRouteRequest,
  route,
  isExpanded,
  onToggleExpanded,
  onClose,
  onStartNavigation,
  routeCalculationError,
  isRoutingServiceReady,
  isSearchControllerReady,
  searchControllerError
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [activeSearchField, setActiveSearchField] = useState(null);
  const [isRouteExpanded, setIsRouteExpanded] = useState(false);
  
  const searchTimeoutRef = useRef(null);
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);

  // Handle search input with enhanced search integration
  const handleSearchInput = useCallback((value, field) => {
    // Update the input value first
    const setter = field === 'origin' ? onOriginChange : onDestinationChange;
    setter(value);
    
    setActiveSearchField(field);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setSelectedSuggestionIndex(-1);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await enhancedSearchService.search(value, {
          limit: 8,
          types: 'address,poi,place,business,building',
          country: 'ca',
          bbox: '-63.8,44.5,-63.4,44.8' // Halifax area
        });
        
        setSuggestions(results);
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error('Enhanced search error:', error);
        setSuggestions([]);
      } finally {
        // setIsLoading(false); // This line was removed
      }
    }, 300);
  }, [onOriginChange, onDestinationChange]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion, field) => {
    const setter = field === 'origin' ? onOriginChange : onDestinationChange;
    setter(suggestion.address);
    setSuggestions([]);
    setSelectedSuggestionIndex(-1);
    setActiveSearchField(null);
    
    // Focus the other field if both are filled
    if (field === 'origin' && destination) {
      destinationInputRef.current?.focus();
    } else if (field === 'destination' && origin) {
      originInputRef.current?.focus();
    }
  }, [onOriginChange, onDestinationChange, origin, destination]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e, field) => {
    if (!suggestions.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex], field);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setActiveSearchField(null);
        break;
      default:
        // Handle other keys - do nothing
        break;
    }
  }, [suggestions, selectedSuggestionIndex, handleSuggestionSelect]);

  // Check if route can be requested
  const canRequestRoute = useMemo(() => {
    return origin && destination && isRoutingServiceReady && isSearchControllerReady;
  }, [origin, destination, isRoutingServiceReady, isSearchControllerReady]);

  // Handle route request
  const handleRouteRequest = useCallback(() => {
    if (canRequestRoute) {
      onRouteRequest();
    } else {
      // Cannot request route - missing origin or destination
    }
  }, [canRequestRoute, onRouteRequest]);

  // Handle drawer collapse toggle
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  // Auto-expand when route is available
  useEffect(() => {
    if (route && isCollapsed) {
      setIsCollapsed(false);
    }
  }, [route, isCollapsed]);

  return (
    <div className={`bottom-drawer ${isCollapsed ? 'collapsed' : ''}`} role="complementary" aria-label="Route planning interface">
      {/* Drawer Handle */}
      <div className="bottom-drawer-header">
        <div 
          className="drawer-handle" 
          onClick={handleToggleCollapse}
          role="button"
          tabIndex={0}
          aria-label={isCollapsed ? 'Expand route planning' : 'Collapse route planning'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggleCollapse();
            }
          }}
        />
        <div className="drawer-title" id="drawer-title">
          {route ? 'Route Details' : 'Plan Your Route'}
        </div>
        {route && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={onClose}
            aria-label="Close route details"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      {/* Drawer Content */}
      <div className="bottom-drawer-content" aria-labelledby="drawer-title">
        {!route ? (
          /* Search Interface */
          <div className="search-interface" role="search" aria-label="Search for locations">
            {/* Search Inputs */}
            <div className="search-container">
              <div className="search-input-group">
                {/* Origin Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="origin-input">
                    From
                  </label>
                  <div className="input-wrapper">
                    <input
                      ref={originInputRef}
                      id="origin-input"
                      type="text"
                      className="search-input"
                      placeholder="Enter starting point (e.g., '123 Main St' or 'Tim Hortons')"
                      value={origin}
                      onChange={(e) => handleSearchInput(e.target.value, 'origin')}
                      onFocus={() => setActiveSearchField('origin')}
                      onKeyDown={(e) => handleKeyDown(e, 'origin')}
                      aria-describedby="origin-suggestions"
                      aria-expanded={suggestions.length > 0 && activeSearchField === 'origin'}
                      aria-autocomplete="list"
                      role="combobox"
                      aria-controls="origin-suggestions"
                      aria-label="Enter starting location"
                    />
                    {activeSearchField === 'origin' && suggestions.length > 0 && (
                      <div 
                        id="origin-suggestions"
                        className="suggestions-list" 
                        role="listbox"
                        aria-label="Location suggestions"
                      >
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.id || index}
                            className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                            onClick={() => handleSuggestionSelect(suggestion, 'origin')}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            role="option"
                            aria-selected={index === selectedSuggestionIndex}
                            aria-label={`${suggestion.name}, ${suggestion.address}`}
                          >
                            <div className="suggestion-icon" aria-hidden="true">
                              {suggestion.icon || (suggestion.type === 'poi' ? '🏢' : '📍')}
                            </div>
                            <div className="suggestion-content">
                              <div className="suggestion-title">{suggestion.name}</div>
                              <div className="suggestion-address">{suggestion.address}</div>
                              {suggestion.category && (
                                <div className="suggestion-category">{suggestion.category}</div>
                              )}
                            </div>
                            <div className="suggestion-source" aria-hidden="true">
                              {suggestion.source === 'local_business' && '🏪'}
                              {suggestion.source === 'local_building' && '🏢'}
                              {suggestion.source === 'mapbox' && '🗺️'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Input */}
                <div className="form-group">
                  <label className="form-label" htmlFor="destination-input">
                    To
                  </label>
                  <div className="input-wrapper">
                    <input
                      ref={destinationInputRef}
                      id="destination-input"
                      type="text"
                      className="search-input"
                      placeholder="Enter destination (e.g., '456 Oak Ave' or 'Dalhousie University')"
                      value={destination}
                      onChange={(e) => handleSearchInput(e.target.value, 'destination')}
                      onFocus={() => setActiveSearchField('destination')}
                      onKeyDown={(e) => handleKeyDown(e, 'destination')}
                      aria-describedby="destination-suggestions"
                      aria-expanded={suggestions.length > 0 && activeSearchField === 'destination'}
                      aria-autocomplete="list"
                      role="combobox"
                      aria-controls="destination-suggestions"
                      aria-label="Enter destination location"
                    />
                    {activeSearchField === 'destination' && suggestions.length > 0 && (
                      <div 
                        id="destination-suggestions"
                        className="suggestions-list" 
                        role="listbox"
                        aria-label="Location suggestions"
                      >
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={suggestion.id || index}
                            className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                            onClick={() => handleSuggestionSelect(suggestion, 'destination')}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            role="option"
                            aria-selected={index === selectedSuggestionIndex}
                            aria-label={`${suggestion.name}, ${suggestion.address}`}
                          >
                            <div className="suggestion-icon" aria-hidden="true">
                              {suggestion.icon || (suggestion.type === 'poi' ? '🏢' : '📍')}
                            </div>
                            <div className="suggestion-content">
                              <div className="suggestion-title">{suggestion.name}</div>
                              <div className="suggestion-address">{suggestion.address}</div>
                              {suggestion.category && (
                                <div className="suggestion-category">{suggestion.category}</div>
                              )}
                            </div>
                            <div className="suggestion-source" aria-hidden="true">
                              {suggestion.source === 'local_business' && '🏪'}
                              {suggestion.source === 'local_building' && '🏢'}
                              {suggestion.source === 'mapbox' && '🗺️'}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Route Mode Selection */}
              <div className="route-mode-selection" role="radiogroup" aria-label="Transportation mode">
                <label className="mode-option">
                  <input
                    type="radio"
                    name="routeMode"
                    value="walking"
                    checked={routeMode === 'walking'}
                    onChange={() => onRouteModeChange('walking')}
                    aria-label="Walking mode"
                  />
                  <span className="mode-icon" aria-hidden="true">🚶</span>
                  <span className="mode-label">Walking</span>
                </label>
                <label className="mode-option">
                  <input
                    type="radio"
                    name="routeMode"
                    value="driving"
                    checked={routeMode === 'driving'}
                    onChange={() => onRouteModeChange('driving')}
                    aria-label="Driving mode"
                  />
                  <span className="mode-icon" aria-hidden="true">🚗</span>
                  <span className="mode-label">Driving</span>
                </label>
                <label className="mode-option">
                  <input
                    type="radio"
                    name="routeMode"
                    value="transit"
                    checked={routeMode === 'transit'}
                    onChange={() => onRouteModeChange('transit')}
                    aria-label="Transit mode"
                  />
                  <span className="mode-icon" aria-hidden="true">🚌</span>
                  <span className="mode-label">Transit</span>
                </label>
              </div>

              {/* Plan Route Button */}
              <button
                className={`btn btn-primary plan-route-btn ${!canRequestRoute ? 'disabled' : ''}`}
                onClick={handleRouteRequest}
                disabled={!canRequestRoute}
                aria-label="Plan route from origin to destination"
                aria-describedby={routeCalculationError ? 'route-error' : undefined}
              >
                <span className="btn-icon" aria-hidden="true">🗺️</span>
                Plan Route
              </button>

              {routeCalculationError && (
                <div id="route-error" className="error-message" role="alert" aria-live="polite">
                  {routeCalculationError}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Route Details */
          <div className="route-details" role="region" aria-label="Route information">
            <div className="route-summary">
              <div className="route-info">
                <div className="route-origin">
                  <span className="route-label">From:</span>
                  <span className="route-value">{origin}</span>
                </div>
                <div className="route-destination">
                  <span className="route-label">To:</span>
                  <span className="route-value">{destination}</span>
                </div>
                <div className="route-stats">
                  <div className="stat-item">
                    <span className="stat-icon" aria-hidden="true">⏱️</span>
                    <span className="stat-value">{route.duration}</span>
                    <span className="stat-label">Duration</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon" aria-hidden="true">📏</span>
                    <span className="stat-value">{route.distance}</span>
                    <span className="stat-label">Distance</span>
                  </div>
                </div>
              </div>

              <div className="route-actions">
                <button
                  className="btn btn-primary start-navigation-btn"
                  onClick={onStartNavigation}
                  aria-label="Start navigation for this route"
                >
                  <span className="btn-icon" aria-hidden="true">🚀</span>
                  Start Navigation
                </button>
                <button
                  className="btn btn-secondary edit-route-btn"
                  onClick={() => setIsRouteExpanded(!isRouteExpanded)}
                  aria-label={isRouteExpanded ? 'Collapse route details' : 'Expand route details'}
                  aria-expanded={isRouteExpanded}
                >
                  <span className="btn-icon" aria-hidden="true">📋</span>
                  {isRouteExpanded ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>

            {isRouteExpanded && (
              <div className="route-instructions" role="region" aria-label="Turn-by-turn directions">
                <h3 className="instructions-title">Turn-by-Turn Directions</h3>
                <div className="instructions-list" role="list">
                  {route.instructions.map((instruction, index) => (
                    <div key={index} className="instruction-item" role="listitem">
                      <div className="instruction-icon" aria-hidden="true">
                        {instruction.icon || '➡️'}
                      </div>
                      <div className="instruction-content">
                        <div className="instruction-text">{instruction.text}</div>
                        <div className="instruction-distance">{instruction.distance}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomDrawer;


