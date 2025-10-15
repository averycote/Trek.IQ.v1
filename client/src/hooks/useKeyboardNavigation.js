import { useEffect, useCallback } from 'react';

/**
 * Custom hook for global keyboard navigation
 * Provides keyboard shortcuts for common actions
 */
const useKeyboardNavigation = ({
  onOpenSearch,
  onOpenMenu,
  onOpenLayers,
  onEscape,
  enabled = true,
}) => {
  const handleKeyDown = useCallback(
    (event) => {
      if (!enabled) return;

      // Don't handle shortcuts if user is typing in an input
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        document.activeElement?.tagName
      );

      if (isTyping && event.key !== 'Escape') return;

      // Handle different keyboard shortcuts
      switch (event.key) {
        case 'Escape':
          if (onEscape) {
            onEscape();
          }
          break;

        case '/':
          // Open search (like GitHub, Google)
          if (!isTyping && onOpenSearch) {
            event.preventDefault();
            onOpenSearch();
          }
          break;

        case 'm':
          // Open menu (m for menu)
          if (!isTyping && onOpenMenu && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onOpenMenu();
          }
          break;

        case 'l':
          // Open layers (l for layers)
          if (!isTyping && onOpenLayers && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onOpenLayers();
          }
          break;

        default:
          break;
      }
    },
    [enabled, onOpenSearch, onOpenMenu, onOpenLayers, onEscape]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);
};

export default useKeyboardNavigation;


