import React from 'react';

const AccessibilityPanel = React.memo(({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const handleSettingChange = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const accessibilityOptions = [
    {
      id: 'avoidSteps',
      label: 'Avoid Steps',
      description: 'Route around staircases and steps',
      category: 'routing'
    },
    {
      id: 'preferWellLit',
      label: 'Prefer Well-Lit Routes',
      description: 'Choose routes with good lighting',
      category: 'routing'
    },
    {
      id: 'avoidSteepSlopes',
      label: 'Avoid Steep Slopes',
      description: 'Route around steep inclines',
      category: 'routing'
    },
    {
      id: 'preferWidePaths',
      label: 'Prefer Wide Paths',
      description: 'Choose wider sidewalks and paths',
      category: 'routing'
    },
    {
      id: 'wheelchairAccessible',
      label: 'Wheelchair Accessible',
      description: 'I use a wheelchair or mobility device',
      category: 'preferences'
    },
    {
      id: 'visualImpairment',
      label: 'Visual Impairment',
      description: 'I have visual accessibility needs',
      category: 'preferences'
    },
    {
      id: 'hearingImpairment',
      label: 'Hearing Impairment',
      description: 'I have hearing accessibility needs',
      category: 'preferences'
    }
  ];

  const routingOptions = accessibilityOptions.filter(option => option.category === 'routing');
  const preferenceOptions = accessibilityOptions.filter(option => option.category === 'preferences');

  if (!isOpen) return null;

  return (
    <div className="accessibility-panel">
      <div className="panel-header">
        <h2 className="panel-title">Accessibility Settings</h2>
        <button
          onClick={onClose}
          className="panel-close"
          aria-label="Close accessibility panel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div className="panel-content">
        {/* Routing Preferences */}
        <div className="settings-section">
          <h3 className="section-title">Routing Preferences</h3>
          <p className="section-description">
            Customize how Trek.IQ calculates routes to meet your accessibility needs.
          </p>
          
          <div className="settings-list">
            {routingOptions.map((option) => (
              <div key={option.id} className="setting-item">
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings[option.id] || false}
                    onChange={(e) => handleSettingChange(option.id, e.target.checked)}
                    className="setting-checkbox"
                    aria-describedby={`setting-${option.id}-desc`}
                  />
                  <div className="setting-content">
                    <div className="setting-info">
                      <span className="setting-label">{option.label}</span>
                      <span 
                        id={`setting-${option.id}-desc`}
                        className="setting-description"
                      >
                        {option.description}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Preferences */}
        <div className="settings-section">
          <h3 className="section-title">Personal Preferences</h3>
          <p className="section-description">
            Help us provide more relevant accessibility information.
          </p>
          
          <div className="settings-list">
            {preferenceOptions.map((option) => (
              <div key={option.id} className="setting-item">
                <label className="setting-toggle">
                  <input
                    type="checkbox"
                    checked={settings[option.id] || false}
                    onChange={(e) => handleSettingChange(option.id, e.target.checked)}
                    className="setting-checkbox"
                    aria-describedby={`setting-${option.id}-desc`}
                  />
                  <div className="setting-content">
                    <div className="setting-info">
                      <span className="setting-label">{option.label}</span>
                      <span 
                        id={`setting-${option.id}-desc`}
                        className="setting-description"
                      >
                        {option.description}
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Display Settings */}
        <div className="settings-section">
          <h3 className="section-title">Display Settings</h3>
          
          <div className="display-options">
            <div className="display-option">
              <label className="display-toggle">
                <input
                  type="checkbox"
                  checked={settings.highContrast || false}
                  onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                  className="display-checkbox"
                />
                <span className="display-label">High Contrast Mode</span>
              </label>
            </div>
            
            <div className="display-option">
              <label className="display-toggle">
                <input
                  type="checkbox"
                  checked={settings.largeText || false}
                  onChange={(e) => handleSettingChange('largeText', e.target.checked)}
                  className="display-checkbox"
                />
                <span className="display-label">Large Text</span>
              </label>
            </div>
            
            <div className="display-option">
              <label className="display-toggle">
                <input
                  type="checkbox"
                  checked={settings.reducedMotion || false}
                  onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                  className="display-checkbox"
                />
                <span className="display-label">Reduced Motion</span>
              </label>
            </div>
          </div>
        </div>

        {/* Accessibility Information */}
        <div className="accessibility-info">
          <h4>About Accessibility Features</h4>
          <p>
            Trek.IQ is designed to provide accessible navigation for everyone. 
            These settings help customize your experience based on your specific needs.
          </p>
          
          <div className="info-links">
            <button className="info-link" onClick={() => window.open('https://www.w3.org/WAI/', '_blank')}>
              Learn more about accessibility
            </button>
            <button className="info-link" onClick={() => window.open('mailto:support@trek-iq.com', '_blank')}>
              Contact support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

AccessibilityPanel.displayName = 'AccessibilityPanel';

export default AccessibilityPanel;
