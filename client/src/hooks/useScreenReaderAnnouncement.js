import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing screen reader announcements
 * Creates ARIA live regions for polite and assertive announcements
 */
const useScreenReaderAnnouncement = () => {
  const politeRef = useRef(null);
  const assertiveRef = useRef(null);

  // Create live regions on mount
  useEffect(() => {
    // Create polite live region (for non-urgent announcements)
    if (!politeRef.current) {
      politeRef.current = document.createElement('div');
      politeRef.current.setAttribute('role', 'status');
      politeRef.current.setAttribute('aria-live', 'polite');
      politeRef.current.setAttribute('aria-atomic', 'true');
      politeRef.current.className = 'sr-only';
      document.body.appendChild(politeRef.current);
    }

    // Create assertive live region (for urgent announcements)
    if (!assertiveRef.current) {
      assertiveRef.current = document.createElement('div');
      assertiveRef.current.setAttribute('role', 'alert');
      assertiveRef.current.setAttribute('aria-live', 'assertive');
      assertiveRef.current.setAttribute('aria-atomic', 'true');
      assertiveRef.current.className = 'sr-only';
      document.body.appendChild(assertiveRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (politeRef.current && document.body.contains(politeRef.current)) {
        document.body.removeChild(politeRef.current);
      }
      if (assertiveRef.current && document.body.contains(assertiveRef.current)) {
        document.body.removeChild(assertiveRef.current);
      }
    };
  }, []);

  /**
   * Announce a message to screen readers
   * @param {string} message - The message to announce
   * @param {'polite'|'assertive'} priority - The priority level of the announcement
   * @param {number} delay - Optional delay before announcement (ms)
   */
  const announce = useCallback((message, priority = 'polite', delay = 100) => {
    if (!message) return;

    const element = priority === 'assertive' ? assertiveRef.current : politeRef.current;
    
    if (element) {
      // Clear previous announcement
      element.textContent = '';
      
      // Small delay to ensure screen readers pick up the change
      setTimeout(() => {
        element.textContent = message;
      }, delay);
    }
  }, []);

  /**
   * Clear all announcements
   */
  const clearAnnouncements = useCallback(() => {
    if (politeRef.current) politeRef.current.textContent = '';
    if (assertiveRef.current) assertiveRef.current.textContent = '';
  }, []);

  return { announce, clearAnnouncements };
};

export default useScreenReaderAnnouncement;


