import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import authService from '../services/authService';
import RouteDemo from './RouteDemo';

// Toggle component for accessibility preferences
const Toggle = ({ label, checked, onChange, description }) => {
  return (
    <div className="preference-item">
      <label className="preference-label">
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={e => onChange(e.target.checked)}
          className="preference-checkbox"
        />
        <span className="preference-text">
          <span className="preference-title">{label}</span>
          {description && <span className="preference-description">{description}</span>}
        </span>
      </label>
    </div>
  );
};

// Section header component
const SectionHeader = ({ title, description }) => (
  <div className="preference-section-header">
    <h3 className="section-title">{title}</h3>
    {description && <p className="section-description">{description}</p>}
  </div>
);

export default function ProfileSettings({ apiBase = '/api' }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Helper function to get auth header
  const getAuthHeader = () => {
    return authService.getAuthHeaders();
  };

  // Fetch user profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch(`${apiBase}/profile`, { 
          headers: getAuthHeader() 
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            // User not authenticated - try demo login
            try {
              await authService.login();
              const demoProfile = authService.getCurrentUser();
              setProfile(demoProfile);
              return;
            } catch (loginError) {
              console.error('Demo login failed:', loginError);
            }
          }
          throw new Error(`Failed to fetch profile: ${res.status}`);
        }
        
        const { profile: userProfile } = await res.json();
        setProfile(userProfile);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError(err.message);
        
        // Create demo profile on error for development
        try {
          await authService.login();
          const demoProfile = authService.getCurrentUser();
          setProfile(demoProfile);
        } catch (loginError) {
          console.error('Demo login failed:', loginError);
          // Fallback demo profile
          const demoProfile = {
            id: 'demo_user',
            email: 'demo@trek-iq.com',
            name: 'Demo User',
            accessibility_preferences: {},
            metadata: {}
          };
          setProfile(demoProfile);
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfile();
  }, [apiBase]);

  // Save profile updates
  const saveProfile = async (updates) => {
    setSaving(true);
    setError(null);
    
    try {
      const updatedProfile = { ...profile, ...updates };
      
      const res = await fetch(`${apiBase}/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          ...getAuthHeader() 
        },
        body: JSON.stringify(updates)
      });
      
      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }
      
      const { profile: savedProfile } = await res.json();
      setProfile(savedProfile);
      toast.success('Preferences saved successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Handle accessibility preference changes
  const handleAccessibilityChange = (key, value) => {
    const updatedPrefs = {
      ...profile.accessibility_preferences,
      [key]: value
    };
    
    // Auto-enable related preferences for certain main categories
    if (key === 'wheelchair' && value) {
      updatedPrefs.avoidSteps = true;
      updatedPrefs.avoidSteepSlopes = true;
    }
    
    if (key === 'lowVision' && value) {
      updatedPrefs.requireAudibleCrosswalks = true;
      updatedPrefs.preferWellLitAtNight = true;
    }
    
    if (key === 'blind' && value) {
      updatedPrefs.requireTactilePaving = true;
      updatedPrefs.requireAudibleCrosswalks = true;
    }
    
    if (key === 'cognitiveAccessibility' && value) {
      updatedPrefs.simplifiedInstructions = true;
    }
    
    saveProfile({ accessibility_preferences: updatedPrefs });
  };

  // Handle name change
  const handleNameChange = (newName) => {
    setProfile({ ...profile, name: newName });
    saveProfile({ name: newName });
  };

  if (loading) {
    return (
      <div className="profile-settings">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-settings">
        <div className="error-state">
          <h3>Unable to load profile</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const prefs = profile.accessibility_preferences || {};

  return (
    <div className="profile-settings">
      <div className="profile-header">
        <h2>Account & Settings — Profile</h2>
        <p className="profile-subtitle">
          Customize your accessibility preferences to get personalized navigation routes
        </p>
      </div>

      {/* Basic Profile Information */}
      <div className="profile-section">
        <SectionHeader 
          title="Profile Information" 
          description="Your basic account details"
        />
        
        <div className="form-group">
          <label htmlFor="user-name" className="form-label">
            Name
          </label>
          <input
            id="user-name"
            type="text"
            value={profile.name || ''}
            onChange={e => handleNameChange(e.target.value)}
            className="form-input"
            placeholder="Enter your name"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            value={profile.email || ''}
            className="form-input"
            disabled
            placeholder="Your email address"
          />
          <small className="form-help">Email cannot be changed</small>
        </div>
      </div>

      {/* Accessibility Preferences */}
      <div className="profile-section">
        <SectionHeader 
          title="Accessibility Preferences" 
          description="Configure your unique accessibility needs for personalized routing"
        />

        {/* Mobility Preferences */}
        <div className="preference-group">
          <h4 className="group-title">Mobility & Movement</h4>
          
          <Toggle 
            label="Wheelchair user" 
            description="Automatically avoid steps and steep slopes"
            checked={!!prefs.wheelchair}
            onChange={val => handleAccessibilityChange('wheelchair', val)}
          />
          
          <Toggle 
            label="Avoid steps" 
            description="Route around stairways and steps"
            checked={!!prefs.avoidSteps}
            onChange={val => handleAccessibilityChange('avoidSteps', val)}
          />
          
          <Toggle 
            label="Avoid steep slopes" 
            description="Prefer routes with gentle inclines"
            checked={!!prefs.avoidSteepSlopes}
            onChange={val => handleAccessibilityChange('avoidSteepSlopes', val)}
          />
        </div>

        {/* Vision Preferences */}
        <div className="preference-group">
          <h4 className="group-title">Vision & Lighting</h4>
          
          <Toggle 
            label="Low vision" 
            description="Prioritize audible crosswalks and well-lit paths"
            checked={!!prefs.lowVision}
            onChange={val => handleAccessibilityChange('lowVision', val)}
          />
          
          <Toggle 
            label="Require audible crosswalks" 
            description="Prefer crossings with audio signals"
            checked={!!prefs.requireAudibleCrosswalks}
            onChange={val => handleAccessibilityChange('requireAudibleCrosswalks', val)}
          />
          
          <Toggle 
            label="Prefer well-lit paths at night" 
            description="Route through well-lit areas during evening hours"
            checked={!!prefs.preferWellLitAtNight}
            onChange={val => handleAccessibilityChange('preferWellLitAtNight', val)}
          />
        </div>

        {/* Blind User Preferences */}
        <div className="preference-group">
          <h4 className="group-title">Blind & Visually Impaired</h4>
          
          <Toggle 
            label="Blind user" 
            description="Require tactile paving and audible signals"
            checked={!!prefs.blind}
            onChange={val => handleAccessibilityChange('blind', val)}
          />
          
          <Toggle 
            label="Require tactile paving" 
            description="Prefer routes with tactile ground surface indicators"
            checked={!!prefs.requireTactilePaving}
            onChange={val => handleAccessibilityChange('requireTactilePaving', val)}
          />
        </div>

        {/* Hearing Preferences */}
        <div className="preference-group">
          <h4 className="group-title">Hearing & Communication</h4>
          
          <Toggle 
            label="Hearing impaired" 
            description="Prefer visual crossing signals and alerts"
            checked={!!prefs.hearingImpaired}
            onChange={val => handleAccessibilityChange('hearingImpaired', val)}
          />
          
          <Toggle 
            label="Prefer visual signals" 
            description="Route through crossings with visual indicators"
            checked={!!prefs.preferVisualSignals}
            onChange={val => handleAccessibilityChange('preferVisualSignals', val)}
          />
        </div>

        {/* Cognitive Preferences */}
        <div className="preference-group">
          <h4 className="group-title">Cognitive & Navigation</h4>
          
          <Toggle 
            label="Cognitive accessibility" 
            description="Provide simplified routing instructions"
            checked={!!prefs.cognitiveAccessibility}
            onChange={val => handleAccessibilityChange('cognitiveAccessibility', val)}
          />
          
          <Toggle 
            label="Simplified instructions" 
            description="Use clear, simple navigation directions"
            checked={!!prefs.simplifiedInstructions}
            onChange={val => handleAccessibilityChange('simplifiedInstructions', val)}
          />
        </div>
      </div>

      {/* Save Status */}
      <div className="profile-footer">
        {saving && (
          <div className="save-status saving">
            <span className="status-icon">💾</span>
            Saving your preferences...
          </div>
        )}
        
        {error && (
          <div className="save-status error">
            <span className="status-icon">⚠️</span>
            {error}
          </div>
        )}
        
        <div className="profile-info">
          <small>
            Your preferences are automatically saved and used to personalize every route. 
            Changes take effect immediately for new route requests.
          </small>
        </div>
      </div>

      {/* Route Demo Section */}
      <div className="profile-section">
        <SectionHeader 
          title="Route Demo" 
          description="Test how your preferences affect routing calculations"
        />
        <RouteDemo />
      </div>
    </div>
  );
}
