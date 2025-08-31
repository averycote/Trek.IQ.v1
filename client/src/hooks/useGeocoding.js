import { useState, useCallback, useRef, useEffect } from 'react';
import mapboxSearchService from '../services/mapboxSearchService';

const useGeocoding = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  const search = useCallback(async (query, options = {}) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return [];
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the search
    return new Promise((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        setLoading(true);
        setError(null);

        try {
          const searchResults = await mapboxSearchService.search(query, {
            limit: 8,
            types: 'address,poi,place',
            country: 'ca',
            bbox: '-63.8,44.5,-63.4,44.8', // Halifax area
            ...options
          });
          
          // Ensure we always return an array
          const results = Array.isArray(searchResults) ? searchResults : [];
          setResults(results);
          resolve(results);
        } catch (err) {
          console.error('Mapbox search error:', err);
          setError('Failed to search for addresses');
          setResults([]);
          resolve([]);
        } finally {
          setLoading(false);
        }
      }, 300); // 300ms debounce
    });
  }, []);

  const geocode = useCallback(async (address, options = {}) => {
    try {
      const result = await mapboxSearchService.geocode(address, options);
      return result;
    } catch (err) {
      console.error('Mapbox geocoding error:', err);
      setError('Failed to geocode address');
      return null;
    }
  }, []);

  const reverseGeocode = useCallback(async (coordinates) => {
    try {
      const result = await mapboxSearchService.reverseGeocode(coordinates);
      return result;
    } catch (err) {
      console.error('Mapbox reverse geocoding error:', err);
      setError('Failed to reverse geocode coordinates');
      return null;
    }
  }, []);

  const getAutocomplete = useCallback(async (query, options = {}) => {
    try {
      const results = await mapboxSearchService.getAutocomplete(query, options);
      return Array.isArray(results) ? results : [];
    } catch (err) {
      console.error('Mapbox autocomplete error:', err);
      return [];
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const clearCache = useCallback(() => {
    mapboxSearchService.clearCache();
  }, []);

  const getStats = useCallback(() => {
    return mapboxSearchService.getCacheStats();
  }, []);

  return {
    results,
    loading,
    error,
    search,
    geocode,
    reverseGeocode,
    getAutocomplete,
    clearResults,
    clearCache,
    getStats
  };
};

export default useGeocoding;
