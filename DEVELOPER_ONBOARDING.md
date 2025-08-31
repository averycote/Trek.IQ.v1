# 🚀 Trek.IQ - Frontend Developer Onboarding Guide

## 👋 Welcome to Trek.IQ!

Trek.IQ is an accessibility-focused routing application for Halifax, Nova Scotia. This guide will get you up and running quickly with our development environment.

---

## 🛠️ Prerequisites

### Required Software
- **Node.js**: Version 16+ (we use v22.16.0)
- **npm**: Comes with Node.js
- **Git**: For version control
- **VS Code**: Recommended editor with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - Auto Rename Tag

### Recommended Tools
- **React Developer Tools** (browser extension)
- **Postman** or similar for API testing
- **Windows Terminal** or **PowerShell** (you're on Windows)

---

## 📁 Project Structure

```
trek-iq/
├── client/                          # 🎯 Your main workspace
│   ├── public/
│   │   ├── index.html              # Main HTML template
│   │   └── manifest.json           # PWA manifest
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── AppShell.js         # Main app layout
│   │   │   ├── BasicMapComponent.js # Core map functionality
│   │   │   ├── EnhancedBarrierAlert.js
│   │   │   └── ... (77+ components)
│   │   ├── services/               # API and business logic
│   │   │   ├── transitService.js   # Transit data management
│   │   │   ├── transitAPIService.js # External API integration
│   │   │   └── ... (32+ services)
│   │   ├── navigation/             # Navigation features
│   │   ├── search/                 # Search functionality
│   │   ├── utils/                  # Helper functions
│   │   ├── App.js                  # Root component
│   │   └── index.js                # Entry point
│   ├── package.json                # Dependencies
│   └── tailwind.config.js          # Styling configuration
├── server/                          # Backend (Node.js/Express)
├── docs/                           # Documentation
└── README.md
```

---

## 🚀 Quick Start Guide

### Step 1: Clone & Install
```bash
# If you don't have the repo yet
git clone [repository-url]
cd trek-iq

# Install dependencies
npm install                    # Root dependencies
cd server && npm install      # Backend dependencies
cd ../client && npm install   # Frontend dependencies
```

### Step 2: Start the Application

**🚨 IMPORTANT: You need TWO terminal windows running simultaneously!**

#### Terminal 1: Backend Server
```powershell
# Navigate to server directory
cd C:\Users\avery\trek-iq\server

# Start backend server
node index.js
```

**Expected Output:**
```
🚀 Trek.IQ Server running on port 3001
🌐 Server accessible at:
   - Local: http://localhost:3001
   - Network: http://0.0.0.0:3001
```

#### Terminal 2: Frontend Development Server
```powershell
# Navigate to project root
cd C:\Users\avery\trek-iq

# Set required environment variable (IMPORTANT!)
$env:REACT_APP_TRANSIT_API_KEY="cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"

# Navigate to client and start
cd client
npm start
```

**Expected Output:**
```
webpack compiled with 1 warning
Local:            http://localhost:3000
On Your Network:  http://192.168.x.x:3000
```

### Step 3: Verify Everything Works
- **Backend Health Check:** http://localhost:3001/healthz
- **Frontend App:** http://localhost:3000 (should auto-open in browser)
- **Map Loading:** You should see a Halifax map with data layers

---

## 🔧 Development Environment Setup

### Environment Variables

Create these files for consistent development:

**File: `client/.env.local`**
```env
REACT_APP_TRANSIT_API_KEY=cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b
REACT_APP_TRANSIT_API_URL=https://external.transitapp.com/v3
REACT_APP_API_BASE_URL=http://localhost:3001/api
GENERATE_SOURCEMAP=false
```

### VS Code Configuration

**File: `.vscode/settings.json`**
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "tailwindCSS.includeLanguages": {
    "javascript": "javascript"
  }
}
```

---

## 🧩 Key Technologies & Patterns

### Frontend Stack
- **React 18.2.0** with functional components and hooks
- **Tailwind CSS** for styling (mobile-first approach)
- **Leaflet.js** for interactive maps
- **React Router v6** for navigation
- **Framer Motion** for animations

### Important Patterns
```javascript
// 1. Component Structure (typical pattern)
import React, { useState, useEffect } from 'react';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return (
    <div className="tailwind-classes">
      {/* JSX content */}
    </div>
  );
};

export default MyComponent;

// 2. Service Usage (API calls)
import transitService from '../services/transitService';

const data = await transitService.getNearbyStops(lat, lng);

// 3. Responsive Design (Tailwind)
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Mobile: full width, Tablet: half, Desktop: third */}
</div>
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "localhost refused to connect"
**Problem:** Backend server not running
**Solution:**
```powershell
# Check if anything is running on port 3001
netstat -ano | findstr :3001

# If nothing, start the backend
cd server
node index.js
```

### Issue 2: Map not loading
**Problem:** Missing environment variables or backend connection
**Solution:**
```powershell
# Ensure environment variable is set
$env:REACT_APP_TRANSIT_API_KEY="cff68f1b04298f22e86c2c46e91c6e4f39d825109694d9a4a0cab82a9446b71b"

# Check backend health
# Open http://localhost:3001/healthz in browser
```

### Issue 3: "Cannot find module" errors
**Problem:** Missing dependencies
**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or if in client directory
cd client
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: PowerShell execution policy errors
**Problem:** Windows blocking script execution
**Solution:**
```powershell
# Allow script execution for current session
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🎯 Current Frontend Issues & Priorities

### 🔥 High Priority Issues
1. **Map Performance on Mobile**
   - Large datasets cause lag on older devices
   - Need virtualization for transit stops layer
   - **Files:** `src/components/BasicMapComponent.js`

2. **Search UX Improvements**
   - Autocomplete dropdown styling inconsistent
   - Loading states missing during geocoding
   - **Files:** `src/search/` directory

3. **Accessibility Compliance**
   - Keyboard navigation incomplete
   - Screen reader support needs testing
   - Focus management in modals
   - **Files:** Multiple components, check for `tabIndex` and `aria-*`

4. **Mobile Navigation Flow**
   - Route panels don't adapt well to small screens
   - Touch targets too small for accessibility
   - **Files:** `src/navigation/` directory

### 🔧 Medium Priority
1. **Error Handling UX**
   - Generic error messages not user-friendly
   - Need better fallback states
   - **Files:** Error boundaries needed throughout

2. **Performance Optimization**
   - Bundle size analysis needed
   - Code splitting implementation
   - Image optimization

3. **Cross-browser Testing**
   - Safari mobile has CSS issues
   - IE11 support clarification needed

---

## 📱 Design System & UI Guidelines

### Color Palette
```css
/* Primary Colors */
--primary-blue: #2563eb;
--primary-green: #059669;

/* Accessibility Colors */
--accessible-green: #10b981;
--warning-amber: #f59e0b;
--alert-red: #dc2626;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-800: #1f2937;
--gray-900: #111827;
```

### Typography
- **Font Family:** System fonts (Tailwind default stack)
- **Headings:** `text-2xl font-bold` to `text-4xl font-bold`
- **Body:** `text-base` (16px base size)
- **Small Text:** `text-sm` for captions

### Spacing & Layout
- **Mobile First:** Always start with mobile styles
- **Breakpoints:** `sm:` (640px), `md:` (768px), `lg:` (1024px)
- **Padding:** Use `p-4` (16px) as standard, `p-2` (8px) for tight spaces
- **Gaps:** `gap-4` for component spacing

---

## 🔍 Key Components to Understand

### 1. AppShell.js
- **Purpose:** Main application layout and state management
- **Key Features:** Navigation, route panels, map integration
- **Issues:** Unused imports, missing mobile optimization

### 2. BasicMapComponent.js
- **Purpose:** Core Leaflet map functionality
- **Key Features:** Layer management, user location, zoom controls
- **Issues:** Performance with large datasets

### 3. EnhancedBarrierAlert.js
- **Purpose:** Displays accessibility barriers and alerts
- **Key Features:** User reporting, severity indicators
- **Issues:** Mobile responsiveness needs work

### 4. Services Directory
- **transitService.js:** Core transit data management
- **transitAPIService.js:** External API integration
- **comprehensiveRoutingOrchestrator.js:** Route calculation logic

---

## 🧪 Testing & Development Workflow

### Local Testing
```bash
# Run development server with hot reload
npm start

# Check for linting issues
npm run lint

# Run tests (if available)
npm test
```

### Browser Testing Priority
1. **Chrome/Edge:** Primary development browsers
2. **Safari Mobile:** iOS compatibility
3. **Firefox:** Standards compliance
4. **Chrome Mobile:** Android compatibility

### Debugging Tools
- **React DevTools:** Component inspection
- **Console Logs:** Extensive logging in services
- **Network Tab:** API call monitoring
- **Lighthouse:** Performance and accessibility auditing

---

## 📚 Helpful Resources

### Documentation
- **React Docs:** https://react.dev/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Leaflet:** https://leafletjs.com/reference.html

### Internal Resources
- **Feature Documentation:** `TREK_IQ_FEATURE_DOCUMENTATION.md`
- **Root Cause Analysis:** `ROOT_CAUSE.md`
- **API Endpoints:** Check `server/routes/` for available endpoints

### Team Communication
- **Slack/Discord:** [Add your communication channel]
- **Issues:** [Add your issue tracking system]
- **Design:** [Add Figma/design tool link]

---

## 🤝 Getting Help

### When You're Stuck
1. **Check Console:** Browser dev tools often show the issue
2. **Check Network Tab:** API calls failing?
3. **Check Backend:** Is http://localhost:3001/healthz working?
4. **Search Codebase:** Use VS Code's search for similar patterns

### Code Review Process
- Create feature branches: `feature/component-name`
- Small, focused commits with descriptive messages
- Test on multiple screen sizes before PR
- Check accessibility with keyboard navigation

### Emergency Contacts
- **Backend Issues:** [Add backend developer contact]
- **Design Questions:** [Add designer contact]
- **Deployment Issues:** [Add DevOps contact]

---

## 🎉 Welcome to the Team!

You're working on an application that makes a real difference in people's lives by improving accessibility in transit and navigation. Every improvement you make helps users with diverse mobility needs navigate Halifax more independently.

**First Day Goals:**
- ✅ Get the app running locally
- ✅ Navigate through the main user flows
- ✅ Identify one small improvement you can make
- ✅ Set up your development environment

**Week 1 Goals:**
- Fix one high-priority issue
- Understand the component architecture
- Complete a code review
- Test on mobile devices

Good luck, and welcome to Trek.IQ! 🚀
