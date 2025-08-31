import React, { useState } from 'react';
import { NavigationState } from './state';

interface AccessibilityTogglesProps {
  navigationState: NavigationState;
  isMobile: boolean;
}

interface AccessibilityLayer {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

const AccessibilityToggles: React.FC<AccessibilityTogglesProps> = ({ navigationState, isMobile }) => {
  const [layers, setLayers] = useState<AccessibilityLayer[]>([
    {
      id: 'accessible_parking',
      name: 'Accessible Parking',
      icon: '♿',
      description: 'Wheelchair accessible parking spaces',
      enabled: true
    },
    {
      id: 'accessible_bathrooms',
      name: 'Accessible Bathrooms',
      icon: '🚻',
      description: 'Wheelchair accessible restrooms',
      enabled: true
    },
    {
      id: 'elevators',
      name: 'Elevators',
      icon: '🛗',
      description: 'Elevators and lifts',
      enabled: true
    },
    {
      id: 'ramps',
      name: 'Ramps',
      icon: '🛤️',
      description: 'Accessible ramps and curb cuts',
      enabled: true
    },
    {
      id: 'accessible_entrances',
      name: 'Accessible Entrances',
      icon: '🚪',
      description: 'Wheelchair accessible building entrances',
      enabled: true
    },
    {
      id: 'transit_stops',
      name: 'Transit Stops',
      icon: '🚌',
      description: 'Accessible transit stops and shelters',
      enabled: true
    },
    {
      id: 'traffic_control',
      name: 'Traffic Control',
      icon: '🚦',
      description: 'Accessible traffic signals and crossings',
      enabled: true
    },
    {
      id: 'active_travelways',
      name: 'Active Travelways',
      icon: '🚶',
      description: 'Accessible sidewalks and paths',
      enabled: false
    }
  ]);

  const handleToggleLayer = (layerId: string) => {
    setLayers(prevLayers => 
      prevLayers.map(layer => 
        layer.id === layerId 
          ? { ...layer, enabled: !layer.enabled }
          : layer
      )
    );
  };

  return (
    <div className="accessibility-toggles">
      <div className="accessibility-toggles-title">
        Accessibility Features
      </div>
      
      {layers.map((layer) => (
        <div key={layer.id} className="accessibility-toggle">
          <div className="accessibility-toggle-label">
            <span className="accessibility-toggle-icon" aria-hidden="true">
              {layer.icon}
            </span>
            <span>{layer.name}</span>
          </div>
          
          <button
            className={`toggle-switch ${layer.enabled ? 'active' : ''}`}
            onClick={() => handleToggleLayer(layer.id)}
            aria-label={`${layer.enabled ? 'Disable' : 'Enable'} ${layer.name}`}
            type="button"
            role="switch"
            aria-checked={layer.enabled}
          />
        </div>
      ))}
    </div>
  );
};

export default AccessibilityToggles;
