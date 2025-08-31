import React, { useMemo } from 'react';

const LayersPanel = React.memo(({
  isOpen,
  onClose,
  activeLayers,
  onLayerToggle,
  routeMode
}) => {
  // Layer definitions with common, useful names
  const layerGroups = useMemo(() => [
    {
      id: 'accessibility',
      title: 'Accessibility',
      description: 'Accessibility features and barriers',
      layers: [
        {
          id: 'accessibleParking',
          label: 'Accessible Parking',
          description: 'Designated accessible parking spaces',
          icon: '🅿️'
        },
        {
          id: 'curbCuts',
          label: 'Curb Cuts & Ramps',
          description: 'Ramps and curb cuts for wheelchair access',
          icon: '♿'
        },
        {
          id: 'steps',
          label: 'Steps & Stairs',
          description: 'Staircases and steps (avoided in walking mode)',
          icon: '🪜'
        },
        {
          id: 'lighting',
          label: 'Street Lighting',
          description: 'Well-lit areas for safety',
          icon: '💡'
        },
        {
          id: 'elevators',
          label: 'Elevators',
          description: 'Public elevators and lifts',
          icon: '🛗'
        }
      ]
    },
    {
      id: 'transit',
      title: 'Public Transit',
      description: 'Public transportation information',
      layers: [
        {
          id: 'transitRoutes',
          label: 'Bus Routes',
          description: 'Bus and transit routes',
          icon: '🚌'
        },
        {
          id: 'accessibleStops',
          label: 'Accessible Stops',
          description: 'Transit stops with accessibility features',
          icon: '♿'
        },
        {
          id: 'shelters',
          label: 'Bus Shelters',
          description: 'Bus shelters and waiting areas',
          icon: '🏠'
        },
        {
          id: 'snowRoutes',
          label: 'Snow Routes',
          description: 'Winter transit routes (seasonal)',
          icon: '❄️'
        }
      ]
    },
    {
      id: 'closures',
      title: 'Closures & Maintenance',
      description: 'Current closures and maintenance work',
      layers: [
        {
          id: 'sidewalkClosures',
          label: 'Sidewalk Closures',
          description: 'Closed or blocked sidewalks',
          icon: '🚧'
        },
        {
          id: 'streetClosures',
          label: 'Street Closures',
          description: 'Closed streets and roadblocks',
          icon: '🚫'
        },
        {
          id: 'maintenance',
          label: 'Construction',
          description: 'Ongoing maintenance and construction',
          icon: '🔧'
        }
      ]
    },
    {
      id: 'safety',
      title: 'Safety & Security',
      description: 'Safety features and security information',
      layers: [
        {
          id: 'emergencyPhones',
          label: 'Emergency Phones',
          description: 'Emergency phone locations',
          icon: '📞'
        },
        {
          id: 'policeStations',
          label: 'Police Stations',
          description: 'Police station locations',
          icon: '👮'
        },
        {
          id: 'hospitals',
          label: 'Hospitals',
          description: 'Hospital and medical facilities',
          icon: '🏥'
        }
      ]
    },
    {
      id: 'amenities',
      title: 'Amenities',
      description: 'Useful amenities and services',
      layers: [
        {
          id: 'accessiblePlaces',
          label: 'Accessible Places',
          description: 'Wheelchair-accessible locations from Wheelmap',
          icon: '♿'
        },
        {
          id: 'restaurants',
          label: 'Restaurants',
          description: 'Restaurants and dining options',
          icon: '🍽️'
        },
        {
          id: 'shopping',
          label: 'Shopping',
          description: 'Shopping centers and stores',
          icon: '🛍️'
        },
        {
          id: 'bathrooms',
          label: 'Public Bathrooms',
          description: 'Public restroom locations',
          icon: '🚻'
        },
        {
          id: 'waterFountains',
          label: 'Water Fountains',
          description: 'Public drinking fountains',
          icon: '🚰'
        }
      ]
    }
  ], []);

  const handleLayerToggle = (layerId) => {
    onLayerToggle(layerId);
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="layers-backdrop"
        onClick={handleClose}
        aria-hidden="true"
      />

             {/* Layers Panel */}
       <div className={`layers-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="layers-header">
          <h2 className="layers-title">Map Layers</h2>
          <button
            onClick={handleClose}
            className="layers-close-button"
            aria-label="Close layers panel"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="layers-content">
          {layerGroups.map((group) => (
            <div key={group.id} className="layer-group">
              <h3 className="group-title">{group.title}</h3>
              <p className="group-description">{group.description}</p>
              
              <div className="layers-list">
                {group.layers.map((layer) => {
                  const isActive = activeLayers.has(layer.id);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => handleLayerToggle(layer.id)}
                      className={`layer-item ${isActive ? 'active' : ''}`}
                      aria-label={`${isActive ? 'Hide' : 'Show'} ${layer.label}`}
                    >
                      <div className="layer-icon">
                        {layer.icon}
                      </div>
                      <div className="layer-content">
                        <div className="layer-label">{layer.label}</div>
                        <div className="layer-description">{layer.description}</div>
                      </div>
                      <div className="layer-toggle">
                        <div className={`toggle-switch ${isActive ? 'active' : ''}`}>
                          <div className="toggle-slider"></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="layers-footer">
          <div className="active-layers-info">
            <span className="active-count">{activeLayers.size} layers active</span>
          </div>
        </div>
      </div>
    </>
  );
});

LayersPanel.displayName = 'LayersPanel';

export default LayersPanel;
