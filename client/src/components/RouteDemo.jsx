import React, { useState } from 'react';
import authService from '../services/authService';

/**
 * Route Demo Component
 * 
 * Demonstrates how user preferences affect routing
 * This would be integrated into the main routing flow
 */
export default function RouteDemo() {
  const [origin, setOrigin] = useState('44.6488,-63.5752'); // Halifax coordinates
  const [destination, setDestination] = useState('44.6519,-63.5756');
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateRoute = async () => {
    setLoading(true);
    setError(null);

    try {
      const user = authService.getCurrentUser();
      const preferences = user?.accessibility_preferences || {};

      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders()
        },
        body: JSON.stringify({
          origin: { lat: parseFloat(origin.split(',')[0]), lng: parseFloat(origin.split(',')[1]) },
          destination: { lat: parseFloat(destination.split(',')[0]), lng: parseFloat(destination.split(',')[1]) },
          mode: 'walking',
          userId: user?.id,
          preferences: preferences
        })
      });

      if (!response.ok) {
        throw new Error(`Route calculation failed: ${response.status}`);
      }

      const routeData = await response.json();
      setRoute(routeData);
    } catch (err) {
      console.error('Route calculation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const user = authService.getCurrentUser();
  const preferences = user?.accessibility_preferences || {};

  return (
    <div className="route-demo">
      <h3>Route Demo with Preferences</h3>
      <p>This demonstrates how your accessibility preferences affect routing:</p>

      <div className="demo-controls">
        <div className="input-group">
          <label>Origin (lat,lng):</label>
          <input
            type="text"
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="44.6488,-63.5752"
          />
        </div>

        <div className="input-group">
          <label>Destination (lat,lng):</label>
          <input
            type="text"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="44.6519,-63.5756"
          />
        </div>

        <button onClick={calculateRoute} disabled={loading}>
          {loading ? 'Calculating...' : 'Calculate Route'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {route && (
        <div className="route-results">
          <h4>Route Results</h4>
          
          <div className="route-info">
            <div className="info-item">
              <strong>Distance:</strong> {route.features[0]?.properties?.distance || 'N/A'} meters
            </div>
            <div className="info-item">
              <strong>Duration:</strong> {Math.round((route.features[0]?.properties?.duration || 0) / 60)} minutes
            </div>
            <div className="info-item">
              <strong>Personalized:</strong> {route.features[0]?.properties?.personalized ? 'Yes' : 'No'}
            </div>
            <div className="info-item">
              <strong>Applied Filters:</strong> {route.features[0]?.properties?.appliedFilters?.join(', ') || 'None'}
            </div>
            <div className="info-item">
              <strong>Time of Day:</strong> {route.features[0]?.properties?.timeOfDay || 'day'}
            </div>
          </div>

          <div className="preferences-applied">
            <h5>Your Active Preferences:</h5>
            <ul>
              {Object.entries(preferences).map(([key, value]) => (
                value && (
                  <li key={key}>
                    <strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {value ? 'Enabled' : 'Disabled'}
                  </li>
                )
              ))}
            </ul>
          </div>

          {route.instructions && (
            <div className="route-instructions">
              <h5>Route Instructions:</h5>
              <ol>
                {route.instructions.map((instruction, index) => (
                  <li key={index}>
                    {instruction.text}
                    {instruction.distance > 0 && (
                      <span className="instruction-distance">
                        ({Math.round(instruction.distance)}m)
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .route-demo {
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          margin: 20px 0;
          background: #f9f9f9;
        }

        .demo-controls {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 15px 0;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .input-group label {
          font-weight: 500;
          font-size: 14px;
        }

        .input-group input {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
        }

        button {
          padding: 10px 20px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        button:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .error-message {
          background: #fef2f2;
          color: #dc2626;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }

        .route-results {
          margin-top: 20px;
          padding: 15px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .route-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin: 15px 0;
        }

        .info-item {
          padding: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 14px;
        }

        .preferences-applied {
          margin: 15px 0;
        }

        .preferences-applied ul {
          list-style: none;
          padding: 0;
        }

        .preferences-applied li {
          padding: 5px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .route-instructions {
          margin: 15px 0;
        }

        .route-instructions ol {
          padding-left: 20px;
        }

        .route-instructions li {
          margin: 8px 0;
          line-height: 1.4;
        }

        .instruction-distance {
          color: #6b7280;
          font-size: 12px;
          margin-left: 8px;
        }
      `}</style>
    </div>
  );
}





