import React, { useState, useEffect } from 'react';
import transitService from '../services/transitService';
import halifaxTransitDataService from '../services/halifaxTransitDataService';
import '../transit-accessibility.css';

const TransitInfo = ({ isOpen, onClose }) => {
  const [transitData, setTransitData] = useState({
    routes: [],
    stops: [],
    buses: [],
    arrivals: [],
    nearbyRoutes: [],
    serviceAlerts: [],
    schedules: [],
    accessibleStops: [],
    summary: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Get user location for nearby routes
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Could not get user location for transit data:', error);
            // Use Halifax as fallback
            setUserLocation({ lat: 44.6488, lng: -63.5752 });
          }
        );
      } else {
        // Use Halifax as fallback
        setUserLocation({ lat: 44.6488, lng: -63.5752 });
      }
      
      loadTransitData();
      const interval = setInterval(loadTransitData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadTransitData = async () => {
    try {
      setLoading(true);
      
      // Initialize both services with error handling
      try {
        await Promise.all([
          transitService.initialize(),
          halifaxTransitDataService.initialize()
        ]);
      } catch (error) {
        console.warn('Some services failed to initialize:', error);
        // Continue with partial initialization
      }
      
      // Load comprehensive transit data with fallbacks
      console.log('🚌 Loading transit data...');
      
      const [routes, stops, buses, summary, schedules, accessibleStops] = await Promise.allSettled([
        Promise.resolve(halifaxTransitDataService.getAllRoutes()).catch((error) => {
          console.warn('Failed to load routes:', error);
          return [];
        }),
        Promise.resolve(halifaxTransitDataService.getAllStops()).catch((error) => {
          console.warn('Failed to load stops:', error);
          return [];
        }),
        transitService.getBusLocations().catch((error) => {
          console.warn('Failed to load bus locations:', error);
          return [];
        }),
        Promise.resolve(halifaxTransitDataService.getServiceStatus()).catch((error) => {
          console.warn('Failed to load service status:', error);
          return {
            totalRoutes: 0,
            totalStops: 0,
            accessibleRoutes: 0,
            accessibilityPercentage: 0,
            serviceStatus: 'Unknown',
            lastUpdated: new Date().toISOString()
          };
        }),
        Promise.resolve(halifaxTransitDataService.getAllRoutes()).then(routes => 
          routes.map(route => halifaxTransitDataService.getRouteSchedule(route.id))
        ).catch((error) => {
          console.warn('Failed to load schedules:', error);
          return [];
        }),
        Promise.resolve(halifaxTransitDataService.getAccessibleStops()).catch((error) => {
          console.warn('Failed to load accessible stops:', error);
          return [];
        })
      ]).then(results => results.map(result => result.status === 'fulfilled' ? result.value : []));

      console.log('📊 Loaded data:', {
        routes: routes.length,
        stops: stops.length,
        buses: buses.length,
        summary: summary,
        schedules: schedules.length,
        accessibleStops: accessibleStops.length
      });

      // Load real-time data if user location is available
      let nearbyRoutes = [];
      let serviceAlerts = [];
      
      if (userLocation) {
        try {
          const [nearbyRoutesData, alertsData] = await Promise.all([
            transitService.getNearbyRoutes(userLocation.lat, userLocation.lng),
            transitService.getServiceAlerts(userLocation.lat, userLocation.lng)
          ]);
          
          nearbyRoutes = nearbyRoutesData || [];
          serviceAlerts = alertsData || [];
        } catch (error) {
          console.warn('Error loading real-time transit data:', error);
        }
      }

      setTransitData({
        routes,
        stops,
        buses,
        arrivals: [],
        nearbyRoutes,
        serviceAlerts,
        schedules: schedules.filter(Boolean),
        accessibleStops,
        summary
      });
    } catch (error) {
      console.error('Error loading transit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  if (loading) {
    return (
      <div className="transit-info-overlay">
        <div className="transit-info-modal">
          <div className="loading-spinner"></div>
          <p>Loading Halifax Transit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transit-info-overlay">
      <div className="transit-info-modal">
        <div className="transit-info-header">
          <h2>🚌 Halifax Transit Information</h2>
          <button 
            className="transit-info-close"
            onClick={onClose}
            aria-label="Close transit information"
          >
            ✕
          </button>
        </div>

        <div className="transit-info-tabs">
          <button 
            className={`transit-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`transit-tab ${activeTab === 'schedules' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            Schedules
          </button>
          <button 
            className={`transit-tab ${activeTab === 'accessible' ? 'active' : ''}`}
            onClick={() => setActiveTab('accessible')}
          >
            ♿ Accessible
          </button>
          <button 
            className={`transit-tab ${activeTab === 'nearby' ? 'active' : ''}`}
            onClick={() => setActiveTab('nearby')}
          >
            Nearby
          </button>
          <button 
            className={`transit-tab ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts
          </button>
        </div>

        <div className="transit-info-content">
          {activeTab === 'overview' && (
            <div className="transit-overview">
              {transitData.summary && (
                <div className="transit-summary">
                  <div className="summary-card">
                    <h3>Service Status</h3>
                    <div className="summary-item">
                      <span className="summary-label">Status:</span>
                      <span className="summary-value status-operational">
                        {transitData.summary?.serviceStatus || 'Loading...'}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Coverage:</span>
                      <span className="summary-value">{transitData.summary?.coverage || 'Loading...'}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Last Updated:</span>
                      <span className="summary-value">
                        {transitData.summary?.lastUpdated ? formatTime(transitData.summary.lastUpdated) : 'Loading...'}
                      </span>
                    </div>
                  </div>

                  <div className="summary-stats">
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary?.totalRoutes || 0}</div>
                      <div className="stat-label">Active Routes</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary?.totalStops || 0}</div>
                      <div className="stat-label">Bus Stops</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary?.activeBuses || 0}</div>
                      <div className="stat-label">Active Buses</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary?.accessibility?.wheelchairAccessible || 0}</div>
                      <div className="stat-label">Accessible Routes</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className="transit-schedules">
              <h3>📅 Route Schedules</h3>
              <div className="schedules-grid">
                {transitData.schedules.slice(0, 20).map((schedule) => (
                  <div key={schedule.routeId} className="schedule-card">
                    <div className="schedule-header">
                      <div className="route-info">
                        <span className="route-number">{schedule.routeNumber}</span>
                        <span className="route-name">{schedule.routeName}</span>
                      </div>
                      <div className="route-type">
                        {schedule.routeId >= 100 && schedule.routeId < 200 && '🚀 Express'}
                        {schedule.routeId >= 200 && schedule.routeId < 300 && '🚇 Metro'}
                        {schedule.routeId >= 300 && schedule.routeId < 400 && '🚌 Regional'}
                        {schedule.routeId >= 400 && '⭐ Special'}
                        {schedule.routeId < 100 && '🚌 Local'}
                      </div>
                    </div>
                    
                    <div className="schedule-details">
                      <div className="service-hours">
                        <div className="weekday-hours">
                          <strong>Weekday:</strong> {schedule.weekday.firstTrip} - {schedule.weekday.lastTrip}
                          <br />
                          <small>Frequency: {schedule.weekday.frequency}</small>
                        </div>
                        {schedule.weekend.frequency && (
                          <div className="weekend-hours">
                            <strong>Weekend:</strong> {schedule.weekend.firstTrip} - {schedule.weekend.lastTrip}
                            <br />
                            <small>Frequency: {schedule.weekend.frequency}</small>
                          </div>
                        )}
                      </div>
                      
                      <div className="accessibility-features">
                        {schedule.accessibility.map((feature, idx) => (
                          <span key={idx} className="accessibility-badge">
                            {feature === 'wheelchair_accessible' && '♿'}
                            {feature === 'priority_seating' && '🪑'}
                            {feature === 'audio_announcements' && '🔊'}
                            {feature === 'low_floor' && '📱'}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      className="view-details-btn"
                      onClick={() => setSelectedRoute(schedule)}
                    >
                      View Full Schedule
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'accessible' && (
            <div className="transit-accessible">
              <h3>♿ Accessible Transit Information</h3>
              
              <div className="accessibility-summary">
                <div className="summary-stats">
                  <div className="stat-card">
                    <div className="stat-number">{transitData.summary?.accessibleRoutes || 0}</div>
                    <div className="stat-label">Accessible Routes</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{transitData.accessibleStops?.length || 0}</div>
                    <div className="stat-label">Accessible Stops</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{transitData.summary?.accessibilityPercentage || 0}%</div>
                    <div className="stat-label">Accessibility Coverage</div>
                  </div>
                </div>
              </div>

              <div className="accessible-features">
                <h4>🚌 Accessible Features</h4>
                <div className="features-grid">
                  <div className="feature-card">
                    <div className="feature-icon">♿</div>
                    <div className="feature-content">
                      <h5>Wheelchair Accessible</h5>
                      <p>All buses are equipped with wheelchair ramps and securement areas</p>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">🪑</div>
                    <div className="feature-content">
                      <h5>Priority Seating</h5>
                      <p>Designated priority seating for seniors and people with disabilities</p>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">🔊</div>
                    <div className="feature-content">
                      <h5>Audio Announcements</h5>
                      <p>Next stop announcements on all express and metro routes</p>
                    </div>
                  </div>
                  <div className="feature-card">
                    <div className="feature-icon">📱</div>
                    <div className="feature-content">
                      <h5>Low Floor Buses</h5>
                      <p>Low-floor design for easier boarding and alighting</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="accessible-stops-list">
                <h4>📍 Accessible Stops Near You</h4>
                {userLocation ? (
                  <div className="stops-grid">
                    {transitData.accessibleStops.slice(0, 10).map((stop) => (
                      <div key={stop.id} className="stop-card">
                        <div className="stop-header">
                          <span className="stop-number">#{stop.stopNumber}</span>
                          <span className="stop-accessible">♿</span>
                        </div>
                        <div className="stop-info">
                          <div className="stop-location">{stop.location}</div>
                          <div className="stop-features">
                            {stop.winterPlow && <span className="feature-tag">❄️ Winter Service</span>}
                            {stop.winterMaintenance && <span className="feature-tag">🔧 Maintained</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Enable location access to see accessible stops near you.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'nearby' && (
            <div className="transit-nearby">
              <h3>🚌 Routes Near You</h3>
              {userLocation ? (
                <div className="nearby-routes-list">
                  {transitData.nearbyRoutes.length > 0 ? (
                    transitData.nearbyRoutes.map((route) => (
                      <div key={route.id} className="nearby-route-item">
                        <div className="route-header">
                          <span className="route-number">{route.route_short_name || route.short_name}</span>
                          <span className="route-name">{route.route_long_name || route.long_name}</span>
                        </div>
                        <div className="route-details">
                          <span className="route-type">{route.route_type === 3 ? 'Bus' : 'Transit'}</span>
                          {route.departures && route.departures.length > 0 && (
                            <div className="departures">
                              <span className="departure-label">Next departures:</span>
                              {route.departures.slice(0, 3).map((departure, index) => (
                                <span key={index} className="departure-time">
                                  {formatTime(departure.arrival_time || departure.departure_time)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No nearby routes found. Try expanding your search radius.</p>
                  )}
                </div>
              ) : (
                <p>Location access required to show nearby routes.</p>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="transit-alerts">
              <h3>⚠️ Service Alerts</h3>
              <div className="alerts-list">
                {transitData.serviceAlerts.length > 0 ? (
                  transitData.serviceAlerts.map((alert) => (
                    <div key={alert.id} className="alert-item">
                      <div className="alert-header">
                        <span className="alert-type">{alert.alert_type || 'Service Alert'}</span>
                        <span className="alert-severity">{alert.severity || 'Info'}</span>
                      </div>
                      <div className="alert-content">
                        <h4>{alert.header_text || alert.title}</h4>
                        <p>{alert.description_text || alert.description}</p>
                        {alert.active_period && (
                          <div className="alert-period">
                            <span>Active: {formatTime(alert.active_period.start)} - {formatTime(alert.active_period.end)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No service alerts at this time.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="transit-routes">
              <h3>All Active Routes</h3>
              <div className="routes-list">
                {transitData.routes.map((route) => (
                  <div key={route.id} className="route-item">
                    <div className="route-header">
                      <span className="route-number">{route.number}</span>
                      <span className="route-name">{route.name}</span>
                    </div>
                    <div className="route-details">
                      <span className="route-frequency">Every {route.frequency} minutes</span>
                      <span className="route-status">{route.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stops' && (
            <div className="transit-stops">
              <h3>Bus Stops</h3>
              <div className="stops-list">
                {transitData.stops.slice(0, 20).map((stop) => (
                  <div key={stop.id} className="stop-item">
                    <div className="stop-header">
                      <span className="stop-name">{stop.name}</span>
                      <span className="stop-code">{stop.code}</span>
                    </div>
                    <div className="stop-details">
                      <span className="stop-routes">{stop.routes.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div className="transit-live">
              <h3>Live Bus Locations</h3>
              <div className="live-buses">
                {transitData.buses.map((bus) => (
                  <div key={bus.id} className="bus-item">
                    <div className="bus-header">
                      <span className="bus-number">Bus {bus.number}</span>
                      <span className="bus-route">Route {bus.route}</span>
                    </div>
                    <div className="bus-details">
                      <span className="bus-status">{bus.status}</span>
                      <span className="bus-speed">{bus.speed} km/h</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TransitApp Attribution */}
        <div className="transit-attribution">
          <div className="transit-logo">
            <img
              src="/transit-api-badge@3x.png"
              alt="Powered by Transit"
              className="transit-logo-img"
              onError={(e) => {
                console.warn('Transit logo failed to load, trying alternative path');
                e.target.src = './transit-api-badge@3x.png';
                e.target.onerror = () => {
                  console.warn('Transit logo not found, hiding element');
                  e.target.style.display = 'none';
                };
              }}
            />
            <span className="transit-attribution-text">Powered by Transit</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransitInfo;
