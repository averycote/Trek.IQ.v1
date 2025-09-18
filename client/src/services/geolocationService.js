// Geolocation Service for Trek.iQ - Handles automatic location detection
class GeolocationService {
  constructor() {
    this.currentPosition = null;
    this.watchId = null;
    this.isWatching = false;
    this.lastKnownPosition = null;
    this.listeners = new Set();
    this.permissionStatus = null;
    
    // Configuration options
    this.defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds
      maximumAge: 300000 // 5 minutes
    };
  }

  // Initialize the geolocation service
  async initialize() {
    try {
      console.log('🌍 Initializing Geolocation Service...');
      
      // Check if geolocation is supported
      if (!this.isSupported()) {
        console.warn('Geolocation is not supported in this browser');
        return false;
      }

      // Check current permission status if available
      if ('permissions' in navigator) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          this.permissionStatus = permission.state;
          console.log(`Geolocation permission status: ${permission.state}`);
          
          // Listen for permission changes
          permission.addEventListener('change', () => {
            this.permissionStatus = permission.state;
            console.log(`Geolocation permission changed to: ${permission.state}`);
            this.notifyListeners('permissionChange', permission.state);
          });
        } catch (error) {
          console.warn('Could not query geolocation permission:', error);
        }
      }

      console.log('✅ Geolocation Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Geolocation Service:', error);
      return false;
    }
  }

  // Check if geolocation is supported
  isSupported() {
    return 'geolocation' in navigator;
  }

  // Get current position once
  async getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      const mergedOptions = { ...this.defaultOptions, ...options };
      
      console.log('📍 Requesting current position with options:', mergedOptions);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData = this.processPosition(position);
          this.currentPosition = locationData;
          this.lastKnownPosition = locationData;
          
          console.log('✅ Current position obtained:', locationData);
          this.notifyListeners('positionUpdate', locationData);
          resolve(locationData);
        },
        (error) => {
          console.error('❌ Geolocation error:', error);
          const errorData = this.processError(error);
          this.notifyListeners('error', errorData);
          reject(errorData);
        },
        mergedOptions
      );
    });
  }

  // Start watching position changes
  startWatching(options = {}) {
    if (!this.isSupported()) {
      console.warn('Cannot start watching: Geolocation not supported');
      return false;
    }

    if (this.isWatching) {
      console.log('Already watching position');
      return true;
    }

    const mergedOptions = { ...this.defaultOptions, ...options };
    
    console.log('👁️ Starting position watch with options:', mergedOptions);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const locationData = this.processPosition(position);
        this.currentPosition = locationData;
        this.lastKnownPosition = locationData;
        
        console.log('📍 Position update:', locationData);
        this.notifyListeners('positionUpdate', locationData);
      },
      (error) => {
        console.error('❌ Watch position error:', error);
        const errorData = this.processError(error);
        this.notifyListeners('error', errorData);
      },
      mergedOptions
    );

    this.isWatching = true;
    console.log('✅ Position watching started');
    return true;
  }

  // Stop watching position changes
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
      console.log('⏹️ Position watching stopped');
    }
  }

  // Process position data from the browser API
  processPosition(position) {
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
    
    return {
      coordinates: [longitude, latitude], // Mapbox format [lng, lat]
      lat: latitude,
      lng: longitude,
      accuracy: accuracy,
      altitude: altitude,
      altitudeAccuracy: altitudeAccuracy,
      heading: heading,
      speed: speed,
      timestamp: position.timestamp,
      formattedAddress: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      name: 'Your Current Location',
      type: 'current_location',
      source: 'geolocation_api'
    };
  }

  // Process geolocation errors
  processError(error) {
    let message = 'Location access failed';
    let type = 'unknown';
    let userFriendlyMessage = 'Unable to get your location';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        type = 'permission_denied';
        message = 'User denied the request for Geolocation';
        userFriendlyMessage = 'Location access was denied. You can still enter your starting point manually.';
        break;
      case error.POSITION_UNAVAILABLE:
        type = 'position_unavailable';
        message = 'Location information is unavailable';
        userFriendlyMessage = 'Your location is currently unavailable. Please check your device settings.';
        break;
      case error.TIMEOUT:
        type = 'timeout';
        message = 'The request to get user location timed out';
        userFriendlyMessage = 'Location request timed out. Please try again or enter your location manually.';
        break;
      default:
        type = 'unknown';
        message = 'An unknown error occurred while retrieving location';
        userFriendlyMessage = 'Something went wrong getting your location. Please enter it manually.';
        break;
    }

    return {
      code: error.code,
      type: type,
      message: message,
      userFriendlyMessage: userFriendlyMessage,
      originalError: error
    };
  }

  // Add event listener for position updates
  addListener(callback) {
    this.listeners.add(callback);
  }

  // Remove event listener
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  // Notify all listeners of events
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in geolocation listener:', error);
      }
    });
  }

  // Get the last known position (if any)
  getLastKnownPosition() {
    return this.lastKnownPosition;
  }

  // Get current position with fallback to last known
  getCurrentPositionWithFallback() {
    return this.currentPosition || this.lastKnownPosition;
  }

  // Check if we have a valid current position
  hasValidPosition() {
    const position = this.getCurrentPositionWithFallback();
    return position && position.coordinates && position.coordinates.length === 2;
  }

  // Get permission status
  getPermissionStatus() {
    return this.permissionStatus;
  }

  // Check if permission is granted
  isPermissionGranted() {
    return this.permissionStatus === 'granted';
  }

  // Check if permission is denied
  isPermissionDenied() {
    return this.permissionStatus === 'denied';
  }

  // Format position for display
  formatPosition(position = null) {
    const pos = position || this.getCurrentPositionWithFallback();
    if (!pos) return 'No location available';
    
    return `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`;
  }

  // Convert position to address string for search input
  toAddressString(position = null) {
    const pos = position || this.getCurrentPositionWithFallback();
    if (!pos) return '';
    
    return pos.name || pos.formattedAddress || this.formatPosition(pos);
  }

  // Static method to convert any position object to address string
  static toAddressString(position) {
    if (!position) return '';
    return position.name || position.formattedAddress || `${position.lat?.toFixed(6) || 0}, ${position.lng?.toFixed(6) || 0}`;
  }

  // Get distance between two positions (in kilometers)
  getDistance(pos1, pos2) {
    if (!pos1 || !pos2) return null;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Check if position has changed significantly (more than 10 meters)
  hasPositionChangedSignificantly(newPosition, oldPosition = null) {
    const old = oldPosition || this.lastKnownPosition;
    if (!old || !newPosition) return true;
    
    const distance = this.getDistance(old, newPosition);
    return distance === null || distance > 0.01; // 10 meters
  }

  // Get service statistics
  getStats() {
    return {
      isSupported: this.isSupported(),
      isWatching: this.isWatching,
      hasCurrentPosition: !!this.currentPosition,
      hasLastKnownPosition: !!this.lastKnownPosition,
      permissionStatus: this.permissionStatus,
      listenersCount: this.listeners.size,
      watchId: this.watchId
    };
  }

  // Clear all data and stop watching
  reset() {
    this.stopWatching();
    this.currentPosition = null;
    this.lastKnownPosition = null;
    this.permissionStatus = null;
    this.listeners.clear();
    console.log('🔄 Geolocation Service reset');
  }

  // Cleanup method
  destroy() {
    this.reset();
    console.log('🗑️ Geolocation Service destroyed');
  }
}

// Create singleton instance
const geolocationService = new GeolocationService();
export default geolocationService;
