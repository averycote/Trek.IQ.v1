import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const UserAuthModal = ({ isOpen, onClose, onAuthenticated, mode = 'login' }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentMode, setCurrentMode] = useState(mode);
  const emailRef = useRef(null);

  // Focus email input when modal opens
  useEffect(() => {
    if (isOpen && emailRef.current) {
      emailRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when modal closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      setError('');
    }
  }, [isOpen, currentMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (currentMode === 'register') {
      if (!formData.name) {
        setError('Name is required');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const endpoint = currentMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = currentMode === 'login' 
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        // Store user session using the same keys as ProfileSettings expects
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        
        toast.success(currentMode === 'login' ? 'Welcome back!' : 'Account created successfully!');
        onAuthenticated(data.user);
        onClose();
      } else {
        setError(data.message || 'Authentication failed');
        toast.error(data.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Network error. Please try again.');
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setCurrentMode(prev => prev === 'login' ? 'register' : 'login');
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="modal-container user-auth-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {currentMode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="auth-form-container">
            <div className="auth-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            
            <p className="auth-description">
              {currentMode === 'login' 
                ? 'Sign in to access your personalized accessibility settings and saved routes.'
                : 'Create an account to save your accessibility preferences and get personalized routing recommendations.'
              }
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              {currentMode === 'register' && (
                <div className="form-group">
                  <label htmlFor="user-name" className="form-label">
                    Full Name
                  </label>
                  <input
                    id="user-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter your full name"
                    required
                    disabled={isLoading}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="user-email" className="form-label">
                  Email Address
                </label>
                <input
                  ref={emailRef}
                  id="user-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="user-password" className="form-label">
                  Password
                </label>
                <input
                  id="user-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  autoComplete={currentMode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {currentMode === 'register' && (
                <div className="form-group">
                  <label htmlFor="user-confirm-password" className="form-label">
                    Confirm Password
                  </label>
                  <input
                    id="user-confirm-password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Confirm your password"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
              )}

              {error && (
                <div className="error-message">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {error}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="modal-button secondary"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-button primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                      </svg>
                      {currentMode === 'login' ? 'Signing In...' : 'Creating Account...'}
                    </>
                  ) : (
                    currentMode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
              </div>
            </form>

            <div className="auth-switch">
              <p>
                {currentMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={handleModeSwitch}
                  className="switch-button"
                  disabled={isLoading}
                >
                  {currentMode === 'login' ? 'Create Account' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <div className="privacy-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>Your data is secure and will only be used to personalize your experience.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAuthModal;
