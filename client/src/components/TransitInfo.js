import React, { useState, useEffect } from 'react';
import transitService from '../services/transitService';

const TransitInfo = ({ isOpen, onClose }) => {
  const [transitData, setTransitData] = useState({
    routes: [],
    stops: [],
    buses: [],
    arrivals: [],
    summary: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      loadTransitData();
      const interval = setInterval(loadTransitData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadTransitData = async () => {
    try {
      setLoading(true);
      await transitService.initialize();
      
      const [routes, stops, buses, summary] = await Promise.all([
        transitService.loadTransitRoutes(),
        transitService.loadBusStops(),
        transitService.getBusLocations(),
        transitService.getHalifaxTransitSummary()
      ]);

      setTransitData({
        routes,
        stops,
        buses,
        arrivals: [],
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
            className={`transit-tab ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            Routes
          </button>
          <button 
            className={`transit-tab ${activeTab === 'stops' ? 'active' : ''}`}
            onClick={() => setActiveTab('stops')}
          >
            Stops
          </button>
          <button 
            className={`transit-tab ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            Live Data
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
                        {transitData.summary.serviceStatus}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Coverage:</span>
                      <span className="summary-value">{transitData.summary.coverage}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Last Updated:</span>
                      <span className="summary-value">
                        {formatTime(transitData.summary.lastUpdated)}
                      </span>
                    </div>
                  </div>

                  <div className="summary-stats">
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary.totalRoutes}</div>
                      <div className="stat-label">Active Routes</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary.totalStops}</div>
                      <div className="stat-label">Bus Stops</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary.activeBuses}</div>
                      <div className="stat-label">Active Buses</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{transitData.summary.accessibility.wheelchairAccessible}</div>
                      <div className="stat-label">Accessible Routes</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'routes' && (
            <div className="transit-routes">
              <h3>Active Routes</h3>
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
      </div>
    </div>
  );
};

export default TransitInfo;
