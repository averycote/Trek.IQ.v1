import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// CSS imports - Mobile-first design system takes ABSOLUTE precedence
// Order matters: mobile-first.css must be last to override all other styles
import './design-system.css'; // Design tokens and variables (first)
import './index.css'; // Base styles and Tailwind (second)
import './App.css'; // App-specific styles (third)
import './components/pages/Pages.css'; // Page-specific styles (fourth)
import './mobile-first.css'; // Mobile-first design system (LAST - highest priority)

import App from './App';

// Register service worker with cache-busting
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
    
        // Force update to clear old cache
        registration.update();
      })
      .catch((error) => {
    
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
