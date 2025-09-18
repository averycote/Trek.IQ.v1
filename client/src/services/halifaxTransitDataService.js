// Halifax Transit Data Service - Integrates local database with Transit API
class HalifaxTransitDataService {
  constructor() {
    this.baseUrl = '/api/data';
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.transitRoutes = new Map();
    this.busStops = new Map();
    this.accessibleStops = new Set();
    this.routeSchedules = new Map();
  }

  // Initialize the service with local data
  async initialize() {
    try {
      console.log('🚌 Initializing Halifax Transit Data Service...');
      
      // Load all transit data in parallel
      await Promise.all([
        this.loadTransitRoutes(),
        this.loadBusStops(),
        this.loadAccessibleStops(),
        this.generateRouteSchedules()
      ]);

      console.log('✅ Halifax Transit Data Service initialized successfully');
      console.log(`📊 Loaded ${this.transitRoutes.size} routes, ${this.busStops.size} stops, ${this.accessibleStops.size} accessible stops`);
      
      // Debug: Log some sample data
      if (this.transitRoutes.size > 0) {
        const sampleRoute = Array.from(this.transitRoutes.values())[0];
        console.log('📋 Sample route:', sampleRoute);
      }
      
      if (this.busStops.size > 0) {
        const sampleStop = Array.from(this.busStops.values())[0];
        console.log('🚏 Sample stop:', sampleStop);
      }
    } catch (error) {
      console.error('❌ Failed to initialize Halifax Transit Data Service:', error);
    }
  }

  // Load transit routes from local data
  async loadTransitRoutes() {
    try {
      console.log('📋 Loading transit routes from:', `${this.baseUrl}/transit-routes`);
      const response = await fetch(`${this.baseUrl}/transit-routes`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      console.log('📋 Received transit routes data:', data?.features?.length || 0, 'features');
      
      if (data && data.features) {
        data.features.forEach(feature => {
          const props = feature.properties;
          const routeId = props.ROUTE_NUM || props.id;
          
          if (routeId) {
            this.transitRoutes.set(routeId, {
              id: routeId,
              number: props.ROUTE_FULL || props.ROUTE_NUM,
              name: props.TITLE || `Route ${routeId}`,
              weekday: props.WEEKDAY === 'Y',
              weekend: props.WEEKEND === 'Y',
              coordinates: feature.geometry.coordinates,
              type: this.getRouteType(props.ROUTE_NUM),
              accessibility: this.getRouteAccessibility(props.ROUTE_NUM),
              frequency: this.estimateFrequency(props.ROUTE_NUM, props.WEEKDAY, props.WEEKEND)
            });
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Could not load transit routes from local data:', error);
      // Use fallback data
      this.loadFallbackTransitRoutes();
    }
  }

  // Load fallback transit routes when server data is unavailable
  loadFallbackTransitRoutes() {
    console.log('📋 Loading fallback transit routes...');
    
    const fallbackRoutes = [
      {
        id: 1,
        number: '1',
        name: 'Spring Garden Road',
        weekday: true,
        weekend: true,
        coordinates: [-63.5821, 44.6391],
        type: 'local',
        accessibility: ['wheelchair_accessible', 'priority_seating'],
        frequency: '15-30 minutes'
      },
      {
        id: 2,
        number: '2',
        name: 'Barrington Street',
        weekday: true,
        weekend: true,
        coordinates: [-63.5832, 44.6326],
        type: 'local',
        accessibility: ['wheelchair_accessible', 'priority_seating'],
        frequency: '15-30 minutes'
      },
      {
        id: 135,
        number: '135',
        name: 'Flamingo Express',
        weekday: true,
        weekend: false,
        coordinates: [-63.5821, 44.6391],
        type: 'express',
        accessibility: ['wheelchair_accessible', 'priority_seating', 'audio_announcements'],
        frequency: '15-20 minutes'
      }
    ];

    fallbackRoutes.forEach(route => {
      this.transitRoutes.set(route.id, route);
    });
    
    console.log(`✅ Loaded ${fallbackRoutes.length} fallback routes`);
  }

  // Load bus stops from local data
  async loadBusStops() {
    try {
      console.log('🚏 Loading bus stops from:', `${this.baseUrl}/bus-stops`);
      
      // Try the full endpoint first, with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
      const response = await fetch(`${this.baseUrl}/bus-stops`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 504) {
          console.warn('🚏 Full bus stops endpoint timed out, using fallback data');
          this.loadFallbackBusStops();
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🚏 Received bus stops data:', data?.features?.length || 0, 'features');
      
      if (data && data.features) {
        data.features.forEach(feature => {
          const props = feature.properties;
          const stopId = props.BUSSTOPID || props.STOPNUMBER;
          
          if (stopId) {
            const stop = {
              id: stopId,
              stopNumber: props.STOPNUMBER,
              location: props.LOCATION,
              accessible: props.ACCESSIBLE === 'Y',
              coordinates: feature.geometry.coordinates,
              winterPlow: props.WINT_PLOW === 'Y',
              winterMaintenance: props.WINT_MAINT,
              winterRoute: props.WINT_ROUTE,
              winterStatus: props.WINT_LOS,
              busStatus: props.BUSSTATUS,
              addDate: props.ADDDATE,
              modDate: props.MODDATE
            };
            
            this.busStops.set(stopId, stop);
            
            if (stop.accessible) {
              this.accessibleStops.add(stopId);
            }
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Could not load bus stops from local data:', error);
      // Use fallback data
      this.loadFallbackBusStops();
    }
  }

  // Load fallback bus stops when server data is unavailable
  loadFallbackBusStops() {
    console.log('🚏 Loading fallback bus stops...');
    
    const fallbackStops = [
      {
        id: 'BS3253',
        stopNumber: '2158',
        location: 'Williams Lake Rd Before Sagewood Ln (2158)',
        accessible: false,
        coordinates: [-63.6081, 44.6198],
        winterPlow: true,
        winterMaintenance: 'WSZ4',
        winterRoute: null,
        winterStatus: 'PRI2',
        busStatus: 'INS'
      },
      {
        id: 'BS3254',
        stopNumber: '2159',
        location: 'Spring Garden Rd at South Park St (2159)',
        accessible: true,
        coordinates: [-63.5821, 44.6391],
        winterPlow: true,
        winterMaintenance: 'WSZ1',
        winterRoute: null,
        winterStatus: 'PRI1',
        busStatus: 'INS'
      },
      {
        id: 'BS3255',
        stopNumber: '2160',
        location: 'Barrington St at Duke St (2160)',
        accessible: true,
        coordinates: [-63.5832, 44.6326],
        winterPlow: true,
        winterMaintenance: 'WSZ1',
        winterRoute: null,
        winterStatus: 'PRI1',
        busStatus: 'INS'
      }
    ];

    fallbackStops.forEach(stop => {
      this.busStops.set(stop.id, stop);
      if (stop.accessible) {
        this.accessibleStops.add(stop.id);
      }
    });
    
    console.log(`✅ Loaded ${fallbackStops.length} fallback stops`);
  }

  // Load accessible stops specifically
  async loadAccessibleStops() {
    try {
      const response = await fetch(`${this.baseUrl}/accessible-stops`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (data && data.features) {
        data.features.forEach(feature => {
          const props = feature.properties;
          if (props.ACCESSIBLE === 'Y') {
            this.accessibleStops.add(props.BUSSTOPID || props.STOPNUMBER);
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Could not load accessible stops from local data:', error);
      // Use fallback accessible stops from the bus stops we already loaded
      this.loadFallbackAccessibleStops();
    }
  }

  // Load fallback accessible stops
  loadFallbackAccessibleStops() {
    console.log('♿ Loading fallback accessible stops...');
    
    // Mark the accessible stops from our fallback bus stops
    const accessibleStopIds = ['BS3254', 'BS3255']; // From our fallback data
    
    accessibleStopIds.forEach(stopId => {
      this.accessibleStops.add(stopId);
    });
    
    console.log(`✅ Loaded ${accessibleStopIds.length} fallback accessible stops`);
  }

  // Generate route schedules based on route data
  async generateRouteSchedules() {
    for (const [routeId, route] of this.transitRoutes) {
      const schedule = this.createRouteSchedule(route);
      this.routeSchedules.set(routeId, schedule);
    }
  }

  // Create a realistic schedule for a route
  createRouteSchedule(route) {
    const schedule = {
      routeId: route.id,
      routeName: route.name,
      routeNumber: route.number,
      weekday: {
        firstTrip: '05:30',
        lastTrip: '23:30',
        frequency: route.frequency,
        peakFrequency: this.getPeakFrequency(route.frequency),
        offPeakFrequency: this.getOffPeakFrequency(route.frequency)
      },
      weekend: {
        firstTrip: '06:00',
        lastTrip: '23:00',
        frequency: route.weekend ? route.frequency : null,
        peakFrequency: route.weekend ? this.getPeakFrequency(route.frequency) : null,
        offPeakFrequency: route.weekend ? this.getOffPeakFrequency(route.frequency) : null
      },
      accessibility: route.accessibility,
      stops: this.getRouteStops(route.id)
    };

    return schedule;
  }

  // Get stops for a specific route
  getRouteStops(routeId) {
    // This would ideally be loaded from route-stop relationships
    // For now, return a subset of accessible stops
    const accessibleStops = Array.from(this.accessibleStops).slice(0, 10);
    return accessibleStops.map(stopId => this.busStops.get(stopId)).filter(Boolean);
  }

  // Determine route type based on route number
  getRouteType(routeNumber) {
    if (routeNumber >= 100 && routeNumber < 200) return 'express';
    if (routeNumber >= 200 && routeNumber < 300) return 'metro';
    if (routeNumber >= 300 && routeNumber < 400) return 'regional';
    if (routeNumber >= 400) return 'special';
    return 'local';
  }

  // Get accessibility features for a route
  getRouteAccessibility(routeNumber) {
    const features = [];
    
    // All Halifax Transit buses are wheelchair accessible
    features.push('wheelchair_accessible');
    features.push('priority_seating');
    
    // Express routes have additional features
    if (routeNumber >= 100 && routeNumber < 200) {
      features.push('audio_announcements');
      features.push('low_floor');
    }
    
    return features;
  }

  // Estimate frequency based on route type and service days
  estimateFrequency(routeNumber, weekday, weekend) {
    const type = this.getRouteType(routeNumber);
    
    switch (type) {
      case 'express':
        return weekday === 'Y' ? '15-20 minutes' : '30-60 minutes';
      case 'metro':
        return weekday === 'Y' ? '10-15 minutes' : '20-30 minutes';
      case 'local':
        return weekday === 'Y' ? '15-30 minutes' : '30-60 minutes';
      case 'regional':
        return weekday === 'Y' ? '30-60 minutes' : '60-120 minutes';
      case 'special':
        return 'On demand';
      default:
        return '15-30 minutes';
    }
  }

  // Get peak frequency (rush hour)
  getPeakFrequency(baseFrequency) {
    if (baseFrequency.includes('15-20')) return '10-15 minutes';
    if (baseFrequency.includes('10-15')) return '8-12 minutes';
    if (baseFrequency.includes('15-30')) return '10-20 minutes';
    return baseFrequency;
  }

  // Get off-peak frequency
  getOffPeakFrequency(baseFrequency) {
    if (baseFrequency.includes('15-20')) return '20-30 minutes';
    if (baseFrequency.includes('10-15')) return '15-25 minutes';
    if (baseFrequency.includes('15-30')) return '25-40 minutes';
    return baseFrequency;
  }

  // Get all routes
  getAllRoutes() {
    return Array.from(this.transitRoutes.values());
  }

  // Get accessible routes only
  getAccessibleRoutes() {
    return this.getAllRoutes().filter(route => 
      route.accessibility.includes('wheelchair_accessible')
    );
  }

  // Get route by ID
  getRoute(routeId) {
    return this.transitRoutes.get(routeId);
  }

  // Get route schedule
  getRouteSchedule(routeId) {
    return this.routeSchedules.get(routeId);
  }

  // Get all bus stops
  getAllStops() {
    return Array.from(this.busStops.values());
  }

  // Get accessible stops only
  getAccessibleStops() {
    return this.getAllStops().filter(stop => stop.accessible);
  }

  // Get stops near a location
  getStopsNearLocation(lat, lng, radius = 0.01) {
    return this.getAllStops().filter(stop => {
      const [stopLng, stopLat] = stop.coordinates;
      const distance = this.calculateDistance(lat, lng, stopLat, stopLng);
      return distance <= radius;
    });
  }

  // Get accessible stops near a location
  getAccessibleStopsNearLocation(lat, lng, radius = 0.01) {
    return this.getStopsNearLocation(lat, lng, radius).filter(stop => stop.accessible);
  }

  // Calculate distance between two points
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Get service status summary
  getServiceStatus() {
    const totalRoutes = this.transitRoutes.size;
    const accessibleRoutes = this.getAccessibleRoutes().length;
    const totalStops = this.busStops.size;
    const accessibleStops = this.accessibleStops.size;

    return {
      totalRoutes,
      accessibleRoutes,
      totalStops,
      accessibleStops,
      accessibilityPercentage: Math.round((accessibleStops / totalStops) * 100),
      serviceStatus: 'Operational',
      lastUpdated: new Date().toISOString()
    };
  }

  // Get route statistics
  getRouteStatistics() {
    const routes = this.getAllRoutes();
    const stats = {
      total: routes.length,
      byType: {},
      byAccessibility: {
        wheelchair_accessible: 0,
        priority_seating: 0,
        audio_announcements: 0
      },
      byService: {
        weekday: 0,
        weekend: 0,
        both: 0
      }
    };

    routes.forEach(route => {
      // Count by type
      const type = this.getRouteType(route.id);
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      // Count by accessibility
      route.accessibility.forEach(feature => {
        if (stats.byAccessibility[feature] !== undefined) {
          stats.byAccessibility[feature]++;
        }
      });

      // Count by service
      if (route.weekday && route.weekend) {
        stats.byService.both++;
      } else if (route.weekday) {
        stats.byService.weekday++;
      } else if (route.weekend) {
        stats.byService.weekend++;
      }
    });

    return stats;
  }
}

// Create singleton instance
const halifaxTransitDataService = new HalifaxTransitDataService();

export default halifaxTransitDataService;
