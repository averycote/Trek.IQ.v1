/**
 * Driving Safety Disclaimer Component
 * 
 * Displays important safety warning for users in driving navigation mode
 */

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const DrivingSafetyDisclaimer = ({ isDarkMode = false, className = '' }) => {
  return (
    <div
      className={`
        p-4 rounded-lg border-2 mb-4
        ${isDarkMode 
          ? 'bg-red-900/20 border-red-500/50 text-red-200' 
          : 'bg-red-50 border-red-300 text-red-900'
        }
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <ExclamationTriangleIcon 
          className={`
            w-6 h-6 flex-shrink-0 mt-0.5
            ${isDarkMode ? 'text-red-400' : 'text-red-600'}
          `}
          aria-hidden="true"
        />
        
        <div className="flex-1">
          <h3 className="font-bold text-base mb-1">
            🚗 Driving Safety Warning
          </h3>
          
          <p className="text-sm leading-relaxed">
            <strong>For your safety, do not use your device while driving.</strong>
            {' '}Pull over safely if you need to interact with your phone. Follow all traffic laws and road signs. This app provides navigation assistance only - always use your best judgment and observe actual road conditions.
          </p>
          
          <div className={`
            mt-3 text-xs font-medium
            ${isDarkMode ? 'text-red-300' : 'text-red-800'}
          `}>
            ⚠️ Driver is responsible for safe vehicle operation at all times.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrivingSafetyDisclaimer;

