/**
 * Debug helper utilities for Trek.IQ
 */

// Debug mode flag
export const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Console logging with debug mode check
export const debugLog = (message, data = null) => {
  if (DEBUG_MODE) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

// Error logging
export const debugError = (message, error = null) => {
  if (DEBUG_MODE) {
    if (error) {
      console.error(`[DEBUG ERROR] ${message}`, error);
    } else {
      console.error(`[DEBUG ERROR] ${message}`);
    }
  }
};

// Performance timing
export const debugTime = (label) => {
  if (DEBUG_MODE) {
    console.time(`[DEBUG] ${label}`);
    return () => console.timeEnd(`[DEBUG] ${label}`);
  }
  return () => {}; // No-op if not in debug mode
};

// Debug info object
export const debugInfo = {
  isDebugMode: DEBUG_MODE,
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV,
  timestamp: new Date().toISOString()
};

// Debug service wrapper
export const debugService = {
  log: debugLog,
  error: debugError,
  time: debugTime,
  info: debugInfo
};

export default debugService;
