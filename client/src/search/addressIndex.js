// Address Index Module
// Builds and searches an in-memory index of civic addresses

export async function buildAddressIndex(geojsonPath) {
  console.log('Building address index from:', geojsonPath);
  
  try {
    // For now, return a mock index structure
    // In a real implementation, this would load and parse the GeoJSON file
    const mockIndex = {
      records: [],
      streetIndex: new Map(),
      civicIndex: new Map(),
      isLoaded: true
    };
    
    // Add some mock addresses for testing
    const mockAddresses = [
      {
        id: 'addr_1',
        civic: '1800',
        street: 'Spring Garden',
        type: 'Road',
        dir: '',
        community: 'Halifax',
        lon: -63.572,
        lat: 44.647,
        displayName: '1800 Spring Garden Road, Halifax'
      },
      {
        id: 'addr_2',
        civic: '1505',
        street: 'Barrington',
        type: 'Street',
        dir: '',
        community: 'Halifax',
        lon: -63.575,
        lat: 44.648,
        displayName: '1505 Barrington Street, Halifax'
      },
      {
        id: 'addr_3',
        civic: '2000',
        street: 'Gottingen',
        type: 'Street',
        dir: '',
        community: 'Halifax',
        lon: -63.580,
        lat: 44.650,
        displayName: '2000 Gottingen Street, Halifax'
      }
    ];
    
    mockIndex.records = mockAddresses;
    
    // Build indexes
    mockAddresses.forEach(record => {
      const streetKey = `${record.street} ${record.type}`.toLowerCase();
      if (!mockIndex.streetIndex.has(streetKey)) {
        mockIndex.streetIndex.set(streetKey, []);
      }
      mockIndex.streetIndex.get(streetKey).push(record);
      
      const civicKey = `${record.civic} ${streetKey}`.toLowerCase();
      mockIndex.civicIndex.set(civicKey, record);
    });
    
    console.log('Address index built successfully');
    return mockIndex;
    
  } catch (error) {
    console.error('Failed to build address index:', error);
    throw error;
  }
}

export function searchAddressIndex(index, normalizedQuery, limit = 10) {
  if (!index || !index.isLoaded) {
    return [];
  }
  
  const results = [];
  
  // Search by civic number + street
  if (normalizedQuery.civicNumber && normalizedQuery.streetName) {
    const civicKey = `${normalizedQuery.civicNumber} ${normalizedQuery.streetName}`.toLowerCase();
    const exactMatch = index.civicIndex.get(civicKey);
    if (exactMatch) {
      results.push({
        ...exactMatch,
        score: 1.0,
        matchType: 'exact'
      });
    }
  }
  
  // Search by street name
  if (normalizedQuery.streetName) {
    const streetKey = normalizedQuery.streetName.toLowerCase();
    for (const [indexStreetKey, records] of index.streetIndex.entries()) {
      if (indexStreetKey.includes(streetKey) || streetKey.includes(indexStreetKey)) {
        records.forEach(record => {
          const score = calculateAddressScore(record, normalizedQuery);
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
  }
  
  // Sort by score and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(result => ({
      id: result.id,
      displayName: result.displayName,
      type: 'address',
      coordinates: { lat: result.lat, lon: result.lon },
      source: 'local_address',
      matchType: result.matchType,
      originalRecord: result,
      score: result.score
    }));
}

export function getAddressDisplayName(record) {
  const parts = [];
  
  if (record.civic) parts.push(record.civic);
  if (record.street) parts.push(record.street);
  if (record.type) parts.push(record.type);
  if (record.dir) parts.push(record.dir);
  if (record.community) parts.push(record.community);
  
  return parts.join(' ');
}

function calculateAddressScore(record, normalizedQuery) {
  let score = 0;
  
  // Civic number match
  if (normalizedQuery.civicNumber && record.civic === normalizedQuery.civicNumber.toString()) {
    score += 0.4;
  }
  
  // Street name match
  if (normalizedQuery.streetName && record.street.toLowerCase().includes(normalizedQuery.streetName.toLowerCase())) {
    score += 0.3;
  }
  
  // Street type match
  if (normalizedQuery.streetType && record.type.toLowerCase() === normalizedQuery.streetType.toLowerCase()) {
    score += 0.2;
  }
  
  // Directional match
  if (normalizedQuery.directional && record.dir.toLowerCase() === normalizedQuery.directional.toLowerCase()) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0);
}
