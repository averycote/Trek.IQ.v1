import React, { useMemo, useState } from "react";

const LayersPanel = React.memo(
  ({ isOpen, onClose, activeLayers, onLayerToggle, routeMode, isDarkMode, onWheelmapFilterChange }) => {
    // Wheelmap filter state
    const [wheelmapCategory, setWheelmapCategory] = useState('all');
    const [wheelmapAccessibility, setWheelmapAccessibility] = useState('yes');

    // Wheelmap categories
    const wheelmapCategories = [
      { id: 'all', name: 'All Categories', icon: '🌐' },
      { id: 'food', name: 'Restaurants & Cafes', icon: '🍽️' },
      { id: 'shopping', name: 'Shopping', icon: '🛍️' },
      { id: 'accommodation', name: 'Hotels', icon: '🏨' },
      { id: 'leisure', name: 'Entertainment', icon: '🎭' },
      { id: 'public_transfer', name: 'Public Transport', icon: '🚌' },
      { id: 'health', name: 'Healthcare', icon: '🏥' },
      { id: 'toilets', name: 'Restrooms', icon: '🚻' }
    ];

    const wheelmapAccessibilityOptions = [
      { id: 'yes', name: 'Fully Accessible', icon: '✅' },
      { id: 'limited', name: 'Limited Access', icon: '⚠️' },
      { id: 'no', name: 'Not Accessible', icon: '❌' },
      { id: 'unknown', name: 'Unknown', icon: '❓' }
    ];

    const layerGroups = useMemo(
      () => [
        {
          id: "accessibility",
          title: "Accessibility",
          description: "Accessibility features and barriers",
          layers: [
            {
              id: "accessibleParking",
              label: "Accessible Parking",
              description: "Designated accessible parking spaces",
              icon: "🅿️",
            },
            {
              id: "curbCuts",
              label: "Curb Cuts & Ramps",
              description: "Ramps and curb cuts for wheelchair access",
              icon: "♿",
            },
            {
              id: "steps",
              label: "Steps & Stairs",
              description: "Staircases and steps (avoided in walking mode)",
              icon: "🪜",
            },
            {
              id: "lighting",
              label: "Street Lighting",
              description: "Well-lit areas for safety",
              icon: "💡",
            },
            {
              id: "elevators",
              label: "Elevators",
              description: "Public elevators and lifts",
              icon: "🛗",
            },
          ],
        },
        {
          id: "transit",
          title: "Public Transit",
          description: "Public transportation information",
          layers: [
            {
              id: "transitRoutes",
              label: "Bus Routes",
              description: "Bus and transit routes",
              icon: "🚌",
            },
            {
              id: "accessibleStops",
              label: "Accessible Stops",
              description: "Transit stops with accessibility features",
              icon: "♿",
            },
            {
              id: "shelters",
              label: "Bus Shelters",
              description: "Bus shelters and waiting areas",
              icon: "🏠",
            },
            {
              id: "snowRoutes",
              label: "Snow Routes",
              description: "Winter transit routes (seasonal)",
              icon: "❄️",
            },
          ],
        },
        {
          id: "closures",
          title: "Closures & Maintenance",
          description: "Current closures and maintenance work",
          layers: [
            {
              id: "sidewalkClosures",
              label: "Sidewalk Closures",
              description: "Closed or blocked sidewalks",
              icon: "🚧",
            },
            {
              id: "streetClosures",
              label: "Street Closures",
              description: "Closed streets and roadblocks",
              icon: "🚫",
            },
            {
              id: "maintenance",
              label: "Construction",
              description: "Ongoing maintenance and construction",
              icon: "🔧",
            },
          ],
        },
        {
          id: "safety",
          title: "Safety & Security",
          description: "Safety features and security information",
          layers: [
            {
              id: "emergencyPhones",
              label: "Emergency Phones",
              description: "Emergency phone locations",
              icon: "📞",
            },
            {
              id: "policeStations",
              label: "Police Stations",
              description: "Police station locations",
              icon: "👮",
            },
            {
              id: "hospitals",
              label: "Hospitals",
              description: "Hospital and medical facilities",
              icon: "🏥",
            },
          ],
        },
        {
          id: "amenities",
          title: "Amenities",
          description: "Useful amenities and services",
          layers: [
            {
              id: "accessiblePlaces",
              label: "Accessible Places",
              description: "Wheelchair-accessible locations from Wheelmap",
              icon: "♿",
            },
            {
              id: "restaurants",
              label: "Restaurants",
              description: "Restaurants and dining options",
              icon: "🍽️",
            },
            {
              id: "shopping",
              label: "Shopping",
              description: "Shopping centers and stores",
              icon: "🛍️",
            },
            {
              id: "bathrooms",
              label: "Public Bathrooms",
              description: "Public restroom locations",
              icon: "🚻",
            },
            {
              id: "waterFountains",
              label: "Water Fountains",
              description: "Public drinking fountains",
              icon: "🚰",
            },
          ],
        },
      ],
      []
    );

    const handleLayerToggle = (layerId) => {
      onLayerToggle(layerId);
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

        <div className={`layers-panel ${isOpen ? "open" : ""}`}>
          <div
            className={`
    flex items-center justify-between p-5 border-b
    ${isDarkMode ? "border-gray-700 bg-gray-900" : "border-gray-200 bg-gray-50"}
    flex-shrink-0
  `}
          >
            <h2
              className={`
      text-lg font-semibold m-0
      ${isDarkMode ? "text-gray-100" : "text-gray-900"}
    `}
            >
              Map Layers
            </h2>
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

          {}
          <div className="layers-content">
            {layerGroups.map((group) => (
              <div key={group.id} className="layer-group">
                <h3 className="group-title font-semibold">{group.title}</h3>
                <p className="group-description text-xs">{group.description}</p>

                <div className="layers-list">
                  {group.layers.map((layer) => {
                    const isActive = activeLayers.has(layer.id);
                    return (
                      <div
                        key={layer.id}
                        onClick={() => handleLayerToggle(layer.id)}
                        className={`layer-item  ${isActive ? "active" : ""}`}
                        aria-label={`${isActive ? "Hide" : "Show"} ${
                          layer.label
                        }`}
                      >
                        <div className="layer-icon">{layer.icon}</div>
                        <div className="layer-content text-center">
                          <div className="layer-label">{layer.label}</div>
                          <div className="layer-description text-xs">
                            {layer.description}
                          </div>
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
            ))}

            {/* Wheelmap Accessibility Filters */}
            <div className="layer-group wheelmap-filters">
              <h3 className="group-title font-semibold">♿ Accessibility Places</h3>
              <p className="group-description text-xs">Filter accessible places from Wheelmap community data</p>

              {/* Category Filter */}
              <div className="wheelmap-filter-section">
                <label className={`wheelmap-filter-label ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Category:
                </label>
                <select 
                  value={wheelmapCategory} 
                  onChange={(e) => {
                    setWheelmapCategory(e.target.value);
                    onWheelmapFilterChange?.({ category: e.target.value, accessibility: wheelmapAccessibility });
                  }}
                  className={`wheelmap-filter-select ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-blue-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }`}
                >
                  {wheelmapCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Accessibility Filter */}
              <div className="wheelmap-filter-section">
                <label className={`wheelmap-filter-label ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Accessibility:
                </label>
                <select 
                  value={wheelmapAccessibility} 
                  onChange={(e) => {
                    setWheelmapAccessibility(e.target.value);
                    onWheelmapFilterChange?.({ category: wheelmapCategory, accessibility: e.target.value });
                  }}
                  className={`wheelmap-filter-select ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-gray-200 focus:border-blue-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  }`}
                >
                  {wheelmapAccessibilityOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.icon} {option.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info text */}
              <div className={`wheelmap-info text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Data from Wheelmap.org community contributions
              </div>
            </div>
          </div>

          {}
          <div className="layers-footer">
            <div className="active-layers-info">
              <span className="active-count">
                {activeLayers.size} layers active
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }
);

LayersPanel.displayName = "LayersPanel";

export default LayersPanel;
