// Search Controller - Main Orchestrator
// Handles input events, debouncing, and coordinates all search modules

import { normalizeQuery } from './normalize';
import { buildAddressIndex, searchAddressIndex } from './addressIndex';
import { buildPoiIndex, searchPoiIndex } from './poiIndex';
import { geocodeExternal, HALIFAX_BBOX } from './externalGeocoder';
import { rankCandidates, mergeAllCandidates } from './rank';
import { snapToNetwork, loadNetworkData } from './snap';

class SearchController {
  constructor() {
    this.addressIndex = null;
    this.poiIndex = null;
    this.isInitialized = false;
    this.debounceTimers = new Map();
    this.recentSelections = [];
    this.searchContext = {};
    
    // Performance tracking
    this.searchTimes = [];
    this.maxSearchTimeHistory = 100;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing search controller...');
    
    try {
      // Build indexes in parallel
      const [addressIndex, poiIndex] = await Promise.all([
        buildAddressIndex('/data/CivicAddresses_-5590432719903009914.geojson'),
        buildPoiIndex()
      ]);
      
      this.addressIndex = addressIndex;
      this.poiIndex = poiIndex;
      
      // Load network data for snapping
      await loadNetworkData();
      
      this.isInitialized = true;
      console.log('Search controller initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize search controller:', error);
      throw error;
    }
  }
  
  async onSearchInput(query, context = {}, debounceMs = 200) {
    // Update context
    this.searchContext = { ...this.searchContext, ...context };
    
    // Debounce the search
    const searchId = `search-${Date.now()}`;
    
    return new Promise((resolve) => {
      // Clear existing timer for this search
      if (this.debounceTimers.has(searchId)) {
        clearTimeout(this.debounceTimers.get(searchId));
      }
      
      const timer = setTimeout(async () => {
        try {
          const startTime = performance.now();
          const suggestions = await this.performSearch(query);
          const endTime = performance.now();
          
          // Track performance
          this.trackSearchTime(endTime - startTime);
          
          resolve(suggestions);
        } catch (error) {
          console.error('Search failed:', error);
          resolve([]);
        }
      }, debounceMs);
      
      this.debounceTimers.set(searchId, timer);
    });
  }
  
  async performSearch(query) {
    if (!this.isInitialized) {
      console.warn('Search controller not initialized');
      return [];
    }
    
    if (!query.trim()) return [];
    
    try {
      // Normalize query with enhanced POI detection
      const normalizedQuery = normalizeQuery(query);
      
      console.log('Search query analysis:', {
        original: query,
        isPOISearch: normalizedQuery.isPOISearch,
        categories: normalizedQuery.poiCategories,
        intent: normalizedQuery.searchIntent
      });
      
      // Adjust search strategy based on intent
      let localAddressResults = [];
      let localPoiResults = [];
      let externalResults = [];
      
      if (normalizedQuery.isPOISearch) {
        // Prioritize POI search
        localPoiResults = this.poiIndex ? 
          searchPoiIndex(this.poiIndex, normalizedQuery, 15) : [];
        
        // Still search addresses but with lower limit
        localAddressResults = this.addressIndex ? 
          searchAddressIndex(this.addressIndex, normalizedQuery, 5) : [];
        
        // Search external POIs with higher limit for POI searches
        try {
          externalResults = await geocodeExternal(query, HALIFAX_BBOX, 'ca', 8);
        } catch (error) {
          console.warn('External geocoding failed:', error);
        }
      } else {
        // Standard search for addresses
        localAddressResults = this.addressIndex ? 
          searchAddressIndex(this.addressIndex, normalizedQuery, 10) : [];
        localPoiResults = this.poiIndex ? 
          searchPoiIndex(this.poiIndex, normalizedQuery, 5) : [];
        
        try {
          externalResults = await geocodeExternal(query, HALIFAX_BBOX, 'ca', 5);
        } catch (error) {
          console.warn('External geocoding failed:', error);
        }
      }
      
      // Merge and rank results
      const allCandidates = mergeAllCandidates(
        localAddressResults,
        localPoiResults,
        externalResults,
        normalizedQuery
      );
      
      const rankedCandidates = rankCandidates(allCandidates, {
        mapCenter: this.searchContext.mapCenter || { lat: 44.647, lon: -63.572 },
        userLocation: this.searchContext.userLocation,
        recentSelections: this.recentSelections,
        userPreferences: this.searchContext.userPreferences,
        searchIntent: normalizedQuery.searchIntent
      }, 12);
      
      // Convert to suggestions with enhanced display
      return rankedCandidates.map(candidate => ({
        id: candidate.id,
        displayName: candidate.displayName,
        type: candidate.type,
        coordinates: candidate.coordinates,
        source: candidate.source,
        matchType: candidate.matchType,
        originalRecord: candidate.originalRecord,
        category: candidate.category,
        score: candidate.finalScore
      }));
      
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }
  
  async onSuggestionSelect(suggestion, target, mode) {
    try {
      // Snap to network
      const snappedPoint = await snapToNetwork(
        suggestion.coordinates.lat,
        suggestion.coordinates.lon,
        mode
      );
      
      return {
        coordinates: suggestion.coordinates,
        snappedCoordinates: snappedPoint,
        displayName: suggestion.displayName
      };
      
    } catch (error) {
      console.error('Suggestion selection error:', error);
      return {
        coordinates: suggestion.coordinates,
        displayName: suggestion.displayName
      };
    }
  }
  
  trackSearchTime(time) {
    this.searchTimes.push(time);
    if (this.searchTimes.length > this.maxSearchTimeHistory) {
      this.searchTimes.shift();
    }
  }
  
  getSearchStats() {
    const avgTime = this.searchTimes.length > 0 ? 
      this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length : 0;
    
    return {
      isInitialized: this.isInitialized,
      totalSearches: this.searchTimes.length,
      averageSearchTime: avgTime,
      recentSelections: this.recentSelections.slice(-10)
    };
  }
}

// Singleton instance
export const searchController = new SearchController();

// Public API functions
export const onSearchInput = (query, context, debounceMs) => 
  searchController.onSearchInput(query, context, debounceMs);

export const onSuggestionSelect = (suggestion, target, mode) => 
  searchController.onSuggestionSelect(suggestion, target, mode);

export const initializeSearchController = () => 
  searchController.initialize();

export const getSearchStats = () => 
  searchController.getSearchStats();
