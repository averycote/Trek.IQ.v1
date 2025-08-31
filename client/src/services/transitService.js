// Transit Service for Halifax Transit Data Integration
class TransitService {
  constructor() {
    // Use Transit API for real-time data, fallback to static data
    this.baseUrl = '/api/data'; // Fallback data endpoints
    this.transitAPIService = null; // Will be loaded dynamically
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
    this.isInitialized = false;
    this.activeRoutes = new Map();
    this.busLocations = new Map();
    this.arrivalTimes = new Map();
    this.halifaxTransitData = {
      routes: [],
      stops: [],
      schedules: new Map(),
      accessibleParking: [],
      winterRoads: [],
      winterSidewalks: []
    };
    this.useTransitAPI = false; // Flag to track if Transit API is available
    
    // Halifax Interactive Maps URLs
    this.halifaxMaps = {
      accessibleParking: 'https://hrm.maps.arcgis.com/apps/webappviewer/index.html?id=326598f47ca34be78e001bc2984f653a',
      winterRoads: 'https://hrm.maps.arcgis.com/apps/webappviewer/index.html?id=016a6d8d9ebb4c339d23e44219589091',
      winterSidewalks: 'https://hrm.maps.arcgis.com/apps/webappviewer/index.html?id=e1a41ad4fcd24fcfa40cc9bfb5048d56'
    };
  }

  // Initialize the transit service (non-blocking)
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load Halifax Transit data from our existing datasets (always available)
      await this.loadHalifaxTransitData();
      await this.loadHalifaxInteractiveData();
      this.isInitialized = true;

      // Try to initialize Transit API service in background (non-blocking)
      this.initializeTransitAPIInBackground();

  
      // Start simulated real-time updates (will switch to real-time if API becomes available)
      this.startSimulatedUpdates();

    } catch (error) {
      console.error('Failed to initialize TransitService:', error);
      // Fallback to static data
      this.loadStaticHalifaxData();
      this.startSimulatedUpdates();
      this.isInitialized = true;
    }
  }

  // Initialize Transit API service in background (non-blocking)
  async initializeTransitAPIInBackground() {
    try {
      console.log('Attempting to initialize Transit API service in background...');

      // Get Transit API service directly to avoid circular dependency
      const { default: transitAPIService } = await import('./transitAPIService.js');
      this.transitAPIService = transitAPIService;

      if (!this.transitAPIService) {
        console.warn('Transit API service module not available');
        this.useTransitAPI = false;
        return;
      }

      // Test API connectivity with timeout
      const apiInitialized = await Promise.race([
        this.transitAPIService.initialize(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('API initialization timeout')), 10000))
      ]);
      
      this.useTransitAPI = apiInitialized;

      if (this.useTransitAPI) {
        console.log('Transit API service initialized successfully in background');
        // Upgrade to real-time updates if we were using simulated
        this.upgradeToRealtimeUpdates();
      } else {
        console.log('Transit API service initialization failed, continuing with fallback data');
      }
    } catch (error) {
      console.warn('Failed to initialize Transit API service in background:', error.message);
      console.log('Continuing with fallback Halifax data only');
      this.useTransitAPI = false;
      this.transitAPIService = null;
    }
  }

  // Upgrade from simulated to real-time updates if API becomes available
  upgradeToRealtimeUpdates() {
    if (this.useTransitAPI && this.transitAPIService) {
      console.log('Upgrading to real-time Transit API updates');
      this.startRealtimeUpdates();
    }
  }

  // Load Halifax Interactive Maps data
  async loadHalifaxInteractiveData() {
    try {
      // Load accessible parking data
      this.halifaxTransitData.accessibleParking = this.getHalifaxAccessibleParking();
      
      // Load winter roads data
      this.halifaxTransitData.winterRoads = this.getHalifaxWinterRoads();
      
      // Load winter sidewalks data
      this.halifaxTransitData.winterSidewalks = this.getHalifaxWinterSidewalks();
      
  
    } catch (error) {
      console.warn('Could not load Halifax interactive maps data:', error);
    }
  }

  // Get Halifax accessible parking data
  getHalifaxAccessibleParking() {
    return [
      {
        id: 'parking_1',
        name: 'Halifax Central Library - Accessible Parking',
        location: [-63.5742, 44.6488],
        spaces: 4,
        type: 'accessible_parking',
        features: ['wheelchair_accessible', 'ramp_access', 'wide_spaces'],
        hours: '24/7',
        description: 'Designated accessible parking spaces with ramp access'
      },
      {
        id: 'parking_2',
        name: 'Spring Garden Road - Accessible Parking',
        location: [-63.5756, 44.6423],
        spaces: 2,
        type: 'accessible_parking',
        features: ['wheelchair_accessible', 'curb_cut'],
        hours: '6:00 AM - 10:00 PM',
        description: 'Accessible parking near Spring Garden Road'
      },
      {
        id: 'parking_3',
        name: 'Dalhousie University - Accessible Parking',
        location: [-63.5912, 44.6368],
        spaces: 6,
        type: 'accessible_parking',
        features: ['wheelchair_accessible', 'ramp_access', 'wide_spaces', 'shelter'],
        hours: '24/7',
        description: 'University accessible parking with shelter'
      },
      {
        id: 'parking_4',
        name: 'Quinpool Road - Accessible Parking',
        location: [-63.5823, 44.6434],
        spaces: 3,
        type: 'accessible_parking',
        features: ['wheelchair_accessible', 'curb_cut'],
        hours: '7:00 AM - 9:00 PM',
        description: 'Accessible parking on Quinpool Road'
      }
    ];
  }

  // Get Halifax winter roads data
  getHalifaxWinterRoads() {
    return [
      {
        id: 'winter_road_1',
        name: 'Spring Garden Road - Winter Maintenance',
        location: [-63.5756, 44.6475],
        type: 'winter_road',
        status: 'maintained',
        priority: 'high',
        features: ['snow_clearing', 'salt_treatment', 'accessible_path'],
        description: 'High priority winter road maintenance route'
      },
      {
        id: 'winter_road_2',
        name: 'Barrington Street - Winter Maintenance',
        location: [-63.5742, 44.6488],
        type: 'winter_road',
        status: 'maintained',
        priority: 'high',
        features: ['snow_clearing', 'salt_treatment'],
        description: 'Major arterial road with winter maintenance'
      },
      {
        id: 'winter_road_3',
        name: 'Robie Street - Winter Maintenance',
        location: [-63.5891, 44.6456],
        type: 'winter_road',
        status: 'maintained',
        priority: 'medium',
        features: ['snow_clearing', 'accessible_path'],
        description: 'Medium priority winter road maintenance'
      },
      {
        id: 'winter_road_4',
        name: 'Quinpool Road - Winter Maintenance',
        location: [-63.5823, 44.6434],
        type: 'winter_road',
        status: 'maintained',
        priority: 'medium',
        features: ['snow_clearing', 'salt_treatment'],
        description: 'Crosstown route with winter maintenance'
      }
    ];
  }

  // Get Halifax winter sidewalks data
  getHalifaxWinterSidewalks() {
    return [
      {
        id: 'winter_sidewalk_1',
        name: 'Spring Garden Sidewalk - Winter Maintenance',
        location: [-63.5756, 44.6475],
        type: 'winter_sidewalk',
        status: 'maintained',
        priority: 'high',
        features: ['snow_clearing', 'salt_treatment', 'accessible_path', 'ramp_access'],
        description: 'High priority winter sidewalk maintenance'
      },
      {
        id: 'winter_sidewalk_2',
        name: 'Barrington Sidewalk - Winter Maintenance',
        location: [-63.5742, 44.6488],
        type: 'winter_sidewalk',
        status: 'maintained',
        priority: 'high',
        features: ['snow_clearing', 'accessible_path'],
        description: 'Major sidewalk with winter maintenance'
      },
      {
        id: 'winter_sidewalk_3',
        name: 'Dalhousie Campus Sidewalks - Winter Maintenance',
        location: [-63.5912, 44.6368],
        type: 'winter_sidewalk',
        status: 'maintained',
        priority: 'high',
        features: ['snow_clearing', 'salt_treatment', 'accessible_path', 'ramp_access'],
        description: 'University campus sidewalks with winter maintenance'
      },
      {
        id: 'winter_sidewalk_4',
        name: 'Quinpool Sidewalk - Winter Maintenance',
        location: [-63.5823, 44.6434],
        type: 'winter_sidewalk',
        status: 'maintained',
        priority: 'medium',
        features: ['snow_clearing', 'accessible_path'],
        description: 'Crosstown sidewalk with winter maintenance'
      }
    ];
  }

  // Get accessible parking near a location
  async getNearbyAccessibleParking(latitude, longitude, radius = 500) {
    try {
      const nearbyParking = this.halifaxTransitData.accessibleParking.filter(parking => {
        const distance = this.calculateDistance(
          latitude, longitude,
          parking.location[1], parking.location[0]
        );
        return distance <= radius;
      });
      
      return nearbyParking.sort((a, b) => {
        const distanceA = this.calculateDistance(
          latitude, longitude,
          a.location[1], a.location[0]
        );
        const distanceB = this.calculateDistance(
          latitude, longitude,
          b.location[1], b.location[0]
        );
        return distanceA - distanceB;
      });
    } catch (error) {
      console.warn('Could not find nearby accessible parking:', error);
      return [];
    }
  }

  // Get winter maintenance status for a location
  async getWinterMaintenanceStatus(latitude, longitude) {
    try {
      const nearbyRoads = this.halifaxTransitData.winterRoads.filter(road => {
        const distance = this.calculateDistance(
          latitude, longitude,
          road.location[1], road.location[0]
        );
        return distance <= 200; // 200m radius
      });

      const nearbySidewalks = this.halifaxTransitData.winterSidewalks.filter(sidewalk => {
        const distance = this.calculateDistance(
          latitude, longitude,
          sidewalk.location[1], sidewalk.location[0]
        );
        return distance <= 200; // 200m radius
      });

      return {
        roads: nearbyRoads,
        sidewalks: nearbySidewalks,
        hasWinterMaintenance: nearbyRoads.length > 0 || nearbySidewalks.length > 0,
        maintenancePriority: this.getHighestPriority([...nearbyRoads, ...nearbySidewalks])
      };
    } catch (error) {
      console.warn('Could not get winter maintenance status:', error);
      return {
        roads: [],
        sidewalks: [],
        hasWinterMaintenance: false,
        maintenancePriority: 'unknown'
      };
    }
  }

  // Get highest priority from maintenance items
  getHighestPriority(items) {
    if (items.length === 0) return 'unknown';
    
    const priorities = ['high', 'medium', 'low'];
    const highestPriority = items.reduce((highest, item) => {
      const currentIndex = priorities.indexOf(item.priority);
      const highestIndex = priorities.indexOf(highest);
      return currentIndex < highestIndex ? item.priority : highest;
    }, 'low');
    
    return highestPriority;
  }

  // Get Halifax transit summary with enhanced data
  getHalifaxTransitSummary() {
    return {
      totalRoutes: this.halifaxTransitData.routes.length,
      totalStops: this.halifaxTransitData.stops.length,
      activeBuses: this.busLocations.size,
      serviceStatus: 'operational',
      lastUpdated: new Date().toISOString(),
      coverage: 'Halifax Regional Municipality',
      accessibility: {
        wheelchairAccessible: this.halifaxTransitData.routes.filter(r => 
          r.accessibility.includes('wheelchair_accessible')
        ).length,
        totalRoutes: this.halifaxTransitData.routes.length
      },
      winterMaintenance: {
        maintainedRoads: this.halifaxTransitData.winterRoads.length,
        maintainedSidewalks: this.halifaxTransitData.winterSidewalks.length,
        accessibleParking: this.halifaxTransitData.accessibleParking.length
      },
      interactiveMaps: {
        accessibleParking: this.halifaxMaps.accessibleParking,
        winterRoads: this.halifaxMaps.winterRoads,
        winterSidewalks: this.halifaxMaps.winterSidewalks
      }
    };
  }

  // Get comprehensive transit information for a location
  async getLocationTransitInfo(latitude, longitude) {
    try {
      const [nearbyStops, nearbyParking, winterStatus] = await Promise.all([
        this.getNearbyStops(latitude, longitude, 500),
        this.getNearbyAccessibleParking(latitude, longitude, 500),
        this.getWinterMaintenanceStatus(latitude, longitude)
      ]);

      return {
        nearbyStops,
        nearbyParking,
        winterStatus,
        transitOptions: this.getTransitOptions(nearbyStops),
        accessibilityFeatures: this.getAccessibilityFeatures(nearbyStops, nearbyParking, winterStatus)
      };
    } catch (error) {
      console.error('Error getting location transit info:', error);
      return null;
    }
  }

  // Get transit options from nearby stops
  getTransitOptions(stops) {
    const routes = new Set();
    stops.forEach(stop => {
      stop.routes.forEach(route => routes.add(route));
    });

    return Array.from(routes).map(routeId => {
      const route = this.activeRoutes.get(routeId);
      return route ? {
        id: routeId,
        name: route.name,
        number: route.number,
        frequency: route.frequency,
        accessibility: route.accessibility
      } : null;
    }).filter(Boolean);
  }

  // Get accessibility features for a location
  getAccessibilityFeatures(stops, parking, winterStatus) {
    const features = {
      wheelchairAccessible: false,
      accessibleParking: false,
      winterMaintenance: false,
      rampAccess: false,
      shelter: false,
      lighting: false
    };

    // Check stops for accessibility
    stops.forEach(stop => {
      if (stop.accessibility.includes('wheelchair_accessible')) features.wheelchairAccessible = true;
      if (stop.accessibility.includes('shelter')) features.shelter = true;
      if (stop.accessibility.includes('lighting')) features.lighting = true;
    });

    // Check parking for accessibility
    if (parking.length > 0) features.accessibleParking = true;
    parking.forEach(park => {
      if (park.features.includes('ramp_access')) features.rampAccess = true;
    });

    // Check winter maintenance
    if (winterStatus.hasWinterMaintenance) features.winterMaintenance = true;

    return features;
  }

  // Load Halifax Transit data from existing datasets
  async loadHalifaxTransitData() {
    try {
      // Load transit routes from our existing data
      const routesResponse = await fetch(`${this.baseUrl}/Transit_Bus_Routes.geojson`);
      const stopsResponse = await fetch(`${this.baseUrl}/Bus_Stops_2_9086297843420881686.geojson`);
      
      if (routesResponse.ok) {
        const routesData = await routesResponse.json();
        this.halifaxTransitData.routes = this.processHalifaxRoutes(routesData);
      }
      
      if (stopsResponse.ok) {
        const stopsData = await stopsResponse.json();
        this.halifaxTransitData.stops = this.processHalifaxStops(stopsData);
      }
      
      // Generate realistic schedules
      this.generateHalifaxSchedules();
      
  
    } catch (error) {
      console.warn('Could not load Halifax transit data, using fallback:', error);
      this.loadStaticHalifaxData();
    }
  }

  // Process Halifax transit routes from GeoJSON
  processHalifaxRoutes(routesData) {
    if (!routesData.features) return [];
    
    return routesData.features.map((feature, index) => {
      const properties = feature.properties || {};
      return {
        id: properties.ROUTE_ID || `route_${index}`,
        name: properties.ROUTE_NAME || `Halifax Route ${index + 1}`,
        number: properties.ROUTE_NUMBER || (index + 1).toString(),
        type: 'bus',
        status: 'active',
        frequency: this.getHalifaxFrequency(properties.ROUTE_TYPE),
        description: properties.DESCRIPTION || '',
        coordinates: feature.geometry?.coordinates || [],
        color: this.getRouteColor(index),
        accessibility: this.getRouteAccessibility(properties.ROUTE_TYPE)
      };
    });
  }

  // Process Halifax bus stops from GeoJSON
  processHalifaxStops(stopsData) {
    if (!stopsData.features) return [];
    
    return stopsData.features.map((feature, index) => {
      const properties = feature.properties || {};
      return {
        id: properties.STOP_ID || `stop_${index}`,
        name: properties.STOP_NAME || `Halifax Stop ${index + 1}`,
        location: feature.geometry?.coordinates || [-63.5756, 44.6475],
        routes: properties.ROUTES ? properties.ROUTES.split(',') : [],
        accessibility: this.getStopAccessibility(properties),
        amenities: this.getStopAmenities(properties),
        type: 'bus_stop'
      };
    });
  }

  // Generate realistic Halifax transit schedules
  generateHalifaxSchedules() {
    this.halifaxTransitData.routes.forEach(route => {
      const schedule = this.createHalifaxSchedule(route);
      this.halifaxTransitData.schedules.set(route.id, schedule);
    });
  }

  // Create realistic schedule for a Halifax route
  createHalifaxSchedule(route) {
    const schedule = {
      weekdays: [],
      weekends: [],
      holidays: []
    };

    // Generate weekday schedule (6 AM - 11 PM)
    for (let hour = 6; hour <= 23; hour++) {
      const baseFrequency = this.getHalifaxFrequency(route.type);
      const intervals = this.getIntervalsFromFrequency(baseFrequency);
      
      intervals.forEach(interval => {
        const time = new Date();
        time.setHours(hour, interval, 0, 0);
        schedule.weekdays.push(time.toISOString());
      });
    }

    // Generate weekend schedule (7 AM - 10 PM, less frequent)
    for (let hour = 7; hour <= 22; hour++) {
      const intervals = [0, 30]; // Every 30 minutes on weekends
      intervals.forEach(interval => {
        const time = new Date();
        time.setHours(hour, interval, 0, 0);
        schedule.weekends.push(time.toISOString());
      });
    }

    return schedule;
  }

  // Get frequency based on route type
  getHalifaxFrequency(routeType) {
    const frequencies = {
      'EXPRESS': '15-20 minutes',
      'LOCAL': '10-15 minutes',
      'CROSSTOWN': '20-30 minutes',
      'COMMUTER': '30-60 minutes',
      'default': '15-20 minutes'
    };
    return frequencies[routeType] || frequencies.default;
  }

  // Get intervals from frequency string
  getIntervalsFromFrequency(frequency) {
    if (frequency.includes('10-15')) return [0, 10, 20, 30, 40, 50];
    if (frequency.includes('15-20')) return [0, 15, 30, 45];
    if (frequency.includes('20-30')) return [0, 20, 40];
    if (frequency.includes('30-60')) return [0, 30];
    return [0, 15, 30, 45]; // Default
  }

  // Get route color based on index
  getRouteColor(index) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
    return colors[index % colors.length];
  }

  // Get route accessibility features
  getRouteAccessibility(routeType) {
    const features = ['wheelchair_accessible'];
    
    if (routeType === 'EXPRESS') {
      features.push('priority_seating', 'audio_announcements');
    }
    
    return features;
  }

  // Get stop accessibility features
  getStopAccessibility(properties) {
    const features = [];
    
    if (properties.ACCESSIBLE === 'YES') {
      features.push('wheelchair_accessible');
    }
    
    if (properties.SHELTER === 'YES') {
      features.push('shelter', 'seating');
    }
    
    if (properties.LIGHTING === 'YES') {
      features.push('lighting');
    }
    
    return features;
  }

  // Get stop amenities
  getStopAmenities(properties) {
    const amenities = [];
    
    if (properties.BENCH === 'YES') amenities.push('bench');
    if (properties.TRASH === 'YES') amenities.push('trash_bin');
    if (properties.BIKE_RACK === 'YES') amenities.push('bike_rack');
    
    return amenities;
  }

  // Load static Halifax data as fallback
  loadStaticHalifaxData() {
    this.halifaxTransitData.routes = this.getStaticHalifaxRoutes();
    this.halifaxTransitData.stops = this.getStaticHalifaxStops();
    this.generateHalifaxSchedules();
  }

  // Get static Halifax routes
  getStaticHalifaxRoutes() {
    return [
      {
        id: '1',
        name: 'Route 1 - Spring Garden',
        number: '1',
        type: 'LOCAL',
        status: 'active',
        frequency: '10-15 minutes',
        description: 'Spring Garden Road corridor',
        coordinates: [[-63.5756, 44.6475], [-63.5729, 44.6512]],
        color: '#FF6B6B',
        accessibility: ['wheelchair_accessible', 'priority_seating']
      },
      {
        id: '2',
        name: 'Route 2 - Barrington',
        number: '2',
        type: 'LOCAL',
        status: 'active',
        frequency: '12-18 minutes',
        description: 'Barrington Street corridor',
        coordinates: [[-63.5742, 44.6488], [-63.5715, 44.6525]],
        color: '#4ECDC4',
        accessibility: ['wheelchair_accessible']
      },
      {
        id: '3',
        name: 'Route 3 - Robie',
        number: '3',
        type: 'EXPRESS',
        status: 'active',
        frequency: '15-20 minutes',
        description: 'Robie Street express',
        coordinates: [[-63.5891, 44.6456], [-63.5864, 44.6493]],
        color: '#45B7D1',
        accessibility: ['wheelchair_accessible', 'priority_seating', 'audio_announcements']
      },
      {
        id: '4',
        name: 'Route 4 - Quinpool',
        number: '4',
        type: 'CROSSTOWN',
        status: 'active',
        frequency: '20-30 minutes',
        description: 'Quinpool Road crosstown',
        coordinates: [[-63.5823, 44.6434], [-63.5796, 44.6471]],
        color: '#96CEB4',
        accessibility: ['wheelchair_accessible']
      }
    ];
  }

  // Get static Halifax stops
  getStaticHalifaxStops() {
    return [
      {
        id: 'stop_1',
        name: 'Spring Garden & Barrington',
        location: [-63.5756, 44.6475],
        routes: ['1', '2'],
        accessibility: ['wheelchair_accessible', 'shelter', 'lighting'],
        amenities: ['bench', 'trash_bin'],
        type: 'bus_stop'
      },
      {
        id: 'stop_2',
        name: 'Dalhousie University',
        location: [-63.5912, 44.6368],
        routes: ['1', '3'],
        accessibility: ['wheelchair_accessible', 'shelter'],
        amenities: ['bench', 'bike_rack'],
        type: 'bus_stop'
      },
      {
        id: 'stop_3',
        name: 'Halifax Central Library',
        location: [-63.5742, 44.6488],
        routes: ['1', '2', '4'],
        accessibility: ['wheelchair_accessible', 'shelter', 'lighting'],
        amenities: ['bench', 'trash_bin', 'bike_rack'],
        type: 'bus_stop'
      },
      {
        id: 'stop_4',
        name: 'Quinpool & Robie',
        location: [-63.5823, 44.6434],
        routes: ['3', '4'],
        accessibility: ['wheelchair_accessible'],
        amenities: ['bench'],
        type: 'bus_stop'
      }
    ];
  }

  // Load transit routes (now returns Halifax data)
  async loadTransitRoutes() {
    if (this.halifaxTransitData.routes.length > 0) {
      this.activeRoutes = new Map(this.halifaxTransitData.routes.map(route => [route.id, route]));
      return this.halifaxTransitData.routes;
    }
    return this.getStaticHalifaxRoutes();
  }

  // Load bus stops (now returns Halifax data)
  async loadBusStops() {
    return this.halifaxTransitData.stops.length > 0 
      ? this.halifaxTransitData.stops 
      : this.getStaticHalifaxStops();
  }

  // Get simulated real-time bus locations
  async getBusLocations(routeId = null) {
    const buses = this.generateSimulatedBusLocations(routeId);
    this.busLocations = new Map(buses.map(bus => [bus.id, bus]));
    return buses;
  }

  // Generate simulated bus locations
  generateSimulatedBusLocations(routeId = null) {
    const buses = [];
    const routes = routeId ? [this.activeRoutes.get(routeId)] : Array.from(this.activeRoutes.values());
    
    routes.forEach(route => {
      if (!route) return;
      
      // Generate 2-4 buses per route
      const busCount = Math.floor(Math.random() * 3) + 2;
      
      for (let i = 0; i < busCount; i++) {
        const progress = (i / busCount) + (Math.random() * 0.3); // Random position along route
        const location = this.interpolateLocation(route.coordinates, progress);
        
        buses.push({
          id: `bus_${route.id}_${i}`,
          routeId: route.id,
          routeName: route.name,
          location: location,
          status: 'active',
          timestamp: new Date().toISOString(),
          delay: Math.floor(Math.random() * 300), // 0-5 minutes delay
          capacity: Math.floor(Math.random() * 40) + 10, // 10-50 passengers
          accessibility: route.accessibility
        });
      }
    });
    
    return buses;
  }

  // Interpolate location along route
  interpolateLocation(coordinates, progress) {
    if (!coordinates || coordinates.length < 2) {
      return [-63.5756, 44.6475]; // Default Halifax location
    }
    
    const totalDistance = coordinates.length - 1;
    const index = Math.floor(progress * totalDistance);
    const nextIndex = Math.min(index + 1, totalDistance);
    const localProgress = (progress * totalDistance) - index;
    
    const start = coordinates[index];
    const end = coordinates[nextIndex];
    
    return [
      start[0] + (end[0] - start[0]) * localProgress,
      start[1] + (end[1] - start[1]) * localProgress
    ];
  }

  // Get real-time arrival times for a specific stop
  async getArrivalTimes(stopId) {
    const cacheKey = `arrivals_${stopId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const arrivals = this.generateSimulatedArrivals(stopId);
    
    // Cache the result
    this.cache.set(cacheKey, {
      data: arrivals,
      timestamp: Date.now()
    });
    
    return arrivals;
  }

  // Generate simulated arrival times
  generateSimulatedArrivals(stopId) {
    const stop = this.halifaxTransitData.stops.find(s => s.id === stopId);
    if (!stop) return [];

    const arrivals = [];
    const now = new Date();
    
    stop.routes.forEach(routeId => {
      const route = this.activeRoutes.get(routeId);
      if (!route) return;
      
      const schedule = this.halifaxTransitData.schedules.get(routeId);
      if (!schedule) return;
      
      // Generate next 3 arrivals for this route
      for (let i = 1; i <= 3; i++) {
        const arrivalTime = new Date(now.getTime() + (i * 15 + Math.random() * 10) * 60000);
        arrivals.push({
          routeId: routeId,
          routeName: route.name,
          routeNumber: route.number,
          destination: this.getRouteDestination(route),
          arrivalTime: arrivalTime.toISOString(),
          status: Math.random() > 0.8 ? 'delayed' : 'on_time',
          delay: Math.random() > 0.8 ? Math.floor(Math.random() * 300) : 0,
          accessibility: route.accessibility
        });
      }
    });
    
    // Sort by arrival time
    return arrivals.sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime));
  }

  // Get route destination
  getRouteDestination(route) {
    const destinations = {
      '1': 'Spring Garden Terminal',
      '2': 'Barrington Terminal',
      '3': 'Robie Express Terminal',
      '4': 'Quinpool Terminal'
    };
    return destinations[route.number] || 'Halifax Terminal';
  }

  // Get route information including real-time status
  async getRouteInfo(routeId) {
    try {
      const [routeData, busLocations] = await Promise.all([
        this.getRouteDetails(routeId),
        this.getBusLocations(routeId)
      ]);

      return {
        ...routeData,
        buses: busLocations,
        status: this.calculateRouteStatus(busLocations),
        delays: this.calculateDelays(busLocations, routeData.schedule)
      };
    } catch (error) {
      console.error('Error getting route info:', error);
      return null;
    }
  }

  // Calculate route status based on bus locations
  calculateRouteStatus(buses) {
    if (!buses || buses.length === 0) {
      return 'no_service';
    }

    const activeBuses = buses.filter(bus => bus.status === 'active');
    const delayedBuses = buses.filter(bus => bus.delay > 300); // 5+ minutes delay

    if (delayedBuses.length > activeBuses.length * 0.5) {
      return 'major_delays';
    } else if (delayedBuses.length > 0) {
      return 'minor_delays';
    } else {
      return 'on_time';
    }
  }

  // Calculate delays for buses
  calculateDelays(buses, schedule) {
    if (!buses || !schedule) return [];

    return buses.map(bus => {
      const scheduledTime = this.findScheduledTime(bus.stopId, bus.routeId);
      const actualTime = new Date(bus.timestamp);
      const delay = actualTime - scheduledTime;

      return {
        busId: bus.id,
        routeId: bus.routeId,
        stopId: bus.stopId,
        delay: Math.max(0, delay),
        status: delay > 300 ? 'delayed' : 'on_time'
      };
    });
  }

  // Start real-time updates using Transit API
  startRealtimeUpdates() {
    if (!this.useTransitAPI || !this.transitAPIService) {
      console.log('Transit API not available, using simulated updates');
      this.startSimulatedUpdates();
      return;
    }

    console.log('Starting real-time Transit API updates');

    // Update bus locations and arrival times every 30 seconds
    setInterval(async () => {
      try {
        await this.updateRealtimeData();
      } catch (error) {
        console.warn('Failed to update real-time data:', error);
      }
    }, 30000);
  }

  // Update real-time data using Transit API
  async updateRealtimeData() {
    try {
      // Get active stops from our Halifax data
      const activeStops = this.getActiveStops();

      if (activeStops.length === 0) return;

      // Convert our stop IDs to Transit API format (this may need adjustment)
      const transitStopIds = activeStops.slice(0, 10); // Limit to 10 stops per request

      // Get real-time arrivals from Transit API
      const realtimeData = await this.transitAPIService.getRealtimeArrivals(transitStopIds);

      if (realtimeData && realtimeData.length > 0) {
        // Process and cache the real-time data
        this.processRealtimeArrivals(realtimeData);
        console.log(`Updated real-time data for ${realtimeData.length} arrivals`);
      }
    } catch (error) {
      console.error('Error updating real-time data:', error);
    }
  }

  // Process real-time arrivals from Transit API
  processRealtimeArrivals(realtimeData) {
    realtimeData.forEach(arrival => {
      const stopId = arrival.stopId || arrival.stop_id;
      const routeId = arrival.routeId || arrival.route_id;

      if (!this.arrivalTimes.has(stopId)) {
        this.arrivalTimes.set(stopId, []);
      }

      const arrivals = this.arrivalTimes.get(stopId);

      // Convert Transit API format to our internal format
      const internalArrival = this.convertTransitArrivalToInternal(arrival);

      // Update or add the arrival
      const existingIndex = arrivals.findIndex(a => a.routeId === routeId);
      if (existingIndex >= 0) {
        arrivals[existingIndex] = internalArrival;
      } else {
        arrivals.push(internalArrival);
      }

      // Sort by arrival time
      arrivals.sort((a, b) => new Date(a.arrivalTime) - new Date(b.arrivalTime));
    });
  }

  // Convert Transit API arrival to internal format
  convertTransitArrivalToInternal(transitArrival) {
    return {
      routeId: transitArrival.routeId || transitArrival.route_id,
      routeName: transitArrival.routeName || transitArrival.route_name || transitArrival.trip_headsign,
      routeNumber: transitArrival.routeNumber || transitArrival.route_short_name,
      destination: transitArrival.destination || transitArrival.trip_headsign || transitArrival.headsign,
      arrivalTime: transitArrival.arrivalTime || new Date((transitArrival.timestamp || Date.now()/1000) * 1000).toISOString(),
      status: transitArrival.delay > 300 ? 'delayed' : 'on_time',
      delay: transitArrival.delay || 0,
      accessibility: transitArrival.wheelchair_accessible ? ['wheelchair_accessible'] : [],
      stopId: transitArrival.stopId,
      source: 'transit_api'
    };
  }

  // Start simulated real-time updates (fallback)
  startSimulatedUpdates() {
    console.log('Starting simulated real-time updates');

    // Update bus locations every 30 seconds
    setInterval(async () => {
      try {
        await this.getBusLocations();
      } catch (error) {
        console.warn('Failed to update bus locations:', error);
      }
    }, 30000);

    // Update arrival times every 60 seconds
    setInterval(async () => {
      try {
        // Update arrival times for active stops
        const activeStops = this.getActiveStops();
        for (const stopId of activeStops) {
          await this.getArrivalTimes(stopId);
        }
      } catch (error) {
        console.warn('Failed to update arrival times:', error);
      }
    }, 60000);
  }

  // Get active stops (stops with recent activity)
  getActiveStops() {
    const activeStops = new Set();
    
    // Get stops from bus locations
    this.busLocations.forEach(bus => {
      if (bus.stopId) {
        activeStops.add(bus.stopId);
      }
    });

    // Add some random stops for variety
    this.halifaxTransitData.stops.slice(0, 3).forEach(stop => {
      activeStops.add(stop.id);
    });

    return Array.from(activeStops);
  }

  // Get route details
  async getRouteDetails(routeId) {
    const route = this.activeRoutes.get(routeId);
    if (!route) {
      throw new Error(`Route ${routeId} not found`);
    }
    return route;
  }

  // Find scheduled time for a bus at a specific stop
  findScheduledTime(stopId, routeId) {
    const schedule = this.halifaxTransitData.schedules.get(routeId);
    if (!schedule) return new Date();
    
    const now = new Date();
    const dayType = this.getDayType(now);
    const times = schedule[dayType] || schedule.weekdays;
    
    if (times.length === 0) return new Date();
    
    // Find next scheduled time
    const nextTime = times.find(time => new Date(time) > now);
    return nextTime ? new Date(nextTime) : new Date();
  }

  // Get day type for schedule
  getDayType(date) {
    const day = date.getDay();
    if (day === 0 || day === 6) return 'weekends';
    return 'weekdays';
  }

  // Get nearby transit stops
  async getNearbyStops(latitude, longitude, radius = 500) {
    try {
      // Try Transit API first if available
      if (this.useTransitAPI && this.transitAPIService) {
        const transitStops = await this.getNearbyStopsFromAPI(latitude, longitude, radius);
        if (transitStops && transitStops.length > 0) {
          console.log(`Found ${transitStops.length} stops from Transit API`);
          return transitStops;
        }
      }

      // Fallback to our Halifax data
      console.log('Using Halifax fallback data for nearby stops');
      const nearbyStops = this.halifaxTransitData.stops.filter(stop => {
        const distance = this.calculateDistance(
          latitude, longitude,
          stop.location[1], stop.location[0]
        );
        return distance <= radius;
      });
      
      return nearbyStops.sort((a, b) => {
        const distanceA = this.calculateDistance(
          latitude, longitude,
          a.location[1], a.location[0]
        );
        const distanceB = this.calculateDistance(
          latitude, longitude,
          b.location[1], b.location[0]
        );
        return distanceA - distanceB;
      });
    } catch (error) {
      console.warn('Could not find nearby stops:', error);
      return this.getStaticHalifaxStops().slice(0, 3);
    }
  }

  // Get nearby stops from Transit API
  async getNearbyStopsFromAPI(latitude, longitude, radius = 500) {
    try {
      // Check if Transit API is available
      if (!this.transitAPIService || !this.transitAPIService.isAvailable()) {
        console.log('Transit API not available for nearby stops');
        return null;
      }

      const stopsData = await this.transitAPIService.getStopsNearLocation(latitude, longitude, radius);

      if (!stopsData || !stopsData.stops) {
        return null;
      }

      // Convert Transit API stops to our internal format
      const stops = stopsData.stops.map(stop =>
        this.transitAPIService.convertStopToInternalFormat(stop)
      );

      // Sort by distance
      return stops.sort((a, b) => {
        const distanceA = this.calculateDistance(latitude, longitude, a.location[1], a.location[0]);
        const distanceB = this.calculateDistance(latitude, longitude, b.location[1], b.location[0]);
        return distanceA - distanceB;
      });

    } catch (error) {
      console.error('Error fetching stops from Transit API:', error);
      return null;
    }
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  }

  // Get transit directions between two points
  async getTransitDirections(origin, destination, time = null) {
    try {
      // Try Transit API first if available
      if (this.useTransitAPI && this.transitAPIService) {
        const apiDirections = await this.getTransitDirectionsFromAPI(origin, destination, time);
        if (apiDirections) {
          console.log('Using Transit API for directions');
          return apiDirections;
        }
      }

      // Fallback to our existing method
      console.log('Using fallback method for transit directions');
      const originStops = await this.getNearbyStops(origin.lat, origin.lng, 300);
      const destStops = await this.getNearbyStops(destination.lat, destination.lng, 300);
      
      if (originStops.length === 0 || destStops.length === 0) {
        return this.getFallbackDirections(origin, destination);
      }
      
      // Find routes that connect origin and destination
      const routes = this.findConnectingRoutes(originStops[0], destStops[0]);
      
      if (routes.length === 0) {
        return this.getFallbackDirections(origin, destination);
      }
      
      // Generate transit directions
      return this.generateTransitDirections(origin, destination, routes, originStops[0], destStops[0]);
    } catch (error) {
      console.warn('Could not generate transit directions:', error);
      return this.getFallbackDirections(origin, destination);
    }
  }

  // Get transit directions from Transit API
  async getTransitDirectionsFromAPI(origin, destination, time = null) {
    try {
      // Check if Transit API is available
      if (!this.transitAPIService || !this.transitAPIService.isAvailable()) {
        console.log('Transit API not available for directions');
        return null;
      }

      const tripPlan = await this.transitAPIService.getTripPlan(
        origin.lat, origin.lng, destination.lat, destination.lng,
        {
          mode: 'transit',
          maxWalkDistance: 1000,
          numItineraries: 1,
          time: time
        }
      );

      if (!tripPlan || !tripPlan.itineraries || tripPlan.itineraries.length === 0) {
        return null;
      }

      const itinerary = tripPlan.itineraries[0];
      const routes = [{
        duration: itinerary.duration,
        transfers: itinerary.transfers || 0,
        legs: []
      }];

      // Convert itinerary legs to our format
      for (const leg of itinerary.legs) {
        if (leg.mode === 'WALK') {
          routes[0].legs.push({
            mode: 'walk',
            duration: leg.duration || 0,
            distance: leg.distance || 0,
            instructions: leg.instructions || 'Walk to transit stop',
            startLocation: leg.from || origin,
            endLocation: leg.to || destination
          });
        } else if (leg.mode === 'BUS' || leg.mode === 'TRANSIT') {
          routes[0].legs.push({
            mode: 'bus',
            routeId: leg.route_id || leg.route,
            routeName: leg.route_name || leg.route || 'Unknown Route',
            routeNumber: leg.route_short_name || leg.route || 'Unknown',
            duration: leg.duration || 0,
            distance: leg.distance || 0,
            headsign: leg.headsign || leg.trip_headsign,
            accessibility: leg.wheelchair_accessible ? ['wheelchair_accessible'] : [],
            agency: leg.agency_name || 'Halifax Transit',
            poweredByTransit: true
          });
        }
      }

      return {
        routes: routes,
        poweredByTransit: true,
        source: 'transit_api'
      };

    } catch (error) {
      console.error('Error getting transit directions from API:', error);
      return null;
    }
  }

  // Find routes that connect two stops
  findConnectingRoutes(originStop, destStop) {
    const originRoutes = new Set(originStop.routes);
    const destRoutes = new Set(destStop.routes);
    
    // Direct routes
    const directRoutes = Array.from(originRoutes).filter(route => destRoutes.has(route));
    
    if (directRoutes.length > 0) {
      return directRoutes.map(routeId => ({
        type: 'direct',
        routeId: routeId,
        route: this.activeRoutes.get(routeId)
      }));
    }
    
    // Indirect routes (would require transfers)
    return Array.from(originRoutes).slice(0, 2).map(routeId => ({
      type: 'indirect',
      routeId: routeId,
      route: this.activeRoutes.get(routeId)
    }));
  }

  // Generate transit directions
  generateTransitDirections(origin, destination, routes, originStop, destStop) {
    const route = routes[0];
    const routeData = route.route;
    
    return {
      routes: [
        {
          duration: 1800, // 30 minutes
          transfers: routes.length > 1 ? 1 : 0,
          legs: [
            {
              mode: 'walk',
              duration: 300, // 5 minutes
              distance: this.calculateDistance(
                origin.lat, origin.lng,
                originStop.location[1], originStop.location[0]
              )
            },
            {
              mode: 'bus',
              routeId: route.routeId,
              routeName: routeData.name,
              routeNumber: routeData.number,
              duration: 1200, // 20 minutes
              distance: this.calculateDistance(
                originStop.location[1], originStop.location[0],
                destStop.location[1], destStop.location[0]
              ),
              accessibility: routeData.accessibility
            },
            {
              mode: 'walk',
              duration: 300, // 5 minutes
              distance: this.calculateDistance(
                destStop.location[1], destStop.location[0],
                destination.lat, destination.lng
              )
            }
          ]
        }
      ]
    };
  }

  // Fallback transit directions
  getFallbackDirections(origin, destination) {
    return {
      routes: [
        {
          duration: 1800, // 30 minutes
          transfers: 1,
          legs: [
            {
              mode: 'walk',
              duration: 300,
              distance: 200
            },
            {
              mode: 'bus',
              routeId: '1',
              routeName: 'Route 1 - Spring Garden',
              routeNumber: '1',
              duration: 1200,
              distance: 2000,
              accessibility: ['wheelchair_accessible', 'priority_seating']
            },
            {
              mode: 'walk',
              duration: 300,
              distance: 150
            }
          ]
        }
      ]
    };
  }
}

// Create singleton instance
const transitService = new TransitService();

export default transitService;
