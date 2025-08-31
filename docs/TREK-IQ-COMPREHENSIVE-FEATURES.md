# Trek.IQ Comprehensive Features Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Features](#core-features)
3. [AI Features & Machine Learning](#ai-features--machine-learning)
4. [Accessibility Scoring & Calculations](#accessibility-scoring--calculations)
5. [Routing Algorithms](#routing-algorithms)
6. [Data Sources & Architecture](#data-sources--architecture)
7. [API Integration](#api-integration)
8. [Mobile Navigation](#mobile-navigation)
9. [Performance Optimizations](#performance-optimizations)
10. [Technical Architecture](#technical-architecture)

---

## System Overview

Trek.IQ is an advanced accessibility-focused navigation platform that provides intelligent routing for users with diverse mobility needs. The system combines real-time data, AI-powered analysis, and comprehensive accessibility mapping to deliver personalized navigation experiences.

### Key Capabilities
- **Multi-modal routing** (walking, wheelchair, transit, driving)
- **Real-time accessibility analysis** with barrier detection
- **AI-powered route optimization** based on user preferences
- **Comprehensive Halifax municipal data integration**
- **Mobile-first responsive design**
- **Predictive barrier detection** using machine learning

---

## Core Features

### 1. Intelligent Search & Geocoding
**Location**: `client/src/services/enhancedSearchService.js`

**Features**:
- Multi-source geocoding (Mapbox, Nominatim, local datasets)
- Accessibility-aware POI search
- Fuzzy matching with intelligent suggestions
- Context-aware ranking based on user preferences

**Algorithm**:
```javascript
const calculateAIScore = (result, context) => {
  const relevanceScore = fuzzyMatch(context.query, result.name);
  const distanceScore = calculateAccessibilityDistance(
    context.userLocation, 
    result.location, 
    context.userPreferences
  );
  const preferenceScore = matchUserPreferences(
    result, 
    context.userPreferences, 
    context.searchHistory
  );
  const contextualScore = calculateContextualRelevance(
    result, 
    context.timeOfDay, 
    context.weatherConditions
  );
  
  return (relevanceScore * 0.35) + 
         (distanceScore * 0.25) + 
         (preferenceScore * 0.25) + 
         (contextualScore * 0.15);
};
```

### 2. Barrier Detection & Reporting
**Location**: `client/src/services/barrierService.js`

**Features**:
- Real-time barrier detection along routes
- User-reported barrier submission
- Barrier severity classification
- Automatic barrier verification system

**Barrier Types Detected**:
- Steps and stairs
- Construction zones
- Sidewalk closures
- Narrow passages
- Surface quality issues
- Weather-related barriers

### 3. Accessibility Analysis
**Location**: `client/src/services/enhancedAccessibleRoutingService.js`

**Features**:
- Comprehensive accessibility scoring
- Surface quality assessment
- Width and grade analysis
- Lighting condition evaluation
- Curb cut detection

---

## AI Features & Machine Learning

### 1. Predictive Barrier Detection
**Location**: `client/src/services/aiService.js`

**Model**: TensorFlow.js-based neural network

**Features**:
- **Historical Pattern Analysis**: Learns from past barrier occurrences
- **Weather Impact Prediction**: Anticipates weather-related accessibility issues
- **Construction Schedule Integration**: Predicts construction-related barriers
- **Seasonal Factor Analysis**: Accounts for seasonal accessibility changes

**Prediction Algorithm**:
```javascript
async aiPredictBarriers(route, weatherData, maintenanceData) {
  const predictions = [];
  
  // Extract enhanced features from route segments
  const features = this.extractEnhancedRouteFeatures(route, weatherData, maintenanceData);
  
  for (let i = 0; i < features.length; i++) {
    const featureTensor = tf.tensor2d([features[i]], [1, 15]);
    const prediction = await this.model.predict(featureTensor).data();
    
    const confidence = this.calculatePredictionConfidence(
      prediction[0], 
      features[i], 
      weatherData, 
      maintenanceData
    );
    
    const threshold = this.getDynamicThreshold(confidence, weatherData);
    
    if (prediction[0] > threshold) {
      predictions.push({
        type: 'predicted_barrier',
        location: route.coordinates[i],
        probability: prediction[0],
        confidence: confidence,
        reason: this.getEnhancedBarrierReason(features[i], weatherData, maintenanceData),
        severity: this.calculateEnhancedSeverity(prediction[0], features[i], confidence),
        accessibilityImpact: this.calculateAccessibilityImpact(features[i]),
        alternativeRoutes: await this.suggestAlternativeRoutes(route.coordinates[i], features[i]),
        timeToResolution: this.estimateTimeToResolution(features[i], maintenanceData),
        seasonalFactors: this.analyzeSeasonalFactors(features[i], weatherData)
      });
    }
  }
  
  return predictions.sort((a, b) => b.confidence - a.confidence);
}
```

### 2. User Behavior Learning
**Location**: `client/src/services/aiService.js`

**Features**:
- **Individual User Profiling**: Learns personal accessibility preferences
- **Route Pattern Analysis**: Identifies successful route patterns
- **Preference Evolution**: Adapts to changing user needs
- **Collective Intelligence**: Shares anonymized insights across users

**Learning Algorithm**:
```javascript
updateUserProfile(userId, routeData, feedback) {
  const profile = this.userProfiles.get(userId) || this.createNewProfile();
  
  // Update route preferences
  profile.routeHistory.push({
    route: routeData,
    feedback: feedback,
    timestamp: Date.now(),
    accessibilityScore: routeData.accessibilityScore,
    barriers: routeData.barriers,
    weather: routeData.weather
  });
  
  // Analyze patterns
  profile.preferences = this.analyzeRoutePatterns(profile.routeHistory);
  profile.accessibilityNeeds = this.inferAccessibilityNeeds(profile.routeHistory);
  
  // Update learning model
  this.updateLearningModel(profile);
}
```

### 3. Intelligent Route Optimization
**Location**: `client/src/services/enhancedUnifiedRoutingService.js`

**Features**:
- **Multi-criteria optimization** considering accessibility, distance, time, and user preferences
- **Real-time adaptation** to changing conditions
- **Alternative route generation** with accessibility scoring
- **Personalized route recommendations**

---

## Accessibility Scoring & Calculations

### 1. Comprehensive Accessibility Score
**Location**: `client/src/services/enhancedAccessibleRoutingService.js`

**Base Formula**:
```javascript
calculateAccessibilityScore(route, barriers) {
  let score = 1.0; // Start with perfect score
  const accessibility = route.properties.accessibility || {};
  const userPrefs = Object.fromEntries(this.userPreferences);

  // Positive Factors (Score Boosters)
  if (accessibility.hasSidewalks) score += 0.15;
  if (accessibility.hasCurbCuts) score += 0.12;
  if (accessibility.surfaceType === 'paved') score += 0.10;
  if (accessibility.surfaceType === 'concrete') score += 0.12;
  if (accessibility.elevation === 'minimal') score += 0.08;
  if (accessibility.lighting === 'adequate') score += 0.05;
  if (accessibility.lighting === 'high') score += 0.08;
  if (accessibility.width >= 1.5) score += 0.10; // Wheelchair accessible
  if (accessibility.width >= 1.0 && accessibility.width < 1.5) score += 0.05;

  // Negative Factors (Score Reducers)
  for (const barrier of barriers) {
    const impact = this.calculateRealBarrierImpact(barrier, userPrefs);
    score -= impact;
  }

  // User-specific adjustments
  if (userPrefs.mobilityDevice === 'wheelchair') {
    if (!accessibility.hasCurbCuts) score -= 0.25;
    if (accessibility.width < 1.5) score -= 0.20;
    if (accessibility.surfaceType === 'unpaved') score -= 0.30;
  }

  if (userPrefs.visualImpairment) {
    if (accessibility.lighting === 'poor') score -= 0.20;
    if (!accessibility.hasSidewalks) score -= 0.15;
  }

  return Math.max(0, Math.min(1, score));
}
```

### 2. Barrier Impact Calculation
**Location**: `client/src/services/enhancedAccessibleRoutingService.js`

**Impact Factors**:
```javascript
calculateRealBarrierImpact(barrier, userPrefs) {
  const baseImpact = this.getBaseBarrierImpact(barrier);
  let multiplier = 1.0;

  // User-specific multipliers
  if (userPrefs.mobilityDevice === 'wheelchair') {
    if (barrier.type === 'steps') multiplier = 2.0;
    if (barrier.type === 'narrow_passage') multiplier = 1.5;
  }

  if (userPrefs.visualImpairment) {
    if (barrier.type === 'poor_lighting') multiplier = 1.8;
    if (barrier.type === 'missing_sidewalk') multiplier = 1.3;
  }

  return baseImpact * multiplier;
}

getBaseBarrierImpact(barrier) {
  const impacts = {
    'steps': 0.35,
    'construction': 0.25,
    'closure': 0.50,
    'narrow_passage': 0.20,
    'steep_slope': 0.30,
    'unpaved_surface': 0.25,
    'poor_lighting': 0.15,
    'obstacle': 0.20,
    'flooding': 0.45,
    'ice': 0.40,
    'snow': 0.30
  };
  
  return impacts[barrier.type] || 0.10;
}
```

### 3. Confidence Score Calculation
**Location**: `client/src/components/AccessibilityConfidenceScore.js`

**Multi-factor Analysis**:
```javascript
const calculateScore = () => {
  let totalScore = 100;
  const breakdown = {
    dataQuality: 0,
    barrierPrediction: 0,
    accessibilityCoverage: 0,
    routeComplexity: 0,
    seasonalFactors: 0
  };

  // Data Quality Score (30% weight)
  const dataQualityScore = calculateDataQualityScore(route, accessibilityData);
  breakdown.dataQuality = dataQualityScore;
  totalScore += (dataQualityScore - 50) * 0.3;

  // Barrier Prediction Accuracy (25% weight)
  const predictionScore = calculatePredictionScore(predictedBarriers);
  breakdown.barrierPrediction = predictionScore;
  totalScore += (predictionScore - 50) * 0.25;

  // Accessibility Coverage (20% weight)
  const coverageScore = calculateCoverageScore(route, accessibilityData);
  breakdown.accessibilityCoverage = coverageScore;
  totalScore += (coverageScore - 50) * 0.2;

  // Route Complexity (15% weight)
  const complexityScore = calculateComplexityScore(route);
  breakdown.routeComplexity = complexityScore;
  totalScore += (complexityScore - 50) * 0.15;

  // Seasonal Factors (10% weight)
  const seasonalScore = calculateSeasonalScore(route);
  breakdown.seasonalFactors = seasonalScore;
  totalScore += (seasonalScore - 50) * 0.1;

  return Math.max(0, Math.min(100, totalScore));
};
```

---

## Routing Algorithms

### 1. Three-Tier Routing Architecture
**Location**: `client/src/services/unifiedAccessibleRoutingService.js`

**Tier 1: Static Data Analysis (Highest Priority)**
- Uses local, optimized accessibility datasets
- Fastest performance (no external API calls)
- Most accurate for Halifax area
- Privacy-focused (no external data sharing)

**Tier 2: AI-Enhanced Route with Learning**
- Applies machine learning optimizations
- Uses user pattern analysis
- Generates personalized recommendations
- Continuous improvement through learning

**Tier 3: API Fallback with Accessibility Filtering**
- External API integration (OpenRouteService, Mapbox)
- Accessibility-aware filtering
- Ensures route availability
- Fallback for areas outside Halifax

### 2. A* Pathfinding Algorithm
**Location**: `client/src/services/advancedRoutingService.js`

**Implementation**:
```javascript
aStarPathfinding(start, end, options = {}) {
  const openSet = new PriorityQueue();
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  openSet.enqueue(start, 0);
  gScore.set(start, 0);
  fScore.set(start, this.heuristic(start, end));

  while (!openSet.isEmpty()) {
    const current = openSet.dequeue();
    
    if (current === end) {
      return this.reconstructPath(cameFrom, current);
    }

    closedSet.add(current);
    
    for (const neighbor of this.getNeighbors(current)) {
      if (closedSet.has(neighbor)) continue;
      
      const tentativeGScore = gScore.get(current) + 
        this.getAccessibilityWeight(current, neighbor, options);
      
      if (!openSet.contains(neighbor)) {
        openSet.enqueue(neighbor, fScore.get(neighbor) || Infinity);
      } else if (tentativeGScore >= gScore.get(neighbor)) {
        continue;
      }
      
      cameFrom.set(neighbor, current);
      gScore.set(neighbor, tentativeGScore);
      fScore.set(neighbor, tentativeGScore + this.heuristic(neighbor, end));
    }
  }
  
  return null; // No path found
}
```

### 3. Multi-Criteria Optimization
**Location**: `client/src/services/optimizedRoutingService.js`

**Optimization Criteria**:
- **Accessibility**: Path quality and barrier avoidance
- **Distance**: Total route length
- **Time**: Estimated travel time
- **User Preferences**: Individual accessibility needs
- **Weather**: Current and predicted conditions
- **Safety**: Crime statistics and lighting

---

## Data Sources & Architecture

### 1. Halifax Municipal Datasets
**Location**: `server/data/`

**Core Datasets**:
- **Active Travelways**: Complete sidewalk and path network
- **Accessible Parking**: Designated accessible parking spots
- **Steps**: All staircases and steps in the city
- **Sidewalk Closures**: Current and planned closures
- **Street Closures**: Road closures affecting accessibility
- **Traffic Control**: Traffic signals and crosswalks
- **Transit Stops**: Bus stops with accessibility information
- **Transit Routes**: Bus route network
- **Street Lights**: Lighting infrastructure
- **Public Washrooms**: Accessible public facilities

**Data Processing Pipeline**:
```javascript
// Data optimization process
async optimizeDataset(datasetName) {
  const rawData = await loadRawDataset(datasetName);
  
  // Spatial indexing
  const spatialIndex = buildSpatialIndex(rawData.features);
  
  // Accessibility enhancement
  const enhancedData = enhanceAccessibilityData(rawData);
  
  // Compression and optimization
  const optimizedData = compressAndOptimize(enhancedData);
  
  // Cache storage
  await storeOptimizedDataset(datasetName, optimizedData, spatialIndex);
}
```

### 2. External Data Sources
**APIs Integrated**:
- **Mapbox**: Geocoding and fallback routing
- **OpenRouteService**: Primary routing engine
- **OpenWeatherMap**: Weather data for accessibility analysis
- **Nominatim**: OpenStreetMap geocoding
- **Overpass API**: OpenStreetMap accessibility data

### 3. Real-time Data Sources
**Dynamic Data**:
- **User Reports**: Community-sourced barrier reports
- **Weather Conditions**: Real-time weather impact analysis
- **Construction Updates**: Municipal construction notifications
- **Transit Delays**: Real-time transit information

### 4. Data Serving Architecture
**Location**: `server/routes/optimizedData.js`

**Caching Strategy**:
```javascript
// Multi-level caching system
const datasetCache = new Map();
const spatialIndexCache = new Map();
const cacheTimeout = 30 * 60 * 1000; // 30 minutes

// Optimized data serving
router.get('/optimized/:filename', async (req, res) => {
  const cacheKey = `optimized_${filename}`;
  const cached = datasetCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < cacheTimeout) {
    return res.json(cached.data);
  }
  
  // Load and cache optimized data
  const data = await loadOptimizedDataset(filename);
  datasetCache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });
  
  res.json(data);
});
```

---

## API Integration

### 1. OpenRouteService Integration
**Location**: `client/src/services/openRouteService.js`

**Features**:
- Primary routing engine for accessibility-focused routes
- Support for multiple profiles (foot-walking, wheelchair)
- Real-time accessibility analysis
- Custom accessibility parameters

**API Configuration**:
```javascript
const requestBody = {
  coordinates: [[originLng, originLat], [destLng, destLat]],
  format: 'geojson',
  profile: routingProfile,
  preference: 'recommended',
  units: 'meters',
  language: 'en',
  instructions: true,
  geometry: true,
  elevation: true,
  options: {
    avoid_features: ['highways', 'tollways'],
    avoid_polygons: barrierPolygons,
    vehicle_type: 'foot',
    profile_params: {
      foot: {
        maximum_slope: maxSlope,
        minimum_width: minWidth,
        avoid_steps: avoidSteps
      }
    }
  }
};
```

### 2. Mapbox Integration
**Location**: `client/src/services/mapboxRoutingService.js`

**Features**:
- Fallback routing service
- Geocoding and reverse geocoding
- Map rendering and visualization
- Real-time traffic data

### 3. Weather API Integration
**Location**: `client/src/services/weatherService.js`

**Features**:
- Current weather conditions
- Weather-based accessibility warnings
- Seasonal route adjustments
- Precipitation and temperature alerts

---

## Mobile Navigation

### 1. Mobile-First Design
**Location**: `client/src/components/MobileNavigationPanel.js`

**Features**:
- **Responsive Layout**: Optimized for mobile devices
- **Touch-Friendly Interface**: Large buttons and touch targets
- **Offline Capability**: Cached routes and data
- **Voice Navigation**: Audio turn-by-turn instructions

### 2. Navigation Panel System
**Location**: `client/src/navigation/NavigationIntegration.js`

**Components**:
- **Route Summary Panel**: Shows route overview with accessibility score
- **Directions Panel**: Step-by-step navigation instructions
- **Accessibility Toggles**: User preference controls
- **Action Bar**: Navigation controls (start, pause, end)

**Panel Coordination**:
```javascript
// Handle route changes - show route summary when route is generated
useEffect(() => {
  if (route && origin && destination && isMobileDevice && !isNavigating) {
    // Show route summary when route is generated but not yet started
    setIsPanelOpen(true);
    setIsPanelCollapsed(false);
  } else if (!route) {
    // Hide panel when route is cleared
    setIsPanelOpen(false);
  }
}, [route, origin, destination, isMobileDevice, isNavigating]);

// Handle navigation state changes
useEffect(() => {
  if (isNavigating) {
    // Hide the mobile navigation panel when navigation is active
    setIsPanelOpen(false);
  } else if (route && origin && destination && isMobileDevice) {
    // Show the mobile navigation panel when not navigating but route is available
    setIsPanelOpen(true);
  }
}, [isNavigating, route, origin, destination, isMobileDevice]);
```

### 3. Accessibility Features
**Mobile Accessibility**:
- **Screen Reader Support**: Full VoiceOver and TalkBack compatibility
- **High Contrast Mode**: Enhanced visibility options
- **Large Text Support**: Scalable typography
- **Gesture Alternatives**: Button-based navigation options

---

## Performance Optimizations

### 1. Spatial Indexing
**Location**: `client/src/services/optimizedRoutingService.js`

**RBush Implementation**:
```javascript
class OptimizedRoutingService {
  constructor() {
    this.spatialIndex = new RBush();
    this.gridIndex = new Map();
    this.rtreeIndex = new RBush();
    this.featureIndex = new Map();
  }
  
  buildSpatialIndex(features) {
    const items = features.map(feature => ({
      minX: feature.bbox[0],
      minY: feature.bbox[1],
      maxX: feature.bbox[2],
      maxY: feature.bbox[3],
      feature: feature
    }));
    
    this.spatialIndex.load(items);
  }
  
  findNearbyFeatures(point, radius) {
    const bbox = [
      point[0] - radius, point[1] - radius,
      point[0] + radius, point[1] + radius
    ];
    
    return this.spatialIndex.search({
      minX: bbox[0], minY: bbox[1],
      maxX: bbox[2], maxY: bbox[3]
    });
  }
}
```

### 2. Caching Strategy
**Multi-Level Caching**:
- **Route Cache**: Cached route calculations
- **Dataset Cache**: Cached municipal datasets
- **Spatial Index Cache**: Cached spatial queries
- **User Preference Cache**: Cached user settings

### 3. Lazy Loading
**Progressive Data Loading**:
- **Priority-based Loading**: Critical datasets loaded first
- **On-demand Loading**: Non-critical data loaded as needed
- **Background Loading**: Data preloading in background
- **Progressive Enhancement**: Basic functionality available immediately

### 4. Compression
**Data Optimization**:
- **GeoJSON Compression**: Reduced file sizes
- **Spatial Compression**: Optimized coordinate storage
- **Metadata Compression**: Efficient property storage
- **Network Compression**: Gzip compression for API responses

---

## Technical Architecture

### 1. Frontend Architecture
**React-based SPA**:
- **Component-based Design**: Modular, reusable components
- **State Management**: React hooks and context
- **Service Layer**: Dedicated services for different functionalities
- **Responsive Design**: Mobile-first approach

### 2. Backend Architecture
**Node.js/Express Server**:
- **RESTful API**: Clean, documented API endpoints
- **Database Integration**: SQLite for local data storage
- **Caching Layer**: In-memory and persistent caching
- **Security**: Helmet.js for security headers

### 3. Data Flow
**Request Processing Pipeline**:
```
User Request → Input Validation → Service Selection → 
Data Processing → AI Analysis → Response Generation → 
Caching → User Response
```

### 4. Error Handling
**Comprehensive Error Management**:
- **Graceful Degradation**: System continues working with reduced functionality
- **Fallback Mechanisms**: Multiple service options for reliability
- **User Feedback**: Clear error messages and recovery options
- **Logging**: Comprehensive error logging for debugging

### 5. Security Considerations
**Data Protection**:
- **Input Validation**: All user inputs validated
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Configuration**: Proper cross-origin resource sharing
- **Data Encryption**: Sensitive data encrypted in transit and storage

---

## System Requirements

### Frontend Requirements
- **Browser Support**: Modern browsers with ES6+ support
- **JavaScript**: ES6+ features required
- **Network**: Internet connection for external APIs
- **Storage**: Local storage for caching and preferences

### Backend Requirements
- **Node.js**: Version 16 or higher
- **Memory**: Minimum 2GB RAM for data processing
- **Storage**: SSD recommended for database performance
- **Network**: Stable internet connection for external APIs

### Data Requirements
- **Municipal Datasets**: Halifax accessibility data
- **API Keys**: Mapbox, OpenRouteService, OpenWeatherMap
- **Storage Space**: ~500MB for optimized datasets
- **Update Frequency**: Weekly dataset updates recommended

---

## Future Enhancements

### Planned Features
1. **Real-time Barrier Detection**: Computer vision for automatic barrier identification
2. **Voice Navigation**: Advanced voice-guided navigation
3. **Social Features**: Community-driven accessibility reporting
4. **Predictive Analytics**: Advanced route prediction based on historical data
5. **Integration APIs**: Third-party accessibility service integration

### Technical Improvements
1. **Machine Learning**: Enhanced AI models for better predictions
2. **Performance**: Further optimization for faster route calculation
3. **Offline Support**: Complete offline navigation capability
4. **Accessibility**: Enhanced accessibility features for all users

---

This comprehensive documentation covers all aspects of the Trek.IQ system, from core features to technical implementation details. The system represents a sophisticated approach to accessible navigation, combining multiple data sources, AI-powered analysis, and user-centered design to provide the best possible navigation experience for users with diverse accessibility needs.
