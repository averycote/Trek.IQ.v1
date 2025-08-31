import React from 'react';

const LoadingSpinner = React.memo(({ size = 'medium', text = 'Loading...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${sizeClasses[size] || sizeClasses.medium}`}>
        <svg
          className="animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            d="M12 2v4m0 12v4m4.95-9.95l-2.83 2.83M6.88 6.88l2.83 2.83"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {text && <span className="loading-text">{text}</span>}
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
