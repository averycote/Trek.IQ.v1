import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChartBarIcon, ClockIcon, CpuChipIcon, ServerIcon } from '@heroicons/react/24/outline';

const PerformanceMonitor = ({ isVisible = false, onClose }) => {
  const [metrics, setMetrics] = useState({
    routeCalculations: [],
    dataLoads: [],
    renderTimes: [],
    memoryUsage: [],
    networkRequests: [],
    cacheHits: 0,
    cacheMisses: 0
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState({
    fps: 0,
    memory: 0,
    networkLatency: 0,
    activeConnections: 0
  });

  // Performance monitoring interval
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      updateCurrentMetrics();
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // Update current performance metrics
  const updateCurrentMetrics = useCallback(() => {
    // FPS calculation
    const fps = calculateFPS();
    
    // Memory usage
    const memory = performance.memory ? 
      Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
    
    // Network latency (simulated)
    const networkLatency = Math.random() * 100 + 20; // 20-120ms
    
    // Active connections (simulated)
    const activeConnections = Math.floor(Math.random() * 10) + 1;

    setCurrentMetrics({
      fps,
      memory,
      networkLatency: Math.round(networkLatency),
      activeConnections
    });
  }, []);

  // Calculate FPS
  const calculateFPS = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrame = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        return fps;
      }
      
      requestAnimationFrame(countFrame);
    };
    
    requestAnimationFrame(countFrame);
    return 60; // Default fallback
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    console.log('Performance monitoring started');
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('Performance monitoring stopped');
  }, []);

  // Record route calculation time
  const recordRouteCalculation = useCallback((duration) => {
    setMetrics(prev => ({
      ...prev,
      routeCalculations: [...prev.routeCalculations.slice(-99), {
        timestamp: Date.now(),
        duration,
        success: duration < 5000 // Consider successful if under 5 seconds
      }]
    }));
  }, []);

  // Record data load time
  const recordDataLoad = useCallback((duration, dataset) => {
    setMetrics(prev => ({
      ...prev,
      dataLoads: [...prev.dataLoads.slice(-99), {
        timestamp: Date.now(),
        duration,
        dataset,
        success: duration < 10000 // Consider successful if under 10 seconds
      }]
    }));
  }, []);

  // Record render time
  const recordRenderTime = useCallback((component, duration) => {
    setMetrics(prev => ({
      ...prev,
      renderTimes: [...prev.renderTimes.slice(-99), {
        timestamp: Date.now(),
        component,
        duration,
        success: duration < 100 // Consider successful if under 100ms
      }]
    }));
  }, []);

  // Record network request
  const recordNetworkRequest = useCallback((url, duration, status) => {
    setMetrics(prev => ({
      ...prev,
      networkRequests: [...prev.networkRequests.slice(-99), {
        timestamp: Date.now(),
        url,
        duration,
        status,
        success: status >= 200 && status < 400
      }]
    }));
  }, []);

  // Record cache hit/miss
  const recordCacheEvent = useCallback((isHit) => {
    setMetrics(prev => ({
      ...prev,
      cacheHits: prev.cacheHits + (isHit ? 1 : 0),
      cacheMisses: prev.cacheMisses + (isHit ? 0 : 1)
    }));
  }, []);

  // Calculate performance statistics
  const performanceStats = useMemo(() => {
    const routeAvg = metrics.routeCalculations.length > 0 ?
      metrics.routeCalculations.reduce((sum, calc) => sum + calc.duration, 0) / metrics.routeCalculations.length : 0;
    
    const dataLoadAvg = metrics.dataLoads.length > 0 ?
      metrics.dataLoads.reduce((sum, load) => sum + load.duration, 0) / metrics.dataLoads.length : 0;
    
    const renderAvg = metrics.renderTimes.length > 0 ?
      metrics.renderTimes.reduce((sum, render) => sum + render.duration, 0) / metrics.renderTimes.length : 0;
    
    const networkAvg = metrics.networkRequests.length > 0 ?
      metrics.networkRequests.reduce((sum, req) => sum + req.duration, 0) / metrics.networkRequests.length : 0;
    
    const cacheHitRate = metrics.cacheHits + metrics.cacheMisses > 0 ?
      (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100 : 0;

    return {
      routeAvg: Math.round(routeAvg),
      dataLoadAvg: Math.round(dataLoadAvg),
      renderAvg: Math.round(renderAvg * 100) / 100,
      networkAvg: Math.round(networkAvg),
      cacheHitRate: Math.round(cacheHitRate)
    };
  }, [metrics]);

  // Performance status indicators
  const getPerformanceStatus = useCallback((value, thresholds) => {
    if (value <= thresholds.good) return { status: 'good', color: 'text-green-600', bg: 'bg-green-100' };
    if (value <= thresholds.warning) return { status: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'poor', color: 'text-red-600', bg: 'bg-red-100' };
  }, []);

  const fpsStatus = getPerformanceStatus(currentMetrics.fps, { good: 50, warning: 30 });
  const memoryStatus = getPerformanceStatus(currentMetrics.memory, { good: 100, warning: 200 });
  const latencyStatus = getPerformanceStatus(currentMetrics.networkLatency, { good: 50, warning: 100 });

  if (!isVisible) return null;

  return (
    <div className="performance-monitor">
      <div className="monitor-header">
        <div className="monitor-title">
          <ChartBarIcon className="w-5 h-5" />
          <span>Performance Monitor</span>
        </div>
        <div className="monitor-controls">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`monitor-button ${isMonitoring ? 'stop' : 'start'}`}
          >
            {isMonitoring ? 'Stop' : 'Start'} Monitoring
          </button>
          <button onClick={onClose} className="monitor-close">
            ×
          </button>
        </div>
      </div>

      <div className="monitor-content">
        {/* Real-time Metrics */}
        <div className="metrics-section">
          <h3 className="section-title">Real-time Metrics</h3>
          <div className="metrics-grid">
            <div className={`metric-card ${fpsStatus.bg}`}>
              <div className="metric-icon">
                <ClockIcon className="w-4 h-4" />
              </div>
              <div className="metric-content">
                <div className={`metric-value ${fpsStatus.color}`}>
                  {currentMetrics.fps} FPS
                </div>
                <div className="metric-label">Frame Rate</div>
              </div>
            </div>

            <div className={`metric-card ${memoryStatus.bg}`}>
              <div className="metric-icon">
                <CpuChipIcon className="w-4 h-4" />
              </div>
              <div className="metric-content">
                <div className={`metric-value ${memoryStatus.color}`}>
                  {currentMetrics.memory} MB
                </div>
                <div className="metric-label">Memory Usage</div>
              </div>
            </div>

            <div className={`metric-card ${latencyStatus.bg}`}>
              <div className="metric-icon">
                <ServerIcon className="w-4 h-4" />
              </div>
              <div className="metric-content">
                <div className={`metric-value ${latencyStatus.color}`}>
                  {currentMetrics.networkLatency}ms
                </div>
                <div className="metric-label">Network Latency</div>
              </div>
            </div>

            <div className="metric-card bg-blue-100">
              <div className="metric-icon">
                <ServerIcon className="w-4 h-4" />
              </div>
              <div className="metric-content">
                <div className="metric-value text-blue-600">
                  {currentMetrics.activeConnections}
                </div>
                <div className="metric-label">Active Connections</div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Statistics */}
        <div className="metrics-section">
          <h3 className="section-title">Performance Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Route Calculation</div>
              <div className="stat-value">{performanceStats.routeAvg}ms avg</div>
              <div className="stat-count">{metrics.routeCalculations.length} calculations</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Data Loading</div>
              <div className="stat-value">{performanceStats.dataLoadAvg}ms avg</div>
              <div className="stat-count">{metrics.dataLoads.length} loads</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Render Time</div>
              <div className="stat-value">{performanceStats.renderAvg}ms avg</div>
              <div className="stat-count">{metrics.renderTimes.length} renders</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Network Requests</div>
              <div className="stat-value">{performanceStats.networkAvg}ms avg</div>
              <div className="stat-count">{metrics.networkRequests.length} requests</div>
            </div>

            <div className="stat-item">
              <div className="stat-label">Cache Hit Rate</div>
              <div className="stat-value">{performanceStats.cacheHitRate}%</div>
              <div className="stat-count">
                {metrics.cacheHits} hits / {metrics.cacheMisses} misses
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="metrics-section">
          <h3 className="section-title">Recent Activity</h3>
          <div className="activity-list">
            {metrics.routeCalculations.slice(-5).reverse().map((calc, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon route">🚗</div>
                <div className="activity-content">
                  <div className="activity-title">Route Calculation</div>
                  <div className="activity-details">
                    {calc.duration}ms • {calc.success ? 'Success' : 'Slow'}
                  </div>
                </div>
                <div className="activity-time">
                  {new Date(calc.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {metrics.dataLoads.slice(-3).reverse().map((load, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon data">📊</div>
                <div className="activity-content">
                  <div className="activity-title">Data Load: {load.dataset}</div>
                  <div className="activity-details">
                    {load.duration}ms • {load.success ? 'Success' : 'Slow'}
                  </div>
                </div>
                <div className="activity-time">
                  {new Date(load.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="monitor-footer">
        <div className="recommendations">
          {currentMetrics.fps < 30 && (
            <div className="recommendation warning">
              ⚠️ Low frame rate detected. Consider reducing map complexity.
            </div>
          )}
          {currentMetrics.memory > 200 && (
            <div className="recommendation warning">
              ⚠️ High memory usage. Consider clearing cache.
            </div>
          )}
          {currentMetrics.networkLatency > 100 && (
            <div className="recommendation warning">
              ⚠️ High network latency. Check connection quality.
            </div>
          )}
          {performanceStats.cacheHitRate < 50 && (
            <div className="recommendation info">
              ℹ️ Low cache hit rate. Consider optimizing caching strategy.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;
