import React, { useState, useEffect } from 'react';
import { 
  FunnelIcon, 
  XMarkIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const FiltersLayersPanel = ({ 
  activeLayers, 
  onToggleLayer, 
  isDarkMode, 
  routeMode, 
  onModeChange,
  isOpen,
  onToggle 
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['Accessibility']));

  // Define layers with mode-specific logic
  const layers = [
    {
      id: 'Active Travelways',
      name: 'Active Travelways',
      description: 'Walking paths, sidewalks, and pedestrian routes',
      category: 'Infrastructure',
      autoEnableFor: ['walking'],
      icon: '🚶'
    },
    {
      id: 'Transit Bus Routes',
      name: 'Transit Bus Routes',
      description: 'Halifax Transit bus routes and schedules',
      category: 'Transit',
      autoEnableFor: ['transit'],
      icon: '🚌'
    },
    {
      id: 'Bus Stops',
      name: 'Bus Stops',
      description: 'Halifax Transit bus stops with accessibility info',
      category: 'Transit',
      autoEnableFor: ['transit'],
      icon: '🚏'
    },
    {
      id: 'Transit Shelters',
      name: 'Transit Shelters',
      description: 'Bus stops with covered shelters',
      category: 'Transit',
      autoEnableFor: ['transit'],
      icon: '🏠'
    },
    {
      id: 'Snow Routes',
      name: 'Snow Routes',
      description: 'Bus routes during winter weather conditions',
      category: 'Transit',
      autoEnableFor: ['transit'],
      icon: '❄️'
    },
    {
      id: 'Bike Infrastructure',
      name: 'Bike Infrastructure',
      description: 'Bike lanes, paths, and suggested cycling routes',
      category: 'Infrastructure',
      autoEnableFor: ['walking'],
      icon: '🚲'
    },
    {
      id: 'Steps & Ramps',
      name: 'Steps & Ramps',
      description: 'Staircases, ramps, and elevation changes',
      category: 'Accessibility',
      autoEnableFor: ['walking'],
      icon: '🪜'
    },
    {
      id: 'Accessible Parking',
      name: 'Accessible Parking',
      description: 'Designated accessible parking spaces',
      category: 'Accessibility',
      autoEnableFor: ['driving'],
      icon: '🅿️'
    },
    {
      id: 'Public Washrooms',
      name: 'Public Washrooms',
      description: 'Public restroom facilities with accessibility info',
      category: 'Amenities',
      autoEnableFor: ['walking', 'transit'],
      icon: '🚻'
    },
    {
      id: 'Street Lights',
      name: 'Street Lights',
      description: 'Street lighting infrastructure',
      category: 'Infrastructure',
      autoEnableFor: ['walking'],
      icon: '💡'
    },
    {
      id: 'Traffic Control',
      name: 'Traffic Control',
      description: 'Traffic signals, signs, and control devices',
      category: 'Infrastructure',
      autoEnableFor: ['driving'],
      icon: '🚦'
    },
    {
      id: 'Street Closures',
      name: 'Street Closures',
      description: 'Current and planned street closures',
      category: 'Infrastructure',
      autoEnableFor: ['walking', 'driving', 'transit'],
      icon: '🚧'
    },
    {
      id: 'Sidewalk Closures',
      name: 'Sidewalk Closures',
      description: 'Planned sidewalk maintenance and closures',
      category: 'Infrastructure',
      autoEnableFor: ['walking'],
      icon: '🚧'
    },
    {
      id: 'Street Junctions',
      name: 'Street Junctions',
      description: 'Street intersections and junctions',
      category: 'Infrastructure',
      autoEnableFor: ['walking', 'driving'],
      icon: '➕'
    },
    {
      id: 'Civic Addresses',
      name: 'Civic Addresses',
      description: 'HRM civic address database',
      category: 'Reference',
      autoEnableFor: ['walking', 'driving', 'transit'],
      icon: '📍'
    }
  ];

  const categories = [...new Set(layers.map(layer => layer.category))];

  // Auto-apply filters based on mode
  useEffect(() => {
    if (routeMode) {
      const layersToEnable = layers.filter(layer => 
        layer.autoEnableFor.includes(routeMode)
      );
      
      layersToEnable.forEach(layer => {
        if (!activeLayers.has(layer.id)) {
          onToggleLayer(layer.id);
        }
      });
    }
  }, [routeMode]);

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getModeDescription = (mode) => {
    switch (mode) {
      case 'walking':
        return 'Avoids steps, uses active travelways and winter-maintained sidewalks';
      case 'driving':
        return 'Routes to nearest accessible parking locations';
      case 'transit':
        return 'Routes to accessible transit stops';
      default:
        return '';
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      {/* Main Toggle Button */}
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200 ${
          isDarkMode 
            ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600' 
            : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200'
        }`}
        aria-label="Toggle filters and layers"
      >
        <FunnelIcon className="w-5 h-5" />
        <span className="font-medium">Filters / Layers</span>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronRightIcon className="w-4 h-4" />
        )}
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className={`mt-2 p-4 rounded-lg shadow-xl max-w-sm w-80 max-h-96 overflow-y-auto ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-600' 
            : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Filters & Layers</h3>
            <button
              onClick={onToggle}
              className={`p-1 rounded-full hover:bg-opacity-20 ${
                isDarkMode ? 'hover:bg-white' : 'hover:bg-gray-800'
              }`}
              aria-label="Close panel"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Travel Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {['walking', 'driving', 'transit'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    routeMode === mode
                      ? 'bg-blue-500 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            {routeMode && (
              <p className="text-xs mt-2 opacity-75">
                {getModeDescription(routeMode)}
              </p>
            )}
          </div>

          {/* Layer Categories */}
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category} className="border-b border-gray-300 dark:border-gray-600 pb-3">
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center justify-between w-full text-left font-medium mb-2"
                >
                  <span>{category}</span>
                  {expandedCategories.has(category) ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
                
                {expandedCategories.has(category) && (
                  <div className="space-y-2 ml-2">
                    {layers
                      .filter(layer => layer.category === category)
                      .map(layer => (
                        <div key={layer.id} className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleLayer(layer.id)}
                            className={`flex items-center gap-2 p-2 rounded-md text-sm transition-colors w-full ${
                              activeLayers.has(layer.id)
                                ? isDarkMode
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-800'
                                : isDarkMode
                                ? 'hover:bg-gray-700'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-lg">{layer.icon}</span>
                            <div className="flex-1 text-left">
                              <div className="font-medium">{layer.name}</div>
                              <div className="text-xs opacity-75">{layer.description}</div>
                            </div>
                            {activeLayers.has(layer.id) ? (
                              <EyeIcon className="w-4 h-4" />
                            ) : (
                              <EyeSlashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-gray-300 dark:border-gray-600">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  layers.forEach(layer => {
                    if (!activeLayers.has(layer.id)) {
                      onToggleLayer(layer.id);
                    }
                  });
                }}
                className="flex-1 px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
              >
                Show All
              </button>
              <button
                onClick={() => {
                  layers.forEach(layer => {
                    if (activeLayers.has(layer.id)) {
                      onToggleLayer(layer.id);
                    }
                  });
                }}
                className="flex-1 px-3 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                Hide All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersLayersPanel;
