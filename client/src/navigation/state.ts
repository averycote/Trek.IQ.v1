// Navigation State Management for Trek.IQ
export enum NavState {
  IDLE = 'IDLE',
  ROUTE_READY = 'ROUTE_READY', 
  ACTIVE_NAV = 'ACTIVE_NAV',
  PAUSED = 'PAUSED',
  ENDED = 'ENDED'
}

export interface NavigationState {
  currentState: NavState;
  route: any | null;
  origin: string | null;
  destination: string | null;
  routeMode: 'walking' | 'driving' | 'transit';
  isDirectionsPanelOpen: boolean;
  isDirectionsPanelMinimized: boolean;
  isMuted: boolean;
  isFollowingUser: boolean;
  userLocation: [number, number] | null;
  currentStep: number;
  progress: number; // 0-100
  eta: number | null; // seconds
  distance: number | null; // meters
  accessibilityMarkers: any[];
  routeWarnings: any[];
}

export type NavigationAction = 
  | { type: 'SET_STATE'; payload: NavState }
  | { type: 'SET_ROUTE'; payload: any }
  | { type: 'SET_ORIGIN_DESTINATION'; payload: { origin: string; destination: string } }
  | { type: 'SET_ROUTE_MODE'; payload: 'walking' | 'driving' | 'transit' }
  | { type: 'TOGGLE_DIRECTIONS_PANEL' }
  | { type: 'SET_DIRECTIONS_MINIMIZED'; payload: boolean }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'SET_FOLLOWING_USER'; payload: boolean }
  | { type: 'SET_USER_LOCATION'; payload: [number, number] }
  | { type: 'SET_CURRENT_STEP'; payload: number }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'SET_ETA_DISTANCE'; payload: { eta: number; distance: number } }
  | { type: 'SET_ACCESSIBILITY_MARKERS'; payload: any[] }
  | { type: 'ADD_ROUTE_WARNING'; payload: any }
  | { type: 'CLEAR_ROUTE_WARNINGS' }
  | { type: 'RESET' };

export const initialState: NavigationState = {
  currentState: NavState.IDLE,
  route: null,
  origin: null,
  destination: null,
  routeMode: 'walking',
  isDirectionsPanelOpen: false,
  isDirectionsPanelMinimized: false,
  isMuted: false,
  isFollowingUser: false,
  userLocation: null,
  currentStep: 0,
  progress: 0,
  eta: null,
  distance: null,
  accessibilityMarkers: [],
  routeWarnings: []
};

export function navigationReducer(state: NavigationState, action: NavigationAction): NavigationState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, currentState: action.payload };
    
    case 'SET_ROUTE':
      return { ...state, route: action.payload };
    
    case 'SET_ORIGIN_DESTINATION':
      return { 
        ...state, 
        origin: action.payload.origin, 
        destination: action.payload.destination 
      };
    
    case 'SET_ROUTE_MODE':
      return { ...state, routeMode: action.payload };
    
    case 'TOGGLE_DIRECTIONS_PANEL':
      return { ...state, isDirectionsPanelOpen: !state.isDirectionsPanelOpen };
    
    case 'SET_DIRECTIONS_MINIMIZED':
      return { ...state, isDirectionsPanelMinimized: action.payload };
    
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    
    case 'SET_FOLLOWING_USER':
      return { ...state, isFollowingUser: action.payload };
    
    case 'SET_USER_LOCATION':
      return { ...state, userLocation: action.payload };
    
    case 'SET_CURRENT_STEP':
      return { ...state, currentStep: action.payload };
    
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    
    case 'SET_ETA_DISTANCE':
      return { 
        ...state, 
        eta: action.payload.eta, 
        distance: action.payload.distance 
      };
    
    case 'SET_ACCESSIBILITY_MARKERS':
      return { ...state, accessibilityMarkers: action.payload };
    
    case 'ADD_ROUTE_WARNING':
      return { 
        ...state, 
        routeWarnings: [...state.routeWarnings, action.payload] 
      };
    
    case 'CLEAR_ROUTE_WARNINGS':
      return { ...state, routeWarnings: [] };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

// Navigation Controller
export class NavigationController {
  private state: NavigationState;
  private listeners: Set<(state: NavigationState) => void> = new Set();
  private mapInstance: any = null;
  private geolocationWatchId: number | null = null;

  constructor() {
    this.state = initialState;
  }

  // Subscribe to state changes
  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Get current state
  getState(): NavigationState {
    return this.state;
  }

  // Set navigation state
  setNavState(nextState: NavState): void {
    this.state = { ...this.state, currentState: nextState };
    this.notifyListeners();
    
    // Handle state-specific actions
    switch (nextState) {
      case NavState.ROUTE_READY:
        this.handleRouteReady();
        break;
      case NavState.ACTIVE_NAV:
        this.handleActiveNavigation();
        break;
      case NavState.ENDED:
        this.handleNavigationEnded();
        break;
    }
  }

  // Set map instance for camera control
  setMapInstance(map: any): void {
    this.mapInstance = map;
  }

  // Route computed callback
  onRouteComputed(route: any, origin: string, destination: string, mode: 'walking' | 'driving' | 'transit'): void {
    this.state = {
      ...this.state,
      route,
      origin,
      destination,
      routeMode: mode,
      currentState: NavState.ROUTE_READY,
      isDirectionsPanelOpen: true,
      isDirectionsPanelMinimized: false
    };
    this.notifyListeners();
    this.handleRouteReady();
  }

  // Go button callback
  onTapGo(): void {
    this.setNavState(NavState.ACTIVE_NAV);
  }

  // End route callback
  onTapEnd(): void {
    this.setNavState(NavState.ENDED);
  }

  // Toggle directions panel
  toggleDirectionsPanel(): void {
    this.state = { ...this.state, isDirectionsPanelOpen: !this.state.isDirectionsPanelOpen };
    this.notifyListeners();
  }

  // Toggle directions minimized
  toggleDirectionsMinimized(): void {
    this.state = { ...this.state, isDirectionsPanelMinimized: !this.state.isDirectionsPanelMinimized };
    this.notifyListeners();
  }

  // Toggle mute
  toggleMute(): void {
    this.state = { ...this.state, isMuted: !this.state.isMuted };
    this.notifyListeners();
  }

  // Toggle following user
  toggleFollowingUser(): void {
    this.state = { ...this.state, isFollowingUser: !this.state.isFollowingUser };
    this.notifyListeners();
    
    if (this.state.isFollowingUser) {
      this.startLocationTracking();
    } else {
      this.stopLocationTracking();
    }
  }

  // Update user location
  updateUserLocation(coordinates: [number, number]): void {
    this.state = { ...this.state, userLocation: coordinates };
    this.notifyListeners();
    
    if (this.state.isFollowingUser && this.mapInstance) {
      this.mapInstance.easeTo({
        center: coordinates,
        duration: 1000
      });
    }
  }

  // Update progress
  updateProgress(progress: number, currentStep: number): void {
    this.state = { 
      ...this.state, 
      progress: Math.max(0, Math.min(100, progress)),
      currentStep 
    };
    this.notifyListeners();
  }

  // Update ETA and distance
  updateETAAndDistance(eta: number, distance: number): void {
    this.state = { 
      ...this.state, 
      eta,
      distance
    };
    this.notifyListeners();
  }

  // Add route warning
  addRouteWarning(warning: any): void {
    this.state = { 
      ...this.state, 
      routeWarnings: [...this.state.routeWarnings, warning] 
    };
    this.notifyListeners();
  }

  // Clear route warnings
  clearRouteWarnings(): void {
    this.state = { ...this.state, routeWarnings: [] };
    this.notifyListeners();
  }

  // Private methods
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  private handleRouteReady(): void {
    // Search bar will be shrunk by the UI component
    // Go button will appear
    console.log('Route ready - showing Go button');
  }

  private handleActiveNavigation(): void {
    if (this.mapInstance && this.state.route) {
      // Fit map to route bounds
      const coordinates = this.state.route.features[0].geometry.coordinates;
      const bounds = coordinates.reduce((bounds: any, coord: [number, number]) => {
        return bounds.extend(coord);
      }, new (window as any).mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));

      this.mapInstance.fitBounds(bounds, {
        padding: 50,
        duration: 1000
      });
    }

    // Start location tracking
    this.startLocationTracking();
    
    // Open directions panel
    this.state = { 
      ...this.state, 
      isDirectionsPanelOpen: true,
      isDirectionsPanelMinimized: false 
    };
    this.notifyListeners();
  }

  private handleNavigationEnded(): void {
    // Stop location tracking
    this.stopLocationTracking();
    
    // Reset state
    this.state = initialState;
    this.notifyListeners();
    
    // Restore map view if available
    if (this.mapInstance) {
      this.mapInstance.flyTo({
        center: [-63.5756, 44.6475], // Halifax center
        zoom: 15,
        duration: 1000
      });
    }
  }

  private startLocationTracking(): void {
    if ('geolocation' in navigator && !this.geolocationWatchId) {
      this.geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          this.updateUserLocation([longitude, latitude]);
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    }
  }

  private stopLocationTracking(): void {
    if (this.geolocationWatchId) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }
  }
}

// Create singleton instance
export const navigationController = new NavigationController();
