/**
 * Performance Utilities for Trek.IQ
 * 
 * OPTIMIZATION: Lightweight performance monitoring and optimization helpers
 * that don't impact production performance
 */

import React from 'react';

// OPTIMIZATION: Production-safe performance logging
export const perfLog = (label, fn) => {
  if (process.env.NODE_ENV === 'development') {
    console.time(label);
    const result = fn();
    console.timeEnd(label);
    return result;
  }
  return fn();
};

// OPTIMIZATION: Async performance logging
export const perfLogAsync = async (label, asyncFn) => {
  if (process.env.NODE_ENV === 'development') {
    console.time(label);
    const result = await asyncFn();
    console.timeEnd(label);
    return result;
  }
  return await asyncFn();
};

// OPTIMIZATION: Memory usage tracking (development only)
export const trackMemory = (label) => {
  if (process.env.NODE_ENV === 'development' && performance.memory) {
    const memory = performance.memory;
    console.log(`${label} Memory:`, {
      used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1024 / 1024)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`
    });
  }
};

// OPTIMIZATION: Bundle size calculator
export const calculateBundleImpact = (componentName, beforeSize, afterSize) => {
  if (process.env.NODE_ENV === 'development') {
    const savings = beforeSize - afterSize;
    const percentage = ((savings / beforeSize) * 100).toFixed(1);
    console.log(`📦 ${componentName} Bundle Impact:`, {
      before: `${beforeSize}KB`,
      after: `${afterSize}KB`,
      savings: `${savings}KB (${percentage}% reduction)`
    });
  }
};

// OPTIMIZATION: API response time tracker
export const trackApiCall = async (apiName, apiCall) => {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🌐 ${apiName} API:`, {
        duration: `${duration}ms`,
        status: 'success',
        cached: result._cached || false
      });
    }
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ ${apiName} API:`, {
        duration: `${duration}ms`,
        status: 'error',
        error: error.message
      });
    }
    
    throw error;
  }
};

// OPTIMIZATION: Component render tracker
export const useRenderTracker = (componentName) => {
  if (process.env.NODE_ENV === 'development') {
    const renderCount = React.useRef(0);
    
    React.useEffect(() => {
      renderCount.current += 1;
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
    });
  }
};

// OPTIMIZATION: Cache hit rate tracker
export class CacheTracker {
  constructor(name) {
    this.name = name;
    this.hits = 0;
    this.misses = 0;
  }
  
  hit() {
    this.hits++;
    this.logStats();
  }
  
  miss() {
    this.misses++;
    this.logStats();
  }
  
  logStats() {
    if (process.env.NODE_ENV === 'development' && (this.hits + this.misses) % 10 === 0) {
      const total = this.hits + this.misses;
      const hitRate = ((this.hits / total) * 100).toFixed(1);
      console.log(`💾 ${this.name} Cache:`, {
        hits: this.hits,
        misses: this.misses,
        hitRate: `${hitRate}%`
      });
    }
  }
}

// OPTIMIZATION: Debounce utility (replaces Lodash)
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// OPTIMIZATION: Throttle utility
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// OPTIMIZATION: Lazy component loader with error boundary
export const lazyLoad = (importFunc, fallback = null) => {
  const LazyComponent = React.lazy(importFunc);
  
  // Mark this component as lazy-loaded for verification
  if (typeof window !== 'undefined' && window.TREK_IQ_LAZY_COMPONENTS) {
    window.TREK_IQ_LAZY_COMPONENTS.push(importFunc.name || 'anonymous');
  } else if (typeof window !== 'undefined') {
    window.TREK_IQ_LAZY_COMPONENTS = [importFunc.name || 'anonymous'];
  }
  
  return (props) => (
    <React.Suspense fallback={fallback || <div>Loading...</div>}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
};

// OPTIMIZATION: Register lazy-loaded elements for verification
export const registerLazyElement = (elementName) => {
  if (typeof window !== 'undefined') {
    if (!window.TREK_IQ_LAZY_ELEMENTS) {
      window.TREK_IQ_LAZY_ELEMENTS = [];
    }
    window.TREK_IQ_LAZY_ELEMENTS.push(elementName);
  }
};

// OPTIMIZATION: Performance observer for Web Vitals
export const observeWebVitals = () => {
  if (process.env.NODE_ENV === 'production' && 'PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', Math.round(lastEntry.startTime));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        console.log('FID:', Math.round(entry.processingStart - entry.startTime));
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }
};

export default {
  perfLog,
  perfLogAsync,
  trackMemory,
  calculateBundleImpact,
  trackApiCall,
  useRenderTracker,
  CacheTracker,
  debounce,
  throttle,
  lazyLoad,
  observeWebVitals
};
