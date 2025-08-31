import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LayerControl = ({ 
  layers, 
  onLayerToggle, 
  onLayerOpacityChange, 
  onLayerVisibilityChange,
  showAllLayers = false,
  onShowAllLayers 
}) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  // Define all municipal datasets with their categories and icons
  const layerCategories = {
    'Accessibility': {
      icon: '♿',
      layers: [
        { id: 'accessible_parking', name: 'Accessible Parking', icon: '🅿️', description: 'Designated accessible parking spots' },
        { id: 'steps', name: 'Steps & Ramps', icon: '🪜', description: 'Stair locations and accessibility features' },
        { id: 'public_washrooms', name: 'Public Washrooms', icon: '🚻', description: 'Public restroom facilities' }
      ]
    },
    'Infrastructure': {
      icon: '🏗️',
      layers: [
        { id: 'active_travelways', name: 'Active Travelways', icon: '🚶', description: 'Sidewalks and pedestrian paths' },
        { id: 'bike_infrastructure', name: 'Bike Infrastructure', icon: '🚲', description: 'Bicycle lanes and paths' },
        { id: 'street_lights', name: 'Street Lights', icon: '💡', description: 'Street lighting locations' },
        { id: 'traffic_control', name: 'Traffic Control', icon: '🚦', description: 'Traffic signals and signs' }
      ]
    },
    'Transit': {
      icon: '🚌',
      layers: [
        { id: 'bus_stops', name: 'Bus Stops', icon: '🚏', description: 'Transit bus stop locations' },
        { id: 'transit_shelters', name: 'Transit Shelters', icon: '🏠', description: 'Bus shelters and waiting areas' },
        { id: 'transit_routes', name: 'Transit Routes', icon: '🛣️', description: 'Bus route networks' }
      ]
    },
    'Closures & Maintenance': {
      icon: '🚧',
      layers: [
        { id: 'sidewalk_closures', name: 'Sidewalk Closures', icon: '🚧', description: 'Active sidewalk closures' },
        { id: 'street_closures', name: 'Street Closures', icon: '🚧', description: 'Active street closures' }
      ]
    },
    'Navigation': {
      icon: '🧭',
      layers: [
        { id: 'civic_addresses', name: 'Civic Addresses', icon: '📍', description: 'Street addresses and locations' },
        { id: 'street_junctions', name: 'Street Junctions', icon: '➕', description: 'Intersections and crosswalks' }
      ]
    }
  };

  // Filter layers based on search term
  const filteredCategories = Object.entries(layerCategories).filter(([categoryName, category]) => {
    if (!searchTerm) return true;
    
    const categoryMatches = categoryName.toLowerCase().includes(searchTerm.toLowerCase());
    const layerMatches = category.layers.some(layer => 
      layer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      layer.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    return categoryMatches || layerMatches;
  });

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

  const changeOpacity = (layerId, opacity) => {
    onLayerOpacityChange && onLayerOpacityChange(layerId, opacity);
  };

  const toggleVisibility = (layerId) => {
    onLayerVisibilityChange && onLayerVisibilityChange(layerId);
  };

  const getLayerStatus = (layerId) => {
    const layer = layers.find(l => l.id === layerId);
    return {
      visible: layer?.visible || false,
      opacity: layer?.opacity || 1,
      enabled: layer?.enabled || false
    };
  };

  const getCategoryStatus = (categoryLayers) => {
    const layerStatuses = categoryLayers.map(layer => getLayerStatus(layer.id));
    const visibleCount = layerStatuses.filter(status => status.visible).length;
    const enabledCount = layerStatuses.filter(status => status.enabled).length;
    
    return {
      allVisible: visibleCount === categoryLayers.length,
      someVisible: visibleCount > 0 && visibleCount < categoryLayers.length,
      allEnabled: enabledCount === categoryLayers.length,
      someEnabled: enabledCount > 0 && enabledCount < categoryLayers.length
    };
  };

  const toggleCategoryLayers = (categoryLayers, visible) => {
    categoryLayers.forEach(layer => {
      if (getLayerStatus(layer.id).enabled) {
        onLayerVisibilityChange && onLayerVisibilityChange(layer.id, visible);
      }
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Layers</h3>
        <div className="flex items-center space-x-2">
          {onShowAllLayers && (
            <button
              onClick={() => onShowAllLayers(!showAllLayers)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                showAllLayers 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {showAllLayers ? 'Hide All' : 'Show All'}
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Layer Categories */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredCategories.map(([categoryName, category]) => {
          const categoryStatus = getCategoryStatus(category.layers);
          const isExpanded = expandedCategories.has(categoryName);
          
          return (
            <div key={categoryName} className="border border-gray-200 rounded-md">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(categoryName)}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{categoryName}</span>
                  <span className="text-xs text-gray-500">
                    ({category.layers.filter(layer => getLayerStatus(layer.id).enabled).length} enabled)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Category visibility indicator */}
                  <div className="flex items-center space-x-1">
                    {categoryStatus.allVisible ? (
                      <EyeIcon className="h-4 w-4 text-green-600" />
                    ) : categoryStatus.someVisible ? (
                      <EyeIcon className="h-4 w-4 text-yellow-600" />
                    ) : (
                      <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                  )}
                </div>
              </button>

              {/* Category Actions */}
              {isExpanded && (
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Category Actions:</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => toggleCategoryLayers(category.layers, true)}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        Show All
                      </button>
                      <button
                        onClick={() => toggleCategoryLayers(category.layers, false)}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        Hide All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Layer List */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {category.layers.map((layer) => {
                    const status = getLayerStatus(layer.id);
                    
                    return (
                      <div key={layer.id} className="px-3 py-2 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            <span className="text-base">{layer.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {layer.name}
                                </span>
                                {!status.enabled && (
                                  <span className="text-xs text-gray-400">(Disabled)</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate">
                                {layer.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {/* Visibility Toggle */}
                            <button
                              onClick={() => toggleVisibility(layer.id)}
                              disabled={!status.enabled}
                              className={`p-1 rounded transition-colors ${
                                status.enabled 
                                  ? 'hover:bg-gray-200' 
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              {status.visible ? (
                                <EyeIcon className="h-4 w-4 text-green-600" />
                              ) : (
                                <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                            
                            {/* Layer Toggle */}
                            <button
                              onClick={() => toggleLayer(layer.id)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                status.enabled
                                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {status.enabled ? 'On' : 'Off'}
                            </button>
                          </div>
                        </div>

                        {/* Opacity Slider */}
                        {status.enabled && status.visible && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-xs text-gray-500 w-12">Opacity:</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={status.opacity}
                              onChange={(e) => changeOpacity(layer.id, parseFloat(e.target.value))}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-xs text-gray-500 w-8">
                              {Math.round(status.opacity * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-4 w-4 text-green-600" />
            <span>All layers visible</span>
          </div>
          <div className="flex items-center space-x-2">
            <EyeIcon className="h-4 w-4 text-yellow-600" />
            <span>Some layers visible</span>
          </div>
          <div className="flex items-center space-x-2">
            <EyeSlashIcon className="h-4 w-4 text-gray-400" />
            <span>No layers visible</span>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Dataset Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>All datasets are sourced from Halifax Regional Municipality</p>
          <p>Data is updated regularly for accuracy</p>
          <p>Accessibility features are highlighted for inclusive navigation</p>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default LayerControl;
