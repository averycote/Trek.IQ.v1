import React, { useState, useEffect } from 'react';
import useGeocoding from '../hooks/useGeocoding';
import routingService from '../services/routingService';
import accessibilityService from '../services/accessibilityService';
import toast from 'react-hot-toast';

const SearchPanel = ({ onOriginChange, onDestinationChange, onRouteRequest, onShowDirections, isDarkMode, settings, routeMode, onModeChange }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originResults, setOriginResults] = useState([]);
  const [destinationResults, setDestinationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [routeOptions, setRouteOptions] = useState({
    avoidSteps: false,
    winterMode: false,
    preferAccessible: true,
    includeTransit: false,
    includeAmenities: false
  });

  const {
    results: originResultsFromHook,
    loading: originLoading,
    search: searchAddress
  } = useGeocoding();

  const {
    results: destinationResultsFromHook,
    loading: destinationLoading,
    search: searchDestinationAddress
  } = useGeocoding();

  useEffect(() => {
    setOriginResults(originResultsFromHook);
  }, [originResultsFromHook]);

  useEffect(() => {
    setDestinationResults(destinationResultsFromHook);
  }, [destinationResultsFromHook]);

  const handleRouteRequest = async () => {
    if (!origin || !destination) {
      toast.error('Please enter both origin and destination');
      return;
    }

    setIsLoading(true);
    
    try {
      // Use the new enhanced routing service with address support
      const route = await routingService.calculateRouteWithAddresses(
        origin, 
        destination, 
        {
          mode: routeMode || 'walking',
          ...routeOptions,
          // Add accessibility settings from global settings
          highContrast: settings.highContrast,
          reduceMotion: settings.reduceMotion,
          voiceNavigation: settings.voiceNavigation
        }
      );

      // Announce route with accessibility service
      if (settings.voiceNavigation) {
        accessibilityService.announceRoute(route);
      }

      // Provide haptic feedback
      accessibilityService.hapticFeedback('success');

      // Call the parent handler with enhanced route data
      onRouteRequest(route);
      
      // Show directions panel if requested
      if (onShowDirections) {
        onShowDirections(route);
      }

      toast.success(`Route found! ${route.features[0].properties.distance} km, ${route.features[0].properties.duration} min`);

    } catch (error) {
      console.error('Route calculation error:', error);
      toast.error('Failed to calculate route. Please try again.');
      accessibilityService.hapticFeedback('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionChange = (option, value) => {
    setRouteOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };



  const swapLocations = () => {
    const tempOrigin = origin;
    const tempOriginResults = originResults;
    
    setOrigin(destination);
    setDestination(tempOrigin);
    
    if (originResults.length > 0 && destinationResults.length > 0) {
      onOriginChange({
        lat: parseFloat(destinationResults[0].lat),
        lng: parseFloat(destinationResults[0].lon)
      });
      onDestinationChange({
        lat: parseFloat(tempOriginResults[0].lat),
        lng: parseFloat(tempOriginResults[0].lon)
      });
    }
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-display mb-2">Plan Your Route</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Find accessible routes around Halifax</p>
      </div>
      
      {/* Transportation Mode Selection */}
      <div className="mb-6">
        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Transportation Mode
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'walking', label: 'Walking', icon: '🚶', color: 'from-green-500 to-green-600' },
            { value: 'transit', label: 'Transit', icon: '🚌', color: 'from-blue-500 to-blue-600', comingSoon: true },
            { value: 'driving', label: 'Driving', icon: '🚗', color: 'from-purple-500 to-purple-600' }
          ].map(mode => (
            <button
              key={mode.value}
              onClick={() => !mode.comingSoon && onModeChange(mode.value)}
              disabled={mode.comingSoon}
              className={`p-3 rounded-xl border-2 transition-all duration-200 relative ${
                mode.comingSoon
                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                  : routeMode === mode.value
                    ? `bg-gradient-to-br ${mode.color} text-white border-transparent shadow-medium transform scale-105`
                    : isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500 hover:shadow-soft'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-soft'
              }`}
            >
              <div className="text-2xl mb-1">{mode.icon}</div>
              <div className="text-xs font-medium">
                {mode.label}
                {mode.comingSoon && (
                  <div className="text-xs text-gray-500 mt-1 font-normal">Coming Soon</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Origin Search */}
      <div className="mb-6">
        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Starting Point
        </label>
        <div className="relative">
          <input
            type="text"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              searchAddress(e.target.value, setOriginResults);
              // Announce search results for accessibility
              if (settings.voiceNavigation && e.target.value.length > 2) {
                setTimeout(() => {
                  accessibilityService.announceLocationResults(originResults, 'starting point');
                }, 1000);
              }
            }}
            placeholder="Enter address, civic number, or location name"
            className={`w-full p-4 border-2 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
          />
          {originLoading && (
            <div className="absolute right-4 top-4">
              <div className="loading-spinner"></div>
            </div>
          )}
          {originResults.length > 0 && (
            <div className={`absolute z-10 w-full mt-2 border-2 rounded-xl shadow-large ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
            }`}>
              {originResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setOrigin(result.display_name);
                    setOriginResults([]);
                    onOriginChange({
                      lat: parseFloat(result.lat),
                      lng: parseFloat(result.lon)
                    });
                    // Announce selection for accessibility
                    if (settings.voiceNavigation) {
                      accessibilityService.announceLocationSelected(result, 'starting point');
                    }
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${index === originResults.length - 1 ? 'rounded-b-xl' : ''}`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{result.display_name.split(',')[0]}</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {result.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          💡 Try: "1399 Barrington Street", "Halifax Public Gardens", or "Halifax Central Library"
        </div>
      </div>

      {/* Swap Button */}
      <div className="mb-6">
        <button
          onClick={swapLocations}
          className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
          aria-label="Swap origin and destination"
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-lg">⇅</span>
            <span className="font-medium">Swap Locations</span>
          </div>
        </button>
      </div>

      {/* Destination Search */}
      <div className="mb-6">
        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Destination
        </label>
        <div className="relative">
          <input
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              searchDestinationAddress(e.target.value, setDestinationResults);
              // Announce search results for accessibility
              if (settings.voiceNavigation && e.target.value.length > 2) {
                setTimeout(() => {
                  accessibilityService.announceLocationResults(destinationResults, 'destination');
                }, 1000);
              }
            }}
            placeholder="Enter address, civic number, or location name"
            className={`w-full p-4 border-2 rounded-xl transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
            }`}
          />
          {destinationLoading && (
            <div className="absolute right-4 top-4">
              <div className="loading-spinner"></div>
            </div>
          )}
          {destinationResults.length > 0 && (
            <div className={`absolute z-10 w-full mt-2 border-2 rounded-xl shadow-large ${
              isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
            }`}>
              {destinationResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setDestination(result.display_name);
                    setDestinationResults([]);
                    onDestinationChange({
                      lat: parseFloat(result.lat),
                      lng: parseFloat(result.lon)
                    });
                    // Announce selection for accessibility
                    if (settings.voiceNavigation) {
                      accessibilityService.announceLocationSelected(result, 'destination');
                    }
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-150 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${index === destinationResults.length - 1 ? 'rounded-b-xl' : ''}`}
                >
                  <div className="font-semibold text-gray-900 dark:text-white">{result.display_name.split(',')[0]}</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {result.display_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          💡 Try: "1399 Barrington Street", "Halifax Public Gardens", or "Halifax Central Library"
        </div>
      </div>

      {/* Enhanced Route Options */}
      <div className="mb-6">
        <label className={`block text-sm font-semibold mb-3 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          Route Options
        </label>
        <div className="space-y-3">
          <label className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer">
            <input
              type="checkbox"
              checked={routeOptions.avoidSteps}
              onChange={(e) => handleOptionChange('avoidSteps', e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-3 text-sm font-medium">♿ Avoid steps and stairs</span>
          </label>
          
          <label className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer">
            <input
              type="checkbox"
              checked={routeOptions.winterMode}
              onChange={(e) => handleOptionChange('winterMode', e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-3 text-sm font-medium">❄️ Winter mode (snow routes)</span>
          </label>
          
          <label className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer">
            <input
              type="checkbox"
              checked={routeOptions.preferAccessible}
              onChange={(e) => handleOptionChange('preferAccessible', e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-3 text-sm font-medium">♿ Prefer accessible routes</span>
          </label>
          
          <label className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer">
            <input
              type="checkbox"
              checked={routeOptions.includeTransit}
              onChange={(e) => handleOptionChange('includeTransit', e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-3 text-sm font-medium">🚌 Include transit information</span>
          </label>
          
          <label className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer">
            <input
              type="checkbox"
              checked={routeOptions.includeAmenities}
              onChange={(e) => handleOptionChange('includeAmenities', e.target.checked)}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="ml-3 text-sm font-medium">🏪 Show nearby amenities</span>
          </label>
        </div>
      </div>

      {/* Find Route Button */}
      <div className="mb-6">
        <button
          onClick={handleRouteRequest}
          disabled={isLoading || !origin || !destination}
          className={`w-full p-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
            isLoading || !origin || !destination
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 shadow-soft hover:shadow-medium transform hover:-translate-y-0.5'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="loading-spinner mr-3"></div>
              <span>Finding Route...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <span className="mr-2">🗺️</span>
              <span>Find Route</span>
            </div>
          )}
        </button>
      </div>

      {/* Quick Tips */}
      <div className={`p-4 rounded-xl text-sm border-2 ${
        isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
      }`}>
        <h4 className="font-semibold mb-3 flex items-center">
          <span className="mr-2">💡</span>
          Quick Tips
        </h4>
        <ul className="space-y-2 text-xs">
          <li className="flex items-start">
            <span className="mr-2 mt-0.5">•</span>
            <span>Enable "Avoid steps" for wheelchair-accessible routes</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 mt-0.5">•</span>
            <span>Use "Winter mode" during snow conditions</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 mt-0.5">•</span>
            <span>Check "Include transit" for public transportation options</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 mt-0.5">•</span>
            <span>Enable "Show amenities" to find washrooms and services</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SearchPanel;
