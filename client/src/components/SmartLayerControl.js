import React, { useState, useEffect } from 'react';
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  EyeIcon, 
  EyeSlashIcon,
  FunnelIcon,
  MapIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const SmartLayerControl = ({ 
  layers, 
  onLayerToggle, 
  routeMode = 'walking',
  isDarkMode = false,
  onShowAllLayers,
  showAllLayers = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedLayers, setShowAdvancedLayers] = useState(false);

  // Mode-specific critical layers
  const criticalLayersByMode = {
    walking: [
      'active_travelways',
      'steps',
      'sidewalk_closures'
    ],
    driving: [
      'accessible_parking',
      'street_closures',
      'traffic_control'
    ],
    transit: [
      'bus_stops',
      'transit_routes',
      'transit_shelters'
    ]
  };

  // All layer categories with smart organization
  const layerCategories = {
    'Critical': {
      icon: '🎯',
      description: 'Essential layers for current mode',
      layers: [
        { id: 'active_travelways', name: 'Active Travelways', icon: '🚶', description: 'Sidewalks and pedestrian paths' },
        { id: 'steps', name: 'Steps & Ramps', icon: '🪜', description: 'Stair locations and accessibility features' },
        { id: 'sidewalk_closures', name: 'Sidewalk Closures', icon: '🚧', description: 'Active sidewalk closures' },
        { id: 'accessible_parking', name: 'Accessible Parking', icon: '🅿️', description: 'Designated accessible parking spots' },
        { id: 'street_closures', name: 'Street Closures', icon: '🚧', description: 'Active street closures' },
        { id: 'traffic_control', name: 'Traffic Control', icon: '🚦', description: 'Traffic signals and signs' },
        { id: 'bus_stops', name: 'Bus Stops', icon: '🚏', description: 'Transit bus stop locations' },
        { id: 'transit_routes', name: 'Transit Routes', icon: '🛣️', description: 'Bus route networks' },
        { id: 'transit_shelters', name: 'Transit Shelters', icon: '🏠', description: 'Bus shelters and waiting areas' }
      ]
    },
    'Accessibility': {
      icon: '♿',
      description: 'Accessibility and inclusive design features',
      layers: [
        { id: 'public_washrooms', name: 'Public Washrooms', icon: '🚻', description: 'Public restroom facilities' },
        { id: 'street_lights', name: 'Street Lights', icon: '💡', description: 'Street lighting for safety' },
        { id: 'street_junctions', name: 'Street Junctions', icon: '➕', description: 'Intersections and crosswalks' }
      ]
    },
    'Infrastructure': {
      icon: '🏗️',
      description: 'Transportation and urban infrastructure',
      layers: [
        { id: 'bike_infrastructure', name: 'Bike Infrastructure', icon: '🚲', description: 'Bicycle lanes and paths' },
        { id: 'civic_addresses', name: 'Civic Addresses', icon: '📍', description: 'Street addresses and locations' }
      ]
    }
  };

  // Get critical layers for current mode
  const getCriticalLayers = () => {
    return criticalLayersByMode[routeMode] || [];
  };

  // Check if layer is critical for current mode
  const isCriticalLayer = (layerId) => {
    return getCriticalLayers().includes(layerId);
  };

  // Filter layers based on search term and mode
  const getFilteredCategories = () => {
    const criticalLayers = getCriticalLayers();
    
    return Object.entries(layerCategories).map(([categoryName, category]) => {
      const filteredLayers = category.layers.filter(layer => {
        // Always show critical layers
        if (isCriticalLayer(layer.id)) return true;
        
        // Show all layers if advanced mode is on
        if (showAdvancedLayers) return true;
        
        // Filter by search term
        if (searchTerm) {
          return layer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 layer.description.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        return false;
      });

      return {
        categoryName,
        ...category,
        layers: filteredLayers
      };
    }).filter(category => category.layers.length > 0);
  };

  const toggleCategory = (categoryName) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleLayer = (layerId) => {
    onLayerToggle && onLayerToggle(layerId);
  };

  const getLayerStatus = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    return {
      visible: layer?.visible || false,
      enabled: layer?.enabled || false
    };
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

  const filteredCategories = getFilteredCategories();

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className={`p-4 rounded-lg shadow-xl max-h-96 overflow-y-auto ${
        isDarkMode 
          ? 'bg-gray-800 border border-gray-600' 
          : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            <h3 className="font-semibold text-lg">Smart Layers</h3>
            <span className={`px-2 py-1 text-xs rounded-full text-white ${getModeColor(routeMode)}`}>
              {getModeIcon(routeMode)} {routeMode.charAt(0).toUpperCase() + routeMode.slice(1)}
            </span>
          </div>
        </div>

        {/* Mode-specific critical layers info */}
        <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <FunnelIcon className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Critical Layers for {routeMode}</span>
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">
            Showing essential layers for {routeMode} mode. Toggle advanced layers below.
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search layers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-2 rounded-md border text-sm ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
        </div>

        {/* Advanced layers toggle */}
        <div className="mb-4">
          <button
            onClick={() => onShowAllLayers && onShowAllLayers(!showAdvancedLayers)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
              showAdvancedLayers
                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                : isDarkMode
                  ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Cog6ToothIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {showAdvancedLayers ? 'Hide Advanced Layers' : 'Show All Layers'}
              </span>
            </div>
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showAdvancedLayers ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Layer Categories */}
        <div className="space-y-3">
          {filteredCategories.map(({ categoryName, icon, description, layers: categoryLayers }) => (
            <div key={categoryName} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(categoryName)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <div className="font-medium text-sm">{categoryName}</div>
                    <div className="text-xs opacity-75">{description}</div>
                  </div>
                </div>
                {expandedCategories.has(categoryName) ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>

              {expandedCategories.has(categoryName) && (
                <div className={`p-3 space-y-2 ${
                  isDarkMode ? 'bg-gray-800' : 'bg-white'
                }`}>
                  {categoryLayers.map((layer) => {
                    const status = getLayerStatus(layer.id);
                    const isCritical = isCriticalLayer(layer.id);
                    
                    return (
                      <div
                        key={layer.id}
                        className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                          isCritical
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : isDarkMode
                              ? 'hover:bg-gray-700'
                              : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{layer.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{layer.name}</span>
                              {isCritical && (
                                <span className="px-1 py-0.5 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 text-xs rounded">
                                  Critical
                                </span>
                              )}
                            </div>
                            <div className="text-xs opacity-75">{layer.description}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleLayer(layer.id)}
                          className={`p-1 rounded transition-colors ${
                            status.visible
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {status.visible ? (
                            <EyeIcon className="w-4 h-4" />
                          ) : (
                            <EyeSlashIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No results message */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-4 text-sm opacity-75">
            No layers found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartLayerControl;
