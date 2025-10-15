import { useEffect, useRef } from 'react';

/**
 * Custom hook to trap focus within a modal or panel
 * Ensures keyboard users stay within the interactive element
 * @param {boolean} isActive - Whether the focus trap should be active
 * @param {Function} onEscape - Callback when Escape key is pressed
 */
const useFocusTrap = (isActive, onEscape) => {
  const containerRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    const container = containerRef.current;
    
    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');
      
      return Array.from(container.querySelectorAll(focusableSelectors));
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle keyboard events
    const handleKeyDown = (e) => {
      // Handle Escape key
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      // Handle Tab key for focus trapping
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          // Shift+Tab on first element - go to last
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          // Tab on last element - go to first
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously active element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, onEscape]);

  return containerRef;
};

export default useFocusTrap;


