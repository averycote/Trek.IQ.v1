import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const RouteGenerationLoading = ({ isVisible = false, isDarkMode = false }) => {
  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 left-4 z-50 max-w-md w-full ${
      window.innerWidth <= 768 ? 'bottom-4 left-4 right-4' : 'bottom-4 left-4'
    }`}>
      <div className={`p-6 rounded-lg shadow-xl ${
        isDarkMode
          ? 'bg-gray-800 border border-gray-600'
          : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Generating Route</h3>
            <p className="text-sm opacity-75">Finding the best accessible path...</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Analyzing accessibility data</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <span className="text-sm">Calculating optimal route</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <span className="text-sm">Checking for barriers</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
            <span className="text-sm">Finalizing route details</span>
          </div>
        </div>

        {/* Loading Animation */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-center mt-2 opacity-60">
            This may take 30-60 seconds for complex routes
          </p>
        </div>
      </div>
    </div>
  );
};

export default RouteGenerationLoading;
