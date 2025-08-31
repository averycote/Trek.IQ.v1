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
        <div className="placeholder-content">
          <div className="placeholder-icon">ℹ️</div>
          <h2>About Trek.IQ</h2>
          <p>Trek.IQ is an innovative accessibility routing application designed to help users navigate cities with confidence and independence.</p>
          
          <h3>Our Mission</h3>
          <p>To create inclusive, accessible navigation solutions that empower all users to explore their communities safely and efficiently.</p>
          
          <h3>Key Features</h3>
          <ul>
            <li>AI-powered accessibility routing</li>
            <li>Real-time barrier detection and avoidance</li>
            <li>Multi-modal transportation options</li>
            <li>Community-driven barrier reporting</li>
            <li>Accessibility-focused design</li>
          </ul>
          
          <h3>Technology</h3>
          <p>Built with cutting-edge mapping technology and artificial intelligence to provide the most accurate and accessible routing experience.</p>
          
          <div className="version-info">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Last Updated:</strong> January 2024</p>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default AboutPage;
