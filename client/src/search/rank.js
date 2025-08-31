// Ranking Module
// Implements result fusion and ranking algorithm

export function rankCandidates(candidates, context, limit = 10) {
  if (!candidates || candidates.length === 0) {
    return [];
  }
  
  // Calculate scores for each candidate
  const scoredCandidates = candidates.map(candidate => ({
    ...candidate,
    finalScore: calculateFinalScore(candidate, context)
  }));
  
  // Sort by final score and limit results
  return scoredCandidates
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}

export function mergeAllCandidates(localAddressCandidates, localPoiCandidates, externalPoiCandidates, query) {
  const allCandidates = [];
  
  // Convert local address candidates
  if (localAddressCandidates && localAddressCandidates.length > 0) {
    allCandidates.push(...convertScoredCandidatesToCandidates(localAddressCandidates, 'local_address', query));
  }
  
  // Convert local POI candidates
  if (localPoiCandidates && localPoiCandidates.length > 0) {
    allCandidates.push(...convertScoredCandidatesToCandidates(localPoiCandidates, 'local_poi', query));
  }
  
  // Convert external POI candidates
  if (externalPoiCandidates && externalPoiCandidates.length > 0) {
    allCandidates.push(...convertExternalResultsToCandidates(externalPoiCandidates, query));
  }
  
  return allCandidates;
}

export function convertScoredCandidatesToCandidates(scoredCandidates, source, query) {
  return scoredCandidates.map(candidate => ({
    id: candidate.id,
    displayName: candidate.displayName,
    type: candidate.type,
    coordinates: candidate.coordinates,
    source: source,
    matchType: candidate.matchType,
    originalRecord: candidate.originalRecord,
    score: candidate.score || 0
  }));
}

export function convertExternalResultsToCandidates(externalResults, query) {
  return externalResults.map(result => ({
    id: result.place_id,
    displayName: result.display_name,
    type: 'external_poi',
    coordinates: {
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon)
    },
    source: 'external_poi',
    matchType: 'exact',
    originalRecord: result,
    score: result.importance || 0.5
  }));
}

function calculateFinalScore(candidate, context) {
  let score = candidate.score || 0;
  
  // Type priority boost
  score += getTypePriorityBoost(candidate.type);
  
  // Proximity boost
  if (context.mapCenter) {
    score += getProximityBoost(candidate.coordinates, context.mapCenter);
  }
  
  // Recent selection boost
  if (context.recentSelections && context.recentSelections.includes(candidate.displayName)) {
    score += 0.1;
  }
  
  // Source priority (local > external)
  if (candidate.source === 'local_address') {
    score += 0.05;
  } else if (candidate.source === 'local_poi') {
    score += 0.03;
  }
  
  return Math.min(score, 1.0);
}

function getTypePriorityBoost(type) {
  const typePriorities = {
    'address': 0.2,
    'intersection': 0.15,
    'poi': 0.1,
    'external_poi': 0.05
  };
  
  return typePriorities[type] || 0;
}

function getProximityBoost(coordinates, mapCenter) {
  const distance = calculateDistance(coordinates, mapCenter);
  
  // Boost for nearby results (within 5km)
  if (distance < 5) {
    return 0.1 * (1 - distance / 5);
  }
  
  return 0;
}

function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lon - point1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
