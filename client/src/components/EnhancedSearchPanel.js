import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  MapPinIcon,
  ArrowRightIcon,
  XMarkIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import enhancedSearchService from "../services/enhancedSearchService";

// Debounce hook for search optimization
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Memoized search result item for better performance
const SearchResultItem = React.memo(
  ({ result, onSelect, isHighlighted, isMobile }) => (
    <div
      className={`search-result-item ${isHighlighted ? "highlighted" : ""} ${
        isMobile ? "mobile" : ""
      }`}
      onClick={() => onSelect(result)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(result);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Select ${result.name}`}
    >
      <div className="result-icon">
        {result.type === "address" && <MapPinIcon className="w-4 h-4" />}
        {result.type === "poi" && <span className="text-lg">🏢</span>}
        {result.type === "parking" && <span className="text-lg">🅿️</span>}
        {result.type === "transit" && <span className="text-lg">🚌</span>}
        {result.type === "amenity" && <span className="text-lg">🏪</span>}
        {result.type === "unknown" && <MapPinIcon className="w-4 h-4" />}
      </div>
      <div className="result-content">
        <div className="result-name">{result.name}</div>
        <div className="result-address">{result.address}</div>
        <div className="result-type">{result.type}</div>
      </div>
    </div>
  )
);

// Memoized mode selector for better performance
const ModeSelector = React.memo(({ mode, onModeChange, isMobile }) => {
  const modes = [
    { id: "walking", label: "Walk", icon: "🚶" },
    { id: "wheelchair", label: "Wheelchair", icon: "♿" },
    { id: "driving", label: "Drive", icon: "🚗" },
    { id: "transit", label: "Transit", icon: "🚌" },
    { id: "cycling", label: "Bike", icon: "🚴" },
  ];

  return (
    <div className={`mode-selector ${isMobile ? "mobile" : ""}`}>
      {modes.map((modeOption) => (
        <button
          key={modeOption.id}
          onClick={() => onModeChange(modeOption.id)}
          className={`mode-button ${mode === modeOption.id ? "active" : ""} ${
            isMobile ? "mobile" : ""
          }`}
          aria-label={`Select ${modeOption.label} mode`}
          type="button"
        >
          <span className="mode-icon">{modeOption.icon}</span>
          <span className="mode-label-text">{modeOption.label}</span>
        </button>
      ))}
    </div>
  );
});

const EnhancedSearchPanel = React.memo(
  ({
    origin,
    destination,
    onOriginChange,
    onDestinationChange,
    onRouteRequest,
    accessibilitySettings,
    routeMode,
    onModeChange,
    isMobile = false,
    onSearchToggle,
    onLocationDetect,
  }) => {
    const [showOriginResults, setShowOriginResults] = useState(false);
    const [showDestinationResults, setShowDestinationResults] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

    const originInputRef = useRef(null);
    const destinationInputRef = useRef(null);
    const resultsRef = useRef(null);

    // Debounce search term for better performance
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Initialize enhanced search service
    useEffect(() => {
      enhancedSearchService.initialize();
    }, []);

    // Enhanced search results using unified search service
    const [originSearchResults, setOriginSearchResults] = useState([]);
    const [destinationSearchResults, setDestinationSearchResults] = useState(
      []
    );
    const [isSearching, setIsSearching] = useState(false);

    // Perform search using enhanced search service
    useEffect(() => {
      const performSearch = async () => {
        if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
          setOriginSearchResults([]);
          setDestinationSearchResults([]);
          setSearchError(null);
          return;
        }

        setIsSearching(true);
        setSearchError(null);

        try {
          console.log("Searching for:", debouncedSearchTerm);
          const results = await enhancedSearchService.search(
            debouncedSearchTerm,
            {
              limit: 8,
              includeCivicAddresses: true,
              includePOIs: true,
              includeParking: true,
              includeTransit: true,
              includeAmenities: true,
            }
          );
          console.log("Search results:", results);

          // Update results based on which input is focused
          if (focusedInput === "origin") {
            setOriginSearchResults(results);
          } else if (focusedInput === "destination") {
            setDestinationSearchResults(results);
          }
        } catch (error) {
          console.error("Search error:", error);
          setSearchError("Search failed. Please try again.");
          setOriginSearchResults([]);
          setDestinationSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      };

      performSearch();
    }, [debouncedSearchTerm, focusedInput]);

    // Enhanced keyboard navigation
    const handleKeyDown = useCallback(
      (e, results, setResults, onSelect) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (results.length > 0 && highlightedIndex >= 0) {
            onSelect(results[highlightedIndex]);
          } else if (results.length > 0) {
            onSelect(results[0]);
          }
        } else if (e.key === "Escape") {
          setResults(false);
          setHighlightedIndex(-1);
        }
      },
      [highlightedIndex]
    );

    // Optimized input change handler
    const handleInputChange = useCallback((value, setValue, setResults) => {
      setValue(value);
      setSearchTerm(value);
      setHighlightedIndex(-1);
      setSearchError(null);

      if (value.length > 1) {
        setResults(true);
      } else {
        setResults(false);
      }
    }, []);

    // Optimized result selection
    const handleResultSelect = useCallback((result, setValue, setResults) => {
      // Use the full address if available, otherwise use the name
      const displayValue = result.address
        ? `${result.name}, ${result.address}`
        : result.name;
      setValue(displayValue);
      setResults(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      setSearchError(null);

      // Add to recent searches
      enhancedSearchService.addToRecentSearches(result);
    }, []);

    // Optimized input clearing
    const clearInput = useCallback((setValue, setResults) => {
      setValue("");
      setResults(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      setSearchError(null);
    }, []);

    // Optimized route request with validation
    const handleRouteRequest = useCallback(() => {
      console.log("Route request triggered:", {
        origin,
        destination,
        routeMode,
      });
      if (origin && destination && origin.trim() && destination.trim()) {
        setIsLoading(true);
        const routeData = {
          origin: origin.trim(),
          destination: destination.trim(),
          mode: routeMode,
          accessibilitySettings,
        };
        console.log("Calling onRouteRequest with:", routeData);
        onRouteRequest(routeData);
        setIsLoading(false);
        onSearchToggle();
      } else {
        console.log("Route request validation failed:", {
          origin,
          destination,
        });
        setSearchError("Please enter both origin and destination");
      }
    }, [
      origin,
      destination,
      routeMode,
      accessibilitySettings,
      onRouteRequest,
      onSearchToggle,
    ]);

    // Mode change handler
    const handleModeChange = useCallback(
      (newMode) => {
        onModeChange(newMode);
      },
      [onModeChange]
    );

    // Location detection handler
    const handleLocationDetect = useCallback(async () => {
      if (!onLocationDetect) return;
      
      setIsDetectingLocation(true);
      setSearchError(null);
      
      try {
        await onLocationDetect();
      } catch (error) {
        console.error('Location detection failed:', error);
        setSearchError('Failed to detect location. Please enter manually.');
      } finally {
        setIsDetectingLocation(false);
      }
    }, [onLocationDetect]);

    // Focus management
    const handleInputFocus = useCallback(
      (inputType) => {
        setFocusedInput(inputType);
        if (inputType === "origin" && origin) {
          setShowOriginResults(true);
        } else if (inputType === "destination" && destination) {
          setShowDestinationResults(true);
        }
      },
      [origin, destination]
    );

    const handleInputBlur = useCallback(() => {
      // Delay hiding results to allow for clicks
      setTimeout(() => {
        setFocusedInput(null);
        setShowOriginResults(false);
        setShowDestinationResults(false);
        setHighlightedIndex(-1);
      }, 150);
    }, []);

    // Reset highlighted index when results change
    useEffect(() => {
      setHighlightedIndex(-1);
    }, [originSearchResults, destinationSearchResults]);

    // Scroll highlighted item into view
    useEffect(() => {
      if (highlightedIndex >= 0 && resultsRef.current) {
        const highlightedElement =
          resultsRef.current.children[highlightedIndex];
        if (highlightedElement) {
          highlightedElement.scrollIntoView({
            block: "nearest",
            behavior: "smooth",
          });
        }
      }
    }, [highlightedIndex]);

    return (
      <div
        className={`search-panel bg-white/40 backdrop-blur-sm z-[999999] ${
          isMobile
            ? "mobile fixed inset-0 "
            : "absolute top-20 right-0 w-96 max-h-[calc(100vh-6rem)]"
        }`}
      >
        {/* Header - Different for mobile vs desktop */}
        {isMobile ? (
          <div className="mobile-search-header">
            <h2 className="mobile-search-title">Plan Your Route</h2>
            <button
              className="mobile-search-close"
              onClick={() => onSearchToggle && onSearchToggle()}
              aria-label="Close search panel"
              type="button"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="search-header">
            <h2 className="search-title">Plan Your Route</h2>
            <p className="search-subtitle">
              Find accessible paths to your destination
            </p>
          </div>
        )}

        <div className="search-form">
          {/* Origin Input */}
          <div className="input-group">
            <label htmlFor="origin-input" className="input-label">
              <MapPinIcon className="w-4 h-4" />
              Starting Point
            </label>
            <div className="input-container-with-location">
              <div className="input-container">
                <input
                  ref={originInputRef}
                  id="origin-input"
                  type="text"
                  value={origin}
                  onChange={(e) =>
                    handleInputChange(
                      e.target.value,
                      onOriginChange,
                      setShowOriginResults
                    )
                  }
                  onFocus={() => handleInputFocus("origin")}
                  onBlur={handleInputBlur}
                  onKeyDown={(e) =>
                    handleKeyDown(
                      e,
                      originSearchResults,
                      setShowOriginResults,
                      (result) =>
                        handleResultSelect(
                          result,
                          onOriginChange,
                          setShowOriginResults
                        )
                    )
                  }
                  placeholder="Enter starting location"
                  className="search-input"
                  aria-describedby="origin-results"
                />
                {origin && (
                  <button
                    onClick={() =>
                      clearInput(onOriginChange, setShowOriginResults)
                    }
                    className="clear-button"
                    aria-label="Clear origin"
                    type="button"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Location Detection Button */}
              <button
                onClick={handleLocationDetect}
                disabled={isDetectingLocation}
                className="location-detect-button"
                aria-label="Use current location"
                type="button"
                title="Use current location"
              >
                {isDetectingLocation ? (
                  <div className="spinner-small"></div>
                ) : (
                  <GlobeAltIcon className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Origin Results */}
            {showOriginResults &&
              (originSearchResults.length > 0 || isSearching) && (
                <div
                  ref={resultsRef}
                  id="origin-results"
                  className="search-results"
                  role="listbox"
                  aria-label="Origin search results"
                >
                  {isSearching && (
                    <div className="search-loading">
                      <div className="spinner-small"></div>
                      <span>Searching...</span>
                    </div>
                  )}
                  {!isSearching &&
                    originSearchResults.map((result, index) => (
                      <SearchResultItem
                        key={`${result.id}-${index}`}
                        result={result}
                        onSelect={(result) =>
                          handleResultSelect(
                            result,
                            onOriginChange,
                            setShowOriginResults
                          )
                        }
                        isHighlighted={index === highlightedIndex}
                        isMobile={isMobile}
                      />
                    ))}
                  {!isSearching && originSearchResults.length === 0 && (
                    <div className="no-results">
                      <span>No results found</span>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Destination Input */}
          <div className="input-group">
            <label htmlFor="destination-input" className="input-label">
              <MapPinIcon className="w-4 h-4" />
              Destination
            </label>
            <div className="input-container">
              <input
                ref={destinationInputRef}
                id="destination-input"
                type="text"
                value={destination}
                onChange={(e) =>
                  handleInputChange(
                    e.target.value,
                    onDestinationChange,
                    setShowDestinationResults
                  )
                }
                onFocus={() => handleInputFocus("destination")}
                onBlur={handleInputBlur}
                onKeyDown={(e) =>
                  handleKeyDown(
                    e,
                    destinationSearchResults,
                    setShowDestinationResults,
                    (result) =>
                      handleResultSelect(
                        result,
                        onDestinationChange,
                        setShowDestinationResults
                      )
                  )
                }
                placeholder="Enter destination"
                className="search-input"
                aria-describedby="destination-results"
              />
              {destination && (
                <button
                  onClick={() =>
                    clearInput(onDestinationChange, setShowDestinationResults)
                  }
                  className="clear-button"
                  aria-label="Clear destination"
                  type="button"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Destination Results */}
            {showDestinationResults &&
              (destinationSearchResults.length > 0 || isSearching) && (
                <div
                  id="destination-results"
                  className="search-results"
                  role="listbox"
                  aria-label="Destination search results"
                >
                  {isSearching && (
                    <div className="search-loading">
                      <div className="spinner-small"></div>
                      <span>Searching...</span>
                    </div>
                  )}
                  {!isSearching &&
                    destinationSearchResults.map((result, index) => (
                      <SearchResultItem
                        key={`${result.id}-${index}`}
                        result={result}
                        onSelect={(result) =>
                          handleResultSelect(
                            result,
                            onDestinationChange,
                            setShowDestinationResults
                          )
                        }
                        isHighlighted={index === highlightedIndex}
                        isMobile={isMobile}
                      />
                    ))}
                  {!isSearching && destinationSearchResults.length === 0 && (
                    <div className="no-results">
                      <span>No results found</span>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Error Message */}
          {searchError && (
            <div className="search-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{searchError}</span>
            </div>
          )}

          {/* Mode Selector */}
          <div className="mode-section">
            <label className="mode-label">Transportation Mode</label>
            <ModeSelector
              mode={routeMode}
              onModeChange={handleModeChange}
              isMobile={isMobile}
            />
          </div>

          {/* Plan Route Button */}
          <button
            onClick={handleRouteRequest}
            disabled={!origin || !destination || isLoading}
            className="plan-route-button"
            type="button"
            aria-label="Plan route from origin to destination"
          >
            {isLoading ? (
              <>
                <div className="spinner-small"></div>
                <span>Planning Route...</span>
              </>
            ) : (
              <>
                <ArrowRightIcon className="w-5 h-5" />
                <span>Plan Route</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
);

EnhancedSearchPanel.displayName = "EnhancedSearchPanel";

export default EnhancedSearchPanel;
