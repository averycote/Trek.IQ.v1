// Barrier Reporting Service for Trek.iQ
// Handles fetching and displaying user-reported barriers

class BarrierReportingService {
  constructor() {
    this.barriers = [];
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('🚧 Initializing Barrier Reporting Service...');
      await this.loadBarriers();
      this.isInitialized = true;
      console.log('✅ Barrier Reporting Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Barrier Reporting Service:', error);
    }
  }

  async loadBarriers() {
    try {
      const response = await fetch('/api/barriers');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.barriers = data.features || [];
      
      console.log(`📊 Loaded ${this.barriers.length} barriers`);
      return this.barriers;
    } catch (error) {
      console.error('Error loading barriers:', error);
      this.barriers = [];
      return [];
    }
  }

  async reportBarrier(barrierData) {
    try {
      const formData = new FormData();
      formData.append('type', barrierData.type);
      formData.append('severity', barrierData.severity);
      formData.append('description', barrierData.description);
      formData.append('lat', barrierData.latitude);
      formData.append('lng', barrierData.longitude);
      
      if (barrierData.locationDetails) {
        formData.append('locationDetails', barrierData.locationDetails);
      }
      
      if (barrierData.photo) {
        formData.append('photo', barrierData.photo);
      }

      const response = await fetch('/api/barriers/report', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit barrier report');
      }

      const result = await response.json();
      
      // Reload barriers to include the new one
      await this.loadBarriers();
      
      return result;
    } catch (error) {
      console.error('Error reporting barrier:', error);
      throw error;
    }
  }

  getBarriers() {
    return this.barriers;
  }

  getBarriersForMap() {
    return this.barriers.map(barrier => ({
      id: barrier.properties.id,
      type: 'Feature',
      geometry: barrier.geometry,
      properties: {
        ...barrier.properties,
        // Add map-specific properties
        mapIcon: this.getBarrierIcon(barrier.properties.type),
        mapColor: this.getBarrierColor(barrier.properties.severity),
        popupContent: this.getPopupContent(barrier.properties)
      }
    }));
  }

  getBarrierIcon(type) {
    const icons = {
      'steps_stairs': '🪜',
      'steep_slope': '📈',
      'obstructed_path': '🚧',
      'inaccessible_entrance': '🚪',
      'no_curb_cut': '♿',
      'poor_lighting': '💡',
      'construction': '🏗️',
      'snow_ice': '❄️',
      'other': '❓'
    };
    return icons[type] || '⚠️';
  }

  getBarrierColor(severity) {
    const colors = {
      'low': '#10b981',    // green
      'medium': '#f59e0b', // yellow
      'high': '#ef4444'    // red
    };
    return colors[severity] || '#6b7280';
  }

  getPopupContent(properties) {
    return `
      <div class="barrier-popup">
        <h3>${this.getBarrierIcon(properties.type)} ${properties.type}</h3>
        <p><strong>Severity:</strong> ${properties.severity}</p>
        <p><strong>Description:</strong> ${properties.notes || 'No description provided'}</p>
        <p><strong>Reported:</strong> ${new Date(properties.created_at).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${properties.status}</p>
      </div>
    `;
  }

  getBarriersByType(type) {
    return this.barriers.filter(barrier => barrier.properties.type === type);
  }

  getBarriersBySeverity(severity) {
    return this.barriers.filter(barrier => barrier.properties.severity === severity);
  }

  getBarriersNearLocation(lat, lng, radiusKm = 1) {
    return this.barriers.filter(barrier => {
      const barrierLat = barrier.geometry.coordinates[1];
      const barrierLng = barrier.geometry.coordinates[0];
      const distance = this.calculateDistance(lat, lng, barrierLat, barrierLng);
      return distance <= radiusKm;
    });
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Get statistics for dashboard
  getStatistics() {
    const stats = {
      total: this.barriers.length,
      byType: {},
      bySeverity: {},
      byStatus: {},
      recent: 0
    };

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    this.barriers.forEach(barrier => {
      const props = barrier.properties;
      
      // Count by type
      stats.byType[props.type] = (stats.byType[props.type] || 0) + 1;
      
      // Count by severity
      stats.bySeverity[props.severity] = (stats.bySeverity[props.severity] || 0) + 1;
      
      // Count by status
      stats.byStatus[props.status] = (stats.byStatus[props.status] || 0) + 1;
      
      // Count recent reports
      if (new Date(props.created_at) > oneWeekAgo) {
        stats.recent++;
      }
    });

    return stats;
  }

  // Clear cache and reload
  async refresh() {
    this.cache.clear();
    await this.loadBarriers();
  }
}

// Create singleton instance
const barrierReportingService = new BarrierReportingService();
export default barrierReportingService;
