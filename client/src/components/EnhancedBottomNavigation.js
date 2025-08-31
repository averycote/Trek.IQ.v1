import React from 'react';
import { 
  HomeIcon, 
  MagnifyingGlassIcon, 
  MapIcon, 
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const EnhancedBottomNavigation = ({
  activeTab = 'home',
  onTabChange,
  isMobile = false
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: HomeIcon },
    { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'profile', label: 'Profile', icon: UserIcon }
  ];

  const handleTabClick = (tabId) => {
    onTabChange?.(tabId);
  };

  if (!isMobile) {
    return null; // Only show on mobile
  }

  return (
    <div className="trek-iq-bottom-nav">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`trek-iq-nav-item ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
          >
            <IconComponent className="trek-iq-nav-icon" />
            <span className="trek-iq-nav-label">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default EnhancedBottomNavigation;
