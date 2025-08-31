// Enhanced Accessibility Service for Trek.IQ
class AccessibilityService {
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.onVoiceCommand = null;
    this.currentProfile = null;
    this.navigationMode = 'standard';
    this.contextAwareness = true;
    this.initializeSpeechRecognition();
    this.loadUserProfile();
  }

  initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase();
        if (this.onVoiceCommand) {
          this.onVoiceCommand(command);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  // Enhanced Text-to-Speech with accessibility profiles
  speak(text, options = {}) {
    if (this.speechSynthesis) {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply profile-specific settings
      if (this.currentProfile) {
        utterance.rate = options.rate || this.currentProfile.speechRate || 1;
        utterance.pitch = options.pitch || this.currentProfile.speechPitch || 1;
        utterance.volume = options.volume || this.currentProfile.speechVolume || 1;
      } else {
        utterance.rate = options.rate || 1;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
      }
      
      utterance.lang = options.lang || 'en-US';

      this.speechSynthesis.speak(utterance);
    }
  }

  // Stop speech
  stopSpeaking() {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }

  // Voice commands with enhanced recognition
  startListening(onCommand) {
    if (this.recognition && !this.isListening) {
      this.onVoiceCommand = onCommand;
      this.recognition.start();
      this.isListening = true;
      this.speak('Listening for voice commands');
      this.hapticFeedback('start');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.hapticFeedback('stop');
    }
  }

  // Enhanced voice command processing
  processVoiceCommand(command) {
    const commands = {
      // Navigation commands
      'find route': 'route',
      'plan route': 'route',
      'start navigation': 'startNav',
      'stop navigation': 'stopNav',
      'repeat directions': 'repeatDirections',
      'where am i': 'location',
      
      // Barrier reporting
      'report barrier': 'barrier',
      'report issue': 'barrier',
      'report problem': 'barrier',
      
      // Accessibility features
      'toggle layers': 'layers',
      'show layers': 'layers',
      'accessibility mode': 'accessibility',
      'simple mode': 'simple',
      'high contrast': 'highContrast',
      'increase text size': 'increaseText',
      'decrease text size': 'decreaseText',
      
      // Profile management
      'switch profile': 'switchProfile',
      'save location': 'saveLocation',
      'my saved places': 'savedPlaces',
      
      // Safety features
      'share my route': 'shareRoute',
      'emergency contact': 'emergency',
      'sos': 'emergency',
      
      // General
      'dark mode': 'darkMode',
      'light mode': 'lightMode',
      'help': 'help',
      'clear': 'clear',
      'stop': 'stop',
      'cancel': 'cancel'
    };

    for (const [phrase, action] of Object.entries(commands)) {
      if (command.includes(phrase)) {
        return action;
      }
    }

    return null;
  }

  // Context-aware route announcement
  announceRoute(route, context = {}) {
    if (!route || !route.features || !route.features[0]) return;

    const properties = route.features[0].properties;
    const distance = properties.distance.toFixed(1);
    const duration = Math.round(properties.duration);

    let announcement = `Route found. Distance: ${distance} kilometers. Estimated time: ${duration} minutes.`;
    
    // Add context-aware information
    if (context.weather) {
      if (context.weather.includes('snow') || context.weather.includes('ice')) {
        announcement += ' Winter conditions detected. Route optimized for safety.';
      }
    }
    
    if (context.timeOfDay === 'night') {
      announcement += ' Night navigation mode. Well-lit routes preferred.';
    }
    
    if (properties.avoidSteps) {
      announcement += ' Route avoids steps and stairs.';
    }
    
    if (properties.winterMode) {
      announcement += ' Winter mode enabled, preferring maintained areas.';
    }

    // Add accessibility-specific information
    if (this.currentProfile) {
      if (this.currentProfile.needs.includes('wheelchair')) {
        announcement += ' Wheelchair-accessible route selected.';
      }
      if (this.currentProfile.needs.includes('lowVision')) {
        announcement += ' High-contrast landmarks highlighted.';
      }
      if (this.currentProfile.needs.includes('hearing')) {
        announcement += ' Visual alerts enabled.';
      }
    }

    // Announce accessible parking for driving routes
    if (properties.mode === 'driving' && properties.accessibleParking && properties.accessibleParking.length > 0) {
      announcement += ` ${properties.accessibleParking.length} accessible parking spots found near your destination.`;
    }

    this.speak(announcement);
  }

  // Announce location search results
  announceLocationResults(results, locationType = 'location') {
    if (!results || results.length === 0) {
      this.speak(`No ${locationType} found. Please try a different search term.`);
      return;
    }

    if (results.length === 1) {
      const result = results[0];
      const name = result.display_name || result.name || 'Unknown location';
      this.speak(`${locationType} found: ${name}`);
    } else {
      this.speak(`${results.length} ${locationType}s found. Use arrow keys or tap to select.`);
    }
  }

  // Announce selected location
  announceLocationSelected(location, locationType = 'location') {
    const name = location.display_name || location.name || 'Unknown location';
    this.speak(`${locationType} selected: ${name}`);
    this.hapticFeedback('success');
  }

  // Enhanced step-by-step directions with context
  announceDirections(steps, context = {}) {
    if (!steps || steps.length === 0) return;

    let announcement = 'Step by step directions: ';
    steps.forEach((step, index) => {
      announcement += `Step ${index + 1}: ${step.instruction}. `;
      
      if (step.distance) {
        announcement += `Continue for ${step.distance} meters. `;
      }
      
      // Add context-aware alerts
      if (step.barriers && step.barriers.length > 0) {
        announcement += `Alert: ${step.barriers.join(', ')} ahead. `;
      }
      
      if (step.alternatives && step.alternatives.length > 0) {
        announcement += `Alternative route available: ${step.alternatives.join(', ')}. `;
      }
      
      // Add accessibility information
      if (step.accessibility) {
        if (step.accessibility.ramp) {
          announcement += 'Ramp available. ';
        }
        if (step.accessibility.elevator) {
          announcement += 'Elevator nearby. ';
        }
        if (step.accessibility.crossing) {
          announcement += 'Accessible crossing with audio signal. ';
        }
      }
    });

    this.speak(announcement);
  }

  // Enhanced barrier reporting with gamification
  announceBarrierReport(barrier) {
    const type = barrier.type.replace(/\b\w/g, l => l.toUpperCase());
    const severity = barrier.severity;
    let announcement = `Barrier reported successfully. Type: ${type}. Severity: ${severity}. `;
    
    // Add gamification elements
    const points = this.calculateBarrierPoints(barrier);
    announcement += `You earned ${points} community points! `;
    
    // Check for badges
    const newBadge = this.checkForNewBadge(barrier);
    if (newBadge) {
      announcement += `Congratulations! You've earned the ${newBadge} badge! `;
    }
    
    announcement += 'Thank you for helping improve accessibility for everyone.';
    this.speak(announcement);
    
    // Haptic feedback for success
    this.hapticFeedback('success');
  }

  // Enhanced haptic feedback with accessibility patterns
  hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        // Basic patterns
        light: 50,
        medium: 100,
        heavy: 200,
        
        // Navigation patterns
        turnLeft: [100, 50, 100],
        turnRight: [100, 50, 100, 50, 100],
        straight: [200],
        destination: [100, 100, 100],
        
        // Accessibility patterns
        barrier: [200, 100, 200],
        ramp: [100, 100],
        elevator: [150, 150, 150],
        crossing: [100, 50, 100, 50, 100],
        
        // Status patterns
        success: [100, 50, 100],
        error: [200, 100, 200],
        warning: [150, 150],
        start: [100],
        stop: [200, 200],
        
        // Emergency patterns
        emergency: [300, 100, 300, 100, 300],
        sos: [200, 200, 200, 500, 200, 200, 200]
      };
      
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }

  // Accessibility profile management
  loadUserProfile() {
    const savedProfile = localStorage.getItem('trekIqProfile');
    if (savedProfile) {
      this.currentProfile = JSON.parse(savedProfile);
    } else {
      // Default profile
      this.currentProfile = {
        id: 'default',
        name: 'Default Profile',
        needs: [],
        preferences: {
          speechRate: 1,
          speechPitch: 1,
          speechVolume: 1,
          hapticFeedback: true,
          voiceNavigation: false,
          highContrast: false,
          largeText: false,
          reduceMotion: false
        },
        emergencyContacts: [],
        savedLocations: []
      };
    }
  }

  saveUserProfile(profile) {
    this.currentProfile = profile;
    localStorage.setItem('trekIqProfile', JSON.stringify(profile));
  }

  createAccessibilityProfile(name, needs, preferences = {}) {
    const profile = {
      id: Date.now().toString(),
      name,
      needs: needs || [],
      preferences: {
        speechRate: 1,
        speechPitch: 1,
        speechVolume: 1,
        hapticFeedback: true,
        voiceNavigation: false,
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        ...preferences
      },
      emergencyContacts: [],
      savedLocations: []
    };
    
    return profile;
  }

  // Gamification system
  calculateBarrierPoints(barrier) {
    let points = 10; // Base points
    
    // Bonus points for severity
    if (barrier.severity === 'high') points += 20;
    else if (barrier.severity === 'medium') points += 10;
    
    // Bonus points for photo
    if (barrier.photo) points += 15;
    
    // Bonus points for detailed notes
    if (barrier.notes && barrier.notes.length > 50) points += 10;
    
    return points;
  }

  checkForNewBadge(barrier) {
    // Simple badge system - in a real app, this would be more sophisticated
    const totalReports = parseInt(localStorage.getItem('totalBarrierReports') || '0') + 1;
    localStorage.setItem('totalBarrierReports', totalReports.toString());
    
    if (totalReports === 1) return 'First Reporter';
    if (totalReports === 10) return 'Community Helper';
    if (totalReports === 50) return 'Accessibility Champion';
    if (totalReports === 100) return 'City Guardian';
    
    return null;
  }

  // Context-aware navigation
  setNavigationMode(mode) {
    this.navigationMode = mode;
    
    switch (mode) {
      case 'blind':
        this.speak('Blind navigation mode activated. Enhanced audio descriptions enabled.');
        break;
      case 'wheelchair':
        this.speak('Wheelchair navigation mode activated. Route optimized for accessibility.');
        break;
      case 'lowVision':
        this.speak('Low vision navigation mode activated. High contrast and large text enabled.');
        break;
      case 'deaf':
        this.speak('Deaf navigation mode activated. Enhanced visual and haptic feedback enabled.');
        break;
      case 'neurodiverse':
        this.speak('Neurodiverse-friendly navigation mode activated. Simplified interface and reduced stimuli.');
        break;
      default:
        this.speak('Standard navigation mode activated.');
    }
  }

  // Safety features
  shareRoute(route, contacts) {
    const routeData = {
      route: route,
      timestamp: new Date().toISOString(),
      estimatedArrival: this.calculateETA(route),
      shareUrl: this.generateShareUrl(route)
    };
    
    // In a real app, this would integrate with messaging/email
    console.log('Route shared with:', contacts, routeData);
    this.speak('Route shared with your emergency contacts.');
  }

  calculateETA(route) {
    if (!route || !route.features || !route.features[0]) return null;
    const duration = route.features[0].properties.duration;
    const arrival = new Date(Date.now() + duration * 60 * 1000);
    return arrival.toISOString();
  }

  generateShareUrl(route) {
    // Generate a shareable URL for the route
    const routeData = encodeURIComponent(JSON.stringify(route));
    return `${window.location.origin}/route/${btoa(routeData)}`;
  }

  // Check accessibility features support
  getSupportedFeatures() {
    return {
      speechSynthesis: !!this.speechSynthesis,
      speechRecognition: !!this.recognition,
      hapticFeedback: 'vibrate' in navigator,
      screenReader: 'querySelector' in document && document.querySelector('[aria-live]') !== null,
      geolocation: 'geolocation' in navigator,
      notifications: 'Notification' in window,
      share: 'share' in navigator
    };
  }
}

const accessibilityService = new AccessibilityService();
export default accessibilityService;
