import React, { useState, useMemo } from "react";

const SimplifiedLayersPanel = React.memo(
  ({ isOpen, onClose, activeLayers, onLayerToggle, isDarkMode }) => {
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Simplified layer categories
    const layerCategories = useMemo(() => [
      {
        id: 'all',
        name: 'All Categories',
        icon: '🌐',
        description: 'Show all map features',
        layers: []
      },
      {
        id: 'accessibility',
        name: 'Accessibility',
        icon: '♿',
        description: 'Accessibility features and barriers',
        layers: [
          { id: 'accessibleParking', name: 'Accessible Parking', icon: '🅿️' },
          { id: 'curbCuts', name: 'Curb Cuts & Ramps', icon: '♿' },
          { id: 'elevators', name: 'Elevators', icon: '🛗' },
          { id: 'lighting', name: 'Street Lighting', icon: '💡' }
        ]
      },
      {
        id: 'dining',
        name: 'Restaurants & Food',
        icon: '🍽️',
        description: 'Restaurants, cafes, and dining options',
        layers: [
          { id: 'wheelmap_food', name: 'Accessible Restaurants', icon: '🍽️' },
          { id: 'restaurants', name: 'All Restaurants', icon: '🍕' }
        ]
      },
      {
        id: 'transit',
        name: 'Public Transit',
        icon: '🚌',
        description: 'Bus stops, routes, and transit information',
        layers: [
          { id: 'transitRoutes', name: 'Bus Routes', icon: '🚌' },
          { id: 'busStops', name: 'Bus Stops', icon: '🚏' },
          { id: 'accessibleStops', name: 'Accessible Stops', icon: '♿' },
          { id: 'shelters', name: 'Bus Shelters', icon: '🏠' }
        ]
      },
      {
        id: 'amenities',
        name: 'Amenities',
        icon: '🏢',
        description: 'Public facilities and amenities',
        layers: [
          { id: 'publicWashrooms', name: 'Public Washrooms', icon: '🚻' },
          { id: 'accessibleParking', name: 'Accessible Parking', icon: '🅿️' }
        ]
      },
      {
        id: 'parking',
        name: 'Parking',
        icon: '🅿️',
        description: 'Parking options and accessibility',
        layers: [
          { id: 'wheelmap_parking', name: 'Accessible Parking', icon: '♿' },
          { id: 'accessibleParking', name: 'Designated Parking', icon: '🅿️' }
        ]
      },
      {
        id: 'amenities',
        name: 'Amenities',
        icon: '🏪',
        description: 'Essential services and facilities',
        layers: [
          { id: 'wheelmap_toilets', name: 'Accessible Restrooms', icon: '🚻' },
          { id: 'bathrooms', name: 'All Restrooms', icon: '🚽' },
          { id: 'shopping', name: 'Shopping', icon: '🛍️' },
          { id: 'hospitals', name: 'Hospitals', icon: '🏥' }
        ]
      },
      {
        id: 'closures',
        name: 'Closures & Alerts',
        icon: '⚠️',
        description: 'Current closures and maintenance',
        layers: [
          { id: 'sidewalkClosures', name: 'Sidewalk Closures', icon: '🚧' },
          { id: 'streetClosures', name: 'Street Closures', icon: '🚫' },
          { id: 'maintenance', name: 'Construction', icon: '🔧' }
        ]
      }
    ], []);

    const handleCategoryChange = (categoryId) => {
      setSelectedCategory(categoryId);
      
      if (categoryId === 'all') {
        // Show all layers
        const allLayerIds = layerCategories
          .flatMap(cat => cat.layers)
          .map(layer => layer.id);
        
        // Toggle all layers on
        allLayerIds.forEach(layerId => {
          if (!activeLayers.has(layerId)) {
            onLayerToggle(layerId);
          }
        });
      } else {
        // Show only layers from selected category
        const category = layerCategories.find(cat => cat.id === categoryId);
        if (category) {
          // First, turn off all layers
          activeLayers.forEach(layerId => {
            onLayerToggle(layerId);
          });
          
          // Then turn on layers from selected category
          category.layers.forEach(layer => {
            onLayerToggle(layer.id);
          });
        }
      }
    };

    const handleLayerToggle = (layerId) => {
      onLayerToggle(layerId);
    };

    const getActiveLayersInCategory = (categoryId) => {
      if (categoryId === 'all') {
        return activeLayers.size;
      }
      const category = layerCategories.find(cat => cat.id === categoryId);
      if (!category) return 0;
      return category.layers.filter(layer => activeLayers.has(layer.id)).length;
    };

    const handleClose = () => {
      onClose();
    };

    if (!isOpen) return null;

    return (
      <>
        <div
          className={`layers-backdrop ${
            isDarkMode ? "text-gray-100" : "text-gray-900"
          }`}
          onClick={handleClose}
          aria-hidden="true"
        />

        <div className={`layers-panel simplified-layers-panel ${isOpen ? "open" : ""}`}>
          <div
            className={`
              flex items-center justify-between p-5 border-b
              ${isDarkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}
              flex-shrink-0
            `}
          >
            <div>
              <h2
                className={`
                  text-lg font-semibold m-0
                  ${isDarkMode ? "text-gray-100" : "text-gray-900"}
                `}
              >
                Map Categories
              </h2>
              <p
                className={`
                  text-sm m-0 mt-1
                  ${isDarkMode ? "text-gray-400" : "text-gray-600"}
                `}
              >
                Filter map features by category
              </p>
            </div>
            <button
              onClick={handleClose}
              className={`
                w-10 h-10 border rounded-lg flex items-center justify-center cursor-pointer
                transition-all duration-200 ease-in-out
                ${
                  isDarkMode
                    ? "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    : "bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }
              `}
              aria-label="Close layers panel"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-6 h-6"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="layers-content">
            {/* Category Selection */}
            <div className="category-selection">
              <h3 className="category-section-title">Choose a Category</h3>
              <div className="category-grid">
                {layerCategories.map((category) => {
                  const activeCount = getActiveLayersInCategory(category.id);
                  const isSelected = selectedCategory === category.id;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryChange(category.id)}
                      className={`category-button ${isSelected ? 'selected' : ''}`}
                      aria-label={`${category.name} - ${category.description}`}
                    >
                      <div className="category-icon">{category.icon}</div>
                      <div className="category-content">
                        <div className="category-name">{category.name}</div>
                        <div className="category-description">{category.description}</div>
                        {activeCount > 0 && (
                          <div className="category-count">{activeCount} active</div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="category-selected-indicator">✓</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layer Details for Selected Category */}
            {selectedCategory !== 'all' && (
              <div className="layer-details">
                <h3 className="layer-details-title">
                  {layerCategories.find(cat => cat.id === selectedCategory)?.name} Layers
                </h3>
                <div className="layers-list">
                  {layerCategories
                    .find(cat => cat.id === selectedCategory)
                    ?.layers.map((layer) => {
                      const isActive = activeLayers.has(layer.id);
                      return (
                        <div
                          key={layer.id}
                          onClick={() => handleLayerToggle(layer.id)}
                          className={`layer-item ${isActive ? "active" : ""}`}
                          aria-label={`${isActive ? "Hide" : "Show"} ${layer.name}`}
                        >
                          <div className="layer-icon">{layer.icon}</div>
                          <div className="layer-content">
                            <div className="layer-label">{layer.name}</div>
                          </div>
                          <div className="layer-toggle">
                            <div
                              className={`toggle-switch ${
                                isActive ? "active" : ""
                              }`}
                            >
                              <div className="toggle-slider"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="layers-footer">
            <div className="active-layers-info">
              <span className="active-count">
                {activeLayers.size} layers active
              </span>
              <span className="category-info">
                {selectedCategory === 'all' ? 'All categories' : layerCategories.find(cat => cat.id === selectedCategory)?.name}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }
);

SimplifiedLayersPanel.displayName = "SimplifiedLayersPanel";

export default SimplifiedLayersPanel;
