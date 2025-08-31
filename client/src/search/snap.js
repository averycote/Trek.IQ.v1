// Snap Module
// Provides functionality to snap geographic points to the nearest network segments

// Mock network data
let networkData = {
  walkingSegments: [],
  drivingSegments: [],
  transitSegments: [],
  isLoaded: false
};

export async function loadNetworkData() {
  console.log('Loading network data...');
  
  try {
    // For now, create mock network segments
    // In a real implementation, this would load GeoJSON data
    networkData = {
      walkingSegments: [
        {
          id: 'walk_1',
          coordinates: [
            { lat: 44.647, lon: -63.572 },
            { lat: 44.648, lon: -63.575 }
          ],
          type: 'sidewalk'
        },
        {
          id: 'walk_2',
          coordinates: [
            { lat: 44.648, lon: -63.575 },
            { lat: 44.650, lon: -63.580 }
          ],
          type: 'sidewalk'
        }
      ],
      drivingSegments: [
        {
          id: 'drive_1',
          coordinates: [
            { lat: 44.647, lon: -63.572 },
            { lat: 44.648, lon: -63.575 }
          ],
          type: 'road'
        }
      ],
      transitSegments: [
        {
          id: 'transit_1',
          coordinates: [
            { lat: 44.647, lon: -63.572 },
            { lat: 44.648, lon: -63.575 }
          ],
          type: 'bus_route'
        }
      ],
      isLoaded: true
    };
    
    console.log('Network data loaded successfully');
    
  } catch (error) {
    console.error('Failed to load network data:', error);
    throw error;
  }
}

export async function snapToNetwork(lat, lon, mode = 'walking', maxDistance = 100) {
  if (!networkData.isLoaded) {
    console.warn('Network data not loaded');
    return { lat, lon };
  }
  
  try {
    const point = { lat, lon };
    let segments = [];
    
    // Get appropriate segments based on mode
    switch (mode) {
      case 'walking':
        segments = networkData.walkingSegments;
        break;
      case 'driving':
        segments = networkData.drivingSegments;
        break;
      case 'transit':
        segments = networkData.transitSegments;
        break;
      default:
        segments = networkData.walkingSegments;
    }
    
    // Find the closest segment
    let closestDistance = Infinity;
    let closestPoint = null;
    
    for (const segment of segments) {
      const snappedPoint = snapPointToSegment(point, segment.coordinates);
      const distance = calculateDistance(point, snappedPoint);
      
      if (distance < closestDistance && distance <= maxDistance) {
        closestDistance = distance;
        closestPoint = snappedPoint;
      }
    }
    
    if (closestPoint) {
      return closestPoint;
    }
    
    // Return original point if no suitable segment found
    return point;
    
  } catch (error) {
    console.error('Snapping failed:', error);
    return { lat, lon };
  }
}

export function isPointOnNetwork(lat, lon, mode = 'walking', tolerance = 10) {
  if (!networkData.isLoaded) {
    return false;
  }
  
  const point = { lat, lon };
  let segments = [];
  
  switch (mode) {
    case 'walking':
      segments = networkData.walkingSegments;
      break;
    case 'driving':
      segments = networkData.drivingSegments;
      break;
    case 'transit':
      segments = networkData.transitSegments;
      break;
    default:
      segments = networkData.walkingSegments;
  }
  
  for (const segment of segments) {
    const distance = distanceToSegment(point, segment.coordinates);
    if (distance <= tolerance) {
      return true;
    }
  }
  
  return false;
}

export function getNetworkStats() {
  return {
    walkingSegments: networkData.walkingSegments.length,
    drivingSegments: networkData.drivingSegments.length,
    transitSegments: networkData.transitSegments.length,
    isLoaded: networkData.isLoaded
  };
}

export function clearNetworkCache() {
  networkData = {
    walkingSegments: [],
    drivingSegments: [],
    transitSegments: [],
    isLoaded: false
  };
}

function snapPointToSegment(point, segmentCoordinates) {
  if (segmentCoordinates.length < 2) {
    return point;
  }
  
  let closestPoint = null;
  let closestDistance = Infinity;
  
  // Check each segment line
  for (let i = 0; i < segmentCoordinates.length - 1; i++) {
    const start = segmentCoordinates[i];
    const end = segmentCoordinates[i + 1];
    
    const snapped = snapPointToLine(point, start, end);
    const distance = calculateDistance(point, snapped);
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = snapped;
    }
  }
  
  return closestPoint || point;
}

function snapPointToLine(point, lineStart, lineEnd) {
  const A = point.lat - lineStart.lat;
  const B = point.lon - lineStart.lon;
  const C = lineEnd.lat - lineStart.lat;
  const D = lineEnd.lon - lineStart.lon;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  
  if (lenSq === 0) {
    return lineStart;
  }
  
  let param = dot / lenSq;
  
  if (param < 0) {
    return lineStart;
  } else if (param > 1) {
    return lineEnd;
  }
  
  return {
    lat: lineStart.lat + param * C,
    lon: lineStart.lon + param * D
  };
}

function distanceToSegment(point, segmentCoordinates) {
  if (segmentCoordinates.length < 2) {
    return Infinity;
  }
  
  let minDistance = Infinity;
  
  for (let i = 0; i < segmentCoordinates.length - 1; i++) {
    const start = segmentCoordinates[i];
    const end = segmentCoordinates[i + 1];
    
    const snapped = snapPointToLine(point, start, end);
    const distance = calculateDistance(point, snapped);
    
    if (distance < minDistance) {
      minDistance = distance;
    }
  }
  
  return minDistance;
}

function calculateDistance(point1, point2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lon - point1.lon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
