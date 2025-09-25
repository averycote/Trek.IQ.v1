/**
 * Unified Search Component - Single Canonical Search Implementation
 * 
 * Consolidates all search components into a single, clean, production-ready
 * implementation that replaces overlapping search components.
 * 
 * Features:
 * - Unified search interface with autocomplete
 * - Multiple search providers (Mapbox, OpenStreetMap, custom)
 * - Accessibility features built-in
 * - Mobile-first responsive design
 * - Performance optimizations with debouncing
 * - Error handling and fallbacks
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import unifiedAPIService from '../../services/unifiedAPIService.js';
import performanceOptimizationService from '../../services/performanceOptimizationService.js';

const UnifiedSearchComponent = ({
  // Core props
  placeholder = 'Search for places...',
  value = '',
  onChange = () => {},
  onSelect = () => {},
  onClear = () => {},
  
  // Search configuration
  providers = ['mapbox', 'osm'],
  searchTypes = ['address', 'poi', 'transit'],
  maxResults = 10,
  minLength = 2,
  debounceMs = 300,
  
  // UI configuration
  showClearButton = true,
  showSearchIcon = true,
  showResultsCount = true,
  showProviderBadges = false,
  
  // Accessibility
  screenReaderSupport = true,
  highContrast = false,
  
  // Styling
  className = '',
  style = {},
  inputStyle = {},
  resultsStyle = {},
  
  // Error handling
  onError = () => {},
  fallbackComponent = null,
  
  // Performance
  enableCaching = true,
  cacheTTL = 300000, // 5 minutes
  
  // Children
  children
}) => {
  // State management
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  
  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    searchTime: 0,
    resultCount: 0,
    cacheHits: 0,
    totalSearches: 0
  });
  
  // Refs
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const debounceRef = useRef(null);
  const searchStartTime = useRef(0);
  
  // Memoized configurations
  const searchConfig = useMemo(() => ({
    providers,
    searchTypes,
    maxResults,
    minLength,
    debounceMs,
    enableCaching,
    cacheTTL
  }), [providers, searchTypes, maxResults, minLength, debounceMs, enableCaching, cacheTTL]);
  
  // Debounced search function
  const debouncedSearch = useCallback((searchQuery) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, debounceMs);
  }, [debounceMs]);
  
  // Perform search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < minLength) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    
    searchStartTime.current = performance.now();
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first
      if (enableCaching) {
        const cacheKey = `search_${searchQuery}_${providers.join('_')}`;
        const cachedResults = performanceOptimizationService.getCachedResponse?.(cacheKey);
        
        if (cachedResults) {
          setResults(cachedResults);
          setIsOpen(true);
          setIsLoading(false);
          setPerformanceMetrics(prev => ({
            ...prev,
            cacheHits: prev.cacheHits + 1
          }));
          return;
        }
      }
      
      // Perform search across providers
      const searchPromises = providers.map(provider => 
        searchWithProvider(provider, searchQuery, searchTypes)
      );
      
      const searchResults = await Promise.allSettled(searchPromises);
      
      // Combine and deduplicate results
      const combinedResults = combineSearchResults(searchResults, maxResults);
      
      // Cache results
      if (enableCaching && combinedResults.length > 0) {
        const cacheKey = `search_${searchQuery}_${providers.join('_')}`;
        performanceOptimizationService.cacheResponse?.(cacheKey, combinedResults);
      }
      
      setResults(combinedResults);
      setIsOpen(true);
      setSelectedIndex(-1);
      
      // Update performance metrics
      const searchTime = performance.now() - searchStartTime.current;
      setPerformanceMetrics(prev => ({
        ...prev,
        searchTime,
        resultCount: combinedResults.length,
        totalSearches: prev.totalSearches + 1
      }));
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      setError(error.message);
      onError(error);
    } finally {
      setIsLoading(false);
    }
  }, [providers, searchTypes, maxResults, minLength, enableCaching, onError]);
  
  // Search with specific provider
  const searchWithProvider = useCallback(async (provider, query, types) => {
    try {
      let endpoint = '';
      let params = { q: query };
      
      switch (provider) {
        case 'mapbox':
          endpoint = '/geocoding/v5/mapbox.places/';
          params = {
            ...params,
            types: types.join(','),
            limit: maxResults,
            country: 'CA' // Canada focus
          };
          break;
          
        case 'osm':
          endpoint = '/search';
          params = {
            ...params,
            format: 'json',
            limit: maxResults,
            countrycodes: 'ca'
          };
          break;
          
        case 'custom':
          endpoint = '/api/search';
          params = {
            ...params,
            types: types.join(','),
            limit: maxResults
          };
          break;
          
        default:
          throw new Error(`Unknown search provider: ${provider}`);
      }
      
      const response = await unifiedAPIService.request(provider, endpoint, {
        params
      });
      
      return normalizeSearchResults(response, provider);
      
    } catch (error) {
      console.error(`❌ Search failed for provider ${provider}:`, error);
      return [];
    }
  }, [maxResults]);
  
  // Normalize search results from different providers
  const normalizeSearchResults = useCallback((response, provider) => {
    try {
      switch (provider) {
        case 'mapbox':
          return response.features?.map(feature => ({
            id: feature.id,
            name: feature.place_name,
            address: feature.place_name,
            coordinates: feature.center,
            type: feature.place_type?.[0] || 'unknown',
            provider: 'mapbox',
            relevance: feature.relevance || 0,
            raw: feature
          })) || [];
          
        case 'osm':
          return response.map(item => ({
            id: item.place_id,
            name: item.display_name,
            address: item.display_name,
            coordinates: [parseFloat(item.lon), parseFloat(item.lat)],
            type: item.type || 'unknown',
            provider: 'osm',
            relevance: item.importance || 0,
            raw: item
          })) || [];
          
        case 'custom':
          return response.results?.map(item => ({
            id: item.id,
            name: item.name,
            address: item.address,
            coordinates: item.coordinates,
            type: item.type || 'unknown',
            provider: 'custom',
            relevance: item.relevance || 0,
            raw: item
          })) || [];
          
        default:
          return [];
      }
    } catch (error) {
      console.error(`❌ Failed to normalize results from ${provider}:`, error);
      return [];
    }
  }, []);
  
  // Combine search results from multiple providers
  const combineSearchResults = useCallback((searchResults, maxResults) => {
    const allResults = [];
    
    searchResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        allResults.push(...result.value);
      }
    });
    
    // Deduplicate by coordinates and name
    const uniqueResults = allResults.reduce((acc, result) => {
      const key = `${result.coordinates[0]},${result.coordinates[1]},${result.name}`;
      if (!acc.has(key)) {
        acc.set(key, result);
      }
      return acc;
    }, new Map());
    
    // Sort by relevance and return top results
    return Array.from(uniqueResults.values())
      .sort((a, b) => (b.relevance || 0) - (a.relevance || 0))
      .slice(0, maxResults);
  }, []);
  
  // Handle input change
  const handleInputChange = useCallback((e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange(newQuery);
    
    if (newQuery.length >= minLength) {
      debouncedSearch(newQuery);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [onChange, minLength, debouncedSearch]);
  
  // Handle result selection
  const handleResultSelect = useCallback((result) => {
    setQuery(result.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(result);
    
    // Add to search history
    setSearchHistory(prev => {
      const newHistory = [result, ...prev.filter(item => item.id !== result.id)];
      return newHistory.slice(0, 10); // Keep last 10 searches
    });
  }, [onSelect]);
  
  // Handle clear
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    onChange('');
    onClear();
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [onChange, onClear]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isOpen || results.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleResultSelect(results[selectedIndex]);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  }, [isOpen, results, selectedIndex, handleResultSelect]);
  
  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);
  
  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  // Error boundary
  if (error && fallbackComponent) {
    return fallbackComponent;
  }
  
  return (
    <div 
      className={`unified-search-component ${className} ${highContrast ? 'high-contrast' : ''}`}
      style={{ position: 'relative', ...style }}
      role="search"
      aria-label="Search for places"
    >
      {/* Search input */}
      <div style={{ position: 'relative' }}>
        {showSearchIcon && (
          <div 
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
              color: '#666'
            }}
          >
            🔍
          </div>
        )}
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px',
            paddingLeft: showSearchIcon ? '40px' : '12px',
            paddingRight: showClearButton ? '40px' : '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '16px',
            outline: 'none',
            ...inputStyle
          }}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
          aria-describedby="search-results-count"
        />
        
        {showClearButton && query && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#666'
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1
          }}
        >
          <div 
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #007bff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        </div>
      )}
      
      {/* Search results */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            ...resultsStyle
          }}
          role="listbox"
          aria-label="Search results"
        >
          {showResultsCount && (
            <div 
              id="search-results-count"
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: '#666',
                borderBottom: '1px solid #eee'
              }}
            >
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
          )}
          
          {results.map((result, index) => (
            <div
              key={result.id}
              id={`result-${index}`}
              onClick={() => handleResultSelect(result)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: selectedIndex === index ? '#f0f8ff' : 'transparent',
                borderBottom: index < results.length - 1 ? '1px solid #eee' : 'none'
              }}
              role="option"
              aria-selected={selectedIndex === index}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {result.name}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                {result.address}
              </div>
              {showProviderBadges && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  {result.provider}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fee',
            color: '#c33',
            padding: '8px 12px',
            border: '1px solid #fcc',
            borderRadius: '0 0 8px 8px',
            fontSize: '14px',
            zIndex: 1000
          }}
        >
          {error}
        </div>
      )}
      
      {/* Performance metrics (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '8px',
            fontSize: '12px',
            zIndex: 1000
          }}
        >
          <div>Search: {performanceMetrics.searchTime.toFixed(2)}ms</div>
          <div>Results: {performanceMetrics.resultCount}</div>
          <div>Cache: {performanceMetrics.cacheHits}</div>
          <div>Total: {performanceMetrics.totalSearches}</div>
        </div>
      )}
      
      {/* Accessibility features */}
      {screenReaderSupport && (
        <div 
          style={{
            position: 'absolute',
            left: '-10000px',
            width: '1px',
            height: '1px',
            overflow: 'hidden'
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          {isLoading ? 'Searching...' : 
           results.length > 0 ? `${results.length} results found` : 
           query.length >= minLength ? 'No results found' : ''}
        </div>
      )}
      
      {/* Custom children */}
      {children}
    </div>
  );
};

export default UnifiedSearchComponent;
