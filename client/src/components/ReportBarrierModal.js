import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const ReportBarrierModal = React.memo(({
  isOpen,
  onClose,
  onReport,
  currentLocation = null,
  isDarkMode = false
}) => {
  const [formData, setFormData] = useState({
    type: '',
    severity: 'medium',
    description: '',
    photo: null,
    latitude: null,
    longitude: null,
    locationDetails: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userLocation, setUserLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const barrierTypes = [
    { id: 'steps_stairs', label: 'Steps / Stairs', icon: '🪜', description: 'Stairs or steps blocking access' },
    { id: 'steep_slope', label: 'Steep Slope', icon: '📈', description: 'Path is too steep for safe travel' },
    { id: 'obstructed_path', label: 'Obstructed Path', icon: '🚧', description: 'Path blocked by obstacles' },
    { id: 'inaccessible_entrance', label: 'Inaccessible Entrance', icon: '🚪', description: 'No accessible entrance available' },
    { id: 'no_curb_cut', label: 'No Curb Cut', icon: '♿', description: 'Missing ramp at curb' },
    { id: 'poor_lighting', label: 'Poor Lighting', icon: '💡', description: 'Insufficient lighting for safety' },
    { id: 'construction', label: 'Construction', icon: '🏗️', description: 'Construction blocking access' },
    { id: 'snow_ice', label: 'Snow/Ice', icon: '❄️', description: 'Snow or ice making path unsafe' },
    { id: 'other', label: 'Other', icon: '❓', description: 'Other accessibility issue' }
  ];

  const severityLevels = [
    { id: 'low', label: 'Low', description: 'Minor inconvenience', color: '#10B981' },
    { id: 'medium', label: 'Medium', description: 'Significant barrier', color: '#F59E0B' },
    { id: 'high', label: 'High', description: 'Major safety concern', color: '#EF4444' },
    { id: 'critical', label: 'Critical', description: 'Immediate danger', color: '#DC2626' }
  ];

  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setUserLocation(location);
        setFormData(prev => ({
          ...prev,
          latitude: location.latitude,
          longitude: location.longitude
        }));
        setIsGettingLocation(false);
        toast.success('Location detected successfully');
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsGettingLocation(false);
        toast.error('Could not detect your location. Please enter manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  }, []);

  // Get user location when modal opens
  useEffect(() => {
    if (isOpen && !userLocation) {
      getCurrentLocation();
    }
  }, [isOpen, userLocation, getCurrentLocation]);

  // Set location from props if available
  useEffect(() => {
    if (currentLocation) {
      setUserLocation(currentLocation);
      setFormData(prev => ({
        ...prev,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      }));
    }
  }, [currentLocation]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handlePhotoUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setFormData(prev => ({
        ...prev,
        photo: file
      }));
      toast.success('Photo uploaded successfully');
    }
  }, []);

  const handleNextStep = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!formData.type || !formData.severity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      toast.error('Please provide a location');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('type', formData.type);
      submitData.append('severity', formData.severity);
      submitData.append('description', formData.description);
      submitData.append('latitude', formData.latitude);
      submitData.append('longitude', formData.longitude);
      submitData.append('locationDetails', formData.locationDetails);
      
      if (formData.photo) {
        submitData.append('photo', formData.photo);
      }

      const response = await fetch('/api/barriers', {
        method: 'POST',
        body: submitData
      });

      if (!response.ok) {
        throw new Error('Failed to submit barrier report');
      }

      const result = await response.json();
      
      toast.success('Thank you for reporting this barrier!');
      onReport(result);
      onClose();
      
      // Reset form
      setFormData({
        type: '',
        severity: 'medium',
        description: '',
        photo: null,
        latitude: null,
        longitude: null,
        locationDetails: ''
      });
      setCurrentStep(1);
      
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onReport, onClose]);

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        return formData.type !== '';
      case 2:
        return formData.severity !== '';
      case 3:
        return formData.description.trim() !== '';
      case 4:
        return formData.latitude && formData.longitude;
      default:
        return false;
    }
  }, [currentStep, formData]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-container barrier-report-modal ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="modal-header">
          <h2 className="modal-title">Report Accessibility Barrier</h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '22px',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: '#1a1a1a',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              zIndex: 15,
              position: 'relative'
            }}
          >
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              style={{ width: '20px', height: '20px' }}
            >
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          {/* Progress Indicator */}
          <div className="progress-indicator">
            <div className="progress-step">
              <div className={`step-number ${currentStep >= 1 ? 'active' : ''}`}>1</div>
              <span className="step-label">Type</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <div className={`step-number ${currentStep >= 2 ? 'active' : ''}`}>2</div>
              <span className="step-label">Severity</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <div className={`step-number ${currentStep >= 3 ? 'active' : ''}`}>3</div>
              <span className="step-label">Details</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <div className={`step-number ${currentStep >= 4 ? 'active' : ''}`}>4</div>
              <span className="step-label">Location</span>
            </div>
          </div>

          {/* Step 1: Barrier Type */}
          {currentStep === 1 && (
            <div className="step-content">
              <h3>What type of barrier is this?</h3>
              <p>Select the category that best describes the accessibility issue.</p>
              
              <div className="barrier-type-grid">
                {barrierTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleInputChange('type', type.id)}
                    className={`barrier-type-button ${formData.type === type.id ? 'selected' : ''}`}
                  >
                    <div className="barrier-type-icon">{type.icon}</div>
                    <div className="barrier-type-info">
                      <span className="barrier-type-label">{type.label}</span>
                      <span className="barrier-type-description">{type.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Severity Level */}
          {currentStep === 2 && (
            <div className="step-content">
              <h3>How severe is this barrier?</h3>
              <p>Help us prioritize the issue based on its impact.</p>
              
              <div className="severity-grid">
                {severityLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => handleInputChange('severity', level.id)}
                    className={`severity-button ${formData.severity === level.id ? 'selected' : ''}`}
                    style={{ '--severity-color': level.color }}
                  >
                    <div className="severity-content">
                      <span className="severity-label">{level.label}</span>
                      <span className="severity-description">{level.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <div className="step-content">
              <h3>Provide Details</h3>
              <p>Help us understand the issue better.</p>
              
              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the accessibility barrier in detail..."
                  className="form-textarea"
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="locationDetails" className="form-label">
                  Additional Location Details
                </label>
                <input
                  id="locationDetails"
                  type="text"
                  value={formData.locationDetails}
                  onChange={(e) => handleInputChange('locationDetails', e.target.value)}
                  placeholder="e.g., 'Near the main entrance', 'Between buildings A and B'"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="photo" className="form-label">
                  Photo (Optional)
                </label>
                <div className="photo-upload-container">
                  <input
                    id="photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="form-file"
                  />
                  <label htmlFor="photo" className="photo-upload-label">
                    <div className="photo-upload-icon">📷</div>
                    <span>Take Photo or Choose File</span>
                  </label>
                </div>
                {formData.photo && (
                  <div className="photo-preview">
                    <img 
                      src={URL.createObjectURL(formData.photo)} 
                      alt="Barrier preview" 
                      className="preview-image"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange('photo', null)}
                      className="remove-photo-btn"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Location */}
          {currentStep === 4 && (
            <div className="step-content">
              <h3>Confirm Location</h3>
              <p>Verify the location of the barrier.</p>
              
              <div className="location-section">
                <div className="location-status">
                  {isGettingLocation ? (
                    <div className="location-loading">
                      <div className="loading-spinner"></div>
                      <span>Detecting your location...</span>
                    </div>
                  ) : userLocation ? (
                    <div className="location-success">
                      <div className="location-icon">📍</div>
                      <div className="location-info">
                        <span className="location-coords">
                          {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                        </span>
                        <span className="location-status-text">Location detected</span>
                      </div>
                    </div>
                  ) : (
                    <div className="location-error">
                      <div className="location-icon">❌</div>
                      <span>Location not available</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={getCurrentLocation}
                  className="location-refresh-btn"
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? 'Detecting...' : 'Refresh Location'}
                </button>

                <div className="location-note">
                  <p>💡 The location will be used to help other users avoid this barrier and for city officials to address the issue.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            className="modal-button secondary"
            disabled={isSubmitting}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#1a1a1a',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          
          {currentStep > 1 && (
            <button
              onClick={handlePreviousStep}
              className="modal-button secondary"
              disabled={isSubmitting}
            >
              Back
            </button>
          )}
          
          {currentStep < 4 ? (
            <button
              onClick={handleNextStep}
              className="modal-button primary"
              disabled={!canProceed() || isSubmitting}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="modal-button primary"
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner small"></div>
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

ReportBarrierModal.displayName = 'ReportBarrierModal';

export default ReportBarrierModal;
