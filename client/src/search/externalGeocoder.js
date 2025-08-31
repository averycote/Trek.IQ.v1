// External Geocoder Module
// Handles external geocoding requests (Nominatim/OSM)

export const HALIFAX_BBOX = {
  minLat: 44.5,
  maxLat: 44.8,
  minLon: -63.8,
  maxLon: -63.4
};

// Simple cache for external results
const geocodingCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function geocodeExternal(query, bbox = HALIFAX_BBOX, country = 'ca', limit = 5) {
  if (!query || !query.trim()) {
    return [];
  }
  
  // Check cache first
  const cacheKey = `${query}-${JSON.stringify(bbox)}-${country}-${limit}`;
  const cached = geocodingCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }
  
  try {
    // For now, return mock results
    // In a real implementation, this would make HTTP requests to Nominatim
    const mockResults = generateMockExternalResults(query, bbox, limit);
    
    // Cache the results
    geocodingCache.set(cacheKey, {
      results: mockResults,
      timestamp: Date.now()
    });
    
    return mockResults;
    
  } catch (error) {
    console.error('External geocoding failed:', error);
    return [];
  }
}

export function convertExternalToAddressRecord(result) {
  return {
    id: result.place_id,
    displayName: result.display_name,
    type: 'external_poi',
    coordinates: {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon)
    },
    source: 'external_poi',
    matchType: 'exact',
    originalRecord: result
  };
}

export function isExternalGeocodingAvailable() {
  // In a real implementation, this would check network connectivity
  return true;
}

export function clearGeocodingCache() {
  geocodingCache.clear();
}

function generateMockExternalResults(query, bbox, limit) {
  const mockPOIs = [
    {
      place_id: 'ext_1',
      display_name: 'McDonald\'s - Spring Garden Road, Halifax, NS',
      lat: '44.647',
      lon: '-63.572',
      type: 'restaurant',
      importance: 0.8
    },
    {
      place_id: 'ext_2',
      display_name: 'Tim Hortons - Barrington Street, Halifax, NS',
      lat: '44.648',
      lon: '-63.575',
      type: 'restaurant',
      importance: 0.7
    },
    {
      place_id: 'ext_3',
      display_name: 'Halifax Shopping Centre, Halifax, NS',
      lat: '44.646',
      lon: '-63.573',
      type: 'shopping',
      importance: 0.9
    }
  ];
  
  // Filter by query
  const filtered = mockPOIs.filter(poi => 
    poi.display_name.toLowerCase().includes(query.toLowerCase())
  );
  
  // Sort by importance and limit
  return filtered
    .sort((a, b) => b.importance - a.importance)
    .slice(0, limit);
}
