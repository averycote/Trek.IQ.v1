/**
 * Debug service for Trek.IQ services
 */

import { debugService as debugHelpers } from '../utils/debugHelpers';

// Re-export the debug service from utils
export const debugService = debugHelpers;

// Service-specific debug functions
export const serviceDebug = {
  log: (serviceName, message, data = null) => {
    debugHelpers.log(`[${serviceName}] ${message}`, data);
  },
  
  error: (serviceName, message, error = null) => {
    debugHelpers.error(`[${serviceName}] ${message}`, error);
  },
  
  time: (serviceName, label) => {
    return debugHelpers.time(`[${serviceName}] ${label}`);
  },
  
  info: (serviceName) => {
    return {
      ...debugHelpers.info,
      service: serviceName
    };
  }
};

export default debugService;
