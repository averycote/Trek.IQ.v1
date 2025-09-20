import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const AdminAuthModal = ({ isOpen, onClose, onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const usernameRef = useRef(null);

  // Focus username input when modal opens
  useEffect(() => {
    if (isOpen && usernameRef.current) {
      usernameRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUsername('');
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create basic auth header
      const credentials = btoa(`${username}:${password}`);
      
      // Test authentication with a simple API call
      const response = await fetch('/api/admin/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Store admin session
        sessionStorage.setItem('adminAuth', credentials);
        sessionStorage.setItem('adminUser', username);
        
        toast.success('Admin access granted');
        onAuthenticated(username);
        onClose();
      } else {
        setError('Invalid username or password');
        toast.error('Authentication failed');
      }
    } catch (err) {
      console.error('Admin auth error:', err);
      setError('Authentication failed. Please try again.');
      toast.error('Authentication failed');
    } finally {
      setIsLoading(false);
    }
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
        className="modal-container admin-auth-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Admin Authentication</h2>
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <circle cx="12" cy="16" r="1"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            
            <p className="auth-description">
              Please enter your admin credentials to access the dashboard.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="admin-username" className="form-label">
                  Username
                </label>
                <input
                  ref={usernameRef}
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  placeholder="Enter admin username"
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="admin-password" className="form-label">
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="Enter admin password"
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

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
                  disabled={isLoading || !username || !password}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                        <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="modal-footer">
          <div className="security-notice">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>This is a secure admin area. All access is logged.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthModal;
