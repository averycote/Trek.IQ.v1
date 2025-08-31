import React, { useEffect } from 'react';
import PageWrapper from '../PageWrapper';

const HelpPage = ({ onPageOpen, onPageClose }) => {
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
  const supportOptions = [
    {
      id: 'sos',
      icon: '🚨',
      title: 'SOS Emergency',
      description: 'Immediate assistance for accessibility emergencies',
      action: () => console.log('SOS Emergency')
    },
    {
      id: 'support',
      icon: '💬',
      title: 'Contact Support',
      description: 'Get help from our support team',
      action: () => console.log('Contact Support')
    },
    {
      id: 'faq',
      icon: '❓',
      title: 'FAQ',
      description: 'Frequently asked questions and answers',
      action: () => console.log('FAQ')
    },
    {
      id: 'tutorial',
      icon: '📚',
      title: 'Tutorial',
      description: 'Learn how to use Trek.IQ features',
      action: () => console.log('Tutorial')
    },
    {
      id: 'feedback',
      icon: '📝',
      title: 'Send Feedback',
      description: 'Share your thoughts and suggestions',
      action: () => console.log('Send Feedback')
    }
  ];

  return (
    <PageWrapper 
      title="Help & Support"
      description="Get help and find answers to your questions"
      onPageOpen={onPageOpen}
      onPageClose={onPageClose}
    >
      
      <div className="page-content">
        <div className="support-options">
          {supportOptions.map(option => (
            <button
              key={option.id}
              onClick={option.action}
              className="support-option"
              aria-label={option.title}
            >
              <div className="support-icon">
                <span className="icon-emoji">{option.icon}</span>
              </div>
              <div className="support-content">
                <h3 className="support-title">{option.title}</h3>
                <p className="support-description">{option.description}</p>
              </div>
              <div className="support-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </button>
          ))}
        </div>

        <div className="emergency-notice">
          <div className="notice-icon">⚠️</div>
          <h3>Emergency Assistance</h3>
          <p>If you're experiencing an accessibility emergency, use the SOS button above for immediate assistance.</p>
        </div>
      </div>
    </PageWrapper>
  );
};

export default HelpPage;
