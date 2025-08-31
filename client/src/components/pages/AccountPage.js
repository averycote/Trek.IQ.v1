import React, { useEffect } from 'react';
import PageWrapper from '../PageWrapper';

const AccountPage = ({ onPageOpen, onPageClose }) => {
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
      title="Account & Settings"
      description="Manage your account preferences and accessibility settings"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      
      <div className="page-content">
        <div className="placeholder-content">
          <div className="placeholder-icon">👤</div>
          <h2>Account Settings</h2>
          <p>This page will contain account management features including:</p>
          <ul>
            <li>Profile information</li>
            <li>Accessibility preferences</li>
            <li>Privacy settings</li>
            <li>Account security</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AccountPage;
