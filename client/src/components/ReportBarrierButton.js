import React from 'react';

const ReportBarrierButton = ({ onClick, isActive }) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-large transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-110 ${
        isActive 
          ? 'bg-gradient-to-br from-error-500 to-error-600 text-white hover:from-error-600 hover:to-error-700 shadow-glow animate-pulse' 
          : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700'
      }`}
      aria-label={isActive ? "Cancel barrier reporting" : "Report accessibility barrier"}
      title={isActive ? "Cancel barrier reporting" : "Report accessibility barrier"}
    >
      {isActive ? (
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M6 18L18 6M6 6l12 12" 
          />
        </svg>
      ) : (
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
      )}
    </button>
  );
};

export default ReportBarrierButton;
