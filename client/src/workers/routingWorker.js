/**
 * Routing Web Worker
 * 
 * Handles heavy routing operations off the main thread to eliminate lag.
 * Implements Dijkstra/A* pathfinding and graph operations.
 */

/* eslint-env worker */
/* eslint-disable no-restricted-globals */

import * as turf from '@turf/turf';

// Worker message handler
self.onmessage = function(e) {
  const { type, data, requestId } = e.data;
  
  try {
    switch (type) {
      case 'BUILD_GRAPH':
        handleBuildGraph(data, requestId);
        break;
      case 'FIND_PATH':
        handleFindPath(data, requestId);
        break;
      case 'CALCULATE_DISTANCES':
        handleCalculateDistances(data, requestId);
        break;
      case 'GENERATE_DIRECTIONS':
        handleGenerateDirections(data, requestId);
        break;
      case 'CALCULATE_SCORE':
        handleCalculateScore(data, requestId);
        break;
      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      requestId,
      error: error.message
    });
  }
};

/**
 * Build routing graph from Active Travelways data
 */
function handleBuildGraph(data, requestId) {
  const { activeTravelways, steps } = data;
  
  const graph = {
    nodes: new Map(),
    edges: new Map()
  };
  
  let nodeId = 0;
  let edgeId = 0;
  
  // Process each travelway feature
  activeTravelways.features.forEach((feature, featureIndex) => {
    if (!feature.geometry || feature.geometry.type !== 'LineString') {
      return;
    }
    
    const coordinates = feature.geometry.coordinates;
    const properties = feature.properties || {};
    
    // Create nodes for each coordinate
    const nodeIds = [];
    coordinates.forEach((coord, coordIndex) => {
      const nodeKey = `${coord[0]},${coord[1]}`;
      
      if (!graph.nodes.has(nodeKey)) {
        graph.nodes.set(nodeKey, {
          id: nodeId++,
          coordinates: coord,
          type: 'vertex',
          properties: properties
        });
      }
      
      nodeIds.push(nodeKey);
    });
    
    // Create edges between consecutive coordinates
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const fromNode = graph.nodes.get(nodeIds[i]);
      const toNode = graph.nodes.get(nodeIds[i + 1]);
      
      // Calculate edge length using turf
      const fromPoint = turf.point(fromNode.coordinates);
      const toPoint = turf.point(toNode.coordinates);
      const length_m = turf.distance(fromPoint, toPoint, { units: 'meters' });
      
      // Check for steps overlap
      const isStep = checkStepsOverlap(fromNode.coordinates, toNode.coordinates, steps);
      
      // Check for slope/steepness (if available in properties)
      const slope = properties.slope || properties.steepness || null;
      
      const edge = {
        id: edgeId++,
        from: nodeIds[i],
        to: nodeIds[i + 1],
        length_m: length_m,
        is_step: isStep,
        slope: slope,
        properties: properties,
        featureIndex: featureIndex
      };
      
      const edgeKey = `${nodeIds[i]}-${nodeIds[i + 1]}`;
      graph.edges.set(edgeKey, edge);
    }
  });
  
  // Convert Maps to objects for serialization
  const serializedGraph = {
    nodes: Object.fromEntries(graph.nodes),
    edges: Object.fromEntries(graph.edges)
  };
  
  self.postMessage({
    type: 'GRAPH_BUILT',
    requestId,
    data: {
      graph: serializedGraph,
      nodeCount: graph.nodes.size,
      edgeCount: graph.edges.size
    }
  });
}

/**
 * Find optimal path using Dijkstra with A* heuristic
 */
function handleFindPath(data, requestId) {
  const { graph, startCoord, endCoord, options = {} } = data;
  
  // Convert serialized graph back to Maps
  const nodes = new Map(Object.entries(graph.nodes));
  const edges = new Map(Object.entries(graph.edges));
  
  const startKey = `${startCoord[0]},${startCoord[1]}`;
  const endKey = `${endCoord[0]},${endCoord[1]}`;
  
  // Find nearest nodes to start and end coordinates
  const startNode = findNearestNode(startCoord, nodes);
  const endNode = findNearestNode(endCoord, nodes);
  
  if (!startNode || !endNode) {
    throw new Error('Could not find start or end nodes in routing graph');
  }
  
  // Dijkstra's algorithm with A* heuristic
  const distances = new Map();
  const previous = new Map();
  const visited = new Set();
  const queue = new Map();
  
  // Initialize distances
  nodes.forEach((node, nodeKey) => {
    distances.set(nodeKey, Infinity);
  });
  distances.set(startNode.key, 0);
  queue.set(startNode.key, 0);
  
  while (queue.size > 0) {
    // Find node with minimum distance
    let currentNodeKey = null;
    let minDistance = Infinity;
    
    for (const [nodeKey, distance] of queue) {
      if (distance < minDistance) {
        minDistance = distance;
        currentNodeKey = nodeKey;
      }
    }
    
    if (currentNodeKey === null) break;
    
    queue.delete(currentNodeKey);
    visited.add(currentNodeKey);
    
    if (currentNodeKey === endNode.key) {
      break; // Found destination
    }
    
    // Check all edges from current node
    edges.forEach((edge, edgeKey) => {
      if (edge.from === currentNodeKey && !visited.has(edge.to)) {
        // Calculate edge weight with penalties
        let edgeWeight = edge.length_m;
        
        // Apply step penalty if avoiding steps
        if (options.avoidSteps && edge.is_step) {
          edgeWeight *= 1000; // Heavy penalty for steps
        }
        
        // Apply slope penalty
        if (edge.slope && edge.slope > (options.maxSlope || 8)) {
          edgeWeight *= (1 + (edge.slope - (options.maxSlope || 8)) * 0.1);
        }
        
        // Add A* heuristic (straight-line distance to goal)
        const currentNode = nodes.get(currentNodeKey);
        const nextNode = nodes.get(edge.to);
        const endNode = nodes.get(endNode.key);
        
        const heuristic = turf.distance(
          turf.point(nextNode.coordinates),
          turf.point(endNode.coordinates),
          { units: 'meters' }
        );
        
        const totalDistance = distances.get(currentNodeKey) + edgeWeight + heuristic;
        
        if (totalDistance < distances.get(edge.to)) {
          distances.set(edge.to, totalDistance);
          previous.set(edge.to, edgeKey);
          queue.set(edge.to, totalDistance);
        }
      }
    });
  }
  
  // Reconstruct path
  const pathEdges = [];
  let currentNodeKey = endNode.key;
  
  while (previous.has(currentNodeKey)) {
    const edgeKey = previous.get(currentNodeKey);
    const edge = edges.get(edgeKey);
    pathEdges.unshift(edge);
    currentNodeKey = edge.from;
  }
  
  self.postMessage({
    type: 'PATH_FOUND',
    requestId,
    data: {
      pathEdges,
      totalDistance: pathEdges.reduce((sum, edge) => sum + edge.length_m, 0),
      edgeCount: pathEdges.length
    }
  });
}

/**
 * Calculate distances with dual verification
 */
function handleCalculateDistances(data, requestId) {
  const { routeEdges, nodes } = data;
  
  // Method 1: Sum of edge lengths
  const totalDistanceByEdges = routeEdges.reduce((sum, edge) => sum + edge.length_m, 0);
  
  // Method 2: Turf length calculation
  const coordinates = [];
  routeEdges.forEach(edge => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];
    coordinates.push(fromNode.coordinates);
  });
  
  // Add the last coordinate
  if (routeEdges.length > 0) {
    const lastEdge = routeEdges[routeEdges.length - 1];
    const lastNode = nodes[lastEdge.to];
    coordinates.push(lastNode.coordinates);
  }
  
  const routeLineString = turf.lineString(coordinates);
  const totalDistanceByTurf = turf.length(routeLineString, { units: 'meters' });
  
  // Verify distances match within tolerance
  const difference = Math.abs(totalDistanceByEdges - totalDistanceByTurf);
  const percentageDifference = difference / totalDistanceByEdges;
  const tolerance = 0.005; // 0.5%
  const verificationPassed = percentageDifference < tolerance;
  
  self.postMessage({
    type: 'DISTANCES_CALCULATED',
    requestId,
    data: {
      total_distance_m_by_edges: totalDistanceByEdges,
      total_distance_m_by_turf: totalDistanceByTurf,
      difference: difference,
      percentage_difference: percentageDifference,
      verification_passed: verificationPassed
    }
  });
}

/**
 * Generate human-readable directions
 */
function handleGenerateDirections(data, requestId) {
  const { routeEdges, nodes } = data;
  const directions = [];
  
  routeEdges.forEach((edge, index) => {
    const fromNode = nodes[edge.from];
    const toNode = nodes[edge.to];
    
    // Calculate bearing
    const bearing = turf.bearing(
      turf.point(fromNode.coordinates),
      turf.point(toNode.coordinates)
    );
    
    // Generate instruction text
    let instructionText = '';
    if (index === 0) {
      instructionText = 'Start at origin';
    } else if (index === routeEdges.length - 1) {
      instructionText = 'Continue to destination';
    } else {
      const direction = getDirectionFromBearing(bearing);
      instructionText = `Continue ${direction}`;
    }
    
    // Add street name if available
    const streetName = edge.properties?.name || edge.properties?.street_name;
    if (streetName) {
      instructionText += ` on ${streetName}`;
    }
    
    directions.push({
      text: instructionText,
      segment_distance_m: edge.length_m,
      from_coord: fromNode.coordinates,
      to_coord: toNode.coordinates,
      evidence_id: edge.id,
      bearing: bearing,
      street_name: streetName
    });
  });
  
  self.postMessage({
    type: 'DIRECTIONS_GENERATED',
    requestId,
    data: { directions }
  });
}

/**
 * Calculate route score
 */
function handleCalculateScore(data, requestId) {
  const { routeEdges, options = {} } = data;
  
  // Configuration
  const config = {
    D_max: 5000, // Maximum distance for scoring (meters)
    S_max: 10,   // Maximum steps for scoring
    weights: {
      distance: 0.25,
      accessibility: 0.45,
      maintenance: 0.15,
      safety: 0.15
    }
  };
  
  // Calculate component metrics
  const totalDistance = routeEdges.reduce((sum, edge) => sum + edge.length_m, 0);
  const stepsEncountered = routeEdges.filter(edge => edge.is_step).length;
  const steepLength = routeEdges
    .filter(edge => edge.slope && edge.slope > 5)
    .reduce((sum, edge) => sum + edge.length_m, 0);
  
  // Calculate winter maintenance percentage (if data available)
  const winterMaintainedLength = routeEdges
    .filter(edge => edge.properties?.winter_maintained === true)
    .reduce((sum, edge) => sum + edge.length_m, 0);
  const percentOnWinterMaintained = totalDistance > 0 ? winterMaintainedLength / totalDistance : 0;
  
  // Calculate sidewalk attributes percentage
  const sidewalkLength = routeEdges
    .filter(edge => edge.properties?.sidewalk === true)
    .reduce((sum, edge) => sum + edge.length_m, 0);
  const sidewalkPercentage = totalDistance > 0 ? sidewalkLength / totalDistance : 0;
  
  // Normalize components
  const distanceScore = Math.max(0, Math.min(1, 1 - (totalDistance / config.D_max)));
  const stepsScore = Math.max(0, Math.min(1, 1 - (stepsEncountered / config.S_max)));
  const maintenanceScore = percentOnWinterMaintained;
  const accessibilityScore = (sidewalkPercentage + stepsScore) / 2;
  const safetyScore = 0.8; // Default safety score
  
  // Calculate final weighted score
  const finalScore = 
    config.weights.distance * distanceScore +
    config.weights.accessibility * accessibilityScore +
    config.weights.maintenance * maintenanceScore +
    config.weights.safety * safetyScore;
  
  self.postMessage({
    type: 'SCORE_CALCULATED',
    requestId,
    data: {
      score: finalScore,
      score_breakdown: {
        weights: config.weights,
        components: {
          distance_score: distanceScore,
          accessibility_score: accessibilityScore,
          maintenance_score: maintenanceScore,
          safety_score: safetyScore
        },
        raw_metrics: {
          total_distance_m: totalDistance,
          steps_encountered_count: stepsEncountered,
          steep_length_m: steepLength,
          percent_on_winter_maintained: percentOnWinterMaintained,
          sidewalk_percentage: sidewalkPercentage
        }
      }
    }
  });
}

/**
 * Helper functions
 */

function checkStepsOverlap(fromCoord, toCoord, steps) {
  if (!steps || !steps.features) return false;
  
  // Create a line between the two coordinates
  const line = turf.lineString([fromCoord, toCoord]);
  
  // Check for intersection with any step feature
  return steps.features.some(stepFeature => {
    if (stepFeature.geometry && stepFeature.geometry.type === 'Point') {
      const stepPoint = turf.point(stepFeature.geometry.coordinates);
      const distance = turf.pointToLineDistance(stepPoint, line, { units: 'meters' });
      return distance < 5; // Within 5 meters of steps
    }
    return false;
  });
}

function findNearestNode(coord, nodes) {
  let nearestNode = null;
  let minDistance = Infinity;
  
  Object.entries(nodes).forEach(([nodeKey, node]) => {
    const distance = turf.distance(
      turf.point(coord),
      turf.point(node.coordinates),
      { units: 'meters' }
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = { ...node, key: nodeKey };
    }
  });
  
  return nearestNode;
}

function getDirectionFromBearing(bearing) {
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}
