/**
 * Unified State Management Hook
 * 
 * Provides a centralized state management solution that consolidates
 * component state patterns and provides performance optimizations.
 * 
 * Features:
 * - Centralized state management
 * - Performance optimizations with memoization
 * - State persistence with localStorage
 * - State validation and type checking
 * - State history and undo/redo
 * - State synchronization across components
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import performanceOptimizationService from '../services/performanceOptimizationService.js';

// State management configuration
const STATE_CONFIG = {
  persistence: {
    enabled: true,
    keyPrefix: 'trek-iq-state-',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxSize: 1024 * 1024 // 1MB
  },
  validation: {
    enabled: true,
    strictMode: false
  },
  history: {
    enabled: true,
    maxHistory: 50
  },
  performance: {
    memoization: true,
    debounceMs: 100
  }
};

// State validation schemas
const STATE_SCHEMAS = {
  map: {
    center: { type: 'array', length: 2, required: true },
    zoom: { type: 'number', min: 1, max: 18, required: true },
    activeLayers: { type: 'set', required: true }
  },
  search: {
    query: { type: 'string', maxLength: 100 },
    results: { type: 'array', maxLength: 100 },
    selectedResult: { type: 'object', nullable: true }
  },
  route: {
    origin: { type: 'object', nullable: true },
    destination: { type: 'object', nullable: true },
    route: { type: 'object', nullable: true },
    isNavigating: { type: 'boolean', default: false }
  },
  user: {
    location: { type: 'object', nullable: true },
    preferences: { type: 'object', default: {} },
    accessibility: { type: 'object', default: {} }
  }
};

/**
 * Unified State Management Hook
 * @param {string} stateKey - Unique key for this state slice
 * @param {Object} initialState - Initial state value
 * @param {Object} options - Configuration options
 * @returns {Object} State management interface
 */
const useUnifiedState = (stateKey, initialState = {}, options = {}) => {
  // Merge options with defaults
  const config = useMemo(() => ({
    ...STATE_CONFIG,
    ...options,
    persistence: { ...STATE_CONFIG.persistence, ...options.persistence },
    validation: { ...STATE_CONFIG.validation, ...options.validation },
    history: { ...STATE_CONFIG.history, ...options.history },
    performance: { ...STATE_CONFIG.performance, ...options.performance }
  }), [options]);
  
  // State management
  const [state, setState] = useState(initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // State history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Refs
  const stateRef = useRef(initialState);
  const debounceRef = useRef(null);
  const validationSchema = useRef(STATE_SCHEMAS[stateKey] || {});
  
  // Memoized state getter
  const getState = useCallback(() => stateRef.current, []);
  
  // Memoized state setter
  const setStateValue = useCallback((newState, options = {}) => {
    const { 
      validate = true, 
      persist = true, 
      addToHistory = true,
      debounce = false 
    } = options;
    
    const updateState = (stateUpdate) => {
      try {
        // Validate state if enabled
        if (validate && config.validation.enabled) {
          const validationResult = validateState(stateUpdate, validationSchema.current);
          if (!validationResult.isValid) {
            throw new Error(`State validation failed: ${validationResult.errors.join(', ')}`);
          }
        }
        
        // Update state
        const updatedState = typeof stateUpdate === 'function' 
          ? stateUpdate(stateRef.current) 
          : { ...stateRef.current, ...stateUpdate };
        
        stateRef.current = updatedState;
        setState(updatedState);
        setIsDirty(true);
        
        // Add to history if enabled
        if (addToHistory && config.history.enabled) {
          addToStateHistory(updatedState);
        }
        
        // Persist state if enabled
        if (persist && config.persistence.enabled) {
          persistState(stateKey, updatedState);
        }
        
        // Track performance
        performanceOptimizationService.trackCache(
          `state_${stateKey}`,
          { state: updatedState, timestamp: Date.now() },
          'useUnifiedState'
        );
        
        return updatedState;
        
      } catch (error) {
        console.error(`❌ State update failed for ${stateKey}:`, error);
        setError(error.message);
        throw error;
      }
    };
    
    if (debounce && config.performance.debounceMs > 0) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        updateState(stateUpdate);
      }, config.performance.debounceMs);
    } else {
      return updateState(stateUpdate);
    }
  }, [stateKey, config]);
  
  // State validation
  const validateState = useCallback((stateToValidate, schema) => {
    const errors = [];
    
    Object.entries(schema).forEach(([key, rules]) => {
      const value = stateToValidate[key];
      
      // Check required fields
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${key} is required`);
        return;
      }
      
      // Skip validation for undefined values if not required
      if (value === undefined || value === null) {
        return;
      }
      
      // Type validation
      if (rules.type) {
        const expectedType = rules.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (expectedType === 'set' && !(value instanceof Set)) {
          errors.push(`${key} must be a Set`);
        } else if (expectedType !== 'set' && actualType !== expectedType) {
          errors.push(`${key} must be of type ${expectedType}, got ${actualType}`);
        }
      }
      
      // Array length validation
      if (rules.length && Array.isArray(value) && value.length !== rules.length) {
        errors.push(`${key} must have length ${rules.length}, got ${value.length}`);
      }
      
      // String length validation
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`${key} must be at most ${rules.maxLength} characters`);
      }
      
      // Number range validation
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push(`${key} must be at least ${rules.min}`);
      }
      
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push(`${key} must be at most ${rules.max}`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);
  
  // State history management
  const addToStateHistory = useCallback((newState) => {
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), newState];
      return newHistory.slice(-config.history.maxHistory);
    });
    setHistoryIndex(prev => Math.min(prev + 1, config.history.maxHistory - 1));
  }, [historyIndex, config.history.maxHistory]);
  
  // Undo/Redo functionality
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousState = history[newIndex];
      setHistoryIndex(newIndex);
      setState(previousState);
      stateRef.current = previousState;
      setIsDirty(true);
    }
  }, [history, historyIndex]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const nextState = history[newIndex];
      setHistoryIndex(newIndex);
      setState(nextState);
      stateRef.current = nextState;
      setIsDirty(true);
    }
  }, [history, historyIndex]);
  
  // State persistence
  const persistState = useCallback((key, stateToPersist) => {
    try {
      const storageKey = `${config.persistence.keyPrefix}${key}`;
      const data = {
        state: stateToPersist,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn(`⚠️ Failed to persist state for ${key}:`, error);
    }
  }, [config.persistence]);
  
  const loadPersistedState = useCallback((key) => {
    try {
      const storageKey = `${config.persistence.keyPrefix}${key}`;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const data = JSON.parse(stored);
        
        // Check TTL
        if (Date.now() - data.timestamp > config.persistence.ttl) {
          localStorage.removeItem(storageKey);
          return null;
        }
        
        return data.state;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load persisted state for ${key}:`, error);
    }
    
    return null;
  }, [config.persistence]);
  
  // Reset state
  const resetState = useCallback(() => {
    setState(initialState);
    stateRef.current = initialState;
    setIsDirty(false);
    setError(null);
    setHistory([]);
    setHistoryIndex(-1);
  }, [initialState]);
  
  // Clear persisted state
  const clearPersistedState = useCallback(() => {
    try {
      const storageKey = `${config.persistence.keyPrefix}${stateKey}`;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn(`⚠️ Failed to clear persisted state for ${stateKey}:`, error);
    }
  }, [stateKey, config.persistence]);
  
  // State synchronization
  const syncState = useCallback((otherStateKey, syncFunction) => {
    // This would implement state synchronization between different state slices
    // For now, it's a placeholder for future implementation
    console.log(`🔄 Syncing state ${stateKey} with ${otherStateKey}`);
  }, [stateKey]);
  
  // Load persisted state on mount
  useEffect(() => {
    if (config.persistence.enabled) {
      const persistedState = loadPersistedState(stateKey);
      if (persistedState) {
        setState(persistedState);
        stateRef.current = persistedState;
      }
    }
  }, [stateKey, config.persistence.enabled, loadPersistedState]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
  
  // Memoized state interface
  const stateInterface = useMemo(() => ({
    // State access
    state,
    getState,
    setState: setStateValue,
    
    // State management
    isLoading,
    error,
    isDirty,
    resetState,
    clearPersistedState,
    
    // History management
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    
    // State synchronization
    syncState,
    
    // Configuration
    config
  }), [
    state,
    getState,
    setStateValue,
    isLoading,
    error,
    isDirty,
    resetState,
    clearPersistedState,
    history,
    historyIndex,
    undo,
    redo,
    syncState,
    config
  ]);
  
  return stateInterface;
};

export default useUnifiedState;
