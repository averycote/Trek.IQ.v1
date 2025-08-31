// Accessibility Helpers for Trek.IQ Navigation
// Provides ARIA labels, live announcements, and keyboard navigation support

export interface A11yAnnouncement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timeout?: number;
}

export class AccessibilityService {
  private liveRegion: HTMLElement | null = null;
  private announcementQueue: A11yAnnouncement[] = [];
  private isProcessingQueue = false;

  // Initialize accessibility service
  initialize(): void {
    this.createLiveRegion();
    this.setupKeyboardNavigation();
  }

  // Create live region for announcements
  private createLiveRegion(): void {
    // Remove existing live region if present
    const existing = document.getElementById('trek-iq-live-region');
    if (existing) {
      existing.remove();
    }

    // Create new live region
    this.liveRegion = document.createElement('div');
    this.liveRegion.id = 'trek-iq-live-region';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
    `;

    document.body.appendChild(this.liveRegion);
  }

  // Setup keyboard navigation
  private setupKeyboardNavigation(): void {
    // Add keyboard event listeners for navigation components
    document.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
  }

  // Handle keyboard navigation
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Skip if target is an input or textarea
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    switch (event.key) {
      case 'Escape':
        this.handleEscapeKey(event);
        break;
      case 'Enter':
      case ' ':
        this.handleActivationKey(event);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        this.handleArrowKeys(event);
        break;
    }
  }

  // Handle escape key
  private handleEscapeKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Close panels, modals, or expanded components
    const closeableElement = target.closest('[data-closeable]');
    if (closeableElement) {
      const closeEvent = new CustomEvent('close', { bubbles: true });
      closeableElement.dispatchEvent(closeEvent);
      event.preventDefault();
    }
  }

  // Handle activation keys (Enter, Space)
  private handleActivationKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Activate buttons or interactive elements
    if (target.getAttribute('role') === 'button' || target.tagName === 'BUTTON') {
      if (!target.disabled) {
        target.click();
        event.preventDefault();
      }
    }
  }

  // Handle arrow keys
  private handleArrowKeys(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Navigate through lists or groups
    const listItem = target.closest('[role="listitem"]');
    if (listItem) {
      const list = listItem.closest('[role="list"]');
      if (list) {
        const items = Array.from(list.querySelectorAll('[role="listitem"]'));
        const currentIndex = items.indexOf(listItem);
        
        let nextIndex: number;
        if (event.key === 'ArrowUp') {
          nextIndex = Math.max(0, currentIndex - 1);
        } else {
          nextIndex = Math.min(items.length - 1, currentIndex + 1);
        }
        
        if (nextIndex !== currentIndex) {
          (items[nextIndex] as HTMLElement).focus();
          event.preventDefault();
        }
      }
    }
  }

  // Announce message to screen readers
  announce(message: string, priority: 'polite' | 'assertive' = 'polite', timeout?: number): void {
    const announcement: A11yAnnouncement = {
      id: `announcement-${Date.now()}-${Math.random()}`,
      message,
      priority,
      timeout
    };

    this.announcementQueue.push(announcement);
    this.processAnnouncementQueue();
  }

  // Process announcement queue
  private async processAnnouncementQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.liveRegion) return;

    this.isProcessingQueue = true;

    while (this.announcementQueue.length > 0) {
      const announcement = this.announcementQueue.shift();
      if (!announcement) continue;

      await this.makeAnnouncement(announcement);
    }

    this.isProcessingQueue = false;
  }

  // Make individual announcement
  private async makeAnnouncement(announcement: A11yAnnouncement): Promise<void> {
    if (!this.liveRegion) return;

    // Set priority
    this.liveRegion.setAttribute('aria-live', announcement.priority);

    // Clear previous content
    this.liveRegion.textContent = '';

    // Add new message
    this.liveRegion.textContent = announcement.message;

    // Wait for announcement to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear after timeout
    if (announcement.timeout) {
      setTimeout(() => {
        if (this.liveRegion) {
          this.liveRegion.textContent = '';
        }
      }, announcement.timeout);
    }
  }

  // Generate ARIA labels for navigation elements
  generateAriaLabel(element: string, context?: any): string {
    switch (element) {
      case 'go-button':
        return 'Start navigation';
      
      case 'end-button':
        return 'End navigation and return to map';
      
      case 'mute-button':
        return context?.isMuted ? 'Unmute voice guidance' : 'Mute voice guidance';
      
      case 'follow-button':
        return context?.isFollowing ? 'Stop following user location' : 'Follow user location';
      
      case 'recenter-button':
        return 'Recenter map on route';
      
      case 'minimize-button':
        return context?.isMinimized ? 'Expand directions panel' : 'Minimize directions panel';
      
      case 'step-button':
        return `Step ${context?.stepNumber}: ${context?.instruction}`;
      
      case 'layer-toggle':
        return `${context?.enabled ? 'Hide' : 'Show'} ${context?.layerName}`;
      
      case 'warning-item':
        return `Warning: ${context?.title}. ${context?.message}`;
      
      default:
        return '';
    }
  }

  // Generate ARIA descriptions
  generateAriaDescription(element: string, context?: any): string {
    switch (element) {
      case 'route-header':
        return `Route from ${context?.origin} to ${context?.destination}. ${context?.eta} estimated time, ${context?.distance} distance.`;
      
      case 'directions-list':
        return `Turn-by-turn directions with ${context?.stepCount} steps. Current step: ${context?.currentStep}.`;
      
      case 'accessibility-toggles':
        return `Toggle visibility of accessibility features along your route. ${context?.enabledCount} features currently visible.`;
      
      case 'progress-bar':
        return `Navigation progress: ${context?.progress}% complete. ${context?.remainingDistance} remaining.`;
      
      default:
        return '';
    }
  }

  // Announce navigation events
  announceNavigationEvent(event: string, context?: any): void {
    switch (event) {
      case 'route-ready':
        this.announce(`Route ready. ${context?.eta} estimated time, ${context?.distance} distance. Press Go to start navigation.`);
        break;
      
      case 'navigation-started':
        this.announce('Navigation started. Following turn-by-turn directions.', 'assertive');
        break;
      
      case 'navigation-ended':
        this.announce('Navigation ended. You have arrived at your destination.', 'assertive');
        break;
      
      case 'step-advanced':
        this.announce(`Next: ${context?.instruction}`, 'assertive');
        break;
      
      case 'warning-detected':
        this.announce(`Warning: ${context?.title}. ${context?.message}`, 'assertive');
        break;
      
      case 'user-location-updated':
        this.announce(`Location updated. ${context?.distanceToNext} to next turn.`, 'polite');
        break;
      
      case 'accessibility-feature':
        this.announce(`${context?.featureName} nearby. ${context?.distance} meters away.`, 'polite');
        break;
    }
  }

  // Focus management
  focusElement(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
    }
  }

  // Trap focus within a container
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  // Announce route progress
  announceProgress(progress: number, currentStep: number, totalSteps: number): void {
    if (progress % 25 === 0) { // Announce every 25%
      this.announce(`Navigation progress: ${progress}% complete. Step ${currentStep} of ${totalSteps}.`);
    }
  }

  // Announce upcoming turn
  announceUpcomingTurn(instruction: string, distance: number): void {
    const distanceText = distance >= 1000 ? 
      `${(distance / 1000).toFixed(1)} kilometers` : 
      `${Math.round(distance)} meters`;
    
    this.announce(`In ${distanceText}: ${instruction}`, 'assertive');
  }

  // Announce accessibility features
  announceAccessibilityFeature(feature: any): void {
    const distanceText = feature.distance >= 1000 ? 
      `${(feature.distance / 1000).toFixed(1)} kilometers` : 
      `${Math.round(feature.distance)} meters`;
    
    this.announce(`${feature.properties.name || feature.type} ${distanceText} away.`, 'polite');
  }

  // Cleanup
  cleanup(): void {
    if (this.liveRegion) {
      this.liveRegion.remove();
      this.liveRegion = null;
    }
    
    this.announcementQueue = [];
    this.isProcessingQueue = false;
  }
}

// Create singleton instance
export const accessibilityService = new AccessibilityService();

// Initialize on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    accessibilityService.initialize();
  });
}
