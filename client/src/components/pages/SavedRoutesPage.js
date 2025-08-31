import React, { useEffect } from 'react';
import PageWrapper from '../PageWrapper';

const SavedRoutesPage = ({ onPageOpen, onPageClose }) => {
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
      title="Saved Routes"
      description="Your frequently used and favorite routes"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      
      <div className="page-content">
        <div className="placeholder-content">
          <div className="placeholder-icon">💾</div>
          <h2>Saved Routes</h2>
          <p>This page will display your saved routes including:</p>
          <ul>
            <li>Frequently used routes</li>
            <li>Favorite destinations</li>
            <li>Route history</li>
            <li>Custom route names</li>
            <li>Route sharing options</li>
          </ul>
        </div>
      </div>
    </PageWrapper>
  );
};

export default SavedRoutesPage;
