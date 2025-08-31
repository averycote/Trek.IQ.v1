import React, { useState, useEffect } from 'react';
import accessibilityService from '../services/accessibilityService';

const SafetyFeatures = ({ 
  isOpen, 
  onClose, 
  isDarkMode,
  currentRoute 
}) => {
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: ''
  });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [shareOptions, setShareOptions] = useState({
    shareLocation: true,
    shareRoute: true,
    shareETA: true,
    duration: 30 // minutes
  });

  useEffect(() => {
    if (isOpen) {
      loadEmergencyContacts();
    }
  }, [isOpen]);

  const loadEmergencyContacts = () => {
    const savedContacts = localStorage.getItem('emergencyContacts');
    if (savedContacts) {
      setEmergencyContacts(JSON.parse(savedContacts));
    }
  };

  const saveEmergencyContacts = (contacts) => {
    localStorage.setItem('emergencyContacts', JSON.stringify(contacts));
    setEmergencyContacts(contacts);
  };

  const handleAddContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      accessibilityService.speak('Please provide a name and phone number');
      return;
    }

    const contact = {
      id: Date.now().toString(),
      ...newContact,
      addedAt: new Date().toISOString()
    };

    const updatedContacts = [...emergencyContacts, contact];
    saveEmergencyContacts(updatedContacts);
    
    setNewContact({
      name: '',
      phone: '',
      email: '',
      relationship: ''
    });
    setIsAddingContact(false);
    
    accessibilityService.speak(`Emergency contact ${contact.name} added successfully`);
  };

  const handleRemoveContact = (contactId) => {
    const updatedContacts = emergencyContacts.filter(c => c.id !== contactId);
    saveEmergencyContacts(updatedContacts);
    accessibilityService.speak('Emergency contact removed');
  };

  const handleShareRoute = () => {
    if (!currentRoute) {
      accessibilityService.speak('No active route to share');
      return;
    }

    if (emergencyContacts.length === 0) {
      accessibilityService.speak('Please add emergency contacts first');
      return;
    }

    const selectedContacts = emergencyContacts.filter(c => c.selected);
    if (selectedContacts.length === 0) {
      accessibilityService.speak('Please select at least one contact to share with');
      return;
    }

    // Share route with selected contacts
    accessibilityService.shareRoute(currentRoute, selectedContacts);
    
    // Show success message
    accessibilityService.speak(`Route shared with ${selectedContacts.length} contact${selectedContacts.length > 1 ? 's' : ''}`);
  };

  const handleSOS = () => {
    if (emergencyContacts.length === 0) {
      accessibilityService.speak('No emergency contacts available. Please add contacts first.');
      return;
    }

    // Trigger SOS - in a real app, this would call emergency services
    accessibilityService.hapticFeedback('sos');
    accessibilityService.speak('SOS activated. Emergency contacts will be notified.');
    
    // Simulate emergency notification
    setTimeout(() => {
      accessibilityService.speak('Emergency contacts have been notified of your location');
    }, 2000);
  };

  const toggleContactSelection = (contactId) => {
    const updatedContacts = emergencyContacts.map(contact => 
      contact.id === contactId 
        ? { ...contact, selected: !contact.selected }
        : contact
    );
    saveEmergencyContacts(updatedContacts);
  };

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          accessibilityService.speak(`Your current location is ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          accessibilityService.speak('Unable to get your current location');
        }
      );
    } else {
      accessibilityService.speak('Geolocation is not supported by this browser');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] modal-overlay">
      <div className={`max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Safety Features</h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode ? 'hover:bg-gray-700' : ''
              }`}
              aria-label="Close safety features"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* SOS Button */}
          <div className="mb-6">
            <button
              onClick={handleSOS}
              className="w-full py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-lg"
            >
              🚨 SOS - Emergency Alert
            </button>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
              Press in case of emergency to notify your contacts
            </p>
          </div>

          {/* Current Location */}
          <div className="mb-6">
            <button
              onClick={getCurrentLocation}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              📍 Get My Current Location
            </button>
          </div>

          {/* Emergency Contacts */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Emergency Contacts</h3>
              <button
                onClick={() => setIsAddingContact(true)}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              >
                + Add Contact
              </button>
            </div>

            <div className="space-y-3">
              {emergencyContacts.map(contact => (
                <div
                  key={contact.id}
                  className={`p-4 rounded-lg border ${
                    isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={contact.selected || false}
                        onChange={() => toggleContactSelection(contact.id)}
                        className="mr-2"
                      />
                      <div>
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {contact.phone} • {contact.relationship}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveContact(contact.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {emergencyContacts.length === 0 && (
                <div className={`p-4 rounded-lg border-2 border-dashed ${
                  isDarkMode ? 'border-gray-600' : 'border-gray-300'
                } text-center`}>
                  <p className="text-gray-600 dark:text-gray-400">No emergency contacts added</p>
                  <button
                    onClick={() => setIsAddingContact(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700"
                  >
                    Add your first contact
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Route Sharing */}
          {currentRoute && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Share Route</h3>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareOptions.shareLocation}
                      onChange={(e) => setShareOptions(prev => ({ ...prev, shareLocation: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Share current location</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareOptions.shareRoute}
                      onChange={(e) => setShareOptions(prev => ({ ...prev, shareRoute: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Share route details</span>
                  </label>
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={shareOptions.shareETA}
                      onChange={(e) => setShareOptions(prev => ({ ...prev, shareETA: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm">Share estimated arrival time</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Share duration: {shareOptions.duration} minutes
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="120"
                    step="15"
                    value={shareOptions.duration}
                    onChange={(e) => setShareOptions(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>15 min</span>
                    <span>60 min</span>
                    <span>120 min</span>
                  </div>
                </div>
                <button
                  onClick={handleShareRoute}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  📤 Share Route with Contacts
                </button>
              </div>
            </div>
          )}

          {/* Add Contact Modal */}
          {isAddingContact && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
              <div className={`max-w-md w-full mx-4 rounded-lg shadow-xl ${
                isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
              }`}>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Add Emergency Contact</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Name *</label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter contact name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        value={newContact.phone}
                        onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email (optional)</label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Relationship</label>
                      <input
                        type="text"
                        value={newContact.relationship}
                        onChange={(e) => setNewContact(prev => ({ ...prev, relationship: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="e.g., Spouse, Parent, Friend"
                      />
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <button
                        onClick={() => setIsAddingContact(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddContact}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        Add Contact
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafetyFeatures;
