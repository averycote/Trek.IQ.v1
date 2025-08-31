import React, { useCallback, useMemo } from 'react';
import BasicMapComponent from './BasicMapComponent';

const MapCanvas = React.memo(({
  activeLayers,
  route,
  origin,
  destination,
  routeMode,
  accessibilitySettings,
  mapPadding,
  isHeatmapVisible,
  isReportingMode,
  onRouteUpdate,
  onMapLoad
}) => {
  // Convert Set to Array for compatibility with existing component
  const activeLayersArray = useMemo(() => {
    if (!activeLayers || !(activeLayers instanceof Set)) return [];
    return Array.from(activeLayers);
  }, [activeLayers]);



  // Handle map click for barrier reporting
  const handleMapClick = useCallback((event) => {
    if (isReportingMode) {
      // Handle barrier reporting click
      console.log('Map clicked for barrier reporting:', event.latlng);
    }
  }, [isReportingMode]);

  // Debug logging for MapCanvas
  console.log('MapCanvas: Rendering with route data:', {
    hasRoute: !!route,
    routeType: route?.type,
    routeFeatures: route?.features?.length,
    routeProperties: route?.features?.[0]?.properties,
    origin,
    destination
  });

  return (
    <div className="map-canvas">
      <BasicMapComponent
        onMapLoad={onMapLoad}
        route={route}
        origin={origin}
        destination={destination}
        activeLayers={activeLayersArray}
        routeMode={routeMode}
        accessibilitySettings={accessibilitySettings}
        isReportingMode={isReportingMode}
        onMapClick={handleMapClick}
        mapPadding={mapPadding}
      />

      {/* Debug overlay for route visibility */}
      {route && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          Route: {route.features?.length || 0} features
        </div>
      )}

      {/* Map overlay for reporting mode */}
      {isReportingMode && (
        <div className="map-overlay reporting-mode">
          <div className="overlay-content">
            <div className="overlay-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
            </div>
            <div className="overlay-text">
              <h3>Report Barrier</h3>
              <p>Click on the map to report an accessibility barrier</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
