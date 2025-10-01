/**
 * Halifax Transit Data Service
 * 
 * Provides Halifax-specific transit data and information
 */

class HalifaxTransitDataService {
  constructor() {
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Halifax Transit Data Service...');
    
    this.isInitialized = true;
    console.log('✅ Halifax Transit Data Service initialized');
  }

  /**
   * Get Halifax Transit routes
   */
  async getHalifaxRoutes() {
    try {
      const cacheKey = 'halifax_routes';
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.routes;
        }
      }

      // Mock Halifax Transit routes
      const routes = [
        {
          id: 'halifax_route_1',
          name: 'Route 1 - Spring Garden',
          number: '1',
          type: 'bus',
          accessible: true,
          description: 'Spring Garden Road to Halifax Terminal',
          stops: [
            { id: 'hfx_1', name: 'Halifax Terminal', coordinates: [-63.5752, 44.6488] },
            { id: 'hfx_2', name: 'Spring Garden Road', coordinates: [-63.5806, 44.6478] },
            { id: 'hfx_3', name: 'Robie Street', coordinates: [-63.5850, 44.6500] }
          ]
        },
        {
          id: 'halifax_route_2',
          name: 'Route 2 - Dartmouth',
          number: '2',
          type: 'bus',
          accessible: true,
          description: 'Dartmouth to Halifax via MacDonald Bridge',
          stops: [
            { id: 'hfx_4', name: 'Dartmouth Terminal', coordinates: [-63.5874, 44.6421] },
            { id: 'hfx_5', name: 'MacDonald Bridge', coordinates: [-63.5800, 44.6450] },
            { id: 'hfx_1', name: 'Halifax Terminal', coordinates: [-63.5752, 44.6488] }
          ]
        },
        {
          id: 'halifax_ferry',
          name: 'Halifax Ferry',
          number: 'Ferry',
          type: 'ferry',
          accessible: true,
          description: 'Halifax to Dartmouth Ferry Service',
          stops: [
            { id: 'hfx_ferry_1', name: 'Halifax Ferry Terminal', coordinates: [-63.5700, 44.6470] },
            { id: 'hfx_ferry_2', name: 'Dartmouth Ferry Terminal', coordinates: [-63.5900, 44.6400] }
          ]
        }
      ];

      this.cache.set(cacheKey, {
        routes: routes,
        timestamp: Date.now()
      });

      return routes;
    } catch (error) {
      console.error('❌ Error getting Halifax routes:', error);
      return [];
    }
  }

  /**
   * Get Halifax Transit stops
   */
  async getHalifaxStops() {
    try {
      const cacheKey = 'halifax_stops';
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.stops;
        }
      }

      // Mock Halifax Transit stops
      const stops = [
        {
          id: 'hfx_1',
          name: 'Halifax Terminal',
          coordinates: [-63.5752, 44.6488],
          accessible: true,
          routes: ['1', '2', 'Ferry'],
          amenities: ['shelter', 'seating', 'accessible_entrance']
        },
        {
          id: 'hfx_2',
          name: 'Spring Garden Road',
          coordinates: [-63.5806, 44.6478],
          accessible: true,
          routes: ['1'],
          amenities: ['shelter', 'accessible_entrance']
        },
        {
          id: 'hfx_3',
          name: 'Robie Street',
          coordinates: [-63.5850, 44.6500],
          accessible: true,
          routes: ['1'],
          amenities: ['accessible_entrance']
        },
        {
          id: 'hfx_4',
          name: 'Dartmouth Terminal',
          coordinates: [-63.5874, 44.6421],
          accessible: true,
          routes: ['2', 'Ferry'],
          amenities: ['shelter', 'seating', 'accessible_entrance']
        },
        {
          id: 'hfx_ferry_1',
          name: 'Halifax Ferry Terminal',
          coordinates: [-63.5700, 44.6470],
          accessible: true,
          routes: ['Ferry'],
          amenities: ['shelter', 'seating', 'accessible_entrance', 'elevator']
        },
        {
          id: 'hfx_ferry_2',
          name: 'Dartmouth Ferry Terminal',
          coordinates: [-63.5900, 44.6400],
          accessible: true,
          routes: ['Ferry'],
          amenities: ['shelter', 'seating', 'accessible_entrance', 'elevator']
        }
      ];

      this.cache.set(cacheKey, {
        stops: stops,
        timestamp: Date.now()
      });

      return stops;
    } catch (error) {
      console.error('❌ Error getting Halifax stops:', error);
      return [];
    }
  }

  /**
   * Get real-time transit information
   */
  async getRealTimeInfo(stopId) {
    try {
      const cacheKey = `realtime_${stopId}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache for real-time data
          return cached.info;
        }
      }

      // Mock real-time information
      const info = {
        stopId: stopId,
        arrivals: [
          {
            route: '1',
            destination: 'Spring Garden Road',
            arrivalTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            accessible: true
          },
          {
            route: '2',
            destination: 'Dartmouth',
            arrivalTime: new Date(Date.now() + 12 * 60 * 1000), // 12 minutes from now
            accessible: true
          }
        ],
        lastUpdated: new Date()
      };

      this.cache.set(cacheKey, {
        info: info,
        timestamp: Date.now()
      });

      return info;
    } catch (error) {
      console.error('❌ Error getting real-time info:', error);
      return null;
    }
  }

  /**
   * Get accessibility information for a stop
   */
  async getStopAccessibility(stopId) {
    try {
      const stops = await this.getHalifaxStops();
      const stop = stops.find(s => s.id === stopId);
      
      if (!stop) {
        return { accessible: false, amenities: [] };
      }

      return {
        accessible: stop.accessible,
        amenities: stop.amenities || [],
        notes: stop.accessible ? 'This stop is wheelchair accessible' : 'Accessibility information not available'
      };
    } catch (error) {
      console.error('❌ Error getting stop accessibility:', error);
      return { accessible: false, amenities: [], notes: 'Accessibility information not available' };
    }
  }
}

// Create singleton instance
const halifaxTransitDataService = new HalifaxTransitDataService();

export default halifaxTransitDataService;
