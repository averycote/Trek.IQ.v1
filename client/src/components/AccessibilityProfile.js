import React, { useState, useEffect } from 'react';
import accessibilityService from '../services/accessibilityService';

const AccessibilityProfile = ({ 
  isOpen, 
  onClose, 
  isDarkMode,
  onProfileChange 
}) => {
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: '',
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
  });

  const accessibilityNeeds = [
    { id: 'wheelchair', label: 'Wheelchair User', icon: '♿' },
    { id: 'blind', label: 'Blind/Low Vision', icon: '👁️' },
    { id: 'deaf', label: 'Deaf/Hard of Hearing', icon: '👂' },
    { id: 'mobility', label: 'Mobility Device', icon: '🦽' },
    { id: 'stroller', label: 'Stroller/Pram', icon: '👶' },
    { id: 'elderly', label: 'Elderly', icon: '👴' },
    { id: 'neurodiverse', label: 'Neurodiverse', icon: '🧠' },
    { id: 'temporary', label: 'Temporary Injury', icon: '🩹' }
  ];

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const savedProfiles = localStorage.getItem('trekIqProfiles');
    if (savedProfiles) {
      const parsedProfiles = JSON.parse(savedProfiles);
      setProfiles(parsedProfiles);
      
      // Set current profile
      const current = accessibilityService.currentProfile;
      if (current) {
        setCurrentProfile(current);
      }
    }
  };

  const saveProfiles = (updatedProfiles) => {
    localStorage.setItem('trekIqProfiles', JSON.stringify(updatedProfiles));
    setProfiles(updatedProfiles);
  };

  const handleCreateProfile = () => {
    if (!newProfile.name.trim()) {
      accessibilityService.speak('Please enter a profile name');
      return;
    }

    const profile = accessibilityService.createAccessibilityProfile(
      newProfile.name,
      newProfile.needs,
      newProfile.preferences
    );

    const updatedProfiles = [...profiles, profile];
    saveProfiles(updatedProfiles);
    
    // Set as current profile
    accessibilityService.saveUserProfile(profile);
    setCurrentProfile(profile);
    onProfileChange(profile);
    
    setIsCreating(false);
    setNewProfile({
      name: '',
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
    });

    accessibilityService.speak(`Profile ${profile.name} created successfully`);
  };

  const handleSwitchProfile = (profile) => {
    accessibilityService.saveUserProfile(profile);
    setCurrentProfile(profile);
    onProfileChange(profile);
    accessibilityService.speak(`Switched to ${profile.name} profile`);
  };

  const handleDeleteProfile = (profileId) => {
    const updatedProfiles = profiles.filter(p => p.id !== profileId);
    saveProfiles(updatedProfiles);
    
    if (currentProfile && currentProfile.id === profileId) {
      const defaultProfile = updatedProfiles[0] || accessibilityService.createAccessibilityProfile('Default', []);
      accessibilityService.saveUserProfile(defaultProfile);
      setCurrentProfile(defaultProfile);
      onProfileChange(defaultProfile);
    }
    
    accessibilityService.speak('Profile deleted');
  };

  const toggleNeed = (needId) => {
    const updatedNeeds = newProfile.needs.includes(needId)
      ? newProfile.needs.filter(id => id !== needId)
      : [...newProfile.needs, needId];
    
    setNewProfile(prev => ({
      ...prev,
      needs: updatedNeeds
    }));
  };

  const updatePreference = (key, value) => {
    setNewProfile(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] modal-overlay">
      <div className={`max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Accessibility Profiles</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'hover:bg-gray-700' : ''
              }`}
              aria-label="Close profiles"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Profiles */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Your Profiles</h3>
              <div className="space-y-3">
                {profiles.map(profile => (
                  <div
                    key={profile.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      currentProfile?.id === profile.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                        : isDarkMode
                        ? 'border-gray-600 bg-gray-700'
                        : 'border-gray-300 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{profile.name}</h4>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {profile.needs.map(needId => {
                            const need = accessibilityNeeds.find(n => n.id === needId);
                            return need ? (
                              <span
                                key={needId}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              >
                                {need.icon} {need.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleSwitchProfile(profile)}
                          className={`px-3 py-1 rounded text-sm ${
                            currentProfile?.id === profile.id
                              ? 'bg-green-600 text-white'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {currentProfile?.id === profile.id ? 'Active' : 'Switch'}
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                + Create New Profile
              </button>
            </div>

            {/* Create New Profile */}
            {isCreating && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Create New Profile</h3>
                <div className="space-y-4">
                  {/* Profile Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Profile Name</label>
                    <input
                      type="text"
                      value={newProfile.name}
                      onChange={(e) => setNewProfile(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="Enter profile name"
                    />
                  </div>

                  {/* Accessibility Needs */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Accessibility Needs</label>
                    <div className="grid grid-cols-2 gap-2">
                      {accessibilityNeeds.map(need => (
                        <label
                          key={need.id}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                            newProfile.needs.includes(need.id)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                              : isDarkMode
                              ? 'border-gray-600 bg-gray-700'
                              : 'border-gray-300 bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={newProfile.needs.includes(need.id)}
                            onChange={() => toggleNeed(need.id)}
                            className="mr-2"
                          />
                          <span className="text-lg mr-2">{need.icon}</span>
                          <span className="text-sm">{need.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preferences */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Preferences</label>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newProfile.preferences.hapticFeedback}
                            onChange={(e) => updatePreference('hapticFeedback', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Haptic Feedback</span>
                        </label>
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newProfile.preferences.voiceNavigation}
                            onChange={(e) => updatePreference('voiceNavigation', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Voice Navigation</span>
                        </label>
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newProfile.preferences.highContrast}
                            onChange={(e) => updatePreference('highContrast', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">High Contrast</span>
                        </label>
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newProfile.preferences.largeText}
                            onChange={(e) => updatePreference('largeText', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Large Text</span>
                        </label>
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newProfile.preferences.reduceMotion}
                            onChange={(e) => updatePreference('reduceMotion', e.target.checked)}
                            className="mr-2"
                          />
                          <span className="text-sm">Reduce Motion</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Speech Rate */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Speech Rate: {newProfile.preferences.speechRate}
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={newProfile.preferences.speechRate}
                      onChange={(e) => updatePreference('speechRate', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slow</span>
                      <span>Normal</span>
                      <span>Fast</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateProfile}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessibilityProfile;
