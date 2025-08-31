// Voice Navigation Service for Trek.IQ
class VoiceNavigationService {
  constructor() {
    this.speechSynthesis = window.speechSynthesis;
    this.speechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isListening = false;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.recognition = null;
    this.voiceCommands = new Map();
    this.navigationState = null;
    this.callbacks = {
      onRouteStart: null,
      onRouteEnd: null,
      onTurn: null,
      onBarrier: null,
      onReroute: null
    };
    
    this.initializeVoiceRecognition();
    this.setupVoiceCommands();
  }

  // Initialize speech recognition
  initializeVoiceRecognition() {
    if (!this.speechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    this.recognition = new this.speechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Voice recognition started');
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      this.processVoiceCommand(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Restart listening if it was interrupted
      if (this.navigationState && this.navigationState.isActive) {
        this.startListening();
      }
    };
  }

  // Setup voice commands
  setupVoiceCommands() {
    // Navigation commands
    this.voiceCommands.set('start navigation', () => this.callbacks.onRouteStart?.());
    this.voiceCommands.set('stop navigation', () => this.callbacks.onRouteEnd?.());
    this.voiceCommands.set('pause navigation', () => this.pauseNavigation());
    this.voiceCommands.set('resume navigation', () => this.resumeNavigation());
    
    // Route commands
    this.voiceCommands.set('reroute', () => this.callbacks.onReroute?.());
    this.voiceCommands.set('find alternative route', () => this.callbacks.onReroute?.());
    this.voiceCommands.set('show route', () => this.showRoute());
    
    // Information commands
    this.voiceCommands.set('where am i', () => this.getCurrentLocation());
    this.voiceCommands.set('how far', () => this.getDistanceRemaining());
    this.voiceCommands.set('how long', () => this.getTimeRemaining());
    this.voiceCommands.set('next turn', () => this.getNextTurn());
    this.voiceCommands.set('repeat directions', () => this.repeatDirections());
    
    // Barrier commands
    this.voiceCommands.set('report barrier', () => this.reportBarrier());
    this.voiceCommands.set('show barriers', () => this.showBarriers());
    
    // Accessibility commands
    this.voiceCommands.set('accessibility mode', () => this.toggleAccessibilityMode());
    this.voiceCommands.set('avoid stairs', () => this.toggleAvoidStairs());
    this.voiceCommands.set('wheelchair accessible', () => this.toggleWheelchairMode());
    
    // General commands
    this.voiceCommands.set('help', () => this.speakHelp());
    this.voiceCommands.set('mute', () => this.mute());
    this.voiceCommands.set('unmute', () => this.unmute());
  }

  // Process voice commands
  processVoiceCommand(transcript) {
    console.log('Voice command received:', transcript);
    
    // Find matching command
    for (const [command, action] of this.voiceCommands) {
      if (transcript.includes(command)) {
        action();
        return;
      }
    }
    
    // No command found
    this.speak("I didn't understand that command. Say 'help' for available commands.");
  }

  // Text-to-speech functionality
  speak(text, options = {}) {
    if (!this.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Cancel any current speech
    if (this.currentUtterance) {
      this.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice options
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    
    // Try to use a natural-sounding voice
    const voices = this.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Natural')
    ) || voices.find(voice => voice.lang.includes('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.currentUtterance = utterance;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      this.isSpeaking = false;
      this.currentUtterance = null;
    };

    this.speechSynthesis.speak(utterance);
  }

  // Navigation announcements
  announceRouteStart(route) {
    const duration = Math.round(route.duration / 60);
    const distance = Math.round(route.distance / 1000 * 10) / 10;
    
    this.speak(`Navigation started. Your route is ${distance} kilometers and will take approximately ${duration} minutes.`);
  }

  announceTurn(instruction, distance) {
    const distanceText = distance < 1000 ? `${Math.round(distance)} meters` : `${Math.round(distance / 1000 * 10) / 10} kilometers`;
    this.speak(`${instruction} in ${distanceText}`);
  }

  announceBarrier(barrier) {
    const severity = barrier.severity === 'critical' ? 'critical' : barrier.severity;
    this.speak(`Warning: ${severity} barrier detected ahead. ${barrier.description}`);
  }

  announceReroute(newRoute) {
    const additionalTime = Math.round(newRoute.additionalTime / 60);
    this.speak(`Route recalculated. This will add approximately ${additionalTime} minutes to your journey.`);
  }

  announceArrival() {
    this.speak("You have arrived at your destination.");
  }

  // Start voice recognition
  startListening() {
    if (!this.recognition || this.isListening) return;
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
  }

  // Stop voice recognition
  stopListening() {
    if (!this.recognition || !this.isListening) return;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }

  // Set navigation state
  setNavigationState(state) {
    this.navigationState = state;
    
    // Auto-start listening when navigation is active
    if (state.isActive && !this.isListening) {
      this.startListening();
    } else if (!state.isActive && this.isListening) {
      this.stopListening();
    }
  }

  // Register callbacks
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  // Navigation control methods
  pauseNavigation() {
    this.speak("Navigation paused. Say 'resume navigation' to continue.");
    // Implementation would pause navigation state
  }

  resumeNavigation() {
    this.speak("Navigation resumed.");
    // Implementation would resume navigation state
  }

  showRoute() {
    this.speak("Showing route on map.");
    // Implementation would highlight route on map
  }

  getCurrentLocation() {
    if (this.navigationState && this.navigationState.currentLocation) {
      this.speak("Getting your current location.");
      // Implementation would get and announce current location
    } else {
      this.speak("Location not available.");
    }
  }

  getDistanceRemaining() {
    if (this.navigationState && this.navigationState.distanceRemaining) {
      const distance = Math.round(this.navigationState.distanceRemaining / 1000 * 10) / 10;
      this.speak(`You have ${distance} kilometers remaining.`);
    } else {
      this.speak("Distance information not available.");
    }
  }

  getTimeRemaining() {
    if (this.navigationState && this.navigationState.timeRemaining) {
      const minutes = Math.round(this.navigationState.timeRemaining / 60);
      this.speak(`You have approximately ${minutes} minutes remaining.`);
    } else {
      this.speak("Time information not available.");
    }
  }

  getNextTurn() {
    if (this.navigationState && this.navigationState.nextTurn) {
      const turn = this.navigationState.nextTurn;
      this.speak(`Next turn: ${turn.instruction} in ${Math.round(turn.distance)} meters.`);
    } else {
      this.speak("No upcoming turns.");
    }
  }

  repeatDirections() {
    if (this.navigationState && this.navigationState.currentStep) {
      const step = this.navigationState.currentStep;
      this.speak(`Current direction: ${step.instruction}`);
    } else {
      this.speak("No current directions to repeat.");
    }
  }

  reportBarrier() {
    this.speak("Opening barrier reporting. Please describe the barrier you encountered.");
    // Implementation would open barrier reporting modal
  }

  showBarriers() {
    this.speak("Showing barriers on map.");
    // Implementation would show barriers on map
  }

  toggleAccessibilityMode() {
    this.speak("Toggling accessibility mode.");
    // Implementation would toggle accessibility settings
  }

  toggleAvoidStairs() {
    this.speak("Toggling stair avoidance.");
    // Implementation would toggle stair avoidance setting
  }

  toggleWheelchairMode() {
    this.speak("Toggling wheelchair accessible mode.");
    // Implementation would toggle wheelchair mode
  }

  speakHelp() {
    const helpText = `
      Available voice commands:
      Navigation: start navigation, stop navigation, pause navigation, resume navigation
      Route: reroute, show route, next turn, repeat directions
      Information: where am i, how far, how long
      Barriers: report barrier, show barriers
      Accessibility: accessibility mode, avoid stairs, wheelchair accessible
      General: help, mute, unmute
    `;
    this.speak(helpText);
  }

  mute() {
    this.speechSynthesis.cancel();
    this.speak("Voice guidance muted.");
  }

  unmute() {
    this.speak("Voice guidance unmuted.");
  }

  // Haptic feedback for mobile devices
  hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [50],
        medium: [100],
        heavy: [200],
        turn: [100, 50, 100],
        barrier: [200, 100, 200]
      };
      
      navigator.vibrate(patterns[type] || patterns.light);
    }
  }

  // Accessibility announcements
  announceAccessibilityFeature(feature) {
    this.speak(`Accessibility feature: ${feature}`);
  }

  // Weather-related announcements
  announceWeatherWarning(warning) {
    this.speak(`Weather warning: ${warning}`);
  }

  // Emergency announcements
  announceEmergency(emergency) {
    this.speak(`Emergency alert: ${emergency}`, { rate: 0.8, pitch: 1.2 });
    this.hapticFeedback('heavy');
  }

  // Cleanup
  destroy() {
    this.stopListening();
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
  }
}

// Create singleton instance
const voiceNavigationService = new VoiceNavigationService();

export default voiceNavigationService;
