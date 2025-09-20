import React, { useEffect } from 'react';
import PageWrapper from '../PageWrapper';

const AboutPage = ({ onPageOpen, onPageClose }) => {
  // FIXED: Notify parent component when page opens/closes
  useEffect(() => {
    if (onPageOpen) {
      onPageOpen();
    }
    return () => {
      if (onPageClose) {
        onPageClose();
      }
    };
  }, [onPageOpen, onPageClose]);

  return (
    <PageWrapper 
      title="About Trek.IQ"
      description="Learn more about our mission and technology"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      
      <div className="page-content">
        <div className="about-content">
          <div className="about-hero">
            <div className="hero-icon">🗺️</div>
            <h2>About Trek.IQ</h2>
            <p className="hero-description">
              Trek.IQ is an advanced accessibility-focused navigation platform that provides intelligent routing for users with diverse mobility needs in Halifax, Nova Scotia.
            </p>
          </div>
          
          <div className="about-section">
            <h3>Our Mission</h3>
            <p>
              To create inclusive, accessible navigation solutions that empower all users to explore their communities safely and efficiently. 
              We believe that everyone deserves equal access to urban mobility and navigation assistance.
            </p>
          </div>
          
          <div className="about-section">
            <h3>Key Features</h3>
            <div className="features-grid">
              <div className="feature-item">
                <div className="feature-icon">🤖</div>
                <h4>AI-Powered Routing</h4>
                <p>Advanced algorithms that consider accessibility factors, real-time conditions, and user preferences</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">⚠️</div>
                <h4>Barrier Detection</h4>
                <p>Real-time identification and avoidance of accessibility barriers like steps, steep slopes, and construction</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">🚌</div>
                <h4>Multi-Modal Transport</h4>
                <p>Seamless integration of walking, wheelchair, transit, and driving options</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">👥</div>
                <h4>Community Reporting</h4>
                <p>User-driven barrier reporting system that helps improve accessibility data for everyone</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">♿</div>
                <h4>Accessibility-First Design</h4>
                <p>Built with accessibility principles at its core, ensuring usability for all users</p>
              </div>
              <div className="feature-item">
                <div className="feature-icon">📱</div>
                <h4>Mobile Optimized</h4>
                <p>Responsive design that works seamlessly across desktop, tablet, and mobile devices</p>
              </div>
            </div>
          </div>
          
          <div className="about-section">
            <h3>Technology Stack</h3>
            <p>
              Trek.IQ is built using modern web technologies and integrates with multiple data sources to provide comprehensive accessibility information:
            </p>
            <ul className="tech-list">
              <li><strong>Frontend:</strong> React.js with responsive design and accessibility features</li>
              <li><strong>Mapping:</strong> Mapbox GL JS for interactive maps and routing</li>
              <li><strong>Data Sources:</strong> Halifax municipal datasets, OpenStreetMap, Wheelmap.org</li>
              <li><strong>APIs:</strong> OpenRouteService, Transit API, and real-time accessibility data</li>
              <li><strong>AI/ML:</strong> Machine learning models for barrier prediction and route optimization</li>
            </ul>
          </div>
          
          <div className="about-section">
            <h3>Accessibility Commitment</h3>
            <p>
              Trek.IQ is designed to meet WCAG 2.1 AA standards and includes features such as:
            </p>
            <ul className="accessibility-features">
              <li>High contrast mode and customizable themes</li>
              <li>Screen reader compatibility</li>
              <li>Keyboard navigation support</li>
              <li>Voice guidance and audio cues</li>
              <li>Large touch targets for mobile users</li>
              <li>Simplified navigation options for cognitive accessibility</li>
            </ul>
          </div>
          
          <div className="about-section">
            <h3>Data & Privacy</h3>
            <p>
              We prioritize user privacy and data security. All user data is handled according to strict privacy standards, 
              and we only collect information necessary to provide routing services. Barrier reports are anonymized and 
              used solely to improve accessibility data for the community.
            </p>
          </div>
          
          <div className="about-section">
            <h3>Community Impact</h3>
            <p>
              Trek.IQ is part of Halifax's commitment to becoming a more accessible city. By providing detailed 
              accessibility information and routing options, we help create a more inclusive urban environment 
              for residents and visitors with diverse mobility needs.
            </p>
          </div>
          
          <div className="version-info">
            <h3>Version Information</h3>
            <div className="version-details">
              <p><strong>Current Version:</strong> 2.1.0</p>
              <p><strong>Last Updated:</strong> December 2024</p>
              <p><strong>Data Coverage:</strong> Halifax Regional Municipality</p>
              <p><strong>Supported Browsers:</strong> Chrome, Firefox, Safari, Edge (latest versions)</p>
            </div>
          </div>
          
          <div className="contact-info">
            <h3>Contact & Support</h3>
            <p>
              For questions, feedback, or accessibility concerns, please contact us through the Help & Support section 
              in the main menu. We're committed to continuous improvement and welcome your input.
            </p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AboutPage;
