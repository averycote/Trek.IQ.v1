// POI Index Module
// Builds and searches an in-memory index of Points of Interest

export const DEFAULT_POI_LAYERS = [
  {
    name: 'accessibleParking',
    path: '/data/Accessible_Parking.geojson',
    nameField: 'name',
    typeField: 'type'
  },
  {
    name: 'publicWashrooms',
    path: '/data/HRM_Public_Washrooms_8937353538278970153.geojson',
    nameField: 'name',
    typeField: 'type'
  },
  {
    name: 'busStops',
    path: '/data/Bus_Stops_2_9086297843420881686.geojson',
    nameField: 'name',
    typeField: 'type'
  },
  {
    name: 'transitShelters',
    path: '/data/Transit_Shelters_1139561051208148127.geojson',
    nameField: 'name',
    typeField: 'type'
  }
];

export async function buildPoiIndex(layers = DEFAULT_POI_LAYERS) {
  console.log('Building POI index from layers:', layers.map(l => l.name));
  
  try {
    // For now, return a mock index structure
    // In a real implementation, this would load and parse the GeoJSON files
    const mockIndex = {
      records: [],
      nameIndex: new Map(),
      typeIndex: new Map(),
      isLoaded: true
    };
    
    // Add some mock POIs for testing
    const mockPOIs = [
      {
        id: 'poi_1',
        name: 'Halifax Central Library',
        type: 'library',
        category: 'public',
        lon: -63.575,
        lat: 44.648,
        displayName: 'Halifax Central Library',
        source: 'local_poi'
      },
      {
        id: 'poi_2',
        name: 'Scotia Square',
        type: 'shopping',
        category: 'commercial',
        lon: -63.573,
        lat: 44.646,
        displayName: 'Scotia Square',
        source: 'local_poi'
      },
      {
        id: 'poi_3',
        name: 'McDonald\'s',
        type: 'restaurant',
        category: 'food',
        lon: -63.570,
        lat: 44.645,
        displayName: 'McDonald\'s',
        source: 'local_poi'
      },
      {
        id: 'poi_4',
        name: 'Accessible Parking - Spring Garden',
        type: 'parking',
        category: 'transportation',
        lon: -63.572,
        lat: 44.647,
        displayName: 'Accessible Parking - Spring Garden',
        source: 'local_poi'
      }
    ];
    
    mockIndex.records = mockPOIs;
    
    // Build indexes
    mockPOIs.forEach(record => {
      const nameKey = record.name.toLowerCase();
      if (!mockIndex.nameIndex.has(nameKey)) {
        mockIndex.nameIndex.set(nameKey, []);
      }
      mockIndex.nameIndex.get(nameKey).push(record);
      
      const typeKey = record.type.toLowerCase();
      if (!mockIndex.typeIndex.has(typeKey)) {
        mockIndex.typeIndex.set(typeKey, []);
      }
      mockIndex.typeIndex.get(typeKey).push(record);
    });
    
    console.log('POI index built successfully');
    return mockIndex;
    
  } catch (error) {
    console.error('Failed to build POI index:', error);
    throw error;
  }
}

export function searchPoiIndex(index, normalizedQuery, limit = 10) {
  if (!index || !index.isLoaded) {
    return [];
  }
  
  const results = [];
  const query = normalizedQuery.normalized.toLowerCase();
  
  // Search by name
  for (const [nameKey, records] of index.nameIndex.entries()) {
    if (nameKey.includes(query) || query.includes(nameKey)) {
      records.forEach(record => {
        const score = calculatePoiScore(record, normalizedQuery);
        if (score > 0.3) {
          results.push({
            ...record,
            score,
            matchType: score > 0.8 ? 'exact' : 'fuzzy'
          });
        }
      });
    }
  }
  
  // Search by type
  for (const [typeKey, records] of index.typeIndex.entries()) {
    if (typeKey.includes(query) || query.includes(typeKey)) {
      records.forEach(record => {
        const score = calculatePoiScore(record, normalizedQuery) * 0.7; // Lower weight for type matches
        if (score > 0.2) {
          results.push({
            ...record,
            score,
            matchType: score > 0.8 ? 'exact' : 'fuzzy'
          });
        }
      });
    }
  }
  
  // Sort by score and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => ({
      id: result.id,
      displayName: result.displayName,
      type: 'poi',
      coordinates: { lat: result.lat, lon: result.lon },
      source: result.source,
      matchType: result.matchType,
      originalRecord: result,
      score: result.score
    }));
}

export function getPoiDisplayName(record) {
  return record.displayName || record.name;
}

function calculatePoiScore(record, normalizedQuery) {
  let score = 0;
  const query = normalizedQuery.normalized.toLowerCase();
  
  // Name match
  if (record.name.toLowerCase().includes(query)) {
    score += 0.6;
  }
  
  // Type match
  if (record.type && record.type.toLowerCase().includes(query)) {
    score += 0.3;
  }
  
  // Category match
  if (record.category && record.category.toLowerCase().includes(query)) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}
