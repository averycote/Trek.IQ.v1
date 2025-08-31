// Advanced AI-Driven Routing Service for Trek.IQ
// Implements graph-based routing with A* algorithm, AI features, and accessibility considerations

import * as turf from '@turf/turf';

class AdvancedRoutingService {
  constructor() {
    this.isInitialized = false;
    this.datasets = {};
    this.routingGraph = null;
    this.spatialIndex = new Map();
    this.routeCache = new Map();
    this.userPreferences = new Map();
    this.aiModel = null;
    this.weatherConditions = null;
    this.barrierCache = new Map();
    this.accessibilityFeatures = new Map();
    
    // Graph construction
    this.nodes = new Map();
    this.edges = new Map();
    this.activeTravelways = [];
    
    // AI learning data
    this.userBehaviorData = new Map();
    this.routeHistory = [];
    this.accessibilityScores = new Map();
    
    // Performance optimizations
    this.debounceTimers = new Map();
    this.calculationCache = new Map();
  }

  // Initialize the advanced routing service
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('Initializing Advanced AI-Driven Routing Service...');
      
      // Load all municipal datasets
      await this.loadMunicipalDatasets();
      
      // Build routing graph from Active Travelways
      await this.buildRoutingGraph();
      
      // Initialize AI model
      await this.initializeAIModel();
      
      // Build spatial indexes
      this.buildSpatialIndexes();
      
      // Load accessibility features
      await this.loadAccessibilityFeatures();
      
      this.isInitialized = true;
      console.log('Advanced Routing Service initialized successfully');
    } catch (error) {
      console.error('Error initializing Advanced Routing Service:', error);
      throw error;
    }
  }

  // Load all municipal datasets
  async loadMunicipalDatasets() {
    const datasetEndpoints = [
      { name: 'active_travelways', endpoint: '/api/data/Active_Travelways.geojson' },
      { name: 'accessible_parking', endpoint: '/api/data/Accessible_Parking.geojson' },
      { name: 'transit_routes', endpoint: '/api/data/Transit_Bus_Routes.geojson' },
      { name: 'bus_stops', endpoint: '/api/data/Bus_Stops_2_9086297843420881686.geojson' },
      { name: 'steps', endpoint: '/api/data/Steps_577353981712784942.geojson' },
      { name: 'street_closures', endpoint: '/api/data/Street_Closures.geojson' },
      { name: 'sidewalk_closures', endpoint: '/api/data/Sidewalk Closures.geojson' },
      { name: 'street_junctions', endpoint: '/api/data/Street_Junctions.geojson' },
      { name: 'street_lights', endpoint: '/api/data/Street_Lights_-8646609400635809433.geojson' },
      { name: 'traffic_control', endpoint: '/api/data/Traffic_Control.geojson' }
    ];

    const loadPromises = datasetEndpoints.map(async (dataset) => {
      try {
        const response = await fetch(dataset.endpoint);
        if (response.ok) {
          const data = await response.json();
          this.datasets[dataset.name] = data;
          
          // Store Active Travelways separately for graph construction
          if (dataset.name === 'active_travelways') {
            this.activeTravelways = data.features || [];
          }
          
          console.log(`Loaded ${dataset.name} dataset`);
        } else {
          console.warn(`Could not load ${dataset.name} dataset`);
          this.datasets[dataset.name] = { features: [] };
        }
      } catch (error) {
        console.warn(`Error loading ${dataset.name}:`, error);
        this.datasets[dataset.name] = { features: [] };
      }
    });

    await Promise.all(loadPromises);
  }

  // Build routing graph from Active Travelways
  async buildRoutingGraph() {
    console.log('Building routing graph from Active Travelways...');
    
    this.nodes.clear();
    this.edges.clear();
    
    // Process Active Travelways to create nodes and edges
    this.activeTravelways.forEach((feature, index) => {
      const geometry = feature.geometry;
      const properties = feature.properties;
      
      if (geometry.type === 'LineString') {
        const coordinates = geometry.coordinates;
        
        // Create nodes for start and end points
        const startNode = this.createNode(coordinates[0], properties);
        const endNode = this.createNode(coordinates[coordinates.length - 1], properties);
        
        // Create edge between nodes
        const edge = {
          id: `edge_${index}`,
          startNode: startNode.id,
          endNode: endNode.id,
          coordinates: coordinates,
          properties: properties,
          distance: turf.length(feature),
          accessibility: this.assessPathAccessibility(feature),
          mode: this.determinePathMode(properties)
        };
        
        this.edges.set(edge.id, edge);
        
        // Add edge to node connections
        if (!startNode.connections) startNode.connections = [];
        if (!endNode.connections) endNode.connections = [];
        
        startNode.connections.push(edge.id);
        endNode.connections.push(edge.id);
      }
    });
    
    console.log(`Built routing graph with ${this.nodes.size} nodes and ${this.edges.size} edges`);
  }

  // Create a node in the routing graph
  createNode(coordinates, properties) {
    const nodeId = `node_${coordinates[0]}_${coordinates[1]}`;
    
    if (!this.nodes.has(nodeId)) {
      const node = {
        id: nodeId,
        coordinates: coordinates,
        properties: properties,
        connections: [],
        accessibility: this.assessNodeAccessibility(coordinates, properties)
      };
      this.nodes.set(nodeId, node);
    }
    
    return this.nodes.get(nodeId);
  }

  // Assess path accessibility
  assessPathAccessibility(feature) {
    const properties = feature.properties;
    let score = 1.0;
    
    // Check for steps
    if (properties.steps || properties.staircase) {
      score -= 0.8;
    }
    
    // Check for steep slopes
    if (properties.slope && properties.slope > 0.05) {
      score -= 0.3;
    }
    
    // Check for maintained sidewalks
    if (properties.maintained && properties.maintained === 'yes') {
      score += 0.2;
    }
    
    // Check for lighting
    if (properties.lighting && properties.lighting === 'good') {
      score += 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Assess node accessibility
  assessNodeAccessibility(coordinates, properties) {
    let score = 1.0;
    
    // Check for accessible crossings
    if (properties.crossing_type === 'accessible') {
      score += 0.3;
    }
    
    // Check for traffic signals
    if (properties.traffic_signal === 'yes') {
      score += 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  // Determine path mode based on properties
  determinePathMode(properties) {
    if (properties.path_type === 'sidewalk') return 'walking';
    if (properties.path_type === 'bike_path') return 'cycling';
    if (properties.path_type === 'road') return 'driving';
    return 'walking'; // Default to walking
  }

  // Initialize AI model for route optimization
  async initializeAIModel() {
    // Simulated AI model - in production, this would be a real ML model
    this.aiModel = {
      predictAccessibility: this.predictAccessibility.bind(this),
      optimizeRoute: this.optimizeRoute.bind(this),
      learnFromUserBehavior: this.learnFromUserBehavior.bind(this),
      suggestAlternatives: this.suggestAlternatives.bind(this)
    };
  }

  // Build spatial indexes for fast lookups
  buildSpatialIndexes() {
    const gridSize = 0.01; // ~1km grid cells
    
    // Index nodes by location
    this.nodes.forEach((node) => {
      const gridKey = this.getGridKey(node.coordinates, gridSize);
      if (!this.spatialIndex.has(gridKey)) {
        this.spatialIndex.set(gridKey, []);
      }
      this.spatialIndex.get(gridKey).push(node.id);
    });
    
    // Index barriers and closures
    ['steps', 'street_closures', 'sidewalk_closures'].forEach(datasetName => {
      if (this.datasets[datasetName] && this.datasets[datasetName].features) {
        this.datasets[datasetName].features.forEach(feature => {
          const center = turf.center(feature);
          const gridKey = this.getGridKey(center.geometry.coordinates, gridSize);
          if (!this.spatialIndex.has(gridKey)) {
            this.spatialIndex.set(gridKey, []);
          }
          this.spatialIndex.get(gridKey).push({
            type: datasetName,
            feature: feature
          });
        });
      }
    });
  }

  // Get grid key for spatial indexing
  getGridKey(coordinates, gridSize) {
    const lat = Math.floor(coordinates[1] / gridSize);
    const lng = Math.floor(coordinates[0] / gridSize);
    return `${lat}_${lng}`;
  }

  // Load accessibility features
  async loadAccessibilityFeatures() {
    // Load and process accessibility-related data
    const accessibilityDatasets = ['accessible_parking', 'street_lights', 'traffic_control'];
    
    accessibilityDatasets.forEach(datasetName => {
      if (this.datasets[datasetName] && this.datasets[datasetName].features) {
        this.datasets[datasetName].features.forEach(feature => {
          const center = turf.center(feature);
          const key = `${datasetName}_${feature.id || Math.random()}`;
          this.accessibilityFeatures.set(key, {
            type: datasetName,
            feature: feature,
            coordinates: center.geometry.coordinates
          });
        });
      }
    });
  }

  // Main route calculation method
  async calculateRoute(origin, destination, mode = 'walking', accessibility = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const cacheKey = `${origin}_${destination}_${mode}_${JSON.stringify(accessibility)}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey);
    }

    try {
      console.log(`Calculating ${mode} route from ${origin} to ${destination}`);
      
      // Geocode origin and destination
      const originCoords = await this.geocode(origin);
      const destCoords = await this.geocode(destination);
      
      if (!originCoords || !destCoords) {
        throw new Error('Could not geocode origin or destination');
      }

      console.log('Origin coordinates:', originCoords);
      console.log('Destination coordinates:', destCoords);
      
      // Snap to nearest nodes in the routing graph
      const startNode = this.findNearestNode(originCoords);
      const endNode = this.findNearestNode(destCoords);
      
      if (!startNode || !endNode) {
        throw new Error('Could not find routing nodes near origin or destination');
      }

      let route;
      switch (mode) {
        case 'walking':
          route = await this.calculateWalkingRoute(startNode, endNode, accessibility);
          break;
        case 'driving':
          route = await this.calculateDrivingRoute(startNode, endNode, accessibility);
          break;
        case 'transit':
          route = await this.calculateTransitRoute(startNode, endNode, accessibility);
          break;
        default:
          route = await this.calculateWalkingRoute(startNode, endNode, accessibility);
      }

      // Apply AI optimizations
      route = await this.aiModel.optimizeRoute(route, accessibility);
      
      // Generate turn-by-turn instructions
      route.instructions = this.generateTurnByTurnInstructions(route);
      
      // Cache the result
      this.routeCache.set(cacheKey, route);
      
      // Learn from this route calculation
      this.aiModel.learnFromUserBehavior(route, accessibility);
      
      return route;
    } catch (error) {
      console.error('Error calculating route:', error);
      throw error;
    }
  }

  // Calculate walking route using A* algorithm with fallback
  async calculateWalkingRoute(startNode, endNode, accessibility) {
    console.log('Attempting to calculate walking route with A* algorithm');
    
    // First try: Most accessible route
    let path = this.aStarAlgorithm(startNode, endNode, accessibility);
    let routeType = 'accessible';
    
    // Second try: Relaxed accessibility constraints
    if (!path || path.length === 0) {
      console.log('No fully accessible route found, trying with relaxed constraints');
      const relaxedAccessibility = {
        ...accessibility,
        avoidSteps: false,
        wheelchair: false,
        preferAccessible: true
      };
      path = this.aStarAlgorithm(startNode, endNode, relaxedAccessibility);
      routeType = 'partially_accessible';
    }
    
    // Third try: Direct route with minimal constraints
    if (!path || path.length === 0) {
      console.log('No A* route found, creating direct route');
      path = this.createDirectRoute(startNode, endNode);
      routeType = 'direct';
    }
    
    // Ensure we always have a path
    if (!path || path.length === 0) {
      console.log('Creating basic fallback route');
      path = [startNode, endNode];
      routeType = 'fallback';
    }

    // Convert path to GeoJSON
    const coordinates = this.pathToCoordinates(path);
    console.log('Path converted to coordinates:', coordinates);
    
    // Calculate distance using turf.js
    let distance = 0;
    if (coordinates.length >= 2) {
      try {
        const lineString = turf.lineString(coordinates);
        distance = turf.length(lineString);
        console.log('Calculated distance using turf:', distance, 'km');
      } catch (error) {
        console.warn('Error calculating distance with turf, using fallback:', error);
        // Fallback distance calculation
        distance = this.calculateDirectDistance(coordinates[0], coordinates[coordinates.length - 1]);
      }
    } else {
      // Fallback for simple routes
      distance = this.calculateDirectDistance(startNode.coordinates, endNode.coordinates);
    }
    
    const duration = this.estimateWalkingTime(distance);
    const accessibilityScore = this.assessRouteAccessibility(path);

    console.log(`Route calculated: ${routeType}, distance: ${distance.toFixed(2)}km, accessibility: ${accessibilityScore.toFixed(2)}`);

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          mode: 'walking',
          distance: distance * 1000, // Convert to meters for consistency
          duration: duration,
          accessibility: accessibilityScore,
          routeType: routeType,
          color: this.getRouteColor(routeType, accessibilityScore),
          avoidSteps: accessibility.avoidSteps || true,
          wheelchair: accessibility.wheelchair || false,
          warnings: this.getRouteWarnings(routeType, accessibilityScore)
        },
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      }],
      path: path,
      startNode: startNode,
      endNode: endNode
    };
  }

  // Calculate driving route with accessible parking
  async calculateDrivingRoute(startNode, endNode, accessibility) {
    // Find accessible parking near destination
    const accessibleParking = this.findAccessibleParking(endNode.coordinates);
    
    if (!accessibleParking) {
      throw new Error('No accessible parking found near destination');
    }

    // Find nearest node to parking
    const parkingNode = this.findNearestNode(accessibleParking.coordinates);
    
    // Calculate route to parking
    const routeToParking = this.aStarAlgorithm(startNode, parkingNode, accessibility);
    
    // Calculate walking route from parking to destination
    const walkingFromParking = this.aStarAlgorithm(parkingNode, endNode, accessibility);

    if (!routeToParking || !walkingFromParking) {
      throw new Error('Could not calculate complete driving route');
    }

    const drivingCoords = this.pathToCoordinates(routeToParking);
    const walkingCoords = this.pathToCoordinates(walkingFromParking);
    
    const drivingDistance = turf.length(turf.lineString(drivingCoords));
    const walkingDistance = turf.length(turf.lineString(walkingCoords));

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            mode: 'driving',
            distance: drivingDistance,
            duration: this.estimateDrivingTime(drivingDistance),
            accessibility: 'accessible_parking_available',
            color: '#16a34a' // Green for driving
          },
          geometry: {
            type: 'LineString',
            coordinates: drivingCoords
          }
        },
        {
          type: 'Feature',
          properties: {
            mode: 'walking',
            distance: walkingDistance,
            duration: this.estimateWalkingTime(walkingDistance),
            accessibility: this.assessRouteAccessibility(walkingFromParking),
            color: '#2563eb' // Blue for walking
          },
          geometry: {
            type: 'LineString',
            coordinates: walkingCoords
          }
        }
      ],
      parking: accessibleParking
    };
  }

  // Calculate transit route with accessible stops
  async calculateTransitRoute(startNode, endNode, accessibility) {
    // Find accessible bus stops
    const originStop = this.findAccessibleBusStop(startNode.coordinates);
    const destStop = this.findAccessibleBusStop(endNode.coordinates);
    
    if (!originStop || !destStop) {
      throw new Error('No accessible transit stops found');
    }

    // Find nearest nodes to stops
    const originStopNode = this.findNearestNode(originStop.coordinates);
    const destStopNode = this.findNearestNode(destStop.coordinates);
    
    // Calculate walking routes to/from stops
    const walkToStop = this.aStarAlgorithm(startNode, originStopNode, accessibility);
    const walkFromStop = this.aStarAlgorithm(destStopNode, endNode, accessibility);
    
    // Find transit route between stops
    const transitRoute = this.findTransitRoute(originStop, destStop);

    if (!walkToStop || !walkFromStop || !transitRoute) {
      throw new Error('Could not calculate complete transit route');
    }

    const walkToCoords = this.pathToCoordinates(walkToStop);
    const walkFromCoords = this.pathToCoordinates(walkFromStop);
    const transitCoords = transitRoute.coordinates;

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            mode: 'walking',
            distance: turf.length(turf.lineString(walkToCoords)),
            duration: this.estimateWalkingTime(turf.length(turf.lineString(walkToCoords))),
            accessibility: this.assessRouteAccessibility(walkToStop),
            color: '#2563eb' // Blue for walking
          },
          geometry: {
            type: 'LineString',
            coordinates: walkToCoords
          }
        },
        {
          type: 'Feature',
          properties: {
            mode: 'transit',
            distance: turf.length(turf.lineString(transitCoords)),
            duration: this.estimateTransitTime(transitRoute),
            accessibility: 'accessible_transit',
            route: transitRoute.properties?.route || 'Unknown',
            color: '#8b5cf6' // Purple for transit
          },
          geometry: {
            type: 'LineString',
            coordinates: transitCoords
          }
        },
        {
          type: 'Feature',
          properties: {
            mode: 'walking',
            distance: turf.length(turf.lineString(walkFromCoords)),
            duration: this.estimateWalkingTime(turf.length(turf.lineString(walkFromCoords))),
            accessibility: this.assessRouteAccessibility(walkFromStop),
            color: '#2563eb' // Blue for walking
          },
          geometry: {
            type: 'LineString',
            coordinates: walkFromCoords
          }
        }
      ],
      stops: { origin: originStop, destination: destStop }
    };
  }

  // A* algorithm for pathfinding
  aStarAlgorithm(startNode, endNode, accessibility) {
    const openSet = new Set([startNode.id]);
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, this.heuristic(startNode, endNode));
    
    while (openSet.size > 0) {
      // Find node with lowest fScore
      let currentId = null;
      let lowestFScore = Infinity;
      
      for (const nodeId of openSet) {
        const score = fScore.get(nodeId) || Infinity;
        if (score < lowestFScore) {
          lowestFScore = score;
          currentId = nodeId;
        }
      }
      
      if (!currentId) break;
      
      const currentNode = this.nodes.get(currentId);
      
      // Check if we reached the destination
      if (currentNode.id === endNode.id) {
        return this.reconstructPath(cameFrom, currentId);
      }
      
      openSet.delete(currentId);
      
      // Check all connected edges
      if (currentNode.connections) {
        for (const edgeId of currentNode.connections) {
          const edge = this.edges.get(edgeId);
          if (!edge) continue;
          
          // Determine neighbor node
          const neighborId = edge.startNode === currentId ? edge.endNode : edge.startNode;
          const neighbor = this.nodes.get(neighborId);
          if (!neighbor) continue;
          
          // Check accessibility constraints
          if (!this.isAccessible(edge, accessibility)) {
            continue;
          }
          
          const tentativeGScore = (gScore.get(currentId) || Infinity) + edge.distance;
          
          if (tentativeGScore < (gScore.get(neighborId) || Infinity)) {
            cameFrom.set(neighborId, currentId);
            gScore.set(neighborId, tentativeGScore);
            fScore.set(neighborId, tentativeGScore + this.heuristic(neighbor, endNode));
            
            if (!openSet.has(neighborId)) {
              openSet.add(neighborId);
            }
          }
        }
      }
    }
    
    return null; // No path found
  }

  // Heuristic function for A* (Euclidean distance)
  heuristic(nodeA, nodeB) {
    return turf.distance(
      turf.point(nodeA.coordinates),
      turf.point(nodeB.coordinates)
    );
  }

  // Reconstruct path from A* algorithm
  reconstructPath(cameFrom, currentId) {
    const path = [currentId];
    
    while (cameFrom.has(currentId)) {
      currentId = cameFrom.get(currentId);
      path.unshift(currentId);
    }
    
    return path;
  }

  // Check if an edge is accessible given constraints
  isAccessible(edge, accessibility) {
    // Check for steps if avoiding steps
    if (accessibility.avoidSteps && edge.accessibility < 0.3) {
      return false;
    }
    
    // Check for wheelchair accessibility
    if (accessibility.wheelchair && edge.accessibility < 0.5) {
      return false;
    }
    
    // Check for closures
    if (this.isEdgeClosed(edge)) {
      return false;
    }
    
    return true;
  }

  // Check if an edge is closed
  isEdgeClosed(edge) {
    // Check against street and sidewalk closures
    const edgeLine = turf.lineString(edge.coordinates);
    
    ['street_closures', 'sidewalk_closures'].forEach(datasetName => {
      if (this.datasets[datasetName] && this.datasets[datasetName].features) {
        for (const closure of this.datasets[datasetName].features) {
          if (turf.booleanIntersects(edgeLine, closure)) {
            return true;
          }
        }
      }
    });
    
    return false;
  }

  // Convert path to coordinates
  pathToCoordinates(path) {
    const coordinates = [];
    
    // Handle simple path with just start and end nodes
    if (path.length === 2 && path[0].coordinates && path[1].coordinates) {
      console.log('Converting simple two-node path to coordinates');
      coordinates.push(path[0].coordinates, path[1].coordinates);
      return coordinates;
    }
    
    // Handle complex path through graph
    for (let i = 0; i < path.length - 1; i++) {
      const currentNode = typeof path[i] === 'object' ? path[i] : this.nodes.get(path[i]);
      const nextNode = typeof path[i + 1] === 'object' ? path[i + 1] : this.nodes.get(path[i + 1]);
      
      if (!currentNode || !nextNode) {
        console.warn('Missing node in path, skipping edge');
        continue;
      }
      
      // If nodes have direct coordinates, use them
      if (currentNode.coordinates && nextNode.coordinates) {
        if (i === 0) coordinates.push(currentNode.coordinates);
        coordinates.push(nextNode.coordinates);
        continue;
      }
      
      // Find edge between these nodes
      const edge = this.findEdgeBetweenNodes(currentNode, nextNode);
      
      if (edge) {
        if (edge.startNode === currentNode.id) {
          coordinates.push(...edge.coordinates);
        } else {
          coordinates.push(...edge.coordinates.reverse());
        }
      } else {
        // Fallback: direct line between nodes
        if (currentNode.coordinates && nextNode.coordinates) {
          if (i === 0) coordinates.push(currentNode.coordinates);
          coordinates.push(nextNode.coordinates);
        }
      }
    }
    
    return coordinates;
  }

  // Find edge between two nodes
  findEdgeBetweenNodes(nodeA, nodeB) {
    // Check if both nodes exist and have IDs
    if (!nodeA || !nodeB || !nodeA.id || !nodeB.id) {
      console.log('findEdgeBetweenNodes: Invalid nodes provided', { nodeA, nodeB });
      return null;
    }
    
    for (const edge of this.edges.values()) {
      if ((edge.startNode === nodeA.id && edge.endNode === nodeB.id) ||
          (edge.startNode === nodeB.id && edge.endNode === nodeA.id)) {
        return edge;
      }
    }
    return null;
  }

  // Find nearest node to coordinates
  findNearestNode(coordinates) {
    console.log('findNearestNode called with coordinates:', coordinates);
    
    // Validate coordinates
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      console.error('Invalid coordinates passed to findNearestNode:', coordinates);
      return null;
    }
    
    // Ensure coordinates are numbers
    const validCoords = [parseFloat(coordinates[0]), parseFloat(coordinates[1])];
    if (isNaN(validCoords[0]) || isNaN(validCoords[1])) {
      console.error('Non-numeric coordinates passed to findNearestNode:', coordinates);
      return null;
    }
    
    console.log('Valid coordinates for Turf.js:', validCoords);
    
    let nearestNode = null;
    let minDistance = Infinity;
    
    // Search existing nodes
    for (const node of this.nodes.values()) {
      if (!node.coordinates || !Array.isArray(node.coordinates) || node.coordinates.length < 2) {
        console.log('Skipping node with invalid coordinates:', node.id, node.coordinates);
        continue;
      }
      
      try {
        console.log('Calculating distance between:', validCoords, 'and', node.coordinates);
        const distance = turf.distance(
          turf.point(validCoords),
          turf.point(node.coordinates)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestNode = node;
        }
      } catch (error) {
        console.warn('Error calculating distance to node:', node.id, error);
        continue;
      }
    }
    
    // If no existing node found or distance is too far, create virtual node
    if (!nearestNode || minDistance > 1) { // 1km threshold
      console.log(`Creating virtual node at [${validCoords[0]}, ${validCoords[1]}]`);
      nearestNode = {
        id: `virtual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        coordinates: validCoords,
        virtual: true,
        connections: []
      };
    }
    
    return nearestNode;
  }

  // Find accessible parking near coordinates
  findAccessibleParking(coordinates) {
    if (!this.datasets.accessible_parking) return null;
    
    let nearestParking = null;
    let minDistance = Infinity;
    
    this.datasets.accessible_parking.features.forEach(parking => {
      const distance = turf.distance(
        turf.point(coordinates),
        turf.point(parking.geometry.coordinates)
      );
      
      if (distance < minDistance && distance < 0.5) { // Within 500m
        minDistance = distance;
        nearestParking = {
          feature: parking,
          coordinates: parking.geometry.coordinates
        };
      }
    });
    
    return nearestParking;
  }

  // Find accessible bus stop near coordinates
  findAccessibleBusStop(coordinates) {
    if (!this.datasets.bus_stops) return null;
    
    let nearestStop = null;
    let minDistance = Infinity;
    
    this.datasets.bus_stops.features.forEach(stop => {
      const distance = turf.distance(
        turf.point(coordinates),
        turf.point(stop.geometry.coordinates)
      );
      
      if (distance < minDistance && distance < 0.3) { // Within 300m
        minDistance = distance;
        nearestStop = {
          feature: stop,
          coordinates: stop.geometry.coordinates
        };
      }
    });
    
    return nearestStop;
  }

  // Find transit route between stops
  findTransitRoute(originStop, destStop) {
    if (!this.datasets.transit_routes) return null;
    
    // Find a transit route that connects these stops
    for (const route of this.datasets.transit_routes.features) {
      const routeCoords = route.geometry.coordinates;
      
      // Check if route passes through both stops
      const originDistance = this.minDistanceToRoute(originStop.coordinates, routeCoords);
      const destDistance = this.minDistanceToRoute(destStop.coordinates, routeCoords);
      
      if (originDistance < 0.1 && destDistance < 0.1) { // Within 100m
        return {
          coordinates: routeCoords,
          properties: route.properties
        };
      }
    }
    
    return null;
  }

  // Calculate minimum distance from point to route
  minDistanceToRoute(point, routeCoords) {
    let minDistance = Infinity;
    
    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segment = turf.lineString([routeCoords[i], routeCoords[i + 1]]);
      const distance = turf.pointToLineDistance(turf.point(point), segment);
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    return minDistance;
  }

  // Generate turn-by-turn instructions
  generateTurnByTurnInstructions(route) {
    const instructions = [];
    
    if (!route.features || route.features.length === 0) {
      return instructions;
    }
    
    let stepNumber = 1;
    
    route.features.forEach((feature, index) => {
      const mode = feature.properties.mode;
      const distance = feature.properties.distance;
      const duration = feature.properties.duration;
      const accessibility = feature.properties.accessibility;
      
      // Create more detailed instructions based on mode
      let instruction = '';
      
      if (mode === 'walking') {
        instruction = `Walk ${this.formatDistance(distance)} (${this.formatDuration(duration)})`;
        
        // Add accessibility context
        if (accessibility < 0.5) {
          instruction += ' - Note: This section may have accessibility challenges';
        } else if (accessibility > 0.8) {
          instruction += ' - Fully accessible route';
        }
      } else if (mode === 'driving') {
        instruction = `Drive ${this.formatDistance(distance)} (${this.formatDuration(duration)})`;
        
        // Add parking information for driving routes
        if (feature.properties.accessibleParking) {
          instruction += ' - Accessible parking available at destination';
        }
      } else if (mode === 'transit') {
        const routeName = feature.properties.route || 'bus';
        instruction = `Take ${routeName} for ${this.formatDistance(distance)} (${this.formatDuration(duration)})`;
        
        // Add transit accessibility info
        if (feature.properties.accessibility === 'accessible_transit') {
          instruction += ' - Accessible transit vehicle';
        }
      }
      
      instructions.push({
        step: stepNumber++,
        instruction: instruction,
        mode: mode,
        distance: distance,
        duration: duration,
        accessibility: accessibility
      });
    });
    
    // Add start and end instructions
    if (instructions.length > 0) {
      instructions.unshift({
        step: 1,
        instruction: 'Start your journey from the origin point',
        mode: 'start',
        distance: 0,
        duration: 0
      });
      
      instructions.push({
        step: instructions.length + 1,
        instruction: 'You have arrived at your destination',
        mode: 'end',
        distance: 0,
        duration: 0
      });
    }
    
    console.log('Generated instructions:', instructions);
    return instructions;
  }

  // Format distance for display
  formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  // Format duration for display
  formatDuration(duration) {
    const minutes = Math.round(duration);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}min`;
    }
  }

  // Estimate walking time
  estimateWalkingTime(distance) {
    const walkingSpeed = 1.4; // m/s (average walking speed)
    return (distance * 1000) / walkingSpeed / 60; // Convert to minutes
  }

  // Estimate driving time
  estimateDrivingTime(distance) {
    const drivingSpeed = 13.9; // m/s (average city driving speed)
    return (distance * 1000) / drivingSpeed / 60; // Convert to minutes
  }

  // Estimate transit time
  estimateTransitTime(transitRoute) {
    // Estimate based on distance and average transit speed
    const transitSpeed = 8.3; // m/s (average transit speed)
    const distance = turf.length(turf.lineString(transitRoute.coordinates));
    return (distance * 1000) / transitSpeed / 60; // Convert to minutes
  }

  // Fallback distance calculation
  calculateDirectDistance(coord1, coord2) {
    if (!coord1 || !coord2 || !Array.isArray(coord1) || !Array.isArray(coord2)) {
      console.warn('Invalid coordinates for distance calculation:', coord1, coord2);
      return 0;
    }
    
    try {
      const point1 = turf.point(coord1);
      const point2 = turf.point(coord2);
      return turf.distance(point1, point2);
    } catch (error) {
      console.warn('Error in fallback distance calculation:', error);
      // Simple Euclidean distance as last resort
      const lat1 = parseFloat(coord1[1]);
      const lng1 = parseFloat(coord1[0]);
      const lat2 = parseFloat(coord2[1]);
      const lng2 = parseFloat(coord2[0]);
      
      if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
        return 0;
      }
      
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
  }

  // Assess route accessibility
  assessRouteAccessibility(path) {
    if (!path || path.length === 0) return 0;
    
    let totalAccessibility = 0;
    let edgeCount = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      // Handle both graph nodes and virtual nodes
      const currentNode = typeof path[i] === 'object' ? path[i] : this.nodes.get(path[i]);
      const nextNode = typeof path[i + 1] === 'object' ? path[i + 1] : this.nodes.get(path[i + 1]);
      
      if (!currentNode || !nextNode) {
        console.log(`assessRouteAccessibility: Missing node at index ${i}`, { currentNode, nextNode });
        continue;
      }
      
      const edge = this.findEdgeBetweenNodes(currentNode, nextNode);
      
      if (edge) {
        totalAccessibility += edge.accessibility || 0.5; // Default accessibility if not specified
        edgeCount++;
      } else {
        // For virtual nodes or direct connections, assign default accessibility
        totalAccessibility += 0.7; // Assume moderate accessibility for direct routes
        edgeCount++;
      }
    }
    
    return edgeCount > 0 ? totalAccessibility / edgeCount : 0.5; // Default accessibility score
  }

  // Geocode address to coordinates using server proxy
  async geocode(address) {
    try {
      console.log(`Geocoding request: ${address}`);
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        console.log(`Geocoding successful: ${address} -> [${data[0].lon}, ${data[0].lat}]`);
        return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
      } else {
        console.warn(`No geocoding results for: ${address}`);
      }
    } catch (error) {
      console.warn('Geocoding failed:', error);
    }
    
    return null;
  }

  // AI Model Methods

  // Predict accessibility for a route
  predictAccessibility(route, context) {
    // Simulated AI prediction based on historical data and context
    let baseScore = this.assessRouteAccessibility(route.path);
    
    // Adjust based on weather conditions
    if (this.weatherConditions) {
      if (this.weatherConditions.condition === 'snow' || this.weatherConditions.condition === 'ice') {
        baseScore *= 0.8; // Reduce accessibility in winter conditions
      }
    }
    
    // Adjust based on time of day
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      baseScore *= 0.9; // Reduce accessibility at night
    }
    
    return Math.max(0, Math.min(1, baseScore));
  }

  // Optimize route using AI
  async optimizeRoute(route, accessibility) {
    // Apply AI-based optimizations
    const optimizedRoute = { ...route };
    
    // Predict accessibility
    const predictedAccessibility = this.predictAccessibility(route, accessibility);
    optimizedRoute.predictedAccessibility = predictedAccessibility;
    
    // Suggest alternatives if accessibility is low
    if (predictedAccessibility < 0.5) {
      optimizedRoute.alternatives = await this.suggestAlternatives(route, accessibility);
    }
    
    return optimizedRoute;
  }

  // Learn from user behavior
  learnFromUserBehavior(route, accessibility) {
    // Store route for learning
    this.routeHistory.push({
      route: route,
      accessibility: accessibility,
      timestamp: Date.now(),
      userSatisfaction: null // Would be collected from user feedback
    });
    
    // Update accessibility scores based on usage patterns
    if (route.path) {
      route.path.forEach(nodeId => {
        const node = this.nodes.get(nodeId);
        if (node) {
          const currentScore = this.accessibilityScores.get(nodeId) || node.accessibility;
          // Simple learning: increase score for frequently used nodes
          this.accessibilityScores.set(nodeId, Math.min(1, currentScore + 0.01));
        }
      });
    }
  }

  // Suggest alternative routes
  async suggestAlternatives(originalRoute, accessibility) {
    const alternatives = [];
    
    // Generate alternative routes with different constraints
    const alternativeConstraints = [
      { avoidSteps: true, preferWellLit: true },
      { wheelchair: true, preferWidePaths: true },
      { avoidSteepSlopes: true, preferMaintained: true }
    ];
    
    for (const constraints of alternativeConstraints) {
      try {
        const alternative = await this.calculateRoute(
          originalRoute.origin,
          originalRoute.destination,
          originalRoute.mode,
          { ...accessibility, ...constraints }
        );
        
        if (alternative && alternative !== originalRoute) {
          alternatives.push(alternative);
        }
      } catch (error) {
        console.warn('Could not generate alternative route:', error);
      }
    }
    
    return alternatives.slice(0, 3); // Return top 3 alternatives
  }

  // Get route statistics
  getRouteStats() {
    return {
      totalRoutes: this.routeHistory.length,
      averageAccessibility: this.calculateAverageAccessibility(),
      mostUsedPaths: this.getMostUsedPaths(),
      accessibilityTrends: this.getAccessibilityTrends()
    };
  }

  // Calculate average accessibility
  calculateAverageAccessibility() {
    if (this.routeHistory.length === 0) return 0;
    
    const totalAccessibility = this.routeHistory.reduce((sum, entry) => {
      return sum + (entry.route.predictedAccessibility || 0);
    }, 0);
    
    return totalAccessibility / this.routeHistory.length;
  }

  // Get most used paths
  getMostUsedPaths() {
    const pathUsage = new Map();
    
    this.routeHistory.forEach(entry => {
      if (entry.route.path) {
        entry.route.path.forEach(nodeId => {
          pathUsage.set(nodeId, (pathUsage.get(nodeId) || 0) + 1);
        });
      }
    });
    
    return Array.from(pathUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([nodeId, count]) => ({
        nodeId,
        usageCount: count,
        node: this.nodes.get(nodeId)
      }));
  }

  // Get accessibility trends
  getAccessibilityTrends() {
    const trends = [];
    const timeWindows = [24, 168, 720]; // 1 day, 1 week, 1 month in hours
    
    timeWindows.forEach(hours => {
      const cutoff = Date.now() - (hours * 60 * 60 * 1000);
      const recentRoutes = this.routeHistory.filter(entry => entry.timestamp > cutoff);
      
      if (recentRoutes.length > 0) {
        const avgAccessibility = recentRoutes.reduce((sum, entry) => {
          return sum + (entry.route.predictedAccessibility || 0);
        }, 0) / recentRoutes.length;
        
        trends.push({
          timeWindow: hours,
          averageAccessibility: avgAccessibility,
          routeCount: recentRoutes.length
        });
      }
    });
    
    return trends;
  }

  // Create a direct route between two nodes
  createDirectRoute(startNode, endNode) {
    console.log('Creating direct route from', startNode.id, 'to', endNode.id);
    
    // Try to find a simple path through the graph
    if (this.nodes.size > 0) {
      // Use Dijkstra's algorithm with relaxed constraints
      const visited = new Set();
      const queue = [{node: startNode, path: [startNode]}];
      
      while (queue.length > 0) {
        const {node: currentNode, path} = queue.shift();
        
        if (currentNode.id === endNode.id) {
          console.log('Found direct path with', path.length, 'nodes');
          return path;
        }
        
        if (visited.has(currentNode.id) || path.length > 50) continue;
        visited.add(currentNode.id);
        
        // Check connections with minimal filtering
        if (currentNode.connections) {
          for (const edgeId of currentNode.connections) {
            const edge = this.edges.get(edgeId);
            if (!edge) continue;
            
            const neighborId = edge.startNode === currentNode.id ? edge.endNode : edge.startNode;
            const neighbor = this.nodes.get(neighborId);
            
            if (neighbor && !visited.has(neighborId)) {
              queue.push({
                node: neighbor,
                path: [...path, neighbor]
              });
            }
          }
        }
      }
    }
    
    // If no path through graph, return direct line
    console.log('No path through graph, returning direct connection');
    return [startNode, endNode];
  }

  // Get route color based on accessibility
  getRouteColor(routeType, accessibilityScore) {
    switch (routeType) {
      case 'accessible':
        return accessibilityScore >= 0.8 ? '#10b981' : '#3b82f6'; // Green or blue
      case 'partially_accessible':
        return '#f59e0b'; // Amber
      case 'direct':
        return '#ef4444'; // Red
      case 'fallback':
        return '#6b7280'; // Gray
      default:
        return '#3b82f6'; // Default blue
    }
  }

  // Get route warnings based on accessibility
  getRouteWarnings(routeType, accessibilityScore) {
    const warnings = [];
    
    switch (routeType) {
      case 'accessible':
        if (accessibilityScore < 0.7) {
          warnings.push('Route may have some accessibility challenges');
        }
        break;
      case 'partially_accessible':
        warnings.push('Route may include steps or less accessible paths');
        break;
      case 'direct':
        warnings.push('Direct route may not follow accessible pathways');
        break;
      case 'fallback':
        warnings.push('Basic route - accessibility not guaranteed');
        break;
    }
    
    if (accessibilityScore < 0.5) {
      warnings.push('Low accessibility score - consider alternative routes');
    }
    
    return warnings;
  }
}

export default AdvancedRoutingService;
