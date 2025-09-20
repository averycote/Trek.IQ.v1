// Query Normalization and Parsing
// Handles input parsing, normalization, and tokenization

// Common abbreviations mapping
const STREET_TYPE_ABBREVIATIONS = {
  'st': 'street',
  'street': 'street',
  'rd': 'road',
  'road': 'road',
  'ave': 'avenue',
  'avenue': 'avenue',
  'blvd': 'boulevard',
  'boulevard': 'boulevard',
  'dr': 'drive',
  'drive': 'drive',
  'ln': 'lane',
  'lane': 'lane',
  'ct': 'court',
  'court': 'court',
  'pl': 'place',
  'place': 'place',
  'hwy': 'highway',
  'highway': 'highway',
  'pkwy': 'parkway',
  'parkway': 'parkway'
};

// POI category mappings for better search
const POI_CATEGORY_MAPPINGS = {
  // Healthcare
  'hospital': ['hospital', 'medical center', 'health center', 'clinic', 'emergency'],
  'clinic': ['clinic', 'medical clinic', 'health clinic', 'doctor'],
  'pharmacy': ['pharmacy', 'drugstore', 'pharmacist'],
  'dentist': ['dentist', 'dental', 'dental clinic'],
  
  // Education
  'school': ['school', 'elementary', 'high school', 'secondary', 'academy'],
  'university': ['university', 'college', 'university', 'institute'],
  'library': ['library', 'public library', 'municipal library'],
  
  // Food & Dining
  'restaurant': ['restaurant', 'cafe', 'coffee', 'diner', 'bistro', 'eatery'],
  'fast food': ['fast food', 'mcdonalds', 'burger king', 'subway', 'tim hortons'],
  'grocery': ['grocery', 'supermarket', 'food store', 'sobeys', 'loblaws'],
  
  // Shopping
  'mall': ['mall', 'shopping center', 'shopping centre', 'plaza'],
  'store': ['store', 'shop', 'retail'],
  'bank': ['bank', 'credit union', 'atm', 'financial'],
  
  // Services
  'gas station': ['gas station', 'gas', 'fuel', 'petro', 'esso', 'shell'],
  'post office': ['post office', 'canada post', 'mail'],
  'police': ['police', 'rcmp', 'police station'],
  'fire station': ['fire station', 'fire department'],
  
  // Recreation
  'park': ['park', 'playground', 'recreation'],
  'gym': ['gym', 'fitness', 'workout', 'exercise'],
  'pool': ['pool', 'swimming', 'aquatic'],
  
  // Transportation
  'bus stop': ['bus stop', 'transit', 'halifax transit'],
  'parking': ['parking', 'parkade', 'garage'],
  
  // Government
  'city hall': ['city hall', 'municipal', 'government'],
  'courthouse': ['courthouse', 'court', 'justice'],
  
  // Entertainment
  'theater': ['theater', 'theatre', 'cinema', 'movie'],
  'museum': ['museum', 'gallery', 'art gallery'],
  'hotel': ['hotel', 'inn', 'motel', 'accommodation']
};

const DIRECTIONAL_ABBREVIATIONS = {
  'n': 'north',
  'north': 'north',
  's': 'south',
  'south': 'south',
  'e': 'east',
  'east': 'east',
  'w': 'west',
  'west': 'west',
  'ne': 'northeast',
  'northeast': 'northeast',
  'nw': 'northwest',
  'northwest': 'northwest',
  'se': 'southeast',
  'southeast': 'southeast',
  'sw': 'southwest',
  'southwest': 'southwest'
};

export function normalizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return {
      original: '',
      normalized: '',
      tokens: [],
      civicNumber: null,
      streetName: '',
      streetType: '',
      directional: '',
      unit: null,
      isPOISearch: false,
      poiCategories: [],
      searchIntent: 'address'
    };
  }

  const original = query.trim();
  let normalized = original.toLowerCase();
  
  // Remove diacritics
  normalized = removeDiacritics(normalized);
  
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Remove punctuation except for numbers and common separators
  normalized = normalized.replace(/[^\w\s#-]/g, ' ');
  
  // Expand abbreviations
  normalized = expandAbbreviations(normalized);
  
  // Tokenize
  const tokens = normalized.split(/\s+/).filter(token => token.length > 0);
  
  // Detect POI search intent
  const poiAnalysis = detectPOISearchIntent(normalized, tokens);
  
  // Parse components
  const parsed = tokenizeAddress(normalized);
  
  return {
    original,
    normalized,
    tokens,
    ...parsed,
    isPOISearch: poiAnalysis.isPOISearch,
    poiCategories: poiAnalysis.categories,
    searchIntent: poiAnalysis.intent
  };
}

export function tokenizeAddress(query) {
  const tokens = query.split(/\s+/).filter(token => token.length > 0);
  const result = {
    civicNumber: null,
    streetName: '',
    streetType: '',
    directional: '',
    unit: null
  };
  
  if (tokens.length === 0) return result;
  
  // Check for civic number at start
  const firstToken = tokens[0];
  if (/^\d+$/.test(firstToken)) {
    result.civicNumber = parseInt(firstToken, 10);
    tokens.shift();
  }
  
  // Check for unit/suite
  const unitIndex = tokens.findIndex(token => 
    token.toLowerCase() === 'unit' || 
    token.toLowerCase() === 'suite' || 
    token.toLowerCase() === 'apt' ||
    token.toLowerCase() === 'apartment' ||
    /^#\d+$/.test(token)
  );
  
  if (unitIndex !== -1 && unitIndex < tokens.length - 1) {
    result.unit = tokens.slice(unitIndex).join(' ');
    tokens.splice(unitIndex);
  }
  
  // Check for directional at start or end
  if (tokens.length > 0) {
    const firstToken = tokens[0].toLowerCase();
    if (DIRECTIONAL_ABBREVIATIONS[firstToken]) {
      result.directional = DIRECTIONAL_ABBREVIATIONS[firstToken];
      tokens.shift();
    }
  }
  
  if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1].toLowerCase();
    if (DIRECTIONAL_ABBREVIATIONS[lastToken]) {
      result.directional = DIRECTIONAL_ABBREVIATIONS[lastToken];
      tokens.pop();
    }
  }
  
  // Check for street type at end
  if (tokens.length > 0) {
    const lastToken = tokens[tokens.length - 1].toLowerCase();
    if (STREET_TYPE_ABBREVIATIONS[lastToken]) {
      result.streetType = STREET_TYPE_ABBREVIATIONS[lastToken];
      tokens.pop();
    }
  }
  
  // Remaining tokens form the street name
  result.streetName = tokens.join(' ');
  
  return result;
}

export function parseIntersection(query) {
  const intersectionPatterns = [
    /(.+)\s+&\s+(.+)/i,
    /(.+)\s+and\s+(.+)/i,
    /(.+)\s+at\s+(.+)/i,
    /(.+)\s+@\s+(.+)/i
  ];
  
  for (const pattern of intersectionPatterns) {
    const match = query.match(pattern);
    if (match) {
      return {
        streetA: match[1].trim(),
        streetB: match[2].trim()
      };
    }
  }
  
  return null;
}

export function parseCoordinates(query) {
  // Match various coordinate formats
  const patterns = [
    /(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/, // lat,lon
    /(-?\d+\.?\d*)\s+(-?\d+\.?\d*)/, // lat lon
    /lat:\s*(-?\d+\.?\d*)\s*lon:\s*(-?\d+\.?\d*)/i // lat: X lon: Y
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        return { lat, lon };
      }
    }
  }
  
  return null;
}

export function expandAbbreviations(text) {
  let expanded = text;
  
  // Expand street type abbreviations
  for (const [abbr, full] of Object.entries(STREET_TYPE_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  }
  
  // Expand directional abbreviations
  for (const [abbr, full] of Object.entries(DIRECTIONAL_ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  }
  
  return expanded;
}

export function removeDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function calculateFuzzyScore(query, target) {
  if (!query || !target) return 0;
  
  const queryLower = query.toLowerCase();
  const targetLower = target.toLowerCase();
  
  // Exact match
  if (queryLower === targetLower) return 1.0;
  
  // Starts with
  if (targetLower.startsWith(queryLower)) return 0.8;
  
  // Contains
  if (targetLower.includes(queryLower)) return 0.6;
  
  // Calculate Levenshtein distance for fuzzy matching
  const distance = levenshteinDistance(queryLower, targetLower);
  const maxLength = Math.max(queryLower.length, targetLower.length);
  
  if (maxLength === 0) return 0;
  
  return Math.max(0, 1 - (distance / maxLength));
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Detect if the search query is looking for a POI
export function detectPOISearchIntent(normalizedQuery, tokens) {
  const categories = [];
  let isPOISearch = false;
  let intent = 'address';
  
  // Check for POI category keywords
  for (const [category, keywords] of Object.entries(POI_CATEGORY_MAPPINGS)) {
    for (const keyword of keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        categories.push(category);
        isPOISearch = true;
        break;
      }
    }
  }
  
  // Check for business name patterns (no numbers at start, common business suffixes)
  const businessSuffixes = ['inc', 'ltd', 'corp', 'company', 'co', 'restaurant', 'cafe', 'store', 'shop', 'center', 'centre'];
  const hasBusinessSuffix = businessSuffixes.some(suffix => normalizedQuery.includes(suffix));
  const startsWithNumber = /^\d+/.test(normalizedQuery);
  
  if (hasBusinessSuffix || (!startsWithNumber && tokens.length >= 2)) {
    // Check if it looks like a business name rather than an address
    const hasStreetType = Object.keys(STREET_TYPE_ABBREVIATIONS).some(type => 
      normalizedQuery.includes(type)
    );
    
    if (!hasStreetType && !startsWithNumber) {
      isPOISearch = true;
      intent = 'poi';
    }
  }
  
  // Check for specific business names (common chains)
  const commonBusinesses = [
    'mcdonalds', 'tim hortons', 'starbucks', 'subway', 'burger king',
    'walmart', 'sobeys', 'loblaws', 'canadian tire', 'home depot',
    'halifax central library', 'dalhousie', 'smu', 'nscad'
  ];
  
  for (const business of commonBusinesses) {
    if (normalizedQuery.includes(business)) {
      isPOISearch = true;
      intent = 'poi';
      break;
    }
  }
  
  return {
    isPOISearch,
    categories: [...new Set(categories)], // Remove duplicates
    intent: isPOISearch ? 'poi' : intent
  };
}

// Get search suggestions based on partial input
export function getSearchSuggestions(partialQuery, limit = 5) {
  if (!partialQuery || partialQuery.length < 2) {
    return [];
  }
  
  const normalized = partialQuery.toLowerCase();
  const suggestions = [];
  
  // Add category suggestions
  for (const [category, keywords] of Object.entries(POI_CATEGORY_MAPPINGS)) {
    for (const keyword of keywords) {
      if (keyword.toLowerCase().startsWith(normalized)) {
        suggestions.push({
          text: keyword,
          type: 'category',
          category: category
        });
        break; // Only add one suggestion per category
      }
    }
  }
  
  // Add common business suggestions
  const commonBusinesses = [
    'Halifax Central Library',
    'Dalhousie University',
    'Saint Mary\'s University',
    'NSCAD University',
    'Halifax Shopping Centre',
    'Mic Mac Mall',
    'Halifax Infirmary',
    'QEII Health Sciences Centre',
    'Tim Hortons',
    'McDonald\'s',
    'Starbucks',
    'Sobeys',
    'Loblaws',
    'Walmart',
    'Canadian Tire'
  ];
  
  for (const business of commonBusinesses) {
    if (business.toLowerCase().startsWith(normalized)) {
      suggestions.push({
        text: business,
        type: 'business',
        category: 'business'
      });
    }
  }
  
  return suggestions.slice(0, limit);
}

// Enhanced fuzzy matching for POI names
export function calculatePOIScore(query, poiName, poiType = null) {
  if (!query || !poiName) return 0;
  
  const queryLower = query.toLowerCase();
  const nameLower = poiName.toLowerCase();
  
  // Exact match
  if (queryLower === nameLower) return 1.0;
  
  // Starts with query
  if (nameLower.startsWith(queryLower)) return 0.9;
  
  // Contains query
  if (nameLower.includes(queryLower)) return 0.7;
  
  // Word boundary matches
  const queryWords = queryLower.split(/\s+/);
  const nameWords = nameLower.split(/\s+/);
  
  let wordMatches = 0;
  for (const queryWord of queryWords) {
    for (const nameWord of nameWords) {
      if (nameWord.startsWith(queryWord) || queryWord.startsWith(nameWord)) {
        wordMatches++;
        break;
      }
    }
  }
  
  if (wordMatches > 0) {
    return 0.6 + (wordMatches / queryWords.length) * 0.2;
  }
  
  // Fuzzy matching
  const fuzzyScore = calculateFuzzyScore(query, poiName);
  return fuzzyScore * 0.5; // Lower weight for fuzzy matches
}
