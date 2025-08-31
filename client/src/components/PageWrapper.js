import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PageWrapper = ({ 
  children, 
  title, 
  description,
  onPageOpen, // Callback to notify parent when page opens
  onPageClose // Callback to notify parent when page closes
}) => {
  const navigate = useNavigate();

  // Notify parent component when page opens
  useEffect(() => {
    if (onPageOpen) {
      onPageOpen();
    }

    // Cleanup when component unmounts
    return () => {
      if (onPageClose) {
        onPageClose();
      }
    };
  }, [onPageOpen, onPageClose]);

  const handleReturnToHome = () => {
    navigate('/');
  };

  return (
    <div className="page-wrapper" role="main">
      {/* FIXED: Return to Home Button - Mobile Optimized */}
      <div className="page-header">
        <button
          onClick={handleReturnToHome}
          className="return-home-button"
          aria-label="Return to home map view"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="return-icon">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span className="return-text">Return to Map</span>
        </button>
        
        {title && (
          <div className="page-title-section">
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-description">{description}</p>}
          </div>
        )}
      </div>

      {/* Page Content */}
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageWrapper;
