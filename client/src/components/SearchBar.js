import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import useGeocoding from '../hooks/useGeocoding';
import { getSearchSuggestions } from '../search/normalize';

const SearchBar = React.memo(({
  origin,
  destination,
  onOriginChange,
  onDestinationChange,
  onFocus,
  onBlur,
  onRouteRequest,
  canRequestRoute,
  isFocused
}) => {
  const [activeInput, setActiveInput] = useState(null); // 'origin' or 'destination'
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const originInputRef = useRef(null);
  const destinationInputRef = useRef(null);
  const resultsRef = useRef(null);
  
  const { search } = useGeocoding();

  // Enhanced debounced search function with better query handling
  const debouncedSearch = useMemo(() => {
    let timeoutId;
    return (query, inputType) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (query.trim().length < 2) {
          setSearchResults([]);
          setSearchSuggestions([]);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setSelectedIndex(-1);
        
        try {
          // Get search suggestions for partial queries
          if (query.trim().length >= 2 && query.trim().length < 4) {
            const suggestions = getSearchSuggestions(query.trim(), 5);
            setSearchSuggestions(suggestions);
          } else {
            setSearchSuggestions([]);
          }
          
          // Enhanced search options for better results
          const results = await search(query, {
            limit: 12, // Increased limit for better variety
            types: 'address,poi,place',
            country: 'ca',
            bbox: '-63.8,44.5,-63.4,44.8', // Halifax area
            proximity: [-63.5756, 44.6475] // Halifax coordinates for proximity bias
          });
          
          console.log(`Search results for "${query}":`, results?.length || 0, 'results');
          setSearchResults(results || []);
        } catch (error) {
          console.error('Search failed:', error);
          setSearchResults([]);
          setSearchSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300); // 300ms debounce for better UX
    };
  }, [search]);

  // Handle input change with enhanced validation
  const handleInputChange = useCallback((value, inputType) => {
    const setter = inputType === 'origin' ? onOriginChange : onDestinationChange;
    setter(value);
    
    if (value.trim().length >= 2) {
      setActiveInput(inputType);
      setShowResults(true);
      debouncedSearch(value, inputType);
    } else {
      setShowResults(false);
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  }, [onOriginChange, onDestinationChange, debouncedSearch]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion, inputType) => {
    const setter = inputType === 'origin' ? onOriginChange : onDestinationChange;
    setter(suggestion.text);
    setSearchSuggestions([]);
    setShowResults(false);
    setSelectedIndex(-1);
  }, [onOriginChange, onDestinationChange]);

  // Enhanced result selection with better coordinate handling
  const handleResultSelect = useCallback((result, inputType) => {
    const setter = inputType === 'origin' ? onOriginChange : onDestinationChange;
    
    // Use the enhanced display name and full address
    const displayName = result.displayName || result.name || result.text || '';
    const fullAddress = result.fullAddress || result.address || result.place_name || displayName;
    
    // Set the full address as the input value
    setter(fullAddress);
    
    setShowResults(false);
    setSearchResults([]);
    setSearchSuggestions([]);
    setSelectedIndex(-1);
    
    // Focus the other input if both are filled
    if (inputType === 'origin' && destination) {
      destinationInputRef.current?.focus();
    } else if (inputType === 'destination' && origin) {
      originInputRef.current?.focus();
    }
    
    // Log the selection for debugging
    console.log(`Selected ${inputType}:`, {
      name: result?.name || 'Unknown',
      address: result?.address || 'Unknown',
      coordinates: result?.coordinates || null,
      type: result?.type || 'Unknown',
      relevance: result?.relevance || 0
    });
  }, [onOriginChange, onDestinationChange, origin, destination]);

  // Enhanced keyboard navigation
  const handleKeyDown = useCallback((e, inputType) => {
    const totalItems = searchSuggestions.length + searchResults.length;
    if (!showResults || totalItems === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (selectedIndex < searchSuggestions.length) {
            handleSuggestionSelect(searchSuggestions[selectedIndex], inputType);
          } else {
            const resultIndex = selectedIndex - searchSuggestions.length;
            if (resultIndex < searchResults.length) {
              handleResultSelect(searchResults[resultIndex], inputType);
            }
          }
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSearchResults([]);
        setSearchSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  }, [showResults, searchResults, searchSuggestions, selectedIndex, handleResultSelect, handleSuggestionSelect]);

  // Enhanced result display with better formatting
  const getResultDisplayText = useCallback((result) => {
    if (!result) {
      return { primary: 'Unknown', secondary: '' };
    }
    
    const name = result.name || result.text || '';
    const address = result.address || result.place_name || '';
    
    // Remove the name from the address to avoid duplication
    const cleanAddress = address.replace(new RegExp(`^${name},?\\s*`, 'i'), '');
    
    // Format based on result type
    if (result.type === 'address' || result.isCivicAddress) {
      // For civic addresses, show the full address
      return {
        primary: name,
        secondary: cleanAddress || 'Halifax, NS'
      };
    } else if (result.type === 'poi') {
      // For points of interest, show name and address
      return {
        primary: name,
        secondary: cleanAddress || 'Halifax, NS'
      };
    } else {
      // For places, show name and context
      return {
        primary: name,
        secondary: cleanAddress || 'Halifax, NS'
      };
    }
  }, []);

  // Render search suggestions
  const renderSuggestion = useCallback((suggestion, index) => {
    const isSelected = index === selectedIndex;
    
    const getSuggestionIcon = () => {
      if (suggestion.type === 'category') {
        return '🏷️'; // Category tag icon
      } else if (suggestion.type === 'business') {
        return '🏢'; // Business icon
      }
      return '💡'; // Default suggestion icon
    };

    return (
      <div
        key={`suggestion-${index}`}
        className={`search-suggestion-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleSuggestionSelect(suggestion, activeInput)}
        onMouseEnter={() => setSelectedIndex(index)}
      >
        <div className="suggestion-icon">{getSuggestionIcon()}</div>
        <div className="suggestion-content">
          <div className="suggestion-text">{suggestion.text}</div>
          <div className="suggestion-type">{suggestion.category}</div>
        </div>
      </div>
    );
  }, [selectedIndex, activeInput, handleSuggestionSelect]);

  // Enhanced result rendering with icons and better styling
  const renderSearchResult = useCallback((result, index) => {
    const displayText = getResultDisplayText(result);
    const adjustedIndex = index + searchSuggestions.length;
    const isSelected = adjustedIndex === selectedIndex;
    
    // Get icon based on result type
    const getIcon = () => {
      if (!result) return '📍';
      
      if (result.type === 'address' || result.isCivicAddress) {
        return '📍'; // Address icon
      } else if (result.type === 'poi') {
        return '🏢'; // Point of interest icon
      } else {
        return '🌍'; // Place icon
      }
    };

    return (
      <div
        key={`${result.id}-${index}`}
        className={`search-result-item ${isSelected ? 'selected' : ''}`}
        onClick={() => handleResultSelect(result, activeInput)}
        onMouseEnter={() => setSelectedIndex(adjustedIndex)}
      >
        <div className="result-icon">{getIcon()}</div>
        <div className="result-content">
          <div className="result-primary">{displayText.primary}</div>
          {displayText.secondary && (
            <div className="result-secondary">{displayText.secondary}</div>
          )}
        </div>
        {result.relevance && (
          <div className="result-relevance">
            {Math.round(result.relevance)}%
          </div>
        )}
      </div>
    );
  }, [selectedIndex, activeInput, handleResultSelect, getResultDisplayText, searchSuggestions.length]);

  // Handle input focus
  const handleFocus = useCallback((inputType) => {
    setActiveInput(inputType);
    onFocus?.(inputType);
    
    // Show results if there's a value
    const value = inputType === 'origin' ? origin : destination;
    if (value && value.trim().length >= 2) {
      setShowResults(true);
    }
  }, [origin, destination, onFocus]);

  // Handle input blur
  const handleBlur = useCallback(() => {
    // Delay hiding results to allow for clicks
    setTimeout(() => {
      setShowResults(false);
      setSelectedIndex(-1);
    }, 200);
    onBlur?.();
  }, [onBlur]);

  return (
    <div className="search-bar-container">
      <div className="search-inputs">
        {/* Origin Input */}
        <div className="input-group">
          <label htmlFor="origin-input" className="input-label">
            <span className="input-icon">📍</span>
            From
          </label>
          <input
            ref={originInputRef}
            id="origin-input"
            type="text"
            value={origin}
            onChange={(e) => handleInputChange(e.target.value, 'origin')}
            onFocus={() => handleFocus('origin')}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, 'origin')}
            placeholder="Enter starting point"
            className="search-input"
            autoComplete="off"
          />
        </div>

        {/* Destination Input */}
        <div className="input-group">
          <label htmlFor="destination-input" className="input-label">
            <span className="input-icon">🎯</span>
            To
          </label>
          <input
            ref={destinationInputRef}
            id="destination-input"
            type="text"
            value={destination}
            onChange={(e) => handleInputChange(e.target.value, 'destination')}
            onFocus={() => handleFocus('destination')}
            onBlur={handleBlur}
            onKeyDown={(e) => handleKeyDown(e, 'destination')}
            placeholder="Enter destination"
            className="search-input"
            autoComplete="off"
          />
        </div>

        {/* Route Button */}
        <button
          onClick={onRouteRequest}
          disabled={!canRequestRoute}
          className="route-button"
          aria-label="Calculate route"
        >
          <span className="route-icon">🚶</span>
          Route
        </button>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (searchResults.length > 0 || searchSuggestions.length > 0 || isLoading) && (
        <div ref={resultsRef} className="search-results">
          {isLoading && (
            <div className="loading-result">
              <div className="loading-spinner"></div>
              <span>Searching...</span>
            </div>
          )}
          
          {!isLoading && searchSuggestions.length > 0 && (
            <div className="suggestions-section">
              <div className="suggestions-header">Suggestions</div>
              {searchSuggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
            </div>
          )}
          
          {!isLoading && searchResults.length > 0 && (
            <div className="results-section">
              {searchSuggestions.length > 0 && <div className="results-header">Results</div>}
              {searchResults.map((result, index) => renderSearchResult(result, index))}
            </div>
          )}
          
          {!isLoading && searchResults.length === 0 && searchSuggestions.length === 0 && (
            <div className="no-results">
              <span>No results found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
