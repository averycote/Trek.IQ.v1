import { useEffect, useRef, useMemo } from 'react';

const HeatmapLayer = ({ 
  barriers, 
  predictedBarriers, 
  accessibilityData, 
  isVisible = true,
  intensity = 0.8,
  radius = 25,
  blur = 15,
  maxZoom = 10,
  gradient = null,
  onHeatmapClick,
  isDarkMode = false,
  map = null // Pass map instance from parent
}) => {
  const heatmapLayerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Process data for heatmap visualization
  const processHeatmapData = useMemo(() => {
    const data = [];
    
    // Add actual barriers
    if (barriers && barriers.length > 0) {
      barriers.forEach(barrier => {
        const severity = getBarrierSeverity(barrier);
        data.push({
          lat: barrier.geometry.coordinates[1],
          lng: barrier.geometry.coordinates[0],
          intensity: severity * intensity,
          type: 'actual',
          barrier: barrier
        });
      });
    }

    // Add predicted barriers with confidence scoring
    if (predictedBarriers && predictedBarriers.length > 0) {
      predictedBarriers.forEach(prediction => {
        const confidence = prediction.confidence || 0.5;
        const severity = prediction.severity?.level || 5;
        const normalizedSeverity = severity / 10;
        
        data.push({
          lat: prediction.location.lat,
          lng: prediction.location.lng,
          intensity: normalizedSeverity * confidence * intensity * 0.7, // Slightly lower for predictions
          type: 'predicted',
          prediction: prediction
        });
      });
    }

    // Add accessibility data for safe zones
    if (accessibilityData && accessibilityData.length > 0) {
      accessibilityData.forEach(point => {
        const accessibilityScore = point.accessibilityScore || 0.5;
        // Invert score for heatmap (higher accessibility = lower intensity)
        const invertedIntensity = (1 - accessibilityScore) * intensity * 0.3;
        
        data.push({
          lat: point.lat,
          lng: point.lng,
          intensity: invertedIntensity,
          type: 'accessibility',
          accessibility: point
        });
      });
    }

    return data;
  }, [barriers, predictedBarriers, accessibilityData, intensity]);

  // Helper function to get barrier severity
  const getBarrierSeverity = (barrier) => {
    const severity = barrier.properties?.severity || 'medium';
    const severityMap = {
      'low': 0.3,
      'medium': 0.6,
      'high': 0.8,
      'critical': 1.0
    };
    return severityMap[severity] || 0.5;
  };

  // Create heatmap layer using Mapbox GL JS
  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !isVisible) return;

    const heatmapData = processHeatmapData;
    if (heatmapData.length === 0) return;

    // Convert data to GeoJSON format for Mapbox
    const geojsonData = {
      type: 'FeatureCollection',
      features: heatmapData.map(point => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.lng, point.lat]
        },
        properties: {
          intensity: point.intensity,
          type: point.type,
          data: point
        }
      }))
    };

    const heatmapSourceId = 'heatmap-source';
    const heatmapLayerId = 'heatmap-layer';

    // Remove existing heatmap if it exists
    if (map.getLayer(heatmapLayerId)) {
      map.removeLayer(heatmapLayerId);
    }
    if (map.getSource(heatmapSourceId)) {
      map.removeSource(heatmapSourceId);
    }

    // Add heatmap source
    map.addSource(heatmapSourceId, {
      type: 'geojson',
      data: geojsonData
    });

    // Add heatmap layer
    map.addLayer({
      id: heatmapLayerId,
      type: 'heatmap',
      source: heatmapSourceId,
      paint: {
        // Increase the heatmap weight based on intensity
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'intensity'],
          0, 0,
          1, 1
        ],
        // Increase the heatmap color weight by zoom level
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          maxZoom, 3
        ],
        // Color ramp for heatmap
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 255, 0)',
          0.2, 'rgba(0, 0, 255, 0.5)',
          0.4, 'rgba(0, 255, 0, 0.5)',
          0.6, 'rgba(255, 255, 0, 0.5)',
          0.8, 'rgba(255, 0, 0, 0.5)',
          1, 'rgba(255, 0, 0, 1)'
        ],
        // Adjust the heatmap radius by zoom level
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, radius / 2,
          maxZoom, radius * 2
        ],
        // Transition from heatmap to circle layer by zoom level
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 1,
          maxZoom, 0.8
        ]
      }
    });

    // Add click handler for heatmap
    map.on('click', heatmapLayerId, (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [heatmapLayerId] });
      if (features.length > 0 && onHeatmapClick) {
        const feature = features[0];
        onHeatmapClick(feature.properties.data, e.lngLat);
      }
    });

    // Store reference for cleanup
    heatmapLayerRef.current = {
      sourceId: heatmapSourceId,
      layerId: heatmapLayerId
    };

    return () => {
      if (map && heatmapLayerRef.current) {
        const { sourceId, layerId } = heatmapLayerRef.current;
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(sourceId)) {
          map.removeSource(sourceId);
        }
      }
    };
  }, [map, isVisible, processHeatmapData, onHeatmapClick, maxZoom, radius]);

  // Animate heatmap intensity
  useEffect(() => {
    if (!map || !isVisible) return;

    let intensity = 0.5;
    let increasing = true;

    const animate = () => {
      if (increasing) {
        intensity += 0.01;
        if (intensity >= 1) {
          increasing = false;
        }
      } else {
        intensity -= 0.01;
        if (intensity <= 0.5) {
          increasing = true;
        }
      }

      // Update heatmap intensity
      if (map.getLayer('heatmap-layer')) {
        map.setPaintProperty('heatmap-layer', 'heatmap-intensity', [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, intensity,
          maxZoom, intensity * 3
        ]);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, isVisible, maxZoom]);

  // Update heatmap when data changes
  useEffect(() => {
    if (!map || !map.isStyleLoaded() || !isVisible) return;

    const heatmapData = processHeatmapData;
    const sourceId = 'heatmap-source';

    if (map.getSource(sourceId)) {
      const geojsonData = {
        type: 'FeatureCollection',
        features: heatmapData.map(point => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [point.lng, point.lat]
          },
          properties: {
            intensity: point.intensity,
            type: point.type,
            data: point
          }
        }))
      };

      map.getSource(sourceId).setData(geojsonData);
    }
  }, [processHeatmapData, map, isVisible]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Return null since this is a layer component that modifies the map
  return null;
};

export default HeatmapLayer;
