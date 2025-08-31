import React from 'react';

const ModeSelector = React.memo(({ mode, onModeChange }) => {
  const modes = [
    {
      id: 'walking',
      label: 'Walk',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      description: 'Pedestrian routes'
    },
    {
      id: 'driving',
      label: 'Drive',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M5 17h14v-5H5v5zm11.5-4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-11 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/>
          <path d="M7 14v-2h10v2H7z"/>
        </svg>
      ),
      description: 'Vehicle routes'
    },
    {
      id: 'transit',
      label: 'Transit',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      ),
      description: 'Public transit'
    }
  ];

  return (
    <div className="mode-selector" role="radiogroup" aria-label="Transportation mode">
      {modes.map((modeOption) => (
        <button
          key={modeOption.id}
          onClick={() => onModeChange(modeOption.id)}
          className={`mode-button ${mode === modeOption.id ? 'active' : ''}`}
          aria-pressed={mode === modeOption.id}
          aria-describedby={`mode-${modeOption.id}-desc`}
        >
          <div className="mode-icon">
            {modeOption.icon}
          </div>
          <div className="mode-content">
            <span className="mode-label">{modeOption.label}</span>
            <span id={`mode-${modeOption.id}-desc`} className="mode-description">
              {modeOption.description}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
});

ModeSelector.displayName = 'ModeSelector';

export default ModeSelector;
