import React, { useState, useEffect } from 'react';
import accessibilityService from '../services/accessibilityService';

const AccessibilitySettings = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange,
  isDarkMode,
  onToggleDarkMode 
}) => {
  const [supportedFeatures, setSupportedFeatures] = useState({});
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    setSupportedFeatures(accessibilityService.getSupportedFeatures());
  }, []);

  const handleVoiceCommand = (command) => {
    const action = accessibilityService.processVoiceCommand(command);
    if (action) {
      // Handle voice commands
      switch (action) {
        case 'darkMode':
          onToggleDarkMode();
          break;
        case 'help':
          accessibilityService.speak('Accessibility settings help. Use voice commands like "dark mode", "increase text size", or "start voice navigation".');
          break;
        default:
          accessibilityService.speak(`Command recognized: ${action}`);
      }
    }
    setIsListening(false);
  };

  const startVoiceCommands = () => {
    setIsListening(true);
    accessibilityService.startListening(handleVoiceCommand);
  };

  const stopVoiceCommands = () => {
    setIsListening(false);
    accessibilityService.stopListening();
  };

  const updateSetting = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const testVoice = () => {
    accessibilityService.speak('Voice navigation is working. You can use voice commands to control the application.');
  };

  const testHaptic = () => {
    accessibilityService.hapticFeedback('success');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] modal-overlay">
      <div className={`max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Accessibility Settings</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'hover:bg-gray-700' : ''
              }`}
              aria-label="Close accessibility settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Visual Settings */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Visual Settings</h3>
              
              <div className="space-y-4">
                {/* Text Size */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Text Size: {settings.textSize || 'medium'}
                  </label>
                  <div className="flex space-x-2">
                    {['small', 'medium', 'large', 'extra-large'].map((size) => (
                      <button
                        key={size}
                        onClick={() => updateSetting('textSize', size)}
                        className={`px-3 py-1 rounded border ${
                          settings.textSize === size
                            ? 'bg-blue-600 text-white border-blue-600'
                            : isDarkMode
                            ? 'border-gray-600 hover:bg-gray-700'
                            : 'border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {size.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* High Contrast */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.highContrast || false}
                      onChange={(e) => updateSetting('highContrast', e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">High Contrast Mode</span>
                  </label>
                </div>

                {/* Dark Mode */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isDarkMode}
                      onChange={onToggleDarkMode}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">Dark Mode</span>
                  </label>
                </div>

                {/* Reduce Motion */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.reduceMotion || false}
                      onChange={(e) => updateSetting('reduceMotion', e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">Reduce Motion</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Voice and Audio Settings */}
            {supportedFeatures.speechSynthesis && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Voice and Audio</h3>
                
                <div className="space-y-4">
                  {/* Voice Navigation */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.voiceNavigation || false}
                        onChange={(e) => updateSetting('voiceNavigation', e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm">Enable Voice Navigation</span>
                    </label>
                  </div>

                  {/* Speech Rate */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Speech Rate: {settings.speechRate || 1}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={settings.speechRate || 1}
                      onChange={(e) => updateSetting('speechRate', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slow</span>
                      <span>Normal</span>
                      <span>Fast</span>
                    </div>
                  </div>

                  {/* Test Voice */}
                  <button
                    onClick={testVoice}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Test Voice Navigation
                  </button>
                </div>
              </section>
            )}

            {/* Voice Commands */}
            {supportedFeatures.speechRecognition && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Voice Commands</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={isListening ? stopVoiceCommands : startVoiceCommands}
                      className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isListening
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {isListening ? 'Stop Listening' : 'Start Voice Commands'}
                    </button>
                    
                    {isListening && (
                      <div className="flex items-center">
                        <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">Listening...</span>
                      </div>
                    )}
                  </div>

                  <div className={`p-3 rounded-md ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <h4 className="font-medium mb-2">Available Commands:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• "Find route" or "Plan route"</li>
                      <li>• "Report barrier" or "Report issue"</li>
                      <li>• "Toggle layers" or "Show layers"</li>
                      <li>• "Dark mode" or "Light mode"</li>
                      <li>• "Accessibility mode" or "Simple mode"</li>
                      <li>• "Help" for assistance</li>
                      <li>• "Clear" to reset</li>
                    </ul>
                  </div>
                </div>
              </section>
            )}

            {/* Haptic Feedback */}
            {supportedFeatures.hapticFeedback && (
              <section>
                <h3 className="text-lg font-semibold mb-4">Haptic Feedback</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.hapticFeedback || false}
                        onChange={(e) => updateSetting('hapticFeedback', e.target.checked)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm">Enable Haptic Feedback</span>
                    </label>
                  </div>

                  <button
                    onClick={testHaptic}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Test Haptic Feedback
                  </button>
                </div>
              </section>
            )}

            {/* Keyboard Navigation */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Keyboard Navigation</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.keyboardNavigation || false}
                      onChange={(e) => updateSetting('keyboardNavigation', e.target.checked)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm">Enhanced Keyboard Navigation</span>
                  </label>
                </div>

                <div className={`p-3 rounded-md ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <h4 className="font-medium mb-2">Keyboard Shortcuts:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <kbd className="px-1 py-0.5 bg-gray-300 rounded text-xs">Tab</kbd> Navigate between elements</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-300 rounded text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 bg-gray-300 rounded text-xs">Space</kbd> Activate buttons</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-300 rounded text-xs">Escape</kbd> Close modals</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-300 rounded text-xs">Ctrl + M</kbd> Toggle map focus</li>
                    <li>• <kbd className="px-1 py-0.5 bg-gray-300 rounded text-xs">Ctrl + R</kbd> Report barrier</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Language Settings */}
            <section>
              <h3 className="text-lg font-semibold mb-4">Language</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">Interface Language</label>
                <select
                  value={settings.language || 'en'}
                  onChange={(e) => updateSetting('language', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>
            </section>

            {/* Reset Settings */}
            <section>
              <button
                onClick={() => {
                  onSettingsChange({});
                  accessibilityService.speak('Accessibility settings reset to default');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reset to Default
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilitySettings;
