
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
import RouteGenerationLoading from "./RouteGenerationLoading";

// Accessibility hooks
import useScreenReaderAnnouncement from "../hooks/useScreenReaderAnnouncement";
import useKeyboardNavigation from "../hooks/useKeyboardNavigation";

// OPTIMIZATION: Removed MobileRoutingVerification import

import apiIntegrationManager from "../services/apiIntegrationManager";
import productionRoutingService from "../services/productionRouting/ProductionRoutingService.js";
import DataManager from "../services/productionRouting/DataManager.js";
import simpleRouteRenderingService from "../services/simpleRouteRenderingService";
import fixedRouteService from "../services/fixedRouteService.js";
import trueAccessibilityRoutingService from "../services/trueAccessibilityRoutingService.js";
import unifiedRouteRenderer from "../services/unifiedRouteRenderer.js";
import routingDiagnosticService from "../services/routingDiagnosticService.js";
import routeDebugger from "../services/routeDebugger.js";
import simpleRouteFix from "../services/simpleRouteFix.js";
import enhancedSearchService from "../services/enhancedSearchService.js";
import barrierDetectionRegistry from "../services/barrierDetectionRegistry";
import elevationService from "../services/elevationService";
import barrierReportingService from "../services/barrierReportingService";
import geolocationService from "../services/geolocationService";
import parkingMarkersService from "../services/parkingMarkersService";
import "./BarrierDialog.css";
import "../styles/accessibility.css";

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

  // Accessibility hooks
  const { announce } = useScreenReaderAnnouncement();

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
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [clearSearchLoading, setClearSearchLoading] = useState(false);
  
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
  
  // Store original layers to restore after driving mode
  const [layersBeforeDriving, setLayersBeforeDriving] = useState(null);

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
  
  // Beta disclaimer
  const [showBetaDisclaimer, setShowBetaDisclaimer] = useState(true);

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
      // Set a timeout for system initialization
      const initTimeout = setTimeout(() => {
        if (isSystemLoading) {
          console.warn("System initialization timeout - continuing with basic functionality");
          setIsSystemLoading(false);
          setSystemLoadingMessage("System initialization timeout - some features may be limited");
          setIsSystemReady(true);
        }
      }, 30000); // 30 second timeout for data loading

      try {
        console.log("Initializing Trek.IQ system...", {
          isMobile,
          userAgent: navigator.userAgent,
        });

        setSystemLoadingMessage("Loading core services...");

        // Initialize essential services only with individual error handling
        const initPromises = [
          apiIntegrationManager.initialize().catch(error => {
            console.warn("API Integration Manager failed:", error);
            return { error: error.message };
          }),
          barrierDetectionRegistry.initialize().catch(error => {
            console.warn("Barrier Detection Registry failed:", error);
            return { error: error.message };
          }),
          elevationService.initialize().catch(error => {
            console.warn("Elevation Service failed:", error);
            return { error: error.message };
          }),
          geolocationService.initialize().catch(error => {
            console.warn("Geolocation Service failed:", error);
            return { error: error.message };
          }),
          fixedRouteService.initialize().catch(error => {
            console.warn("Fixed Route Service failed:", error);
            return { error: error.message };
          }),
        ];

        setSystemLoadingMessage("Initializing routing services...");

        // Initialize all services
        const results = await Promise.allSettled(initPromises);

        // PRE-INITIALIZE TRUE ACCESSIBILITY ROUTING (loads Halifax data in background)
        setSystemLoadingMessage("Loading Halifax accessibility data...");
        trueAccessibilityRoutingService.initialize().catch(error => {
          console.warn("TRUE Accessibility Routing pre-init failed:", error);
          // Non-critical - will fallback to other services
        });

        console.log("Service initialization results:", results.map((result, index) => ({
          service: ['apiIntegrationManager', 'barrierDetectionRegistry', 'elevationService', 'geolocationService', 'fixedRouteService'][index],
          status: result.status,
          error: result.status === 'rejected' ? result.reason?.message : null
        })));

        setSystemLoadingMessage("Configuring API services...");

        // Check if API Integration Manager initialized successfully
        if (results[0].status === "fulfilled" && !results[0].value?.error) {
          console.log("✅ API Integration Manager initialized");
        } else {
          console.warn("⚠️ API Integration Manager failed:", results[0].reason || results[0].value?.error);
        }

        // Check if Comprehensive Routing Orchestrator initialized successfully
        if (results[1].status === "fulfilled" && !results[1].value?.error) {
          console.log("✅ Comprehensive Routing Orchestrator initialized");
        } else {
          console.warn(
            "⚠️ Comprehensive Routing Orchestrator failed:",
            results[1].reason || results[1].value?.error
          );
        }

        // Check if Barrier Detection Registry initialized successfully
        if (results[2].status === "fulfilled" && !results[2].value?.error) {
          console.log("✅ Barrier Detection Registry initialized");
        } else {
          console.warn(
            "⚠️ Barrier Detection Registry failed:",
            results[2].reason || results[2].value?.error
          );
        }

        // Check if Elevation Service initialized successfully
        if (results[3].status === "fulfilled" && !results[3].value?.error) {
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
            results[3].reason || results[3].value?.error
          );
        }

        setSystemLoadingMessage("Setting up location services...");

        // Check if Geolocation Service initialized successfully
        if (results[4].status === "fulfilled" && !results[4].value?.error) {
          console.log("✅ Geolocation Service initialized");
          setIsGeolocationEnabled(true);
          // Location detection is now manual via button click
        } else {
          console.warn(
            "⚠️ Geolocation Service failed:",
            results[4].reason || results[4].value?.error
          );
          setIsGeolocationEnabled(false);
        }

        setSystemLoadingMessage("Setting up system connections...");

        // Check if critical services failed
        const criticalServicesFailed = results.slice(0, 2).some(result => 
          result.status === "rejected" || result.value?.error
        );

        if (criticalServicesFailed) {
          console.warn("⚠️ Critical services failed, but continuing with basic functionality");
          // Don't show error toast for non-critical service failures
        }

        // Set up status listener
        const statusListener = (type, data) => {
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
        };

        apiIntegrationManager.addStatusListener(statusListener);

        setSystemLoadingMessage("Finalizing system setup...");

        // Check initial status
        setIsSystemReady(apiIntegrationManager.isSystemReady());
        setSystemStatus(apiIntegrationManager.getSystemStatus());

        // Clear the timeout since initialization completed successfully
        clearTimeout(initTimeout);

        // Add a small delay to show the loading state
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsSystemLoading(false);
        console.log("System initialization completed successfully");

        // Return cleanup function
        return () => {
          apiIntegrationManager.removeStatusListener(statusListener);
        };
      } catch (error) {
        console.error("Failed to initialize system:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });

        // Clear the timeout since initialization failed
        clearTimeout(initTimeout);

        setIsSystemLoading(false);
        setSystemLoadingMessage("System initialization failed");

        // Only show error toast for truly critical failures
        // Most service failures are now handled gracefully
        console.warn("System initialization encountered errors, but continuing with available services");

        // Still try to set system as ready for basic functionality
        setIsSystemReady(true);
      }
    };

    let cleanupFunction;
    initializeSystem().then(cleanup => {
      cleanupFunction = cleanup;
    });

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

    // Cleanup function
    return () => {
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
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
  const [isSystemLoading, setIsSystemLoading] = useState(true);
  const [systemLoadingMessage, setSystemLoadingMessage] = useState("Initializing Trek.IQ system...");
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

        // Set route generation loading state
        setIsGeneratingRoute(true);
        
        const loadingToast = toast.loading("🔍 Finding accessible route...");

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

        // Try TRUE accessibility routing first
        let result;
        try {
          console.log('🎯 Using TRUE Accessibility Routing Service');
          
          // OPTIMIZATION: Show helpful progress messages
          toast.loading("📊 Loading accessibility data...", { id: loadingToast });
          
          // Give the UI a moment to update
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // Update progress
          toast.loading("🗺️ Calculating accessible route...", { id: loadingToast });
          
          result = await trueAccessibilityRoutingService.calculateRoute(
            routeRequest.origin,
            routeRequest.destination,
            {
              avoidSteps: routeRequest.userPrefs?.avoidSteps,
              preferWellLit: routeRequest.userPrefs?.preferWellLit,
              avoidSteepSlopes: routeRequest.userPrefs?.avoidSteepSlopes,
              preferWidePaths: routeRequest.userPrefs?.preferWidePaths,
              wheelchairAccessible: routeRequest.userPrefs?.wheelchairAccessible,
              visualImpairment: routeRequest.userPrefs?.visualImpairment,
              hearingImpairment: routeRequest.userPrefs?.hearingImpairment
            }
          );
          
          // Update progress
          toast.loading("✨ Rendering route on map...", { id: loadingToast });
          
          // Wrap result in expected format
          result = {
            success: true,
            route: result
          };
        } catch (error) {
          console.warn('TRUE accessibility routing failed, trying fixed route service:', error);
          
          // Fallback to fixed route service
          try {
            result = await fixedRouteService.calculateRoute(
              routeRequest.origin,
              routeRequest.destination,
              {
                profile: routeRequest.mode === 'driving' ? 'driving' : 'walking', // Map mode to Mapbox profile
                mode: routeRequest.mode, // Pass mode for route properties
                avoidSteps: routeRequest.userPrefs?.avoidSteps,
                preferAccessible: routeRequest.userPrefs?.preferAccessible,
                wheelchairAccessible: routeRequest.userPrefs?.wheelchairAccessible,
                visualImpairment: routeRequest.userPrefs?.visualImpairment,
                hearingImpairment: routeRequest.userPrefs?.hearingImpairment
              }
            );
            
            // Wrap result in expected format
            result = {
              success: true,
              route: result
            };
          } catch (fallbackError) {
            console.warn('Fixed route service also failed, trying production service:', fallbackError);
            
            // Final fallback to production service
            result = await productionRoutingService.calculateRoute(
              routeRequest.origin,
              routeRequest.destination,
              {
                profile: routeRequest.mode === 'driving' ? 'driving' : 'walking', // Map mode to Mapbox profile
                mode: routeRequest.mode, // Pass mode for route properties
                avoidSteps: routeRequest.userPrefs?.avoidSteps,
                preferAccessible: routeRequest.userPrefs?.preferAccessible,
                accessibility: routeRequest.userPrefs?.preferAccessible
              }
            );
          }
        }

        console.log("Comprehensive route generation result:", result);

        if (result.success && result.route) {
          // ENRICH DRIVING ROUTES WITH PARKING DATA (before anything else)
          const routeMode = result.route?.features?.[0]?.properties?.mode || routeRequest.mode;
          const isDrivingRoute = routeMode === 'driving' || routeMode === 'driving-traffic';
          
          if (isDrivingRoute) {
            try {
              const accessibleParkingService = (await import('../services/accessibleParkingService')).default;
              await accessibleParkingService.initialize();
              result.route = await accessibleParkingService.enrichRoute(result.route, routeMode);
            } catch (parkingError) {
              console.warn('⚠️ Failed to enrich route with parking data:', parkingError);
            }
          }
          
          // Debug route data
          routeDebugger.debugRouteData(result.route, 'from route calculation');
          
          // Store comprehensive route data
          setComprehensiveRoute(result.route);

          // Announce to screen readers
          const distance = result.route?.distance 
            ? `${(result.route.distance / 1000).toFixed(1)} kilometers` 
            : "";
          const duration = result.route?.duration 
            ? `${Math.round(result.route.duration / 60)} minutes` 
            : "";
          announce(
            `Route found. ${distance} ${duration}`,
            "assertive"
          );

          // Initialize unified rendering service if map is available
          if (mapInstance) {
            try {
              // OPTIMIZATION: Skip heavy diagnostics in production, run route rendering immediately
              const isProduction = process.env.NODE_ENV === 'production';
              
              if (!isProduction) {
                // Debug route rendering attempt (dev only)
                routeDebugger.debugRouteRendering(result.route, mapInstance, unifiedRouteRenderer);
              }
              
              // Initialize and render with unified renderer (fast path)
              unifiedRouteRenderer.initialize(mapInstance);
              await unifiedRouteRenderer.renderRoute(result.route);
              
              if (!isProduction) {
                routeDebugger.log('Route rendering completed successfully');
              }

              // DRIVING MODE ENHANCEMENTS: Add parking markers and hide ALL accessibility layers
              if (isDrivingRoute) {
                
                // Hide ALL accessibility layers during driving (save them first)
                if (!layersBeforeDriving) {
                  setLayersBeforeDriving(new Set(activeLayers));
                }
                
                const drivingLayers = new Set(activeLayers);
                // Remove ALL accessibility-related layers that show markers
                drivingLayers.delete('wheelmap_food');
                drivingLayers.delete('wheelmap_shopping');
                drivingLayers.delete('wheelmap_other');
                drivingLayers.delete('accessibleParking'); // Remove old parking layer
                drivingLayers.delete('wheelchair_accessible_bathrooms');
                drivingLayers.delete('wheelchair_accessible_places');
                drivingLayers.delete('limited_accessibility_places');
                drivingLayers.delete('not_accessible_places');
                drivingLayers.delete('accessible_transit_stops');
                drivingLayers.delete('accessible_parking'); // accessibility.cloud version
                drivingLayers.delete('accessibility_equipment');
                setActiveLayers(drivingLayers);
                console.log('✅ ALL accessibility marker layers removed from active layers');
                
                // CRITICAL: Manually remove ALL existing Mapbox markers from the map
                // (they persist even when components are unmounted)
                // BUT preserve origin/destination/user location markers
                if (mapInstance && mapInstance.getContainer) {
                  const mapContainer = mapInstance.getContainer();
                  const existingMarkers = mapContainer.querySelectorAll('.mapboxgl-marker');
                  console.log(`🧹 Found ${existingMarkers.length} existing markers on map`);
                  let removedCount = 0;
                  existingMarkers.forEach(marker => {
                    // Check if this is NOT an origin/destination/user location marker
                    // Those markers typically contain specific emojis or have parent containers with specific IDs
                    const markerHTML = marker.innerHTML || '';
                    const isOriginDestMarker = markerHTML.includes('📍') || markerHTML.includes('🎯');
                    const isUserLocationMarker = marker.classList.contains('user-location-marker');
                    
                    if (!isOriginDestMarker && !isUserLocationMarker) {
                      marker.remove();
                      removedCount++;
                    }
                  });
                  console.log(`✅ Removed ${removedCount} accessibility markers (kept origin/destination/user location)`);
                }
                
                // Add parking markers
                const parkingSpots = result.route?.features?.[0]?.properties?.accessibleParking || [];
                console.log('🅿️ DRIVING MODE - Parking spots data:', {
                  count: parkingSpots.length,
                  hasMapInstance: !!mapInstance,
                  routeMode: routeMode,
                  routeProperties: result.route?.features?.[0]?.properties,
                  spots: parkingSpots
                });
                
                if (parkingSpots.length > 0 && mapInstance) {
                  console.log('🅿️ ADDING PARKING MARKERS TO MAP...');
                  parkingMarkersService.setMap(mapInstance);
                  parkingMarkersService.addParkingMarkers(parkingSpots, routeMode);
                  console.log(`✅ SUCCESSFULLY Added ${parkingSpots.length} parking markers to map`);
                } else if (parkingSpots.length === 0) {
                  console.error('❌ CRITICAL: No parking spots found in route data - parking enrichment may have failed!');
                  console.error('Route feature properties:', result.route?.features?.[0]?.properties);
                } else if (!mapInstance) {
                  console.error('❌ CRITICAL: Map instance not available for parking markers');
                }
              } else {
                console.log('🚶 Walking mode - clearing parking markers and restoring accessibility layers');
                // Not driving mode - clear parking markers if any
                parkingMarkersService.clearMarkers();
                
                // Restore ALL accessibility layers if they were hidden
                if (layersBeforeDriving) {
                  setActiveLayers(layersBeforeDriving);
                  setLayersBeforeDriving(null);
                  console.log('✅ All accessibility layers restored');
                }
              }
              
              // OPTIMIZATION: Run diagnostics asynchronously in background (don't block user)
              if (!isProduction) {
                routingDiagnosticService.runDiagnostics(
                  result.route, 
                  mapInstance, 
                  unifiedRouteRenderer
                ).then(diagnostics => {
                  console.log('🔍 Routing diagnostics (async):', diagnostics.getSummary());
                  if (diagnostics.errors.length > 0) {
                    console.warn('⚠️ Route diagnostics found errors:', diagnostics.errors);
                  }
                }).catch(err => {
                  console.warn('Diagnostics failed:', err);
                });
              }
              
            } catch (error) {
              console.warn('⚠️ Route rendering failed:', error.message);
              routeDebugger.log('Route rendering failed', { error: error.message });
              
              // Try fallback rendering with simple service
              try {
                simpleRouteRenderingService.initialize(mapInstance);
                await simpleRouteRenderingService.renderRoute(result.route);
                routeDebugger.log('Fallback route rendering succeeded');
              } catch (fallbackError) {
                console.error('❌ Fallback route rendering also failed:', fallbackError);
                routeDebugger.log('Fallback route rendering failed', { error: fallbackError.message });
                
                // Try simple route fix as last resort
                try {
                  simpleRouteFix.initialize(mapInstance);
                  await simpleRouteFix.renderRoute(result.route);
                  routeDebugger.log('Simple route fix succeeded');
                } catch (simpleFixError) {
                  console.error('❌ Simple route fix also failed:', simpleFixError);
                  routeDebugger.log('Simple route fix failed', { error: simpleFixError.message });
                }
              }
            }
          } else {
            routeDebugger.log('No map instance available for route rendering');
          }

          // Clear loading state and show route panel only after route rendering is complete
          // This ensures the route line appears before the route summary
          setIsGeneratingRoute(false);
          setClearSearchLoading(true);
          setIsRoutePanelOpen(true);

          // Also update the legacy route state for compatibility
          setRoute(result.route);

          toast.dismiss(loadingToast);
          toast.success("Route generated successfully!");
        } else {
          // Clear loading state on error
          setIsGeneratingRoute(false);
          setClearSearchLoading(true);
          toast.dismiss(loadingToast);
          
          // User-friendly error messages
          const getErrorMessage = (error) => {
            if (error && error.includes('network')) {
              return "Network connection issue. Please check your internet and try again.";
            }
            if (error && error.includes('timeout')) {
              return "Request timed out. The route may be too complex. Try a shorter route.";
            }
            if (error && error.includes('no route')) {
              return "No accessible route found. Try adjusting your accessibility preferences or choose different locations.";
            }
            return "Unable to calculate route. Please try again or contact support if the issue persists.";
          };
          
          toast.error(getErrorMessage(result.error));
          routeDebugger.log('Route calculation failed', { error: result.error });
        }
      } catch (error) {
        console.error("Route generation failed:", error);
        
        // Clear loading state on exception
        setIsGeneratingRoute(false);
        setClearSearchLoading(true);
        
        // User-friendly error messages for exceptions
        const getErrorMessage = (error) => {
          if (error.message && error.message.includes('network')) {
            return "Network connection issue. Please check your internet and try again.";
          }
          if (error.message && error.message.includes('timeout')) {
            return "Request timed out. The route may be too complex. Try a shorter route.";
          }
          if (error.message && error.message.includes('no route')) {
            return "No accessible route found. Try adjusting your accessibility preferences or choose different locations.";
          }
          return "Unable to calculate route. Please try again or contact support if the issue persists.";
        };
        
        toast.error(getErrorMessage(error));
      }
    },
    [isSystemReady, isMobile]
  );


  // Handle route clear
  const handleRouteClear = useCallback(() => {
    setRoute(null);
    setComprehensiveRoute(null);
    setIsGeneratingRoute(false);
    setIsRouteExpanded(false);
    setIsNavigating(false);
    setIsSearchPanelOpen(false);
    
    // Clear parking markers
    parkingMarkersService.clearMarkers();
    
    // Restore wheelmap layers if they were hidden
    if (layersBeforeDriving) {
      setActiveLayers(layersBeforeDriving);
      setLayersBeforeDriving(null);
    }
    setIsRoutePanelOpen(false);
    setIsDirectionsPanelOpen(false);
    
    // Announce to screen readers
    announce("Route cleared", "polite");
  }, [announce]);

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

      // Announce to screen readers
      announce(
        "Navigation started. Turn-by-turn directions are now available.",
        "assertive"
      );

      console.log("Navigation state updated successfully");
      console.log("isNavigating:", true);
      console.log("isNavigationMode:", true);
    },
    [route, mapInstance, announce]
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

    // Announce to screen readers
    announce("Navigation ended", "polite");

    console.log("Navigation end completed");
  }, [announce]);

  // Handle search panel toggle
  const handleSearchPanelToggle = useCallback(() => {
    const newState = !isSearchPanelOpen;
    setIsSearchPanelOpen(newState);
    // Announce to screen readers
    announce(
      newState ? "Search panel opened" : "Search panel closed",
      "polite"
    );
  }, [isSearchPanelOpen, announce]);

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
    const newState = !isTransitInfoOpen;
    setIsTransitInfoOpen(newState);
    // Announce to screen readers
    announce(
      newState ? "Transit information panel opened" : "Transit information panel closed",
      "polite"
    );
  }, [isTransitInfoOpen, announce]);

  // Handle side menu toggle
  const handleSideMenuToggle = useCallback(() => {
    const newState = !isSideMenuOpen;
    setIsSideMenuOpen(newState);
    // Announce to screen readers
    announce(
      newState ? "Navigation menu opened" : "Navigation menu closed",
      "polite"
    );
  }, [isSideMenuOpen, announce]);

  // Handle layers panel toggle
  const handleLayersPanelToggle = useCallback(() => {
    console.log("handleLayersPanelToggle called");
    const newState = !isLayersPanelOpen;
    setIsLayersPanelOpen(newState);
    // Announce to screen readers
    announce(
      newState ? "Map layers panel opened" : "Map layers panel closed",
      "polite"
    );
  }, [isLayersPanelOpen, announce]);

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
      window.productionRoutingService = productionRoutingService;
      window.simpleRouteRenderingService = simpleRouteRenderingService;
      window.barrierReportingService = barrierReportingService;
      window.fixedRouteService = fixedRouteService;
      window.unifiedRouteRenderer = unifiedRouteRenderer;
      window.routingDiagnosticService = routingDiagnosticService;
      window.routeDebugger = routeDebugger;
      window.simpleRouteFix = simpleRouteFix;
      window.enhancedSearchService = enhancedSearchService;

      // Expose essential services
      window.elevationService = elevationService;
      window.accessibilityService = fixedRouteService;
      window.scoringService = fixedRouteService;
      window.rankingService = fixedRouteService;
      window.slopeService = elevationService;
      window.fallbackService = apiIntegrationManager;

      // Add test route function for debugging
      window.testRoute = async () => {
        try {
          console.log('🧪 Testing route rendering...');
          const testRoute = routeDebugger.createTestRoute();
          routeDebugger.debugRouteData(testRoute, 'test route');
          
          if (mapInstance) {
            // Test with unified renderer
            try {
              unifiedRouteRenderer.initialize(mapInstance);
              await unifiedRouteRenderer.renderRoute(testRoute);
              console.log('✅ Test route rendered with unified renderer');
            } catch (error) {
              console.error('❌ Unified renderer failed:', error);
              
              // Test with simple renderer
              try {
                simpleRouteRenderingService.initialize(mapInstance);
                await simpleRouteRenderingService.renderRoute(testRoute);
                console.log('✅ Test route rendered with simple renderer');
              } catch (fallbackError) {
                console.error('❌ Simple renderer also failed:', fallbackError);
                
                // Test with simple route fix
                try {
                  simpleRouteFix.initialize(mapInstance);
                  await simpleRouteFix.renderRoute(testRoute);
                  console.log('✅ Test route rendered with simple route fix');
                } catch (simpleFixError) {
                  console.error('❌ Simple route fix also failed:', simpleFixError);
                }
              }
            }
          } else {
            console.error('❌ No map instance available for testing');
          }
        } catch (error) {
          console.error('❌ Test route failed:', error);
        }
      };

      // Add test search function for debugging
      window.testSearch = async (query = 'Halifax') => {
        try {
          console.log('🔍 Testing search functionality...');
          await enhancedSearchService.initialize();
          
          const results = await enhancedSearchService.search(query, {
            limit: 5,
            includeCivicAddresses: true,
            includePOIs: true
          });
          
          console.log('✅ Search results:', results);
          return results;
        } catch (error) {
          console.error('❌ Test search failed:', error);
          return [];
        }
      };

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

  // Handle Escape key to close any open panels
  const handleEscapeKey = useCallback(() => {
    if (isReportModalOpen) {
      setIsReportModalOpen(false);
      announce("Barrier report dialog closed", "polite");
    } else if (isSideMenuOpen) {
      setIsSideMenuOpen(false);
      announce("Navigation menu closed", "polite");
    } else if (isLayersPanelOpen) {
      setIsLayersPanelOpen(false);
      announce("Map layers panel closed", "polite");
    } else if (isSearchPanelOpen) {
      setIsSearchPanelOpen(false);
      announce("Search panel closed", "polite");
    } else if (isTransitInfoOpen) {
      setIsTransitInfoOpen(false);
      announce("Transit information closed", "polite");
    } else if (isSystemStatusOpen) {
      setIsSystemStatusOpen(false);
      announce("System status closed", "polite");
    }
  }, [
    isReportModalOpen,
    isSideMenuOpen,
    isLayersPanelOpen,
    isSearchPanelOpen,
    isTransitInfoOpen,
    isSystemStatusOpen,
    announce
  ]);

  // Keyboard navigation support
  useKeyboardNavigation({
    onOpenSearch: () => {
      if (!isSearchPanelOpen) {
        handleSearchPanelToggle();
      }
    },
    onOpenMenu: () => {
      if (!isSideMenuOpen) {
        handleSideMenuToggle();
      }
    },
    onOpenLayers: () => {
      if (!isLayersPanelOpen) {
        handleLayersPanelToggle();
      }
    },
    onEscape: handleEscapeKey,
    enabled: !isPageOpen, // Disable global shortcuts when a page is open
  });

  return (
    <div className="app-shell" role="application" aria-label="Trek.IQ Accessible Navigation App">
      {/* Skip Navigation Links */}
      <div className="skip-nav-container">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <a href="#search-panel" className="skip-link">
          Skip to search
        </a>
        <a href="#map-canvas" className="skip-link">
          Skip to map
        </a>
      </div>

      <Toaster position="top-center" aria-live="polite" aria-atomic="true" />

      {/* System Loading Overlay */}
      {isSystemLoading && (
        <div 
          className={`fixed inset-0 ${currentTheme === 'dark' ? 'bg-gray-900 bg-opacity-95' : 'bg-white bg-opacity-95'} z-50 flex items-center justify-center`}
          role="status"
          aria-live="assertive"
          aria-busy="true"
          aria-label="Loading Trek.IQ system"
        >
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"
              aria-hidden="true"
            ></div>
            <h2 
              className={`text-xl font-semibold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-800'} mb-2`}
              id="loading-title"
            >
              {isMobile ? "Loading Trek.IQ..." : "Initializing Trek.IQ System..."}
            </h2>
            <p 
              className={`${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}
              id="loading-message"
              aria-live="polite"
            >
              {systemLoadingMessage}
            </p>
            <div className="flex items-center justify-center space-x-2" aria-hidden="true">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar - Navigation Header */}
      <header role="banner">
        <TopBar
          onToggleMenu={handleSideMenuToggle}
          onSearchToggle={handleSearchPanelToggle}
          isSearchPanelOpen={isSearchPanelOpen}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
          onSystemStatusToggle={handleSystemStatusOpen}
          isMobile={isMobile}
        />
      </header>

      {/* Main Content Area */}
      <main id="main-content" role="main" className="main-content" aria-label="Map and navigation interface">
        {/* Map Canvas */}
        <div 
          id="map-canvas" 
          role="region" 
          aria-label="Interactive map showing routes and accessibility information"
        >
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
        </div>

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
          <aside 
            id="search-panel"
            role="search" 
            aria-label="Route search and planning"
          >
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
              clearSearchLoading={clearSearchLoading}
              onClearSearchLoadingReset={() => setClearSearchLoading(false)}
            />
          </aside>
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

        {/* Route Generation Loading */}
        {isGeneratingRoute && (
          <RouteGenerationLoading 
            isVisible={true}
            isDarkMode={currentTheme === "dark"}
          />
        )}

        {/* Route Panels - Only show when explicitly opened */}
        {route && !isNavigating && isRoutePanelOpen && (
          <aside 
            role="complementary" 
            aria-label="Route details and options"
          >
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
          </aside>
        )}

        {route && isNavigating && isDirectionsPanelOpen && (
          <aside 
            role="complementary" 
            aria-label="Turn-by-turn navigation directions"
            aria-live="polite"
          >
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
          </aside>
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
        <nav 
          role="navigation" 
          aria-label="Main navigation menu"
          aria-hidden={!isSideMenuOpen}
        >
          <SideMenu
            isOpen={isSideMenuOpen}
            onClose={() => setIsSideMenuOpen(false)}
            currentTheme={currentTheme}
            onThemeChange={setCurrentTheme}
            voiceGuidanceEnabled={voiceGuidanceEnabled}
            onVoiceGuidanceToggle={setVoiceGuidanceEnabled}
            onNavigate={handleNavigate}
          />
        </nav>

        {/* Simplified Layers Panel */}
        <aside 
          role="complementary" 
          aria-label="Map layers control panel"
          aria-hidden={!isLayersPanelOpen}
        >
          <SimplifiedLayersPanel
            isOpen={isLayersPanelOpen}
            isDarkMode={currentTheme === "dark"}
            onClose={() => setIsLayersPanelOpen(false)}
            activeLayers={activeLayers}
            onLayerToggle={handleLayerToggle}
          />
        </aside>

        {/* Report Barrier Modal */}
        <div 
          role="dialog" 
          aria-modal={isReportModalOpen}
          aria-labelledby="barrier-report-title"
          aria-hidden={!isReportModalOpen}
        >
          <ReportBarrierModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            onReport={handleReportSubmit}
            userLocation={userLocation}
            isDarkMode={currentTheme === "dark"}
          />
        </div>

        {/* Transit Info - Only show when explicitly opened */}
        {isTransitInfoOpen && (
          <aside 
            role="complementary" 
            aria-label="Transit information"
            aria-hidden={!isTransitInfoOpen}
          >
            <TransitInfo
              isOpen={isTransitInfoOpen}
              onClose={() => setIsTransitInfoOpen(false)}
            />
          </aside>
        )}

        {/* Liability Barrier Alert - Removed old component */}

        {/* Loading Spinner */}
        {isMapLoading && (
          <div role="status" aria-live="polite" aria-label="Loading map">
            <LoadingSpinner />
          </div>
        )}

        {/* System Status Panel */}
        <aside 
          role="complementary" 
          aria-label="System status information"
          aria-hidden={!isSystemStatusOpen}
        >
          <SystemStatusPanel
            isOpen={isSystemStatusOpen}
            onClose={() => setIsSystemStatusOpen(false)}
          />
        </aside>


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
      </main>

      {/* Added lazy loading for the routes */}
      <Suspense 
        fallback={
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading page content...</span>
          </div>
        }
      >
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
