import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  Suspense,
  lazy,
} from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import TopBar from "./TopBar";
import MapCanvas from "./MapCanvas";
import FabCluster from "./FabCluster";
import EnhancedSearchPanel from "./EnhancedSearchPanel";
import SideMenu from "./SideMenu";
import LayersPanel from "./LayersPanel";
import SimplifiedLayersPanel from "./SimplifiedLayersPanel";
import ReportBarrierModal from "./ReportBarrierModal";
import LoadingSpinner from "./LoadingSpinner";
import NavigationIntegration from "../navigation/NavigationIntegration";
import TransitInfo from "./TransitInfo";
import SystemStatusPanel from "./SystemStatusPanel";
import UnifiedRoutePanel from "./UnifiedRoutePanel";
import DirectionsPanel from "./DirectionsPanel";

// OPTIMIZATION: Removed MobileRoutingVerification import

import apiIntegrationManager from "../services/apiIntegrationManager";
import comprehensiveRoutingOrchestrator from "../services/comprehensiveRoutingOrchestrator";
import barrierDetectionRegistry from "../services/barrierDetectionRegistry";
import elevationService from "../services/elevationService";
import barrierReportingService from "../services/barrierReportingService";
import geolocationService from "../services/geolocationService";
import "./BarrierDialog.css";

const AccountPage = lazy(() => import("./pages/AccountPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const SavedRoutesPage = lazy(() => import("./pages/SavedRoutesPage"));
const ReportedBarriersPage = lazy(() => import("./pages/ReportedBarriersPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));

const AppShell = () => {
  // FIXED: Get navigate function from React Router
  const navigate = useNavigate();

  // Layout state - All panels closed by default for mobile
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTransitInfoOpen, setIsTransitInfoOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false); // Search panel closed by default
  const [isSystemStatusOpen, setIsSystemStatusOpen] = useState(false);

  // FIXED: Page state management for mobile
  const [isPageOpen, setIsPageOpen] = useState(false);

  // Search and routing state
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [routeMode, setRouteMode] = useState("walking");
  const [route, setRoute] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Route display state
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false);
  const [isDirectionsPanelOpen, setIsDirectionsPanelOpen] = useState(false);

  // OPTIMIZATION: Restored necessary state variables that are still referenced
  const [mapInstance, setMapInstance] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Geolocation state
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(false);
  const [hasAttemptedGeolocation, setHasAttemptedGeolocation] = useState(false);

  // OPTIMIZATION: Removed mobile routing verification state

  // Enhanced routing state
  const [comprehensiveRoute, setComprehensiveRoute] = useState(null);
  
  // Barrier reporting state
  const [barriers, setBarriers] = useState([]);
  const [isBarrierServiceInitialized, setIsBarrierServiceInitialized] = useState(false);

  // Memoize the onMapLoad callback to prevent unnecessary re-renders
  const handleMapLoad = useCallback((map) => {
    console.log("AppShell: onMapLoad callback received:", map);
    setMapInstance(map);
    setIsMapLoading(false);
  }, []);

  // Map and layer state - Start with a simplified set
  const [activeLayers, setActiveLayers] = useState(
    new Set([
      "accessibleParking",
      "transitRoutes",
      "wheelmap_food"
    ])
  );

  // Accessibility settings
  const [accessibilitySettings] = useState({
    avoidSteps: true,
    preferWellLit: true,
    avoidSteepSlopes: true,
    preferWidePaths: true,
    wheelchairAccessible: false,
    visualImpairment: false,
    hearingImpairment: false,
  });

  // Theme and preferences
  const [currentTheme, setCurrentTheme] = useState("light");
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(false);

  // Mobile detection - FIXED: More accurate mobile detection
  const isMobile = useMemo(() => {
    // Check viewport width first (most reliable for responsive design)
    const isMobileViewport = window.innerWidth <= 768;

    // Check for mobile user agents (but be more specific)
    const isMobileUserAgent =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    // Check for touch capability (but don't rely solely on this as many desktops have touch)
    const isTouchDevice =
      "ontouchstart" in window && navigator.maxTouchPoints > 0;

    // For desktop, prioritize viewport width over touch capability
    // Only consider it mobile if it's a small viewport OR has a mobile user agent
    const isMobile = isMobileViewport || isMobileUserAgent;

    console.log("Mobile detection:", {
      viewport: window.innerWidth,
      isMobileViewport,
      userAgent: navigator.userAgent,
      isMobileUserAgent,
      isTouchDevice,
      finalResult: isMobile,
    });

    return isMobile;
  }, []);

  // Manual location detection handler - called when user clicks the location button
  const handleManualLocationDetection = useCallback(async () => {
    if (!isGeolocationEnabled) {
      toast.error("Geolocation service is not available.", {
        duration: 3000,
        position: isMobile ? 'bottom-center' : 'top-center'
      });
      return;
    }

    try {
      console.log("🌍 Manual location detection requested...");

      // Set up one-time geolocation event listeners
      const handleGeolocationUpdate = (event, data) => {
        switch (event) {
          case 'positionUpdate':
            console.log("📍 Location detected:", data);
            setUserLocation(data);
            
            // Set as origin regardless of current value
            const locationString = geolocationService.toAddressString(data);
            console.log("🎯 Setting detected location as origin:", locationString);
            setOrigin(locationString);
            
            // Show success message
            toast.success("📍 Current location set as starting point!", {
              duration: 4000,
              position: isMobile ? 'bottom-center' : 'top-center'
            });
            
            // Remove listener after successful detection
            geolocationService.removeListener(handleGeolocationUpdate);
            break;
            
          case 'error':
            console.warn("❌ Geolocation error:", data);
            
            // Show user-friendly error message
            if (data.type === 'permission_denied') {
              toast.error("Location access denied. Please allow location access and try again.", {
                duration: 5000,
                position: isMobile ? 'bottom-center' : 'top-center'
              });
            } else if (data.type === 'timeout') {
              toast.error("Location detection timed out. Please try again.", {
                duration: 4000,
                position: isMobile ? 'bottom-center' : 'top-center'
              });
            } else {
              toast.error("Failed to detect location. Please enter manually.", {
                duration: 4000,
                position: isMobile ? 'bottom-center' : 'top-center'
              });
            }
            
            // Remove listener after error
            geolocationService.removeListener(handleGeolocationUpdate);
            break;
            
          default:
            console.log("Unknown geolocation event:", event);
            break;
        }
      };

      // Add listener for geolocation events
      geolocationService.addListener(handleGeolocationUpdate);

      // Attempt to get current position
      await geolocationService.getCurrentPosition({
        timeout: 10000, // 10 seconds timeout for manual requests
        maximumAge: 60000, // Accept 1-minute-old position for manual requests
        enableHighAccuracy: true
      });
      
    } catch (error) {
      console.error("Manual location detection failed:", error);
      toast.error("Failed to detect location. Please enter manually.", {
        duration: 4000,
        position: isMobile ? 'bottom-center' : 'top-center'
      });
    }
  }, [isGeolocationEnabled, isMobile]);

  // Initialize app state on component mount
  useEffect(() => {
    // Ensure light theme is applied by default
    document.body.classList.remove("dark-mode");
    document.documentElement.setAttribute("data-theme", "light");

    // Ensure all panels are in correct initial state
    setIsTransitInfoOpen(false);
    setIsSideMenuOpen(false);
    setIsLayersPanelOpen(false);
    setIsReportModalOpen(false);

    // Search panel should be closed by default on mobile for better UX
    setIsSearchPanelOpen(false);

    // Ensure no route is active initially
    setRoute(null);
    setIsNavigating(false);
    setIsNavigationMode(false);

    // Initialize API integration manager and comprehensive routing orchestrator
    const initializeSystem = async () => {
      try {
        console.log("Initializing Trek.IQ system...", {
          isMobile,
          userAgent: navigator.userAgent,
        });

        // OPTIMIZATION: Removed unused initTimeout variable

        const initPromises = [
          apiIntegrationManager.initialize(),
          comprehensiveRoutingOrchestrator.initialize(),
          barrierDetectionRegistry.initialize(),
          elevationService.initialize(),
          geolocationService.initialize(),
        ];

        // Initialize all services
        const results = await Promise.allSettled(initPromises);

        // Check if API Integration Manager initialized successfully
        if (results[0].status === "fulfilled") {
          console.log("✅ API Integration Manager initialized");
        } else {
          console.warn("⚠️ API Integration Manager failed:", results[0].reason);
        }

        // Check if Comprehensive Routing Orchestrator initialized successfully
        if (results[1].status === "fulfilled") {
          console.log("✅ Comprehensive Routing Orchestrator initialized");
        } else {
          console.warn(
            "⚠️ Comprehensive Routing Orchestrator failed:",
            results[1].reason
          );
        }

        // Check if Barrier Detection Registry initialized successfully
        if (results[2].status === "fulfilled") {
          console.log("✅ Barrier Detection Registry initialized");
        } else {
          console.warn(
            "⚠️ Barrier Detection Registry failed:",
            results[2].reason
          );
        }

        // Check if Elevation Service initialized successfully
        if (results[3].status === "fulfilled") {
          console.log("✅ Elevation Service initialized");
          
          // OPTIMIZATION: Test elevation API in development
          if (process.env.NODE_ENV === 'development') {
            import('../utils/elevationTest').then(({ runElevationTests }) => {
              runElevationTests().then(testResults => {
                console.log('📊 Elevation API test results:', testResults.summary);
              });
            });
          }
        } else {
          console.warn(
            "⚠️ Elevation Service failed:",
            results[3].reason
          );
        }

        // Check if Geolocation Service initialized successfully
        if (results[4].status === "fulfilled") {
          console.log("✅ Geolocation Service initialized");
          setIsGeolocationEnabled(true);
          // Location detection is now manual via button click
        } else {
          console.warn(
            "⚠️ Geolocation Service failed:",
            results[4].reason
          );
          setIsGeolocationEnabled(false);
        }

        // Set up status listener
        apiIntegrationManager.addStatusListener((type, data) => {
          if (type === "initialized" && data.success) {
            setIsSystemReady(true);
            setSystemStatus(apiIntegrationManager.getSystemStatus());
            console.log(
              "Trek.IQ system ready on",
              isMobile ? "mobile" : "desktop"
            );
          } else if (type === "system_health") {
            setSystemStatus(apiIntegrationManager.getSystemStatus());
          }
        });

        // Check initial status
        setIsSystemReady(apiIntegrationManager.isSystemReady());
        setSystemStatus(apiIntegrationManager.getSystemStatus());

        console.log("System initialization completed successfully");
      } catch (error) {
        console.error("Failed to initialize system:", error);

        // More specific error message for mobile
        if (isMobile) {
          toast.error(
            "Mobile initialization failed. Please check your connection and try refreshing the page."
          );
        } else {
          toast.error(
            "System initialization failed. Some features may be unavailable."
          );
        }

        // Still try to set system as ready for basic functionality
        setIsSystemReady(true);
      }
    };

    initializeSystem();

    console.log("AppShell initialized with mobile-first state:", {
      isMobile,
      userAgent: navigator.userAgent,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      touchSupport: "ontouchstart" in window,
      maxTouchPoints: navigator.maxTouchPoints,
      isSearchPanelOpen: false,
      isSideMenuOpen: false,
      isLayersPanelOpen: false,
      isTransitInfoOpen: false,
    });
  }, [isMobile]);

  // FIXED: Apply theme changes when currentTheme changes
  useEffect(() => {
    if (currentTheme === "dark") {
      document.body.classList.add("dark-mode");
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.body.classList.remove("dark-mode");
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, [currentTheme]);

  // Service readiness
  const [isSystemReady, setIsSystemReady] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [systemStatus, setSystemStatus] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isRouteExpanded, setIsRouteExpanded] = useState(false);

  // Map padding state for mobile optimization - FIXED OVERLAPPING ISSUES
  const [mapPadding, setMapPadding] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  // Update map padding based on mobile layout - ENHANCED OVERLAP PREVENTION
  const updateMapPadding = useCallback(() => {
    const padding = {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    };

    // Padding adjustments for mobile-first design
    if (isMobile) {
      // Top padding for top bar and search bar
      padding.top = 80; // Top bar height + safe spacing

      // Bottom padding based on current state
      if (isNavigating) {
        // Navigation active - account for navigation panel
        padding.bottom = 300; // Space for navigation panel (expanded)
      } else if (route && !isNavigating) {
        // Route exists but not navigating - account for collapsed panel and GO button
        padding.bottom = 200; // Space for collapsed panel + GO button + FAB
      } else if (isRoutePanelOpen || isDirectionsPanelOpen) {
        // Route/directions panel open
        padding.bottom = 250; // Space for panels
      } else {
        // Default state - space for FAB cluster
        padding.bottom = 180; // Space for FAB cluster
      }

      // Add extra padding for safe areas
      if (window.visualViewport) {
        const safeAreaBottom =
          window.visualViewport.height - window.innerHeight;
        if (safeAreaBottom > 0) {
          padding.bottom += safeAreaBottom;
        }
      }
    } else {
      // Desktop/tablet padding
      padding.top = 80; // Top bar height + spacing
      padding.bottom = 180; // Space for FAB cluster
      padding.right = 80; // Space for Mapbox controls
      padding.left = 20; // Left margin for better UX
    }

    setMapPadding(padding);
  }, [isMobile, route, isNavigating, isRoutePanelOpen, isDirectionsPanelOpen]);

  // Update padding when state changes
  useEffect(() => {
    updateMapPadding();
  }, [updateMapPadding]);

  // Handle route request using comprehensive routing orchestrator
  const handleRouteRequest = useCallback(
    async (routeData) => {
      try {
        console.log("Comprehensive route request received:", routeData);

        // Validate route data
        if (!routeData.origin || !routeData.destination) {
          toast.error("Please enter both origin and destination");
          return;
        }

        // Check if system is ready
        if (!isSystemReady) {
          if (isMobile) {
            toast.error(
              "Mobile system is still initializing. Please wait a moment and try again."
            );
          } else {
            toast.error(
              "System is still initializing. Please try again in a moment."
            );
          }
          return;
        }

        const loadingToast = toast.loading("Generating comprehensive route...");

        // Use comprehensive routing orchestrator
        const routeRequest = {
          origin: routeData.origin,
          destination: routeData.destination,
          mode: routeData.mode || "walking",
          time: { type: "now" },
          userPrefs: routeData.accessibilitySettings || {},
        };

        console.log(
          "Calling comprehensive routing orchestrator with:",
          routeRequest
        );

        const result = await comprehensiveRoutingOrchestrator.generateRoute(
          routeRequest
        );

        console.log("Comprehensive route generation result:", result);

        if (result.success && result.route) {
          // Store comprehensive route data
          setComprehensiveRoute(result.route);

          // Always show route panel directly - barriers are handled within the panel
          setIsRoutePanelOpen(true);

          // Also update the legacy route state for compatibility
          setRoute(result.route);

          toast.dismiss(loadingToast);
          toast.success("Route generated successfully!");
        } else {
          toast.dismiss(loadingToast);
          toast.error(result.error || "Failed to generate route");
        }
      } catch (error) {
        console.error("Route generation failed:", error);
        toast.error("Route generation failed. Please try again.");
      }
    },
    [isSystemReady, isMobile]
  );


  // Handle route clear
  const handleRouteClear = useCallback(() => {
    setRoute(null);
    setComprehensiveRoute(null);
    setIsRouteExpanded(false);
    setIsNavigating(false);
    setIsSearchPanelOpen(false);
    setIsRoutePanelOpen(false);
    setIsDirectionsPanelOpen(false);
  }, []);

  // OPTIMIZATION: Removed mobile routing verification toggle

  // Handle navigation start - State management only (map operations handled by NavigationIntegration)
  const handleNavigationStart = useCallback(
    (routeData) => {
      console.log("=== NAVIGATION START STATE MANAGEMENT ===");
      console.log("handleNavigationStart called with routeData:", routeData);
      console.log("Current route state:", route);
      console.log("Current mapInstance state:", !!mapInstance);

      // Update navigation state
      setIsNavigating(true);
      setIsNavigationMode(true);

      // Hide route summary when navigation starts (if it existed)
      // setIsRouteSummaryVisible(false);

      // Close route details panel when navigation starts
      setIsRoutePanelOpen(false);

      // Open directions panel for both mobile and desktop
      setIsDirectionsPanelOpen(true);

      // Show success message
      toast.success("Navigation started! Follow the directions below.");

      console.log("Navigation state updated successfully");
      console.log("isNavigating:", true);
      console.log("isNavigationMode:", true);
    },
    [route, mapInstance]
  );

  // Handle navigation end
  const handleNavigationEnd = useCallback(() => {
    console.log("=== NAVIGATION END DEBUG ===");
    console.log("handleNavigationEnd called");

    setIsNavigating(false);
    setIsNavigationMode(false);

    // Close directions panel when navigation ends
    setIsDirectionsPanelOpen(false);

    // Show the route summary again when navigation ends (if it existed)
    // setIsRouteSummaryVisible(true);

    console.log("Navigation end completed");
  }, []);

  // Handle search panel toggle
  const handleSearchPanelToggle = useCallback(() => {
    setIsSearchPanelOpen(!isSearchPanelOpen);
  }, [isSearchPanelOpen]);

  // Handle origin change
  const handleOriginChange = useCallback((newOrigin) => {
    setOrigin(newOrigin);
  }, []);

  // Handle destination change
  const handleDestinationChange = useCallback((newDestination) => {
    setDestination(newDestination);
  }, []);

  // Handle route mode change
  const handleRouteModeChange = useCallback((newMode) => {
    setRouteMode(newMode);
  }, []);

  // Handle transit info toggle
  const handleTransitInfoToggle = useCallback(() => {
    setIsTransitInfoOpen(!isTransitInfoOpen);
  }, [isTransitInfoOpen]);

  // Handle side menu toggle
  const handleSideMenuToggle = useCallback(() => {
    setIsSideMenuOpen(!isSideMenuOpen);
  }, [isSideMenuOpen]);

  // Handle layers panel toggle
  const handleLayersPanelToggle = useCallback(() => {
    console.log("handleLayersPanelToggle called");
    setIsLayersPanelOpen(!isLayersPanelOpen);
  }, [isLayersPanelOpen]);

  // FIXED: Page state handlers for mobile
  const handlePageOpen = useCallback(() => {
    setIsPageOpen(true);
    // Hide search panel and other UI elements when page opens
    setIsSearchPanelOpen(false);
    setIsSideMenuOpen(false);
    setIsLayersPanelOpen(false);
    setIsTransitInfoOpen(false);
  }, []);

  const handlePageClose = useCallback(() => {
    setIsPageOpen(false);
    // Keep search panel closed when returning to map for mobile-first UX
    setIsSearchPanelOpen(false);
  }, []);

  // Initialize system services
  const initializeSystem = useCallback(async () => {
    try {
      console.log("Initializing Trek.IQ system...");

      // Initialize API integration manager
      await apiIntegrationManager.initialize();

      // Initialize barrier reporting service
      await barrierReportingService.initialize();
      setBarriers(barrierReportingService.getBarriers());
      setIsBarrierServiceInitialized(true);

      // Make services available globally for testing and analytics
      window.apiIntegrationManager = apiIntegrationManager;
      window.comprehensiveRoutingOrchestrator =
        comprehensiveRoutingOrchestrator;
      window.barrierReportingService = barrierReportingService;

      // Expose individual services
      const barrierService = apiIntegrationManager.getService("barrier");
      const searchService = apiIntegrationManager.getService("search");
      const routingService = apiIntegrationManager.getService("routing");
      const elevationService = apiIntegrationManager.getService("elevation");
      const openRouteService = apiIntegrationManager.getService("openRoute");
      const transitService = apiIntegrationManager.getService("transit");
      const transitAPIService = apiIntegrationManager.getService("transitAPI");

      if (barrierService) window.barrierService = barrierService;
      if (searchService) window.enhancedSearchService = searchService;
      if (routingService) window.routingService = routingService;
      if (elevationService) window.elevationService = elevationService;
      if (openRouteService) window.openRouteService = openRouteService;
      if (transitService) window.transitService = transitService;
      if (transitAPIService) window.transitAPIService = transitAPIService;

      // Expose additional services that tests expect
      window.geocodingService = searchService; // Search service handles geocoding
      window.mapboxService = searchService; // Search service uses Mapbox
      window.nominatimService = searchService; // Search service uses Nominatim as fallback
      window.layersService = apiIntegrationManager; // API manager handles layers
      window.poiService = apiIntegrationManager; // API manager handles POIs
      window.accessibilityService = comprehensiveRoutingOrchestrator; // Routing orchestrator handles accessibility
      window.scoringService = comprehensiveRoutingOrchestrator; // Routing orchestrator handles scoring
      window.rankingService = comprehensiveRoutingOrchestrator; // Routing orchestrator handles ranking
      window.slopeService = elevationService; // Elevation service handles slopes
      window.openElevationService = elevationService; // Same as elevation service
      window.fallbackService = apiIntegrationManager; // API manager handles fallbacks

      setIsSystemReady(true);
      console.log("Trek.IQ system initialized successfully");
    } catch (error) {
      console.error("Failed to initialize system:", error);
      setIsSystemReady(false);
    }
  }, []);

  // Initialize system on component mount
  useEffect(() => {
    initializeSystem();
  }, [initializeSystem]);

  const handleNavigate = useCallback(
    (path) => {
      navigate(path);
      setIsSideMenuOpen(false);
    },
    [navigate]
  );

  const handleReportSubmit = useCallback(async (result) => {
    console.log("Barrier report submitted successfully:", result);
    
    // Refresh barriers to include the new report
    if (isBarrierServiceInitialized) {
      await barrierReportingService.refresh();
      setBarriers(barrierReportingService.getBarriers());
    }
  }, [isBarrierServiceInitialized]);

  const handleRoutePanelClose = useCallback(() => {
    setIsRoutePanelOpen(false);
  }, []);

  const handleLayerToggle = useCallback((layerId) => {
    setActiveLayers((prev) => {
      const newLayers = new Set(prev);
      if (newLayers.has(layerId)) {
        newLayers.delete(layerId);
      } else {
        newLayers.add(layerId);
      }
      return newLayers;
    });
  }, []);

  const handleSystemStatusOpen = useCallback(
    () => setIsSystemStatusOpen(true),
    []
  );

  //Cause the props make the component re-render each time
  const fabClassName = useMemo(() => {
    if (isMobile)
      return isRoutePanelOpen || isDirectionsPanelOpen ? "fab-left-mobile" : "";
    return isRoutePanelOpen || isDirectionsPanelOpen ? "fab-left" : "";
  }, [isMobile, isRoutePanelOpen, isDirectionsPanelOpen]);

  return (
    <div className="app-shell">
      <Toaster position="top-center" />

      {/* Top Bar */}
      <TopBar
        onToggleMenu={handleSideMenuToggle}
        onSearchToggle={handleSearchPanelToggle}
        isSearchPanelOpen={isSearchPanelOpen}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
        onSystemStatusToggle={handleSystemStatusOpen}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Map Canvas */}
        <MapCanvas
          route={route}
          origin={origin}
          destination={destination}
          activeLayers={activeLayers}
          accessibilitySettings={accessibilitySettings}
          onMapLoad={handleMapLoad}
          onLayerToggle={handleLayerToggle}
          mapPadding={mapPadding}
          isReportingMode={false}
          routeMode={routeMode}
          isMobile={isMobile}
          userLocation={userLocation}
          barriers={barriers}
        />

        {/* Debug Route Data */}
        {console.log("AppShell: MapCanvas route data:", {
          hasRoute: !!route,
          routeType: route?.type,
          routeFeatures: route?.features?.length,
          routeProperties: route?.features?.[0]?.properties,
          comprehensiveRoute: !!comprehensiveRoute,
        })}

        {/* Search Panel - Same component for mobile and desktop, just styled differently */}
        {isSearchPanelOpen && !isPageOpen && (
          <EnhancedSearchPanel
            origin={origin}
            destination={destination}
            onOriginChange={handleOriginChange}
            onDestinationChange={handleDestinationChange}
            onRouteRequest={handleRouteRequest}
            accessibilitySettings={accessibilitySettings}
            routeMode={routeMode}
            onModeChange={handleRouteModeChange}
            isMobile={isMobile}
            onSearchToggle={handleSearchPanelToggle}
            onLocationDetect={handleManualLocationDetection}
          />
        )}

        {/* Navigation Integration - Same components for mobile and desktop */}
        {route && mapInstance && (
          <NavigationIntegration
            mapInstance={mapInstance}
            route={route}
            origin={origin}
            destination={destination}
            routeMode={routeMode}
            onRouteClear={handleRouteClear}
            onOriginChange={handleOriginChange}
            onDestinationChange={handleDestinationChange}
            onNavigationStart={handleNavigationStart}
            onNavigationEnd={handleNavigationEnd}
            isMobile={isMobile}
            isNavigating={isNavigating}
          />
        )}

        {/* Route Panels - Only show when explicitly opened */}
        {route && !isNavigating && isRoutePanelOpen && (
          <UnifiedRoutePanel
            route={comprehensiveRoute || route}
            routeMode={routeMode}
            isOpen={true}
            onClose={handleRoutePanelClose}
            isDarkMode={currentTheme === "dark"}
            onReroute={handleRouteRequest}
            onStartNavigation={handleNavigationStart}
            origin={origin}
            destination={destination}
          />
        )}

        {route && isNavigating && isDirectionsPanelOpen && (
          <DirectionsPanel
            route={comprehensiveRoute || route}
            isOpen={true}
            onClose={handleNavigationEnd}
            isDarkMode={currentTheme === "dark"}
            settings={{
              voiceNavigation: voiceGuidanceEnabled,
              hapticFeedback: true,
            }}
            isMobile={isMobile}
            onReportBarrier={() => setIsReportModalOpen(true)}
          />
        )}

        {/* {route && isNavigating && isDirectionsPanelOpen && isMobile && (
          <div className="absolute right-4 bottom-[calc(100%+1rem)]  z-[1]">
            <BarrierReportFAB
              onReportBarrier={() => setIsReportModalOpen(true)}
            />
          </div>
        )} */}

        {/* FAB Cluster - Position correctly for both mobile and desktop */}
        {!isPageOpen && (
          <FabCluster
            onReportBarrier={() => setIsReportModalOpen(true)}
            onTransitInfo={handleTransitInfoToggle}
            onLayersToggle={handleLayersPanelToggle}
            isMobile={isMobile}
            isNavigating={isNavigating}
            activeLayers={activeLayers}
            className={fabClassName}
          />
        )}

        {/* Side Menu */}
        <SideMenu
          isOpen={isSideMenuOpen}
          onClose={() => setIsSideMenuOpen(false)}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          voiceGuidanceEnabled={voiceGuidanceEnabled}
          onVoiceGuidanceToggle={setVoiceGuidanceEnabled}
          onNavigate={handleNavigate}
        />

        {/* Simplified Layers Panel */}
        <SimplifiedLayersPanel
          isOpen={isLayersPanelOpen}
          isDarkMode={currentTheme === "dark"}
          onClose={() => setIsLayersPanelOpen(false)}
          activeLayers={activeLayers}
          onLayerToggle={handleLayerToggle}
        />

        {/* Report Barrier Modal */}
        <ReportBarrierModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onReport={handleReportSubmit}
          userLocation={userLocation}
          isDarkMode={currentTheme === "dark"}
        />

        {/* Transit Info - Only show when explicitly opened */}
        {isTransitInfoOpen && (
          <TransitInfo
            isOpen={isTransitInfoOpen}
            onClose={() => setIsTransitInfoOpen(false)}
          />
        )}

        {/* Liability Barrier Alert - Removed old component */}

        {/* Loading Spinner */}
        {isMapLoading && <LoadingSpinner />}

        {/* System Status Panel */}
        <SystemStatusPanel
          isOpen={isSystemStatusOpen}
          onClose={() => setIsSystemStatusOpen(false)}
        />

        {/* Route Panels - Same for both mobile and desktop, just styled differently */}

        {/* Debug: Log route data for desktop panels */}
        {!isMobile && route && (
          <div style={{ display: "none" }}>
            {console.log("Desktop Route Panels Debug:", {
              route,
              isRoutePanelOpen,
              isDirectionsPanelOpen,
              routeMode,
              origin,
              destination,
            })}
          </div>
        )}

        {/* No overlapping barrier panels - barriers handled in UnifiedRoutePanel */}

        {/* OPTIMIZATION: Removed Mobile Routing Verification component */}
      </div>

      {/* Added lazy loading for the routes */}
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {/* Root route - renders the main app interface */}
          <Route path="/" element={<div style={{ display: 'none' }} />} />
          <Route
            path="/account"
            element={
              <AccountPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
          <Route
            path="/saved-routes"
            element={
              <SavedRoutesPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
          <Route
            path="/reported-barriers"
            element={
              <ReportedBarriersPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
          <Route
            path="/help"
            element={
              <HelpPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
          <Route
            path="/about"
            element={
              <AboutPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminDashboardPage
                onPageOpen={handlePageOpen}
                onPageClose={handlePageClose}
              />
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
};

export default AppShell;
