import React, { useEffect, useState } from 'react';

const MapPerformanceMonitor = ({ mapInstance, isVisible = false }) => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    memoryUsage: 0,
    tileCount: 0,
    fps: 0,
    errors: []
  });

  useEffect(() => {
    if (!mapInstance || !isVisible) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId;

    const updateMetrics = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        // Get memory usage if available
        let memoryUsage = 0;
        if (performance.memory) {
          memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        }

        // Get tile count if available
        let tileCount = 0;
        if (mapInstance && mapInstance.getStyle) {
          const style = mapInstance.getStyle();
          if (style && style.sources) {
            // This is a simplified tile count - in reality you'd need to access internal mapbox properties
            tileCount = Object.keys(style.sources).length;
          }
        }

        setMetrics(prev => ({
          ...prev,
          fps,
          memoryUsage,
          tileCount
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(updateMetrics);
    };

    updateMetrics();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [mapInstance, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="map-performance-monitor">
      <div className="monitor-header">
        <h4>Map Performance</h4>
        <button 
          onClick={() => setMetrics(prev => ({ ...prev, errors: [] }))}
          className="clear-errors-btn"
        >
          Clear Errors
        </button>
      </div>
      
      <div className="metrics-grid">
        <div className="metric">
          <span className="metric-label">FPS:</span>
          <span className={`metric-value ${metrics.fps < 30 ? 'warning' : 'good'}`}>
            {metrics.fps}
          </span>
        </div>
        
        <div className="metric">
          <span className="metric-label">Memory:</span>
          <span className={`metric-value ${metrics.memoryUsage > 100 ? 'warning' : 'good'}`}>
            {metrics.memoryUsage}MB
          </span>
        </div>
        
        <div className="metric">
          <span className="metric-label">Tiles:</span>
          <span className="metric-value">{metrics.tileCount}</span>
        </div>
        
        <div className="metric">
          <span className="metric-label">Load Time:</span>
          <span className="metric-value">{metrics.loadTime}ms</span>
        </div>
      </div>

      {metrics.errors.length > 0 && (
        <div className="errors-section">
          <h5>Recent Errors:</h5>
          <div className="error-list">
            {metrics.errors.slice(-3).map((error, index) => (
              <div key={index} className="error-item">
                <span className="error-time">{error.time}</span>
                <span className="error-message">{error.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .map-performance-monitor {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 15px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 12px;
          z-index: 1000;
          min-width: 200px;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .monitor-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
        }

        .clear-errors-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 10px;
          cursor: pointer;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .metric-label {
          color: #bdc3c7;
        }

        .metric-value {
          font-weight: 600;
        }

        .metric-value.good {
          color: #2ecc71;
        }

        .metric-value.warning {
          color: #f39c12;
        }

        .errors-section {
          border-top: 1px solid #34495e;
          padding-top: 10px;
        }

        .errors-section h5 {
          margin: 0 0 8px 0;
          font-size: 12px;
          color: #e74c3c;
        }

        .error-list {
          max-height: 80px;
          overflow-y: auto;
        }

        .error-item {
          display: flex;
          flex-direction: column;
          margin-bottom: 4px;
          padding: 4px;
          background: rgba(231, 76, 60, 0.2);
          border-radius: 4px;
        }

        .error-time {
          font-size: 10px;
          color: #bdc3c7;
        }

        .error-message {
          font-size: 11px;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
};

export default MapPerformanceMonitor;
