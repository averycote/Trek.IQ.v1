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
      unit: null
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
  
  // Parse components
  const parsed = tokenizeAddress(normalized);
  
  return {
    original,
    normalized,
    tokens,
    ...parsed
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
