import React, { useState } from 'react';

const MapTroubleshootingGuide = ({ isVisible, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);

  const troubleshootingSteps = [
    {
      title: "Check Internet Connection",
      description: "Ensure you have a stable internet connection. The map requires data to load.",
      actions: [
        "Try refreshing the page",
        "Check if other websites load properly",
        "Try switching between WiFi and mobile data"
      ]
    },
    {
      title: "Clear Browser Cache",
      description: "Clear your browser's cache and cookies to resolve loading issues.",
      actions: [
        "Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)",
        "Select 'Cached images and files'",
        "Click 'Clear data' and refresh the page"
      ]
    },
    {
      title: "Try Different Browser",
      description: "Some browsers may have compatibility issues with the map.",
      actions: [
        "Try Chrome, Firefox, Safari, or Edge",
        "Update your browser to the latest version",
        "Disable browser extensions temporarily"
      ]
    },
    {
      title: "Check Browser Console",
      description: "Open browser developer tools to check for error messages.",
      actions: [
        "Press F12 or right-click and select 'Inspect'",
        "Go to the 'Console' tab",
        "Look for red error messages and report them"
      ]
    },
    {
      title: "Contact Support",
      description: "If the issue persists, contact our support team with details.",
      actions: [
        "Note the error messages from the console",
        "Include your browser and operating system",
        "Describe when the issue started occurring"
      ]
    }
  ];

  if (!isVisible) return null;

  return (
    <div className="troubleshooting-overlay">
      <div className="troubleshooting-modal">
        <div className="modal-header">
          <h2>Map Loading Troubleshooting</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-content">
          <div className="step-indicator">
            {troubleshootingSteps.map((step, index) => (
              <div 
                key={index}
                className={`step ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'completed' : ''}`}
                onClick={() => setActiveStep(index)}
              >
                <span className="step-number">{index + 1}</span>
                <span className="step-title">{step.title}</span>
              </div>
            ))}
          </div>

          <div className="step-content">
            <h3>{troubleshootingSteps[activeStep].title}</h3>
            <p>{troubleshootingSteps[activeStep].description}</p>
            
            <div className="actions-list">
              <h4>Try these steps:</h4>
              <ol>
                {troubleshootingSteps[activeStep].actions.map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
            disabled={activeStep === 0}
            className="nav-btn prev-btn"
          >
            Previous
          </button>
          
          <button 
            onClick={() => setActiveStep(Math.min(troubleshootingSteps.length - 1, activeStep + 1))}
            disabled={activeStep === troubleshootingSteps.length - 1}
            className="nav-btn next-btn"
          >
            Next
          </button>
          
          <button onClick={onClose} className="close-modal-btn">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .troubleshooting-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .troubleshooting-modal {
          background: white;
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .modal-header h2 {
          margin: 0;
          color: #1f2937;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background-color 0.2s;
        }

        .close-btn:hover {
          background: #e5e7eb;
        }

        .modal-content {
          padding: 20px;
          max-height: 60vh;
          overflow-y: auto;
        }

        .step-indicator {
          display: flex;
          margin-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 10px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.2s;
          flex: 1;
          justify-content: center;
        }

        .step:hover {
          background: #f3f4f6;
        }

        .step.active {
          background: #3b82f6;
          color: white;
        }

        .step.completed {
          background: #10b981;
          color: white;
        }

        .step-number {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: currentColor;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
        }

        .step-title {
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .step-content h3 {
          margin: 0 0 10px 0;
          color: #1f2937;
          font-size: 18px;
        }

        .step-content p {
          margin: 0 0 20px 0;
          color: #6b7280;
          line-height: 1.5;
        }

        .actions-list h4 {
          margin: 0 0 10px 0;
          color: #374151;
          font-size: 16px;
        }

        .actions-list ol {
          margin: 0;
          padding-left: 20px;
          color: #4b5563;
          line-height: 1.6;
        }

        .actions-list li {
          margin-bottom: 8px;
        }

        .modal-footer {
          display: flex;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          justify-content: flex-end;
        }

        .nav-btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .nav-btn:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .close-modal-btn {
          padding: 8px 16px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: background-color 0.2s;
        }

        .close-modal-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 640px) {
          .troubleshooting-modal {
            width: 95%;
            margin: 10px;
          }

          .step-indicator {
            flex-direction: column;
            gap: 8px;
          }

          .step {
            justify-content: flex-start;
          }

          .modal-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default MapTroubleshootingGuide;
