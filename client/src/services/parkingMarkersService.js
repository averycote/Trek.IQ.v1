/**
 * Parking Markers Service
 * 
 * Manages accessible parking markers on the map
 * Only shows parking markers when driving mode is active
 */

import mapboxgl from 'mapbox-gl';

class ParkingMarkersService {
  constructor() {
    this.markers = [];
    this.map = null;
  }

  /**
   * Initialize service with map instance
   */
  setMap(map) {
    this.map = map;
  }

  /**
   * Add parking markers to the map
   * @param {Array} parkingSpots - Array of parking spot objects from accessibleParkingService
   * @param {string} mode - Route mode (driving, walking, etc.)
   */
  addParkingMarkers(parkingSpots, mode = 'walking') {
    // Only show parking markers for driving mode
    if (mode !== 'driving' && mode !== 'driving-traffic') {
      this.clearMarkers();
      return;
    }

    if (!this.map || !parkingSpots || parkingSpots.length === 0) {
      return;
    }

    console.log(`🅿️ Adding ${parkingSpots.length} parking markers to map`);

    // Clear existing parking markers
    this.clearMarkers();

    // Add marker for each parking spot
    parkingSpots.forEach((spot, index) => {
      try {
        const markerElement = this.createParkingMarkerElement(spot, index);
        
        const marker = new mapboxgl.Marker({
          element: markerElement,
          anchor: 'bottom'
        })
          .setLngLat(spot.coordinates)
          .addTo(this.map);

        // Create popup with parking information
        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          maxWidth: '320px',
          offset: 15
        }).setHTML(this.createPopupContent(spot));

        marker.setPopup(popup);

        this.markers.push(marker);
      } catch (error) {
        console.error('Error creating parking marker:', error, spot);
      }
    });

    console.log(`✅ Added ${this.markers.length} parking markers`);
  }

  /**
   * Create parking marker DOM element
   */
  createParkingMarkerElement(spot, index) {
    const el = document.createElement('div');
    el.className = 'parking-marker';
    el.style.cssText = `
      width: 40px;
      height: 40px;
      background-color: #3b82f6;
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      color: white;
      transform: rotate(-45deg);
      transition: all 0.2s ease;
    `;
    
    // Add parking icon
    const icon = document.createElement('div');
    icon.innerHTML = '🅿️';
    icon.style.transform = 'rotate(45deg)';
    el.appendChild(icon);

    // Add rank badge (1, 2, 3 for closest spots)
    if (index < 3) {
      const badge = document.createElement('div');
      badge.className = 'parking-badge';
      badge.textContent = index + 1;
      badge.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        width: 20px;
        height: 20px;
        background-color: #10b981;
        color: white;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        transform: rotate(45deg);
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      `;
      el.appendChild(badge);
    }

    // Hover effect
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'rotate(-45deg) scale(1.15)';
      el.style.zIndex = '1000';
    });

    el.addEventListener('mouseleave', () => {
      el.style.transform = 'rotate(-45deg) scale(1)';
      el.style.zIndex = 'auto';
    });

    return el;
  }

  /**
   * Create popup HTML content
   */
  createPopupContent(spot) {
    const availabilityColor = spot.available > 0 ? '#10b981' : '#ef4444';
    const availabilityText = spot.available !== null 
      ? `<div style="color: ${availabilityColor}; font-weight: bold; margin: 8px 0;">
           ${spot.available > 0 ? '✓' : '✗'} ${spot.available} spaces available
         </div>`
      : '';

    const features = spot.features && spot.features.length > 0
      ? `<div style="margin-top: 8px;">
           <strong style="font-size: 12px; color: #6b7280;">Features:</strong>
           <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;">
             ${spot.features.map(f => `
               <span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                 ${f}
               </span>
             `).join('')}
           </div>
         </div>`
      : '';

    const notes = spot.notes
      ? `<div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 4px; font-size: 12px; font-style: italic;">
           ℹ️ ${spot.notes}
         </div>`
      : '';

    return `
      <div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; justify-between; align-items: start; margin-bottom: 8px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: bold; flex: 1;">
            🅿️ ${spot.name}
          </h3>
          <span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-left: 8px; white-space: nowrap;">
            ${spot.distance}m
          </span>
        </div>
        
        ${spot.address ? `<p style="margin: 4px 0; font-size: 13px; color: #6b7280;">${spot.address}</p>` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; font-size: 13px;">
          <div>
            <strong style="color: #6b7280; font-size: 11px;">Time Limit</strong>
            <div style="font-weight: 500;">${spot.timeLimit || 'No limit'}</div>
          </div>
          <div>
            <strong style="color: #6b7280; font-size: 11px;">Cost</strong>
            <div style="font-weight: 500;">${spot.cost || 'Unknown'}</div>
          </div>
          ${spot.capacity ? `
            <div>
              <strong style="color: #6b7280; font-size: 11px;">Capacity</strong>
              <div style="font-weight: 500;">${spot.capacity} spaces</div>
            </div>
          ` : ''}
        </div>
        
        ${availabilityText}
        ${features}
        ${notes}
      </div>
    `;
  }

  /**
   * Clear all parking markers from the map
   */
  clearMarkers() {
    this.markers.forEach(marker => {
      marker.remove();
    });
    this.markers = [];
  }

  /**
   * Get count of active markers
   */
  getMarkerCount() {
    return this.markers.length;
  }
}

// Export singleton instance
const parkingMarkersService = new ParkingMarkersService();
export default parkingMarkersService;

