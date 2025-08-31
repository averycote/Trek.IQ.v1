// Search Module Exports
// Central export point for all search functionality

// Main controller and public API
export {
  searchController,
  onSearchInput,
  onSuggestionSelect,
  initializeSearchController,
  getSearchStats
} from './controller';

// Core search modules
export {
  normalizeQuery,
  tokenizeAddress,
  parseIntersection,
  parseCoordinates,
  expandAbbreviations,
  removeDiacritics,
  calculateFuzzyScore
} from './normalize';

export {
  buildAddressIndex,
  searchAddressIndex,
  getAddressDisplayName
} from './addressIndex';

export {
  buildPoiIndex,
  searchPoiIndex,
  getPoiDisplayName,
  DEFAULT_POI_LAYERS
} from './poiIndex';

export {
  geocodeExternal,
  convertExternalToAddressRecord,
  isExternalGeocodingAvailable,
  clearGeocodingCache,
  HALIFAX_BBOX
} from './externalGeocoder';

export {
  rankCandidates,
  mergeAllCandidates,
  convertScoredCandidatesToCandidates,
  convertExternalResultsToCandidates
} from './rank';

export {
  snapToNetwork,
  loadNetworkData,
  isPointOnNetwork,
  getNetworkStats,
  clearNetworkCache
} from './snap';
