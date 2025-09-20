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
    
    // Add comprehensive POI data for Halifax
    const mockPOIs = [
      // Healthcare
      {
        id: 'poi_hospital_1',
        name: 'QEII Health Sciences Centre',
        type: 'hospital',
        category: 'healthcare',
        lon: -63.5774,
        lat: 44.6408,
        displayName: 'QEII Health Sciences Centre',
        source: 'local_poi'
      },
      {
        id: 'poi_hospital_2',
        name: 'Halifax Infirmary',
        type: 'hospital',
        category: 'healthcare',
        lon: -63.5774,
        lat: 44.6408,
        displayName: 'Halifax Infirmary',
        source: 'local_poi'
      },
      {
        id: 'poi_clinic_1',
        name: 'Halifax Medical Centre',
        type: 'clinic',
        category: 'healthcare',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'Halifax Medical Centre',
        source: 'local_poi'
      },
      
      // Education
      {
        id: 'poi_university_1',
        name: 'Dalhousie University',
        type: 'university',
        category: 'education',
        lon: -63.5915,
        lat: 44.6368,
        displayName: 'Dalhousie University',
        source: 'local_poi'
      },
      {
        id: 'poi_university_2',
        name: 'Saint Mary\'s University',
        type: 'university',
        category: 'education',
        lon: -63.5833,
        lat: 44.6500,
        displayName: 'Saint Mary\'s University',
        source: 'local_poi'
      },
      {
        id: 'poi_university_3',
        name: 'NSCAD University',
        type: 'university',
        category: 'education',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'NSCAD University',
        source: 'local_poi'
      },
      {
        id: 'poi_library_1',
        name: 'Halifax Central Library',
        type: 'library',
        category: 'education',
        lon: -63.575,
        lat: 44.648,
        displayName: 'Halifax Central Library',
        source: 'local_poi'
      },
      
      // Shopping & Retail
      {
        id: 'poi_mall_1',
        name: 'Halifax Shopping Centre',
        type: 'mall',
        category: 'shopping',
        lon: -63.5833,
        lat: 44.6500,
        displayName: 'Halifax Shopping Centre',
        source: 'local_poi'
      },
      {
        id: 'poi_mall_2',
        name: 'Mic Mac Mall',
        type: 'mall',
        category: 'shopping',
        lon: -63.5167,
        lat: 44.6833,
        displayName: 'Mic Mac Mall',
        source: 'local_poi'
      },
      {
        id: 'poi_store_1',
        name: 'Walmart',
        type: 'store',
        category: 'shopping',
        lon: -63.5833,
        lat: 44.6500,
        displayName: 'Walmart',
        source: 'local_poi'
      },
      {
        id: 'poi_grocery_1',
        name: 'Sobeys',
        type: 'grocery',
        category: 'shopping',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'Sobeys',
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
      
      // Food & Dining
      {
        id: 'poi_restaurant_1',
        name: 'Tim Hortons',
        type: 'restaurant',
        category: 'food',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'Tim Hortons',
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
        id: 'poi_restaurant_3',
        name: 'Starbucks',
        type: 'restaurant',
        category: 'food',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'Starbucks',
        source: 'local_poi'
      },
      
      // Recreation
      {
        id: 'poi_park_1',
        name: 'Halifax Public Gardens',
        type: 'park',
        category: 'recreation',
        lon: -63.5756,
        lat: 44.6419,
        displayName: 'Halifax Public Gardens',
        source: 'local_poi'
      },
      {
        id: 'poi_park_2',
        name: 'Point Pleasant Park',
        type: 'park',
        category: 'recreation',
        lon: -63.5667,
        lat: 44.6167,
        displayName: 'Point Pleasant Park',
        source: 'local_poi'
      },
      
      // Government
      {
        id: 'poi_government_1',
        name: 'Halifax City Hall',
        type: 'government',
        category: 'government',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'Halifax City Hall',
        source: 'local_poi'
      },
      
      // Transportation
      {
        id: 'poi_transit_1',
        name: 'Halifax Ferry Terminal',
        type: 'transit',
        category: 'transportation',
        lon: -63.5756,
        lat: 44.6475,
        displayName: 'Halifax Ferry Terminal',
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
  
  // Import the enhanced scoring function
  const { calculatePOIScore } = require('./normalize');
  
  // Search by name with enhanced scoring
  for (const [nameKey, records] of index.nameIndex.entries()) {
    if (nameKey.includes(query) || query.includes(nameKey)) {
      records.forEach(record => {
        const score = calculatePOIScore(query, record.name, record.type);
        if (score > 0.3) {
          results.push({
            ...record,
            score,
            matchType: score > 0.8 ? 'exact' : score > 0.6 ? 'partial' : 'fuzzy'
          });
        }
      });
    }
  }
  
  // Search by type with enhanced scoring
  for (const [typeKey, records] of index.typeIndex.entries()) {
    if (typeKey.includes(query) || query.includes(typeKey)) {
      records.forEach(record => {
        const score = calculatePOIScore(query, record.name, record.type) * 0.7; // Lower weight for type matches
        if (score > 0.2) {
          results.push({
            ...record,
            score,
            matchType: score > 0.8 ? 'exact' : score > 0.6 ? 'partial' : 'fuzzy'
          });
        }
      });
    }
  }
  
  // Search by category if it's a POI search
  if (normalizedQuery.isPOISearch && normalizedQuery.poiCategories.length > 0) {
    for (const record of index.records) {
      for (const category of normalizedQuery.poiCategories) {
        if (record.category === category || record.type === category) {
          const score = calculatePOIScore(query, record.name, record.type) * 0.8;
          if (score > 0.3) {
            results.push({
              ...record,
              score,
              matchType: 'category'
            });
          }
        }
      }
    }
  }
  
  // Remove duplicates and sort by score
  const uniqueResults = results.reduce((acc, current) => {
    const existing = acc.find(item => item.id === current.id);
    if (!existing || current.score > existing.score) {
      acc = acc.filter(item => item.id !== current.id);
      acc.push(current);
    }
    return acc;
  }, []);
  
  return uniqueResults
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
      score: result.score,
      category: result.category
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
