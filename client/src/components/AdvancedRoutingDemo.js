import React, { useState, useEffect } from 'react';
import AdvancedRoutingService from '../services/advancedRoutingService';

const AdvancedRoutingDemo = () => {
  const [routingService] = useState(() => new AdvancedRoutingService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [testRoute, setTestRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeService = async () => {
      try {
        await routingService.initialize();
        setIsInitialized(true);
        console.log('Advanced routing service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize routing service:', error);
        setError('Failed to initialize routing service');
      }
    };

    initializeService();
  }, [routingService]);

  const testRouteCalculation = async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      // Test route from Halifax City Hall to Halifax Public Gardens
      const route = await routingService.calculateRoute(
        'Halifax City Hall, Halifax, NS',
        'Halifax Public Gardens, Halifax, NS',
        'walking',
        {
          avoidSteps: true,
          wheelchair: false,
          preferAccessible: true
        }
      );

      setTestRoute(route);
      console.log('Test route calculated:', route);
    } catch (error) {
      console.error('Route calculation failed:', error);
      setError(`Route calculation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testMultiModalRoute = async () => {
    if (!isInitialized) return;

    setLoading(true);
    setError(null);

    try {
      // Test transit route
      const route = await routingService.calculateRoute(
        'Halifax City Hall, Halifax, NS',
        'Halifax Public Gardens, Halifax, NS',
        'transit',
        {
          avoidSteps: true,
          wheelchair: false,
          preferAccessible: true
        }
      );

      setTestRoute(route);
      console.log('Transit route calculated:', route);
    } catch (error) {
      console.error('Transit route calculation failed:', error);
      setError(`Transit route calculation failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRouteStats = () => {
    if (!isInitialized) return null;
    return routingService.getRouteStats();
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'var(--font-family)'
    }}>
      <h1 style={{ color: 'var(--color-text-primary)' }}>Advanced AI-Driven Routing Demo</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Service Status</h2>
        <p>Initialized: {isInitialized ? '✅ Yes' : '❌ No'}</p>
        {error && (
          <div style={{
            backgroundColor: 'var(--color-error-50)',
            color: 'var(--color-error-700)',
            padding: '10px',
            borderRadius: '8px',
            marginTop: '10px'
          }}>
            Error: {error}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Test Routes</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            onClick={testRouteCalculation}
            disabled={!isInitialized || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-primary-500)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isInitialized && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? 'Calculating...' : 'Test Walking Route'}
          </button>
          
          <button
            onClick={testMultiModalRoute}
            disabled={!isInitialized || loading}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-secondary-500)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isInitialized && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? 'Calculating...' : 'Test Transit Route'}
          </button>
        </div>
      </div>

      {testRoute && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Route Results</h2>
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-light)'
          }}>
            <h3>Route Summary</h3>
            <p><strong>Type:</strong> {testRoute.type}</p>
            <p><strong>Features:</strong> {testRoute.features?.length || 0}</p>
            
            {testRoute.features?.map((feature, index) => (
              <div key={index} style={{ marginTop: '10px', padding: '10px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '4px' }}>
                <h4>Feature {index + 1}</h4>
                <p><strong>Mode:</strong> {feature.properties.mode}</p>
                <p><strong>Distance:</strong> {feature.properties.distance?.toFixed(2)} km</p>
                <p><strong>Duration:</strong> {Math.round(feature.properties.duration)} min</p>
                <p><strong>Accessibility:</strong> {(feature.properties.accessibility * 100).toFixed(1)}%</p>
                <p><strong>Color:</strong> {feature.properties.color}</p>
              </div>
            ))}

            {testRoute.instructions && (
              <div style={{ marginTop: '15px' }}>
                <h3>Turn-by-Turn Instructions</h3>
                {testRoute.instructions.map((instruction, index) => (
                  <div key={index} style={{ marginTop: '5px', padding: '5px' }}>
                    <strong>{instruction.step}.</strong> {instruction.instruction}
                  </div>
                ))}
              </div>
            )}

            {testRoute.predictedAccessibility && (
              <div style={{ marginTop: '10px' }}>
                <p><strong>AI Predicted Accessibility:</strong> {(testRoute.predictedAccessibility * 100).toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {isInitialized && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Service Statistics</h2>
          <div style={{
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid var(--color-border-light)'
          }}>
            {(() => {
              const stats = getRouteStats();
              if (!stats) return <p>No statistics available yet.</p>;
              
              return (
                <>
                  <p><strong>Total Routes Calculated:</strong> {stats.totalRoutes}</p>
                  <p><strong>Average Accessibility:</strong> {(stats.averageAccessibility * 100).toFixed(1)}%</p>
                  <p><strong>Most Used Paths:</strong> {stats.mostUsedPaths?.length || 0}</p>
                  <p><strong>Accessibility Trends:</strong> {stats.accessibilityTrends?.length || 0}</p>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h2>Features Implemented</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '5px' }}>✅ Graph-based routing with A* algorithm</li>
          <li style={{ marginBottom: '5px' }}>✅ Multi-modal routing (walking, driving, transit)</li>
          <li style={{ marginBottom: '5px' }}>✅ Accessibility-aware pathfinding</li>
          <li style={{ marginBottom: '5px' }}>✅ Turn-by-turn instructions</li>
          <li style={{ marginBottom: '5px' }}>✅ AI-powered route optimization</li>
          <li style={{ marginBottom: '5px' }}>✅ Real-time barrier detection</li>
          <li style={{ marginBottom: '5px' }}>✅ User behavior learning</li>
          <li style={{ marginBottom: '5px' }}>✅ Color-coded route visualization</li>
          <li style={{ marginBottom: '5px' }}>✅ Municipal dataset integration</li>
          <li style={{ marginBottom: '5px' }}>✅ Performance optimizations</li>
        </ul>
      </div>
    </div>
  );
};

export default AdvancedRoutingDemo;
