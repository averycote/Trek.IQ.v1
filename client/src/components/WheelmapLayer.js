// WheelmapLayer Component - Displays accessible places from Wheelmap API
import React, { useState, useEffect, useCallback } from 'react';
import WheelmapService from '../services/wheelmapService.js';

const WheelmapLayer = ({ 
  isVisible, 
  map, 
  bounds, 
  onLayerToggle, 
  isDarkMode = false 
}) => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [wheelchairFilter, setWheelchairFilter] = useState('yes');

  const wheelmapService = new WheelmapService();

  // Load accessible places when layer becomes visible
  useEffect(() => {
    if (isVisible && map && bounds) {
      loadAccessiblePlaces();
    } else if (!isVisible) {
      clearMarkers();
    }
  }, [isVisible, map, bounds, selectedCategory, wheelchairFilter]);

  // Load accessible places from Wheelmap API
  const loadAccessiblePlaces = useCallback(async () => {
    if (!map || !bounds) return;

    setLoading(true);
    setError(null);

    try {
      const searchBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };

      const options = {
        wheelchair: wheelchairFilter,
        category: selectedCategory === 'all' ? null : selectedCategory,
        limit: 100
      };

      const data = await wheelmapService.searchAccessiblePlaces(searchBounds, options);
      setPlaces(data.places || []);
      
      // Add markers to map
      addMarkersToMap(data.places);

    } catch (error) {
      console.error('Error loading accessible places:', error);
      setError('Failed to load accessible places');
    } finally {
      setLoading(false);
    }
  }, [map, bounds, selectedCategory, wheelchairFilter]);

  // Add markers to the map
  const addMarkersToMap = useCallback((placesData) => {
    if (!map) return;

    // Clear existing markers
    clearMarkers();

    const newMarkers = placesData.map(place => {
      const markerElement = createMarkerElement(place);
      
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'bottom'
      })
        .setLngLat(place.coordinates)
        .addTo(map);

      // Add popup with place information
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px'
      }).setHTML(createPopupContent(place));

      marker.setPopup(popup);

      return marker;
    });

    setMarkers(newMarkers);
  }, [map]);

  // Create marker element
  const createMarkerElement = (place) => {
    const markerEl = document.createElement('div');
    markerEl.className = 'wheelmap-marker';
    
    const accessibilityColor = place.color;
    const icon = place.icon;
    const name = place.name;
    
    markerEl.innerHTML = `
      <div class="marker-container" style="background-color: ${accessibilityColor}">
        <div class="marker-icon">${icon}</div>
        <div class="marker-glow"></div>
      </div>
    `;

    // Add click handler
    markerEl.addEventListener('click', () => {
      // Handle marker click
      console.log('Clicked on:', place.name);
    });

    return markerEl;
  };

  // Create popup content
  const createPopupContent = (place) => {
    const accessibilityDetails = place.accessibility;
    const features = accessibilityDetails.features.map(f => f.description).join(', ');
    
    return `
      <div class="wheelmap-popup">
        <div class="popup-header">
          <h3>${place.name}</h3>
          <div class="accessibility-badge" style="background-color: ${place.color}">
            ${place.wheelchair === 'yes' ? '♿ Accessible' : 
              place.wheelchair === 'limited' ? '♿ Limited' : 
              place.wheelchair === 'no' ? '❌ Not Accessible' : '❓ Unknown'}
          </div>
        </div>
        <div class="popup-content">
          <p><strong>Category:</strong> ${place.category}</p>
          ${place.address.street ? `<p><strong>Address:</strong> ${place.address.street}${place.address.housenumber ? ` ${place.address.housenumber}` : ''}</p>` : ''}
          ${features ? `<p><strong>Features:</strong> ${features}</p>` : ''}
          <p><strong>Accessibility Score:</strong> ${accessibilityDetails.rating}/100</p>
        </div>
        <div class="popup-footer">
          <a href="https://wheelmap.org/en/node/${place.id}" target="_blank" rel="noopener noreferrer">
            View on Wheelmap
          </a>
        </div>
      </div>
    `;
  };

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markers.forEach(marker => marker.remove());
    setMarkers([]);
  }, [markers]);

  // Get accessibility categories
  const getAccessibilityCategories = () => {
    return [
      { id: 'all', name: 'All Categories', icon: '📍' },
      ...wheelmapService.getAccessibilityCategories()
    ];
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Handle wheelchair filter change
  const handleWheelchairFilterChange = (filter) => {
    setWheelchairFilter(filter);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="wheelmap-layer-controls">
      {/* Category Filter */}
      <div className="filter-section">
        <label className="filter-label">Category:</label>
        <select 
          value={selectedCategory} 
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="filter-select"
        >
          {getAccessibilityCategories().map(category => (
            <option key={category.id} value={category.id}>
              {category.icon} {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Wheelchair Filter */}
      <div className="filter-section">
        <label className="filter-label">Accessibility:</label>
        <select 
          value={wheelchairFilter} 
          onChange={(e) => handleWheelchairFilterChange(e.target.value)}
          className="filter-select"
        >
          <option value="yes">♿ Fully Accessible</option>
          <option value="limited">⚠️ Limited Access</option>
          <option value="no">❌ Not Accessible</option>
          <option value="unknown">❓ Unknown</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading accessible places...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-message">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Results Summary */}
      {places.length > 0 && !loading && (
        <div className="results-summary">
          <span>Found {places.length} accessible places</span>
        </div>
      )}

      {/* Legend */}
      <div className="wheelmap-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4CAF50' }}></div>
          <span>Fully Accessible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
          <span>Limited Access</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#F44336' }}></div>
          <span>Not Accessible</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9E9E9E' }}></div>
          <span>Unknown</span>
        </div>
      </div>
    </div>
  );
};

export default WheelmapLayer;
