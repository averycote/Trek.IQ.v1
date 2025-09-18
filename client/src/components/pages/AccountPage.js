import React, { useEffect } from 'react';
import PageWrapper from '../PageWrapper';
import ProfileSettings from '../ProfileSettings';

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
        <ProfileSettings />
      </div>
    </PageWrapper>
  );
};

export default AccountPage;
