import React, { useState, useEffect } from "react";
import accessibilityService from "../services/accessibilityService";
import BarrierReportFAB from "./BarrierReportFAB";

// Enhanced utility function to generate turn-by-turn directions with street names
const generateDirectionsFromRoute = async (route) => {
  if (!route || !route.features || !route.features[0]) {
    return [];
  }

  const feature = route.features[0];
  const coordinates = feature.geometry?.coordinates || [];
  const properties = feature.properties || {};

  if (coordinates.length < 2) {
    return [];
  }

  const directions = [];
  let stepNumber = 1;

  // Import geocoding service for street name resolution
  let geocodingService = null;
  try {
    const { default: GeocodingService } = await import('../services/geocodingService');
    geocodingService = new GeocodingService();
  } catch (error) {
    console.warn('Could not load geocoding service for street names:', error);
  }

  // Helper function to get street name from coordinates
  const getStreetName = async (coordinates) => {
    if (!geocodingService) return null;
    
    try {
      const result = await geocodingService.reverseGeocode(coordinates);
      if (result && result.address) {
        // Extract street name from address
        const addressParts = result.address.split(',');
        const streetName = addressParts[0]?.trim();
        return streetName || null;
      }
    } catch (error) {
      console.warn('Failed to get street name for coordinates:', coordinates, error);
    }
    return null;
  };

  // Calculate bearing between consecutive points to determine turns
  const calculateBearing = (coord1, coord2) => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;

    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  // Calculate distance between two coordinates
  const calculateDistance = (coord1, coord2) => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // Generate initial direction
  if (coordinates.length >= 2) {
    const firstBearing = calculateBearing(coordinates[0], coordinates[1]);
    const distance = calculateDistance(coordinates[0], coordinates[1]);
    const streetName = await getStreetName(coordinates[1]);

    const distanceText = distance >= 1000 
      ? `${(distance / 1000).toFixed(1)} km` 
      : `${Math.round(distance)} m`;
    
    const instruction = streetName 
      ? `Start heading ${getBearingDirection(firstBearing)} on ${streetName} (${distanceText})`
      : `Start heading ${getBearingDirection(firstBearing)} (${distanceText})`;

    directions.push({
      step: stepNumber++,
      instruction: instruction,
      distance: Math.round(distance),
      mode: properties.mode || "walking",
      bearing: firstBearing,
      streetName: streetName
    });
  }

  // Generate directions for route segments
  for (let i = 1; i < coordinates.length - 1; i++) {
    const prevCoord = coordinates[i - 1];
    const currentCoord = coordinates[i];
    const nextCoord = coordinates[i + 1];

    const prevBearing = calculateBearing(prevCoord, currentCoord);
    const nextBearing = calculateBearing(currentCoord, nextCoord);
    const distance = calculateDistance(currentCoord, nextCoord);

    // Calculate turn angle
    let turnAngle = nextBearing - prevBearing;
    if (turnAngle > 180) turnAngle -= 360;
    if (turnAngle < -180) turnAngle += 360;

    // Get street name for the next segment
    const streetName = await getStreetName(nextCoord);

    // Generate instruction based on turn angle with enhanced descriptions
    let instruction = "";
    if (Math.abs(turnAngle) < 10) {
      instruction = streetName ? `Continue straight on ${streetName}` : "Continue straight";
    } else if (turnAngle > 10 && turnAngle < 45) {
      instruction = streetName ? `Bear right onto ${streetName}` : "Bear right";
    } else if (turnAngle >= 45 && turnAngle < 135) {
      instruction = streetName ? `Turn right onto ${streetName}` : "Turn right";
    } else if (turnAngle >= 135) {
      instruction = streetName ? `Sharp right onto ${streetName}` : "Sharp right";
    } else if (turnAngle < -10 && turnAngle > -45) {
      instruction = streetName ? `Bear left onto ${streetName}` : "Bear left";
    } else if (turnAngle <= -45 && turnAngle > -135) {
      instruction = streetName ? `Turn left onto ${streetName}` : "Turn left";
    } else if (turnAngle <= -135) {
      instruction = streetName ? `Sharp left onto ${streetName}` : "Sharp left";
    }

    // Add distance information to make instructions more helpful
    if (distance > 100) {
      const distanceText = distance >= 1000 
        ? `${(distance / 1000).toFixed(1)} km` 
        : `${Math.round(distance)} m`;
      instruction += ` (${distanceText})`;
    }

    if (distance > 50) {
      // Only add direction if segment is significant
      directions.push({
        step: stepNumber++,
        instruction: instruction,
        distance: Math.round(distance),
        mode: properties.mode || "walking",
        bearing: nextBearing,
        turnAngle: turnAngle,
        streetName: streetName
      });
    }
  }

  // Add final direction
  if (coordinates.length >= 2) {
    const lastCoord = coordinates[coordinates.length - 1];
    const secondLastCoord = coordinates[coordinates.length - 2];
    const finalDistance = calculateDistance(secondLastCoord, lastCoord);
    const destinationStreetName = await getStreetName(lastCoord);

    const instruction = destinationStreetName 
      ? `Arrive at destination on ${destinationStreetName}`
      : "Arrive at destination";

    directions.push({
      step: stepNumber,
      instruction: instruction,
      distance: Math.round(finalDistance),
      mode: properties.mode || "walking",
      bearing: 0,
      streetName: destinationStreetName
    });
  }

  return directions;
};

// Helper function to convert bearing to cardinal direction
const getBearingDirection = (bearing) => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

const DirectionsPanel = ({
  route,
  isOpen,
  onClose,
  isDarkMode,
  settings = {},
  onReportBarrier,
  isMobile,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [directions, setDirections] = useState([]);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);

  const accessibleParking = route?.accessibleParking || [];

  // Generate directions when route changes
  useEffect(() => {
    const generateDirections = async () => {
      if (!route) {
        setDirections([]);
        return;
      }

      setIsLoadingDirections(true);
      try {
        // Handle different route data structures
        let generatedDirections = [];
        
        if (route.directions) {
          generatedDirections = route.directions;
        } else if (route.steps) {
          generatedDirections = route.steps;
        } else {
          generatedDirections = await generateDirectionsFromRoute(route);
        }
        
        setDirections(generatedDirections || []);
      } catch (error) {
        console.error('Error generating directions:', error);
        setDirections([]);
      } finally {
        setIsLoadingDirections(false);
      }
    };

    generateDirections();
  }, [route]);

  // Extract route properties based on data structure
  const routeProperties = route?.features?.[0]?.properties || route || {};

  useEffect(() => {
    if (isAutoPlay && directions.length > 0) {
      const interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < directions.length - 1) {
            return prev + 1;
          } else {
            setIsAutoPlay(false);
            return prev;
          }
        });
      }, 5000); // 5 seconds per step

      return () => clearInterval(interval);
    }
  }, [isAutoPlay, directions.length]);

  useEffect(() => {
    if (settings.voiceNavigation && route && directions.length > 0) {
      accessibilityService.announceRoute(route);
    }
  }, [route, settings.voiceNavigation, directions.length]);

  const handleStepClick = (stepIndex) => {
    setCurrentStep(stepIndex);
    if (settings.voiceNavigation) {
      const step = directions[stepIndex];
      accessibilityService.speak(`Step ${step.step}: ${step.instruction}`);
    }
    if (settings.hapticFeedback) {
      accessibilityService.hapticFeedback("light");
    }
  };

  const toggleAutoPlay = () => {
    setIsAutoPlay(!isAutoPlay);
    if (!isAutoPlay && settings.voiceNavigation) {
      accessibilityService.speak(
        "Starting auto-play navigation. Each step will be announced every 5 seconds."
      );
    }
  };

  const getModeIcon = (mode) => {
    const icons = {
      walking: "🚶",
      transit: "🚌",
      driving: "🚗",
    };
    return icons[mode] || "📍";
  };

  const getAccessibilityIcon = (accessibility) => {
    if (!accessibility) return null;

    const icons = [];
    if (accessibility.hasSidewalks) icons.push("🛣️");
    if (accessibility.hasCurbCuts) icons.push("♿");
    if (accessibility.avoidSteps) icons.push("🚫");
    if (accessibility.winterMode) icons.push("❄️");

    return icons.join(" ");
  };

  const getTextSizeClass = () => {
    const sizes = {
      small: "text-sm",
      medium: "text-base",
      large: "text-lg",
      "extra-large": "text-xl",
    };
    return sizes[settings.textSize] || "text-base";
  };

  if (!isOpen || !route) return null;

  // Show loading state while generating directions
  if (isLoadingDirections) {
    return (
      <div
        className={`fixed z-40 ${
          window.innerWidth <= 768
            ? "bottom-0 left-0 right-0"
            : "bottom-4 right-4 w-96"
        } bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generating Directions
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ×
            </button>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            Loading detailed directions with street names...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-40 ${
        window.innerWidth <= 768
          ? "bottom-24 left-4 right-4 top-auto max-h-72 h-72"
          : "right-4 top-20 w-96 max-h-[calc(100vh-6rem)]"
      }`}
    >
      {isMobile && window.innerWidth <= 768 && (
        <div className="absolute right-4 top-[-1rem]  ">
          <BarrierReportFAB onReportBarrier={onReportBarrier} />
        </div>
      )}{" "}
      <div
        className={`fixed overflow-hidden rounded-lg shadow-xl z-40 ${
          isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
        } ${
          window.innerWidth <= 768
            ? "bottom-10 left-4 right-4 top-auto max-h-72"
            : "right-4 top-20 w-96 max-h-[calc(100vh-6rem)]"
        }`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className={`font-semibold ${getTextSizeClass()}`}>
              Step-by-Step Directions
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={toggleAutoPlay}
                className={`size-12 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isAutoPlay
                    ? "bg-red-600 text-white"
                    : isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                aria-label={isAutoPlay ? "Stop auto-play" : "Start auto-play"}
              >
                {isAutoPlay ? "⏸️" : "▶️"}
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`size-12 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? "📉" : "📈"}
              </button>
              <button
                onClick={onClose}
                className={`size-12 p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                aria-label="Close directions"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Route Summary */}
          <div
            className={`mt-3 p-3 rounded-md ${
              isDarkMode ? "bg-gray-700" : "bg-gray-100"
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className={`font-medium ${getTextSizeClass()}`}>
                  {(() => {
                    const distance = routeProperties.distance || 0;
                    if (distance >= 1000) {
                      return `${(distance / 1000).toFixed(1)} km`;
                    }
                    return `${Math.round(distance)} m`;
                  })()}
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {(() => {
                    const duration = routeProperties.duration || 0;
                    if (duration >= 3600) {
                      // More than 1 hour
                      const hours = Math.floor(duration / 3600);
                      const minutes = Math.round((duration % 3600) / 60);
                      return minutes > 0
                        ? `${hours}h ${minutes}m`
                        : `${hours}h`;
                    }
                    return `${Math.round(duration / 60)} min`;
                  })()}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {routeProperties.mode || "walking"}
                </p>
                {routeProperties.avoidSteps && (
                  <p className="text-xs text-blue-600">♿ Accessible Route</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`overflow-y-auto ${isExpanded ? "h-96" : "h-64"}`}>
          {directions.length === 0 ? (
            <div className="p-4 text-center">
              <p
                className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                No directions available
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {directions.map((step, index) => (
                <div
                  key={index}
                  onClick={() => handleStepClick(index)}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    index === currentStep
                      ? isDarkMode
                        ? "bg-blue-600 text-white"
                        : "bg-blue-100 border-l-4 border-blue-600"
                      : isDarkMode
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleStepClick(index);
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        index === currentStep
                          ? "bg-white text-blue-600"
                          : isDarkMode
                          ? "bg-gray-600 text-white"
                          : "bg-gray-300 text-gray-700"
                      }`}
                    >
                      {step.step}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">
                          {getModeIcon(step.mode)}
                        </span>
                        <p className={`font-medium ${getTextSizeClass()}`}>
                          {step.instruction}
                        </p>
                      </div>

                      {step.distance > 0 && (
                        <p
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {step.distance} meters
                        </p>
                      )}

                      {step.accessibility && (
                        <div className="mt-2 flex items-center space-x-1">
                          <span className="text-xs">
                            {getAccessibilityIcon(step.accessibility)}
                          </span>
                          <span
                            className={`text-xs ${
                              isDarkMode ? "text-gray-300" : "text-gray-600"
                            }`}
                          >
                            {step.accessibility.surfaceType} surface
                            {step.accessibility.hasSidewalks && ", sidewalks"}
                            {step.accessibility.hasCurbCuts && ", curb cuts"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accessible Parking Section for Driving Routes */}
        {routeProperties.mode === "driving" && accessibleParking.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className={`font-semibold mb-3 ${getTextSizeClass()}`}>
              🚗 Accessible Parking Near Destination
            </h4>
            <div className="space-y-3">
              {accessibleParking.map((spot, index) => (
                <div
                  key={spot.id}
                  className={`p-3 rounded-md ${
                    isDarkMode ? "bg-gray-700" : "bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h5 className={`font-medium ${getTextSizeClass()}`}>
                      {spot.name}
                    </h5>
                    <span
                      className={`text-sm ${
                        isDarkMode ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {spot.distance}m away
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                    <div>
                      <span
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Time Limit:
                      </span>
                      <span className="ml-1 font-medium">{spot.timeLimit}</span>
                    </div>
                    <div>
                      <span
                        className={`${
                          isDarkMode ? "text-gray-300" : "text-gray-600"
                        }`}
                      >
                        Cost:
                      </span>
                      <span className="ml-1 font-medium">{spot.cost}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {spot.features.map((feature, featureIndex) => (
                      <span
                        key={featureIndex}
                        className={`px-2 py-1 rounded-full text-xs ${
                          isDarkMode
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        {directions.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <button
                onClick={() => handleStepClick(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className={`px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentStep === 0
                    ? "opacity-50 cursor-not-allowed"
                    : isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                ← Previous
              </button>

              <span
                className={`text-sm ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {currentStep + 1} of {directions.length}
              </span>

              <button
                onClick={() =>
                  handleStepClick(
                    Math.min(directions.length - 1, currentStep + 1)
                  )
                }
                disabled={currentStep === directions.length - 1}
                className={`px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  currentStep === directions.length - 1
                    ? "opacity-50 cursor-not-allowed"
                    : isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DirectionsPanel;
