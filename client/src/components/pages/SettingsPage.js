import React, { useEffect } from 'react';
import PageWrapper from '../PageWrapper';

const SettingsPage = ({ onPageOpen, onPageClose }) => {
  // FIXED: Notify parent component when page opens/closes
  useEffect(() => {
    if (onPageOpen) {
      onPageOpen();
    }
    return () => {
      if (onPageClose) {
        onPageClose();
      }
    };
  }, [onPageOpen, onPageClose]);

  return (
    <PageWrapper 
      title="Settings"
      description="Customize your Trek.IQ experience"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      
      <div className="page-content">
        <div className="placeholder-content">
          <div className="placeholder-icon">⚙️</div>
          <h2>App Settings</h2>
          <p>This page will contain application settings including:</p>
          <ul>
            <li>Theme preferences (Light/Dark)</li>
            <li>Voice guidance settings</li>
            <li>Map display options</li>
            <li>Notification preferences</li>
            <li>Language and region settings</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};

export default SettingsPage;
