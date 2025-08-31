import React, { useState, useEffect, useRef } from 'react';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  FunnelIcon,
  MapIcon,
  PersonWalkingIcon,
  CarIcon,
  BusIcon,
  Cog6ToothIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  CloudIcon,
  SnowflakeIcon,
  BoltIcon,
  ShieldCheckIcon,
  WifiIcon,
  PhoneIcon,
  HeartIcon,
  StarIcon,
  FlagIcon,
  HandRaisedIcon,
  WheelchairIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import accessibilityService from '../services/accessibilityService';

const EnhancedLayerControl = ({
  activeLayers,
  onLayerToggle,
  routeMode = 'walking',
  isDarkMode,
  accessibilitySettings = {},
  onAccessibilityToggle,
  isAccessibilityOpen,
  showAllLayers = false,
  onShowAllLayersToggle,
  isMobile = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set(['critical']));
  const [searchTerm, setSearchTerm] = useState('');
  const panelRef = useRef(null);

  // Define layer categories and their critical layers for each mode
  const layerCategories = {
    critical: {
      walking: [
        { id: 'active_travelways', name: 'Active Travelways', icon: '🚶', description: 'Walking paths and sidewalks' },
        { id: 'steps', name: 'Steps & Stairs', icon: '🪜', description: 'Staircases and elevation changes' },
        { id: 'sidewalk_closures', name: 'Sidewalk Closures', icon: '🚧', description: 'Closed or blocked sidewalks' }
      ],
      driving: [
        { id: 'accessible_parking', name: 'Accessible Parking', icon: '🅿️', description: 'Designated accessible parking spots' },
        { id: 'street_closures', name: 'Street Closures', icon: '🚧', description: 'Road closures and detours' },
        { id: 'traffic_control', name: 'Traffic Control', icon: '🚦', description: 'Traffic signals and signs' }
      ],
      transit: [
        { id: 'stops', name: 'Transit Stops', icon: '🚏', description: 'Bus and transit stops' },
        { id: 'routes', name: 'Transit Routes', icon: '🚌', description: 'Public transit routes' },
        { id: 'shelters', name: 'Transit Shelters', icon: '🏠', description: 'Bus shelters and waiting areas' }
      ]
    },
    accessibility: [
      { id: 'ramps', name: 'Accessibility Ramps', icon: '♿', description: 'Wheelchair ramps and accessible entrances' },
      { id: 'elevators', name: 'Elevators', icon: '🛗', description: 'Elevator locations' },
      { id: 'accessible_entrances', name: 'Accessible Entrances', icon: '🚪', description: 'Accessible building entrances' },
      { id: 'tactile_paving', name: 'Tactile Paving', icon: '🔲', description: 'Tactile walking surface indicators' },
      { id: 'audio_signals', name: 'Audio Signals', icon: '🔊', description: 'Audio traffic signals' }
    ],
    safety: [
      { id: 'lighting', name: 'Street Lighting', icon: '💡', description: 'Street light locations and status' },
      { id: 'crosswalks', name: 'Crosswalks', icon: '🚶‍♂️', description: 'Pedestrian crosswalks' },
      { id: 'speed_bumps', name: 'Speed Bumps', icon: '⚠️', description: 'Speed bumps and traffic calming' },
      { id: 'emergency_phones', name: 'Emergency Phones', icon: '📞', description: 'Emergency phone locations' }
    ],
    amenities: [
      { id: 'parking', name: 'Parking', icon: '🅿️', description: 'General parking locations' },
      { id: 'washrooms', name: 'Public Washrooms', icon: '🚻', description: 'Public restroom facilities' },
      { id: 'water_fountains', name: 'Water Fountains', icon: '🚰', description: 'Drinking water fountains' },
      { id: 'benches', name: 'Benches', icon: '🪑', description: 'Public seating areas' },
      { id: 'shade', name: 'Shade Areas', icon: '🌳', description: 'Shaded areas and trees' }
    ],
    seasonal: [
      { id: 'winter_maintenance', name: 'Winter Maintenance', icon: '❄️', description: 'Snow clearing and winter maintenance' },
      { id: 'summer_cooling', name: 'Summer Cooling', icon: '🌞', description: 'Cooling stations and shade' },
      { id: 'rain_shelters', name: 'Rain Shelters', icon: '🌧️', description: 'Covered areas for rain protection' }
    ],
    municipal: [
      { id: 'construction', name: 'Construction', icon: '🏗️', description: 'Active construction zones' },
      { id: 'maintenance', name: 'Maintenance', icon: '🔧', description: 'Ongoing maintenance work' },
      { id: 'events', name: 'Events', icon: '🎉', description: 'Special events and road closures' },
      { id: 'permits', name: 'Permits', icon: '📋', description: 'Special permits and restrictions' }
    ]
  };

  // Get critical layers for current mode
  const getCriticalLayers = () => {
    return layerCategories.critical[routeMode] || layerCategories.critical.walking;
  };

  // Get all layers for search
  const getAllLayers = () => {
    const allLayers = [];
    Object.entries(layerCategories).forEach(([category, layers]) => {
      if (category === 'critical') {
        // Add critical layers for all modes
        Object.values(layers).forEach(modeLayers => {
          allLayers.push(...modeLayers);
        });
      } else {
        allLayers.push(...layers);
      }
    });
    return allLayers;
  };

  // Filter layers based on search term
  const getFilteredLayers = () => {
    if (!searchTerm) return layerCategories;
    
    const filtered = {};
    Object.entries(layerCategories).forEach(([category, layers]) => {
      if (category === 'critical') {
        // Filter critical layers for all modes
        const filteredCritical = {};
        Object.entries(layers).forEach(([mode, modeLayers]) => {
          const filtered = modeLayers.filter(layer => 
            layer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            layer.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (filtered.length > 0) {
            filteredCritical[mode] = filtered;
          }
        });
        if (Object.keys(filteredCritical).length > 0) {
          filtered[category] = filteredCritical;
        }
      } else {
        const filtered = layers.filter(layer => 
          layer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          layer.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (filtered.length > 0) {
          filtered[category] = filtered;
        }
      }
    });
    return filtered;
  };

  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
    
    if (accessibilitySettings.voiceNavigation) {
      accessibilityService.announce(`${section} section ${newExpanded.has(section) ? 'expanded' : 'collapsed'}`);
    }
  };

  const handleLayerToggle = (layerId) => {
    onLayerToggle(layerId);
    accessibilityService.hapticFeedback('selection');
    
    if (accessibilitySettings.voiceNavigation) {
      const isActive = activeLayers.has(layerId);
      accessibilityService.announce(`${layerId} layer ${isActive ? 'disabled' : 'enabled'}`);
    }
  };

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'walking': return '🚶';
      case 'driving': return '🚗';
      case 'transit': return '🚌';
      default: return '📍';
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case 'walking': return 'bg-green-500';
      case 'driving': return 'bg-blue-500';
      case 'transit': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
        {/* Floating Action Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
            isOpen
              ? 'bg-blue-500 text-white'
              : isDarkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="Toggle layer control"
        >
          <FunnelIcon className="w-6 h-6" />
        </button>

        {/* Mobile Panel */}
        {isOpen && (
          <div className={`absolute top-16 right-0 w-80 max-h-96 overflow-hidden rounded-xl shadow-2xl ${
            isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'
          }`}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FunnelIcon className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Layers & Filters</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  aria-label="Close layer control"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
              
              {/* Mode Indicator */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-lg">{getModeIcon(routeMode)}</span>
                <span className="text-sm font-medium capitalize">{routeMode} Mode</span>
              </div>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search layers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />
                <FunnelIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-64">
              <div className="p-4 space-y-4">
                {/* Critical Layers */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                    Critical Layers
                  </h4>
                  <div className="space-y-2">
                    {getCriticalLayers().map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => handleLayerToggle(layer.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                          activeLayers.has(layer.id)
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                            : isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{layer.icon}</span>
                          <div className="text-left">
                            <div className="font-medium text-sm">{layer.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{layer.description}</div>
                          </div>
                        </div>
                        {activeLayers.has(layer.id) ? (
                          <EyeIcon className="w-4 h-4" />
                        ) : (
                          <EyeSlashIcon className="w-4 h-4" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show All Layers Toggle */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={onShowAllLayersToggle}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      showAllLayers
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        : isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600'
                          : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <SparklesIcon className="w-5 h-5" />
                      <span className="font-medium">Show All Layers</span>
                    </div>
                    {showAllLayers ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={`fixed top-4 right-4 z-50 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className={`w-80 rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-200'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Layers & Filters</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onAccessibilityToggle}
                className={`p-2 rounded-lg transition-colors ${
                  isAccessibilityOpen
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Accessibility settings"
              >
                <Cog6ToothIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                aria-label={isOpen ? 'Collapse panel' : 'Expand panel'}
              >
                {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          {/* Mode Indicator */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-lg">{getModeIcon(routeMode)}</span>
            <span className="text-sm font-medium capitalize">{routeMode} Mode</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getModeColor(routeMode)} text-white`}>
              Active
            </span>
          </div>
        </div>

        {isOpen && (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search layers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-8 pr-3 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />
                <FunnelIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              <div className="p-4 space-y-4">
                {Object.entries(getFilteredLayers()).map(([category, layers]) => {
                  if (category === 'critical') {
                    // Handle critical layers for different modes
                    return Object.entries(layers).map(([mode, modeLayers]) => (
                      <div key={`${category}-${mode}`}>
                        <button
                          onClick={() => toggleSection(`${category}-${mode}`)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                            <span className="font-medium">Critical ({mode})</span>
                            <span className="text-lg">{getModeIcon(mode)}</span>
                          </div>
                          {expandedSections.has(`${category}-${mode}`) ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                        
                        {expandedSections.has(`${category}-${mode}`) && (
                          <div className="ml-4 mt-2 space-y-1">
                            {modeLayers.map((layer) => (
                              <button
                                key={layer.id}
                                onClick={() => handleLayerToggle(layer.id)}
                                className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                                  activeLayers.has(layer.id)
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : isDarkMode
                                      ? 'hover:bg-gray-700'
                                      : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{layer.icon}</span>
                                  <span className="text-sm font-medium">{layer.name}</span>
                                </div>
                                {activeLayers.has(layer.id) ? (
                                  <EyeIcon className="w-3 h-3" />
                                ) : (
                                  <EyeSlashIcon className="w-3 h-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ));
                  } else {
                    // Handle other categories
                    return (
                      <div key={category}>
                        <button
                          onClick={() => toggleSection(category)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{category}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">({layers.length})</span>
                          </div>
                          {expandedSections.has(category) ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                        
                        {expandedSections.has(category) && (
                          <div className="ml-4 mt-2 space-y-1">
                            {layers.map((layer) => (
                              <button
                                key={layer.id}
                                onClick={() => handleLayerToggle(layer.id)}
                                className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                                  activeLayers.has(layer.id)
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                                    : isDarkMode
                                      ? 'hover:bg-gray-700'
                                      : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{layer.icon}</span>
                                  <span className="text-sm font-medium">{layer.name}</span>
                                </div>
                                {activeLayers.has(layer.id) ? (
                                  <EyeIcon className="w-3 h-3" />
                                ) : (
                                  <EyeSlashIcon className="w-3 h-3" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                })}

                {/* Show All Layers Toggle */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={onShowAllLayersToggle}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      showAllLayers
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
                        : isDarkMode
                          ? 'hover:bg-gray-700'
                          : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4" />
                      <span className="font-medium">Show All Layers</span>
                    </div>
                    {showAllLayers ? (
                      <CheckCircleIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedLayerControl;
