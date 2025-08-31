const cron = require('node-cron');
const axios = require('axios');
const cheerio = require('cheerio');
const db = require('../database');

class AIService {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
    this.predictionCache = new Map();
    this.clusteringModel = null;
    this.weatherData = null;
    this.maintenanceData = null;
    this.historicalBarriers = [];
    this.lastUpdate = null;
    this.datasets = {};
    this.notificationQueue = [];
  }

  // Initialize AI models and load all datasets
  async initialize() {
    try {
      // Load all municipal datasets
      await this.loadAllDatasets();
      
      // Load historical data
      await this.loadHistoricalData();
      
      // Schedule data updates
      this.scheduleDataUpdates();
      
      // Initialize notification system
      this.initializeNotifications();
      
      this.isModelLoaded = true;
      console.log('AI service initialized successfully with all municipal datasets');
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      this.isModelLoaded = false;
    }
  }

  // Load all municipal datasets from database
  async loadAllDatasets() {
    try {
      const datasetTables = [
        'accessible_parking',
        'active_travelways', 
        'bike_infrastructure',
        'bus_stops',
        'civic_addresses',
        'public_washrooms',
        'sidewalk_closures',
        'steps',
        'street_closures',
        'street_junctions',
        'street_lights',
        'traffic_control',
        'transit_routes',
        'transit_shelters'
      ];

      for (const table of datasetTables) {
        try {
          const data = await db.getDatasetData(table);
          this.datasets[table] = data;
          console.log(`Loaded ${data.length} records from ${table}`);
        } catch (error) {
          console.warn(`Could not load ${table}:`, error.message);
          this.datasets[table] = [];
        }
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  }

  // Enhanced barrier detection using all datasets
  async detectBarriers(route, mode) {
    const barriers = [];
    const routeCoordinates = route.coordinates || route.features?.[0]?.geometry?.coordinates || [];

    // Check each dataset for barriers along the route
    for (const coord of routeCoordinates) {
      const [lng, lat] = Array.isArray(coord) ? coord : [coord.lng, coord.lat];
      
      // Check sidewalk closures
      const sidewalkBarriers = await this.checkSidewalkClosures(lat, lng, routeCoordinates);
      barriers.push(...sidewalkBarriers);

      // Check street closures
      const streetBarriers = await this.checkStreetClosures(lat, lng, routeCoordinates);
      barriers.push(...streetBarriers);

      // Check steps (for walking mode)
      if (mode === 'walking') {
        const stepBarriers = await this.checkSteps(lat, lng, routeCoordinates);
        barriers.push(...stepBarriers);
      }

      // Check traffic control
      const trafficBarriers = await this.checkTrafficControl(lat, lng, routeCoordinates);
      barriers.push(...trafficBarriers);
    }

    // Remove duplicates and sort by severity
    const uniqueBarriers = this.removeDuplicateBarriers(barriers);
    return uniqueBarriers.sort((a, b) => this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity));
  }

  // Check for sidewalk closures
  async checkSidewalkClosures(lat, lng, routeCoordinates) {
    const barriers = [];
    const nearbyClosures = await db.getNearbyData('sidewalk_closures', lat, lng, 0.1);

    for (const closure of nearbyClosures) {
      if (closure.status === 'active') {
        const distance = this.calculateDistance({ lat, lng }, { lat: closure.lat, lng: closure.lng });
        
        if (distance <= 0.1) { // Within 100m
          barriers.push({
            type: 'sidewalk_closure',
            location: { lat: closure.lat, lng: closure.lng },
            reason: closure.reason,
            startDate: closure.start_date,
            endDate: closure.end_date,
            length: closure.length,
            affectedSegments: closure.affected_segments,
            severity: 'high',
            confidence: 0.95,
            suggestedReroute: await this.generateRerouteSuggestion(routeCoordinates, 'sidewalk_closure', closure)
          });
        }
      }
    }

    return barriers;
  }

  // Check for street closures
  async checkStreetClosures(lat, lng, routeCoordinates) {
    const barriers = [];
    const nearbyClosures = await db.getNearbyData('street_closures', lat, lng, 0.1);

    for (const closure of nearbyClosures) {
      if (closure.status === 'active') {
        const distance = this.calculateDistance({ lat, lng }, { lat: closure.lat, lng: closure.lng });
        
        if (distance <= 0.1) { // Within 100m
          barriers.push({
            type: 'street_closure',
            location: { lat: closure.lat, lng: closure.lng },
            reason: closure.reason,
            startDate: closure.start_date,
            endDate: closure.end_date,
            affectedSegments: closure.affected_segments,
            severity: 'high',
            confidence: 0.95,
            suggestedReroute: await this.generateRerouteSuggestion(routeCoordinates, 'street_closure', closure)
          });
        }
      }
    }

    return barriers;
  }

  // Check for steps (for walking routes)
  async checkSteps(lat, lng, routeCoordinates) {
    const barriers = [];
    const nearbySteps = await db.getNearbyData('steps', lat, lng, 0.05);

    for (const step of nearbySteps) {
      const distance = this.calculateDistance({ lat, lng }, { lat: step.lat, lng: step.lng });
      
      if (distance <= 0.05) { // Within 50m
        barriers.push({
          type: 'steps',
          location: { lat: step.lat, lng: step.lng },
          count: step.count,
          height: step.height,
          width: step.width,
          hasHandrails: step.handrails,
          severity: step.count > 10 ? 'high' : 'medium',
          confidence: 0.9,
          suggestedReroute: await this.generateRerouteSuggestion(routeCoordinates, 'steps', step)
        });
      }
    }

    return barriers;
  }

  // Check traffic control
  async checkTrafficControl(lat, lng, routeCoordinates) {
    const barriers = [];
    const nearbyTraffic = await db.getNearbyData('traffic_control', lat, lng, 0.05);

    for (const traffic of nearbyTraffic) {
      if (traffic.status === 'maintenance' || traffic.maintenance_status === 'needs_repair') {
        const distance = this.calculateDistance({ lat, lng }, { lat: traffic.lat, lng: traffic.lng });
        
        if (distance <= 0.05) { // Within 50m
          barriers.push({
            type: 'traffic_control_issue',
            location: { lat: traffic.lat, lng: traffic.lng },
            trafficType: traffic.type,
            status: traffic.status,
            maintenanceStatus: traffic.maintenance_status,
            severity: 'medium',
            confidence: 0.8,
            suggestedReroute: await this.generateRerouteSuggestion(routeCoordinates, 'traffic_control', traffic)
          });
        }
      }
    }

    return barriers;
  }

  // Generate reroute suggestions
  async generateRerouteSuggestion(originalRoute, barrierType, barrierData) {
    try {
      // Get alternative routes using active travelways
      const alternativeRoutes = await this.findAlternativeRoutes(originalRoute, barrierType, barrierData);
      
      if (alternativeRoutes.length > 0) {
        // Return the best alternative route
        return {
          type: 'reroute_suggestion',
          originalRoute: originalRoute,
          alternativeRoutes: alternativeRoutes,
          recommendedRoute: alternativeRoutes[0],
          reason: `Avoiding ${barrierType} at ${barrierData.reason || 'this location'}`,
          estimatedAdditionalTime: this.calculateAdditionalTime(originalRoute, alternativeRoutes[0]),
          accessibilityScore: this.calculateAccessibilityScore(alternativeRoutes[0])
        };
      }
    } catch (error) {
      console.error('Error generating reroute suggestion:', error);
    }

    return null;
  }

  // Find alternative routes using active travelways
  async findAlternativeRoutes(originalRoute, barrierType, barrierData) {
    const alternatives = [];
    const activeTravelways = this.datasets.active_travelways || [];

    // Find nearby active travelways that avoid the barrier
    const barrierLocation = barrierData.location || { lat: barrierData.lat, lng: barrierData.lng };
    
    for (const travelway of activeTravelways) {
      const distance = this.calculateDistance(barrierLocation, { lat: travelway.lat, lng: travelway.lng });
      
      if (distance > 0.1) { // At least 100m away from barrier
        const alternativeRoute = this.generateRouteViaTravelway(originalRoute, travelway);
        if (alternativeRoute) {
          alternatives.push({
            route: alternativeRoute,
            travelway: travelway,
            distance: this.calculateRouteDistance(alternativeRoute),
            accessibilityScore: this.calculateAccessibilityScore(alternativeRoute)
          });
        }
      }
    }

    // Sort by accessibility score and distance
    return alternatives.sort((a, b) => {
      if (a.accessibilityScore !== b.accessibilityScore) {
        return b.accessibilityScore - a.accessibilityScore;
      }
      return a.distance - b.distance;
    });
  }

  // Generate route via specific travelway
  generateRouteViaTravelway(originalRoute, travelway) {
    try {
      // Create a route that goes through the travelway
      const startPoint = originalRoute[0];
      const endPoint = originalRoute[originalRoute.length - 1];
      const travelwayPoint = [travelway.lng, travelway.lat];

      return [
        startPoint,
        travelwayPoint,
        endPoint
      ];
    } catch (error) {
      console.error('Error generating route via travelway:', error);
      return null;
    }
  }

  // Proactive rerouting function
  async rerouteAroundBarrier(barrier, mode) {
    try {
      if (!barrier.suggestedReroute) {
        return null;
      }

      const reroute = barrier.suggestedReroute;
      
      // Create notification for user
      await this.createBarrierNotification(barrier, reroute);

      return {
        originalRoute: reroute.originalRoute,
        newRoute: reroute.recommendedRoute.route,
        reason: reroute.reason,
        additionalTime: reroute.estimatedAdditionalTime,
        accessibilityScore: reroute.accessibilityScore,
        barrierInfo: {
          type: barrier.type,
          location: barrier.location,
          severity: barrier.severity,
          reason: barrier.reason
        }
      };
    } catch (error) {
      console.error('Error in proactive rerouting:', error);
      return null;
    }
  }

  // Create barrier notification
  async createBarrierNotification(barrier, reroute) {
    const notification = {
      id: `barrier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: 'system', // Will be replaced with actual user ID
      type: 'barrier_alert',
      title: `Barrier Detected: ${this.getBarrierTitle(barrier.type)}`,
      message: this.generateBarrierMessage(barrier, reroute),
      data: {
        barrier: barrier,
        reroute: reroute,
        action: 'reroute_now'
      }
    };

    try {
      await db.createNotification(notification);
      this.notificationQueue.push(notification);
    } catch (error) {
      console.error('Error creating barrier notification:', error);
    }
  }

  // Get barrier title
  getBarrierTitle(barrierType) {
    const titles = {
      'sidewalk_closure': 'Sidewalk Closure',
      'street_closure': 'Street Closure',
      'steps': 'Steps Detected',
      'traffic_control_issue': 'Traffic Control Issue'
    };
    return titles[barrierType] || 'Accessibility Barrier';
  }

  // Generate barrier message
  generateBarrierMessage(barrier, reroute) {
    let message = `A ${this.getBarrierTitle(barrier.type).toLowerCase()} has been detected on your route. `;
    
    if (reroute) {
      message += `An alternative route is available that adds approximately ${Math.round(reroute.estimatedAdditionalTime)} minutes to your journey. `;
      message += `Click "Reroute Now" to take the alternative route.`;
    } else {
      message += `Please consider an alternative route.`;
    }

    return message;
  }

  // Initialize notification system
  initializeNotifications() {
    // Process notification queue every 30 seconds
    setInterval(() => {
      this.processNotificationQueue();
    }, 30000);
  }

  // Process notification queue
  async processNotificationQueue() {
    if (this.notificationQueue.length === 0) return;

    const notifications = [...this.notificationQueue];
    this.notificationQueue = [];

    // In a real implementation, this would send notifications to connected clients
    console.log(`Processing ${notifications.length} notifications`);
    
    for (const notification of notifications) {
      // Send to connected WebSocket clients or push notification service
      this.broadcastNotification(notification);
    }
  }

  // Broadcast notification (placeholder for WebSocket implementation)
  broadcastNotification(notification) {
    // This would integrate with WebSocket or push notification service
    console.log('Broadcasting notification:', notification.title);
  }

  // Enhanced route prediction with all datasets
  async predictBarriers(route, options = {}) {
    const cacheKey = this.generateCacheKey(route, options);
    
    // Check cache first
    const cachedPrediction = await db.getCachedPrediction(cacheKey);
    if (cachedPrediction) {
      return cachedPrediction;
    }

    const predictions = [];
    
    // Detect actual barriers using datasets
    const actualBarriers = await this.detectBarriers(route, options.mode || 'walking');
    predictions.push(...actualBarriers);

    // AI-based predictions
    if (this.isModelLoaded && this.model) {
      const aiPredictions = await this.aiPredictBarriers(route, options);
      predictions.push(...aiPredictions);
    } else {
      const rulePredictions = this.ruleBasedPrediction(route, options);
      predictions.push(...rulePredictions);
    }

    // Cache results
    await db.cachePrediction(cacheKey, predictions);

    return predictions;
  }

  // Simple rule-based prediction model
  createPredictionModel() {
    return {
      predict: (features) => {
        // Simple rule-based prediction
        let probability = 0;
        
        // Weather-based rules
        if (features[0] < 0) probability += 0.3; // Freezing temperatures
        if (features[1] > 0.5) probability += 0.2; // Heavy precipitation
        if (features[2] > 0.7) probability += 0.2; // High winds
        
        // Historical risk
        probability += features[7] * 0.3;
        
        // Maintenance proximity
        probability += features[8] * 0.2;
        
        return { data: () => [Math.min(probability, 0.95)] };
      }
    };
  }

  // Load historical barrier data
  async loadHistoricalData() {
    try {
      // This would typically load from a database
      // For now, create mock historical data
      this.historicalBarriers = this.generateMockHistoricalData();
    } catch (error) {
      console.error('Failed to load historical data:', error);
      this.historicalBarriers = [];
    }
  }

  // Generate mock historical data for development
  generateMockHistoricalData() {
    const barriers = [];
    const barrierTypes = ['construction', 'weather', 'maintenance', 'accessibility'];
    const locations = [
      { lat: 44.6475, lng: -63.5756, name: 'Downtown Halifax' },
      { lat: 44.6480, lng: -63.5760, name: 'Spring Garden Road' },
      { lat: 44.6490, lng: -63.5770, name: 'Barrington Street' },
      { lat: 44.6460, lng: -63.5740, name: 'Waterfront' }
    ];

    for (let i = 0; i < 100; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      const type = barrierTypes[Math.floor(Math.random() * barrierTypes.length)];
      const date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      
      barriers.push({
        id: i + 1,
        type,
        lat: location.lat + (Math.random() - 0.5) * 0.01,
        lng: location.lng + (Math.random() - 0.5) * 0.01,
        reported_at: date.toISOString(),
        resolved_at: Math.random() > 0.3 ? new Date(date.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        description: `Mock ${type} barrier at ${location.name}`,
        weather_conditions: this.getRandomWeatherConditions(),
        maintenance_related: type === 'maintenance'
      });
    }

    return barriers;
  }

  // Get random weather conditions
  getRandomWeatherConditions() {
    const conditions = [
      { temperature: 15, precipitation: 0, windSpeed: 10 },
      { temperature: -5, precipitation: 0.8, windSpeed: 25 },
      { temperature: 20, precipitation: 0.1, windSpeed: 5 },
      { temperature: 0, precipitation: 0.5, windSpeed: 15 }
    ];
    return conditions[Math.floor(Math.random() * conditions.length)];
  }

  // Schedule data updates
  scheduleDataUpdates() {
    // Update weather data every hour
    cron.schedule('0 * * * *', async () => {
      await this.updateWeatherData();
    });

    // Update maintenance data every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      await this.updateMaintenanceData();
    });

    // Retrain model weekly
    cron.schedule('0 0 * * 0', async () => {
      await this.retrainModel();
    });
  }

  // Update weather data
  async updateWeatherData() {
    try {
      // This would call a weather API
      this.weatherData = await this.fetchWeatherData();
      this.lastUpdate = new Date();
      console.log('Weather data updated');
    } catch (error) {
      console.error('Failed to update weather data:', error);
    }
  }

  // Update maintenance data
  async updateMaintenanceData() {
    try {
      // This would call municipal maintenance APIs
      this.maintenanceData = await this.fetchMaintenanceData();
      console.log('Maintenance data updated');
    } catch (error) {
      console.error('Failed to update maintenance data:', error);
    }
  }

  // Fetch weather data (placeholder)
  async fetchWeatherData() {
    // This would call a real weather API
    return {
      temperature: 15,
      precipitation: 0,
      windSpeed: 10,
      conditions: 'clear',
      humidity: 65,
      pressure: 1013
    };
  }

  // Fetch maintenance data (placeholder)
  async fetchMaintenanceData() {
    // This would call municipal APIs
    return [
      {
        id: 1,
        type: 'road_repair',
        location: { lat: 44.6475, lng: -63.5756 },
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Pothole repair on Spring Garden Road'
      }
    ];
  }

  // Remove duplicate barriers
  removeDuplicateBarriers(barriers) {
    const seen = new Set();
    return barriers.filter(barrier => {
      const key = `${barrier.type}-${barrier.location.lat}-${barrier.location.lng}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Get severity score for sorting
  getSeverityScore(severity) {
    const scores = { 'high': 3, 'medium': 2, 'low': 1 };
    return scores[severity] || 1;
  }

  // Calculate route distance
  calculateRouteDistance(route) {
    let distance = 0;
    for (let i = 1; i < route.length; i++) {
      distance += this.calculateDistance(
        { lat: route[i-1][1], lng: route[i-1][0] },
        { lat: route[i][1], lng: route[i][0] }
      );
    }
    return distance;
  }

  // Calculate additional time for reroute
  calculateAdditionalTime(originalRoute, newRoute) {
    const originalDistance = this.calculateRouteDistance(originalRoute);
    const newDistance = this.calculateRouteDistance(newRoute);
    const additionalDistance = newDistance - originalDistance;
    
    // Assume 5 km/h walking speed
    return (additionalDistance / 5) * 60; // Convert to minutes
  }

  // Calculate accessibility score for route
  calculateAccessibilityScore(route) {
    let score = 100;
    
    // Check for steps along route
    const stepsAlongRoute = this.findStepsAlongRoute(route);
    score -= stepsAlongRoute.length * 10;
    
    // Check for closures along route
    const closuresAlongRoute = this.findClosuresAlongRoute(route);
    score -= closuresAlongRoute.length * 15;
    
    // Bonus for accessible features
    const accessibleFeatures = this.findAccessibleFeaturesAlongRoute(route);
    score += accessibleFeatures.length * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Find steps along route
  findStepsAlongRoute(route) {
    const steps = [];
    const stepsData = this.datasets.steps || [];
    
    for (const coord of route) {
      const [lng, lat] = coord;
      for (const step of stepsData) {
        const distance = this.calculateDistance({ lat, lng }, { lat: step.lat, lng: step.lng });
        if (distance <= 0.05) { // Within 50m
          steps.push(step);
        }
      }
    }
    
    return steps;
  }

  // Find closures along route
  findClosuresAlongRoute(route) {
    const closures = [];
    const sidewalkClosures = this.datasets.sidewalk_closures || [];
    const streetClosures = this.datasets.street_closures || [];
    
    for (const coord of route) {
      const [lng, lat] = coord;
      
      // Check sidewalk closures
      for (const closure of sidewalkClosures) {
        if (closure.status === 'active') {
          const distance = this.calculateDistance({ lat, lng }, { lat: closure.lat, lng: closure.lng });
          if (distance <= 0.1) {
            closures.push({ ...closure, type: 'sidewalk' });
          }
        }
      }
      
      // Check street closures
      for (const closure of streetClosures) {
        if (closure.status === 'active') {
          const distance = this.calculateDistance({ lat, lng }, { lat: closure.lat, lng: closure.lng });
          if (distance <= 0.1) {
            closures.push({ ...closure, type: 'street' });
          }
        }
      }
    }
    
    return closures;
  }

  // Find accessible features along route
  findAccessibleFeaturesAlongRoute(route) {
    const features = [];
    const busStops = this.datasets.bus_stops || [];
    const washrooms = this.datasets.public_washrooms || [];
    const parking = this.datasets.accessible_parking || [];
    
    for (const coord of route) {
      const [lng, lat] = coord;
      
      // Check accessible bus stops
      for (const stop of busStops) {
        if (stop.accessible) {
          const distance = this.calculateDistance({ lat, lng }, { lat: stop.lat, lng: stop.lng });
          if (distance <= 0.2) { // Within 200m
            features.push({ ...stop, type: 'accessible_bus_stop' });
          }
        }
      }
      
      // Check accessible washrooms
      for (const washroom of washrooms) {
        if (washroom.accessible) {
          const distance = this.calculateDistance({ lat, lng }, { lat: washroom.lat, lng: washroom.lng });
          if (distance <= 0.3) { // Within 300m
            features.push({ ...washroom, type: 'accessible_washroom' });
          }
        }
      }
      
      // Check accessible parking
      for (const spot of parking) {
        const distance = this.calculateDistance({ lat, lng }, { lat: spot.lat, lng: spot.lng });
        if (distance <= 0.5) { // Within 500m
          features.push({ ...spot, type: 'accessible_parking' });
        }
      }
    }
    
    return features;
  }

  // AI-based barrier prediction
  async aiPredictBarriers(route, options) {
    const predictions = [];
    
    try {
      const features = this.extractRouteFeatures(route, options);
      
      for (let i = 0; i < features.length; i++) {
        const prediction = this.model.predict(features[i]);
        const probability = prediction.data()[0];
        
        if (probability > 0.6) { // Threshold for prediction
          predictions.push({
            type: 'predicted_barrier',
            location: route.coordinates[i],
            probability: probability,
            reason: this.getBarrierReason(features[i], options),
            severity: this.calculateSeverity(probability, features[i]),
            confidence: this.calculateConfidence(features[i])
          });
        }
      }
    } catch (error) {
      console.error('AI prediction error:', error);
    }

    return predictions;
  }

  // Rule-based prediction (fallback)
  ruleBasedPrediction(route, options) {
    const predictions = [];
    
    route.coordinates.forEach((coord, index) => {
      let probability = 0;
      let reasons = [];

      // Weather-based predictions
      if (this.weatherData) {
        if (this.weatherData.temperature < 0 && this.weatherData.precipitation > 0) {
          probability += 0.3;
          reasons.push('Icy conditions');
        }
        if (this.weatherData.windSpeed > 30) {
          probability += 0.2;
          reasons.push('High winds');
        }
      }

      // Maintenance-based predictions
      const nearbyMaintenance = this.findNearbyMaintenance(coord);
      if (nearbyMaintenance.length > 0) {
        probability += 0.4;
        reasons.push(`Nearby maintenance: ${nearbyMaintenance[0].type}`);
      }

      // Historical data-based predictions
      const historicalRisk = this.getHistoricalRisk(coord);
      probability += historicalRisk * 0.3;
      if (historicalRisk > 0.5) {
        reasons.push('High historical barrier frequency');
      }

      if (probability > 0.5) {
        predictions.push({
          type: 'predicted_barrier',
          location: coord,
          probability: Math.min(probability, 0.95),
          reason: reasons.join(', '),
          severity: this.calculateSeverity(probability, []),
          confidence: 0.7
        });
      }
    });

    return predictions;
  }

  // Extract features from route
  extractRouteFeatures(route, options) {
    const features = [];
    
    route.coordinates.forEach((coord, index) => {
      const feature = [
        // Weather features
        this.weatherData?.temperature || 0,
        this.weatherData?.precipitation || 0,
        this.weatherData?.windSpeed || 0,
        this.weatherData?.humidity || 0,
        this.weatherData?.pressure || 0,
        
        // Time features
        new Date().getHours() / 24,
        new Date().getDay() / 7,
        new Date().getMonth() / 12,
        
        // Location features
        coord.lat,
        coord.lng,
        
        // Historical risk
        this.getHistoricalRisk(coord),
        
        // Maintenance proximity
        this.getMaintenanceProximity(coord),
        
        // Route features
        index / route.coordinates.length,
        route.coordinates.length > 10 ? 1 : 0,
        
        // Accessibility features
        options.avoidSteps ? 1 : 0
      ];
      
      features.push(feature);
    });

    return features;
  }

  // Get historical risk for location
  getHistoricalRisk(coord) {
    const nearbyBarriers = this.historicalBarriers.filter(barrier => {
      const distance = this.calculateDistance(coord, { lat: barrier.lat, lng: barrier.lng });
      return distance < 0.5; // Within 500m
    });
    
    if (nearbyBarriers.length === 0) return 0;
    
    const unresolvedBarriers = nearbyBarriers.filter(b => !b.resolved_at);
    const recentBarriers = nearbyBarriers.filter(b => {
      const daysSince = (Date.now() - new Date(b.reported_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 30; // Last 30 days
    });
    
    return Math.min((unresolvedBarriers.length * 0.3 + recentBarriers.length * 0.2), 1);
  }

  // Find nearby maintenance
  findNearbyMaintenance(coord) {
    if (!this.maintenanceData) return [];
    
    return this.maintenanceData.filter(maintenance => {
      const distance = this.calculateDistance(coord, maintenance.location);
      return distance < 0.5; // Within 500m
    });
  }

  // Get maintenance proximity score
  getMaintenanceProximity(coord) {
    const nearby = this.findNearbyMaintenance(coord);
    return Math.min(nearby.length * 0.2, 1);
  }

  // Calculate distance between coordinates
  calculateDistance(coord1, coord2) {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate severity
  calculateSeverity(probability, features) {
    if (probability > 0.8) return 'high';
    if (probability > 0.6) return 'medium';
    return 'low';
  }

  // Calculate confidence
  calculateConfidence(features) {
    // Simple confidence calculation based on feature quality
    const nonZeroFeatures = features.filter(f => f !== 0).length;
    return Math.min(nonZeroFeatures / features.length, 1);
  }

  // Get barrier reason
  getBarrierReason(features, options) {
    const reasons = [];
    
    if (features[0] < 0) reasons.push('Freezing temperatures');
    if (features[1] > 0.5) reasons.push('Heavy precipitation');
    if (features[2] > 0.7) reasons.push('High winds');
    if (features[7] > 0.5) reasons.push('Historical barrier frequency');
    if (features[8] > 0.3) reasons.push('Nearby maintenance');
    
    return reasons.length > 0 ? reasons.join(', ') : 'General accessibility concern';
  }

  // Generate cache key
  generateCacheKey(route, options) {
    const routeHash = JSON.stringify(route.coordinates.slice(0, 5));
    const optionsHash = JSON.stringify(options);
    return `${routeHash}-${optionsHash}`;
  }

  // Simple clustering for barrier reports
  async clusterBarrierReports(reports, options = {}) {
    try {
      // Simple distance-based clustering
      const clusters = [];
      const k = options.k || 5;
      
      // Group by approximate location (rounded coordinates)
      const locationGroups = {};
      reports.forEach((report, index) => {
        const latKey = Math.round(report.lat * 1000) / 1000;
        const lngKey = Math.round(report.lng * 1000) / 1000;
        const locationKey = `${latKey},${lngKey}`;
        
        if (!locationGroups[locationKey]) {
          locationGroups[locationKey] = [];
        }
        locationGroups[locationKey].push(index);
      });
      
      // Assign cluster IDs
      let clusterId = 0;
      Object.values(locationGroups).forEach(group => {
        group.forEach(reportIndex => {
          clusters[reportIndex] = clusterId;
        });
        clusterId++;
      });
      
      return reports.map((report, index) => ({
        ...report,
        cluster: clusters[index] || 0
      }));
    } catch (error) {
      console.error('Clustering error:', error);
      return reports;
    }
  }

  // Encode barrier type
  encodeBarrierType(type) {
    const types = ['construction', 'weather', 'maintenance', 'accessibility', 'other'];
    return types.indexOf(type) / (types.length - 1);
  }

  // Encode severity
  encodeSeverity(severity) {
    const severities = ['low', 'medium', 'high'];
    return severities.indexOf(severity) / (severities.length - 1);
  }

  // Retrain model (simplified)
  async retrainModel() {
    try {
      console.log('Retraining AI model...');
      
      // For now, just reload historical data
      await this.loadHistoricalData();
      
      console.log('Model retraining completed');
    } catch (error) {
      console.error('Model retraining failed:', error);
    }
  }

  // Prepare training data (simplified)
  prepareTrainingData() {
    // For now, return empty data since we're using rule-based prediction
    return { features: [], labels: [] };
  }

  // Get service status
  getStatus() {
    return {
      isModelLoaded: this.isModelLoaded,
      lastUpdate: this.lastUpdate,
      cacheSize: this.predictionCache.size,
      historicalDataSize: this.historicalBarriers.length,
      weatherData: this.weatherData ? 'Available' : 'Unavailable',
      maintenanceData: this.maintenanceData ? 'Available' : 'Unavailable'
    };
  }
}

// Export singleton instance
const aiService = new AIService();
module.exports = aiService;

