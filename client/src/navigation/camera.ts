// Camera Control Service for Trek.IQ Navigation
// Manages map camera positioning, route fitting, and user following

export interface CameraOptions {
  duration?: number;
  easing?: (t: number) => number;
  padding?: number | { top: number; bottom: number; left: number; right: number };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export class CameraService {
  private mapInstance: any = null;
  private isFollowingUser: boolean = false;
  private userLocation: [number, number] | null = null;
  private routeBounds: MapBounds | null = null;
  private defaultCenter: [number, number] = [-63.5756, 44.6475]; // Halifax center
  private defaultZoom: number = 15;

  // Set map instance
  setMapInstance(map: any): void {
    this.mapInstance = map;
  }

  // Fit map to route bounds
  fitToRoute(
    routeCoordinates: [number, number][],
    options: CameraOptions = {}
  ): void {
    if (!this.mapInstance || routeCoordinates.length === 0) return;

    const {
      duration = 1000,
      easing = (t: number) => t,
      padding = 50
    } = options;

    try {
      // Calculate bounds from route coordinates
      const bounds = this.calculateBounds(routeCoordinates);
      this.routeBounds = bounds;

      // Create Mapbox bounds object
      const mapboxBounds = new (window as any).mapboxgl.LngLatBounds(
        [bounds.west, bounds.south],
        [bounds.east, bounds.north]
      );

      // Fit map to bounds
      this.mapInstance.fitBounds(mapboxBounds, {
        duration,
        easing,
        padding,
        maxZoom: 18
      });

      console.log('Map fitted to route bounds');
    } catch (error) {
      console.error('Error fitting map to route:', error);
      this.flyToDefault();
    }
  }

  // Fly to user location
  flyToUser(
    coordinates: [number, number],
    options: CameraOptions = {}
  ): void {
    if (!this.mapInstance) return;

    const {
      duration = 1000,
      easing = (t: number) => t
    } = options;

    this.userLocation = coordinates;

    this.mapInstance.flyTo({
      center: coordinates,
      zoom: 17,
      duration,
      easing
    });
  }

  // Follow user location
  followUser(coordinates: [number, number]): void {
    if (!this.mapInstance) return;

    this.userLocation = coordinates;
    this.isFollowingUser = true;

    // Smooth transition to user location
    this.mapInstance.easeTo({
      center: coordinates,
      duration: 1000
    });
  }

  // Stop following user
  stopFollowingUser(): void {
    this.isFollowingUser = false;
  }

  // Recenter on route
  recenterOnRoute(): void {
    if (!this.mapInstance || !this.routeBounds) {
      this.flyToDefault();
      return;
    }

    const center: [number, number] = [
      (this.routeBounds.east + this.routeBounds.west) / 2,
      (this.routeBounds.north + this.routeBounds.south) / 2
    ];

    this.mapInstance.flyTo({
      center,
      zoom: 16,
      duration: 1000
    });
  }

  // Recenter on user
  recenterOnUser(): void {
    if (!this.mapInstance || !this.userLocation) {
      this.flyToDefault();
      return;
    }

    this.flyToUser(this.userLocation);
  }

  // Fly to default view
  flyToDefault(): void {
    if (!this.mapInstance) return;

    this.mapInstance.flyTo({
      center: this.defaultCenter,
      zoom: this.defaultZoom,
      duration: 1000
    });
  }

  // Zoom to specific level
  zoomTo(level: number, options: CameraOptions = {}): void {
    if (!this.mapInstance) return;

    const { duration = 500 } = options;

    this.mapInstance.flyTo({
      zoom: Math.max(10, Math.min(20, level)),
      duration
    });
  }

  // Pan to location
  panTo(
    coordinates: [number, number],
    options: CameraOptions = {}
  ): void {
    if (!this.mapInstance) return;

    const { duration = 500 } = options;

    this.mapInstance.panTo(coordinates, {
      duration
    });
  }

  // Get current camera state
  getCameraState(): {
    center: [number, number];
    zoom: number;
    bearing: number;
    pitch: number;
  } | null {
    if (!this.mapInstance) return null;

    return {
      center: this.mapInstance.getCenter().toArray(),
      zoom: this.mapInstance.getZoom(),
      bearing: this.mapInstance.getBearing(),
      pitch: this.mapInstance.getPitch()
    };
  }

  // Set camera state
  setCameraState(state: {
    center: [number, number];
    zoom: number;
    bearing?: number;
    pitch?: number;
  }, options: CameraOptions = {}): void {
    if (!this.mapInstance) return;

    const { duration = 1000 } = options;

    this.mapInstance.flyTo({
      center: state.center,
      zoom: state.zoom,
      bearing: state.bearing || 0,
      pitch: state.pitch || 0,
      duration
    });
  }

  // Calculate bounds from coordinates
  private calculateBounds(coordinates: [number, number][]): MapBounds {
    if (coordinates.length === 0) {
      return {
        north: this.defaultCenter[1] + 0.01,
        south: this.defaultCenter[1] - 0.01,
        east: this.defaultCenter[0] + 0.01,
        west: this.defaultCenter[0] - 0.01
      };
    }

    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    for (const [lng, lat] of coordinates) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng
    };
  }

  // Update user location (called by navigation controller)
  updateUserLocation(coordinates: [number, number]): void {
    this.userLocation = coordinates;
    
    if (this.isFollowingUser) {
      this.followUser(coordinates);
    }
  }

  // Get current user location
  getUserLocation(): [number, number] | null {
    return this.userLocation;
  }

  // Get route bounds
  getRouteBounds(): MapBounds | null {
    return this.routeBounds;
  }

  // Check if following user
  isFollowingUserLocation(): boolean {
    return this.isFollowingUser;
  }

  // Reset camera service
  reset(): void {
    this.isFollowingUser = false;
    this.userLocation = null;
    this.routeBounds = null;
  }
}

// Create singleton instance
export const cameraService = new CameraService();
