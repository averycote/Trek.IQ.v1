# Trek.iq Profile Feature Implementation

## Overview

This implementation adds a comprehensive **Profile feature** to Trek.iq that allows users to manage their accessibility preferences and get personalized navigation routes. The feature is fully integrated into the existing Account & Settings section.

## Features Implemented

### 1. **Profile Management**
- ✅ User profile creation and editing (name, email)
- ✅ Accessibility preferences configuration
- ✅ Persistent storage in SQLite database
- ✅ Automatic preference loading on login

### 2. **Accessibility Preferences (Full Scope)**
Users can configure their unique accessibility requirements:

#### Mobility & Movement
- **Wheelchair user** → Automatically avoid steps and steep slopes
- **Avoid steps** → Route around stairways and steps
- **Avoid steep slopes** → Prefer routes with gentle inclines

#### Vision & Lighting
- **Low vision** → Prioritize audible crosswalks and well-lit paths
- **Require audible crosswalks** → Prefer crossings with audio signals
- **Prefer well-lit paths at night** → Route through well-lit areas during evening hours

#### Blind & Visually Impaired
- **Blind user** → Require tactile paving and audible signals
- **Require tactile paving** → Prefer routes with tactile ground surface indicators

#### Hearing & Communication
- **Hearing impaired** → Prefer visual crossing signals and alerts
- **Prefer visual signals** → Route through crossings with visual indicators

#### Cognitive & Navigation
- **Cognitive accessibility** → Provide simplified routing instructions
- **Simplified instructions** → Use clear, simple navigation directions

### 3. **Persistence**
- ✅ Preferences saved permanently in SQLite database
- ✅ Automatic loading on login
- ✅ Real-time updates with immediate effect

### 4. **Integration with Routing**
- ✅ Automatic preference application to all route calculations
- ✅ Hard constraints (exclude steps, steep slopes)
- ✅ Soft preferences (weight well-lit paths, audible crossings)
- ✅ Time-based routing (well-lit paths at night)
- ✅ Simplified instructions for cognitive accessibility

## Technical Implementation

### Backend Components

#### 1. Database Schema (`server/database.js`)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  accessibility_preferences TEXT,  -- JSON field for flexibility
  metadata TEXT,                   -- JSON field for extensibility
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. API Routes (`server/routes/profile.js`)
- `GET /api/profile` - Get user profile and preferences
- `PUT /api/profile` - Update profile and preferences
- `POST /api/profile` - Create new user profile

#### 3. Authentication Middleware (`server/middleware/authenticate.js`)
- JWT-based authentication
- Token validation and user context

#### 4. Preference Routing Service (`server/services/preferenceRoutingService.js`)
- Applies user preferences to routing data
- Filters GeoJSON layers based on accessibility needs
- Applies weight adjustments for route optimization
- Generates simplified instructions for cognitive accessibility

#### 5. Enhanced Route Calculation (`server/index.js`)
- Updated `/api/route` endpoint to use user preferences
- Automatic preference loading from user profile
- Fallback to basic routing if preferences unavailable

### Frontend Components

#### 1. ProfileSettings Component (`client/src/components/ProfileSettings.jsx`)
- Comprehensive accessibility preference toggles
- Real-time saving with optimistic updates
- Organized by accessibility categories
- Auto-enables related preferences (e.g., wheelchair → avoid steps)

#### 2. Authentication Service (`client/src/services/authService.js`)
- Demo authentication for development
- User session management
- Profile update handling

#### 3. Route Demo Component (`client/src/components/RouteDemo.jsx`)
- Interactive demonstration of preference-based routing
- Shows how preferences affect route calculations
- Displays applied filters and route metrics

#### 4. Styling (`client/src/components/ProfileSettings.css`)
- Modern, accessible UI design
- Dark mode support
- Mobile-responsive layout
- Clear visual hierarchy

## Usage Examples

### 1. Setting Up Accessibility Preferences

```javascript
// User enables wheelchair accessibility
const preferences = {
  wheelchair: true,           // Auto-enables avoidSteps and avoidSteepSlopes
  avoidSteps: true,
  avoidSteepSlopes: true,
  preferWellLitAtNight: true
};

// Save to profile
await fetch('/api/profile', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', ...authHeaders },
  body: JSON.stringify({ accessibility: preferences })
});
```

### 2. Route Calculation with Preferences

```javascript
// Calculate route with user preferences
const route = await fetch('/api/route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...authHeaders },
  body: JSON.stringify({
    origin: { lat: 44.6488, lng: -63.5752 },
    destination: { lat: 44.6519, lng: -63.5756 },
    userId: 'user_123',
    mode: 'walking'
  })
});

// Route will automatically exclude steps and prefer well-lit paths
```

### 3. Preference-Based Routing Logic

```javascript
// Example of how preferences affect routing
const preferenceResult = preferenceRoutingService.applyPreferencesToRouting(
  userPreferences,
  geojsonLayers,
  { timeOfDay: 'night' }
);

// Results in:
// - Filtered travelways (steps removed)
// - Weight adjustments (well-lit paths preferred)
// - Applied filters summary
```

## Integration Points

### 1. **Account & Settings Menu**
- ProfileSettings component integrated into existing AccountPage
- Seamless navigation from side menu
- Maintains existing UI patterns

### 2. **Routing System**
- Enhanced route calculation endpoint
- Automatic preference loading
- Backward compatibility with existing routing

### 3. **Database Integration**
- Uses existing SQLite database
- Extends current schema without breaking changes
- Maintains data consistency

## Development Features

### 1. **Demo Mode**
- Automatic demo user creation for development
- No authentication required for testing
- Realistic preference data

### 2. **Error Handling**
- Graceful fallbacks for missing data
- User-friendly error messages
- Development-friendly logging

### 3. **Performance Optimizations**
- Caching for route calculations
- Efficient preference loading
- Optimized database queries

## Future Enhancements

### 1. **Advanced Preferences**
- Custom accessibility requirements
- Preference templates for common conditions
- Community-shared preference sets

### 2. **Enhanced Routing**
- Real-time traffic integration
- Weather-based routing adjustments
- Multi-modal transportation options

### 3. **Analytics & Insights**
- Route preference effectiveness tracking
- Accessibility barrier reporting
- User journey optimization

## Testing the Feature

### 1. **Access the Profile**
1. Open Trek.iq application
2. Click the menu button (☰)
3. Select "Account & Settings"
4. Configure your accessibility preferences

### 2. **Test Route Calculation**
1. Use the Route Demo section in the profile
2. Enter origin and destination coordinates
3. Click "Calculate Route"
4. Observe how preferences affect the route

### 3. **Verify Persistence**
1. Refresh the page
2. Check that preferences are maintained
3. Verify route calculations use saved preferences

## API Documentation

### Profile Endpoints

#### GET /api/profile
Get user profile and accessibility preferences.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "profile": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "accessibility_preferences": {
      "wheelchair": true,
      "avoidSteps": true,
      "preferWellLitAtNight": true
    },
    "metadata": {},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /api/profile
Update user profile and preferences.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "John Doe",
  "accessibility": {
    "wheelchair": true,
    "avoidSteps": true,
    "preferWellLitAtNight": true
  }
}
```

### Route Endpoint

#### POST /api/route
Calculate route with user preferences.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <jwt_token> (optional)
```

**Body:**
```json
{
  "origin": { "lat": 44.6488, "lng": -63.5752 },
  "destination": { "lat": 44.6519, "lng": -63.5756 },
  "mode": "walking",
  "userId": "user_123"
}
```

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [{
    "type": "Feature",
    "properties": {
      "mode": "walking",
      "distance": 500,
      "duration": 600,
      "personalized": true,
      "appliedFilters": ["excluded_steps", "preferred_well_lit"],
      "timeOfDay": "night"
    },
    "geometry": {
      "type": "LineString",
      "coordinates": [[-63.5752, 44.6488], [-63.5756, 44.6519]]
    }
  }]
}
```

## Conclusion

The Profile feature implementation provides a comprehensive solution for personalized accessibility navigation in Trek.iq. It seamlessly integrates with the existing codebase while providing powerful new capabilities for users with diverse accessibility needs.

The system is designed to be:
- **Extensible**: Easy to add new preference types
- **Performant**: Efficient routing with caching
- **User-friendly**: Intuitive interface with clear feedback
- **Accessible**: Built with accessibility in mind
- **Maintainable**: Clean, well-documented code

This implementation transforms Trek.iq into a truly personalized navigation platform that adapts to each user's unique accessibility requirements.

